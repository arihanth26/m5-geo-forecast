"use client";

import React, { useEffect, useId, useMemo, useRef, useState } from "react";
import { GeoJsonLayer } from "@deck.gl/layers";
import { MapboxOverlay } from "@deck.gl/mapbox";
import MapGL, { NavigationControl, useControl, type MapRef } from "react-map-gl/maplibre";
import "maplibre-gl/dist/maplibre-gl.css";

import { useMapStore } from "@/store/useMapStore";
import { clamp01, turboRGBA } from "@/utils/colors";

// Optional: nicer 3D lighting (deck.gl core)
import { LightingEffect, AmbientLight, PointLight } from "@deck.gl/core";

type Stats = { min: number; max: number; p05: number; p50: number; p95: number };

type MapPayload = {
  meta: {
    time_index: string[]; // daily
    split_index: number; // daily index where forecast starts
    day_to_week: Record<string, string>; // map day -> bucket
    stats: Record<string, Stats>; // per metric stats
  };
  geojson: any;
  table: Array<Record<string, any>>;
};

const STYLE_URL = "https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json";

// Only the states considered in this project
const PROJECT_STATE_IDS = new Set(
  ["CA", "TX", "WI", "WA", "PA", "NY", "GA", "FL", "CO", "IA", "MA"].map((s) =>
    s.toUpperCase()
  )
);

function normalizeStateId(x: any) {
  if (x == null) return "";
  return String(x).trim().toUpperCase();
}

// Canonical display names for your in-project states
const STATE_NAME_BY_ID: Record<string, string> = {
  CA: "California",
  TX: "Texas",
  WI: "Wisconsin",
  WA: "Washington",
  PA: "Pennsylvania",
  NY: "New York",
  GA: "Georgia",
  FL: "Florida",
  CO: "Colorado",
  IA: "Iowa",
  MA: "Massachusetts",
};

function getStateId(f: any) {
  const p = f?.properties ?? {};
  // Prefer true ID-like fields ONLY (avoid using "name" as id)
  return normalizeStateId(p.state_id ?? p.STUSPS ?? p.STATE ?? p.state ?? p.id ?? p.ID);
}

function getStateName(f: any) {
  const p = f?.properties ?? {};
  const sid = getStateId(f);

  // 1) Always prefer canonical full name for project states
  if (sid && STATE_NAME_BY_ID[sid]) return STATE_NAME_BY_ID[sid];

  // 2) Otherwise try true name fields
  const raw =
    p.name ??
    p.NAME ??
    p.state_name ??
    p.STATE_NAME ??
    p.State_Name ??
    p.state ??
    null;

  const s = raw != null ? String(raw).trim() : "";

  // If it's a real name (not just "CA"), use it
  if (s && s.length > 2) return s;

  // 3) Last resort: show id
  if (sid) return sid;

  return "State";
}

function formatNumber(x: any) {
  if (typeof x !== "number" || !Number.isFinite(x)) return "—";
  const ax = Math.abs(x);
  if (ax >= 1_000_000) return `${(x / 1_000_000).toFixed(2)}M`;
  if (ax >= 1000) return `${(x / 1000).toFixed(1)}k`;
  if (ax >= 100) return x.toFixed(1);
  return x.toFixed(2);
}

function safeDiv(a: number, b: number) {
  if (!Number.isFinite(a) || !Number.isFinite(b) || b === 0) return 0;
  return a / b;
}

function formatPct(p: number | null) {
  if (p == null || !Number.isFinite(p)) return "—";
  const sign = p > 0 ? "+" : "";
  return `${sign}${p.toFixed(1)}%`;
}

// Green -> Yellow -> Red for error
function errRGBA(x01: number, alpha = 235): [number, number, number, number] {
  const x = clamp01(x01);
  if (x <= 0.5) {
    const u = x / 0.5; // green -> yellow
    const r = Math.round(60 + (255 - 60) * u);
    const g = 220;
    const b = Math.round(60 + (40 - 60) * u);
    return [r, g, b, alpha];
  }
  const u = (x - 0.5) / 0.5; // yellow -> red
  const r = 255;
  const g = Math.round(220 + (70 - 220) * u);
  const b = 40;
  return [r, g, b, alpha];
}

function DeckOverlay({
  layers,
  effects,
  onHover,
  onClick,
}: {
  layers: any[];
  effects?: any[];
  onHover: (info: any) => void;
  onClick: (info: any) => void;
}) {
  const overlay = useControl<MapboxOverlay>(
    () => new MapboxOverlay({ layers, effects, onHover, onClick })
  );
  overlay.setProps({ layers, effects, onHover, onClick });
  return null;
}

/**
 * Fixes GeoJSON coordinate order issues (lat/lon swapped) without changing layout.
 */
function fixGeoJsonLonLatOrder(geojson: any) {
  if (!geojson) return geojson;

  const swapIfNeeded = (pair: any) => {
    if (!Array.isArray(pair) || pair.length < 2) return pair;
    const a = pair[0];
    const b = pair[1];
    if (typeof a !== "number" || typeof b !== "number") return pair;

    const absA = Math.abs(a);
    const absB = Math.abs(b);

    // likely [lat, lon] for US-ish data
    if (absA <= 90 && absB > 90) return [b, a, ...pair.slice(2)];
    return pair;
  };

  const mapCoords = (coords: any): any => {
    if (!Array.isArray(coords)) return coords;

    // coord pair
    if (
      coords.length >= 2 &&
      typeof coords[0] === "number" &&
      typeof coords[1] === "number"
    ) {
      return swapIfNeeded(coords);
    }

    // nested arrays
    return coords.map(mapCoords);
  };

  const fixGeometry = (g: any) => {
    if (!g) return g;
    if (g.type === "GeometryCollection" && Array.isArray(g.geometries)) {
      return {
        ...g,
        geometries: g.geometries.map(fixGeometry),
      };
    }
    if (g.coordinates) {
      return {
        ...g,
        coordinates: mapCoords(g.coordinates),
      };
    }
    return g;
  };

  if (geojson.type === "FeatureCollection" && Array.isArray(geojson.features)) {
    return {
      ...geojson,
      features: geojson.features.map((f: any) => ({
        ...f,
        geometry: fixGeometry(f.geometry),
      })),
    };
  }

  if (geojson.type === "Feature" && geojson.geometry) {
    return {
      ...geojson,
      geometry: fixGeometry(geojson.geometry),
    };
  }

  // bare geometry
  if (geojson.coordinates) return fixGeometry(geojson);

  return geojson;
}

