import numpy as np
import pandas as pd
import torch
import torch.nn as nn
from torch.utils.data import Dataset, DataLoader
from tqdm import tqdm
from src.config import DATA_PROCESSED, OUT_TABLES, TEST_WEEKS, LSTM_LOOKBACK, SEED

torch.manual_seed(SEED)
np.random.seed(SEED)

class WinDS(Dataset):
    def __init__(self, X, s, y):
        self.X = torch.tensor(X, dtype=torch.float32)
        self.s = torch.tensor(s, dtype=torch.long)
        self.y = torch.tensor(y, dtype=torch.float32)
    def __len__(self): return len(self.y)
    def __getitem__(self, i): return self.X[i], self.s[i], self.y[i]

class Model(nn.Module):
    def __init__(self, n_states, emb=4, hidden=32):
        super().__init__()
        self.emb = nn.Embedding(n_states, emb)
        self.lstm = nn.LSTM(input_size=3, hidden_size=hidden, batch_first=True)
        self.head = nn.Sequential(nn.Linear(hidden+emb, 32), nn.ReLU(), nn.Linear(32,1))
    def forward(self, x, s):
        _, (h, _) = self.lstm(x)
        h = h[-1]
        e = self.emb(s)
        return self.head(torch.cat([h,e], dim=1)).squeeze(1)

def make_windows(g, lookback):
    g = g.sort_values("week_start").reset_index(drop=True)
    X, y, meta = [], [], []
    for i in range(lookback, len(g)):
        X.append(g.iloc[i-lookback:i][["y_scaled","snap","event_flag"]].values)
        y.append(g.iloc[i]["y"])
        meta.append((g.iloc[i]["wm_yr_wk"], g.iloc[i]["week_start"]))
    return np.array(X), np.array(y), meta

def main():
    df = pd.read_csv(DATA_PROCESSED / "state_week.csv", parse_dates=["week_start"])
    states = sorted(df["state_id"].unique().tolist())
    s2i = {s:i for i,s in enumerate(states)}
    df["sidx"] = df["state_id"].map(s2i).astype(int)

    # per-state scaling
    df["y_scaled"] = 0.0
    for s, g in df.groupby("state_id"):
        mu, sd = g["y"].mean(), g["y"].std()
        sd = sd if sd and sd > 1e-6 else 1.0
        df.loc[g.index, "y_scaled"] = (g["y"] - mu) / sd

    X_all, y_all, s_all, meta_all, is_test_all = [], [], [], [], []
    for s, g in df.groupby("state_id"):
        X, y, meta = make_windows(g, LSTM_LOOKBACK)
        n = len(y)
        is_test = np.array([False]*(n-TEST_WEEKS) + [True]*TEST_WEEKS)
        X_all.append(X); y_all.append(y)
        s_all.append(np.full(n, s2i[s], dtype=int))
        meta_all.extend([(s, meta[i][0], meta[i][1]) for i in range(n)])
        is_test_all.extend(is_test.tolist())

    X_all = np.concatenate(X_all, 0)
    y_all = np.concatenate(y_all, 0)
    s_all = np.concatenate(s_all, 0)
    is_test_all = np.array(is_test_all)

    Xtr, ytr, str_ = X_all[~is_test_all], y_all[~is_test_all], s_all[~is_test_all]
    Xte, yte, ste = X_all[is_test_all], y_all[is_test_all], s_all[is_test_all]

    tr = DataLoader(WinDS(Xtr, str_, ytr), batch_size=64, shuffle=True)
    te = DataLoader(WinDS(Xte, ste, yte), batch_size=256, shuffle=False)

    device = torch.device("cuda" if torch.cuda.is_available() else "cpu")
    m = Model(len(states)).to(device)
    opt = torch.optim.Adam(m.parameters(), lr=1e-3)
    loss_fn = nn.L1Loss()

    m.train()
    for epoch in range(8):
        tot = 0.0
        for x, s, y in tqdm(tr, desc=f"epoch {epoch+1}/8"):
            x, s, y = x.to(device), s.to(device), y.to(device)
            opt.zero_grad()
            pred = m(x, s)
            loss = loss_fn(pred, y)
            loss.backward()
            opt.step()
            tot += loss.item()
        print("train_mae", tot/len(tr))

    m.eval()
    preds = []
    with torch.no_grad():
        for x, s, y in te:
            x, s = x.to(device), s.to(device)
            preds.append(m(x, s).cpu().numpy())
    preds = np.concatenate(preds)

    # Build output table aligned to test rows in meta order
    test_meta = [meta_all[i] for i in range(len(meta_all)) if is_test_all[i]]
    out = pd.DataFrame(test_meta, columns=["state_id","wm_yr_wk","week_start"])
    out["y_true"] = yte
    out["yhat_lstm"] = np.clip(preds, 0, None)

    path = OUT_TABLES / "pred_lstm.csv"
    out.to_csv(path, index=False)
    print("saved", path)

if __name__ == "__main__":
    main()
