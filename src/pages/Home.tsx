import React from 'react';
import { useAppStore } from '../app/store';
import { open } from '@tauri-apps/plugin-dialog';
import { FileText, Upload, Trash2, ArrowRight } from 'lucide-react';

interface HomeProps {
  onNavigate: (tab: 'translator' | 'preview') => void;
}

export const Home: React.FC<HomeProps> = ({ onNavigate }) => {
  const { files, openFiles, removeFile, setActiveFileIndex } = useAppStore();

  const handleOpenFiles = async () => {
    try {
      const selected = await open({
        multiple: true,
        filters: [
          {
            name: 'Subtitles',
            extensions: ['srt', 'vtt', 'ass'],
          },
        ],
      });

      if (selected) {
        const paths = Array.isArray(selected) ? selected : [selected];
        await openFiles(paths);
      }
    } catch (e) {
      console.error('Failed to open files:', e);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  return (
    <div className="page-body">
      <div className="card" style={{ textAlign: 'center', padding: '3rem 2rem' }}>
        <h2 style={{ fontSize: '1.75rem', marginBottom: '0.75rem' }}>AI-Powered Subtitle Translator</h2>
        <p style={{ color: 'var(--text-muted)', maxWidth: '600px', margin: '0 auto 2rem auto' }}>
          Translate your `.srt`, `.vtt`, and `.ass` subtitle files into multiple languages using advanced AI translation APIs. Automatically preserves timestamps, formatting, and reading speed.
        </p>
        
        <div 
          className="drag-drop-zone"
          onClick={handleOpenFiles}
        >
          <Upload size={48} className="drag-drop-icon" style={{ margin: '0 auto 1rem auto' }} />
          <h3 style={{ marginBottom: '0.5rem' }}>Select Subtitle Files</h3>
          <p style={{ color: 'var(--text-muted)' }}>
            Supports SRT, VTT, and ASS files in UTF-8, UTF-8 BOM, or ANSI encodings
          </p>
        </div>
      </div>

      <div className="page-header">
        <h3 className="page-title" style={{ fontSize: '1.25rem' }}>
          Loaded Subtitle Files ({files.length})
        </h3>
      </div>

      {files.length === 0 ? (
        <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
          No subtitle files loaded. Click the button above to load files.
        </div>
      ) : (
        <div className="file-list">
          {files.map((file, idx) => (
            <div key={file.path} className="file-item">
              <div className="file-info">
                <FileText size={28} style={{ color: 'var(--primary-color)' }} />
                <div className="file-details">
                  <h4>{file.name}</h4>
                  <p>
                    Format: {file.format.toUpperCase()} | Size: {formatBytes(file.size)} | Encoding: {file.encoding} | Lines: {file.linesCount}
                  </p>
                </div>
              </div>
              
              <div className="file-actions">
                {file.status === 'completed' && (
                  <span style={{ color: 'var(--success-color)', fontWeight: 600, fontSize: '0.85rem', marginRight: '1rem' }}>
                    Completed
                  </span>
                )}
                {file.status === 'translating' && (
                  <span style={{ color: 'var(--warning-color)', fontWeight: 600, fontSize: '0.85rem', marginRight: '1rem' }}>
                    Translating ({file.progress}%)
                  </span>
                )}
                {file.status === 'failed' && (
                  <span style={{ color: 'var(--error-color)', fontWeight: 600, fontSize: '0.85rem', marginRight: '1rem' }}>
                    Failed
                  </span>
                )}
                
                <button 
                  className="btn btn-secondary" 
                  onClick={() => {
                    setActiveFileIndex(idx);
                    onNavigate('preview');
                  }}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                >
                  Preview
                </button>
                
                <button 
                  className="btn btn-primary" 
                  onClick={() => {
                    setActiveFileIndex(idx);
                    onNavigate('translator');
                  }}
                  style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                  disabled={file.status === 'translating'}
                >
                  Translate <ArrowRight size={14} />
                </button>
                
                <button 
                  className="btn btn-secondary"
                  onClick={() => removeFile(idx)}
                  style={{ padding: '0.4rem', color: 'var(--error-color)', borderColor: 'transparent' }}
                  disabled={file.status === 'translating'}
                >
                  <Trash2 size={16} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
