// Gemini AI Trading Agent Service (Speech & Text to Structured Trade Log + AI Mentor + Conversational Chat)

// Dynamic model fallback chain for high uptime & zero downtime during demand spikes
const GEMINI_MODELS = [
  'gemini-3.1-flash-lite',
  'gemini-flash-latest',
  'gemini-3.5-flash',
  'gemini-2.5-flash-lite',
  'gemini-flash-lite-latest',
  'gemini-3.8-flash'
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
 * Sanitizes and cleans AI response text:
 * - Strips all markdown asterisks (**bold**, *italic*, stray stars)
 * - Converts bullet asterisks to clean bullet points (•)
 * - Ensures plain, clean, human-friendly conversational text
 */
export function cleanAiResponse(text) {
  if (!text || typeof text !== 'string') return '';
  let cleaned = text;
  // Convert bullet asterisks at start of lines (* point) to clean bullets (• point)
  cleaned = cleaned.replace(/^(\s*)\*+\s+/gm, '$1• ');
  // Remove markdown bold asterisks **text**
  cleaned = cleaned.replace(/\*\*/g, '');
  // Remove markdown italic asterisks or stray single asterisks
  cleaned = cleaned.replace(/\*/g, '');
  return cleaned.trim();
}

/**
 * Conversational Trading Mentor & Quantitative Auditor
 * Handles both general chat questions (market knowledge, discipline, risk formulas) 
 * and detailed trade performance audits with full conversational memory.
 */
export async function getAiTradingAdvice(trades = [], question = '', apiKey = '', conversationHistory = []) {
  const activeKey = getActiveApiKey(apiKey);

  const tradeSummary = (trades || []).slice(-10).map(t => ({
    asset: t.asset,
    type: t.type,
    pnl: t.pnl,
    rr: t.riskRewardRatio,
    strategy: t.strategy
  }));

  // Build clean history of up to last 8 messages so Gemini remembers full context
  const recentHistory = (conversationHistory || [])
    .filter(m => m && m.text && m.text.trim())
    .slice(-8)
    .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${cleanAiResponse(m.text)}`)
    .join('\n');

  const systemPrompt = `You are Gemini, a helpful, smart, and friendly AI assistant inside the TradeMatrix trading journal.

Instructions:
- Talk naturally, concisely, and simply, just like the official Google Gemini (gemini.google.com).
- Answer directly and plainly. Do NOT dump long lectures or unnecessary headers.
- CRITICAL FORMATTING RULE: NEVER use asterisks or markdown bold stars (do NOT use ** or *). Write completely clean, plain, natural text without any asterisks or symbols.
- MEMORY & CONTEXT: Carefully read the previous conversation below. If the user asks a follow-up or connected question (e.g. "aur usme?", "why?", "how much?", "explain that trade"), use the context of what was already discussed to answer accurately and seamlessly.
- If the user says "hi", "hello", or chats casually, reply warmly in 1 short sentence (e.g. "Hi! How can I help you today?").
- If the user asks a question about trading (risk, stop loss, psychology, setups), give a clear, simple, practical answer in 2-3 short bullet points or sentences.
- If the user asks in Hindi or Hinglish, reply naturally in simple Hindi/Hinglish. If in English, reply in clear, simple English.
- POSITION SIZING & CAPITAL ALLOCATION: If the user asks "kitne rupaye ka trade lu?", "pure 10k ka ya 3k-4k ka?", or gives capital, risk %, entry, SL, TP, or leverage:
  1. Max risk amount = Capital * (Risk% / 100) (e.g. 10,000 * 2% = ₹200).
  2. Total Position Size = (Max Risk / SL distance) * Entry Price.
  3. Margin required = Total Position Size / Leverage.
  4. Plain Hindi verdict: Explain directly whether to buy 3k, 4k, 5k, or full 10k worth, and how leverage reduces the initial margin while strictly keeping risk capped at 2%!
- STRATEGY & RULES: Remind them to confirm all rules of their strategy checklist before taking the trade.
- Keep responses easy to understand for any trader.

${tradeSummary.length > 0 ? `User's logged trades context (${trades.length} trades recorded):\n` + JSON.stringify(tradeSummary) : ''}

${recentHistory ? `Previous Conversation History (Context to remember):\n${recentHistory}\n` : ''}

Current User message:
"${question}"`;

  if (activeKey) {
    try {
      const result = await callGeminiWithFallback(systemPrompt, activeKey, { temperature: 0.5 });
      if (result?.text) {
        return cleanAiResponse(result.text);
      }
    } catch (err) {
      console.error('Error fetching advice from Gemini:', err);
    }
  }

  // Simple, friendly fallback
  return cleanAiResponse(generateSmartLocalResponse(trades, question, conversationHistory));
}

/**
 * Smart Local AI Fallback (Clean, simple, and direct)
 */
function generateSmartLocalResponse(trades, question, conversationHistory = []) {
  const q = (question || '').toLowerCase();

  if (q.includes('hi') || q.includes('hello') || q.includes('hey') || q.includes('namaste')) {
    return "Hi there! 👋 How can I help you today with your trading?";
  }

  if (q.includes('kitne') || (q.includes('capital') && q.includes('risk')) || (q.includes('10k') && (q.includes('3k') || q.includes('4k') || q.includes('pure') || q.includes('leverage') || q.includes('lavrage')))) {
    return "Direct Formula: If your account capital is ₹10,000 ($10,000) and you risk 2% (₹200 / $200):\n\n• Tight Stop-Loss (2% distance): You can take up to the full ₹10,000 position size (max loss capped at ₹200).\n• Normal Stop-Loss (4% distance): Do not allocate the entire capital; allocate ₹5,000 so the loss is strictly capped at ₹200.\n• Wide Stop-Loss (6-7% distance): Allocate approximately ₹3,000.\n• Leverage Benefit: With 5x leverage, a ₹5,000 position size requires only ₹1,000 cash margin, keeping the remaining ₹9,000 capital protected!";
  }

  if (q.includes('rule') || q.includes('strategy') || q.includes('stratargy')) {
    return "Disciplined Execution Rule: Before taking any trade, verify all checklist rules in the Strategy Vault (candle close confirmation, strictly placed Stop Loss, and 1:2 minimum RR). If even a single condition is unmet, pass on the trade!";
  }

  if (q.includes('risk') || q.includes('capital') || q.includes('loss') || q.includes('sl') || q.includes('stop loss')) {
    return "Keep it simple: Never risk more than 1% to 2% of your capital on a single trade. Always set a Stop Loss before entering, and aim for at least a 1:2 Risk-to-Reward ratio.";
  }

  if (q.includes('nifty') || q.includes('banknifty') || q.includes('gold') || q.includes('market')) {
    return "Always check the higher timeframe trend (1-Hour / 15-Minute) and mark Key Support & Resistance levels before entering trades.";
  }

  if (trades && trades.length > 0) {
    const wins = trades.filter(t => (t.pnl || 0) > 0);
    const netPnl = trades.reduce((acc, t) => acc + (t.pnl || 0), 0);
    return `You have ${trades.length} recorded trades (${wins.length} wins). Net P&L: ${netPnl >= 0 ? '+' : ''}${netPnl.toFixed(2)}. Feel free to ask about any specific trade!`;
  }

  return "I'm your Gemini AI trading assistant. Feel free to ask any trading questions, or dictate your trade details to log them directly!";
}
