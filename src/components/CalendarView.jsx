import React, { useState, useEffect, useRef } from 'react';
import gsap from 'gsap';
import { 
  ChevronLeft, 
  ChevronRight, 
  Calendar as CalendarIcon, 
  TrendingUp, 
  TrendingDown, 
  CheckCircle2, 
  XCircle, 
  Clock, 
  X,
  Target
} from 'lucide-react';
import { generateMonthCalendar, formatCurrency } from '../utils/calculations';

export default function CalendarView({ trades, currency, onSelectTrade }) {
  // Current calendar view state (defaults to real current month & year)
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDayData, setSelectedDayData] = useState(null);

  const dayModalRef = useRef(null);
  const dayOverlayRef = useRef(null);

  useEffect(() => {
    if (selectedDayData && dayModalRef.current && dayOverlayRef.current) {
      gsap.killTweensOf([dayOverlayRef.current, dayModalRef.current]);
      gsap.fromTo(dayOverlayRef.current, { opacity: 0 }, { opacity: 1, duration: 0.2, ease: 'power2.out' });
      gsap.fromTo(dayModalRef.current, 
        { opacity: 0, scale: 0.94, y: 12 }, 
        { opacity: 1, scale: 1, y: 0, duration: 0.24, ease: 'power3.out', clearProps: 'transform,opacity' }
      );
    }
  }, [selectedDayData]);

  const handleCloseDayModal = () => {
    if (dayModalRef.current && dayOverlayRef.current) {
      gsap.killTweensOf([dayOverlayRef.current, dayModalRef.current]);
      gsap.to(dayOverlayRef.current, { opacity: 0, duration: 0.15, ease: 'power2.in' });
      gsap.to(dayModalRef.current, {
        opacity: 0,
        scale: 0.96,
        y: 8,
        duration: 0.15,
        ease: 'power2.in',
        onComplete: () => setSelectedDayData(null)
      });
    } else {
      setSelectedDayData(null);
    }
  };

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleCurrentMonth = () => {
    setCurrentDate(new Date());
  };

  // Generate matrix
  const calendarCells = generateMonthCalendar(trades, year, month);

  // Month Statistics
  const currentMonthTrades = trades.filter(t => {
    if (!t.date) return false;
    const d = new Date(t.date + 'T00:00:00');
    return d.getFullYear() === year && d.getMonth() === month;
  });

  const monthPnl = currentMonthTrades.reduce((acc, t) => acc + (Number(t.pnl) || 0), 0);
  const monthWins = currentMonthTrades.filter(t => (Number(t.pnl) || 0) > 0).length;
  const monthLosses = currentMonthTrades.filter(t => (Number(t.pnl) || 0) < 0).length;
  const monthWinRate = currentMonthTrades.length > 0 
    ? ((monthWins / currentMonthTrades.length) * 100).toFixed(1) 
    : 0;

  // Green days vs Red days
  let greenDays = 0;
  let redDays = 0;
  calendarCells.filter(c => c.isCurrentMonth && c.trades.length > 0).forEach(c => {
    if (c.netPnl > 0) greenDays++;
    else if (c.netPnl < 0) redDays++;
  });

  return (
    <div className="view-container">
      {/* Month Header Navigation & Stats Bar */}
      <div className="card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '16px' }}>
          <div className="calendar-month-picker">
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <button className="btn-icon" onClick={handlePrevMonth} title="Previous Month">
                <ChevronLeft size={18} />
              </button>
              <h2 className="calendar-current-month">
                {monthNames[month]} {year}
              </h2>
              <button className="btn-icon" onClick={handleNextMonth} title="Next Month">
                <ChevronRight size={18} />
              </button>
            </div>
            <button 
              className="btn btn-secondary" 
              style={{ fontSize: '0.78rem', padding: '6px 12px' }}
              onClick={handleCurrentMonth}
            >
              Current Month
            </button>
          </div>

          {/* Month Summary KPI Badges */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px', flexWrap: 'wrap' }}>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Month Net P&L</div>
              <div 
                style={{ 
                  fontFamily: 'var(--font-mono)', 
                  fontWeight: 800, 
                  fontSize: '1.25rem',
                  color: monthPnl >= 0 ? 'var(--profit)' : 'var(--loss)'
                }}
              >
                {formatCurrency(monthPnl, currency)}
              </div>
            </div>

            <div style={{ height: '32px', width: '1px', background: 'var(--border-subtle)' }} />

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Day Distribution</div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.9rem', fontWeight: 600 }}>
                <span className="text-profit">{greenDays} Green</span>
                <span>/</span>
                <span className="text-loss">{redDays} Red</span>
              </div>
            </div>

            <div style={{ height: '32px', width: '1px', background: 'var(--border-subtle)' }} />

            <div>
              <div style={{ fontSize: '0.72rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Win Rate</div>
              <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-primary)' }}>
                {monthWinRate}% ({currentMonthTrades.length} Trades)
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive 7-Column Calendar Heatmap */}
      <div className="card">
        {/* Days Header */}
        <div className="calendar-grid" style={{ marginBottom: '8px' }}>
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
            <div key={d} className="calendar-day-header">
              {d}
            </div>
          ))}
        </div>

        {/* Days Matrix */}
        <div className="calendar-grid">
          {calendarCells.map((cell, idx) => {
            const isClickable = cell.isCurrentMonth && cell.trades.length > 0;
            const pnlClass = cell.status === 'profit' ? 'profit-day' : cell.status === 'loss' ? 'loss-day' : '';

            return (
              <div
                key={idx}
                className={`calendar-cell ${!cell.isCurrentMonth ? 'other-month' : ''} ${pnlClass}`}
                onClick={() => {
                  if (isClickable) setSelectedDayData(cell);
                }}
                style={{ cursor: isClickable ? 'pointer' : 'default' }}
              >
                <div className="calendar-cell-top">
                  <span className="cell-day-number">{cell.dayNumber}</span>
                  {cell.trades.length > 0 && (
                    <span className="cell-trade-count">
                      {cell.trades.length} {cell.trades.length === 1 ? 'trade' : 'trades'}
                    </span>
                  )}
                </div>

                {cell.trades.length > 0 && (
                  <>
                    <div 
                      className="calendar-cell-pnl"
                      style={{ color: cell.netPnl >= 0 ? 'var(--profit)' : 'var(--loss)' }}
                    >
                      {formatCurrency(cell.netPnl, currency)}
                    </div>

                    <div className="cell-trades-dots">
                      {cell.trades.slice(0, 5).map((t, tIdx) => (
                        <div 
                          key={tIdx} 
                          className={`trade-dot ${t.pnl >= 0 ? 'win' : 'loss'}`} 
                          title={`${t.asset} ${t.pnl >= 0 ? '+' : ''}${t.pnl}`}
                        />
                      ))}
                      {cell.trades.length > 5 && (
                        <span style={{ fontSize: '0.6rem', color: 'var(--text-muted)' }}>+</span>
                      )}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Day Trades Detail Modal / Drawer */}
      {selectedDayData && (
        <div ref={dayOverlayRef} className="modal-overlay" onClick={handleCloseDayModal}>
          <div ref={dayModalRef} className="modal-content" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <CalendarIcon size={20} style={{ color: 'var(--accent-cyan)' }} />
                <h3 className="modal-title">
                  Trades for {selectedDayData.dateString}
                </h3>
              </div>
              <button className="btn-icon" onClick={handleCloseDayModal}>
                <X size={18} />
              </button>
            </div>

            <div className="modal-body">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '12px 16px', background: 'var(--bg-tertiary)', borderRadius: '8px' }}>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Daily Result</span>
                  <div 
                    style={{ 
                      fontFamily: 'var(--font-mono)', 
                      fontSize: '1.2rem', 
                      fontWeight: 700,
                      color: selectedDayData.netPnl >= 0 ? 'var(--profit)' : 'var(--loss)'
                    }}
                  >
                    {formatCurrency(selectedDayData.netPnl, currency)}
                  </div>
                </div>
                <div>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>Positions</span>
                  <div style={{ fontWeight: 600, fontSize: '1rem' }}>
                    {selectedDayData.trades.length} Executed
                  </div>
                </div>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {selectedDayData.trades.map(trade => (
                  <div 
                    key={trade.id}
                    style={{
                      background: 'var(--bg-card)',
                      border: '1px solid var(--border-subtle)',
                      borderRadius: '10px',
                      padding: '14px',
                      display: 'flex',
                      flexDirection: 'column',
                      gap: '8px'
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <span className="asset-badge">{trade.asset}</span>
                        <span className={`trade-type-pill ${trade.type.toLowerCase()}`}>{trade.type}</span>
                        <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{trade.time || ''}</span>
                      </div>
                      <span 
                        style={{ 
                          fontFamily: 'var(--font-mono)', 
                          fontWeight: 700, 
                          color: trade.pnl >= 0 ? 'var(--profit)' : 'var(--loss)'
                        }}
                      >
                        {formatCurrency(trade.pnl, currency)}
                      </span>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '8px', fontSize: '0.78rem', background: 'var(--bg-tertiary)', padding: '8px', borderRadius: '6px' }}>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Entry</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{trade.entryPrice}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Exit</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{trade.exitPrice}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>R:R</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{trade.riskRewardRatio || '2.0:1'}</span>
                      </div>
                      <div>
                        <span style={{ color: 'var(--text-muted)', display: 'block' }}>Lot</span>
                        <span style={{ fontFamily: 'var(--font-mono)' }}>{trade.lotSize || 1.0}</span>
                      </div>
                    </div>

                    {trade.notes && (
                      <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', fontStyle: 'italic' }}>
                        "{trade.notes}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={handleCloseDayModal}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
