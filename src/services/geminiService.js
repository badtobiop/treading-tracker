// Gemini AI Trading Agent Service (Speech & Text to Structured Trade Log + AI Mentor + Conversational Chat)

// Dynamic model fallback chain for high uptime & zero downtime during demand spikes
const GEMINI_MODELS = [
  'gemini-3.8-flash',
  'gemini-3.5-flash',
  'gemini-3.7-flash',
  'gemini-3.6-flash'
];

/**
 * Resolves active API key from parameter or environment variable
 */
export function getActiveApiKey(customKey = '') {
  if (customKey && customKey.trim()) return customKey.trim();
  const envKey = import.meta.env?.VITE_GEMINI_API_KEY;
  if (envKey && envKey.trim()) return envKey.trim();
  return '';
}

/**
 * Calls Google Gemini API with automatic model failover
 */
async function callGeminiWithFallback(prompt, apiKey, config = {}) {
  const activeKey = getActiveApiKey(apiKey);
  if (!activeKey) return null;

  for (const model of GEMINI_MODELS) {
    try {
      const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${activeKey}`;
      const payload = {
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: config.temperature ?? 0.4,
          ...(config.responseMimeType ? { responseMimeType: config.responseMimeType } : {})
        }
      };

      const response = await fetch(url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (response.ok) {
        const data = await response.json();
        const candidate = data.candidates?.[0];
        if (candidate?.content?.parts) {
          const text = candidate.content.parts
            .filter(p => p.text)
            .map(p => p.text)
            .join('\n')
            .trim();
          if (text) {
            return { text, model };
          }
        }
      } else {
        console.warn(`Gemini model ${model} returned ${response.status}. Attempting fallback...`);
      }
    } catch (err) {
      console.warn(`Error calling Gemini model ${model}:`, err.message);
    }
  }

  return null;
}

/**
 * Intelligent Local Rule-Based NLP Parser (Fallback when no API Key or offline)
 */
function localRuleBasedParser(text) {
  const lower = text.toLowerCase();
  
  // Asset detection
  let asset = 'XAUUSD';
  if (lower.includes('gold') || lower.includes('xau')) asset = 'XAUUSD';
  else if (lower.includes('btc') || lower.includes('bitcoin')) asset = 'BTCUSD';
  else if (lower.includes('eth') || lower.includes('ethereum')) asset = 'ETHUSD';
  else if (lower.includes('eur') || lower.includes('euro')) asset = 'EURUSD';
  else if (lower.includes('gbp') || lower.includes('pound')) asset = 'GBPUSD';
  else if (lower.includes('us30') || lower.includes('dow')) asset = 'US30';
  else if (lower.includes('nas100') || lower.includes('nasdaq')) asset = 'NAS100';
  else if (lower.includes('nifty')) asset = 'NIFTY50';

  // Order type
  let type = 'BUY';
  if (lower.includes('sell') || lower.includes('short') || lower.includes('put')) {
    type = 'SELL';
  } else if (lower.includes('buy') || lower.includes('long') || lower.includes('call')) {
    type = 'BUY';
  }

  // Extract numbers
  const numberRegex = /[-+]?[0-9]*\.?[0-9]+/g;
  const numbers = text.match(numberRegex) ? text.match(numberRegex).map(Number) : [];

  let entryPrice = 0;
  let exitPrice = 0;
  let stopLoss = 0;
  let takeProfit = 0;
  let lotSize = 1.0;
  let pnl = 0;

  // Search for explicit keywords: "entry", "sl", "tp", "lot", "profit", "loss"
  const entryMatch = text.match(/(?:entry|price|bought at|sold at|at|pe|liya)\s*[:=]?\s*([0-9.]+)/i);
  if (entryMatch) entryPrice = parseFloat(entryMatch[1]);

  const slMatch = text.match(/(?:sl|stop\s*loss|stoploss)\s*[:=]?\s*([0-9.]+)/i);
  if (slMatch) stopLoss = parseFloat(slMatch[1]);

  const tpMatch = text.match(/(?:tp|target|take\s*profit)\s*[:=]?\s*([0-9.]+)/i);
  if (tpMatch) takeProfit = parseFloat(tpMatch[1]);

  const lotMatch = text.match(/(?:lot|quantity|size|qty)\s*[:=]?\s*([0-9.]+)/i);
  if (lotMatch) lotSize = parseFloat(lotMatch[1]);

  const profitMatch = text.match(/(?:profit|gain|faida|jeeta)\s*[:=]?\s*\$?([0-9.]+)/i);
  const lossMatch = text.match(/(?:loss|nuksan|gawaya)\s*[:=]?\s*\$?([0-9.]+)/i);

  if (profitMatch) {
    pnl = parseFloat(profitMatch[1]);
  } else if (lossMatch) {
    pnl = -parseFloat(lossMatch[1]);
  } else if (lower.includes('profit') && numbers.length > 0) {
    pnl = numbers[numbers.length - 1];
  } else if (lower.includes('loss') && numbers.length > 0) {
    pnl = -Math.abs(numbers[numbers.length - 1]);
  }

  // If entry wasn't found but we have numbers
  if (!entryPrice && numbers.length > 0) {
    entryPrice = numbers[0];
  }

  // Default SL/TP if missing
  if (!stopLoss && entryPrice > 0) {
    stopLoss = type === 'BUY' ? Number((entryPrice * 0.995).toFixed(2)) : Number((entryPrice * 1.005).toFixed(2));
  }
  if (!takeProfit && entryPrice > 0) {
    takeProfit = type === 'BUY' ? Number((entryPrice * 1.01).toFixed(2)) : Number((entryPrice * 0.99).toFixed(2));
  }
  if (!exitPrice) {
    exitPrice = pnl >= 0 ? takeProfit : stopLoss;
  }

  // Estimate R:R
  let rr = '2.0:1';
  if (entryPrice && stopLoss && takeProfit) {
    const risk = Math.abs(entryPrice - stopLoss);
    const reward = Math.abs(takeProfit - entryPrice);
    if (risk > 0) {
      rr = `${(reward / risk).toFixed(1)}:1`;
    }
  }

  // Strategy detection
  let strategy = 'ICT Order Block';
  if (lower.includes('breakout') || lower.includes('range')) strategy = '15m Range Breakout';
  else if (lower.includes('ema') || lower.includes('moving average')) strategy = 'EMA Trend Following';
  else if (lower.includes('fvg') || lower.includes('gap')) strategy = 'FVG Retest (Fair Value Gap)';
  else if (lower.includes('sweep') || lower.includes('liquidity')) strategy = 'London Open Liquidity Sweep';
  else if (lower.includes('scalp') || lower.includes('fib')) strategy = 'Fibonacci Retracement Scalp';

  return {
    asset,
    type,
    entryPrice: entryPrice || 2650,
    exitPrice: exitPrice || 2665,
    stopLoss: stopLoss || 2640,
    takeProfit: takeProfit || 2670,
    lotSize: lotSize || 1.0,
    capitalRiskedPercent: 1.0,
    pnl: pnl !== 0 ? pnl : 500,
    riskRewardRatio: rr,
    strategy,
    session: 'New York',
    emotion: 'Disciplined',
    rulesFollowed: pnl >= 0,
    notes: text,
    source: 'Local Heuristic AI'
  };
}

/**
 * Call Gemini API to parse natural language or audio transcription into structured trade JSON
 */
export async function parseTradeWithAI(promptText, apiKey = '') {
  const activeKey = getActiveApiKey(apiKey);
  if (!activeKey) {
    return localRuleBasedParser(promptText);
  }

  const systemInstruction = `
You are TradeMatrix AI trading journal assistant. Convert the user's spoken or typed trade statement (can be in English, Hindi, or Hinglish) into a structured JSON trade object.
Extract or intelligently estimate these exact fields:
- asset: Standard symbol like "XAUUSD" (for Gold), "BTCUSD", "ETHUSD", "EURUSD", "GBPUSD", "US30", "NAS100", "NIFTY50"
- type: "BUY" or "SELL"
- entryPrice: number
- exitPrice: number
- stopLoss: number
- takeProfit: number
- lotSize: number (default 1.0 if not mentioned)
- capitalRiskedPercent: number (e.g. 1.0 or 2.0)
- pnl: number (positive for profit, negative for loss)
- riskRewardRatio: string format like "2.0:1"
- strategy: string (e.g. "ICT Order Block", "15m Range Breakout", "EMA Trend Following", "FVG Retest", "Scalp")
- session: "London", "New York", or "Asian"
- emotion: "Disciplined", "FOMO", "Revenge", "Greedy", or "Patient"
- rulesFollowed: boolean
- notes: concise summary of the trade reason

Return ONLY raw valid JSON without markdown fences.
User Statement: "${promptText}"
`;

  try {
    const result = await callGeminiWithFallback(systemInstruction, activeKey, { temperature: 0.1 });
    if (result?.text) {
      let cleaned = result.text.trim();
      if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json/, '').replace(/```$/, '').trim();
      else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```/, '').replace(/```$/, '').trim();
      const parsed = JSON.parse(cleaned);
      parsed.source = `Gemini AI (${result.model})`;
      return parsed;
    }
  } catch (err) {
    console.error('Error in Gemini API parse:', err);
  }

  return localRuleBasedParser(promptText);
}

