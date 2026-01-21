from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
DATA_RAW = ROOT / "data" / "raw"
DATA_PROCESSED = ROOT / "data" / "processed"
DATA_GEO = ROOT / "data" / "geo"

OUT = ROOT / "outputs"
OUT_TABLES = OUT / "tables"
OUT_SITE = OUT / "site"

for p in [DATA_PROCESSED, OUT, OUT_TABLES, OUT_SITE]:
    p.mkdir(parents=True, exist_ok=True)

TEST_WEEKS = 8
LSTM_LOOKBACK = 12
SEED = 42

# Keep the deployment light: only M5 states
STATES = ["CA", "TX", "WI"]
