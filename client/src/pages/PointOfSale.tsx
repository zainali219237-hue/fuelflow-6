import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product, Customer, Tank } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { apiRequest } from "@/lib/api";

interface POSItem {
  productId: string;
  productName: string;
  tankId: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

export default function PointOfSale() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [transactionItems, setTransactionItems] = useState<POSItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "credit" | "fleet">("cash");

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: tanks = [] } = useQuery<Tank[]>({
    queryKey: ["/api/tanks", user?.stationId],
    enabled: !!user?.stationId,
  });

  const createSaleMutation = useMutation({
    mutationFn: async (saleData: { customerId?: string; paymentMethod: string; items: Array<{ productId: string; quantity: number; price: number }> }) => {
      const response = await apiRequest("POST", "/api/sales", saleData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sale completed",
        description: "Transaction recorded successfully",
      });
      setTransactionItems([]);
      setSelectedCustomerId("");
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
    },
    onError: () => {
      toast({
        title: "Sale failed",
        description: "Failed to record transaction",
        variant: "destructive",
      });
    },
  });

  const addProduct = (product: Product) => {
    // For now, we'll create a mock tank since tank management is not fully implemented
    // In a real system, you'd check for available tanks for this product
    const mockTankId = `tank-${product.id}`;

    const newItem: POSItem = {
      productId: product.id,
      productName: product.name,
      tankId: mockTankId,
      quantity: 25,
      unitPrice: parseFloat(product.currentPrice),
      totalPrice: 25 * parseFloat(product.currentPrice),
    };

    setTransactionItems([...transactionItems, newItem]);
    
    toast({
      title: "Product added",
      description: `${product.name} added to transaction`,
    });
  };

  const removeItem = (index: number) => {
    setTransactionItems(transactionItems.filter((_, i) => i !== index));
  };

  const updateQuantity = (index: number, quantity: number) => {
    const updatedItems = [...transactionItems];
    updatedItems[index].quantity = quantity;
    updatedItems[index].totalPrice = quantity * updatedItems[index].unitPrice;
    setTransactionItems(updatedItems);
  };

  const subtotal = transactionItems.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxAmount = subtotal * 0.05; // 5% tax
  const totalAmount = subtotal + taxAmount;

  const completeSale = () => {
    if (transactionItems.length === 0) {
      toast({
        title: "No items",
        description: "Please add items to the transaction",
        variant: "destructive",
      });
      return;
    }

    const transaction = {
      invoiceNumber: `INV-${Date.now()}`,
      stationId: user?.stationId,
      customerId: selectedCustomerId || customers.find(c => c.type === 'walk-in')?.id,
      userId: user?.id,
      paymentMethod,
      subtotal: subtotal.toFixed(2),
      taxAmount: taxAmount.toFixed(2),
      totalAmount: totalAmount.toFixed(2),
      paidAmount: paymentMethod === 'credit' ? '0' : totalAmount.toFixed(2),
      outstandingAmount: paymentMethod === 'credit' ? totalAmount.toFixed(2) : '0',
    };

    const items = transactionItems.map(item => ({
      productId: item.productId,
      tankId: item.tankId,
      quantity: item.quantity.toString(),
      unitPrice: item.unitPrice.toFixed(2),
      totalPrice: item.totalPrice.toFixed(2),
    }));

    createSaleMutation.mutate({ transaction, items });
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 fade-in">
      {/* POS Interface */}
      <div className="lg:col-span-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="text-xl">New Sale Transaction</CardTitle>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-muted-foreground">Transaction #</span>
                <span className="font-mono font-semibold bg-muted px-2 py-1 rounded" data-testid="transaction-number">
                  TXN-{Date.now().toString().slice(-6)}
                </span>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Customer Selection */}
            <div>
              <label className="block text-sm font-medium text-card-foreground mb-2">Customer</label>
              <div className="flex space-x-2">
                <Select value={selectedCustomerId} onValueChange={setSelectedCustomerId}>
                  <SelectTrigger className="flex-1" data-testid="select-customer">
                    <SelectValue placeholder="Walk-in Customer" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="walk-in">Walk-in Customer</SelectItem>
                    {customers.filter(c => c.type !== 'walk-in').map((customer) => (
                      <SelectItem key={customer.id} value={customer.id}>
                        {customer.name} ({customer.type})
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Button variant="secondary" data-testid="button-add-customer">+ Add</Button>
              </div>
            </div>

            {/* Product Selection */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {products.map((product) => (
                <Card 
                  key={product.id}
                  className="hover:shadow-md cursor-pointer transition-shadow border-2 border-transparent hover:border-primary/20"
                  onClick={() => addProduct(product)}
                  data-testid={`card-product-${product.name.toLowerCase().replace(/\s+/g, '-')}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-primary">{product.name}</h4>
                        <p className="text-sm text-muted-foreground">{product.category}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">₹{parseFloat(product.currentPrice).toFixed(2)}</div>
                        <div className="text-xs text-muted-foreground">per {product.unit}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* Transaction Items */}
            <Card>
              <CardContent className="p-0">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-muted">
                      <tr>
                        <th className="text-left p-3 font-medium text-card-foreground">Product</th>
                        <th className="text-center p-3 font-medium text-card-foreground">Qty (L)</th>
                        <th className="text-right p-3 font-medium text-card-foreground">Rate</th>
                        <th className="text-right p-3 font-medium text-card-foreground">Amount</th>
                        <th className="text-center p-3 font-medium text-card-foreground">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {transactionItems.map((item, index) => (
                        <tr key={index} className="border-t border-border">
                          <td className="p-3">
                            <div className="font-medium text-green-600">{item.productName}</div>
                            <div className="text-sm text-muted-foreground">Pump #{index + 1}</div>
                          </td>
                          <td className="p-3 text-center">
                            <Input
                              type="number"
                              value={item.quantity}
                              onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                              className="w-16 text-center"
                              data-testid={`input-quantity-${index}`}
                            />
                          </td>
                          <td className="p-3 text-right">₹{item.unitPrice.toFixed(2)}</td>
                          <td className="p-3 text-right font-semibold" data-testid={`amount-${index}`}>
                            ₹{item.totalPrice.toFixed(2)}
                          </td>
                          <td className="p-3 text-center">
                            <button 
                              onClick={() => removeItem(index)}
                              className="text-destructive hover:text-destructive/80"
                              data-testid={`button-remove-${index}`}
                            >
                              🗑️
                            </button>
                          </td>
                        </tr>
                      ))}
                      {transactionItems.length === 0 && (
                        <tr>
                          <td colSpan={5} className="p-8 text-center text-muted-foreground">
                            No items added. Click on a product above to add it.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </CardContent>
            </Card>

            {/* Payment Methods */}
            <div className="flex justify-end space-x-4">
              <Button 
                variant={paymentMethod === 'cash' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('cash')}
                data-testid="button-payment-cash"
              >
                Cash Payment
              </Button>
              <Button 
                variant={paymentMethod === 'card' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('card')}
                data-testid="button-payment-card"
              >
                Card Payment
              </Button>
              <Button 
                variant={paymentMethod === 'credit' ? 'default' : 'outline'}
                onClick={() => setPaymentMethod('credit')}
                data-testid="button-payment-credit"
              >
                Credit Sale
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transaction Summary */}
      <div className="lg:col-span-1">
        <Card className="sticky top-4">
          <CardHeader>
            <CardTitle>Transaction Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Subtotal:</span>
                <span className="font-semibold" data-testid="subtotal">₹{subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (5%):</span>
                <span className="font-semibold" data-testid="tax-amount">₹{taxAmount.toFixed(2)}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-card-foreground">Total:</span>
                  <span className="text-lg font-bold text-primary" data-testid="total-amount">
                    ₹{totalAmount.toFixed(2)}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-3">
              <Button 
                className="w-full" 
                size="lg"
                onClick={completeSale}
                disabled={createSaleMutation.isPending || transactionItems.length === 0}
                data-testid="button-complete-sale"
              >
                {createSaleMutation.isPending ? "Processing..." : "Complete Sale"}
              </Button>
              <Button variant="outline" className="w-full" data-testid="button-save-draft">
                Save as Draft
              </Button>
              <Button variant="outline" className="w-full text-destructive hover:bg-destructive/10" data-testid="button-cancel">
                Cancel Transaction
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="pt-6 border-t border-border">
              <h4 className="font-medium text-card-foreground mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <button className="w-full text-left p-2 hover:bg-muted rounded-md text-sm" data-testid="button-last-transaction">
                  📱 Last Transaction
                </button>
                <button className="w-full text-left p-2 hover:bg-muted rounded-md text-sm" data-testid="button-print-receipt">
                  🧾 Print Receipt
                </button>
                <button className="w-full text-left p-2 hover:bg-muted rounded-md text-sm" data-testid="button-day-summary">
                  📊 Day Summary
                </button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
