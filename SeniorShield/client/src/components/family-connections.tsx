import { Users, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link } from "wouter";

interface FamilyMember {
  id: number;
  name: string;
  relationship: string;
  email: string;
  receiveAlerts: boolean;
}

interface FamilyConnectionsProps {
  familyMembers: FamilyMember[];
}

export default function FamilyConnections({ familyMembers }: FamilyConnectionsProps) {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map(n => n[0])
      .join("")
      .toUpperCase();
  };

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
      <h2 className="text-xl md:text-2xl font-semibold mb-6 flex items-center">
        <Users className="text-green-600 mr-3 h-6 w-6" />
        Family Connections
      </h2>
      
      <div className="space-y-4 mb-6">
        {familyMembers.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-3 border-2 border-gray-200 rounded-lg"
          >
            <div className="flex items-center">
              <div className="w-12 h-12 bg-green-600 rounded-full flex items-center justify-center">
                <span className="text-white font-semibold text-lg">
                  {getInitials(member.name)}
                </span>
              </div>
              <div className="ml-3">
                <p className="font-semibold text-lg">{member.name}</p>
                <p className="text-gray-600 text-lg">{member.relationship}</p>
              </div>
            </div>
            <Tooltip>
              <TooltipTrigger>
                <Mail className="h-5 w-5 text-blue-600 cursor-pointer" />
              </TooltipTrigger>
              <TooltipContent>
                <p>{member.name} receives alerts about your account activity</p>
              </TooltipContent>
            </Tooltip>
          </div>
        ))}
        
        {familyMembers.length === 0 && (
          <div className="text-center py-8">
            <p className="text-lg text-gray-600">No family connections added</p>
          </div>
        )}
      </div>
      
      <Link href="/manage-connections">
        <Button 
          variant="outline"
          className="w-full border-2 border-green-600 text-green-600 py-3 rounded-lg text-lg font-semibold hover:bg-green-600 hover:text-white transition-colors"
        >
          Manage Connections
        </Button>
      </Link>
    </div>
  );
}
