import React, { useState } from 'react';
import { 
  Settings, 
  Key, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  ExternalLink,
  Shield,
  FileSpreadsheet,
  Wallet
} from 'lucide-react';

export default function SettingsView({ 
  settings, 
  onSaveSettings, 
  trades, 
  onResetTrades, 
  onImportTrades 
}) {
  const [formData, setFormData] = useState({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  const handleSave = (e) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  // Export to JSON
  const handleExportJson = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(trades, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `tradematrix_trades_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Export to CSV
  const handleExportCsv = () => {
    if (trades.length === 0) {
      alert('No trades to export yet.');
      return;
    }
    const headers = ['id', 'date', 'time', 'asset', 'type', 'entryPrice', 'exitPrice', 'stopLoss', 'takeProfit', 'lotSize', 'pnl', 'riskRewardRatio', 'strategy', 'session', 'rulesFollowed', 'notes'];
    const rows = trades.map(t => [
      t.id,
      t.date,
      t.time || '',
      t.asset,
      t.type,
      t.entryPrice,
      t.exitPrice,
      t.stopLoss || '',
      t.takeProfit || '',
      t.lotSize || 1,
      t.pnl,
      t.riskRewardRatio || '',
      `"${(t.strategy || '').replace(/"/g, '""')}"`,
      t.session || '',
      t.rulesFollowed ? 'YES' : 'NO',
      `"${(t.notes || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(e => e.join(','))].join('\n');
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", `tradematrix_trades_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  // Import JSON
  const handleImportFile = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const imported = JSON.parse(event.target.result);
        if (Array.isArray(imported)) {
          onImportTrades(imported);
          alert(`Successfully imported ${imported.length} trades!`);
        } else {
          alert('Invalid file format. Must be an array of trades.');
        }
      } catch (err) {
        alert('Failed to parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="view-container">
      {/* Settings Header Card */}
      <div className="card">
        <div className="card-header">
          <div>
            <h2 className="card-title">
              <Settings size={22} style={{ color: 'var(--accent-amethyst)' }} />
              Terminal Settings & Data Management
            </h2>
            <span className="card-subtitle">
              Manage your initial capital, currency formatting, Gemini API integration, and data backups
            </span>
          </div>

          {savedSuccess && (
            <span className="badge-profit" style={{ padding: '6px 12px', fontSize: '0.82rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
              <Check size={14} />
              <span>Settings Saved Successfully!</span>
            </span>
          )}
        </div>
      </div>

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Account Capital & Currency Preferences */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Wallet size={18} style={{ color: 'var(--accent-cyan)' }} />
            Account Capital & Currency
          </h3>

          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Initial Account Balance</label>
              <input 
                type="number"
                className="form-input"
                value={formData.initialCapital}
                onChange={e => setFormData({ ...formData, initialCapital: Number(e.target.value) })}
              />
            </div>

            <div className="form-group">
              <label className="form-label">Display Currency Symbol</label>
              <select 
                className="form-select"
                value={formData.currency}
                onChange={e => setFormData({ ...formData, currency: e.target.value })}
              >
                <option value="$">$ (US Dollar)</option>
                <option value="₹">₹ (Indian Rupee)</option>
                <option value="€">€ (Euro)</option>
                <option value="£">£ (British Pound)</option>
                <option value="A$">A$ (Australian Dollar)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Google Gemini API Key & Cloud Integrations */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
            <h3 style={{ fontSize: '1rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Key size={18} style={{ color: 'var(--accent-rose)' }} />
              Google Gemini AI & Cloud Integrations
            </h3>
            {import.meta.env?.VITE_GEMINI_API_KEY && (
              <span className="badge-profit" style={{ fontSize: '0.72rem' }}>
                ● .env Connected (Active for all users)
              </span>
            )}
          </div>

          <div style={{ marginBottom: '12px' }}>
            <label className="form-label">Google Gemini API Key</label>
            <input 
              type="password"
              className="form-input"
              placeholder="AQ.Ab8... (Loaded automatically from .env)"
              value={formData.geminiApiKey || ''}
              onChange={e => setFormData({ ...formData, geminiApiKey: e.target.value })}
            />
          </div>

          {/* Integration Status Badges */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', marginTop: '14px' }}>
            {/* Google OAuth Status */}
            <div style={{ padding: '10px 14px', background: 'rgba(20, 7, 15, 0.65)', border: '1px solid rgba(244, 114, 182, 0.2)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Google Sign-In (OAuth)</div>
              <div style={{ fontSize: '0.86rem', fontWeight: 600, color: import.meta.env?.VITE_GOOGLE_CLIENT_ID ? 'var(--profit)' : '#f59e0b', marginTop: '4px' }}>
                {import.meta.env?.VITE_GOOGLE_CLIENT_ID ? '● Live Google Auth Active' : '● Ready (Awaiting VITE_GOOGLE_CLIENT_ID)'}
              </div>
            </div>

            {/* Email Notification Status */}
            <div style={{ padding: '10px 14px', background: 'rgba(20, 7, 15, 0.65)', border: '1px solid rgba(244, 114, 182, 0.2)', borderRadius: '10px' }}>
              <div style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>Gmail / Webhook Notifications</div>
              <div style={{ fontSize: '0.86rem', fontWeight: 600, color: import.meta.env?.VITE_NOTIFICATION_API_ENDPOINT ? 'var(--profit)' : '#f59e0b', marginTop: '4px' }}>
                {import.meta.env?.VITE_NOTIFICATION_API_ENDPOINT ? '● Live Dispatch Active' : '● Ready (Awaiting API Endpoint)'}
              </div>
            </div>
          </div>

          <p style={{ fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '12px', lineHeight: 1.5 }}>
            <Shield size={13} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '5px' }} />
            Your API credentials in <code>.env</code> enable real-time Gemini AI trade parsing, natural language chat mentor, and secure account management across the entire terminal.
          </p>
        </div>

        {/* Data Backup & Migration */}
        <div className="card">
          <h3 style={{ fontSize: '1rem', fontWeight: 700, marginBottom: '14px' }}>
            Data Export & Backup ({trades.length} Real Recorded Positions)
          </h3>

          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button type="button" className="btn btn-secondary" onClick={handleExportJson}>
              <Download size={16} />
              <span>Export Full JSON Backup</span>
            </button>
            <button type="button" className="btn btn-secondary" onClick={handleExportCsv}>
              <FileSpreadsheet size={16} />
              <span>Export CSV (Excel Sheet)</span>
            </button>
            <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
              <Upload size={16} />
              <span>Import JSON File</span>
              <input type="file" accept=".json" onChange={handleImportFile} style={{ display: 'none' }} />
            </label>
          </div>
        </div>

        {/* Reset Data */}
        <div className="card" style={{ borderColor: 'rgba(244, 63, 94, 0.25)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '12px' }}>
            <div>
              <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>Reset Terminal Data</span>
              <span style={{ display: 'block', fontSize: '0.76rem', color: 'var(--text-muted)', marginTop: '2px' }}>
                Clear all trades and start fresh with zero data.
              </span>
            </div>
            <button 
              type="button" 
              className="btn btn-secondary"
              style={{ color: 'var(--loss)', borderColor: 'var(--loss-border)' }}
              onClick={() => {
                if (window.confirm('Clear all logged trades to zero?')) {
                  onResetTrades();
                  alert('All trades reset to zero!');
                }
              }}
            >
              <RotateCcw size={15} />
              <span>Clear Trades</span>
            </button>
          </div>
        </div>

        {/* Save button */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '10px' }}>
          <button type="submit" className="btn btn-primary" style={{ padding: '12px 28px', fontSize: '0.95rem' }}>
            <Check size={17} />
            <span>Save Preferences</span>
          </button>
        </div>
      </form>
    </div>
  );
}
