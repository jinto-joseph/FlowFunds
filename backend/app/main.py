from datetime import datetime
import json
import os
from pathlib import Path

from dotenv import load_dotenv

# Load .env from the backend directory (parent of app/)
load_dotenv(Path(__file__).resolve().parents[1] / ".env")

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pywebpush import WebPushException, webpush

from .db import get_conn, init_db
from .schemas import ExpenseCreate, IncomeCreate, Summary


def resolve_allowed_origins() -> list[str]:
    defaults = {
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
    }
    env_value = os.getenv("FRONTEND_ORIGINS", "")
    # On Render, if FRONTEND_ORIGINS is not set yet, allow all temporarily
    # so the deployed frontend can still reach the API.
    if not env_value.strip() and os.getenv("RENDER") == "true":
        return ["*"]
    # Support "*" wildcard for open deployments
    if env_value.strip() == "*":
        return ["*"]
    extra = {item.strip() for item in env_value.split(",") if item.strip()}
    return sorted(defaults | extra)


def get_cors_config() -> dict:
    origins = resolve_allowed_origins()
    # When wildcard, credentials must be disabled (browser requirement)
    if origins == ["*"]:
        return {
            "allow_origins": ["*"],
            "allow_origin_regex": None,
            "allow_credentials": False,
        }
    return {
        "allow_origins": origins,
        "allow_origin_regex": r"https://.*\.vercel\.app",
        "allow_credentials": True,
    }


def get_vapid_config() -> dict[str, str | None]:
    private_key = os.getenv("VAPID_PRIVATE_KEY")
    # If value looks like a file path, resolve it relative to backend dir
    if private_key and not private_key.startswith("-----"):
        pem_path = (Path(__file__).resolve().parents[1] / private_key).resolve()
        if pem_path.exists():
            private_key = str(pem_path)
    return {
        "public_key": os.getenv("VAPID_PUBLIC_KEY"),
        "private_key": private_key,
        "claims": os.getenv("VAPID_CLAIMS", "mailto:admin@flowfunds.app"),
    }

app = FastAPI(title="FlowFunds API", version="0.1.0")

_cors = get_cors_config()
app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors["allow_origins"],
    allow_origin_regex=_cors["allow_origin_regex"],
    allow_credentials=_cors["allow_credentials"],
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup() -> None:
    init_db()


@app.get("/health")
def health() -> dict:
    return {"status": "ok", "service": "flowfunds-api"}


@app.get("/")
def root() -> dict:
    return {
        "service": "flowfunds-api",
        "status": "ok",
        "health": "/health",
        "docs": "/docs",
    }


@app.get("/config/push")
def push_config() -> dict:
    vapid = get_vapid_config()
    return {
        "public_key": vapid["public_key"],
        "configured": bool(vapid["public_key"] and vapid["private_key"]),
    }


@app.post("/income")
def add_income(payload: IncomeCreate) -> dict:
    with get_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO transactions (kind, amount, source, category, date, note)
            VALUES (?, ?, ?, NULL, ?, ?)
            """,
            ("income", payload.amount, payload.source, payload.date.isoformat(), payload.note),
        )
        conn.commit()
        return {"id": cursor.lastrowid, "message": "Income recorded"}


@app.post("/expense")
def add_expense(payload: ExpenseCreate) -> dict:
    with get_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO transactions (kind, amount, source, category, date, note)
            VALUES (?, ?, NULL, ?, ?, ?)
            """,
            ("expense", payload.amount, payload.category, payload.date.isoformat(), payload.note),
        )
        conn.commit()
        return {"id": cursor.lastrowid, "message": "Expense recorded"}


@app.get("/transactions")
def get_transactions() -> dict:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, kind, amount, source, category, date, note
            FROM transactions
            ORDER BY date DESC, id DESC
            """
        ).fetchall()

    transactions = [
        {
            "id": row["id"],
            "kind": row["kind"],
            "amount": row["amount"],
            "source": row["source"],
            "category": row["category"],
            "date": row["date"],
            "note": row["note"],
        }
        for row in rows
    ]

    return {"transactions": transactions}


@app.get("/loans")
def get_loans() -> dict:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, person, amount, note, borrowed_date, is_paid, paid_date
            FROM loans
            ORDER BY is_paid ASC, borrowed_date DESC, id DESC
            """
        ).fetchall()

    loans = [
        {
            "id": row["id"],
            "person": row["person"],
            "amount": float(row["amount"]),
            "note": row["note"] or "",
            "borrowed_date": row["borrowed_date"],
            "is_paid": bool(row["is_paid"]),
            "paid_date": row["paid_date"],
        }
        for row in rows
    ]

    outstanding_total = round(sum(item["amount"] for item in loans if not item["is_paid"]), 2)
    return {"loans": loans, "outstanding_total": outstanding_total}


