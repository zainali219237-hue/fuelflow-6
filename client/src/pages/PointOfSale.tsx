import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Product, Customer, Tank, SalesTransaction } from "@shared/schema";
import { insertCustomerSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Combobox, ComboboxOption } from "@/components/ui/combobox";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { apiRequest } from "@/lib/api";
import { useLocation } from "wouter";

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
  const { formatCurrency } = useCurrency();
  
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [transactionItems, setTransactionItems] = useState<POSItem[]>([]);
  const [paymentMethod, setPaymentMethod] = useState<"cash" | "card" | "credit" | "fleet">("cash");
  const [customerDialogOpen, setCustomerDialogOpen] = useState(false);
  const [quickQuantity, setQuickQuantity] = useState(25);
  const [, setLocation] = useLocation();
  
  // State to track editing mode
  const [isEditMode, setIsEditMode] = useState(false);
  const [editingTransactionId, setEditingTransactionId] = useState<string | null>(null);
  const [currentDraftId, setCurrentDraftId] = useState<string | null>(null);
  
  // Load draft or transaction data on mount
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const draftId = urlParams.get('draft');
    const editId = urlParams.get('edit');
    
    if (draftId) {
      setCurrentDraftId(draftId);
      loadDraft(draftId);
    } else if (editId) {
      setIsEditMode(true);
      setEditingTransactionId(editId);
      loadTransactionForEdit(editId);
    }
  }, []);
  
  const loadDraft = (draftId: string) => {
    try {
      // Load from allPosDrafts first
      const allDrafts = localStorage.getItem('allPosDrafts');
      if (allDrafts) {
        const drafts = JSON.parse(allDrafts);
        const draft = drafts.find((d: any) => d.id === draftId);
        if (draft) {
          setSelectedCustomerId(draft.selectedCustomerId || '');
          setTransactionItems(draft.transactionItems || []);
          setPaymentMethod(draft.paymentMethod || 'cash');
          
          toast({
            title: "Draft loaded",
            description: "Previous draft has been restored",
          });
          return;
        }
      }
      
      // Fallback to single draft if not found in allDrafts
      const singleDraft = localStorage.getItem('posDraft');
      if (singleDraft && draftId.includes('draft-')) {
        const draft = JSON.parse(singleDraft);
        setSelectedCustomerId(draft.selectedCustomerId || '');
        setTransactionItems(draft.transactionItems || []);
        setPaymentMethod(draft.paymentMethod || 'cash');
        
        toast({
          title: "Draft loaded",
          description: "Previous draft has been restored",
        });
      }
    } catch (error) {
      console.error('Failed to load draft:', error);
      toast({
        title: "Error",
        description: "Failed to load draft",
        variant: "destructive",
      });
    }
  };

  const loadTransactionForEdit = async (transactionId: string) => {
    try {
      const response = await apiRequest('GET', `/api/sales/detail/${transactionId}`);
      const transactionData = await response.json();
      
      if (transactionData && transactionData.items) {
        // Set customer
        setSelectedCustomerId(transactionData.customerId || '');
        
        // Set payment method
        setPaymentMethod(transactionData.paymentMethod || 'cash');
        
        // Convert transaction items to POSItem format
        const posItems = transactionData.items.map((item: any) => ({
          productId: item.productId,
          productName: item.product?.name || 'Unknown Product',
          tankId: item.tankId || `tank-${item.productId}`,
          quantity: parseFloat(item.quantity || '0'),
          unitPrice: parseFloat(item.unitPrice || '0'),
          totalPrice: parseFloat(item.totalPrice || '0'),
        }));
        
        setTransactionItems(posItems);
        
        toast({
          title: "Transaction loaded",
          description: `Loaded transaction ${transactionData.invoiceNumber} for editing`,
        });
      }
    } catch (error) {
      console.error('Failed to load transaction:', error);
      toast({
        title: "Error",
        description: "Failed to load transaction for editing",
        variant: "destructive",
      });
    }
  };

  const customerForm = useForm({
    resolver: zodResolver(insertCustomerSchema.omit({ outstandingAmount: true })),
    defaultValues: {
      name: "",
      type: "walk-in" as const,
      contactPhone: "",
      contactEmail: "",
      address: "",
      gstNumber: "",
      creditLimit: "0",
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/customers", data);
      return response.json();
    },
    onSuccess: (newCustomer) => {
      toast({
        title: "Customer added",
        description: "New customer has been added successfully",
      });
      setCustomerDialogOpen(false);
      customerForm.reset();
      setSelectedCustomerId(newCustomer.id);
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to add customer",
        variant: "destructive",
      });
    },
  });

  const onCustomerSubmit = (data: any) => {
    createCustomerMutation.mutate(data);
  };

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const { data: customers = [], isLoading: customersLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  // Find walk-in customer for fallback
  const walkInCustomer = customers.find(c => c.type === 'walk-in');

  const { data: tanks = [] } = useQuery<Tank[]>({
    queryKey: ["/api/tanks", user?.stationId],
    enabled: !!user?.stationId,
  });

  const createSaleMutation = useMutation({
    mutationFn: async (saleData: { transaction: any; items: any[] }) => {
      const response = await apiRequest("POST", "/api/sales", saleData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sale completed",
        description: "Transaction recorded successfully",
      });
      clearCurrentTransaction();
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

  const updateSaleMutation = useMutation({
    mutationFn: async (saleData: { transactionId: string; transaction: any; items: any[] }) => {
      const response = await apiRequest("PUT", `/api/sales/${saleData.transactionId}`, {
        transaction: saleData.transaction,
        items: saleData.items
      });
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Sale updated",
        description: "Transaction updated successfully",
      });
      clearCurrentTransaction();
      queryClient.invalidateQueries({ queryKey: ["/api/dashboard"] });
      queryClient.invalidateQueries({ queryKey: ["/api/sales"] });
      setLocation('/sales-history');
    },
    onError: () => {
      toast({
        title: "Update failed",
        description: "Failed to update transaction",
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
      quantity: quickQuantity,
      unitPrice: parseFloat(product.currentPrice),
      totalPrice: quickQuantity * parseFloat(product.currentPrice),
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

  const clearCurrentTransaction = () => {
    setTransactionItems([]);
    setSelectedCustomerId("");
    setPaymentMethod("cash");
    setIsEditMode(false);
    setEditingTransactionId(null);
    
    // Remove draft if we were working with one
    if (currentDraftId) {
      removeDraftFromStorage(currentDraftId);
      setCurrentDraftId(null);
    }
  };

  const removeDraftFromStorage = (draftId: string) => {
    try {
      const allDrafts = localStorage.getItem('allPosDrafts');
      if (allDrafts) {
        const drafts = JSON.parse(allDrafts);
        const updatedDrafts = drafts.filter((d: any) => d.id !== draftId);
        localStorage.setItem('allPosDrafts', JSON.stringify(updatedDrafts));
      }
      
      // Also remove single draft if it matches
      const singleDraft = localStorage.getItem('posDraft');
      if (singleDraft) {
        const draft = JSON.parse(singleDraft);
        if (draft.id === draftId) {
          localStorage.removeItem('posDraft');
        }
      }
    } catch (error) {
      console.error('Failed to remove draft from storage:', error);
    }
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
      invoiceNumber: isEditMode ? undefined : `INV-${Date.now()}`, // Don't change invoice number when editing
      stationId: user?.stationId,
      customerId: selectedCustomerId || walkInCustomer?.id,
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

    if (isEditMode && editingTransactionId) {
      // Update existing transaction
      updateSaleMutation.mutate({ 
        transactionId: editingTransactionId, 
        transaction, 
        items 
      });
    } else {
      // Create new transaction
      createSaleMutation.mutate({ transaction, items });
    }
  };

  const saveAsDraft = () => {
    if (transactionItems.length === 0) {
      toast({
        title: "No items",
        description: "Please add items before saving as draft",
        variant: "destructive",
      });
      return;
    }
    
    const totalAmount = transactionItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const timestamp = Date.now();
    
    // Create draft data
    const draftData = {
      id: `draft-${timestamp}`,
      selectedCustomerId,
      transactionItems,
      paymentMethod,
      timestamp,
      totalAmount
    };
    
    // Save to allPosDrafts (new format)
    try {
      const existingDrafts = localStorage.getItem('allPosDrafts');
      const drafts = existingDrafts ? JSON.parse(existingDrafts) : [];
      
      // Replace existing draft with same timestamp or add new one
      const existingIndex = drafts.findIndex((d: any) => d.id === draftData.id);
      if (existingIndex >= 0) {
        drafts[existingIndex] = draftData;
      } else {
        drafts.push(draftData);
      }
      
      localStorage.setItem('allPosDrafts', JSON.stringify(drafts));
      
      // Also save as single draft for backward compatibility
      localStorage.setItem('posDraft', JSON.stringify(draftData));
      
      toast({
        title: "Draft saved",
        description: "Transaction saved as draft",
      });
    } catch (error) {
      console.error('Failed to save draft:', error);
      toast({
        title: "Error",
        description: "Failed to save draft",
        variant: "destructive",
      });
    }
  };

  const cancelTransaction = () => {
    setTransactionItems([]);
    setSelectedCustomerId("");
    setPaymentMethod("cash");
    localStorage.removeItem('posDraft');
    
    toast({
      title: "Transaction cancelled",
      description: "Transaction has been cleared",
    });
  };

  const showLastTransaction = () => {
    setLocation('/sales-history');
  };

  const printLastReceipt = () => {
    if (transactionItems.length === 0) {
      toast({
        title: "No Invoice to Print",
        description: "Please add items to the transaction first",
        variant: "destructive",
      });
      return;
    }

    try {
      const invoiceHTML = generateInvoiceHTML();
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      
      if (printWindow) {
        printWindow.document.open();
        printWindow.document.write(invoiceHTML);
        printWindow.document.close();
        
        // Wait for content to load before printing
        printWindow.onload = () => {
          printWindow.focus();
          printWindow.print();
        };
        
        // Fallback: print after a short delay if onload doesn't fire
        setTimeout(() => {
          if (printWindow && !printWindow.closed) {
            printWindow.focus();
            printWindow.print();
          }
        }, 500);
      } else {
        toast({
          title: "Print Blocked",
          description: "Please allow popups to print invoices",
          variant: "destructive",
        });
        return;
      }
      
      toast({
        title: "Invoice Prepared",
        description: "Invoice window opened for printing",
      });
    } catch (error) {
      console.error('Print error:', error);
      toast({
        title: "Print Error",
        description: "Failed to prepare invoice for printing",
        variant: "destructive",
      });
    }
  };

  const generateInvoiceHTML = () => {
    const invoiceData = {
      invoiceNumber: `INV-${Date.now()}`,
      date: new Date().toLocaleDateString(),
      customerName: selectedCustomerId ? customers.find(c => c.id === selectedCustomerId)?.name || "Walk-in Customer" : "Walk-in Customer",
      stationName: user?.station?.name || "Station 1",
      stationAddress: "123 Main Street, Demo City",
      stationPhone: "+1-234-567-8900",
      stationEmail: "station@fuelflow.com",
      stationGST: "GST123456789",
      cashierName: user?.name || "Admin User",
      paymentMethod: "CASH",
      paymentStatus: "PAID",
      items: transactionItems,
      subtotal: calculateSubtotal(),
      tax: calculateTax(),
      total: calculateTotal(),
      currency: "PKR"
    };

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice - ${invoiceData.invoiceNumber}</title>
          <style>
            @media print {
              @page { 
                margin: 0.5in; 
                size: A4;
              }
              body { 
                -webkit-print-color-adjust: exact; 
                color-adjust: exact; 
              }
            }
            * {
              margin: 0;
              padding: 0;
              box-sizing: border-box;
            }
            body { 
              font-family: Arial, sans-serif; 
              background: white; 
              color: black; 
              padding: 20px;
              line-height: 1.4;
            }
            .invoice-header {
              text-align: center;
              margin-bottom: 30px;
              border-bottom: 3px solid #333;
              padding-bottom: 20px;
            }
            .invoice-title {
              font-size: 24px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
            .station-info {
              font-size: 14px;
              line-height: 1.6;
            }
            .invoice-details {
              display: flex;
              justify-content: space-between;
              margin-bottom: 30px;
              align-items: flex-start;
            }
            .invoice-meta {
              text-align: right;
            }
            .invoice-meta h3 {
              font-size: 18px;
              margin-bottom: 10px;
              color: #333;
            }
            .payment-status {
              background: #16a34a;
              color: white;
              padding: 5px 15px;
              border-radius: 5px;
              font-weight: bold;
              display: inline-block;
              margin: 10px 0;
            }
            .bill-to {
              font-size: 14px;
            }
            .bill-to h4 {
              margin-bottom: 5px;
              color: #333;
            }
            .items-table {
              width: 100%;
              border-collapse: collapse;
              margin: 20px 0;
              font-size: 14px;
            }
            .items-table th {
              background: #f8f9fa;
              border: 1px solid #ddd;
              padding: 12px 8px;
              text-align: left;
              font-weight: bold;
            }
            .items-table td {
              border: 1px solid #ddd;
              padding: 10px 8px;
            }
            .items-table .text-right {
              text-align: right;
            }
            .items-table .text-center {
              text-align: center;
            }
            .totals-section {
              margin-top: 30px;
              display: flex;
              justify-content: flex-end;
            }
            .totals-table {
              width: 300px;
              font-size: 14px;
            }
            .totals-table td {
              padding: 8px 12px;
              border-bottom: 1px solid #eee;
            }
            .totals-table .total-row {
              background: #f8f9fa;
              font-weight: bold;
              font-size: 16px;
              border-top: 2px solid #333;
            }
            .footer {
              margin-top: 40px;
              text-align: center;
              font-size: 14px;
              border-top: 1px solid #ddd;
              padding-top: 20px;
            }
            .thank-you {
              font-size: 18px;
              font-weight: bold;
              color: #2563eb;
              margin-bottom: 10px;
            }
          </style>
        </head>
        <body>
          <div class="invoice-header">
            <div class="invoice-title">FuelFlow INVOICE</div>
            <div class="station-info">
              <strong>${invoiceData.stationName}</strong><br>
              ${invoiceData.stationAddress}<br>
              Phone: ${invoiceData.stationPhone}<br>
              Email: ${invoiceData.stationEmail}<br>
              GST: ${invoiceData.stationGST}
            </div>
          </div>

          <div class="invoice-details">
            <div class="bill-to">
              <div class="payment-status">${invoiceData.paymentStatus} ${invoiceData.paymentMethod}</div>
              <h4>Bill To:</h4>
              <strong>${invoiceData.customerName}</strong>
              <br><br>
              <strong>Transaction Details:</strong><br>
              Cashier: ${invoiceData.cashierName}<br>
              Currency: ${invoiceData.currency}
            </div>
            <div class="invoice-meta">
              <h3>Invoice #: ${invoiceData.invoiceNumber}</h3>
              <div>Date: ${invoiceData.date}</div>
            </div>
          </div>

          <h4 style="margin-bottom: 10px;">Items</h4>
          <table class="items-table">
            <thead>
              <tr>
                <th>Product</th>
                <th class="text-center">Quantity</th>
                <th class="text-right">Unit Price</th>
                <th class="text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              ${invoiceData.items.map(item => `
                <tr>
                  <td>
                    <strong>${item.productName}</strong><br>
                    <small style="color: #666;">HSN: 27101990</small>
                  </td>
                  <td class="text-center">${item.quantity.toFixed(3)} litre</td>
                  <td class="text-right">Rs ${item.unitPrice.toFixed(2)}</td>
                  <td class="text-right">Rs ${item.totalPrice.toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>

          <div class="totals-section">
            <table class="totals-table">
              <tr>
                <td>Subtotal:</td>
                <td class="text-right">Rs ${invoiceData.subtotal.toFixed(2)}</td>
              </tr>
              <tr>
                <td>Tax:</td>
                <td class="text-right">Rs ${invoiceData.tax.toFixed(2)}</td>
              </tr>
              <tr class="total-row">
                <td>Total Amount:</td>
                <td class="text-right">Rs ${invoiceData.total.toFixed(2)}</td>
              </tr>
              <tr>
                <td><strong>Amount Paid:</strong></td>
                <td class="text-right"><strong>Rs ${invoiceData.total.toFixed(2)}</strong></td>
              </tr>
            </table>
          </div>

          <div class="footer">
            <div class="thank-you">Thank you for your business!</div>
            <div>License: LIC123456</div>
          </div>
        </body>
      </html>
    `;
  };

  const showDaySummary = () => {
    setLocation('/daily-reports');
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
            {/* Customer Selection & Quick Quantity */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">Customer</label>
                <div className="flex space-x-2">
                <Combobox
                  options={[
                    ...(walkInCustomer ? [{ 
                      value: walkInCustomer.id, 
                      label: "Walk-in Customer", 
                      searchTerms: ["walk", "cash", "retail", "walk-in"] 
                    }] : []),
                    ...customers.filter(c => c.type !== 'walk-in').map((customer): ComboboxOption => ({
                      value: customer.id,
                      label: `${customer.name} (${customer.type})`,
                      searchTerms: [
                        customer.name,
                        customer.type,
                        customer.contactPhone || '',
                        customer.gstNumber || '',
                        customer.contactEmail || ''
                      ].filter(Boolean)
                    }))
                  ]}
                  value={selectedCustomerId}
                  onValueChange={setSelectedCustomerId}
                  placeholder="Search or select customer..."
                  searchPlaceholder="Search customers by name, phone, GST..."
                  emptyMessage="No customers found. Try different search terms."
                  className="flex-1"
                  disabled={customersLoading}
                  data-testid="combobox-customer"
                />
                <Dialog open={customerDialogOpen} onOpenChange={setCustomerDialogOpen}>
                  <DialogTrigger asChild>
                    <Button variant="secondary" data-testid="button-add-customer">+ Add</Button>
                  </DialogTrigger>
                  <DialogContent className="sm:max-w-[400px]">
                    <DialogHeader>
                      <DialogTitle>Quick Add Customer</DialogTitle>
                    </DialogHeader>
                    <Form {...customerForm}>
                      <form onSubmit={customerForm.handleSubmit(onCustomerSubmit)} className="space-y-4">
                        <FormField
                          control={customerForm.control}
                          name="name"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Customer Name *</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter customer name" {...field} data-testid="input-quick-customer-name" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={customerForm.control}
                          name="contactPhone"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Phone Number</FormLabel>
                              <FormControl>
                                <Input placeholder="Enter phone number" {...field} data-testid="input-quick-customer-phone" />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={customerForm.control}
                          name="type"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Customer Type</FormLabel>
                              <Select onValueChange={field.onChange} defaultValue={field.value}>
                                <FormControl>
                                  <SelectTrigger data-testid="select-quick-customer-type">
                                    <SelectValue />
                                  </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                  <SelectItem value="walk-in">Walk-in</SelectItem>
                                  <SelectItem value="credit">Credit Customer</SelectItem>
                                  <SelectItem value="fleet">Fleet Customer</SelectItem>
                                </SelectContent>
                              </Select>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        <div className="flex justify-end space-x-2 pt-2">
                          <Button type="button" variant="outline" onClick={() => setCustomerDialogOpen(false)} data-testid="button-cancel-customer">
                            Cancel
                          </Button>
                          <Button type="submit" disabled={createCustomerMutation.isPending} data-testid="button-submit-quick-customer">
                            {createCustomerMutation.isPending ? "Adding..." : "Add Customer"}
                          </Button>
                        </div>
                      </form>
                    </Form>
                  </DialogContent>
                </Dialog>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-card-foreground mb-2">Default Quantity (L)</label>
                <Input
                  type="number"
                  value={quickQuantity}
                  onChange={(e) => setQuickQuantity(parseFloat(e.target.value) || 25)}
                  placeholder="Enter default quantity"
                  className="w-full"
                  min="1"
                  step="0.1"
                  data-testid="input-quick-quantity"
                />
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
                        <div className="text-lg font-bold">{formatCurrency(parseFloat(product.currentPrice))}</div>
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
                          <td className="p-3 text-right">{formatCurrency(item.unitPrice)}</td>
                          <td className="p-3 text-right font-semibold" data-testid={`amount-${index}`}>
                            {formatCurrency(item.totalPrice)}
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
                <span className="font-semibold" data-testid="subtotal">{formatCurrency(subtotal)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Tax (5%):</span>
                <span className="font-semibold" data-testid="tax-amount">{formatCurrency(taxAmount)}</span>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between">
                  <span className="text-lg font-semibold text-card-foreground">Total:</span>
                  <span className="text-lg font-bold text-primary" data-testid="total-amount">
                    {formatCurrency(totalAmount)}
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
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={saveAsDraft}
                data-testid="button-save-draft"
              >
                Save as Draft
              </Button>
              <Button 
                variant="outline" 
                className="w-full text-destructive hover:bg-destructive/10" 
                onClick={cancelTransaction}
                data-testid="button-cancel"
              >
                Cancel Transaction
              </Button>
            </div>

            {/* Quick Actions */}
            <div className="pt-6 border-t border-border">
              <h4 className="font-medium text-card-foreground mb-3">Quick Actions</h4>
              <div className="space-y-2">
                <button 
                  className="w-full text-left p-2 hover:bg-muted rounded-md text-sm transition-colors" 
                  onClick={showLastTransaction}
                  data-testid="button-last-transaction"
                >
                  📱 Last Transaction
                </button>
                <button 
                  className="w-full text-left p-2 hover:bg-muted rounded-md text-sm transition-colors" 
                  onClick={printLastReceipt}
                  data-testid="button-print-receipt"
                >
                  🧾 Print Receipt
                </button>
                <button 
                  className="w-full text-left p-2 hover:bg-muted rounded-md text-sm transition-colors" 
                  onClick={showDaySummary}
                  data-testid="button-day-summary"
                >
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
