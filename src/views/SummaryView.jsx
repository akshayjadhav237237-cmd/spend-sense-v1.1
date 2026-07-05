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

  const catTotals = useMemo(()=>{
    const m={};
    monthExp.forEach(e=>{ m[e.category]=(m[e.category]||0)+e.amount; });
    return CATEGORIES.map(c=>({...c,total:m[c.name]||0})).filter(c=>c.total>0);
  },[monthExp]);
  const maxCat = useMemo(()=>Math.max(...catTotals.map(c=>c.total),1),[catTotals]);

  const last6Months = useMemo(()=>{
    const res=[];
    for(let i=5;i>=0;i--){
      const d=new Date(mk+'-01'); d.setMonth(d.getMonth()-i);
      const key=d.toISOString().slice(0,7);
      const label=new Intl.DateTimeFormat('en-IN',{month:'short'}).format(d);
      const total=expenses.filter(e=>getMonthKey(e.date)===key).reduce((s,e)=>s+e.amount,0);
      res.push({key,label,total});
    }
    return res;
  },[expenses,mk]);

  const maxMonthly = useMemo(()=>Math.max(...last6Months.map(m=>m.total),1),[last6Months]);
  const SVG_W=300, SVG_H=80;
  const points = last6Months.map((m,i)=>{
    const xFraction = last6Months.length > 1 ? i/(last6Months.length-1) : 0.5;
    return {
      x: xFraction*(SVG_W-20)+10,
      y: SVG_H-10-((m.total/maxMonthly)*(SVG_H-20)),
      total:m.total, label:m.label
    };
  });
  const polyline = points.map(p=>`${p.x},${p.y}`).join(' ');

  const topCat = catTotals.sort((a,b)=>b.total-a.total)[0];
  const pctChange = prevTotal>0?Math.round(((monthTotal-prevTotal)/prevTotal)*100):null;
  const pendingCount = lendings.filter(l=>l.status==='pending'||l.status==='partial').length;

  const [showGoalModal,setShowGoalModal]=useState(false);
  const [addFundsGoal,setAddFundsGoal]=useState(null);
  const [addFundsAmt,setAddFundsAmt]=useState('');

  const TrendIcon=({cur,prev})=>{
    if(prev===0) return <span className="flex items-center gap-0.5 text-gray-400 text-xs"><Minus size={12}/> New</span>;
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
    <div className="px-4 pt-4 pb-32 animate-fade-in">
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

      {/* Category Bar Chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 mb-4 ss-card">
        <div className="flex justify-between items-center mb-3">
          <span className="text-sm font-semibold text-gray-700 ss-text">Spending by Category</span>
          <span className="text-xs text-gray-400 ss-text-muted">{new Intl.DateTimeFormat('en-IN',{month:'short',year:'numeric'}).format(new Date(mk+'-01'))}</span>
        </div>
        {catTotals.length===0?(
          <div className="flex flex-col items-center py-8"><span className="text-3xl mb-2">📊</span><p className="text-sm text-gray-400">No spending data</p></div>
        ):(
          <>
            <div className="flex items-end gap-1 h-32 px-1">
              {catTotals.map(c=>(
                <div key={c.name} className="flex-1 flex flex-col items-center gap-0.5 group">
                  <div title={`${c.name}: ${formatCurr(c.total,sym)}`} className="w-full rounded-t-md transition-all duration-700 cursor-pointer"
                    style={{height:`${(c.total/maxCat)*100}%`,minHeight:'4px',background:c.color}}/>
                  <span className="text-[10px]">{c.emoji}</span>
                </div>
              ))}
            </div>
            <div className="border-t border-gray-100 mt-2"/>
          </>
        )}
      </div>

      {/* 6-Month Line Chart */}
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 mb-4 ss-card">
        <p className="text-sm font-semibold text-gray-700 mb-3 ss-text">6-Month Trend</p>
        <svg viewBox={`0 0 ${SVG_W} ${SVG_H}`} className="w-full" role="img" aria-label="6 month spending trend">
          {[0.25,0.5,0.75,1].map(f=>(
            <line key={f} x1="10" x2={SVG_W-10} y1={SVG_H-10-f*(SVG_H-20)} y2={SVG_H-10-f*(SVG_H-20)} stroke="#F3F4F6" strokeWidth="1"/>
          ))}
          <polyline points={polyline} fill="none" stroke="#6C63FF" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round"/>
          {points.map((p,i)=>(
            <circle key={i} cx={p.x} cy={p.y} r="4" fill="#6C63FF" stroke="white" strokeWidth="2">
              <title>{p.label}: {formatCurr(p.total,sym)}</title>
            </circle>
          ))}
        </svg>
        <div className="flex gap-0.5 mt-1">
          {last6Months.map(m=>(
            <div key={m.key} className="flex-1 text-center text-[10px] text-gray-400">{m.label}</div>
          ))}
        </div>
      </div>

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
