import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { 
  Bot, 
  Sparkles, 
  X, 
  Send, 
  Mic, 
  MicOff, 
  Check, 
  Coins, 
  TrendingUp, 
  TrendingDown,
  MessageSquare,
  Zap,
  HelpCircle,
  ShieldAlert,
  ArrowRight
} from 'lucide-react';
import confetti from 'canvas-confetti';
import { parseTradeWithAI, getAiTradingAdvice } from '../services/geminiService';

export default function FloatingAiWidget({ 
  trades, 
  onSaveTrade, 
  geminiApiKey,
  currency = '$' 
}) {
  const effectiveApiKey = geminiApiKey || import.meta.env?.VITE_GEMINI_API_KEY || '';
  const [isOpen, setIsOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('log'); // 'log' or 'chat'

  const drawerRef = useRef(null);
  const backdropRef = useRef(null);
  const triggerBtnRef = useRef(null);

  // Quick log state
  const [promptText, setPromptText] = useState('');
  const [isParsing, setIsParsing] = useState(false);
  const [parsedTrade, setParsedTrade] = useState(null);
  const [isListening, setIsListening] = useState(false);

  // Chat state
  const [chatMessages, setChatMessages] = useState([
    {
      role: 'assistant',
      text: 'Hello! 👋 I am your Gemini AI Trading Copilot.\n\nYou can speak or type your trades here for immediate automatic logging, or ask me for quantitative performance audits, win-rate insights, and risk analytics.'
    }
  ]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);

  // GSAP Smooth Opening Animation
  useEffect(() => {
    if (isOpen && drawerRef.current) {
      // Backdrop fade in
      if (backdropRef.current) {
        gsap.fromTo(
          backdropRef.current, 
          { opacity: 0 }, 
          { opacity: 1, duration: 0.35, ease: 'power2.out' }
        );
      }

      // Drawer slide in with buttery smooth easing
      gsap.fromTo(
        drawerRef.current,
        { x: '100%', opacity: 0.9 },
        { 
          x: '0%', 
          opacity: 1, 
          duration: 0.44, 
          ease: 'power4.out',
          clearProps: 'opacity'
        }
      );

      // Staggered internal entrance for ultra-smooth classic feel
      const elements = drawerRef.current.querySelectorAll('.ai-stagger-item');
      if (elements.length > 0) {
        gsap.fromTo(
          elements,
          { y: 16, opacity: 0 },
          { 
            y: 0, 
            opacity: 1, 
            duration: 0.36, 
            stagger: 0.04, 
            ease: 'power3.out', 
            delay: 0.1 
          }
        );
      }
    }
  }, [isOpen]);

  // Smooth Closing Animation
  const handleClose = () => {
    if (drawerRef.current && backdropRef.current) {
      gsap.to(backdropRef.current, { 
        opacity: 0, 
        duration: 0.25, 
        ease: 'power2.in' 
      });

      gsap.to(drawerRef.current, {
        x: '100%',
        opacity: 0.85,
        duration: 0.32,
        ease: 'power3.in',
        onComplete: () => {
          setIsOpen(false);
        }
      });
    } else {
      setIsOpen(false);
    }
  };

  // Voice speech-to-text
  const handleToggleVoice = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition is not supported in this browser. Please type your trade details.');
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
          setPromptText(prev => prev ? `${prev} ${transcript}` : transcript);
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

  // Parse trade
  const handleParse = async () => {
    if (!promptText.trim()) return;
    setIsParsing(true);
    try {
      const res = await parseTradeWithAI(promptText, effectiveApiKey);
      setParsedTrade(res);
    } catch (e) {
      console.error(e);
    } finally {
      setIsParsing(false);
    }
  };

  // Confirm save
  const handleConfirmSave = () => {
    if (!parsedTrade) return;
    const today = new Date().toISOString().split('T')[0];
    const currentTime = new Date().toTimeString().slice(0, 5);

    const tradeToSave = {
      id: `tr-${Date.now()}`,
      date: today,
      time: currentTime,
      asset: parsedTrade.asset || 'XAUUSD',
      type: parsedTrade.type || 'BUY',
      entryPrice: Number(parsedTrade.entryPrice) || 0,
      exitPrice: Number(parsedTrade.exitPrice) || 0,
      stopLoss: Number(parsedTrade.stopLoss) || 0,
      takeProfit: Number(parsedTrade.takeProfit) || 0,
      lotSize: Number(parsedTrade.lotSize) || 1.0,
      capitalRiskedPercent: Number(parsedTrade.capitalRiskedPercent) || 1.0,
      pnl: Number(parsedTrade.pnl) || 0,
      pnlPercent: 0,
      riskRewardRatio: parsedTrade.riskRewardRatio || '2.0:1',
      strategy: parsedTrade.strategy || 'ICT Order Block',
      session: parsedTrade.session || 'New York',
      emotion: parsedTrade.emotion || 'Disciplined',
      rulesFollowed: parsedTrade.rulesFollowed ?? true,
      notes: parsedTrade.notes || promptText
    };

    if (tradeToSave.pnl > 0) {
      confetti({ particleCount: 50, spread: 65, origin: { y: 0.8 } });
    }

    onSaveTrade(tradeToSave);
    setParsedTrade(null);
    setPromptText('');
    handleClose();
  };

  // Send chat
  const handleSendChat = async (queryText) => {
    const q = queryText || chatInput;
    if (!q.trim() || isChatLoading) return;

    setChatMessages(prev => [...prev, { role: 'user', text: q }]);
    setChatInput('');
    setIsChatLoading(true);

    try {
      const reply = await getAiTradingAdvice(trades, q, effectiveApiKey);
      setChatMessages(prev => [...prev, { role: 'assistant', text: reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', text: 'Error retrieving performance analysis. Please try again.' }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  return (
    <>
      {/* Floating Action Circle Button (Bottom Right) */}
      {!isOpen && (
        <div className="floating-ai-container" ref={triggerBtnRef}>
          <button 
            className="floating-ai-circle-btn"
            onClick={() => setIsOpen(true)}
            title="Open Gemini AI Copilot"
          >
            <Bot size={28} />
            <span className="floating-ai-badge">AI</span>
          </button>
        </div>
      )}

      {/* FULL RIGHT-SIDE DRAWER WITH SMOOTH GSAP ANIMATION */}
      {isOpen && (
        <>
          {/* Backdrop Overlay */}
          <div 
            ref={backdropRef}
            className="ai-drawer-backdrop" 
            onClick={handleClose} 
          />

          <div ref={drawerRef} className="floating-ai-drawer">
            {/* Drawer Header */}
            <div className="ai-drawer-header ai-stagger-item">
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div className="ai-drawer-icon">
                  <Sparkles size={18} />
                </div>
                <div>
                  <h3 style={{ fontSize: '1.05rem', fontWeight: 700, margin: 0, color: 'var(--text-primary)' }}>
                    Gemini AI Copilot
                  </h3>
                  <span style={{ fontSize: '0.74rem', color: effectiveApiKey ? 'var(--profit)' : 'var(--accent-amethyst)', fontWeight: 600 }}>
                    {effectiveApiKey ? '● Gemini AI Connected (.env)' : '● Intelligent NLP Active'}
                  </span>
                </div>
              </div>

              <button 
                className="btn-icon" 
                onClick={handleClose}
                title="Close AI Copilot"
              >
                <X size={18} />
              </button>
            </div>

            {/* Mode Switch Tabs */}
            <div className="ai-drawer-tabs ai-stagger-item">
              <button 
                className={`ai-tab-pill ${activeTab === 'log' ? 'active' : ''}`}
                onClick={() => setActiveTab('log')}
              >
                <Zap size={14} />
                <span>⚡ Log Execution</span>
              </button>
              <button 
                className={`ai-tab-pill ${activeTab === 'chat' ? 'active' : ''}`}
                onClick={() => setActiveTab('chat')}
              >
                <MessageSquare size={14} />
                <span>💬 Trading Mentor Chat</span>
              </button>
            </div>

            {/* TAB 1: QUICK LOG (Independent Scroll Area with data-lenis-prevent) */}
            {activeTab === 'log' && (
              <div className="ai-drawer-scrollable" data-lenis-prevent="true">
                {/* Instruction banner */}
                <div className="ai-instruction-box ai-stagger-item">
                  <span style={{ fontSize: '0.86rem', fontWeight: 700, color: 'var(--text-primary)', display: 'block' }}>
                    Dictate or Type Trade Details:
                  </span>
                  <span style={{ fontSize: '0.78rem', color: 'var(--text-muted)', marginTop: '4px', display: 'block', lineHeight: 1.55 }}>
                    Speak or type your execution. The AI automatically extracts the instrument, position size, entry, stop loss, take profit, and calculates your Risk:Reward ratio.
                  </span>
                </div>

                {/* Textarea with mic button */}
                <div style={{ position: 'relative' }} className="ai-stagger-item">
                  <textarea 
                    className="form-textarea"
                    rows={4}
                    placeholder='Type or dictate trade: "Bought Gold at 2650, Stop Loss 2642, Take Profit 2670, 1.0 lot, closed with +$1,850 profit on Order Block strategy"'
                    value={promptText}
                    onChange={e => setPromptText(e.target.value)}
                    style={{ fontSize: '0.88rem', paddingRight: '48px', lineHeight: 1.55 }}
                  />
                  <button 
                    className="btn-icon"
                    style={{
                      position: 'absolute',
                      right: '10px',
                      bottom: '10px',
                      width: '34px',
                      height: '34px',
                      background: isListening ? 'var(--loss)' : 'rgba(147, 128, 255, 0.25)',
                      color: isListening ? 'white' : 'var(--accent-amethyst)',
                      border: '1px solid rgba(147, 128, 255, 0.35)'
                    }}
                    onClick={handleToggleVoice}
                    title={isListening ? 'Stop recording' : 'Dictate trade via microphone'}
                  >
                    {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                  </button>
                </div>

                {/* Luxury Styled Prompt Chips */}
                <div className="ai-stagger-item">
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', display: 'block', marginBottom: '8px', fontWeight: 600 }}>
                    Preset Execution Templates (Click to fill):
                  </span>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    <button 
                      className="ai-luxury-chip chip-gold"
                      onClick={() => setPromptText("Bought Gold at 2650, Stop Loss 2642, Take Profit 2670, 1.0 lot, closed at profit $1850 on Order Block strategy")}
                    >
                      🥇 Gold Long (+$1,850)
                    </button>
                    <button 
                      className="ai-luxury-chip chip-btc"
                      onClick={() => setPromptText("Bought Bitcoin at 64000, Take Profit 65200, 0.25 lot, closed at profit $400 on 15m Breakout")}
                    >
                      ₿ Bitcoin Long (+$400)
                    </button>
                    <button 
                      className="ai-luxury-chip chip-forex"
                      onClick={() => setPromptText("Sold EUR/USD at 1.1180, Stop Loss 1.1205, stopped out loss $250")}
                    >
                      📉 EUR/USD Short (-$250)
                    </button>
                  </div>
                </div>

                <button 
                  className="btn btn-primary ai-stagger-item"
                  style={{ padding: '12px 20px', fontSize: '0.92rem', width: '100%', marginTop: '4px' }}
                  onClick={handleParse}
                  disabled={isParsing || !promptText.trim()}
                >
                  <Sparkles size={16} />
                  <span>{isParsing ? 'Extracting Parameters...' : 'Extract & Review Parameters'}</span>
                </button>

                {/* Parsed Output Card */}
                {parsedTrade && (
                  <div className="ai-parsed-card ai-stagger-item">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="asset-badge">{parsedTrade.asset}</span>
                        <span className={`trade-type-pill ${parsedTrade.type?.toLowerCase()}`}>{parsedTrade.type}</span>
                      </div>
                      <span 
                        style={{ 
                          fontFamily: 'var(--font-mono)', 
                          fontWeight: 800, 
                          fontSize: '1.25rem',
                          color: parsedTrade.pnl >= 0 ? 'var(--profit)' : 'var(--loss)' 
                        }}
                      >
                        {parsedTrade.pnl >= 0 ? '+' : ''}{currency}{parsedTrade.pnl}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '10px', fontSize: '0.84rem', background: 'rgba(15, 19, 31, 0.65)', padding: '12px', borderRadius: '10px' }}>
                      <div>Entry: <strong style={{ fontFamily: 'var(--font-mono)' }}>{parsedTrade.entryPrice}</strong></div>
                      <div>Exit: <strong style={{ fontFamily: 'var(--font-mono)' }}>{parsedTrade.exitPrice}</strong></div>
                      <div>SL: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--loss)' }}>{parsedTrade.stopLoss}</strong></div>
                      <div>TP: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--profit)' }}>{parsedTrade.takeProfit}</strong></div>
                      <div>Lot Size: <strong style={{ fontFamily: 'var(--font-mono)' }}>{parsedTrade.lotSize}</strong></div>
                      <div>Risk:Reward: <strong style={{ fontFamily: 'var(--font-mono)', color: 'var(--accent-cyan)' }}>{parsedTrade.riskRewardRatio}</strong></div>
                    </div>

                    <button 
                      className="btn btn-primary"
                      style={{ padding: '12px', fontSize: '0.92rem', width: '100%' }}
                      onClick={handleConfirmSave}
                    >
                      <Check size={16} />
                      <span>Confirm & Record in Journal</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 2: AI CHAT COACH */}
            {activeTab === 'chat' && (
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                {/* Chat messages scrollable area with data-lenis-prevent */}
                <div className="ai-drawer-scrollable" data-lenis-prevent="true" style={{ flex: 1 }}>
                  {chatMessages.map((m, i) => (
                    <div 
                      key={i}
                      style={{
                        alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                        maxWidth: '88%',
                        background: m.role === 'user' ? 'linear-gradient(135deg, #9380ff, #38bdf8)' : 'rgba(28, 34, 54, 0.88)',
                        padding: '12px 16px',
                        borderRadius: '16px',
                        fontSize: '0.88rem',
                        lineHeight: '1.6',
                        whiteSpace: 'pre-wrap',
                        border: m.role === 'user' ? 'none' : '1px solid var(--border-subtle)',
                        color: 'var(--text-primary)'
                      }}
                    >
                      {m.text}
                    </div>
                  ))}
                  {isChatLoading && (
                    <div style={{ fontSize: '0.82rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '8px', padding: '8px' }}>
                      <Sparkles size={14} className="text-profit" />
                      <span>Gemini AI is analyzing your performance metrics...</span>
                    </div>
                  )}
                </div>

                {/* Quick Chat Suggestions */}
                <div className="ai-chat-quick-suggestions">
                  <button 
                    className="ai-chat-suggestion-chip"
                    onClick={() => handleSendChat('10000rs capital me risk management aur position sizing kaise kare?')}
                  >
                    🛡️ 10k Risk Rules
                  </button>
                  <button 
                    className="ai-chat-suggestion-chip"
                    onClick={() => handleSendChat('Trading discipline maintain karne ke 3 best golden rules batao')}
                  >
                    🧠 Discipline & Mindset
                  </button>
                  <button 
                    className="ai-chat-suggestion-chip"
                    onClick={() => handleSendChat('What are the key rules for high win-rate Gold and Nifty trade entries?')}
                  >
                    📊 Strategy Edge
                  </button>
                  <button 
                    className="ai-chat-suggestion-chip"
                    onClick={() => handleSendChat('Audit my recent trades and find my statistical edge and leaks')}
                  >
                    🔥 Performance Audit
                  </button>
                </div>

                {/* Chat Input Pinned At Bottom */}
                <div className="ai-chat-bottom-dock">
                  <input 
                    type="text"
                    className="form-input"
                    placeholder='Ask Gemini AI: "10k me risk kaise lein", "Nifty view", "Gold strategy", "psychology tips"...'
                    value={chatInput}
                    onChange={e => setChatInput(e.target.value)}
                    onKeyDown={e => { if (e.key === 'Enter') handleSendChat(); }}
                    style={{ fontSize: '0.88rem', padding: '10px 14px' }}
                  />
                  <button 
                    className="btn btn-primary"
                    style={{ padding: '10px 16px' }}
                    onClick={() => handleSendChat()}
                    disabled={isChatLoading || !chatInput.trim()}
                    title="Send Query"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            )}
          </div>
        </>
      )}
    </>
  );
}
