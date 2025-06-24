import { Lightbulb } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function EducationalTips() {
  const tips = [
    {
      id: 1,
      title: "Phone Scam Alert",
      description: "Never give personal information to unsolicited callers, even if they claim to be from your bank.",
      bgColor: "bg-blue-50",
      borderColor: "border-blue-600",
      titleColor: "text-blue-600"
    },
    {
      id: 2,
      title: "Email Safety",
      description: "Legitimate banks will never ask for passwords or account numbers via email.",
      bgColor: "bg-yellow-50",
      borderColor: "border-orange-600",
      titleColor: "text-orange-600"
    }
  ];

  return (
    <div className="bg-white p-6 rounded-xl shadow-lg border-2 border-gray-200">
      <h2 className="text-xl md:text-2xl font-semibold mb-6 flex items-center">
        <Lightbulb className="text-orange-600 mr-3 h-6 w-6" />
        Safety Tips
      </h2>
      
      <div className="space-y-4 mb-6">
        {tips.map((tip) => (
          <div
            key={tip.id}
            className={`p-4 ${tip.bgColor} border-l-4 ${tip.borderColor} rounded-lg`}
          >
            <h3 className={`font-semibold text-lg ${tip.titleColor} mb-2`}>
              {tip.title}
            </h3>
            <p className="text-gray-700 text-lg">{tip.description}</p>
          </div>
        ))}
      </div>
      
      <Button 
        variant="outline"
        className="w-full border-2 border-blue-600 text-blue-600 py-3 rounded-lg text-lg font-semibold hover:bg-blue-600 hover:text-white transition-colors"
      >
        Learn More
      </Button>
    </div>
  );
}
