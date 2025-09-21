import { useState, useEffect } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";
import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLocation } from "wouter";
import ApprovalPending from "@/pages/ApprovalPending";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, loading } = useAuth();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [location] = useLocation();

  // Check if current route is public (doesn't require authentication)
  const isPublicRoute = ['/login', '/signup', '/approval-pending'].includes(location);

  // Show loading state while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-pulse text-center">
          <div className="text-lg font-medium text-gray-600">Loading...</div>
        </div>
      </div>
    );
  }

  // If no user and not on a public route, show login
  if (!user && !isPublicRoute) {
    return <LoginForm />;
  }

  // If user exists but not approved, show approval pending
  if (user && !user.isActive && !isPublicRoute) {
    return <ApprovalPending userEmail={user.username} userName={user.fullName} />;
  }

  // If on public routes, render them directly
  if (isPublicRoute) {
    return <>{children}</>;
  }

  // Authenticated user - show main app layout
  return (
    <div className="min-h-screen bg-background">
      <div className="flex">
        <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
        <div className="flex-1 flex flex-col min-h-screen">
          <Header>
            <Button
              variant="ghost"
              size="sm"
              className="lg:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu className="h-6 w-6" />
            </Button>
          </Header>
          <main className="flex-1 overflow-auto">
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}