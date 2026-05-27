# 💸 SpendSense — Student Finance App

> A beautiful, mobile-first Personal Finance PWA built for students. Track expenses, manage lendings, set savings goals, and get AI-powered financial insights — all offline-capable and installable as a native Android app.

[![Live Demo](https://img.shields.io/badge/Live%20Demo-Vercel-black?logo=vercel)](https://spendsense-akshay-jadhavs-projects-b3a18432.vercel.app)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![Vite](https://img.shields.io/badge/Vite-6-646CFF?logo=vite)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind-3-38BDF8?logo=tailwindcss)](https://tailwindcss.com)
[![Supabase](https://img.shields.io/badge/Supabase-DB-3ECF8E?logo=supabase)](https://supabase.com)
[![PWA](https://img.shields.io/badge/PWA-Ready-blueviolet?logo=googlechrome)](https://web.dev/progressive-web-apps/)

---

## ✨ Features

### 🏠 Home Tab
- Personalized greeting with current month spending
- Live budget progress bar with daily allowance
- 6-month spending sparkline chart
- Daily streak tracker
- Quick-access recent transactions
- Pending lendings summary card

### 💳 Expenses Tab
- Add expenses with category, amount, description, date & receipt photo
- Month navigator with category filter chips
- Search and sort (newest / oldest / highest)
- Swipe-to-delete and bulk select/delete
- Fullscreen receipt viewer (React Portal-based)

### 🤝 Lend Tab
- **Grouped Lending View** — Lendings grouped by person, one card per borrower
- Expandable group card shows total outstanding + all individual transactions
- Record partial or full repayments with per-transaction payment history
- Full ✓ and Undo buttons with instant status updates
- WhatsApp remind button with pre-filled debt message
- Contact picker integration for quick add on mobile
- **Supabase-backed persistence** — lendings sync across all devices & sessions
- Offline fallback to `localStorage` if Supabase is unavailable

### 📊 Summary Tab
- Monthly stats grid (total, average, highest, transactions)
- Category bar chart with percentage breakdown
- 6-month SVG line chart with trend indicator
- AI-generated financial insights
- Savings goals with progress bars and top-up modal

### 🤖 AI Chat
- Rule-based AI financial advisor with contextual insights
- Quick-prompt chips (spending tips, saving goals, etc.)
- Typing indicator animation

### ⚙️ Settings Sheet
- Name, currency symbol & budget configuration
- Dark / light / system theme toggle
- Recurring expenses management
- Export (JSON) / Import / Clear data
- App version display

---

## 🛠 Tech Stack

| Layer | Technology |
|-------|------------|
| Framework | React 18 + Vite 6 |
| Styling | Tailwind CSS 3 |
| Icons | Lucide React |
| Lendings DB | Supabase (PostgreSQL + RLS) |
| Local Storage | `localStorage` for expenses, settings, goals |
| Auth | Supabase Auth (graceful fallback to Guest Mode) |
| PWA | Custom Service Worker + Web App Manifest |
| Android | Bubblewrap CLI (TWA) |
| Deployment | Vercel |

---

## 🔐 Environment Variables

To enable Supabase persistence for lendings, add these to your Vercel project settings (or a `.env` file locally):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
```

> Without these, the app runs in **Guest Mode** — expenses and settings still work via `localStorage`, but lendings won't persist across devices.

### Supabase Table Setup

Run this SQL in your Supabase **SQL Editor**:

```sql
create table lendings (
  id text primary key,
  name text,
  phone text,
  amount numeric,
  amount_original numeric,
  amount_paid numeric default 0,
  payments jsonb default '[]',
  reason text,
  date text,
  status text default 'pending',
  created_at timestamp default now()
);

alter table lendings enable row level security;

create policy "Allow all" on lendings
  for all using (true) with check (true);
```

---

## 📁 Project Structure

```
src/
├── SpendSense.jsx          # App shell, state, Supabase load/sync, ErrorBoundary
├── main.jsx                # React root entry
├── index.css               # Global + Tailwind
├── supabaseClient.js       # Supabase client initialization
├── utils.js                # Formatting, date, ID helpers
├── components/
│   └── GlobalComponents.jsx  # BottomSheet, BottomNav, ConfirmDialog, Toast
└── views/
    ├── HomeView.jsx          # Home tab
    ├── ExpensesView.jsx      # Expenses tab + AddExpenseModal
    ├── LendView.jsx          # Grouped Lend tab + Supabase CRUD + repayment logic
    ├── SummaryView.jsx       # Summary tab + AddGoalModal
    ├── AiInsightsView.jsx    # AI Chat tab
    └── SettingsSheet.jsx     # Settings bottom sheet
public/
├── manifest.json            # PWA manifest
├── sw.js                    # Service worker (offline cache)
├── icon-192.png             # PWA icon
├── icon-512.png             # PWA icon
└── .well-known/
    └── assetlinks.json      # Digital Asset Links (Android TWA)
vercel.json                  # SPA routing rules for Vercel deployment
```

---

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- npm 9+

### Run Locally

```bash
git clone https://github.com/akshayjadhav237237-cmd/spend-sense-v1.1.git
cd spend-sense-v1.1
npm install
npm run dev
```

App runs at `http://localhost:5173`

### Build for Production

```bash
npm run build
```

---

## 📱 Android APK

SpendSense ships as a **TWA (Trusted Web Activity)** Android app built with [Bubblewrap](https://github.com/GoogleChromeLabs/bubblewrap).

### Build the APK yourself

```bash
# Install Bubblewrap
npm install -g @bubblewrap/cli

# Initialize (downloads JDK + Android SDK automatically)
mkdir spendsense-apk && cd spendsense-apk
bubblewrap init --manifest https://spendsense-akshay-jadhavs-projects-b3a18432.vercel.app/manifest.json

# Build signed APK + AAB
bubblewrap build
```

Output files:
- `app-release-signed.apk` — install directly on Android
- `app-release-bundle.aab` — submit to Google Play Store

### Digital Asset Links
The `/.well-known/assetlinks.json` is deployed on Vercel to verify domain ownership and **hide the browser URL bar** in the TWA.

---

## 🧠 Key Design Decisions

| Decision | Reason |
|----------|--------|
| Supabase for lendings | Persistent cross-device sync — returned lendings never disappear |
| `localStorage` for everything else | Zero backend complexity for expenses/settings/goals |
| Graceful Supabase fallback | App boots into Guest Mode if keys are missing or Supabase is offline |
| Grouping via `useMemo` | Person-grouped lending computed on the fly from filtered list |
| React class `ErrorBoundary` | Catches rendering crashes → recovery screen instead of blank page |
| `try/catch` on all async handlers | Prevents state corruption on failed DB ops or bad input |
| Object maps for UI state (`expandedPersons`, `expandedPayments`) | Avoids illegal `useState` inside `.map()` (Rules of Hooks) |
| React Portal for receipt viewer | Bypasses CSS stacking context issues from bottom sheets |

---

## 🌐 Deployment

Deployed on **Vercel** with automatic production builds on every push to `main`.

🔗 **Live URL:** https://spendsense-akshay-jadhavs-projects-b3a18432.vercel.app

---

## 📄 License & Code of Conduct

- **License:** Distributed under the **Apache License 2.0**. See [LICENSE](LICENSE) for details.
- **Code of Conduct:** We expect all participants to adhere to our [Code of Conduct](CODE_OF_CONDUCT.md).
