import React, { createContext, useContext, ReactNode } from 'react';
import { Student } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface StudentsContextType {
  students: Student[];
  setStudents: React.Dispatch<React.SetStateAction<Student[]>>;
}

const StudentsContext = createContext<StudentsContextType | undefined>(undefined);

export const StudentsProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [students, setStudents] = useLocalStorage<Student[]>('students', []);

  return (
    <StudentsContext.Provider value={{ students, setStudents }}>
      {children}
    </StudentsContext.Provider>
  );
};

export const useStudents = (): StudentsContextType => {
  const context = useContext(StudentsContext);
  if (context === undefined) {
    throw new Error('useStudents must be used within a StudentsProvider');
  }
  return context;
};
