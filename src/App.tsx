import { useState, useEffect } from 'react';
import { useAppStore } from './app/store';
import { useKeyboardShortcuts } from './hooks/useKeyboardShortcuts';
import { Home } from './pages/Home';
import { Translator } from './pages/Translator';
import { Preview } from './pages/Preview';
import { Stats } from './pages/Stats';
import { Settings } from './pages/Settings';
import { 
  Home as HomeIcon, 
  Languages, 
  Eye, 
  BarChart2, 
  Settings as SettingsIcon, 
  Moon, 
  Sun,
  Video
} from 'lucide-react';
import './App.css';

type Tab = 'home' | 'translator' | 'preview' | 'stats' | 'settings';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('home');
  const { settings, loadSettings, updateSettings } = useAppStore();

  // Initialize store and settings
  useEffect(() => {
    loadSettings();
  }, []);

  // Hook global keyboard shortcuts
  useKeyboardShortcuts({
    onNavigate: (tab) => setActiveTab(tab),
  });

  const toggleTheme = () => {
    const nextTheme = settings.theme === 'dark' ? 'light' : 'dark';
    updateSettings({ theme: nextTheme });
  };

  const renderActivePage = () => {
    switch (activeTab) {
      case 'home':
        return <Home onNavigate={(tab) => setActiveTab(tab)} />;
      case 'translator':
        return <Translator />;
      case 'preview':
        return <Preview />;
      case 'stats':
        return <Stats />;
      case 'settings':
        return <Settings />;
      default:
        return <Home onNavigate={(tab) => setActiveTab(tab)} />;
    }
  };

  const getPageTitle = () => {
    switch (activeTab) {
      case 'home':
        return { title: 'Dashboard', subtitle: 'Manage loaded files and operations summary' };
      case 'translator':
        return { title: 'AI Translator', subtitle: 'Configure translation engine parameters and start parsing' };
      case 'preview':
        return { title: 'Split-Screen Editor & QA', subtitle: 'Compare original and translated files with live editing' };
      case 'stats':
        return { title: 'Analytics & Translation Memory', subtitle: 'View usage history and manage SQLite database memory' };
      case 'settings':
        return { title: 'Settings', subtitle: 'Configure API keys, models, temperature, and keyboard mappings' };
    }
  };

  const { title, subtitle } = getPageTitle();

  return (
    <div className="app-container">
      {/* Sidebar Navigation */}
      <nav className="sidebar">
        <div>
          <div className="logo-section">
            <Video className="logo-icon" size={24} />
            <span className="logo-text">tauri trans</span>
          </div>

          <ul className="nav-links">
            <li 
              className={`nav-item ${activeTab === 'home' ? 'active' : ''}`}
              onClick={() => setActiveTab('home')}
            >
              <HomeIcon size={18} />
              <span>Dashboard</span>
            </li>
            <li 
              className={`nav-item ${activeTab === 'translator' ? 'active' : ''}`}
              onClick={() => setActiveTab('translator')}
            >
              <Languages size={18} />
              <span>Translator</span>
            </li>
            <li 
              className={`nav-item ${activeTab === 'preview' ? 'active' : ''}`}
              onClick={() => setActiveTab('preview')}
            >
              <Eye size={18} />
              <span>Preview & Editor</span>
            </li>
            <li 
              className={`nav-item ${activeTab === 'stats' ? 'active' : ''}`}
              onClick={() => setActiveTab('stats')}
            >
              <BarChart2 size={18} />
              <span>History & Memory</span>
            </li>
            <li 
              className={`nav-item ${activeTab === 'settings' ? 'active' : ''}`}
              onClick={() => setActiveTab('settings')}
            >
              <SettingsIcon size={18} />
              <span>Settings</span>
            </li>
          </ul>
        </div>

        <div className="sidebar-footer">
          <button className="theme-toggle-btn" onClick={toggleTheme}>
            {settings.theme === 'dark' ? (
              <>
                <Sun size={16} />
                <span>Light Mode</span>
              </>
            ) : (
              <>
                <Moon size={16} />
                <span>Dark Mode</span>
              </>
            )}
          </button>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="main-content">
        <header className="page-header">
          <div>
            <h1 className="page-title">{title}</h1>
            <p className="page-subtitle">{subtitle}</p>
          </div>
        </header>

        {renderActivePage()}
      </main>
    </div>
  );
}

export default App;
