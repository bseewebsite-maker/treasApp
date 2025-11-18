
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
    <nav className="fixed bottom-0 left-0 right-0 h-16 bg-white border-t border-gray-200 shadow-lg z-40">
      <div className="flex justify-around items-center h-full max-w-lg mx-auto">
        {SCREENS.map((screen) => (
          <button
            key={screen}
            onClick={() => setActiveScreen(screen)}
            className={`flex flex-col items-center justify-center w-full transition-colors duration-200 ${
              activeScreen === screen ? 'text-blue-500' : 'text-gray-500 hover:text-blue-500'
            }`}
          >
            <div className={`w-6 h-6 mb-1 ${activeScreen === screen ? 'scale-110' : ''}`}>{iconMap[screen]}</div>
            <span className="text-xs font-medium">{screen}</span>
          </button>
        ))}
      </div>
    </nav>
  );
};

export default BottomNav;