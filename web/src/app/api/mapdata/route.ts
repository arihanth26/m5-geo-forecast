import fs from "fs";
import path from "path";
import { NextResponse } from "next/server";

function safeNum(x: any) {
  return typeof x === "number" && Number.isFinite(x) ? x : null;
}

function quantile(sorted: number[], q: number) {
  if (!sorted.length) return 0;
  const pos = (sorted.length - 1) * q;
  const base = Math.floor(pos);
  const rest = pos - base;
  if (sorted[base + 1] === undefined) return sorted[base];
  return sorted[base] + rest * (sorted[base + 1] - sorted[base]);
}

export async function GET() {
  const keplerPath = path.join(process.cwd(), "data", "kepler_data.json");

  if (!fs.existsSync(keplerPath)) {
    return NextResponse.json(
      { error: `Missing file at ${keplerPath}. Put kepler_data.json inside web/data/` },
      { status: 500 }
    );
  }

  const raw = fs.readFileSync(keplerPath, "utf-8");
  const kepler = JSON.parse(raw);

  const table = (kepler.table ?? kepler.data ?? []) as Array<Record<string, any>>;
  const geojson = kepler.geojson ?? kepler.features ?? kepler;

  // time index from week_start
  const time_index = Array.from(new Set(table.map((r: any) => String(r.week_start)))).sort((a, b) =>
    a.localeCompare(b)
  );

  // split index: first week where y_true is null (forecast region)
  let split_index = time_index.length;
  for (let i = 0; i < time_index.length; i++) {
    const wk = time_index[i];
    const rows = table.filter((r: any) => String(r.week_start) === wk);
    if (rows.some((r: any) => r.y_true == null)) {
      split_index = i;
      break;
    }
  }

  // available metrics (numeric columns except ids)
  const sample = table[0] ?? {};
  const available_metrics = Object.keys(sample).filter((k) => {
    if (["state_id", "week_start", "date", "id"].includes(k)) return false;
    const v = sample[k];
    return typeof v === "number" || v == null;
  });

  const default_metric =
    available_metrics.includes("y_true") ? "y_true" : available_metrics[0] ?? "y_true";

  // per-metric stats for legend scaling
  const stats: Record<string, any> = {};
  for (const k of available_metrics) {
    const arr: number[] = [];
    for (const r of table) {
      const v = safeNum(r[k]);
      if (v != null) arr.push(v);
    }
    arr.sort((a, b) => a - b);
    stats[k] = {
      min: arr.length ? arr[0] : 0,
      max: arr.length ? arr[arr.length - 1] : 1,
      p05: quantile(arr, 0.05),
      p50: quantile(arr, 0.5),
      p95: quantile(arr, 0.95),
    };
  }

  return NextResponse.json({
    meta: { time_index, split_index, available_metrics, default_metric, stats },
    geojson,
    table,
  });
}
