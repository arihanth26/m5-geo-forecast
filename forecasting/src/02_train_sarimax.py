import pandas as pd
from statsmodels.tsa.statespace.sarimax import SARIMAX
from src.config import DATA_PROCESSED, OUT_TABLES, TEST_WEEKS

def fit_one(g):
    g = g.sort_values("week_start").reset_index(drop=True)
    y = g["y"].astype(float)
    X = g[["snap","event_flag"]].astype(float)

    n_train = len(g) - TEST_WEEKS
    y_tr, X_tr = y.iloc[:n_train], X.iloc[:n_train]
    y_te, X_te = y.iloc[n_train:], X.iloc[n_train:]

    model = SARIMAX(y_tr, exog=X_tr, order=(1,1,1), enforce_stationarity=False, enforce_invertibility=False)
    res = model.fit(disp=False)

    yhat = res.get_forecast(steps=len(y_te), exog=X_te).predicted_mean.clip(lower=0)

    out = g.iloc[n_train:][["state_id","wm_yr_wk","week_start"]].copy()
    out["y_true"] = y_te.values
    out["yhat_sarimax"] = yhat.values
    return out

def main():
    df = pd.read_csv(DATA_PROCESSED / "state_week.csv", parse_dates=["week_start"])
    pred = pd.concat([fit_one(g) for _, g in df.groupby("state_id")], ignore_index=True)
    path = OUT_TABLES / "pred_sarimax.csv"
    pred.to_csv(path, index=False)
    print("saved", path)

if __name__ == "__main__":
    main()
