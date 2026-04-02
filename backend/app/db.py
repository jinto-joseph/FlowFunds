import sqlite3
import os
from pathlib import Path

_default_db_path = Path(__file__).resolve().parents[1] / "flowfunds.db"
DB_PATH = Path(os.getenv("FLOWFUNDS_DB_PATH", str(_default_db_path))).expanduser()

# Ensure directory exists when using mounted/persistent paths.
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


def get_conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db() -> None:
    with get_conn() as conn:
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                kind TEXT NOT NULL CHECK(kind IN ('income','expense')),
                amount REAL NOT NULL,
                source TEXT,
                income_bucket TEXT,
                category TEXT,
                date TEXT NOT NULL,
                note TEXT DEFAULT ''
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS push_subscriptions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                endpoint TEXT NOT NULL UNIQUE,
                p256dh TEXT NOT NULL,
                auth TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS loans (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                person TEXT NOT NULL,
                amount REAL NOT NULL,
                note TEXT DEFAULT '',
                borrowed_date TEXT NOT NULL,
                due_date TEXT,
                is_paid INTEGER NOT NULL DEFAULT 0,
                paid_date TEXT
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS recurring_bills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                amount REAL NOT NULL,
                frequency TEXT NOT NULL CHECK(frequency IN ('weekly','monthly')),
                next_due_date TEXT NOT NULL,
                note TEXT DEFAULT '',
                is_active INTEGER NOT NULL DEFAULT 1,
                last_paid_date TEXT,
                created_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS savings_goals (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                title TEXT NOT NULL,
                target_amount REAL NOT NULL,
                current_amount REAL NOT NULL DEFAULT 0,
                target_date TEXT,
                note TEXT DEFAULT '',
                is_completed INTEGER NOT NULL DEFAULT 0,
                created_at TEXT NOT NULL,
                completed_at TEXT
            )
            """
        )

        # Migration-safe: add due_date column if older DB was created before this field existed.
        loan_columns = {row["name"] for row in conn.execute("PRAGMA table_info(loans)").fetchall()}
        if "due_date" not in loan_columns:
            conn.execute("ALTER TABLE loans ADD COLUMN due_date TEXT")

        # Migration-safe: add income_bucket to older transactions tables.
        tx_columns = {row["name"] for row in conn.execute("PRAGMA table_info(transactions)").fetchall()}
        if "income_bucket" not in tx_columns:
            conn.execute("ALTER TABLE transactions ADD COLUMN income_bucket TEXT")

        conn.commit()
