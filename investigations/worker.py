"""Run the SQLite investigation queue in an API thread or a separate process."""
import argparse
import logging
import os
from pathlib import Path
from threading import Event, Thread

from .store import LEASE_SECONDS, LeaseLost, RunStore
from .workflow import Investigation

DEFAULT_DB = Path(__file__).resolve().parents[1] / "instance" / "investigations.sqlite3"
log = logging.getLogger(__name__)


class Journal:
    def __init__(self, store, claim):
        self.store = store
        self.claim = claim

    def begin(self, *args):
        self.store.begin(self.claim, *args)

    def finish(self, *args):
        self.store.finish(self.claim, *args)


def execute(store, claim):
    rid, owner, _ = claim
    stop = Event()

    def heartbeat():
        while not stop.wait(LEASE_SECONDS / 3):
            try:
                store.renew(rid, owner)
            except LeaseLost:
                return
            except Exception:
                log.exception("Lease renewal failed for %s", rid)

    thread = Thread(target=heartbeat, name="investigation-lease", daemon=True)
    thread.start()
    try:
        data, checkpoints = store.load(rid)
        outputs = Investigation(data, checkpoints, Journal(store, claim)).run()
        store.complete(claim, outputs)
    except LeaseLost:
        log.info("Lease transferred for %s", rid)
    except Exception as exc:
        log.exception("Investigation %s failed", rid)
        try:
            store.fail(claim, str(exc)[:700] or type(exc).__name__, retry=not isinstance(exc, ValueError))
        except LeaseLost:
            pass
    finally:
        stop.set()
        thread.join()


def work(store, stop):
    while not stop.is_set():
        try:
            claim = store.claim()
            if claim:
                execute(store, claim)
                continue
        except Exception:
            log.exception("Queue poll failed")
        stop.wait(0.35)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Run one Ad-Agent investigation worker.")
    parser.add_argument("--db", default=os.getenv("AD_AGENT_DB", str(DEFAULT_DB)))
    args = parser.parse_args()
    try:
        work(RunStore(args.db), Event())
    except KeyboardInterrupt:
        pass
