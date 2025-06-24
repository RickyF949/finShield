import { useQuery } from "@tanstack/react-query";
import Header from "@/components/header";
import AlertBanner from "@/components/alert-banner";
import QuickStats from "@/components/quick-stats";
import AccountOverview from "@/components/account-overview";
import RecentTransactions from "@/components/recent-transactions";
import SpendingChart from "@/components/spending-chart";
import AlertCenter from "@/components/alert-center";
import FamilyConnections from "@/components/family-connections";
import EducationalTips from "@/components/educational-tips";
import Footer from "@/components/footer";

export default function Dashboard() {
  const { data: dashboardData, isLoading, error } = useQuery({
    queryKey: ["/api/dashboard/1"], // Using user ID 1 for demo
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-xl text-gray-600">Loading your financial dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-red-600">Error loading dashboard. Please try again.</p>
        </div>
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-xl text-gray-600">No data available.</p>
        </div>
      </div>
    );
  }

  const {
    user,
    accounts,
    recentTransactions,
    alerts,
    familyMembers,
    stats,
    spendingByCategory
  } = dashboardData;

  // Find high-priority alerts for banner
  const highPriorityAlert = alerts.find((alert: any) => alert.severity === "high");

  return (
    <div className="min-h-screen bg-gray-50">
      <Header user={user} />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {highPriorityAlert && <AlertBanner alert={highPriorityAlert} />}
        
        <QuickStats stats={stats} />
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column */}
          <div className="lg:col-span-2 space-y-8">
            <AccountOverview accounts={accounts} />
            <RecentTransactions transactions={recentTransactions} />
            <SpendingChart spendingData={spendingByCategory} />
          </div>

          {/* Right Column */}
          <div className="space-y-8">
            <AlertCenter alerts={alerts} />
            <FamilyConnections familyMembers={familyMembers} />
            <EducationalTips />
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
