import geopandas as gpd
from pathlib import Path

# Base path = forecasting/
ROOT = Path(__file__).resolve().parents[1]
GEO_DIR = ROOT / "data" / "geo"

# Read the Census shapefile
shp_path = GEO_DIR / "cb_2023_us_state_20m.shp"
gdf = gpd.read_file(shp_path)


gdf = gdf[["STUSPS", "NAME", "geometry"]].rename(columns={"STUSPS": "state_id"})

# Write GeoJSON for Kepler
out_path = GEO_DIR / "us_states.geojson"
gdf.to_file(out_path, driver="GeoJSON")

print("Saved:", out_path)
print("Columns:", gdf.columns.tolist())
print("States:", gdf["state_id"].unique())
