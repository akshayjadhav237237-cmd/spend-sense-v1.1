import React, { useState, useMemo, useRef, useCallback, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ChevronLeft, ChevronRight, Search, X, Camera, Trash2, CheckSquare, Square, Download, Pencil } from 'lucide-react';
import { CATEGORIES, formatCurr, getMonthKey, getCurrentMonthKey, getTodayISO, getRelativeDateLabel, parseAmount, generateId } from '../utils.js';
import { BottomSheet, ConfirmDialog } from '../components/GlobalComponents.jsx';

const catEmoji = (name) => CATEGORIES.find(c => c.name === name)?.emoji || '💸';
const catColor = (name) => CATEGORIES.find(c => c.name === name)?.color || '#B2BEC3';

function MonthNav({ viewMonth, setViewMonth }) {
  const label = useMemo(() => new Intl.DateTimeFormat('en-IN',{month:'long',year:'numeric'}).format(new Date(viewMonth+'-01')),[viewMonth]);
  const isCurrentMonth = viewMonth === getCurrentMonthKey();
  const changeMonth = (dir) => {
    const d = new Date(viewMonth+'-01'); d.setMonth(d.getMonth()+dir);
    setViewMonth(d.toISOString().slice(0,7));
  };
  return (
    <div className="flex items-center justify-between mb-3 px-1">
      <button onClick={()=>changeMonth(-1)} aria-label="Previous month" className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-gray-100 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500"><ChevronLeft size={18}/></button>
      <span className="text-sm font-semibold text-gray-800">{label}</span>
      <button onClick={()=>changeMonth(1)} aria-label="Next month" disabled={isCurrentMonth} className={`w-8 h-8 flex items-center justify-center rounded-full active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 ${isCurrentMonth?'opacity-30 pointer-events-none':'hover:bg-gray-100'}`}><ChevronRight size={18}/></button>
    </div>
  );
}

