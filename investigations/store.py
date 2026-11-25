"""SQLite queue, fenced worker leases, and per-node checkpoints."""
from contextlib import contextmanager
import json
from pathlib import Path
import sqlite3
import time
from uuid import uuid4
import zlib

from .workflow import VERSION, digest

LEASE_SECONDS = 30
MAX_ATTEMPTS = 3
MAX_PENDING = 32


class LeaseLost(RuntimeError):
    pass


class QueueFull(RuntimeError):
    pass


def pack(value):
    return zlib.compress(json.dumps(value, allow_nan=False, separators=(",", ":")).encode(), level=2)


def unpack(blob):
    return json.loads(zlib.decompress(blob))


class RunStore:
    def __init__(self, filename):
        self.path = Path(filename).resolve()
        self.path.parent.mkdir(parents=True, exist_ok=True)
        with self.connection() as db:
            db.execute("PRAGMA journal_mode=WAL")
            db.executescript("""
                CREATE TABLE IF NOT EXISTS runs (
                    id TEXT PRIMARY KEY, fingerprint TEXT NOT NULL UNIQUE, name TEXT NOT NULL,
                    source TEXT, status TEXT NOT NULL, created REAL NOT NULL, started REAL,
                    finished REAL, attempt INTEGER NOT NULL DEFAULT 0, owner TEXT, lease REAL,
                    error TEXT, input BLOB NOT NULL, summary TEXT
                );
                CREATE INDEX IF NOT EXISTS runs_queue ON runs(status, created);
                CREATE TABLE IF NOT EXISTS stages (
                    run_id TEXT NOT NULL REFERENCES runs(id), name TEXT NOT NULL, attempt INTEGER NOT NULL,
                    status TEXT NOT NULL, started REAL NOT NULL, input TEXT NOT NULL, decision TEXT,
                    evidence TEXT, duration_ms REAL, checkpoint BLOB,
                    PRIMARY KEY (run_id, name, attempt)
                );
                CREATE TABLE IF NOT EXISTS incidents (
                    run_id TEXT NOT NULL REFERENCES runs(id), number INTEGER NOT NULL,
                    metric TEXT NOT NULL, first_record INTEGER NOT NULL, start_time REAL,
                    end_time REAL, count INTEGER NOT NULL, peak_score REAL NOT NULL,
                    PRIMARY KEY (run_id, number)
                );
            """)

    @contextmanager
    def connection(self, write=False):
        conn = sqlite3.connect(self.path, timeout=15)
        conn.row_factory = sqlite3.Row
        try:
            conn.execute("PRAGMA foreign_keys=ON")
            if write:
                conn.execute("BEGIN IMMEDIATE")
            yield conn
            conn.commit()
        finally:
            conn.close()

    def submit(self, data):
        fingerprint = digest([VERSION, data])
        payload = pack(data)
        with self.connection(True) as db:
            existing = db.execute("SELECT id FROM runs WHERE fingerprint=?", (fingerprint,)).fetchone()
            if existing:
                return existing[0], True
            active = db.execute("SELECT COUNT(*) FROM runs WHERE status IN ('queued','running')").fetchone()[0]
            if active >= MAX_PENDING:
                raise QueueFull("Queue is full. Try again after a run finishes.")
            rid = uuid4().hex
            db.execute("""INSERT INTO runs(id,fingerprint,name,source,status,created,input)
                          VALUES(?,?,?,?,'queued',?,?)""",
                       (rid, fingerprint, data["name"], data.get("source"), time.time(), payload))
        return rid, False

    def claim(self):
        now = time.time()
        with self.connection(True) as db:
            condition = "status='queued' OR (status='running' AND lease<=?)"
            while True:
                row = db.execute(f"SELECT id,attempt FROM runs WHERE {condition} ORDER BY created LIMIT 1",
                                 (now,)).fetchone()
                if not row:
                    return None
                rid, previous = row
                db.execute("""UPDATE stages SET status='interrupted',decision='Worker lease expired',
                              duration_ms=(?-started)*1000 WHERE run_id=? AND status='running'""", (now, rid))
                if previous >= MAX_ATTEMPTS:
                    db.execute("""UPDATE runs SET status='failed',error='Worker retry limit reached',
                                  owner=NULL,lease=NULL,finished=? WHERE id=?""", (now, rid))
                    continue
                owner = uuid4().hex
                db.execute("""UPDATE runs SET status='running',attempt=attempt+1,owner=?,lease=?,
                              started=COALESCE(started,?),error=NULL WHERE id=?""",
                           (owner, now+LEASE_SECONDS, now, rid))
                return rid, owner, previous+1

    def owned(self, db, rid, owner):
        row = db.execute("SELECT 1 FROM runs WHERE id=? AND status='running' AND owner=? AND lease>?",
                         (rid, owner, time.time())).fetchone()
        if not row:
            raise LeaseLost("Worker lease was reassigned.")

    def renew(self, rid, owner):
        with self.connection(True) as db:
            self.owned(db, rid, owner)
            db.execute("UPDATE runs SET lease=? WHERE id=?", (time.time()+LEASE_SECONDS, rid))

    def load(self, rid):
        with self.connection() as db:
            payload = db.execute("SELECT input FROM runs WHERE id=?", (rid,)).fetchone()[0]
            rows = db.execute("SELECT name,checkpoint FROM stages WHERE run_id=? AND status='completed'",
                              (rid,)).fetchall()
        return unpack(payload), {r["name"]: unpack(r["checkpoint"]) for r in rows}

    def output(self, rid, stage):
        with self.connection() as db:
            row = db.execute("SELECT checkpoint FROM stages WHERE run_id=? AND name=? AND status='completed'",
                             (rid, stage)).fetchone()
        return unpack(row[0]) if row else None

    def begin(self, claim, stage, description):
        rid, owner, attempt = claim
        with self.connection(True) as db:
            self.owned(db, rid, owner)
            db.execute("""INSERT INTO stages(run_id,name,attempt,status,started,input)
                          VALUES(?,?,?,'running',?,?)""", (rid, stage, attempt, time.time(), description))

    def finish(self, claim, stage, output, decision, evidence, elapsed):
        rid, owner, attempt = claim
        checkpoint = pack(output)
        with self.connection(True) as db:
            self.owned(db, rid, owner)
            db.execute("""UPDATE stages SET status='completed',checkpoint=?,decision=?,evidence=?,duration_ms=?
                          WHERE run_id=? AND name=? AND attempt=?""",
                       (checkpoint, decision, json.dumps(evidence), elapsed, rid, stage, attempt))

    def complete(self, claim, outputs):
        rid, owner, _ = claim
        p, evaluated = outputs["processor"], outputs["eval"]
        episodes = outputs["opt"]["incidents"]
        summary = dict(profile=p, selected=evaluated["selected"], cutoff=evaluated["cutoff"],
                       reason=evaluated["reason"], heldout=evaluated["heldout"],
                       validation=evaluated["validation"], incidents=len(episodes), version=VERSION)
        brief = outputs["opt"].get("brief")
        if brief:
            summary["brief"] = {"incident": brief["incident"], "status": brief["status"]}
        with self.connection(True) as db:
            self.owned(db, rid, owner)
            db.executemany("INSERT INTO incidents VALUES(?,?,?,?,?,?,?,?)", [
                (rid, e["id"], e["metric"], e["first_record"], e["start_time"], e["end_time"], e["count"], e["peak_score"])
                for e in episodes])
            db.execute("""UPDATE runs SET status='completed',summary=?,finished=?,owner=NULL,lease=NULL
                          WHERE id=?""", (json.dumps(summary), time.time(), rid))

    def fail(self, claim, message, retry):
        rid, owner, attempt = claim
        requeue = retry and attempt < MAX_ATTEMPTS
        now = time.time()
        with self.connection(True) as db:
            self.owned(db, rid, owner)
            db.execute("""UPDATE stages SET status='failed',decision=?,duration_ms=(?-started)*1000
                          WHERE run_id=? AND attempt=? AND status='running'""", (message, now, rid, attempt))
            db.execute("""UPDATE runs SET status=?,error=?,owner=NULL,lease=NULL,finished=? WHERE id=?""",
                       ("queued" if requeue else "failed", message, None if requeue else now, rid))

    def run_info(self, rid):
        with self.connection() as db:
            row = db.execute("""SELECT id,fingerprint,name,source,status,created,started,finished,attempt,error,summary
                                FROM runs WHERE id=?""", (rid,)).fetchone()
            if not row:
                return None
            result = dict(row)
            result["summary"] = json.loads(row["summary"]) if row["summary"] else None
            stages = db.execute("""SELECT name,attempt,status,started,input,decision,evidence,duration_ms
                                   FROM stages WHERE run_id=? ORDER BY attempt,started,rowid""", (rid,)).fetchall()
        result["trace"] = [dict(dict(s), evidence=json.loads(s["evidence"]) if s["evidence"] else None) for s in stages]
        return result

    def overview(self, offset=0, limit=30, rid=None):
        with self.connection() as db:
            counts = dict(db.execute("SELECT status,COUNT(*) FROM runs GROUP BY status").fetchall())
            runs = db.execute("""SELECT r.id,name,source,status,created,finished,attempt,
                                 (SELECT COUNT(*) FROM incidents i WHERE i.run_id=r.id) AS incidents
                                 FROM runs r ORDER BY created DESC LIMIT 60""").fetchall()
            where, params = ("WHERE i.run_id=?", (rid,)) if rid else ("", ())
            incidents = db.execute(f"""SELECT i.*,r.name,r.created FROM incidents i JOIN runs r ON r.id=i.run_id
                                       {where} ORDER BY r.created DESC,i.number LIMIT ? OFFSET ?""",
                                   (*params, limit, offset)).fetchall()
            count = db.execute(f"SELECT COUNT(*) FROM incidents i {where}", params).fetchone()[0]
        return dict(runs=[dict(r) for r in runs], counts=counts, incidents=[dict(i) for i in incidents],
                    total_incidents=count, offset=offset)
