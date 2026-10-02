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
    description: 'Pehle 15-minute range (High & Low) mark karo, breakout candle close hone par retest par entry lo.',
    timeframe: '15m',
    preferredAsset: 'NIFTY50 / BANKNIFTY / STOCKS',
    rules: [
      '15-minute opening candle range break hone tak wait karo',
      'Candle close hone ke baad hi entry leni hai (no running candle entry)',
      'Stop Loss breakout candle ke low/high ya VWAP ke peeche hona chahiye',
      'Account capital ka maximum 1% to 2% hi risk karna hai',
      'Target minimum 1:2 Risk-to-Reward ratio hona chahiye'
    ]
  },
  {
    id: 'strat-2',
    name: 'ICT Order Block',
    description: 'Liquidity sweep ke baad Market Structure Shift (MSS) hone par Order Block ya FVG ke retest par entry.',
    timeframe: '5m / 15m',
    preferredAsset: 'XAUUSD / FOREX / CRYPTO',
    rules: [
      'Previous Day High/Low ya session liquidity sweep confirm karo',
      'Displacement ke saath Market Structure Shift (MSS) hona zaroori hai',
      '50% Order Block ya Fair Value Gap (FVG) retest par entry lo',
      'Stop loss invalidation level ke bahar strictly rakhein',
      'Target 1:2 ya 1:3 RR hona chahiye'
    ]
  },
  {
    id: 'strat-3',
    name: 'EMA Trend Following',
    description: 'Higher timeframe trend ke direction me 20/50 EMA pullback par high-probability continuation trade.',
    timeframe: '15m / 1H',
    preferredAsset: 'EQUITY CASH / INDEX',
    rules: [
      'Price 200 EMA ke upar hona chahiye (Long ke liye) ya niche (Short ke liye)',
      'Price ka 20 ya 50 EMA par pullback aur rejection candle aane ka wait karo',
      'Confirmation candle close hone par hi entry lena hai',
      'Stop loss pullback swing low ke niche rakhein',
      'Emotional revenge trade bilkul nahi karna'
    ]
  },
  {
    id: 'strat-4',
    name: 'Support & Resistance Reversal',
    description: 'Daily/Hourly key S&R levels par rejection candle aur RSI divergence ke saath reversal capture karna.',
    timeframe: '1H / 15m',
    preferredAsset: 'ALL',
    rules: [
      'Level kam se kam 2 baar pehle test ho chuka ho',
      'Pin bar ya Engulfing candle rejection confirm karo',
      'RSI divergence ya volume exhaustion check karo',
      'Stop loss wick ke 5-10 points bahar rakho',
      'Capital ka 2% se zyada risk na ho'
    ]
  }
];

// Clean empty trades array — User will log all their own real trades!
export const INITIAL_TRADES = [];
