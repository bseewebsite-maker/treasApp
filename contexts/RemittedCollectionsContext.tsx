import React, { createContext, useContext, ReactNode } from 'react';
import { RemittedCollection } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface RemittedCollectionsContextType {
  remittedCollections: RemittedCollection[];
  setRemittedCollections: React.Dispatch<React.SetStateAction<RemittedCollection[]>>;
}

const RemittedCollectionsContext = createContext<RemittedCollectionsContextType | undefined>(undefined);

export const RemittedCollectionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [remittedCollections, setRemittedCollections] = useLocalStorage<RemittedCollection[]>('remittedCollections', []);

  return (
    <RemittedCollectionsContext.Provider value={{ remittedCollections, setRemittedCollections }}>
      {children}
    </RemittedCollectionsContext.Provider>
  );
};

export const useRemittedCollections = (): RemittedCollectionsContextType => {
  const context = useContext(RemittedCollectionsContext);
  if (context === undefined) {
    throw new Error('useRemittedCollections must be used within a RemittedCollectionsProvider');
  }
  return context;
};
