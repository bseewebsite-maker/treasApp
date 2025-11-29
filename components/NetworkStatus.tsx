
import React, { useState, useEffect } from 'react';
import { WifiIcon, WifiOffIcon, CloudDownloadIcon, CheckCircleIcon } from './icons/StatusIcons';

export const NetworkStatus: React.FC = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [cacheStatus, setCacheStatus] = useState<'idle' | 'caching' | 'done'>('idle');
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [showNotification, setShowNotification] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
        setIsOnline(true);
        // On reconnect, try to re-establish communication
        if (navigator.serviceWorker && navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'CHECK_FOR_UPDATES' });
        }
    };
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    const handleSWMessage = (event: MessageEvent) => {
      if (event.data) {
          if (event.data.type === 'CACHE_PROGRESS') {
            setCacheStatus('caching');
            setProgress({ current: event.data.current, total: event.data.total });
          } else if (event.data.type === 'CACHE_COMPLETE') {
            setCacheStatus('done');
            setShowNotification(true);
            setTimeout(() => {
                setShowNotification(false);
                setCacheStatus('idle');
            }, 4000);
          }
      }
    };

    if ('serviceWorker' in navigator) {
        // Add listener immediately
        navigator.serviceWorker.addEventListener('message', handleSWMessage);
        
        // Wait for the service worker to be ready before asking for status
        navigator.serviceWorker.ready.then((registration) => {
             // If there's an active worker, check if it's already done caching
             if (registration.active) {
                 registration.active.postMessage({ type: 'CHECK_OFFLINE_READY' });
             }
        });
    }

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
      if ('serviceWorker' in navigator) {
        navigator.serviceWorker.removeEventListener('message', handleSWMessage);
      }
    };
  }, []);

  if (!isOnline) {
      return (
        <div className="fixed top-2 right-2 z-50 animate-fade-in-down pointer-events-none select-none">
            <div className="bg-gray-800/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-2 text-xs font-medium border border-gray-700/50">
                <WifiOffIcon className="h-3.5 w-3.5" />
                <span>Offline</span>
            </div>
        </div>
      );
  }

  if (cacheStatus === 'caching') {
      const percentage = progress.total > 0 ? Math.round((progress.current / progress.total) * 100) : 0;
      return (
        <div className="fixed top-2 right-2 z-50 animate-pulse pointer-events-none select-none">
             <div className="bg-blue-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-2 text-xs font-medium">
                <div className="animate-spin h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full"></div>
                <div className="flex flex-col leading-none">
                    <span>Downloading...</span>
                    <span className="text-[9px] opacity-90">{percentage}%</span>
                </div>
            </div>
        </div>
      );
  }

  if (showNotification) {
       return (
        <div className="fixed top-2 right-2 z-50 animate-fade-in-down pointer-events-none select-none">
             <div className="bg-green-600/90 backdrop-blur-sm text-white px-3 py-1.5 rounded-full shadow-lg flex items-center space-x-2 text-xs font-medium">
                <CheckCircleIcon className="h-3.5 w-3.5" />
                <span>Offline Ready</span>
            </div>
        </div>
      );
  }

  return null;
};
