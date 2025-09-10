import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { apiRequest } from "@/lib/api";

interface User {
  id: string;
  username: string;
  fullName: string;
  role: string;
  stationId?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<void>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    // Check for stored user data on app load
    const storedUser = localStorage.getItem("fuelflow_user");
    if (storedUser) {
      setUser(JSON.parse(storedUser));
    }
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const response = await apiRequest("POST", "/api/auth/login", { username, password });
      const data = await response.json();
      
      setUser(data.user);
      localStorage.setItem("fuelflow_user", JSON.stringify(data.user));
    } catch (error) {
      throw new Error("Login failed");
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem("fuelflow_user");
  };

  const isAuthenticated = !!user;

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
