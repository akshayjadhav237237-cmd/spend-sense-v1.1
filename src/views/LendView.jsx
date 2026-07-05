import React, { useState, useMemo, useCallback } from 'react';
import { ChevronDown, Trash2, Pencil } from 'lucide-react';
import { formatCurr, getRelativeDateLabel, getTodayISO, parseAmount, generateId, avatarColor, getInitials } from '../utils.js';
import { BottomSheet, ConfirmDialog, useContactPicker } from '../components/GlobalComponents.jsx';

// Step 2 — Grouping utility
const groupLendingsByPerson = (lendings) => {
  const map = {};
  lendings.forEach(l => {
    const key = l.name.trim().toLowerCase();
    if (!map[key]) {
      map[key] = {
        personName: l.name.trim(),
        phone: l.phone || '',
        lendings: [],
        totalOriginal: 0,
        totalPaid: 0,
        totalRemaining: 0,
        hasAnyPending: false,
        hasAnyPartial: false,
        allReturned: false,
      };
    }
    const original = l.amountOriginal || parseFloat(l.amount) || 0;
    const paid = l.amountPaid || 0;
    const remaining = original - paid;
    map[key].lendings.push(l);
    map[key].totalOriginal += original;
    map[key].totalPaid += paid;
    map[key].totalRemaining += remaining;
    if (l.status === 'pending') map[key].hasAnyPending = true;
    if (l.status === 'partial') map[key].hasAnyPartial = true;
  });
  Object.values(map).forEach(g => {
    g.allReturned = g.lendings.every(l => l.status === 'returned');
    g.overallStatus = g.allReturned ? 'returned' : g.hasAnyPartial || g.totalPaid > 0 ? 'partial' : 'pending';
  });
  return Object.values(map);
};

