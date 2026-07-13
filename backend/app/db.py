import sqlite3
import os
from pathlib import Path

# Resolve DB path:
# 1. Environment variable FLOWFUNDS_DB_PATH (used on Render with persistent disk)
# 2. Default: backend/data/flowfunds.db (stable local path that survives restarts)
_env_db_path = os.getenv("FLOWFUNDS_DB_PATH")
if _env_db_path:
    DB_PATH = Path(_env_db_path).expanduser()
else:
    DB_PATH = Path(__file__).resolve().parents[1] / "data" / "flowfunds.db"

# Ensure directory exists when using mounted/persistent paths.
DB_PATH.parent.mkdir(parents=True, exist_ok=True)


class LibsqlCursorWrapper:
    def __init__(self, result_set):
        self.result_set = result_set
        self.rows = result_set.rows
        self._idx = 0

    @property
    def lastrowid(self):
        return self.result_set.last_insert_rowid

    @property
    def rowcount(self):
        return self.result_set.rows_affected

    def fetchall(self):
        return self.rows

    def fetchone(self):
        if self._idx < len(self.rows):
            row = self.rows[self._idx]
            self._idx += 1
            return row
        return None

    def __iter__(self):
        return iter(self.rows)


class LibsqlConnectionWrapper:
    def __init__(self, client):
        self.client = client

    def execute(self, sql, params=None):
        p = list(params) if params is not None else []
        res = self.client.execute(sql, p)
        return LibsqlCursorWrapper(res)

    def commit(self):
        pass

    def rollback(self):
        pass

    def close(self):
        self.client.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        pass


def get_conn():
    turso_url = os.getenv("TURSO_DATABASE_URL")
    turso_token = os.getenv("TURSO_AUTH_TOKEN")

    if turso_url:
        # Convert libsql:// or wss:// to https:// to use HTTP protocol instead of WebSockets,
        # bypassing WebSocket handshake upgrades (which often get blocked or fail on Render).
        if turso_url.startswith("libsql://"):
            turso_url = turso_url.replace("libsql://", "https://", 1)
        elif turso_url.startswith("wss://"):
            turso_url = turso_url.replace("wss://", "https://", 1)

        try:
            import libsql_client
            client = libsql_client.create_client_sync(turso_url, auth_token=turso_token)
            return LibsqlConnectionWrapper(client)
        except ImportError:
            # Fallback to local SQLite if package not installed
            pass

    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA busy_timeout=5000")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db() -> None:
    with get_conn() as conn:
        # Create users table
        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                hashed_password TEXT NOT NULL,
                created_at TEXT NOT NULL
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS transactions (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
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
                user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
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
                user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
                person TEXT NOT NULL,
                amount REAL NOT NULL,
                note TEXT DEFAULT '',
                borrowed_date TEXT NOT NULL,
                due_date TEXT,
                upi_id TEXT,
                is_paid INTEGER NOT NULL DEFAULT 0,
                paid_date TEXT
            )
            """
        )

        conn.execute(
            """
            CREATE TABLE IF NOT EXISTS recurring_bills (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
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
                user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE,
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

        # Migration logic (safe for both SQLite and Turso DBs)
        # 1. Add user_id column if it doesn't exist
        for table in ["transactions", "push_subscriptions", "loans", "recurring_bills", "savings_goals"]:
            columns = {row["name"] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()}
            if "user_id" not in columns:
                conn.execute(f"ALTER TABLE {table} ADD COLUMN user_id INTEGER NOT NULL DEFAULT 1 REFERENCES users(id) ON DELETE CASCADE")

        # 2. Add upi_id column to loans if missing
        loan_columns = {row["name"] for row in conn.execute("PRAGMA table_info(loans)").fetchall()}
        if "upi_id" not in loan_columns:
            conn.execute("ALTER TABLE loans ADD COLUMN upi_id TEXT")

        if "due_date" not in loan_columns:
            conn.execute("ALTER TABLE loans ADD COLUMN due_date TEXT")

        # 3. Add income_bucket column to transactions if missing
        tx_columns = {row["name"] for row in conn.execute("PRAGMA table_info(transactions)").fetchall()}
        if "income_bucket" not in tx_columns:
            conn.execute("ALTER TABLE transactions ADD COLUMN income_bucket TEXT")

        conn.commit()
