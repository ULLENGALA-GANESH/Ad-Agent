# AD-AGENT Enterprise: Autonomous Multimodal Anomaly Detection Platform

**AD-AGENT Enterprise** is a production-grade, multi-agent anomaly detection SaaS platform powered by **LangChain**, **LangGraph** (self-healing cyclic workflows), **Local RAG documentation grounding**, and **XAI Explainability**. It automates the full lifecycle across **Tabular, Time-Series, Graph, Image, and Video** data.

---

## 📁 Clean Repository Structure

```
Ad-Agent_main/
├── backend/                  # Python Multi-Agent Backend
│   ├── ad_model_selection/   # AutoML prompting & recommendation templates
│   ├── agents/               # 7 Autonomous Agents (Processor, Selector, InfoMiner, CodeGen, Reviewer, Evaluator, Explainer, Optimizer)
│   ├── auth/                 # JWT Authentication & SQLite persistence (users, job history)
│   ├── config/               # Environment & API Key configuration
│   ├── data/                 # Benchmark datasets (sample_cardio.csv, sample_sensor.csv)
│   ├── data_loader/          # Universal multi-format loader (CSV, MAT, PT, NPY, Images)
│   ├── docs/                 # Official documentation for local RAG indexing
│   ├── entity/               # CodeQuality & AgentState schemas
│   ├── generated_artifacts/  # Stored model weights (.pkl) and scored predictions (.csv)
│   ├── generated_scripts/    # Standalone executable pipeline scripts
│   ├── utils/                # Grounded RAG Engine & Gemini client
│   ├── .venv/                # Isolated Python virtual environment
│   ├── main.py               # Compiled LangGraph state machine
│   ├── server.py             # Flask API server (REST, SSE Streaming, Artifact Downloads)
│   └── requirements.txt      # Python dependencies
│
├── frontend/                 # Commercial React 19 + Vite + Tailwind v4 SaaS UI
│   ├── src/
│   │   ├── api/              # Axios API client with JWT interceptor
│   │   ├── components/       # Navbar, FileUpload, HistoryModal
│   │   ├── pages/            # Auth (Login/Signup), Home (Studio), Console (Live Logs), Results (XAI & Exports)
│   │   └── index.css         # Tailwind v4 theme styling
│   └── package.json
│
└── README.md
```

---

## 🚀 Quickstart Guide

### 1. Start the Backend API Server
In a terminal, navigate to the `backend/` folder:
```bash
cd backend
.venv\Scripts\python.exe server.py
```
* Backend API starts on: **`http://127.0.0.1:8000`**
* SQLite Database (`ad_agent.db`) auto-initializes with demo credentials.

### 2. Start the Frontend UI
In a second terminal, navigate to the `frontend/` folder:
```bash
cd frontend
npm run dev
```
* Open your browser at: **`http://localhost:5173`**

---

## 🔑 Enterprise Demo Access

On the login page, you can either create an account or click **"1-Click Enterprise Demo Credentials"**:
* **Email:** `demo@adagent.ai`
* **Password:** `Enterprise2025!`

---

## ✨ Features & Capabilities

1. **Universal Multimodal Support**:
   * **Tabular Data**: PyOD (`IForest`, `ECOD`, `COPOD`, `DeepSVDD`, `LOF`)
   * **Time-Series Telemetry**: Darts & TSLib (`N-BEATS`, `DLinear`, `PatchTST`)
   * **Graph Networks**: PyGOD (`DOMINANT`, `SCAN`, `GAAN`)
   * **Vision & Defect Localization**: Anomalib (`PatchCore`, `PaDiM`) & Gemini VLM
2. **Local RAG Grounding**:
   * Indexes official docs in memory with zero API hallucination on model constructor parameters.
3. **Isolated Sandbox Verification**:
   * Pre-execution syntax validation ensuring user production code remains clean.
4. **Explainable AI (XAI)**:
   * Real-time feature attribution bar charts pinpointing the root causes of anomalies.
   * Dynamic contamination threshold slider ($1\% - 25\%$) with interactive alert volume adjustment.
5. **1-Click Export Center**:
   * Download trained model binaries (`.pkl`), scored datasets with anomaly probabilities (`.csv`), and standalone Python code (`.py`).
