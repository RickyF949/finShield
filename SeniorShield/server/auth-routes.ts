import { Router } from "express";
import { storage } from "./storage";
import { 
  hashPassword, 
  verifyPassword, 
  generateToken, 
  createMagicLink, 
  verifyMagicLink,
  setup2FA,
  generate2FAQRCode,
  verify2FAToken,
  enable2FA,
  generateBackupCodes,
  verifyBackupCode,
  createEmailVerificationToken,
  verifyEmail
} from "./auth";
import { z } from "zod";

const router = Router();

// Validation schemas
const passwordSchema = z.string()
  .min(12, "Password must be at least 12 characters long")
  .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
  .regex(/[a-z]/, "Password must contain at least one lowercase letter")
  .regex(/[0-9]/, "Password must contain at least one number")
  .regex(/[^A-Za-z0-9]/, "Password must contain at least one special character");

const registerSchema = z.object({
  username: z.string().min(3).regex(/^[a-zA-Z0-9_-]+$/, "Username can only contain letters, numbers, underscores, and hyphens"),
  email: z.string().email(),
  password: passwordSchema.optional(), // Optional for magic link users
  fullName: z.string().min(2).max(100),
  phoneNumber: z.string().regex(/^\+?[1-9]\d{1,14}$/, "Invalid phone number format").optional()
});

const loginSchema = z.object({
  username: z.string(),
  password: z.string()
});

const magicLinkSchema = z.object({
  email: z.string().email()
});

const verifyTokenSchema = z.object({
  token: z.string()
});

const setup2FASchema = z.object({
  token: z.string()
});

