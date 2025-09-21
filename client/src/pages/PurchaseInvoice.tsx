
import { useState } from "react";
import { useForm, useFieldArray } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { z } from "zod";
import { Plus, Trash2, Save, FileText, Download, Printer } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { apiRequest } from "@/lib/api";

const purchaseItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.string().min(1, "Quantity is required"),
  unitPrice: z.string().min(1, "Unit price is required"),
  totalPrice: z.string().min(1, "Total price is required"),
});

const purchaseInvoiceSchema = z.object({
  supplierId: z.string().min(1, "Supplier is required"),
  dueDate: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(purchaseItemSchema).min(1, "At least one item is required"),
});

type PurchaseInvoiceForm = z.infer<typeof purchaseInvoiceSchema>;

interface Product {
  id: string;
  name: string;
  currentPrice: string;
  unit: string;
}

interface Supplier {
  id: string;
  name: string;
  contactPerson?: string;
  contactPhone?: string;
}

export default function PurchaseInvoice() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const queryClient = useQueryClient();
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<PurchaseInvoiceForm>({
    resolver: zodResolver(purchaseInvoiceSchema),
    defaultValues: {
      supplierId: "",
      dueDate: "",
      notes: "",
      items: [{ productId: "", quantity: "", unitPrice: "", totalPrice: "" }],
    },
  });

  const { fields, append, remove } = useFieldArray({
    control: form.control,
    name: "items",
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
    queryFn: () => apiRequest("GET", "/api/products").then(res => res.json()),
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    queryFn: () => apiRequest("GET", "/api/suppliers").then(res => res.json()),
  });

  const createPurchaseOrderMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/purchase-orders", data);
      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.message || "Failed to create purchase order");
      }
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Purchase invoice created",
        description: "Purchase invoice has been created successfully",
      });
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/purchase-orders"] });
    },
    onError: (error: Error) => {
      console.error("Purchase order creation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to create purchase invoice",
        variant: "destructive",
      });
    },
  });

  const onSubmit = async (data: PurchaseInvoiceForm) => {
    if (!user?.stationId) {
      toast({
        title: "Error",
        description: "Station information is required",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);

      const subtotal = data.items.reduce((sum, item) => sum + parseFloat(item.totalPrice || "0"), 0);
      const taxAmount = 0; // No tax for now
      const totalAmount = subtotal + taxAmount;

      const purchaseOrder = {
        stationId: user.stationId,
        supplierId: data.supplierId,
        userId: user.id,
        dueDate: data.dueDate ? new Date(data.dueDate).toISOString() : null,
        currencyCode: "PKR",
        subtotal: subtotal.toString(),
        taxAmount: taxAmount.toString(),
        totalAmount: totalAmount.toString(),
        paidAmount: "0",
        notes: data.notes || "",
      };

      const items = data.items.map(item => ({
        productId: item.productId,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        totalPrice: item.totalPrice,
      }));

      await createPurchaseOrderMutation.mutateAsync({ order: purchaseOrder, items });
    } catch (error) {
      console.error("Form submission error:", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const updateItemPrice = (index: number, field: 'quantity' | 'unitPrice', value: string) => {
    const quantity = field === 'quantity' ? parseFloat(value || "0") : parseFloat(form.watch(`items.${index}.quantity`) || "0");
    const unitPrice = field === 'unitPrice' ? parseFloat(value || "0") : parseFloat(form.watch(`items.${index}.unitPrice`) || "0");
    const totalPrice = quantity * unitPrice;
    
    form.setValue(`items.${index}.totalPrice`, totalPrice.toFixed(2));
  };

  const onProductChange = (index: number, productId: string) => {
    const product = products.find(p => p.id === productId);
    if (product) {
      form.setValue(`items.${index}.unitPrice`, product.currentPrice);
      updateItemPrice(index, 'unitPrice', product.currentPrice);
    }
  };

  const addItem = () => {
    append({ productId: "", quantity: "", unitPrice: "", totalPrice: "" });
  };

  const removeItem = (index: number) => {
    if (fields.length > 1) {
      remove(index);
    }
  };

  const getTotalAmount = () => {
    return form.watch("items").reduce((sum, item) => sum + parseFloat(item.totalPrice || "0"), 0);
  };

  const handlePrint = () => {
    window.print();
    console.log("📄 Print functionality triggered");
  };

  const handleDownload = () => {
    const invoiceData = form.getValues();
    const blob = new Blob([JSON.stringify(invoiceData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `purchase-invoice-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    console.log("💾 Download functionality triggered");
    
    toast({
      title: "Download started",
      description: "Purchase invoice template downloaded successfully",
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold">Purchase Invoice</h3>
          <p className="text-muted-foreground">Create new purchase invoice</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <FileText className="w-5 h-5 mr-2" />
            Invoice Details
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="supplierId"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Supplier *</FormLabel>
                      <Select onValueChange={field.onChange} value={field.value}>
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select supplier" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          {suppliers.map((supplier) => (
                            <SelectItem key={supplier.id} value={supplier.id}>
                              {supplier.name}
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
                  name="dueDate"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Due Date</FormLabel>
                      <FormControl>
                        <Input type="date" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>

              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h4 className="text-lg font-medium">Items</h4>
                  <Button type="button" variant="outline" onClick={addItem}>
                    <Plus className="w-4 h-4 mr-2" />
                    Add Item
                  </Button>
                </div>

                {fields.map((field, index) => (
                  <div key={field.id} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-4">
                      <FormField
                        control={form.control}
                        name={`items.${index}.productId`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Product</FormLabel>
                            <Select 
                              onValueChange={(value) => {
                                field.onChange(value);
                                onProductChange(index, value);
                              }} 
                              value={field.value}
                            >
                              <FormControl>
                                <SelectTrigger>
                                  <SelectValue placeholder="Select product" />
                                </SelectTrigger>
                              </FormControl>
                              <SelectContent>
                                {products.map((product) => (
                                  <SelectItem key={product.id} value={product.id}>
                                    {product.name}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.quantity`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Quantity</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  updateItemPrice(index, 'quantity', e.target.value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-2">
                      <FormField
                        control={form.control}
                        name={`items.${index}.unitPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Unit Price</FormLabel>
                            <FormControl>
                              <Input 
                                type="number" 
                                step="0.01" 
                                {...field}
                                onChange={(e) => {
                                  field.onChange(e);
                                  updateItemPrice(index, 'unitPrice', e.target.value);
                                }}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-3">
                      <FormField
                        control={form.control}
                        name={`items.${index}.totalPrice`}
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Total</FormLabel>
                            <FormControl>
                              <Input {...field} readOnly />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                    </div>
                    <div className="col-span-1">
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => removeItem(index)}
                        disabled={fields.length === 1}
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex justify-end">
                <div className="text-right">
                  <p className="text-lg font-semibold">
                    Total: {formatCurrency(getTotalAmount())}
                  </p>
                </div>
              </div>

              <FormField
                control={form.control}
                name="notes"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes</FormLabel>
                    <FormControl>
                      <Textarea {...field} rows={3} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="flex justify-end space-x-2">
                <Button type="button" variant="outline" onClick={() => form.reset()}>
                  Reset
                </Button>
                <Button type="submit" disabled={isSubmitting}>
                  <Save className="w-4 h-4 mr-2" />
                  {isSubmitting ? "Creating..." : "Create Invoice"}
                </Button>
              </div>
            </form>
          </Form>
        </CardContent>
      </Card>
    </div>
  );
}
