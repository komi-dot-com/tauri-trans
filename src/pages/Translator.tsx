import React from 'react';
import { useAppStore } from '../app/store';
import { Play, Square, AlertTriangle, CheckCircle, HelpCircle } from 'lucide-react';
import { TranslationMode, TranslationProviderType } from '../types';

export const Translator: React.FC = () => {
  const { files, activeFileIndex, settings, updateSettings, startTranslation, cancelTranslation, setActiveFileIndex } = useAppStore();

  const activeFile = files[activeFileIndex];

  const handleProviderChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ selectedProvider: e.target.value as TranslationProviderType });
  };

  const handleModeChange = (mode: TranslationMode) => {
    updateSettings({ translationMode: mode });
  };

  const handleSourceLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ sourceLang: e.target.value });
  };

  const handleTargetLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateSettings({ targetLang: e.target.value });
  };

  const handleBatchSizeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ batchSize: parseInt(e.target.value, 10) || 20 });
  };

  const handleRateLimitChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ rateLimitMs: parseInt(e.target.value, 10) || 1000 });
  };

  const handleCacheChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateSettings({ useCache: e.target.checked });
  };

  const handleTranslate = async () => {
    if (activeFileIndex !== -1) {
      await startTranslation(activeFileIndex);
    }
  };

  const handleCancel = () => {
    if (activeFileIndex !== -1) {
      cancelTranslation(activeFileIndex);
    }
  };

  const formatTime = (ms: number) => {
    if (!ms) return '0s';
    const totalSecs = Math.floor(ms / 1000);
    const m = Math.floor(totalSecs / 60);
    const s = totalSecs % 60;
    return m > 0 ? `${m}m ${s}s` : `${s}s`;
  };

  const languages = [
    { code: 'auto', name: 'Auto Detect (AI Only)' },
    { code: 'en', name: 'English' },
    { code: 'vi', name: 'Vietnamese' },
    { code: 'es', name: 'Spanish' },
    { code: 'ja', name: 'Japanese' },
    { code: 'zh', name: 'Chinese (Simplified)' },
    { code: 'zh-TW', name: 'Chinese (Traditional)' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'ko', name: 'Korean' },
    { code: 'ru', name: 'Russian' },
    { code: 'pt', name: 'Portuguese' },
    { code: 'it', name: 'Italian' },
  ];

  const providers = [
    { id: 'gemini', name: 'Gemini AI API' },
    { id: 'openai', name: 'OpenAI API' },
    { id: 'deepl', name: 'DeepL API' },
    { id: 'libre', name: 'LibreTranslate' },
    { id: 'custom', name: 'Custom (OpenAI-Compatible)' },
  ];

  return (
    <div className="page-body">
      {files.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No subtitle files loaded. Please load a file first on the Home page.
        </div>
      ) : (
        <div className="translator-panel">
          {/* Left Panel: Settings and Actions */}
          <div className="card">
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Translation Configuration</h3>
            
            <div className="form-group">
              <label className="form-label">Select File to Translate</label>
              <select 
                className="form-select" 
                value={activeFileIndex}
                onChange={(e) => setActiveFileIndex(parseInt(e.target.value, 10))}
                disabled={activeFile?.status === 'translating'}
              >
                {files.map((file, idx) => (
                  <option key={file.path} value={idx}>
                    {file.name} ({file.linesCount} lines)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Source Language</label>
                <select 
                  className="form-select" 
                  value={settings.sourceLang}
                  onChange={handleSourceLangChange}
                  disabled={activeFile?.status === 'translating'}
                >
                  {languages.map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Target Language</label>
                <select 
                  className="form-select" 
                  value={settings.targetLang}
                  onChange={handleTargetLangChange}
                  disabled={activeFile?.status === 'translating'}
                >
                  {languages.filter(l => l.code !== 'auto').map((l) => (
                    <option key={l.code} value={l.code}>
                      {l.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Translation Provider</label>
              <select 
                className="form-select" 
                value={settings.selectedProvider}
                onChange={handleProviderChange}
                disabled={activeFile?.status === 'translating'}
              >
                {providers.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label">Translation Mode</label>
              <div className="mode-grid">
                <div 
                  className={`mode-card ${settings.translationMode === 'standard' ? 'active' : ''}`}
                  onClick={() => activeFile?.status !== 'translating' && handleModeChange('standard')}
                >
                  <div className="mode-title">Standard</div>
                  <div className="mode-desc">Fast translation optimized for reading speed and format preservation.</div>
                </div>

                <div 
                  className={`mode-card ${settings.translationMode === 'context' ? 'active' : ''}`}
                  onClick={() => activeFile?.status !== 'translating' && handleModeChange('context')}
                >
                  <div className="mode-title">Context-Aware</div>
                  <div className="mode-desc">Translates blocks of lines together to keep pronouns and continuity consistent.</div>
                </div>

                <div 
                  className={`mode-card ${settings.translationMode === 'movie' ? 'active' : ''}`}
                  onClick={() => activeFile?.status !== 'translating' && handleModeChange('movie')}
                >
                  <div className="mode-title">Movie Mode</div>
                  <div className="mode-desc">Optimizes dialogue flow, colloquialisms, emotional tone and pronoun continuity.</div>
                </div>

                <div 
                  className={`mode-card ${settings.translationMode === 'anime' ? 'active' : ''}`}
                  onClick={() => activeFile?.status !== 'translating' && handleModeChange('anime')}
                >
                  <div className="mode-title">Anime Mode</div>
                  <div className="mode-desc">Preserves honorifics (-kun, -chan, -sama) and Japanese cultural references.</div>
                </div>
              </div>
            </div>

            {/* Advanced Settings */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1.5rem' }}>
              <div className="form-group">
                <label className="form-label">Batch Size (Lines)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={settings.batchSize}
                  onChange={handleBatchSizeChange}
                  min={5}
                  max={100}
                  disabled={activeFile?.status === 'translating'}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Rate Limit Delay (ms)</label>
                <input 
                  type="number" 
                  className="form-input" 
                  value={settings.rateLimitMs}
                  onChange={handleRateLimitChange}
                  min={0}
                  max={10000}
                  disabled={activeFile?.status === 'translating'}
                />
              </div>
            </div>

            <div className="form-group" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
              <input 
                type="checkbox" 
                id="use-cache-chk" 
                checked={settings.useCache}
                onChange={handleCacheChange}
                disabled={activeFile?.status === 'translating'}
                style={{ width: '16px', height: '16px', cursor: 'pointer' }}
              />
              <label htmlFor="use-cache-chk" style={{ fontWeight: 500, cursor: 'pointer' }}>
                Enable Local Translation Memory (SQLite Cache)
              </label>
            </div>

            <div style={{ marginTop: '2rem', display: 'flex', gap: '1rem' }}>
              {activeFile?.status === 'translating' ? (
                <button className="btn btn-danger" onClick={handleCancel} style={{ flexGrow: 1 }}>
                  <Square size={16} /> Cancel Translation
                </button>
              ) : (
                <button 
                  className="btn btn-primary" 
                  onClick={handleTranslate} 
                  style={{ flexGrow: 1 }}
                  disabled={files.length === 0}
                >
                  <Play size={16} /> Start Translation
                </button>
              )}
            </div>
          </div>

          {/* Right Panel: Progress and Metrics */}
          <div className="card" style={{ display: 'flex', flexDirection: 'column', justifyItems: 'stretch' }}>
            <h3 style={{ fontSize: '1.25rem', marginBottom: '1.25rem' }}>Execution Metrics</h3>
            
            {activeFile ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', flexGrow: 1 }}>
                <div>
                  <div style={{ fontWeight: 600, fontSize: '0.95rem', marginBottom: '0.25rem' }}>Target File</div>
                  <div style={{ wordBreak: 'break-all', fontSize: '0.9rem', color: 'var(--text-muted)' }}>{activeFile.name}</div>
                </div>

                <div className="translation-metrics">
                  <div className="metric-box">
                    <div className="metric-value">
                      {activeFile.status === 'translating' ? activeFile.progress : activeFile.status === 'completed' ? 100 : 0}%
                    </div>
                    <div className="metric-label">Progress</div>
                  </div>

                  <div className="metric-box">
                    <div className="metric-value">
                      {activeFile.translatedLinesCount} / {activeFile.linesCount}
                    </div>
                    <div className="metric-label">Lines Finished</div>
                  </div>

                  <div className="metric-box">
                    <div className="metric-value">
                      {activeFile.status === 'translating' ? formatTime(activeFile.elapsedTimeMillis) : '0s'}
                    </div>
                    <div className="metric-label">Elapsed Time</div>
                  </div>

                  <div className="metric-box">
                    <div className="metric-value">
                      {activeFile.status === 'completed' ? 'Done' : activeFile.status === 'failed' ? 'Failed' : activeFile.status === 'translating' ? 'Translating' : 'Idle'}
                    </div>
                    <div className="metric-label">Status</div>
                  </div>
                </div>

                <div className="translation-metrics">
                  <div className="metric-box">
                    <div className="metric-value">
                      {/* Estimate cost dynamically */}
                      ${(activeFile.status === 'translating' || activeFile.status === 'completed') ? 
                        parseFloat((activeFile.charsCount * (settings.selectedProvider === 'gemini' ? 0.00000015 : settings.selectedProvider === 'openai' ? 0.00000040 : 0)).toFixed(4)) : 0}
                    </div>
                    <div className="metric-label">Estimated Cost (USD)</div>
                  </div>

                  <div className="metric-box">
                    <div className="metric-value">
                      {activeFile.status === 'translating' ? 
                        Math.round(activeFile.translatedLinesCount / (activeFile.elapsedTimeMillis / 60000 || 1)) : 0}
                    </div>
                    <div className="metric-label">Speed (Lines/Min)</div>
                  </div>
                </div>

                {/* Live Progress Bar */}
                <div className="progress-container">
                  <div className="progress-header">
                    <span>Progress</span>
                    <span>{activeFile.progress}%</span>
                  </div>
                  <div className="progress-track">
                    <div className="progress-bar" style={{ width: `${activeFile.progress}%` }}></div>
                  </div>
                </div>

                {/* Error/Warning Notifications */}
                {activeFile.status === 'failed' && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.75rem', 
                    padding: '1rem', 
                    borderRadius: '0.5rem', 
                    backgroundColor: 'rgba(239, 68, 68, 0.1)', 
                    border: '1px solid var(--error-color)',
                    color: 'var(--error-color)',
                    fontSize: '0.85rem'
                  }}>
                    <AlertTriangle size={18} style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Translation Error</div>
                      <div>{activeFile.error || 'Check API keys or network connection.'}</div>
                    </div>
                  </div>
                )}

                {activeFile.status === 'completed' && (
                  <div style={{ 
                    display: 'flex', 
                    gap: '0.75rem', 
                    padding: '1rem', 
                    borderRadius: '0.5rem', 
                    backgroundColor: 'rgba(16, 185, 129, 0.1)', 
                    border: '1px solid var(--success-color)',
                    color: 'var(--success-color)',
                    fontSize: '0.85rem'
                  }}>
                    <CheckCircle size={18} style={{ flexShrink: 0 }} />
                    <div>
                      <div style={{ fontWeight: 'bold', marginBottom: '0.25rem' }}>Translation Completed!</div>
                      <div>Successfully cached and ready for preview & export.</div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div style={{ color: 'var(--text-muted)', textAlign: 'center', padding: '2rem' }}>
                Select a file to view metrics.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
