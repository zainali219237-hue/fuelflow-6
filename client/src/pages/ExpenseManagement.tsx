import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
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
import { apiRequest } from "@/lib/api";

export default function ExpenseManagement() {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [open, setOpen] = useState(false);

  const form = useForm({
    resolver: zodResolver(insertExpenseSchema),
    defaultValues: {
      stationId: user?.stationId || "",
      userId: user?.id || "",
      category: "utilities",
      description: "",
      amount: "0",
      receiptNumber: "",
      paymentMethod: "cash" as const,
      vendorName: "",
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
      queryClient.invalidateQueries({ queryKey: ["/api/expenses"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to record expense",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    // Ensure current user IDs are used in case user loaded after form initialization
    const expenseData = {
      ...data,
      stationId: user?.stationId || data.stationId,
      userId: user?.id || data.userId,
    };
    createExpenseMutation.mutate(expenseData);
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
                          <FormLabel>Amount (₹) *</FormLabel>
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
          <Button variant="outline" data-testid="button-export-expenses">
            📊 Export Report
          </Button>
        </div>
      </div>

      {/* Expense Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600" data-testid="total-expenses">
              ₹{totalExpenses.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Expenses</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600" data-testid="monthly-expenses">
              ₹{monthlyExpenses.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">This Month</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600" data-testid="salary-expenses">
              ₹{expensesByCategory.salary.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Staff Salaries</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-purple-600" data-testid="utility-expenses">
              ₹{expensesByCategory.utilities.toLocaleString()}
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
                    <div className="font-semibold" data-testid={`category-amount-${index}`}>₹{category.amount.toLocaleString()}</div>
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
                    <div className="font-semibold text-red-600">₹{parseFloat(expense.amount || '0').toLocaleString()}</div>
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
                      ₹{parseFloat(expense.amount || '0').toLocaleString()}
                    </td>
                    <td className="p-3 text-center">
                      <Badge variant="outline">
                        {expense.paymentMethod}
                      </Badge>
                    </td>
                    <td className="p-3 text-center text-sm">{expense.receiptNumber || 'N/A'}</td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-800"
                          data-testid={`button-view-expense-${index}`}
                        >
                          👁️
                        </button>
                        <button 
                          className="text-green-600 hover:text-green-800"
                          data-testid={`button-edit-expense-${index}`}
                        >
                          ✏️
                        </button>
                        <button 
                          className="text-purple-600 hover:text-purple-800"
                          data-testid={`button-receipt-${index}`}
                        >
                          🧾
                        </button>
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
