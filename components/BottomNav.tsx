import React from 'react';
import { Screen } from '../types';
import { SCREENS } from '../constants';
import { CollectionIcon, RemittedIcon, FundsIcon, StudentsIcon, MenuIcon } from './icons/NavIcons';

interface BottomNavProps {
  activeScreen: Screen;
  setActiveScreen: (screen: Screen) => void;
}

const iconMap: { [key in Screen]: React.ReactNode } = {
  [Screen.Collection]: <CollectionIcon />,
  [Screen.Remitted]: <RemittedIcon />,
  [Screen.Funds]: <FundsIcon />,
  [Screen.Students]: <StudentsIcon />,
  [Screen.Menu]: <MenuIcon />,
};

const BottomNav: React.FC<BottomNavProps> = ({ activeScreen, setActiveScreen }) => {
  return (
    <nav className="fixed bottom-6 left-4 right-4 h-16 bg-white/90 backdrop-blur-xl border border-white/20 shadow-xl shadow-slate-200/50 rounded-2xl z-40 flex justify-center items-center max-w-lg mx-auto">
      <div className="flex justify-around items-center w-full px-2">
        {SCREENS.map((screen) => {
            const isActive = activeScreen === screen;
            return (
              <button
                key={screen}
                onClick={() => setActiveScreen(screen)}
                className={`group flex flex-col items-center justify-center w-full relative py-2`}
              >
                 {isActive && (
                    <span className="absolute -top-3 w-8 h-1 bg-blue-500 rounded-b-lg shadow-sm shadow-blue-200"></span>
                 )}
                <div 
                    className={`w-6 h-6 mb-1 transition-all duration-300 ease-out transform ${
                        isActive 
                        ? 'text-blue-600 -translate-y-1 scale-110 drop-shadow-sm' 
                        : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                >
                    {iconMap[screen]}
                </div>
                <span 
                    className={`text-[10px] font-semibold transition-colors duration-300 ${
                        isActive ? 'text-blue-600' : 'text-slate-400 group-hover:text-slate-600'
                    }`}
                >
                    {screen}
                </span>
              </button>
            )
        })}
      </div>
    </nav>
  );
};

export default BottomNav;