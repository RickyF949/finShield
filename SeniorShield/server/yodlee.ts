import axios from 'axios';

// Yodlee configuration
interface YodleeConfig {
  apiUrl: string;
  clientId: string;
  secret: string;
}

export const yodleeConfig: YodleeConfig = {
  apiUrl: process.env.YODLEE_API_URL || '',
  clientId: process.env.YODLEE_CLIENT_ID || '',
  secret: process.env.YODLEE_SECRET || '',
};

// Yodlee API client
class YodleeClient {
  private token: string | null = null;
  private tokenExpiry: Date | null = null;

  private async getToken(): Promise<string> {
    if (this.token && this.tokenExpiry && this.tokenExpiry > new Date()) {
      return this.token;
    }

    try {
      const response = await axios.post(
        `${yodleeConfig.apiUrl}/auth/token`,
        {},
        {
          headers: {
            'Api-Version': '1.1',
            'Content-Type': 'application/x-www-form-urlencoded',
          },
          auth: {
            username: yodleeConfig.clientId,
            password: yodleeConfig.secret,
          },
        }
      );

      this.token = response.data.token;
      this.tokenExpiry = new Date(Date.now() + response.data.expires_in * 1000);
      return this.token;
    } catch (error) {
      console.error('Error getting Yodlee token:', error);
      throw new Error('Failed to authenticate with Yodlee');
    }
  }

  private async request(method: string, endpoint: string, data?: any) {
    const token = await this.getToken();
    try {
      const response = await axios({
        method,
        url: `${yodleeConfig.apiUrl}${endpoint}`,
        data,
        headers: {
          Authorization: `Bearer ${token}`,
          'Api-Version': '1.1',
          'Content-Type': 'application/json',
        },
      });
      return response.data;
    } catch (error) {
      console.error(`Error in Yodlee API request to ${endpoint}:`, error);
      throw error;
    }
  }

  // Get user's linked accounts
  async getAccounts(userId: string) {
    return this.request('GET', `/accounts?userId=${userId}`);
  }

  // Get transactions for a specific account
  async getTransactions(accountId: string, fromDate: string, toDate: string) {
    return this.request('GET', `/transactions`, {
      accountId,
      fromDate,
      toDate,
    });
  }

  // Link a new account (returns FastLink token)
  async getFastLinkToken(userId: string) {
    return this.request('POST', '/fastlink/token', {
      userId,
      accessTokens: ['read_only'],
    });
  }

  // Refresh account data
  async refreshAccountData(accountId: string) {
    return this.request('POST', `/accounts/${accountId}/refresh`);
  }
}

export const yodleeClient = new YodleeClient();

// Types for Yodlee responses
export interface YodleeAccount {
  id: string;
  accountName: string;
  accountType: string;
  accountNumber: string;
  balance: {
    amount: number;
    currency: string;
  };
  providerName: string;
  lastUpdated: string;
}

export interface YodleeTransaction {
  id: string;
  amount: {
    amount: number;
    currency: string;
  };
  baseType: string;
  category: string;
  categoryType: string;
  date: string;
  description: {
    original: string;
    simple: string;
  };
  merchant: {
    name: string;
    categoryLabel: string;
  };
  status: string;
  accountId: string;
}

// Helper function to convert Yodlee transaction to our schema
export function convertYodleeTransaction(yodleeTx: YodleeTransaction, accountId: number): any {
  return {
    accountId,
    amount: yodleeTx.amount.amount,
    merchant: yodleeTx.merchant?.name || yodleeTx.description.simple,
    category: yodleeTx.category,
    description: yodleeTx.description.original,
    transactionDate: new Date(yodleeTx.date),
    isSpending: yodleeTx.baseType === 'DEBIT',
    suspiciousScore: 0, // This would be calculated based on your risk model
    isFlagged: false,
    reviewStatus: 'pending',
    externalId: yodleeTx.id, // Store Yodlee's transaction ID
  };
}