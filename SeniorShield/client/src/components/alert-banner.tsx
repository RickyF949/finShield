import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

interface AlertBannerProps {
  alert: {
    id: number;
    title: string;
    description: string;
    transactionId?: number;
  };
}

export default function AlertBanner({ alert }: AlertBannerProps) {
  const queryClient = useQueryClient();

  const reviewMutation = useMutation({
    mutationFn: () => apiRequest("PATCH", `/api/alerts/${alert.id}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard/1"] });
    },
  });

  const handleReview = () => {
    reviewMutation.mutate();
  };

  return (
    <div className="mb-8">
      <div className="bg-red-600 text-white p-6 rounded-xl shadow-lg pulse-alert">
        <div className="flex items-center">
          <AlertTriangle className="h-8 w-8 mr-4 flex-shrink-0" />
          <div className="flex-1">
            <h3 className="text-xl md:text-2xl font-semibold mb-2">{alert.title}</h3>
            <p className="text-lg">{alert.description}</p>
            <Button
              onClick={handleReview}
              disabled={reviewMutation.isPending}
              className="mt-3 bg-white text-red-600 px-6 py-3 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-colors"
            >
              {reviewMutation.isPending ? "Processing..." : "Review Now"}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
