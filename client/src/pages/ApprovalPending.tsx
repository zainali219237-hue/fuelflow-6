
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Fuel, Clock } from "lucide-react";
import { useAuth } from "@/hooks/useAuth";
import { useLocation } from "wouter";

export default function ApprovalPending() {
  const { logout } = useAuth();
  const [, setLocation] = useLocation();

  const handleBackToLogin = async () => {
    await logout();
    setLocation("/");
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
      <Card className="w-full max-w-md border shadow-xl">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-orange-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <Clock className="w-8 h-8 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-card-foreground">Account Pending</h2>
            <p className="text-muted-foreground">Administrator Approval Required</p>
          </div>

          <div className="space-y-4">
            <div className="p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg border border-orange-200 dark:border-orange-800">
              <div className="flex items-center gap-2 mb-2">
                <Fuel className="w-5 h-5 text-orange-600" />
                <h3 className="font-semibold text-orange-800 dark:text-orange-200">
                  Account Under Review
                </h3>
              </div>
              <p className="text-sm text-orange-700 dark:text-orange-300">
                Your account has been created successfully but requires administrator approval before you can access the FuelFlow system.
              </p>
            </div>
            
            <div className="text-center space-y-2">
              <div className="flex items-center justify-center space-x-2">
                <div className="w-2 h-2 bg-orange-500 rounded-full animate-pulse"></div>
                <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse delay-75"></div>
                <div className="w-2 h-2 bg-orange-300 rounded-full animate-pulse delay-150"></div>
              </div>
              <p className="text-sm text-muted-foreground">
                Please contact your system administrator to activate your account.
              </p>
            </div>
          </div>

          <div className="mt-6">
            <Button
              type="button"
              variant="outline"
              className="w-full"
              onClick={handleBackToLogin}
            >
              Back to Login
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
