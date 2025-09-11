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
import { apiRequest } from "@/lib/api";
import { Combobox } from "@/components/ui/combobox";

export default function AccountsPayable() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [open, setOpen] = useState(false);

  const form = useForm({
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

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

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
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount (₹) *</FormLabel>
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
          <Button variant="outline" data-testid="button-payment-schedule">
            📅 Payment Schedule
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
              ₹{totalPayable.toLocaleString()}
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
                          ₹{outstanding.toLocaleString()}
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
                          <button 
                            className="text-blue-600 hover:text-blue-800"
                            data-testid={`button-view-ap-${index}`}
                          >
                            👁️
                          </button>
                          <button 
                            className="text-green-600 hover:text-green-800"
                            data-testid={`button-pay-ap-${index}`}
                          >
                            💰
                          </button>
                          <button 
                            className="text-purple-600 hover:text-purple-800"
                            data-testid={`button-history-ap-${index}`}
                          >
                            📄
                          </button>
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
