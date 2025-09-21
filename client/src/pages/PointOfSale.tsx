import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Plus, Minus, ShoppingCart, Receipt, Save, Trash2 } from "lucide-react";
import type { Product, Customer, Tank, SalesTransaction } from "@shared/schema";

interface CartItem {
  productId: string;
  product: Product;
  tankId?: string;
  tank?: Tank;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
}

const saleFormSchema = z.object({
  customerId: z.string().min(1, "Customer is required"),
  paymentMethod: z.enum(["cash", "card", "credit", "fleet"]),
  notes: z.string().optional(),
});

type SaleFormData = z.infer<typeof saleFormSchema>;

export default function PointOfSale() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const [cart, setCart] = useState<CartItem[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const form = useForm<SaleFormData>({
    resolver: zodResolver(saleFormSchema),
    defaultValues: {
      customerId: "",
      paymentMethod: "cash",
      notes: "",
    },
  });

  // Fetch data
  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: tanks = [] } = useQuery<Tank[]>({
    queryKey: ["/api/tanks"],
  });

  // Find walk-in customer
  const walkInCustomer = customers.find(c => c.type === 'walk-in') || customers[0];

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxRate = 0; // Can be fetched from settings
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  // Add product to cart
  const addToCart = (product: Product, tank?: Tank) => {
    const existingItem = cart.find(item => 
      item.productId === product.id && item.tankId === tank?.id
    );

    if (existingItem) {
      updateQuantity(cart.indexOf(existingItem), existingItem.quantity + 1);
    } else {
      const newItem: CartItem = {
        productId: product.id,
        product,
        tankId: tank?.id,
        tank,
        quantity: 1,
        unitPrice: parseFloat(product.currentPrice),
        totalPrice: parseFloat(product.currentPrice),
      };
      setCart([...cart, newItem]);
    }
  };

  // Update quantity
  const updateQuantity = (index: number, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeFromCart(index);
      return;
    }

    const updatedCart = [...cart];
    updatedCart[index].quantity = newQuantity;
    updatedCart[index].totalPrice = updatedCart[index].unitPrice * newQuantity;
    setCart(updatedCart);
  };

  // Remove from cart
  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    form.reset();
    setSelectedCustomer(null);
  };

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      const response = await apiRequest("POST", "/api/sales", saleData);
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sale completed",
        description: `Invoice ${data.invoiceNumber} created successfully`,
      });
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tanks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to complete sale",
        variant: "destructive",
      });
    },
  });

  // Submit sale
  const onSubmit = (data: SaleFormData) => {
    if (cart.length === 0) {
      toast({
        title: "Error",
        description: "Cart is empty",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id) {
      toast({
        title: "Error",
        description: "User authentication required",
        variant: "destructive",
      });
      return;
    }

    const saleData = {
      customerId: data.customerId,
      userId: user.id,
      paymentMethod: data.paymentMethod,
      currencyCode: "PKR",
      subtotal: subtotal.toString(),
      taxAmount: taxAmount.toString(),
      totalAmount: totalAmount.toString(),
      paidAmount: data.paymentMethod === "credit" ? "0" : totalAmount.toString(),
      outstandingAmount: data.paymentMethod === "credit" ? totalAmount.toString() : "0",
      notes: data.notes || null,
      items: cart.map(item => ({
        productId: item.productId,
        tankId: item.tankId || null,
        quantity: item.quantity.toString(),
        unitPrice: item.unitPrice.toString(),
        totalPrice: item.totalPrice.toString(),
      })),
    };

    createSaleMutation.mutate(saleData);
  };

  // Get available tanks for a product
  const getProductTanks = (productId: string) => {
    return tanks.filter(tank => tank.productId === productId && parseFloat(tank.currentStock || '0') > 0);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Point of Sale</h1>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={clearCart}
            disabled={cart.length === 0}
            data-testid="button-clear-cart"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Products Section */}
        <div className="lg:col-span-2 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ShoppingCart className="w-5 h-5 mr-2" />
                Available Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {products.map((product) => {
                  const productTanks = getProductTanks(product.id);
                  const isFuel = product.category === 'fuel';
                  
                  return (
                    <Card key={product.id} className="hover:shadow-md transition-shadow">
                      <CardContent className="p-4">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-semibold">{product.name}</h3>
                            <Badge variant="secondary">{product.category}</Badge>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            {formatCurrency(parseFloat(product.currentPrice))} per {product.unit}
                          </p>
                          
                          {isFuel && productTanks.length > 0 ? (
                            <div className="space-y-2">
                              <p className="text-xs text-muted-foreground">Select Tank:</p>
                              {productTanks.map((tank) => (
                                <Button
                                  key={tank.id}
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-between"
                                  onClick={() => addToCart(product, tank)}
                                  data-testid={`button-add-product-${product.id}-${tank.id}`}
                                >
                                  <span>{tank.name}</span>
                                  <span className="text-xs">
                                    {parseFloat(tank.currentStock || '0').toFixed(1)}L
                                  </span>
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full"
                              onClick={() => addToCart(product)}
                              disabled={isFuel && productTanks.length === 0}
                              data-testid={`button-add-product-${product.id}`}
                            >
                              <Plus className="w-4 h-4 mr-2" />
                              Add to Cart
                            </Button>
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Cart and Checkout Section */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Current Sale</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Customer Selection */}
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer</FormLabel>
                      <Select 
                        onValueChange={(value) => {
                          field.onChange(value);
                          const customer = customers.find(c => c.id === value);
                          setSelectedCustomer(customer || null);
                        }} 
                        value={field.value}
                        defaultValue={walkInCustomer?.id}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-customer">
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              {customer.name}
                              {customer.type !== 'walk-in' && (
                                <Badge variant="outline" className="ml-2">
                                  {customer.type}
                                </Badge>
                              )}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Payment Method */}
                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-method">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">Cash</SelectItem>
                          <SelectItem value="card">Card</SelectItem>
                          <SelectItem value="credit">Credit</SelectItem>
                          <SelectItem value="fleet">Fleet</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Notes */}
                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Notes (Optional)</FormLabel>
                      <FormControl>
                        <Input placeholder="Add any notes..." {...field} data-testid="input-notes" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Form>

              <Separator />

              {/* Cart Items */}
              <div className="space-y-2">
                <h3 className="font-semibold">Cart Items</h3>
                {cart.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No items in cart</p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {cart.map((item, index) => (
                      <div key={`${item.productId}-${item.tankId || 'no-tank'}`} className="flex items-center justify-between p-2 border rounded">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.product.name}</p>
                          {item.tank && (
                            <p className="text-xs text-muted-foreground">{item.tank.name}</p>
                          )}
                          <p className="text-xs text-muted-foreground">
                            {formatCurrency(item.unitPrice)} per {item.product.unit}
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            data-testid={`button-decrease-quantity-${index}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <span className="text-sm font-medium w-8 text-center">
                            {item.quantity}
                          </span>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                            data-testid={`button-increase-quantity-${index}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>
                        <div className="text-right min-w-16">
                          <p className="text-sm font-medium">{formatCurrency(item.totalPrice)}</p>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => removeFromCart(index)}
                            className="h-6 w-6 p-0"
                            data-testid={`button-remove-item-${index}`}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              <Separator />

              {/* Totals */}
              <div className="space-y-2">
                <div className="flex justify-between text-sm">
                  <span>Subtotal:</span>
                  <span data-testid="text-subtotal">{formatCurrency(subtotal)}</span>
                </div>
                {taxAmount > 0 && (
                  <div className="flex justify-between text-sm">
                    <span>Tax:</span>
                    <span data-testid="text-tax">{formatCurrency(taxAmount)}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold">
                  <span>Total:</span>
                  <span data-testid="text-total">{formatCurrency(totalAmount)}</span>
                </div>
              </div>

              <Separator />

              {/* Action Buttons */}
              <div className="space-y-2">
                <Button
                  className="w-full"
                  onClick={form.handleSubmit(onSubmit)}
                  disabled={cart.length === 0 || createSaleMutation.isPending}
                  data-testid="button-complete-sale"
                >
                  <Receipt className="w-4 h-4 mr-2" />
                  {createSaleMutation.isPending ? "Processing..." : "Complete Sale"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}