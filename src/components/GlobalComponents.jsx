import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Home, Receipt, Handshake, BarChart2, Sparkles, CheckCircle, AlertCircle, Info, X, WifiOff, ContactRound } from 'lucide-react';
import { useFocusTrap } from '../utils.js';

/* ─── Offline Banner ─────────────────────────────────────────────────────── */
export const OfflineBanner = () => {
  // Default to true (online) — never flash the banner on initial load
  const [isOnline, setIsOnline] = useState(true);
  useEffect(() => {
    const goOffline = () => setIsOnline(false);
    const goOnline  = () => setIsOnline(true);
    window.addEventListener('offline', goOffline);
    window.addEventListener('online',  goOnline);
    // Grace period: only check actual state after 2 s to avoid false positives
    const timer = setTimeout(() => { if (!navigator.onLine) setIsOnline(false); }, 2000);
    return () => {
      window.removeEventListener('offline', goOffline);
      window.removeEventListener('online',  goOnline);
      clearTimeout(timer);
    };
  }, []);
  if (isOnline) return null;
  return (
    <div role="status" aria-live="polite"
      className="fixed top-0 left-0 right-0 w-full z-50 bg-yellow-400 text-yellow-900 text-xs text-center py-1.5 font-medium flex items-center justify-center gap-1.5">
      <WifiOff size={12} /><span>You're offline – data is saved locally</span>
    </div>
  );
};

/* ─── Confirm Dialog ─────────────────────────────────────────────────────── */
export const ConfirmDialog = ({ isOpen, title, message, confirmLabel = 'Confirm', confirmColor = '#FF6B6B', onConfirm, onCancel }) => {
  const ref = useRef(null);
  useFocusTrap(ref, isOpen);
  useEffect(() => {
    if (!isOpen) return;
    const h = (e) => e.key === 'Escape' && onCancel?.();
    document.addEventListener('keydown', h);
    return () => document.removeEventListener('keydown', h);
  }, [isOpen, onCancel]);
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4 animate-fade-in" aria-modal="true" role="dialog" aria-labelledby="confirm-title">
      <div className="absolute inset-0 bg-black/50" aria-hidden="true" onClick={onCancel} />
      <div ref={ref} className="relative bg-white rounded-2xl p-6 shadow-2xl max-w-[320px] w-full animate-scale-in ss-card ss-text">
        <h3 id="confirm-title" className="font-semibold text-gray-900 text-base mb-2 ss-text">{title}</h3>
        <p className="text-sm text-gray-500 mb-5 ss-text-muted">{message}</p>
        <div className="flex gap-2">
          <button onClick={onCancel} className="flex-1 py-2.5 rounded-xl border border-gray-200 text-sm font-medium text-gray-600 active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 ss-chip-inactive">Cancel</button>
          <button onClick={onConfirm} className="flex-1 py-2.5 rounded-xl text-sm font-medium text-white active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1" style={{ background: confirmColor }}>{confirmLabel}</button>
        </div>
      </div>
    </div>
  );
};

/* ─── Toast ──────────────────────────────────────────────────────────────── */
export const Toast = ({ toast }) => {
  if (!toast) return null;
  const icons = { success: <CheckCircle size={16} />, error: <AlertCircle size={16} />, info: <Info size={16} /> };
  const bg = { success: 'bg-[#51CF66]', error: 'bg-[#FF6B6B]', info: 'bg-gray-800' };
  return (
    <div role="status" aria-live="polite" aria-atomic="true"
      className="fixed bottom-28 left-1/2 -translate-x-1/2 z-[100] animate-slide-up">
      <div className={`${bg[toast.type] || bg.info} text-white rounded-full px-5 py-2.5 shadow-lg text-sm font-medium flex items-center gap-2 whitespace-nowrap`}>
        {icons[toast.type]}{toast.msg}
      </div>
    </div>
  );
};

/* ─── Bottom Sheet ───────────────────────────────────────────────────────── */
export const BottomSheet = ({ isOpen, onClose, title, children }) => {
  const sheetRef = useRef(null);
  useFocusTrap(sheetRef, isOpen);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 max-w-[430px] mx-auto">
      <div
        className="absolute inset-0 bg-black/40 animate-fade-in"
        aria-hidden="true"
        onClick={onClose}
      />
      <div
        ref={sheetRef}
        className="absolute bottom-0 left-0 right-0 bg-white rounded-t-3xl animate-slide-up ss-bottom-sheet ss-text"
        style={{ maxHeight: '90vh', overflowY: 'auto', paddingBottom: '140px' }}
      >
        <div className="w-10 h-1 rounded-full bg-gray-200 mx-auto mt-3 mb-4 ss-drag-handle" />
        {title && (
          <div className="flex items-center justify-between px-4 mb-4">
            <h2 className="font-semibold text-base ss-text">{title}</h2>
            <button
              onClick={onClose}
              aria-label="Close modal"
              className="w-8 h-8 rounded-full bg-gray-100 flex items-center justify-center active:scale-95 transition-transform focus-visible:ring-2 focus-visible:ring-indigo-500"
            >
              <X size={16} />
            </button>
          </div>
        )}
        <div className="px-4">
          {children}
        </div>
      </div>
    </div>
  );
};

