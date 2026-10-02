import React, { useState, useEffect } from 'react';
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
  PieChart,
  ShieldCheck,
  CheckSquare,
  Square,
  AlertTriangle,
  Zap,
  Layers
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseTradeWithAI } from '../services/geminiService';
import { POPULAR_ASSETS, STRATEGIES, DEFAULT_STRATEGIES_PLAYBOOK } from '../data/initialData';
import { formatCurrency } from '../utils/calculations';

export default function LogTradeModal({ 
  isOpen, 
  onClose, 
  onSaveTrade, 
  accountCapital = 10000, 
  currency = '₹',
  geminiApiKey = '',
  strategies = DEFAULT_STRATEGIES_PLAYBOOK,
  preselectedStrategy = ''
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
    asset: 'NIFTY50',
    customAsset: '',
    type: 'BUY',
    entryPrice: '',
    exitPrice: '',
    stopLoss: '',
    takeProfit: '',
    lotSize: 1.0,
    capitalRiskedPercent: 2.0,
    pnl: '',
    riskRewardRatio: '2.0:1',
    strategy: preselectedStrategy || (strategies?.[0]?.name || '15m Range Breakout'),
    session: 'New York',
    emotion: 'Disciplined',
    rulesFollowed: true,
    notes: ''
  });

  // Leverage selection for position sizer
  const [leverage, setLeverage] = useState(1);

  // Strategy rules checklist state (ruleIndex: boolean)
  const [checkedRules, setCheckedRules] = useState({});

  // Sync preselected strategy when modal opens
  useEffect(() => {
    if (preselectedStrategy) {
      setFormData(prev => ({ ...prev, strategy: preselectedStrategy }));
      setActiveTab('manual');
    }
  }, [preselectedStrategy]);

  // Current selected strategy object
  const currentStrategyObj = (strategies || []).find(
    s => s.name?.toLowerCase() === formData.strategy?.toLowerCase()
  ) || strategies?.[0];

  // Reset checked rules when strategy changes
  useEffect(() => {
    if (currentStrategyObj?.rules) {
      const initialMap = {};
      currentStrategyObj.rules.forEach((_, idx) => {
        initialMap[idx] = true; // Default to checked
      });
      setCheckedRules(initialMap);
      setFormData(prev => ({ ...prev, rulesFollowed: true }));
    }
  }, [formData.strategy]);

  // Toggle individual rule check
  const handleToggleRule = (idx) => {
    const updated = { ...checkedRules, [idx]: !checkedRules[idx] };
    setCheckedRules(updated);

    const totalRules = currentStrategyObj?.rules?.length || 0;
    const checkedCount = Object.values(updated).filter(Boolean).length;
    const allChecked = totalRules > 0 && checkedCount === totalRules;

    setFormData(prev => ({ ...prev, rulesFollowed: allChecked }));
  };

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
      const diff = isBuy ? exit - entry : entry - exit;
      const estimatedPnl = diff * lots;
      if (!isNaN(estimatedPnl)) {
        updated.pnl = estimatedPnl.toFixed(2);
      }
    }

    setFormData(updated);
  };

  // Live Position Sizing Calculations for Manual Form
  const entryNum = parseFloat(formData.entryPrice) || 0;
  const slNum = parseFloat(formData.stopLoss) || 0;
  const tpNum = parseFloat(formData.takeProfit) || 0;
  const riskPctNum = parseFloat(formData.capitalRiskedPercent) || 2.0;

  const priceDiff = Math.abs(entryNum - slNum);
  const slDistancePct = entryNum > 0 ? (priceDiff / entryNum) * 100 : 0;
  const maxRiskAmount = accountCapital * (riskPctNum / 100);

  let calculatedQuantity = 0;
  let totalTradeValue = 0;
  let marginRequired = 0;

  if (priceDiff > 0 && entryNum > 0) {
    calculatedQuantity = Math.floor(maxRiskAmount / priceDiff);
    totalTradeValue = calculatedQuantity * entryNum;
    marginRequired = totalTradeValue / (leverage > 0 ? leverage : 1);
  }

  // Voice speech recognition
  const toggleVoiceInput = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please type trade details.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.interimResults = false;

    if (!isListening) {
      try {
        recognition.start();
        setIsListening(true);
        recognition.onresult = (e) => {
          const transcript = e.results[0][0].transcript;
          setAiPrompt(prev => prev ? `${prev} ${transcript}` : transcript);
          setIsListening(false);
        };
        recognition.onerror = () => setIsListening(false);
        recognition.onend = () => setIsListening(false);
      } catch (err) {
        setIsListening(false);
      }
    } else {
      recognition.stop();
      setIsListening(false);
    }
  };

  // AI Parse Trade
  const handleAiParse = async () => {
    if (!aiPrompt.trim()) return;
    setIsAiParsing(true);
    try {
      const parsed = await parseTradeWithAI(aiPrompt, effectiveApiKey);
      setParsedPreview(parsed);
    } catch (err) {
      console.error(err);
      alert('Error parsing trade with AI. Please use manual entry.');
    } finally {
      setIsAiParsing(false);
    }
  };

  // Save Trade
  const handleSave = (tradeData) => {
    const finalAsset = tradeData.asset === 'CUSTOM' ? (tradeData.customAsset || 'CUSTOM') : tradeData.asset;
    const finalTrade = {
      id: `tr-${Date.now()}`,
      date: tradeData.date || today,
      time: tradeData.time || currentTime,
      asset: finalAsset || 'NIFTY50',
      type: tradeData.type || 'BUY',
      entryPrice: parseFloat(tradeData.entryPrice) || 0,
      exitPrice: parseFloat(tradeData.exitPrice) || 0,
      stopLoss: parseFloat(tradeData.stopLoss) || 0,
      takeProfit: parseFloat(tradeData.takeProfit) || 0,
      lotSize: parseFloat(tradeData.lotSize) || 1.0,
      capitalRiskedPercent: parseFloat(tradeData.capitalRiskedPercent) || 2.0,
      pnl: parseFloat(tradeData.pnl) || 0,
      pnlPercent: accountCapital > 0 ? ((parseFloat(tradeData.pnl) || 0) / accountCapital) * 100 : 0,
      riskRewardRatio: tradeData.riskRewardRatio || '2.0:1',
      strategy: tradeData.strategy || '15m Range Breakout',
      session: tradeData.session || 'New York',
      emotion: tradeData.emotion || 'Disciplined',
      rulesFollowed: tradeData.rulesFollowed ?? true,
      notes: tradeData.notes || (activeTab === 'ai' ? aiPrompt : '')
    };

    if (finalTrade.pnl > 0) {
      confetti({ particleCount: 60, spread: 70, origin: { y: 0.8 } });
    }

    onSaveTrade(finalTrade);
    onClose();
  };

  // Rule counts
  const totalRules = currentStrategyObj?.rules?.length || 0;
  const checkedRulesCount = Object.values(checkedRules).filter(Boolean).length;
  const isAllRulesFollowed = totalRules > 0 && checkedRulesCount === totalRules;

  return (
    <div className="modal-overlay" data-lenis-prevent="true" onClick={onClose}>
      <div 
        className="modal-content" 
        data-lenis-prevent="true" 
        onClick={e => e.stopPropagation()}
        style={{ maxWidth: '720px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-icon" style={{ width: '32px', height: '32px' }}>
              <Calculator size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Log Market Trade</h2>
              <span className="card-subtitle">Record execution, verify strategy rules, and calculate position size</span>
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
              <span>Precision Manual Entry & Rules Check</span>
            </button>
          </div>
        </div>

        <div className="modal-body" data-lenis-prevent="true">
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
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>● Heuristic Parser Active</span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <textarea 
                    className="form-textarea" 
                    rows={3}
                    placeholder='Dictate or type: "Bought Nifty at 25800, Stop Loss 25750, Take Profit 25950, 50 qty, closed with profit ₹7500 on 15m Breakout strategy"'
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

                {/* Preset Chips */}
                <div>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block', marginBottom: '6px' }}>
                    Preset Execution Templates:
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
                      onClick={() => setAiPrompt("Bought Nifty at 25800, SL 25740, TP 25950, 50 shares, closed at profit ₹10500 on 15m Range Breakout")}
                    >
                      📊 Nifty Long (+₹10,500)
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
                      <div>{parsedPreview.lotSize} Units</div>
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

          {/* TAB 2: PRECISION MANUAL ENTRY & RULES CHECK */}
          {activeTab === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* SECTION A: STRATEGY & RULES CHECKLIST ("Tune Saare Rule Follow Kiye Kya?") */}
              <div style={{ background: 'rgba(25, 30, 50, 0.75)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                    Strategy Playbook Selection:
                  </label>
                  <select 
                    className="form-select"
                    style={{ width: 'auto', minWidth: '240px', padding: '6px 12px' }}
                    value={formData.strategy}
                    onChange={e => setFormData({ ...formData, strategy: e.target.value })}
                  >
                    {(strategies || []).map(s => (
                      <option key={s.id || s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Strategy Concept Description */}
                {currentStrategyObj?.description && (
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', background: 'rgba(0, 0, 0, 0.25)', padding: '8px 12px', borderRadius: '8px', marginBottom: '14px' }}>
                    <span style={{ color: 'var(--accent-cyan)', fontWeight: 600 }}>💡 Setup Logic: </span>
                    {currentStrategyObj.description}
                  </div>
                )}

                {/* Interactive Rules Checklist */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                    <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckSquare size={16} style={{ color: isAllRulesFollowed ? 'var(--profit)' : 'var(--accent-rose)' }} />
                      Checklist: Tune Saare Rule Follow Kiye Kya?
                    </span>
                    <span 
                      style={{ 
                        fontSize: '0.74rem', 
                        fontWeight: 700,
                        padding: '3px 10px', 
                        borderRadius: '12px',
                        background: isAllRulesFollowed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: isAllRulesFollowed ? 'var(--profit)' : 'var(--loss)'
                      }}
                    >
                      {checkedRulesCount} / {totalRules} Rules Followed
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {(currentStrategyObj?.rules || []).map((rule, idx) => {
                      const isChecked = !!checkedRules[idx];
                      return (
                        <div 
                          key={idx}
                          onClick={() => handleToggleRule(idx)}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            background: isChecked ? 'rgba(16, 185, 129, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                            border: isChecked ? '1px solid rgba(16, 185, 129, 0.3)' : '1px solid rgba(255, 255, 255, 0.07)',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            transition: 'all 0.15s ease'
                          }}
                        >
                          {isChecked ? (
                            <CheckSquare size={18} style={{ color: 'var(--profit)', flexShrink: 0 }} />
                          ) : (
                            <Square size={18} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          )}
                          <span style={{ fontSize: '0.82rem', color: isChecked ? 'var(--text-primary)' : 'var(--text-muted)', textDecoration: isChecked ? 'none' : 'none' }}>
                            {rule}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {!isAllRulesFollowed && (
                    <div style={{ marginTop: '10px', display: 'flex', alignItems: 'center', gap: '6px', fontSize: '0.78rem', color: 'var(--loss)', background: 'rgba(244, 63, 94, 0.08)', padding: '6px 12px', borderRadius: '6px' }}>
                      <AlertTriangle size={14} />
                      <span>Discipline Warning: Kuch rules miss ho rahe hain! Trade lene se pehle double check karein.</span>
                    </div>
                  )}
                </div>
              </div>

              {/* SECTION B: TRADE EXECUTION PARAMETERS */}
              <div className="form-grid">
                {/* Asset & Direction */}
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
                      placeholder="e.g. RELIANCE / SOLUSD"
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

                {/* Entry Price & Stop Loss */}
                <div className="form-group">
                  <label className="form-label">Entry Price ({currency})</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-input" 
                    placeholder="e.g. 500"
                    value={formData.entryPrice}
                    onChange={e => handlePriceChange('entryPrice', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">
                    <span>Stop Loss (SL)</span>
                    {slDistancePct > 0 && (
                      <span style={{ color: 'var(--loss)' }}>{slDistancePct.toFixed(2)}% Dist</span>
                    )}
                  </label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-input" 
                    placeholder="e.g. 480"
                    value={formData.stopLoss}
                    onChange={e => handlePriceChange('stopLoss', e.target.value)}
                  />
                </div>

                {/* Take Profit & Exit */}
                <div className="form-group">
                  <label className="form-label">Take Profit (TP)</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-input" 
                    placeholder="e.g. 540"
                    value={formData.takeProfit}
                    onChange={e => handlePriceChange('takeProfit', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Exit / Closed Price</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-input" 
                    placeholder="Leave blank if currently open"
                    value={formData.exitPrice}
                    onChange={e => handlePriceChange('exitPrice', e.target.value)}
                  />
                </div>
              </div>

              {/* SECTION C: POSITION SIZER & LEVERAGE BLUEPRINT ("Kitne Rs ka trade lu?") */}
              <div style={{ background: 'rgba(20, 10, 25, 0.8)', border: '1px solid rgba(244, 114, 182, 0.35)', borderRadius: '12px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '8px', marginBottom: '12px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Calculator size={16} style={{ color: 'var(--accent-rose)' }} />
                    Live Position Sizer: "Kitne Rs Ka Trade Lu?" (Capital: {formatCurrency(accountCapital, currency)})
                  </span>
                  
                  {/* Leverage Selector */}
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>Leverage:</span>
                    {[1, 2, 5, 10, 20].map(lev => (
                      <button
                        key={lev}
                        type="button"
                        className={`btn ${leverage === lev ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '3px 8px', fontSize: '0.72rem', minWidth: '28px', height: '26px' }}
                        onClick={() => setLeverage(lev)}
                      >
                        {lev}x
                      </button>
                    ))}
                  </div>
                </div>

                {priceDiff > 0 && entryNum > 0 ? (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: '10px', textAlign: 'center' }}>
                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Total Trade Value</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--text-primary)', fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(totalTradeValue, currency)}
                      </strong>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Margin ({leverage}x Lev)</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--accent-rose)', fontFamily: 'var(--font-mono)' }}>
                        {formatCurrency(marginRequired, currency)}
                      </strong>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Recommended Qty</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--accent-cyan)', fontFamily: 'var(--font-mono)' }}>
                        {calculatedQuantity} Units
                      </strong>
                    </div>

                    <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px', borderRadius: '8px' }}>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block' }}>Max Risk on SL</span>
                      <strong style={{ fontSize: '1.05rem', color: 'var(--loss)', fontFamily: 'var(--font-mono)' }}>
                        -{formatCurrency(maxRiskAmount, currency)} ({riskPctNum}%)
                      </strong>
                    </div>
                  </div>
                ) : (
                  <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', margin: 0 }}>
                    Enter <strong>Entry Price</strong> and <strong>Stop Loss</strong> above to calculate exact position size and margin required.
                  </p>
                )}

                {calculatedQuantity > 0 && (
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '12px', paddingTop: '10px', borderTop: '1px solid rgba(255, 255, 255, 0.08)' }}>
                    <span style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>
                      💡 Verdict: 2% risk limit ke liye aapko <strong>{calculatedQuantity} quantity ({formatCurrency(totalTradeValue, currency)})</strong> ka trade lena chahiye.
                    </span>
                    <button 
                      type="button" 
                      className="btn btn-secondary"
                      style={{ fontSize: '0.76rem', padding: '5px 12px', display: 'flex', alignItems: 'center', gap: '4px' }}
                      onClick={() => setFormData({ ...formData, lotSize: calculatedQuantity })}
                    >
                      <Zap size={13} className="text-profit" />
                      <span>Apply {calculatedQuantity} Qty</span>
                    </button>
                  </div>
                )}
              </div>

              {/* SECTION D: POSITION SIZE, R:R, & PNL */}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Position Quantity / Lots (Form Value)</label>
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
                    placeholder="2.0"
                    value={formData.capitalRiskedPercent}
                    onChange={e => setFormData({ ...formData, capitalRiskedPercent: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Risk : Reward Ratio</label>
                  <input 
                    type="text" 
                    className="form-input" 
                    placeholder="2.0:1"
                    value={formData.riskRewardRatio}
                    onChange={e => setFormData({ ...formData, riskRewardRatio: e.target.value })}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Net Realized P&L ({currency})</label>
                  <input 
                    type="number" 
                    step="any"
                    className="form-input" 
                    placeholder="+1500 or -200"
                    value={formData.pnl}
                    onChange={e => setFormData({ ...formData, pnl: e.target.value })}
                  />
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

                <div className="form-group">
                  <label className="form-label">Discipline State</label>
                  <select 
                    className="form-select"
                    value={formData.emotion}
                    onChange={e => setFormData({ ...formData, emotion: e.target.value })}
                  >
                    <option value="Disciplined">Disciplined</option>
                    <option value="Patient">Patient Wait</option>
                    <option value="FOMO">FOMO (Chased Market)</option>
                    <option value="Revenge">Revenge Trading</option>
                    <option value="Greedy">Greedy</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Trade Notes / Why did you take this setup?</label>
                  <textarea 
                    className="form-textarea"
                    rows={2}
                    placeholder="e.g. 15m breakout retest, clean rejection candle, follow through volume..."
                    value={formData.notes}
                    onChange={e => setFormData({ ...formData, notes: e.target.value })}
                  />
                </div>
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
