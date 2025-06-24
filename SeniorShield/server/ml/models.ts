import { Transaction } from '../../shared/schema';
import { randomForest } from '@tensorflow/tfjs-node';

// Feature engineering functions
export function extractTransactionFeatures(transaction: Transaction, historicalTransactions: Transaction[]) {
  // Time-based features
  const hour = new Date(transaction.transactionDate).getHours();
  const dayOfWeek = new Date(transaction.transactionDate).getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  // Amount-based features
  const amount = Math.abs(parseFloat(transaction.amount.toString()));
  
  // Calculate historical statistics for this merchant
  const merchantTransactions = historicalTransactions.filter(t => t.merchant === transaction.merchant);
  const merchantAvgAmount = merchantTransactions.length > 0 
    ? merchantTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount.toString())), 0) / merchantTransactions.length 
    : 0;
  
  // Calculate historical statistics for this category
  const categoryTransactions = historicalTransactions.filter(t => t.category === transaction.category);
  const categoryAvgAmount = categoryTransactions.length > 0
    ? categoryTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount.toString())), 0) / categoryTransactions.length
    : 0;

  // Velocity checks
  const last24Hours = historicalTransactions.filter(t => {
    const timeDiff = new Date(transaction.transactionDate).getTime() - new Date(t.transactionDate).getTime();
    return timeDiff <= 24 * 60 * 60 * 1000;
  });
  
  const transactionVelocity24h = last24Hours.length;
  const totalAmount24h = last24Hours.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount.toString())), 0);

  return {
    hour,
    isWeekend: isWeekend ? 1 : 0,
    amount,
    amountVsMerchantAvg: amount / (merchantAvgAmount || amount),
    amountVsCategoryAvg: amount / (categoryAvgAmount || amount),
    transactionVelocity24h,
    totalAmount24h,
    merchantFrequency: merchantTransactions.length / historicalTransactions.length,
    categoryFrequency: categoryTransactions.length / historicalTransactions.length,
  };
}

// Anomaly detection using Isolation Forest
export class AnomalyDetector {
  private model: any;
  private readonly contamination: number = 0.1; // Expected proportion of anomalies

  async train(transactions: Transaction[]) {
    const features = transactions.map(t => 
      extractTransactionFeatures(t, transactions.filter(ht => 
        new Date(ht.transactionDate) < new Date(t.transactionDate)
      ))
    );

    // Convert features to tensor
    const featureMatrix = features.map(f => Object.values(f));
    
    // Train isolation forest model
    this.model = await randomForest.createIsolationForest({
      contamination: this.contamination,
      nEstimators: 100,
      maxSamples: 'auto'
    });

    await this.model.fit(featureMatrix);
  }

  async detectAnomaly(transaction: Transaction, historicalTransactions: Transaction[]) {
    if (!this.model) {
      throw new Error('Model not trained');
    }

    const features = extractTransactionFeatures(transaction, historicalTransactions);
    const featureVector = Object.values(features);
    
    // Get anomaly score (-1 for anomalies, 1 for normal points)
    const prediction = await this.model.predict([featureVector]);
    
    // Convert to probability-like score between 0 and 100
    // -1 (anomaly) maps to 100, 1 (normal) maps to 0
    const score = Math.round(((1 - prediction[0]) / 2) * 100);
    
    return {
      score,
      isAnomaly: score > 70, // threshold can be adjusted
      features
    };
  }
}

// Behavioral profiling
export class BehavioralProfiler {
  private userProfiles: Map<number, any> = new Map();

  updateProfile(userId: number, transactions: Transaction[]) {
    const profile = {
      typicalDayHours: new Set<number>(),
      typicalMerchants: new Set<string>(),
      typicalCategories: new Set<string>(),
      averageAmount: 0,
      transactionFrequency: 0, // transactions per day
    };

    // Calculate profile metrics
    transactions.forEach(t => {
      const hour = new Date(t.transactionDate).getHours();
      profile.typicalDayHours.add(hour);
      profile.typicalMerchants.add(t.merchant);
      profile.typicalCategories.add(t.category);
    });

    // Calculate average amount
    const totalAmount = transactions.reduce((sum, t) => 
      sum + Math.abs(parseFloat(t.amount.toString())), 0);
    profile.averageAmount = totalAmount / transactions.length;

    // Calculate transaction frequency
    const daysDiff = (new Date(transactions[transactions.length - 1].transactionDate).getTime() - 
      new Date(transactions[0].transactionDate).getTime()) / (1000 * 60 * 60 * 24);
    profile.transactionFrequency = transactions.length / (daysDiff || 1);

    this.userProfiles.set(userId, profile);
  }

