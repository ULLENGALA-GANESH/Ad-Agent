# Research workflow and attribution

The reference below describes the original research framework by Yang et al. Running its code-generating workflow requires the additional dependencies in [backend/requirements.txt](../backend/requirements.txt), provider credentials, and model or dataset assets. The local console enables research execution only when started with `AD_AGENT_TRUSTED_RESEARCH=1`. Some research assets in a ZIP checkout may be Git LFS pointers.

In this release, the legacy research form submits the command and dataset paths. Its advanced configuration controls are still under development. The end-to-end checks cover the local investigation console. Full verification of the provider-backed code-generation workflow is pending.

**AD-AGENT** is an LLM‑driven multi-agent anomaly detection platform designed to support the full lifecycle of real-world anomaly detection—from data preprocessing and model selection to detection, explanation, and evaluation. It integrates classical and graph-based AD algorithms with LLM-powered modules for enhanced usability, privacy, and adaptability.

![flowchart](figures/flowchart.jpg)

> 🔍 One platform. Multiple agents. All your anomaly detection workflows—automated, explainable, and secure.

---



## 📝 Citation

If you find this work useful, please cite our paper: [https://arxiv.org/abs/2505.12594](https://arxiv.org/abs/2505.12594)

```bibtex
@article{yang2025ad,
  title={AD-AGENT: A Multi-agent Framework for End-to-end Anomaly Detection},
  author={Yang, Tiankai and Liu, Junjun and Siu, Wingchun and Wang, Jiahang and Qian, Zhuangzhuang and Song, Chanjuan and Cheng, Cheng and Hu, Xiyang and Zhao, Yue},
  journal={arXiv preprint arXiv:2505.12594},
  year={2025}
}
```

---

## ✨ Features

- **Unified Multi-modal-library Automation**: Supports multiple domain-specific AD libraries (PyOD for multivariate data, PyGOD for graph data, and TSLib for time series) and enables end-to-end, cross-modality pipeline construction from natural language.
- **Accessible to Non-experts**: Enters a sentence such as "Detect anomalies in cardio.mat" and obtains an executable script without hand‑written code.
- **Multi-Agent Architecture**: Processing, detection, explanation, and adaptation are handled by decoupled agents with clear APIs and extendability.
- **Automatic Model Suggestion**: Leverages the reasoning ability of the LLM to recommend competitive algorithms when no specific model is provided.
- **Privacy-Aware Design** (in progress): Includes a framework for anonymizing data before AD processing, suitable for regulated domains.
- **Human-in-the-loop Support** (in progress): Enables analysts to query explanations and iterate on detection results interactively.

> Please find more details in our paper [here](https://arxiv.org/abs/2505.12594).


---

## 🔧 Setup Instructions

Run the following commands from the repository root.

### 1. Clone the Repository

```bash
git clone https://github.com/ULLENGALA-GANESH/Ad-Agent.git
cd Ad-Agent
```

### 2. Create and Activate a Virtual Environment

#### On macOS/Linux:

```bash
python -m venv .venv
source .venv/bin/activate
```

#### On Windows:

```bash
python -m venv .venv
.venv\Scripts\activate
```

### 3. Install Dependencies

```bash
pip install pyg_lib torch_scatter torch_sparse torch_cluster torch_spline_conv -f https://data.pyg.org/whl/torch-2.5.0+cpu.html

pip install -r backend/requirements.txt
```

### 4. Configure the optional research workflow

The Gemini client reads `GEMINI_API_KEY` from the environment or a private `.env` file in the project root. Keep provider credentials out of source code. The local investigation console runs without a provider key.

---

## 🚀 Running the Program

### Run Normally (Sequential Execution)

```bash
python backend/main.py
```

### Run in Parallel Mode

```bash
python backend/main.py -p
```

### Run in Optimizer Mode

```bash
python backend/main.py -o
```

---

## 🧪 Test Commands

You can also run the system with natural-language-like test commands.

### Run a Specific Algorithm

```text
# PyOD
Run IForest on ./data/glass_train.mat and ./data/glass_test.mat
Run all on ./data/glass_train.mat and ./data/glass_test.mat
# PyGOD
Run DOMINANT on ./data/inj_cora_train.pt and ./data/inj_cora_test.pt
# TSLib
Run LightTS on ./data/MSL and ./data/MSL
# Darts (in progress)
Run GlobalNaiveAggregate on ./data/yahoo_train.csv and ./data/yahoo_test.csv

```

<img src="figures/shortcut.jpg" alt="shortcut" style="zoom:30%;" />

### Run All Algorithms

```text
Run all on ./data/glass_train.mat and ./data/glass_test.mat
```

---

## 📊 Experiments

- Pipeline generation performance by library, showing success rate (code runs without error), average latency, LLM token usage (input/output), and per-pipeline billing cost in US dollars. The time spent in Reviewer is related to the complexity of models, which explains the increase in TSLib. **AD-AGENT demonstrates high reliability in producing valid pipelines across modalities, with low latency and manageable cost.**![success_table](figures/success_table.jpg)
- Model selection results for PyOD and PyGOD. We display the average AUROC of models recommended by querying the reasoning LLM three times (duplicates allowed). "Best Performance" marks the highest performance achieved by any available model for each dataset, while "Average Baseline" denotes the mean performance across all available models. **The LLM's recommendations substantially exceed the average baseline and closely track the best performance in most datasets.**![model_selection](figures/model_selection.jpg)

---

## 📌 Notes

- Make sure your dataset is placed inside the `./data/` directory.
- Modify [backend/main.py](../backend/main.py) to add support for additional algorithms or datasets if needed.

---

## 👥 Contributors

<a href="https://github.com/USC-FORTIS/AD-AGENT/graphs/contributors">
  <img src="https://contrib.rocks/image?repo=USC-FORTIS/AD-AGENT" />
</a>

Made with [contrib.rocks](https://contrib.rocks).
