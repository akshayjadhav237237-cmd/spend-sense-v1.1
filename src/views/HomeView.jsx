import React, { useMemo, useState } from 'react';
import { Settings, TriangleAlert } from 'lucide-react';
import { CATEGORIES, formatCurr, getMonthKey, getCurrentMonthKey, getTodayISO, getBudgetPercent, getInitials, getRelativeDateLabel } from '../utils.js';

export default function HomeView({ settings, expenses, lendings, setActiveTab, setShowSettings, showToast }) {
  const sym = settings.currency;
  const mk = getCurrentMonthKey();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good Morning' : hour < 17 ? 'Good Afternoon' : 'Good Evening';

  const monthlyTotal = useMemo(() => expenses.filter(e => getMonthKey(e.date) === mk).reduce((s, e) => s + e.amount, 0), [expenses, mk]);
  const pendingTotal = useMemo(() => lendings.filter(l => l.status === 'pending' || l.status === 'partial').reduce((s, l) => s + (parseFloat(l.amount) || 0), 0), [lendings]);

  const budgetPct = useMemo(() => getBudgetPercent(expenses, settings.budgetLimit), [expenses, settings.budgetLimit]);
  const budgetColor = budgetPct < 70 ? '#51CF66' : budgetPct < 90 ? '#FFD93D' : '#FF6B6B';

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

  // ── Interactive 30-day graph data ──
  const [selectedGraphPoint, setSelectedGraphPoint] = useState(null);

  const graphData = useMemo(() => {
    const days = [];
    for (let i = 29; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const dayExpenses = expenses.filter(e => e.date === iso);
      const dayLendings = lendings.filter(l => l.date === iso);
      const totalExp = dayExpenses.reduce((s, e) => s + e.amount, 0);
      const totalLend = dayLendings.reduce((s, l) => s + (l.amountOriginal || parseFloat(l.amount) || 0), 0);
      days.push({ iso, totalExp, totalLend, dayExpenses, dayLendings });
    }
    return days;
  }, [expenses, lendings]);

  const hasAnyActivity = graphData.some(d => d.totalExp > 0 || d.totalLend > 0);

  const maxVal = useMemo(() => Math.max(...graphData.map(d => Math.max(d.totalExp, d.totalLend)), 1), [graphData]);

  const SVG_W = 340, SVG_H = 120, PAD_L = 36, PAD_R = 8, PAD_T = 12, PAD_B = 20;
  const PLOT_W = SVG_W - PAD_L - PAD_R;
  const PLOT_H = SVG_H - PAD_T - PAD_B;

  const getX = (i) => PAD_L + (i / 29) * PLOT_W;
  const getY = (val) => PAD_T + PLOT_H - (val / maxVal) * PLOT_H;

  const expPoints = graphData.map((d, i) => ({ x: getX(i), y: getY(d.totalExp), ...d, index: i }));
  const lendPoints = graphData.map((d, i) => ({ x: getX(i), y: getY(d.totalLend), ...d, index: i }));

  const toPath = (pts) => pts.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`).join(' ');

  // 5 evenly spaced date labels across 30 days
  const xLabelIndices = [0, 7, 14, 21, 29];
  const formatDateShort = (iso) => {
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`;
  };

  // Y-axis labels (4 grid lines)
  const yGridFractions = [0.25, 0.5, 0.75, 1.0];

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

      {/* Interactive 30-Day Line Graph */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 mb-3 ss-card" onClick={() => setSelectedGraphPoint(null)}>
        <p className="text-sm font-semibold text-gray-700 mb-3 ss-text">Activity — Last 30 Days</p>

        {!hasAnyActivity ? (
          <div className="flex flex-col items-center justify-center h-28 text-gray-300 ss-text-muted">
            <span className="text-3xl mb-2">📈</span>
            <p className="text-xs">No activity yet</p>
          </div>
        ) : (
          <>
            <div className="relative" style={{ touchAction: 'pan-y' }}>
              <svg
                viewBox={`0 0 ${SVG_W} ${SVG_H}`}
                className="w-full"
                style={{ overflow: 'visible' }}
                onClick={e => e.stopPropagation()}
              >
                {/* Y grid lines & labels */}
                {yGridFractions.map(f => {
                  const y = PAD_T + PLOT_H - f * PLOT_H;
                  const val = f * maxVal;
                  return (
                    <g key={f}>
                      <line x1={PAD_L} x2={SVG_W - PAD_R} y1={y} y2={y} stroke="#F3F4F6" strokeWidth="1" />
                      <text x={PAD_L - 4} y={y + 3.5} textAnchor="end" fontSize="7" fill="#9CA3AF">
                        {val >= 1000 ? `${(val / 1000).toFixed(0)}k` : val.toFixed(0)}
                      </text>
                    </g>
                  );
                })}

                {/* Expense line */}
                <path d={toPath(expPoints)} fill="none" stroke="#FF6B6B" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
                {/* Lending line */}
                <path d={toPath(lendPoints)} fill="none" stroke="#4ECDC4" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />

                {/* X axis labels */}
                {xLabelIndices.map(i => (
                  <text key={i} x={getX(i)} y={SVG_H - 4} textAnchor="middle" fontSize="7" fill="#9CA3AF">
                    {formatDateShort(graphData[i].iso)}
                  </text>
                ))}

                {/* Clickable data points — expenses */}
                {expPoints.map((p, i) => (
                  (p.totalExp > 0 || lendPoints[i].totalLend > 0) && (
                    <circle
                      key={`exp-${i}`}
                      cx={p.x} cy={p.y} r="5"
                      fill={selectedGraphPoint?.index === i ? '#FF6B6B' : '#FF6B6B'}
                      stroke="white" strokeWidth="2"
                      style={{ cursor: 'pointer', opacity: p.totalExp > 0 ? 1 : 0 }}
                      onClick={e => { e.stopPropagation(); setSelectedGraphPoint(selectedGraphPoint?.index === i ? null : { ...p, index: i }); }}
                    />
                  )
                ))}

                {/* Clickable data points — lendings */}
                {lendPoints.map((p, i) => (
                  p.totalLend > 0 && (
                    <circle
                      key={`lend-${i}`}
                      cx={p.x} cy={p.y} r="5"
                      fill="#4ECDC4"
                      stroke="white" strokeWidth="2"
                      style={{ cursor: 'pointer' }}
                      onClick={e => { e.stopPropagation(); setSelectedGraphPoint(selectedGraphPoint?.index === i ? null : { ...graphData[i], x: p.x, y: p.y, index: i }); }}
                    />
                  )
                ))}

                {/* Popup on selected point */}
                {selectedGraphPoint && (() => {
                  const pt = selectedGraphPoint;
                  const popupW = 140, popupH = 80;
                  const px = Math.min(Math.max(pt.x - popupW / 2, PAD_L), SVG_W - popupW - 4);
                  const py = Math.max(PAD_T - 4, pt.y - popupH - 10);
                  const dayTxns = [
                    ...pt.dayExpenses.map(e => ({ emoji: CATEGORIES.find(c => c.name === e.category)?.emoji || '💸', desc: e.desc || e.category, amount: e.amount, type: 'exp' })),
                    ...pt.dayLendings.map(l => ({ emoji: '🤝', desc: l.name, amount: l.amountOriginal || parseFloat(l.amount) || 0, type: 'lend' })),
                  ];
                  const calcH = 36 + Math.min(dayTxns.length, 4) * 14 + 4;
                  return (
                    <g onClick={e => e.stopPropagation()}>
                      <rect x={px} y={py} width={popupW} height={calcH} rx="8" fill="white" stroke="#E5E7EB" strokeWidth="1"
                        style={{ filter: 'drop-shadow(0 4px 12px rgba(0,0,0,0.12))' }} />
                      <text x={px + 8} y={py + 14} fontSize="8" fontWeight="600" fill="#374151">{formatDateShort(pt.iso)}</text>
                      {pt.totalExp > 0 && <text x={px + 8} y={py + 24} fontSize="7" fill="#FF6B6B">Exp: {sym}{pt.totalExp.toFixed(0)}</text>}
                      {pt.totalLend > 0 && <text x={px + 8} y={py + 24 + (pt.totalExp > 0 ? 10 : 0)} fontSize="7" fill="#4ECDC4">Lent: {sym}{pt.totalLend.toFixed(0)}</text>}
                      {dayTxns.slice(0, 4).map((t, ti) => (
                        <text key={ti} x={px + 8} y={py + 36 + ti * 13} fontSize="7" fill="#6B7280">
                          {t.emoji} {t.desc.slice(0, 12)} — {sym}{t.amount.toFixed(0)}
                        </text>
                      ))}
                    </g>
                  );
                })()}
              </svg>
            </div>

            {/* Legend */}
            <div className="flex gap-4 mt-2">
              <span className="flex items-center gap-1.5 text-xs text-gray-500 ss-text-muted">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#FF6B6B' }} /> Expenses
              </span>
              <span className="flex items-center gap-1.5 text-xs text-gray-500 ss-text-muted">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: '#4ECDC4' }} /> Lendings
              </span>
            </div>
          </>
        )}
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