@app.post("/loans")
def add_loan(payload: dict) -> dict:
    person = (payload.get("person") or "").strip()
    amount = float(payload.get("amount") or 0)
    note = (payload.get("note") or "").strip()
    borrowed_date = payload.get("borrowed_date") or datetime.utcnow().isoformat()

    if not person:
        raise HTTPException(status_code=400, detail="Person name is required")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    with get_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO loans (person, amount, note, borrowed_date, is_paid, paid_date)
            VALUES (?, ?, ?, ?, 0, NULL)
            """,
            (person, amount, note, borrowed_date),
        )
        conn.commit()

    return {"id": cursor.lastrowid, "message": "Loan entry created"}


@app.patch("/loans/{loan_id}")
def update_loan(loan_id: int, payload: dict) -> dict:
    paid = bool(payload.get("is_paid"))
    paid_date = datetime.utcnow().isoformat() if paid else None

    with get_conn() as conn:
        exists = conn.execute("SELECT id FROM loans WHERE id=?", (loan_id,)).fetchone()
        if not exists:
            raise HTTPException(status_code=404, detail="Loan not found")

        conn.execute(
            """
            UPDATE loans
            SET is_paid=?, paid_date=?
            WHERE id=?
            """,
            (1 if paid else 0, paid_date, loan_id),
        )
        conn.commit()

    return {"message": "Loan updated", "is_paid": paid}


@app.get("/summary", response_model=Summary)
def get_summary() -> Summary:
    with get_conn() as conn:
        income = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='income'").fetchone()[0]
        expense = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='expense'").fetchone()[0]

    return Summary(balance=income - expense, total_income=income, total_expense=expense)


@app.get("/analytics/category")
def get_category_analytics() -> dict:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT COALESCE(category, 'Misc') as category, SUM(amount) as amount
            FROM transactions
            WHERE kind='expense'
            GROUP BY COALESCE(category, 'Misc')
            ORDER BY amount DESC
            """
        ).fetchall()

    return {"categories": [{"category": row["category"], "amount": row["amount"]} for row in rows]}