/**
 * Conversational Trading Mentor & Quantitative Auditor
 * Handles both general chat questions (market knowledge, discipline, risk formulas) 
 * and detailed trade performance audits.
 */
export async function getAiTradingAdvice(trades = [], question = '', apiKey = '') {
  const activeKey = getActiveApiKey(apiKey);

  // If no API key is provided at all, return high-quality smart local assistance
  if (!activeKey) {
    return generateSmartLocalResponse(trades, question);
  }

  const tradeSummary = (trades || []).slice(-15).map(t => ({
    date: t.date,
    asset: t.asset,
    type: t.type,
    pnl: t.pnl,
    rr: t.riskRewardRatio,
    strategy: t.strategy,
    emotion: t.emotion,
    rulesFollowed: t.rulesFollowed
  }));

  const systemPrompt = `
You are "TradeMatrix AI", an elite institutional trading mentor, quantitative risk analyst, and companion.
You communicate with clarity, empathy, and mathematical rigor.

Guidelines:
1. Always respond in polished, institutional-grade, professional English with mathematical clarity and actionable trading insights.
2. If the user asks a general trading question (e.g., risk management, position sizing, support/resistance, market psychology, setups, discipline tips):
   - Provide a direct, highly practical, structured answer with actionable tips and markdown formatting.
3. If the user asks to analyze their trades, performance, or win-rate:
   - Review their recorded trades below and provide a quantitative breakdown (Win rate, best asset, edge, leaks).
   - If they have 0 recorded trades, warmly explain how to log trades or use the Lot Calculator to start.

Current User Recorded Trades (${trades.length} trades recorded):
${JSON.stringify(tradeSummary, null, 2)}

User Question / Message:
"${question}"
`;

  try {
    const result = await callGeminiWithFallback(systemPrompt, activeKey, { temperature: 0.4 });
    if (result?.text) {
      return result.text;
    }
  } catch (err) {
    console.error('Error fetching advice from Gemini:', err);
  }

  // Graceful smart local fallback
  return generateSmartLocalResponse(trades, question);
}

