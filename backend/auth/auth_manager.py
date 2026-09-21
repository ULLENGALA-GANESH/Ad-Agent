import os
import sqlite3
import jwt
import datetime
from werkzeug.security import generate_password_hash, check_password_hash

DB_PATH = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "ad_agent.db"))
JWT_SECRET = os.environ.get("JWT_SECRET", "ad_agent_enterprise_secret_key_2025_prod")
JWT_ALGORITHM = "HS256"


def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn


def init_db():
    conn = get_db()
    cursor = conn.cursor()
    
    # Users table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        company TEXT DEFAULT 'Enterprise Client',
        role TEXT DEFAULT 'Analyst',
        tier TEXT DEFAULT 'Enterprise',
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)
    
    # Job execution history table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS job_runs (
        id TEXT PRIMARY KEY,
        user_id INTEGER,
        command TEXT,
        algorithm TEXT,
        dataset_train TEXT,
        dataset_test TEXT,
        status TEXT DEFAULT 'running',
        metrics_json TEXT,
        results_json TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
    )
    """)
    
    # Analyst review and incident triage table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS incident_reviews (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        job_id TEXT NOT NULL,
        item_id TEXT NOT NULL,
        item_type TEXT DEFAULT 'anomaly',
        status TEXT DEFAULT 'unresolved',
        note TEXT,
        reviewer_name TEXT DEFAULT 'Alex Vance',
        reviewer_role TEXT DEFAULT 'Analyst',
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(job_id, item_id)
    )
    """)

    # Enterprise Audit Log table
    cursor.execute("""
    CREATE TABLE IF NOT EXISTS audit_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_email TEXT,
        action TEXT NOT NULL,
        target TEXT,
        details TEXT,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    )
    """)

    # Auto-migrate results_json column if missing in existing DB
    cursor.execute("PRAGMA table_info(job_runs)")
    cols = [c[1] for c in cursor.fetchall()]
    if "results_json" not in cols:
        cursor.execute("ALTER TABLE job_runs ADD COLUMN results_json TEXT")

    conn.commit()

    # Seed default enterprise demo account if not exists
    cursor.execute("SELECT id FROM users WHERE email = ?", ("demo@adagent.ai",))
    if not cursor.fetchone():
        hashed = generate_password_hash("Enterprise2025!")
        cursor.execute(
            "INSERT INTO users (email, password_hash, name, company, role, tier) VALUES (?, ?, ?, ?, ?, ?)",
            ("demo@adagent.ai", hashed, "Alex Vance", "Fortis Dynamics", "Lead ML Engineer", "Enterprise Tier")
        )
        conn.commit()

    conn.close()


def register_user(email, password, name, company="Enterprise Client"):
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT id FROM users WHERE email = ?", (email.lower().strip(),))
    if cursor.fetchone():
        conn.close()
        return None, "Email is already registered"

    hashed = generate_password_hash(password)
    cursor.execute(
        "INSERT INTO users (email, password_hash, name, company) VALUES (?, ?, ?, ?)",
        (email.lower().strip(), hashed, name.strip(), company.strip())
    )
    conn.commit()
    user_id = cursor.lastrowid
    conn.close()

    user = get_user_by_id(user_id)
    token = create_token(user)
    return {"token": token, "user": user}, None


def login_user(email, password):
    init_db()
    conn = get_db()
    cursor = conn.cursor()

    cursor.execute("SELECT * FROM users WHERE email = ?", (email.lower().strip(),))
    user_row = cursor.fetchone()
    conn.close()

    if not user_row:
        return None, "Invalid email or password"

    if not check_password_hash(user_row["password_hash"], password):
        return None, "Invalid email or password"

    user = dict(user_row)
    del user["password_hash"]
    token = create_token(user)
    return {"token": token, "user": user}, None


def create_token(user):
    payload = {
        "sub": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user.get("role", "Analyst"),
        "tier": user.get("tier", "Enterprise"),
        "exp": datetime.datetime.utcnow() + datetime.timedelta(days=7)
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def verify_token(token):
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        return payload, None
    except jwt.ExpiredSignatureError:
        return None, "Token has expired"
    except jwt.InvalidTokenError:
        return None, "Invalid token"


def get_user_by_id(user_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT id, email, name, company, role, tier, created_at FROM users WHERE id = ?", (user_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def record_job_start(job_id, user_id, command, train_path, test_path):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT OR REPLACE INTO job_runs (id, user_id, command, dataset_train, dataset_test, status) VALUES (?, ?, ?, ?, ?, ?)",
        (job_id, user_id, command, train_path, test_path, "running")
    )
    conn.commit()
    conn.close()


def record_job_complete(job_id, algorithm, metrics_json, results_json=None, status="completed"):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "UPDATE job_runs SET algorithm = ?, metrics_json = ?, results_json = ?, status = ? WHERE id = ?",
        (algorithm, metrics_json, results_json, status, job_id)
    )
    conn.commit()
    conn.close()


def get_job_run(job_id):
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM job_runs WHERE id = ?", (job_id,))
    row = cursor.fetchone()
    conn.close()
    return dict(row) if row else None


def get_user_history(user_id=None, limit=20):
    conn = get_db()
    cursor = conn.cursor()
    if user_id:
        cursor.execute("SELECT * FROM job_runs WHERE user_id = ? ORDER BY created_at DESC LIMIT ?", (user_id, limit))
    else:
        cursor.execute("SELECT * FROM job_runs ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


def record_incident_review(job_id, item_id, item_type="anomaly", status="unresolved", note="", reviewer_name="Alex Vance", reviewer_role="Analyst"):
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("""
        INSERT INTO incident_reviews (job_id, item_id, item_type, status, note, reviewer_name, reviewer_role, updated_at)
        VALUES (?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        ON CONFLICT(job_id, item_id) DO UPDATE SET
            status = excluded.status,
            note = excluded.note,
            reviewer_name = excluded.reviewer_name,
            reviewer_role = excluded.reviewer_role,
            updated_at = CURRENT_TIMESTAMP
    """, (job_id, str(item_id), item_type, status, note, reviewer_name, reviewer_role))
    conn.commit()
    conn.close()
    return True


def get_incident_reviews(job_id):
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM incident_reviews WHERE job_id = ?", (job_id,))
    rows = cursor.fetchall()
    conn.close()
    
    reviews = [dict(r) for r in rows]
    summary = {
        "confirmed": sum(1 for r in reviews if r.get("status") == "confirmed"),
        "false_positive": sum(1 for r in reviews if r.get("status") == "false_positive"),
        "escalated": sum(1 for r in reviews if r.get("status") == "escalated"),
        "unresolved": sum(1 for r in reviews if r.get("status") == "unresolved")
    }
    return {"reviews": reviews, "summary": summary}


def record_audit_log(user_email, action, target, details):
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute(
        "INSERT INTO audit_logs (user_email, action, target, details) VALUES (?, ?, ?, ?)",
        (user_email or "system@adagent.ai", action, target, details)
    )
    conn.commit()
    conn.close()
    return True


def get_audit_logs(limit=100):
    init_db()
    conn = get_db()
    cursor = conn.cursor()
    cursor.execute("SELECT * FROM audit_logs ORDER BY created_at DESC LIMIT ?", (limit,))
    rows = cursor.fetchall()
    conn.close()
    return [dict(r) for r in rows]


# Auto-initialize database on import
init_db()
