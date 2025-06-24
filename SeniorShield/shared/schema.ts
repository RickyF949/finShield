import { pgTable, text, serial, integer, boolean, decimal, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const authTokens = pgTable("auth_tokens", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  token: text("token").notNull().unique(),
  type: text("type").notNull(), // "magic_link", "email_verification", "2fa_backup"
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  password: text("password"), // Optional since we support magic links
  fullName: text("full_name").notNull(),
  phoneNumber: text("phone_number"),
  twoFactorSecret: text("two_factor_secret"),
  twoFactorEnabled: boolean("two_factor_enabled").default(false),
  emailVerified: boolean("email_verified").default(false),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

export const accounts = pgTable("accounts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  accountName: text("account_name").notNull(),
  accountType: text("account_type").notNull(), // "checking", "savings", "credit"
  accountNumber: text("account_number").notNull(),
  balance: decimal("balance", { precision: 12, scale: 2 }).notNull(),
  isActive: boolean("is_active").default(true),
  createdAt: timestamp("created_at").defaultNow(),
  // Yodlee specific fields
  yodleeAccountId: text("yodlee_account_id").unique(),
  yodleeProviderName: text("yodlee_provider_name"),
  yodleeLastUpdate: timestamp("yodlee_last_update"),
});

export const transactions = pgTable("transactions", {
  id: serial("id").primaryKey(),
  accountId: integer("account_id").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  merchant: text("merchant").notNull(),
  category: text("category").notNull(),
  description: text("description"),
  transactionDate: timestamp("transaction_date").notNull(),
  isSpending: boolean("is_spending").default(true),
  suspiciousScore: integer("suspicious_score").default(0), // 0-100, higher = more suspicious
  isFlagged: boolean("is_flagged").default(false),
  reviewStatus: text("review_status").default("pending"), // "pending", "approved", "blocked"
  createdAt: timestamp("created_at").defaultNow(),
  // Yodlee specific fields
  yodleeTransactionId: text("yodlee_transaction_id").unique(),
  yodleeBaseType: text("yodlee_base_type"),
  yodleeCategoryType: text("yodlee_category_type"),
  yodleeStatus: text("yodlee_status"),
});

export const alerts = pgTable("alerts", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  transactionId: integer("transaction_id"),
  alertType: text("alert_type").notNull(), // "suspicious_transaction", "bill_reminder", "unusual_spending"
  severity: text("severity").notNull(), // "low", "medium", "high"
  title: text("title").notNull(),
  description: text("description").notNull(),
  isRead: boolean("is_read").default(false),
  isResolved: boolean("is_resolved").default(false),
  createdAt: timestamp("created_at").defaultNow(),
});

export const familyMembers = pgTable("family_members", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  name: text("name").notNull(),
  relationship: text("relationship").notNull(),
  email: text("email").notNull(),
  phoneNumber: text("phone_number"),
  receiveAlerts: boolean("receive_alerts").default(true),
  alertTypes: text("alert_types").array().default([]), // types of alerts they receive
  createdAt: timestamp("created_at").defaultNow(),
});

export const bills = pgTable("bills", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").notNull(),
  billName: text("bill_name").notNull(),
  amount: decimal("amount", { precision: 12, scale: 2 }).notNull(),
  dueDate: timestamp("due_date").notNull(),
  frequency: text("frequency").notNull(), // "monthly", "quarterly", "annually"
  category: text("category").notNull(),
  isPaid: boolean("is_paid").default(false),
  isRecurring: boolean("is_recurring").default(true),
  createdAt: timestamp("created_at").defaultNow(),
});

// Insert schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  createdAt: true,
});

export const insertAccountSchema = createInsertSchema(accounts).omit({
  id: true,
  createdAt: true,
});

export const insertTransactionSchema = createInsertSchema(transactions).omit({
  id: true,
  createdAt: true,
});

export const insertAlertSchema = createInsertSchema(alerts).omit({
  id: true,
  createdAt: true,
});

export const insertFamilyMemberSchema = createInsertSchema(familyMembers).omit({
  id: true,
  createdAt: true,
});

export const insertBillSchema = createInsertSchema(bills).omit({
  id: true,
  createdAt: true,
});

// Types
export type InsertUser = z.infer<typeof insertUserSchema>;
export type User = typeof users.$inferSelect;

export type InsertAccount = z.infer<typeof insertAccountSchema>;
export type Account = typeof accounts.$inferSelect;

export type InsertTransaction = z.infer<typeof insertTransactionSchema>;
export type Transaction = typeof transactions.$inferSelect;

export type InsertAlert = z.infer<typeof insertAlertSchema>;
export type Alert = typeof alerts.$inferSelect;

export type InsertFamilyMember = z.infer<typeof insertFamilyMemberSchema>;
export type FamilyMember = typeof familyMembers.$inferSelect;

export type InsertBill = z.infer<typeof insertBillSchema>;
export type Bill = typeof bills.$inferSelect;

export const insertAuthTokenSchema = createInsertSchema(authTokens).omit({
  id: true,
  createdAt: true,
  usedAt: true,
});

export type InsertAuthToken = z.infer<typeof insertAuthTokenSchema>;
export type AuthToken = typeof authTokens.$inferSelect;
