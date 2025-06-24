import { 
  users, accounts, transactions, alerts, familyMembers, bills, authTokens,
  type User, type InsertUser, 
  type Account, type InsertAccount,
  type Transaction, type InsertTransaction,
  type Alert, type InsertAlert,
  type FamilyMember, type InsertFamilyMember,
  type Bill, type InsertBill,
  type AuthToken, type InsertAuthToken
} from "@shared/schema";

export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User | undefined>;

  // Auth token operations
  createAuthToken(token: InsertAuthToken): Promise<AuthToken>;
  getAuthToken(token: string): Promise<AuthToken | undefined>;
  markAuthTokenUsed(token: string): Promise<AuthToken | undefined>;
  deleteAuthToken(token: string): Promise<boolean>;

  // Account operations
  getAccountsByUserId(userId: number): Promise<Account[]>;
  getAccount(id: number): Promise<Account | undefined>;
  getAccountByYodleeId(yodleeId: string): Promise<Account | undefined>;
  createAccount(account: InsertAccount): Promise<Account>;
  updateAccount(id: number, updates: Partial<Account>): Promise<Account | undefined>;
  updateAccountBalance(id: number, balance: string): Promise<Account | undefined>;

  // Transaction operations
  getAllTransactions(): Promise<Transaction[]>;
  getTransactionsByAccountId(accountId: number, userId: number): Promise<Transaction[]>;
  getTransactionsByUserId(userId: number): Promise<Transaction[]>;
  getRecentTransactions(userId: number, limit?: number): Promise<Transaction[]>;
  getTransaction(id: number): Promise<Transaction | undefined>;
  getTransactionByYodleeId(yodleeId: string): Promise<Transaction | undefined>;
  createTransaction(transaction: InsertTransaction): Promise<Transaction>;
  updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined>;

  // Alert operations
  getAlertsByUserId(userId: number): Promise<Alert[]>;
  getUnreadAlerts(userId: number): Promise<Alert[]>;
  getAlertById(id: number): Promise<Alert | undefined>;
  createAlert(alert: InsertAlert): Promise<Alert>;
  markAlertAsRead(id: number): Promise<Alert | undefined>;
  markAlertAsResolved(id: number): Promise<Alert | undefined>;

  // Family member operations
  getFamilyMembersByUserId(userId: number): Promise<FamilyMember[]>;
  getFamilyMember(id: number): Promise<FamilyMember | undefined>;
  createFamilyMember(familyMember: InsertFamilyMember): Promise<FamilyMember>;
  updateFamilyMember(id: number, updates: Partial<FamilyMember>): Promise<FamilyMember | undefined>;
  deleteFamilyMember(id: number): Promise<boolean>;

  // Bill operations
  getBillsByUserId(userId: number): Promise<Bill[]>;
  getUpcomingBills(userId: number, days?: number): Promise<Bill[]>;
  createBill(bill: InsertBill): Promise<Bill>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private accounts: Map<number, Account>;
  private transactions: Map<number, Transaction>;
  private alerts: Map<number, Alert>;
  private familyMembers: Map<number, FamilyMember>;
  private bills: Map<number, Bill>;
  private authTokens: Map<string, AuthToken>;
  private currentId: number;

  constructor() {
    this.users = new Map();
    this.accounts = new Map();
    this.transactions = new Map();
    this.alerts = new Map();
    this.familyMembers = new Map();
    this.bills = new Map();
    this.authTokens = new Map();
    this.currentId = 1;

    // Initialize with mock data
    this.initializeMockData();
  }

  private initializeMockData() {
    // Create a demo user
    const user: User = {
      id: this.currentId++,
      username: "mary.johnson",
      password: "password123",
      fullName: "Mary Johnson",
      email: "mary.johnson@email.com",
      phoneNumber: "(555) 123-4567",
      createdAt: new Date(),
    };
    this.users.set(user.id, user);

    // Create demo accounts
    const checkingAccount: Account = {
      id: this.currentId++,
      userId: user.id,
      accountName: "First National Checking",
      accountType: "checking",
      accountNumber: "****1234",
      balance: "4823.45",
      isActive: true,
      createdAt: new Date(),
    };
    this.accounts.set(checkingAccount.id, checkingAccount);

    const creditAccount: Account = {
      id: this.currentId++,
      userId: user.id,
      accountName: "Visa Credit Card",
      accountType: "credit",
      accountNumber: "****5678",
      balance: "342.18",
      isActive: true,
      createdAt: new Date(),
    };
    this.accounts.set(creditAccount.id, creditAccount);

    // Create demo transactions
    const transactions = [
      {
        id: this.currentId++,
        accountId: creditAccount.id,
        amount: "-299.99",
        merchant: "Online Purchase - Tech Support",
        category: "Technology",
        description: "Suspicious tech support charge",
        transactionDate: new Date(),
        isSpending: true,
        suspiciousScore: 95,
        isFlagged: true,
        reviewStatus: "pending",
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        accountId: checkingAccount.id,
        amount: "-67.43",
        merchant: "Safeway Grocery",
        category: "Groceries",
        description: "Weekly grocery shopping",
        transactionDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
        isSpending: true,
        suspiciousScore: 5,
        isFlagged: false,
        reviewStatus: "approved",
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        accountId: checkingAccount.id,
        amount: "-24.99",
        merchant: "CVS Pharmacy",
        category: "Healthcare",
        description: "Prescription pickup",
        transactionDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
        isSpending: true,
        suspiciousScore: 2,
        isFlagged: false,
        reviewStatus: "approved",
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        accountId: checkingAccount.id,
        amount: "-89.50",
        merchant: "Shell Gas Station",
        category: "Transportation",
        description: "Fuel purchase",
        transactionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000),
        isSpending: true,
        suspiciousScore: 8,
        isFlagged: false,
        reviewStatus: "approved",
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        accountId: creditAccount.id,
        amount: "-450.00",
        merchant: "Unknown Merchant 789",
        category: "Technology",
        description: "Large unauthorized charge",
        transactionDate: new Date(Date.now() - 12 * 60 * 60 * 1000),
        isSpending: true,
        suspiciousScore: 92,
        isFlagged: true,
        reviewStatus: "pending",
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        accountId: checkingAccount.id,
        amount: "-125.00",
        merchant: "Pacific Electric",
        category: "Utilities",
        description: "Monthly electric bill",
        transactionDate: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000),
        isSpending: true,
        suspiciousScore: 3,
        isFlagged: false,
        reviewStatus: "approved",
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        accountId: checkingAccount.id,
        amount: "-45.00",
        merchant: "Amazon.com",
        category: "Shopping",
        description: "Household supplies",
        transactionDate: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        isSpending: true,
        suspiciousScore: 12,
        isFlagged: false,
        reviewStatus: "approved",
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        accountId: creditAccount.id,
        amount: "-78.25",
        merchant: "Walgreens Pharmacy",
        category: "Healthcare",
        description: "Medication refill",
        transactionDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
        isSpending: true,
        suspiciousScore: 4,
        isFlagged: false,
        reviewStatus: "approved",
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        accountId: checkingAccount.id,
        amount: "-320.00",
        merchant: "Overseas ATM - Location Unknown",
        category: "Banking",
        description: "ATM withdrawal in foreign country",
        transactionDate: new Date(Date.now() - 6 * 60 * 60 * 1000),
        isSpending: true,
        suspiciousScore: 88,
        isFlagged: true,
        reviewStatus: "pending",
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        accountId: checkingAccount.id,
        amount: "-52.75",
        merchant: "Target Store",
        category: "Shopping",
        description: "Personal care items",
        transactionDate: new Date(Date.now() - 8 * 24 * 60 * 60 * 1000),
        isSpending: true,
        suspiciousScore: 7,
        isFlagged: false,
        reviewStatus: "approved",
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        accountId: checkingAccount.id,
        amount: "-95.00",
        merchant: "Comcast Cable",
        category: "Utilities",
        description: "Monthly internet/cable bill",
        transactionDate: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000),
        isSpending: true,
        suspiciousScore: 5,
        isFlagged: false,
        reviewStatus: "approved",
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        accountId: creditAccount.id,
        amount: "-18.95",
        merchant: "Netflix Subscription",
        category: "Entertainment",
        description: "Monthly streaming service",
        transactionDate: new Date(Date.now() - 15 * 24 * 60 * 60 * 1000),
        isSpending: true,
        suspiciousScore: 1,
        isFlagged: false,
        reviewStatus: "approved",
        createdAt: new Date(),
      }
    ];

    transactions.forEach(t => this.transactions.set(t.id, t));

    // Create demo alerts
    const alertList = [
      {
        id: this.currentId++,
        userId: user.id,
        transactionId: transactions[0].id,
        alertType: "suspicious_transaction",
        severity: "high",
        title: "High Risk Transaction",
        description: "Unusual online purchase detected",
        isRead: false,
        isResolved: false,
        createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000),
      },
      {
        id: this.currentId++,
        userId: user.id,
        transactionId: null,
        alertType: "bill_reminder",
        severity: "medium",
        title: "Bill Reminder",
        description: "Electric bill due in 3 days",
        isRead: false,
        isResolved: false,
        createdAt: new Date(Date.now() - 24 * 60 * 60 * 1000),
      },
    ];

    alertList.forEach(a => this.alerts.set(a.id, a));

    // Create demo family members
    const family = [
      {
        id: this.currentId++,
        userId: user.id,
        name: "Sarah Johnson",
        relationship: "Daughter",
        email: "sarah.johnson@email.com",
        phoneNumber: "(555) 987-6543",
        receiveAlerts: true,
        alertTypes: ["suspicious_transaction", "high_spending"],
        createdAt: new Date(),
      },
      {
        id: this.currentId++,
        userId: user.id,
        name: "Tom Johnson",
        relationship: "Son",
        email: "tom.johnson@email.com",
        phoneNumber: "(555) 876-5432",
        receiveAlerts: true,
        alertTypes: ["suspicious_transaction"],
        createdAt: new Date(),
      },
    ];

    family.forEach(f => this.familyMembers.set(f.id, f));
  }

  // User operations
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(user => user.email === email);
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.currentId++;
    const user: User = { ...insertUser, id, createdAt: new Date() };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User | undefined> {
    const user = this.users.get(id);
    if (user) {
      Object.assign(user, updates);
      this.users.set(id, user);
    }
    return user;
  }

  // Auth token operations
  async createAuthToken(insertToken: InsertAuthToken): Promise<AuthToken> {
    const token: AuthToken = { ...insertToken, createdAt: new Date() };
    this.authTokens.set(token.token, token);
    return token;
  }

  async getAuthToken(token: string): Promise<AuthToken | undefined> {
    return this.authTokens.get(token);
  }

  async markAuthTokenUsed(token: string): Promise<AuthToken | undefined> {
    const authToken = this.authTokens.get(token);
    if (authToken) {
      authToken.usedAt = new Date();
      this.authTokens.set(token, authToken);
    }
    return authToken;
  }

  async deleteAuthToken(token: string): Promise<boolean> {
    return this.authTokens.delete(token);
  }

  // Account operations
  async getAccountsByUserId(userId: number): Promise<Account[]> {
    return Array.from(this.accounts.values()).filter(account => account.userId === userId);
  }

  async getAccount(id: number): Promise<Account | undefined> {
    return this.accounts.get(id);
  }

  async verifyAccountOwnership(accountId: number, userId: number): Promise<boolean> {
    const account = await this.getAccount(accountId);
    return account?.userId === userId;
  }

  async getAccountByYodleeId(yodleeId: string): Promise<Account | undefined> {
    return Array.from(this.accounts.values()).find(account => account.yodleeAccountId === yodleeId);
  }

  async createAccount(insertAccount: InsertAccount): Promise<Account> {
    const id = this.currentId++;
    const account: Account = { ...insertAccount, id, createdAt: new Date() };
    this.accounts.set(id, account);
    return account;
  }

  async updateAccount(id: number, updates: Partial<Account>): Promise<Account | undefined> {
    const account = this.accounts.get(id);
    if (account) {
      Object.assign(account, updates);
      this.accounts.set(id, account);
    }
    return account;
  }

  async updateAccountBalance(id: number, balance: string): Promise<Account | undefined> {
    const account = this.accounts.get(id);
    if (account) {
      account.balance = balance;
      this.accounts.set(id, account);
    }
    return account;
  }

  // Transaction operations
  async getAllTransactions(): Promise<Transaction[]> {
    return Array.from(this.transactions.values())
      .sort((a, b) => a.transactionDate.getTime() - b.transactionDate.getTime());
  }

  async getTransactionsByAccountId(accountId: number, userId: number): Promise<Transaction[]> {
    // First verify account ownership
    const isOwner = await this.verifyAccountOwnership(accountId, userId);
    if (!isOwner) {
      return [];
    }

    return Array.from(this.transactions.values())
      .filter(transaction => transaction.accountId === accountId)
      .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
  }

  async getTransactionsByUserId(userId: number): Promise<Transaction[]> {
    const userAccounts = await this.getAccountsByUserId(userId);
    const accountIds = userAccounts.map(account => account.id);
    
    return Array.from(this.transactions.values())
      .filter(transaction => accountIds.includes(transaction.accountId))
      .sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
  }

  async getRecentTransactions(userId: number, limit: number = 10): Promise<Transaction[]> {
    const transactions = await this.getTransactionsByUserId(userId);
    return transactions.slice(0, limit);
  }

  async getTransaction(id: number): Promise<Transaction | undefined> {
    return this.transactions.get(id);
  }

  async getTransactionByYodleeId(yodleeId: string): Promise<Transaction | undefined> {
    return Array.from(this.transactions.values()).find(
      transaction => transaction.yodleeTransactionId === yodleeId
    );
  }

  async createTransaction(insertTransaction: InsertTransaction): Promise<Transaction> {
    const id = this.currentId++;
    const transaction: Transaction = { ...insertTransaction, id, createdAt: new Date() };
    this.transactions.set(id, transaction);
    return transaction;
  }

  async updateTransaction(id: number, updates: Partial<Transaction>): Promise<Transaction | undefined> {
    const transaction = this.transactions.get(id);
    if (transaction) {
      Object.assign(transaction, updates);
      this.transactions.set(id, transaction);
    }
    return transaction;
  }

  // Alert operations
  async getAlertsByUserId(userId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.userId === userId)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getUnreadAlerts(userId: number): Promise<Alert[]> {
    return Array.from(this.alerts.values())
      .filter(alert => alert.userId === userId && !alert.isRead)
      .sort((a, b) => b.createdAt!.getTime() - a.createdAt!.getTime());
  }

  async getAlertById(id: number): Promise<Alert | undefined> {
    return this.alerts.get(id);
  }

  async createAlert(insertAlert: InsertAlert): Promise<Alert> {
    const id = this.currentId++;
    const alert: Alert = { ...insertAlert, id, createdAt: new Date() };
    this.alerts.set(id, alert);
    return alert;
  }

  async markAlertAsRead(id: number): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.isRead = true;
      this.alerts.set(id, alert);
    }
    return alert;
  }

  async markAlertAsResolved(id: number): Promise<Alert | undefined> {
    const alert = this.alerts.get(id);
    if (alert) {
      alert.isResolved = true;
      this.alerts.set(id, alert);
    }
    return alert;
  }

  // Family member operations
  async getFamilyMembersByUserId(userId: number): Promise<FamilyMember[]> {
    return Array.from(this.familyMembers.values()).filter(member => member.userId === userId);
  }

  async getFamilyMember(id: number): Promise<FamilyMember | undefined> {
    return this.familyMembers.get(id);
  }

  async createFamilyMember(insertFamilyMember: InsertFamilyMember): Promise<FamilyMember> {
    const id = this.currentId++;
    const familyMember: FamilyMember = { 
      ...insertFamilyMember, 
      id, 
      createdAt: new Date(),
      phoneNumber: insertFamilyMember.phoneNumber || null,
      receiveAlerts: insertFamilyMember.receiveAlerts ?? true,
      alertTypes: insertFamilyMember.alertTypes || []
    };
    this.familyMembers.set(id, familyMember);
    return familyMember;
  }

  async updateFamilyMember(id: number, updates: Partial<FamilyMember>): Promise<FamilyMember | undefined> {
    const familyMember = this.familyMembers.get(id);
    if (familyMember) {
      Object.assign(familyMember, updates);
      this.familyMembers.set(id, familyMember);
    }
    return familyMember;
  }

  async deleteFamilyMember(id: number): Promise<boolean> {
    return this.familyMembers.delete(id);
  }

  // Bill operations
  async getBillsByUserId(userId: number): Promise<Bill[]> {
    return Array.from(this.bills.values()).filter(bill => bill.userId === userId);
  }

  async getUpcomingBills(userId: number, days: number = 7): Promise<Bill[]> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() + days);
    
    return Array.from(this.bills.values())
      .filter(bill => bill.userId === userId && bill.dueDate <= cutoffDate && !bill.isPaid);
  }

  async createBill(insertBill: InsertBill): Promise<Bill> {
    const id = this.currentId++;
    const bill: Bill = { ...insertBill, id, createdAt: new Date() };
    this.bills.set(id, bill);
    return bill;
  }
}

export const storage = new MemStorage();
