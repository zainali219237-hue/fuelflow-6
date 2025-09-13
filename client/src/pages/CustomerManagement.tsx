import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import type { Customer } from "@shared/schema";
import { insertCustomerSchema } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { apiRequest } from "@/lib/api";
import { Eye, Edit, CreditCard } from "lucide-react";

export default function CustomerManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { currencyConfig } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");
  const [open, setOpen] = useState(false);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);

  const form = useForm({
    resolver: zodResolver(insertCustomerSchema),
    defaultValues: {
      name: "",
      type: "walk-in" as const,
      contactPhone: "",
      contactEmail: "",
      address: "",
      gstNumber: "",
      creditLimit: "0",
      outstandingAmount: "0",
    },
  });

  const createCustomerMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await apiRequest("POST", "/api/customers", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Customer created",
        description: "New customer has been added successfully",
      });
      setOpen(false);
      form.reset();
      queryClient.invalidateQueries({ queryKey: ["/api/customers"] });
    },
    onError: () => {
      toast({
        title: "Error",
        description: "Failed to create customer",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (data: any) => {
    createCustomerMutation.mutate(data);
  };

  const handleViewCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setViewDialogOpen(true);
  };

  const handleEditCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setEditDialogOpen(true);
  };

  const handlePaymentCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setPaymentDialogOpen(true);
  };

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const filteredCustomers = customers.filter((customer: Customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         customer.gstNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = filterType === "all" || customer.type === filterType;
    return matchesSearch && matchesType;
  });

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-1/3 mb-4"></div>
          <div className="h-4 bg-muted rounded w-1/2 mb-8"></div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  const creditCustomers = customers.filter((c: Customer) => c.type === 'credit').length;
  const totalOutstanding = customers.reduce((sum: number, c: Customer) => sum + parseFloat(c.outstandingAmount || '0'), 0);
  const overdueAccounts = customers.filter((c: Customer) => parseFloat(c.outstandingAmount || '0') > 0).length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Customer Account Management</h3>
          <p className="text-muted-foreground">Manage customer profiles, credit accounts, and payment history</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button data-testid="button-add-customer">
              + Add New Customer
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Customer</DialogTitle>
            </DialogHeader>
            <Form {...form}>
              <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Name *</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter customer name" {...field} data-testid="input-customer-name" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="type"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Customer Type *</FormLabel>
                      <Select onValueChange={field.onChange} defaultValue={field.value}>
                        <FormControl>
                          <SelectTrigger data-testid="select-customer-type">
                            <SelectValue placeholder="Select customer type" />
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
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="contactPhone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Phone Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter phone number" {...field} data-testid="input-customer-phone" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="contactEmail"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Email Address</FormLabel>
                        <FormControl>
                          <Input type="email" placeholder="Enter email address" {...field} data-testid="input-customer-email" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <FormField
                  control={form.control}
                  name="address"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Address</FormLabel>
                      <FormControl>
                        <Input placeholder="Enter address" {...field} data-testid="input-customer-address" />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="gstNumber"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>GST Number</FormLabel>
                        <FormControl>
                          <Input placeholder="Enter GST number" {...field} data-testid="input-customer-gst" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  <FormField
                    control={form.control}
                    name="creditLimit"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Credit Limit ({currencyConfig.symbol})</FormLabel>
                        <FormControl>
                          <Input type="number" placeholder="0" {...field} data-testid="input-customer-credit-limit" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>
                <div className="flex justify-end space-x-2 pt-4">
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} data-testid="button-cancel">
                    Cancel
                  </Button>
                  <Button type="submit" disabled={createCustomerMutation.isPending} data-testid="button-submit-customer">
                    {createCustomerMutation.isPending ? "Creating..." : "Create Customer"}
                  </Button>
                </div>
              </form>
            </Form>
          </DialogContent>
        </Dialog>
      </div>

      {/* Customer Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary" data-testid="total-customers">{customers.length}</div>
            <div className="text-sm text-muted-foreground">Total Customers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600" data-testid="credit-customers">{creditCustomers}</div>
            <div className="text-sm text-muted-foreground">Credit Customers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600" data-testid="outstanding-total">
              ₹{totalOutstanding.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Outstanding Amount</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600" data-testid="overdue-accounts">{overdueAccounts}</div>
            <div className="text-sm text-muted-foreground">Overdue Accounts</div>
          </CardContent>
        </Card>
      </div>

      {/* Customer List */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Customer Accounts</CardTitle>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-64"
                data-testid="input-search-customers"
              />
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger className="w-40" data-testid="select-filter-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Customers</SelectItem>
                  <SelectItem value="credit">Credit Customers</SelectItem>
                  <SelectItem value="walk-in">Cash Customers</SelectItem>
                  <SelectItem value="fleet">Fleet Customers</SelectItem>
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
                  <th className="text-left p-3 font-medium">Customer</th>
                  <th className="text-left p-3 font-medium">Type</th>
                  <th className="text-right p-3 font-medium">Credit Limit</th>
                  <th className="text-right p-3 font-medium">Outstanding</th>
                  <th className="text-center p-3 font-medium">Last Transaction</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer: Customer, index: number) => (
                  <tr key={customer.id} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3">
                      <div className="font-medium text-card-foreground" data-testid={`customer-name-${index}`}>
                        {customer.name}
                      </div>
                      {customer.gstNumber && (
                        <div className="text-sm text-muted-foreground">GST: {customer.gstNumber}</div>
                      )}
                    </td>
                    <td className="p-3">
                      <Badge 
                        variant={customer.type === 'credit' ? 'default' : 'secondary'}
                        data-testid={`customer-type-${index}`}
                      >
                        {customer.type}
                      </Badge>
                    </td>
                    <td className="p-3 text-right" data-testid={`credit-limit-${index}`}>
                      {customer.type === 'credit' ? `₹${parseFloat(customer.creditLimit || '0').toLocaleString()}` : '-'}
                    </td>
                    <td className="p-3 text-right">
                      <span 
                        className={`font-semibold ${parseFloat(customer.outstandingAmount || '0') > 0 ? 'text-red-600' : 'text-green-600'}`}
                        data-testid={`outstanding-${index}`}
                      >
                        {parseFloat(customer.outstandingAmount || '0') > 0 
                          ? `₹${parseFloat(customer.outstandingAmount || '0').toLocaleString()}` 
                          : '-'}
                      </span>
                    </td>
                    <td className="p-3 text-center text-sm">2 hours ago</td>
                    <td className="p-3 text-center">
                      <Badge 
                        variant={customer.isActive ? 'default' : 'destructive'}
                        className={customer.isActive ? 'bg-green-100 text-green-800' : ''}
                      >
                        {customer.isActive ? 'Active' : 'Inactive'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleViewCustomer(customer)}
                          className="text-blue-600 hover:text-blue-800 p-1"
                          data-testid={`button-view-${index}`}
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleEditCustomer(customer)}
                          className="text-green-600 hover:text-green-800 p-1"
                          data-testid={`button-edit-${index}`}
                        >
                          <Edit className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handlePaymentCustomer(customer)}
                          className="text-purple-600 hover:text-purple-800 p-1"
                          data-testid={`button-payment-${index}`}
                        >
                          <CreditCard className="w-4 h-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
                {filteredCustomers.length === 0 && (
                  <tr>
                    <td colSpan={7} className="p-8 text-center text-muted-foreground">
                      No customers found matching your criteria.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* View Customer Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Customer Details</DialogTitle>
          </DialogHeader>
          {selectedCustomer && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium">Name</label>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.name}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Type</label>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.type}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Phone</label>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.contactPhone || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Email</label>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.contactEmail || 'N/A'}</p>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium">Address</label>
                  <p className="text-sm text-muted-foreground">{selectedCustomer.address || 'N/A'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Credit Limit</label>
                  <p className="text-sm text-muted-foreground">₹{parseFloat(selectedCustomer.creditLimit || '0').toLocaleString()}</p>
                </div>
                <div>
                  <label className="text-sm font-medium">Outstanding</label>
                  <p className="text-sm text-muted-foreground">₹{parseFloat(selectedCustomer.outstandingAmount || '0').toLocaleString()}</p>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Edit Customer Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Edit Customer</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-muted-foreground">Edit functionality will be implemented soon.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Payment Dialog */}
      <Dialog open={paymentDialogOpen} onOpenChange={setPaymentDialogOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Record Payment</DialogTitle>
          </DialogHeader>
          <div className="p-4">
            <p className="text-muted-foreground">Payment recording functionality will be implemented soon.</p>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
