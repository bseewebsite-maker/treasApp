import React from 'react';
import { useProfile } from '../contexts/ProfileContext';
import { HistoryIcon, SettingsIcon } from '../components/icons/ExtraIcons';

interface MenuScreenProps {
  onViewArchive: () => void;
  onViewProfile: () => void;
  onViewHistory: () => void;
  onViewSettings: () => void;
}

const MenuScreen: React.FC<MenuScreenProps> = ({ onViewArchive, onViewProfile, onViewHistory, onViewSettings }) => {
  const { profile } = useProfile();

  const DefaultAvatar = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold mb-6 text-gray-900">Menu</h1>
      
      {/* Profile Section */}
      <div onClick={onViewProfile} className="p-4 flex items-center cursor-pointer hover:bg-gray-50 bg-white rounded-lg shadow mb-6">
        <div className="flex-shrink-0 mr-4">
          {profile.avatar ? (
            <img src={profile.avatar} alt="Profile" className="h-16 w-16 rounded-full object-cover" />
          ) : (
            <div className="h-16 w-16 rounded-full bg-gray-200 flex items-center justify-center">
              <DefaultAvatar />
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-bold text-lg text-gray-800">{profile.name}</p>
          <p className="text-sm text-gray-500">{profile.studentId}</p>
        </div>
        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
        </svg>
      </div>
      
      <div className="bg-white rounded-lg shadow">
        <ul className="divide-y divide-gray-200">
           <li onClick={onViewHistory} className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
            <div className="flex items-center">
              <div className="p-2 bg-gray-200 rounded-full mr-4">
                <HistoryIcon />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Payment History</p>
                <p className="text-sm text-gray-500">View a log of all payment activities.</p>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </li>
          <li onClick={onViewArchive} className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
            <div className="flex items-center">
              <div className="p-2 bg-gray-200 rounded-full mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div>
                <p className="font-semibold text-gray-800">Archived Collections</p>
                <p className="text-sm text-gray-500">View and manage archived remittances.</p>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </li>
          <li onClick={onViewSettings} className="p-4 flex justify-between items-center cursor-pointer hover:bg-gray-50">
            <div className="flex items-center">
              <div className="p-2 bg-gray-200 rounded-full mr-4">
                <SettingsIcon />
              </div>
              <div>
                <p className="font-semibold text-gray-800">Settings</p>
                <p className="text-sm text-gray-500">Manage application settings and data.</p>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </li>
        </ul>
      </div>
      
      <div className="text-center py-10 mt-4">
        <p className="text-gray-500">More settings will be available here in the future.</p>
      </div>
      
    </div>
  );
};

export default MenuScreen;