/**
 * Info icon with tooltip that never goes off screen.
 * Keeps layout the same, only clamps the tooltip position.
 */
function InfoTip({
  text,
  side = "auto",
}: {
  text: string;
  side?: "auto" | "right" | "left";
}) {
  const [open, setOpen] = useState(false);
  const btnRef_cfg = useRef<HTMLButtonElement | null>(null);
  const [pos, setPos] = useState<{ left: number; top: number } | null>(null);

  useEffect(() => {
    if (!open) return;

    const place = () => {
      const el = btnRef_cfg.current;
      if (!el) return;

      const r = el.getBoundingClientRect();
      const pad = 12;

      const w = 260;
      const h = 76;

      let left =
        side === "left"
          ? r.left - w - 10
          : side === "right"
          ? r.right + 10
          : r.right + 10;

      if (side === "auto" && left + w > window.innerWidth - pad) {
        left = r.left - w - 10;
      }

      left = Math.max(pad, Math.min(left, window.innerWidth - w - pad));

      let top = r.top - 6;
      top = Math.max(pad, Math.min(top, window.innerHeight - h - pad));

      setPos({ left, top });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);

    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, side]);

  return (
    <>
      <button
        ref={btnRef_cfg}
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className="ml-2 inline-flex h-5 w-5 items-center justify-center rounded-full bg-white/10 hover:bg-white/15 border border-white/10 text-white/80 text-[11px] leading-none"
        aria-label="Info"
      >
        i
      </button>

      {open && pos && (
        <div
          className="fixed z-[9999] pointer-events-none"
          style={{ left: pos.left, top: pos.top, width: 260 }}
        >
          <div className="rounded-xl bg-black/85 backdrop-blur-md border border-white/10 px-3 py-2 shadow-2xl">
            <div className="text-white/85 text-[11px] leading-snug">{text}</div>
          </div>
        </div>
      )}
    </>
  );
}

