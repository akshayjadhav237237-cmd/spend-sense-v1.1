import React, { useMemo } from 'react';
import { Settings, TriangleAlert, TrendingUp } from 'lucide-react';
import { CATEGORIES, formatCurr, getMonthKey, getCurrentMonthKey, getTodayISO, getBudgetPercent, getInitials, getRelativeDateLabel } from '../utils.js';

const DAY_LABELS = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

export default function HomeView({ settings, expenses, lendings, setActiveTab, setShowSettings, showToast }) {
  const sym = settings.currency;
  const mk = getCurrentMonthKey();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const monthlyTotal = useMemo(() => expenses.filter(e => getMonthKey(e.date) === mk).reduce((s, e) => s + e.amount, 0), [expenses, mk]);
  const pendingTotal = useMemo(() => lendings.filter(l => l.status === 'pending' || l.status === 'partial').reduce((s, l) => s + (parseFloat(l.amount) || 0), 0), [lendings]);

  const budgetPct = useMemo(() => getBudgetPercent(expenses, settings.budgetLimit), [expenses, settings.budgetLimit]);
  const budgetColor = budgetPct < 70 ? '#51CF66' : budgetPct < 90 ? '#FFD93D' : '#FF6B6B';

  const sparklineData = useMemo(() => {
    const days = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const total = expenses.filter(e => e.date === iso).reduce((s, e) => s + e.amount, 0);
      days.push({ label: DAY_LABELS[d.getDay()], iso, total, isToday: iso === getTodayISO() });
    }
    return days;
  }, [expenses]);

  const sparkMax = useMemo(() => Math.max(...sparklineData.map(d => d.total), 1), [sparklineData]);
  const weekTotal = useMemo(() => sparklineData.reduce((s, d) => s + d.total, 0), [sparklineData]);

  const streak = useMemo(() => {
    let count = 0;
    const today = new Date(); today.setHours(0,0,0,0);
    for (let i = 0; i < 365; i++) {
      const d = new Date(today); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      if (expenses.some(e => e.date === iso)) count++;
      else break;
    }
    return count;
  }, [expenses]);

  const recentActivity = useMemo(() => {
    const merged = [
      ...expenses.map(e => ({ ...e, _type: 'expense' })),
      ...lendings.map(l => ({ ...l, _type: 'lend' })),
    ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
    return merged;
  }, [expenses, lendings]);

  const catEmoji = (name) => CATEGORIES.find(c => c.name === name)?.emoji || '💸';

  return (
    <div className="px-4 pt-4 pb-32 animate-fade-in">
      {/* Header */}
      <div className="flex justify-between items-start mb-4">
        <div>
          <h1 className="text-xl font-bold text-gray-900 ss-text">{greeting}, {settings.name}! 👋</h1>
          <p className="text-xs text-gray-400 mt-0.5 ss-text-muted">Track smart. Spend wise.</p>
        </div>
        <div className="flex items-center gap-2">
          {streak > 0 && (
            <span className={`flex items-center gap-1 bg-orange-50 text-orange-500 rounded-full px-2.5 py-1 text-xs font-semibold ${streak >= 7 ? 'border border-yellow-400' : ''}`}>
              {streak >= 7 ? '🏆' : '🔥'} {streak >= 2 ? `${streak}d streak` : 'Start streak!'}
            </span>
          )}
          <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center text-xs font-bold">
            {getInitials(settings.name)}
          </div>
          <button onClick={() => setShowSettings(true)} aria-label="Open settings" className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-gray-100 text-gray-500 transition-colors focus-visible:ring-2 focus-visible:ring-indigo-500">
            <Settings size={18} />
          </button>
        </div>
      </div>

      {/* Budget Bar */}
      {settings.budgetLimit > 0 && (
        <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 mb-3 ss-card">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs font-medium text-gray-500 ss-text-muted">Monthly Budget</span>
            {budgetPct >= 100 && <span className="flex items-center gap-1 text-xs text-red-500 font-medium"><TriangleAlert size={12} /> Over budget!</span>}
          </div>
          <div className="flex justify-between text-xs text-gray-700 mb-1.5">
            <span className="font-semibold">{formatCurr(monthlyTotal, sym)}</span>
            <span className="text-gray-400">of {formatCurr(settings.budgetLimit, sym)}</span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-2.5 overflow-hidden">
            <div className="h-2.5 rounded-full transition-all duration-700" style={{ width: budgetPct + '%', background: budgetColor }} />
          </div>
        </div>
      )}

      {/* Stats Row */}
      <div className="flex gap-3 mb-3">
        <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-50 ss-card">
          <p className="text-xs text-gray-400 mb-1 ss-text-muted">Spent This Month</p>
          <p className="text-lg font-bold" style={{ color: '#FF6B6B' }}>{formatCurr(monthlyTotal, sym)}</p>
        </div>
        <div className="flex-1 bg-white rounded-2xl p-4 shadow-sm border border-gray-50 ss-card">
          <p className="text-xs text-gray-400 mb-1 ss-text-muted">Total Owed</p>
          <p className="text-lg font-bold" style={{ color: '#4ECDC4' }}>{formatCurr(pendingTotal, sym)}</p>
        </div>
      </div>

      {/* Sparkline */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 mb-3 ss-card">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-gray-700 ss-text">This Week</span>
          <span className="text-xs font-bold text-[#6C63FF]">{formatCurr(weekTotal, sym)}</span>
        </div>
        <div className="flex items-end gap-0.5 h-12">
          {sparklineData.map((d) => (
            <div key={d.iso} className="flex-1 flex flex-col items-center gap-1">
              <div className="w-full rounded-t-md transition-all duration-700"
                style={{ height: `${(d.total / sparkMax) * 100}%`, minHeight: d.total > 0 ? '4px' : '2px', background: d.isToday ? '#6C63FF' : '#C7D2FE' }} />
            </div>
          ))}
        </div>
        <div className="flex gap-0.5 mt-1">
          {sparklineData.map((d) => (
            <div key={d.iso} className="flex-1 text-center text-[10px] text-gray-400">{d.label}</div>
          ))}
        </div>
      </div>

      {/* Activity Feed */}
      <div className="bg-white rounded-2xl shadow-sm border border-gray-50 ss-card">
        <div className="flex justify-between items-center px-4 pt-4 pb-2">
          <span className="text-sm font-semibold text-gray-700 ss-text">Recent Activity</span>
          <button onClick={() => setActiveTab('expenses')} className="text-xs text-[#6C63FF] font-medium focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">See All</button>
        </div>
        {recentActivity.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 px-4">
            <span className="text-5xl mb-3">🧾</span>
            <p className="font-medium text-gray-700 text-sm">No activity yet</p>
            <p className="text-xs text-gray-400 mt-1 mb-3">Add your first expense to get started</p>
            <button onClick={() => setActiveTab('expenses')} className="bg-[#6C63FF] text-white text-xs font-medium px-4 py-2 rounded-full active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-indigo-500">
              Add Expense
            </button>
          </div>
        ) : (
          <div className="px-4 pb-4">
            {recentActivity.map((item) => (
              <div key={item.id} className="flex items-center gap-3 py-3 border-b border-gray-50 last:border-0">
                <div className="w-10 h-10 rounded-xl bg-gray-50 flex items-center justify-center text-lg flex-shrink-0">
                  {item._type === 'expense' ? catEmoji(item.category) : '🤝'}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate ss-text">{item._type === 'expense' ? (item.desc || item.category) : item.name}</p>
                  <p className="text-xs text-gray-400 ss-text-muted">{item._type === 'expense' ? item.category : 'Lent to'} · {getRelativeDateLabel(item.date)}</p>
                </div>
                <span className={`text-sm font-semibold ${item._type === 'expense' ? 'text-[#FF6B6B]' : 'text-[#4ECDC4]'}`}>
                  {item._type === 'expense' ? '-' : '+'}{formatCurr(item.amount, sym)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
