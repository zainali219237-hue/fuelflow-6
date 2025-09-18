import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from '@/hooks/useAuth';
import { apiRequest } from '@/lib/api';

interface StationSettings {
  stationName: string;
  address: string;
  contactNumber: string;
  email: string;
  gstNumber: string;
  logoUrl?: string;
}

interface StationContextType {
  stationSettings: StationSettings;
  updateStationSettings: (settings: Partial<StationSettings>) => void;
  isLoading: boolean;
}

const defaultSettings: StationSettings = {
  stationName: "FuelFlow Station",
  address: "Main Highway, Lahore",
  contactNumber: "+92-300-1234567",
  email: "station@fuelflow.com",
  gstNumber: "PAK-GST-123456789",
};

const StationContext = createContext<StationContextType | undefined>(undefined);

export function StationProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [stationSettings, setStationSettings] = useState<StationSettings>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  // Load station settings from localStorage and API
  useEffect(() => {
    const loadSettings = async () => {
      try {
        // First load from localStorage for immediate display
        const savedSettings = localStorage.getItem('stationSettings');
        if (savedSettings) {
          const parsed = JSON.parse(savedSettings);
          setStationSettings({ ...defaultSettings, ...parsed });
        }

        // Then load from API if user has station
        if (user?.stationId) {
          try {
            const response = await apiRequest('GET', `/api/stations/${user.stationId}`);
            const stationData = await response.json();
            
            const apiSettings = {
              stationName: stationData.name || defaultSettings.stationName,
              address: stationData.address || defaultSettings.address,
              contactNumber: stationData.contactNumber || defaultSettings.contactNumber,
              email: stationData.email || defaultSettings.email,
              gstNumber: stationData.gstNumber || defaultSettings.gstNumber,
              logoUrl: stationData.logoUrl,
            };
            
            setStationSettings(apiSettings);
            localStorage.setItem('stationSettings', JSON.stringify(apiSettings));
          } catch (error) {
            console.warn('Failed to load station data from API, using cached settings');
          }
        }
      } catch (error) {
        console.error('Failed to load station settings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    loadSettings();
  }, [user?.stationId]);

  const updateStationSettings = (newSettings: Partial<StationSettings>) => {
    const updated = { ...stationSettings, ...newSettings };
    setStationSettings(updated);
    localStorage.setItem('stationSettings', JSON.stringify(updated));
  };

  return (
    <StationContext.Provider value={{ stationSettings, updateStationSettings, isLoading }}>
      {children}
    </StationContext.Provider>
  );
}

export function useStation() {
  const context = useContext(StationContext);
  if (context === undefined) {
    throw new Error('useStation must be used within a StationProvider');
  }
  return context;
}