function Distribution({
  values,
  stats,
  mode,
  width = 280,
  height = 62,
  points = 80,
}: {
  values: number[];
  stats?: Stats;
  mode: "turbo" | "error";
  width?: number;
  height?: number;
  points?: number;
}) {
  const uid = useId();
  const svgRef = useRef<SVGSVGElement | null>(null);

  // smooth hover (no jitter)
  const rafRef = useRef<number | null>(null);
  const pendingXRef = useRef<number | null>(null);
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  const s = stats;
  const lo = s ? s.p05 : values.length ? Math.min(...values) : 0;
  const hi = s ? s.p95 : values.length ? Math.max(...values) : 1;
  const mid = s
    ? s.p50
    : values.length
    ? values.slice().sort((a, b) => a - b)[Math.floor(values.length / 2)]
    : 0;

  const { path, area, ticks, yPxByIdx } = useMemo(() => {
    const w = width;
    const h = height;

    if (!values.length || !(hi > lo)) {
      return {
        path: "",
        area: "",
        ticks: { p05x: 0, p50x: w * 0.5, p95x: w },
        yPxByIdx: new Array(points).fill(h / 2) as number[],
      };
    }

    const clamped = values
      .filter((v) => typeof v === "number" && Number.isFinite(v))
      .map((v) => Math.min(hi, Math.max(lo, v)));

    const span = hi - lo;
    const bw = Math.max(1e-9, span * 0.12);
    const inv2bw2 = 1 / (2 * bw * bw);

    const xs: number[] = [];
    const ys: number[] = [];

    for (let i = 0; i < points; i++) {
      const x = lo + (i / (points - 1)) * span;
      xs.push(x);

      let sum = 0;
      for (const v of clamped) {
        const d = x - v;
        sum += Math.exp(-d * d * inv2bw2);
      }
      ys.push(sum / Math.max(1, clamped.length));
    }

    const maxY = Math.max(1e-9, ...ys);

    const xToPx = (x: number) => {
      const t = clamp01((x - lo) / span);
      return 1 + t * (w - 2);
    };

    const yToPx = (y: number) => {
      const t = y / maxY;
      return h - 8 - t * (h - 16) + 4;
    };

    const yPxByIdx = ys.map((y) => yToPx(y));

    let d = "";
    for (let i = 0; i < points; i++) {
      const px = xToPx(xs[i]);
      const py = yPxByIdx[i];
      d += i === 0 ? `M ${px} ${py}` : ` L ${px} ${py}`;
    }

    const baseY = yToPx(0);
    const a = d + ` L ${xToPx(xs[points - 1])} ${baseY} L ${xToPx(xs[0])} ${baseY} Z`;

    return {
      path: d,
      area: a,
      ticks: { p05x: xToPx(lo), p50x: xToPx(mid), p95x: xToPx(hi) },
      yPxByIdx,
    };
  }, [values, lo, hi, mid, width, height, points]);

  useEffect(() => {
    return () => {
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const scheduleHover = (clientX: number) => {
    pendingXRef.current = clientX;
    if (rafRef.current != null) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;

      const svg = svgRef.current;
      const px = pendingXRef.current;
      pendingXRef.current = null;
      if (!svg || px == null) return;

      const r = svg.getBoundingClientRect();
      const localX = px - r.left;
      const x01 = clamp01((localX - 1) / Math.max(1, width - 2));
      const idx = Math.round(x01 * Math.max(0, points - 1));

      setHoverIdx((prev) => (prev === idx ? prev : idx));
    });
  };

  const gradId = `dist-grad-${mode}-${uid}`;

  const hoverX = useMemo(() => {
    if (hoverIdx == null) return null;
    return 1 + (hoverIdx / Math.max(1, points - 1)) * (width - 2);
  }, [hoverIdx, points, width]);

  const hoverY = useMemo(() => {
    if (hoverIdx == null) return null;
    return yPxByIdx?.[hoverIdx] ?? null;
  }, [hoverIdx, yPxByIdx]);

  const hoverValue = useMemo(() => {
    if (hoverIdx == null) return null;
    const x01 = hoverIdx / Math.max(1, points - 1);
    const v = lo + x01 * (hi - lo);
    return v;
  }, [hoverIdx, lo, hi, points]);

  const hoverLabelBox = useMemo(() => {
    if (hoverIdx == null || hoverX == null || hoverValue == null) return null;

    const boxW = 140;
    const boxH = 26;
    const pad = 8;

    let bx = hoverX + 10;
    if (bx + boxW > width - pad) bx = hoverX - 10 - boxW;
    bx = Math.max(pad, Math.min(bx, width - boxW - pad));

    const by = 6;

    return { bx, by, boxW, boxH };
  }, [hoverIdx, hoverX, hoverValue, width]);

  return (
    <svg
      ref={svgRef}
      width={width}
      height={height}
      className="block"
      onPointerMove={(e) => scheduleHover(e.clientX)}
      onPointerEnter={(e) => scheduleHover(e.clientX)}
      onPointerLeave={() => setHoverIdx(null)}
    >
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="1" y2="0">
          {mode === "error" ? (
            <>
              <stop offset="0%" stopColor="#2bdc5a" stopOpacity="0.65" />
              <stop offset="55%" stopColor="#f7d84a" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#ff3b30" stopOpacity="0.65" />
            </>
          ) : (
            <>
              <stop offset="0%" stopColor="#2b7bff" stopOpacity="0.65" />
              <stop offset="40%" stopColor="#00ffd1" stopOpacity="0.65" />
              <stop offset="70%" stopColor="#ffe14a" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#ff2d55" stopOpacity="0.65" />
            </>
          )}
        </linearGradient>
      </defs>

      <rect
        x={0}
        y={0}
        width={width}
        height={height}
        rx={10}
        fill="rgba(255,255,255,0.03)"
        stroke="rgba(255,255,255,0.06)"
      />

      {area && <path d={area} fill={`url(#${gradId})`} opacity={0.9} />}
      {path && (
        <path d={path} fill="none" stroke="rgba(255,255,255,0.72)" strokeWidth={2} />
      )}

      <line
        x1={ticks.p05x}
        y1={6}
        x2={ticks.p05x}
        y2={height - 6}
        stroke="rgba(255,255,255,0.18)"
        strokeDasharray="3 3"
      />
      <line
        x1={ticks.p95x}
        y1={6}
        x2={ticks.p95x}
        y2={height - 6}
        stroke="rgba(255,255,255,0.18)"
        strokeDasharray="3 3"
      />
      <line
        x1={ticks.p50x}
        y1={4}
        x2={ticks.p50x}
        y2={height - 4}
        stroke="rgba(255,255,255,0.55)"
      />
      <circle cx={ticks.p50x} cy={height - 10} r={3} fill="rgba(255,255,255,0.85)" />

      {/* Hover readout between p05 and p95 */}
      {hoverX != null && hoverY != null && hoverValue != null && (
        <>
          <line
            x1={hoverX}
            y1={6}
            x2={hoverX}
            y2={height - 6}
            stroke="rgba(255,255,255,0.28)"
          />
          <circle cx={hoverX} cy={hoverY} r={3.2} fill="rgba(255,255,255,0.92)" />
          {hoverLabelBox && (
            <>
              <rect
                x={hoverLabelBox.bx}
                y={hoverLabelBox.by}
                width={hoverLabelBox.boxW}
                height={hoverLabelBox.boxH}
                rx={10}
                fill="rgba(0,0,0,0.70)"
                stroke="rgba(255,255,255,0.10)"
              />
              <text
                x={hoverLabelBox.bx + 10}
                y={hoverLabelBox.by + 17}
                fill="rgba(255,255,255,0.85)"
                fontSize={10}
              >
                value: {formatNumber(hoverValue)}
              </text>
            </>
          )}
        </>
      )}

      <text x={8} y={height - 8} fill="rgba(255,255,255,0.45)" fontSize={10}>
        p05
      </text>
      <text
        x={width / 2}
        y={height - 8}
        fill="rgba(255,255,255,0.55)"
        fontSize={10}
        textAnchor="middle"
      >
        median
      </text>
      <text
        x={width - 8}
        y={height - 8}
        fill="rgba(255,255,255,0.45)"
        fontSize={10}
        textAnchor="end"
      >
        p95
      </text>
    </svg>
  );
}

function Sparkline({
  seriesA,
  seriesB,
  splitAt,
  labelA = "Actual",
  labelB = "Forecast",
  width = 280,
  height = 70,
}: {
  seriesA: Array<number | null>;
  seriesB: Array<number | null>;
  splitAt: number;
  labelA?: string;
  labelB?: string;
  width?: number;
  height?: number;
}) {
  const svgRef = useRef<SVGSVGElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const pendingXRef = useRef<number | null>(null);
  const [hoverI, setHoverI] = useState<number | null>(null);

  const { pathA, pathB, minV, maxV } = useMemo(() => {
    const all: number[] = [];
    for (const v of seriesA) if (typeof v === "number" && Number.isFinite(v)) all.push(v);
    for (const v of seriesB) if (typeof v === "number" && Number.isFinite(v)) all.push(v);
    if (!all.length) return { pathA: "", pathB: "", minV: 0, maxV: 1 };

    const minV = Math.min(...all);
    const maxV = Math.max(...all);
    const span = Math.max(1e-9, maxV - minV);

    const toXY = (i: number, v: number) => {
      const x = (i / Math.max(1, seriesA.length - 1)) * (width - 2) + 1;
      const y = (1 - (v - minV) / span) * (height - 10) + 5;
      return { x, y };
    };

    const mkPath = (s: Array<number | null>) => {
      let d = "";
      let started = false;
      s.forEach((v, i) => {
        if (typeof v !== "number" || !Number.isFinite(v)) return;
        const { x, y } = toXY(i, v);
        if (!started) {
          d += `M ${x} ${y}`;
          started = true;
        } else {
          d += ` L ${x} ${y}`;
        }
      });
      return d;
    };

    return { pathA: mkPath(seriesA), pathB: mkPath(seriesB), minV, maxV };
  }, [seriesA, seriesB, width, height]);

  const splitX = (splitAt / Math.max(1, seriesA.length - 1)) * (width - 2) + 1;

  const hoverGeom = useMemo(() => {
    if (hoverI == null) return null;
    const n = Math.max(1, seriesA.length - 1);
    const x = (hoverI / n) * (width - 2) + 1;

    const all: number[] = [];
    for (const v of seriesA) if (typeof v === "number" && Number.isFinite(v)) all.push(v);
    for (const v of seriesB) if (typeof v === "number" && Number.isFinite(v)) all.push(v);
    const min = all.length ? Math.min(...all) : 0;
    const max = all.length ? Math.max(...all) : 1;
    const span = Math.max(1e-9, max - min);

    const ya =
      typeof seriesA[hoverI] === "number" && Number.isFinite(seriesA[hoverI]!)
        ? (1 - ((seriesA[hoverI] as number) - min) / span) * (height - 10) + 5
        : null;

    const yb =
      typeof seriesB[hoverI] === "number" && Number.isFinite(seriesB[hoverI]!)
        ? (1 - ((seriesB[hoverI] as number) - min) / span) * (height - 10) + 5
        : null;

    const va =
      typeof seriesA[hoverI] === "number" && Number.isFinite(seriesA[hoverI]!)
        ? (seriesA[hoverI] as number)
        : null;

    const vb =
      typeof seriesB[hoverI] === "number" && Number.isFinite(seriesB[hoverI]!)
        ? (seriesB[hoverI] as number)
        : null;

    return { x, ya, yb, va, vb };
  }, [hoverI, seriesA, seriesB, width, height]);

  const scheduleHoverUpdate = (clientX: number) => {
    pendingXRef.current = clientX;
    if (rafRef.current != null) return;

    rafRef.current = window.requestAnimationFrame(() => {
      rafRef.current = null;

      const svg = svgRef.current;
      const px = pendingXRef.current;
      pendingXRef.current = null;
      if (!svg || px == null) return;

      const r = svg.getBoundingClientRect();
      const localX = px - r.left;
      const x01 = clamp01((localX - 1) / Math.max(1, width - 2));
      const idx = Math.round(x01 * Math.max(1, seriesA.length - 1));

      setHoverI((prev) => (prev === idx ? prev : idx));
    });
  };

  useEffect(() => {
    return () => {
      if (rafRef.current != null) window.cancelAnimationFrame(rafRef.current);
    };
  }, []);

  const tooltip = useMemo(() => {
    if (!hoverGeom) return null;
    const x = hoverGeom.x;

    const boxW = 150;
    const boxH = 40;
    const pad = 8;

    let bx = x + 10;
    if (bx + boxW > width - pad) bx = x - 10 - boxW;
    bx = Math.max(pad, Math.min(bx, width - boxW - pad));

    const by = 8;

    return { bx, by, boxW, boxH };
  }, [hoverGeom, width]);

  return (
    <div className="w-full">
      <div className="flex items-center gap-3 mb-2 text-[11px] text-white/60">
        <div className="flex items-center gap-2">
          <span className="inline-block h-[2px] w-6 bg-white/70 rounded-full" />
          <span>{labelA}</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-block h-[2px] w-6 bg-sky-300/80 rounded-full" />
          <span>{labelB}</span>
        </div>
      </div>

      <svg
        ref={svgRef}
        width={width}
        height={height}
        className="block"
        onPointerMove={(e) => scheduleHoverUpdate(e.clientX)}
        onPointerEnter={(e) => scheduleHoverUpdate(e.clientX)}
        onPointerLeave={() => setHoverI(null)}
      >
        <rect
          x={0}
          y={0}
          width={width}
          height={height}
          rx={10}
          fill="rgba(255,255,255,0.04)"
          stroke="rgba(255,255,255,0.08)"
        />
        <rect
          x={splitX}
          y={0}
          width={Math.max(0, width - splitX)}
          height={height}
          fill="rgba(60,180,255,0.08)"
          rx={10}
        />
        <line
          x1={splitX}
          y1={6}
          x2={splitX}
          y2={height - 6}
          stroke="rgba(120,200,255,0.35)"
          strokeDasharray="4 4"
        />

        <path d={pathA} fill="none" stroke="rgba(255,255,255,0.65)" strokeWidth={2} />
        <path d={pathB} fill="none" stroke="rgba(60,180,255,0.85)" strokeWidth={2} />

        <text x={10} y={height - 10} fill="rgba(255,255,255,0.55)" fontSize={10}>
          {formatNumber(minV)}
        </text>
        <text
          x={width - 10}
          y={12}
          fill="rgba(255,255,255,0.55)"
          fontSize={10}
          textAnchor="end"
        >
          {formatNumber(maxV)}
        </text>

        {hoverGeom && (
          <>
            <line
              x1={hoverGeom.x}
              y1={6}
              x2={hoverGeom.x}
              y2={height - 6}
              stroke="rgba(255,255,255,0.35)"
            />

            {hoverGeom.ya != null && (
              <circle cx={hoverGeom.x} cy={hoverGeom.ya} r={3.4} fill="rgba(255,255,255,0.90)" />
            )}
            {hoverGeom.yb != null && (
              <circle cx={hoverGeom.x} cy={hoverGeom.yb} r={3.4} fill="rgba(60,180,255,0.95)" />
            )}

            {tooltip && (
              <>
                <rect
                  x={tooltip.bx}
                  y={tooltip.by}
                  width={tooltip.boxW}
                  height={tooltip.boxH}
                  rx={10}
                  fill="rgba(0,0,0,0.70)"
                  stroke="rgba(255,255,255,0.10)"
                />
                <text
                  x={tooltip.bx + 10}
                  y={tooltip.by + 16}
                  fill="rgba(255,255,255,0.80)"
                  fontSize={10}
                >
                  {labelA}: {formatNumber(hoverGeom.va)}
                </text>
                <text
                  x={tooltip.bx + 10}
                  y={tooltip.by + 32}
                  fill="rgba(160,220,255,0.95)"
                  fontSize={10}
                >
                  {labelB}: {formatNumber(hoverGeom.vb)}
                </text>
              </>
            )}
          </>
        )}
      </svg>
    </div>
  );
}

export default function StateDemandMap() {
  const { t, viewMode, model } = useMapStore();
  const mapRef = useRef<MapRef | null>(null);

  const [payload, setPayload] = useState<MapPayload | null>(null);

  const [hover, setHover] = useState<{
    x: number;
    y: number;
    stateId: string;
    stateName: string;
    value: number | null;
  } | null>(null);

  const [pinned, setPinned] = useState<{
    stateId: string;
    stateName: string;
    centroid?: [number, number];
  } | null>(null);

  useEffect(() => {
    fetch("/api/mapdata")
      .then(async (r) => {
        if (!r.ok) throw new Error(`GET /api/mapdata failed: ${r.status}`);
        return r.json();
      })
      .then(setPayload)
      .catch((e) => console.error("Failed to load /api/mapdata:", e));
  }, []);

  // ensure geojson coordinate order matches deck.gl expectations
  const geojsonFixed = useMemo(() => {
    if (!payload?.geojson) return null;
    return fixGeoJsonLonLatOrder(payload.geojson);
  }, [payload?.geojson]);

  const timeIndex = payload?.meta.time_index ?? [];
  const n = timeIndex.length;
  const safeT = Math.max(0, Math.min(t, Math.max(0, n - 1)));

  const day = timeIndex[safeT];
  const prevDay = timeIndex[Math.max(0, safeT - 1)];
  const week = payload?.meta.day_to_week?.[day] ?? day;
  const prevWeek = payload?.meta.day_to_week?.[prevDay] ?? prevDay;

  const isHistoric = payload ? safeT < payload.meta.split_index : true;

  const metricKey = useMemo(() => {
    if (viewMode === "actual") return "y_true";
    if (viewMode === "forecast") return `yhat_${model}`;
    return `abs_err_yhat_${model}`;
  }, [viewMode, model]);

  const unitText = useMemo(() => {
    // keep it consistent and explicit
    return "units";
  }, []);

  const domain = useMemo(() => {
    const s = payload?.meta.stats?.[metricKey];
    if (!s) return { lo: 0, hi: 1, mid: 0.5 };
    const lo = Number.isFinite(s.p05) ? s.p05 : s.min;
    const hi = Number.isFinite(s.p95) ? s.p95 : s.max;
    return { lo, hi: Math.max(lo + 1e-9, hi), mid: s.p50 };
  }, [payload, metricKey]);

  const colorFn = useMemo(() => {
    return (v: number) => {
      const x01 = clamp01((v - domain.lo) / (domain.hi - domain.lo));
      if (viewMode === "abs_error") return errRGBA(x01, 235);
      return turboRGBA(x01, 235);
    };
  }, [domain.lo, domain.hi, viewMode]);

  const valueByState = useMemo(() => {
    const m = new globalThis.Map<string, number>();
    if (!payload || !week) return m;
    for (const r of payload.table) {
      if (String(r.week_start) !== String(week)) continue;
      const sid = normalizeStateId(r.state_id);
      const v = r[metricKey];
      if (typeof v === "number" && Number.isFinite(v)) m.set(sid, v);
    }
    return m;
  }, [payload, week, metricKey]);

  const prevValueByState = useMemo(() => {
    const m = new globalThis.Map<string, number>();
    if (!payload || !prevWeek) return m;
    for (const r of payload.table) {
      if (String(r.week_start) !== String(prevWeek)) continue;
      const sid = normalizeStateId(r.state_id);
      const v = r[metricKey];
      if (typeof v === "number" && Number.isFinite(v)) m.set(sid, v);
    }
    return m;
  }, [payload, prevWeek, metricKey]);

  // only states in this project (prevents contribution and ranks from including others)
  const allStateIds = useMemo(() => {
    const ids = new Set<string>();

    const feats = geojsonFixed?.features;
    if (Array.isArray(feats)) {
      for (const f of feats) {
        const sid = getStateId(f);
        if (PROJECT_STATE_IDS.has(sid)) ids.add(sid);
      }
    }

    // fallback: ensure any state present in the table is included if it is in-project
    for (const k of valueByState.keys()) {
      const sid = normalizeStateId(k);
      if (PROJECT_STATE_IDS.has(sid)) ids.add(sid);
    }

    return Array.from(ids).filter(Boolean);
  }, [geojsonFixed, valueByState]);

  // Insights + distribution values (only in-project states)
  const insights = useMemo(() => {
    const entries: Array<[string, number]> = allStateIds.map((sid) => [sid, valueByState.get(sid) ?? 0]);

    const vals = entries.map(([, v]) => v);

    const total = vals.reduce((a, b) => a + b, 0);
    const avg = vals.length ? total / vals.length : 0;

    const top = [...entries].sort((a, b) => b[1] - a[1]).slice(0, 3);
    const bottom = [...entries].sort((a, b) => a[1] - b[1]).slice(0, 3);

    const deltas = entries.map(([sid, v]) => {
      const pv = prevValueByState.get(sid) ?? 0;
      const d = v - pv;
      const pct = pv !== 0 ? (d / pv) * 100 : null;
      return { sid, v, pv, d, pct };
    });

    const risers = [...deltas].sort((a, b) => b.d - a.d).slice(0, 5);
    const droppers = [...deltas].sort((a, b) => a.d - b.d).slice(0, 5);

    return { total, avg, top, bottom, risers, droppers, vals };
  }, [allStateIds, valueByState, prevValueByState]);

  const modeLabel = useMemo(() => {
    if (viewMode === "actual") return "Historic Actuals";
    if (viewMode === "forecast") return `Forecast (${model.toUpperCase()})`;
    return `Abs Error (${model.toUpperCase()})`;
  }, [viewMode, model]);

  const unitsLabel = viewMode === "abs_error" ? `Abs error (${unitText})` : `Units (demand)`;

  // Highlight top outlines for quick inference
  const topSet = useMemo(() => new Set(insights.top.map(([sid]) => sid)), [insights.top]);

  const effects = useMemo(() => {
    const ambient = new AmbientLight({ color: [255, 255, 255], intensity: 0.35 });
    const key = new PointLight({ color: [255, 255, 255], intensity: 0.9, position: [-90, 40, 8000] });
    const fill = new PointLight({ color: [120, 200, 255], intensity: 0.5, position: [-110, 30, 5000] });
    return [new LightingEffect({ ambient, key, fill })];
  }, []);

  const layers = useMemo(() => {
    if (!geojsonFixed) return [];
    const baseId = `${metricKey}-${day ?? "no-day"}-${week ?? "no-week"}`;

    return [
      new GeoJsonLayer({
        id: `states-glow-${baseId}`,
        data: geojsonFixed,
        pickable: false,
        stroked: true,
        filled: false,
        getLineColor: viewMode === "abs_error" ? [255, 120, 80, 60] : [0, 255, 200, 60],
        lineWidthMinPixels: 3,
      }),

      new GeoJsonLayer({
        id: `states-fill-${baseId}`,
        data: geojsonFixed,
        pickable: true,
        stroked: true,
        filled: true,
        extruded: true,
        autoHighlight: true,
        highlightColor: [255, 255, 255, 120],

        // Only color in-project states. Others stay faint, without affecting logic.
        getFillColor: (f: any) => {
          const sid = getStateId(f);
          if (!PROJECT_STATE_IDS.has(sid)) return [120, 120, 120, 12];

          const v = valueByState.get(sid) ?? 0;
          if (!valueByState.has(sid)) return [120, 120, 120, 30];
          return colorFn(v);
        },

        // Stronger depth for in-project states; no extrusion for others
        getElevation: (f: any) => {
          const sid = getStateId(f);
          if (!PROJECT_STATE_IDS.has(sid)) return 0;

          const v = valueByState.get(sid);
          if (v == null || !Number.isFinite(v)) return 0;

          const x01 = clamp01((v - domain.lo) / (domain.hi - domain.lo));
          const boosted = Math.pow(x01, 0.6);
          const amp = viewMode === "abs_error" ? 12000 : 24000;

          return amp * boosted;
        },

        getLineColor: (f: any) => {
          const sid = getStateId(f);
          if (!PROJECT_STATE_IDS.has(sid)) return [255, 255, 255, 30];
          return topSet.has(sid) ? [255, 255, 255, 210] : [255, 255, 255, 110];
        },
        lineWidthMinPixels: 1,

        transitions: { getFillColor: 450, getElevation: 450 },
      }),
    ];
  }, [geojsonFixed, valueByState, metricKey, day, week, colorFn, domain.lo, domain.hi, viewMode, topSet]);

  // Build pinned 30-day series (Actual vs Forecast) using day_to_week mapping
  const pinnedSeries = useMemo(() => {
    if (!payload || !pinned) return null;

    const sid = pinned.stateId;
    const lastN = 30;
    const end = safeT;
    const start = Math.max(0, end - (lastN - 1));
    const days = timeIndex.slice(start, end + 1);

    const idx = new Map<string, Record<string, any>>();
    for (const r of payload.table) {
      const key = `${String(r.week_start)}::${normalizeStateId(r.state_id)}`;
      idx.set(key, r);
    }

    const actual: Array<number | null> = [];
    const forecast: Array<number | null> = [];

    for (const d of days) {
      const wk = payload.meta.day_to_week?.[d] ?? d;
      const row = idx.get(`${String(wk)}::${sid}`);
      const a = row?.y_true;
      const f = row?.[`yhat_${model}`];

      actual.push(typeof a === "number" && Number.isFinite(a) ? a : null);
      forecast.push(typeof f === "number" && Number.isFinite(f) ? f : null);
    }

    const splitAbs = payload.meta.split_index;
    const splitRel = Math.max(0, Math.min(days.length - 1, splitAbs - start));

    const rowNow = idx.get(`${String(week)}::${sid}`);
    const aNow = rowNow?.y_true;
    const fNow = rowNow?.[`yhat_${model}`];
    const eNow = rowNow?.[`abs_err_yhat_${model}`];

    const actualNow = typeof aNow === "number" && Number.isFinite(aNow) ? aNow : null;
    const forecastNow = typeof fNow === "number" && Number.isFinite(fNow) ? fNow : null;
    const errNow = typeof eNow === "number" && Number.isFinite(eNow) ? eNow : null;

    // contribution only among in-project states
    const denom = insights.total || 1;
    const share = safeDiv(valueByState.get(sid) ?? 0, denom);

    return {
      days,
      actual,
      forecast,
      splitRel,
      actualNow,
      forecastNow,
      errNow,
      share,
    };
  }, [payload, pinned, safeT, timeIndex, week, model, valueByState, insights.total]);

  // ✅ HOVER HANDLER: same logic & same tooltip for ALL in-project states
  const onHover = (info: any) => {
    const obj = info?.object;
    if (!obj || info?.x == null || info?.y == null) {
      setHover(null);
      return;
    }
    const sid = getStateId(obj);
    if (!PROJECT_STATE_IDS.has(sid)) {
      setHover(null);
      return;
    }

    const name = getStateName(obj);
    const v = valueByState.get(sid);

    setHover({
      x: info.x,
      y: info.y,
      stateId: sid,
      stateName: name,
      value: v ?? null,
    });
  };

  const onClick = (info: any) => {
    const obj = info?.object;
    if (!obj) return;

    const sid = getStateId(obj);
    if (!PROJECT_STATE_IDS.has(sid)) return;

    const name = getStateName(obj);

    let centroid: [number, number] | undefined;
    try {
      const c = info?.coordinate;
      if (Array.isArray(c) && c.length === 2) centroid = [c[0], c[1]];
    } catch {}

    setPinned({ stateId: sid, stateName: name, centroid });

    if (centroid && mapRef.current) {
      try {
        mapRef.current.getMap().flyTo({
          center: centroid,
          zoom: Math.max(4.3, mapRef.current.getMap().getZoom()),
          speed: 0.8,
          curve: 1.3,
          essential: true,
        });
      } catch {}
    }
  };

  const legendGradient =
    viewMode === "abs_error"
      ? "linear-gradient(90deg, #2bdc5a 0%, #f7d84a 55%, #ff3b30 100%)"
      : "linear-gradient(90deg, #2b7bff 0%, #00ffd1 40%, #ffe14a 70%, #ff2d55 100%)";

  const statsForMetric = payload?.meta.stats?.[metricKey];

  return (
    <div className="relative w-full h-full">
      <MapGL
        ref={mapRef}
        mapStyle={STYLE_URL}
        initialViewState={{
          longitude: -98.5,
          latitude: 39.8,
          zoom: 3.6,
          pitch: 55,
          bearing: -20,
        }}
        style={{ width: "100%", height: "100%" }}
        reuseMaps
        attributionControl={false}
      >
        <NavigationControl position="top-right" visualizePitch />
        <DeckOverlay layers={layers} effects={effects} onHover={onHover} onClick={onClick} />
      </MapGL>

      {/* INSIGHTS PANEL (Left) */}
      <div className="absolute left-4 top-4 z-20 w-[360px] rounded-2xl bg-black/65 backdrop-blur-md border border-white/10 p-4 shadow-2xl">
        <div className="flex items-start justify-between gap-3">
          <div>
            <div className="text-white text-sm font-semibold">{modeLabel}</div>
            <div className="text-white/60 text-xs mt-1">
              <span className={isHistoric ? "text-emerald-300 font-semibold" : "text-sky-300 font-semibold"}>
                {isHistoric ? "Historic" : "Forecast"}
              </span>{" "}
              <span className="text-white/70">{day ?? "—"}</span>
              <span className="text-white/30"> · bucket </span>
              <span className="text-white/70">{week ?? "—"}</span>
            </div>
          </div>

          <div className="text-right">
            <div className="text-white/50 text-[11px]">National total</div>
            <div className="text-white text-sm font-semibold">{formatNumber(insights.total)}</div>
            <div className="text-white/40 text-[11px]">avg {formatNumber(insights.avg)}</div>
          </div>
        </div>

        <div className="mt-3 text-white/60 text-xs flex items-center">
          {unitsLabel}
          <InfoTip text="Color shows the value for the selected view. Height scales the same way, so spikes are easy to spot." />
        </div>
        <div className="mt-2 h-3 rounded-full overflow-hidden border border-white/10">
          <div className="h-full w-full" style={{ background: legendGradient }} />
        </div>
        <div className="mt-2 flex items-center justify-between text-[11px] text-white/60">
          <span>{formatNumber(domain.lo)}</span>
          <span className="text-white/45">median {formatNumber(domain.mid)}</span>
          <span>{formatNumber(domain.hi)}</span>
        </div>

        <div className="mt-4 rounded-xl bg-white/5 border border-white/10 p-3">
          <div className="flex items-center justify-between">
            <div className="text-white/70 text-xs font-semibold flex items-center">
              Distribution (today)
              <InfoTip text="Hover the curve to read the value scale between p05 and p95. The clamp keeps outliers from dominating the shape." />
            </div>
            <div className="text-white/40 text-[11px]">{insights.vals.length} states</div>
          </div>
          <div className="mt-2">
            <Distribution values={insights.vals} stats={statsForMetric} mode={viewMode === "abs_error" ? "error" : "turbo"} />
          </div>
          <div className="mt-2 text-[11px] text-white/45">
            Median line shows the typical state. p05 and p95 mark the common range.
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-white/70 text-xs font-semibold flex items-center">
              Top 3
              <InfoTip text="Largest values right now. Click a state to pin it and see its trend." />
            </div>
            <div className="mt-2 space-y-1">
              {insights.top.map(([sid, v]) => (
                <div key={sid} className="flex items-center justify-between text-xs">
                  <span className="text-white/75">{sid}</span>
                  <span className="text-white">
                    {formatNumber(v)} <span className="text-white/45 text-[11px]">{unitText}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3">
            <div className="text-white/70 text-xs font-semibold flex items-center">
              Bottom 3
              <InfoTip text="Smallest values right now. Useful for spotting low demand or low error states." />
            </div>
            <div className="mt-2 space-y-1">
              {insights.bottom.map(([sid, v]) => (
                <div key={sid} className="flex items-center justify-between text-xs">
                  <span className="text-white/75">{sid}</span>
                  <span className="text-white">
                    {formatNumber(v)} <span className="text-white/45 text-[11px]">{unitText}</span>
                  </span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl bg-white/5 border border-white/10 p-3 col-span-2">
            <div className="flex items-center justify-between">
              <div className="text-white/70 text-xs font-semibold flex items-center">
                Biggest movers vs previous day
                <InfoTip text="Shows the biggest change in this metric compared to the previous day bucket. Use this to catch spikes and drops fast." />
              </div>
              <div className="text-white/40 text-[11px]">prev bucket {prevWeek || "—"}</div>
            </div>

            <div className="mt-2 grid grid-cols-2 gap-3">
              <div>
                <div className="text-emerald-300 text-[11px] font-semibold">Risers</div>
                <div className="mt-1 space-y-1">
                  {insights.risers.map((x) => (
                    <div key={x.sid} className="flex items-center justify-between text-xs">
                      <span className="text-white/75">{x.sid}</span>
                      <span className="text-emerald-200">
                        +{formatNumber(x.d)}{" "}
                        <span className="text-emerald-200/70 text-[11px]">
                          {unitText} ({formatPct(x.pct)})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <div className="text-rose-300 text-[11px] font-semibold">Droppers</div>
                <div className="mt-1 space-y-1">
                  {insights.droppers.map((x) => (
                    <div key={x.sid} className="flex items-center justify-between text-xs">
                      <span className="text-white/75">{x.sid}</span>
                      <span className="text-rose-200">
                        {formatNumber(x.d)}{" "}
                        <span className="text-rose-200/70 text-[11px]">
                          {unitText} ({formatPct(x.pct)})
                        </span>
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-3 text-[11px] text-white/45">
              Hover previews value. Click pins a state and shows its 30 day trajectory.
            </div>
          </div>
        </div>
      </div>

      {/* PINNED PANEL (Right): sparkline + KPIs + share bar */}
      {pinned && (
        <div className="absolute right-4 top-4 z-20 w-[360px] rounded-2xl bg-black/65 backdrop-blur-md border border-white/10 p-4 shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <div className="text-white text-sm font-semibold">{pinned.stateName}</div>
              <div className="text-white/60 text-xs mt-1">
                <span className="text-white/70">{pinned.stateId}</span>
                <span className="text-white/30"> · </span>
                {day ?? "—"} (bucket {week ?? "—"})
              </div>
            </div>

            <button
              onClick={() => setPinned(null)}
              className="px-3 py-1.5 rounded-xl bg-white/10 hover:bg-white/15 border border-white/10 text-white text-xs"
            >
              Unpin
            </button>
          </div>

          <div className="mt-3">
            {pinnedSeries ? (
              <>
                <div className="text-white/60 text-xs mb-2 flex items-center">
                  Last 30 days
                  <InfoTip
                    text="White line is actuals. Blue line is the forecast for the selected model. Hover for exact values."
                    side="left"
                  />
                </div>

                <Sparkline
                  seriesA={pinnedSeries.actual}
                  seriesB={pinnedSeries.forecast}
                  splitAt={pinnedSeries.splitRel}
                  labelA="Actual"
                  labelB={`Forecast (${model.toUpperCase()})`}
                />

                <div className="mt-2 flex items-center justify-between text-[11px] text-white/45">
                  <span>{pinnedSeries.days[0]}</span>
                  <span className="text-sky-300">forecast region →</span>
                  <span>{pinnedSeries.days[pinnedSeries.days.length - 1]}</span>
                </div>
              </>
            ) : (
              <div className="text-white/50 text-xs">No pinned series available.</div>
            )}
          </div>

          <div className="mt-4 grid grid-cols-2 gap-3">
            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-white/60 text-xs">Actual</div>
              <div className="text-white text-sm font-semibold">
                {formatNumber(pinnedSeries?.actualNow)}
                <span className="text-white/45 text-xs"> {unitText}</span>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-white/60 text-xs">Forecast ({model.toUpperCase()})</div>
              <div className="text-white text-sm font-semibold">
                {formatNumber(pinnedSeries?.forecastNow)}
                <span className="text-white/45 text-xs"> {unitText}</span>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-white/60 text-xs">Abs Error</div>
              <div className="text-white text-sm font-semibold">
                {formatNumber(pinnedSeries?.errNow)}
                <span className="text-white/45 text-xs"> {unitText}</span>
              </div>
            </div>

            <div className="rounded-xl bg-white/5 border border-white/10 p-3">
              <div className="text-white/60 text-xs">Share of national</div>
              <div className="text-white text-sm font-semibold">
                {((pinnedSeries?.share ?? 0) * 100).toFixed(2)}%
              </div>
            </div>
          </div>

          <div className="mt-3">
            <div className="flex items-center justify-between text-[11px] text-white/50">
              <span>Contribution</span>
              <span>{((pinnedSeries?.share ?? 0) * 100).toFixed(2)}%</span>
            </div>
            <div className="mt-2 h-2 rounded-full bg-white/10 overflow-hidden border border-white/10">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.max(2, Math.min(100, (pinnedSeries?.share ?? 0) * 100))}%`,
                  background: "linear-gradient(90deg, rgba(60,180,255,0.9), rgba(255,255,255,0.85))",
                }}
              />
            </div>
          </div>

          <div className="mt-3 text-[11px] text-white/45">
            Tip: Pin different states and compare how the forecast behaves after the split boundary.
          </div>
        </div>
      )}

      {/* HOVER TOOLTIP */}
      {hover && (
        <div className="absolute z-30 pointer-events-none" style={{ left: hover.x + 12, top: hover.y + 12 }}>
          <div className="rounded-xl bg-black/75 backdrop-blur-md border border-white/10 px-3 py-2 shadow-2xl">
            <div className="text-white text-sm font-semibold">{hover.stateName}</div>
            <div className="text-white/60 text-xs">
              <span className="text-white/70">{hover.stateId}</span>
              <span className="text-white/30"> · </span>
              {modeLabel}
            </div>
            <div className="mt-1 text-white/80 text-sm">
              {formatNumber(hover.value)} <span className="text-white/50 text-xs">{unitText}</span>
            </div>
            <div className="text-white/45 text-[11px] mt-1">Click to pin and view the trend panel</div>
          </div>
        </div>
      )}
    </div>
  );
}
