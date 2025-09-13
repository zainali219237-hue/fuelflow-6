import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/queryClient';

// Currency configuration with proper formatting info
export const CURRENCY_CONFIG = {
  PKR: { 
    symbol: 'Rs.', 
    name: 'Pakistani Rupee', 
    locale: 'en-PK',
    code: 'PKR'
  },
  INR: { 
    symbol: '₹', 
    name: 'Indian Rupee', 
    locale: 'en-IN',
    code: 'INR'
  },
  USD: { 
    symbol: '$', 
    name: 'US Dollar', 
    locale: 'en-US',
    code: 'USD'
  },
  EUR: { 
    symbol: '€', 
    name: 'Euro', 
    locale: 'de-DE',
    code: 'EUR'
  },
  GBP: { 
    symbol: '£', 
    name: 'British Pound', 
    locale: 'en-GB',
    code: 'GBP'
  },
  AED: { 
    symbol: 'د.إ', 
    name: 'UAE Dirham', 
    locale: 'ar-AE',
    code: 'AED'
  },
  SAR: { 
    symbol: '﷼', 
    name: 'Saudi Riyal', 
    locale: 'ar-SA',
    code: 'SAR'
  },
  CNY: { 
    symbol: '¥', 
    name: 'Chinese Yuan', 
    locale: 'zh-CN',
    code: 'CNY'
  }
} as const;

export type CurrencyCode = keyof typeof CURRENCY_CONFIG;
export type CurrencyConfig = (typeof CURRENCY_CONFIG)[CurrencyCode];

interface CurrencyContextType {
  currency: CurrencyCode;
  currencyConfig: CurrencyConfig;
  formatCurrency: (amount: number | string, options?: Intl.NumberFormatOptions) => string;
  formatCurrencyCompact: (amount: number | string) => string;
  setCurrency: (currency: CurrencyCode) => void;
  isLoading: boolean;
}

const CurrencyContext = createContext<CurrencyContextType | undefined>(undefined);

export function CurrencyProvider({ children }: { children: ReactNode }) {
  const [currency, setCurrencyState] = useState<CurrencyCode>('PKR'); // Default to Pakistani Rupee
  const [isLoading, setIsLoading] = useState(false);
  const { user } = useAuth();

  // Get station's default currency when user is available
  useEffect(() => {
    const fetchStationCurrency = async () => {
      if (!user?.stationId) return;
      
      setIsLoading(true);
      try {
        const response = await apiRequest('GET', `/api/stations/${user.stationId}`);
        const station = await response.json();
        
        if (station?.defaultCurrency) {
          setCurrencyState(station.defaultCurrency as CurrencyCode);
        }
      } catch (error) {
        console.error('Failed to fetch station currency:', error);
        // Fallback to PKR if station fetch fails
        setCurrencyState('PKR');
      } finally {
        setIsLoading(false);
      }
    };

    fetchStationCurrency();
  }, [user?.stationId]);

  const currencyConfig = CURRENCY_CONFIG[currency];

  const formatCurrency = (
    amount: number | string, 
    options: Intl.NumberFormatOptions = {}
  ): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) return `${currencyConfig.symbol}0`;
    
    const formatter = new Intl.NumberFormat(currencyConfig.locale, {
      style: 'currency',
      currency: currencyConfig.code,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
      ...options
    });

    return formatter.format(numAmount);
  };

  const formatCurrencyCompact = (amount: number | string): string => {
    const numAmount = typeof amount === 'string' ? parseFloat(amount) : amount;
    
    if (isNaN(numAmount)) return `${currencyConfig.symbol}0`;

    // For Pakistani Rupee, show in Lakhs (1L = 100,000)
    if (currency === 'PKR' && numAmount >= 100000) {
      return `${currencyConfig.symbol}${(numAmount / 100000).toFixed(1)}L`;
    }
    
    // For other currencies, use compact notation
    const formatter = new Intl.NumberFormat(currencyConfig.locale, {
      style: 'currency',
      currency: currencyConfig.code,
      notation: 'compact',
      compactDisplay: 'short'
    });

    return formatter.format(numAmount);
  };

  const setCurrency = (newCurrency: CurrencyCode) => {
    setCurrencyState(newCurrency);
    // Note: In a real app, you'd want to update the station's default currency via API
  };

  return (
    <CurrencyContext.Provider
      value={{
        currency,
        currencyConfig,
        formatCurrency,
        formatCurrencyCompact,
        setCurrency,
        isLoading
      }}
    >
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  const context = useContext(CurrencyContext);
  if (context === undefined) {
    throw new Error('useCurrency must be used within a CurrencyProvider');
  }
  return context;
}