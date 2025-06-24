import { Router } from 'express';
import { storage } from './storage';
import { yodleeClient } from './yodlee';
import { convertYodleeTransaction } from './yodlee';

const router = Router();

// Get FastLink token for account linking
router.post('/fastlink-token', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const fastLinkToken = await yodleeClient.getFastLinkToken(req.user.id.toString());
    res.json({ token: fastLinkToken });
  } catch (error) {
    console.error('FastLink token error:', error);
    res.status(500).json({ message: 'Failed to get FastLink token' });
  }
});

// Sync Yodlee accounts for user
router.post('/sync-accounts', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const yodleeAccounts = await yodleeClient.getAccounts(req.user.id.toString());
    
    for (const yodleeAccount of yodleeAccounts) {
      // Check if account already exists
      const existingAccount = await storage.getAccountByYodleeId(yodleeAccount.id);
      
      const accountData = {
        userId: req.user.id,
        accountName: yodleeAccount.accountName,
        accountType: yodleeAccount.accountType.toLowerCase(),
        accountNumber: yodleeAccount.accountNumber,
        balance: yodleeAccount.balance.amount,
        yodleeAccountId: yodleeAccount.id,
        yodleeProviderName: yodleeAccount.providerName,
        yodleeLastUpdate: new Date(yodleeAccount.lastUpdated),
      };

      if (existingAccount) {
        await storage.updateAccount(existingAccount.id, accountData);
      } else {
        await storage.createAccount(accountData);
      }
    }

    const updatedAccounts = await storage.getAccountsByUserId(req.user.id);
    res.json(updatedAccounts);
  } catch (error) {
    console.error('Sync accounts error:', error);
    res.status(500).json({ message: 'Failed to sync accounts' });
  }
});

// Sync transactions for a specific account
router.post('/sync-transactions/:accountId', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const accountId = parseInt(req.params.accountId);
    const account = await storage.getAccount(accountId);

    if (!account || account.userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!account.yodleeAccountId) {
      return res.status(400).json({ message: 'Account not linked to Yodlee' });
    }

    // Get transactions from last 90 days by default
    const toDate = new Date().toISOString().split('T')[0];
    const fromDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

    const yodleeTransactions = await yodleeClient.getTransactions(account.yodleeAccountId, fromDate, toDate);

    for (const yodleeTx of yodleeTransactions) {
      // Check if transaction already exists
      const existingTx = await storage.getTransactionByYodleeId(yodleeTx.id);
      
      const transactionData = {
        ...convertYodleeTransaction(yodleeTx, accountId),
        yodleeTransactionId: yodleeTx.id,
        yodleeBaseType: yodleeTx.baseType,
        yodleeCategoryType: yodleeTx.categoryType,
        yodleeStatus: yodleeTx.status,
      };

      if (!existingTx) {
        await storage.createTransaction(transactionData);
      }
    }

    const updatedTransactions = await storage.getRecentTransactions(req.user.id, 50);
    res.json(updatedTransactions);
  } catch (error) {
    console.error('Sync transactions error:', error);
    res.status(500).json({ message: 'Failed to sync transactions' });
  }
});

// Refresh account data
router.post('/refresh-account/:accountId', async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ message: 'Unauthorized' });
    }

    const accountId = parseInt(req.params.accountId);
    const account = await storage.getAccount(accountId);

    if (!account || account.userId !== req.user.id) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    if (!account.yodleeAccountId) {
      return res.status(400).json({ message: 'Account not linked to Yodlee' });
    }

    await yodleeClient.refreshAccountData(account.yodleeAccountId);
    res.json({ message: 'Account refresh initiated' });
  } catch (error) {
    console.error('Refresh account error:', error);
    res.status(500).json({ message: 'Failed to refresh account' });
  }
});

export const yodleeRoutes = router;