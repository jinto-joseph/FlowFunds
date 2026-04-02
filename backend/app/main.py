import base64
from datetime import date as dt_date
from datetime import datetime, timedelta
import json
import os
from pathlib import Path
import re

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

    # Normalize common environment formats:
    # - multiline PEM
    # - escaped newlines (\n)
    # - base64 payload prefixed with "base64:"
    # - raw one-line base64 body without BEGIN/END markers
    if private_key:
        private_key = private_key.strip().strip("\"").strip("'")

        if private_key.startswith("base64:"):
            try:
                decoded = base64.b64decode(private_key.split(":", 1)[1].encode("utf-8"))
                private_key = decoded.decode("utf-8")
            except Exception:
                private_key = None

        # Also support plain base64 payloads (without "base64:" prefix),
        # which often start with "LS0t" when users copy from base64 output.
        if private_key and not private_key.startswith("-----"):
            compact_candidate = "".join(private_key.split())
            if compact_candidate and all(ch.isalnum() or ch in "+/=" for ch in compact_candidate):
                try:
                    decoded_candidate = base64.b64decode(compact_candidate.encode("utf-8"), validate=True).decode("utf-8")
                    if "BEGIN PRIVATE KEY" in decoded_candidate:
                        private_key = decoded_candidate
                except Exception:
                    pass

        if private_key and "\\n" in private_key and "BEGIN" in private_key:
            private_key = private_key.replace("\\n", "\n")

        if private_key and (not private_key.startswith("-----")):
            compact = "".join(private_key.split())
            # If it looks like a raw PKCS8 body, wrap it as PEM.
            if compact and all(ch.isalnum() or ch in "+/=" for ch in compact) and len(compact) > 120:
                lines = [compact[i:i + 64] for i in range(0, len(compact), 64)]
                private_key = "-----BEGIN PRIVATE KEY-----\n" + "\n".join(lines) + "\n-----END PRIVATE KEY-----"
            else:
                private_key = private_key

        if private_key and not private_key.startswith("-----"):
            pem_path = (Path(__file__).resolve().parents[1] / private_key).resolve()
            if pem_path.exists():
                private_key = str(pem_path)
            else:
                private_key = None

        if private_key and private_key.startswith("-----"):
            private_key = normalize_private_key_pem(private_key)

        # Validate key shape early to avoid runtime ASN.1 crashes during push send.
        if private_key and private_key.startswith("-----"):
            try:
                from cryptography.hazmat.primitives import serialization

                serialization.load_pem_private_key(private_key.encode("utf-8"), password=None)
            except Exception:
                private_key = None
    return {
        "public_key": os.getenv("VAPID_PUBLIC_KEY"),
        "private_key": private_key,
        "claims": os.getenv("VAPID_CLAIMS", "mailto:admin@flowfunds.app"),
    }


def normalize_private_key_pem(value: str) -> str | None:
    text = value.strip().replace("\r", "")
    match = re.search(
        r"-----BEGIN PRIVATE KEY-----(.*?)-----END PRIVATE KEY-----",
        text,
        flags=re.DOTALL,
    )
    if not match:
        return None

    body = match.group(1)
    compact = "".join(ch for ch in body if ch.isalnum() or ch in "+/=")
    if not compact:
        return None
    lines = [compact[i:i + 64] for i in range(0, len(compact), 64)]
    return "-----BEGIN PRIVATE KEY-----\n" + "\n".join(lines) + "\n-----END PRIVATE KEY-----"


def parse_iso_date(value: str | None) -> dt_date | None:
    if not value:
        return None
    try:
        return dt_date.fromisoformat(value[:10])
    except ValueError:
        return None


def add_frequency_days(start: dt_date, frequency: str) -> dt_date:
    return start + timedelta(days=7 if frequency == "weekly" else 30)


