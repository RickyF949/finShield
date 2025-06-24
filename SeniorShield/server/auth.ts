import { randomBytes, createHash } from "crypto";
import { authenticator } from "otplib";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { storage } from "./storage";
import { InsertUser, User } from "../shared/schema";
import nodemailer from "nodemailer";

// Ensure required environment variables are present
if (!process.env.JWT_SECRET) {
  console.error("JWT_SECRET environment variable is required");
  process.exit(1);
}

if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
  console.error("SMTP configuration environment variables are required");
  process.exit(1);
}

const JWT_SECRET = process.env.JWT_SECRET;
const MAGIC_LINK_EXPIRY = 15 * 60 * 1000; // 15 minutes
const EMAIL_VERIFICATION_EXPIRY = 24 * 60 * 60 * 1000; // 24 hours
const MAX_LOGIN_ATTEMPTS = 5;
const LOGIN_LOCKOUT_TIME = 15 * 60 * 1000; // 15 minutes

// Secure email configuration with TLS
const emailTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST,
  port: 587,
  secure: true, // Use TLS
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS
  },
  tls: {
    minVersion: 'TLSv1.2',
    ciphers: 'HIGH:MEDIUM:!aNULL:!MD5:!RC4'
  }
});

// Track login attempts
const loginAttempts = new Map<string, { count: number; lastAttempt: number }>();

export async function hashPassword(password: string): Promise<string> {
  // Use a stronger work factor (12-14 is recommended for production)
  return bcrypt.hash(password, 14);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

export function generateToken(userId: number, expiresIn: string = "1d"): string {
  return jwt.sign(
    { 
      userId,
      iat: Math.floor(Date.now() / 1000)
    }, 
    JWT_SECRET, 
    { 
      expiresIn,
      algorithm: 'HS512' // Use a stronger algorithm
    }
  );
}

export function checkLoginAttempts(identifier: string): boolean {
  const attempts = loginAttempts.get(identifier);
  
  if (!attempts) {
    loginAttempts.set(identifier, { count: 0, lastAttempt: Date.now() });
    return true;
  }

  // Reset attempts if lockout time has passed
  if (Date.now() - attempts.lastAttempt > LOGIN_LOCKOUT_TIME) {
    loginAttempts.set(identifier, { count: 0, lastAttempt: Date.now() });
    return true;
  }

  if (attempts.count >= MAX_LOGIN_ATTEMPTS) {
    return false;
  }

  attempts.count++;
  attempts.lastAttempt = Date.now();
  loginAttempts.set(identifier, attempts);
  return true;
}

export function resetLoginAttempts(identifier: string): void {
  loginAttempts.delete(identifier);
}

export function verifyToken(token: string): { userId: number } | null {
  try {
    return jwt.verify(token, JWT_SECRET) as { userId: number };
  } catch {
    return null;
  }
}

export async function createMagicLink(email: string): Promise<string> {
  const user = await storage.getUserByEmail(email);
  if (!user) {
    throw new Error("User not found");
  }

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + MAGIC_LINK_EXPIRY);

  await storage.createAuthToken({
    userId: user.id,
    token: token,
    type: "magic_link",
    expiresAt
  });

  // Send magic link email
  const magicLink = `${process.env.APP_URL}/auth/verify-magic-link?token=${token}`;
  await emailTransporter.sendMail({
    from: "noreply@example.com",
    to: email,
    subject: "Your Magic Link",
    text: `Click here to log in: ${magicLink}`,
    html: `<p>Click <a href="${magicLink}">here</a> to log in.</p>`
  });

  return token;
}

export async function verifyMagicLink(token: string): Promise<User | null> {
  const authToken = await storage.getAuthToken(token);
  
  if (!authToken || 
      authToken.type !== "magic_link" || 
      authToken.usedAt || 
      authToken.expiresAt < new Date()) {
    return null;
  }

  await storage.markAuthTokenUsed(token);
  return storage.getUser(authToken.userId);
}

export async function setup2FA(userId: number): Promise<string> {
  const secret = authenticator.generateSecret();
  await storage.updateUser(userId, { 
    twoFactorSecret: secret,
    twoFactorEnabled: false // Will be enabled after verification
  });
  
  return secret;
}

export function generate2FAQRCode(email: string, secret: string): string {
  const serviceName = "YourApp";
  return authenticator.keyuri(email, serviceName, secret);
}

export async function verify2FAToken(userId: number, token: string): Promise<boolean> {
  const user = await storage.getUser(userId);
  if (!user?.twoFactorSecret) return false;

  return authenticator.verify({
    token,
    secret: user.twoFactorSecret
  });
}

export async function enable2FA(userId: number, token: string): Promise<boolean> {
  const isValid = await verify2FAToken(userId, token);
  if (!isValid) return false;

  await storage.updateUser(userId, { twoFactorEnabled: true });
  return true;
}

export async function createEmailVerificationToken(userId: number): Promise<string> {
  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + EMAIL_VERIFICATION_EXPIRY);

  await storage.createAuthToken({
    userId,
    token,
    type: "email_verification",
    expiresAt
  });

  return token;
}

export async function verifyEmail(token: string): Promise<boolean> {
  const authToken = await storage.getAuthToken(token);
  
  if (!authToken || 
      authToken.type !== "email_verification" || 
      authToken.usedAt || 
      authToken.expiresAt < new Date()) {
    return false;
  }

  await storage.markAuthTokenUsed(token);
  await storage.updateUser(authToken.userId, { emailVerified: true });
  return true;
}

export async function generateBackupCodes(userId: number): Promise<string[]> {
  const codes: string[] = [];
  for (let i = 0; i < 10; i++) {
    const code = randomBytes(4).toString("hex");
    codes.push(code);
    
    // Store hashed backup codes
    const hashedCode = createHash("sha256").update(code).digest("hex");
    await storage.createAuthToken({
      userId,
      token: hashedCode,
      type: "2fa_backup",
      expiresAt: new Date("2100-01-01") // Effectively never expires
    });
  }
  
  return codes;
}

export async function verifyBackupCode(userId: number, code: string): Promise<boolean> {
  const hashedCode = createHash("sha256").update(code).digest("hex");
  const authToken = await storage.getAuthToken(hashedCode);
  
  if (!authToken || 
      authToken.type !== "2fa_backup" || 
      authToken.usedAt || 
      authToken.userId !== userId) {
    return false;
  }

  await storage.markAuthTokenUsed(hashedCode);
  return true;
}