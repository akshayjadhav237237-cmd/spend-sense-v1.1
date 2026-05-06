import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from './supabaseClient.js';
import AuthPage from './components/AuthPage.jsx';
import { OfflineBanner, Toast, BottomNav, BottomSheet } from './components/GlobalComponents.jsx';
import HomeView from './views/HomeView.jsx';
import ExpensesView from './views/ExpensesView.jsx';
import LendView from './views/LendView.jsx';
import SummaryView from './views/SummaryView.jsx';
import AiInsightsView from './views/AiInsightsView.jsx';
import SettingsSheet from './views/SettingsSheet.jsx';
import { getTodayISO, generateId, CATEGORIES } from './utils.js';
import { Camera, X, Pencil } from 'lucide-react';

const DEFAULT_SETTINGS = { name:'Student', currency:'₹', theme:'light', budgetLimit:0, weeklyDigest:false, haptics:true };

function safeLoad(key, fallback) {
  try { const v = localStorage.getItem(key); return v ? JSON.parse(v) : fallback; }
  catch(e) { console.warn('SpendSense: failed to load', key); return fallback; }
}

function safeSave(key, value, showToast) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch(e) { showToast?.('Storage error. Data may not be saved.', 'error'); }
}

function nextDueDateCalc(freq, from) {
  const d = new Date(from + 'T00:00:00');
  if(freq==='daily') d.setDate(d.getDate()+1);
  else if(freq==='weekly') d.setDate(d.getDate()+7);
  else d.setMonth(d.getMonth()+1);
  return d.toISOString().slice(0,10);
}

