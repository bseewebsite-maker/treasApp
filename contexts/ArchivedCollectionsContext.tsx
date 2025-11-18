import React, { createContext, useContext, ReactNode } from 'react';
import { ArchivedCollection } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ArchivedCollectionsContextType {
  archivedCollections: ArchivedCollection[];
  setArchivedCollections: React.Dispatch<React.SetStateAction<ArchivedCollection[]>>;
}

const ArchivedCollectionsContext = createContext<ArchivedCollectionsContextType | undefined>(undefined);

export const ArchivedCollectionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [archivedCollections, setArchivedCollections] = useLocalStorage<ArchivedCollection[]>('archivedCollections', []);

  return (
    <ArchivedCollectionsContext.Provider value={{ archivedCollections, setArchivedCollections }}>
      {children}
    </ArchivedCollectionsContext.Provider>
  );
};

export const useArchivedCollections = (): ArchivedCollectionsContextType => {
  const context = useContext(ArchivedCollectionsContext);
  if (context === undefined) {
    throw new Error('useArchivedCollections must be used within a ArchivedCollectionsProvider');
  }
  return context;
};
