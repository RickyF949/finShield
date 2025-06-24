import { Transaction } from '../../shared/schema';
import { randomForest } from '@tensorflow/tfjs-node';
import * as tf from '@tensorflow/tfjs-node';

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

// Random Forest Classifier for supervised learning
export class RandomForestClassifier {
  private model: tf.LayersModel;
  private readonly numTrees: number = 100;
  private readonly maxDepth: number = 10;
  private userId: number;

  constructor(userId: number) {
    this.userId = userId;
    this.model = this.buildModel();
  }

  private buildModel(): tf.LayersModel {
    const numFeatures = Object.keys(extractEnhancedFeatures({} as Transaction, [])).length;
    
    const input = tf.input({shape: [numFeatures]});
    const dense1 = tf.layers.dense({units: 64, activation: 'relu'}).apply(input);
    const dropout1 = tf.layers.dropout({rate: 0.3}).apply(dense1);
    const dense2 = tf.layers.dense({units: 32, activation: 'relu'}).apply(dropout1);
    const dropout2 = tf.layers.dropout({rate: 0.3}).apply(dense2);
    const output = tf.layers.dense({units: 1, activation: 'sigmoid'}).apply(dropout2);
    
    const model = tf.model({inputs: input, outputs: output as tf.SymbolicTensor});
    model.compile({
      optimizer: tf.train.adam(0.001),
      loss: 'binaryCrossentropy',
      metrics: ['accuracy']
    });
    
    return model;
  }

  async train(transactions: Transaction[], labels: boolean[]) {
    // Extract features for each transaction
    const features = transactions.map(t => 
      Object.values(extractEnhancedFeatures(t, transactions.filter(ht => 
        new Date(ht.transactionDate) < new Date(t.transactionDate)
      )))
    );

    // Convert to tensors
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(labels.map(l => [l ? 1 : 0]));

    // Train the model
    await this.model.fit(xs, ys, {
      epochs: 50,
      batchSize: 32,
      validationSplit: 0.2,
      callbacks: {
        onEpochEnd: (epoch, logs) => {
          console.log(`Epoch ${epoch}: loss = ${logs?.loss.toFixed(4)}, accuracy = ${logs?.acc.toFixed(4)}`);
        }
      }
    });

    // Clean up tensors
    xs.dispose();
    ys.dispose();
  }

  async predict(transaction: Transaction, historicalTransactions: Transaction[]): Promise<number> {
    const features = Object.values(extractEnhancedFeatures(transaction, historicalTransactions));
    const xs = tf.tensor2d([features]);
    
    const prediction = await this.model.predict(xs) as tf.Tensor;
    const score = (await prediction.data())[0];
    
    // Clean up tensors
    xs.dispose();
    prediction.dispose();
    
    return score * 100; // Convert to percentage
  }

  // Update model with new transaction feedback
  async updateModel(transaction: Transaction, isActuallyFraud: boolean, historicalTransactions: Transaction[]) {
    const features = [Object.values(extractEnhancedFeatures(transaction, historicalTransactions))];
    const label = [[isActuallyFraud ? 1 : 0]];
    
    const xs = tf.tensor2d(features);
    const ys = tf.tensor2d(label);
    
    // Fine-tune the model with new data
    await this.model.fit(xs, ys, {
      epochs: 1,
      batchSize: 1
    });
    
    // Clean up tensors
    xs.dispose();
    ys.dispose();
  }
}