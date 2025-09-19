import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { formatAmount } from "@/lib/currency";
import { Printer, Download, ArrowLeft, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { 
  SalesTransaction, 
  SalesTransactionItem, 
  Customer, 
  Product, 
  Station, 
  User 
} from "@shared/schema";

interface TransactionWithDetails extends SalesTransaction {
  customer: Customer;
  user: User;
  station: Station;
  items: Array<SalesTransactionItem & { product: Product }>;
}

export default function InvoiceReceipt() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: transaction, isLoading } = useQuery<TransactionWithDetails>({
    queryKey: ["/api/sales/detail", id!],
    enabled: !!id && !!user?.stationId,
  });

  // Check for print parameter from Sales History
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const shouldPrint = urlParams.get('print') === '1';
    
    if (shouldPrint && !isLoading && transaction) {
      // Data is loaded, safe to print
      setTimeout(() => {
        window.print();
      }, 200); // Slightly longer delay for reliable printing
    }
  }, [isLoading, transaction]);

  const handlePrint = () => {
    // Add a short delay to ensure content is rendered
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadPDF = async () => {
    const invoiceElement = document.getElementById('invoice-print');
    if (!invoiceElement) return;

    try {
      // Create a new window for PDF generation
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) return;

      // Clone the invoice content
      const clonedContent = invoiceElement.cloneNode(true) as HTMLElement;
      
      // Create a complete HTML document for PDF generation
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Invoice ${transaction?.invoiceNumber || 'Unknown'}</title>
            <style>
              @page { 
                margin: 0.5in; 
                size: A4;
              }
              body { 
                font-family: Arial, sans-serif;
                line-height: 1.4;
                color: #000;
                margin: 0;
                padding: 20px;
              }
              .container { max-width: 800px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 30px; }
              .invoice-title { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
              .station-info { font-size: 14px; margin-bottom: 20px; }
              .invoice-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
              .bill-to, .invoice-meta { font-size: 14px; }
              .invoice-meta { text-align: right; }
              table { width: 100%; border-collapse: collapse; margin: 20px 0; }
              th, td { border: 1px solid #ddd; padding: 8px; text-align: left; }
              th { background-color: #f5f5f5; font-weight: bold; }
              .text-right { text-align: right; }
              .total-row { background-color: #f9f9f9; font-weight: bold; }
              .payment-status { 
                background: #16a34a; 
                color: white; 
                padding: 4px 12px; 
                border-radius: 4px; 
                display: inline-block; 
                margin: 10px 0;
              }
            </style>
          </head>
          <body>
            ${clonedContent.textContent || ''}
          </body>
        </html>
      `;

      printWindow.document.write(htmlContent);
      printWindow.document.close();
      
      // Wait for content to load, then print and close
      printWindow.onload = () => {
        setTimeout(() => {
          printWindow.print();
          printWindow.close();
        }, 500);
      };

      // Alternative trigger for browsers that don't fire onload
      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          printWindow.print();
          printWindow.close();
        }
      }, 1000);

    } catch (error) {
      console.error('PDF download failed:', error);
      // Fallback to regular print
      handlePrint();
    }
  };

  const handleDownloadPNG = async () => {
    const invoiceElement = document.getElementById('invoice-print');
    if (!invoiceElement) return;

    try {
      // Use html2canvas if available, otherwise fall back to basic method
      if (typeof (window as any).html2canvas !== 'undefined') {
        const canvas = await (window as any).html2canvas(invoiceElement, {
          scale: 2,
          useCORS: true,
          backgroundColor: '#ffffff'
        });
        
        const link = document.createElement('a');
        link.download = `invoice-${transaction?.invoiceNumber || 'unknown'}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
      } else {
        // Fallback: convert to PDF for now
        handleDownloadPDF();
      }
    } catch (error) {
      console.error('PNG download failed:', error);
      // Fallback to PDF
      handleDownloadPDF();
    }
  };

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="animate-pulse">
          <div className="h-8 bg-muted rounded w-64 mb-4"></div>
          <div className="h-4 bg-muted rounded w-48 mb-8"></div>
          <div className="h-96 bg-muted rounded"></div>
        </div>
      </div>
    );
  }

  if (!transaction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <h2 className="text-2xl font-bold mb-2">Transaction Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested invoice could not be found.
            </p>
            <Link href="/sales-history">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Sales History
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const isPaid = parseFloat(transaction.outstandingAmount || '0') === 0;
  const isOverdue = transaction.dueDate && new Date(transaction.dueDate) < new Date() && !isPaid;

  return (
    <div className="min-h-screen bg-background">
      {/* Print/Download Actions - Hidden when printing */}
      <div className="print:hidden sticky top-0 bg-background/80 backdrop-blur-sm border-b z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/sales-history">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Invoice #{transaction.invoiceNumber}</h1>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={handlePrint} size="sm" data-testid="button-print">
                <Printer className="w-4 h-4 mr-2" />
                Print
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" size="sm" data-testid="button-download">
                    <Download className="w-4 h-4 mr-2" />
                    Download
                    <ChevronDown className="w-4 h-4 ml-2" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuItem onClick={handleDownloadPDF} data-testid="download-pdf">
                    📄 Download PDF
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={handleDownloadPNG} data-testid="download-png">
                    🖼️ Download PNG
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="print:shadow-none print:border-none">
          <CardContent className="p-8" id="invoice-print">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-bold text-primary mb-2" data-testid="text-station-name">
                  {transaction.station.name}
                </h1>
                <div className="text-muted-foreground space-y-1">
                  {transaction.station.address && (
                    <p data-testid="text-station-address">{transaction.station.address}</p>
                  )}
                  {transaction.station.contactPhone && (
                    <p data-testid="text-station-phone">Phone: {transaction.station.contactPhone}</p>
                  )}
                  {transaction.station.contactEmail && (
                    <p data-testid="text-station-email">Email: {transaction.station.contactEmail}</p>
                  )}
                  {transaction.station.gstNumber && (
                    <p data-testid="text-station-gst">GST: {transaction.station.gstNumber}</p>
                  )}
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold mb-2">INVOICE</h2>
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">Invoice #:</span> <span data-testid="text-invoice-number">{transaction.invoiceNumber}</span></p>
                  <p><span className="font-semibold">Date:</span> <span data-testid="text-transaction-date">{new Date(transaction.transactionDate || new Date()).toLocaleDateString()}</span></p>
                  {transaction.dueDate && (
                    <p><span className="font-semibold">Due Date:</span> <span data-testid="text-due-date" className={isOverdue ? "text-red-600 font-semibold" : ""}>{new Date(transaction.dueDate).toLocaleDateString()}</span></p>
                  )}
                </div>
              </div>
            </div>

            {/* Status Badges */}
            <div className="flex gap-2 mb-6">
              <Badge variant={isPaid ? "default" : "secondary"} data-testid="badge-payment-status">
                {isPaid ? "PAID" : "UNPAID"}
              </Badge>
              {isOverdue && (
                <Badge variant="destructive" data-testid="badge-overdue">
                  OVERDUE
                </Badge>
              )}
              <Badge variant="outline" data-testid="badge-payment-method">
                {transaction.paymentMethod.toUpperCase()}
              </Badge>
            </div>

            {/* Customer Info */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-lg mb-3">Bill To:</h3>
                <div className="space-y-1">
                  <p className="font-semibold" data-testid="text-customer-name">{transaction.customer.name}</p>
                  {transaction.customer.contactPhone && (
                    <p data-testid="text-customer-phone">Phone: {transaction.customer.contactPhone}</p>
                  )}
                  {transaction.customer.contactEmail && (
                    <p data-testid="text-customer-email">Email: {transaction.customer.contactEmail}</p>
                  )}
                  {transaction.customer.address && (
                    <p data-testid="text-customer-address">{transaction.customer.address}</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-3">Transaction Details:</h3>
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">Cashier:</span> <span data-testid="text-cashier-name">{transaction.user.fullName}</span></p>
                  <p><span className="font-semibold">Currency:</span> <span data-testid="text-currency">{transaction.currencyCode}</span></p>
                  {transaction.notes && (
                    <p><span className="font-semibold">Notes:</span> <span data-testid="text-notes">{transaction.notes}</span></p>
                  )}
                </div>
              </div>
            </div>

            <Separator className="mb-6" />

            {/* Line Items */}
            <div className="mb-8">
              <h3 className="font-semibold text-lg mb-4">Items</h3>
              <div className="border rounded-lg">
                <div className="grid grid-cols-12 gap-4 p-4 bg-muted/50 font-semibold text-sm border-b">
                  <div className="col-span-5">Product</div>
                  <div className="col-span-2 text-right">Quantity</div>
                  <div className="col-span-2 text-right">Unit Price</div>
                  <div className="col-span-3 text-right">Total</div>
                </div>
                {transaction.items.map((item, index) => (
                  <div key={item.id} className="grid grid-cols-12 gap-4 p-4 border-b last:border-b-0" data-testid={`row-item-${index}`}>
                    <div className="col-span-5">
                      <div className="font-semibold" data-testid={`text-product-name-${index}`}>{item.product.name}</div>
                      {item.product.hsnCode && (
                        <div className="text-xs text-muted-foreground" data-testid={`text-hsn-${index}`}>
                          HSN: {item.product.hsnCode}
                        </div>
                      )}
                    </div>
                    <div className="col-span-2 text-right" data-testid={`text-quantity-${index}`}>
                      {parseFloat(item.quantity).toFixed(3)} {item.product.unit}
                    </div>
                    <div className="col-span-2 text-right" data-testid={`text-unit-price-${index}`}>
                      {formatAmount(parseFloat(item.unitPrice), transaction.currencyCode)}
                    </div>
                    <div className="col-span-3 text-right font-semibold" data-testid={`text-total-price-${index}`}>
                      {formatAmount(parseFloat(item.totalPrice), transaction.currencyCode)}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between text-lg font-semibold">
                  <span>Total Amount:</span>
                  <span data-testid="text-total-amount">{formatAmount(parseFloat(transaction.totalAmount ?? '0'), transaction.currencyCode)}</span>
                </div>
                {parseFloat(transaction.paidAmount ?? '0') > 0 && (
                  <div className="flex justify-between text-green-600">
                    <span>Amount Paid:</span>
                    <span data-testid="text-paid-amount">{formatAmount(parseFloat(transaction.paidAmount || '0'), transaction.currencyCode)}</span>
                  </div>
                )}
                {parseFloat(transaction.outstandingAmount ?? '0') > 0 && (
                  <div className="flex justify-between text-red-600 font-semibold">
                    <span>Outstanding:</span>
                    <span data-testid="text-outstanding-amount">{formatAmount(parseFloat(transaction.outstandingAmount ?? '0'), transaction.currencyCode)}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Footer */}
            <Separator className="mb-6" />
            <div className="text-center text-sm text-muted-foreground">
              <p>Thank you for your business!</p>
              {transaction.station.licenseNumber && (
                <p className="mt-1">License: {transaction.station.licenseNumber}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}