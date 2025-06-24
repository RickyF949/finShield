import { Shield, Eye, AlertTriangle } from "lucide-react";

interface QuickStatsProps {
  stats: {
    protectedAccounts: number;
    weeklyAlerts: number;
    unreadAlerts: number;
  };
}

export default function QuickStats({ stats }: QuickStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
      <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
        <div className="flex items-center">
          <div className="p-3 bg-green-100 rounded-lg">
            <Shield className="h-8 w-8 text-green-600" />
          </div>
          <div className="ml-4">
            <p className="text-lg text-gray-600">Accounts Protected</p>
            <p className="text-3xl font-bold text-green-600">{stats.protectedAccounts}</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
        <div className="flex items-center">
          <div className="p-3 bg-blue-100 rounded-lg">
            <Eye className="h-8 w-8 text-blue-600" />
          </div>
          <div className="ml-4">
            <p className="text-lg text-gray-600">Daily Monitoring</p>
            <p className="text-3xl font-bold text-blue-600">24/7</p>
          </div>
        </div>
      </div>
      
      <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
        <div className="flex items-center">
          <div className="p-3 bg-orange-100 rounded-lg">
            <AlertTriangle className="h-8 w-8 text-orange-600" />
          </div>
          <div className="ml-4">
            <p className="text-lg text-gray-600">Alerts This Week</p>
            <p className="text-3xl font-bold text-orange-600">{stats.weeklyAlerts}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
