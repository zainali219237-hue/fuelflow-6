import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { Customer } from "@shared/schema";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/api";

export default function CustomerManagement() {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState("all");

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
        <Button data-testid="button-add-customer">
          + Add New Customer
        </Button>
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
                          ? `₹${parseFloat(customer.outstandingAmount).toLocaleString()}` 
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
                        <button 
                          className="text-blue-600 hover:text-blue-800"
                          data-testid={`button-view-${index}`}
                        >
                          👁️
                        </button>
                        <button 
                          className="text-green-600 hover:text-green-800"
                          data-testid={`button-edit-${index}`}
                        >
                          ✏️
                        </button>
                        <button 
                          className="text-purple-600 hover:text-purple-800"
                          data-testid={`button-payment-${index}`}
                        >
                          💰
                        </button>
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
    </div>
  );
}
