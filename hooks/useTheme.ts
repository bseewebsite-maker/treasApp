import { useEffect } from 'react';
import { useLocalStorage } from './useLocalStorage';

type Theme = 'light' | 'dark';

export function useTheme(): [Theme, () => void] {
  const prefersDark = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  const [theme, setTheme] = useLocalStorage<Theme>('theme', prefersDark ? 'dark' : 'light');

  useEffect(() => {
    const root = window.document.documentElement;
    
    // Aligns with Tailwind's `darkMode: 'class'` strategy by only managing the 'dark' class.
    if (theme === 'dark') {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme(prevTheme => (prevTheme === 'light' ? 'dark' : 'light'));
  };

  return [theme, toggleTheme];
}