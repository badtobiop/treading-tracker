import React, { useState } from 'react';
import { 
  X, 
  Settings, 
  HelpCircle,
  Mail, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  Shield,
  FileSpreadsheet
} from 'lucide-react';
import { INITIAL_TRADES } from '../data/initialData';

export default function SettingsModal({ 
  isOpen, 
  onClose, 
  settings, 
  onSaveSettings,
  trades,
  onResetTrades,
  onImportTrades
}) {
  const [formData, setFormData] = useState({ ...settings });
  const [savedSuccess, setSavedSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSave = (e) => {
    e.preventDefault();
    onSaveSettings(formData);
    setSavedSuccess(true);
    setTimeout(() => {
      setSavedSuccess(false);
      onClose();
    }, 600);
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
    if (trades.length === 0) return;
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
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <Settings size={20} style={{ color: 'var(--accent-cyan)' }} />
            <h2 className="modal-title" style={{ fontSize: '1.2rem' }}>Settings & Data Management</h2>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSave}>
          <div className="modal-body">
            {/* Account Settings */}
            <div className="form-grid">
              <div className="form-group">
                <label className="form-label">Initial Account Capital</label>
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

            {/* Trader Support & Help */}
            <div className="card" style={{ background: 'linear-gradient(135deg, rgba(38, 14, 28, 0.8), rgba(20, 7, 15, 0.9))', borderColor: 'rgba(244, 114, 182, 0.3)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <span style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <HelpCircle size={17} style={{ color: 'var(--accent-rose)' }} />
                  Trader Support & Help Center
                </span>
                <span className="badge-profit" style={{ fontSize: '0.7rem' }}>
                  ● 24/7 Desk
                </span>
              </div>

              <p style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: 1.45, margin: '4px 0 10px 0' }}>
                Need assistance with trade logs, calculations, or platform issues? Contact our direct support desk.
              </p>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(20, 7, 15, 0.7)', border: '1px solid rgba(244, 114, 182, 0.2)', borderRadius: '8px', padding: '10px 12px' }}>
                <div>
                  <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', textTransform: 'uppercase', display: 'block', fontWeight: 700 }}>Support Email</span>
                  <span style={{ fontSize: '0.84rem', color: '#fff1f2', fontFamily: 'var(--font-mono)' }}>utkarshdhakane2@gmail.com</span>
                </div>
                <a 
                  href="mailto:utkarshdhakane2@gmail.com?subject=TradeMatrix%20Support%20Request"
                  className="btn btn-primary"
                  style={{ padding: '6px 12px', fontSize: '0.78rem', display: 'inline-flex', alignItems: 'center', gap: '6px', textDecoration: 'none' }}
                >
                  <Mail size={13} />
                  <span>Email Help</span>
                </a>
              </div>
            </div>

            {/* Data Export / Import */}
            <div>
              <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-secondary)', display: 'block', marginBottom: '10px' }}>
                Data Backup & Migration ({trades.length} Trades)
              </span>

              <div style={{ display: 'flex', gap: '10px', flexWrap: 'wrap' }}>
                <button type="button" className="btn btn-secondary" onClick={handleExportJson}>
                  <Download size={16} />
                  <span>Export JSON Backup</span>
                </button>
                <button type="button" className="btn btn-secondary" onClick={handleExportCsv}>
                  <FileSpreadsheet size={16} />
                  <span>Export CSV (Excel)</span>
                </button>
                <label className="btn btn-secondary" style={{ cursor: 'pointer' }}>
                  <Upload size={16} />
                  <span>Import JSON</span>
                  <input type="file" accept=".json" onChange={handleImportFile} style={{ display: 'none' }} />
                </label>
              </div>
            </div>

            {/* Reset data */}
            <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <span style={{ fontSize: '0.82rem', fontWeight: 600, color: 'var(--text-primary)' }}>Reset to Demo Data</span>
                <span style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                  Restore default sample Gold, BTC, and Forex trades.
                </span>
              </div>
              <button 
                type="button" 
                className="btn btn-secondary"
                style={{ color: 'var(--loss)', borderColor: 'var(--loss-border)' }}
                onClick={() => {
                  if (window.confirm('Reset all trades to initial sample data?')) {
                    onResetTrades();
                    onClose();
                  }
                }}
              >
                <RotateCcw size={15} />
                <span>Reset Trades</span>
              </button>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={16} />
              <span>{savedSuccess ? 'Saved!' : 'Save Settings'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