def roll_due_date_forward(due: dt_date, frequency: str, today: dt_date) -> dt_date:
    next_due = due
    while next_due < today:
        next_due = add_frequency_days(next_due, frequency)
    return next_due

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
    bucket = payload.income_bucket if payload.income_bucket in {"cash_in_hand", "bank_account"} else "cash_in_hand"
    with get_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO transactions (kind, amount, source, income_bucket, category, date, note)
            VALUES (?, ?, ?, ?, NULL, ?, ?)
            """,
            ("income", payload.amount, payload.source, bucket, payload.date.isoformat(), payload.note),
        )
        conn.commit()
        return {"id": cursor.lastrowid, "message": "Income recorded"}


@app.post("/expense")
def add_expense(payload: ExpenseCreate) -> dict:
    bucket = payload.expense_bucket if payload.expense_bucket in {"cash_in_hand", "bank_account"} else "cash_in_hand"
    with get_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO transactions (kind, amount, source, income_bucket, category, date, note)
            VALUES (?, ?, NULL, ?, ?, ?, ?)
            """,
            ("expense", payload.amount, bucket, payload.category, payload.date.isoformat(), payload.note),
        )
        conn.commit()
        return {"id": cursor.lastrowid, "message": "Expense recorded"}


@app.get("/transactions")
def get_transactions() -> dict:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, kind, amount, source, income_bucket, category, date, note
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
            "income_bucket": row["income_bucket"],
            "expense_bucket": row["income_bucket"] if row["kind"] == "expense" else None,
            "category": row["category"],
            "date": row["date"],
            "note": row["note"],
        }
        for row in rows
    ]

    return {"transactions": transactions}


