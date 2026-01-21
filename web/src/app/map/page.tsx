"use client";

import React, { useEffect, useState } from "react";
import StateDemandMap from "@/components/StateDemandMap";
import Controls from "@/components/Controls";

type Meta = {
  time_index: string[];
  split_index: number;
  available_metrics: string[];
  default_metric: string;
};

function GithubButton() {
  return (
    <button
      type="button"
      aria-label="Open GitHub repository"
      title="Open GitHub repository"
      onClick={() =>
        window.open(
          "https://github.com/arihanth26/m5-geo-forecast",
          "_blank",
          "noopener,noreferrer"
        )
      }
      className="fixed bottom-4 left-4 z-30 group rounded-full border border-white/10 bg-black/55 backdrop-blur-md p-3 shadow-2xl hover:bg-black/70 hover:border-white/20 transition"
    >
      <svg
        width="20"
        height="20"
        viewBox="0 0 24 24"
        fill="rgba(255,255,255,0.82)"
      >
        <path d="M12 2C6.477 2 2 6.484 2 12.02c0 4.424 2.865 8.177 6.839 9.504.5.093.682-.217.682-.483 0-.237-.009-.866-.014-1.699-2.782.605-3.369-1.342-3.369-1.342-.454-1.157-1.11-1.466-1.11-1.466-.908-.622.069-.61.069-.61 1.004.071 1.532 1.033 1.532 1.033.892 1.53 2.341 1.088 2.91.832.091-.647.35-1.088.636-1.338-2.221-.253-4.555-1.112-4.555-4.95 0-1.094.39-1.988 1.029-2.688-.103-.253-.446-1.271.098-2.65 0 0 .84-.27 2.75 1.027A9.54 9.54 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.297 2.748-1.027 2.748-1.027.546 1.379.203 2.397.1 2.65.64.7 1.028 1.594 1.028 2.688 0 3.848-2.337 4.694-4.566 4.942.359.31.679.92.679 1.852 0 1.337-.012 2.415-.012 2.743 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.02C22 6.484 17.523 2 12 2Z" />
      </svg>
    </button>
  );
}

function IntroModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center">
      <div
        className="absolute inset-0 bg-black/35 backdrop-blur-[2px]"
        onClick={onClose}
      />

      <div className="relative w-[min(720px,92vw)] rounded-2xl border border-white/12 bg-black/65 backdrop-blur-md shadow-2xl p-6">
        <button
          type="button"
          onClick={onClose}
          className="absolute right-3 top-3 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1.5 text-white/80 hover:bg-white/10"
        >
          ✕
        </button>

        <div
          className="text-white text-3xl leading-snug"
          style={{ fontFamily: `"Times New Roman", Times, serif` }}
        >
          Spatiotemporal Demand Forecasting Using LSTM, SARIMAX & Gradient Boosting
        </div>

        <div className="mt-3 text-white/70 text-sm">
          Explore demand, forecast, and error patterns across time with
          interactive geospatial views.
        </div>

        <div className="mt-6 flex gap-3">
          <button
            onClick={() =>
              window.open("/project", "_blank", "noopener,noreferrer")
            }
            className="rounded-xl border border-white/12 bg-white/8 px-4 py-2.5 text-white hover:bg-white/12"
          >
            Project Overview
          </button>

          <button
            onClick={onClose}
            className="rounded-xl border border-white/10 bg-black/30 px-4 py-2.5 text-white/80 hover:bg-black/40"
          >
            Enter dashboard
          </button>
        </div>
      </div>
    </div>
  );
}

export default function MapPage() {
  const [meta, setMeta] = useState<Meta | null>(null);
  const [showIntro, setShowIntro] = useState(true);

  useEffect(() => {
    fetch("/api/mapdata")
      .then((r) => r.json())
      .then((d) => setMeta(d.meta))
      .catch(console.error);
  }, []);

  return (
    <div className="relative w-screen h-screen overflow-hidden bg-black">
      {/* MAP */}
      <div className="absolute inset-0 z-0">
        <StateDemandMap />
      </div>

      <GithubButton />

      {showIntro && <IntroModal onClose={() => setShowIntro(false)} />}

      {/* BOTTOM CONTROLS — centered relative to map (not screen) */}
      <div className="fixed bottom-4 z-20 w-full pointer-events-none">
        <div
          className="
            pointer-events-auto
            mx-auto
            pl-[360px]
            flex
            justify-center
          "
        >
          {meta && <Controls meta={meta} />}
        </div>
      </div>
    </div>
  );
}
