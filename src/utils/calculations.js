// Comprehensive Trading Math & Strategy Analytics Utilities

export const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

/**
 * Calculate core metrics across a list of trades
 */
export function calculateMetrics(trades, initialCapital = 10000) {
  if (!trades || trades.length === 0) {
    return {
      totalTrades: 0,
      winTrades: 0,
      lossTrades: 0,
      winRate: 0,
      totalNetPnl: 0,
      totalProfit: 0,
      totalLoss: 0,
      profitFactor: 0,
      avgWin: 0,
      avgLoss: 0,
      currentCapital: initialCapital,
      roiPercent: 0,
      avgRiskReward: '0:1',
      bestTrade: 0,
      worstTrade: 0,
      maxDrawdownPercent: 0
    };
  }

  let totalNetPnl = 0;
  let totalProfit = 0;
  let totalLoss = 0;
  let winTrades = 0;
  let lossTrades = 0;
  let bestTrade = -Infinity;
  let worstTrade = Infinity;

  // Running balance for equity curve & drawdown
  let peakBalance = initialCapital;
  let currentBalance = initialCapital;
  let maxDrawdown = 0;

  // Sort trades chronologically
  const sortedTrades = [...trades].sort((a, b) => new Date(`${a.date}T${a.time || '00:00'}`) - new Date(`${b.date}T${b.time || '00:00'}`));

  sortedTrades.forEach(trade => {
    const pnl = Number(trade.pnl) || 0;
    totalNetPnl += pnl;

    if (pnl > 0) {
      winTrades++;
      totalProfit += pnl;
      if (pnl > bestTrade) bestTrade = pnl;
    } else if (pnl < 0) {
      lossTrades++;
      totalLoss += Math.abs(pnl);
      if (pnl < worstTrade) worstTrade = pnl;
    }

    currentBalance += pnl;
    if (currentBalance > peakBalance) {
      peakBalance = currentBalance;
    }
    const drawdown = peakBalance > 0 ? ((peakBalance - currentBalance) / peakBalance) * 100 : 0;
    if (drawdown > maxDrawdown) {
      maxDrawdown = drawdown;
    }
  });

  const totalTrades = trades.length;
  const winRate = totalTrades > 0 ? (winTrades / totalTrades) * 100 : 0;
  const profitFactor = totalLoss > 0 ? (totalProfit / totalLoss) : totalProfit > 0 ? 99.9 : 0;
  const avgWin = winTrades > 0 ? (totalProfit / winTrades) : 0;
  const avgLoss = lossTrades > 0 ? (totalLoss / lossTrades) : 0;
  const currentCapital = initialCapital + totalNetPnl;
  const roiPercent = initialCapital > 0 ? (totalNetPnl / initialCapital) * 100 : 0;

  return {
    totalTrades,
    winTrades,
    lossTrades,
    winRate: Number(winRate.toFixed(1)),
    totalNetPnl: Number(totalNetPnl.toFixed(2)),
    totalProfit: Number(totalProfit.toFixed(2)),
    totalLoss: Number(totalLoss.toFixed(2)),
    profitFactor: Number(profitFactor.toFixed(2)),
    avgWin: Number(avgWin.toFixed(2)),
    avgLoss: Number(avgLoss.toFixed(2)),
    currentCapital: Number(currentCapital.toFixed(2)),
    roiPercent: Number(roiPercent.toFixed(2)),
    bestTrade: bestTrade === -Infinity ? 0 : Number(bestTrade.toFixed(2)),
    worstTrade: worstTrade === Infinity ? 0 : Number(worstTrade.toFixed(2)),
    maxDrawdownPercent: Number(maxDrawdown.toFixed(1))
  };
}

/**
 * Calculates Day-of-Week Analytics: Monday to Friday (and weekend crypto)
 * Directly answers the user requirement: "week ke konse din pe sabse jada profit hora"
 */
export function calculateDayOfWeekStats(trades) {
  const days = [
    { dayIndex: 1, name: 'Monday', short: 'Mon', totalTrades: 0, wins: 0, losses: 0, totalPnl: 0 },
    { dayIndex: 2, name: 'Tuesday', short: 'Tue', totalTrades: 0, wins: 0, losses: 0, totalPnl: 0 },
    { dayIndex: 3, name: 'Wednesday', short: 'Wed', totalTrades: 0, wins: 0, losses: 0, totalPnl: 0 },
    { dayIndex: 4, name: 'Thursday', short: 'Thu', totalTrades: 0, wins: 0, losses: 0, totalPnl: 0 },
    { dayIndex: 5, name: 'Friday', short: 'Fri', totalTrades: 0, wins: 0, losses: 0, totalPnl: 0 },
    { dayIndex: 6, name: 'Saturday', short: 'Sat', totalTrades: 0, wins: 0, losses: 0, totalPnl: 0 },
    { dayIndex: 0, name: 'Sunday', short: 'Sun', totalTrades: 0, wins: 0, losses: 0, totalPnl: 0 }
  ];

  trades.forEach(trade => {
    if (!trade.date) return;
    const d = new Date(trade.date + 'T00:00:00');
    const dayOfWeek = d.getDay();
    const dayObj = days.find(x => x.dayIndex === dayOfWeek);
    if (dayObj) {
      dayObj.totalTrades++;
      const pnl = Number(trade.pnl) || 0;
      dayObj.totalPnl += pnl;
      if (pnl > 0) dayObj.wins++;
      else if (pnl < 0) dayObj.losses++;
    }
  });

  // Calculate percentages and average
  days.forEach(d => {
    d.winRate = d.totalTrades > 0 ? Number(((d.wins / d.totalTrades) * 100).toFixed(1)) : 0;
    d.avgPnl = d.totalTrades > 0 ? Number((d.totalPnl / d.totalTrades).toFixed(2)) : 0;
    d.totalPnl = Number(d.totalPnl.toFixed(2));
  });

  // Find best day by total PnL
  let bestDay = null;
  let maxPnl = -Infinity;
  days.forEach(d => {
    if (d.totalTrades > 0 && d.totalPnl > maxPnl) {
      maxPnl = d.totalPnl;
      bestDay = d.name;
    }
  });

  return { days, bestDay };
}

