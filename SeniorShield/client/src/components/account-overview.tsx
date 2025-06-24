import { Building, CreditCard, CheckCircle, AlertCircle } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Info } from "lucide-react";

interface Account {
  id: number;
  accountName: string;
  accountType: string;
  accountNumber: string;
  balance: string;
  isActive: boolean;
}

interface AccountOverviewProps {
  accounts: Account[];
}

export default function AccountOverview({ accounts }: AccountOverviewProps) {
  const getAccountIcon = (type: string) => {
    return type === "credit" ? CreditCard : Building;
  };

  const formatBalance = (balance: string) => {
    const num = parseFloat(balance);
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(num);
  };

  const getAccountStatus = (account: Account) => {
    // For demo purposes, show credit card as having an alert
    if (account.accountType === "credit") {
      return {
        icon: AlertCircle,
        text: "1 Alert",
        color: "text-orange-600"
      };
    }
    return {
      icon: CheckCircle,
      text: "Secure",
      color: "text-green-600"
    };
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl md:text-2xl font-semibold flex items-center">
          <Building className="text-blue-600 mr-3 h-6 w-6" />
          Your Accounts
        </h2>
        <Tooltip>
          <TooltipTrigger>
            <Info className="h-5 w-5 text-gray-400 cursor-help" />
          </TooltipTrigger>
          <TooltipContent>
            <p>These are your linked bank and credit accounts that we monitor for suspicious activity</p>
          </TooltipContent>
        </Tooltip>
      </div>
      
      <div className="space-y-4">
        {accounts.map((account) => {
          const AccountIcon = getAccountIcon(account.accountType);
          const status = getAccountStatus(account);
          const StatusIcon = status.icon;
          
          return (
            <div
              key={account.id}
              className="flex items-center justify-between p-4 border-2 border-gray-200 rounded-lg hover:border-blue-600 transition-colors"
            >
              <div className="flex items-center">
                <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center mr-4">
                  <AccountIcon className="text-blue-600 h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-lg">{account.accountName}</p>
                  <p className="text-gray-600 text-lg">{account.accountNumber}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold">{formatBalance(account.balance)}</p>
                <p className={`text-lg flex items-center justify-end ${status.color}`}>
                  <StatusIcon className="h-4 w-4 mr-1" />
                  {status.text}
                </p>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