@app.get("/analytics/daily-trend")
def get_daily_trend() -> dict:
    """Return daily expense totals for the last 30 days."""
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT substr(date, 1, 10) as day, SUM(amount) as amount
            FROM transactions
            WHERE kind='expense'
              AND date >= date('now', '-30 days')
            GROUP BY day
            ORDER BY day ASC
            """
        ).fetchall()

    return {"days": [{"day": row["day"], "amount": round(row["amount"], 2)} for row in rows]}


@app.get("/analytics/tips")
def get_spending_tips() -> dict:
    """Return simple rule-based spending tips."""
    with get_conn() as conn:
        income = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='income'").fetchone()[0]
        expense = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='expense'").fetchone()[0]
        category_rows = conn.execute(
            """
            SELECT COALESCE(category,'Misc') as category, SUM(amount) as amount
            FROM transactions WHERE kind='expense'
            GROUP BY category ORDER BY amount DESC LIMIT 1
            """
        ).fetchall()
        week_expense = conn.execute(
            """
            SELECT COALESCE(SUM(amount), 0) FROM transactions
            WHERE kind='expense' AND date >= date('now', '-7 days')
            """
        ).fetchone()[0]

    tips = []
    balance = income - expense

    if income > 0 and expense / income > 0.8:
        tips.append({"type": "warning", "text": f"You've spent {expense/income*100:.0f}% of all income received. Try to keep it under 80%."})

    if category_rows:
        top_cat = category_rows[0]["category"]
        top_amt = category_rows[0]["amount"]
        if income > 0 and top_amt / income > 0.3:
            tips.append({"type": "warning", "text": f"'{top_cat}' is your biggest spend at ₹{top_amt:.0f}. Consider setting a limit."})

    if balance > 0 and week_expense > balance * 0.5:
        tips.append({"type": "danger", "text": f"You spent ₹{week_expense:.0f} this week — over 50% of your current balance."})

    if balance > 0 and week_expense < balance * 0.1:
        tips.append({"type": "success", "text": "Great job! Your spending this week is very low relative to your balance."})

    if not tips:
        tips.append({"type": "info", "text": "Keep tracking your expenses to get personalised tips here."})

    return {"tips": tips}


@app.get("/predict/forecast")
def predict_forecast() -> dict:
    """7-day ML spending forecast using linear regression (numpy)."""
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT substr(date, 1, 10) as day, SUM(amount) as total
            FROM transactions WHERE kind='expense'
            GROUP BY day ORDER BY day ASC
            """
        ).fetchall()

    if len(rows) < 3:
        return {"forecast": [], "historical": [], "message": "Need at least 3 days of expense data."}

    try:
        import numpy as np
        from datetime import date as dt_date, timedelta

        historical = [{"day": r["day"], "actual": round(float(r["total"]), 2)} for r in rows]
        y = np.array([float(r["total"]) for r in rows], dtype=float)
        x = np.arange(len(y), dtype=float)

        coeffs = np.polyfit(x, y, deg=1)
        fitted = np.polyval(coeffs, x)
        std = float(np.std(y - fitted))

        last_date = dt_date.fromisoformat(rows[-1]["day"])
        forecast = []
        for i in range(1, 8):
            xi = float(len(y) + i - 1)
            pred = max(0.0, float(np.polyval(coeffs, xi)))
            forecast.append({
                "day": str(last_date + timedelta(days=i)),
                "predicted": round(pred, 2),
                "lower": round(max(0.0, pred - std), 2),
                "upper": round(pred + std, 2),
            })

        trend = "increasing" if coeffs[0] > 1.0 else "decreasing" if coeffs[0] < -1.0 else "stable"
        return {
            "forecast": forecast,
            "historical": historical[-14:],
            "std": round(std, 2),
            "trend": trend,
        }
    except ImportError:
        return {"forecast": [], "historical": [], "error": "numpy not installed"}
    except Exception as exc:
        return {"forecast": [], "historical": [], "error": str(exc)}


@app.get("/predict/financial-health")
def predict_financial_health() -> dict:
    """ML-style financial health guidance for next 7 days."""
    with get_conn() as conn:
        income = float(
            conn.execute(
                "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='income'"
            ).fetchone()[0]
        )
        expense = float(
            conn.execute(
                "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='expense'"
            ).fetchone()[0]
        )
        outstanding_loans = float(
            conn.execute(
                "SELECT COALESCE(SUM(amount), 0) FROM loans WHERE is_paid=0"
            ).fetchone()[0]
        )
        today_expense = float(
            conn.execute(
                "SELECT COALESCE(SUM(amount),0) FROM transactions WHERE kind='expense' AND date(date)=date('now')"
            ).fetchone()[0]
        )
        daily_rows = conn.execute(
            """
            SELECT date(date) as day,
                   SUM(CASE WHEN kind='income' THEN amount ELSE 0 END) as income,
                   SUM(CASE WHEN kind='expense' THEN amount ELSE 0 END) as expense
            FROM transactions
            WHERE date(date) >= date('now', '-30 days')
            GROUP BY date(date)
            ORDER BY day ASC
            """
        ).fetchall()

    balance = income - expense
    payback_ready = outstanding_loans > 0 and balance >= outstanding_loans

    daily_net = [float(row["income"] or 0) - float(row["expense"] or 0) for row in daily_rows]
    daily_expense = [float(row["expense"] or 0) for row in daily_rows]

    if daily_net:
        avg_daily_net = sum(daily_net) / len(daily_net)
    else:
        avg_daily_net = 0.0

    projected_balance_7d = balance + avg_daily_net * 7

    if daily_expense:
        exp_mean = sum(daily_expense) / len(daily_expense)
        variance = sum((item - exp_mean) ** 2 for item in daily_expense) / len(daily_expense)
        exp_std = variance ** 0.5
    else:
        exp_mean = 0.0
        exp_std = 0.0

    expense_spike = exp_std > 0 and today_expense > exp_mean + (2 * exp_std)

    # Keep a repay-first budget: if loans exist, protect that money first.
    spendable_after_loan = max(0.0, balance - outstanding_loans)
    recommended_daily_budget = spendable_after_loan / 7 if spendable_after_loan > 0 else max(0.0, balance / 14)

    burn_rate = (expense / income * 100) if income > 0 else None
    health_score = 100.0
    if balance < 0:
        health_score -= 40
    if outstanding_loans > 0:
        health_score -= 20
    if burn_rate and burn_rate > 85:
        health_score -= 20
    if expense_spike:
        health_score -= 10
    health_score = max(0.0, min(100.0, health_score))

    return {
        "balance": round(balance, 2),
        "outstanding_loans": round(outstanding_loans, 2),
        "payback_ready": payback_ready,
        "suggested_payback_amount": round(min(balance, outstanding_loans) if balance > 0 else 0.0, 2),
        "recommended_daily_budget": round(recommended_daily_budget, 2),
        "avg_daily_net": round(avg_daily_net, 2),
        "projected_balance_7d": round(projected_balance_7d, 2),
        "today_expense": round(today_expense, 2),
        "expense_spike": expense_spike,
        "burn_rate": round(burn_rate, 2) if burn_rate is not None else None,
        "health_score": round(health_score, 1),
        "generated_at": datetime.utcnow().isoformat(),
    }


