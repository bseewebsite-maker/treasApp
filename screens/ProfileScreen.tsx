import React, { useState, useRef, useEffect } from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { TreasurerProfile } from '../types';

interface ProfileScreenProps {
  onBack: () => void;
}

const ProfileScreen: React.FC<ProfileScreenProps> = ({ onBack }) => {
  const { profile, setProfile } = useProfile();
  const [name, setName] = useState(profile.name);
  const [studentId, setStudentId] = useState(profile.studentId);
  const [avatar, setAvatar] = useState(profile.avatar);
  const [isSaving, setIsSaving] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setName(profile.name);
    setStudentId(profile.studentId);
    setAvatar(profile.avatar);
  }, [profile]);

  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setAvatar(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSave = () => {
    setIsSaving(true);
    const updatedProfile: TreasurerProfile = {
      name: name.trim(),
      studentId: studentId.trim(),
      avatar,
    };
    setProfile(updatedProfile);
    
    setTimeout(() => {
      setIsSaving(false);
      onBack();
    }, 500);
  };
  
  const isFormValid = name.trim() && studentId.trim();

  const DefaultAvatar = () => (
    <div className="h-32 w-32 rounded-full bg-gray-200 flex items-center justify-center text-gray-400 ring-4 ring-white shadow-lg">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
          <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
    </div>
  );

  return (
    <div className="flex flex-col h-screen bg-gray-50">
      <header className="bg-white shadow-sm p-4 flex items-center z-20">
        <button onClick={onBack} className="mr-4 text-gray-600 hover:text-blue-500">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <h1 className="text-xl font-bold text-gray-900">Edit Profile</h1>
      </header>
      
      <main className="flex-1 overflow-y-auto p-6">
        <div className="flex flex-col items-center mb-8">
          <div className="relative cursor-pointer" onClick={handleAvatarClick}>
            {avatar ? (
              <img src={avatar} alt="Profile" className="h-32 w-32 rounded-full object-cover ring-4 ring-white shadow-lg" />
            ) : (
              <DefaultAvatar />
            )}
            <div className="absolute bottom-0 right-0 bg-blue-500 rounded-full p-2 border-2 border-white">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
              </svg>
            </div>
          </div>
          <input
            type="file"
            accept="image/*"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        <div className="space-y-6">
          <div>
            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
            <input
              type="text"
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g. Juan Dela Cruz"
            />
          </div>
          <div>
            <label htmlFor="studentId" className="block text-sm font-medium text-gray-700">Student ID</label>
            <input
              type="text"
              id="studentId"
              value={studentId}
              onChange={(e) => setStudentId(e.target.value)}
              className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="e.g. 2024-0001"
            />
          </div>
        </div>
      </main>

      <footer className="p-4 bg-white border-t border-gray-200">
        <button
          onClick={handleSave}
          disabled={!isFormValid || isSaving}
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 disabled:bg-blue-300 disabled:cursor-not-allowed transition-colors"
        >
          {isSaving ? 'Saving...' : 'Save Profile'}
        </button>
      </footer>
    </div>
  );
};

export default ProfileScreen;
