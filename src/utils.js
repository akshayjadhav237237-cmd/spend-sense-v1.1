export const CATEGORIES = [
  { name: 'Food', emoji: '🍔', color: '#FF6B6B' },
  { name: 'Transport', emoji: '🚌', color: '#4ECDC4' },
  { name: 'Study', emoji: '📚', color: '#6C63FF' },
  { name: 'Health', emoji: '💊', color: '#51CF66' },
  { name: 'Shopping', emoji: '🛍️', color: '#FFD93D' },
  { name: 'Entertainment', emoji: '🎮', color: '#FF8E53' },
  { name: 'Utilities', emoji: '💡', color: '#A29BFE' },
  { name: 'Rent', emoji: '🏠', color: '#FD79A8' },
  { name: 'Gym', emoji: '💪', color: '#55EFC4' },
  { name: 'Coffee', emoji: '☕', color: '#FDCB6E' },
  { name: 'Recharge', emoji: '📱', color: '#74B9FF' },
  { name: 'Other', emoji: '💸', color: '#B2BEC3' },
];

export const COLORS = {
  primary: '#6C63FF', expense: '#FF6B6B', lend: '#4ECDC4',
  success: '#51CF66', warning: '#FFD93D', surface: '#FFFFFF',
  bg: '#F8F9FF', text: '#1A1A2E', muted: '#8892A4',
};

export const AVATAR_COLORS = ['#FF6B6B','#4ECDC4','#6C63FF','#51CF66','#FFD93D','#FF8E53'];

export const generateId = () => Math.random().toString(36).slice(2, 11);

export const formatCurr = (amount, sym = '₹') => {
  const v = parseFloat(amount);
  if (isNaN(v)) return sym + '0';
  return sym + v.toLocaleString('en-IN', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
};

export const getRelativeDateLabel = (dateString) => {
  const today = new Date(); today.setHours(0,0,0,0);
  const yesterday = new Date(today); yesterday.setDate(yesterday.getDate() - 1);
  const d = new Date(dateString + 'T00:00:00');
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === yesterday.getTime()) return 'Yesterday';
  return new Intl.DateTimeFormat('en-IN', { month: 'short', day: '2-digit', year: 'numeric' }).format(d);
};

export const getTodayISO = () => new Date().toISOString().slice(0, 10);
export const getMonthKey = (dateString) => dateString ? dateString.slice(0, 7) : '';
export const getCurrentMonthKey = () => getTodayISO().slice(0, 7);

export const getWeekNumber = (dateString) => {
  const d = new Date(dateString + 'T00:00:00');
  d.setHours(0,0,0,0);
  d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
  const w = new Date(d.getFullYear(), 0, 4);
  return 1 + Math.round(((d.getTime() - w.getTime()) / 86400000 - 3 + (w.getDay() + 6) % 7) / 7);
};

export const parseAmount = (val) => {
  const v = parseFloat(val);
  return (isNaN(v) || v <= 0) ? null : v;
};

export const getInitials = (name = '') => {
  const parts = name.trim().split(' ').filter(Boolean);
  if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
  return name.slice(0, 2).toUpperCase() || 'SS';
};

export const getBudgetPercent = (expenses, limit) => {
  if (!limit || limit <= 0) return 0;
  const mk = getCurrentMonthKey();
  const total = expenses.filter(e => getMonthKey(e.date) === mk).reduce((s, e) => s + e.amount, 0);
  return Math.min((total / limit) * 100, 100);
};

