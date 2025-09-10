import { useState } from "react";
import type { Supplier } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";

export default function AccountsPayable() {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const { data: suppliers = [], isLoading } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
  });

  const filteredSuppliers = suppliers.filter((supplier: Supplier) => {
    const matchesSearch = supplier.name.toLowerCase().includes(searchTerm.toLowerCase());
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
          <Button data-testid="button-make-payment">
            + Make Payment
          </Button>
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
                {/* Sample supplier payables */}
                {[
                  {
                    name: "Bharat Petroleum Corporation",
                    contact: "Ramesh Kumar",
                    gst: "27AABCB1234L1Z8",
                    paymentTerms: "Net 30",
                    outstanding: "5,52,500",
                    lastPayment: "20 Dec 2023",
                    dueDate: "25 Jan 2024",
                    daysOverdue: 0,
                    status: "current"
                  },
                  {
                    name: "Indian Oil Corporation",
                    contact: "Suresh Patel",
                    gst: "27AABCI5678M1Z2",
                    paymentTerms: "Net 15",
                    outstanding: "2,52,750",
                    lastPayment: "15 Dec 2023",
                    dueDate: "20 Jan 2024",
                    daysOverdue: 5,
                    status: "overdue"
                  },
                  {
                    name: "Hindustan Petroleum",
                    contact: "Ajay Singh",
                    gst: "27AABCH9012N1Z5",
                    paymentTerms: "Net 30",
                    outstanding: "1,85,000",
                    lastPayment: "10 Jan 2024",
                    dueDate: "28 Jan 2024",
                    daysOverdue: 0,
                    status: "current"
                  }
                ].map((supplier, index) => (
                  <tr key={index} className="border-b border-border hover:bg-muted/50">
                    <td className="p-3">
                      <div className="font-medium text-card-foreground" data-testid={`supplier-name-ap-${index}`}>
                        {supplier.name}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        Contact: {supplier.contact}
                      </div>
                      <div className="text-sm text-muted-foreground">
                        GST: {supplier.gst}
                      </div>
                    </td>
                    <td className="p-3">{supplier.paymentTerms}</td>
                    <td className="p-3 text-right">
                      <span className="font-semibold text-red-600" data-testid={`outstanding-ap-${index}`}>
                        ₹{supplier.outstanding}
                      </span>
                    </td>
                    <td className="p-3 text-center text-sm">{supplier.lastPayment}</td>
                    <td className="p-3 text-center text-sm">{supplier.dueDate}</td>
                    <td className="p-3 text-center">
                      <span className={supplier.daysOverdue > 0 ? 'text-red-600 font-semibold' : 'text-green-600'}>
                        {supplier.daysOverdue > 0 ? `${supplier.daysOverdue} days` : 'On time'}
                      </span>
                    </td>
                    <td className="p-3 text-center">
                      <Badge
                        variant={supplier.status === 'current' ? 'default' : 'destructive'}
                        className={supplier.status === 'current' ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}
                        data-testid={`status-ap-${index}`}
                      >
                        {supplier.status === 'current' ? 'Current' : 'Overdue'}
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
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