@app.get("/analytics/patterns")
def get_spending_patterns() -> dict:
    """Day-of-week average spending pattern."""
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT
                CASE CAST(strftime('%w', date) AS INTEGER)
                    WHEN 0 THEN 'Sun' WHEN 1 THEN 'Mon' WHEN 2 THEN 'Tue'
                    WHEN 3 THEN 'Wed' WHEN 4 THEN 'Thu' WHEN 5 THEN 'Fri'
                    ELSE 'Sat'
                END as dow,
                CAST(strftime('%w', date) AS INTEGER) as dow_num,
                ROUND(AVG(amount), 2) as avg,
                COUNT(*) as count
            FROM transactions
            WHERE kind='expense'
            GROUP BY dow_num
            ORDER BY dow_num
            """
        ).fetchall()

    return {
        "day_of_week": [{"day": r["dow"], "avg": float(r["avg"]), "count": r["count"]} for r in rows]
    }


@app.get("/analytics/today")
def get_today_stats() -> dict:
    """Today, yesterday, and 7-day stats."""
    with get_conn() as conn:
        today = float(conn.execute(
            "SELECT COALESCE(SUM(amount),0) FROM transactions WHERE kind='expense' AND date(date)=date('now')"
        ).fetchone()[0])
        yesterday = float(conn.execute(
            "SELECT COALESCE(SUM(amount),0) FROM transactions WHERE kind='expense' AND date(date)=date('now','-1 day')"
        ).fetchone()[0])
        week_avg = float(conn.execute(
            """
            SELECT COALESCE(AVG(dt),0) FROM (
              SELECT SUM(amount) as dt FROM transactions
              WHERE kind='expense' AND date >= date('now','-7 days')
              GROUP BY date(date)
            )
            """
        ).fetchone()[0])
        week_total = float(conn.execute(
            "SELECT COALESCE(SUM(amount),0) FROM transactions WHERE kind='expense' AND date>=date('now','-7 days')"
        ).fetchone()[0])

    return {
        "today": round(today, 2),
        "yesterday": round(yesterday, 2),
        "week_avg": round(week_avg, 2),
        "week_total": round(week_total, 2),
    }


@app.get("/analytics/period")
def get_period_analysis(period: str = "weekly") -> dict:
    if period not in {"weekly", "monthly"}:
        raise HTTPException(status_code=400, detail="period must be weekly or monthly")

    window_days = 7 if period == "weekly" else 30
    start_expr = f"-{window_days - 1} days"

    with get_conn() as conn:
        income = float(
            conn.execute(
                f"""
                SELECT COALESCE(SUM(amount),0)
                FROM transactions
                WHERE kind='income' AND date(date) >= date('now', '{start_expr}')
                """
            ).fetchone()[0]
        )
        expense = float(
            conn.execute(
                f"""
                SELECT COALESCE(SUM(amount),0)
                FROM transactions
                WHERE kind='expense' AND date(date) >= date('now', '{start_expr}')
                """
            ).fetchone()[0]
        )

        cat_rows = conn.execute(
            f"""
            SELECT COALESCE(category,'Misc') as category, SUM(amount) as amount
            FROM transactions
            WHERE kind='expense' AND date(date) >= date('now', '{start_expr}')
            GROUP BY COALESCE(category,'Misc')
            ORDER BY amount DESC
            """
        ).fetchall()

        day_rows = conn.execute(
            f"""
            SELECT date(date) as day,
                   SUM(CASE WHEN kind='income' THEN amount ELSE 0 END) as income,
                   SUM(CASE WHEN kind='expense' THEN amount ELSE 0 END) as expense
            FROM transactions
            WHERE date(date) >= date('now', '{start_expr}')
            GROUP BY date(date)
            ORDER BY day ASC
            """
        ).fetchall()

    categories = []
    for row in cat_rows:
        amt = float(row["amount"])
        categories.append(
            {
                "category": row["category"],
                "amount": round(amt, 2),
                "percent": round((amt / expense * 100), 1) if expense > 0 else 0,
            }
        )

    top_category = categories[0] if categories else None
    daily = [
        {
            "day": row["day"],
            "income": round(float(row["income"]), 2),
            "expense": round(float(row["expense"]), 2),
        }
        for row in day_rows
    ]

    return {
        "period": period,
        "income": round(income, 2),
        "expense": round(expense, 2),
        "net": round(income - expense, 2),
        "top_category": top_category,
        "categories": categories,
        "daily": daily,
    }


@app.get("/predict/survival-days")
def predict_survival_days() -> dict:
    with get_conn() as conn:
        income = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='income'").fetchone()[0]
        expense = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='expense'").fetchone()[0]
        daily_rows = conn.execute(
            """
            SELECT substr(date, 1, 10) as day, SUM(amount) as total
            FROM transactions
            WHERE kind='expense'
            GROUP BY day
            ORDER BY day DESC
            LIMIT 14
            """
        ).fetchall()

    balance = income - expense
    if balance <= 0:
        return {"days_left": 0, "message": "Balance is exhausted."}

    if not daily_rows:
        return {"days_left": None, "message": "Not enough expense history yet."}

    avg_daily_expense = sum(float(row["total"]) for row in daily_rows) / len(daily_rows)

    if avg_daily_expense <= 0:
        return {"days_left": None, "message": "Not enough expense history yet."}

    days_left = int(balance // avg_daily_expense)

    return {
        "days_left": max(days_left, 0),
        "average_daily_expense": round(avg_daily_expense, 2),
        "generated_at": datetime.utcnow().isoformat(),
    }


@app.post("/push/subscribe")
def add_push_subscription(payload: dict) -> dict:
    endpoint = payload.get("endpoint")
    keys = payload.get("keys", {})
    p256dh = keys.get("p256dh")
    auth = keys.get("auth")

    if not endpoint or not p256dh or not auth:
        raise HTTPException(status_code=400, detail="Invalid push subscription payload")

    with get_conn() as conn:
        conn.execute(
            """
            INSERT INTO push_subscriptions (endpoint, p256dh, auth, created_at)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(endpoint) DO UPDATE SET
              p256dh=excluded.p256dh,
              auth=excluded.auth
            """,
            (endpoint, p256dh, auth, datetime.utcnow().isoformat()),
        )
        conn.commit()

    return {"message": "Subscription saved"}


@app.post("/push/send-test")
def send_test_push(payload: dict | None = None) -> dict:
    vapid = get_vapid_config()
    if not vapid["public_key"] or not vapid["private_key"]:
        raise HTTPException(status_code=400, detail="VAPID keys are not configured")

    body = {
        "title": "FlowFunds alert",
        "message": "This is a test push notification.",
    }
    if payload:
        body.update(payload)

    sent = 0
    removed = 0
    failures = 0

    with get_conn() as conn:
        rows = conn.execute("SELECT endpoint, p256dh, auth FROM push_subscriptions").fetchall()
        for row in rows:
            subscription = {
                "endpoint": row["endpoint"],
                "keys": {"p256dh": row["p256dh"], "auth": row["auth"]},
            }
            try:
                webpush(
                    subscription_info=subscription,
                    data=json.dumps(body),
                    vapid_private_key=vapid["private_key"],
                    vapid_claims={"sub": vapid["claims"]},
                )
                sent += 1
            except WebPushException as exc:
                status_code = getattr(exc.response, "status_code", None) if getattr(exc, "response", None) else None
                failures += 1
                if status_code in {404, 410}:
                    conn.execute("DELETE FROM push_subscriptions WHERE endpoint=?", (row["endpoint"],))
                    removed += 1
        conn.commit()

    return {"sent": sent, "removed": removed, "failures": failures}
