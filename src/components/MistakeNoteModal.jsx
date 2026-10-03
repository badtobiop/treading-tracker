import React, { useState, useEffect } from 'react';
import { AlertTriangle, Check, X, ShieldAlert, Sparkles, HelpCircle } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

// Common psychological and technical mistakes in trading
const COMMON_MISTAKES = [
  { id: 'fomo', label: '⚡ FOMO Entry', text: 'FOMO: Chhuti hui candle dekh kar jaldbazi me entry li.' },
  { id: 'early', label: '⏳ No Confirmation', text: 'Early Entry: Candle close ya retest confirmation ka wait nahi kiya.' },
  { id: 'moved_sl', label: '🛑 Moved / Removed SL', text: 'SL Rule Break: Loss badhta dekh Stop-Loss peeche khiska diya.' },
  { id: 'over_leverage', label: '📉 Over-Leveraged', text: 'Over-Leverage: Capital ke hisaab se bohot badi lot size le li.' },
  { id: 'revenge', label: '💥 Revenge Trade', text: 'Revenge Trading: Pichhle loss ko recover karne ke gusse me trade liya.' },
  { id: 'counter_trend', label: '🔄 Counter-Trend', text: 'Counter Trend: Strong higher timeframe trend ke against ghus gaya.' },
  { id: 'news', label: '📰 High Impact News', text: 'News Volatility: High-impact economic news ke dauran trade liya.' },
  { id: 'greed', label: '🎯 Greed at TP', text: 'Greed: Target hit hone par profit book nahi kiya aur trade reverse ho gayi.' },
  { id: 'impatience', label: '😴 Impatience / Boredom', text: 'Boredom Trade: Setup banne se pehle hi bina reason trade le li.' }
];

