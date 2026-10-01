import React, { useState } from 'react';
import { 
  Settings, 
  Download, 
  Upload, 
  RotateCcw, 
  Check, 
  Shield, 
  FileSpreadsheet, 
  Wallet,
  HelpCircle,
  Mail,
  MessageSquare
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
              Manage your initial capital, currency formatting, trader support desk, and data backups
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

        {/* Trader Support & Help Center */}
        <div className="card" style={{ background: 'linear-gradient(135deg, rgba(38, 14, 28, 0.8), rgba(20, 7, 15, 0.9))', borderColor: 'rgba(244, 114, 182, 0.3)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px', flexWrap: 'wrap', gap: '10px' }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: 700, margin: 0, display: 'flex', alignItems: 'center', gap: '8px', color: 'var(--text-primary)' }}>
              <HelpCircle size={19} style={{ color: 'var(--accent-rose)' }} />
              Trader Support & Help Center
            </h3>
            <span className="badge-profit" style={{ fontSize: '0.72rem' }}>
              ● 24/7 Trader Assistance
            </span>
          </div>

          <p style={{ fontSize: '0.84rem', color: 'var(--text-secondary)', lineHeight: 1.55, marginBottom: '16px' }}>
            Have questions regarding risk calculations, position sizing formulas, or journal synchronization? Our trader support desk is available to assist you.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '12px', marginBottom: '16px' }}>
            {/* Support Email Card */}
            <div style={{ padding: '14px 16px', background: 'rgba(20, 7, 15, 0.7)', border: '1px solid rgba(244, 114, 182, 0.2)', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block' }}>
                Official Support Desk
              </span>
              <strong style={{ fontSize: '0.92rem', color: '#fff1f2', display: 'block', marginTop: '4px', fontFamily: 'var(--font-mono)' }}>
                utkarshdhakane2@gmail.com
              </strong>
              <span style={{ fontSize: '0.72rem', color: 'var(--profit)', display: 'block', marginTop: '4px' }}>
                Direct email assistance
              </span>
            </div>

            {/* Direct Contact Action */}
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '14px', background: 'rgba(20, 7, 15, 0.7)', border: '1px solid rgba(244, 114, 182, 0.2)', borderRadius: '10px' }}>
              <a
                href="mailto:utkarshdhakane2@gmail.com?subject=TradeMatrix%20AI%20Trader%20Support%20Request"
                className="btn btn-primary"
                style={{ padding: '10px 18px', fontSize: '0.86rem', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '8px', width: '100%', justifyContent: 'center' }}
              >
                <Mail size={16} />
                <span>Contact Official Support</span>
              </a>
            </div>
          </div>

          {/* Quick FAQ Reference */}
          <div style={{ background: 'rgba(20, 7, 15, 0.5)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '10px', padding: '14px 16px' }}>
            <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700, display: 'block', marginBottom: '10px' }}>
              Frequently Asked Questions (FAQ)
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
              <div>
                <strong style={{ color: 'var(--text-primary)' }}>Q: How is the recommended position size calculated?</strong>
                <p style={{ margin: '3px 0 0 0', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  Position size is determined by dividing your strict cash risk (e.g. 2% of capital) by your stop loss distance in price points.
                </p>
              </div>
              <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: '10px' }}>
                <strong style={{ color: 'var(--text-primary)' }}>Q: Where are my recorded trades saved?</strong>
                <p style={{ margin: '3px 0 0 0', color: 'var(--text-muted)', lineHeight: 1.45 }}>
                  All your trades are stored privately in your browser's local encrypted storage, ensuring complete personal confidentiality.
                </p>
              </div>
            </div>
          </div>
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
