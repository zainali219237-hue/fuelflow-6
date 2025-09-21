import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Route, Switch } from "wouter";
import AuthGuard from "./components/layout/AuthGuard";
import { Toaster } from "./components/ui/toaster";
import { TooltipProvider } from "./components/ui/tooltip";
import { CurrencyProvider } from "./contexts/CurrencyContext";
import { StationProvider } from "./contexts/StationContext";
import "./index.css";
import { queryClient } from "./lib/queryClient";

// Import all pages
import AccountsPayable from "./pages/AccountsPayable";
import AccountsReceivable from "./pages/AccountsReceivable";
import AdminPanel from "./pages/AdminPanel";
import AgingReports from "./pages/AgingReports";
import CashReconciliation from "./pages/CashReconciliation";
import CustomerManagement from "./pages/CustomerManagement";
import DailyReports from "./pages/DailyReports";
import Dashboard from "./pages/Dashboard";
import ExpenseManagement from "./pages/ExpenseManagement";
import FinancialReports from "./pages/FinancialReports";
import InvoiceReceipt from "./pages/InvoiceReceipt";
import PaymentHistory from "./pages/PaymentHistory";
import PointOfSale from "./pages/PointOfSale";
import PriceManagement from "./pages/PriceManagement";
import PumpManagement from "./pages/PumpManagement";
import PurchaseInvoice from "./pages/PurchaseInvoice";
import PurchaseOrders from "./pages/PurchaseOrders";
import SalesHistory from "./pages/SalesHistory";
import Settings from "./pages/Settings";
import StockManagement from "./pages/StockManagement";
import SupplierManagement from "./pages/SupplierManagement";
import TankMonitoring from "./pages/TankMonitoring";
import NotFound from "./pages/not-found";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <CurrencyProvider>
        <StationProvider>
          <TooltipProvider>
            <AuthGuard>
              <div className="min-h-screen bg-background">
                <Switch>
                  {/* Public Routes */}
                  <Route path="/" component={Dashboard} />
                  <Route path="/dashboard" component={Dashboard} />

                  {/* Sales Routes */}
                  <Route path="/pos" component={PointOfSale} />
                  <Route path="/sales-history" component={SalesHistory} />
                  <Route path="/invoice-receipt" component={InvoiceReceipt} />

                  {/* Purchase Routes */}
                  <Route path="/purchase-orders" component={PurchaseOrders} />
                  <Route path="/purchase-invoice" component={PurchaseInvoice} />

                  {/* Inventory Routes */}
                  <Route path="/tank-monitoring" component={TankMonitoring} />
                  <Route path="/stock-management" component={StockManagement} />
                  <Route path="/pump-management" component={PumpManagement} />

                  {/* Customer/Supplier Routes */}
                  <Route path="/customers" component={CustomerManagement} />
                  <Route path="/suppliers" component={SupplierManagement} />

                  {/* Financial Routes */}
                  <Route path="/accounts-receivable" component={AccountsReceivable} />
                  <Route path="/accounts-payable" component={AccountsPayable} />
                  <Route path="/payment-history" component={PaymentHistory} />
                  <Route path="/expense-management" component={ExpenseManagement} />
                  <Route path="/cash-reconciliation" component={CashReconciliation} />

                  {/* Reports Routes */}
                  <Route path="/daily-reports" component={DailyReports} />
                  <Route path="/financial-reports" component={FinancialReports} />
                  <Route path="/aging-reports" component={AgingReports} />

                  {/* Management Routes */}
                  <Route path="/price-management" component={PriceManagement} />
                  <Route path="/settings" component={Settings} />
                  <Route path="/admin" component={AdminPanel} />

                  {/* 404 Route */}
                  <Route component={NotFound} />
                </Switch>
              </div>
            </AuthGuard>
            <Toaster />
          </TooltipProvider>
        </StationProvider>
      </CurrencyProvider>
    </QueryClientProvider>
  );
}

export default App;