import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Tank, Product, StockMovement } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

export default function StockManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: tanks = [], isLoading: tanksLoading } = useQuery<Tank[]>({
    queryKey: ["/api/tanks", user?.stationId],
    enabled: !!user?.stationId,
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: stockMovements = [], isLoading: movementsLoading } = useQuery<StockMovement[]>({
    queryKey: ["/api/stock-movements", user?.stationId],
    enabled: !!user?.stationId,
  });

  if (tanksLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[...Array(3)].map((_, i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-32 bg-muted rounded"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  const getProductName = (productId: string) => {
    const product = products.find(p => p.id === productId);
    return product?.name || 'Unknown Product';
  };

  const getTankStatus = (currentStock: number, capacity: number, minimumLevel: number) => {
    const percentage = (currentStock / capacity) * 100;
    if (currentStock <= minimumLevel) return { status: 'critical', color: 'bg-red-600', textColor: 'text-red-600' };
    if (percentage < 30) return { status: 'low', color: 'bg-orange-600', textColor: 'text-orange-600' };
    return { status: 'normal', color: 'bg-green-600', textColor: 'text-green-600' };
  };

  return (
    <div className="space-y-8 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Stock & Inventory Management</h3>
          <p className="text-muted-foreground">Real-time tank monitoring and inventory control</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button data-testid="button-new-stock-entry">
            + New Stock Entry
          </Button>
          <Button variant="outline" data-testid="button-stock-report">
            📊 Stock Report
          </Button>
        </div>
      </div>

      {/* Tank Status Overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {tanks.map((tank: Tank, index: number) => {
          const currentStock = parseFloat(tank.currentStock || '0');
          const capacity = parseFloat(tank.capacity || '1');
          const minimumLevel = parseFloat(tank.minimumLevel || '0');
          const percentage = Math.round((currentStock / capacity) * 100);
          const available = capacity - currentStock;
          const { status, color, textColor } = getTankStatus(currentStock, capacity, minimumLevel);
          
          return (
            <Card key={tank.id} className="shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h4 className="font-semibold text-card-foreground" data-testid={`tank-name-${index}`}>
                    {tank.name} - {getProductName(tank.productId)}
                  </h4>
                  <Badge 
                    variant={status === 'normal' ? 'default' : 'destructive'}
                    className={status === 'normal' ? 'bg-green-100 text-green-800' : 
                              status === 'low' ? 'bg-yellow-100 text-yellow-800' : 
                              'bg-red-100 text-red-800'}
                    data-testid={`tank-status-${index}`}
                  >
                    {status === 'critical' ? 'Low Stock' : status === 'low' ? 'Low Stock' : 'Normal'}
                  </Badge>
                </div>
                
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Current Stock:</span>
                    <span className={`font-semibold ${textColor}`} data-testid={`current-stock-${index}`}>
                      {currentStock.toLocaleString()} L
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Capacity:</span>
                    <span data-testid={`capacity-${index}`}>{capacity.toLocaleString()} L</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-muted-foreground">Available:</span>
                    <span className="text-green-600 font-medium" data-testid={`available-${index}`}>
                      {available.toLocaleString()} L
                    </span>
                  </div>
                  
                  <div className="space-y-2">
                    <Progress value={percentage} className="h-3" />
                    <div className="text-center text-sm text-muted-foreground" data-testid={`percentage-${index}`}>
                      {percentage}% filled
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Stock Movements and Alerts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Stock Movements */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Stock Movements</CardTitle>
          </CardHeader>
          <CardContent>
            {movementsLoading ? (
              <div className="space-y-3">
                {[...Array(3)].map((_, i) => (
                  <div key={i} className="animate-pulse p-4 bg-muted rounded-md h-20"></div>
                ))}
              </div>
            ) : (
              <div className="space-y-4">
                {stockMovements.length > 0 ? stockMovements.slice(0, 3).map((movement: StockMovement, index: number) => {
                  const tank = tanks.find(t => t.id === movement.tankId);
                  const product = products.find(p => p.id === tank?.productId);
                  const isPositive = movement.movementType === 'in';
                  const quantity = parseFloat(movement.quantity || '0');
                  const timeAgo = new Date(movement.movementDate).toLocaleString('en-GB');
                  
                  return (
                    <div key={movement.id} className="p-4 border border-border rounded-md">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className={`font-medium ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            Stock {movement.movementType === 'in' ? 'In' : movement.movementType === 'out' ? 'Out' : 'Adjustment'} - {product?.name || 'Unknown'}
                          </div>
                          <div className="text-sm text-muted-foreground">
                            {tank?.name} | {movement.referenceType || 'Manual'} #{movement.referenceId || 'N/A'}
                          </div>
                          <div className="text-xs text-muted-foreground">{timeAgo}</div>
                        </div>
                        <div className="text-right">
                          <div className={`font-semibold ${isPositive ? 'text-green-600' : 'text-red-600'}`}>
                            {isPositive ? '+' : ''}{Math.abs(quantity).toLocaleString()} L
                          </div>
                          <div className="text-sm text-muted-foreground">Movement</div>
                        </div>
                      </div>
                    </div>
                  );
                }) : (
                  <div className="p-4 text-center text-muted-foreground">
                    No recent stock movements
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Low Stock Alerts */}
        <Card>
          <CardHeader>
            <CardTitle>Stock Alerts & Actions</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {/* Generate real alerts based on tank data */}
              {tanks.filter(tank => {
                const currentStock = parseFloat(tank.currentStock || '0');
                const minimumLevel = parseFloat(tank.minimumLevel || '0');
                return currentStock <= minimumLevel;
              }).slice(0, 2).map((tank, index) => {
                const currentStock = parseFloat(tank.currentStock || '0');
                const capacity = parseFloat(tank.capacity || '1');
                const percentage = Math.round((currentStock / capacity) * 100);
                const product = products.find(p => p.id === tank.productId);
                
                return (
                  <div key={tank.id} className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <div className="flex items-start">
                      <span className="text-yellow-500 mr-2">⚠️</span>
                      <div className="flex-1">
                        <div className="text-sm font-medium text-yellow-800">Low Stock Alert</div>
                        <div className="text-xs text-yellow-600 mt-1">
                          {tank.name} ({product?.name}) - Only {currentStock.toLocaleString()}L remaining ({percentage}% capacity)
                        </div>
                        <Button 
                          size="sm" 
                          className="mt-2 bg-yellow-600 hover:bg-yellow-700 text-white"
                          data-testid="button-create-purchase-order"
                        >
                          Create Purchase Order
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
              
              {/* Show info message if no critical alerts */}
              {tanks.filter(tank => parseFloat(tank.currentStock || '0') <= parseFloat(tank.minimumLevel || '0')).length === 0 && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-start">
                    <span className="text-green-500 mr-2">✓</span>
                    <div className="flex-1">
                      <div className="text-sm font-medium text-green-800">All Stock Levels Normal</div>
                      <div className="text-xs text-green-600 mt-1">
                        No critical stock alerts at this time
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Quick Stock Actions */}
            <div className="mt-6 pt-4 border-t border-border">
              <h5 className="font-medium text-card-foreground mb-3">Quick Actions</h5>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" size="sm" data-testid="button-stock-report-quick">
                  📊 Stock Report
                </Button>
                <Button variant="outline" size="sm" data-testid="button-new-purchase">
                  📦 New Purchase
                </Button>
                <Button variant="outline" size="sm" data-testid="button-stock-transfer">
                  🔄 Stock Transfer
                </Button>
                <Button variant="outline" size="sm" data-testid="button-stock-audit">
                  📋 Stock Audit
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
