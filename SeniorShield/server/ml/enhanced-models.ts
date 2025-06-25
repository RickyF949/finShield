import { Transaction } from '../../shared/schema';
import * as tf from '@tensorflow/tfjs-node';
import { extractTransactionFeatures } from './models';
import { RandomForestClassifier as MLRandomForest } from 'ml-random-forest';

// Enhanced feature engineering with more sophisticated patterns
export function extractEnhancedFeatures(transaction: Transaction, historicalTransactions: Transaction[]) {
  // Basic features from original implementation
  const baseFeatures = extractTransactionFeatures(transaction, historicalTransactions);
  
  // Time-based patterns
  const transactionDate = new Date(transaction.transactionDate);
  const hour = transactionDate.getHours();
  const minute = transactionDate.getMinutes();
  const dayOfWeek = transactionDate.getDay();
  const dayOfMonth = transactionDate.getDate();
  const month = transactionDate.getMonth();
  
  // Enhanced velocity checks
  const timeWindows = [1, 3, 6, 12, 24, 72]; // hours
  const velocityFeatures = timeWindows.reduce((acc, hours) => {
    const windowTransactions = historicalTransactions.filter(t => {
      const timeDiff = transactionDate.getTime() - new Date(t.transactionDate).getTime();
      return timeDiff <= hours * 60 * 60 * 1000;
    });
    
    return {
      ...acc,
      [`transactions_${hours}h`]: windowTransactions.length,
      [`amount_${hours}h`]: windowTransactions.reduce((sum, t) => sum + Math.abs(parseFloat(t.amount.toString())), 0),
      [`unique_merchants_${hours}h`]: new Set(windowTransactions.map(t => t.merchant)).size,
      [`unique_categories_${hours}h`]: new Set(windowTransactions.map(t => t.category)).size
    };
  }, {});

  // Location/merchant patterns
  const merchantStats = historicalTransactions.filter(t => t.merchant === transaction.merchant);
  const lastMerchantTransaction = merchantStats.length > 0 ? 
    Math.abs(transactionDate.getTime() - new Date(merchantStats[merchantStats.length - 1].transactionDate).getTime()) / (1000 * 60 * 60) : 
    Infinity;

  // Category patterns
  const categoryStats = historicalTransactions.filter(t => t.category === transaction.category);
  const lastCategoryTransaction = categoryStats.length > 0 ?
    Math.abs(transactionDate.getTime() - new Date(categoryStats[categoryStats.length - 1].transactionDate).getTime()) / (1000 * 60 * 60) :
    Infinity;

  // Amount patterns
  const amount = Math.abs(parseFloat(transaction.amount.toString()));
  const recentAmounts = historicalTransactions
    .slice(-10)
    .map(t => Math.abs(parseFloat(t.amount.toString())));
  const avgRecentAmount = recentAmounts.length > 0 ? 
    recentAmounts.reduce((a, b) => a + b, 0) / recentAmounts.length : 
    amount;
  const stdRecentAmount = recentAmounts.length > 0 ?
    Math.sqrt(recentAmounts.reduce((acc, val) => acc + Math.pow(val - avgRecentAmount, 2), 0) / recentAmounts.length) :
    0;

  return {
    ...baseFeatures,
    ...velocityFeatures,
    hour,
    minute,
    dayOfWeek,
    dayOfMonth,
    month,
    lastMerchantTransaction,
    lastCategoryTransaction,
    merchantTransactionCount: merchantStats.length,
    categoryTransactionCount: categoryStats.length,
    amountZScore: stdRecentAmount !== 0 ? (amount - avgRecentAmount) / stdRecentAmount : 0,
    isRoundAmount: amount % 1 === 0 || amount % 5 === 0 || amount % 10 === 0,
    hasPreviousFraud: historicalTransactions.some(t => t.isFlagged)
  };
}

// Random Forest Classifier using ml-random-forest
export class RandomForestClassifier {
  private model: MLRandomForest | null = null;
  private userId: number;

  constructor(userId: number) {
    this.userId = userId;
  }

  async train(transactions: Transaction[], labels: boolean[]) {
    if (transactions.length === 0) return;
    
    // Extract features for each transaction
    const features = transactions.map(t => 
      Object.values(extractEnhancedFeatures(t, transactions.filter(ht => 
        new Date(ht.transactionDate) < new Date(t.transactionDate)
      )))
    );

    // Train Random Forest model
    this.model = new MLRandomForest({
      nEstimators: 50,
      maxDepth: 10,
      minSamplesLeaf: 2
    });
    
    this.model.train(features, labels);
  }

  async predict(transaction: Transaction, historicalTransactions: Transaction[]): Promise<number> {
    if (!this.model) {
      return 0;
    }
    
    const features = Object.values(extractEnhancedFeatures(transaction, historicalTransactions));
    const prediction = this.model.predict([features])[0];
    
    return prediction ? 100 : 0; // Convert boolean to percentage
  }

  // Update model with new transaction feedback
  async updateModel(transaction: Transaction, isActuallyFraud: boolean, historicalTransactions: Transaction[]) {
    // For simplicity, we'll retrain with all data including the new transaction
    const allTransactions = [...historicalTransactions, transaction];
    const allLabels = [...historicalTransactions.map(t => t.isFlagged), isActuallyFraud];
    
    await this.train(allTransactions, allLabels);
  }
}