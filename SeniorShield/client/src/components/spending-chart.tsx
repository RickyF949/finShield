import { BarChart3, Info } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface SpendingChartProps {
  spendingData: Record<string, number>;
}

export default function SpendingChart({ spendingData }: SpendingChartProps) {
  // Convert spending data to chart format
  const chartData = Object.entries(spendingData).map(([category, amount]) => ({
    category,
    amount,
    percentage: 0 // Will calculate below
  }));

  // Calculate percentages
  const maxAmount = Math.max(...chartData.map(item => item.amount));
  chartData.forEach(item => {
    item.percentage = maxAmount > 0 ? (item.amount / maxAmount) * 100 : 0;
  });

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      "Groceries": "bg-green-600",
      "Healthcare": "bg-blue-600", 
      "Utilities": "bg-orange-600",
      "Technology": "bg-red-600",
      "Shopping": "bg-purple-600",
      "Transportation": "bg-yellow-600"
    };
    return colors[category] || "bg-gray-600";
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-semibold flex items-center">
          <BarChart3 className="text-blue-600 mr-3 h-6 w-6" />
          Monthly Spending Trends
        </h2>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-5 w-5 text-gray-400 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>Your spending patterns help us detect unusual activity</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <div className="space-y-6">
        {chartData.map(({ category, amount, percentage }) => (
          <div key={category}>
            <div className="flex items-center justify-between mb-2">
              <span className="text-lg font-medium">{category}</span>
              <span className="text-lg">{formatAmount(amount)}</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-4">
              <div 
                className={`h-4 rounded-full chart-bar ${getCategoryColor(category)}`}
                style={{ width: `${percentage}%` }}
              ></div>
            </div>
          </div>
        ))}
        
        {chartData.length === 0 && (
          <div className="text-center py-8">
            <p className="text-lg text-gray-600">No spending data available</p>
          </div>
        )}
      </div>
    </div>
  );
}
