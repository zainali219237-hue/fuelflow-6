
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { Calendar, Download, Eye, Filter, Printer, Search } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/use-toast";
import { useCurrency } from "@/contexts/CurrencyContext";
import { apiRequest } from "@/lib/api";

interface Payment {
  id: string;
  amount: string;
  currencyCode: string;
  paymentDate: string;
  paymentMethod: string;
  referenceNumber?: string;
  notes?: string;
  type: 'receivable' | 'payable';
  customerId?: string;
  supplierId?: string;
}

interface Customer {
  id: string;
  name: string;
  type: string;
}

interface Supplier {
  id: string;
  name: string;
}

export default function PaymentHistory() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { formatCurrency } = useCurrency();
  const [searchTerm, setSearchTerm] = useState("");
  const [filterType, setFilterType] = useState<string>("all");
  const [filterMethod, setFilterMethod] = useState<string>("all");
  const [selectedPayment, setSelectedPayment] = useState<Payment | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);

  const { data: payments = [], isLoading: paymentsLoading } = useQuery<Payment[]>({
    queryKey: ["/api/payments", user?.stationId],
    queryFn: () => {
      if (!user?.stationId) return [];
      return apiRequest("GET", `/api/payments/${user.stationId}`).then(res => res.json());
    },
    enabled: !!user?.stationId,
  });

  const { data: customers = [] } = useQuery<Customer[]>({
    queryKey: ["/api/customers"],
    queryFn: () => apiRequest("GET", "/api/customers").then(res => res.json()),
  });

  const { data: suppliers = [] } = useQuery<Supplier[]>({
    queryKey: ["/api/suppliers"],
    queryFn: () => apiRequest("GET", "/api/suppliers").then(res => res.json()),
  });

  const filteredPayments = payments.filter(payment => {
    const matchesSearch = !searchTerm || 
      (payment.referenceNumber && payment.referenceNumber.toLowerCase().includes(searchTerm.toLowerCase())) ||
      payment.amount.toLowerCase().includes(searchTerm.toLowerCase()) ||
      payment.paymentMethod.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = filterType === "all" || payment.type === filterType;
    const matchesMethod = filterMethod === "all" || payment.paymentMethod === filterMethod;
    
    return matchesSearch && matchesType && matchesMethod;
  });

  const getEntityName = (payment: Payment) => {
    if (payment.type === 'receivable' && payment.customerId) {
      const customer = customers.find(c => c.id === payment.customerId);
      return customer?.name || 'Unknown Customer';
    } else if (payment.type === 'payable' && payment.supplierId) {
      const supplier = suppliers.find(s => s.id === payment.supplierId);
      return supplier?.name || 'Unknown Supplier';
    }
    return 'N/A';
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'receivable':
        return 'bg-green-100 text-green-800';
      case 'payable':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const getMethodColor = (method: string) => {
    switch (method) {
      case 'cash':
        return 'bg-blue-100 text-blue-800';
      case 'card':
        return 'bg-purple-100 text-purple-800';
      case 'credit':
        return 'bg-orange-100 text-orange-800';
      case 'fleet':
        return 'bg-indigo-100 text-indigo-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  };

  const handleViewDetails = (payment: Payment) => {
    setSelectedPayment(payment);
    setDetailsOpen(true);
    console.log("👁️ View payment details:", payment.id);
  };

  const handlePrint = () => {
    window.print();
    console.log("📄 Print payment history");
    toast({
      title: "Printing",
      description: "Payment history is being prepared for printing",
    });
  };

  const handleDownload = () => {
    const csvData = [
      ['Date', 'Type', 'Entity', 'Amount', 'Method', 'Reference', 'Notes'],
      ...filteredPayments.map(payment => [
        format(new Date(payment.paymentDate), 'yyyy-MM-dd'),
        payment.type,
        getEntityName(payment),
        payment.amount,
        payment.paymentMethod,
        payment.referenceNumber || '',
        payment.notes || ''
      ])
    ];

    const csvContent = csvData.map(row => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `payment-history-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    
    console.log("💾 Download payment history");
    toast({
      title: "Download started",
      description: "Payment history CSV downloaded successfully",
    });
  };

  const totalReceivables = filteredPayments
    .filter(p => p.type === 'receivable')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  const totalPayables = filteredPayments
    .filter(p => p.type === 'payable')
    .reduce((sum, p) => sum + parseFloat(p.amount), 0);

  if (paymentsLoading) {
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

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-2xl font-semibold">Payment History</h3>
          <p className="text-muted-foreground">View and manage payment records</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={handlePrint}>
            <Printer className="w-4 h-4 mr-2" />
            Print
          </Button>
          <Button variant="outline" onClick={handleDownload}>
            <Download className="w-4 h-4 mr-2" />
            Download
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receivables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {formatCurrency(totalReceivables)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payables</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {formatCurrency(totalPayables)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Position</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totalReceivables - totalPayables >= 0 ? 'text-green-600' : 'text-red-600'}`}>
              {formatCurrency(totalReceivables - totalPayables)}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="w-5 h-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search payments..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10"
              />
            </div>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                <SelectItem value="receivable">Receivables</SelectItem>
                <SelectItem value="payable">Payables</SelectItem>
              </SelectContent>
            </Select>
            <Select value={filterMethod} onValueChange={setFilterMethod}>
              <SelectTrigger>
                <SelectValue placeholder="Filter by method" />
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
        </CardContent>
      </Card>

      {/* Payments Table */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Records ({filteredPayments.length})</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Entity</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Method</TableHead>
                <TableHead>Reference</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredPayments.map((payment) => (
                <TableRow key={payment.id}>
                  <TableCell>
                    <div className="flex items-center">
                      <Calendar className="w-4 h-4 mr-2 text-muted-foreground" />
                      {format(new Date(payment.paymentDate), 'MMM dd, yyyy')}
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge className={getTypeColor(payment.type)}>
                      {payment.type}
                    </Badge>
                  </TableCell>
                  <TableCell>{getEntityName(payment)}</TableCell>
                  <TableCell className="font-medium">
                    {formatCurrency(parseFloat(payment.amount))}
                  </TableCell>
                  <TableCell>
                    <Badge className={getMethodColor(payment.paymentMethod)}>
                      {payment.paymentMethod}
                    </Badge>
                  </TableCell>
                  <TableCell>{payment.referenceNumber || 'N/A'}</TableCell>
                  <TableCell>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(payment)}
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {filteredPayments.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No payment records found
            </div>
          )}
        </CardContent>
      </Card>

      {/* Payment Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-[500px]">
          <DialogHeader>
            <DialogTitle>Payment Details</DialogTitle>
          </DialogHeader>
          {selectedPayment && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Date</label>
                  <p>{format(new Date(selectedPayment.paymentDate), 'PPP')}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Amount</label>
                  <p className="font-semibold">{formatCurrency(parseFloat(selectedPayment.amount))}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Type</label>
                  <Badge className={getTypeColor(selectedPayment.type)}>
                    {selectedPayment.type}
                  </Badge>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Method</label>
                  <Badge className={getMethodColor(selectedPayment.paymentMethod)}>
                    {selectedPayment.paymentMethod}
                  </Badge>
                </div>
                <div className="col-span-2">
                  <label className="text-sm font-medium text-muted-foreground">Entity</label>
                  <p>{getEntityName(selectedPayment)}</p>
                </div>
                {selectedPayment.referenceNumber && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Reference Number</label>
                    <p>{selectedPayment.referenceNumber}</p>
                  </div>
                )}
                {selectedPayment.notes && (
                  <div className="col-span-2">
                    <label className="text-sm font-medium text-muted-foreground">Notes</label>
                    <p>{selectedPayment.notes}</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
