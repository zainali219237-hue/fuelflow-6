import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { PurchaseOrder, Supplier, Product } from "@shared/schema";
import { insertPurchaseOrderSchema } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Textarea } from "@/components/ui/textarea";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { apiRequest } from "@/lib/api";
import { Combobox } from "@/components/ui/combobox";
import { TrendingUp, TrendingDown, AlertTriangle, Eye, Pencil, Printer, Trash2 } from "lucide-react";


export default function PurchaseOrders() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency, currencyConfig } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [editOrderId, setEditOrderId] = useState<string | null>(null);

  const form = useForm({
    resolver: zodResolver(insertPurchaseOrderSchema.extend({
      orderDate: insertPurchaseOrderSchema.shape.orderDate.optional(),
      expectedDeliveryDate: insertPurchaseOrderSchema.shape.expectedDeliveryDate.optional(),
    })),
    defaultValues: {
      orderNumber: `PO-${Date.now()}`,
      supplierId: "",
      expectedDeliveryDate: undefined, // Use undefined instead of empty string for optional date
      status: "pending",
      subtotal: "0",
      taxAmount: "0",
      totalAmount: "0",
      notes: "",
      stationId: user?.stationId || "",
      userId: user?.id || "",
    },
  });

  const createPurchaseOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const processedData = {
        ...data,
        stationId: user?.stationId || data.stationId,
        userId: user?.id || data.userId,
        expectedDeliveryDate: data.expectedDeliveryDate === "" ? undefined : data.expectedDeliveryDate,
        currencyCode: currencyConfig.code,
      };
      const response = await apiRequest("POST", "/api/purchase-orders", processedData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase order created",
        description: "Purchase order has been created successfully",
      });
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", user?.stationId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create purchase order",
        variant: "destructive",
      });
    },
  });

  const updatePurchaseOrderMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const processedData = {
        ...data,
        stationId: user?.stationId || data.stationId,
        userId: user?.id || data.userId,
        expectedDeliveryDate: data.expectedDeliveryDate === "" ? undefined : data.expectedDeliveryDate,
        currencyCode: currencyConfig.code,
      };
      const response = await apiRequest("PUT", `/api/purchase-orders/${id}`, processedData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase order updated",
        description: "Purchase order has been updated successfully",
      });
      setEditOrderId(null);
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", user?.stationId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update purchase order",
        variant: "destructive",
      });
    },
  });

  const deletePurchaseOrderMutation = useMutation({
    mutationFn: async (id: string) => {
      await apiRequest("DELETE", `/api/purchase-orders/${id}`);
    },
    onSuccess: () => {
      toast({
        title: "Purchase order deleted",
        description: "Purchase order has been deleted successfully",
      });
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders", user?.stationId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to delete purchase order",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    if (editOrderId) {
      updatePurchaseOrderMutation.mutate({ id: editOrderId, data });
    } else {
      createPurchaseOrderMutation.mutate(data);
    }
  };

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

  const handleDeleteOrder = (order: PurchaseOrder) => {
    // Use a dialog component for confirmation instead of window.confirm
    // For now, we'll keep the window.confirm as a placeholder
    if (window.confirm(`Are you sure you want to delete purchase order ${order.orderNumber}?`)) {
      deletePurchaseOrderMutation.mutate(order.id);
    }
  };

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
        <Dialog open={editOrderId !== null || open} onOpenChange={(isOpen) => { if (!isOpen) { setEditOrderId(null); form.reset(); } else { setOpen(true); } }}>
          <DialogTrigger asChild>
            <Button data-testid="button-new-purchase-order">
              + New Purchase Order
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editOrderId ? "Edit Purchase Order" : "Create New Purchase Order"}</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="orderNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Order Number *</FormLabel>
                        <FormControl>
                          <Input placeholder="PO-123456" {...field} data-testid="input-order-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier *</FormLabel>
                        <FormControl>
                          <Combobox
                            options={suppliers.map(s => ({ value: s.id, label: s.name }))}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select supplier"
                            emptyMessage="No suppliers found"
                            data-testid="select-supplier"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="expectedDeliveryDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Expected Delivery Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} data-testid="input-delivery-date" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-3 gap-4">
                  <FormField
                    control={form.control}
                    name="subtotal"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Subtotal ({currencyConfig.symbol}) *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-subtotal" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="taxAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tax Amount ({currencyConfig.symbol})</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-tax-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="totalAmount"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Total Amount ({currencyConfig.symbol}) *</FormLabel>
                        <FormControl>
                          <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-total-amount" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes</FormLabel>
                      <FormControl>
                        <Textarea placeholder="Order details and special instructions" {...field} data-testid="input-order-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => { setOpen(false); setEditOrderId(null); form.reset(); }} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createPurchaseOrderMutation.isPending || updatePurchaseOrderMutation.isPending} data-testid="button-submit-order">
                    {editOrderId ? "Update Purchase Order" : "Create Purchase Order"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
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
              {formatCurrency(totalValue)}
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
                {filteredOrders.length > 0 ? filteredOrders.map((order: PurchaseOrder, index: number) => {
                  const supplier = suppliers.find(s => s.id === order.supplierId);

                  return (
                    <tr key={order.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3">
                        <span className="font-medium text-primary" data-testid={`po-number-${index}`}>
                          {order.orderNumber}
                        </span>
                      </td>
                      <td className="p-3">{supplier?.name || 'Unknown Supplier'}</td>
                      <td className="p-3">Mixed Products</td>
                      <td className="p-3 text-right">-</td>
                      <td className="p-3 text-right font-semibold" data-testid={`amount-${index}`}>
                        {formatCurrency(parseFloat(order.totalAmount || '0'))}
                      </td>
                      <td className="p-3 text-center text-sm">
                        {order.orderDate ? new Date(order.orderDate).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="p-3 text-center text-sm">
                        {order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toLocaleDateString('en-GB') : 'TBD'}
                      </td>
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
                        <div className="flex items-center space-x-2 justify-center">
                          <button
                            onClick={() => {
                              toast({
                                title: "Order Details",
                                description: `Order ${order.orderNumber} - ${order.status}`,
                              });
                            }}
                            className="text-blue-600 hover:text-blue-800 p-1 hover:bg-blue-50 rounded"
                            data-testid="button-view-order"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEditOrderId(order.id);
                              form.reset({
                                orderNumber: order.orderNumber || "",
                                supplierId: order.supplierId || "",
                                expectedDeliveryDate: order.expectedDeliveryDate ? new Date(order.expectedDeliveryDate).toISOString().split('T')[0] : '',
                                status: order.status || "pending",
                                subtotal: order.subtotal || "0",
                                taxAmount: order.taxAmount || "0",
                                totalAmount: order.totalAmount || "0",
                                notes: order.notes || "",
                              });
                            }}
                            className="text-green-600 hover:text-green-800 p-1 hover:bg-green-50 rounded"
                            data-testid="button-edit-order"
                            title="Edit Order"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              toast({
                                title: "Order Printed",
                                description: `Purchase order ${order.orderNumber} sent to printer`,
                              });
                            }}
                            className="text-purple-600 hover:text-purple-800 p-1 hover:bg-purple-50 rounded"
                            data-testid="button-print-order"
                            title="Print Order"
                          >
                            <Printer className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteOrder(order)}
                            className="text-red-600 hover:text-red-800 p-1 hover:bg-red-50 rounded"
                            data-testid="button-delete-order"
                            title="Delete Order"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No purchase orders found for the selected criteria
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}