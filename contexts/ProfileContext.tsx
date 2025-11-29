import React, { createContext, useContext, ReactNode } from 'react';
import { TreasurerProfile } from '../types';
import { useLocalStorage } from '../hooks/useLocalStorage';

interface ProfileContextType {
  profile: TreasurerProfile;
  setProfile: React.Dispatch<React.SetStateAction<TreasurerProfile>>;
}

const ProfileContext = createContext<ProfileContextType | undefined>(undefined);

// Default values to show in the UI before the user edits them.
const defaultProfile: TreasurerProfile = {
  name: "Treasurer Name",
  studentId: 'Student ID',
  avatar: '', 
};


export const ProfileProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [profile, setProfile] = useLocalStorage<TreasurerProfile>('treasurerProfile', defaultProfile);

  return (
    <ProfileContext.Provider value={{ profile, setProfile }}>
      {children}
    </ProfileContext.Provider>
  );
};

export const useProfile = (): ProfileContextType => {
  const context = useContext(ProfileContext);
  if (context === undefined) {
    throw new Error('useProfile must be used within a ProfileProvider');
  }
  return context;
};
