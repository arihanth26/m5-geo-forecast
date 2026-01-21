"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useMapStore } from "@/store/useMapStore";

type Meta = {
  time_index: string[];
  split_index: number;
  available_metrics: string[];
  default_metric: string;
};

function clampInt(x: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, x));
}

function formatIndexLabel(i: number, n: number) {
  return `index ${i + 1}/${n}`;
}

/** -----------------------------------------
 *  Custom Dropdown (platform-themed)
 *  - Smaller, compact menu
 *  - Dark menu to match UI (readable white text)
 *  - Auto-positions up/down + clamps to viewport
 *  ----------------------------------------- */
type DDOption<T extends string> = { value: T; label: string };

function useOnClickOutside(
  refs: React.RefObject<HTMLElement>[],
  handler: () => void,
  when: boolean
) {
  useEffect(() => {
    if (!when) return;

    const onDown = (e: MouseEvent | TouchEvent) => {
      const target = e.target as Node | null;
      if (!target) return;
      const inside = refs.some((r) => r.current && r.current.contains(target));
      if (!inside) handler();
    };

    document.addEventListener("mousedown", onDown, true);
    document.addEventListener("touchstart", onDown, true);
    return () => {
      document.removeEventListener("mousedown", onDown, true);
      document.removeEventListener("touchstart", onDown, true);
    };
  }, [refs, handler, when]);
}

