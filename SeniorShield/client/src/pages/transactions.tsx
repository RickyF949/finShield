import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Link } from "wouter";
import { ArrowLeft, List, Filter, Calendar, AlertTriangle, CheckCircle, Eye, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import TransactionReviewDialog from "@/components/transaction-review-dialog";
import type { Transaction } from "@shared/schema";

export default function Transactions() {
  const [searchTerm, setSearchTerm] = useState("");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterAccount, setFilterAccount] = useState("all");
  const [sortBy, setSortBy] = useState("date");
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [reviewTransaction, setReviewTransaction] = useState<Transaction | null>(null);
  const { toast } = useToast();

  const { data: transactions = [], isLoading } = useQuery({
    queryKey: ["/api/transactions/1?limit=100"], // Using user ID 1 for demo
  });

  const { data: accounts = [] } = useQuery({
    queryKey: ["/api/dashboard/1"], // Get accounts from dashboard data
    select: (data: any) => data?.accounts || []
  });

  const { data: familyMembers = [] } = useQuery({
    queryKey: ["/api/family-members/1"], // Using user ID 1 for demo
  });

  const reviewMutation = useMutation({
    mutationFn: ({ transactionId, status }: { transactionId: number; status: string }) =>
      apiRequest("PATCH", `/api/transactions/${transactionId}/review`, { reviewStatus: status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/transactions/1"] });
      toast({
        title: "Success",
        description: "Transaction status updated",
      });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update transaction",
        variant: "destructive",
      });
    }
  });

  // Filter and sort transactions
  const filteredTransactions = transactions
    .filter((transaction: Transaction) => {
      const matchesSearch = transaction.merchant.toLowerCase().includes(searchTerm.toLowerCase()) ||
                           transaction.category.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = filterCategory === "all" || transaction.category === filterCategory;
      const matchesStatus = filterStatus === "all" || 
                           (filterStatus === "flagged" && transaction.isFlagged) ||
                           (filterStatus === "approved" && transaction.reviewStatus === "approved") ||
                           (filterStatus === "pending" && transaction.reviewStatus === "pending");
      const matchesAccount = filterAccount === "all" || transaction.accountId.toString() === filterAccount;
      
      return matchesSearch && matchesCategory && matchesStatus && matchesAccount;
    })
    .sort((a: Transaction, b: Transaction) => {
      switch (sortBy) {
        case "date":
          return new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime();
        case "amount":
          return Math.abs(parseFloat(b.amount)) - Math.abs(parseFloat(a.amount));
        case "merchant":
          return a.merchant.localeCompare(b.merchant);
        case "suspicious":
          return b.suspiciousScore - a.suspiciousScore;
        default:
          return 0;
      }
    });

  const getTransactionStatus = (transaction: Transaction) => {
    if (transaction.isFlagged) {
      return {
        label: "Flagged",
        variant: "destructive" as const,
        icon: AlertTriangle,
        color: "text-red-600"
      };
    }
    if (transaction.reviewStatus === "approved") {
      return {
        label: "Approved",
        variant: "default" as const,
        icon: CheckCircle,
        color: "text-green-600"
      };
    }
    return {
      label: "Pending",
      variant: "secondary" as const,
      icon: Eye,
      color: "text-orange-600"
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
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    });
  };

  const getCategoryIcon = (category: string) => {
    const icons: Record<string, string> = {
      "Groceries": "🛒",
      "Healthcare": "🏥",
      "Technology": "💻",
      "Transportation": "🚗",
      "Utilities": "⚡",
      "Shopping": "🛍️",
      "Banking": "🏦"
    };
    return icons[category] || "💳";
  };

  const getAccountIcon = (accountType: string) => {
    return accountType === "credit" ? "💳" : "🏦";
  };

  const getAccountName = (accountId: number) => {
    const account = accounts.find((acc: any) => acc.id === accountId);
    return account ? account.accountName : "Unknown Account";
  };

  const categories = [...new Set(transactions.map((t: Transaction) => t.category))];

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-xl text-gray-600">Loading your transactions...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <Link href="/dashboard">
            <Button variant="outline" className="mb-4 text-lg">
              <ArrowLeft className="h-5 w-5 mr-2" />
              Back to Dashboard
            </Button>
          </Link>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <List className="text-blue-600 mr-3 h-8 w-8" />
                All Transactions
              </h1>
              <p className="text-xl text-gray-600 mt-2">
                Complete history of your financial activity
              </p>
            </div>
            
            <div className="text-right">
              <p className="text-lg text-gray-600">Total Transactions</p>
              <p className="text-3xl font-bold text-blue-600">{filteredTransactions.length}</p>
            </div>
          </div>
        </div>

        {/* Filters and Search */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl flex items-center">
              <Filter className="h-5 w-5 mr-2" />
              Filter & Search Transactions
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
              <div>
                <label className="block text-lg font-medium mb-2">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    placeholder="Search merchant or category"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 text-lg p-3"
                  />
                </div>
              </div>
              
              <div>
                <label className="block text-lg font-medium mb-2">Account</label>
                <Select value={filterAccount} onValueChange={setFilterAccount}>
                  <SelectTrigger className="text-lg p-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Accounts</SelectItem>
                    {accounts.map((account: any) => (
                      <SelectItem key={account.id} value={account.id.toString()}>
                        {getAccountIcon(account.accountType)} {account.accountName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-lg font-medium mb-2">Category</label>
                <Select value={filterCategory} onValueChange={setFilterCategory}>
                  <SelectTrigger className="text-lg p-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Categories</SelectItem>
                    {categories.map((category) => (
                      <SelectItem key={category} value={category}>
                        {getCategoryIcon(category)} {category}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-lg font-medium mb-2">Status</label>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="text-lg p-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="flagged">🚩 Flagged</SelectItem>
                    <SelectItem value="approved">✅ Approved</SelectItem>
                    <SelectItem value="pending">⏳ Pending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div>
                <label className="block text-lg font-medium mb-2">Sort By</label>
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="text-lg p-3">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="date">📅 Date</SelectItem>
                    <SelectItem value="amount">💰 Amount</SelectItem>
                    <SelectItem value="merchant">🏪 Merchant</SelectItem>
                    <SelectItem value="suspicious">⚠️ Risk Score</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="flex items-end">
                <Button
                  onClick={() => {
                    setSearchTerm("");
                    setFilterAccount("all");
                    setFilterCategory("all");
                    setFilterStatus("all");
                    setSortBy("date");
                  }}
                  variant="outline"
                  className="w-full text-lg p-3"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Transactions List */}
        <div className="space-y-4">
          {filteredTransactions.length === 0 ? (
            <Card>
              <CardContent className="text-center py-12">
                <List className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-2xl font-semibold text-gray-600 mb-2">
                  No Transactions Found
                </h3>
                <p className="text-xl text-gray-500">
                  Try adjusting your filters to see more results
                </p>
              </CardContent>
            </Card>
          ) : (
            filteredTransactions.map((transaction: Transaction) => {
              const status = getTransactionStatus(transaction);
              const StatusIcon = status.icon;
              
              return (
                <Card key={transaction.id} className="border-2 border-gray-200 hover:border-blue-600 transition-colors">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <div className="text-3xl">
                          {getCategoryIcon(transaction.category)}
                        </div>
                        
                        <div className="space-y-1">
                          <h3 className="text-xl font-semibold">{transaction.merchant}</h3>
                          <p className="text-lg text-gray-600">{formatDate(transaction.transactionDate)}</p>
                          <p className="text-lg text-blue-600 font-medium">
                            {getAccountIcon(accounts.find((acc: any) => acc.id === transaction.accountId)?.accountType || "checking")} {getAccountName(transaction.accountId)}
                          </p>
                          <div className="flex items-center space-x-3">
                            <Badge variant="outline" className="text-lg px-3 py-1">
                              {transaction.category}
                            </Badge>
                            <Badge variant={status.variant} className="text-lg px-3 py-1">
                              <StatusIcon className="h-4 w-4 mr-1" />
                              {status.label}
                            </Badge>
                            {transaction.suspiciousScore > 50 && (
                              <Badge variant="destructive" className="text-lg px-3 py-1">
                                Risk: {transaction.suspiciousScore}%
                              </Badge>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      <div className="text-right">
                        <p className="text-2xl font-bold">-{formatAmount(transaction.amount)}</p>
                        <div className="flex space-x-2 mt-2">
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setSelectedTransaction(transaction)}
                                className="text-lg p-2"
                              >
                                <Eye className="h-4 w-4 mr-1" />
                                Details
                              </Button>
                            </DialogTrigger>
                            
                            <DialogContent className="max-w-lg">
                              <DialogHeader>
                                <DialogTitle className="text-2xl">Transaction Details</DialogTitle>
                              </DialogHeader>
                              
                              {selectedTransaction && (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-2 gap-4">
                                    <div>
                                      <label className="text-lg font-medium">Merchant</label>
                                      <p className="text-lg">{selectedTransaction.merchant}</p>
                                    </div>
                                    <div>
                                      <label className="text-lg font-medium">Amount</label>
                                      <p className="text-lg font-bold">-{formatAmount(selectedTransaction.amount)}</p>
                                    </div>
                                    <div>
                                      <label className="text-lg font-medium">Date</label>
                                      <p className="text-lg">{formatDate(selectedTransaction.transactionDate)}</p>
                                    </div>
                                    <div>
                                      <label className="text-lg font-medium">Account</label>
                                      <p className="text-lg text-blue-600 font-medium">
                                        {getAccountIcon(accounts.find((acc: any) => acc.id === selectedTransaction.accountId)?.accountType || "checking")} {getAccountName(selectedTransaction.accountId)}
                                      </p>
                                    </div>
                                    <div>
                                      <label className="text-lg font-medium">Category</label>
                                      <p className="text-lg">{selectedTransaction.category}</p>
                                    </div>
                                    <div>
                                      <label className="text-lg font-medium">Status</label>
                                      <Badge variant={getTransactionStatus(selectedTransaction).variant} className="text-lg">
                                        {getTransactionStatus(selectedTransaction).label}
                                      </Badge>
                                    </div>
                                    <div>
                                      <label className="text-lg font-medium">Risk Score</label>
                                      <p className="text-lg">{selectedTransaction.suspiciousScore}%</p>
                                    </div>
                                  </div>
                                  
                                  {selectedTransaction.description && (
                                    <div>
                                      <label className="text-lg font-medium">Description</label>
                                      <p className="text-lg">{selectedTransaction.description}</p>
                                    </div>
                                  )}
                                  
                                  {selectedTransaction.isFlagged && selectedTransaction.reviewStatus === "pending" && (
                                    <div className="pt-4 border-t">
                                      <p className="text-lg mb-3">Review this transaction:</p>
                                      <div className="flex space-x-3">
                                        <Button
                                          onClick={() => reviewMutation.mutate({
                                            transactionId: selectedTransaction.id,
                                            status: "approved"
                                          })}
                                          disabled={reviewMutation.isPending}
                                          className="flex-1 bg-green-600 text-white hover:bg-green-700"
                                        >
                                          ✅ Approve
                                        </Button>
                                        <Button
                                          onClick={() => reviewMutation.mutate({
                                            transactionId: selectedTransaction.id,
                                            status: "blocked"
                                          })}
                                          disabled={reviewMutation.isPending}
                                          variant="destructive"
                                          className="flex-1"
                                        >
                                          🚫 Block
                                        </Button>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          
                          {transaction.isFlagged && transaction.reviewStatus === "pending" && (
                            <Button
                              onClick={() => setReviewTransaction(transaction)}
                              size="sm"
                              className="bg-red-600 text-white text-lg p-2 hover:bg-red-700"
                            >
                              Review Options
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })
          )}
        </div>
        
        <TransactionReviewDialog
          transaction={reviewTransaction}
          isOpen={!!reviewTransaction}
          onClose={() => setReviewTransaction(null)}
          familyMembers={familyMembers}
        />
      </div>
    </div>
  );
}