import { useState } from "react";
import { List, AlertTriangle, ShoppingCart, Pill, CheckCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient, useQuery } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Link } from "wouter";
import TransactionReviewDialog from "./transaction-review-dialog";

interface Transaction {
  id: number;
  amount: string;
  merchant: string;
  transactionDate: string;
  category: string;
  isFlagged: boolean;
  reviewStatus: string;
  suspiciousScore: number;
}

interface RecentTransactionsProps {
  transactions: Transaction[];
}

export default function RecentTransactions({ transactions }: RecentTransactionsProps) {
  const [reviewTransaction, setReviewTransaction] = useState<Transaction | null>(null);
  const queryClient = useQueryClient();

  const { data: familyMembers = [] } = useQuery({
    queryKey: ["/api/family-members/1"], // Using user ID 1 for demo
  });

  const reviewMutation = useMutation({
    mutationFn: ({ transactionId, status }: { transactionId: number; status: string }) =>
      apiRequest("PATCH", `/api/transactions/${transactionId}/review`, { reviewStatus: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/1"] });
    },
  });

  const getTransactionIcon = (category: string, isFlagged: boolean) => {
    if (isFlagged) return AlertTriangle;
    
    switch (category.toLowerCase()) {
      case "groceries":
        return ShoppingCart;
      case "healthcare":
        return Pill;
      default:
        return CheckCircle;
    }
  };

  const getTransactionStyle = (transaction: Transaction) => {
    if (transaction.isFlagged) {
      return {
        container: "border-l-4 border-red-600 bg-red-50",
        icon: "bg-red-100 text-red-600",
        status: "text-red-600",
        statusText: "Flagged as Suspicious"
      };
    }
    
    return {
      container: "border-l-4 border-green-600 bg-green-50",
      icon: "bg-green-100 text-green-600",
      status: "text-green-600",
      statusText: "Normal Purchase"
    };
  };

  const formatAmount = (amount: string) => {
    const num = parseFloat(amount);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(Math.abs(num));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 0) {
      return `Today, ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else if (diffDays === 1) {
      return `Yesterday, ${date.toLocaleTimeString('en-US', { 
        hour: 'numeric', 
        minute: '2-digit',
        hour12: true 
      })}`;
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    }
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-semibold flex items-center">
          <List className="text-blue-600 mr-3 h-6 w-6" />
          Recent Transactions
        </h2>
        <Link href="/transactions">
          <button className="text-blue-600 text-lg hover:underline font-medium">
            View All Transactions
          </button>
        </Link>
      </div>
      
      <div className="space-y-4">
        {transactions.map((transaction) => {
          const TransactionIcon = getTransactionIcon(transaction.category, transaction.isFlagged);
          const style = getTransactionStyle(transaction);
          
          return (
            <div
              key={transaction.id}
              className={`flex items-center justify-between p-4 rounded-lg ${style.container}`}
            >
              <div className="flex items-center flex-1">
                <div className={`w-12 h-12 rounded-lg flex items-center justify-center mr-4 ${style.icon}`}>
                  <TransactionIcon className="h-6 w-6" />
                </div>
                <div className="flex-1">
                  <p className="font-semibold text-lg">{transaction.merchant}</p>
                  <p className="text-gray-600 text-lg">{formatDate(transaction.transactionDate)}</p>
                  <p className={`font-medium text-lg ${style.status}`}>
                    <CheckCircle className="inline h-4 w-4 mr-1" />
                    {style.statusText}
                  </p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">-{formatAmount(transaction.amount)}</p>
                {transaction.isFlagged && transaction.reviewStatus === "pending" && (
                  <Button
                    onClick={() => setReviewTransaction(transaction)}
                    className="mt-2 bg-red-600 text-white px-4 py-2 rounded-lg text-lg hover:bg-red-700 transition-colors"
                  >
                    Review Options
                  </Button>
                )}
              </div>
            </div>
          );
        })}
      </div>
      
      <TransactionReviewDialog
        transaction={reviewTransaction}
        isOpen={!!reviewTransaction}
        onClose={() => setReviewTransaction(null)}
        familyMembers={familyMembers}
      />
    </div>
  );
}
