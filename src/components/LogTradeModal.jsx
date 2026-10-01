import React, { useState } from 'react';
import { 
  X, 
  Sparkles, 
  Mic, 
  MicOff, 
  Bot, 
  Check, 
  Calculator, 
  TrendingUp, 
  TrendingDown, 
  Flame,
  ArrowRight,
  PieChart
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseTradeWithAI } from '../services/geminiService';
import { POPULAR_ASSETS, STRATEGIES } from '../data/initialData';
import { formatCurrency } from '../utils/calculations';

export default function LogTradeModal({ 
  isOpen, 
  onClose, 
  onSaveTrade, 
  accountCapital = 10000, 
  currency = '$',
  geminiApiKey = '' 
}) {
  const effectiveApiKey = geminiApiKey || import.meta.env?.VITE_GEMINI_API_KEY || '';
  const [activeTab, setActiveTab] = useState('ai'); // 'ai' or 'manual'

  // AI Quick Log State
  const [aiPrompt, setAiPrompt] = useState('');
  const [isAiParsing, setIsAiParsing] = useState(false);
  const [parsedPreview, setParsedPreview] = useState(null);
  const [isListening, setIsListening] = useState(false);

  // Manual Form State
  const today = new Date().toISOString().split('T')[0];
  const currentTime = new Date().toTimeString().slice(0, 5);

  const [formData, setFormData] = useState({
    date: today,
    time: currentTime,
    asset: 'XAUUSD',
    customAsset: '',
    type: 'BUY',
    entryPrice: '',
    exitPrice: '',
    stopLoss: '',
    takeProfit: '',
    lotSize: 1.0,
    capitalRiskedPercent: 1.0,
    pnl: '',
    riskRewardRatio: '2.0:1',
    strategy: 'ICT Order Block',
    session: 'New York',
    emotion: 'Disciplined',
    rulesFollowed: true,
    notes: ''
  });

  if (!isOpen) return null;

  // Auto-calculate R:R and PnL in manual form
  const handlePriceChange = (field, val) => {
    const updated = { ...formData, [field]: val };
    const entry = parseFloat(field === 'entryPrice' ? val : updated.entryPrice);
    const sl = parseFloat(field === 'stopLoss' ? val : updated.stopLoss);
    const tp = parseFloat(field === 'takeProfit' ? val : updated.takeProfit);
    const exit = parseFloat(field === 'exitPrice' ? val : updated.exitPrice);
    const lots = parseFloat(updated.lotSize) || 1.0;
    const isBuy = updated.type === 'BUY';

    // Calculate Planned R:R
    if (!isNaN(entry) && !isNaN(sl) && !isNaN(tp)) {
      const risk = Math.abs(entry - sl);
      const reward = Math.abs(tp - entry);
      if (risk > 0) {
        updated.riskRewardRatio = `${(reward / risk).toFixed(1)}:1`;
      }
    }

    // Estimate PnL if exit is given and pnl is empty
    if (!isNaN(entry) && !isNaN(exit) && !updated.pnl) {
      let multiplier = 100; // typical contract
      if (updated.asset === 'BTCUSD') multiplier = 1;
      else if (updated.asset === 'EURUSD' || updated.asset === 'GBPUSD') multiplier = 100000;
      else if (updated.asset === 'XAUUSD') multiplier = 100;

      const diff = isBuy ? exit - entry : entry - exit;
      const estimatedPnl = diff * lots * (updated.asset === 'BTCUSD' ? 1 : 100);
      // Only set if reasonable
      if (!isNaN(estimatedPnl)) {
        updated.pnl = estimatedPnl.toFixed(2);
      }
    }

    setFormData(updated);
  };

  // Voice speech-to-text handler
  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please type your trade details.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US'; // handles Hinglish numbers well
    recognition.interimResults = false;

    if (!isListening) {
      recognition.start();
      setIsListening(true);

      recognition.onresult = (event) => {
        const transcript = event.results[0][0].transcript;
        setAiPrompt(prev => prev ? `${prev} ${transcript}` : transcript);
        setIsListening(false);
      };

      recognition.onerror = () => {
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };
    } else {
      recognition.stop();
      setIsListening(false);
    }
  };

  // AI Parse action
  const handleAiParse = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiParsing(true);
    try {
      const result = await parseTradeWithAI(aiPrompt, effectiveApiKey);
      setParsedPreview(result);
    } catch (e) {
      console.error(e);
    } finally {
      setIsAiParsing(false);
    }
  };

  // Confirm and Save
  const handleSave = (tradeObj) => {
    const pnl = Number(tradeObj.pnl) || 0;
    const pnlPercent = accountCapital > 0 ? Number(((pnl / accountCapital) * 100).toFixed(2)) : 0;

    const finalTrade = {
      id: `tr-${Date.now()}`,
      date: tradeObj.date || today,
      time: tradeObj.time || currentTime,
      asset: tradeObj.asset === 'CUSTOM' ? tradeObj.customAsset : tradeObj.asset,
      type: tradeObj.type || 'BUY',
      entryPrice: Number(tradeObj.entryPrice) || 0,
      exitPrice: Number(tradeObj.exitPrice) || 0,
      stopLoss: Number(tradeObj.stopLoss) || 0,
      takeProfit: Number(tradeObj.takeProfit) || 0,
      lotSize: Number(tradeObj.lotSize) || 1.0,
      capitalRiskedPercent: Number(tradeObj.capitalRiskedPercent) || 1.0,
      pnl,
      pnlPercent,
      riskRewardRatio: tradeObj.riskRewardRatio || '2.0:1',
      strategy: tradeObj.strategy || 'Discretionary',
      session: tradeObj.session || 'New York',
      emotion: tradeObj.emotion || 'Disciplined',
      rulesFollowed: tradeObj.rulesFollowed ?? true,
      notes: tradeObj.notes || ''
    };

    if (pnl > 0) {
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.7 }
      });
    }

    onSaveTrade(finalTrade);
    onClose();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-icon" style={{ width: '32px', height: '32px' }}>
              <Calculator size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Log Market Trade</h2>
              <span className="card-subtitle">Record your execution for strategy calculations</span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Mode Tabs */}
        <div style={{ padding: '0 24px', paddingTop: '16px' }}>
          <div className="tabs-header">
            <button 
              className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <Sparkles size={16} />
              <span>Gemini AI Quick-Log (Text / Voice)</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              <span>Precision Manual Entry</span>
            </button>
          </div>
        </div>

        <div className="modal-body">
          {/* TAB 1: GEMINI AI QUICK LOG */}
          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="ai-prompt-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bot size={16} style={{ color: '#818cf8' }} />
                    Voice or Text Dictation (AI Natural Language Parser):
                  </span>
                  {effectiveApiKey ? (
                    <span style={{ fontSize: '0.7rem', color: 'var(--profit)', fontWeight: 600 }}>● Gemini AI Connected (.env)</span>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>● Smart Heuristic AI Active</span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <textarea 
                    className="form-textarea"
                    rows={3}
                    placeholder='Dictate or type trade details: "Bought Gold at 2650, Stop Loss 2642, Take Profit 2670, 1.0 lot, closed with +$1,850 profit on Order Block strategy"'
                    value={aiPrompt}
                    onChange={e => setAiPrompt(e.target.value)}
                  />
                  <button 
                    className={`btn-icon ${isListening ? 'listening' : ''}`}
                    style={{
                      position: 'absolute',
                      right: '10px',
                      bottom: '10px',
                      background: isListening ? 'var(--loss)' : 'var(--bg-card)',
                      color: isListening ? 'white' : 'var(--text-primary)'
                    }}
                    onClick={toggleVoiceInput}
                    title={isListening ? 'Stop listening' : 'Speak trade details'}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                </div>

                {/* Quick Example Chips */}
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Preset Execution Templates (Click to fill):
                  </span>
                  <div className="ai-chips-list">
                    <button 
                      className="ai-chip"
                      onClick={() => setAiPrompt("Bought Gold at 2650, Stop Loss 2642, Take Profit 2670, 1.0 lot, closed at profit $1850 on Order Block strategy")}
                    >
                      🥇 Gold Long (+$1,850)
                    </button>
                    <button 
                      className="ai-chip"
                      onClick={() => setAiPrompt("Bought Bitcoin at 64000, Take Profit 65200, 0.25 lot, closed at profit $400 on 15m Breakout")}
                    >
                      ₿ Bitcoin Long (+$400)
                    </button>
                    <button 
                      className="ai-chip"
                      onClick={() => setAiPrompt("Sold EUR/USD at 1.1180, Stop Loss 1.1205, stopped out loss $250")}
                    >
                      📉 EUR/USD Short (-$250)
                    </button>
                  </div>
                </div>

                <button 
                  className="btn btn-ai"
                  style={{ alignSelf: 'flex-start', marginTop: '6px' }}
                  onClick={handleAiParse}
                  disabled={isAiParsing || !aiPrompt.trim()}
                >
                  <Sparkles size={16} />
                  <span>{isAiParsing ? 'Analyzing with AI...' : 'Parse Trade with AI'}</span>
                </button>
              </div>

              {/* Parsed Preview */}
              {parsedPreview && (
                <div style={{ background: 'var(--bg-tertiary)', border: '1px solid var(--border-accent)', borderRadius: '12px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <span className="asset-badge">{parsedPreview.asset}</span>
                      <span className={`trade-type-pill ${parsedPreview.type.toLowerCase()}`}>{parsedPreview.type}</span>
                      <span style={{ fontSize: '0.75rem', color: 'var(--accent-cyan)' }}>AI Parsed</span>
                    </div>
                    <div 
                      style={{ 
                        fontFamily: 'var(--font-mono)', 
                        fontWeight: 800, 
                        fontSize: '1.2rem',
                        color: parsedPreview.pnl >= 0 ? 'var(--profit)' : 'var(--loss)' 
                      }}
                    >
                      {parsedPreview.pnl >= 0 ? '+' : ''}{currency}{parsedPreview.pnl}
                    </div>
                  </div>

                  <div className="form-grid" style={{ fontSize: '0.8rem' }}>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Entry / Exit:</span>
                      <div>{parsedPreview.entryPrice} → {parsedPreview.exitPrice}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>SL / TP:</span>
                      <div>SL: {parsedPreview.stopLoss} | TP: {parsedPreview.takeProfit}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Risk:Reward:</span>
                      <div style={{ fontWeight: 600 }}>{parsedPreview.riskRewardRatio || '2.0:1'}</div>
                    </div>
                    <div>
                      <span style={{ color: 'var(--text-muted)' }}>Lot Size:</span>
                      <div>{parsedPreview.lotSize} Lots</div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
                    <button 
                      className="btn btn-secondary"
                      onClick={() => {
                        setFormData({
                          ...formData,
                          ...parsedPreview,
                          asset: parsedPreview.asset
                        });
                        setActiveTab('manual');
                      }}
                    >
                      Edit in Manual Form
                    </button>
                    <button 
                      className="btn btn-primary"
                      onClick={() => handleSave(parsedPreview)}
                    >
                      <Check size={16} />
                      <span>Confirm & Save to Journal</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* TAB 2: PRECISION MANUAL ENTRY */}
          {activeTab === 'manual' && (
            <div className="form-grid">
              {/* Asset & Type */}
              <div className="form-group">
                <label className="form-label">Asset / Market</label>
                <select 
                  className="form-select"
                  value={formData.asset}
                  onChange={e => setFormData({ ...formData, asset: e.target.value })}
                >
                  {POPULAR_ASSETS.map(a => (
                    <option key={a.symbol} value={a.symbol}>{a.symbol} - {a.name}</option>
                  ))}
                  <option value="CUSTOM">+ Custom Asset</option>
                </select>
              </div>

              {formData.asset === 'CUSTOM' ? (
                <div className="form-group">
                  <label className="form-label">Custom Symbol</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="e.g. SOLUSD"
                    value={formData.customAsset}
                    onChange={e => setFormData({ ...formData, customAsset: e.target.value.toUpperCase() })}
                  />
                </div>
              ) : (
                <div className="form-group">
                  <label className="form-label">Order Direction</label>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      type="button"
                      className={`btn ${formData.type === 'BUY' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, background: formData.type === 'BUY' ? 'var(--profit)' : undefined }}
                      onClick={() => setFormData({ ...formData, type: 'BUY' })}
                    >
                      BUY (Long)
                    </button>
                    <button
                      type="button"
                      className={`btn ${formData.type === 'SELL' ? 'btn-primary' : 'btn-secondary'}`}
                      style={{ flex: 1, background: formData.type === 'SELL' ? 'var(--loss)' : undefined }}
                      onClick={() => setFormData({ ...formData, type: 'SELL' })}
                    >
                      SELL (Short)
                    </button>
                  </div>
                </div>
              )}

              {/* Date & Time */}
              <div className="form-group">
                <label className="form-label">Execution Date</label>
                <input 
                  type="date" 
                  className="form-input" 
                  value={formData.date}
                  onChange={e => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Execution Time</label>
                <input 
                  type="time" 
                  className="form-input" 
                  value={formData.time}
                  onChange={e => setFormData({ ...formData, time: e.target.value })}
                />
              </div>

              {/* Entry & Exit Prices */}
              <div className="form-group">
                <label className="form-label">Entry Price</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-input" 
                  placeholder="e.g. 2650.00"
                  value={formData.entryPrice}
                  onChange={e => handlePriceChange('entryPrice', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Exit / Closed Price</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-input" 
                  placeholder="e.g. 2668.50"
                  value={formData.exitPrice}
                  onChange={e => handlePriceChange('exitPrice', e.target.value)}
                />
              </div>

              {/* SL & TP */}
              <div className="form-group">
                <label className="form-label">Stop Loss (SL)</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-input" 
                  placeholder="e.g. 2642.00"
                  value={formData.stopLoss}
                  onChange={e => handlePriceChange('stopLoss', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Take Profit (TP)</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-input" 
                  placeholder="e.g. 2670.00"
                  value={formData.takeProfit}
                  onChange={e => handlePriceChange('takeProfit', e.target.value)}
                />
              </div>

              {/* Lot Size & Capital Risk % */}
              <div className="form-group">
                <label className="form-label">Position / Lot Size</label>
                <input 
                  type="number" 
                  step="any"
                  className="form-input" 
                  placeholder="1.0"
                  value={formData.lotSize}
                  onChange={e => handlePriceChange('lotSize', e.target.value)}
                />
              </div>

              <div className="form-group">
                <label className="form-label">Risk % of Capital</label>
                <input 
                  type="number" 
                  step="0.1"
                  className="form-input" 
                  placeholder="2.0%"
                  value={formData.capitalRiskedPercent}
                  onChange={e => setFormData({ ...formData, capitalRiskedPercent: e.target.value })}
                />
              </div>

              {/* Live Position Value & Capital Allocation Indicator */}
              {(() => {
                const currentEntry = Number(formData.entryPrice) || 0;
                const currentLots = Number(formData.lotSize) || 0;
                const currentRiskPct = Number(formData.capitalRiskedPercent) || 0;
                const estTradeValue = currentEntry > 0 && currentLots > 0 ? (currentLots * currentEntry) : 0;
                const estRiskAmount = accountCapital * (currentRiskPct / 100);
                const estCapAlloc = accountCapital > 0 && estTradeValue > 0 ? ((estTradeValue / accountCapital) * 100).toFixed(1) : null;

                if (estTradeValue > 0 || estRiskAmount > 0) {
                  return (
                    <div className="full-width" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '8px', padding: '10px 14px', background: 'rgba(244, 114, 182, 0.1)', border: '1px solid rgba(244, 114, 182, 0.25)', borderRadius: '10px', fontSize: '0.8rem', margin: '2px 0 10px 0' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-primary)' }}>
                        <PieChart size={14} style={{ color: 'var(--accent-rose)' }} />
                        <span>Total Trade Size: <strong>{formatCurrency(estTradeValue, currency)}</strong></span>
                        {estCapAlloc && <span style={{ color: 'var(--accent-rose)', fontWeight: 700 }}>({estCapAlloc}% Capital)</span>}
                      </div>
                      {estRiskAmount > 0 && (
                        <span style={{ color: 'var(--loss)', fontWeight: 700 }}>
                          Max Risk: {formatCurrency(estRiskAmount, currency)} ({currentRiskPct}%)
                        </span>
                      )}
                    </div>
                  );
                }
                return null;
              })()}

              {/* R:R & Net P&L */}
              <div className="form-group">
                <label className="form-label">
                  <span>Risk : Reward Ratio</span>
                  <span style={{ color: 'var(--accent-cyan)' }}>Auto</span>
                </label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="2.0:1"
                  value={formData.riskRewardRatio}
                  onChange={e => setFormData({ ...formData, riskRewardRatio: e.target.value })}
                />
              </div>

              <div className="form-group">
                <label className="form-label">
                  <span>Net Realized P&L ({currency})</span>
                  <span style={{ color: 'var(--text-muted)' }}>+/- Amount</span>
                </label>
                <input 
                  type="number" 
                  step="any"
                  className="form-input" 
                  placeholder="+1850 or -250"
                  value={formData.pnl}
                  onChange={e => setFormData({ ...formData, pnl: e.target.value })}
                />
              </div>

              {/* Strategy & Session */}
              <div className="form-group">
                <label className="form-label">Strategy Setup</label>
                <select 
                  className="form-select"
                  value={formData.strategy}
                  onChange={e => setFormData({ ...formData, strategy: e.target.value })}
                >
                  {STRATEGIES.map(s => (
                    <option key={s} value={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Session</label>
                <select 
                  className="form-select"
                  value={formData.session}
                  onChange={e => setFormData({ ...formData, session: e.target.value })}
                >
                  <option value="New York">New York Session</option>
                  <option value="London">London Session</option>
                  <option value="Asian">Asian Session</option>
                </select>
              </div>

              {/* Discipline & Emotion */}
              <div className="form-group">
                <label className="form-label">Trade Emotion / State</label>
                <select 
                  className="form-select"
                  value={formData.emotion}
                  onChange={e => setFormData({ ...formData, emotion: e.target.value })}
                >
                  <option value="Disciplined">Disciplined (Rules Followed)</option>
                  <option value="FOMO">FOMO (Chased Market)</option>
                  <option value="Revenge">Revenge Trading</option>
                  <option value="Greedy">Greedy (Moved TP)</option>
                  <option value="Patient">Patient Wait</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Rules Followed?</label>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    className={`btn ${formData.rulesFollowed ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, background: formData.rulesFollowed ? 'var(--profit)' : undefined }}
                    onClick={() => setFormData({ ...formData, rulesFollowed: true })}
                  >
                    Yes (Strict Rules)
                  </button>
                  <button
                    type="button"
                    className={`btn ${!formData.rulesFollowed ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, background: !formData.rulesFollowed ? 'var(--loss)' : undefined }}
                    onClick={() => setFormData({ ...formData, rulesFollowed: false })}
                  >
                    No (Impulsive)
                  </button>
                </div>
              </div>

              {/* Notes */}
              <div className="form-group full-width">
                <label className="form-label">Trade Notes / Why did you take this setup?</label>
                <textarea 
                  className="form-textarea"
                  rows={2}
                  placeholder="e.g. CPI news aftermath, bounce off 15m order block, swept liquidity..."
                  value={formData.notes}
                  onChange={e => setFormData({ ...formData, notes: e.target.value })}
                />
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="modal-footer">
          <button className="btn btn-secondary" onClick={onClose}>
            Cancel
          </button>
          {activeTab === 'manual' && (
            <button 
              className="btn btn-primary"
              onClick={() => handleSave(formData)}
            >
              <Check size={16} />
              <span>Save Trade to Journal</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
