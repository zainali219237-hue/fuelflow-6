import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";

const chartData = [
  { day: "Mon", sales: 42000 },
  { day: "Tue", sales: 39000 },
  { day: "Wed", sales: 45000 },
  { day: "Thu", sales: 41000 },
  { day: "Fri", sales: 48000 },
  { day: "Sat", sales: 52000 },
  { day: "Sun", sales: 45250 },
];

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: dashboardStats, isLoading } = useQuery({
    queryKey: ["/api/dashboard", user?.stationId],
    enabled: !!user?.stationId,
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-20 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 fade-in">
      {/* Key Performance Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gradient-to-br from-green-500 to-green-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-green-100 text-sm font-medium">Today's Sales</p>
                <p className="text-3xl font-bold" data-testid="todays-sales">₹45,250</p>
                <p className="text-green-100 text-sm">2,150 L sold</p>
              </div>
              <div className="text-4xl opacity-80">💰</div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-green-100 text-xs">+12% vs yesterday</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-blue-100 text-sm font-medium">Monthly Revenue</p>
                <p className="text-3xl font-bold" data-testid="monthly-revenue">₹12.5L</p>
                <p className="text-blue-100 text-sm">62,450 L total</p>
              </div>
              <div className="text-4xl opacity-80">📈</div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-blue-100 text-xs">On track for target</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-purple-500 to-purple-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-purple-100 text-sm font-medium">Stock Value</p>
                <p className="text-3xl font-bold" data-testid="stock-value">₹8.2L</p>
                <p className="text-purple-100 text-sm">All tanks combined</p>
              </div>
              <div className="text-4xl opacity-80">🛢️</div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-purple-100 text-xs">3 days avg inventory</span>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gradient-to-br from-orange-500 to-orange-600 text-white border-0">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-orange-100 text-sm font-medium">Outstanding</p>
                <p className="text-3xl font-bold" data-testid="outstanding-amount">₹1.8L</p>
                <p className="text-orange-100 text-sm">Credit customers</p>
              </div>
              <div className="text-4xl opacity-80">⏰</div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-orange-100 text-xs">15 customers pending</span>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Sales Trend (Last 7 Days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <XAxis dataKey="day" />
                  <YAxis />
                  <Line type="monotone" dataKey="sales" stroke="hsl(var(--primary))" strokeWidth={2} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Today's Product Sales</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-green-500 rounded mr-3"></div>
                  <span className="font-medium">Petrol</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold" data-testid="petrol-sales">₹28,500</div>
                  <div className="text-sm text-muted-foreground">1,350 L</div>
                </div>
              </div>
              <div className="flex items-center justify-between p-3 bg-muted rounded-md">
                <div className="flex items-center">
                  <div className="w-4 h-4 bg-blue-500 rounded mr-3"></div>
                  <span className="font-medium">Diesel</span>
                </div>
                <div className="text-right">
                  <div className="font-semibold" data-testid="diesel-sales">₹16,750</div>
                  <div className="text-sm text-muted-foreground">800 L</div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Transactions and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle>Recent Transactions</CardTitle>
              <button className="text-primary hover:text-primary/80 text-sm font-medium" data-testid="button-view-all">
                View All
              </button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {[
                { id: "#INV-001234", desc: "Cash Sale - Petrol 25L", time: "2 minutes ago", amount: "₹2,750", type: "cash" },
                { id: "#INV-001233", desc: "Credit Sale - Diesel 50L", time: "5 minutes ago", amount: "₹4,200", type: "credit" },
                { id: "#INV-001232", desc: "Cash Sale - Petrol 30L", time: "8 minutes ago", amount: "₹3,300", type: "cash" },
              ].map((transaction, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-border rounded-md">
                  <div>
                    <div className="font-medium text-card-foreground" data-testid={`transaction-id-${index}`}>
                      {transaction.id}
                    </div>
                    <div className="text-sm text-muted-foreground">{transaction.desc}</div>
                    <div className="text-xs text-muted-foreground">{transaction.time}</div>
                  </div>
                  <div className="text-right">
                    <div className={`font-semibold ${transaction.type === 'cash' ? 'text-green-600' : 'text-blue-600'}`}>
                      {transaction.amount}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                <div className="flex items-start">
                  <span className="text-yellow-500 mr-2">⚠️</span>
                  <div>
                    <div className="text-sm font-medium text-yellow-800">Low Stock Alert</div>
                    <div className="text-xs text-yellow-600">Tank 2 (Diesel) - Only 500L remaining</div>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
                <div className="flex items-start">
                  <span className="text-blue-500 mr-2">📋</span>
                  <div>
                    <div className="text-sm font-medium text-blue-800">Purchase Order</div>
                    <div className="text-xs text-blue-600">PO-2024-001 scheduled for delivery tomorrow</div>
                  </div>
                </div>
              </div>
              <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-start">
                  <span className="text-red-500 mr-2">💰</span>
                  <div>
                    <div className="text-sm font-medium text-red-800">Payment Overdue</div>
                    <div className="text-xs text-red-600">ABC Transport - ₹25,000 overdue by 5 days</div>
                  </div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
