import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { AlertTriangle, Check, X, ShieldAlert, Sparkles } from 'lucide-react';
import { formatCurrency } from '../utils/calculations';

// Common psychological and technical mistakes in trading (English)
const COMMON_MISTAKES = [
  { id: 'fomo', label: '⚡ FOMO Entry', text: 'FOMO: Chased a fast-moving candle without waiting for a proper setup.' },
  { id: 'early', label: '⏳ No Confirmation', text: 'Early Entry: Did not wait for candle close or structural confirmation.' },
  { id: 'moved_sl', label: '🛑 Moved / Widened SL', text: 'Rule Violation: Moved or widened Stop-Loss when trade moved against me.' },
  { id: 'over_leverage', label: '📉 Over-Leveraged', text: 'Over-Leverage: Position size was far too large for current account balance.' },
  { id: 'revenge', label: '💥 Revenge Trade', text: 'Revenge Trading: Traded emotionally to quickly recover a previous loss.' },
  { id: 'counter_trend', label: '🔄 Counter-Trend', text: 'Counter-Trend: Fought against strong higher-timeframe trend momentum.' },
  { id: 'news', label: '📰 High Impact News', text: 'News Volatility: Executed during unpredictable high-impact economic data.' },
  { id: 'greed', label: '🎯 Greed at Target', text: 'Greed: Did not lock in profits at planned Take-Profit target.' },
  { id: 'impatience', label: '😴 Impatience / Boredom', text: 'Boredom Trade: Took an unplanned trade without an edge or clear signal.' }
];

export default function MistakeNoteModal({ isOpen, trade, onClose, onSave, currency = '₹' }) {
  const [mistakeText, setMistakeText] = useState('');
  const [lessonText, setLessonText] = useState('');
  const [selectedTags, setSelectedTags] = useState([]);
  const [savedSuccess, setSavedSuccess] = useState(false);

  useEffect(() => {
    if (trade) {
      const existing = trade.mistakeNote || '';
      setMistakeText(existing);
      setLessonText(trade.lessonLearned || '');
      setSelectedTags([]);
      setSavedSuccess(false);
    }
  }, [trade]);

  // Lock background page scroll while modal is open without breaking wheel event dispatch
  useEffect(() => {
    if (isOpen) {
      const origOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = origOverflow;
      };
    }
  }, [isOpen]);

  const noteOverlayRef = useRef(null);
  const noteModalRef = useRef(null);

  useEffect(() => {
    if (isOpen && noteModalRef.current && noteOverlayRef.current) {
      gsap.killTweensOf([noteOverlayRef.current, noteModalRef.current]);
      gsap.fromTo(noteOverlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
      gsap.fromTo(noteModalRef.current, 
        { opacity: 0, scale: 0.94, y: 12 }, 
        { opacity: 1, scale: 1, y: 0, duration: 0.25, ease: 'power3.out', clearProps: 'transform,opacity' }
      );
    }
  }, [isOpen]);

  const pnl = Number(trade?.pnl) || 0;
  const isLoss = pnl < 0 || trade?.outcome === 'SL_HIT';

  const handleToggleTag = (tag) => {
    if (selectedTags.includes(tag.id)) {
      setSelectedTags(prev => prev.filter(t => t !== tag.id));
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
      alert('Please describe what caused the mistake or your lesson learned.');
      return;
    }

    const updatedTrade = {
      ...trade,
      mistakeNote: mistakeText.trim(),
      lessonLearned: lessonText.trim(),
      notes: trade.notes 
        ? (trade.notes.includes('[MISTAKE NOTE]:') || trade.notes.includes('[GALTI / MISTAKE]:'))
          ? trade.notes 
          : `${trade.notes}\n\n[MISTAKE NOTE]: ${mistakeText.trim()}`
        : `[MISTAKE NOTE]: ${mistakeText.trim()}`
    };

    onSave(updatedTrade);
    setSavedSuccess(true);
    setTimeout(() => {
      handleSmoothClose();
    }, 500);
  };



  const handleSmoothClose = () => {
    if (noteModalRef.current && noteOverlayRef.current) {
      gsap.killTweensOf([noteOverlayRef.current, noteModalRef.current]);
      gsap.to(noteOverlayRef.current, { opacity: 0, duration: 0.15, ease: 'power2.in' });
      gsap.to(noteModalRef.current, {
        opacity: 0,
        scale: 0.96,
        y: 8,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: onClose
      });
    } else {
      onClose();
    }
  };

  if (!isOpen || !trade) return null;

  return (
    <div 
      ref={noteOverlayRef}
      className="modal-overlay" 
      data-lenis-prevent="true" 
      onClick={handleSmoothClose} 
      style={{ zIndex: 9999 }}
      onWheel={e => e.stopPropagation()}
    >
      <div 
        ref={noteModalRef}
        className="modal-content" 
        data-lenis-prevent="true" 
        onClick={e => e.stopPropagation()} 
        onWheel={e => e.stopPropagation()}
        style={{ 
          maxWidth: '600px', 
          border: '1px solid rgba(244, 63, 94, 0.35)', 
          boxShadow: 'var(--neu-raised-floating)' 
        }}
      >
        {/* Header */}
        <div className="modal-header" style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.08)', flexShrink: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <div style={{ 
              width: '36px', 
              height: '36px', 
              borderRadius: '8px', 
              background: 'rgba(244, 63, 94, 0.15)', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              color: 'var(--loss)' 
            }}>
              <AlertTriangle size={20} />
            </div>
            <div>
              <h3 style={{ margin: 0, fontSize: '1.08rem', fontWeight: 800, color: 'var(--text-primary)' }}>
                Trade Post-Mortem & Mistake Analysis
              </h3>
              <span style={{ fontSize: '0.74rem', color: 'var(--text-muted)' }}>
                Documenting mistakes builds discipline and stops costly repeat errors.
              </span>
            </div>
          </div>
          <button className="btn-icon" onClick={handleSmoothClose} type="button">
            <X size={18} />
          </button>
        </div>

        <form 
          onSubmit={handleSubmit} 
          style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
          onWheel={e => e.stopPropagation()}
        >
          <div 
            className="modal-body" 
            data-lenis-prevent="true" 
            onWheel={e => e.stopPropagation()}
            style={{ display: 'flex', flexDirection: 'column', gap: '16px', overflowY: 'auto' }}
          >
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
                Quick Select: What caused the loss? (Click to add)
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
                  ⚠️ Root Cause of Mistake (Reason for Stop-Loss Trigger) *
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Explain in your own words
                </span>
              </label>
              <textarea
                className="form-textarea"
                rows={4}
                required
                placeholder="e.g. Entered prematurely without waiting for 15m candle close, oversized position with 50x leverage, and held past invalidation level..."
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
                  💡 Corrective Rule (What will you do next time?)
                </span>
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                  Future Rule (Optional)
                </span>
              </label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g. Will never enter until 15m candle closes and risk is capped at 2%."
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
                <strong>Pro Trader Principle:</strong> Consistent traders never ignore losses. They review each mistake systematically to refine their edge.
              </span>
            </div>

          </div>

          {/* Footer */}
          <div className="modal-footer" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.08)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <button type="button" className="btn btn-secondary" onClick={handleSmoothClose}>
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
                  <span>Mistake Note Saved!</span>
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
