import { useState } from "react";
import type { Customer } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

export default function AccountsReceivable() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [agingFilter, setAgingFilter] = useState("all");

  const { data: customers = [], isLoading } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const creditCustomers = customers.filter((c: Customer) => parseFloat(c.outstandingAmount || '0') > 0);
  
  const filteredCustomers = creditCustomers.filter((customer: Customer) => {
    const matchesSearch = customer.name.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
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

  const totalOutstanding = filteredCustomers.reduce((sum: number, c: Customer) => sum + parseFloat(c.outstandingAmount || '0'), 0);
  const overdueAccounts = filteredCustomers.filter((c: Customer) => parseFloat(c.outstandingAmount || '0') > 50000).length;
  const currentAccounts = filteredCustomers.filter((c: Customer) => {
    const outstanding = parseFloat(c.outstandingAmount || '0');
    return outstanding > 0 && outstanding <= 50000;
  }).length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Accounts Receivable</h3>
          <p className="text-muted-foreground">Track customer payments and outstanding balances</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button data-testid="button-record-payment">
            + Record Payment
          </Button>
          <Button variant="outline" data-testid="button-aging-report">
            📊 Aging Report
          </Button>
        </div>
      </div>

      {/* Receivables Summary */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary" data-testid="total-customers-ar">
              {filteredCustomers.length}
            </div>
            <div className="text-sm text-muted-foreground">Outstanding Customers</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600" data-testid="total-outstanding">
              ₹{totalOutstanding.toLocaleString()}
            </div>
            <div className="text-sm text-muted-foreground">Total Outstanding</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600" data-testid="current-accounts">
              {currentAccounts}
            </div>
            <div className="text-sm text-muted-foreground">Current (0-30 days)</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-red-600" data-testid="overdue-accounts-ar">
              {overdueAccounts}
            </div>
            <div className="text-sm text-muted-foreground">Overdue ({'>'}30 days)</div>
          </CardContent>
        </Card>
      </div>

      {/* Outstanding Balances Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Outstanding Customer Balances</CardTitle>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search customers..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
                data-testid="input-search-customers-ar"
              />
              <Select value={agingFilter} onValueChange={setAgingFilter}>
                <SelectTrigger className="w-40" data-testid="select-aging-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Accounts</SelectItem>
                  <SelectItem value="current">Current (0-30)</SelectItem>
                  <SelectItem value="30-60">30-60 Days</SelectItem>
                  <SelectItem value="60-90">60-90 Days</SelectItem>
                  <SelectItem value="90+">90+ Days</SelectItem>
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
                  <th className="text-right p-3 font-medium">Credit Limit</th>
                  <th className="text-right p-3 font-medium">Outstanding</th>
                  <th className="text-right p-3 font-medium">Available Credit</th>
                  <th className="text-center p-3 font-medium">Days Outstanding</th>
                  <th className="text-center p-3 font-medium">Last Payment</th>
                  <th className="text-center p-3 font-medium">Status</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {/* Sample outstanding accounts */}
                {[
                  {
                    name: "Rajesh Transport Co.",
                    gst: "27AABCT1234M1Z5",
                    creditLimit: "2,00,000",
                    outstanding: "45,000",
                    availableCredit: "1,55,000",
                    daysOutstanding: 15,
                    lastPayment: "5 Jan 2024",
                    status: "current"
                  },
                  {
                    name: "City Logistics Ltd.",
                    gst: "27AABCT5678N1Z9", 
                    creditLimit: "1,50,000",
                    outstanding: "75,000",
                    availableCredit: "75,000",
                    daysOutstanding: 45,
                    lastPayment: "2 Jan 2024",
                    status: "overdue"
                  },
                  {
                    name: "Maharashtra Travels",
                    gst: "27AABCT9012P1Z3",
                    creditLimit: "1,00,000",
                    outstanding: "25,000",
                    availableCredit: "75,000", 
                    daysOutstanding: 8,
                    lastPayment: "10 Jan 2024",
                    status: "current"
                  }
                ].map((customer, index) => (
                  <tr key={index} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3">
                      <div className="font-medium text-card-foreground" data-testid={`customer-name-ar-${index}`}>
                        {customer.name}
                      </div>
                      <div className="text-sm text-muted-foreground">GST: {customer.gst}</div>
                    </td>
                    <td className="p-3 text-right">₹{customer.creditLimit}</td>
                    <td className="p-3 text-right">
                      <span className="font-semibold text-red-600" data-testid={`outstanding-ar-${index}`}>
                        ₹{customer.outstanding}
                      </span>
                    </td>
                    <td className="p-3 text-right text-green-600">₹{customer.availableCredit}</td>
                    <td className="p-3 text-center">
                      <span className={customer.daysOutstanding > 30 ? 'text-red-600 font-semibold' : ''}>
                        {customer.daysOutstanding} days
                      </span>
                    </td>
                    <td className="p-3 text-center text-sm">{customer.lastPayment}</td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={customer.status === 'current' ? 'default' : 'destructive'}
                        className={customer.status === 'current' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        data-testid={`status-ar-${index}`}
                      >
                        {customer.status === 'current' ? 'Current' : 'Overdue'}
                      </Badge>
                    </td>
                    <td className="p-3 text-center">
                      <div className="flex items-center justify-center space-x-2">
                        <button 
                          className="text-blue-600 hover:text-blue-800"
                          data-testid={`button-view-ar-${index}`}
                        >
                          👁️
                        </button>
                        <button 
                          className="text-green-600 hover:text-green-800"
                          data-testid={`button-payment-ar-${index}`}
                        >
                          💰
                        </button>
                        <button 
                          className="text-purple-600 hover:text-purple-800"
                          data-testid={`button-statement-${index}`}
                        >
                          📄
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