export default function MistakeNoteModal({ isOpen, trade, onClose, onSave, currency = '₹' }) {
  const [mistakeText, setMistakeText] = useState('');
  const [lessonText, setLessonText] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (trade) {
      // If trade already has mistakeNote or lesson
      const existing = trade.mistakeNote || '';
      setMistakeText(existing);
      setLessonText(trade.lessonLearned || '');
      setSelectedTags([]);
      setSavedSuccess(false);
    }
  }, [trade]);

  // Lock background page scroll and pause Lenis while modal is open
  useEffect(() => {
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      window.__lenis?.stop();
      return () => {
        document.body.style.overflow = origOverflow;
        window.__lenis?.start();
      };
    }
  }, [isOpen]);

  if (!isOpen || !trade) return null;

  const pnl = Number(trade.pnl) || 0;
  const isLoss = pnl < 0 || trade.outcome === 'SL_HIT';

  const handleToggleTag = (tag) => {
    if (selectedTags.includes(tag.id)) {
      setSelectedTags(prev => prev.filter(t => t !== tag.id));
      // Remove text if needed or leave as is
    } else {
      setSelectedTags(prev => [...prev, tag.id]);
      setMistakeText(prev => {
        const clean = prev.trim();
        return clean ? `${clean}\n• ${tag.text}` : tag.text;
      });
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!mistakeText.trim() && !lessonText.trim()) {
      alert('Kripya apni galti ya sikh (lesson) likhein!');
      return;
    }

    const updatedTrade = {
      ...trade,
      mistakeNote: mistakeText.trim(),
      lessonLearned: lessonText.trim(),
      // Also ensure it is logged in notes if notes was empty
      notes: trade.notes 
        ? trade.notes.includes('[GALTI / MISTAKE]:') 
          ? trade.notes 
          : `${trade.notes}\n\n[GALTI / MISTAKE]: ${mistakeText.trim()}`
        : `[GALTI / MISTAKE]: ${mistakeText.trim()}`
    };

    onSave(updatedTrade);
    setSavedSuccess(true);
    setTimeout(() => {
      onClose();
    }, 700);
  };

  return (
    <div className="modal-overlay" data-lenis-prevent="true" onClick={onClose} style={{ zIndex: 9999 }}>
      <div 
        className="modal-content" 
        data-lenis-prevent="true" 
        onClick={e => e.stopPropagation()} 
        style={{ maxWidth: '580px', border: '1px solid rgba(244, 63, 94, 0.35)', boxShadow: '0 20px 50px rgba(0,0,0,0.6)' }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', paddingBottom: '14px', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ width: '36px', height: '36px', borderRadius: '8px', background: 'rgba(244, 63, 94, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--loss)' }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Trade Post-Mortem & Galti Analysis
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Galti likhne se trading psychology strong hoti hai aur yahi mistake dobara repeat nahi hoti
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={onClose} type="button">
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="modal-body" data-lenis-prevent="true" style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto', flex: 1, maxHeight: '68vh', overscrollBehavior: 'contain', WebkitOverflowScrolling: 'touch' }}>
            
            {/* Trade Context Strip */}
            <div style={{
              background: 'rgba(244, 63, 94, 0.08)',
              border: '1px solid rgba(244, 63, 94, 0.25)',
              borderRadius: '10px',
              padding: '12px 14px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              flexWrap: 'wrap',
              gap: '10px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span className="asset-badge" style={{ fontSize: '0.9rem' }}>{trade.asset}</span>
                <span className={`trade-type-pill ${trade.type.toLowerCase()}`}>
                  {trade.type}
                </span>
                <span style={{ fontSize: '0.76rem', color: 'var(--text-secondary)' }}>
                  Entry: <strong>{trade.entryPrice}</strong> → SL/Exit: <strong>{trade.stopLoss || trade.exitPrice}</strong>
                </span>
              </div>

              <div style={{ textAlign: 'right' }}>
                <span style={{ fontSize: '0.72rem', color: 'var(--text-muted)', display: 'block' }}>Loss Amount</span>
                <span style={{ fontFamily: 'var(--font-mono)', fontWeight: 800, fontSize: '1rem', color: isLoss ? 'var(--loss)' : 'var(--profit)' }}>
                  {formatCurrency(pnl, currency)}
                </span>
              </div>
            </div>

            {/* Quick 1-Click Mistake Tags */}
            <div>
              <label style={{ fontSize: '0.78rem', fontWeight: 700, color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
                <Sparkles size={14} style={{ color: 'var(--accent-amber)' }} />
                Quick Select: Is trade me kya galti hui thi? (Tap to add)
              </label>
              
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '7px' }}>
                {COMMON_MISTAKES.map(tag => {
                  const isSelected = selectedTags.includes(tag.id) || (trade.mistakeNote && trade.mistakeNote.includes(tag.text.slice(0, 15)));
                  return (
                    <button
                      key={tag.id}
                      type="button"
                      onClick={() => handleToggleTag(tag)}
                      style={{
                        fontSize: '0.74rem',
                        padding: '5px 10px',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                        border: isSelected 
                          ? '1px solid rgba(244, 63, 94, 0.7)' 
                          : '1px solid rgba(255, 255, 255, 0.1)',
                        background: isSelected 
                          ? 'rgba(244, 63, 94, 0.22)' 
                          : 'rgba(255, 255, 255, 0.04)',
                        color: isSelected ? '#fda4af' : 'var(--text-secondary)',
                        fontWeight: isSelected ? 700 : 500
                      }}
                    >
                      {tag.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Main Mistake Input Field */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: '#fda4af', fontWeight: 700 }}>
                  ⚠️ Meri kya galti thi? (Reason for SL Hit) *
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Apne words me likhein
                </span>
              </label>
              <textarea
                className="form-textarea"
                rows={4}
                required
                placeholder="e.g. Maine jaldbazi me bina candle confirmation ke entry li, leverage 50x bohot zyada tha aur support tutne par bhi trade hold ki..."
                value={mistakeText}
                onChange={e => setMistakeText(e.target.value)}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(244, 63, 94, 0.35)',
                  color: 'var(--text-primary)',
                  fontSize: '0.86rem',
                  lineHeight: 1.5
                }}
              />
            </div>

            {/* Lesson / What will I do next time */}
            <div className="form-group">
              <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ color: 'var(--accent-cyan)', fontWeight: 700 }}>
                  💡 Agli baar is galti se bachne ke liye kya rule follow karunga?
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Future Rule (Optional)
                </span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Jab tak 15m candle close na ho tab tak order nahi place karunga."
                value={lessonText}
                onChange={e => setLessonText(e.target.value)}
                style={{
                  background: 'rgba(15, 23, 42, 0.65)',
                  border: '1px solid rgba(56, 189, 248, 0.3)',
                  fontSize: '0.84rem'
                }}
              />
            </div>

            {/* Psychological reminder */}
            <div style={{
              background: 'rgba(255, 255, 255, 0.03)',
              borderRadius: '8px',
              padding: '10px 12px',
              fontSize: '0.74rem',
              color: 'var(--text-muted)',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <ShieldAlert size={16} style={{ color: 'var(--accent-amber)', flexShrink: 0 }} />
              <span>
                <strong>Pro Trader Tip:</strong> Top 1% profitable traders kabhi apne loss ko ignore nahi karte, balki har loss ki galti likh kar apna edge improve karte hain.
              </span>
            </div>

          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              Cancel
            </button>

            <button 
              type="submit" 
              className="btn btn-primary"
              style={{
                background: savedSuccess ? 'var(--profit)' : 'linear-gradient(135deg, #f43f5e 0%, #e11d48 100%)',
                borderColor: savedSuccess ? 'var(--profit)' : '#f43f5e',
                display: 'inline-flex',
                alignItems: 'center',
                gap: '6px',
                fontWeight: 700
              }}
            >
              {savedSuccess ? (
                <>
                  <Check size={16} />
                  <span>Galti Note Saved!</span>
                </>
              ) : (
                <>
                  <AlertTriangle size={16} />
                  <span>Save Mistake Note</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
