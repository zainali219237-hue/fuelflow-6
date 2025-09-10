import { useState, useEffect } from "react";
import LoginForm from "@/components/auth/LoginForm";
import Sidebar from "@/components/layout/Sidebar";
import Header from "@/components/layout/Header";
import { useAuth } from "@/hooks/useAuth";

interface AuthGuardProps {
  children: React.ReactNode;
}

export default function AuthGuard({ children }: AuthGuardProps) {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <LoginForm />;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <div className="ml-64 min-h-screen">
        <Header />
        <main className="p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
