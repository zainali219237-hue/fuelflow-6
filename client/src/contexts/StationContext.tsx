
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api';

export interface StationProfile {
  id: string;
  name: string;
  address: string;
  phone: string;
  email: string;
  registrationNumber: string;
  taxNumber: string;
  logo?: string;
}

interface StationContextType {
  station: StationProfile | null;
  updateStation: (station: Partial<StationProfile>) => Promise<void>;
  isLoading: boolean;
}

const StationContext = createContext<StationContextType>({
  station: null,
  updateStation: async () => {},
  isLoading: true,
});

export const useStation = () => {
  const context = useContext(StationContext);
  if (!context) {
    throw new Error('useStation must be used within a StationProvider');
  }
  return context;
};

interface StationProviderProps {
  children: ReactNode;
}

export const StationProvider: React.FC<StationProviderProps> = ({ children }) => {
  const { user } = useAuth();
  const [station, setStation] = useState<StationProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchStationDetails = async () => {
      if (user?.stationId) {
        try {
          const response = await apiRequest('GET', `/api/stations/${user.stationId}`);
          if (response.ok) {
            const stationData = await response.json();
            setStation({
              id: stationData.id,
              name: stationData.name,
              address: stationData.address || 'Station Address',
              phone: stationData.phone || '+92-XXX-XXXXXXX',
              email: stationData.email || 'station@fuelflow.com',
              registrationNumber: stationData.registrationNumber || 'REG-001',
              taxNumber: stationData.taxNumber || 'TAX-001',
              logo: stationData.logo,
            });
          }
        } catch (error) {
          console.error('Failed to fetch station details:', error);
          // Set default station details if fetch fails
          setStation({
            id: user.stationId,
            name: 'FuelFlow Station',
            address: 'Station Address',
            phone: '+92-XXX-XXXXXXX',
            email: 'station@fuelflow.com',
            registrationNumber: 'REG-001',
            taxNumber: 'TAX-001',
          });
        }
      }
      setIsLoading(false);
    };

    fetchStationDetails();
  }, [user?.stationId]);

  const updateStation = async (updates: Partial<StationProfile>) => {
    if (!station || !user?.stationId) return;

    try {
      const response = await apiRequest('PUT', `/api/stations/${user.stationId}`, updates);
      if (response.ok) {
        const updatedStation = await response.json();
        setStation(prev => prev ? { ...prev, ...updatedStation } : null);
      }
    } catch (error) {
      console.error('Failed to update station:', error);
      throw error;
    }
  };

  return (
    <StationContext.Provider value={{ station, updateStation, isLoading }}>
      {children}
    </StationContext.Provider>
  );
};
