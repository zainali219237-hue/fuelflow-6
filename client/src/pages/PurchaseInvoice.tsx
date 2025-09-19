
import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/hooks/useAuth";
import { formatAmount } from "@/lib/currency";
import { Printer, Download, ArrowLeft, ChevronDown } from "lucide-react";
import { Link } from "wouter";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import type { PurchaseOrder, Supplier, Station, User } from "@shared/schema";

interface PurchaseOrderWithDetails extends PurchaseOrder {
  supplier: Supplier;
  user: User;
  station: Station;
}

export default function PurchaseInvoice() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();

  const { data: order, isLoading } = useQuery<PurchaseOrderWithDetails>({
    queryKey: ["/api/purchase-orders/detail", id!],
    enabled: !!id && !!user?.stationId,
  });

  const handlePrint = () => {
    setTimeout(() => {
      window.print();
    }, 100);
  };

  const handleDownloadPDF = async () => {
    const invoiceElement = document.getElementById('purchase-invoice-print');
    if (!invoiceElement) return;

    try {
      const printWindow = window.open('', '_blank', 'width=800,height=600');
      if (!printWindow) return;

      const clonedContent = invoiceElement.cloneNode(true) as HTMLElement;
      
      const htmlContent = `
        <!DOCTYPE html>
        <html>
          <head>
            <title>Purchase Order ${order?.orderNumber || 'Unknown'}</title>
            <style>
              @page { margin: 0.5in; size: A4; }
              body { font-family: Arial, sans-serif; line-height: 1.4; color: #000; margin: 0; padding: 20px; }
              .container { max-width: 800px; margin: 0 auto; }
              .header { text-align: center; margin-bottom: 30px; }
              .order-title { font-size: 28px; font-weight: bold; margin-bottom: 10px; }
              .station-info { font-size: 14px; margin-bottom: 20px; }
              .order-details { display: flex; justify-content: space-between; margin-bottom: 30px; }
              .supplier-to, .order-meta { font-size: 14px; }
              .order-meta { text-align: right; }
              .total-row { background-color: #f9f9f9; font-weight: bold; }
              .payment-status { background: #16a34a; color: white; padding: 4px 12px; border-radius: 4px; display: inline-block; margin: 10px 0; }
            </style>
          </head>
          <body>
            ${clonedContent.innerHTML}
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

      setTimeout(() => {
        if (printWindow && !printWindow.closed) {
          printWindow.print();
          printWindow.close();
        }
      }, 1000);

    } catch (error) {
      console.error('PDF download failed:', error);
      handlePrint();
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

  if (!order) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="text-center p-6">
            <h2 className="text-2xl font-bold mb-2">Purchase Order Not Found</h2>
            <p className="text-muted-foreground mb-4">
              The requested purchase order could not be found.
            </p>
            <Link href="/purchase-orders">
              <Button>
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Purchase Orders
              </Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Print/Download Actions - Hidden when printing */}
      <div className="print:hidden sticky top-0 bg-background/80 backdrop-blur-sm border-b z-10">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Link href="/purchase-orders">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              </Link>
              <h1 className="text-2xl font-bold">Purchase Order #{order.orderNumber}</h1>
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
            </div>
          </div>
        </div>
      </div>

      {/* Invoice Content */}
      <div className="container mx-auto px-6 py-8 max-w-4xl">
        <Card className="print:shadow-none print:border-none">
          <CardContent className="p-8" id="purchase-invoice-print">
            {/* Header */}
            <div className="flex justify-between items-start mb-8">
              <div>
                <h1 className="text-4xl font-bold text-primary mb-2">
                  {order.station?.name || "Station Name"}
                </h1>
                <div className="text-muted-foreground space-y-1">
                  <p>Purchase Order Invoice</p>
                </div>
              </div>
              <div className="text-right">
                <h2 className="text-3xl font-bold mb-2">PURCHASE ORDER</h2>
                <div className="space-y-1 text-sm">
                  <p><span className="font-semibold">PO #:</span> {order.orderNumber}</p>
                  <p><span className="font-semibold">Date:</span> {new Date(order.orderDate || new Date()).toLocaleDateString()}</p>
                  {order.expectedDeliveryDate && (
                    <p><span className="font-semibold">Expected Delivery:</span> {new Date(order.expectedDeliveryDate).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Status Badge */}
            <div className="flex gap-2 mb-6">
              <Badge variant="outline">
                {order.status?.toUpperCase()}
              </Badge>
            </div>

            {/* Supplier Info */}
            <div className="grid md:grid-cols-2 gap-8 mb-8">
              <div>
                <h3 className="font-semibold text-lg mb-3">Supplier:</h3>
                <div className="space-y-1">
                  <p className="font-semibold">{order.supplier?.name}</p>
                  {order.supplier?.contactPerson && (
                    <p>Contact: {order.supplier.contactPerson}</p>
                  )}
                  {order.supplier?.contactPhone && (
                    <p>Phone: {order.supplier.contactPhone}</p>
                  )}
                  {order.supplier?.contactEmail && (
                    <p>Email: {order.supplier.contactEmail}</p>
                  )}
                </div>
              </div>
              <div>
                <h3 className="font-semibold text-lg mb-3">Order Details:</h3>
                <div className="space-y-1 text-sm">
                  {order.notes && (
                    <p><span className="font-semibold">Notes:</span> {order.notes}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Totals */}
            <div className="flex justify-end mb-8">
              <div className="w-full max-w-sm space-y-2">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>{formatAmount(parseFloat(order.subtotal || '0'), order.currencyCode || 'PKR')}</span>
                </div>
                {parseFloat(order.taxAmount || '0') > 0 && (
                  <div className="flex justify-between">
                    <span>Tax:</span>
                    <span>{formatAmount(parseFloat(order.taxAmount || '0'), order.currencyCode || 'PKR')}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-semibold border-t pt-2">
                  <span>Total Amount:</span>
                  <span>{formatAmount(parseFloat(order.totalAmount || '0'), order.currencyCode || 'PKR')}</span>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="border-t pt-4 text-center text-sm text-muted-foreground">
              <p>Purchase Order generated on {new Date().toLocaleDateString()}</p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
