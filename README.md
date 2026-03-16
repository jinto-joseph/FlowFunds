# FlowFunds 💸

> Smart student expense tracker — WebGL animated, PWA-ready, ML-powered.

## Tech Stack
| Layer | Stack |
|---|---|
| Frontend | React 18 + Vite + Tailwind + Recharts + Three.js |
| Backend | FastAPI + SQLite + python-dotenv + numpy |
| PWA | Vite PWA plugin + Workbox service worker |
| Animation | Three.js WebGL particle network (mouse-interactive) |

---

## Local Development

### 1. Backend
```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env   # fill in VAPID keys
PYTHONPATH=$(pwd) uvicorn app.main:app --reload --port 8000
```

### 2. Frontend
```bash
cd frontend
npm install
cp .env.example .env.local   # set VITE_API_BASE for production
npm run dev
```

---

## Free Hosting

### Backend → Render (free tier)
1. Push repo to GitHub
2. render.com → New Web Service → connect repo
3. Root Dir: `backend` | Build: `pip install -r requirements.txt` | Start: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
4. Add env vars: `FRONTEND_ORIGINS`, `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_CLAIMS`

### Frontend → Vercel (free tier)
1. vercel.com → New Project → import repo
2. Root Dir: `frontend` | Framework: Vite | Output: `dist`
3. Add env var: `VITE_API_BASE=https://your-backend.onrender.com`

---

## Features
- 📊 Animated dashboard (income, expense, balance, survival days)
- 🌐 WebGL particle constellation (mouse-interactive, balance-reactive colors)
- 🚨 Emergency low-balance alert with survival days countdown
- 🤖 ML 7-day spending forecast (numpy linear regression + confidence bands)
- 📅 Day-of-week spending patterns
- 💸 Loan/payback tracker — income prompt when debts are pending
- 📈 Weekly & Monthly category insights (pie chart + progress bars)
- 🔔 Web Push notifications (VAPID)
- 📱 PWA — installable, offline support
