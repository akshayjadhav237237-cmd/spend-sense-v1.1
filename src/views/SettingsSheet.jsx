import React, { useState, useCallback } from 'react';
import { Sun, Moon, Download, Upload, Trash2 } from 'lucide-react';
import { CATEGORIES, formatCurr, getTodayISO, parseAmount, generateId } from '../utils.js';
import { BottomSheet, ConfirmDialog } from '../components/GlobalComponents.jsx';
import { supabase } from '../supabaseClient.js';

const FREQ_LABELS = { daily:'Daily', weekly:'Weekly', monthly:'Monthly' };

function nextDueDate(freq, from) {
  const d = new Date(from + 'T00:00:00');
  if(freq==='daily') d.setDate(d.getDate()+1);
  else if(freq==='weekly') d.setDate(d.getDate()+7);
  else d.setMonth(d.getMonth()+1);
  return d.toISOString().slice(0,10);
}

export default function SettingsSheet({ isOpen, onClose, settings, setSettings, expenses, lendings, savingsGoals, recurringExpenses, setRecurringExpenses, setExpenses, setLendings, setSavingsGoals, showToast }) {
  const [clearConfirm, setClearConfirm] = useState(false);
  const [showRecurring, setShowRecurring] = useState(false);
  const [recForm, setRecForm] = useState({ amount:'', category:'Food', desc:'', frequency:'monthly', nextDue: getTodayISO(), active:true });

  const updateSetting = useCallback((key, val) => setSettings(p => ({ ...p, [key]: val })), [setSettings]);

  const exportData = () => {
    const blob = new Blob([JSON.stringify({ settings, expenses, lendings, savingsGoals, recurringExpenses, exportedAt: new Date().toISOString() }, null, 2)], { type: 'application/json' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = `spendsense-backup-${getTodayISO()}.json`; a.click();
    showToast('Data exported!', 'success');
  };

  const importData = (e) => {
    const file = e.target.files?.[0]; if(!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        // Strip BOM if present (some editors add it to JSON files)
        const raw = ev.target.result.replace(/^\uFEFF/, '');
        let data;
        try {
          data = JSON.parse(raw);
        } catch(_) {
          showToast('File is not valid JSON', 'error');
          e.target.value = '';
          return;
        }
        if(typeof data !== 'object' || data === null) {
          showToast('Invalid file format', 'error');
          e.target.value = '';
          return;
        }
        if(!Array.isArray(data.expenses) || !Array.isArray(data.lendings)) {
          showToast('File missing expenses or lendings — export from SpendSense first', 'error');
          e.target.value = '';
          return;
        }
        const expMap = new Map([...expenses, ...(data.expenses||[])].map(x => [x.id, x]));
        const lendMap = new Map([...lendings, ...(data.lendings||[])].map(x => [x.id, x]));
        setExpenses([...expMap.values()]);
        setLendings([...lendMap.values()]);
        if(data.savingsGoals?.length) setSavingsGoals(prev => {
          const m = new Map([...prev, ...data.savingsGoals].map(x => [x.id, x]));
          return [...m.values()];
        });
        showToast(`Imported ${data.expenses.length} expenses and ${data.lendings.length} lendings!`, 'success');
      } catch(err) {
        console.error('SpendSense import error:', err);
        showToast('Import failed — see console for details', 'error');
      }
      e.target.value = '';
    };
    reader.onerror = () => {
      showToast('Could not read the file', 'error');
      e.target.value = '';
    };
    reader.readAsText(file, 'UTF-8');
  };

  const addRecurring = () => {
    const amt = parseAmount(recForm.amount); if(!amt) return;
    const item = { ...recForm, id: generateId(), amount: amt };
    setRecurringExpenses(p => [...p, item]);
    setRecForm({ amount:'', category:'Food', desc:'', frequency:'monthly', nextDue: getTodayISO(), active:true });
    showToast('Recurring expense added!', 'success');
  };

  const today = getTodayISO();
  const daysUntil = (dateStr) => Math.ceil((new Date(dateStr) - new Date(today)) / 86400000);

  return (
    <BottomSheet isOpen={isOpen} onClose={onClose} title="Settings">
      <div className="space-y-6 px-0 pb-4">
        {/* Profile */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Profile</p>
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block" htmlFor="s-name">Your Name</label>
              <input id="s-name" value={settings.name} onChange={e=>updateSetting('name',e.target.value)} placeholder="Your name"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ss-input"/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block" htmlFor="s-currency">Currency Symbol</label>
              <input id="s-currency" value={settings.currency} onChange={e=>updateSetting('currency',e.target.value.slice(0,3))} maxLength={3} placeholder="₹"
                className="w-full border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ss-input"/>
            </div>
          </div>
        </section>

        {/* Budget */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Budget</p>
          <label className="text-xs font-medium text-gray-500 mb-1 block" htmlFor="s-budget">Monthly Budget Limit</label>
          <div className="flex items-center border border-gray-200 rounded-xl px-3 gap-2 bg-gray-50">
            <span className="text-gray-400 text-sm">{settings.currency}</span>
            <input id="s-budget" type="number" inputMode="decimal" value={settings.budgetLimit||''} onChange={e=>updateSetting('budgetLimit',parseFloat(e.target.value)||0)} placeholder="0 = No limit"
              className="flex-1 py-3 bg-transparent outline-none text-sm focus-visible:ring-0"/>
          </div>
          <p className="text-xs text-gray-400 mt-1">Set a limit to track budget progress on the home screen</p>
        </section>

        {/* Theme */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Appearance</p>
          <div className="flex gap-2">
            <button onClick={()=>updateSetting('theme','light')} aria-label="Light theme"
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 ${settings.theme==='light'?'bg-indigo-50 border-indigo-200 text-indigo-700':'bg-white border-gray-200 text-gray-500'}`}>
              <Sun size={16}/> Light
            </button>
            <button onClick={()=>updateSetting('theme','dark')} aria-label="Dark theme"
              className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border text-sm font-medium active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-indigo-500 ${settings.theme==='dark'?'bg-gray-800 border-gray-700 text-white':'bg-white border-gray-200 text-gray-500'}`}>
              <Moon size={16}/> Dark
            </button>
          </div>
        </section>

        {/* Recurring */}
        <section>
          <div className="flex justify-between items-center mb-3">
            <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Recurring Expenses</p>
            <button onClick={()=>setShowRecurring(s=>!s)} className="text-xs text-indigo-500 font-medium focus-visible:ring-2 focus-visible:ring-indigo-500 rounded px-1">{showRecurring?'Hide':'+ Add'}</button>
          </div>
          {showRecurring && (
            <div className="space-y-3 mb-3 p-3 bg-gray-50 rounded-2xl border border-gray-100">
              <input type="number" inputMode="decimal" value={recForm.amount} onChange={e=>setRecForm(f=>({...f,amount:e.target.value}))} placeholder={`Amount (${settings.currency})`} aria-label="Recurring amount"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"/>
              <input type="text" value={recForm.desc} onChange={e=>setRecForm(f=>({...f,desc:e.target.value}))} placeholder="Description (e.g. Netflix)" aria-label="Description"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"/>
              <div className="flex gap-2">
                <select value={recForm.category} onChange={e=>setRecForm(f=>({...f,category:e.target.value}))} aria-label="Category"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  {CATEGORIES.map(c=><option key={c.name} value={c.name}>{c.emoji} {c.name}</option>)}
                </select>
                <select value={recForm.frequency} onChange={e=>setRecForm(f=>({...f,frequency:e.target.value}))} aria-label="Frequency"
                  className="flex-1 border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500">
                  {Object.entries(FREQ_LABELS).map(([v,l])=><option key={v} value={v}>{l}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs text-gray-400 mb-1 block" htmlFor="rec-due">Next Due Date</label>
                <input id="rec-due" type="date" value={recForm.nextDue} min={today} onChange={e=>setRecForm(f=>({...f,nextDue:e.target.value}))}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 bg-white text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"/>
              </div>
              <button onClick={addRecurring} className="w-full py-2.5 bg-[#6C63FF] text-white rounded-xl text-sm font-semibold active:scale-95 transition-transform">Add Recurring</button>
            </div>
          )}
          {recurringExpenses.length===0 && !showRecurring && <p className="text-xs text-gray-400">No recurring expenses set up</p>}
          {recurringExpenses.map(r=>{
            const d = daysUntil(r.nextDue);
            return (
              <div key={r.id} className="flex items-center gap-3 py-2 border-b border-gray-50 last:border-0">
                <span className="text-base">{CATEGORIES.find(c=>c.name===r.category)?.emoji||'💸'}</span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-800 truncate">{r.desc||r.category}</p>
                  <p className="text-xs text-gray-400">{formatCurr(r.amount,settings.currency)} · {FREQ_LABELS[r.frequency]} · {d<=0?'Due today':`Due in ${d}d`}</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only" checked={r.active} onChange={()=>setRecurringExpenses(p=>p.map(x=>x.id===r.id?{...x,active:!x.active}:x))} aria-label={`Toggle ${r.desc}`}/>
                  <div className={`w-9 h-5 rounded-full transition-colors ${r.active?'bg-indigo-500':'bg-gray-200'}`}>
                    <div className={`w-4 h-4 bg-white rounded-full shadow m-0.5 transition-transform ${r.active?'translate-x-4':'translate-x-0'}`}/>
                  </div>
                </label>
                <button onClick={()=>setRecurringExpenses(p=>p.filter(x=>x.id!==r.id))} aria-label={`Delete ${r.desc}`} className="text-red-300 hover:text-red-500 active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-red-400 rounded p-1"><Trash2 size={14}/></button>
              </div>
            );
          })}
        </section>

        {/* Data Management */}
        <section>
          <p className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Data Management</p>
          <div className="space-y-2">
            <button onClick={exportData} aria-label="Export data" className="w-full flex items-center gap-3 py-3 px-4 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-indigo-500">
              <Download size={16} className="text-indigo-500"/> Export Backup (JSON)
            </button>

            {/* UPDATE 4 — Auto Backup Restore */}
            <div className="mt-4">
              <p className="text-xs font-medium text-gray-500 ss-text-muted mb-2">Auto Backups (last 5 opens)</p>
              {(() => {
                try {
                  const backups = JSON.parse(localStorage.getItem('ss_backups') || '[]');
                  if (backups.length === 0) return <p className="text-xs text-gray-400 ss-text-muted">No backups yet</p>;
                  return backups.map((b, i) => (
                    <div key={i} className="flex items-center justify-between py-2 border-b border-gray-50 ss-divider">
                      <div>
                        <p className="text-xs font-medium text-gray-700 ss-text">{i === 0 ? 'Latest' : `Backup ${i + 1}`}</p>
                        <p className="text-[10px] text-gray-400 ss-text-muted">{new Date(b.backupDate).toLocaleString()}</p>
                      </div>
                      <button
                        onClick={() => {
                          if (window.confirm(`Restore backup from ${new Date(b.backupDate).toLocaleString()}? Current data will be replaced.`)) {
                            if (b.expenses) setExpenses(b.expenses);
                            if (b.lendings) setLendings(b.lendings);
                            if (b.savingsGoals) setSavingsGoals(b.savingsGoals);
                            showToast('Backup restored!', 'success');
                          }
                        }}
                        className="px-3 py-1.5 bg-indigo-50 text-indigo-600 rounded-lg text-xs font-medium active:scale-95 transition-transform"
                      >
                        Restore
                      </button>
                    </div>
                  ));
                } catch { return null; }
              })()}
            </div>
            <label className="w-full flex items-center gap-3 py-3 px-4 bg-white border border-gray-200 rounded-2xl text-sm font-medium text-gray-700 cursor-pointer active:scale-95 transition-transform">
              <Upload size={16} className="text-green-500"/> Import Backup
              <input type="file" accept=".json,application/json" onChange={importData} className="hidden"/>
            </label>
            <button onClick={()=>setClearConfirm(true)} aria-label="Clear all data" className="w-full flex items-center gap-3 py-3 px-4 bg-red-50 border border-red-100 rounded-2xl text-sm font-medium text-red-600 active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-red-400">
              <Trash2 size={16}/> Clear All Data
            </button>
            <button onClick={async () => { await supabase.auth.signOut(); window.location.reload(); }} aria-label="Log out" className="w-full flex items-center justify-center gap-3 py-3 px-4 bg-gray-900 border border-gray-800 rounded-2xl text-sm font-medium text-white active:scale-95 transition-transform">
              Log Out
            </button>
          </div>
        </section>
      </div>

      <ConfirmDialog isOpen={clearConfirm} title="Delete Everything?" message="This will permanently delete all your expenses, lendings, and goals. This cannot be undone."
        confirmLabel="Delete Everything" confirmColor="#FF6B6B"
        onConfirm={()=>{ setExpenses([]); setLendings([]); setSavingsGoals([]); setClearConfirm(false); showToast('All data cleared','info'); onClose(); }}
        onCancel={()=>setClearConfirm(false)}/>
    </BottomSheet>
  );
}
