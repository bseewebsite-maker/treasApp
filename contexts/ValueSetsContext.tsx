import React, { createContext, useContext, ReactNode } from 'react';
import { ValueSet } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ValueSetsContextType {
  valueSets: ValueSet[];
  setValueSets: React.Dispatch<React.SetStateAction<ValueSet[]>>;
}

const ValueSetsContext = createContext<ValueSetsContextType | undefined>(undefined);

export const ValueSetsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [valueSets, setValueSets] = useLocalStorage<ValueSet[]>('valueSets', []);

  return (
    <ValueSetsContext.Provider value={{ valueSets, setValueSets }}>
      {children}
    </ValueSetsContext.Provider>
  );
};

export const useValueSets = (): ValueSetsContextType => {
  const context = useContext(ValueSetsContext);
  if (context === undefined) {
    throw new Error('useValueSets must be used within a ValueSetsProvider');
  }
  return context;
};
