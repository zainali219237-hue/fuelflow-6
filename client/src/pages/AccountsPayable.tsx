import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Supplier, Payment } from "@shared/schema";
import { insertPaymentSchema } from "@shared/schema";
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
import { Calendar, Eye, CreditCard, FileText, History } from "lucide-react";
import { useLocation } from "wouter";

export default function AccountsPayable() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency, currencyConfig } = useCurrency();
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [quickPaymentOpen, setQuickPaymentOpen] = useState(false);
  const [selectedSupplierForPayment, setSelectedSupplierForPayment] = useState<Supplier | null>(null);

  const form = useForm({
    resolver: zodResolver(insertPaymentSchema.extend({
      paymentDate: insertPaymentSchema.shape.paymentDate.optional(),
    })),
    defaultValues: {
      supplierId: "",
      amount: "", // Empty instead of "0"
      paymentMethod: "cash",
      referenceNumber: "",
      notes: "",
      type: "payable",
      stationId: user?.stationId || "",
      userId: user?.id || "",
    },
  });

  const quickPaymentForm = useForm({
    resolver: zodResolver(insertPaymentSchema.extend({
      paymentDate: insertPaymentSchema.shape.paymentDate.optional(),
    })),
    defaultValues: {
      supplierId: "",
      amount: "0",
      paymentMethod: "cash",
      referenceNumber: "",
      notes: "",
      type: "payable",
      stationId: user?.stationId || "",
      userId: user?.id || "",
    },
  });

  const createPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      const paymentData = {
        ...data,
        stationId: user?.stationId || data.stationId,
        userId: user?.id || data.userId,
        currencyCode: currencyConfig.code, // Add required field
      };
      const response = await apiRequest("POST", "/api/payments", paymentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "Payment to supplier has been recorded successfully",
      });
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createPaymentMutation.mutate(data);
  };

  const onQuickPaymentSubmit = (data: any) => {
    const paymentData = {
      ...data,
      supplierId: selectedSupplierForPayment?.id,
      stationId: user?.stationId,
      userId: user?.id,
    };
    createQuickPaymentMutation.mutate(paymentData);
  };

  const createQuickPaymentMutation = useMutation({
    mutationFn: async (data: any) => {
      // Process form data to ensure all required fields are present
      const paymentData = {
        ...data,
        stationId: user?.stationId || data.stationId,
        userId: user?.id || data.userId,
        currencyCode: currencyConfig.code, // Add required currency field
      };
      const response = await apiRequest("POST", "/api/payments", paymentData);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Payment recorded",
        description: "Payment to supplier has been recorded successfully",
      });
      setQuickPaymentOpen(false);
      quickPaymentForm.reset();
      setSelectedSupplierForPayment(null);
      queryClient.invalidateQueries({ queryKey: ["/api/payments"] });
      queryClient.invalidateQueries({ queryKey: ["/api/suppliers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record payment",
        variant: "destructive",
      });
    },
  });

  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [selectedSupplierForView, setSelectedSupplierForView] = useState<Supplier | null>(null);

  const handleViewSupplier = (supplier: Supplier) => {
    setSelectedSupplierForView(supplier);
    setViewDialogOpen(true);
  };

  const handleQuickPayment = (supplier: Supplier) => {
    setSelectedSupplierForPayment(supplier);
    quickPaymentForm.setValue('supplierId', supplier.id);
    quickPaymentForm.setValue('amount', supplier.outstandingAmount || '0');
    setQuickPaymentOpen(true);
  };

  const handleViewHistory = (supplier: Supplier) => {
    // Navigate to payment history page
    navigate(`/payment-history/${supplier.id}/supplier`);
    const printWindow = window.open(`/payment-history/${supplier.id}/supplier`, '_blank');
    if (!printWindow) return;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Supplier Statement - ${supplier.name}</title>
          <style>
            @page { margin: 0.5in; size: A4; }
            body { font-family: Arial, sans-serif; line-height: 1.4; color: #000; margin: 0; padding: 20px; }
            .container { max-width: 800px; margin: 0 auto; }
            .header { display: flex; justify-content: space-between; align-items: start; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .station-info h1 { color: #2563eb; font-size: 28px; margin: 0; }
            .statement-title { font-size: 24px; font-weight: bold; text-align: right; }
            .supplier-info { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
            .summary-item { text-align: center; padding: 15px; background: #f3f4f6; border-radius: 8px; }
            .summary-amount { font-size: 24px; font-weight: bold; color: #dc2626; }
            .summary-label { font-size: 14px; color: #6b7280; }
            .footer { text-align: center; margin-top: 40px; padding-top: 20px; border-top: 1px solid #e5e7eb; color: #6b7280; font-size: 12px; }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="header">
              <div class="station-info">
                <h1>FuelFlow Station</h1>
                <p>Supplier Payment Statement</p>
                <p>Generated on ${new Date().toLocaleDateString()}</p>
              </div>
              <div>
                <div class="statement-title">PAYMENT STATEMENT</div>
                <p><strong>Period:</strong> ${new Date().toLocaleDateString()}</p>
              </div>
            </div>

            <div class="supplier-info">
              <h3>Supplier Information</h3>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
                <div>
                  <p><strong>Company:</strong> ${supplier.name}</p>
                  <p><strong>Contact Person:</strong> ${supplier.contactPerson || 'N/A'}</p>
                  <p><strong>GST Number:</strong> ${supplier.gstNumber || 'N/A'}</p>
                </div>
                <div>
                  <p><strong>Phone:</strong> ${supplier.contactPhone || 'N/A'}</p>
                  <p><strong>Email:</strong> ${supplier.contactEmail || 'N/A'}</p>
                  <p><strong>Payment Terms:</strong> ${supplier.paymentTerms || 'Net 30'}</p>
                </div>
              </div>
            </div>

            <div class="summary">
              <div class="summary-item">
                <div class="summary-amount" style="color: #dc2626;">${formatCurrency(parseFloat(supplier.outstandingAmount || '0'))}</div>
                <div class="summary-label">Outstanding Amount</div>
              </div>
              <div class="summary-item">
                <div class="summary-amount" style="color: ${parseFloat(supplier.outstandingAmount || '0') > 100000 ? '#dc2626' : '#16a34a'};">${parseFloat(supplier.outstandingAmount || '0') > 100000 ? 'OVERDUE' : 'CURRENT'}</div>
                <div class="summary-label">Payment Status</div>
              </div>
            </div>

            ${parseFloat(supplier.outstandingAmount || '0') > 0 ? `
            <div style="background: #fef2f2; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; margin-bottom: 20px;">
              <h4 style="margin: 0 0 10px 0; color: #dc2626;">Payment Due</h4>
              <p style="margin: 0;">Outstanding payment of <strong>${formatCurrency(parseFloat(supplier.outstandingAmount || '0'))}</strong> is due for payment.</p>
            </div>` : ''}

            <div class="footer">
              <p>For any queries regarding this statement, please contact our accounts department.</p>
              <p>This is a computer-generated statement from FuelFlow Management System</p>
              <p>Generated on ${new Date().toLocaleString()}</p>
            </div>
          </div>
        </body>
      </html>
    `;

    printWindow.document.write(htmlContent);
    printWindow.document.close();
    
    printWindow.onload = () => {
      setTimeout(() => {
        printWindow.print();
        printWindow.close();
      }, 500);
    };

    toast({
      title: "Payment History Generated",
      description: `Payment statement for ${supplier.name} has been generated`,
    });
  };

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const { data: customers = [] } = useQuery<any[]>({
    queryKey: ["/api/customers"],
  });

  // For payables, we only need suppliers
  const allPayees = suppliers.map(s => ({ 
    id: s.id, 
    name: s.name, 
    type: 'supplier' as const,
    outstandingAmount: s.outstandingAmount || '0'
  }));

  const filteredSuppliers = suppliers.filter((supplier: Supplier) => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase());

    // Status filtering
    const outstanding = parseFloat(supplier.outstandingAmount || '0');
    let matchesStatus = true;
    if (statusFilter === "current") {
      matchesStatus = outstanding <= 100000;
    } else if (statusFilter === "overdue") {
      matchesStatus = outstanding > 100000;
    } else if (statusFilter === "paid") {
      matchesStatus = outstanding === 0;
    }

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

  const totalPayable = filteredSuppliers.reduce((sum: number, s: Supplier) => sum + parseFloat(s.outstandingAmount || '0'), 0);
  const overduePayments = filteredSuppliers.filter((s: Supplier) => parseFloat(s.outstandingAmount || '0') > 100000).length;
  const currentPayments = filteredSuppliers.filter((s: Supplier) => {
    const outstanding = parseFloat(s.outstandingAmount || '0');
    return outstanding > 0 && outstanding <= 100000;
  }).length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Accounts Payable</h3>
          <p className="text-muted-foreground">Manage supplier payments and outstanding balances</p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-make-payment">
                + Make Payment
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record Payment to Supplier</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <FormField
                    control={form.control}
                    name="supplierId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Supplier *</FormLabel>
                        <FormControl>
                          <Combobox
                            options={allPayees.map(p => ({ value: p.id, label: `${p.name} (${p.type})` }))}
                            value={field.value}
                            onValueChange={field.onChange}
                            placeholder="Select supplier or customer"
                            emptyMessage="No suppliers or customers found"
                            data-testid="select-supplier"
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ({currencyConfig.symbol}) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-payment-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-payment-method">
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="credit">Credit</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="referenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Transaction/Check number" {...field} data-testid="input-reference-number" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Payment details" {...field} data-testid="input-payment-notes" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createPaymentMutation.isPending} data-testid="button-submit-payment">
                      {createPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Quick Payment Dialog */}
          <Dialog open={quickPaymentOpen} onOpenChange={setQuickPaymentOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Quick Payment - {selectedSupplierForPayment?.name}</DialogTitle>
              </DialogHeader>
              <Form {...quickPaymentForm}>
                <form onSubmit={quickPaymentForm.handleSubmit(onQuickPaymentSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={quickPaymentForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ({currencyConfig.symbol}) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-quick-payment-amount-ap" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={quickPaymentForm.control}
                      name="paymentMethod"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Payment Method *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-quick-payment-method-ap">
                                <SelectValue placeholder="Select method" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="cash">Cash</SelectItem>
                              <SelectItem value="card">Card</SelectItem>
                              <SelectItem value="credit">Credit</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={quickPaymentForm.control}
                    name="referenceNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Reference Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Transaction/Check number" {...field} data-testid="input-quick-reference-number-ap" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={quickPaymentForm.control}
                    name="notes"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Notes</FormLabel>
                        <FormControl>
                          <Textarea placeholder="Payment details" {...field} data-testid="input-quick-payment-notes-ap" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setQuickPaymentOpen(false)} data-testid="button-quick-cancel-ap">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createQuickPaymentMutation.isPending} data-testid="button-quick-submit-payment-ap">
                      {createQuickPaymentMutation.isPending ? "Recording..." : "Record Payment"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* View Supplier Dialog */}
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Supplier Details</DialogTitle>
              </DialogHeader>
              {selectedSupplierForView && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Name</label>
                      <p className="text-sm text-muted-foreground">{selectedSupplierForView.name}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Contact Person</label>
                      <p className="text-sm text-muted-foreground">{selectedSupplierForView.contactPerson || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Phone</label>
                      <p className="text-sm text-muted-foreground">{selectedSupplierForView.contactPhone || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Email</label>
                      <p className="text-sm text-muted-foreground">{selectedSupplierForView.contactEmail || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <label className="text-sm font-medium">Address</label>
                      <p className="text-sm text-muted-foreground">{selectedSupplierForView.address || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Payment Terms</label>
                      <p className="text-sm text-muted-foreground">{selectedSupplierForView.paymentTerms || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Outstanding</label>
                      <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(selectedSupplierForView.outstandingAmount || '0'))}</p>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Button 
            variant="outline" 
            size="sm" 
            className="p-2" 
            data-testid="button-payment-schedule" 
            title="View Payment Schedule"
          >
            <Calendar className="w-4 h-4 mr-2" />
            Payment Schedule
          </Button>
        </div>
      </div>

      {/* Payables Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary" data-testid="total-suppliers-ap">
              {filteredSuppliers.length}
            </div>
            <div className="text-sm text-muted-foreground">Active Suppliers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600" data-testid="total-payable">
              {formatCurrency(totalPayable)}
            </div>
            <div className="text-sm text-muted-foreground">Total Payable</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600" data-testid="current-payments">
              {currentPayments}
            </div>
            <div className="text-sm text-muted-foreground">Current Payments</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600" data-testid="overdue-payments">
              {overduePayments}
            </div>
            <div className="text-sm text-muted-foreground">Overdue Payments</div>
          </CardContent>
        </Card>
      </div>

      {/* Supplier Payables Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Supplier Payment Status</CardTitle>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search suppliers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
                data-testid="input-search-suppliers-ap"
              />
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-32" data-testid="select-status-filter-ap">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="current">Current</SelectItem>
                  <SelectItem value="overdue">Overdue</SelectItem>
                  <SelectItem value="paid">Paid</SelectItem>
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
                  <th className="text-left p-3 font-medium">Supplier</th>
                  <th className="text-left p-3 font-medium">Payment Terms</th>
                  <th className="text-right p-3 font-medium">Outstanding</th>
                  <th className="text-center p-3 font-medium">Last Payment</th>
                  <th className="text-center p-3 font-medium">Due Date</th>
                  <th className="text-center p-3 font-medium">Days Overdue</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSuppliers.length > 0 ? filteredSuppliers.map((supplier: Supplier, index: number) => {
                  const outstanding = parseFloat(supplier.outstandingAmount || '0');
                  const isOverdue = outstanding > 100000;

                  return (
                    <tr key={supplier.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3">
                        <div className="font-medium text-card-foreground" data-testid={`supplier-name-ap-${index}`}>
                          {supplier.name}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          Contact: {supplier.contactPerson || 'N/A'}
                        </div>
                        <div className="text-sm text-muted-foreground">
                          GST: {supplier.gstNumber || 'N/A'}
                        </div>
                      </td>
                      <td className="p-3">{supplier.paymentTerms || 'Net 30'}</td>
                      <td className="p-3 text-right">
                        <span className="font-semibold text-red-600" data-testid={`outstanding-ap-${index}`}>
                          {formatCurrency(outstanding)}
                        </span>
                      </td>
                      <td className="p-3 text-center text-sm">
                        {supplier.createdAt ? new Date(supplier.createdAt).toLocaleDateString('en-GB') : 'N/A'}
                      </td>
                      <td className="p-3 text-center text-sm">N/A</td>
                      <td className="p-3 text-center">
                        <span className={isOverdue ? 'text-red-600 font-semibold' : 'text-green-600'}>
                          {isOverdue ? '30+ days' : 'On time'}
                        </span>
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={isOverdue ? 'destructive' : 'default'}
                          className={isOverdue ? 'bg-red-100 text-red-800' : 'bg-green-100 text-green-800'}
                          data-testid={`status-ap-${index}`}
                        >
                          {isOverdue ? 'Overdue' : 'Current'}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewSupplier(supplier)}
                            className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                            data-testid="button-view-supplier-payable"
                            title="View Details"
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleQuickPayment(supplier)}
                            className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50"
                            data-testid="button-quick-payment-payable"
                            title="Record Payment"
                          >
                            <CreditCard className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleViewHistory(supplier)}
                            className="p-2 text-orange-600 hover:text-orange-800 hover:bg-orange-50"
                            data-testid="button-payment-history-payable"
                            title="Payment History"
                          >
                            <History className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No supplier payment data found for the selected criteria
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