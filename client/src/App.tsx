import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/hooks/useAuth";
import { CurrencyProvider } from "@/contexts/CurrencyContext";
import AuthGuard from "@/components/layout/AuthGuard";
import Dashboard from "@/pages/Dashboard";
import PointOfSale from "@/pages/PointOfSale";
import CustomerManagement from "@/pages/CustomerManagement";
import StockManagement from "@/pages/StockManagement";
import FinancialReports from "@/pages/FinancialReports";
import SalesHistory from "@/pages/SalesHistory";
import PurchaseOrders from "@/pages/PurchaseOrders";
import AccountsReceivable from "@/pages/AccountsReceivable";
import AccountsPayable from "@/pages/AccountsPayable";
import CashReconciliation from "@/pages/CashReconciliation";
import ExpenseManagement from "@/pages/ExpenseManagement";
import SupplierManagement from "@/pages/SupplierManagement";
import PriceManagement from "@/pages/PriceManagement";
import InvoiceReceipt from "@/pages/InvoiceReceipt";
import TankMonitoring from "@/pages/TankMonitoring";
import NotFound from "@/pages/not-found";

function Router() {
  return (
    <Switch>
      <Route path="/" component={Dashboard} />
      <Route path="/pos" component={PointOfSale} />
      <Route path="/sales-history" component={SalesHistory} />
      <Route path="/customers" component={CustomerManagement} />
      <Route path="/stock" component={StockManagement} />
      <Route path="/purchase-orders" component={PurchaseOrders} />
      <Route path="/accounts-receivable" component={AccountsReceivable} />
      <Route path="/accounts-payable" component={AccountsPayable} />
      <Route path="/cash-reconciliation" component={CashReconciliation} />
      <Route path="/expenses" component={ExpenseManagement} />
      <Route path="/suppliers" component={SupplierManagement} />
      <Route path="/pricing" component={PriceManagement} />
      <Route path="/financial-reports" component={FinancialReports} />
      <Route path="/invoice/:id" component={InvoiceReceipt} />
      <Route path="/tank-monitoring" component={TankMonitoring} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CurrencyProvider>
          <TooltipProvider>
            <Toaster />
            <AuthGuard>
              <Router />
            </AuthGuard>
          </TooltipProvider>
        </CurrencyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
