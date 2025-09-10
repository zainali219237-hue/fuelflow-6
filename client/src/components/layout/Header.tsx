import { useLocation } from "wouter";

const pageTitles: Record<string, string> = {
  "/": "Dashboard",
  "/pos": "Point of Sale",
  "/sales-history": "Sales History",
  "/customers": "Customer Account Management",
  "/stock": "Stock & Inventory Management",
  "/purchase-orders": "Purchase Orders",
  "/accounts-receivable": "Accounts Receivable",
  "/accounts-payable": "Accounts Payable",
  "/cash-reconciliation": "Cash Reconciliation",
  "/expenses": "Expense Management",
  "/suppliers": "Supplier Management",
  "/pricing": "Price Management",
  "/financial-reports": "Financial Reports",
};

export default function Header() {
  const [location] = useLocation();
  const currentDate = new Date().toLocaleDateString('en-IN', { 
    day: 'numeric', 
    month: 'short', 
    year: 'numeric' 
  });

  return (
    <header className="bg-card shadow-sm border-b border-border px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <div>
            <h2 className="text-xl font-semibold text-card-foreground" data-testid="page-title">
              {pageTitles[location] || "Dashboard"}
            </h2>
            <p className="text-sm text-muted-foreground">Comprehensive Petrol Pump Management</p>
          </div>
        </div>
        <div className="flex items-center space-x-6">
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Current Date</div>
            <div className="font-medium text-card-foreground" data-testid="current-date">{currentDate}</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Shift</div>
            <div className="font-medium text-card-foreground" data-testid="current-shift">Day Shift</div>
          </div>
          <div className="text-right">
            <div className="text-xs text-muted-foreground">Till Status</div>
            <div className="font-medium text-green-600" data-testid="till-status">Open</div>
          </div>
        </div>
      </div>
    </header>
  );
}
