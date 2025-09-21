import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { useCurrency } from "@/contexts/CurrencyContext";
import { useStation } from "@/contexts/StationContext";
import { apiRequest } from "@/lib/api";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Link } from "wouter";
import { generatePrintTemplate, printDocument, downloadAsPDF, downloadAsPNG } from "@/lib/printUtils";
import type { Payment, Customer, Supplier } from "@shared/schema";

interface PaymentWithDetails extends Payment {
  customer?: Customer;
  supplier?: Supplier;
}

function PaymentHistory() {
  const { id, type } = useParams<{ id: string; type: string }>();
  const { user } = useAuth();
  const { formatCurrency } = useCurrency();
  const { stationSettings } = useStation();

  const { data: payments = [], isLoading } = useQuery<PaymentWithDetails[]>({
    queryKey: ["/api/payments", user?.stationId, id, type],
    queryFn: async () => {
      const response = await apiRequest("GET", `/api/payments/${user?.stationId}`);
      const allPayments = await response.json();
      // Filter payments for this specific customer/supplier
      return allPayments.filter((payment: PaymentWithDetails) =>
        type === 'customer' ? payment.customerId === id : payment.supplierId === id
      );
    },
    enabled: !!user?.stationId && !!id && !!type,
  });

  const { data: customerData } = useQuery<Customer>({
    queryKey: ["/api/customers", id],
    queryFn: () => apiRequest("GET", `/api/customers/${id}`).then(res => res.json()),
    enabled: !!id && type === 'customer',
  });

  const { data: supplierData } = useQuery<Supplier>({
    queryKey: ["/api/suppliers", id],
    queryFn: () => apiRequest("GET", `/api/suppliers/${id}`).then(res => res.json()),
    enabled: !!id && type === 'supplier',
  });

  const entity = type === 'customer' ? customerData : supplierData;

  // Generate statement content
  const generateStatementContent = (entityData: Customer | Supplier | undefined, payments: Payment[]) => {
    if (!entityData) return ''; // Handle case where entity data is not yet loaded

    const isCustomer = 'type' in entityData;
    const entityType = isCustomer ? 'Customer' : 'Supplier';
    const totalPayments = payments.reduce((sum, p) => sum + parseFloat(p.amount), 0);

    return `
      <!DOCTYPE html>
      <html>
        <head>
          <title>${entityType} Statement - ${entityData.name}</title>
          <style>
            @page { margin: 0.5in; size: A4; }
            body { font-family: Arial, sans-serif; line-height: 1.4; color: #000; margin: 0; padding: 20px; }
            .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
            .header h1 { color: #2563eb; margin: 0; }
            .entity-info { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
            .payments-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            .payments-table th, .payments-table td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
            .payments-table th { background: #f3f4f6; font-weight: bold; }
            .summary { background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 20px; }
            .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
          </style>
        </head>
        <body>
          <div class="header">
            <h1>${stationSettings?.stationName || 'FuelFlow Station'}</h1>
            <h2>${entityType} Payment Statement</h2>
            <p>Generated on ${new Date().toLocaleDateString()}</p>
          </div>

          <div class="entity-info">
            <h3>${entityType} Information</h3>
            <p><strong>Name:</strong> ${entityData.name}</p>
            ${entityData.contactPhone ? `<p><strong>Phone:</strong> ${entityData.contactPhone}</p>` : ''}
            ${entityData.contactEmail ? `<p><strong>Email:</strong> ${entityData.contactEmail}</p>` : ''}
            ${entityData.gstNumber ? `<p><strong>GST Number:</strong> ${entityData.gstNumber}</p>` : ''}
          </div>

          <h3>Payment History</h3>
          <table class="payments-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Amount</th>
                <th>Method</th>
                <th>Reference</th>
                <th>Type</th>
              </tr>
            </thead>
            <tbody>
              ${payments.map(payment => `
                <tr>
                  <td>${new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}</td>
                  <td>${formatCurrency(parseFloat(payment.amount))}</td>
                  <td>${payment.paymentMethod}</td>
                  <td>${payment.referenceNumber || 'N/A'}</td>
                  <td>${payment.type}</td>
                </tr>
              `).join('')}
              ${payments.length === 0 ? '<tr><td colspan="5" style="text-align: center; color: #666;">No payment history found</td></tr>' : ''}
            </tbody>
          </table>

          <div class="summary">
            <h4>Summary</h4>
            <p><strong>Total Payments:</strong> ${formatCurrency(totalPayments)}</p>
            <p><strong>Outstanding Amount:</strong> ${formatCurrency(parseFloat(entityData.outstandingAmount || '0'))}</p>
          </div>

          <div class="footer">
            <p>This is a computer-generated statement from FuelFlow Management System</p>
            <p>For any queries regarding this statement, please contact our accounts department</p>
          </div>
        </body>
      </html>
    `;
  };

  const handlePrint = () => {
    if (!entity || !payments) return;
    
    const statementData = {
      entityType: type === 'customer' ? 'Customer' : 'Supplier',
      entityName: entity.name,
      entity,
      payments,
      totalPayments: formatCurrency(payments.reduce((sum, p) => sum + parseFloat(p.amount), 0)),
      outstandingAmount: formatCurrency(parseFloat(entity.outstandingAmount || '0'))
    };

    const template = generatePrintTemplate(statementData, 'statement');
    printDocument(template);
  };

  const handleDownloadPDF = () => {
    if (!entity || !payments) return;

    const statementData = {
      entityType: type === 'customer' ? 'Customer' : 'Supplier',
      entityName: entity.name,
      entity,
      payments,
      totalPayments: formatCurrency(payments.reduce((sum, p) => sum + parseFloat(p.amount), 0)),
      outstandingAmount: formatCurrency(parseFloat(entity.outstandingAmount || '0'))
    };

    const template = generatePrintTemplate(statementData, 'statement');
    downloadAsPDF(template);
  };

  const handleDownloadPNG = () => {
    if (!entity || !payments) return;

    const statementData = {
      entityType: type === 'customer' ? 'Customer' : 'Supplier',
      entityName: entity.name,
      entity,
      payments,
      totalPayments: formatCurrency(payments.reduce((sum, p) => sum + parseFloat(p.amount), 0)),
      outstandingAmount: formatCurrency(parseFloat(entity.outstandingAmount || '0'))
    };

    const template = generatePrintTemplate(statementData, 'statement');
    downloadAsPNG(template);
  };

  if (isLoading) {
    return <div className="flex items-center justify-center h-96">Loading...</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="print:hidden sticky top-0 bg-background/80 backdrop-blur-sm border-b z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href={type === 'customer' ? '/accounts-receivable' : '/accounts-payable'}>
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Payment History - {entity?.name}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} size="sm">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <Button onClick={handleDownloadPDF} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download PDF
              </Button>
              <Button onClick={handleDownloadPNG} variant="outline" size="sm">
                <Download className="w-4 h-4 mr-2" />
                Download PNG
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="print:shadow-none print:border-none">
          <CardHeader>
            <CardTitle>Payment History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {payments.length > 0 ? payments.map((payment) => (
                <div key={payment.id} className="flex items-center justify-between p-4 border border-border rounded-md">
                  <div>
                    <div className="font-medium">{formatCurrency(parseFloat(payment.amount))}</div>
                    <div className="text-sm text-muted-foreground">
                      {new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()} • {payment.paymentMethod}
                    </div>
                    {payment.referenceNumber && (
                      <div className="text-xs text-muted-foreground">Ref: {payment.referenceNumber}</div>
                    )}
                  </div>
                  <Badge variant="outline">{payment.type}</Badge>
                </div>
              )) : (
                <div className="text-center text-muted-foreground py-8">
                  No payment history found
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

export default PaymentHistory;