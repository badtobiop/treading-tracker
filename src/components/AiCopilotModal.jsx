import React, { useState } from 'react';
import { 
  Bot, 
  Sparkles, 
  Send, 
  X, 
  MessageSquare, 
  Flame, 
  AlertCircle, 
  CheckCircle,
  HelpCircle,
  Key
} from 'lucide-react';
import { getAiTradingAdvice } from '../services/geminiService';

export default function AiCopilotModal({ 
  isOpen, 
  onClose, 
  trades, 
  geminiApiKey,
  onOpenSettings 
}) {
  const [messages, setMessages] = useState([
    {
      role: 'assistant',
      text: `Hello! 👋 I am your **Gemini AI Trading Copilot**.
You can ask me anything regarding your trading performance, quantitative metrics, or risk management:
- *"Which day of the week generates my highest profitability?"*
- *"What is my historical win rate and net return on Gold (XAUUSD)?"*
- *"Where are my primary psychological or discipline leaks?"*

Type your query below or click one of the quick analysis templates!`
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!isOpen) return null;

  const handleSend = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = { role: 'user', text: textToSend };
    setMessages(prev => [...prev, userMsg]);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await getAiTradingAdvice(trades, textToSend, geminiApiKey);
      setMessages(prev => [...prev, { role: 'assistant', text: response }]);
    } catch (e) {
      setMessages(prev => [...prev, { role: 'assistant', text: 'Error getting advice. Please try again.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" style={{ maxWidth: '720px', height: '80vh' }} onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="modal-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div className="brand-icon" style={{ width: '36px', height: '36px', background: 'linear-gradient(135deg, #8b5cf6, #ec4899)' }}>
              <Bot size={20} />
            </div>
            <div>
              <h2 className="modal-title" style={{ fontSize: '1.15rem' }}>Gemini AI Trading Mentor</h2>
              <span className="card-subtitle">
                {geminiApiKey ? 'Live Gemini 1.5 Flash Connected' : 'Local Heuristic AI (Add API Key in settings for full LLM)'}
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Chat History */}
        <div style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {messages.map((m, idx) => (
            <div 
              key={idx}
              style={{
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                background: m.role === 'user' ? 'linear-gradient(135deg, #06b6d4, #3b82f6)' : 'var(--bg-tertiary)',
                color: 'var(--text-primary)',
                padding: '14px 18px',
                borderRadius: '16px',
                borderTopRightRadius: m.role === 'user' ? '4px' : '16px',
                borderTopLeftRadius: m.role === 'assistant' ? '4px' : '16px',
                border: m.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                fontSize: '0.9rem',
                lineHeight: '1.6',
                whiteSpace: 'pre-wrap'
              }}
            >
              {m.text}
            </div>
          ))}

          {isLoading && (
            <div style={{ alignSelf: 'flex-start', background: 'var(--bg-tertiary)', padding: '12px 18px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <Sparkles size={16} className="text-profit" style={{ animation: 'spin 2s linear infinite' }} />
              <span>Gemini AI is analyzing your trading records...</span>
            </div>
          )}
        </div>

        {/* Quick Suggested Prompts */}
        <div style={{ padding: '0 20px 10px', display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
          <button 
            className="ai-chip"
            onClick={() => handleSend('Which day of the week generates my highest profitability?')}
          >
            🔥 Most Profitable Day of Week
          </button>
          <button 
            className="ai-chip"
            onClick={() => handleSend('What is my performance analysis on Gold (XAUUSD)?')}
          >
            🥇 Gold (XAUUSD) Performance Audit
          </button>
          <button 
            className="ai-chip"
            onClick={() => handleSend('What are my biggest trading mistakes and risk management leaks?')}
          >
            ⚠️ Drawdown & Risk Review
          </button>
        </div>

        {/* Input Bar */}
        <div className="modal-footer" style={{ background: 'var(--bg-secondary)', gap: '10px' }}>
          <input 
            type="text"
            className="form-input"
            placeholder="Ask AI Copilot anything regarding your trade metrics..."
            value={inputQuery}
            onChange={e => setInputQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Enter') handleSend();
            }}
          />
          <button 
            className="btn btn-ai"
            onClick={() => handleSend()}
            disabled={isLoading || !inputQuery.trim()}
          >
            <Send size={16} />
            <span>Send</span>
          </button>
        </div>
      </div>
    </div>
  );
}
