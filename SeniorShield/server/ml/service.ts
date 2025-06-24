import { Transaction } from '../../shared/schema';
import { FraudDetectionService } from './models';
import { storage } from '../storage';

class MLService {
  private fraudDetectionService: FraudDetectionService;
  private isInitialized: boolean = false;

  constructor() {
    this.fraudDetectionService = new FraudDetectionService();
  }

  async initialize() {
    if (this.isInitialized) {
      return;
    }

    // Get historical transactions for training
    const historicalTransactions = await storage.getAllTransactions();
    await this.fraudDetectionService.initialize(historicalTransactions);
    
    this.isInitialized = true;
    console.log('ML Service initialized successfully');
  }

  async analyzeTransaction(transaction: Transaction, userId: number): Promise<{
    suspiciousScore: number;
    isAnomaly: boolean;
    anomalyScore: number;
    behavioralScore: number;
    features: any;
  }> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    // Get historical transactions for this user
    const historicalTransactions = await storage.getTransactionsByUserId(userId);
    
    // Analyze the transaction
    const result = await this.fraudDetectionService.analyzeTransaction(
      transaction,
      userId,
      historicalTransactions
    );

    // If transaction is suspicious, create an alert
    if (result.isAnomaly) {
      await storage.createAlert({
        userId,
        transactionId: transaction.id,
        alertType: 'suspicious_transaction',
        severity: result.suspiciousScore >= 90 ? 'high' : 'medium',
        title: 'Suspicious Transaction Detected',
        description: `Transaction of ${transaction.amount} at ${transaction.merchant} has been flagged as suspicious with a risk score of ${result.suspiciousScore}/100.`,
      });
    }

    return result;
  }

  // Analyze a batch of transactions (useful for background processing)
  async analyzeTransactions(transactions: Transaction[]): Promise<Map<number, any>> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const results = new Map<number, any>();
    
    for (const transaction of transactions) {
      const result = await this.analyzeTransaction(transaction, transaction.accountId);
      results.set(transaction.id, result);
    }

    return results;
  }
}

// Export singleton instance
export const mlService = new MLService();