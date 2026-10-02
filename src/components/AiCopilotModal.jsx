import React, { useState, useRef, useEffect } from 'react';
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
import { getAiTradingAdvice, cleanAiResponse } from '../services/geminiService';

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
      text: 'Hello! 👋 How can I help you today? You can ask me any trading questions, or ask me to review your trade metrics!'
    }
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const effectiveApiKey = geminiApiKey || import.meta.env?.VITE_GEMINI_API_KEY || '';

  // Auto-scroll chat to bottom on new messages, loading status, or modal open
  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isLoading, isOpen]);

  if (!isOpen) return null;

  const handleSend = async (queryText) => {
    const textToSend = queryText || inputQuery;
    if (!textToSend.trim() || isLoading) return;

    const userMsg = { role: 'user', text: textToSend };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInputQuery('');
    setIsLoading(true);

    try {
      const response = await getAiTradingAdvice(trades, textToSend, effectiveApiKey, updatedMessages);
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
                {effectiveApiKey ? '● Gemini Intelligence Online' : '● Quantitative Analysis Engine'}
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
              {cleanAiResponse(m.text)}
            </div>
          ))}

          {isLoading && (
            <div style={{ alignSelf: 'flex-start', background: 'var(--bg-tertiary)', padding: '12px 18px', borderRadius: '16px', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
              <Sparkles size={16} className="text-profit" style={{ animation: 'spin 2s linear infinite' }} />
              <span>Gemini AI is analyzing your trading records...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
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
