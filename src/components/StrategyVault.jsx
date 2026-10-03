import React, { useState } from 'react';
import { 
  Target, 
  Award, 
  Plus, 
  TrendingUp, 
  TrendingDown, 
  Percent, 
  Layers, 
  BookOpen, 
  CheckCircle2, 
  Edit3, 
  Trash2, 
  Zap, 
  Clock, 
  BarChart2, 
  AlertCircle,
  X,
  Check
} from 'lucide-react';
import { calculateStrategyStats, formatCurrency } from '../utils/calculations';
import { DEFAULT_STRATEGIES_PLAYBOOK } from '../data/initialData';

export default function StrategyVault({ 
  trades = [], 
  currency = '₹', 
  strategies = DEFAULT_STRATEGIES_PLAYBOOK, 
  onSaveStrategies,
  onLogTradeWithStrategy 
}) {
  const [activeTab, setActiveTab] = useState('playbook'); // 'playbook' or 'analytics'
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingStrategyId, setEditingStrategyId] = useState(null);

  // Modal Form State
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    timeframe: '15m',
    preferredAsset: 'NIFTY50 / BANKNIFTY / STOCKS',
    rules: [
      'Stop loss placed strictly before entering trade (risk max 1-2%)',
      'Wait for candle close confirmation (no premature entry)',
      'Minimum 1:2 Risk to Reward ratio'
    ]
  });
  const [newRuleInput, setNewRuleInput] = useState('');

  // Analytics stats
  const stats = calculateStrategyStats(trades);
  const topStrategy = stats.length > 0 ? stats[0] : null;

  // Open modal for Create
  const handleOpenCreate = () => {
    setEditingStrategyId(null);
    setFormData({
      name: '',
      description: '',
      timeframe: '15m',
      preferredAsset: 'NIFTY50 / BANKNIFTY / STOCKS',
      rules: [
        'Stop loss placed strictly before entering trade (risk max 1-2%)',
        'Wait for candle close confirmation (no premature entry)',
        'Minimum 1:2 Risk to Reward ratio'
      ]
    });
    setNewRuleInput('');
    setIsModalOpen(true);
  };

  // Open modal for Edit
  const handleOpenEdit = (strat) => {
    setEditingStrategyId(strat.id);
    setFormData({
      name: strat.name || '',
      description: strat.description || '',
      timeframe: strat.timeframe || '15m',
      preferredAsset: strat.preferredAsset || 'ALL',
      rules: strat.rules ? [...strat.rules] : []
    });
    setNewRuleInput('');
    setIsModalOpen(true);
  };

  // Add rule to form
  const handleAddRule = () => {
    if (!newRuleInput.trim()) return;
    setFormData(prev => ({
      ...prev,
      rules: [...prev.rules, newRuleInput.trim()]
    }));
    setNewRuleInput('');
  };

  // Remove rule from form
  const handleRemoveRule = (index) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index)
    }));
  };

  // Save Strategy
  const handleSaveForm = (e) => {
    e.preventDefault();
    if (!formData.name.trim()) {
      alert('Please enter a strategy name');
      return;
    }

    let updatedList;
    if (editingStrategyId) {
      updatedList = (strategies || []).map(s => 
        s.id === editingStrategyId ? { ...formData, id: editingStrategyId } : s
      );
    } else {
      const newStrategy = {
        ...formData,
        id: `strat-${Date.now()}`
      };
      updatedList = [...(strategies || []), newStrategy];
    }

    if (onSaveStrategies) {
      onSaveStrategies(updatedList);
    }
    setIsModalOpen(false);
  };

  // Delete Strategy
  const handleDeleteStrategy = (id) => {
    if (window.confirm('Are you sure you want to delete this strategy playbook?')) {
      const updated = (strategies || []).filter(s => s.id !== id);
      if (onSaveStrategies) {
        onSaveStrategies(updated);
      }
    }
  };

  return (
    <div className="view-container">
      {/* Top Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(99, 102, 241, 0.12), rgba(6, 182, 212, 0.08))' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="card-title" style={{ fontSize: '1.35rem', display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Target size={24} style={{ color: 'var(--accent-cyan)' }} />
              Strategy Playbook & Rules Vault
            </h2>
            <span className="card-subtitle">
              Define your setup criteria, checklist rules, and audit which strategy delivers your highest profit edge
            </span>
          </div>

          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', flexWrap: 'wrap' }}>
            {topStrategy && (
              <div className="badge-profit" style={{ padding: '8px 14px', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Award size={18} />
                <span>Highest Yield: <strong>{topStrategy.strategy}</strong> ({formatCurrency(topStrategy.totalPnl, currency)})</span>
              </div>
            )}
            <button 
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '10px 18px' }}
              onClick={handleOpenCreate}
            >
              <Plus size={18} />
              <span>+ Create Strategy Playbook</span>
            </button>
          </div>
        </div>

        {/* View Switcher Tabs */}
        <div style={{ marginTop: '20px', display: 'flex', gap: '8px', borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '12px' }}>
          <button 
            className={`tab-btn ${activeTab === 'playbook' ? 'active' : ''}`}
            onClick={() => setActiveTab('playbook')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
          >
            <BookOpen size={16} />
            <span>📖 My Strategy Playbooks & Rules ({strategies.length})</span>
          </button>
          <button 
            className={`tab-btn ${activeTab === 'analytics' ? 'active' : ''}`}
            onClick={() => setActiveTab('analytics')}
            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px' }}
          >
            <BarChart2 size={16} />
            <span>📊 Quantitative Yield & Win-Rate Stats</span>
          </button>
        </div>
      </div>

      {/* TAB 1: STRATEGY PLAYBOOK & RULES (User's custom strategies & setup rules) */}
      {activeTab === 'playbook' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: '22px' }}>
          {strategies.map((strat, idx) => {
            // Find stats for this strategy if trades exist
            const stratStat = stats.find(s => s.strategy?.toLowerCase() === strat.name?.toLowerCase());

            return (
              <div 
                key={strat.id || idx} 
                className="card" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  justifyContent: 'space-between',
                  gap: '16px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  position: 'relative'
                }}
              >
                {/* Header */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '8px' }}>
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontSize: '0.72rem', color: 'var(--accent-amethyst)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                          Setup #{idx + 1}
                        </span>
                        {strat.timeframe && (
                          <span style={{ fontSize: '0.68rem', background: 'rgba(255, 255, 255, 0.08)', padding: '2px 8px', borderRadius: '12px', color: 'var(--text-secondary)' }}>
                            <Clock size={10} style={{ display: 'inline', marginRight: '3px' }} />
                            {strat.timeframe}
                          </span>
                        )}
                        {strat.preferredAsset && (
                          <span style={{ fontSize: '0.68rem', background: 'rgba(56, 189, 248, 0.12)', color: 'var(--accent-cyan)', padding: '2px 8px', borderRadius: '12px' }}>
                            {strat.preferredAsset}
                          </span>
                        )}
                      </div>
                      <h3 style={{ fontSize: '1.2rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                        {strat.name}
                      </h3>
                    </div>

                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button 
                        className="btn-icon" 
                        style={{ width: '30px', height: '30px' }}
                        onClick={() => handleOpenEdit(strat)}
                        title="Edit Strategy"
                      >
                        <Edit3 size={14} />
                      </button>
                      <button 
                        className="btn-icon" 
                        style={{ width: '30px', height: '30px', color: 'var(--loss)' }}
                        onClick={() => handleDeleteStrategy(strat.id)}
                        title="Delete Strategy"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>

                  {/* Concept / Setup Conditions */}
                  <div style={{ marginTop: '14px', background: 'rgba(15, 20, 35, 0.65)', border: '1px solid rgba(255, 255, 255, 0.06)', borderRadius: '10px', padding: '12px 14px' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)', fontWeight: 700, display: 'block', marginBottom: '4px' }}>
                      💡 Strategy Concept & Execution Method:
                    </span>
                    <p style={{ fontSize: '0.86rem', color: 'var(--text-secondary)', lineHeight: '1.5', margin: 0 }}>
                      {strat.description || 'No description added yet. Click edit to define setup conditions.'}
                    </p>
                  </div>

                  {/* Execution Rules Checklist */}
                  <div style={{ marginTop: '14px' }}>
                    <span style={{ fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                      <CheckCircle2 size={14} style={{ color: 'var(--profit)' }} />
                      Execution Checklist Rules ({strat.rules?.length || 0} rules):
                    </span>
                    <ul style={{ margin: 0, paddingLeft: '0', listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                      {(strat.rules || []).map((rule, rIdx) => (
                        <li 
                          key={rIdx} 
                          style={{ 
                            fontSize: '0.82rem', 
                            color: 'var(--text-secondary)', 
                            display: 'flex', 
                            alignItems: 'flex-start', 
                            gap: '8px',
                            background: 'rgba(255, 255, 255, 0.02)',
                            padding: '6px 10px',
                            borderRadius: '6px'
                          }}
                        >
                          <span style={{ color: 'var(--profit)', fontWeight: 700, minWidth: '16px' }}>{rIdx + 1}.</span>
                          <span>{rule}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                {/* Footer with Performance pill & Log Trade Button */}
                <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.06)', paddingTop: '14px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  {stratStat ? (
                    <div style={{ fontSize: '0.78rem' }}>
                      <span style={{ color: 'var(--text-muted)' }}>Live Win Rate: </span>
                      <strong style={{ color: stratStat.totalPnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}>
                        {stratStat.winRate}% ({formatCurrency(stratStat.totalPnl, currency)})
                      </strong>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.76rem', color: 'var(--text-muted)' }}>0 trades logged with this setup</span>
                  )}

                  <button 
                    className="btn btn-secondary"
                    style={{ fontSize: '0.82rem', padding: '6px 14px', display: 'flex', alignItems: 'center', gap: '6px' }}
                    onClick={() => {
                      if (onLogTradeWithStrategy) {
                        onLogTradeWithStrategy(strat.name);
                      }
                    }}
                  >
                    <Zap size={14} className="text-profit" />
                    <span>Log Trade</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB 2: QUANTITATIVE YIELD & WIN-RATE STATS */}
      {activeTab === 'analytics' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '20px' }}>
          {stats.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '40px' }}>
              <p style={{ color: 'var(--text-muted)' }}>No closed trades logged yet. Log trades to see strategy analytics!</p>
            </div>
          ) : (
            stats.map((s, idx) => {
              const isWinner = s.totalPnl >= 0;
              return (
                <div key={s.strategy} className="card" style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Strategy #{idx + 1}</span>
                      <h3 style={{ fontSize: '1.15rem', fontWeight: 700, color: 'var(--text-primary)', marginTop: '2px' }}>
                        {s.strategy}
                      </h3>
                    </div>
                    <span className={isWinner ? 'badge-profit' : 'badge-loss'}>
                      {s.winRate}% Win Rate
                    </span>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-tertiary)', padding: '12px 16px', borderRadius: '10px' }}>
                    <div>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Net Realized P&L</span>
                      <div 
                        style={{ 
                          fontFamily: 'var(--font-mono)', 
                          fontSize: '1.35rem', 
                          fontWeight: 800,
                          color: isWinner ? 'var(--profit)' : 'var(--loss)'
                        }}
                      >
                        {formatCurrency(s.totalPnl, currency)}
                      </div>
                    </div>

                    <div style={{ textAlign: 'right' }}>
                      <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Profit Factor</span>
                      <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.1rem', fontWeight: 700 }}>
                        {s.profitFactor}
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', textAlign: 'center', fontSize: '0.78rem' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '8px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Positions</span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem' }}>{s.totalTrades}</span>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '8px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Wins</span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--profit)' }}>{s.wins}</span>
                    </div>
                    <div style={{ background: 'rgba(255, 255, 255, 0.02)', padding: '8px', borderRadius: '6px' }}>
                      <span style={{ color: 'var(--text-muted)', display: 'block' }}>Losses</span>
                      <span style={{ fontWeight: 700, fontSize: '0.9rem', color: 'var(--loss)' }}>{s.losses}</span>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* CREATE / EDIT STRATEGY MODAL */}
      {isModalOpen && (
        <div 
          className="modal-overlay" 
          data-lenis-prevent="true" 
          onClick={() => setIsModalOpen(false)}
          onWheel={e => e.stopPropagation()}
        >
          <div 
            className="modal-content" 
            data-lenis-prevent="true" 
            style={{ maxWidth: '640px' }}
            onClick={e => e.stopPropagation()}
            onWheel={e => e.stopPropagation()}
          >
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <div className="brand-icon" style={{ width: '34px', height: '34px' }}>
                  <BookOpen size={18} />
                </div>
                <div>
                  <h3 className="modal-title" style={{ fontSize: '1.15rem' }}>
                    {editingStrategyId ? 'Edit Strategy Playbook' : 'Create New Strategy Playbook'}
                  </h3>
                  <span className="card-subtitle">Define your setup logic and mandatory execution rules</span>
                </div>
              </div>
              <button className="btn-icon" onClick={() => setIsModalOpen(false)}>
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveForm}>
              <div className="modal-body">
                <div>
                  <label className="form-label">Strategy Name *</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. 9:15 Opening Range Breakout, EMA Pullback, ICT Order Block"
                    value={formData.name}
                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                    required
                  />
                </div>

                <div className="form-grid">
                  <div>
                    <label className="form-label">Timeframe</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. 5m, 15m, 1H, Daily"
                      value={formData.timeframe}
                      onChange={e => setFormData({ ...formData, timeframe: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="form-label">Preferred Market / Asset</label>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="e.g. NIFTY50, XAUUSD, STOCKS"
                      value={formData.preferredAsset}
                      onChange={e => setFormData({ ...formData, preferredAsset: e.target.value })}
                    />
                  </div>
                </div>

                <div>
                  <label className="form-label">Setup Concept & Method (Execution Strategy) *</label>
                  <textarea 
                    className="form-textarea" 
                    rows={3}
                    placeholder="Describe how the setup works: e.g. 'Mark 15-minute opening range, wait for confirmed breakout candle close, and enter on retest with 1:2 minimum RR...'"
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                    required
                  />
                </div>

                <div>
                  <label className="form-label">Mandatory Checklist Rules (Pre-Trade Verification)</label>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px' }}>
                    These rules will appear as an interactive checklist every time you log a trade with this strategy.
                  </span>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '12px' }}>
                    {formData.rules.map((rule, idx) => (
                      <div 
                        key={idx} 
                        style={{ 
                          display: 'flex', 
                          alignItems: 'center', 
                          justifyContent: 'space-between',
                          gap: '8px',
                          background: 'rgba(255, 255, 255, 0.04)',
                          padding: '8px 12px',
                          borderRadius: '8px'
                        }}
                      >
                        <span style={{ fontSize: '0.84rem', color: 'var(--text-secondary)' }}>
                          <strong style={{ color: 'var(--profit)', marginRight: '6px' }}>{idx + 1}.</strong>
                          {rule}
                        </span>
                        <button 
                          type="button"
                          className="btn-icon"
                          style={{ width: '26px', height: '26px', color: 'var(--loss)' }}
                          onClick={() => handleRemoveRule(idx)}
                          title="Remove Rule"
                        >
                          <X size={14} />
                        </button>
                      </div>
                    ))}
                  </div>

                  <div style={{ display: 'flex', gap: '8px' }}>
                    <input 
                      type="text" 
                      className="form-input" 
                      placeholder="Add a new checklist rule (e.g. 'Candle close outside range', 'Risk max 2%')..."
                      value={newRuleInput}
                      onChange={e => setNewRuleInput(e.target.value)}
                      onKeyDown={e => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleAddRule();
                        }
                      }}
                    />
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      onClick={handleAddRule}
                      disabled={!newRuleInput.trim()}
                    >
                      <Plus size={16} />
                      <span>Add</span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button 
                  type="button" 
                  className="btn btn-secondary" 
                  onClick={() => setIsModalOpen(false)}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn btn-primary"
                >
                  <Check size={16} />
                  <span>{editingStrategyId ? 'Save Changes' : 'Create Playbook'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
