import React, { createContext, useContext, useState, ReactNode } from 'react';

interface LayoutContextType {
  hideSidebar: boolean;
  hideHeader: boolean;
  hideFooter: boolean;
  setHideSidebar: (hide: boolean) => void;
  setHideHeader: (hide: boolean) => void;
  setHideFooter: (hide: boolean) => void;
  setAllHidden: (hide: boolean) => void;
}

const LayoutContext = createContext<LayoutContextType | undefined>(undefined);

interface LayoutProviderProps {
  children: ReactNode;
}

export const LayoutProvider: React.FC<LayoutProviderProps> = ({ children }) => {
  const [hideSidebar, setHideSidebar] = useState(false);
  const [hideHeader, setHideHeader] = useState(false);
  const [hideFooter, setHideFooter] = useState(false);

  const setAllHidden = (hide: boolean) => {
    setHideSidebar(hide);
    setHideHeader(hide);
    setHideFooter(hide);
  };

  const value: LayoutContextType = {
    hideSidebar,
    hideHeader,
    hideFooter,
    setHideSidebar,
    setHideHeader,
    setHideFooter,
    setAllHidden,
  };

  return (
    <LayoutContext.Provider value={value}>
      {children}
    </LayoutContext.Provider>
  );
};

export const useLayout = () => {
  const context = useContext(LayoutContext);
  if (context === undefined) {
    throw new Error('useLayout must be used within a LayoutProvider');
  }
  return context;
};