export const avatarColor = (name = '') => {
  let h = 0; for (let i = 0; i < name.length; i++) h = (h * 31 + name.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[h];
};

export const generateAiResponse = (msg, expenses, lendings, settings, savingsGoals) => {
  const m = msg.toLowerCase();
  const cur = settings.currency || '₹';
  const mk = getCurrentMonthKey();
  const monthExp = expenses.filter(e => getMonthKey(e.date) === mk);
  const monthTotal = monthExp.reduce((s, e) => s + e.amount, 0);
  const pending = lendings.filter(l => l.status === 'pending');
  const pendingTotal = pending.reduce((s, l) => s + l.amount, 0);

  const prevMk = (() => { const d = new Date(mk + '-01'); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); })();
  const prevTotal = expenses.filter(e => getMonthKey(e.date) === prevMk).reduce((s,e) => s+e.amount, 0);

  const catTotals = {};
  monthExp.forEach(e => { catTotals[e.category] = (catTotals[e.category] || 0) + e.amount; });
  const topCat = Object.entries(catTotals).sort((a,b)=>b[1]-a[1])[0];

  if (m.includes('summarize') || m.includes('spending') || m.includes('summary')) {
    return `📊 *This Month's Summary*\n\nTotal Spent: ${formatCurr(monthTotal, cur)}\nTransactions: ${monthExp.length}\n${topCat ? `Top Category: ${topCat[0]} (${formatCurr(topCat[1], cur)})` : 'No transactions yet.'}\n${settings.budgetLimit > 0 ? `Budget Used: ${Math.round((monthTotal/settings.budgetLimit)*100)}% of ${formatCurr(settings.budgetLimit, cur)}` : ''}`;
  }
  if (m.includes('save') || m.includes('saving') || m.includes('cut')) {
    const nonEssential = ['Entertainment','Shopping','Coffee','Gym'];
    const neCats = Object.entries(catTotals).filter(([c]) => nonEssential.includes(c)).sort((a,b)=>b[1]-a[1]);
    if (neCats.length > 0) return `💡 *Savings Tip*\n\nYour highest non-essential spend is *${neCats[0][0]}* at ${formatCurr(neCats[0][1], cur)} this month. Try reducing it by 20% to save ${formatCurr(neCats[0][1]*0.2, cur)}!`;
    return `💡 Great job! No major non-essential spending this month. Keep it up!`;
  }
  if (m.includes('top') || m.includes('biggest') || m.includes('highest')) {
    const top = [...monthExp].sort((a,b)=>b.amount-a.amount)[0];
    if (!top) return `🏆 No expenses recorded this month yet!`;
    return `🏆 *Top Expense This Month*\n\n${top.desc || top.category}: ${formatCurr(top.amount, cur)}\nCategory: ${top.category}\nDate: ${getRelativeDateLabel(top.date)}`;
  }
  if (m.includes('compare') || m.includes('last month')) {
    if (prevTotal === 0) return `📅 No data for last month to compare.`;
    const diff = monthTotal - prevTotal;
    const pct = Math.abs(Math.round((diff/prevTotal)*100));
    return `📅 *Month Comparison*\n\nThis month: ${formatCurr(monthTotal, cur)}\nLast month: ${formatCurr(prevTotal, cur)}\n${diff > 0 ? `📈 You spent ${pct}% *more* than last month.` : `📉 You spent ${pct}% *less* — great job!`}`;
  }
  if (m.includes('lend') || m.includes('owe') || m.includes('borrow')) {
    if (pending.length === 0) return `🤝 No pending lendings! Everyone has paid you back.`;
    return `🤝 *Lending Summary*\n\nPending: ${pending.length} people owe you ${formatCurr(pendingTotal, cur)}\n${pending.slice(0,3).map(l=>`• ${l.name}: ${formatCurr(l.amount, cur)}`).join('\n')}`;
  }
  if (m.includes('budget')) {
    if (!settings.budgetLimit) return `💰 No budget limit set. Go to Settings to set one!`;
    const pct = Math.round((monthTotal/settings.budgetLimit)*100);
    return `💰 *Budget Status*\n\nSpent: ${formatCurr(monthTotal, cur)} of ${formatCurr(settings.budgetLimit, cur)} (${pct}%)\n${pct > 90 ? '⚠️ Almost at limit!' : pct > 70 ? '🟡 Over 70% used' : '✅ On track!'}`;
  }
  if (m.includes('goal')) {
    if (!savingsGoals?.length) return `🎯 No savings goals set. Go to Summary tab to add one!`;
    return `🎯 *Goals Progress*\n\n${savingsGoals.slice(0,3).map(g=>`${g.emoji} ${g.title}: ${formatCurr(g.currentAmount,cur)} / ${formatCurr(g.targetAmount,cur)}`).join('\n')}`;
  }
  return `✨ I can analyze your spending! Try asking:\n• "Summarize my spending"\n• "How can I save more?"\n• "What's my top expense?"\n• "Compare last two months"`;
};

import { useEffect, useRef } from 'react';

export const useFocusTrap = (ref, isActive) => {
  useEffect(() => {
    if (!isActive || !ref.current) return;
    const el = ref.current;
    const focusable = el.querySelectorAll('button,input,select,textarea,a[href],[tabindex]:not([tabindex="-1"])');
    const first = focusable[0]; const last = focusable[focusable.length - 1];
    if (first) first.focus();
    const handler = (e) => {
      if (e.key !== 'Tab') return;
      if (e.shiftKey) { if (document.activeElement === first) { e.preventDefault(); last?.focus(); } }
      else { if (document.activeElement === last) { e.preventDefault(); first?.focus(); } }
    };
    el.addEventListener('keydown', handler);
    return () => el.removeEventListener('keydown', handler);
  }, [isActive, ref]);
};
