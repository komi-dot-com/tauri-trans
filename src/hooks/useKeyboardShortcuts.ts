import { useEffect } from 'react';
import { useAppStore } from '../app/store';
import { open } from '@tauri-apps/plugin-dialog';

interface ShortcutsProps {
  onNavigate: (tab: 'home' | 'translator' | 'preview' | 'stats' | 'settings') => void;
}

export const useKeyboardShortcuts = ({ onNavigate }: ShortcutsProps) => {
  const { files, activeFileIndex, settings, updateSettings, startTranslation, openFiles } = useAppStore();

  useEffect(() => {
    const handleKeyDown = async (e: KeyboardEvent) => {
      // 1. Open Files: Ctrl + O
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'o') {
        e.preventDefault();
        try {
          const selected = await open({
            multiple: true,
            filters: [{ name: 'Subtitles', extensions: ['srt', 'vtt', 'ass'] }],
          });
          if (selected) {
            const paths = Array.isArray(selected) ? selected : [selected];
            await openFiles(paths);
          }
        } catch (err) {
          console.error(err);
        }
      }

      // 2. Start Translation: Ctrl + Enter
      if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
        e.preventDefault();
        if (activeFileIndex !== -1 && files[activeFileIndex]?.status !== 'translating') {
          onNavigate('translator');
          // Give it a tiny tick to make sure the tab changes
          setTimeout(() => {
            startTranslation(activeFileIndex);
          }, 100);
        }
      }

      // 3. Toggle Dark/Light Mode: Ctrl + T
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 't') {
        e.preventDefault();
        const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
        updateSettings({ theme: nextTheme });
      }

      // 4. Navigation tabs: Alt + H / T / E / S / K
      if (e.altKey) {
        const key = e.key.toLowerCase();
        if (key === 'h') {
          e.preventDefault();
          onNavigate('home');
        } else if (key === 't') {
          e.preventDefault();
          onNavigate('translator');
        } else if (key === 'e') {
          e.preventDefault();
          onNavigate('preview');
        } else if (key === 's') {
          e.preventDefault();
          onNavigate('stats');
        } else if (key === 'k') {
          e.preventDefault();
          onNavigate('settings');
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [files, activeFileIndex, settings, updateSettings, startTranslation, openFiles, onNavigate]);
};
