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
  'ICT Order Block',
  '15m Range Breakout',
  'EMA Trend Following',
  'FVG Retest (Fair Value Gap)',
  'London Open Liquidity Sweep',
  'Fibonacci Retracement Scalp'
];

// Clean empty trades array — User will log all their own real trades!
export const INITIAL_TRADES = [];