// Register new user
router.post("/register", async (req, res) => {
  try {
    const data = registerSchema.parse(req.body);
    
    // Check if username or email already exists
    const existingUser = await Promise.all([
      storage.getUserByUsername(data.username),
      storage.getUserByEmail(data.email)
    ]);
    
    if (existingUser[0]) {
      return res.status(400).json({ message: "Username already taken" });
    }
    if (existingUser[1]) {
      return res.status(400).json({ message: "Email already registered" });
    }

    // Hash password if provided
    if (data.password) {
      data.password = await hashPassword(data.password);
    }

    // Create user
    const user = await storage.createUser(data);

    // Generate email verification token
    const verificationToken = await createEmailVerificationToken(user.id);

    // Send verification email (implement email sending logic)
    // ...

    // Generate auth token
    const token = generateToken(user.id);

    res.status(201).json({ 
      token,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error("Register error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

// Login with username/password
router.post("/login", async (req, res) => {
  try {
    const { username, password } = loginSchema.parse(req.body);
    
    // Check rate limiting
    if (!checkLoginAttempts(username)) {
      auditLog.log({
        userId: -1, // Unknown user
        action: "LOGIN_ATTEMPT_BLOCKED",
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string
      });
      return res.status(429).json({ 
        message: "Too many failed attempts. Please try again later.",
        retryAfter: LOGIN_LOCKOUT_TIME / 1000
      });
    }

    const user = await storage.getUserByUsername(username);
    if (!user || !user.password) {
      auditLog.log({
        userId: -1,
        action: "LOGIN_FAILED_INVALID_USER",
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      auditLog.log({
        userId: user.id,
        action: "LOGIN_FAILED_INVALID_PASSWORD",
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string
      });
      return res.status(401).json({ message: "Invalid credentials" });
    }

    // Check if email is verified
    if (!user.emailVerified) {
      auditLog.log({
        userId: user.id,
        action: "LOGIN_FAILED_EMAIL_NOT_VERIFIED",
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string
      });
      return res.status(403).json({ 
        message: "Please verify your email before logging in",
        requiresEmailVerification: true
      });
    }

    // Check if 2FA is enabled
    if (user.twoFactorEnabled) {
      // Generate temporary token for 2FA verification
      const tempToken = generateToken(user.id, "5m");
      auditLog.log({
        userId: user.id,
        action: "LOGIN_2FA_REQUIRED",
        ip: req.ip,
        userAgent: req.headers['user-agent'] as string
      });
      return res.json({ 
        requiresTwoFactor: true,
        tempToken
      });
    }

    // Reset login attempts on successful login
    resetLoginAttempts(username);

    // Update last login
    await storage.updateUser(user.id, { lastLoginAt: new Date() });

    const token = generateToken(user.id);
    
    auditLog.log({
      userId: user.id,
      action: "LOGIN_SUCCESS",
      ip: req.ip,
      userAgent: req.headers['user-agent'] as string
    });

    // Remove sensitive data from response
    const { password: _, twoFactorSecret: __, ...safeUser } = user;

    res.json({ 
      token,
      user: safeUser
    });
  } catch (error) {
    console.error("Login error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

// Request magic link
router.post("/magic-link", async (req, res) => {
  try {
    const { email } = magicLinkSchema.parse(req.body);
    
    const user = await storage.getUserByEmail(email);
    if (!user) {
      // Don't reveal if user exists
      return res.json({ message: "If an account exists, a magic link has been sent" });
    }

    const token = await createMagicLink(email);

    res.json({ message: "If an account exists, a magic link has been sent" });
  } catch (error) {
    console.error("Magic link error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

// Verify magic link
router.post("/verify-magic-link", async (req, res) => {
  try {
    const { token } = verifyTokenSchema.parse(req.body);
    
    const user = await verifyMagicLink(token);
    if (!user) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    // Update last login
    await storage.updateUser(user.id, { lastLoginAt: new Date() });

    const authToken = generateToken(user.id);
    res.json({ 
      token: authToken,
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        fullName: user.fullName,
        emailVerified: user.emailVerified
      }
    });
  } catch (error) {
    console.error("Verify magic link error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

// Setup 2FA
router.post("/2fa/setup", async (req, res) => {
  try {
    const userId = req.user?.id; // From auth middleware
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const user = await storage.getUser(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const secret = await setup2FA(userId);
    const qrCode = generate2FAQRCode(user.email, secret);
    const backupCodes = await generateBackupCodes(userId);

    res.json({ 
      qrCode,
      backupCodes,
      secret // Only shown during setup
    });
  } catch (error) {
    console.error("2FA setup error:", error);
    res.status(500).json({ message: "Internal server error" });
  }
});

// Verify and enable 2FA
router.post("/2fa/enable", async (req, res) => {
  try {
    const { token } = setup2FASchema.parse(req.body);
    const userId = req.user?.id; // From auth middleware
    
    if (!userId) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const success = await enable2FA(userId, token);
    if (!success) {
      return res.status(400).json({ message: "Invalid token" });
    }

    res.json({ message: "2FA enabled successfully" });
  } catch (error) {
    console.error("2FA enable error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

// Verify 2FA token during login
router.post("/2fa/verify", async (req, res) => {
  try {
    const { token } = verifyTokenSchema.parse(req.body);
    const tempToken = req.headers.authorization?.split(" ")[1];
    
    if (!tempToken) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    const decoded = jwt.verify(tempToken, JWT_SECRET) as { userId: number };
    const userId = decoded.userId;

    let isValid = await verify2FAToken(userId, token);
    
    // If token is invalid, try backup code
    if (!isValid) {
      isValid = await verifyBackupCode(userId, token);
      if (!isValid) {
        return res.status(401).json({ message: "Invalid token" });
      }
    }

    // Update last login
    await storage.updateUser(userId, { lastLoginAt: new Date() });

    const user = await storage.getUser(userId);
    const authToken = generateToken(userId);
    
    res.json({ 
      token: authToken,
      user: {
        id: user!.id,
        username: user!.username,
        email: user!.email,
        fullName: user!.fullName,
        emailVerified: user!.emailVerified
      }
    });
  } catch (error) {
    console.error("2FA verify error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

// Verify email
router.post("/verify-email", async (req, res) => {
  try {
    const { token } = verifyTokenSchema.parse(req.body);
    
    const success = await verifyEmail(token);
    if (!success) {
      return res.status(401).json({ message: "Invalid or expired token" });
    }

    res.json({ message: "Email verified successfully" });
  } catch (error) {
    console.error("Email verification error:", error);
    if (error instanceof z.ZodError) {
      return res.status(400).json({ message: "Invalid input", errors: error.errors });
    }
    res.status(500).json({ message: "Internal server error" });
  }
});

export const authRoutes = router;