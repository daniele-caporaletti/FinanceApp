
import React, { createContext, useContext, useState, useCallback } from 'react';
import { AppSection } from './types';

interface NavigationContextType {
  currentSection: AppSection;
  navigationParams: any;
  navigateTo: (section: AppSection, params?: any) => void;
}

const NavigationContext = createContext<NavigationContextType | undefined>(undefined);

export const NavigationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentSection, setCurrentSection] = useState<AppSection>(AppSection.Dashboard);
  const [navigationParams, setNavigationParams] = useState<any>(null);

  const navigateTo = useCallback((section: AppSection, params?: any) => {
    setNavigationParams(params || null);
    setCurrentSection(section);
  }, []);

  return (
    <NavigationContext.Provider value={{ currentSection, navigationParams, navigateTo }}>
      {children}
    </NavigationContext.Provider>
  );
};

export const useNavigation = () => {
  const context = useContext(NavigationContext);
  if (!context) {
    throw new Error('useNavigation must be used within a NavigationProvider');
  }
  return context;
};
