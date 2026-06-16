import React, { useState, useMemo } from 'react';
import { useAppStore } from '../app/store';
import { save } from '@tauri-apps/plugin-dialog';
import { Download, Search, AlertCircle, AlertTriangle, Eye } from 'lucide-react';
import { SubtitleFormat } from '../types';
import { validateSubtitles, ValidationError } from '../services/subtitle/validator';

export const Preview: React.FC = () => {
  const { files, activeFileIndex, setActiveFileIndex, updateEntryText, exportSubtitleFile } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [showExportModal, setShowExportModal] = useState(false);
  const [exportFormat, setExportFormat] = useState<SubtitleFormat>('srt');
  const [exportMode, setExportMode] = useState<'translated' | 'bilingual' | 'original'>('translated');
  const [isExporting, setIsExporting] = useState(false);

  const activeFile = files[activeFileIndex];

  // Perform QA validations on the current subtitle entries
  const validationErrors = useMemo(() => {
    if (!activeFile) return [];
    return validateSubtitles(activeFile.translatedEntries || activeFile.entries);
  }, [activeFile]);

  // Group errors by entry ID for fast lookup in list item rendering
  const errorMap = useMemo(() => {
    const map = new Map<number, ValidationError[]>();
    validationErrors.forEach((err) => {
      if (!map.has(err.entryId)) {
        map.set(err.entryId, []);
      }
      map.get(err.entryId)?.push(err);
    });
    return map;
  }, [validationErrors]);

  const filteredEntries = useMemo(() => {
    if (!activeFile) return [];
    const entries = activeFile.entries;
    const translated = activeFile.translatedEntries || [];
    
    return entries.map((entry, idx) => {
      const transEntry = translated[idx];
      return {
        original: entry,
        translated: transEntry || { ...entry, text: '' },
        index: idx,
      };
    }).filter((item) => {
      const q = searchQuery.toLowerCase();
      return (
        item.original.text.toLowerCase().includes(q) ||
        item.translated.translatedText?.toLowerCase().includes(q) ||
        item.original.startTime.includes(q) ||
        item.original.id.toString().includes(q)
      );
    });
  }, [activeFile, searchQuery]);

  const handleExport = async () => {
    if (!activeFile) return;
    
    try {
      // Prompt user for save destination
      const defaultName = activeFile.name.replace(/\.[^/.]+$/, '');
      const defaultExportPath = `${defaultName}_translated.${exportFormat}`;
      
      const savePath = await save({
        defaultPath: defaultExportPath,
        filters: [
          {
            name: 'Subtitle File',
            extensions: [exportFormat],
          },
        ],
      });

      if (!savePath) return; // User cancelled

      setIsExporting(true);
      await exportSubtitleFile(activeFileIndex, exportFormat, exportMode, savePath);
      alert(`Successfully exported to: ${savePath}`);
      setShowExportModal(false);
    } catch (e) {
      console.error(e);
      alert(`Export failed: ${(e as Error).message}`);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="preview-container">
      {files.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
          No subtitle files loaded. Please load a file first on the Home page.
        </div>
      ) : (
        <>
          {/* Controls Header */}
          <div className="preview-filters">
            <div className="form-group" style={{ margin: 0, width: '220px' }}>
              <select
                className="form-select"
                value={activeFileIndex}
                onChange={(e) => setActiveFileIndex(parseInt(e.target.value, 10))}
              >
                {files.map((file, idx) => (
                  <option key={file.path} value={idx}>
                    {file.name}
                  </option>
                ))}
              </select>
            </div>

            <div style={{ position: 'relative', flexGrow: 1 }}>
              <Search
                size={16}
                style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: 'var(--text-muted)',
                }}
              />
              <input
                type="text"
                className="form-input"
                placeholder="Search subtitles by text or timestamp..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                style={{ paddingLeft: '36px' }}
              />
            </div>

            <button
              className="btn btn-primary"
              onClick={() => setShowExportModal(true)}
              disabled={!activeFile.translatedEntries}
            >
              <Download size={16} /> Export Translated File
            </button>
          </div>

          {/* Validation Warnings Summary Panel */}
          {validationErrors.length > 0 && (
            <div
              style={{
                backgroundColor: 'rgba(245, 158, 11, 0.08)',
                border: '1px solid var(--warning-color)',
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                marginBottom: '1rem',
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
              }}
            >
              <AlertTriangle size={18} style={{ color: 'var(--warning-color)', flexShrink: 0 }} />
              <div style={{ fontSize: '0.85rem' }}>
                <strong>Quality Assurance: </strong> Found {validationErrors.length} potential issues (overlaps, out-of-order timings, empty blocks, or unbalanced tags). Review marked items below.
              </div>
            </div>
          )}

          {/* Split View Subtitle Editor */}
          <div className="preview-grid">
            {/* Original Column */}
            <div className="preview-column preview-left">
              <div className="preview-column-header">
                <span>Original Subtitle</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  Total: {activeFile.linesCount} lines
                </span>
              </div>
              <div className="preview-list">
                {filteredEntries.map((item) => {
                  const errors = errorMap.get(item.original.id) || [];
                  const hasErrors = errors.length > 0;
                  return (
                    <div
                      key={`orig-${item.original.id}`}
                      className="preview-item"
                      style={hasErrors ? { borderLeft: '3px solid var(--warning-color)' } : {}}
                    >
                      <div className="preview-item-meta">
                        <span className="preview-item-id">#{item.original.id}</span>
                        <span>
                          {item.original.startTime} &rarr; {item.original.endTime}
                        </span>
                      </div>
                      <textarea
                        className="preview-input"
                        value={item.original.text}
                        onChange={(e) => updateEntryText(activeFileIndex, item.index, e.target.value, false)}
                        rows={2}
                      />
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Translated Column */}
            <div className="preview-column preview-right">
              <div className="preview-column-header">
                <span>Translated Subtitle</span>
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                  {activeFile.translatedEntries ? 'AI Generated' : 'Not Translated Yet'}
                </span>
              </div>
              <div className="preview-list">
                {filteredEntries.map((item) => {
                  const errors = errorMap.get(item.original.id) || [];
                  const hasErrors = errors.length > 0;
                  return (
                    <div
                      key={`trans-${item.original.id}`}
                      className="preview-item"
                      style={hasErrors ? { borderLeft: '3px solid var(--warning-color)' } : {}}
                    >
                      <div className="preview-item-meta">
                        <span className="preview-item-id">#{item.original.id}</span>
                        <span>
                          {item.original.startTime} &rarr; {item.original.endTime}
                        </span>
                      </div>
                      <textarea
                        className="preview-input"
                        value={item.translated.translatedText || ''}
                        placeholder={activeFile.translatedEntries ? '' : 'Please translate first...'}
                        onChange={(e) => updateEntryText(activeFileIndex, item.index, e.target.value, true)}
                        rows={2}
                        disabled={!activeFile.translatedEntries}
                      />
                      {/* Show error flags */}
                      {errors.map((err, errIdx) => (
                        <div
                          key={errIdx}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.25rem',
                            color: err.severity === 'error' ? 'var(--error-color)' : 'var(--warning-color)',
                            fontSize: '0.75rem',
                            marginTop: '0.25rem',
                          }}
                        >
                          <AlertCircle size={12} />
                          <span>{err.message}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Export Modal / Dialog Dialog */}
          {showExportModal && (
            <div
              style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'rgba(0,0,0,0.5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                zIndex: 1000,
              }}
            >
              <div className="card" style={{ width: '400px', margin: 0 }}>
                <h3 style={{ fontSize: '1.2rem', marginBottom: '1rem' }}>Export Settings</h3>

                <div className="form-group">
                  <label className="form-label">Export Format</label>
                  <select
                    className="form-select"
                    value={exportFormat}
                    onChange={(e) => setExportFormat(e.target.value as SubtitleFormat)}
                  >
                    <option value="srt">SubRip Subtitle (.srt)</option>
                    <option value="vtt">WebVTT Subtitle (.vtt)</option>
                    <option value="ass">Advanced SubStation Alpha (.ass)</option>
                  </select>
                </div>

                <div className="form-group">
                  <label className="form-label">Export Mode</label>
                  <select
                    className="form-select"
                    value={exportMode}
                    onChange={(e) => setExportMode(e.target.value as any)}
                  >
                    <option value="translated">Translated Text Only</option>
                    <option value="bilingual">Bilingual (Original + Translated)</option>
                    <option value="original">Original Text Only</option>
                  </select>
                </div>

                <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.5rem', justifyContent: 'flex-end' }}>
                  <button className="btn btn-secondary" onClick={() => setShowExportModal(false)} disabled={isExporting}>
                    Cancel
                  </button>
                  <button className="btn btn-primary" onClick={handleExport} disabled={isExporting}>
                    {isExporting ? 'Exporting...' : 'Save File'}
                  </button>
                </div>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};