function Dropdown<T extends string>({
  label,
  value,
  options,
  onChange,
  buttonClassName = "",
  minMenuWidth = 170,
}: {
  label: string;
  value: T;
  options: DDOption<T>[];
  onChange: (v: T) => void;
  buttonClassName?: string;
  minMenuWidth?: number;
}) {
  const btnRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{
    left: number;
    top: number;
    placement: "up" | "down";
    width: number;
  } | null>(null);

  const selectedLabel =
    options.find((o) => o.value === value)?.label ?? String(value);

  const recompute = () => {
    const el = btnRef.current;
    if (!el) return;

    const r = el.getBoundingClientRect();

    // Smaller, better-sized menu: match button width (with a minimum)
    const width = Math.max(minMenuWidth, Math.round(r.width));

    const pad = 10;
    // compact height estimate
    const headerH = 30;
    const rowH = 36;
    const innerPad = 10;
    const menuH = Math.min(240, headerH + options.length * rowH + innerPad);

    // Horizontal clamp
    let left = r.left;
    left = Math.max(pad, Math.min(left, window.innerWidth - width - pad));

    // Decide up/down based on space
    const spaceBelow = window.innerHeight - r.bottom - pad;
    const spaceAbove = r.top - pad;

    const placement: "up" | "down" =
      spaceBelow >= menuH || spaceBelow >= spaceAbove ? "down" : "up";

    let top =
      placement === "down" ? r.bottom + 8 : Math.max(pad, r.top - 8 - menuH);

    top = Math.max(pad, Math.min(top, window.innerHeight - menuH - pad));

    setPos({ left, top, placement, width });
  };

  useEffect(() => {
    if (!open) return;
    recompute();

    const onResize = () => recompute();
    window.addEventListener("resize", onResize);
    window.addEventListener("scroll", onResize, true);
    return () => {
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onResize, true);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, options.length]);

  useOnClickOutside([btnRef as any, menuRef as any], () => setOpen(false), open);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  const menu =
    open && pos
      ? createPortal(
          <div className="fixed inset-0 z-[9999] pointer-events-none">
            <div
              ref={menuRef}
              className="pointer-events-auto"
              style={{
                position: "fixed",
                left: pos.left,
                top: pos.top,
                width: pos.width,
              }}
            >
              {/* Platform-themed dropdown */}
              <div
                className={[
                  "rounded-xl border border-white/10",
                  "bg-black/80 backdrop-blur-md",
                  "shadow-[0_18px_45px_rgba(0,0,0,0.55)]",
                  "overflow-hidden",
                ].join(" ")}
              >
                <div className="px-3 py-2 text-[11px] font-semibold text-white/55 border-b border-white/10">
                  {label}
                </div>

                <div className="py-1">
                  {options.map((o) => {
                    const active = o.value === value;
                    return (
                      <button
                        key={o.value}
                        type="button"
                        onClick={() => {
                          onChange(o.value);
                          setOpen(false);
                        }}
                        className={[
                          "w-full text-left px-3 py-2 text-sm",
                          "text-white/90",
                          "hover:bg-white/10",
                          "transition",
                          active ? "bg-white/12 text-white font-semibold" : "",
                        ].join(" ")}
                      >
                        {o.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>,
          document.body
        )
      : null;

  return (
    <div className="flex items-center gap-2">
      <div className="text-white/60 text-xs">{label}</div>

      <button
        ref={btnRef}
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={[
          "inline-flex items-center justify-between gap-2",
          "rounded-xl border border-white/10 bg-white/10",
          "px-3 py-1.5 text-sm text-white hover:bg-white/15 transition",
          buttonClassName,
        ].join(" ")}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className="truncate">{selectedLabel}</span>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" aria-hidden="true">
          <path
            d={open ? "M7 14l5-5 5 5" : "M7 10l5 5 5-5"}
            stroke="rgba(255,255,255,0.75)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {menu}
    </div>
  );
}

export default function Controls({ meta }: { meta: Meta }) {
  const { t, setT, viewMode, setViewMode, model, setModel } = useMapStore();

  const n = meta.time_index.length;
  const safeT = clampInt(t, 0, Math.max(0, n - 1));

  const SPEEDS = useMemo(
    () => ({
      Slow: 700,
      Normal: 380,
      Fast: 180,
    }),
    []
  );

  const [speedLabel, setSpeedLabel] = useState<keyof typeof SPEEDS>("Normal");
  const [playing, setPlaying] = useState(false);
  const intervalRef = useRef<number | null>(null);

  const currentDate = meta.time_index[safeT] ?? "—";
  const startDate = meta.time_index[0] ?? "—";
  const endDate = meta.time_index[Math.max(0, n - 1)] ?? "—";

  useEffect(() => {
    if (!playing || n <= 1) return;

    const ms = SPEEDS[speedLabel];
    intervalRef.current = window.setInterval(() => {
      setT((prev: number) => {
        const next = prev + 1;
        return next >= n ? 0 : next;
      });
    }, ms);

    return () => {
      if (intervalRef.current != null) {
        window.clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [playing, speedLabel, n, setT, SPEEDS]);

  const onScrub = (v: number) => {
    setT(clampInt(v, 0, Math.max(0, n - 1)));
  };

  return (
    <div className="w-[820px] max-w-[calc(100vw-2rem)] space-y-2">
      {/* TOP BAR */}
      <div className="rounded-2xl bg-black/55 backdrop-blur-md border border-white/10 shadow-2xl px-3 py-2">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setPlaying((p) => !p)}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white hover:bg-white/15 transition"
            >
              {playing ? "Pause" : "Play"}
            </button>

            <button
              type="button"
              onClick={() => window.dispatchEvent(new CustomEvent("export_png"))}
              className="rounded-xl border border-white/10 bg-white/10 px-3 py-1.5 text-sm text-white/90 hover:bg-white/15 transition"
            >
              Export PNG
            </button>
          </div>

          <div className="text-center leading-tight">
            <div className="text-white/90 text-sm font-semibold">{currentDate}</div>
            <div className="text-white/45 text-[11px]">{formatIndexLabel(safeT, n)}</div>
          </div>

          <Dropdown<keyof typeof SPEEDS>
            label="Speed"
            value={speedLabel}
            options={[
              { value: "Slow", label: "Slow" },
              { value: "Normal", label: "Normal" },
              { value: "Fast", label: "Fast" },
            ]}
            onChange={(v) => setSpeedLabel(v)}
            minMenuWidth={160}
            buttonClassName="min-w-[120px]"
          />
        </div>
      </div>

      {/* SLIDER PANEL */}
      <div className="rounded-2xl bg-black/55 backdrop-blur-md border border-white/10 shadow-2xl px-3 py-3">
        <div className="flex items-center justify-between text-[11px] text-white/55 mb-2">
          <span>{startDate}</span>
          <span className="text-white/75">{currentDate}</span>
          <span>{endDate}</span>
        </div>

        <input
          type="range"
          min={0}
          max={Math.max(0, n - 1)}
          step={1}
          value={safeT}
          onChange={(e) => onScrub(parseInt(e.target.value, 10))}
          className="w-full h-2"
        />

        <div className="mt-3 flex items-center justify-between gap-3">
          <Dropdown<"actual" | "forecast" | "abs_error">
            label="View"
            value={viewMode as any}
            options={[
              { value: "actual", label: "Actual Demand" },
              { value: "forecast", label: "Forecast" },
              { value: "abs_error", label: "Absolute Error" },
            ]}
            onChange={(v) => setViewMode(v as any)}
            minMenuWidth={190}
            buttonClassName="min-w-[170px]"
          />

          <Dropdown<"sarimax" | "lgbm" | "lstm">
            label="Model"
            value={model as any}
            options={[
              { value: "sarimax", label: "SARIMAX" },
              { value: "lgbm", label: "LightGBM" },
              { value: "lstm", label: "LSTM" },
            ]}
            onChange={(v) => setModel(v as any)}
            minMenuWidth={170}
            buttonClassName="min-w-[150px]"
          />
        </div>
      </div>
    </div>
  );
}
