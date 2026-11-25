# Ad-Agent backend

The Flask service serves the investigation API and the built React console. From the repository root, start it with `python backend/server.py` after following the [setup instructions](../README.md).

| Entry point | Responsibility |
| --- | --- |
| [server.py](server.py) | Start the local server and serve the frontend and research routes. |
| [investigations/api.py](investigations/api.py) | Preview CSV files, submit investigations, and retrieve runs and incidents. |
| [main.py](main.py) | Define the seven-stage LangGraph shared by the investigation and research workflows. |
| [investigations/worker.py](investigations/worker.py) | Claim queued runs, save checkpoints, and resume interrupted work. |
| [workbench.py](workbench.py) | Run the standalone numeric detector comparison. |
| [agents/](agents/) | Implement the optional provider-backed [research workflow](../docs/research.md). |

## Local state

The worker stores investigations in `instance/investigations.sqlite3` under the repository root. Research jobs and reviews use `data/jobs_store.json`. Set `AD_AGENT_DB` or `AD_AGENT_RESEARCH_STORE` to select another file. Sample inputs live in the shared [data directory](../data/).

The server starts an investigation worker by default. To run a separate worker, set `AD_AGENT_WORKERS=0` for the server and run `python -m investigations.worker` from this directory using the same database.