/**
 * Smart Local AI Engine (Used when offline or network fails)
 */
function generateSmartLocalResponse(trades, question) {
  const q = (question || '').toLowerCase();

  if (q.includes('risk') || q.includes('capital') || q.includes('10000') || q.includes('10k') || q.includes('2%')) {
    return `### 🛡️ Smart Risk Management Rules (Capital Protection):

1. **The 1% - 2% Rule**:
   - On ₹10,000 capital, your maximum risk per trade should never exceed **₹100 to ₹200 (1-2%)**.
   - If you experience 5 consecutive losing trades, you only lose ₹1,000, leaving 90% of your account intact!

2. **Position Sizing Formula**:
   $$\\text{Position Size} = \\frac{\\text{Risk Amount (₹200)}}{\\text{Stop Loss Distance}}$$
   - Always adjust your quantity based on your Stop Loss, not your emotions.

3. **Risk-to-Reward Minimum (1:2)**:
   - Never enter a trade where the target reward is less than 2x your risk. With a 1:2 R:R, even a 40% win rate keeps you profitable.`;
  }

  if (q.includes('nifty') || q.includes('banknifty') || q.includes('market')) {
    return `### 📈 Index & Market Strategy Protocol:
- **Trend Alignment**: Always check the 1-Hour and 15-Minute market structure before taking intraday entries.
- **Key Levels**: Mark Previous Day High (PDH), Previous Day Low (PDL), and Opening 15-Minute Range.
- **Disciplined Execution**: Avoid trading in the first 5 minutes of market open to avoid slippage.`;
  }

  if (!trades || trades.length === 0) {
    return `Hello! 👋 I am your **TradeMatrix AI Trading Copilot**.

You haven't logged any trades yet. You can:
1. Speak or type your executed trade in the chat to automatically record it.
2. Use the **Lot Calculator** to calculate exact position sizes (₹10k, ₹5k, or ₹2k) based on your stop loss.
3. Ask me any questions about trading setups, risk management, or market discipline!`;
  }

  const wins = trades.filter(t => (t.pnl || 0) > 0);
  const losses = trades.filter(t => (t.pnl || 0) < 0);
  const winRate = trades.length > 0 ? ((wins.length / trades.length) * 100).toFixed(1) : 0;
  const netPnl = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);

  return `### 📊 Trading Performance Audit:
- **Total Trades**: ${trades.length} (${wins.length} Wins / ${losses.length} Losses)
- **Win Rate**: **${winRate}%**
- **Net Realized P&L**: **${netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)}**
- **Discipline Tip**: Maintain a strict stop loss in the system for every open position and protect your winning streaks.`;
}
