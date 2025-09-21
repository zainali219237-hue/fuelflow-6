
export interface PrintTemplate {
  title: string;
  content: string;
  filename: string;
}

export const generatePrintTemplate = (data: any, type: 'invoice' | 'receipt' | 'statement' | 'expense'): PrintTemplate => {
  const today = new Date().toLocaleDateString();
  
  switch (type) {
    case 'invoice':
      return {
        title: `Sales Invoice ${data.invoiceNumber || data.orderNumber}`,
        filename: `invoice-${data.invoiceNumber || data.orderNumber}`,
        content: `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Sales Invoice ${data.invoiceNumber || data.orderNumber}</title>
              <style>
                @page { margin: 0.5in; size: A4; }
                body { font-family: Arial, sans-serif; line-height: 1.4; color: #000; margin: 0; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .header h1 { color: #2563eb; font-size: 28px; margin: 0; }
                .invoice-meta { text-align: right; margin-top: 10px; }
                .section { margin-bottom: 30px; }
                .items-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .items-table th, .items-table td { padding: 12px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                .items-table th { background: #f9fafb; font-weight: bold; }
                .totals { background: #f9fafb; padding: 20px; border-radius: 8px; margin-top: 20px; }
                .total-row { display: flex; justify-content: space-between; margin-bottom: 10px; }
                .footer { text-align: center; margin-top: 40px; color: #666; font-size: 12px; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${data.stationName || 'FuelFlow Station'}</h1>
                <h2>${data.invoiceNumber ? 'Sales Invoice' : 'Purchase Order'}</h2>
                <div class="invoice-meta">
                  <p><strong>${data.invoiceNumber ? 'Invoice' : 'Order'} #:</strong> ${data.invoiceNumber || data.orderNumber}</p>
                  <p><strong>Date:</strong> ${new Date(data.createdAt || data.orderDate || Date.now()).toLocaleDateString()}</p>
                  <p><strong>${data.customer ? 'Customer' : 'Supplier'}:</strong> ${data.customer?.name || data.supplier?.name || 'Walk-in Customer'}</p>
                </div>
              </div>

              <div class="section">
                <table class="items-table">
                  <thead>
                    <tr>
                      <th>Product</th>
                      <th>Quantity</th>
                      <th>Unit Price</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${data.items?.map(item => `
                      <tr>
                        <td>${item.product?.name || 'Product'}</td>
                        <td>${parseFloat(item.quantity || '0').toFixed(3)} ${item.product?.unit || 'L'}</td>
                        <td>${item.unitPrice || '0.00'}</td>
                        <td>${item.totalPrice || '0.00'}</td>
                      </tr>
                    `).join('') || '<tr><td colspan="4" style="text-align: center;">No items</td></tr>'}
                  </tbody>
                </table>
              </div>

              <div class="totals">
                <div class="total-row">
                  <span>Subtotal:</span>
                  <span>${data.subtotal || '0.00'}</span>
                </div>
                <div class="total-row">
                  <span>Tax:</span>
                  <span>${data.taxAmount || '0.00'}</span>
                </div>
                <div class="total-row">
                  <span><strong>Total Amount:</strong></span>
                  <span><strong>${data.totalAmount || '0.00'}</strong></span>
                </div>
                ${parseFloat(data.outstandingAmount || '0') > 0 ? `
                <div class="total-row" style="color: #dc2626;">
                  <span>Outstanding Amount:</span>
                  <span>${data.outstandingAmount}</span>
                </div>` : ''}
              </div>

              <div class="footer">
                <p>Thank you for your business!</p>
                <p>Generated on ${today}</p>
              </div>
            </body>
          </html>
        `
      };

    case 'expense':
      return {
        title: `Expense Receipt ${data.receiptNumber || data.id}`,
        filename: `expense-${data.receiptNumber || data.id}`,
        content: `
          <!DOCTYPE html>
          <html>
            <head>
              <title>Expense Receipt ${data.receiptNumber || data.id}</title>
              <style>
                @page { margin: 0.5in; size: A4; }
                body { font-family: Arial, sans-serif; line-height: 1.4; color: #000; margin: 0; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .header h1 { color: #2563eb; margin: 0; }
                .expense-details { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${data.stationName || 'FuelFlow Station'}</h1>
                <h2>Expense Receipt</h2>
                <p>Receipt #: ${data.receiptNumber || data.id}</p>
              </div>

              <div class="expense-details">
                <h3>Expense Details</h3>
                <p><strong>Description:</strong> ${data.description || 'N/A'}</p>
                <p><strong>Amount:</strong> ${data.amount || '0.00'}</p>
                <p><strong>Category:</strong> ${data.category || 'N/A'}</p>
                <p><strong>Payment Method:</strong> ${data.paymentMethod || 'N/A'}</p>
                <p><strong>Date:</strong> ${new Date(data.expenseDate || Date.now()).toLocaleDateString()}</p>
                ${data.notes ? `<p><strong>Notes:</strong> ${data.notes}</p>` : ''}
              </div>

              <div class="footer">
                <p>This is a computer-generated receipt from FuelFlow Management System</p>
                <p>Generated on ${today}</p>
              </div>
            </body>
          </html>
        `
      };

    case 'statement':
      return {
        title: `Payment Statement - ${data.entityName}`,
        filename: `statement-${data.entityName?.replace(/[^a-zA-Z0-9]/g, '_')}`,
        content: `
          <!DOCTYPE html>
          <html>
            <head>
              <title>${data.entityType} Statement - ${data.entityName}</title>
              <style>
                @page { margin: 0.5in; size: A4; }
                body { font-family: Arial, sans-serif; line-height: 1.4; color: #000; margin: 0; padding: 20px; }
                .header { text-align: center; margin-bottom: 30px; border-bottom: 2px solid #333; padding-bottom: 20px; }
                .header h1 { color: #2563eb; margin: 0; }
                .entity-info { background: #f9fafb; padding: 15px; border-radius: 8px; margin-bottom: 20px; }
                .payments-table { width: 100%; border-collapse: collapse; margin: 20px 0; }
                .payments-table th, .payments-table td { padding: 12px 8px; text-align: left; border-bottom: 1px solid #e5e7eb; }
                .payments-table th { background: #f3f4f6; font-weight: bold; }
                .payments-table .text-right { text-align: right; }
                .summary { background: #f9fafb; padding: 15px; border-radius: 8px; margin-top: 20px; }
                .footer { text-align: center; margin-top: 30px; padding-top: 15px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #666; }
              </style>
            </head>
            <body>
              <div class="header">
                <h1>${data.stationName || 'FuelFlow Station'}</h1>
                <h2>${data.entityType} Payment Statement</h2>
                <p>Generated on ${data.generatedDate || today}</p>
              </div>

              <div class="entity-info">
                <h3>${data.entityType} Information</h3>
                <p><strong>Name:</strong> ${data.entityName}</p>
                ${data.entity?.contactPhone ? `<p><strong>Phone:</strong> ${data.entity.contactPhone}</p>` : ''}
                ${data.entity?.contactEmail ? `<p><strong>Email:</strong> ${data.entity.contactEmail}</p>` : ''}
                ${data.entity?.gstNumber ? `<p><strong>GST Number:</strong> ${data.entity.gstNumber}</p>` : ''}
                ${data.entity?.address ? `<p><strong>Address:</strong> ${data.entity.address}</p>` : ''}
              </div>

              <h3>Payment History</h3>
              <table class="payments-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th class="text-right">Amount</th>
                    <th>Method</th>
                    <th>Reference</th>
                    <th>Notes</th>
                  </tr>
                </thead>
                <tbody>
                  ${data.payments && data.payments.length > 0 ? data.payments.map(payment => `
                    <tr>
                      <td>${new Date(payment.paymentDate || payment.createdAt).toLocaleDateString()}</td>
                      <td class="text-right">${payment.amount || '0.00'}</td>
                      <td>${payment.paymentMethod || 'N/A'}</td>
                      <td>${payment.referenceNumber || 'N/A'}</td>
                      <td>${payment.notes || ''}</td>
                    </tr>
                  `).join('') : '<tr><td colspan="5" style="text-align: center; color: #666;">No payment history found</td></tr>'}
                </tbody>
              </table>

              <div class="summary">
                <h4>Summary</h4>
                <p><strong>Total Payments:</strong> ${data.totalPayments || '0.00'}</p>
                <p><strong>Outstanding Amount:</strong> ${data.outstandingAmount || '0.00'}</p>
              </div>

              <div class="footer">
                <p>This is a computer-generated statement from FuelFlow Management System</p>
                <p>For any queries regarding this statement, please contact our accounts department</p>
              </div>
            </body>
          </html>
        `
      };

    default:
      return {
        title: 'Document',
        filename: 'document',
        content: '<html><body><h1>Document</h1></body></html>'
      };
  }
};

export const printDocument = (template: PrintTemplate) => {
  const printWindow = window.open('', '_blank');
  if (!printWindow) {
    alert('Please allow popups to print documents');
    return;
  }

  printWindow.document.write(template.content);
  printWindow.document.close();

  printWindow.onload = () => {
    setTimeout(() => {
      printWindow.print();
      printWindow.close();
    }, 500);
  };
};

export const downloadAsPDF = (template: PrintTemplate) => {
  const blob = new Blob([template.content], { type: 'text/html' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${template.filename}.html`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadAsPNG = async (template: PrintTemplate) => {
  try {
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = template.content;
    tempDiv.style.position = 'absolute';
    tempDiv.style.left = '-9999px';
    tempDiv.style.width = '800px';
    tempDiv.style.background = 'white';
    document.body.appendChild(tempDiv);

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = 800;
    canvas.height = 1200;

    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = '#000000';
    ctx.font = '16px Arial';
    ctx.fillText(template.title, 50, 50);

    document.body.removeChild(tempDiv);

    const link = document.createElement('a');
    link.download = `${template.filename}.png`;
    link.href = canvas.toDataURL('image/png');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } catch (error) {
    console.error('PNG download failed:', error);
    alert('PNG download not available. Please use PDF option.');
  }
};
