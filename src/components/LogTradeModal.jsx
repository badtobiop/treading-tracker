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
  Layers,
  Target,
  DollarSign
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
  // Default to 'manual' so the form is immediately accessible without clicking tabs
  const [activeTab, setActiveTab] = useState('manual'); 

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
    tradeAmount: '', // Total rupees invested in trade (e.g. ₹1,000, ₹10,000)
    lotSize: '',     // Units / shares / lots
    capitalRiskedPercent: 2.0,
    pnl: '',
    riskRewardRatio: '',
    outcome: 'TP_HIT', // 'TP_HIT' | 'SL_HIT' | 'BREAKEVEN' | 'OPEN' | 'MANUAL'
    strategy: preselectedStrategy || (strategies?.[0]?.name || '15m Range Breakout'),
    session: 'New York',
    emotion: 'Disciplined',
    rulesFollowed: true,
    notes: '',
    mistakeNote: ''
  });

  // Leverage selection for position sizer (default 50x for Gold / Forex)
  const [leverage, setLeverage] = useState(50);
  const [customCapital, setCustomCapital] = useState(null);
  const [riskRupees, setRiskRupees] = useState(200);

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

  // Real-time Dynamic Calculations from Entry, SL, TP & Trade Size
  const entryNum = parseFloat(formData.entryPrice) || 0;
  const slNum = parseFloat(formData.stopLoss) || 0;
  const tpNum = parseFloat(formData.takeProfit) || 0;
  const isBuy = formData.type === 'BUY';

  // Risk & Reward distances per unit
  const riskDist = entryNum > 0 && slNum > 0 ? Math.abs(entryNum - slNum) : 0;
  const rewardDist = entryNum > 0 && tpNum > 0 ? Math.abs(tpNum - entryNum) : 0;
  
  // Real dynamic Risk:Reward (Never fixed 2:1!)
  const dynamicRR = (riskDist > 0 && rewardDist > 0) 
    ? (rewardDist / riskDist).toFixed(2) 
    : (formData.riskRewardRatio || '');

  // Calculate effective quantity and total trade amount
  let currentQty = parseFloat(formData.lotSize) || 0;
  let currentAmt = parseFloat(formData.tradeAmount) || 0;

  if (currentQty === 0 && currentAmt > 0 && entryNum > 0) {
    currentQty = parseFloat((currentAmt / entryNum).toFixed(2));
  } else if (currentAmt === 0 && currentQty > 0 && entryNum > 0) {
    currentAmt = parseFloat((currentQty * entryNum).toFixed(2));
  }

  // Exact profit if TP hit & exact loss if SL hit
  const potentialProfitOnTP = currentQty > 0 && rewardDist > 0 ? (currentQty * rewardDist) : 0;
  const potentialLossOnSL = currentQty > 0 && riskDist > 0 ? (currentQty * riskDist) : 0;

  // Position Sizing based on Capital and Risk Rupees (User specifies exact loss e.g. 200 rs)
  const currentCapital = customCapital !== null ? customCapital : (accountCapital > 0 ? accountCapital : 10000);
  const targetRiskRupees = parseFloat(riskRupees) > 0 ? parseFloat(riskRupees) : 200;
  const userRiskPercent = currentCapital > 0 ? ((targetRiskRupees / currentCapital) * 100).toFixed(1) : '2.0';

  // Exact quantity needed so that SL loss is EXACTLY targetRiskRupees
  const exactUnitsNeeded = riskDist > 0 ? (targetRiskRupees / riskDist) : 0;
  const totalPositionValue = exactUnitsNeeded > 0 && entryNum > 0 ? (exactUnitsNeeded * entryNum) : 0;
  const marginNeededWithLeverage = leverage > 0 ? (totalPositionValue / leverage) : totalPositionValue;

  // Dual Currency Conversion (1 USD ≈ ₹90 for Crypto USDT & Forex)
  const USD_INR_RATE = 90;
  const toUSD = (inrVal) => (parseFloat(inrVal) / USD_INR_RATE).toFixed(2);
  const toINR = (usdVal) => (parseFloat(usdVal) * USD_INR_RATE).toFixed(0);

  // Set TP directly using desired Risk:Reward ratio (1.5, 2.0, 3.0)
  const handleSetRR = (ratio) => {
    if (entryNum <= 0 || slNum <= 0) {
      alert('Please enter Entry Price and Stop Loss (SL) first to calculate the exact Target (TP)!');
      return;
    }
    const risk = Math.abs(entryNum - slNum);
    let newTP = 0;
    if (formData.type === 'BUY') {
      newTP = entryNum + (risk * ratio);
    } else {
      newTP = entryNum - (risk * ratio);
    }
    newTP = parseFloat(newTP.toFixed(3));
    
    const updated = {
      ...formData,
      takeProfit: newTP,
      riskRewardRatio: `1:${ratio.toFixed(1)}`
    };

    if (updated.outcome === 'TP_HIT' && currentQty > 0) {
      updated.exitPrice = newTP;
      updated.pnl = (currentQty * risk * ratio).toFixed(2);
    }
    setFormData(updated);
  };

  // Auto-apply calculated position size into form
  const handleApplyPositionSize = () => {
    if (exactUnitsNeeded <= 0) {
      alert('Please enter Entry Price and Stop Loss (SL) first!');
      return;
    }
    const appliedQty = parseFloat(exactUnitsNeeded.toFixed(2));
    const appliedAmt = parseFloat((leverage > 1 ? marginNeededWithLeverage : totalPositionValue).toFixed(2));
    const updated = {
      ...formData,
      lotSize: appliedQty,
      tradeAmount: appliedAmt
    };

    if (updated.outcome === 'TP_HIT' && rewardDist > 0) {
      updated.pnl = (appliedQty * rewardDist).toFixed(2);
    } else if (updated.outcome === 'SL_HIT' && riskDist > 0) {
      updated.pnl = (-appliedQty * riskDist).toFixed(2);
    }
    setFormData(updated);
  };

  // When Entry / SL / TP / Amount change, sync calculations
  const handleInputChange = (field, val) => {
    const updated = { ...formData, [field]: val };
    const ePrice = parseFloat(field === 'entryPrice' ? val : updated.entryPrice) || 0;
    const sLoss = parseFloat(field === 'stopLoss' ? val : updated.stopLoss) || 0;
    const tProfit = parseFloat(field === 'takeProfit' ? val : updated.takeProfit) || 0;

    // Sync Lot Size and Trade Amount
    if (field === 'tradeAmount') {
      const amt = parseFloat(val) || 0;
      if (ePrice > 0 && amt > 0) {
        updated.lotSize = (amt / ePrice).toFixed(2);
      }
    } else if (field === 'lotSize') {
      const qty = parseFloat(val) || 0;
      if (ePrice > 0 && qty > 0) {
        updated.tradeAmount = (qty * ePrice).toFixed(2);
      }
    } else if (field === 'entryPrice') {
      // If entry price changes, update tradeAmount if lotSize is set
      const qty = parseFloat(updated.lotSize) || 0;
      if (ePrice > 0 && qty > 0) {
        updated.tradeAmount = (qty * ePrice).toFixed(2);
      }
    }

    // Dynamic Risk:Reward calculation
    if (ePrice > 0 && sLoss > 0 && tProfit > 0) {
      const rRisk = Math.abs(ePrice - sLoss);
      const rReward = Math.abs(tProfit - ePrice);
      if (rRisk > 0) {
        updated.riskRewardRatio = `1:${(rReward / rRisk).toFixed(2)}`;
      }
    }

    // Auto-update PnL if outcome is TP_HIT or SL_HIT
    const effQty = parseFloat(updated.lotSize) || 0;
    if (updated.outcome === 'TP_HIT' && effQty > 0 && ePrice > 0 && tProfit > 0) {
      const rew = Math.abs(tProfit - ePrice);
      updated.exitPrice = tProfit;
      updated.pnl = (effQty * rew).toFixed(2);
    } else if (updated.outcome === 'SL_HIT' && effQty > 0 && ePrice > 0 && sLoss > 0) {
      const rsk = Math.abs(ePrice - sLoss);
      updated.exitPrice = sLoss;
      updated.pnl = (-effQty * rsk).toFixed(2);
    }

    setFormData(updated);
  };

  // Outcome quick-selectors: TP Hit vs SL Hit vs Breakeven vs Open
  const handleSelectOutcome = (selectedOutcome) => {
    const updated = { ...formData, outcome: selectedOutcome };
    const ePrice = parseFloat(formData.entryPrice) || 0;
    const sLoss = parseFloat(formData.stopLoss) || 0;
    const tProfit = parseFloat(formData.takeProfit) || 0;
    const effQty = parseFloat(formData.lotSize) || (currentAmt > 0 && ePrice > 0 ? currentAmt / ePrice : 1);

    if (selectedOutcome === 'TP_HIT') {
      updated.exitPrice = tProfit || ePrice;
      const profit = effQty * Math.abs(tProfit - ePrice);
      updated.pnl = profit > 0 ? profit.toFixed(2) : (formData.pnl || '100');
    } else if (selectedOutcome === 'SL_HIT') {
      updated.exitPrice = sLoss || ePrice;
      const loss = effQty * Math.abs(ePrice - sLoss);
      updated.pnl = loss > 0 ? (-loss).toFixed(2) : (formData.pnl || '-50');
    } else if (selectedOutcome === 'BREAKEVEN') {
      updated.exitPrice = ePrice;
      updated.pnl = '0';
    } else if (selectedOutcome === 'OPEN') {
      updated.exitPrice = '';
      updated.pnl = '';
    }

    setFormData(updated);
  };

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

  // Save Trade to Journal
  const handleSave = (tradeData) => {
    const finalAsset = tradeData.asset === 'CUSTOM' ? (tradeData.customAsset || 'CUSTOM') : tradeData.asset;
    const finalTrade = {
      id: `tr-${Date.now()}`,
      date: tradeData.date || today,
      time: tradeData.time || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false }),
      asset: finalAsset || 'NIFTY50',
      type: tradeData.type || 'BUY',
      entryPrice: parseFloat(tradeData.entryPrice) || 0,
      exitPrice: tradeData.outcome === 'OPEN' ? 0 : (parseFloat(tradeData.exitPrice) || 0),
      stopLoss: parseFloat(tradeData.stopLoss) || 0,
      takeProfit: parseFloat(tradeData.takeProfit) || 0,
      tradeAmount: parseFloat(tradeData.tradeAmount) || (parseFloat(tradeData.lotSize) * parseFloat(tradeData.entryPrice)) || 0,
      lotSize: parseFloat(tradeData.lotSize) || 1.0,
      capitalRiskedPercent: parseFloat(tradeData.capitalRiskedPercent) || 2.0,
      pnl: tradeData.outcome === 'OPEN' ? 0 : (parseFloat(tradeData.pnl) || 0),
      pnlPercent: accountCapital > 0 ? ((parseFloat(tradeData.pnl) || 0) / accountCapital) * 100 : 0,
      riskRewardRatio: tradeData.riskRewardRatio || (dynamicRR ? `1:${dynamicRR}` : '1:2.0'),
      outcome: tradeData.outcome || 'TP_HIT', // Stored explicitly: TP_HIT, SL_HIT, BREAKEVEN, OPEN
      strategy: tradeData.strategy || '15m Range Breakout',
      session: tradeData.session || 'New York',
      emotion: tradeData.emotion || 'Disciplined',
      rulesFollowed: tradeData.rulesFollowed ?? true,
      notes: tradeData.notes || (activeTab === 'ai' ? aiPrompt : ''),
      mistakeNote: tradeData.mistakeNote || ''
    };

    if (finalTrade.pnl > 0 || finalTrade.outcome === 'TP_HIT') {
      confetti({ particleCount: 65, spread: 70, origin: { y: 0.8 } });
    }

    onSaveTrade(finalTrade);
    onClose();
  };

  // Rule counts
  const totalRules = currentStrategyObj?.rules?.length || 0;
  const checkedRulesCount = Object.values(checkedRules).filter(Boolean).length;
  const isAllRulesFollowed = totalRules > 0 && checkedRulesCount === totalRules;

  return (
    <div 
      className="modal-overlay" 
      data-lenis-prevent="true" 
      onClick={onClose}
      onWheel={e => e.stopPropagation()}
    >
      <div 
        className="modal-content" 
        data-lenis-prevent="true" 
        onClick={e => e.stopPropagation()}
        onWheel={e => e.stopPropagation()}
        style={{ maxWidth: '740px' }}
      >
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-icon" style={{ width: '34px', height: '34px' }}>
              <Calculator size={18} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.2rem', fontWeight: 700 }}>Log Market Trade</h2>
              <span className="card-subtitle">Automatic R:R calculation, TP vs SL profit/loss audit, and rules check</span>
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
              className={`tab-btn ${activeTab === 'manual' ? 'active' : ''}`}
              onClick={() => setActiveTab('manual')}
            >
              <span>⚡ Easy Trade Entry (TP/SL & Auto R:R)</span>
            </button>
            <button 
              className={`tab-btn ${activeTab === 'ai' ? 'active' : ''}`}
              onClick={() => setActiveTab('ai')}
            >
              <Sparkles size={16} />
              <span>Gemini AI Quick-Log (Voice / Text)</span>
            </button>
          </div>
        </div>

        <div 
          className="modal-body" 
          data-lenis-prevent="true"
          onWheel={e => e.stopPropagation()}
        >
          
          {/* TAB 1: EASY TRADE ENTRY (DEFAULT) */}
          {activeTab === 'manual' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
              
              {/* SECTION 1: ASSET & DIRECTION */}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Asset / Market</label>
                  <select 
                    className="form-select"
                    value={formData.asset}
                    onChange={e => handleInputChange('asset', e.target.value)}
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
                      onChange={e => handleInputChange('customAsset', e.target.value.toUpperCase())}
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
                        onClick={() => handleInputChange('type', 'BUY')}
                      >
                        BUY (Long)
                      </button>
                      <button
                        type="button"
                        className={`btn ${formData.type === 'SELL' ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ flex: 1, background: formData.type === 'SELL' ? 'var(--loss)' : undefined }}
                        onClick={() => handleInputChange('type', 'SELL')}
                      >
                        SELL (Short)
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* SECTION 2: ENTRY, SL, TP (THE 3 CORE PRICES) */}
              <div style={{ background: 'rgba(255, 255, 255, 0.02)', border: '1px solid rgba(255, 255, 255, 0.08)', borderRadius: '12px', padding: '16px' }}>
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block', marginBottom: '12px' }}>
                  Key Price Levels (Buy, Stop Loss & Target):
                </span>
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px' }}>
                  {/* Buy / Entry Price */}
                  <div>
                    <label className="form-label">
                      <span>Buy / Entry Price *</span>
                    </label>
                    <input 
                      type="number" 
                      step="any"
                      className="form-input" 
                      placeholder="e.g. 500"
                      value={formData.entryPrice}
                      onChange={e => handleInputChange('entryPrice', e.target.value)}
                      required
                    />
                  </div>

                  {/* Stop Loss */}
                  <div>
                    <label className="form-label">
                      <span>Stop Loss (SL) *</span>
                      {riskDist > 0 && <span style={{ color: 'var(--loss)' }}>({riskDist.toFixed(1)} pts)</span>}
                    </label>
                    <input 
                      type="number" 
                      step="any"
                      className="form-input" 
                      placeholder="e.g. 480"
                      value={formData.stopLoss}
                      onChange={e => handleInputChange('stopLoss', e.target.value)}
                      required
                    />
                  </div>

                  {/* Take Profit */}
                  <div>
                    <label className="form-label">
                      <span>Take Profit Target (TP) *</span>
                      {rewardDist > 0 && <span style={{ color: 'var(--profit)' }}>({rewardDist.toFixed(1)} pts)</span>}
                    </label>
                    <input 
                      type="number" 
                      step="any"
                      className="form-input" 
                      placeholder="e.g. 560"
                      value={formData.takeProfit}
                      onChange={e => handleInputChange('takeProfit', e.target.value)}
                      required
                    />
                  </div>
                </div>

                {/* Quick R:R target preset buttons */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '12px', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', fontWeight: 600 }}>Quick R:R Target Set:</span>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.74rem', height: 'auto', background: 'rgba(255, 255, 255, 0.05)' }}
                    onClick={() => handleSetRR(1.5)}
                    title="Calculate TP for 1:1.5 Risk:Reward"
                  >
                    🎯 Set 1:1.5 TP
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ 
                      padding: '4px 12px', 
                      fontSize: '0.74rem', 
                      height: 'auto', 
                      background: 'rgba(56, 189, 248, 0.12)', 
                      borderColor: 'var(--accent-cyan)', 
                      color: 'var(--accent-cyan)',
                      fontWeight: 700
                    }}
                    onClick={() => handleSetRR(2.0)}
                    title="Calculate TP for 1:2.0 Risk:Reward"
                  >
                    🎯 Set 1:2.0 TP (Recommended)
                  </button>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    style={{ padding: '4px 10px', fontSize: '0.74rem', height: 'auto', background: 'rgba(255, 255, 255, 0.05)' }}
                    onClick={() => handleSetRR(3.0)}
                    title="Calculate TP for 1:3.0 Risk:Reward"
                  >
                    🎯 Set 1:3.0 TP
                  </button>
                </div>

                {/* POSITION SIZER & RISK CALCULATOR (User requirement: 10k me se kitne rs ki trade lu taaki sirf 200 loss ho?) */}
                <div style={{ marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.08)', background: 'linear-gradient(145deg, rgba(20, 25, 45, 0.95), rgba(15, 23, 42, 0.95))', padding: '16px', borderRadius: '12px', border: '1px solid rgba(56, 189, 248, 0.4)', boxShadow: '0 8px 24px rgba(0,0,0,0.3)' }}>
                  
                  {/* Header */}
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ width: '28px', height: '28px', borderRadius: '6px', background: 'rgba(56, 189, 248, 0.2)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <Calculator size={16} style={{ color: 'var(--accent-cyan)' }} />
                      </div>
                      <div>
                        <strong style={{ fontSize: '0.88rem', color: '#fff' }}>
                          ⚡ Smart Trade Sizer (10k me se kitne ka trade lu?)
                        </strong>
                        <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>
                          Calculates exact trade rupees so SL loss is strictly ₹{targetRiskRupees}
                        </div>
                      </div>
                    </div>

                    <span style={{ fontSize: '0.75rem', color: 'var(--profit)', fontWeight: 700, background: 'rgba(16, 185, 129, 0.15)', padding: '4px 10px', borderRadius: '6px', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
                      Strict SL Loss: -{currency}{targetRiskRupees.toFixed(0)} ({userRiskPercent}%)
                    </span>
                  </div>

                  {/* Sizer Controls: Capital, Risk Rupees, Leverage */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(130px, 1fr))', gap: '10px', marginBottom: '14px' }}>
                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Aapka Total Capital ({currency})</label>
                      <input 
                        type="number"
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                        value={customCapital !== null ? customCapital : currentCapital}
                        onChange={e => setCustomCapital(parseFloat(e.target.value) || 0)}
                        placeholder="10000"
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>
                        <span>Aapka Max Risk ({currency}) *</span>
                      </label>
                      <input 
                        type="number"
                        className="form-input"
                        style={{ padding: '6px 10px', fontSize: '0.85rem', borderColor: 'var(--accent-cyan)', fontWeight: 700 }}
                        value={riskRupees}
                        onChange={e => setRiskRupees(e.target.value)}
                        placeholder="200"
                      />
                    </div>

                    <div>
                      <label className="form-label" style={{ fontSize: '0.72rem' }}>Leverage (Multiplier)</label>
                      <select 
                        className="form-select"
                        style={{ padding: '6px 10px', fontSize: '0.85rem' }}
                        value={leverage}
                        onChange={e => setLeverage(parseFloat(e.target.value) || 1)}
                      >
                        <option value="50">50x (Gold / Forex - Recommended)</option>
                        <option value="100">100x (High Leverage)</option>
                        <option value="20">20x (Crypto / Futures)</option>
                        <option value="10">10x (Crypto)</option>
                        <option value="5">5x (Intraday Stocks)</option>
                        <option value="1">1x (Cash - No Leverage)</option>
                      </select>
                    </div>
                  </div>

                  {/* Sizing Recommendations Answers Box */}
                  {riskDist > 0 ? (
                    <div style={{ background: 'rgba(0, 0, 0, 0.45)', borderRadius: '10px', padding: '14px', border: '1px solid rgba(56, 189, 248, 0.35)' }}>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '12px', marginBottom: '12px' }}>
                        {/* Answer 1: Kitne rupaye ka trade lu */}
                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid var(--profit)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                            👉 {currentCapital.toFixed(0)} me se kitne ka trade lu?
                          </span>
                          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--profit)', margin: '2px 0' }}>
                            {currency}{marginNeededWithLeverage.toFixed(0)}
                          </div>
                          <div style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-cyan)' }}>
                            {currency === '₹' ? `≈ $${toUSD(marginNeededWithLeverage)} USD / USDT` : `≈ ₹${toINR(marginNeededWithLeverage)} INR`}
                          </div>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                            {leverage > 1 ? `(${leverage}x Leverage Margin)` : '(Full Cash Value)'}
                          </span>
                        </div>

                        {/* Answer 2: Kitni Quantity / Lot size lu */}
                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid var(--accent-cyan)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                            👉 Kitni Quantity / Lots lu?
                          </span>
                          <div style={{ fontSize: '1.3rem', fontWeight: 800, color: 'var(--accent-cyan)', margin: '2px 0' }}>
                            {exactUnitsNeeded.toFixed(2)}
                          </div>
                          <span style={{ fontSize: '0.68rem', color: 'var(--text-secondary)' }}>
                            Units / Lots (Value: {currency}{totalPositionValue.toFixed(0)} {currency === '₹' ? `≈ $${toUSD(totalPositionValue)} USD` : ''})
                          </span>
                        </div>

                        {/* Answer 3: SL & TP Impact */}
                        <div style={{ background: 'rgba(255, 255, 255, 0.03)', padding: '10px 12px', borderRadius: '8px', borderLeft: '3px solid var(--loss)' }}>
                          <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>
                            👉 SL & TP Hit Result:
                          </span>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--loss)', marginTop: '4px' }}>
                            🛑 SL Hit: -{currency}{targetRiskRupees.toFixed(0)} <span style={{ fontSize: '0.72rem', color: 'rgba(244,63,94,0.85)' }}>({currency === '₹' ? `≈ -$${toUSD(targetRiskRupees)} USD` : ''})</span>
                          </div>
                          <div style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--profit)', marginTop: '2px' }}>
                            🎯 TP Hit: +{currency}{(exactUnitsNeeded * rewardDist).toFixed(0)} <span style={{ fontSize: '0.72rem', color: 'rgba(16,185,129,0.85)' }}>({currency === '₹' ? `≈ +$${toUSD(exactUnitsNeeded * rewardDist)} USD` : ''})</span>
                          </div>
                        </div>
                      </div>

                      {/* 1-Click Apply Button */}
                      <button
                        type="button"
                        className="btn btn-primary"
                        style={{ width: '100%', padding: '10px', fontSize: '0.86rem', fontWeight: 700, justifyContent: 'center' }}
                        onClick={handleApplyPositionSize}
                        title="Auto-fill recommended position size into form"
                      >
                        ⚡ 1-Click Auto-Fill (Apply Recommended Size)
                      </button>
                    </div>
                  ) : (
                    <div style={{ padding: '12px', background: 'rgba(255,255,255,0.02)', borderRadius: '8px', fontSize: '0.76rem', color: 'var(--text-muted)', border: '1px dashed rgba(255,255,255,0.1)' }}>
                      💡 Enter <strong>Entry Price</strong> and <strong>Stop Loss (SL)</strong> above — this calculator will automatically determine the recommended position size so your loss is strictly capped at {currency}{targetRiskRupees}.
                    </div>
                  )}
                </div>

                {/* Trade Investment Amount vs Quantity (User can input either 1k or Lot Size) */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px', marginTop: '14px', paddingTop: '14px', borderTop: '1px solid rgba(255, 255, 255, 0.06)' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <label className="form-label" style={{ marginBottom: 0 }}>
                        <span>Trade Amount ({currency})</span>
                      </label>
                      {currentAmt > 0 && (
                        <span style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)', fontWeight: 700, background: 'rgba(56, 189, 248, 0.12)', padding: '1px 6px', borderRadius: '4px' }}>
                          {currency === '₹' ? `≈ $${toUSD(currentAmt)} USD / USDT` : `≈ ₹${toINR(currentAmt)} INR`}
                        </span>
                      )}
                    </div>
                    <span style={{ color: 'var(--text-muted)', fontSize: '0.7rem', display: 'block', margin: '2px 0 4px' }}>Total trade size / capital committed</span>
                    <input 
                      type="number" 
                      step="any"
                      className="form-input" 
                      placeholder={currency === '₹' ? 'e.g. 1000 or 10000' : 'e.g. 10 or 100'}
                      value={formData.tradeAmount}
                      onChange={e => handleInputChange('tradeAmount', e.target.value)}
                    />
                  </div>

                  <div>
                    <label className="form-label">
                      <span>Quantity / Lot Size</span>
                      <span style={{ color: 'var(--accent-cyan)' }}>Shares / Units</span>
                    </label>
                    <input 
                      type="number" 
                      step="any"
                      className="form-input" 
                      placeholder="e.g. 50"
                      value={formData.lotSize}
                      onChange={e => handleInputChange('lotSize', e.target.value)}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 3: AUTOMATIC REAL-TIME CALCULATION BLUEPRINT */}
              <div style={{ background: 'rgba(28, 14, 34, 0.85)', border: '1px solid rgba(244, 114, 182, 0.35)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Sparkles size={16} style={{ color: 'var(--accent-rose)' }} />
                    Live Risk:Reward & Profit/Loss Forecast:
                  </span>
                  
                  {/* Dynamic Risk to Reward Badge */}
                  <span 
                    style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontWeight: 800, 
                      fontSize: '0.92rem',
                      padding: '4px 12px',
                      borderRadius: '20px',
                      background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.25), rgba(56, 189, 248, 0.25))',
                      color: '#fff',
                      border: '1px solid rgba(244, 114, 182, 0.4)'
                    }}
                  >
                    {riskDist > 0 && rewardDist > 0 ? `Risk:Reward = 1:${(rewardDist / riskDist).toFixed(2)}` : 'Enter Entry, SL & TP'}
                  </span>
                </div>

                {/* Profit vs Loss Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                  {/* 🟢 If TP Hits */}
                  <div style={{ background: 'rgba(16, 185, 129, 0.1)', border: '1px solid rgba(16, 185, 129, 0.3)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--profit)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                      🟢 TP Hit Kiya Toh Kitna Aayega?
                    </span>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--profit)', margin: '4px 0' }}>
                      +{currency}{potentialProfitOnTP > 0 ? potentialProfitOnTP.toFixed(0) : '0'}
                    </div>
                    {potentialProfitOnTP > 0 && currency === '₹' && (
                      <div style={{ fontSize: '0.74rem', color: 'var(--accent-cyan)', fontWeight: 700, marginBottom: '2px' }}>
                        ≈ +${toUSD(potentialProfitOnTP)} USD / USDT
                      </div>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Target: {tpNum > 0 ? tpNum : 'Set TP'}
                    </span>
                  </div>

                  {/* 🔴 If SL Hits */}
                  <div style={{ background: 'rgba(244, 63, 94, 0.1)', border: '1px solid rgba(244, 63, 94, 0.3)', borderRadius: '10px', padding: '12px', textAlign: 'center' }}>
                    <span style={{ fontSize: '0.72rem', color: 'var(--loss)', fontWeight: 700, textTransform: 'uppercase', display: 'block' }}>
                      🔴 SL Hit Kiya Toh Kitna Jaayega?
                    </span>
                    <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.4rem', fontWeight: 800, color: 'var(--loss)', margin: '4px 0' }}>
                      -{currency}{potentialLossOnSL > 0 ? potentialLossOnSL.toFixed(0) : '0'}
                    </div>
                    {potentialLossOnSL > 0 && currency === '₹' && (
                      <div style={{ fontSize: '0.74rem', color: 'rgba(244,63,94,0.9)', fontWeight: 700, marginBottom: '2px' }}>
                        ≈ -${toUSD(potentialLossOnSL)} USD / USDT
                      </div>
                    )}
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      Stop Loss: {slNum > 0 ? slNum : 'Set SL'}
                    </span>
                  </div>
                </div>
              </div>

              {/* SECTION 4: TRADE OUTCOME SELECTOR */}
              <div style={{ background: 'rgba(20, 25, 45, 0.7)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
                  <span style={{ fontSize: '0.84rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Target size={16} style={{ color: 'var(--accent-cyan)' }} />
                    Trade Outcome & Settlement (Click one to auto-record):
                  </span>
                  <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)' }}>Auto-fills Net P&L</span>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '10px' }}>
                  {/* Option 1: 🎯 TP HIT */}
                  <button
                    type="button"
                    onClick={() => handleSelectOutcome('TP_HIT')}
                    style={{
                      background: formData.outcome === 'TP_HIT' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                      border: formData.outcome === 'TP_HIT' ? '2px solid var(--profit)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '12px 6px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🎯</span>
                    <strong style={{ fontSize: '0.85rem', color: formData.outcome === 'TP_HIT' ? 'var(--profit)' : 'var(--text-primary)' }}>
                      TP Hit
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--profit)', fontWeight: 700 }}>
                      +{currency}{potentialProfitOnTP > 0 ? potentialProfitOnTP.toFixed(0) : 'Profit'}
                    </span>
                  </button>

                  {/* Option 2: 🛑 SL HIT */}
                  <button
                    type="button"
                    onClick={() => handleSelectOutcome('SL_HIT')}
                    style={{
                      background: formData.outcome === 'SL_HIT' ? 'rgba(244, 63, 94, 0.25)' : 'rgba(255, 255, 255, 0.03)',
                      border: formData.outcome === 'SL_HIT' ? '2px solid var(--loss)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '12px 6px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>🛑</span>
                    <strong style={{ fontSize: '0.85rem', color: formData.outcome === 'SL_HIT' ? 'var(--loss)' : 'var(--text-primary)' }}>
                      SL Hit
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--loss)', fontWeight: 700 }}>
                      -{currency}{potentialLossOnSL > 0 ? potentialLossOnSL.toFixed(0) : 'Loss'}
                    </span>
                  </button>

                  {/* Option 3: ⚖️ BREAKEVEN */}
                  <button
                    type="button"
                    onClick={() => handleSelectOutcome('BREAKEVEN')}
                    style={{
                      background: formData.outcome === 'BREAKEVEN' ? 'rgba(255, 255, 255, 0.18)' : 'rgba(255, 255, 255, 0.03)',
                      border: formData.outcome === 'BREAKEVEN' ? '2px solid var(--text-primary)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '12px 6px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>⚖️</span>
                    <strong style={{ fontSize: '0.85rem', color: 'var(--text-primary)' }}>
                      Breakeven
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                      {currency}0 P&L
                    </span>
                  </button>

                  {/* Option 4: ⏳ STILL OPEN */}
                  <button
                    type="button"
                    onClick={() => handleSelectOutcome('OPEN')}
                    style={{
                      background: formData.outcome === 'OPEN' ? 'rgba(56, 189, 248, 0.2)' : 'rgba(255, 255, 255, 0.03)',
                      border: formData.outcome === 'OPEN' ? '2px solid var(--accent-cyan)' : '1px solid rgba(255, 255, 255, 0.08)',
                      borderRadius: '10px',
                      padding: '12px 6px',
                      cursor: 'pointer',
                      textAlign: 'center',
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <span style={{ fontSize: '1.2rem' }}>⏳</span>
                    <strong style={{ fontSize: '0.85rem', color: formData.outcome === 'OPEN' ? 'var(--accent-cyan)' : 'var(--text-primary)' }}>
                      Still Open
                    </strong>
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>
                      Running
                    </span>
                  </button>
                </div>

                {/* Net P&L Field */}
                <div style={{ marginTop: '12px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'rgba(0, 0, 0, 0.3)', padding: '10px 14px', borderRadius: '8px' }}>
                  <span style={{ fontSize: '0.82rem', color: 'var(--text-secondary)' }}>
                    Net Realized P&L to record in journal:
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span style={{ fontSize: '1rem', fontWeight: 800, color: Number(formData.pnl) >= 0 ? 'var(--profit)' : 'var(--loss)', fontFamily: 'var(--font-mono)' }}>
                      {currency}
                    </span>
                    <input 
                      type="number" 
                      step="any"
                      className="form-input" 
                      placeholder="+150 or -50"
                      value={formData.pnl}
                      onChange={e => handleInputChange('pnl', e.target.value)}
                      style={{ width: '130px', textAlign: 'right', fontWeight: 800, fontFamily: 'var(--font-mono)' }}
                    />
                  </div>
                </div>
              </div>

              {/* SECTION 5: STRATEGY & RULES CHECKLIST */}
              <div style={{ background: 'rgba(25, 30, 50, 0.75)', border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '14px', padding: '16px' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '10px', marginBottom: '12px' }}>
                  <label className="form-label" style={{ margin: 0, fontWeight: 700, fontSize: '0.88rem', color: 'var(--text-primary)' }}>
                    Strategy Playbook:
                  </label>
                  <select 
                    className="form-select"
                    style={{ width: 'auto', minWidth: '220px', padding: '6px 12px' }}
                    value={formData.strategy}
                    onChange={e => handleInputChange('strategy', e.target.value)}
                  >
                    {(strategies || []).map(s => (
                      <option key={s.id || s.name} value={s.name}>{s.name}</option>
                    ))}
                  </select>
                </div>

                {/* Rules Checklist */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                    <span style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <CheckSquare size={15} style={{ color: isAllRulesFollowed ? 'var(--profit)' : 'var(--accent-rose)' }} />
                      Execution Checklist: Strategy Rule Verification
                    </span>
                    <span 
                      style={{ 
                        fontSize: '0.74rem', 
                        fontWeight: 700,
                        padding: '2px 8px', 
                        borderRadius: '12px',
                        background: isAllRulesFollowed ? 'rgba(16, 185, 129, 0.15)' : 'rgba(244, 63, 94, 0.15)',
                        color: isAllRulesFollowed ? 'var(--profit)' : 'var(--loss)'
                      }}
                    >
                      {checkedRulesCount} / {totalRules} Rules Followed
                    </span>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
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
                            padding: '7px 10px',
                            borderRadius: '8px',
                            cursor: 'pointer'
                          }}
                        >
                          {isChecked ? (
                            <CheckSquare size={16} style={{ color: 'var(--profit)', flexShrink: 0 }} />
                          ) : (
                            <Square size={16} style={{ color: 'var(--text-muted)', flexShrink: 0 }} />
                          )}
                          <span style={{ fontSize: '0.8rem', color: isChecked ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                            {rule}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              {/* SECTION 6: NOTES, DATE & TIME */}
              <div className="form-grid">
                <div className="form-group">
                  <label className="form-label">Execution Date</label>
                  <input 
                    type="date" 
                    className="form-input" 
                    value={formData.date}
                    onChange={e => handleInputChange('date', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Execution Time (Trade Entry Time)</label>
                  <input 
                    type="time" 
                    className="form-input" 
                    value={formData.time}
                    onChange={e => handleInputChange('time', e.target.value)}
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Discipline State</label>
                  <select 
                    className="form-select" 
                    value={formData.emotion}
                    onChange={e => handleInputChange('emotion', e.target.value)}
                  >
                    <option value="Disciplined">Disciplined</option>
                    <option value="Patient">Patient Wait</option>
                    <option value="FOMO">FOMO (Chased Market)</option>
                    <option value="Revenge">Revenge Trading</option>
                    <option value="Greedy">Greedy</option>
                  </select>
                </div>

                <div className="form-group full-width">
                  <label className="form-label">Trade Notes / Why did you take this trade?</label>
                  <textarea 
                    className="form-textarea" 
                    rows={2}
                    placeholder="e.g. Clean 15m breakout, SL behind support, followed 1:3 target..."
                    value={formData.notes}
                    onChange={e => handleInputChange('notes', e.target.value)}
                  />
                </div>

                {/* POST-MORTEM & MISTAKE ANALYSIS IF SL_HIT OR NEGATIVE PNL */}
                {(formData.outcome === 'SL_HIT' || (formData.outcome !== 'OPEN' && Number(formData.pnl) < 0)) && (
                  <div className="form-group full-width" style={{
                    background: 'rgba(244, 63, 94, 0.08)',
                    border: '1px solid rgba(244, 63, 94, 0.3)',
                    borderRadius: '10px',
                    padding: '12px 14px',
                    marginTop: '6px'
                  }}>
                    <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', color: '#fda4af', fontWeight: 700 }}>
                      <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <span>⚠️</span> Trade Post-Mortem: Root Cause & Mistake Analysis
                      </span>
                      <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>Self-Review</span>
                    </label>

                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px', marginBottom: '8px' }}>
                      {[
                        '⚡ FOMO Entry',
                        '⏳ Early Entry (No confirmation)',
                        '🛑 Moved/Removed SL',
                        '📉 Over-Leveraged / Big Lot',
                        '💥 Revenge Trade',
                        '📰 High Impact News'
                      ].map((tag, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => {
                            const prev = formData.mistakeNote ? formData.mistakeNote.trim() : '';
                            handleInputChange('mistakeNote', prev ? `${prev} • ${tag}` : tag);
                          }}
                          style={{
                            fontSize: '0.72rem',
                            padding: '3px 8px',
                            background: 'rgba(244, 63, 94, 0.18)',
                            border: '1px solid rgba(244, 63, 94, 0.35)',
                            color: '#fda4af',
                            borderRadius: '5px',
                            cursor: 'pointer'
                          }}
                        >
                          {tag}
                        </button>
                      ))}
                    </div>

                    <textarea
                      className="form-textarea"
                      rows={2}
                      placeholder="e.g. Entered prematurely before 15m candle close, exceeded maximum allowed lot size, and held past invalidation level..."
                      value={formData.mistakeNote || ''}
                      onChange={e => handleInputChange('mistakeNote', e.target.value)}
                      style={{
                        background: 'rgba(15, 23, 42, 0.7)',
                        border: '1px solid rgba(244, 63, 94, 0.35)',
                        color: 'var(--text-primary)',
                        fontSize: '0.84rem'
                      }}
                    />
                  </div>
                )}
              </div>
            </div>
          )}

          {/* TAB 2: AI QUICK LOG */}
          {activeTab === 'ai' && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              <div className="ai-prompt-box">
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <span style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Bot size={16} style={{ color: '#818cf8' }} />
                    Voice or Text Dictation:
                  </span>
                  {effectiveApiKey ? (
                    <span style={{ fontSize: '0.7rem', color: 'var(--profit)', fontWeight: 600 }}>● Gemini AI Connected</span>
                  ) : (
                    <span style={{ fontSize: '0.7rem', color: 'var(--accent-cyan)' }}>● Local NLP Parser</span>
                  )}
                </div>

                <div style={{ position: 'relative' }}>
                  <textarea 
                    className="form-textarea" 
                    rows={3}
                    placeholder='Dictate or type: "Bought Nifty at 25800, Stop Loss 25740, Take Profit 25950, 1000 rupees trade amount, hit TP with profit ₹2100"'
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
                    <div>Entry / Exit: {parsedPreview.entryPrice} → {parsedPreview.exitPrice}</div>
                    <div>SL / TP: SL {parsedPreview.stopLoss} | TP {parsedPreview.takeProfit}</div>
                    <div>Risk:Reward: {parsedPreview.riskRewardRatio || '1:2.0'}</div>
                  </div>

                  <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '6px' }}>
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
