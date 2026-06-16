import React, { useEffect } from 'react';
import { useAppStore } from '../app/store';
import { Database, TrendingUp, BarChart2, DollarSign, RefreshCw, Trash2 } from 'lucide-react';

export const Stats: React.FC = () => {
  const { stats, refreshStats, clearDatabaseCache, isLoadingStats } = useAppStore();

  useEffect(() => {
    refreshStats();
  }, []);

  const handleClearCache = async () => {
    if (window.confirm('Are you sure you want to clear your local translation memory cache? This will delete all cached translation mappings, meaning future translations will hit the AI API instead of pulling from the local database.')) {
      try {
        await clearDatabaseCache();
        alert('Cache cleared successfully.');
      } catch (e) {
        alert('Failed to clear cache: ' + (e as Error).message);
      }
    }
  };

  return (
    <div className="page-body">
      {/* Metrics Row */}
      <div className="stats-grid">
        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-title">Files Processed</span>
            <BarChart2 size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="stat-value">{stats.totalTranslationsDone}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Total translations executed</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-title">Cached Translations</span>
            <Database size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="stat-value">{stats.totalCachedEntries}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lines saved in SQLite</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-title">Average Speed</span>
            <TrendingUp size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="stat-value">{Math.round(stats.averageSpeedLpm)} LPM</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Lines per minute average</span>
        </div>

        <div className="stat-card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="stat-title">Estimated Cost (USD)</span>
            <DollarSign size={18} style={{ color: 'var(--text-muted)' }} />
          </div>
          <div className="stat-value">${parseFloat(stats.totalCostUsd.toFixed(4))}</div>
          <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Approximate AI API spend</span>
        </div>
      </div>

      {/* Database Cache Manager */}
      <div className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h4 style={{ fontWeight: 600, fontSize: '1.05rem', marginBottom: '0.25rem' }}>Local Translation Memory Cache</h4>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>
            Your SQLite database holds {stats.totalCachedEntries} previously translated subtitle entries. When a match is found, it loads instantly and saves API costs.
          </p>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem' }}>
          <button className="btn btn-secondary" onClick={() => refreshStats()} disabled={isLoadingStats}>
            <RefreshCw size={14} className={isLoadingStats ? 'spin' : ''} /> Refresh Stats
          </button>
          <button className="btn btn-danger" onClick={handleClearCache} disabled={stats.totalCachedEntries === 0}>
            <Trash2 size={14} /> Clear Cache
          </button>
        </div>
      </div>

      {/* History Table */}
      <div className="card">
        <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Recent Translation History</h3>
        
        {stats.history.length === 0 ? (
          <div style={{ padding: '2rem', textAlign: 'center', color: 'var(--text-muted)' }}>
            No translation history found. Once you complete a translation, it will be listed here.
          </div>
        ) : (
          <div className="stats-table-wrapper">
            <table className="stats-table">
              <thead>
                <tr>
                  <th>File Name</th>
                  <th>Provider</th>
                  <th>Source</th>
                  <th>Target</th>
                  <th>Lines</th>
                  <th>Chars</th>
                  <th>Cost Est</th>
                  <th>Speed</th>
                  <th>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {stats.history.map((item) => (
                  <tr key={item.id}>
                    <td style={{ fontWeight: 600, wordBreak: 'break-all' }}>{item.file_name}</td>
                    <td style={{ textTransform: 'capitalize' }}>{item.provider}</td>
                    <td style={{ textTransform: 'uppercase' }}>{item.source_lang}</td>
                    <td style={{ textTransform: 'uppercase' }}>{item.target_lang}</td>
                    <td>{item.total_lines}</td>
                    <td>{item.total_chars}</td>
                    <td>${parseFloat(item.cost_est.toFixed(4))}</td>
                    <td>{Math.round(item.speed_lpm)} LPM</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{item.created_at}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
