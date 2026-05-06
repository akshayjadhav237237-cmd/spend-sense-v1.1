import React, { useState, useMemo, useCallback } from 'react';
import { TrendingUp, TrendingDown, Minus, Lightbulb } from 'lucide-react';
import { CATEGORIES, formatCurr, getMonthKey, getCurrentMonthKey, getTodayISO, parseAmount, generateId } from '../utils.js';
import { BottomSheet } from '../components/GlobalComponents.jsx';

const GOAL_EMOJIS = ['🎯','🏠','✈️','💻','📱','🎓','🚗','💍','🏋️','🎸','📚','💰'];
const GOAL_COLORS = ['#6C63FF','#FF6B6B','#4ECDC4','#51CF66','#FFD93D','#FF8E53'];

function AddGoalModal({ isOpen, onClose, onAdd, sym }) {
  const [title,setTitle]=useState(''); const [target,setTarget]=useState('');
  const [current,setCurrent]=useState('0'); const [emoji,setEmoji]=useState('🎯');
  const [deadline,setDeadline]=useState(''); const [color,setColor]=useState(GOAL_COLORS[0]);
  const submit=()=>{
    if(!title.trim()||!parseAmount(target)) return;
    onAdd({id:generateId(),title:title.trim(),targetAmount:parseFloat(target),currentAmount:parseFloat(current)||0,emoji,deadline,color,createdAt:Date.now()});
    setTitle('');setTarget('');setCurrent('0');setEmoji('🎯');setDeadline('');setColor(GOAL_COLORS[0]); onClose();
  };
  return(
    <BottomSheet isOpen={isOpen} onClose={onClose} title="New Savings Goal">
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block" htmlFor="goal-title">Goal Title</label>
          <input id="goal-title" value={title} onChange={e=>setTitle(e.target.value)} placeholder="e.g. New Laptop" autoFocus
            className="w-full border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"/>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Icon</p>
          <div className="flex flex-wrap gap-2">{GOAL_EMOJIS.map(e=>(
            <button key={e} onClick={()=>setEmoji(e)} aria-label={`Select ${e}`}
              className={`text-xl w-10 h-10 rounded-xl flex items-center justify-center transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 ${emoji===e?'bg-indigo-100 scale-110 ring-2 ring-indigo-400':'bg-gray-50'}`}>{e}</button>
          ))}</div>
        </div>
        <div className="flex gap-3">
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1 block" htmlFor="goal-target">Target {sym}</label>
            <input id="goal-target" type="number" inputMode="decimal" value={target} onChange={e=>setTarget(e.target.value)} placeholder="10000"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"/>
          </div>
          <div className="flex-1">
            <label className="text-xs font-medium text-gray-500 mb-1 block" htmlFor="goal-current">Saved So Far {sym}</label>
            <input id="goal-current" type="number" inputMode="decimal" value={current} onChange={e=>setCurrent(e.target.value)} placeholder="0"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"/>
          </div>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block" htmlFor="goal-deadline">Target Date</label>
          <input id="goal-deadline" type="date" value={deadline} min={getTodayISO()} onChange={e=>setDeadline(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"/>
        </div>
        <div>
          <p className="text-xs font-medium text-gray-500 mb-2">Color</p>
          <div className="flex gap-2">{GOAL_COLORS.map(c=>(
            <button key={c} onClick={()=>setColor(c)} aria-label={`Color ${c}`}
              className={`w-8 h-8 rounded-full transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-offset-1 focus-visible:ring-indigo-500 ${color===c?'scale-125 ring-2 ring-offset-1':''}`} style={{background:c}}/>
          ))}</div>
        </div>
        <button onClick={submit} className="w-full py-3.5 bg-[#6C63FF] text-white rounded-2xl font-semibold text-sm active:scale-95 transition-transform">Add Goal</button>
      </div>
    </BottomSheet>
  );
}

// ── Shared SVG Line Graph component ──
function InteractiveSVGGraph({
  lines, // [{ key, color, points: [{iso, value, meta}] }]
  title,
  sym,
  xLabelCount = 5,
  emptyMsg = 'No data yet',
}) {
  const [selectedPoint, setSelectedPoint] = useState(null);
  const SVG_W = 340, SVG_H = 130, PAD_L = 38, PAD_R = 8, PAD_T = 14, PAD_B = 22;
  const PLOT_W = SVG_W - PAD_L - PAD_R;
  const PLOT_H = SVG_H - PAD_T - PAD_B;

  const allValues = lines.flatMap(l => l.points.map(p => p.value));
  const maxVal = Math.max(...allValues, 1);
  const n = lines[0]?.points.length || 1;

  const getX = (i) => PAD_L + (n <= 1 ? 0.5 : i / (n - 1)) * PLOT_W;
  const getY = (val) => PAD_T + PLOT_H - (val / maxVal) * PLOT_H;

  const hasData = allValues.some(v => v > 0);

  const xIndices = useMemo(() => {
    if (n <= 1) return [0];
    const step = Math.floor((n - 1) / (xLabelCount - 1));
    return Array.from({ length: xLabelCount }, (_, i) => Math.min(i * step, n - 1));
  }, [n, xLabelCount]);

  const formatDateShort = (iso) => {
    if (!iso) return '';
    const d = new Date(iso + 'T00:00:00');
    return `${d.getDate()} ${d.toLocaleString('en', { month: 'short' })}`;
  };

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 mb-4 ss-card" onClick={() => setSelectedPoint(null)}>
      <p className="text-sm font-semibold text-gray-700 mb-3 ss-text">{title}</p>
      {!hasData ? (
        <div className="flex flex-col items-center justify-center h-24 text-gray-300 ss-text-muted">
          <span className="text-2xl mb-1">📊</span>
          <p className="text-xs">{emptyMsg}</p>
        </div>
      ) : (
        <>
          {/* Fix 6 — wrap SVG in overflow:hidden container */}
          <div style={{ width: '100%', overflowX: 'hidden', position: 'relative' }}>
            <svg
              width="100%"
              viewBox={`0 0 ${SVG_W} ${SVG_H}`}
              preserveAspectRatio="xMidYMid meet"
              style={{ maxWidth: '100%', display: 'block', overflow: 'hidden' }}
              onClick={e => e.stopPropagation()}
            >
            {/* Grid lines */}
            {[0.25, 0.5, 0.75, 1.0].map(f => {
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

            {/* Lines */}
            {lines.map(line => {
              const pathD = line.points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${getX(i).toFixed(1)} ${getY(p.value).toFixed(1)}`).join(' ');
              return <path key={line.key} d={pathD} fill="none" stroke={line.color} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />;
            })}

            {/* X axis labels */}
            {xIndices.map(i => (
              <text key={i} x={getX(i)} y={SVG_H - 5} textAnchor="middle" fontSize="7" fill="#9CA3AF">
                {formatDateShort(lines[0]?.points[i]?.iso || '')}
              </text>
            ))}

            {/* Data point circles */}
            {lines.map(line =>
              line.points.map((p, i) => {
                if (p.value <= 0) return null;
                const cx = getX(i), cy = getY(p.value);
                const isSelected = selectedPoint?.lineKey === line.key && selectedPoint?.index === i;
                return (
                  <circle key={`${line.key}-${i}`} cx={cx} cy={cy} r={isSelected ? 6 : 5}
                    fill={line.color} stroke="white" strokeWidth="2"
                    style={{ cursor: 'pointer' }}
                    onClick={e => {
                      e.stopPropagation();
                      if (isSelected) { setSelectedPoint(null); return; }
                      setSelectedPoint({ lineKey: line.key, index: i, cx, cy, point: p, color: line.color, lineLabel: line.label });
                    }}
                  />
                );
              })
            )}
            </svg>

            {/* Fix 7 — popup as absolute HTML div (outside SVG) */}
            {selectedPoint && (() => {
              const { cx, cy, point, color, lineLabel } = selectedPoint;
              const pctX = cx / SVG_W;
              const pctY = cy / SVG_H;
              return (
                <div
                  onClick={e => e.stopPropagation()}
                  style={{
                    position: 'absolute',
                    top: `calc(${pctY * 100}% - 75px)`,
                    left: `clamp(8px, calc(${pctX * 100}% - 100px), calc(100% - 208px))`,
                    zIndex: 20,
                    width: '200px',
                    maxWidth: '200px',
                  }}
                  className="bg-white ss-card rounded-xl p-3 shadow-lg border border-gray-100"
                >
                  <p className="text-[10px] text-gray-400 mb-0.5">{formatDateShort(point.iso)}</p>
                  <p className="text-xs font-medium mb-0.5" style={{ color }}>{lineLabel}</p>
                  <p className="text-sm font-bold text-gray-800">{sym}{point.value.toFixed(0)}</p>
                  {point.meta && <p className="text-[10px] text-gray-400 mt-0.5">{point.meta}</p>}
                </div>
              );
            })()}
          </div>

          {/* Legend */}
          <div className="flex flex-wrap gap-3 mt-1">
            {lines.map(line => (
              <span key={line.key} className="flex items-center gap-1.5 text-xs text-gray-500 ss-text-muted">
                <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ background: line.color }} />
                {line.label}
              </span>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

export default function SummaryView({ settings, expenses, lendings, savingsGoals, setSavingsGoals, showToast }) {
  const sym = settings.currency;
  const mk = getCurrentMonthKey();
  const prevMk = useMemo(()=>{ const d=new Date(mk+'-01'); d.setMonth(d.getMonth()-1); return d.toISOString().slice(0,7); },[mk]);

  const monthExp = useMemo(()=>expenses.filter(e=>getMonthKey(e.date)===mk),[expenses,mk]);
  const prevExp = useMemo(()=>expenses.filter(e=>getMonthKey(e.date)===prevMk),[expenses,prevMk]);
  const monthTotal = useMemo(()=>monthExp.reduce((s,e)=>s+e.amount,0),[monthExp]);
  const prevTotal = useMemo(()=>prevExp.reduce((s,e)=>s+e.amount,0),[prevExp]);
  const totalLentAll = useMemo(()=>lendings.reduce((s,l)=>s+(l.amountOriginal||parseFloat(l.amount)||0),0),[lendings]);
  const recovered = useMemo(()=>lendings.filter(l=>l.status==='returned').reduce((s,l)=>s+(l.amountOriginal||parseFloat(l.amount)||0),0),[lendings]);
  const stillOwed = useMemo(()=>lendings.filter(l=>l.status==='pending'||l.status==='partial').reduce((s,l)=>s+(parseFloat(l.amount)||0),0),[lendings]);

  const topCat = useMemo(()=>{
    const m={};
    monthExp.forEach(e=>{ m[e.category]=(m[e.category]||0)+e.amount; });
    const cats = CATEGORIES.map(c=>({...c,total:m[c.name]||0})).filter(c=>c.total>0).sort((a,b)=>b.total-a.total);
    return cats[0];
  },[monthExp]);

  const pctChange = prevTotal>0?Math.round(((monthTotal-prevTotal)/prevTotal)*100):null;
  const pendingCount = lendings.filter(l=>l.status==='pending'||l.status==='partial').length;

  // ── Category line graph — current month, per day per category ──
  const categoryGraphLines = useMemo(() => {
    // Get days of current month
    const now = new Date();
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const days = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth(), i + 1);
      return d.toISOString().slice(0, 10);
    });
    const catMap = {};
    monthExp.forEach(e => {
      if (!catMap[e.category]) catMap[e.category] = {};
      catMap[e.category][e.date] = (catMap[e.category][e.date] || 0) + e.amount;
    });
    const activeCats = CATEGORIES.filter(c => catMap[c.name]);
    return activeCats.slice(0, 5).map(cat => ({
      key: cat.name,
      label: `${cat.emoji} ${cat.name}`,
      color: cat.color,
      points: days.map(iso => ({ iso, value: catMap[cat.name]?.[iso] || 0 })),
    }));
  }, [monthExp]);

  // ── 90-day daily spend graph ──
  const ninetyDayLines = useMemo(() => {
    const days = [];
    for (let i = 89; i >= 0; i--) {
      const d = new Date(); d.setDate(d.getDate() - i);
      const iso = d.toISOString().slice(0, 10);
      const total = expenses.filter(e => e.date === iso).reduce((s, e) => s + e.amount, 0);
      days.push({ iso, value: total });
    }
    return [{ key: 'spend', label: 'Daily Spend', color: '#6C63FF', points: days }];
  }, [expenses]);

  const [showGoalModal,setShowGoalModal]=useState(false);
  const [addFundsGoal,setAddFundsGoal]=useState(null);
  const [addFundsAmt,setAddFundsAmt]=useState('');

  const TrendIcon=({cur,prev})=>{
    if(prev===0) return <span className="flex items-center gap-0.5 text-gray-400 text-xs"><Minus size={12}/>New</span>;
    const p=Math.round(((cur-prev)/prev)*100);
    if(cur>prev) return <span className="flex items-center gap-0.5 text-red-400 text-xs"><TrendingUp size={12}/>+{p}%</span>;
    return <span className="flex items-center gap-0.5 text-green-500 text-xs"><TrendingDown size={12}/>{p}%</span>;
  };

  const STAT_CARDS=[
    {label:'Total Spent',value:monthTotal,color:'#FF6B6B',trend:<TrendIcon cur={monthTotal} prev={prevTotal}/>},
    {label:'Total Lent',value:totalLentAll,color:'#4ECDC4'},
    {label:'Recovered',value:recovered,color:'#51CF66'},
    {label:'Still Owed',value:stillOwed,color:'#FFD93D'},
  ];

  return(
    <div className="px-4 pt-4 animate-fade-in">
      <h2 className="text-lg font-bold text-gray-900 mb-4 ss-text">Summary</h2>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 gap-3 mb-4">
        {STAT_CARDS.map(c=>(
          <div key={c.label} className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 ss-card">
            <p className="text-xs text-gray-400 mb-1 ss-text-muted">{c.label}</p>
            <p className="text-lg font-bold" style={{color:c.color}}>{formatCurr(c.value,sym)}</p>
            {c.trend&&<div className="mt-1">{c.trend}</div>}
          </div>
        ))}
      </div>

      {/* UPDATE 2 — Category interactive SVG line graph */}
      <InteractiveSVGGraph
        lines={categoryGraphLines}
        title="Spending by Category"
        sym={sym}
        xLabelCount={5}
        emptyMsg="No spending data this month"
      />

      {/* UPDATE 2 — 90-day interactive SVG line graph */}
      <InteractiveSVGGraph
        lines={ninetyDayLines}
        title="Last 90 Days"
        sym={sym}
        xLabelCount={6}
        emptyMsg="No activity in last 90 days"
      />

      {/* Insights */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 mb-4 ss-card">
        <div className="flex items-center gap-2 mb-3">
          <Lightbulb size={16} className="text-yellow-500"/>
          <p className="text-sm font-semibold text-gray-700 ss-text">Insights</p>
        </div>
        {monthExp.length===0?(
          <p className="text-sm text-gray-400">Add expenses to see personalized insights</p>
        ):(
          <div className="space-y-2">
            {topCat&&<div className="bg-indigo-50 rounded-xl p-3 text-sm text-indigo-800 border border-indigo-100">Your biggest expense this month is <strong>{topCat.name}</strong> at {formatCurr(topCat.total,sym)}</div>}
            {pctChange!==null&&<div className={`rounded-xl p-3 text-sm border ${pctChange>0?'bg-red-50 text-red-800 border-red-100':'bg-green-50 text-green-800 border-green-100'}`}>You spent <strong>{Math.abs(pctChange)}% {pctChange>0?'more':'less'}</strong> than last month</div>}
            {pendingCount>0&&<div className="bg-yellow-50 rounded-xl p-3 text-sm text-yellow-800 border border-yellow-100">You have <strong>{pendingCount}</strong> pending {pendingCount===1?'loan':'loans'} totaling {formatCurr(stillOwed,sym)}</div>}
          </div>
        )}
      </div>

      {/* Savings Goals */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 ss-card">
        <div className="flex justify-between items-center mb-3">
          <p className="text-sm font-semibold text-gray-700 ss-text">Savings Goals</p>
          <button onClick={()=>setShowGoalModal(true)} aria-label="Add savings goal" className="w-8 h-8 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-lg font-medium active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-indigo-500">+</button>
        </div>
        {savingsGoals.length===0?(
          <div className="flex flex-col items-center py-8"><span className="text-4xl mb-2">🎯</span><p className="text-sm text-gray-400">No savings goals yet</p><p className="text-xs text-gray-300 mt-1">Set a goal and start saving!</p></div>
        ):savingsGoals.map(g=>{
          const pct=Math.min((g.currentAmount/g.targetAmount)*100,100);
          const reached=g.currentAmount>=g.targetAmount;
          const daysLeft=g.deadline?Math.ceil((new Date(g.deadline)-Date.now())/86400000):null;
          return(
            <div key={g.id} className="mb-4 last:mb-0">
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <span className="text-xl">{g.emoji}</span>
                  <p className="text-sm font-medium text-gray-800">{g.title}</p>
                  {reached&&<span className="text-xs animate-pulse-subtle">🎉</span>}
                </div>
                <p className="text-xs text-gray-500">{daysLeft!=null?daysLeft>0?`${daysLeft}d left`:'Deadline passed':''}</p>
              </div>
              <div className="flex justify-between text-xs text-gray-500 mb-1">
                <span>{formatCurr(g.currentAmount,sym)}</span><span>{formatCurr(g.targetAmount,sym)}</span>
              </div>
              <div className="w-full bg-gray-100 rounded-full h-2 mb-2 overflow-hidden">
                <div className="h-2 rounded-full transition-all duration-700" style={{width:pct+'%',background:g.color}}/>
              </div>
              {!reached&&(
                <button onClick={()=>{setAddFundsGoal(g);setAddFundsAmt('');}} aria-label={`Add funds to ${g.title}`}
                  className="text-xs text-indigo-500 font-medium border border-indigo-100 bg-indigo-50 px-3 py-1.5 rounded-xl active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-indigo-500">
                  + Add Funds
                </button>
              )}
              {reached&&<p className="text-xs font-semibold text-green-500">🎉 Goal Reached!</p>}
            </div>
          );
        })}
      </div>

      <AddGoalModal isOpen={showGoalModal} onClose={()=>setShowGoalModal(false)} sym={sym} onAdd={(g)=>{setSavingsGoals(p=>[...p,g]);showToast('Goal added!','success');}}/>

      {addFundsGoal&&(
        <BottomSheet isOpen={!!addFundsGoal} onClose={()=>setAddFundsGoal(null)} title={`Add Funds — ${addFundsGoal.title}`}>
          <div className="space-y-4">
            <input type="number" inputMode="decimal" value={addFundsAmt} onChange={e=>setAddFundsAmt(e.target.value)} autoFocus placeholder="Amount to add" aria-label="Amount to add"
              className="w-full border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"/>
            <button onClick={()=>{
              const v=parseAmount(addFundsAmt);
              if(!v)return;
              setSavingsGoals(p=>p.map(g=>g.id===addFundsGoal.id?{...g,currentAmount:Math.min(g.currentAmount+v,g.targetAmount)}:g));
              showToast('Funds added!','success'); setAddFundsGoal(null);
            }} className="w-full py-3.5 rounded-2xl font-semibold text-sm text-white active:scale-95 transition-transform" style={{background:addFundsGoal.color}}>Add Funds</button>
          </div>
        </BottomSheet>
      )}
    </div>
  );
}
