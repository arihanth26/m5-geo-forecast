import numpy as np
import pandas as pd
from src.config import OUT_TABLES

def wape(y, yhat):
    y = np.asarray(y, float); yhat = np.asarray(yhat, float)
    denom = np.sum(np.abs(y))
    return float(np.sum(np.abs(y - yhat)) / (denom if denom != 0 else 1.0))

def bias(y, yhat):
    y = np.asarray(y, float); yhat = np.asarray(yhat, float)
    denom = np.sum(y)
    return float(np.sum(yhat - y) / (denom if denom != 0 else 1.0))

def main():
    sar = pd.read_csv(OUT_TABLES / "pred_sarimax.csv", parse_dates=["week_start"])
    lgb = pd.read_csv(OUT_TABLES / "pred_lgbm.csv", parse_dates=["week_start"])
    lstm = pd.read_csv(OUT_TABLES / "pred_lstm.csv", parse_dates=["week_start"])

    df = sar.merge(lgb, on=["state_id","wm_yr_wk","week_start","y_true"], how="inner")
    df = df.merge(lstm, on=["state_id","wm_yr_wk","week_start","y_true"], how="inner")

    overall = {
        "wape": {
            "sarimax": wape(df.y_true, df.yhat_sarimax),
            "lgbm": wape(df.y_true, df.yhat_lgbm),
            "lstm": wape(df.y_true, df.yhat_lstm),
        },
        "bias": {
            "sarimax": bias(df.y_true, df.yhat_sarimax),
            "lgbm": bias(df.y_true, df.yhat_lgbm),
            "lstm": bias(df.y_true, df.yhat_lstm),
        }
    }

    by_state = []
    for s, g in df.groupby("state_id"):
        by_state.append({
            "state_id": s,
            "wape_sarimax": wape(g.y_true, g.yhat_sarimax),
            "wape_lgbm": wape(g.y_true, g.yhat_lgbm),
            "wape_lstm": wape(g.y_true, g.yhat_lstm),
            "bias_sarimax": bias(g.y_true, g.yhat_sarimax),
            "bias_lgbm": bias(g.y_true, g.yhat_lgbm),
            "bias_lstm": bias(g.y_true, g.yhat_lstm),
        })

    df.to_csv(OUT_TABLES / "pred_all_models.csv", index=False)
    pd.DataFrame(by_state).to_csv(OUT_TABLES / "metrics_by_state.csv", index=False)
    pd.DataFrame([overall]).to_json(OUT_TABLES / "metrics_overall.json", orient="records")

    print("saved pred_all_models.csv + metrics")

if __name__ == "__main__":
    main()