@app.patch("/transactions/{transaction_id}")
def update_transaction(transaction_id: int, payload: dict) -> dict:
    allowed = {"kind", "amount", "source", "income_bucket", "expense_bucket", "category", "date", "note"}
    incoming = {k: payload[k] for k in payload if k in allowed}
    if not incoming:
        raise HTTPException(status_code=400, detail="No valid fields to update")

    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, kind, amount, source, income_bucket, category, date, note FROM transactions WHERE id=?",
            (transaction_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Transaction not found")

        kind = incoming.get("kind", row["kind"])
        if kind not in {"income", "expense"}:
            raise HTTPException(status_code=400, detail="kind must be income or expense")

        try:
            amount = float(incoming.get("amount", row["amount"]))
        except (TypeError, ValueError):
            raise HTTPException(status_code=400, detail="Amount must be a number")
        if amount <= 0:
            raise HTTPException(status_code=400, detail="Amount must be greater than 0")

        date_value = incoming.get("date", row["date"])
        if parse_iso_date(date_value) is None:
            raise HTTPException(status_code=400, detail="Invalid date")

        source = incoming.get("source", row["source"])
        income_bucket = incoming.get("income_bucket", row["income_bucket"])
        expense_bucket = incoming.get("expense_bucket", row["income_bucket"])
        category = incoming.get("category", row["category"])
        note = incoming.get("note", row["note"]) or ""

        if kind == "income":
            source = source or "Other"
            income_bucket = income_bucket if income_bucket in {"cash_in_hand", "bank_account"} else "cash_in_hand"
            category = None
        else:
            category = category or "Misc"
            source = None
            income_bucket = expense_bucket if expense_bucket in {"cash_in_hand", "bank_account"} else "cash_in_hand"

        conn.execute(
            """
            UPDATE transactions
            SET kind=?, amount=?, source=?, income_bucket=?, category=?, date=?, note=?
            WHERE id=?
            """,
            (kind, amount, source, income_bucket, category, date_value, note, transaction_id),
        )
        conn.commit()

    return {"message": "Transaction updated"}


@app.get("/loans")
def get_loans() -> dict:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, person, amount, note, borrowed_date, due_date, is_paid, paid_date
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
            "due_date": row["due_date"],
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
    due_date = payload.get("due_date")

    if not person:
        raise HTTPException(status_code=400, detail="Person name is required")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")

    parsed_borrowed = parse_iso_date(borrowed_date) or dt_date.today()
    parsed_due = parse_iso_date(due_date)
    if parsed_due is None:
        parsed_due = parsed_borrowed + timedelta(days=30)

    with get_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO loans (person, amount, note, borrowed_date, due_date, is_paid, paid_date)
            VALUES (?, ?, ?, ?, ?, 0, NULL)
            """,
            (person, amount, note, borrowed_date, parsed_due.isoformat()),
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


@app.get("/predict/payback-plan")
def get_payback_plan() -> dict:
    with get_conn() as conn:
        income = float(conn.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='income'").fetchone()[0])
        expense = float(conn.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='expense'").fetchone()[0])
        rows = conn.execute(
            """
            SELECT id, person, amount, borrowed_date, due_date
            FROM loans
            WHERE is_paid=0
            ORDER BY due_date ASC, borrowed_date ASC
            """
        ).fetchall()

    balance = income - expense
    today = dt_date.today()
    plan_items = []
    total_outstanding = 0.0
    total_daily_target = 0.0

    for row in rows:
        borrowed = parse_iso_date(row["borrowed_date"]) or today
        due = parse_iso_date(row["due_date"]) or (borrowed + timedelta(days=30))
        days_left = max((due - today).days, 1)
        amount = float(row["amount"])
        daily_target = amount / days_left
        total_outstanding += amount
        total_daily_target += daily_target
        plan_items.append(
            {
                "id": row["id"],
                "person": row["person"],
                "amount": round(amount, 2),
                "due_date": due.isoformat(),
                "days_left": days_left,
                "daily_target": round(daily_target, 2),
                "risk": "high" if days_left <= 3 else "medium" if days_left <= 10 else "normal",
            }
        )

    can_clear_now = total_outstanding > 0 and balance >= total_outstanding
    recommended_daily = max(total_daily_target, 0.0)
    affordable_daily = max(balance, 0.0) / 30 if balance > 0 else 0.0

    return {
        "balance": round(balance, 2),
        "outstanding_total": round(total_outstanding, 2),
        "can_clear_now": can_clear_now,
        "suggested_lump_sum": round(min(balance, total_outstanding) if balance > 0 else 0.0, 2),
        "recommended_daily_target": round(recommended_daily, 2),
        "affordable_daily_target": round(affordable_daily, 2),
        "on_track": affordable_daily >= recommended_daily if recommended_daily > 0 else True,
        "plan": plan_items,
    }


def refresh_bill_due_dates(conn) -> None:
    today = dt_date.today()
    rows = conn.execute(
        "SELECT id, frequency, next_due_date FROM recurring_bills WHERE is_active=1"
    ).fetchall()
    for row in rows:
        due = parse_iso_date(row["next_due_date"])
        if due is None:
            continue
        fresh_due = roll_due_date_forward(due, row["frequency"], today)
        if fresh_due != due:
            conn.execute(
                "UPDATE recurring_bills SET next_due_date=? WHERE id=?",
                (fresh_due.isoformat(), row["id"]),
            )
    conn.commit()


@app.get("/bills")
def get_bills() -> dict:
    with get_conn() as conn:
        refresh_bill_due_dates(conn)
        rows = conn.execute(
            """
            SELECT id, name, amount, frequency, next_due_date, note, is_active, last_paid_date, created_at
            FROM recurring_bills
            ORDER BY is_active DESC, next_due_date ASC, id DESC
            """
        ).fetchall()

    today = dt_date.today()
    bills = []
    for row in rows:
        due = parse_iso_date(row["next_due_date"]) or today
        days_left = (due - today).days
        bills.append(
            {
                "id": row["id"],
                "name": row["name"],
                "amount": round(float(row["amount"]), 2),
                "frequency": row["frequency"],
                "next_due_date": row["next_due_date"],
                "note": row["note"] or "",
                "is_active": bool(row["is_active"]),
                "last_paid_date": row["last_paid_date"],
                "created_at": row["created_at"],
                "days_left": days_left,
                "due_soon": days_left <= 3,
            }
        )

    return {"bills": bills}


@app.post("/bills")
def add_bill(payload: dict) -> dict:
    name = (payload.get("name") or "").strip()
    amount = float(payload.get("amount") or 0)
    frequency = (payload.get("frequency") or "monthly").strip().lower()
    next_due_date = payload.get("next_due_date") or dt_date.today().isoformat()
    note = (payload.get("note") or "").strip()

    if not name:
        raise HTTPException(status_code=400, detail="Bill name is required")
    if amount <= 0:
        raise HTTPException(status_code=400, detail="Amount must be greater than 0")
    if frequency not in {"weekly", "monthly"}:
        raise HTTPException(status_code=400, detail="Frequency must be weekly or monthly")
    parsed_due = parse_iso_date(next_due_date)
    if parsed_due is None:
        raise HTTPException(status_code=400, detail="Invalid next due date")

    with get_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO recurring_bills (name, amount, frequency, next_due_date, note, is_active, created_at)
            VALUES (?, ?, ?, ?, ?, 1, ?)
            """,
            (name, amount, frequency, parsed_due.isoformat(), note, datetime.utcnow().isoformat()),
        )
        conn.commit()

    return {"id": cursor.lastrowid, "message": "Recurring bill added"}


