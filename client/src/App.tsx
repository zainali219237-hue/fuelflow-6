import { Switch, Route } from "wouter";
import { queryClient } from "./lib/queryClient";
import { QueryClientProvider } from "@tanstack/react-query";
import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/hooks/useAuth";
import { CurrencyProvider, useCurrency } from "@/contexts/CurrencyContext";
import { CURRENCY_CONFIG, type CurrencyCode } from "@/lib/currency";
import { apiRequest } from "@/lib/queryClient";
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
import DailyReports from "@/pages/DailyReports";
import AgingReports from "@/pages/AgingReports";
import Settings from "@/pages/Settings";
import AdminPanel from "@/pages/AdminPanel";
import NotFound from "@/pages/not-found";
import { StationProvider } from "./contexts/StationContext";
import PumpManagement from "@/pages/PumpManagement";
import PurchaseInvoice from "@/pages/PurchaseInvoice";
import PaymentHistory from "@/pages/PaymentHistory";
import ApprovalPending from "@/pages/ApprovalPending";
import LoginPage from "@/pages/LoginPage"; // Assuming LoginPage exists
import SignupPage from "@/pages/SignupPage"; // Assuming SignupPage exists

// Global theme initialization to prevent auto-enabling dark mode on Settings page
function ThemeBootstrap() {
  useEffect(() => {
    const savedTheme = localStorage.getItem('theme');
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

    if (savedTheme === 'dark' || (!savedTheme && prefersDark)) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, []);

  return null;
}

// Bootstrap component to handle station currency fetch without circular imports
function CurrencyBootstrap() {
  const { user } = useAuth();
  const currencyContext = useCurrency();
  const { setCurrency } = currencyContext || { setCurrency: () => {} };

  useEffect(() => {
    const fetchStationCurrency = async () => {
      if (!user?.stationId) return;

      // Only fetch from server if no localStorage preference exists
      const savedCurrency = typeof window !== 'undefined' ? localStorage.getItem('selectedCurrency') : null;
      if (savedCurrency && savedCurrency in CURRENCY_CONFIG) {
        return; // Use localStorage preference
      }

      try {
        const response = await apiRequest('GET', `/api/stations/${user.stationId}`);
        const station = await response.json();

        if (station?.defaultCurrency && station.defaultCurrency in CURRENCY_CONFIG) {
          const newCurrency = station.defaultCurrency as CurrencyCode;
          setCurrency(newCurrency);
        }
      } catch (error) {
        console.error('Failed to fetch station currency:', error);
        // Fallback is already handled by CurrencyProvider default
      }
    };

    fetchStationCurrency();
  }, [user?.stationId, setCurrency]);

  return null;
}

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
      <Route path="/purchase-invoice/:id" component={PurchaseInvoice} />
      <Route path="/payment-history/:id/:type" component={() => import("@/pages/PaymentHistory").then(m => m.default)} />
      <Route path="/tanks" component={TankMonitoring} />
      <Route path="/pumps" component={PumpManagement} />
      <Route path="/daily-reports" component={DailyReports} />
      <Route path="/aging-reports" component={AgingReports} />
      <Route path="/settings" component={Settings} />
      <Route path="/admin" component={AdminPanel} />
      <Route path="/approval-pending" component={() => import("@/pages/ApprovalPending")} />
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CurrencyProvider>
          <StationProvider>
            <ThemeBootstrap />
            <CurrencyBootstrap />
            <TooltipProvider>
              <Toaster />
              <AuthGuard>
                <Router />
              </AuthGuard>
            </TooltipProvider>
          </StationProvider>
        </CurrencyProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;