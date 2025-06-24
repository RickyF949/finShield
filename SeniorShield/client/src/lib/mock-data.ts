// This file contains mock data generation utilities for demonstration purposes
// In a real application, this would be replaced with actual API calls

export interface MockTransaction {
  id: number;
  amount: string;
  merchant: string;
  category: string;
  transactionDate: Date;
  isSpending: boolean;
  suspiciousScore: number;
  isFlagged: boolean;
  reviewStatus: string;
}

export interface MockAlert {
  id: number;
  title: string;
  description: string;
  severity: string;
  alertType: string;
  createdAt: Date;
  isRead: boolean;
}

export const generateMockTransactions = (count: number = 20): MockTransaction[] => {
  const merchants = [
    { name: "Safeway Grocery", category: "Groceries", suspicious: false },
    { name: "CVS Pharmacy", category: "Healthcare", suspicious: false },
    { name: "Shell Gas Station", category: "Transportation", suspicious: false },
    { name: "Amazon.com", category: "Shopping", suspicious: false },
    { name: "Medicare Payment", category: "Healthcare", suspicious: false },
    { name: "Online Purchase - Tech Support", category: "Technology", suspicious: true },
    { name: "Unknown Vendor 123", category: "Technology", suspicious: true },
    { name: "Overseas ATM Withdrawal", category: "Banking", suspicious: true },
  ];

  const transactions: MockTransaction[] = [];
  
  for (let i = 0; i < count; i++) {
    const merchant = merchants[Math.floor(Math.random() * merchants.length)];
    const daysAgo = Math.floor(Math.random() * 30);
    const amount = merchant.suspicious 
      ? (200 + Math.random() * 500).toFixed(2)
      : (10 + Math.random() * 150).toFixed(2);
    
    transactions.push({
      id: i + 1,
      amount: `-${amount}`,
      merchant: merchant.name,
      category: merchant.category,
      transactionDate: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000),
      isSpending: true,
      suspiciousScore: merchant.suspicious ? 80 + Math.random() * 20 : Math.random() * 30,
      isFlagged: merchant.suspicious,
      reviewStatus: merchant.suspicious ? "pending" : "approved"
    });
  }

  return transactions.sort((a, b) => b.transactionDate.getTime() - a.transactionDate.getTime());
};

export const generateMockAlerts = (count: number = 5): MockAlert[] => {
  const alertTemplates = [
    {
      title: "High Risk Transaction",
      description: "Unusual online purchase detected",
      severity: "high",
      alertType: "suspicious_transaction"
    },
    {
      title: "Bill Reminder",
      description: "Electric bill due in 3 days",
      severity: "medium", 
      alertType: "bill_reminder"
    },
    {
      title: "Large Purchase Alert",
      description: "Purchase over your usual spending limit",
      severity: "medium",
      alertType: "unusual_spending"
    },
    {
      title: "New Device Login",
      description: "Account accessed from new device",
      severity: "low",
      alertType: "security_notice"
    }
  ];

  const alerts: MockAlert[] = [];
  
  for (let i = 0; i < count; i++) {
    const template = alertTemplates[Math.floor(Math.random() * alertTemplates.length)];
    const hoursAgo = Math.floor(Math.random() * 72);
    
    alerts.push({
      id: i + 1,
      title: template.title,
      description: template.description,
      severity: template.severity,
      alertType: template.alertType,
      createdAt: new Date(Date.now() - hoursAgo * 60 * 60 * 1000),
      isRead: Math.random() > 0.7
    });
  }

  return alerts.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
};

export const calculateSpendingByCategory = (transactions: MockTransaction[]): Record<string, number> => {
  return transactions
    .filter(t => t.isSpending && !t.isFlagged)
    .reduce((acc, transaction) => {
      const category = transaction.category;
      const amount = Math.abs(parseFloat(transaction.amount));
      acc[category] = (acc[category] || 0) + amount;
      return acc;
    }, {} as Record<string, number>);
};
