import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";

export default function LoginForm() {
  const [username, setUsername] = useState("admin");
  const [password, setPassword] = useState("admin123");
  const [stationId, setStationId] = useState("1");
  const [isLoading, setIsLoading] = useState(false);
  const { login } = useAuth();
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      await login(username, password);
      toast({
        title: "Login successful",
        description: "Welcome to FuelFlow system",
      });
    } catch (error) {
      toast({
        title: "Login failed",
        description: "Invalid credentials. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <Card className="max-w-md w-full mx-4 border shadow-xl">
        <CardContent className="pt-6">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center mx-auto mb-4">
              <span className="text-2xl text-primary-foreground">⛽</span>
            </div>
            <h2 className="text-2xl font-bold text-card-foreground" data-testid="login-title">FuelFlow Login</h2>
            <p className="text-muted-foreground">Petrol Pump Accounting System</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="username" className="block text-sm font-medium text-card-foreground mb-2">
                Username
              </Label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Enter username"
                className="w-full"
                data-testid="input-username"
                required
              />
            </div>

            <div>
              <Label htmlFor="password" className="block text-sm font-medium text-card-foreground mb-2">
                Password
              </Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Enter password"
                className="w-full"
                data-testid="input-password"
                required
              />
            </div>

            <div>
              <Label htmlFor="station" className="block text-sm font-medium text-card-foreground mb-2">
                Station
              </Label>
              <Select value={stationId} onValueChange={setStationId}>
                <SelectTrigger data-testid="select-station">
                  <SelectValue placeholder="Select station" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Main Station - NH Highway</SelectItem>
                  <SelectItem value="2">City Branch - MG Road</SelectItem>
                  <SelectItem value="3">Express Station - Airport Road</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <Button 
              type="submit" 
              className="w-full" 
              disabled={isLoading}
              data-testid="button-login"
            >
              {isLoading ? "Logging in..." : "Login to System"}
            </Button>
          </form>

          <div className="mt-6 p-3 bg-muted rounded-md text-xs text-muted-foreground">
            <p className="font-medium mb-1">Demo Credentials:</p>
            <p>Admin: admin/admin123 | Manager: manager/manager123 | Cashier: cashier/cashier123</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