@app.patch("/bills/{bill_id}")
def update_bill(bill_id: int, payload: dict) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, frequency, next_due_date, is_active FROM recurring_bills WHERE id=?",
            (bill_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Bill not found")

        is_active = row["is_active"]
        next_due = parse_iso_date(row["next_due_date"]) or dt_date.today()
        frequency = row["frequency"]
        last_paid_date = None

        if "is_active" in payload:
            is_active = 1 if bool(payload.get("is_active")) else 0

        if payload.get("mark_paid"):
            last_paid_date = dt_date.today().isoformat()
            next_due = add_frequency_days(next_due, frequency)

        if payload.get("next_due_date"):
            parsed_next_due = parse_iso_date(payload.get("next_due_date"))
            if parsed_next_due is None:
                raise HTTPException(status_code=400, detail="Invalid next due date")
            next_due = parsed_next_due

        conn.execute(
            """
            UPDATE recurring_bills
            SET is_active=?, next_due_date=?, last_paid_date=COALESCE(?, last_paid_date)
            WHERE id=?
            """,
            (is_active, next_due.isoformat(), last_paid_date, bill_id),
        )
        conn.commit()

    return {"message": "Bill updated"}


@app.get("/analytics/reminders")
def get_reminders() -> dict:
    with get_conn() as conn:
        refresh_bill_due_dates(conn)
        bills = conn.execute(
            """
            SELECT id, name, amount, next_due_date
            FROM recurring_bills
            WHERE is_active=1
            ORDER BY next_due_date ASC
            """
        ).fetchall()
        loans = conn.execute(
            "SELECT id, person, amount, due_date FROM loans WHERE is_paid=0 ORDER BY due_date ASC"
        ).fetchall()

    today = dt_date.today()
    upcoming_bills = []
    for row in bills:
        due = parse_iso_date(row["next_due_date"]) or today
        if (due - today).days <= 7:
            upcoming_bills.append(
                {
                    "id": row["id"],
                    "name": row["name"],
                    "amount": round(float(row["amount"]), 2),
                    "due_date": due.isoformat(),
                    "days_left": (due - today).days,
                }
            )

    upcoming_loans = []
    for row in loans:
        due = parse_iso_date(row["due_date"]) or (today + timedelta(days=30))
        if (due - today).days <= 7:
            upcoming_loans.append(
                {
                    "id": row["id"],
                    "person": row["person"],
                    "amount": round(float(row["amount"]), 2),
                    "due_date": due.isoformat(),
                    "days_left": (due - today).days,
                }
            )

    return {"upcoming_bills": upcoming_bills, "upcoming_loans": upcoming_loans}


@app.get("/goals")
def get_goals() -> dict:
    with get_conn() as conn:
        rows = conn.execute(
            """
            SELECT id, title, target_amount, current_amount, target_date, note,
                   is_completed, created_at, completed_at
            FROM savings_goals
            ORDER BY is_completed ASC, id DESC
            """
        ).fetchall()

        daily_net_rows = conn.execute(
            """
            SELECT date(date) as day,
                   SUM(CASE WHEN kind='income' THEN amount ELSE 0 END)
                   - SUM(CASE WHEN kind='expense' THEN amount ELSE 0 END) as net
            FROM transactions
            WHERE date(date) >= date('now', '-30 days')
            GROUP BY date(date)
            """
        ).fetchall()

    avg_daily_savings = 0.0
    if daily_net_rows:
        avg_daily_savings = sum(float(r["net"] or 0) for r in daily_net_rows) / len(daily_net_rows)

    goals = []
    today = dt_date.today()
    for row in rows:
        target = float(row["target_amount"])
        current = float(row["current_amount"])
        remaining = max(0.0, target - current)
        eta_days = int(remaining / avg_daily_savings) if avg_daily_savings > 0 and remaining > 0 else None
        projected_date = (today + timedelta(days=eta_days)).isoformat() if eta_days is not None else None
        goals.append(
            {
                "id": row["id"],
                "title": row["title"],
                "target_amount": round(target, 2),
                "current_amount": round(current, 2),
                "remaining_amount": round(remaining, 2),
                "progress": round((current / target * 100), 1) if target > 0 else 0,
                "target_date": row["target_date"],
                "note": row["note"] or "",
                "is_completed": bool(row["is_completed"]),
                "created_at": row["created_at"],
                "completed_at": row["completed_at"],
                "eta_days": eta_days,
                "projected_date": projected_date,
            }
        )

    return {"goals": goals, "avg_daily_savings": round(avg_daily_savings, 2)}


@app.post("/goals")
def add_goal(payload: dict) -> dict:
    title = (payload.get("title") or "").strip()
    target_amount = float(payload.get("target_amount") or 0)
    current_amount = float(payload.get("current_amount") or 0)
    target_date = payload.get("target_date")
    note = (payload.get("note") or "").strip()

    if not title:
        raise HTTPException(status_code=400, detail="Goal title is required")
    if target_amount <= 0:
        raise HTTPException(status_code=400, detail="Target amount must be greater than 0")
    if current_amount < 0:
        raise HTTPException(status_code=400, detail="Current amount cannot be negative")

    if target_date and parse_iso_date(target_date) is None:
        raise HTTPException(status_code=400, detail="Invalid target date")

    with get_conn() as conn:
        cursor = conn.execute(
            """
            INSERT INTO savings_goals (title, target_amount, current_amount, target_date, note, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
            """,
            (title, target_amount, current_amount, target_date, note, datetime.utcnow().isoformat()),
        )
        conn.commit()

    return {"id": cursor.lastrowid, "message": "Goal created"}


@app.patch("/goals/{goal_id}")
def update_goal(goal_id: int, payload: dict) -> dict:
    with get_conn() as conn:
        row = conn.execute(
            "SELECT id, target_amount, current_amount, is_completed FROM savings_goals WHERE id=?",
            (goal_id,),
        ).fetchone()
        if not row:
            raise HTTPException(status_code=404, detail="Goal not found")

        current_amount = float(row["current_amount"])
        target_amount = float(row["target_amount"])
        is_completed = bool(row["is_completed"])

        if "add_amount" in payload:
            current_amount += float(payload.get("add_amount") or 0)
        if "current_amount" in payload:
            current_amount = float(payload.get("current_amount") or 0)

        if current_amount < 0:
            raise HTTPException(status_code=400, detail="Current amount cannot be negative")

        if "is_completed" in payload:
            is_completed = bool(payload.get("is_completed"))
        elif current_amount >= target_amount:
            is_completed = True

        completed_at = datetime.utcnow().isoformat() if is_completed else None

        conn.execute(
            """
            UPDATE savings_goals
            SET current_amount=?, is_completed=?, completed_at=?
            WHERE id=?
            """,
            (current_amount, 1 if is_completed else 0, completed_at, goal_id),
        )
        conn.commit()

    return {"message": "Goal updated"}


@app.get("/summary", response_model=Summary)
def get_summary() -> Summary:
    with get_conn() as conn:
        income = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='income'").fetchone()[0]
        expense = conn.execute("SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='expense'").fetchone()[0]
        income_cash_in_hand = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='income' AND income_bucket='cash_in_hand'"
        ).fetchone()[0]
        income_bank_account = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='income' AND income_bucket='bank_account'"
        ).fetchone()[0]
        expense_cash_in_hand = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='expense' AND income_bucket='cash_in_hand'"
        ).fetchone()[0]
        expense_bank_account = conn.execute(
            "SELECT COALESCE(SUM(amount), 0) FROM transactions WHERE kind='expense' AND income_bucket='bank_account'"
        ).fetchone()[0]

    return Summary(
        balance=income - expense,
        total_income=income,
        total_expense=expense,
        income_cash_in_hand=income_cash_in_hand,
        income_bank_account=income_bank_account,
        expense_cash_in_hand=expense_cash_in_hand,
        expense_bank_account=expense_bank_account,
    )


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
    """Financial health guidance tuned for irregular income and daily expenses."""
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
        income_rows = conn.execute(
            """
            SELECT date(date) as day, amount
            FROM transactions
            WHERE kind='income' AND date(date) >= date('now', '-120 days')
            ORDER BY day ASC
            """
        ).fetchall()
        expense_30_sum = float(
            conn.execute(
                "SELECT COALESCE(SUM(amount),0) FROM transactions WHERE kind='expense' AND date(date) >= date('now','-30 days')"
            ).fetchone()[0]
        )

    balance = income - expense
    payback_ready = outstanding_loans > 0 and balance >= outstanding_loans

    daily_net = [float(row["income"] or 0) - float(row["expense"] or 0) for row in daily_rows]
    daily_expense = [float(row["expense"] or 0) for row in daily_rows]

    avg_daily_net = sum(daily_net) / len(daily_net) if daily_net else 0.0

    # Expense is usually daily, so normalize by a fixed 30-day window.
    avg_daily_expense = expense_30_sum / 30 if expense_30_sum > 0 else 0.0

    # Income is irregular. Estimate next 7-day income by event frequency and event size.
    income_events = [
        {
            "day": parse_iso_date(row["day"]),
            "amount": float(row["amount"]),
        }
        for row in income_rows
        if parse_iso_date(row["day"]) is not None
    ]

    avg_income_event = (
        sum(item["amount"] for item in income_events) / len(income_events)
        if income_events else 0.0
    )

    event_interval_days = None
    if len(income_events) >= 2:
        gaps = []
        for idx in range(1, len(income_events)):
            gap = (income_events[idx]["day"] - income_events[idx - 1]["day"]).days
            if gap > 0:
                gaps.append(gap)
        if gaps:
            gaps.sort()
            event_interval_days = gaps[len(gaps) // 2]

    expected_income_events_7d = 0
    if event_interval_days and avg_income_event > 0:
        last_income_day = income_events[-1]["day"]
        next_income_day = last_income_day + timedelta(days=event_interval_days)
        horizon_end = dt_date.today() + timedelta(days=7)
        while next_income_day <= horizon_end:
            expected_income_events_7d += 1
            next_income_day = next_income_day + timedelta(days=event_interval_days)

    projected_income_7d = expected_income_events_7d * avg_income_event
    projected_expense_7d = avg_daily_expense * 7
    projected_balance_7d = balance + projected_income_7d - projected_expense_7d

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
    if avg_daily_expense > 0:
        # Guard against unrealistic budgets when income is sparse.
        recommended_daily_budget = min(recommended_daily_budget, avg_daily_expense * 1.1 if recommended_daily_budget > 0 else avg_daily_expense)

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
        "avg_daily_expense": round(avg_daily_expense, 2),
        "avg_income_event": round(avg_income_event, 2),
        "income_event_interval_days": event_interval_days,
        "expected_income_events_7d": expected_income_events_7d,
        "projected_income_7d": round(projected_income_7d, 2),
        "projected_expense_7d": round(projected_expense_7d, 2),
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


@app.get("/analytics/today-ledger")
def get_today_ledger() -> dict:
    with get_conn() as conn:
        income = float(
            conn.execute(
                "SELECT COALESCE(SUM(amount),0) FROM transactions WHERE kind='income' AND date(date)=date('now')"
            ).fetchone()[0]
        )
        expense = float(
            conn.execute(
                "SELECT COALESCE(SUM(amount),0) FROM transactions WHERE kind='expense' AND date(date)=date('now')"
            ).fetchone()[0]
        )
        rows = conn.execute(
            """
            SELECT id, kind, amount, source, category, date, note
            FROM transactions
            WHERE date(date)=date('now')
            ORDER BY date DESC, id DESC
            LIMIT 25
            """
        ).fetchall()

    return {
        "today_income": round(income, 2),
        "today_expense": round(expense, 2),
        "today_net": round(income - expense, 2),
        "transactions": [
            {
                "id": row["id"],
                "kind": row["kind"],
                "amount": float(row["amount"]),
                "source": row["source"],
                "category": row["category"],
                "date": row["date"],
                "note": row["note"],
            }
            for row in rows
        ],
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
        raise HTTPException(
            status_code=400,
            detail="VAPID keys are not configured. Set VAPID_PUBLIC_KEY and VAPID_PRIVATE_KEY on the server.",
        )

    vapid_private_key = vapid["private_key"]
    temp_key_file = None
    if vapid_private_key and vapid_private_key.startswith("-----"):
        import tempfile

        temp_key_file = tempfile.NamedTemporaryFile("w", suffix=".pem", delete=False)
        temp_key_file.write(vapid_private_key)
        temp_key_file.flush()
        temp_key_file.close()
        vapid_private_key = temp_key_file.name

    body = {
        "title": "FlowFunds alert",
        "message": "This is a test push notification.",
    }
    if payload:
        body.update(payload)

    sent = 0
    removed = 0
    failures = 0
    first_error = None

    with get_conn() as conn:
        rows = conn.execute("SELECT endpoint, p256dh, auth FROM push_subscriptions").fetchall()
        if not rows:
            return {
                "sent": 0,
                "removed": 0,
                "failures": 0,
                "message": "No push subscriptions saved yet. Enable push alerts in the browser first.",
            }
        for row in rows:
            subscription = {
                "endpoint": row["endpoint"],
                "keys": {"p256dh": row["p256dh"], "auth": row["auth"]},
            }
            try:
                webpush(
                    subscription_info=subscription,
                    data=json.dumps(body),
                    vapid_private_key=vapid_private_key,
                    vapid_claims={"sub": vapid["claims"]},
                )
                sent += 1
            except WebPushException as exc:
                status_code = getattr(exc.response, "status_code", None) if getattr(exc, "response", None) else None
                error_text = str(exc).lower()
                failures += 1
                if first_error is None:
                    first_error = str(exc)
                should_remove = status_code in {404, 410} or "410" in error_text or "unsubscribed" in error_text or "expired" in error_text
                if should_remove:
                    conn.execute("DELETE FROM push_subscriptions WHERE endpoint=?", (row["endpoint"],))
                    removed += 1
            except Exception as exc:
                failures += 1
                if first_error is None:
                    first_error = str(exc)
        conn.commit()

    if temp_key_file is not None:
        try:
            os.unlink(temp_key_file.name)
        except Exception:
            pass

    return {
        "sent": sent,
        "removed": removed,
        "failures": failures,
        "error": first_error,
    }
