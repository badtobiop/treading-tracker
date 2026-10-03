// Initial clean setup — Empty trades array for fresh user entries
export const INITIAL_SETTINGS = {
  initialCapital: 10000,
  currency: '₹',
  riskPerTradePercent: 2.0,
  geminiApiKey: import.meta.env?.VITE_GEMINI_API_KEY || ''
};

export const POPULAR_ASSETS = [
  { symbol: 'XAUUSD', name: 'Gold / US Dollar', type: 'Commodity' },
  { symbol: 'BTCUSD', name: 'Bitcoin / US Dollar', type: 'Crypto' },
  { symbol: 'ETHUSD', name: 'Ethereum / US Dollar', type: 'Crypto' },
  { symbol: 'EURUSD', name: 'Euro / US Dollar', type: 'Forex' },
  { symbol: 'GBPUSD', name: 'Great Britain Pound / USD', type: 'Forex' },
  { symbol: 'US30', name: 'Dow Jones Industrial 30', type: 'Index' },
  { symbol: 'NAS100', name: 'Nasdaq 100 Index', type: 'Index' },
  { symbol: 'NIFTY50', name: 'Nifty 50 Index', type: 'Index' }
];

export const STRATEGIES = [
  '15m Range Breakout',
  'ICT Order Block',
  'EMA Trend Following',
  'Support & Resistance Reversal',
  'FVG Retest (Fair Value Gap)',
  'London Open Liquidity Sweep'
];

export const DEFAULT_STRATEGIES_PLAYBOOK = [
  {
    id: 'strat-1',
    name: '15m Range Breakout',
    description: 'Mark the initial 15-minute range (High & Low). Wait for a decisive breakout candle close, then enter on retest.',
    timeframe: '15m',
    preferredAsset: 'NIFTY50 / BANKNIFTY / STOCKS',
    rules: [
      'Wait for the opening 15-minute candle range to be clearly established',
      'Enter only after candle close confirmation (no running candle entries)',
      'Stop Loss must be placed strictly behind breakout candle or VWAP',
      'Risk maximum 1% to 2% of total account capital',
      'Target minimum 1:2 Risk-to-Reward ratio'
    ]
  },
  {
    id: 'strat-2',
    name: 'ICT Order Block',
    description: 'Identify liquidity sweeps followed by Market Structure Shift (MSS). Enter on retest of Order Block or Fair Value Gap (FVG).',
    timeframe: '5m / 15m',
    preferredAsset: 'XAUUSD / FOREX / CRYPTO',
    rules: [
      'Confirm Previous Day High/Low or key session liquidity sweep',
      'Wait for Market Structure Shift (MSS) with displacement',
      'Enter at 50% equilibrium of Order Block or Fair Value Gap (FVG) retest',
      'Place Stop Loss strictly outside invalidation level',
      'Target minimum 1:2 or 1:3 Risk-to-Reward ratio'
    ]
  },
  {
    id: 'strat-3',
    name: 'EMA Trend Following',
    description: 'High-probability continuation entries on 20/50 EMA pullbacks aligned with higher timeframe trend momentum.',
    timeframe: '15m / 1H',
    preferredAsset: 'EQUITY CASH / INDEX',
    rules: [
      'Price must be above 200 EMA for Longs or below 200 EMA for Shorts',
      'Wait for price pullback to 20 or 50 EMA with rejection candle',
      'Enter strictly on confirmed confirmation candle close',
      'Place Stop Loss below the pullback swing low',
      'Strictly avoid emotional revenge trading'
    ]
  },
  {
    id: 'strat-4',
    name: 'Support & Resistance Reversal',
    description: 'Capture reversals at major daily/hourly key S&R levels with rejection candle confirmation and RSI divergence.',
    timeframe: '1H / 15m',
    preferredAsset: 'ALL',
    rules: [
      'Key level must be tested at least twice previously',
      'Confirm rejection via pin bar or engulfing candle structure',
      'Verify RSI divergence or volume exhaustion',
      'Set Stop Loss 5-10 points beyond candle wick',
      'Risk capped strictly at 2% of account capital'
    ]
  }
];

// Clean empty trades array — User will log all their own real trades!
export const INITIAL_TRADES = [];
