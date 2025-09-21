import React, { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Plus, Minus, ShoppingCart, Receipt, Save, Trash2, Users, Package, CreditCard, Calculator } from "lucide-react";
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
  const [selectedCategory, setSelectedCategory] = useState<string>("all");
  const [productSearch, setProductSearch] = useState("");

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

  // Find walk-in customer and set as default
  const walkInCustomer = customers.find(c => c.type === 'walk-in') || customers[0];

  // Set default customer if form is empty
  React.useEffect(() => {
    if (walkInCustomer && !form.getValues('customerId')) {
      form.setValue('customerId', walkInCustomer.id);
    }
  }, [walkInCustomer, form]);

  // Get product categories
  const categories = [...new Set(products.map(p => p.category))];

  // Filter products
  const filteredProducts = products.filter(product => {
    const matchesCategory = selectedCategory === "all" || product.category === selectedCategory;
    const matchesSearch = product.name.toLowerCase().includes(productSearch.toLowerCase());
    return matchesCategory && matchesSearch;
  });

  // Calculate totals
  const subtotal = cart.reduce((sum, item) => sum + item.totalPrice, 0);
  const taxRate = 0; // Can be fetched from settings
  const taxAmount = subtotal * taxRate;
  const totalAmount = subtotal + taxAmount;

  // Add product to cart
  const addToCart = (product: Product, tank?: Tank) => {
    const existingItemIndex = cart.findIndex(item => 
      item.productId === product.id && item.tankId === tank?.id
    );

    if (existingItemIndex >= 0) {
      updateQuantity(existingItemIndex, cart[existingItemIndex].quantity + 1);
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

  // Update unit price
  const updateUnitPrice = (index: number, newPrice: number) => {
    const updatedCart = [...cart];
    updatedCart[index].unitPrice = newPrice;
    updatedCart[index].totalPrice = newPrice * updatedCart[index].quantity;
    setCart(updatedCart);
  };

  // Remove from cart
  const removeFromCart = (index: number) => {
    setCart(cart.filter((_, i) => i !== index));
  };

  // Clear cart
  const clearCart = () => {
    setCart([]);
    form.reset({
      customerId: walkInCustomer?.id || "",
      paymentMethod: "cash",
      notes: "",
    });
  };

  // Create sale mutation
  const createSaleMutation = useMutation({
    mutationFn: async (saleData: any) => {
      const response = await apiRequest("POST", "/api/sales", saleData);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || 'Failed to create sale');
      }
      return response.json();
    },
    onSuccess: (data) => {
      toast({
        title: "Sale completed successfully",
        description: `Invoice ${data.invoiceNumber} created`,
      });
      clearCart();
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tanks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: (error: any) => {
      console.error('Sale creation error:', error);
      toast({
        title: "Sale failed",
        description: error.message || "Failed to complete sale",
        variant: "destructive",
      });
    },
  });

  // Submit sale
  const onSubmit = (data: SaleFormData) => {
    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to cart before completing sale",
        variant: "destructive",
      });
      return;
    }

    if (!user?.id || !user?.stationId) {
      toast({
        title: "Authentication error",
        description: "User session invalid. Please login again.",
        variant: "destructive",
      });
      return;
    }

    const saleData = {
      stationId: user.stationId,
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
    <div className="container mx-auto p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-card-foreground">Point of Sale</h1>
          <p className="text-sm text-muted-foreground">Process fuel sales and transactions</p>
        </div>
        <div className="flex space-x-2">
          <Button
            variant="outline"
            onClick={clearCart}
            disabled={cart.length === 0}
            data-testid="button-clear-cart"
          >
            <Trash2 className="w-4 h-4 mr-2" />
            Clear Cart
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
        {/* Products Section */}
        <div className="xl:col-span-2 space-y-4">
          {/* Product Filters */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <CardTitle className="flex items-center text-lg">
                  <Package className="w-5 h-5 mr-2" />
                  Products
                </CardTitle>
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center space-y-2 sm:space-y-0 sm:space-x-2 w-full sm:w-auto">
                  <Input
                    placeholder="Search products..."
                    value={productSearch}
                    onChange={(e) => setProductSearch(e.target.value)}
                    className="w-full sm:w-48"
                  />
                  <Select value={selectedCategory} onValueChange={setSelectedCategory}>
                    <SelectTrigger className="w-full sm:w-32">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Categories</SelectItem>
                      {categories.map((category) => (
                        <SelectItem key={category} value={category}>
                          {category.charAt(0).toUpperCase() + category.slice(1)}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {filteredProducts.map((product) => {
                  const productTanks = getProductTanks(product.id);
                  const isFuel = product.category === 'fuel';

                  return (
                    <Card key={product.id} className="hover:shadow-md transition-shadow border">
                      <CardContent className="p-3">
                        <div className="space-y-2">
                          <div className="flex items-center justify-between">
                            <h3 className="font-medium text-sm">{product.name}</h3>
                            <Badge variant="secondary" className="text-xs">{product.category}</Badge>
                          </div>
                          <p className="text-sm font-semibold text-primary">
                            {formatCurrency(parseFloat(product.currentPrice))} / {product.unit}
                          </p>

                          {isFuel && productTanks.length > 0 ? (
                            <div className="space-y-1">
                              <p className="text-xs text-muted-foreground">Available Tanks:</p>
                              {productTanks.map((tank) => (
                                <Button
                                  key={tank.id}
                                  variant="outline"
                                  size="sm"
                                  className="w-full justify-between h-8 text-xs"
                                  onClick={() => addToCart(product, tank)}
                                  data-testid={`button-add-product-${product.id}-${tank.id}`}
                                >
                                  <span>{tank.name}</span>
                                  <span className="text-xs text-green-600">
                                    {parseFloat(tank.currentStock || '0').toFixed(1)}L
                                  </span>
                                </Button>
                              ))}
                            </div>
                          ) : (
                            <Button
                              variant="outline"
                              size="sm"
                              className="w-full h-8 text-xs"
                              onClick={() => addToCart(product)}
                              disabled={isFuel && productTanks.length === 0}
                              data-testid={`button-add-product-${product.id}`}
                            >
                              <Plus className="w-3 h-3 mr-1" />
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
          {/* Customer & Payment Info */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center text-lg">
                <Users className="w-5 h-5 mr-2" />
                Sale Details
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Form {...form}>
                <FormField
                  control={form.control}
                  name="customerId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Customer</FormLabel>
                      <Select 
                        onValueChange={field.onChange} 
                        value={field.value}
                      >
                        <FormControl>
                          <SelectTrigger data-testid="select-customer" className="h-9">
                            <SelectValue placeholder="Select customer" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {customers.map((customer) => (
                            <SelectItem key={customer.id} value={customer.id}>
                              <div className="flex items-center">
                                <span>{customer.name}</span>
                                {customer.type !== 'walk-in' && (
                                  <Badge variant="outline" className="ml-2 text-xs">
                                    {customer.type}
                                  </Badge>
                                )}
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="paymentMethod"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Payment Method</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-payment-method" className="h-9">
                            <SelectValue />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="cash">
                            <div className="flex items-center">
                              <CreditCard className="w-4 h-4 mr-2" />
                              Cash
                            </div>
                          </SelectItem>
                          <SelectItem value="card">
                            <div className="flex items-center">
                              <CreditCard className="w-4 h-4 mr-2" />
                              Card
                            </div>
                          </SelectItem>
                          <SelectItem value="credit">
                            <div className="flex items-center">
                              <CreditCard className="w-4 h-4 mr-2" />
                              Credit
                            </div>
                          </SelectItem>
                          <SelectItem value="fleet">
                            <div className="flex items-center">
                              <CreditCard className="w-4 h-4 mr-2" />
                              Fleet
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                  control={form.control}
                  name="notes"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="text-sm">Notes (Optional)</FormLabel>
                      <FormControl>
                        <Textarea 
                          placeholder="Add sale notes..." 
                          className="h-16 text-sm" 
                          {...field} 
                          data-testid="input-notes" 
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </Form>
            </CardContent>
          </Card>

          {/* Cart Items */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between text-lg">
                <div className="flex items-center">
                  <ShoppingCart className="w-5 h-5 mr-2" />
                  Cart ({cart.length} items)
                </div>
                <Badge variant="secondary">{formatCurrency(totalAmount)}</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {cart.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <ShoppingCart className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">Your cart is empty</p>
                  <p className="text-xs">Add products to get started</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {cart.map((item, index) => (
                    <div key={`${item.productId}-${item.tankId || 'no-tank'}`} className="border rounded-lg p-3">
                      <div className="flex items-start justify-between mb-2">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{item.product.name}</p>
                          {item.tank && (
                            <p className="text-xs text-muted-foreground">Tank: {item.tank.name}</p>
                          )}
                        </div>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeFromCart(index)}
                          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
                          data-testid={`button-remove-item-${index}`}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>

                      <div className="grid grid-cols-3 gap-2 items-center">
                        {/* Quantity Controls */}
                        <div className="flex items-center">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(index, item.quantity - 1)}
                            className="h-7 w-7 p-0"
                            data-testid={`button-decrease-quantity-${index}`}
                          >
                            <Minus className="w-3 h-3" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => updateQuantity(index, parseFloat(e.target.value) || 0)}
                            className="h-7 w-12 mx-1 text-center text-sm"
                            min="0"
                            step="0.1"
                          />
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => updateQuantity(index, item.quantity + 1)}
                            className="h-7 w-7 p-0"
                            data-testid={`button-increase-quantity-${index}`}
                          >
                            <Plus className="w-3 h-3" />
                          </Button>
                        </div>

                        {/* Unit Price */}
                        <Input
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateUnitPrice(index, parseFloat(e.target.value) || 0)}
                          className="h-7 text-sm"
                          min="0"
                          step="0.01"
                        />

                        {/* Total Price */}
                        <div className="text-right">
                          <p className="text-sm font-medium">{formatCurrency(item.totalPrice)}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {cart.length > 0 && (
                <>
                  <Separator className="my-3" />

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
                    <div className="flex justify-between font-semibold text-lg border-t pt-2">
                      <span>Total:</span>
                      <span data-testid="text-total">{formatCurrency(totalAmount)}</span>
                    </div>
                  </div>

                  <Separator className="my-3" />

                  {/* Complete Sale Button */}
                  <Button
                    className="w-full h-12 text-lg"
                    onClick={form.handleSubmit(onSubmit)}
                    disabled={cart.length === 0 || createSaleMutation.isPending || !form.watch('customerId')}
                    data-testid="button-complete-sale"
                  >
                    <Receipt className="w-5 h-5 mr-2" />
                    {createSaleMutation.isPending ? "Processing..." : `Complete Sale - ${formatCurrency(totalAmount)}`}
                  </Button>
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}