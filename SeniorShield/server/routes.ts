import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { authRoutes } from "./auth-routes";
import { yodleeRoutes } from "./yodlee-routes";
import { verifyToken } from "./auth";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import csrf from "csurf";
import sanitize from "sanitize-html";
import { auditLog } from "./audit-logger";
import { mlService } from "./ml/service";

// Helper functions for risk trends
function calculateDailyRiskTrends(transactions: any[]) {
  const dailyStats = new Map<string, { total: number; suspicious: number; amount: number; suspiciousAmount: number }>();
  
  transactions.forEach(t => {
    const date = new Date(t.transactionDate).toISOString().split('T')[0];
    if (!dailyStats.has(date)) {
      dailyStats.set(date, { total: 0, suspicious: 0, amount: 0, suspiciousAmount: 0 });
    }
    
    const stats = dailyStats.get(date)!;
    stats.total++;
    stats.amount += Math.abs(parseFloat(t.amount.toString()));
    
    if (t.isFlagged) {
      stats.suspicious++;
      stats.suspiciousAmount += Math.abs(parseFloat(t.amount.toString()));
    }
  });

  return Array.from(dailyStats.entries()).map(([date, stats]) => ({
    date,
    totalTransactions: stats.total,
    suspiciousTransactions: stats.suspicious,
    riskPercentage: (stats.suspicious / stats.total) * 100,
    totalAmount: stats.amount,
    suspiciousAmount: stats.suspiciousAmount,
    riskExposurePercentage: (stats.suspiciousAmount / stats.amount) * 100
  }));
}

function calculateWeeklyRiskTrends(transactions: any[]) {
  const weeklyStats = new Map<string, { total: number; suspicious: number; amount: number; suspiciousAmount: number }>();
  
  transactions.forEach(t => {
    const date = new Date(t.transactionDate);
    const week = getWeekNumber(date);
    const weekKey = `${date.getFullYear()}-W${week}`;
    
    if (!weeklyStats.has(weekKey)) {
      weeklyStats.set(weekKey, { total: 0, suspicious: 0, amount: 0, suspiciousAmount: 0 });
    }
    
    const stats = weeklyStats.get(weekKey)!;
    stats.total++;
    stats.amount += Math.abs(parseFloat(t.amount.toString()));
    
    if (t.isFlagged) {
      stats.suspicious++;
      stats.suspiciousAmount += Math.abs(parseFloat(t.amount.toString()));
    }
  });

  return Array.from(weeklyStats.entries()).map(([weekKey, stats]) => ({
    week: weekKey,
    totalTransactions: stats.total,
    suspiciousTransactions: stats.suspicious,
    riskPercentage: (stats.suspicious / stats.total) * 100,
    totalAmount: stats.amount,
    suspiciousAmount: stats.suspiciousAmount,
    riskExposurePercentage: (stats.suspiciousAmount / stats.amount) * 100
  }));
}

function getWeekNumber(date: Date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const dayNum = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  return Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
}

// Rate limiting configuration
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100 // limit each IP to 100 requests per windowMs
});

// CSRF protection configuration
const csrfProtection = csrf({ cookie: true });

