import { Link, useLocation } from "wouter";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/useAuth";

const navigationItems = [
  {
    label: "Overview",
    items: [
      { name: "Dashboard", path: "/", icon: "📊" },
    ]
  },
  {
    label: "Sales & Transactions",
    items: [
      { name: "Point of Sale", path: "/pos", icon: "🛒" },
      { name: "Sales History", path: "/sales-history", icon: "📋" },
      { name: "Receipts & Invoices", path: "/receipts", icon: "🧾" },
    ]
  },
  {
    label: "Inventory",
    items: [
      { name: "Stock Management", path: "/stock", icon: "🛢️" },
      { name: "Tank Monitoring", path: "/tanks", icon: "⛽" },
      { name: "Purchase Orders", path: "/purchase-orders", icon: "📦" },
    ]
  },
  {
    label: "Accounting",
    items: [
      { name: "Accounts Receivable", path: "/accounts-receivable", icon: "💰" },
      { name: "Accounts Payable", path: "/accounts-payable", icon: "💸" },
      { name: "Cash Reconciliation", path: "/cash-reconciliation", icon: "🔄" },
      { name: "Expense Management", path: "/expenses", icon: "💳" },
    ]
  },
  {
    label: "Relationships",
    items: [
      { name: "Customer Accounts", path: "/customers", icon: "👥" },
      { name: "Supplier Management", path: "/suppliers", icon: "🏭" },
      { name: "Price Management", path: "/pricing", icon: "🏷️" },
    ]
  },
  {
    label: "Financial Reports",
    items: [
      { name: "Financial Statements", path: "/financial-reports", icon: "📊" },
      { name: "Daily Reports", path: "/daily-reports", icon: "📅" },
      { name: "Aging Reports", path: "/aging-reports", icon: "⏰" },
    ]
  }
];

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();

  return (
    <div className="sidebar-transition fixed left-0 top-0 h-full w-64 bg-card border-r border-border z-40">
      <div className="p-6 border-b border-border">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-lg flex items-center justify-center text-primary-foreground font-bold text-lg">
            ⛽
          </div>
          <div>
            <h1 className="text-lg font-bold text-card-foreground" data-testid="app-title">FuelFlow</h1>
            <p className="text-xs text-muted-foreground" data-testid="current-station">Main Station</p>
          </div>
        </div>
      </div>
      
      <nav className="mt-4 h-[calc(100vh-180px)] overflow-y-auto">
        {navigationItems.map((section) => (
          <div key={section.label}>
            <div className="px-4 mb-3 mt-6">
              <div className="text-xs text-muted-foreground uppercase tracking-wider font-medium">
                {section.label}
              </div>
            </div>
            {section.items.map((item) => (
              <Link
                key={item.path}
                href={item.path}
                className={cn(
                  "flex items-center px-4 py-2.5 text-muted-foreground hover:bg-accent hover:text-accent-foreground rounded-md mx-2 mb-1 transition-colors",
                  location === item.path && "bg-accent text-accent-foreground"
                )}
                data-testid={`nav-link-${item.name.toLowerCase().replace(/\s+/g, '-')}`}
              >
                <span className="mr-3 text-base">{item.icon}</span>
                {item.name}
              </Link>
            ))}
          </div>
        ))}
      </nav>
      
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-border bg-card">
        <div className="flex items-center space-x-3">
          <div className="w-10 h-10 bg-primary rounded-full flex items-center justify-center text-sm font-bold text-primary-foreground">
            <span data-testid="user-initials">{user?.fullName?.charAt(0) || "U"}</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-sm font-medium text-card-foreground truncate" data-testid="current-user">
              {user?.fullName || "User"}
            </div>
            <div className="text-xs text-muted-foreground" data-testid="current-role">
              {user?.role || "User"}
            </div>
          </div>
          <button 
            onClick={logout} 
            className="text-muted-foreground hover:text-destructive transition-colors p-1"
            data-testid="button-logout"
          >
            <span className="text-base">🚪</span>
          </button>
        </div>
      </div>
    </div>
  );
}