/**
 * Group stats by Asset (Gold, BTC, Forex, Indices)
 */
export function calculateAssetStats(trades) {
  const map = {};
  trades.forEach(trade => {
    const asset = trade.asset || 'OTHER';
    if (!map[asset]) {
      map[asset] = { asset, totalTrades: 0, wins: 0, losses: 0, totalPnl: 0 };
    }
    map[asset].totalTrades++;
    const pnl = Number(trade.pnl) || 0;
    map[asset].totalPnl += pnl;
    if (pnl > 0) map[asset].wins++;
    else if (pnl < 0) map[asset].losses++;
  });

  const list = Object.values(map).map(a => ({
    ...a,
    totalPnl: Number(a.totalPnl.toFixed(2)),
    winRate: a.totalTrades > 0 ? Number(((a.wins / a.totalTrades) * 100).toFixed(1)) : 0
  }));

  list.sort((a, b) => b.totalPnl - a.totalPnl);
  return list;
}

/**
 * Group stats by Strategy
 */
export function calculateStrategyStats(trades) {
  const map = {};
  trades.forEach(trade => {
    const strategy = trade.strategy || 'Unspecified';
    if (!map[strategy]) {
      map[strategy] = { strategy, totalTrades: 0, wins: 0, losses: 0, totalPnl: 0, totalProfit: 0, totalLoss: 0 };
    }
    map[strategy].totalTrades++;
    const pnl = Number(trade.pnl) || 0;
    map[strategy].totalPnl += pnl;
    if (pnl > 0) {
      map[strategy].wins++;
      map[strategy].totalProfit += pnl;
    } else if (pnl < 0) {
      map[strategy].losses++;
      map[strategy].totalLoss += Math.abs(pnl);
    }
  });

  const list = Object.values(map).map(s => {
    const profitFactor = s.totalLoss > 0 ? (s.totalProfit / s.totalLoss) : s.totalProfit > 0 ? 99.9 : 0;
    return {
      strategy: s.strategy,
      totalTrades: s.totalTrades,
      wins: s.wins,
      losses: s.losses,
      totalPnl: Number(s.totalPnl.toFixed(2)),
      winRate: s.totalTrades > 0 ? Number(((s.wins / s.totalTrades) * 100).toFixed(1)) : 0,
      profitFactor: Number(profitFactor.toFixed(2))
    };
  });

  list.sort((a, b) => b.totalPnl - a.totalPnl);
  return list;
}

/**
 * Generate monthly matrix for Calendar Heatmap View
 */
export function generateMonthCalendar(trades, year, month) {
  // month: 0-indexed (0 = Jan, 8 = Sep)
  const firstDayOfMonth = new Date(year, month, 1);
  const lastDayOfMonth = new Date(year, month + 1, 0);

  const startDayOfWeek = firstDayOfMonth.getDay(); // 0 is Sunday
  const daysInMonth = lastDayOfMonth.getDate();

  // Map trades to date key 'YYYY-MM-DD'
  const tradesByDate = {};
  trades.forEach(t => {
    if (!t.date) return;
    if (!tradesByDate[t.date]) {
      tradesByDate[t.date] = [];
    }
    tradesByDate[t.date].push(t);
  });

  const calendarDays = [];

  // Previous month trailing days
  const prevMonthLastDay = new Date(year, month, 0).getDate();
  for (let i = startDayOfWeek - 1; i >= 0; i--) {
    const dayNum = prevMonthLastDay - i;
    calendarDays.push({
      dayNumber: dayNum,
      isCurrentMonth: false,
      dateString: null,
      trades: [],
      netPnl: 0,
      status: 'none'
    });
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    const monthStr = String(month + 1).padStart(2, '0');
    const dayStr = String(d).padStart(2, '0');
    const dateKey = `${year}-${monthStr}-${dayStr}`;
    const dayTrades = tradesByDate[dateKey] || [];

    const netPnl = dayTrades.reduce((acc, curr) => acc + (Number(curr.pnl) || 0), 0);
    let status = 'none';
    if (dayTrades.length > 0) {
      if (netPnl > 0) status = 'profit';
      else if (netPnl < 0) status = 'loss';
      else status = 'even';
    }

    calendarDays.push({
      dayNumber: d,
      isCurrentMonth: true,
      dateString: dateKey,
      trades: dayTrades,
      netPnl: Number(netPnl.toFixed(2)),
      status
    });
  }

  // Next month leading days to complete grid (42 cells = 6 weeks)
  const remainingCells = 42 - calendarDays.length;
  for (let i = 1; i <= remainingCells; i++) {
    calendarDays.push({
      dayNumber: i,
      isCurrentMonth: false,
      dateString: null,
      trades: [],
      netPnl: 0,
      status: 'none'
    });
  }

  return calendarDays;
}

/**
 * Format currency with symbol
 */
export function formatCurrency(amount, currency = '$') {
  const num = Number(amount) || 0;
  const sign = num > 0 ? '+' : num < 0 ? '-' : '';
  const absFormatted = Math.abs(num).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2
  });
  return `${sign}${currency}${absFormatted}`;
}
