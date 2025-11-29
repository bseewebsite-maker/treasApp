import React, { createContext, useContext, ReactNode } from 'react';
import { Collection } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface CollectionsContextType {
  collections: Collection[];
  setCollections: React.Dispatch<React.SetStateAction<Collection[]>>;
}

const CollectionsContext = createContext<CollectionsContextType | undefined>(undefined);

export const CollectionsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [collections, setCollections] = useLocalStorage<Collection[]>('collections', []);

  return (
    <CollectionsContext.Provider value={{ collections, setCollections }}>
      {children}
    </CollectionsContext.Provider>
  );
};

export const useCollections = (): CollectionsContextType => {
  const context = useContext(CollectionsContext);
  if (context === undefined) {
    throw new Error('useCollections must be used within a CollectionsProvider');
  }
  return context;
};