// Sanitize function for user input
function sanitizeInput(obj: any): any {
  if (typeof obj !== 'object' || obj === null) {
    return typeof obj === 'string' ? sanitize(obj) : obj;
  }
  
  const result: any = Array.isArray(obj) ? [] : {};
  for (const key in obj) {
    result[key] = sanitizeInput(obj[key]);
  }
  return result;
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Security headers
  app.use(helmet({
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'"],
        imgSrc: ["'self'", "data:", "https:"],
        connectSrc: ["'self'"],
        fontSrc: ["'self'"],
        objectSrc: ["'none'"],
        mediaSrc: ["'self'"],
        frameSrc: ["'none'"],
      },
    },
    crossOriginEmbedderPolicy: true,
    crossOriginOpenerPolicy: true,
    crossOriginResourcePolicy: { policy: "same-site" },
    dnsPrefetchControl: true,
    frameguard: { action: "deny" },
    hidePoweredBy: true,
    hsts: {
      maxAge: 31536000,
      includeSubDomains: true,
      preload: true
    },
    ieNoOpen: true,
    noSniff: true,
    permittedCrossDomainPolicies: { permittedPolicies: "none" },
    referrerPolicy: { policy: "strict-origin-when-cross-origin" },
    xssFilter: true
  }));

  // Rate limiting for all routes
  app.use(apiLimiter);

  // CSRF protection for all non-GET routes
  app.use((req, res, next) => {
    if (req.method === 'GET') {
      next();
    } else {
      csrfProtection(req, res, next);
    }
  });

  // Input sanitization middleware
  app.use((req, res, next) => {
    req.body = sanitizeInput(req.body);
    req.query = sanitizeInput(req.query);
    req.params = sanitizeInput(req.params);
    next();
  });

  // Authentication middleware
  app.use((req, res, next) => {
    const authHeader = req.headers.authorization;
    if (authHeader) {
      const token = authHeader.split(" ")[1];
      const decoded = verifyToken(token);
      if (decoded) {
        req.user = { id: decoded.userId };
        // Audit log for authenticated requests
        auditLog.log({
          userId: decoded.userId,
          action: `${req.method} ${req.path}`,
          ip: req.ip,
          userAgent: req.headers['user-agent']
        });
      }
    }
    next();
  });

  // Response headers middleware
  app.use((req, res, next) => {
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('X-Frame-Options', 'DENY');
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });

  // Error handling middleware
  app.use((err: any, req: any, res: any, next: any) => {
    if (err.code === 'EBADCSRFTOKEN') {
      return res.status(403).json({ message: 'Invalid CSRF token' });
    }
    console.error(err.stack);
    res.status(500).json({ message: 'Internal server error' });
  });

  // Auth routes
  app.use("/api/auth", authRoutes);

  // Yodlee routes
  app.use("/api/yodlee", yodleeRoutes);

  // Protected route middleware
  const requireAuth = (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: "Unauthorized" });
    }
    next();
  };

  // Dashboard data endpoint
  app.get("/api/dashboard", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      
      const [
        user,
        accounts,
        recentTransactions,
        alerts,
        familyMembers
      ] = await Promise.all([
        storage.getUser(userId),
        storage.getAccountsByUserId(userId),
        storage.getRecentTransactions(userId, 10),
        storage.getAlertsByUserId(userId),
        storage.getFamilyMembersByUserId(userId)
      ]);

      if (!user) {
        return res.status(404).json({ message: "User not found" });
      }

      // Calculate stats
      const unreadAlerts = alerts.filter(alert => !alert.isRead);
      const weeklyAlerts = alerts.filter(alert => {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        return alert.createdAt! >= weekAgo;
      });

      // Calculate spending by category
      const spendingByCategory = recentTransactions
        .filter(t => t.isSpending)
        .reduce((acc, transaction) => {
          const category = transaction.category;
          const amount = Math.abs(parseFloat(transaction.amount));
          acc[category] = (acc[category] || 0) + amount;
          return acc;
        }, {} as Record<string, number>);

      res.json({
        user,
        accounts,
        recentTransactions,
        alerts: unreadAlerts.slice(0, 5), // Most recent unread alerts
        familyMembers,
        stats: {
          protectedAccounts: accounts.length,
          weeklyAlerts: weeklyAlerts.length,
          unreadAlerts: unreadAlerts.length
        },
        spendingByCategory
      });
    } catch (error) {
      console.error("Dashboard error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get all alerts for user
  app.get("/api/alerts", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const alerts = await storage.getAlertsByUserId(userId);
      res.json(alerts);
    } catch (error) {
      console.error("Alerts error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark alert as read
  app.patch("/api/alerts/:alertId/read", requireAuth, async (req, res) => {
    try {
      const alertId = parseInt(req.params.alertId);
      
      // Get alert to check ownership
      const alert = await storage.getAlertById(alertId);
      if (!alert || alert.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedAlert = await storage.markAlertAsRead(alertId);
      
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Mark alert read error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Mark alert as resolved
  app.patch("/api/alerts/:alertId/resolve", requireAuth, async (req, res) => {
    try {
      const alertId = parseInt(req.params.alertId);
      
      // Get alert to check ownership
      const alert = await storage.getAlertById(alertId);
      if (!alert || alert.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const updatedAlert = await storage.markAlertAsResolved(alertId);
      
      if (!alert) {
        return res.status(404).json({ message: "Alert not found" });
      }
      
      res.json(alert);
    } catch (error) {
      console.error("Resolve alert error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get transactions for user with ML analysis
  app.get("/api/transactions", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const limit = parseInt(req.query.limit as string) || 50;
      const transactions = await storage.getRecentTransactions(userId, limit);
      
      // Analyze transactions if they haven't been analyzed yet
      const analyzedTransactions = await Promise.all(
        transactions.map(async (transaction) => {
          if (transaction.suspiciousScore === 0) {
            const analysis = await mlService.analyzeTransaction(transaction, userId);
            // Update transaction with analysis results
            await storage.updateTransaction(transaction.id, {
              suspiciousScore: analysis.suspiciousScore,
              isFlagged: analysis.isAnomaly
            });
            return {
              ...transaction,
              suspiciousScore: analysis.suspiciousScore,
              isFlagged: analysis.isAnomaly,
              analysis: {
                anomalyScore: analysis.anomalyScore,
                behavioralScore: analysis.behavioralScore,
                features: analysis.features
              }
            };
          }
          return transaction;
        })
      );
      
      res.json(analyzedTransactions);
    } catch (error) {
      console.error("Transactions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update transaction review status and provide feedback for ML models
  app.patch("/api/transactions/:transactionId/review", requireAuth, async (req, res) => {
    try {
      const transactionId = parseInt(req.params.transactionId);
      const { reviewStatus, isFraudulent } = req.body;
      
      // Get transaction to check ownership
      const transaction = await storage.getTransaction(transactionId);
      const account = transaction ? await storage.getAccount(transaction.accountId) : null;
      
      if (!transaction || !account || account.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      if (!["pending", "approved", "blocked"].includes(reviewStatus)) {
        return res.status(400).json({ message: "Invalid review status" });
      }

      // Get historical transactions for this user for model updates
      const historicalTransactions = await storage.getTransactionsByUserId(req.user!.id);
      
      // Update ML models with user feedback
      if (typeof isFraudulent === 'boolean') {
        await mlService.updateModels(transaction, req.user!.id, isFraudulent, historicalTransactions);
      }
      
      // Update transaction status
      const updatedTransaction = await storage.updateTransaction(transactionId, { 
        reviewStatus,
        isFlagged: isFraudulent || false
      });
      
      if (!updatedTransaction) {
        return res.status(404).json({ message: "Transaction not found" });
      }
      
      res.json(updatedTransaction);
    } catch (error) {
      console.error("Update transaction error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get family members for user
  app.get("/api/family-members", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const familyMembers = await storage.getFamilyMembersByUserId(userId);
      res.json(familyMembers);
    } catch (error) {
      console.error("Family members error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get ML insights and statistics
  app.get("/api/ml-insights", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const transactions = await storage.getRecentTransactions(userId, 100);
      
      // Calculate insights
      const suspiciousTransactions = transactions.filter(t => t.isFlagged);
      const totalAmount = transactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount.toString())), 0);
      const suspiciousAmount = suspiciousTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount.toString())), 0);
      
      // Group by category
      const categoryRisks = transactions.reduce((acc, t) => {
        if (!acc[t.category]) {
          acc[t.category] = {
            total: 0,
            suspicious: 0,
            avgScore: 0,
            transactions: 0
          };
        }
        acc[t.category].transactions++;
        acc[t.category].total += Math.abs(parseFloat(t.amount.toString()));
        if (t.isFlagged) {
          acc[t.category].suspicious++;
        }
        acc[t.category].avgScore += t.suspiciousScore || 0;
        return acc;
      }, {} as Record<string, any>);

      // Calculate averages
      Object.keys(categoryRisks).forEach(category => {
        categoryRisks[category].avgScore /= categoryRisks[category].transactions;
      });

      // Get recent alerts
      const alerts = await storage.getAlertsByUserId(userId);
      const recentAlerts = alerts
        .filter(a => a.alertType === 'suspicious_transaction')
        .slice(0, 5);

      res.json({
        summary: {
          totalTransactions: transactions.length,
          suspiciousTransactions: suspiciousTransactions.length,
          suspiciousPercentage: (suspiciousTransactions.length / transactions.length) * 100,
          totalAmount,
          suspiciousAmount,
          riskExposurePercentage: (suspiciousAmount / totalAmount) * 100
        },
        categoryRisks,
        recentAlerts,
        riskTrends: {
          daily: calculateDailyRiskTrends(transactions),
          weekly: calculateWeeklyRiskTrends(transactions)
        }
      });
    } catch (error) {
      console.error("ML insights error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Analyze transaction in real-time
  app.post("/api/transactions/analyze", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const { transaction } = req.body;

      if (!transaction || !transaction.accountId) {
        return res.status(400).json({ message: "Invalid transaction data" });
      }

      // Verify account ownership
      const account = await storage.getAccount(transaction.accountId);
      if (!account || account.userId !== userId) {
        return res.status(403).json({ message: "Forbidden" });
      }

      // Analyze transaction using ML service
      const analysis = await mlService.analyzeTransaction(transaction, userId);

      // If transaction is highly suspicious (score > 90), create immediate alert
      if (analysis.suspiciousScore > 90) {
        await storage.createAlert({
          userId,
          transactionId: transaction.id,
          alertType: "suspicious_transaction",
          severity: "high",
          title: "High Risk Transaction Detected",
          description: `Transaction of ${transaction.amount} at ${transaction.merchant} has been flagged as highly suspicious. Please review immediately.`,
        });

        // Notify family members who are set up for alerts
        const familyMembers = await storage.getFamilyMembersByUserId(userId);
        const notifyMembers = familyMembers.filter(member => 
          member.receiveAlerts && member.alertTypes.includes("suspicious_transaction")
        );

        // In a real implementation, you would send emails/SMS here
        console.log(`Notifying ${notifyMembers.length} family members about suspicious transaction`);
      }

      res.json({
        transaction,
        analysis,
        riskLevel: analysis.suspiciousScore > 90 ? "high" : 
                   analysis.suspiciousScore > 70 ? "medium" : "low",
        recommendedAction: analysis.suspiciousScore > 90 ? "block" : 
                         analysis.suspiciousScore > 70 ? "review" : "allow",
        features: analysis.features
      });
    } catch (error) {
      console.error("Transaction analysis error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Get transactions for specific account
  app.get("/api/accounts/:accountId/transactions", requireAuth, async (req, res) => {
    try {
      const userId = req.user!.id;
      const accountId = parseInt(req.params.accountId);
      const transactions = await storage.getTransactionsByAccountId(accountId, userId);
      res.json(transactions);
    } catch (error) {
      console.error("Account transactions error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create family member
  app.post("/api/family-members", requireAuth, async (req, res) => {
    try {
      // Ensure the family member is being created for the authenticated user
      const familyMemberData = { ...req.body, userId: req.user!.id };
      const familyMember = await storage.createFamilyMember(familyMemberData);
      res.status(201).json(familyMember);
    } catch (error) {
      console.error("Create family member error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Update family member
  app.patch("/api/family-members/:memberId", requireAuth, async (req, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      
      // Get family member to check ownership
      const existingMember = await storage.getFamilyMember(memberId);
      if (!existingMember || existingMember.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const familyMember = await storage.updateFamilyMember(memberId, req.body);
      
      if (!familyMember) {
        return res.status(404).json({ message: "Family member not found" });
      }
      
      res.json(familyMember);
    } catch (error) {
      console.error("Update family member error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Delete family member
  app.delete("/api/family-members/:memberId", requireAuth, async (req, res) => {
    try {
      const memberId = parseInt(req.params.memberId);
      
      // Get family member to check ownership
      const existingMember = await storage.getFamilyMember(memberId);
      if (!existingMember || existingMember.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      const success = await storage.deleteFamilyMember(memberId);
      
      if (!success) {
        return res.status(404).json({ message: "Family member not found" });
      }
      
      res.status(204).send();
    } catch (error) {
      console.error("Delete family member error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  // Create bank escalation
  app.post("/api/bank-escalations", requireAuth, async (req, res) => {
    try {
      const { userId, transactionId, escalationType, notes, bankContactMethod } = req.body;
      
      // Check if user is creating escalation for their own transaction
      if (userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Verify transaction ownership
      const transaction = await storage.getTransaction(transactionId);
      const account = transaction ? await storage.getAccount(transaction.accountId) : null;
      
      if (!transaction || !account || account.userId !== req.user!.id) {
        return res.status(403).json({ message: "Forbidden" });
      }
      
      // Create escalation record (simulated)
      const escalation = {
        id: Date.now(),
        userId,
        transactionId,
        escalationType,
        notes,
        bankContactMethod,
        status: "submitted",
        createdAt: new Date(),
        bankResponse: "Your report has been received and will be reviewed within 24 hours."
      };
      
      // Also create an alert for the user
      await storage.createAlert({
        userId,
        transactionId,
        alertType: "bank_escalation",
        severity: "medium",
        title: "Bank Contacted",
        description: `Your report about the suspicious transaction has been sent to your bank's fraud department. Reference ID: ESC-${escalation.id}`
      });
      
      res.status(201).json(escalation);
    } catch (error) {
      console.error("Bank escalation error:", error);
      res.status(500).json({ message: "Internal server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
