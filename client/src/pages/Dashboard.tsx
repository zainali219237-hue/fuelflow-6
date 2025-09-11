import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/hooks/useAuth";
import { Line, LineChart, ResponsiveContainer, XAxis, YAxis } from "recharts";
import type { Tank, SalesTransaction, Customer, Product } from "@shared/schema";

export default function Dashboard() {
  const { user } = useAuth();
  
  const { data: dashboardStats, isLoading: statsLoading } = useQuery({
    queryKey: ["/api/dashboard", user?.stationId],
    enabled: !!user?.stationId,
  });

  const { data: tanks = [], isLoading: tanksLoading } = useQuery<Tank[]>({
    queryKey: ["/api/tanks", user?.stationId],
    enabled: !!user?.stationId,
  });

  const { data: recentSales = [], isLoading: salesLoading } = useQuery<SalesTransaction[]>({
    queryKey: ["/api/sales", user?.stationId, { limit: 5 }],
    enabled: !!user?.stationId,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Calculate chart data from dashboard stats (last 7 days)
  const generateChartData = () => {
    if (!dashboardStats?.weeklySales) return [];
    
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const today = new Date().getDay();
    const chartData = [];
    
    for (let i = 6; i >= 0; i--) {
      const dayIndex = (today - i + 7) % 7;
      const dayData = dashboardStats.weeklySales.find((d: any) => d.dayOfWeek === dayIndex);
      chartData.push({
        day: days[dayIndex],
        sales: dayData ? parseFloat(dayData.totalAmount || '0') : 0
      });
    }
    return chartData;
  };

  // Calculate stock value from tanks
  const calculateStockValue = () => {
    if (!tanks.length || !products.length) return 0;
    
    return tanks.reduce((total, tank) => {
      const product = products.find(p => p.id === tank.productId);
      if (product) {
        const stockValue = parseFloat(tank.currentStock || '0') * parseFloat(product.currentPrice || '0');
        return total + stockValue;
      }
      return total;
    }, 0);
  };

  // Get overdue customers count
  const getOverdueCustomersCount = () => {
    return customers.filter((customer: Customer) => 
      parseFloat(customer.outstandingAmount || '0') > 0
    ).length;
  };

  const isLoading = statsLoading || tanksLoading || salesLoading;

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
                <p className="text-3xl font-bold" data-testid="todays-sales">
                  ₹{dashboardStats?.todaysSales?.totalAmount ? parseFloat(dashboardStats.todaysSales.totalAmount).toLocaleString() : '0'}
                </p>
                <p className="text-green-100 text-sm">{dashboardStats?.todaysSales?.count || 0} transactions</p>
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
                <p className="text-3xl font-bold" data-testid="monthly-revenue">
                  ₹{dashboardStats?.monthlySales?.totalAmount ? parseFloat(dashboardStats.monthlySales.totalAmount).toLocaleString() : '0'}
                </p>
                <p className="text-blue-100 text-sm">{dashboardStats?.monthlySales?.count || 0} transactions total</p>
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
                <p className="text-3xl font-bold" data-testid="stock-value">
                  ₹{(calculateStockValue() / 100000).toFixed(1)}L
                </p>
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
                <p className="text-3xl font-bold" data-testid="outstanding-amount">
                  ₹{dashboardStats?.outstanding?.totalOutstanding ? (parseFloat(dashboardStats.outstanding.totalOutstanding) / 100000).toFixed(1) + 'L' : '0L'}
                </p>
                <p className="text-orange-100 text-sm">Credit customers</p>
              </div>
              <div className="text-4xl opacity-80">⏰</div>
            </div>
            <div className="mt-4 flex items-center">
              <span className="text-orange-100 text-xs">{getOverdueCustomersCount()} customers pending</span>
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
                <LineChart data={generateChartData()}>
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
              {dashboardStats?.productSales?.map((product: any, index: number) => {
                const colors = ['bg-green-500', 'bg-blue-500', 'bg-yellow-500', 'bg-red-500'];
                return (
                  <div key={product.productId} className="flex items-center justify-between p-3 bg-muted rounded-md">
                    <div className="flex items-center">
                      <div className={`w-4 h-4 ${colors[index % colors.length]} rounded mr-3`}></div>
                      <span className="font-medium">{product.productName}</span>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold" data-testid={`${product.productName.toLowerCase()}-sales`}>
                        ₹{parseFloat(product.totalAmount || '0').toLocaleString()}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {parseFloat(product.totalQuantity || '0').toLocaleString()} L
                      </div>
                    </div>
                  </div>
                );
              }) || (
                <div className="text-center text-muted-foreground py-4">
                  No product sales data available
                </div>
              )}
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
              {recentSales.length > 0 ? recentSales.slice(0, 3).map((transaction: SalesTransaction, index: number) => {
                const timeAgo = new Date(transaction.transactionDate).toLocaleString();
                return (
                  <div key={transaction.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                    <div>
                      <div className="font-medium text-card-foreground" data-testid={`transaction-id-${index}`}>
                        {transaction.invoiceNumber}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        {transaction.paymentMethod === 'cash' ? 'Cash Sale' : transaction.paymentMethod === 'credit' ? 'Credit Sale' : 'Card Sale'}
                      </div>
                      <div className="text-xs text-muted-foreground">{timeAgo}</div>
                    </div>
                    <div className="text-right">
                      <div className={`font-semibold ${
                        transaction.paymentMethod === 'cash' ? 'text-green-600' : 
                        transaction.paymentMethod === 'credit' ? 'text-blue-600' : 'text-purple-600'
                      }`}>
                        ₹{parseFloat(transaction.totalAmount || '0').toLocaleString()}
                      </div>
                    </div>
                  </div>
                );
              }) : (
                <div className="text-center text-muted-foreground py-4">
                  No recent transactions
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>System Alerts</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {/* Low Stock Alerts */}
              {tanks.filter(tank => {
                const currentStock = parseFloat(tank.currentStock || '0');
                const minimumLevel = parseFloat(tank.minimumLevel || '500');
                return currentStock <= minimumLevel;
              }).slice(0, 2).map(tank => {
                const product = products.find(p => p.id === tank.productId);
                return (
                  <div key={tank.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-start">
                      <span className="text-yellow-500 mr-2">⚠️</span>
                      <div>
                        <div className="text-sm font-medium text-yellow-800">Low Stock Alert</div>
                        <div className="text-xs text-yellow-600">
                          {tank.name} ({product?.name}) - Only {parseFloat(tank.currentStock || '0').toLocaleString()}L remaining
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Overdue Customers */}
              {customers.filter(customer => parseFloat(customer.outstandingAmount || '0') > 50000).slice(0, 1).map(customer => (
                <div key={customer.id} className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-start">
                    <span className="text-red-500 mr-2">💰</span>
                    <div>
                      <div className="text-sm font-medium text-red-800">Payment Overdue</div>
                      <div className="text-xs text-red-600">
                        {customer.name} - ₹{parseFloat(customer.outstandingAmount || '0').toLocaleString()} outstanding
                      </div>
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Show message if no alerts */}
              {tanks.filter(tank => parseFloat(tank.currentStock || '0') <= parseFloat(tank.minimumLevel || '500')).length === 0 && 
               customers.filter(customer => parseFloat(customer.outstandingAmount || '0') > 50000).length === 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <div>
                      <div className="text-sm font-medium text-green-800">All Systems Normal</div>
                      <div className="text-xs text-green-600">No critical alerts at this time</div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
