import { useState } from "react";
import type { PurchaseOrder, Supplier, Product } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

export default function PurchaseOrders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: purchaseOrders = [], isLoading } = useQuery<PurchaseOrder[]>({
    queryKey: ["/api/purchase-orders", user?.stationId],
    enabled: !!user?.stationId,
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const filteredOrders = purchaseOrders.filter((order: PurchaseOrder) => {
    const matchesSearch = order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  const pendingOrders = filteredOrders.filter((o: PurchaseOrder) => o.status === 'pending').length;
  const deliveredOrders = filteredOrders.filter((o: PurchaseOrder) => o.status === 'delivered').length;
  const totalValue = filteredOrders.reduce((sum: number, o: PurchaseOrder) => sum + parseFloat(o.totalAmount || '0'), 0);

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Purchase Orders</h3>
          <p className="text-muted-foreground">Manage fuel procurement and supplier orders</p>
        </div>
        <Button data-testid="button-new-purchase-order">
          + New Purchase Order
        </Button>
      </div>

      {/* Purchase Order Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary" data-testid="total-orders">
              {filteredOrders.length}
            </div>
            <div className="text-sm text-muted-foreground">Total Orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600" data-testid="pending-orders">
              {pendingOrders}
            </div>
            <div className="text-sm text-muted-foreground">Pending Orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600" data-testid="delivered-orders">
              {deliveredOrders}
            </div>
            <div className="text-sm text-muted-foreground">Delivered Orders</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600" data-testid="total-order-value">
              ₹{totalValue.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Value</div>
          </CardContent>
        </Card>
      </div>

      {/* Purchase Orders Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Purchase Order History</CardTitle>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search by PO number..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
                data-testid="input-search-po"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" data-testid="select-status-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-muted">
                <tr>
                  <th className="text-left p-3 font-medium">PO Number</th>
                  <th className="text-left p-3 font-medium">Supplier</th>
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-right p-3 font-medium">Quantity</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-center p-3 font-medium">Order Date</th>
                  <th className="text-center p-3 font-medium">Delivery Date</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Sample purchase orders */}
                {[
                  {
                    poNumber: "PO-2024-001",
                    supplier: "Bharat Petroleum",
                    product: "Petrol",
                    quantity: "5,000",
                    amount: "5,52,500",
                    orderDate: "15 Jan 2024",
                    deliveryDate: "17 Jan 2024",
                    status: "delivered"
                  },
                  {
                    poNumber: "PO-2024-002",
                    supplier: "Indian Oil Corporation",
                    product: "Diesel",
                    quantity: "3,000",
                    amount: "2,52,750",
                    orderDate: "16 Jan 2024",
                    deliveryDate: "18 Jan 2024",
                    status: "pending"
                  },
                  {
                    poNumber: "PO-2024-003",
                    supplier: "Hindustan Petroleum",
                    product: "Premium Petrol",
                    quantity: "2,000",
                    amount: "2,31,000",
                    orderDate: "17 Jan 2024",
                    deliveryDate: "19 Jan 2024",
                    status: "pending"
                  }
                ].map((order, index) => (
                  <tr key={index} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3">
                      <span className="font-medium text-primary" data-testid={`po-number-${index}`}>
                        {order.poNumber}
                      </span>
                    </td>
                    <td className="p-3">{order.supplier}</td>
                    <td className="p-3">{order.product}</td>
                    <td className="p-3 text-right">{order.quantity} L</td>
                    <td className="p-3 text-right font-semibold" data-testid={`amount-${index}`}>
                      ₹{order.amount}
                    </td>
                    <td className="p-3 text-center text-sm">{order.orderDate}</td>
                    <td className="p-3 text-center text-sm">{order.deliveryDate}</td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={order.status === 'delivered' ? 'default' : 
                                order.status === 'pending' ? 'secondary' : 'destructive'}
                        className={order.status === 'delivered' ? 'bg-green-100 text-green-800' :
                                  order.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : ''}
                        data-testid={`status-${index}`}
                      >
                        {order.status}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-800"
                          data-testid={`button-view-${index}`}
                        >
                          👁️
                        </button>
                        <button 
                          className="text-green-600 hover:text-green-800"
                          data-testid={`button-edit-${index}`}
                        >
                          ✏️
                        </button>
                        <button 
                          className="text-purple-600 hover:text-purple-800"
                          data-testid={`button-print-${index}`}
                        >
                          🖨️
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
