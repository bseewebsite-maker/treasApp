import React, { useState, useEffect } from 'react';
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
    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white/50" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="1">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );

  return (
    <div className="p-4 pb-24">
      <h1 className="text-3xl font-extrabold mb-6 text-slate-900 tracking-tight">Menu</h1>
      
      {/* Profile Section */}
      <div 
        onClick={onViewProfile} 
        className="relative overflow-hidden p-6 mb-8 cursor-pointer rounded-3xl shadow-lg shadow-blue-500/20 group"
      >
        {/* Background Gradient */}
        <div className="absolute inset-0 bg-gradient-to-br from-blue-600 to-indigo-700 transition-transform duration-500 group-hover:scale-105"></div>
        <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
        
        <div className="relative z-10 flex items-center">
            <div className="flex-shrink-0 mr-5">
            {profile.avatar ? (
                <img src={profile.avatar} alt="Profile" className="h-20 w-20 rounded-full object-cover border-4 border-white/20 shadow-md" />
            ) : (
                <div className="h-20 w-20 rounded-full bg-white/20 flex items-center justify-center border-4 border-white/10 backdrop-blur-sm">
                <DefaultAvatar />
                </div>
            )}
            </div>
            <div className="flex-1 min-w-0">
            <p className="text-2xl font-bold text-white truncate">{profile.name}</p>
            <p className="text-blue-100 text-sm opacity-90 truncate">{profile.studentId}</p>
            <div className="mt-3 inline-flex items-center px-3 py-1 rounded-full bg-white/20 backdrop-blur-md text-white text-xs font-medium border border-white/10 group-hover:bg-white/30 transition-colors">
                Edit Profile
                <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
            </div>
            </div>
        </div>
      </div>
      
      <div className="space-y-4">
           <button onClick={onViewHistory} className="w-full p-4 flex justify-between items-center bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.98]">
            <div className="flex items-center">
              <div className="p-3 bg-indigo-50 text-indigo-600 rounded-xl mr-4">
                <HistoryIcon />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800">Payment History</p>
                <p className="text-xs text-slate-500 mt-0.5">View log of activities</p>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button onClick={onViewArchive} className="w-full p-4 flex justify-between items-center bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.98]">
            <div className="flex items-center">
              <div className="p-3 bg-amber-50 text-amber-600 rounded-xl mr-4">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                </svg>
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800">Archived Collections</p>
                <p className="text-xs text-slate-500 mt-0.5">Manage old records</p>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>

          <button onClick={onViewSettings} className="w-full p-4 flex justify-between items-center bg-white rounded-2xl shadow-sm border border-slate-100 hover:border-blue-200 hover:shadow-md transition-all active:scale-[0.98]">
            <div className="flex items-center">
              <div className="p-3 bg-slate-100 text-slate-600 rounded-xl mr-4">
                <SettingsIcon />
              </div>
              <div className="text-left">
                <p className="font-bold text-slate-800">Settings</p>
                <p className="text-xs text-slate-500 mt-0.5">App preferences</p>
              </div>
            </div>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
      </div>
      
      <div className="mt-8 text-center">
        <p className="text-xs text-slate-400">TreasApp v1.0.0 (Offline)</p>
      </div>
    </div>
  );
};

export default MenuScreen;