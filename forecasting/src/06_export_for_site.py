import json
import pandas as pd
import geopandas as gpd
from src.config import DATA_GEO, DATA_PROCESSED, OUT_TABLES, OUT_SITE

def main():
    pred = pd.read_csv(OUT_TABLES / "pred_all_models.csv", parse_dates=["week_start"])
    base = pd.read_csv(DATA_PROCESSED / "state_week.csv", parse_dates=["week_start"])

    m = pred.merge(
        base[["state_id","wm_yr_wk","week_start","y"]].rename(columns={"y":"y_actual"}),
        on=["state_id","wm_yr_wk","week_start"],
        how="left"
    )

    # errors
    for c in ["yhat_sarimax","yhat_lgbm","yhat_lstm"]:
        m[f"abs_err_{c}"] = (m[c] - m["y_true"]).abs()

    # states geojson (filter to CA/TX/WI)
    gdf = gpd.read_file(DATA_GEO / "us_states.geojson")

    # Try common column names that might contain 2-letter codes
    candidate_cols = ["STUSPS", "state_id", "STATE_ABBR", "abbr", "postal", "CODE", "code"]
    code_col = None
    for c in candidate_cols:
        if c in gdf.columns:
            code_col = c
            break

    # Fallback: try to find a column whose values look like 2-letter state codes
    if code_col is None:
        for c in gdf.columns:
            if gdf[c].dtype == object:
                vals = gdf[c].dropna().astype(str).str.strip()
                # heuristic: many values are length 2 and uppercase
                if (vals.str.len() == 2).mean() > 0.6 and (vals.str.upper().eq(vals)).mean() > 0.6:
                    code_col = c
                    break

    if code_col is None:
        raise ValueError(f"Could not find a state code column. Available columns: {list(gdf.columns)}")

    gdf["state_id"] = gdf[code_col].astype(str).str.strip()
    print(f"Using state code column: {code_col}")
    gdf = gdf[gdf["state_id"].isin(m["state_id"].unique())][["state_id","geometry"]]

    # output format for kepler addDataToMap: {datasets:[...], config:..., options:...}
    # We'll load data and apply config client-side for flexibility.
    payload = {
        "table": m.assign(week_start=m["week_start"].dt.strftime("%Y-%m-%d")).to_dict(orient="records"),
        "geojson": json.loads(gdf.to_json())
    }

    out = OUT_SITE / "kepler_data.json"
    out.write_text(json.dumps(payload))
    print("saved", out)

    # metrics json
    (OUT_SITE / "metrics_overall.json").write_text((OUT_TABLES / "metrics_overall.json").read_text())
    # by_state as json
    by_state = pd.read_csv(OUT_TABLES / "metrics_by_state.csv").to_dict(orient="records")
    (OUT_SITE / "metrics_by_state.json").write_text(json.dumps(by_state))
    print("saved metrics json")

if __name__ == "__main__":
    main()