function AddExpenseModal({ isOpen, onClose, onAdd, settings, showToast }) {
  const sym = settings.currency;
  const [amount,setAmount]=useState('');
  const [category,setCategory]=useState('');
  const [desc,setDesc]=useState('');
  const [date,setDate]=useState(getTodayISO());
  const [photo,setPhoto]=useState(null);
  const [amtErr,setAmtErr]=useState(false);
  const [catErr,setCatErr]=useState(false);
  const fileRef = useRef(null);

  const reset = () => { setAmount(''); setCategory(''); setDesc(''); setDate(getTodayISO()); setPhoto(null); setAmtErr(false); setCatErr(false); };
  useEffect(()=>{ if(!isOpen) reset(); },[isOpen]);

  const handlePhoto = (e) => {
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const b64 = ev.target.result;
      try {
        const testData = JSON.stringify({...JSON.parse(localStorage.getItem('ss_expenses')||'[]'), photo: b64});
        if(testData.length > 4*1024*1024) { showToast('Storage limit reached. Cannot save photo.','error'); return; }
      } catch(_){}
      setPhoto(b64);
    };
    reader.readAsDataURL(file);
  };

  const submit = () => {
    try {
      const amt = parseAmount(amount);
      let err = false;
      if(!amt){setAmtErr(true);err=true;} else setAmtErr(false);
      if(!category){setCatErr(true);err=true;} else setCatErr(false);
      if(err) return;
      onAdd({ id:generateId(), amount:amt, category, desc:desc.trim(), date, photo, createdAt:Date.now() });
      onClose();
    } catch(err) {
      console.error('Add expense error:', err);
      showToast?.('Something went wrong. Try again.', 'error');
    }
  };

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Add Expense">
      <div className="space-y-4 px-0">
        {/* Amount */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block" htmlFor="exp-amount">Amount</label>
          <div className={`flex items-center border rounded-xl px-3 gap-2 ${amtErr?'border-red-400 animate-shake':'border-gray-200'} bg-gray-50`}>
            <span className="text-gray-400 text-sm">{sym}</span>
            <input id="exp-amount" type="number" inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);setAmtErr(false);}} autoFocus placeholder="0.00"
              aria-invalid={amtErr} aria-describedby={amtErr?'exp-amt-err':undefined}
              className="flex-1 py-3 bg-transparent outline-none text-sm text-gray-800 focus-visible:ring-0" />
            {amount && <button onClick={()=>setAmount('')} aria-label="Clear amount"><X size={14} className="text-gray-400"/></button>}
          </div>
          {amtErr && <p id="exp-amt-err" role="alert" className="text-xs text-red-500 mt-1">Enter a valid amount</p>}
        </div>
        {/* Category */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">Category {catErr&&<span role="alert" className="text-red-500 ml-1">Required</span>}</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map(c=>(
              <button key={c.name} onClick={()=>{setCategory(c.name);setCatErr(false);}} aria-label={c.name}
                className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm border transition-all active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 ${category===c.name?'text-white border-transparent':'bg-white text-gray-600 border-gray-100'}`}
                style={category===c.name?{background:c.color}:{}}>
                <span>{c.emoji}</span><span>{c.name}</span>
              </button>
            ))}
          </div>
        </div>
        {/* Description */}
        <div>
          <div className="flex justify-between"><label className="text-xs font-medium text-gray-500 mb-1 block" htmlFor="exp-desc">Description</label><span className="text-xs text-gray-400">{desc.length}/60</span></div>
          <input id="exp-desc" type="text" maxLength={60} value={desc} onChange={e=>setDesc(e.target.value)} placeholder="What did you spend on?"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"/>
        </div>
        {/* Date */}
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block" htmlFor="exp-date">Date</label>
          <input id="exp-date" type="date" value={date} max={getTodayISO()} onChange={e=>setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1"/>
        </div>
        {/* Photo */}
        <div className="flex items-center gap-3">
          <button onClick={()=>fileRef.current?.click()} aria-label="Attach receipt photo" className="flex items-center gap-2 text-xs text-indigo-500 font-medium border border-indigo-100 bg-indigo-50 px-3 py-2 rounded-xl active:scale-95 transition-transform">
            <Camera size={14}/> {photo?'Change Photo':'Attach Receipt'}
          </button>
          {photo && <img src={photo} alt="Receipt preview" className="w-10 h-10 rounded-lg object-cover border border-gray-200"/>}
          <input ref={fileRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhoto}/>
        </div>
        <button onClick={submit} className="w-full py-3.5 bg-[#6C63FF] text-white rounded-2xl font-semibold text-sm active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 mb-6">
          Add Expense
        </button>
      </div>
    </BottomSheet>
  );
}

export default function ExpensesView({ settings, expenses, setExpenses, showToast, openEditExpense }) {
  const sym = settings.currency;
  const [viewMonth, setViewMonth] = useState(getCurrentMonthKey());
  const [activeCategory, setActiveCategory] = useState('All');
  const [sortOrder, setSortOrder] = useState('latest');
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showAdd, setShowAdd] = useState(false);
  const [bulkMode, setBulkMode] = useState(false);
  const [selected, setSelected] = useState(new Set());
  const [swipedId, setSwipedId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [viewingReceipt, setViewingReceipt] = useState(null);

  const monthTotal = useMemo(()=>expenses.filter(e=>getMonthKey(e.date)===viewMonth).reduce((s,e)=>s+e.amount,0),[expenses,viewMonth]);
  const monthCount = useMemo(()=>expenses.filter(e=>getMonthKey(e.date)===viewMonth).length,[expenses,viewMonth]);

  const filtered = useMemo(()=>{
    let list = expenses.filter(e=>getMonthKey(e.date)===viewMonth);
    if(activeCategory!=='All') list=list.filter(e=>e.category===activeCategory);
    if(searchQuery) list=list.filter(e=>(e.desc||'').toLowerCase().includes(searchQuery.toLowerCase())||(e.category||'').toLowerCase().includes(searchQuery.toLowerCase()));
    if(sortOrder==='latest') list=[...list].sort((a,b)=>new Date(b.date)-new Date(a.date));
    else if(sortOrder==='oldest') list=[...list].sort((a,b)=>new Date(a.date)-new Date(b.date));
    else if(sortOrder==='highest') list=[...list].sort((a,b)=>b.amount-a.amount);
    else list=[...list].sort((a,b)=>a.amount-b.amount);
    return list;
  },[expenses,viewMonth,activeCategory,searchQuery,sortOrder]);

  const grouped = useMemo(()=>{
    const map = {};
    filtered.forEach(e=>{
      const k=getRelativeDateLabel(e.date);
      if(!map[k]) map[k]=[];
      map[k].push(e);
    });
    return Object.entries(map);
  },[filtered]);

  const addExpense = useCallback((exp)=>{ setExpenses(prev=>[exp,...prev]); showToast('Expense added!','success'); },[setExpenses,showToast]);
  const deleteExpense = useCallback((id)=>{ setExpenses(prev=>prev.filter(e=>e.id!==id)); showToast('Deleted','info'); setDeleteId(null); },[setExpenses,showToast]);
  const bulkDelete = useCallback(()=>{ setExpenses(prev=>prev.filter(e=>!selected.has(e.id))); showToast(`Deleted ${selected.size} items`,'info'); setSelected(new Set()); setBulkMode(false); setBulkDeleteConfirm(false); },[setExpenses,selected,showToast]);

  const toggleSelect = (id) => setSelected(prev=>{ const n=new Set(prev); n.has(id)?n.delete(id):n.add(id); return n; });

  useEffect(()=>{
    if(!swipedId) return;
    const h=()=>setSwipedId(null);
    document.addEventListener('click',h);
    return ()=>document.removeEventListener('click',h);
  },[swipedId]);

  return (
    <div className="px-4 pt-4 pb-32 animate-fade-in">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-gray-900 ss-text">Expenses</h2>
        <div className="flex gap-2">
          <button onClick={()=>{ setBulkMode(b=>!b); setSelected(new Set()); }} aria-label={bulkMode?'Cancel selection':'Select expenses'}
            className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 bg-white text-gray-600 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500">
            {bulkMode?'Cancel':'Select'}
          </button>
          <button onClick={()=>setShowAdd(true)} aria-label="Add expense" className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#6C63FF] text-white active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500">+ Add</button>
        </div>
      </div>

      <MonthNav viewMonth={viewMonth} setViewMonth={setViewMonth}/>

      {/* Banner */}
      <div className="rounded-2xl p-4 mb-3 text-white" style={{background:'linear-gradient(135deg,#FF6B6B,#ee5a24)'}}>
        <p className="text-2xl font-bold">{formatCurr(monthTotal,sym)}</p>
        <p className="text-xs opacity-80 mt-0.5">{monthCount} transaction{monthCount!==1?'s':''}</p>
      </div>

      {/* Category Filter */}
      <div className="flex overflow-x-auto scrollbar-hide gap-2 pb-2 mb-2 snap-x">
        {['All',...CATEGORIES.map(c=>c.name)].map(name=>{
          const cat=CATEGORIES.find(c=>c.name===name);
          return (
            <button key={name} onClick={()=>setActiveCategory(name)} aria-label={`Filter by ${name}`}
              className={`flex items-center gap-1 px-3 py-1.5 rounded-full text-sm whitespace-nowrap snap-start border transition-all duration-200 active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500 ${activeCategory===name?'text-white border-transparent bg-[#6C63FF]':'bg-white text-gray-600 border-gray-100'}`}>
              {cat&&<span>{cat.emoji}</span>}{name}
            </button>
          );
        })}
      </div>

      {/* Sort + Search */}
      <div className="flex gap-2 items-center mb-3">
        <select value={sortOrder} onChange={e=>setSortOrder(e.target.value)} aria-label="Sort order"
          className="flex-1 text-xs border border-gray-200 rounded-xl px-3 py-2 bg-white text-gray-700 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ss-input">
          <option value="latest">Latest First</option>
          <option value="oldest">Oldest First</option>
          <option value="highest">Highest Amount</option>
          <option value="lowest">Lowest Amount</option>
        </select>
        <button onClick={()=>{setShowSearch(s=>!s);setSearchQuery('');}} aria-label="Toggle search"
          className="w-9 h-9 flex items-center justify-center border border-gray-200 rounded-xl bg-white text-gray-500 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500">
          {showSearch?<X size={16}/>:<Search size={16}/>}
        </button>
      </div>
      {showSearch && (
        <input type="search" value={searchQuery} onChange={e=>setSearchQuery(e.target.value)} placeholder="Search expenses..." aria-label="Search expenses"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-sm mb-3 outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 animate-fade-in ss-input"/>
      )}

      {/* List */}
      {filtered.length===0 ? (
        <div className="flex flex-col items-center py-14">
          <span className="text-5xl mb-3">🧾</span>
          <p className="font-medium text-gray-700">{activeCategory!=='All'?`No ${activeCategory} expenses`:'No expenses yet'}</p>
          <p className="text-xs text-gray-400 mt-1">Tap + to add your first expense</p>
        </div>
      ) : grouped.map(([dateLabel,items])=>(
        <div key={dateLabel}>
          <p className="sticky top-0 bg-[#F8F9FF] z-10 py-2 text-xs font-semibold text-gray-400 uppercase tracking-wider ss-section-header">{dateLabel}</p>
          {items.map(exp=>(
            <div key={exp.id} className="relative overflow-x-hidden mb-2">
              <div className="flex w-[125%] transition-transform duration-200"
                style={{transform: swipedId===exp.id&&!bulkMode?'translateX(-20%)':'translateX(0)'}}>
                <div className="w-[80%] bg-white rounded-2xl p-3 flex items-center gap-3 hover:shadow-md transition-shadow cursor-pointer ss-card"
                  onClick={e=>{e.stopPropagation(); if(!bulkMode) setSwipedId(swipedId===exp.id?null:exp.id);}}>
                  {bulkMode && (
                    <button onClick={e=>{e.stopPropagation();toggleSelect(exp.id);}} aria-label={selected.has(exp.id)?'Deselect':'Select'}
                      className="text-indigo-500 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded">
                      {selected.has(exp.id)?<CheckSquare size={18}/>:<Square size={18} className="text-gray-300"/>}
                    </button>
                  )}
                  <div className="w-9 h-9 rounded-xl flex items-center justify-center text-base flex-shrink-0" style={{background:catColor(exp.category)+'22'}}>
                    {catEmoji(exp.category)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{exp.desc||exp.category}</p>
                    <p className="text-xs text-gray-400">{exp.category}</p>
                  </div>
                  <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <p className="text-sm font-semibold text-[#FF6B6B]">-{formatCurr(exp.amount,sym)}</p>
                    <div className="flex items-center gap-1 mt-0.5">
                      {exp.photo && (
                        <button
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); setViewingReceipt(exp.photo); }}
                          aria-label="View receipt"
                          className="flex items-center gap-1.5 px-2 py-1 rounded-xl bg-indigo-50 text-indigo-600 text-[10px] font-bold active:scale-95 transition-transform border border-indigo-100 shadow-sm"
                        >
                          <Camera size={12} /> View Receipt
                        </button>
                      )}
                      <button
                        onClick={(e) => { e.stopPropagation(); openEditExpense?.(exp); }}
                        aria-label="Edit expense"
                        className="w-7 h-7 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center flex-shrink-0 active:scale-95 transition-transform"
                      >
                        <Pencil size={13} />
                      </button>
                    </div>
                  </div>
                </div>
                <button onClick={e=>{e.stopPropagation();setDeleteId(exp.id);}} aria-label="Delete expense"
                  className="w-[20%] bg-red-500 flex items-center justify-center rounded-r-2xl text-white active:scale-95 transition-transform">
                  <Trash2 size={18}/>
                </button>
              </div>
            </div>
          ))}
        </div>
      ))}

      {/* Bulk delete bar */}
      {bulkMode && selected.size>0 && (
        <div className="fixed bottom-20 left-1/2 -translate-x-1/2 w-[calc(100%-2rem)] max-w-[390px] bg-gray-900 text-white rounded-2xl px-4 py-3 flex items-center justify-between z-40 animate-slide-up shadow-xl">
          <span className="text-sm font-medium">{selected.size} selected</span>
          <button onClick={()=>setBulkDeleteConfirm(true)} className="bg-red-500 text-white text-sm font-medium px-4 py-2 rounded-xl active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-white">
            Delete Selected
          </button>
        </div>
      )}

      {/* Photo viewer */}
      {viewingReceipt && createPortal(
        <div
          className="fixed inset-0 z-[999] bg-black/95 flex flex-col items-center justify-center max-w-[430px] mx-auto"
          onClick={() => setViewingReceipt(null)}
        >
          <div
            className="relative w-full px-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-between items-center mb-4">
              <span className="text-white text-sm font-semibold">Receipt</span>
              <button
                onClick={() => setViewingReceipt(null)}
                aria-label="Close receipt viewer"
                className="w-9 h-9 rounded-full bg-white/20 text-white flex items-center justify-center active:scale-95 transition-transform"
              >
                <X size={18} />
              </button>
            </div>
            <img
              src={viewingReceipt}
              alt="Receipt"
              className="w-full max-h-[70vh] object-contain rounded-2xl"
            />
            <button
              onClick={() => {
                const a = document.createElement('a');
                a.href = viewingReceipt;
                a.download = 'receipt.jpg';
                a.click();
              }}
              className="mt-4 w-full py-3 rounded-xl bg-white/20 text-white text-sm font-semibold flex items-center justify-center gap-2 active:scale-95 transition-transform"
            >
              <Download size={16} />
              Save to Device
            </button>
          </div>
        </div>,
        document.body
      )}

      <AddExpenseModal isOpen={showAdd} onClose={()=>setShowAdd(false)} onAdd={addExpense} settings={settings} showToast={showToast}/>
      <ConfirmDialog isOpen={!!deleteId} title="Delete Expense?" message="This action cannot be undone." confirmLabel="Delete" confirmColor="#FF6B6B"
        onConfirm={()=>deleteExpense(deleteId)} onCancel={()=>setDeleteId(null)}/>
      <ConfirmDialog isOpen={bulkDeleteConfirm} title={`Delete ${selected.size} expenses?`} message="This action cannot be undone." confirmLabel="Delete All" confirmColor="#FF6B6B"
        onConfirm={bulkDelete} onCancel={()=>setBulkDeleteConfirm(false)}/>
    </div>
  );
}
