import { useState } from "react";
import type { SalesTransaction, Customer, Product } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { Eye, Printer, Receipt } from "lucide-react";
import { useLocation } from "wouter";

export default function SalesHistory() {
  const { user } = useAuth();
  const { formatCurrency } = useCurrency() || { formatCurrency: (amount: number) => `₹${amount}` };
  const [, navigate] = useLocation();
  const [searchTerm, setSearchTerm] = useState("");
  const [dateFilter, setDateFilter] = useState("today");
  const [paymentFilter, setPaymentFilter] = useState("all");

  const handleViewTransaction = (transactionId: string) => {
    navigate(`/invoice/${transactionId}`);
  };

  const handlePrintTransaction = (transactionId: string) => {
    // Open invoice page in new window and trigger print
    const printWindow = window.open(`/invoice/${transactionId}`, '_blank');
    if (printWindow) {
      printWindow.addEventListener('load', () => {
        printWindow.print();
      });
    }
  };

  const handleReceiptTransaction = (transactionId: string) => {
    // Same as view - navigate to invoice page
    navigate(`/invoice/${transactionId}`);
  };

  const { data: salesTransactions = [], isLoading } = useQuery<SalesTransaction[]>({
    queryKey: ["/api/sales", user?.stationId],
    enabled: !!user?.stationId,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
  });

  const { data: products = [] } = useQuery<Product[]>({
    queryKey: ["/api/products"],
  });

  const filteredTransactions = salesTransactions.filter((transaction: SalesTransaction) => {
    const matchesSearch = transaction.invoiceNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPayment = paymentFilter === "all" || transaction.paymentMethod === paymentFilter;
    
    // Date filtering
    if (!transaction.transactionDate) return false;
    const transactionDate = new Date(transaction.transactionDate);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    let matchesDate = true;
    if (dateFilter === "today") {
      const transactionToday = new Date(transactionDate);
      transactionToday.setHours(0, 0, 0, 0);
      matchesDate = transactionToday.getTime() === today.getTime();
    } else if (dateFilter === "yesterday") {
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);
      const transactionToday = new Date(transactionDate);
      transactionToday.setHours(0, 0, 0, 0);
      matchesDate = transactionToday.getTime() === yesterday.getTime();
    } else if (dateFilter === "week") {
      const weekAgo = new Date(today);
      weekAgo.setDate(weekAgo.getDate() - 7);
      matchesDate = transactionDate >= weekAgo;
    } else if (dateFilter === "month") {
      const monthAgo = new Date(today);
      monthAgo.setMonth(monthAgo.getMonth() - 1);
      matchesDate = transactionDate >= monthAgo;
    }
    
    return matchesSearch && matchesPayment && matchesDate;
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

  const todaysSales = filteredTransactions.length;
  const totalAmount = filteredTransactions.reduce((sum: number, t: SalesTransaction) => sum + parseFloat(t.totalAmount || '0'), 0);
  const cashSales = filteredTransactions.filter((t: SalesTransaction) => t.paymentMethod === 'cash').length;
  const creditSales = filteredTransactions.filter((t: SalesTransaction) => t.paymentMethod === 'credit').length;

  return (
    <div className="space-y-6 fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold text-card-foreground">Sales History</h3>
          <p className="text-muted-foreground">Complete transaction history and sales analytics</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" data-testid="button-export-excel">
            📊 Export Excel
          </Button>
          <Button variant="outline" data-testid="button-export-pdf">
            📄 Export PDF
          </Button>
        </div>
      </div>

      {/* Sales Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-primary" data-testid="todays-transactions">
              {todaysSales}
            </div>
            <div className="text-sm text-muted-foreground">Today's Transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-green-600" data-testid="total-sales-amount">
              {formatCurrency(totalAmount)}
            </div>
            <div className="text-sm text-muted-foreground">Total Sales Amount</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-blue-600" data-testid="cash-transactions">
              {cashSales}
            </div>
            <div className="text-sm text-muted-foreground">Cash Transactions</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-2xl font-bold text-orange-600" data-testid="credit-transactions">
              {creditSales}
            </div>
            <div className="text-sm text-muted-foreground">Credit Transactions</div>
          </CardContent>
        </Card>
      </div>

      {/* Sales History Table */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Transaction History</CardTitle>
            <div className="flex items-center space-x-2">
              <Input
                type="text"
                placeholder="Search by invoice..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-48"
                data-testid="input-search-invoice"
              />
              <Select value={dateFilter} onValueChange={setDateFilter}>
                <SelectTrigger className="w-32" data-testid="select-date-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="today">Today</SelectItem>
                  <SelectItem value="yesterday">Yesterday</SelectItem>
                  <SelectItem value="week">This Week</SelectItem>
                  <SelectItem value="month">This Month</SelectItem>
                </SelectContent>
              </Select>
              <Select value={paymentFilter} onValueChange={setPaymentFilter}>
                <SelectTrigger className="w-32" data-testid="select-payment-filter">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Methods</SelectItem>
                  <SelectItem value="cash">Cash</SelectItem>
                  <SelectItem value="card">Card</SelectItem>
                  <SelectItem value="credit">Credit</SelectItem>
                  <SelectItem value="fleet">Fleet</SelectItem>
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
                  <th className="text-left p-3 font-medium">Time</th>
                  <th className="text-left p-3 font-medium">Invoice</th>
                  <th className="text-left p-3 font-medium">Customer</th>
                  <th className="text-left p-3 font-medium">Product</th>
                  <th className="text-right p-3 font-medium">Quantity</th>
                  <th className="text-right p-3 font-medium">Rate</th>
                  <th className="text-right p-3 font-medium">Amount</th>
                  <th className="text-center p-3 font-medium">Payment</th>
                  <th className="text-center p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTransactions.length > 0 ? filteredTransactions.map((transaction: SalesTransaction, index: number) => {
                  const customer = customers.find(c => c.id === transaction.customerId);
                  const transactionTime = transaction.transactionDate 
                    ? new Date(transaction.transactionDate).toLocaleTimeString('en-IN', {
                        hour: '2-digit',
                        minute: '2-digit'
                      })
                    : 'N/A';
                  
                  return (
                    <tr key={transaction.id} className="border-b border-border hover:bg-muted/50">
                      <td className="p-3 text-sm">{transactionTime}</td>
                      <td className="p-3">
                        <span className="font-medium text-primary" data-testid={`invoice-${index}`}>
                          {transaction.invoiceNumber}
                        </span>
                      </td>
                      <td className="p-3">{customer?.name || 'Walk-in Customer'}</td>
                      <td className="p-3">Mixed Products</td>
                      <td className="p-3 text-right">-</td>
                      <td className="p-3 text-right">-</td>
                      <td className="p-3 text-right font-semibold" data-testid={`amount-${index}`}>
                        {formatCurrency(parseFloat(transaction.totalAmount || '0'))}
                      </td>
                      <td className="p-3 text-center">
                        <Badge
                          variant={transaction.paymentMethod === 'cash' ? 'default' : 
                                  transaction.paymentMethod === 'credit' ? 'destructive' : 'secondary'}
                          data-testid={`payment-method-${index}`}
                        >
                          {transaction.paymentMethod}
                        </Badge>
                      </td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleViewTransaction(transaction.id)}
                            className="text-blue-600 hover:text-blue-800 p-1"
                            data-testid={`button-view-${index}`}
                          >
                            <Eye className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handlePrintTransaction(transaction.id)}
                            className="text-green-600 hover:text-green-800 p-1"
                            data-testid={`button-print-${index}`}
                          >
                            <Printer className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleReceiptTransaction(transaction.id)}
                            className="text-purple-600 hover:text-purple-800 p-1"
                            data-testid={`button-receipt-${index}`}
                          >
                            <Receipt className="w-4 h-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={9} className="p-8 text-center text-muted-foreground">
                      No transactions found for the selected criteria
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
