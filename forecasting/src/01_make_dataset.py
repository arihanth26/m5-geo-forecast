import numpy as np
import pandas as pd
from src.config import DATA_RAW, DATA_PROCESSED, STATES

def main():
    sales = pd.read_csv(DATA_RAW / "sales_train_validation.csv")
    cal = pd.read_csv(DATA_RAW / "calendar.csv")

    sales = sales[sales["state_id"].isin(STATES)].copy()

    d_cols = [c for c in sales.columns if c.startswith("d_")]
    sales_long = sales.melt(
        id_vars=["store_id","state_id"],
        value_vars=d_cols,
        var_name="d",
        value_name="sales"
    )

    cal_small = cal[["d","date","wm_yr_wk","event_name_1","snap_CA","snap_TX","snap_WI"]].copy()
    cal_small["date"] = pd.to_datetime(cal_small["date"])

    df = sales_long.merge(cal_small, on="d", how="left")

    df["snap"] = np.where(df["state_id"]=="CA", df["snap_CA"],
                   np.where(df["state_id"]=="TX", df["snap_TX"], df["snap_WI"]))
    df["event_flag"] = df["event_name_1"].notna().astype(int)

    agg = (df.groupby(["state_id","wm_yr_wk"], as_index=False)
             .agg(y=("sales","sum"), snap=("snap","mean"), event_flag=("event_flag","max")))

    wk_to_date = cal.groupby("wm_yr_wk")["date"].min().reset_index().rename(columns={"date":"week_start"})
    agg = agg.merge(wk_to_date, on="wm_yr_wk", how="left")
    agg["week_start"] = pd.to_datetime(agg["week_start"])
    agg = agg.sort_values(["state_id","week_start"]).reset_index(drop=True)

    out = DATA_PROCESSED / "state_week.csv"
    agg.to_csv(out, index=False)
    print("saved", out, "rows", len(agg))

if __name__ == "__main__":
    main()
