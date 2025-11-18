import React, { createContext, useContext, ReactNode } from 'react';
import { HistoryEntry } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface HistoryContextType {
  history: HistoryEntry[];
  addHistoryEntry: (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => void;
  setHistory: React.Dispatch<React.SetStateAction<HistoryEntry[]>>;
}

const HistoryContext = createContext<HistoryContextType | undefined>(undefined);

export const HistoryProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [history, setHistory] = useLocalStorage<HistoryEntry[]>('paymentHistory', []);

  const addHistoryEntry = (entry: Omit<HistoryEntry, 'id' | 'timestamp'>) => {
    const newEntry: HistoryEntry = {
      ...entry,
      id: crypto.randomUUID(),
      timestamp: new Date().toISOString(),
    };
    // Prepend to keep the list sorted with the newest first
    setHistory(prev => [newEntry, ...prev]);
  };

  return (
    <HistoryContext.Provider value={{ history, addHistoryEntry, setHistory }}>
      {children}
    </HistoryContext.Provider>
  );
};

export const useHistory = (): HistoryContextType => {
  const context = useContext(HistoryContext);
  if (context === undefined) {
    throw new Error('useHistory must be used within a HistoryProvider');
  }
  return context;
};