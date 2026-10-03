import React, { useState } from 'react';
import { 
  Calculator, 
  ShieldCheck, 
  ArrowRight, 
  Zap, 
  Target, 
  DollarSign, 
  PieChart, 
  Coins, 
  CheckCircle2, 
  AlertTriangle,
  HelpCircle,
  TrendingUp,
  Layers,
  Sparkles
} from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

export default function LotCalculator({ accountCapital = 10000, currency = '$' }) {
  // Account & Risk State
  const [capital, setCapital] = useState(accountCapital || 10000);
  const [activeCurrency, setActiveCurrency] = useState(currency || '₹');
  const [riskPercent, setRiskPercent] = useState(2.0); // Default to 2% as requested
  
  // Instrument & Price State
  const [instrumentType, setInstrumentType] = useState('EQUITY_CASH'); // 'EQUITY_CASH', 'XAUUSD', 'BTCUSD', 'EURUSD', 'US30', 'NIFTY50'
  const [entryPrice, setEntryPrice] = useState(500);
  const [stopLoss, setStopLoss] = useState(480); // 4% SL by default -> 50% capital (₹5,000)
  const [takeProfit, setTakeProfit] = useState(540); // 8% TP by default -> 1:2 R:R
  const [leverage, setLeverage] = useState(1); // 1x Spot/Cash by default

  // Preset Capital options
  const capitalPresets = [5000, 10000, 25000, 50000, 100000];

  // Mathematical Calculations
  const dollarRisk = (capital * (riskPercent / 100)); // Max allowed risk in currency (e.g. ₹200)
  const priceDiff = Math.abs(entryPrice - stopLoss);
  const slPercent = entryPrice > 0 ? (priceDiff / entryPrice) * 100 : 0;
  const isBuy = entryPrice >= stopLoss;

  // Calculate Quantity / Lots and Total Trade Value
  let recommendedQuantity = 0;
  let unitLabel = 'Units';
  let totalTradeValue = 0; // Total value of the position in Rs / $
  let marginRequired = 0;  // Actual cash needed from account

  if (priceDiff > 0 && entryPrice > 0) {
    if (instrumentType === 'EQUITY_CASH') {
      // Direct Cash Equity / Indian Stocks / Spot Crypto:
      // Risk = Quantity * priceDiff  =>  Quantity = Risk / priceDiff
      recommendedQuantity = Math.floor(dollarRisk / priceDiff);
      unitLabel = 'Shares';
      totalTradeValue = recommendedQuantity * entryPrice;
      marginRequired = totalTradeValue / leverage;
    } else if (instrumentType === 'XAUUSD') {
      // Gold: 1 lot = 100 oz. $1 move = $100 per 1 lot.
      recommendedQuantity = dollarRisk / (priceDiff * 100);
      unitLabel = 'Lots';
      totalTradeValue = recommendedQuantity * 100 * entryPrice;
      marginRequired = totalTradeValue / (leverage > 1 ? leverage : 50); // Default 1:50 margin for Gold
    } else if (instrumentType === 'BTCUSD') {
      // BTC: 1 BTC move of $1 = $1 per 1 unit
      recommendedQuantity = dollarRisk / priceDiff;
      unitLabel = 'BTC';
      totalTradeValue = recommendedQuantity * entryPrice;
      marginRequired = totalTradeValue / leverage;
    } else if (instrumentType === 'EURUSD' || instrumentType === 'GBPUSD') {
      // Forex: 1 Standard Lot = 100,000 units. 1 pip (0.0001) = $10.
      const pips = priceDiff / 0.0001;
      recommendedQuantity = dollarRisk / (pips * 10);
      unitLabel = 'Lots';
      totalTradeValue = recommendedQuantity * 100000 * entryPrice;
      marginRequired = totalTradeValue / (leverage > 1 ? leverage : 100);
    } else if (instrumentType === 'NIFTY50') {
      // Nifty: Lot size 25 units
      const lotSize = 25;
      const rawUnits = dollarRisk / priceDiff;
      const lots = Math.max(1, Math.round(rawUnits / lotSize));
      recommendedQuantity = lots;
      unitLabel = `Lots (${lots * lotSize} qty)`;
      totalTradeValue = lots * lotSize * entryPrice;
      marginRequired = totalTradeValue / (leverage > 1 ? leverage : 5);
    } else {
      // Index (US30)
      recommendedQuantity = dollarRisk / priceDiff;
      unitLabel = 'Contracts';
      totalTradeValue = recommendedQuantity * entryPrice;
      marginRequired = totalTradeValue / (leverage > 1 ? leverage : 20);
    }
  }

  // Capital Allocation Percentage
  const capitalAllocationPercent = capital > 0 ? (marginRequired / capital) * 100 : 0;
  const remainingCash = Math.max(0, capital - marginRequired);
  const remainingCashPercent = Math.max(0, 100 - capitalAllocationPercent);

  // Take Profit Targets for 1:2 and 1:3 R:R
  const target1to2 = isBuy ? entryPrice + (priceDiff * 2) : entryPrice - (priceDiff * 2);
  const target1to3 = isBuy ? entryPrice + (priceDiff * 3) : entryPrice - (priceDiff * 3);

  // Custom User TP calculations
  const tpDiff = Math.abs(takeProfit - entryPrice);
  const customRR = priceDiff > 0 ? (tpDiff / priceDiff).toFixed(1) : '2.0';
  const customRewardAmount = priceDiff > 0 ? dollarRisk * (tpDiff / priceDiff) : (dollarRisk * 2);

  // Preset Scenario Matrix Helper
  const calculateScenario = (scenarioSlPercent) => {
    if (scenarioSlPercent <= 0) return { tradeValue: 0, capitalPct: 0, qty: 0 };
    // Trade Value = Risk Amount / (SL% / 100)
    const tValue = dollarRisk / (scenarioSlPercent / 100);
    const capPct = (tValue / capital) * 100;
    const qty = entryPrice > 0 ? (tValue / entryPrice) : 0;
    return {
      tradeValue: tValue,
      capitalPct: capPct,
      qty: Math.floor(qty)
    };
  };

  const scenario10k = calculateScenario(2.0);  // 2% SL -> exactly ₹10,000
  const scenario5k = calculateScenario(4.0);   // 4% SL -> exactly ₹5,000
  const scenario2k = calculateScenario(10.0);  // 10% SL -> exactly ₹2,000
  const scenario20k = calculateScenario(1.0);  // 1% SL -> ₹20,000 (requires 2x leverage)

  return (
    <div className="view-container">
      {/* Top Banner */}
      <div className="card" style={{ background: 'linear-gradient(135deg, rgba(244, 63, 94, 0.14), rgba(236, 72, 153, 0.08))', borderColor: 'rgba(244, 114, 182, 0.3)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h2 className="card-title" style={{ fontSize: '1.25rem' }}>
              <Calculator size={22} style={{ color: 'var(--accent-rose)' }} />
              Pre-Trade Position Size & Capital Allocation Calculator
            </h2>
            <span className="card-subtitle">
              Calculate exact position size and capital allocation (100% Full, 50% Standard, or 20% Conservative) based on strict risk parameters
            </span>
          </div>

          {/* Quick Currency Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: 'rgba(20, 7, 15, 0.7)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(244, 114, 182, 0.25)' }}>
            <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)', padding: '0 8px', fontWeight: 600 }}>Currency:</span>
            {['₹', '$', '€', '£'].map(c => (
              <button
                key={c}
                type="button"
                className={`btn ${activeCurrency === c ? 'btn-primary' : 'btn-secondary'}`}
                style={{ padding: '4px 10px', fontSize: '0.82rem', minWidth: '32px', height: '30px' }}
                onClick={() => setActiveCurrency(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Grid: Inputs vs Blueprint Output */}
      <div style={{ display: 'grid', gridTemplateColumns: '1.15fr 1fr', gap: '24px' }}>
        
        {/* LEFT COLUMN: PARAMETER INPUTS */}
        <div className="card" style={{ display: 'flex', flexDirection: 'column', gap: '18px' }}>
          <div className="card-header" style={{ marginBottom: 0 }}>
            <h3 style={{ fontSize: '1.02rem', fontWeight: 700, color: 'var(--text-primary)', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Layers size={18} style={{ color: 'var(--accent-rose)' }} />
              1. Trade Configuration
            </h3>
            <span style={{ fontSize: '0.75rem', color: 'var(--accent-rose)', fontWeight: 600 }}>
              Live Risk: {formatCurrency(dollarRisk, activeCurrency)} ({riskPercent}%)
            </span>
          </div>

          <div className="form-grid">
            {/* Account Capital */}
            <div className="form-group full-width">
              <label className="form-label">
                <span>Account Capital ({activeCurrency})</span>
                <span style={{ color: 'var(--text-muted)' }}>Total Portfolio Balance</span>
              </label>
              <input 
                type="number" 
                className="form-input" 
                value={capital}
                onChange={e => setCapital(Math.max(1, Number(e.target.value)))}
                style={{ fontSize: '1.1rem', fontWeight: 700, fontFamily: 'var(--font-mono)' }}
              />
              {/* Capital Quick Presets */}
              <div style={{ display: 'flex', gap: '6px', marginTop: '6px', flexWrap: 'wrap' }}>
                {capitalPresets.map(preset => (
                  <button
                    key={preset}
                    type="button"
                    className={`btn ${capital === preset ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ padding: '4px 9px', fontSize: '0.74rem' }}
                    onClick={() => setCapital(preset)}
                  >
                    {activeCurrency}{preset >= 1000 ? `${preset / 1000}k` : preset}
                  </button>
                ))}
              </div>
            </div>

            {/* Risk Percentage */}
            <div className="form-group full-width">
              <label className="form-label">
                <span>Risk per Trade (%)</span>
                <span style={{ color: 'var(--loss)', fontWeight: 700 }}>
                  Max Dollar Risk: {formatCurrency(dollarRisk, activeCurrency)}
                </span>
              </label>
              <div style={{ display: 'flex', gap: '8px' }}>
                {[0.5, 1.0, 2.0, 3.0, 5.0].map(pct => (
                  <button
                    key={pct}
                    type="button"
                    className={`btn ${riskPercent === pct ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '8px 10px', fontSize: '0.82rem' }}
                    onClick={() => setRiskPercent(pct)}
                  >
                    {pct}%
                  </button>
                ))}
              </div>
            </div>

            {/* Instrument Selection */}
            <div className="form-group full-width">
              <label className="form-label">Market / Asset Type</label>
              <select 
                className="form-select"
                value={instrumentType}
                onChange={e => {
                  const val = e.target.value;
                  setInstrumentType(val);
                  if (val === 'EQUITY_CASH') { setEntryPrice(500); setStopLoss(480); setTakeProfit(540); setLeverage(1); }
                  else if (val === 'XAUUSD') { setEntryPrice(2650); setStopLoss(2642); setTakeProfit(2666); setLeverage(50); }
                  else if (val === 'BTCUSD') { setEntryPrice(64000); setStopLoss(63200); setTakeProfit(65600); setLeverage(1); }
                  else if (val === 'EURUSD') { setEntryPrice(1.1180); setStopLoss(1.1155); setTakeProfit(1.1230); setLeverage(100); }
                  else if (val === 'NIFTY50') { setEntryPrice(25800); setStopLoss(25720); setTakeProfit(25960); setLeverage(5); }
                  else if (val === 'US30') { setEntryPrice(42300); setStopLoss(42150); setTakeProfit(42600); setLeverage(20); }
                }}
              >
                <option value="EQUITY_CASH">🇮🇳 Indian Stocks / Cash Equities (₹ Share Buy/Sell)</option>
                <option value="NIFTY50">📊 Nifty 50 Index (25 Qty Lot Contract)</option>
                <option value="BTCUSD">🪙 Crypto Spot / Futures (BTC, ETH, Altcoins)</option>
                <option value="XAUUSD">🥇 Gold (XAUUSD) - 100 oz Commodity Contract</option>
                <option value="EURUSD">💱 EUR/USD & Forex (100k Currency Contract)</option>
                <option value="US30">📈 US30 / Dow Jones Index</option>
              </select>
            </div>

            {/* Planned Entry Price */}
            <div className="form-group">
              <label className="form-label">Entry Price ({activeCurrency})</label>
              <input 
                type="number" 
                step="any"
                className="form-input" 
                value={entryPrice}
                onChange={e => setEntryPrice(Number(e.target.value))}
              />
            </div>

            {/* Stop Loss Price */}
            <div className="form-group">
              <label className="form-label">
                <span>Stop Loss Price (SL)</span>
                <span style={{ color: 'var(--loss)' }}>{slPercent.toFixed(2)}% Distance</span>
              </label>
              <input 
                type="number" 
                step="any"
                className="form-input" 
                value={stopLoss}
                onChange={e => setStopLoss(Number(e.target.value))}
              />
            </div>

            {/* Take Profit Target Price */}
            <div className="form-group full-width">
              <label className="form-label">
                <span>Take Profit Target (TP)</span>
                <span style={{ color: 'var(--profit)' }}>1:{customRR} Risk:Reward (+{formatCurrency(customRewardAmount, activeCurrency)})</span>
              </label>
              <input 
                type="number" 
                step="any"
                className="form-input" 
                value={takeProfit}
                onChange={e => setTakeProfit(Number(e.target.value))}
              />
            </div>

            {/* Leverage / Margin Multiplier */}
            <div className="form-group full-width">
              <label className="form-label">
                <span>Leverage / Margin Mode</span>
                <span style={{ color: 'var(--text-muted)' }}>{leverage}x Buying Power</span>
              </label>
              <div style={{ display: 'flex', gap: '6px' }}>
                {[1, 2, 5, 10, 20, 50, 100].map(lev => (
                  <button
                    key={lev}
                    type="button"
                    className={`btn ${leverage === lev ? 'btn-primary' : 'btn-secondary'}`}
                    style={{ flex: 1, padding: '6px 8px', fontSize: '0.78rem' }}
                    onClick={() => setLeverage(lev)}
                  >
                    {lev}x
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: DIRECT ANSWER BLUEPRINT */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
          
          {/* PRIMARY HERO CARD: EXACT CAPITAL TO COMMIT */}
          <div className="card" style={{ background: 'rgba(38, 14, 28, 0.85)', border: '1px solid rgba(244, 114, 182, 0.45)', boxShadow: '0 12px 36px rgba(0, 0, 0, 0.6), 0 0 25px rgba(244, 63, 94, 0.18)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <ShieldCheck size={20} className="text-profit" />
                <span style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Exact Trade Size Required
                </span>
              </div>
              <span className={capitalAllocationPercent <= 100 ? 'badge-profit' : 'badge-loss'}>
                {capitalAllocationPercent <= 100 ? 'Safe Allocation' : 'Leverage Required'}
              </span>
            </div>

            {/* BIG HIGHLIGHT: How many Rupees to deploy */}
            <div style={{ textAlign: 'center', padding: '16px', background: 'rgba(20, 7, 15, 0.7)', borderRadius: '14px', border: '1px solid rgba(244, 114, 182, 0.2)' }}>
              <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 600 }}>
                Total Capital to Deploy (Trade Value):
              </span>
              <div style={{ fontFamily: 'var(--font-mono)', fontSize: '2.5rem', fontWeight: 800, color: '#fff1f2', marginTop: '6px', textShadow: '0 0 20px rgba(244, 114, 182, 0.4)' }}>
                {formatCurrency(marginRequired, activeCurrency)}
              </div>
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(244, 114, 182, 0.16)', padding: '4px 12px', borderRadius: '20px', marginTop: '6px' }}>
                <PieChart size={13} style={{ color: 'var(--accent-rose)' }} />
                <span style={{ fontSize: '0.82rem', fontWeight: 700, color: 'var(--accent-rose)' }}>
                  {capitalAllocationPercent.toFixed(1)}% of your {formatCurrency(capital, activeCurrency)} Capital
                </span>
              </div>
            </div>

            {/* Position Quantity / Lots Badge */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '14px', padding: '12px 16px', background: 'rgba(45, 16, 33, 0.6)', borderRadius: '10px' }}>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Recommended Quantity / Volume:</span>
              <strong style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', color: 'var(--accent-rose)' }}>
                {recommendedQuantity > 0 ? (unitLabel === 'Shares' || unitLabel.includes('Lots') ? recommendedQuantity : recommendedQuantity.toFixed(2)) : 0} {unitLabel}
              </strong>
            </div>

            {/* Visual Capital Allocation Progress Bar */}
            <div style={{ marginTop: '16px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.78rem', color: 'var(--text-muted)', marginBottom: '6px' }}>
                <span>Active Trade: <strong>{formatCurrency(marginRequired, activeCurrency)} ({Math.min(100, capitalAllocationPercent).toFixed(0)}%)</strong></span>
                <span>Safe Cash Buffer: <strong>{formatCurrency(remainingCash, activeCurrency)} ({remainingCashPercent.toFixed(0)}%)</strong></span>
              </div>
              <div style={{ width: '100%', height: '10px', background: 'rgba(255, 255, 255, 0.08)', borderRadius: '6px', overflow: 'hidden', display: 'flex' }}>
                <div 
                  style={{ 
                    width: `${Math.min(100, capitalAllocationPercent)}%`, 
                    height: '100%', 
                    background: capitalAllocationPercent > 100 ? 'var(--loss)' : 'linear-gradient(90deg, #f43f5e, #ec4899)' 
                  }} 
                />
                <div 
                  style={{ 
                    width: `${remainingCashPercent}%`, 
                    height: '100%', 
                    background: 'rgba(16, 185, 129, 0.4)' 
                  }} 
                />
              </div>
            </div>

            {/* Direct Decision Verdict: Position Sizing & Allocation */}
            <div style={{ marginTop: '14px', padding: '14px', background: 'rgba(20, 7, 15, 0.75)', border: '1px solid rgba(244, 114, 182, 0.3)', borderRadius: '12px', fontSize: '0.84rem', lineHeight: 1.6, color: 'var(--text-secondary)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', color: 'var(--accent-rose)', fontWeight: 700 }}>
                <Sparkles size={16} />
                <span>💡 Verdict: Capital Allocation & Recommended Position Size</span>
              </div>
              <p style={{ margin: 0 }}>
                {totalTradeValue >= capital ? (
                  <>
                    Your Stop Loss is only <strong>{slPercent.toFixed(1)}%</strong> away. Based on your strict <strong>{riskPercent}% ({formatCurrency(dollarRisk, activeCurrency)})</strong> risk parameters, you can take a position size of up to <strong>{formatCurrency(totalTradeValue, activeCurrency)}</strong>. 
                    {leverage > 1 && (
                      <span style={{ display: 'block', marginTop: '6px', color: 'var(--accent-cyan)' }}>
                        ⚡ Using <strong>{leverage}x Leverage</strong>, only <strong>{formatCurrency(marginRequired, activeCurrency)}</strong> cash margin is utilized, keeping your remaining <strong>{formatCurrency(remainingCash, activeCurrency)}</strong> capital safe!
                      </span>
                    )}
                  </>
                ) : (
                  <>
                    You should <strong>NOT</strong> allocate your entire <strong>{formatCurrency(capital, activeCurrency)}</strong> balance! Cap this position at <strong>{formatCurrency(totalTradeValue, activeCurrency)}</strong> so that if Stop Loss is triggered, your total loss is strictly limited to <strong>{formatCurrency(dollarRisk, activeCurrency)} ({riskPercent}%)</strong>.
                    {leverage > 1 && (
                      <span style={{ display: 'block', marginTop: '6px', color: 'var(--accent-cyan)' }}>
                        ⚡ With <strong>{leverage}x Leverage</strong>, only <strong>{formatCurrency(marginRequired, activeCurrency)}</strong> margin is committed from your account balance!
                      </span>
                    )}
                  </>
                )}
              </p>
            </div>
          </div>

          {/* RISK & REWARD TARGETS */}
          <div className="card" style={{ padding: '18px 22px' }}>
            <h4 style={{ fontSize: '0.88rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Target size={16} style={{ color: 'var(--accent-rose)' }} />
              Profit & Loss Projections (Strict Mathematical Rules)
            </h4>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '10px', textAlign: 'center' }}>
              {/* Stop Loss Hit */}
              <div style={{ background: 'var(--loss-bg)', border: '1px solid var(--loss-border)', padding: '12px 8px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>If Stop Loss Hits:</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--loss)', display: 'block', margin: '4px 0' }}>
                  -{formatCurrency(dollarRisk, activeCurrency)}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--text-dim)' }}>(-{riskPercent}% Account)</span>
              </div>

              {/* 1:2 TP Hit */}
              <div style={{ background: 'var(--profit-bg)', border: '1px solid var(--profit-border)', padding: '12px 8px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Take Profit (1:2 R:R):</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--profit)', display: 'block', margin: '4px 0' }}>
                  +{formatCurrency(dollarRisk * 2, activeCurrency)}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--profit)' }}>(Target: {target1to2.toFixed(2)})</span>
              </div>

              {/* 1:3 TP Hit */}
              <div style={{ background: 'var(--profit-bg)', border: '1px solid var(--profit-border)', padding: '12px 8px', borderRadius: '10px' }}>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', display: 'block', textTransform: 'uppercase' }}>Take Profit (1:3 R:R):</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1.05rem', color: 'var(--profit)', display: 'block', margin: '4px 0' }}>
                  +{formatCurrency(dollarRisk * 3, activeCurrency)}
                </span>
                <span style={{ fontSize: '0.68rem', color: 'var(--profit)' }}>(Target: {target1to3.toFixed(2)})</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* DYNAMIC SCENARIO MATRIX: EXACT COMPARISON (100% vs 50% vs 20%) */}
      <div className="card">
        <div className="card-header">
          <div>
            <h3 className="card-title">
              <Sparkles size={19} style={{ color: 'var(--accent-rose)' }} />
              Position Size Comparison Matrix: "When should you deploy 100%, 50%, or 20% Capital?"
            </h3>
            <span className="card-subtitle">
              Based on your {formatCurrency(capital, activeCurrency)} capital and strict {riskPercent}% ({formatCurrency(dollarRisk, activeCurrency)}) risk management rule:
            </span>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '16px' }}>
          
          {/* Card 1: 100% Capital (₹10,000) */}
          <div 
            style={{ 
              background: 'rgba(25, 9, 20, 0.85)', 
              border: Math.abs(capitalAllocationPercent - 100) < 5 ? '2px solid var(--accent-rose)' : '1px solid rgba(244, 114, 182, 0.25)', 
              borderRadius: '12px', 
              padding: '16px',
              position: 'relative'
            }}
          >
            {Math.abs(capitalAllocationPercent - 100) < 5 && (
              <span className="best-day-badge" style={{ top: '-10px', right: '12px' }}>CURRENT PLAN</span>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Scenario A: 2.0% Tight Stop Loss
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: '#fff1f2', margin: '6px 0' }}>
              {formatCurrency(scenario10k.tradeValue, activeCurrency)}
            </div>
            <span className="badge-profit" style={{ fontSize: '0.75rem' }}>
              100% of Capital (Full Allocation)
            </span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.45 }}>
              When executing with a tight 2.0% stop loss, allocate <strong>{formatCurrency(capital, activeCurrency)} (100% Capital)</strong>. If stopped out, your loss is mathematically capped at exactly <strong>{formatCurrency(dollarRisk, activeCurrency)}</strong>!
            </p>
          </div>

          {/* Card 2: 50% Capital (₹5,000) */}
          <div 
            style={{ 
              background: 'rgba(25, 9, 20, 0.85)', 
              border: Math.abs(capitalAllocationPercent - 50) < 5 ? '2px solid var(--accent-rose)' : '1px solid rgba(244, 114, 182, 0.25)', 
              borderRadius: '12px', 
              padding: '16px',
              position: 'relative'
            }}
          >
            {Math.abs(capitalAllocationPercent - 50) < 5 && (
              <span className="best-day-badge" style={{ top: '-10px', right: '12px' }}>CURRENT PLAN</span>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Scenario B: 4.0% Standard Stop Loss
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: '#fff1f2', margin: '6px 0' }}>
              {formatCurrency(scenario5k.tradeValue, activeCurrency)}
            </div>
            <span className="badge-profit" style={{ fontSize: '0.75rem', background: 'rgba(244, 114, 182, 0.16)', color: 'var(--accent-rose)', borderColor: 'rgba(244, 114, 182, 0.35)' }}>
              50% of Capital ({formatCurrency(capital * 0.5, activeCurrency)} Trade)
            </span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.45 }}>
              With a standard 4.0% stop loss, deploy <strong>{formatCurrency(capital * 0.5, activeCurrency)} (50% Capital)</strong>. The remaining <strong>{formatCurrency(capital * 0.5, activeCurrency)} cash</strong> stays fully protected as a safe reserve buffer!
            </p>
          </div>

          {/* Card 3: 20% Capital (₹2,000) */}
          <div 
            style={{ 
              background: 'rgba(25, 9, 20, 0.85)', 
              border: Math.abs(capitalAllocationPercent - 20) < 5 ? '2px solid var(--accent-rose)' : '1px solid rgba(244, 114, 182, 0.25)', 
              borderRadius: '12px', 
              padding: '16px',
              position: 'relative'
            }}
          >
            {Math.abs(capitalAllocationPercent - 20) < 5 && (
              <span className="best-day-badge" style={{ top: '-10px', right: '12px' }}>CURRENT PLAN</span>
            )}
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Scenario C: 10.0% Swing / Deep Stop
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: '#fff1f2', margin: '6px 0' }}>
              {formatCurrency(scenario2k.tradeValue, activeCurrency)}
            </div>
            <span className="badge-profit" style={{ fontSize: '0.75rem', background: 'rgba(56, 189, 248, 0.14)', color: '#38bdf8', borderColor: 'rgba(56, 189, 248, 0.35)' }}>
              20% of Capital ({formatCurrency(capital * 0.2, activeCurrency)} Trade)
            </span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.45 }}>
              For swing setups with a wide 10.0% stop loss, allocate <strong>{formatCurrency(capital * 0.2, activeCurrency)} (20% Capital)</strong> to insulate your portfolio from large market drawdowns!
            </p>
          </div>

          {/* Card 4: Tight 1% SL / Leverage */}
          <div 
            style={{ 
              background: 'rgba(25, 9, 20, 0.85)', 
              border: '1px solid rgba(244, 114, 182, 0.25)', 
              borderRadius: '12px', 
              padding: '16px' 
            }}
          >
            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', textTransform: 'uppercase', fontWeight: 700 }}>
              Scenario D: 1.0% Scalp Stop Loss
            </div>
            <div style={{ fontFamily: 'var(--font-mono)', fontSize: '1.5rem', fontWeight: 800, color: '#fff1f2', margin: '6px 0' }}>
              {formatCurrency(scenario20k.tradeValue, activeCurrency)}
            </div>
            <span className="badge-loss" style={{ fontSize: '0.75rem' }}>
              200% (2x Leverage Required)
            </span>
            <p style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '10px', lineHeight: 1.45 }}>
              For scalp setups with an ultra-tight 1.0% stop loss, deploying high purchasing volume requires <strong>2x broker margin</strong> to achieve your target risk exposure.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