function AddLendModal({ isOpen, onClose, onAdd, settings, lendings, showToast }) {
  const sym = settings.currency;
  const [name,setName]=useState(''); const [phone,setPhone]=useState('');
  const [amount,setAmount]=useState(''); const [reason,setReason]=useState('');
  const [date,setDate]=useState(getTodayISO());
  const [amtErr,setAmtErr]=useState(false); const [nameErr,setNameErr]=useState(false);

  const quickContacts = useMemo(()=>{
    const seen={}; return lendings.filter(l=>{const k=l.name.toLowerCase(); if(seen[k]) return false; seen[k]=true; return true;}).slice(0,6);
  },[lendings]);

  const reset=()=>{setName('');setPhone('');setAmount('');setReason('');setDate(getTodayISO());setAmtErr(false);setNameErr(false);};
  const submit=()=>{
    try {
      let err=false;
      if(!name.trim()){setNameErr(true);err=true;}else setNameErr(false);
      const amt=parseAmount(amount); if(!amt){setAmtErr(true);err=true;}else setAmtErr(false);
      if(err) return;
      onAdd({
        id: generateId(),
        name: name.trim(),
        phone: phone.trim(),
        amountOriginal: parseFloat(amt),
        amountPaid: 0,
        payments: [],
        amount: amt,
        reason: reason.trim(),
        date,
        status: 'pending',
        createdAt: Date.now()
      });
      reset(); onClose();
    } catch(err) {
      console.error('Add lending error:', err);
      showToast?.('Something went wrong. Try again.', 'error');
    }
  };

  const { pickContact } = useContactPicker(
    ({ name: n, phone: p }) => { setName(n); setPhone(p); },
    showToast
  );

  return (
    <BottomSheet isOpen={isOpen} onClose={()=>{reset();onClose();}} title="Add Lending">
      {quickContacts.length>0&&(
        <div className="mb-4">
          <p className="text-xs text-gray-400 mb-2">Quick Select</p>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
            {quickContacts.map(l=>(
              <button key={l.id} onClick={()=>{setName(l.name);setPhone(l.phone||'');}}
                className="flex-shrink-0 flex flex-col items-center gap-1 focus-visible:ring-2 focus-visible:ring-indigo-500 rounded-lg p-1">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{background:avatarColor(l.name)}}>{getInitials(l.name)}</div>
                <span className="text-[10px] text-gray-500 max-w-[48px] truncate">{l.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}
      <div className="space-y-4">
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block" htmlFor="lend-name">Name</label>
          <div className="flex gap-2">
            <input id="lend-name" value={name} onChange={e=>{setName(e.target.value);setNameErr(false);}} placeholder="Person's name" aria-invalid={nameErr} aria-describedby={nameErr?'lend-name-err':undefined}
              className={`flex-1 border rounded-xl px-3 py-3 bg-gray-50 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 ss-input ${nameErr?'border-red-400':'border-gray-200'}`}/>
            <button onClick={pickContact} aria-label="Pick from contacts" className="w-11 h-11 border border-gray-200 rounded-xl flex items-center justify-center text-gray-500 bg-gray-50 active:scale-95 focus-visible:ring-2 focus-visible:ring-indigo-500">👤</button>
          </div>
          {nameErr&&<p id="lend-name-err" role="alert" className="text-xs text-red-500 mt-1">Name is required</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block" htmlFor="lend-phone">Phone (optional)</label>
          <input id="lend-phone" type="tel" value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+91 98765 43210"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block" htmlFor="lend-amount">Amount</label>
          <div className={`flex items-center border rounded-xl px-3 gap-2 bg-gray-50 ${amtErr?'border-red-400':'border-gray-200'}`}>
            <span className="text-gray-400 text-sm">{sym}</span>
            <input id="lend-amount" type="number" inputMode="decimal" value={amount} onChange={e=>{setAmount(e.target.value);setAmtErr(false);}} placeholder="0.00"
              aria-invalid={amtErr} aria-describedby={amtErr?'lend-amt-err':undefined}
              className="flex-1 py-3 bg-transparent outline-none text-sm text-gray-800 focus-visible:ring-0"/>
          </div>
          {amtErr&&<p id="lend-amt-err" role="alert" className="text-xs text-red-500 mt-1">Enter a valid amount</p>}
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block" htmlFor="lend-reason">Reason</label>
          <input id="lend-reason" value={reason} onChange={e=>setReason(e.target.value)} placeholder="What for?"
            className="w-full border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"/>
        </div>
        <div>
          <label className="text-xs font-medium text-gray-500 mb-1 block" htmlFor="lend-date">Date</label>
          <input id="lend-date" type="date" value={date} max={getTodayISO()} onChange={e=>setDate(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-3 bg-gray-50 text-sm outline-none focus-visible:ring-2 focus-visible:ring-indigo-500"/>
        </div>
        <button onClick={submit} className="w-full py-3.5 bg-[#4ECDC4] text-white rounded-2xl font-semibold text-sm active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-[#4ECDC4] focus-visible:ring-offset-2">
          Add Lending
        </button>
      </div>
    </BottomSheet>
  );
}

export default function LendView({
  settings, lendings, setLendings, showToast, openEditLend,
  expandedPersons, setExpandedPersons,
  animatingLendId, setAnimatingLendId,
  expandedPayments, setExpandedPayments,
  lendingsLoading, updateLendingInDB
}) {
  const sym = settings.currency;
  const [lendFilter,setLendFilter]=useState('pending');
  const [showAdd,setShowAdd]=useState(false);
  const [deleteId,setDeleteId]=useState(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentTarget, setPaymentTarget] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', date: getTodayISO(), note: '' });

  const pendingCount=useMemo(()=>lendings.filter(l=>l.status==='pending'||l.status==='partial').length,[lendings]);
  const returnedCount=useMemo(()=>lendings.filter(l=>l.status==='returned').length,[lendings]);
  const pendingTotal=useMemo(()=>lendings.filter(l=>l.status==='pending'||l.status==='partial').reduce((s,l)=>s+(parseFloat(l.amount)||0),0),[lendings]);

  // Dead-simple filter — no grouping confusion
  const filteredLendings = lendings.filter(l => {
    if (lendFilter === 'returned') return l.status === 'returned';
    if (lendFilter === 'pending') return l.status === 'pending' || l.status === 'partial';
    return true;
  });

  // DEBUG: Keep groupedLendings for the grouped UI but backed by filteredLendings
  const groupedLendings = useMemo(() => {
    console.log('ALL LENDINGS:', lendings);
    console.log('CURRENT FILTER:', lendFilter);
    console.log('FILTERED RESULT:', lendings.filter(l => l.status === 'returned'));
    return groupLendingsByPerson(filteredLendings);
  }, [filteredLendings]);

  const addLend = useCallback(async (l) => {
    setLendings(p => [l, ...p]);
    showToast('Lending added!', 'success');
  }, [setLendings, showToast]);

  const deleteLend = useCallback((id) => {
    setLendings(p => p.filter(l => l.id !== id));
    showToast('Deleted', 'info');
    setDeleteId(null);
  }, [setLendings, showToast]);

  const handleRecordPayment = async () => {
    try {
      const amt = parseFloat(paymentForm.amount);
      if (!amt || amt <= 0) { showToast('Enter a valid amount', 'error'); return; }
      const remaining = paymentTarget.amountOriginal - paymentTarget.amountPaid;
      if (amt > remaining) { showToast('Amount exceeds remaining balance', 'error'); return; }
      const newPayment = { id: generateId(), amount: amt, date: paymentForm.date, note: paymentForm.note.trim() };
      const newAmountPaid = paymentTarget.amountPaid + amt;
      const newRemaining = paymentTarget.amountOriginal - newAmountPaid;
      const newStatus = newRemaining <= 0 ? 'returned' : 'partial';
      const newPayments = [...(paymentTarget.payments || []), newPayment];
      const updates = { amountPaid: newAmountPaid, amount: newRemaining, status: newStatus, payments: newPayments };
      setLendings(prev => {
        const updated = prev.map(l => l.id === paymentTarget.id ? { ...l, ...updates } : l);
        console.log('UPDATED LENDINGS AFTER PAYMENT:', updated);
        return updated;
      });
      await updateLendingInDB(paymentTarget.id, updates);
      setShowPaymentModal(false);
      setPaymentTarget(null);
      setPaymentForm({ amount: '', date: getTodayISO(), note: '' });
      if (newStatus === 'returned') {
        showToast('Fully returned! 🎉', 'success');
      } else {
        showToast(`Payment recorded — ${sym}${newRemaining.toFixed(2)} remaining`, 'info');
      }
    } catch (err) {
      console.error('Record payment error:', err);
      showToast('Something went wrong', 'error');
    }
  };

  const remindLending = (lend) => {
    try {
      const paid = lend.amountPaid || 0;
      const original = lend.amountOriginal || parseFloat(lend.amount) || 0;
      const remaining = original - paid;
      const text = paid > 0
        ? `Hey ${lend.name}! You borrowed ${sym}${original} from me on ${lend.date} for '${lend.reason}'. You've returned ${sym}${paid.toFixed(2)} so far — ${sym}${remaining.toFixed(2)} is still pending. Please return it when you can!`
        : `Hey ${lend.name}! Friendly reminder — you borrowed ${sym}${original} from me on ${lend.date} for '${lend.reason}'. Please return it when you can!`;

      if (lend.phone) {
        const phone = lend.phone.replace(/[^\d]/g, '').slice(-10);
        window.open(`https://wa.me/91${phone}?text=${encodeURIComponent(text)}`, '_blank');
      } else {
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(text)
            .then(() => showToast('Message copied to clipboard!', 'success'))
            .catch(() => showToast('Could not copy message', 'error'));
        } else {
          showToast('No phone number saved for this contact', 'info');
        }
      }
    } catch (err) {
      console.error('remindLending error:', err);
      showToast('Could not send reminder', 'error');
    }
  };

  const remindAll = () => {
    try {
      const pending = lendings.filter(l => l.status === 'pending' || l.status === 'partial');
      if (pending.length === 0) { showToast('No pending lendings!', 'error'); return; }
      pending.forEach((lend, index) => {
        setTimeout(() => {
          try { remindLending(lend); } catch (e) { console.error(e); }
        }, index * 2000);
      });
      showToast(`Sending ${pending.length} reminders...`, 'info');
    } catch (err) {
      showToast('Could not send reminders', 'error');
    }
  };

  const FILTER_TABS=[{id:'pending',label:'Pending',count:pendingCount},{id:'returned',label:'Returned',count:returnedCount},{id:'all',label:'All'}];

  return (
    <div className="px-4 pt-4 pb-32 animate-fade-in">
      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-bold text-gray-900 ss-text">Lendings</h2>
        <div className="flex gap-2">
          <button onClick={remindAll} aria-label="Remind all" className="text-xs font-medium px-3 py-1.5 rounded-full border border-[#4ECDC4] text-[#4ECDC4] active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-[#4ECDC4]">Remind All</button>
          <button onClick={()=>setShowAdd(true)} aria-label="Add lending" className="text-xs font-medium px-3 py-1.5 rounded-full bg-[#4ECDC4] text-white active:scale-95 transition-all focus-visible:ring-2 focus-visible:ring-[#4ECDC4]">+ Add</button>
        </div>
      </div>

      <div className="rounded-2xl p-4 mb-3 text-white" style={{background:'linear-gradient(135deg,#4ECDC4,#0984e3)'}}>
        <p className="text-2xl font-bold">{formatCurr(pendingTotal,sym)}</p>
        <p className="text-xs opacity-80 mt-0.5">{pendingCount} pending</p>
      </div>

      <div className="flex gap-1 mb-4 bg-gray-100 p-1 rounded-2xl">
        <button
          onClick={() => setLendFilter('pending')}
          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${lendFilter==='pending'?'bg-white text-gray-900 shadow-sm':'text-gray-500'}`}
        >
          Pending<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${lendFilter==='pending'?'bg-indigo-100 text-indigo-600':'bg-gray-200 text-gray-500'}`}>{pendingCount}</span>
        </button>
        <button
          onClick={() => {
            console.log('SWITCHED TO RETURNED TAB');
            console.log('LENDINGS WITH RETURNED STATUS:', lendings.filter(l => l.status === 'returned'));
            setLendFilter('returned');
          }}
          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${lendFilter==='returned'?'bg-white text-gray-900 shadow-sm':'text-gray-500'}`}
        >
          Returned<span className={`text-[10px] px-1.5 py-0.5 rounded-full font-bold ${lendFilter==='returned'?'bg-indigo-100 text-indigo-600':'bg-gray-200 text-gray-500'}`}>{returnedCount}</span>
        </button>
        <button
          onClick={() => setLendFilter('all')}
          className={`flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-semibold transition-all active:scale-95 ${lendFilter==='all'?'bg-white text-gray-900 shadow-sm':'text-gray-500'}`}
        >
          All
        </button>
      </div>

      {/* Loading spinner while fetching from Supabase */}
      {lendingsLoading ? (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 rounded-full border-2 border-[#4ECDC4] border-t-transparent animate-spin" />
        </div>
      ) : groupedLendings.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16">
          <p className="text-5xl mb-4">🤝</p>
          <p className="font-semibold text-gray-600 ss-text">No lendings here</p>
          <p className="text-sm text-gray-400 ss-text-muted mt-1">Tap + to track money you lent</p>
        </div>
      ) : null}

      {!lendingsLoading && groupedLendings.map(group => {
        const isExpanded = expandedPersons[group.personName] || false;
        const progressPct = group.totalOriginal > 0 ? (group.totalPaid / group.totalOriginal) * 100 : 0;

        return (
          <div key={group.personName} className="mb-3">
            {/* GROUP HEADER CARD */}
            <div
              className="bg-white rounded-2xl p-4 shadow-sm border border-gray-50 ss-card cursor-pointer active:scale-[0.99] transition-transform"
              onClick={() => setExpandedPersons(prev => ({ ...prev, [group.personName]: !prev[group.personName] }))}
            >
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-full bg-teal-50 flex items-center justify-center text-teal-600 font-bold text-base flex-shrink-0 ss-avatar-bg"
                  style={{background: avatarColor(group.personName), color: '#fff'}}>
                  {getInitials(group.personName)}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-sm text-gray-800 ss-text">{group.personName}</p>
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full flex-shrink-0 ${
                      group.overallStatus === 'returned' ? 'bg-green-100 text-green-700' :
                      group.overallStatus === 'partial' ? 'bg-blue-100 text-blue-700' :
                      'bg-yellow-100 text-yellow-700'
                    }`}>
                      {group.overallStatus === 'returned' ? 'All Returned' : group.overallStatus === 'partial' ? 'Partial' : 'Pending'}
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 ss-text-muted mt-0.5">{group.lendings.length} lending{group.lendings.length > 1 ? 's' : ''}</p>
                </div>
                <ChevronDown
                  size={18}
                  className={`text-gray-400 transition-transform duration-300 flex-shrink-0 ${isExpanded ? 'rotate-180' : ''}`}
                />
              </div>

              <div className="mt-3 flex items-baseline justify-between">
                <span className="text-xl font-bold text-[#4ECDC4]">{formatCurr(group.totalRemaining, sym)}</span>
                <span className="text-xs text-gray-400 ss-text-muted">of {formatCurr(group.totalOriginal, sym)}</span>
              </div>

              {group.totalPaid > 0 && (
                <div className="w-full bg-gray-100 rounded-full h-1.5 mt-2">
                  <div className="bg-[#4ECDC4] h-1.5 rounded-full transition-all duration-700" style={{ width: progressPct + '%' }} />
                </div>
              )}

              {!group.allReturned && (
                <div className="flex gap-2 mt-3" onClick={e => e.stopPropagation()}>
                  <button
                    onClick={() => remindLending({ ...group.lendings[0], name: group.personName, phone: group.phone, amountOriginal: group.totalOriginal, amountPaid: group.totalPaid, amount: group.totalRemaining })}
                    className="flex-1 py-2 rounded-xl bg-green-50 text-green-600 text-sm font-medium active:scale-95 transition-transform border border-green-100"
                  >
                    Remind
                  </button>
                </div>
              )}
            </div>

            {/* EXPANDED INDIVIDUAL LENDINGS */}
            {isExpanded && (
              <div className="ml-4 mt-1 space-y-2">
                {group.lendings.map(lend => {
                  const original = lend.amountOriginal || parseFloat(lend.amount) || 0;
                  const paid = lend.amountPaid || 0;
                  const remaining = original - paid;
                  const lendProgress = original > 0 ? (paid / original) * 100 : 0;
                  const daysSince = Math.floor((Date.now() - new Date(lend.date)) / 86400000);
                  const isAnimating = animatingLendId === lend.id;
                  const isExpandedPayments = expandedPayments[lend.id] || false;

                  return (
                    <div
                      key={lend.id}
                      className={`bg-white rounded-xl p-3.5 shadow-sm border border-gray-100 ss-card ${isAnimating ? 'lend-exit' : ''}`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                              lend.status === 'returned' ? 'bg-green-100 text-green-700' :
                              lend.status === 'partial' ? 'bg-blue-100 text-blue-700' :
                              'bg-yellow-100 text-yellow-700'
                            }`}>
                              {lend.status === 'returned' ? 'Returned' : lend.status === 'partial' ? 'Partial' : 'Pending'}
                            </span>
                            {lend.status !== 'returned' && daysSince > 30 && (
                              <span className="text-xs text-red-500 font-medium">⚠️ {daysSince}d overdue</span>
                            )}
                          </div>
                          <p className="text-xs text-gray-500 ss-text-muted mt-1">{lend.reason || 'No reason given'}</p>
                          <p className="text-xs text-gray-400 ss-text-muted">{getRelativeDateLabel(lend.date)}</p>
                        </div>
                        <div className="text-right flex-shrink-0">
                          <p className="font-bold text-sm text-[#4ECDC4]">{formatCurr(remaining, sym)}</p>
                          {paid > 0 && <p className="text-xs text-gray-400 ss-text-muted">of {formatCurr(original, sym)}</p>}
                        </div>
                      </div>

                      {paid > 0 && (
                        <div className="w-full bg-gray-100 rounded-full h-1 mt-2">
                          <div className="bg-[#4ECDC4] h-1 rounded-full transition-all duration-700" style={{ width: lendProgress + '%' }} />
                        </div>
                      )}

                      {lend.status !== 'returned' && (
                        <div className="flex gap-2 mt-3">
                          <button
                            onClick={() => { setPaymentTarget(lend); setPaymentForm({ amount: remaining.toFixed(2), date: getTodayISO(), note: '' }); setShowPaymentModal(true); }}
                            className="flex-1 py-2 rounded-lg bg-teal-50 text-teal-600 text-xs font-medium active:scale-95 transition-transform border border-teal-100"
                          >
                            + Payment
                          </button>
                          <button
                            onClick={() => openEditLend(lend)}
                            className="w-9 h-9 rounded-lg bg-indigo-50 text-indigo-500 flex items-center justify-center active:scale-95 transition-transform"
                          >
                            <Pencil size={13} />
                          </button>
                          <button
                            onClick={async () => {
                              const updates = {
                                status: 'returned',
                                amountPaid: lend.amountOriginal || parseFloat(lend.amount),
                                amount: 0
                              };
                              setLendings(prev => {
                                const updated = prev.map(l => l.id === lend.id ? { ...l, ...updates } : l);
                                console.log('UPDATED LENDINGS AFTER RETURN:', updated);
                                return updated;
                              });
                              await updateLendingInDB(lend.id, updates);
                              showToast('Marked as fully returned! 🎉', 'success');
                            }}
                            className="flex-1 py-2 rounded-lg bg-green-50 text-green-600 text-xs font-medium active:scale-95 transition-transform border border-green-100"
                          >
                            Full ✓
                          </button>
                        </div>
                      )}

                      {lend.status === 'returned' && (
                        <button
                          onClick={async () => {
                            const updates = {
                              status: 'pending',
                              amountPaid: 0,
                              amount: lend.amountOriginal || parseFloat(lend.amount),
                              payments: []
                            };
                            setLendings(prev => prev.map(l => l.id === lend.id ? { ...l, ...updates } : l));
                            await updateLendingInDB(lend.id, updates);
                            showToast('Moved back to pending', 'info');
                          }}
                          className="w-full mt-2 py-2 rounded-lg bg-gray-50 text-gray-400 text-xs font-medium active:scale-95 transition-transform border border-gray-100"
                        >
                          Undo
                        </button>
                      )}

                      {lend.payments && lend.payments.length > 0 && (
                        <div className="mt-2 border-t border-gray-50 pt-2 ss-divider">
                          <button
                            onClick={() => setExpandedPayments(prev => ({ ...prev, [lend.id]: !prev[lend.id] }))}
                            className="flex items-center justify-between w-full text-xs text-gray-400 ss-text-muted"
                          >
                            <span>{lend.payments.length} payment{lend.payments.length > 1 ? 's' : ''}</span>
                            <ChevronDown size={12} className={`transition-transform duration-200 ${isExpandedPayments ? 'rotate-180' : ''}`} />
                          </button>
                          {isExpandedPayments && (
                            <div className="mt-1.5 space-y-1">
                              {lend.payments.map(p => (
                                <div key={p.id} className="flex items-center justify-between text-xs">
                                  <span className="text-gray-400 ss-text-muted">{getRelativeDateLabel(p.date)}{p.note ? ` · ${p.note}` : ''}</span>
                                  <span className="text-teal-500 font-medium">+{formatCurr(p.amount, sym)}</span>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}

      <AddLendModal isOpen={showAdd} onClose={()=>setShowAdd(false)} onAdd={addLend} settings={settings} lendings={lendings} showToast={showToast}/>
      
      <BottomSheet isOpen={showPaymentModal} onClose={() => { setShowPaymentModal(false); setPaymentTarget(null); }} title={`Record Payment — ${paymentTarget?.name}`}>
        <div className="space-y-4">
          <div>
            <label className="text-xs font-medium text-gray-500 ss-text-muted mb-1.5 block">Amount Returned</label>
            <div className="flex items-center bg-gray-50 rounded-xl px-3 ss-input">
              <span className="text-gray-400 text-sm mr-1">{sym}</span>
              <input
                type="number"
                inputMode="decimal"
                className="flex-1 bg-transparent py-3 text-sm outline-none ss-input"
                value={paymentForm.amount}
                onChange={e => setPaymentForm(p => ({ ...p, amount: e.target.value }))}
                placeholder="0"
                autoFocus
              />
            </div>
            {paymentTarget && (
              <p className="text-xs text-gray-400 ss-text-muted mt-1">
                Remaining: {formatCurr(paymentTarget.amountOriginal - paymentTarget.amountPaid, sym)}
              </p>
            )}
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 ss-text-muted mb-1.5 block">Date</label>
            <input
              type="date"
              className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm outline-none ss-input border border-gray-200"
              value={paymentForm.date}
              max={getTodayISO()}
              onChange={e => setPaymentForm(p => ({ ...p, date: e.target.value }))}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-gray-500 ss-text-muted mb-1.5 block">Note (optional)</label>
            <input
              type="text"
              className="w-full bg-gray-50 rounded-xl px-3 py-3 text-sm outline-none ss-input border border-gray-200"
              value={paymentForm.note}
              onChange={e => setPaymentForm(p => ({ ...p, note: e.target.value }))}
              placeholder="e.g. UPI, cash, bank transfer"
              maxLength={50}
            />
          </div>
          <button
            onClick={handleRecordPayment}
            className="w-full py-3.5 rounded-2xl bg-[#4ECDC4] text-white font-semibold text-sm active:scale-95 transition-transform mb-6"
          >
            Record Payment
          </button>
        </div>
      </BottomSheet>

      <ConfirmDialog isOpen={!!deleteId} title="Delete Lending?" message="This cannot be undone." confirmLabel="Delete" confirmColor="#FF6B6B" onConfirm={()=>deleteLend(deleteId)} onCancel={()=>setDeleteId(null)}/>
    </div>
  );
}
