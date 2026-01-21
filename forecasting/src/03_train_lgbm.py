import pandas as pd
import lightgbm as lgb
from src.config import DATA_PROCESSED, OUT_TABLES, TEST_WEEKS

def add_feats(g):
    g = g.sort_values("week_start").copy()
    for lag in [1,2,4,8]:
        g[f"lag_{lag}"] = g["y"].shift(lag)
    for w in [4,8]:
        g[f"roll_mean_{w}"] = g["y"].shift(1).rolling(w).mean()
    return g

def main():
    df = pd.read_csv(DATA_PROCESSED / "state_week.csv", parse_dates=["week_start"])
    df = df.groupby("state_id", group_keys=False).apply(add_feats).dropna().reset_index(drop=True)
    df["state_id"] = df["state_id"].astype("category")

    df["rank"] = df.groupby("state_id")["week_start"].rank(method="first")
    df["max_rank"] = df.groupby("state_id")["rank"].transform("max")
    df["is_test"] = df["rank"] > (df["max_rank"] - TEST_WEEKS)

    feats = ["state_id","snap","event_flag","lag_1","lag_2","lag_4","lag_8","roll_mean_4","roll_mean_8"]
    train = df[~df["is_test"]]
    test = df[df["is_test"]].copy()

    dtrain = lgb.Dataset(train[feats], label=train["y"], categorical_feature=["state_id"])
    params = dict(objective="poisson", learning_rate=0.05, num_leaves=31, min_data_in_leaf=20, seed=42, verbosity=-1)
    model = lgb.train(params, dtrain, num_boost_round=600)

    test["yhat_lgbm"] = model.predict(test[feats]).clip(min=0)
    out = test[["state_id","wm_yr_wk","week_start"]].copy()
    out["y_true"] = test["y"].values
    out["yhat_lgbm"] = test["yhat_lgbm"].values

    path = OUT_TABLES / "pred_lgbm.csv"
    out.to_csv(path, index=False)
    print("saved", path)

if __name__ == "__main__":
    main()
