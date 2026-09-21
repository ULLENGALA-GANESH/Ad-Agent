import os
import re
import numpy as np
import pandas as pd
import scipy.io
import sys

# Optional torch / torch_geometric import
try:
    import torch
    from torch_geometric.data import Data
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

# Import Config safely
try:
    from config.config import Config
    GEMINI_KEY = getattr(Config, "GEMINI_API_KEY", os.getenv("GEMINI_API_KEY", ""))
except Exception:
    GEMINI_KEY = os.getenv("GEMINI_API_KEY", "")


class DataLoader:
    """
    Universal DataLoader supporting .csv, .mat, .npy, .pt, .parquet, image, and video files.
    Smartly detects ground truth anomaly labels and provides clean feature matrices.
    """

    def __init__(self, filepath, desc='', store_script=False, store_path='generated_data_loader.py'):
        self.filepath = filepath.replace("\\", "/")
        self.desc = desc
        self.store_script = store_script
        self.store_path = store_path

        if not os.path.exists(self.filepath):
            fname = os.path.basename(self.filepath)
            for cand in [
                os.path.join(os.path.dirname(__file__), "..", "data", fname),
                os.path.join(os.getcwd(), "backend", "data", fname),
                os.path.join(os.getcwd(), "data", fname),
                os.path.join(os.getcwd(), self.filepath),
                os.path.join(os.getcwd(), "backend", self.filepath)
            ]:
                if os.path.exists(cand):
                    self.filepath = os.path.abspath(cand).replace("\\", "/")
                    break
            else:
                raise FileNotFoundError(f"File not found: {self.filepath}")

    def load_data(self, split_data=False):
        """
        Load dataset safely.
        Returns X, y (or X_train, X_test, y_train, y_test if split_data=True)
        """
        X, y = None, None
        ext = os.path.splitext(self.filepath)[1].lower()

        try:
            if ext in [".csv", ".parquet", ".tsv"]:
                if ext == ".parquet":
                    df = pd.read_parquet(self.filepath)
                else:
                    sep = "\t" if ext == ".tsv" else ","
                    try:
                        df = pd.read_csv(self.filepath, sep=sep, encoding='utf-8')
                    except UnicodeDecodeError:
                        df = pd.read_csv(self.filepath, sep=sep, encoding='latin1')

                # Smart target label detection
                candidate_labels = ['is_anomaly', 'label', 'class', 'target', 'anomaly', 'outlier', 'y']
                found_label_col = None
                for col in df.columns:
                    if str(col).strip().lower() in candidate_labels:
                        found_label_col = col
                        break

                if found_label_col is not None:
                    raw_y = df[found_label_col].values
                    # Map binary labels if string/boolean
                    if raw_y.dtype == object or raw_y.dtype == bool:
                        unique_vals = set(raw_y)
                        if unique_vals.issubset({True, False}):
                            y = raw_y.astype(int)
                        elif unique_vals.issubset({'normal', 'anomaly'}):
                            y = np.array([1 if v == 'anomaly' else 0 for v in raw_y])
                        else:
                            # Default numeric conversion
                            try:
                                y = pd.to_numeric(raw_y, errors='coerce').fillna(0).astype(int).values
                            except Exception:
                                y = "Unsupervised"
                    else:
                        y = np.nan_to_num(raw_y, nan=0).astype(int)
                    feature_df = df.drop(columns=[found_label_col])
                else:
                    y = "Unsupervised"
                    feature_df = df

                # Drop datetime / text ID columns if present
                numeric_cols = []
                for c in feature_df.columns:
                    if pd.api.types.is_numeric_dtype(feature_df[c]):
                        numeric_cols.append(c)
                
                if numeric_cols:
                    clean_features = feature_df[numeric_cols].fillna(feature_df[numeric_cols].median())
                    X = clean_features.values
                else:
                    X = np.nan_to_num(pd.to_numeric(feature_df.iloc[:, :], errors='coerce').values, nan=0.0)

            elif ext == ".mat":
                mat = scipy.io.loadmat(self.filepath)
                arrays = [v for k, v in mat.items() if not k.startswith("__")]
                X = arrays[0] if len(arrays) >= 1 else np.empty((0, 0))
                y = arrays[1] if len(arrays) >= 2 else "Unsupervised"
                if isinstance(y, np.ndarray) and y.ndim > 1:
                    y = y.ravel()

            elif ext == ".npy":
                X = np.load(self.filepath, allow_pickle=True)
                y = "time-series"

            elif ext == ".pt":
                if TORCH_AVAILABLE:
                    X = torch.load(self.filepath, map_location='cpu', weights_only=False)
                    y = "graph"
                else:
                    raise ImportError("PyTorch is required to load .pt files")

            elif ext in [".png", ".jpg", ".jpeg", ".bmp"]:
                if PIL_AVAILABLE:
                    img = Image.open(self.filepath).convert("RGB")
                    X = np.array(img)
                    y = "image"
                else:
                    raise ImportError("Pillow is required for image files")

            elif ext in [".mp4", ".avi", ".mov"]:
                X = self.filepath
                y = "video"

            else:
                print(f"❌ Unsupported file: {self.filepath}")
                X, y = np.empty((0, 0)), "Unsupervised"

        except Exception as e:
            print(f"❌ Error loading {self.filepath}: {e}")
            X, y = np.empty((0, 0)), "Unsupervised"

        # Optional train/test split for labeled tabular data
        if split_data and isinstance(X, np.ndarray) and isinstance(y, np.ndarray) and X.shape[0] == y.shape[0]:
            from sklearn.model_selection import train_test_split
            X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)
            return X_train, X_test, y_train, y_test

        return X, y