  async analyzeTransaction(userId: number, transaction: Transaction): Promise<number> {
    const profile = this.userProfiles.get(userId);
    if (!profile) {
      return 0; // No profile available
    }

    let riskScore = 0;
    const hour = new Date(transaction.transactionDate).getHours();
    const amount = Math.abs(parseFloat(transaction.amount.toString()));

    // Unusual hour
    if (!profile.typicalDayHours.has(hour)) {
      riskScore += 20;
    }

    // New merchant
    if (!profile.typicalMerchants.has(transaction.merchant)) {
      riskScore += 15;
    }

    // New category
    if (!profile.typicalCategories.has(transaction.category)) {
      riskScore += 10;
    }

    // Unusual amount (more than 2x average)
    if (amount > profile.averageAmount * 2) {
      riskScore += 25;
    }

    return Math.min(riskScore, 100);
  }
}

// Fraud detection service that combines all approaches
export class FraudDetectionService {
  private anomalyDetector: AnomalyDetector;
  private behavioralProfiler: BehavioralProfiler;
  private userClassifiers: Map<number, RandomForestClassifier> = new Map();

  constructor() {
    this.anomalyDetector = new AnomalyDetector();
    this.behavioralProfiler = new BehavioralProfiler();
  }

  async initialize(historicalTransactions: Transaction[]) {
    // Train anomaly detection model
    await this.anomalyDetector.train(historicalTransactions);

    // Group transactions by user
    const userTransactions = new Map<number, Transaction[]>();
    historicalTransactions.forEach(t => {
      if (!userTransactions.has(t.accountId)) {
        userTransactions.set(t.accountId, []);
      }
      userTransactions.get(t.accountId)!.push(t);
    });

    // Initialize per-user models
    for (const [userId, transactions] of userTransactions.entries()) {
      // Build behavioral profile
      this.behavioralProfiler.updateProfile(userId, transactions);
      
      // Create and train Random Forest classifier
      const classifier = new RandomForestClassifier(userId);
      const labels = transactions.map(t => t.isFlagged);
      await classifier.train(transactions, labels);
      this.userClassifiers.set(userId, classifier);
    }
  }

  async analyzeTransaction(transaction: Transaction, userId: number, historicalTransactions: Transaction[]) {
    // Get anomaly detection score
    const anomalyResult = await this.anomalyDetector.detectAnomaly(transaction, historicalTransactions);
    
    // Get behavioral analysis score
    const behavioralScore = await this.behavioralProfiler.analyzeTransaction(userId, transaction);

    // Get Random Forest classifier score
    let classifierScore = 0;
    if (this.userClassifiers.has(userId)) {
      classifierScore = await this.userClassifiers.get(userId)!.predict(transaction, historicalTransactions);
    } else {
      // Create new classifier for this user if it doesn't exist
      const classifier = new RandomForestClassifier(userId);
      await classifier.train(historicalTransactions, historicalTransactions.map(t => t.isFlagged));
      this.userClassifiers.set(userId, classifier);
      classifierScore = await classifier.predict(transaction, historicalTransactions);
    }

    // Combine scores with weighted average
    const combinedScore = Math.round(
      (anomalyResult.score * 0.4) + 
      (behavioralScore * 0.3) + 
      (classifierScore * 0.3)
    );

    return {
      suspiciousScore: combinedScore,
      isAnomaly: combinedScore > 70,
      anomalyScore: anomalyResult.score,
      behavioralScore,
      classifierScore,
      features: anomalyResult.features
    };
  }

  // Update models with feedback
  async updateModels(transaction: Transaction, userId: number, isActuallyFraud: boolean, historicalTransactions: Transaction[]) {
    // Update behavioral profile
    this.behavioralProfiler.updateProfile(userId, [...historicalTransactions, transaction]);
    
    // Update Random Forest classifier
    if (this.userClassifiers.has(userId)) {
      await this.userClassifiers.get(userId)!.updateModel(transaction, isActuallyFraud, historicalTransactions);
    }
  }
}