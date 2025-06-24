import { Shield, Settings, HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";

interface HeaderProps {
  user: {
    fullName: string;
  };
}

export default function Header({ user }: HeaderProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <header className="bg-white shadow-sm border-b-2 border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-20">
          <div className="flex items-center">
            <Shield className="text-blue-600 h-8 w-8 mr-3" />
            <h1 className="text-2xl md:text-3xl font-bold text-blue-600">FinGuard</h1>
          </div>
          
          <div className="flex items-center space-x-4">
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="p-3 text-gray-600 hover:text-blue-600 border-2 border-gray-300 rounded-lg"
                >
                  <Settings className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Settings & Preferences</p>
              </TooltipContent>
            </Tooltip>
            
            <Tooltip>
              <TooltipTrigger asChild>
                <Button 
                  variant="outline" 
                  size="lg"
                  className="p-3 text-gray-600 hover:text-blue-600 border-2 border-gray-300 rounded-lg"
                >
                  <HelpCircle className="h-5 w-5" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Help & Support</p>
              </TooltipContent>
            </Tooltip>
            
            <div className="flex items-center">
              <div className="w-12 h-12 bg-blue-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {getInitials(user.fullName)}
                </span>
              </div>
              <span className="ml-3 text-lg font-medium hidden sm:block">
                {user.fullName}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}
