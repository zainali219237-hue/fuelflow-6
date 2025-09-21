import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import type { Expense } from "@shared/schema";
import { insertExpenseSchema } from "@shared/schema";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { apiRequest } from "@/lib/api";
import { formatCompactNumber } from "@/lib/utils";
import { BarChart3, Eye, Edit, FileText } from "lucide-react";

export default function ExpenseManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { formatCurrency, currencyConfig } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [receiptDialogOpen, setReceiptDialogOpen] = useState(false);
  const [selectedExpense, setSelectedExpense] = useState<Expense | null>(null);

  const form = useForm({
    resolver: zodResolver(insertExpenseSchema.extend({
      expenseDate: z.string().min(1, "Expense date is required"),
    })),
    defaultValues: {
      stationId: user?.stationId || "",
      userId: user?.id || "",
      category: "utilities",
      description: "",
      amount: "",
      receiptNumber: "",
      paymentMethod: "cash" as const,
      vendorName: "",
      expenseDate: new Date().toISOString().split('T')[0],
    },
  });

  const editForm = useForm({
    resolver: zodResolver(insertExpenseSchema.extend({
      expenseDate: z.string().min(1, "Expense date is required"),
    })),
    defaultValues: {
      stationId: "",
      userId: "",
      category: "utilities",
      description: "",
      amount: "",
      receiptNumber: "",
      paymentMethod: "cash" as const,
      vendorName: "",
      expenseDate: "",
    },
  });

  const createExpenseMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/expenses", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense recorded",
        description: "New expense has been recorded successfully",
      });
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", user?.stationId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record expense",
        variant: "destructive",
      });
    },
  });

  const updateExpenseMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await apiRequest("PUT", `/api/expenses/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Expense updated",
        description: "Expense has been updated successfully",
      });
      setEditDialogOpen(false);
      editForm.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/expenses", user?.stationId] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to update expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    console.log("Expense form submission:", { data, user });

    // Ensure current user IDs are used in case user loaded after form initialization
    const expenseData = {
      ...data,
      stationId: user?.stationId || data.stationId,
      userId: user?.id || data.userId,
    };

    console.log("Processed expense data:", expenseData);
    createExpenseMutation.mutate(expenseData);
  };

  const onEditSubmit = (data: any) => {
    if (!selectedExpense) return;
    const expenseData = {
      ...data,
      stationId: user?.stationId || data.stationId,
      userId: user?.id || data.userId,
    };
    updateExpenseMutation.mutate({ id: selectedExpense.id, data: expenseData });
  };

  const handleEditExpense = (expense: any) => {
    setSelectedExpense(expense);
    editForm.reset({
      stationId: expense.stationId,
      userId: expense.userId,
      category: expense.category,
      description: expense.description,
      amount: expense.amount,
      receiptNumber: expense.receiptNumber || "",
      paymentMethod: expense.paymentMethod,
      vendorName: expense.vendorName || "",
      expenseDate: expense.expenseDate ? new Date(expense.expenseDate).toISOString().split('T')[0] : "",
    });
    setEditDialogOpen(true);
  };

  const { data: expenses = [], isLoading } = useQuery<Expense[]>({
    queryKey: ["/api/expenses", user?.stationId],
    enabled: !!user?.stationId,
  });

  const filteredExpenses = expenses.filter((expense: Expense) => {
    const matchesSearch = expense.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         expense.vendorName?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = categoryFilter === "all" || expense.category === categoryFilter;
    return matchesSearch && matchesCategory;
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

  const totalExpenses = filteredExpenses.reduce((sum: number, e: Expense) => sum + parseFloat(e.amount || '0'), 0);
  const monthlyExpenses = filteredExpenses.filter((e: Expense) => {
    const expenseDate = e.expenseDate ? new Date(e.expenseDate) : new Date();
    const currentDate = new Date();
    return expenseDate.getMonth() === currentDate.getMonth();
  }).reduce((sum: number, e: Expense) => sum + parseFloat(e.amount || '0'), 0);

  const expensesByCategory = {
    salary: filteredExpenses.filter((e: Expense) => e.category === 'salary').reduce((sum: number, e: Expense) => sum + parseFloat(e.amount || '0'), 0),
    utilities: filteredExpenses.filter((e: Expense) => e.category === 'utilities').reduce((sum: number, e: Expense) => sum + parseFloat(e.amount || '0'), 0),
    maintenance: filteredExpenses.filter((e: Expense) => e.category === 'maintenance').reduce((sum: number, e: Expense) => sum + parseFloat(e.amount || '0'), 0),
    insurance: filteredExpenses.filter((e: Expense) => e.category === 'insurance').reduce((sum: number, e: Expense) => sum + parseFloat(e.amount || '0'), 0)
  };

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Expense Management</h3>
          <p className="text-muted-foreground">Track operational costs and overhead expenses</p>
        </div>
        <div className="flex items-center space-x-2">
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button data-testid="button-add-expense">
                + Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Record New Expense</DialogTitle>
              </DialogHeader>
              <Form {...form}>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="category"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Category *</FormLabel>
                          <Select onValueChange={field.onChange} defaultValue={field.value}>
                            <FormControl>
                              <SelectTrigger data-testid="select-expense-category">
                                <SelectValue placeholder="Select category" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent>
                              <SelectItem value="salary">Staff Salaries</SelectItem>
                              <SelectItem value="utilities">Utilities</SelectItem>
                              <SelectItem value="maintenance">Maintenance</SelectItem>
                              <SelectItem value="insurance">Insurance</SelectItem>
                              <SelectItem value="fuel">Fuel Purchase</SelectItem>
                              <SelectItem value="office">Office Supplies</SelectItem>
                              <SelectItem value="marketing">Marketing</SelectItem>
                              <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ({currencyConfig.symbol}) *</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.01" placeholder="0.00" {...field} data-testid="input-expense-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description *</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter expense description" {...field} data-testid="input-expense-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="vendorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor/Supplier</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter vendor name" {...field} data-testid="input-expense-vendor" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="receiptNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Receipt/Invoice No.</FormLabel>
                          <FormControl>
                            <Input placeholder="Enter receipt number" {...field} data-testid="input-expense-receipt" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                  <FormField
                    control={form.control}
                    name="expenseDate"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Expense Date</FormLabel>
                        <FormControl>
                          <Input type="date" {...field} data-testid="input-expense-date" />
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
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="credit">Credit/UPI</SelectItem>
                            <SelectItem value="fleet">Fleet Card</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={createExpenseMutation.isPending} data-testid="button-submit-expense">
                      {createExpenseMutation.isPending ? "Recording..." : "Record Expense"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>
          {/* View Expense Dialog */}
          <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
            <DialogContent className="sm:max-w-[500px]">
              <DialogHeader>
                <DialogTitle>Expense Details</DialogTitle>
              </DialogHeader>
              {selectedExpense && (
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium">Description</label>
                      <p className="text-sm text-muted-foreground">{selectedExpense.description}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Amount</label>
                      <p className="text-sm text-muted-foreground">{formatCurrency(parseFloat(selectedExpense.amount || '0'))}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Category</label>
                      <p className="text-sm text-muted-foreground">{selectedExpense.category}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Vendor</label>
                      <p className="text-sm text-muted-foreground">{selectedExpense.vendorName || 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Date</label>
                      <p className="text-sm text-muted-foreground">{selectedExpense.expenseDate ? new Date(selectedExpense.expenseDate).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium">Receipt Number</label>
                      <p className="text-sm text-muted-foreground">{selectedExpense.receiptNumber || 'N/A'}</p>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Edit Expense Dialog */}
          <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
            <DialogContent className="sm:max-w-[500px] max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Edit Expense</DialogTitle>
              </DialogHeader>
              <Form {...editForm}>
                <form onSubmit={editForm.handleSubmit(onEditSubmit)} className="space-y-4">
                  <FormField
                    control={editForm.control}
                    name="category"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Category</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-category">
                              <SelectValue placeholder="Select category" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="utilities">Utilities</SelectItem>
                            <SelectItem value="maintenance">Maintenance</SelectItem>
                            <SelectItem value="salary">Salary</SelectItem>
                            <SelectItem value="insurance">Insurance</SelectItem>
                            <SelectItem value="supplies">Supplies</SelectItem>
                            <SelectItem value="transport">Transport</SelectItem>
                            <SelectItem value="marketing">Marketing</SelectItem>
                            <SelectItem value="other">Other</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={editForm.control}
                    name="description"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Description</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter expense description" {...field} data-testid="input-edit-description" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="amount"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Amount ({currencyConfig.code})</FormLabel>
                          <FormControl>
                            <Input type="number" placeholder="0.00" step="0.01" {...field} data-testid="input-edit-amount" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="expenseDate"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Date</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} data-testid="input-edit-date" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <FormField
                      control={editForm.control}
                      name="vendorName"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Vendor</FormLabel>
                          <FormControl>
                            <Input placeholder="Vendor name" {...field} data-testid="input-edit-vendor" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={editForm.control}
                      name="receiptNumber"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Receipt Number</FormLabel>
                          <FormControl>
                            <Input placeholder="Receipt/Invoice number" {...field} data-testid="input-edit-receipt" />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  <FormField
                    control={editForm.control}
                    name="paymentMethod"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Payment Method</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value}>
                          <FormControl>
                            <SelectTrigger data-testid="select-edit-payment-method">
                              <SelectValue placeholder="Select payment method" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
                            <SelectItem value="cash">Cash</SelectItem>
                            <SelectItem value="card">Card</SelectItem>
                            <SelectItem value="credit">Credit/UPI</SelectItem>
                          </SelectContent>
                        </Select>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="flex justify-end space-x-2 pt-4">
                    <Button type="button" variant="outline" onClick={() => setEditDialogOpen(false)} data-testid="button-cancel-edit">
                      Cancel
                    </Button>
                    <Button type="submit" disabled={updateExpenseMutation.isPending} data-testid="button-update-expense">
                      {updateExpenseMutation.isPending ? "Updating..." : "Update Expense"}
                    </Button>
                  </div>
                </form>
              </Form>
            </DialogContent>
          </Dialog>

          {/* Receipt Dialog */}
          <Dialog open={receiptDialogOpen} onOpenChange={setReceiptDialogOpen}>
            <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center justify-between">
                  Expense Receipt
                  <div className="flex space-x-2">
                    <Button
                      size="sm"
                      onClick={() => {
                        if (selectedExpense) {
                          const printWindow = window.open('', '_blank');
                          if (!printWindow) return;

                          const htmlContent = `
                            <!DOCTYPE html>
                            <html>
                              <head>
                                <title>Expense Receipt - ${selectedExpense.receiptNumber || 'N/A'}</title>
                                <style>
                                  @page { margin: 0.5in; size: A4; }
                                  body { font-family: Arial, sans-serif; line-height: 1.4; color: #000; margin: 0; padding: 20px; }
                                  .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                                  .receipt-info { background: #f9fafb; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
                                  .amount { font-size: 24px; font-weight: bold; color: #dc2626; text-align: center; margin: 20px 0; }
                                </style>
                              </head>
                              <body>
                                <div class="header">
                                  <h1>FuelFlow Station</h1>
                                  <p>Expense Receipt</p>
                                  <p>Receipt #${selectedExpense.receiptNumber || 'N/A'}</p>
                                </div>

                                <div class="receipt-info">
                                  <h3>Expense Details</h3>
                                  <p><strong>Description:</strong> ${selectedExpense.description}</p>
                                  <p><strong>Category:</strong> ${selectedExpense.category}</p>
                                  <p><strong>Vendor:</strong> ${selectedExpense.vendorName || 'N/A'}</p>
                                  <p><strong>Date:</strong> ${selectedExpense.expenseDate ? new Date(selectedExpense.expenseDate).toLocaleDateString() : 'N/A'}</p>
                                  <p><strong>Payment Method:</strong> ${selectedExpense.paymentMethod}</p>
                                </div>

                                <div class="amount">
                                  Total Amount: ${formatCurrency(parseFloat(selectedExpense.amount || '0'))}
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
                        }
                      }}
                    >
                      Print
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        if (selectedExpense) {
                          const dataStr = JSON.stringify({
                            receiptNumber: selectedExpense.receiptNumber || 'N/A',
                            description: selectedExpense.description,
                            amount: formatCurrency(parseFloat(selectedExpense.amount || '0')),
                            date: selectedExpense.expenseDate ? new Date(selectedExpense.expenseDate).toLocaleDateString() : 'N/A',
                            category: selectedExpense.category,
                            vendor: selectedExpense.vendorName || 'N/A'
                          }, null, 2);
                          const dataBlob = new Blob([dataStr], { type: 'application/json' });
                          const url = URL.createObjectURL(dataBlob);
                          const link = document.createElement('a');
                          link.href = url;
                          link.download = `expense-receipt-${selectedExpense.receiptNumber || 'N/A'}.json`;
                          link.click();
                        }
                      }}
                    >
                      Download
                    </Button>
                  </div>
                </DialogTitle>
              </DialogHeader>
              {selectedExpense && (
                <div className="space-y-4">
                  <div className="border rounded-lg p-6 bg-card">
                    <div className="text-center mb-6">
                      <h2 className="text-xl font-bold">FuelFlow Station</h2>
                      <p className="text-muted-foreground">Expense Receipt</p>
                      <p className="font-medium">Receipt #{selectedExpense.receiptNumber || 'N/A'}</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4 mb-6">
                      <div>
                        <p className="text-sm text-muted-foreground">Description</p>
                        <p className="font-medium">{selectedExpense.description}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Category</p>
                        <p className="font-medium">{selectedExpense.category}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Vendor</p>
                        <p className="font-medium">{selectedExpense.vendorName || 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Date</p>
                        <p className="font-medium">{selectedExpense.expenseDate ? new Date(selectedExpense.expenseDate).toLocaleDateString() : 'N/A'}</p>
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Payment Method</p>
                        <p className="font-medium">{selectedExpense.paymentMethod}</p>
                      </div>
                    </div>

                    <div className="text-center border-t pt-4">
                      <p className="text-2xl font-bold text-primary">
                        {formatCurrency(parseFloat(selectedExpense.amount || '0'))}
                      </p>
                      <p className="text-sm text-muted-foreground">Total Amount</p>
                    </div>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          <Button variant="outline" onClick={() => {
            const printWindow = window.open('', '_blank');
            if (!printWindow) return;

            const htmlContent = `
              <!DOCTYPE html>
              <html>
                <head>
                  <title>Expense Report</title>
                  <style>
                    @page { margin: 0.5in; size: A4; }
                    body { font-family: Arial, sans-serif; line-height: 1.4; color: #000; margin: 0; padding: 20px; }
                    .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                    .summary { display: grid; grid-template-columns: repeat(2, 1fr); gap: 20px; margin-bottom: 30px; }
                    .summary-item { padding: 15px; background: #f3f4f6; border-radius: 8px; text-align: center; }
                    .amount { font-size: 18px; font-weight: bold; color: #dc2626; }
                    .expenses-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                    .expenses-table th, .expenses-table td { padding: 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                    .expenses-table th { background: #f9fafb; font-weight: bold; }
                  </style>
                </head>
                <body>
                  <div class="header">
                    <h1>Expense Report</h1>
                    <p>Generated on ${new Date().toLocaleDateString()}</p>
                  </div>
                  <div class="summary">
                    <div class="summary-item">
                      <div>Total Expenses</div>
                      <div class="amount">${formatCurrency(totalExpenses)}</div>
                    </div>
                    <div class="summary-item">
                      <div>Monthly Expenses</div>
                      <div class="amount">${formatCurrency(monthlyExpenses)}</div>
                    </div>
                  </div>
                  <table class="expenses-table">
                    <thead>
                      <tr>
                        <th>Date</th>
                        <th>Description</th>
                        <th>Category</th>
                        <th>Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      ${filteredExpenses.map(expense => `
                        <tr>
                          <td>${expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString() : 'N/A'}</td>
                          <td>${expense.description}</td>
                          <td>${expense.category}</td>
                          <td>${formatCurrency(parseFloat(expense.amount || '0'))}</td>
                        </tr>
                      `).join('')}
                    </tbody>
                  </table>
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
          }} data-testid="button-export-expenses">
            <BarChart3 className="w-4 h-4 mr-2" />Export Report
          </Button>
        </div>
      </div>

      {/* Expense Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600" data-testid="total-expenses">
              {formatCompactNumber(totalExpenses, { currency: 'PKR' })}
            </div>
            <div className="text-sm text-muted-foreground">Total Expenses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600" data-testid="monthly-expenses">
              {formatCompactNumber(monthlyExpenses, { currency: 'PKR' })}
            </div>
            <div className="text-sm text-muted-foreground">This Month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600" data-testid="salary-expenses">
              {formatCompactNumber(expensesByCategory.salary, { currency: 'PKR' })}
            </div>
            <div className="text-sm text-muted-foreground">Staff Salaries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600" data-testid="utility-expenses">
              {formatCompactNumber(expensesByCategory.utilities, { currency: 'PKR' })}
            </div>
            <div className="text-sm text-muted-foreground">Utilities</div>
          </CardContent>
        </Card>
      </div>

      {/* Expense Categories Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Expense Categories</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[
                { category: 'Salary', amount: expensesByCategory.salary, color: 'bg-blue-500' },
                { category: 'Utilities', amount: expensesByCategory.utilities, color: 'bg-green-500' },
                { category: 'Maintenance', amount: expensesByCategory.maintenance, color: 'bg-orange-500' },
                { category: 'Insurance', amount: expensesByCategory.insurance, color: 'bg-purple-500' }
              ].map((category, index) => (
                <div key={category.category} className="flex items-center justify-between p-3 bg-muted rounded-md">
                  <div className="flex items-center">
                    <div className={`w-4 h-4 ${category.color} rounded mr-3`}></div>
                    <span className="font-medium">{category.category}</span>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold" data-testid={`category-amount-${index}`}>{formatCurrency(category.amount)}</div>
                    <div className="text-sm text-muted-foreground">
                      {totalExpenses > 0 ? ((category.amount / totalExpenses) * 100).toFixed(1) : 0}%
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Recent Expenses */}
        <Card>
          <CardHeader>
            <CardTitle>Recent Expenses</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredExpenses.slice(0, 3).length > 0 ? filteredExpenses.slice(0, 3).map((expense: Expense, index: number) => (
                <div key={expense.id} className="flex items-center justify-between p-3 border border-border rounded-md">
                  <div>
                    <div className="font-medium text-card-foreground">{expense.description}</div>
                    <div className="text-sm text-muted-foreground">
                      {expense.vendorName || 'N/A'} • {expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString('en-GB') : 'N/A'}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold text-red-600">{formatCurrency(parseFloat(expense.amount || '0'))}</div>
                    <Badge variant="secondary" className="text-xs">
                      {expense.category}
                    </Badge>
                  </div>
                </div>
              )) : (
                <div className="text-center text-muted-foreground py-4">
                  No recent expenses
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expenses Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Expense History</CardTitle>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search expenses..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
                data-testid="input-search-expenses"
              />
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-32" data-testid="select-category-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Categories</SelectItem>
                  <SelectItem value="salary">Salary</SelectItem>
                  <SelectItem value="utilities">Utilities</SelectItem>
                  <SelectItem value="maintenance">Maintenance</SelectItem>
                  <SelectItem value="insurance">Insurance</SelectItem>
                  <SelectItem value="fuel">Fuel</SelectItem>
                  <SelectItem value="office">Office Supplies</SelectItem>
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
                  <th className="text-left p-3 font-medium">Date</th>
                  <th className="text-left p-3 font-medium">Description</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Vendor</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-center p-3 font-medium">Payment Method</th>
                  <th className="text-center p-3 font-medium">Receipt</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredExpenses.length > 0 ? filteredExpenses.map((expense: Expense, index: number) => (
                  <tr key={expense.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3 text-sm">{expense.expenseDate ? new Date(expense.expenseDate).toLocaleDateString('en-GB') : 'N/A'}</td>
                    <td className="p-3">
                      <div className="font-medium text-card-foreground">{expense.description}</div>
                    </td>
                    <td className="p-3">
                      <Badge variant="secondary" data-testid={`category-badge-${index}`}>
                        {expense.category}
                      </Badge>
                    </td>
                    <td className="p-3 text-sm">{expense.vendorName || 'N/A'}</td>
                    <td className="p-3 text-right font-semibold text-red-600" data-testid={`expense-amount-${index}`}>
                      {formatCurrency(parseFloat(expense.amount || '0'))}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline">
                        {expense.paymentMethod}
                      </Badge>
                    </td>
                    <td className="p-3 text-center text-sm">{expense.receiptNumber || 'N/A'}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedExpense(expense);
                            setViewDialogOpen(true);
                          }}
                          className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50"
                          data-testid={`button-view-expense-${index}`}
                          title="View expense details"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleEditExpense(expense)}
                          className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50"
                          data-testid={`button-edit-expense-${index}`}
                          title="Edit expense"
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => {
                            setSelectedExpense(expense);
                            setReceiptDialogOpen(true);
                          }}
                          className="p-2 text-purple-600 hover:text-purple-800 hover:bg-purple-50"
                          data-testid={`button-receipt-${index}`}
                          title="View receipt"
                        >
                          <FileText className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan={8} className="p-8 text-center text-muted-foreground">
                      No expenses found for the selected criteria
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