/* ─── Floating Action Button ─────────────────────────────────────────────── */
export const FloatingActionButton = ({ onClick, icon: Icon, colorClass = 'bg-[#6C63FF]', ariaLabel }) => (
  <button onClick={onClick} aria-label={ariaLabel}
    className={`fixed bottom-24 right-5 z-30 w-14 h-14 rounded-full ${colorClass} text-white shadow-lg flex items-center justify-center active:scale-95 transition-all duration-100 hover:shadow-xl focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2`}>
    <Icon size={24} />
  </button>
);

/* ─── Contact Picker Hook ────────────────────────────────────────────────── */
export const useContactPicker = (onSuccess, showToast) => {
  const isSupported = typeof navigator !== 'undefined' && 'contacts' in navigator && 'ContactsManager' in window;
  const pickContact = useCallback(async () => {
    if (!isSupported) { showToast('Contact picker not supported on this browser', 'info'); return; }
    try {
      const contacts = await navigator.contacts.select(['name', 'tel'], { multiple: false });
      if (!contacts || contacts.length === 0) return;
      const contact = contacts[0];
      const name  = contact.name?.[0]?.trim() ?? '';
      const rawTel = contact.tel?.[0] ?? '';
      const phone = rawTel.replace(/[^\d+]/g, '').replace(/(?!^\+)\+/g, '');
      if (!name) { showToast('No name found in contact', 'error'); return; }
      onSuccess({ name, phone });
      showToast(`Imported: ${name}`, 'success');
    } catch (err) {
      if (err.name === 'SecurityError') showToast('Contact access denied', 'error');
      else if (err.name === 'InvalidStateError') showToast('Contact picker already open', 'info');
      else showToast('Could not open contacts', 'error');
    }
  }, [isSupported, onSuccess, showToast]);
  return { pickContact, isSupported };
};

/* ─── Bottom Nav ─────────────────────────────────────────────────────────── */
const NAV_TABS = [
  { id: 'home',     label: 'Home',     Icon: Home },
  { id: 'expenses', label: 'Expenses', Icon: Receipt },
  { id: 'lend',     label: 'Lend',     Icon: Handshake },
  { id: 'summary',  label: 'Summary',  Icon: BarChart2 },
  { id: 'chat',     label: 'AI Chat',  Icon: Sparkles },
];

export const BottomNav = ({ activeTab, setActiveTab }) => (
  <nav
    className="fixed bottom-0 left-0 right-0 w-full bg-white border-t border-gray-100 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] z-40 ss-bottom-nav"
    style={{ paddingBottom: 'calc(12px + env(safe-area-inset-bottom))' }}
    aria-label="Main navigation"
  >
    <div className="flex items-center justify-around pt-2 px-1">
      {NAV_TABS.map(({ id, label, Icon }) => {
        const active = activeTab === id;
        return (
          <button key={id} onClick={() => setActiveTab(id)}
            aria-label={label} aria-current={active ? 'page' : undefined}
            className="flex flex-col items-center gap-0.5 min-w-[44px] min-h-[44px] justify-center rounded-xl transition-all duration-200 px-2 focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-1 active:scale-95">
            {/* Pill background when active */}
            <div className={`flex items-center justify-center w-9 h-7 rounded-lg transition-all duration-200 ${active ? 'bg-indigo-100' : 'bg-transparent'}`}>
              <Icon
                size={20}
                className={`transition-colors duration-200 ${active ? 'text-[#6C63FF]' : 'text-gray-400'}`}
                strokeWidth={active ? 2.2 : 1.8}
              />
            </div>
            <span className={`text-[10px] font-medium transition-colors duration-200 ${active ? 'text-[#6C63FF]' : 'text-gray-400'}`}>{label}</span>
            {active && <span className="w-1 h-1 rounded-full bg-[#6C63FF] animate-scale-in" />}
          </button>
        );
      })}
    </div>
  </nav>
);