function SpendSenseApp() {
  const [activeTab, setActiveTab] = useState('home');
  const [settings, setSettings] = useState(() => safeLoad('ss_settings', DEFAULT_SETTINGS));
  const [expenses, setExpenses] = useState(() => {
    const loaded = safeLoad('ss_expenses', []);
    return Array.isArray(loaded) ? loaded.filter(e => e?.id && e?.amount && e?.date) : [];
  });
  const [lendings, setLendings] = useState(() => {
    try {
      const stored = localStorage.getItem('ss_lendings');
      if (!stored) return [];
      const parsed = JSON.parse(stored);
      if (!Array.isArray(parsed)) return [];
      return parsed.map(l => ({
        ...l,
        amountOriginal: l.amountOriginal ?? l.amount_original ?? parseFloat(l.amount) ?? 0,
        amountPaid: l.amountPaid ?? l.amount_paid ?? 0,
        payments: Array.isArray(l.payments) ? l.payments.map(p => ({
          id: p.id || generateId(),
          amount: parseFloat(p.amount) || 0,
          date: p.date || getTodayISO(),
          note: p.note || ''
        })) : [],
        status: l.status ?? 'pending'
      }));
    } catch (err) {
      console.warn('Failed to load lendings:', err);
      return [];
    }
  });
  const [lendingsLoading, setLendingsLoading] = useState(false);
  const [recurringExpenses, setRecurringExpenses] = useState(() => safeLoad('ss_recurring', []));
  const [savingsGoals, setSavingsGoals] = useState(() => safeLoad('ss_goals', []));
  const [chatHistory, setChatHistory] = useState(() => safeLoad('ss_chat', []));
  const [toast, setToast] = useState(null);
  const [showSettings, setShowSettings] = useState(false);

  // Grouped lending state
  const [expandedPersons, setExpandedPersons] = useState({});
  const [animatingLendId, setAnimatingLendId] = useState(null);
  const [expandedPayments, setExpandedPayments] = useState({});

  // Edit Expense
  const [showEditExpenseModal, setShowEditExpenseModal] = useState(false);
  const [editingExpense, setEditingExpense] = useState(null);
  const [editExpenseForm, setEditExpenseForm] = useState({ amount: '', category: '', desc: '', date: '', photo: null });

  // Edit Lending
  const [showEditLendModal, setShowEditLendModal] = useState(false);
  const [editingLend, setEditingLend] = useState(null);
  const [editLendForm, setEditLendForm] = useState({ name: '', phone: '', amount: '', reason: '', date: '' });

  const showToast = useCallback((msg, type = 'info') => {
    setToast({ msg, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // localStorage sync
  useEffect(() => { safeSave('ss_settings', settings, showToast); }, [settings]);
  useEffect(() => { safeSave('ss_expenses', expenses, showToast); }, [expenses]);
  useEffect(() => { safeSave('ss_recurring', recurringExpenses, showToast); }, [recurringExpenses]);
  useEffect(() => { safeSave('ss_goals', savingsGoals, showToast); }, [savingsGoals]);
  useEffect(() => { safeSave('ss_chat', chatHistory, showToast); }, [chatHistory]);

  // UPDATE 6 — Persist lendings (with payments) to localStorage
  useEffect(() => {
    if (lendings.length === 0 && lendingsLoading) return;
    try {
      const toSave = lendings.map(l => ({
        ...l,
        payments: Array.isArray(l.payments) ? l.payments : [],
        amountPaid: l.amountPaid || 0,
        amountOriginal: l.amountOriginal || parseFloat(l.amount) || 0,
        status: l.status || 'pending'
      }));
      localStorage.setItem('ss_lendings', JSON.stringify(toSave));
    } catch (err) {
      console.warn('Failed to save lendings:', err);
    }
  }, [lendings]);

  // Load lendings from Supabase (merges with localStorage fallback)
  useEffect(() => {
    const loadLendings = async () => {
      try {
        const { data, error } = await supabase
          .from('lendings')
          .select('*')
          .order('created_at', { ascending: false });
        if (error) throw error;
        const mapped = (data || []).map(l => ({
          id: l.id,
          name: l.name,
          phone: l.phone || '',
          amount: l.amount,
          amountOriginal: l.amount_original || l.amount,
          amountPaid: l.amount_paid || 0,
          payments: Array.isArray(l.payments) ? l.payments.map(p => ({
            id: p.id || generateId(),
            amount: parseFloat(p.amount) || 0,
            date: p.date || getTodayISO(),
            note: p.note || ''
          })) : [],
          reason: l.reason,
          date: l.date,
          status: l.status || 'pending'
        }));
        if (mapped.length > 0) setLendings(mapped);
      } catch (err) {
        console.error('Failed to load lendings from Supabase:', err);
        // localStorage fallback already loaded in useState init
      }
    };
    loadLendings();
  }, []);

  // UPDATE 5 — Theme on ss-root
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', settings.theme || 'light');
    const root = document.getElementById('ss-root');
    if (root) root.setAttribute('data-theme', settings.theme === 'dark' ? 'dark' : 'light');
  }, [settings.theme]);

  // UPDATE 4 — Auto backup on every app open
  useEffect(() => {
    const createAutoBackup = () => {
      try {
        const backup = {
          version: '1.1',
          backupDate: new Date().toISOString(),
          settings,
          expenses,
          lendings,
          savingsGoals,
          recurringExpenses
        };
        const existing = JSON.parse(localStorage.getItem('ss_backups') || '[]');
        const updated = [backup, ...existing].slice(0, 5);
        localStorage.setItem('ss_backups', JSON.stringify(updated));
        localStorage.setItem('ss_last_backup', new Date().toISOString());
        console.log('Auto backup created:', backup.backupDate);
      } catch (err) {
        console.warn('Auto backup failed:', err);
      }
    };
    const timer = setTimeout(createAutoBackup, 2000);
    return () => clearTimeout(timer);
  }, []);

  // Recurring expense auto-add on mount
  useEffect(() => {
    const today = getTodayISO();
    let newExpenses = [];
    const updated = recurringExpenses.map(r => {
      if(!r.active || r.nextDue > today) return r;
      const exp = { id: generateId(), amount: r.amount, category: r.category, desc: r.desc, date: today, createdAt: Date.now() };
      newExpenses.push({ exp, desc: r.desc, amount: r.amount });
      return { ...r, nextDue: nextDueDateCalc(r.frequency, today) };
    });
    if(newExpenses.length > 0) {
      setExpenses(prev => [...newExpenses.map(x => x.exp), ...prev]);
      setRecurringExpenses(updated);
      newExpenses.forEach(({ desc, amount }) => {
        setTimeout(() => showToast(`Auto-added: ${desc} — ${settings.currency}${amount}`, 'info'), 500);
      });
    }
  }, []);

  const handleEditExpense = () => {
    try {
      const amt = parseFloat(editExpenseForm.amount);
      if (!amt || amt <= 0) { showToast('Enter a valid amount', 'error'); return; }
      if (!editExpenseForm.category) { showToast('Select a category', 'error'); return; }
      setExpenses(prev => prev.map(e => e.id === editingExpense.id ? {
        ...e, amount: amt, category: editExpenseForm.category,
        desc: editExpenseForm.desc, date: editExpenseForm.date, photo: editExpenseForm.photo || null
      } : e));
      setShowEditExpenseModal(false); setEditingExpense(null);
      showToast('Expense updated!', 'success');
    } catch (err) { showToast('Something went wrong', 'error'); }
  };

  const openEditExpense = (expense) => {
    setEditingExpense(expense);
    setEditExpenseForm({ amount: expense.amount.toString(), category: expense.category, desc: expense.desc, date: expense.date, photo: expense.photo || null });
    setShowEditExpenseModal(true);
  };

  const updateLendingInDB = async (id, updates) => {
    try {
      const dbUpdates = {};
      if (updates.status !== undefined) dbUpdates.status = updates.status;
      if (updates.amount !== undefined) dbUpdates.amount = updates.amount;
      if (updates.amountPaid !== undefined) dbUpdates.amount_paid = updates.amountPaid;
      if (updates.amountOriginal !== undefined) dbUpdates.amount_original = updates.amountOriginal;
      if (updates.payments !== undefined) dbUpdates.payments = updates.payments;
      if (updates.name !== undefined) dbUpdates.name = updates.name;
      if (updates.phone !== undefined) dbUpdates.phone = updates.phone;
      if (updates.reason !== undefined) dbUpdates.reason = updates.reason;
      if (updates.date !== undefined) dbUpdates.date = updates.date;
      const { error } = await supabase.from('lendings').update(dbUpdates).eq('id', id);
      if (error) throw error;
    } catch (err) {
      console.error('Failed to update lending in DB:', err);
      showToast('Sync error — changes saved locally', 'info');
    }
  };

  const handleEditLend = async () => {
    try {
      const amt = parseFloat(editLendForm.amount);
      if (!amt || amt <= 0) { showToast('Enter a valid amount', 'error'); return; }
      if (!editLendForm.name.trim()) { showToast('Enter a name', 'error'); return; }
      setLendings(prev => prev.map(l => l.id === editingLend.id ? {
        ...l, name: editLendForm.name.trim(), phone: editLendForm.phone.trim(),
        amountOriginal: amt, amount: amt - (l.amountPaid || 0),
        reason: editLendForm.reason.trim(), date: editLendForm.date
      } : l));
      await updateLendingInDB(editingLend.id, {
        name: editLendForm.name.trim(),
        phone: editLendForm.phone.trim(),
        amountOriginal: amt,
        amount: amt - (editingLend.amountPaid || 0),
        reason: editLendForm.reason.trim(),
        date: editLendForm.date
      });
      setShowEditLendModal(false); setEditingLend(null);
      showToast('Lending updated!', 'success');
    } catch (err) { showToast('Something went wrong', 'error'); }
  };

  const openEditLend = (lend) => {
    setEditingLend(lend);
    setEditLendForm({ name: lend.name, phone: lend.phone || '', amount: lend.amountOriginal?.toString() || lend.amount.toString(), reason: lend.reason, date: lend.date });
    setShowEditLendModal(true);
  };

  const isDark = settings.theme === 'dark';

  const common = { settings, showToast };

  return (
    <>
      <style>{`
        @keyframes fadeIn { from { opacity: 0 } to { opacity: 1 } }
        @keyframes slideUp { from { transform: translateY(100%) } to { transform: translateY(0) } }
        @keyframes scaleIn { from { transform: scale(0.85); opacity: 0 } to { transform: scale(1); opacity: 1 } }
        @keyframes pulseSubtle { 0%, 100% { opacity: 1 } 50% { opacity: 0.6 } }
        @keyframes shake { 0%, 100% { transform: translateX(0) } 25% { transform: translateX(-4px) } 75% { transform: translateX(4px) } }
        @keyframes dotBounce { 0%, 80%, 100% { transform: scale(0) } 40% { transform: scale(1) } }
        @keyframes confettiFall { 0% { transform: translateY(-10px) rotate(0deg); opacity: 1 } 100% { transform: translateY(60px) rotate(360deg); opacity: 0 } }
        @keyframes slideOutRight {
          0% { transform: translateX(0); opacity: 1; max-height: 300px; }
          100% { transform: translateX(110%); opacity: 0; max-height: 0; padding: 0; margin: 0; }
        }
        .lend-exit {
          animation: slideOutRight 0.6s cubic-bezier(0.55, 0, 1, 0.45) forwards;
          pointer-events: none;
          overflow: hidden;
        }
        .animate-fade-in { animation: fadeIn 200ms ease-out both }
        .animate-slide-up { animation: slideUp 300ms cubic-bezier(0.34, 1.56, 0.64, 1) both }
        .animate-scale-in { animation: scaleIn 200ms ease-out both }
        .animate-pulse-subtle { animation: pulseSubtle 2s ease-in-out infinite }
        .animate-shake { animation: shake 300ms ease-in-out }
        .animate-dot-bounce { animation: dotBounce 1.4s ease-in-out infinite both }
        .animate-confetti-fall { animation: confettiFall 1s ease-out forwards }
        .scrollbar-hide { -ms-overflow-style: none; scrollbar-width: none }
        .scrollbar-hide::-webkit-scrollbar { display: none }
        .pb-safe { padding-bottom: env(safe-area-inset-bottom) }
        @media (prefers-reduced-motion: reduce) {
          *, *::before, *::after { animation: none !important; transition: none !important; }
        }
        /* UPDATE 5 — Exhaustive dark mode */
        [data-theme="dark"] { color-scheme: dark; }
        [data-theme="dark"] .ss-page-bg { background-color: #0D0D1A !important; }
        [data-theme="dark"] .ss-card { background-color: #1A1A2E !important; border-color: rgba(255,255,255,0.06) !important; box-shadow: none !important; }
        [data-theme="dark"] .ss-text { color: #E8E8F4 !important; }
        [data-theme="dark"] .ss-text-muted { color: #8888AA !important; }
        [data-theme="dark"] .ss-input { background-color: #252540 !important; color: #E8E8F4 !important; border-color: rgba(255,255,255,0.1) !important; }
        [data-theme="dark"] .ss-bottom-nav { background-color: #1A1A2E !important; border-color: rgba(255,255,255,0.06) !important; }
        [data-theme="dark"] .ss-bottom-sheet { background-color: #1A1A2E !important; }
        [data-theme="dark"] .ss-chip-inactive { background-color: #252540 !important; color: #C0C0E0 !important; border-color: rgba(255,255,255,0.08) !important; }
        [data-theme="dark"] .ss-section-header { color: #8888AA !important; background-color: #0D0D1A !important; }
        [data-theme="dark"] .ss-drag-handle { background-color: #3A3A5C !important; }
        [data-theme="dark"] .ss-divider { border-color: rgba(255,255,255,0.06) !important; }
        [data-theme="dark"] .ss-avatar-bg { background-color: #2D2D50 !important; color: #A0A0D0 !important; }
        [data-theme="dark"] input { background-color: #252540 !important; color: #E8E8F4 !important; }
        [data-theme="dark"] input::placeholder { color: #6666AA !important; }
        [data-theme="dark"] select { background-color: #252540 !important; color: #E8E8F4 !important; }
        [data-theme="dark"] textarea { background-color: #252540 !important; color: #E8E8F4 !important; }
        [data-theme="dark"] .bg-white { background-color: #1A1A2E !important; }
        [data-theme="dark"] .bg-gray-50 { background-color: #252540 !important; }
        [data-theme="dark"] .bg-gray-100 { background-color: #2A2A45 !important; }
        [data-theme="dark"] .text-gray-800 { color: #E8E8F4 !important; }
        [data-theme="dark"] .text-gray-700 { color: #D0D0E8 !important; }
        [data-theme="dark"] .text-gray-600 { color: #B0B0CC !important; }
        [data-theme="dark"] .text-gray-500 { color: #9090B0 !important; }
        [data-theme="dark"] .text-gray-400 { color: #7070A0 !important; }
        [data-theme="dark"] .border-gray-100 { border-color: rgba(255,255,255,0.06) !important; }
        [data-theme="dark"] .border-gray-50 { border-color: rgba(255,255,255,0.04) !important; }
        [data-theme="dark"] .bg-indigo-50 { background-color: #1E1E40 !important; }
        [data-theme="dark"] .bg-indigo-100 { background-color: #25254A !important; }
        [data-theme="dark"] .bg-green-50 { background-color: #0F2A1A !important; }
        [data-theme="dark"] .bg-red-50 { background-color: #2A0F0F !important; }
        [data-theme="dark"] .bg-yellow-50 { background-color: #2A2010 !important; }
        [data-theme="dark"] .bg-blue-50 { background-color: #0F1A2A !important; }
        [data-theme="dark"] .bg-teal-50 { background-color: #0F2525 !important; }
        [data-theme="dark"] .bg-orange-50 { background-color: #2A1A0F !important; }
        [data-theme="dark"] .sticky { background-color: #0D0D1A !important; }
        [data-theme="dark"] .shadow-sm { box-shadow: none !important; }
        [data-theme="dark"] .shadow-md { box-shadow: 0 4px 20px rgba(0,0,0,0.4) !important; }
        [data-theme="dark"] .shadow-lg { box-shadow: 0 8px 30px rgba(0,0,0,0.5) !important; }
        [data-theme="dark"] .shadow-2xl { box-shadow: 0 0 60px rgba(0,0,0,0.6) !important; }
      `}</style>

      <div
        id="ss-root"
        className={`max-w-[430px] mx-auto font-sans selection:bg-indigo-100 ss-page-bg ${isDark ? 'bg-[#0D0D1A]' : 'bg-[#F8F9FF]'} shadow-2xl`}
        data-theme={settings.theme}
        style={{ height: '100dvh', overflowX: 'hidden', display: 'flex', flexDirection: 'column' }}
      >
        <OfflineBanner/>

        {/* Main scrollable content area — all tabs except chat */}
        {activeTab !== 'chat' && (
          <div className="flex-1 overflow-y-auto scrollbar-hide" style={{ paddingBottom: '80px' }}>
            {activeTab === 'home' && <HomeView {...common} expenses={expenses} lendings={lendings} setActiveTab={setActiveTab} setShowSettings={setShowSettings}/>}
            {activeTab === 'expenses' && <ExpensesView {...common} expenses={expenses} setExpenses={setExpenses} openEditExpense={openEditExpense}/>}
            {activeTab === 'lend' && <LendView {...common} lendings={lendings} setLendings={setLendings} openEditLend={openEditLend}
              expandedPersons={expandedPersons} setExpandedPersons={setExpandedPersons}
              animatingLendId={animatingLendId} setAnimatingLendId={setAnimatingLendId}
              expandedPayments={expandedPayments} setExpandedPayments={setExpandedPayments}
              lendingsLoading={lendingsLoading} updateLendingInDB={updateLendingInDB}/>}
            {activeTab === 'summary' && <SummaryView {...common} expenses={expenses} lendings={lendings} savingsGoals={savingsGoals} setSavingsGoals={setSavingsGoals}/>}
          </div>
        )}

        {/* AI Chat — manages its own scroll */}
        {activeTab === 'chat' && (
          <div className="flex flex-col flex-1 overflow-hidden">
            <AiInsightsView {...common} expenses={expenses} lendings={lendings}/>
          </div>
        )}

        {/* Bottom Nav */}
        <BottomNav activeTab={activeTab} setActiveTab={setActiveTab}/>

        {/* Toast */}
        <Toast toast={toast}/>

        {/* Settings */}
        <SettingsSheet
          isOpen={showSettings} onClose={() => setShowSettings(false)}
          settings={settings} setSettings={setSettings}
          expenses={expenses} lendings={lendings} savingsGoals={savingsGoals}
          recurringExpenses={recurringExpenses} setRecurringExpenses={setRecurringExpenses}
          setExpenses={setExpenses} setLendings={setLendings} setSavingsGoals={setSavingsGoals}
          showToast={showToast}
        />

        {/* Edit Expense Modal */}
        <BottomSheet isOpen={showEditExpenseModal} onClose={() => { setShowEditExpenseModal(false); setEditingExpense(null); }} title="Edit Expense">
          <div className="px-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 ss-text-muted mb-1.5 block">Amount</label>
              <div className="flex items-center bg-gray-50 rounded-xl px-3 ss-input">
                <span className="text-gray-400 text-sm mr-1">{settings.currency}</span>
                <input type="number" inputMode="decimal" className="flex-1 bg-transparent py-3 text-sm outline-none"
                  value={editExpenseForm.amount} onChange={e => setEditExpenseForm(p => ({ ...p, amount: e.target.value }))} autoFocus/>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 ss-text-muted mb-1.5 block">Category</label>
              <div className="flex overflow-x-auto gap-2 pb-2 scrollbar-hide">
                {CATEGORIES.map(cat => (
                  <button key={cat.name} onClick={() => setEditExpenseForm(p => ({ ...p, category: cat.name }))}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm whitespace-nowrap flex-shrink-0 transition-all duration-200 border ${editExpenseForm.category === cat.name ? 'bg-[#6C63FF] text-white border-[#6C63FF]' : 'bg-white text-gray-600 border-gray-100 ss-chip-inactive'}`}>
                    <span>{cat.emoji}</span><span>{cat.name}</span>
                  </button>
                ))}
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 ss-text-muted mb-1.5 block">Description</label>
              <input type="text" className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm outline-none ss-input"
                value={editExpenseForm.desc} onChange={e => setEditExpenseForm(p => ({ ...p, desc: e.target.value }))} placeholder="What was this for?" maxLength={60}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 ss-text-muted mb-1.5 block">Date</label>
              <input type="date" className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm outline-none ss-input"
                value={editExpenseForm.date} max={getTodayISO()} onChange={e => setEditExpenseForm(p => ({ ...p, date: e.target.value }))}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 ss-text-muted mb-1.5 block">Receipt Photo</label>
              <div className="flex gap-2 items-center">
                {editExpenseForm.photo && <img src={editExpenseForm.photo} alt="Receipt preview" className="w-14 h-14 rounded-xl object-cover border border-gray-100"/>}
                <label className="flex items-center gap-2 px-4 py-2.5 bg-gray-50 rounded-xl text-sm text-gray-500 cursor-pointer active:scale-95 transition-transform ss-input">
                  <Camera size={16}/>{editExpenseForm.photo ? 'Change Photo' : 'Add Receipt'}
                  <input type="file" accept="image/*" capture="environment" className="hidden" onChange={(e) => {
                    const file = e.target.files[0]; if (!file) return;
                    const reader = new FileReader();
                    reader.onload = (ev) => setEditExpenseForm(p => ({ ...p, photo: ev.target.result }));
                    reader.readAsDataURL(file);
                  }}/>
                </label>
                {editExpenseForm.photo && (
                  <button onClick={() => setEditExpenseForm(p => ({ ...p, photo: null }))}
                    className="w-9 h-9 rounded-xl bg-red-50 text-red-400 flex items-center justify-center active:scale-95 transition-transform" aria-label="Remove photo">
                    <X size={16}/>
                  </button>
                )}
              </div>
            </div>
            <button onClick={handleEditExpense} className="w-full py-3.5 rounded-2xl bg-[#6C63FF] text-white font-semibold text-sm active:scale-95 transition-transform">
              Save Changes
            </button>
          </div>
        </BottomSheet>

        {/* Edit Lending Modal */}
        <BottomSheet isOpen={showEditLendModal} onClose={() => { setShowEditLendModal(false); setEditingLend(null); }} title="Edit Lending">
          <div className="px-4 space-y-4">
            <div>
              <label className="text-xs font-medium text-gray-500 ss-text-muted mb-1.5 block">Name</label>
              <input type="text" className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm outline-none ss-input"
                value={editLendForm.name} onChange={e => setEditLendForm(p => ({ ...p, name: e.target.value }))} placeholder="Borrower name" autoFocus/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 ss-text-muted mb-1.5 block">Phone (optional)</label>
              <input type="tel" className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm outline-none ss-input"
                value={editLendForm.phone} onChange={e => setEditLendForm(p => ({ ...p, phone: e.target.value }))} placeholder="+91 XXXXX XXXXX"/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 ss-text-muted mb-1.5 block">Original Amount</label>
              <div className="flex items-center bg-gray-50 rounded-xl px-3 ss-input">
                <span className="text-gray-400 text-sm mr-1">{settings.currency}</span>
                <input type="number" inputMode="decimal" className="flex-1 bg-transparent py-3 text-sm outline-none"
                  value={editLendForm.amount} onChange={e => setEditLendForm(p => ({ ...p, amount: e.target.value }))} placeholder="0"/>
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 ss-text-muted mb-1.5 block">Reason</label>
              <input type="text" className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm outline-none ss-input"
                value={editLendForm.reason} onChange={e => setEditLendForm(p => ({ ...p, reason: e.target.value }))} placeholder="What was the money for?" maxLength={60}/>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 ss-text-muted mb-1.5 block">Date</label>
              <input type="date" className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm outline-none ss-input"
                value={editLendForm.date} max={getTodayISO()} onChange={e => setEditLendForm(p => ({ ...p, date: e.target.value }))}/>
            </div>
            <button onClick={handleEditLend} className="w-full py-3.5 rounded-2xl bg-[#4ECDC4] text-white font-semibold text-sm active:scale-95 transition-transform">
              Save Changes
            </button>
          </div>
        </BottomSheet>
      </div>
    </>
  );
}

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  componentDidCatch(err, info) { console.error('SpendSense crash:', err, info); }
  render() {
    if (this.state.hasError) {
      return (
        <div className="max-w-[430px] mx-auto min-h-screen flex flex-col items-center justify-center p-8 bg-[#F8F9FF]">
          <p className="text-4xl mb-4">💸</p>
          <h2 className="font-semibold text-lg text-gray-800 mb-2">Something went wrong</h2>
          <p className="text-sm text-gray-400 text-center mb-6">{this.state.error?.message || 'Unknown error'}</p>
          <button
            onClick={() => { localStorage.clear(); window.location.reload(); }}
            className="px-6 py-3 bg-[#6C63FF] text-white rounded-2xl text-sm font-medium active:scale-95 transition-transform"
          >
            Reset App &amp; Reload
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

const App = () => {
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    }).catch(err => {
      console.warn("Supabase auth error:", err);
      // Fallback: gracefully stop loading even if Supabase is offline
      setLoading(false);
    });

    try {
      const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
        setSession(session);
      });
      return () => subscription.unsubscribe();
    } catch(e) {
      console.warn("Supabase listener error:", e);
    }
  }, []);

  if (loading) return null;

  // If Supabase keys are missing or placeholder, bypass login and allow local access
  const isLocalMode = !import.meta.env.VITE_SUPABASE_URL || String(import.meta.env.VITE_SUPABASE_URL).includes('placeholder');

  return (
    <ErrorBoundary>
      {(session || isLocalMode) ? <SpendSenseApp session={session} /> : <AuthPage />}
    </ErrorBoundary>
  );
};

export default App;
