import React, { useState } from 'react';
import { useAppStore } from '../app/store';
import { Settings as SettingsIcon, Key, Sliders, Keyboard, HelpCircle } from 'lucide-react';
import { TranslationProviderType } from '../types';

export const Settings: React.FC = () => {
  const { settings, updateSettings } = useAppStore();

  const handleApiKeyChange = (provider: TranslationProviderType, key: string) => {
    updateSettings({
      providers: {
        ...settings.providers,
        [provider]: {
          ...settings.providers[provider],
          apiKey: key,
        },
      },
    });
  };

  const handleModelChange = (provider: TranslationProviderType, model: string) => {
    updateSettings({
      providers: {
        ...settings.providers,
        [provider]: {
          ...settings.providers[provider],
          model,
        },
      },
    });
  };

  const handleEndpointChange = (provider: TranslationProviderType, endpoint: string) => {
    updateSettings({
      providers: {
        ...settings.providers,
        [provider]: {
          ...settings.providers[provider],
          endpoint,
        },
      },
    });
  };

  const handleTempChange = (provider: TranslationProviderType, temp: number) => {
    updateSettings({
      providers: {
        ...settings.providers,
        [provider]: {
          ...settings.providers[provider],
          temperature: temp,
        },
      },
    });
  };

  return (
    <div className="page-body">
      {/* UI Settings Card */}
      <div className="card">
        <h3 className="settings-section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Sliders size={18} /> General Preferences
        </h3>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem' }}>
          <div className="form-group">
            <label className="form-label">Theme Mode</label>
            <select
              className="form-select"
              value={settings.theme}
              onChange={(e) => updateSettings({ theme: e.target.value as 'dark' | 'light' })}
            >
              <option value="dark">Dark Theme</option>
              <option value="light">Light Theme</option>
            </select>
          </div>

          <div className="form-group">
            <label className="form-label">Default Target Language</label>
            <select
              className="form-select"
              value={settings.targetLang}
              onChange={(e) => updateSettings({ targetLang: e.target.value })}
            >
              <option value="vi">Vietnamese</option>
              <option value="es">Spanish</option>
              <option value="en">English</option>
              <option value="ja">Japanese</option>
              <option value="zh">Chinese (Simplified)</option>
              <option value="fr">French</option>
              <option value="de">German</option>
            </select>
          </div>
        </div>
      </div>

      {/* Provider API Keys Card */}
      <div className="card">
        <h3 className="settings-section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Key size={18} /> API & Translator Credentials
        </h3>

        {/* Gemini API Configurations */}
        <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
          <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>
            Google Gemini API Configuration
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">API Key</label>
              <input
                type="password"
                className="form-input"
                placeholder="AIzaSy..."
                value={settings.providers.gemini.apiKey}
                onChange={(e) => handleApiKeyChange('gemini', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Model Selection</label>
              <select
                className="form-select"
                value={settings.providers.gemini.model}
                onChange={(e) => handleModelChange('gemini', e.target.value)}
              >
                <option value="gemini-1.5-flash">Gemini 1.5 Flash (Recommended - Fast & Cheap)</option>
                <option value="gemini-1.5-pro">Gemini 1.5 Pro (High Quality Context)</option>
                <option value="gemini-2.0-flash-exp">Gemini 2.0 Flash (Experimental)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Temperature (Creativity: {settings.providers.gemini.temperature})</label>
              <input
                type="range"
                min={0}
                max={1.0}
                step={0.1}
                value={settings.providers.gemini.temperature}
                onChange={(e) => handleTempChange('gemini', parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* OpenAI API Configurations */}
        <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
          <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>
            OpenAI API Configuration
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">API Key</label>
              <input
                type="password"
                className="form-input"
                placeholder="sk-proj-..."
                value={settings.providers.openai.apiKey}
                onChange={(e) => handleApiKeyChange('openai', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Model Selection</label>
              <select
                className="form-select"
                value={settings.providers.openai.model}
                onChange={(e) => handleModelChange('openai', e.target.value)}
              >
                <option value="gpt-4o-mini">GPT-4o Mini (Cost-Effective & Precise)</option>
                <option value="gpt-4o">GPT-4o (Premium Translation Quality)</option>
                <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Legacy)</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Temperature ({settings.providers.openai.temperature})</label>
              <input
                type="range"
                min={0}
                max={1.0}
                step={0.1}
                value={settings.providers.openai.temperature}
                onChange={(e) => handleTempChange('openai', parseFloat(e.target.value))}
                style={{ width: '100%', cursor: 'pointer' }}
              />
            </div>
          </div>
        </div>

        {/* DeepL API Configurations */}
        <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
          <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>
            DeepL API Configuration
          </h4>
          <div className="form-group">
            <label className="form-label">Auth Key (Free keys end in :fx)</label>
            <input
              type="password"
              className="form-input"
              placeholder="e.g. 78f564...:fx"
              value={settings.providers.deepl.apiKey}
              onChange={(e) => handleApiKeyChange('deepl', e.target.value)}
            />
          </div>
        </div>

        {/* LibreTranslate Configurations */}
        <div style={{ marginBottom: '2rem', padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
          <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>
            LibreTranslate Configuration
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Endpoint URL</label>
              <input
                type="text"
                className="form-input"
                placeholder="https://libretranslate.com"
                value={settings.providers.libre.endpoint}
                onChange={(e) => handleEndpointChange('libre', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">API Key (Optional if self-hosted)</label>
              <input
                type="password"
                className="form-input"
                placeholder="Leave blank if not needed"
                value={settings.providers.libre.apiKey}
                onChange={(e) => handleApiKeyChange('libre', e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Custom Endpoint Configurations */}
        <div style={{ padding: '1rem', border: '1px solid var(--border-color)', borderRadius: '0.5rem' }}>
          <h4 style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.75rem', color: 'var(--primary-color)' }}>
            Custom OpenAI-Compatible API Configuration (Ollama, LM Studio, Groq, etc.)
          </h4>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group" style={{ gridColumn: 'span 2' }}>
              <label className="form-label">Custom API Base Endpoint</label>
              <input
                type="text"
                className="form-input"
                placeholder="http://localhost:11434/v1"
                value={settings.providers.custom.endpoint}
                onChange={(e) => handleEndpointChange('custom', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Custom Model Name</label>
              <input
                type="text"
                className="form-input"
                placeholder="llama3, mistral, gemma2..."
                value={settings.providers.custom.model}
                onChange={(e) => handleModelChange('custom', e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Custom API Auth Token / Key (Optional)</label>
              <input
                type="password"
                className="form-input"
                placeholder="Authorization header token if required"
                value={settings.providers.custom.apiKey}
                onChange={(e) => handleApiKeyChange('custom', e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Keyboard Shortcuts Card */}
      <div className="card">
        <h3 className="settings-section-header" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
          <Keyboard size={18} /> Keyboard Shortcuts Reference
        </h3>
        
        <div className="shortcuts-list">
          <div className="shortcut-item">
            <span>Open Subtitle Files</span>
            <span className="shortcut-key">Ctrl + O</span>
          </div>
          <div className="shortcut-item">
            <span>Start Active Translation</span>
            <span className="shortcut-key">Ctrl + Enter</span>
          </div>
          <div className="shortcut-item">
            <span>Toggle Dark/Light Mode</span>
            <span className="shortcut-key">Ctrl + T</span>
          </div>
          <div className="shortcut-item">
            <span>Navigate to Home Page</span>
            <span className="shortcut-key">Alt + H</span>
          </div>
          <div className="shortcut-item">
            <span>Navigate to Translator Settings</span>
            <span className="shortcut-key">Alt + T</span>
          </div>
          <div className="shortcut-item">
            <span>Navigate to Split-View Editor</span>
            <span className="shortcut-key">Alt + E</span>
          </div>
        </div>
      </div>
    </div>
  );
};
