"use client";

import React, { useMemo, useState } from "react";
import "katex/dist/katex.min.css";
import katex from "katex";

/**
 * src/app/project/page.tsx
 * Changes applied:
 * - Hero stats are horizontal and compact (no oversized vertical stack)
 * - Wikipedia-style section toggle: small [hide]/[show] on the right of each heading
 * - Keeps "On this page" exactly as-is
 * - Removes the “Built for fast iteration...” line and other cringy phrasing
 * - Removes bolding inside paragraphs and bullet content (bold remains only for headings, side headings, labels)
 * - No em dashes
 * - Replaces System Design with a richer, connected flowchart (desktop grid + mobile stack)
 */

export default function ProjectPage() {
  return (
    <main className="min-h-screen bg-white text-slate-900">
      {/* Top header (GitHub Pages vibe) */}
      <header className="relative overflow-hidden border-b border-slate-200">
        <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-teal-800 to-emerald-700" />
        <div className="relative mx-auto max-w-5xl px-6 py-14">
          <h1
            className="text-4xl sm:text-5xl font-semibold tracking-tight text-white"
            style={{ fontFamily: `"Times New Roman", Times, serif` }}
          >
            Spatiotemporal Demand Forecasting Using LSTM, SARIMAX &amp; Gradient Boosting
          </h1>

          <p className="mt-4 max-w-3xl text-white/85 text-base sm:text-lg leading-relaxed">
            A forecasting pipeline that turns sales time series into state-level demand forecasts, with consistent
            evaluation and spatial diagnostics.
          </p>

          <div className="mt-7 flex flex-wrap items-center gap-3">
            <a
              href="https://github.com/arihanth26/m5-geo-forecast"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 rounded-xl bg-white/10 px-4 py-2.5 text-white border border-white/15 hover:bg-white/15 hover:border-white/25 transition"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" className="block" fill="none">
                <path
                  fill="rgba(255,255,255,0.92)"
                  d="M12 2C6.477 2 2 6.484 2 12.02c0 4.424 2.865 8.177 6.839 9.504.5.093.682-.217.682-.483 0-.237-.009-.866-.014-1.699-2.782.605-3.369-1.342-3.369-1.342-.454-1.157-1.11-1.466-1.11-1.466-.908-.622.069-.61.069-.61 1.004.071 1.532 1.033 1.532 1.033.892 1.53 2.341 1.088 2.91.832.091-.647.35-1.088.636-1.338-2.221-.253-4.555-1.112-4.555-4.95 0-1.094.39-1.988 1.029-2.688-.103-.253-.446-1.271.098-2.65 0 0 .84-.27 2.75 1.027A9.54 9.54 0 0 1 12 6.844c.85.004 1.705.115 2.504.337 1.909-1.297 2.748-1.027 2.748-1.027.546 1.379.203 2.397.1 2.65.64.7 1.028 1.594 1.028 2.688 0 3.848-2.337 4.694-4.566 4.942.359.31.679.92.679 1.852 0 1.337-.012 2.415-.012 2.743 0 .268.18.58.688.482A10.02 10.02 0 0 0 22 12.02C22 6.484 17.523 2 12 2Z"
                />
              </svg>
              Repository
            </a>
          </div>

          {/* Quick stats row (horizontal + compact) */}
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <HeroStat label="Evaluation points" value="88" hint="11 states × 8 weeks" />
            <HeroStat label="Total actual demand" value="5.26M" hint="Holdout sum" />
            <HeroStat label="Best WAPE" value="6.72%" hint="SARIMAX" />
            <HeroStat label="GBM WAPE" value="7.81%" hint="LightGBM" />
          </div>
        </div>
      </header>

      {/* Content */}
      <div className="mx-auto max-w-5xl px-6 py-10">
        {/* Table of contents (unchanged) */}
        <nav className="mb-10 rounded-2xl border border-slate-200 bg-slate-50 p-5">
          <div className="text-sm font-semibold text-slate-800">On this page</div>
          <div className="mt-3 flex flex-wrap gap-x-5 gap-y-2 text-sm">
            {[
              ["Problem Statement", "#problem-statement"],
              ["Dataset", "#dataset"],
              ["System Design", "#system-design"],
              ["Preprocessing", "#preprocessing"],
              ["Models", "#models"],
              ["Validation & Tuning", "#validation-tuning"],
              ["Test Setup", "#test-setup"],
              ["Results", "#results"],
              ["Errors & Diagnostics", "#errors"],
              ["Inference", "#inference"],
              ["Tech Stack", "#tech-stack"],
              ["Model Comparison & Best System", "#model-comparison"],
              ["Conclusion", "#conclusion"],
            ].map(([label, href]) => (
              <a
                key={href}
                href={href}
                className="text-teal-700 hover:text-teal-900 hover:underline underline-offset-4"
              >
                {label}
              </a>
            ))}
          </div>
        </nav>

        <Section
          id="problem-statement"
          title="Problem Statement"
          accent="teal"
          subtitle="Forecast demand over time and space while staying stable under real-world shifts."
          defaultOpen
        >
          <p className="leading-relaxed text-slate-700">
            Forecasting demand is simple to describe and hard to do well in practice. Once you move beyond a single store
            or product, the signal becomes spatiotemporal. Demand depends on region, calendar, product mix, and recent
            trajectory. The data is also imperfect. You see missing dates, intermittent sales, spikes from promotions,
            and shifts that break static assumptions.
          </p>

          <p className="mt-4 leading-relaxed text-slate-700">
            The objective was to forecast daily state-level demand in a way that stays usable for operations. Accuracy
            matters, but stability matters too. A forecast that oscillates sharply can look acceptable on average while
            still producing poor downstream decisions in replenishment and planning.
          </p>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="font-semibold text-slate-900">Approach</div>
            <ul className="mt-3 space-y-2 text-slate-700 text-sm list-disc list-inside">
              <li>SARIMAX for seasonality-driven baselines and interpretability.</li>
              <li>LSTM for nonlinear temporal dependencies using causal windows.</li>
              <li>Gradient boosting using lag and rolling features at scale.</li>
              <li>Evaluation with metrics and diagnostic slices shown in the map and state panel.</li>
            </ul>
          </div>
        </Section>

        <Section
          id="dataset"
          title="Dataset"
          accent="emerald"
          subtitle="Spatiotemporal retail time series aggregated to state-level demand."
          defaultOpen
        >
          <p className="leading-relaxed text-slate-700">
            We worked with a multi-table retail time series dataset combining sales, a calendar with event signals, and
            geographic mappings. Aggregation at the state and day level makes evaluation more stable while preserving
            meaningful spatial variation.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-semibold text-slate-900">Holdout artifact summary</div>
              <span className="text-xs rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                Dashboard evaluation layer
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <StatCard title="Geographies evaluated" value="11 states" hint="Per-state slice" />
              <StatCard title="Holdout horizon" value="8 weeks" hint="Future window" />
              <StatCard title="Spatiotemporal points" value="88" hint="11 × 8 (state-week)" />
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <StatCard title="Total actual demand" value="5,264,003" hint="Holdout sum of y_true" />
              <StatCard title="Avg abs error (SARIMAX)" value="4,022" hint="Mean |y − ŷ| across 88 points" />
              <StatCard title="Avg abs error (GBM)" value="4,672" hint="Mean |y − ŷ| across 88 points" />
            </div>

            <p className="mt-4 text-sm text-slate-700 leading-relaxed">
              These numbers are computed from the same evaluation artifact used by the dashboard, which contains
              actuals, predictions, and absolute errors per state and week. This keeps reporting consistent between
              training outputs and the UI.
            </p>
          </div>

          <ul className="mt-6 grid gap-3 sm:grid-cols-2 text-slate-700">
            <li className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-900">Granularity</div>
              <div className="mt-1 text-sm">
                Daily timelines aggregated to state-level demand for stable evaluation and geographic interpretation.
              </div>
            </li>
            <li className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-900">Intermittency</div>
              <div className="mt-1 text-sm">
                Long zero-runs and irregular spikes appear in several slices, especially in lower-volume states.
              </div>
            </li>
            <li className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-900">Seasonality</div>
              <div className="mt-1 text-sm">Weekly patterns and longer cycles appear across states and need causal modeling.</div>
            </li>
            <li className="rounded-xl border border-slate-200 bg-white p-4">
              <div className="font-semibold text-slate-900">Exogenous signals</div>
              <div className="mt-1 text-sm">Calendar features and event flags explain sharp peaks and dips in several regions.</div>
            </li>
          </ul>
        </Section>

        {/* UPDATED SYSTEM DESIGN SECTION */}
        <Section
          id="system-design"
          title="System Design"
          accent="sky"
          subtitle="A production-style pipeline that keeps data, modeling, and dashboard outputs aligned."
          defaultOpen
        >
          <p className="leading-relaxed text-slate-700">
            This project treats forecasting as a system, not a single model run. The pipeline enforces strict time
            boundaries, builds features causally, trains multiple model families, and produces versioned artifacts that
            the dashboard reads directly. The goal is to make every metric traceable to a specific state and horizon,
            and to keep the UI consistent with the exact objects used for evaluation.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-semibold text-slate-900">Pipeline flow</div>
              <span className="text-xs rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                Artifact-first, leakage-safe
              </span>
            </div>

            {/* Desktop: connected grid flowchart */}
            <div className="mt-5 hidden lg:block">
              <div className="relative rounded-2xl border border-slate-200 bg-gradient-to-b from-slate-50 to-white p-6">
                {/* Row 1 */}
                <div className="grid grid-cols-12 gap-4 items-stretch">
                  <div className="col-span-3">
                    <FlowNode
                      title="Ingestion"
                      badge="ETL"
                      points={[
                        "Sales, calendar, and geo mappings loaded as raw tables",
                        "Schema validation, type casting, and key normalization",
                        "Join safety checks to prevent silent row loss",
                      ]}
                    />
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <FlowLine />
                  </div>

                  <div className="col-span-3">
                    <FlowNode
                      title="Canonical tables"
                      badge="Storage"
                      points={[
                        "Typed, deduplicated tables with stable primary keys",
                        "Consistent date parsing and timezone-safe indexing",
                        "Partitioned outputs (date/state) for repeatable runs",
                      ]}
                    />
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <FlowLine />
                  </div>

                  <div className="col-span-4">
                    <FlowNode
                      title="Time index and splits"
                      badge="CV"
                      points={[
                        "Complete daily index per state (no missing dates)",
                        "Walk-forward folds for tuning and stability checks",
                        "Strict future holdout for final scoring and reporting",
                      ]}
                    />
                  </div>
                </div>

                <div className="my-5 border-t border-slate-200" />

                {/* Row 2 */}
                <div className="grid grid-cols-12 gap-4 items-stretch">
                  <div className="col-span-3">
                    <FlowNode
                      title="Feature builder"
                      badge="Leakage-safe"
                      points={[
                        "Lag and rolling features computed using past values only",
                        "Calendar features and event flags joined causally",
                        "State-level aggregation with unit-consistent targets",
                      ]}
                    />
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <FlowLine />
                  </div>

                  <div className="col-span-3">
                    <FlowNode
                      title="Training jobs"
                      badge="Models"
                      points={[
                        "SARIMAX with exogenous covariates per state series",
                        "LightGBM trained on lag/rolling tabular features",
                        "LSTM trained on windowed sequences with aligned targets",
                      ]}
                    />
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <FlowLine />
                  </div>

                  <div className="col-span-4">
                    <FlowNode
                      title="Evaluation and diagnostics"
                      badge="Metrics"
                      points={[
                        "WAPE, bias, and MAE on identical horizons across models",
                        "Per-state error slicing to locate concentration and drift",
                        "Boundary checks to detect post-split degradation",
                      ]}
                    />
                  </div>
                </div>

                <div className="my-5 border-t border-slate-200" />

                {/* Row 3 */}
                <div className="grid grid-cols-12 gap-4 items-stretch">
                  <div className="col-span-3">
                    <FlowNode
                      title="Artifacts"
                      badge="JSON"
                      points={[
                        "Predictions and errors by (state, week) for the UI",
                        "Overall and per-state metric summaries",
                        "Versioned artifacts to keep results reproducible",
                      ]}
                    />
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <FlowLine />
                  </div>

                  <div className="col-span-3">
                    <FlowNode
                      title="Dashboard layer"
                      badge="Next.js"
                      points={[
                        "Map and panels read the same scored artifacts",
                        "No duplicated metrics logic across UI components",
                        "State drill-down for diagnostics and ranking",
                      ]}
                    />
                  </div>

                  <div className="col-span-1 flex items-center justify-center">
                    <FlowLine />
                  </div>

                  <div className="col-span-4">
                    <FlowNode
                      title="Monitoring and updates"
                      badge="Ops"
                      points={[
                        "Residual drift checks on sliding windows",
                        "Bias calibration from recent errors when needed",
                        "Champion-challenger tracking for safe iteration",
                      ]}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile/Tablet: stacked nodes */}
            <div className="mt-5 lg:hidden space-y-3">
              <FlowNode
                title="Ingestion"
                badge="ETL"
                points={[
                  "Sales, calendar, and geo mappings loaded as raw tables",
                  "Schema validation, type casting, and key normalization",
                  "Join safety checks to prevent silent row loss",
                ]}
              />
              <FlowNode
                title="Canonical tables"
                badge="Storage"
                points={[
                  "Typed, deduplicated tables with stable primary keys",
                  "Consistent date parsing and timezone-safe indexing",
                  "Partitioned outputs (date/state) for repeatable runs",
                ]}
              />
              <FlowNode
                title="Time index and splits"
                badge="CV"
                points={[
                  "Complete daily index per state (no missing dates)",
                  "Walk-forward folds for tuning and stability checks",
                  "Strict future holdout for final scoring and reporting",
                ]}
              />
              <FlowNode
                title="Feature builder"
                badge="Leakage-safe"
                points={[
                  "Lag and rolling features computed using past values only",
                  "Calendar features and event flags joined causally",
                  "State-level aggregation with unit-consistent targets",
                ]}
              />
              <FlowNode
                title="Training jobs"
                badge="Models"
                points={[
                  "SARIMAX with exogenous covariates per state series",
                  "LightGBM trained on lag/rolling tabular features",
                  "LSTM trained on windowed sequences with aligned targets",
                ]}
              />
              <FlowNode
                title="Evaluation and diagnostics"
                badge="Metrics"
                points={[
                  "WAPE, bias, and MAE on identical horizons across models",
                  "Per-state error slicing to locate concentration and drift",
                  "Boundary checks to detect post-split degradation",
                ]}
              />
              <FlowNode
                title="Artifacts"
                badge="JSON"
                points={[
                  "Predictions and errors by (state, week) for the UI",
                  "Overall and per-state metric summaries",
                  "Versioned artifacts to keep results reproducible",
                ]}
              />
              <FlowNode
                title="Dashboard layer"
                badge="Next.js"
                points={[
                  "Map and panels read the same scored artifacts",
                  "No duplicated metrics logic across UI components",
                  "State drill-down for diagnostics and ranking",
                ]}
              />
              <FlowNode
                title="Monitoring and updates"
                badge="Ops"
                points={[
                  "Residual drift checks on sliding windows",
                  "Bias calibration from recent errors when needed",
                  "Champion-challenger tracking for safe iteration",
                ]}
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="font-semibold text-slate-900">What this design guarantees</div>
            <ul className="mt-3 space-y-2 text-sm text-slate-700 list-disc list-inside">
              <li>Features are computed using past data only, so evaluation reflects deployment behavior.</li>
              <li>The dashboard reads the same scored artifacts used for metrics, preventing reporting mismatches.</li>
              <li>Per-state slicing makes bias and error concentration visible instead of hiding issues in aggregates.</li>
              <li>Multiple model families provide fallback behavior when one approach degrades or fails.</li>
            </ul>
          </div>
        </Section>

        <Section
          id="preprocessing"
          title="Preprocessing"
          accent="sky"
          subtitle="Cleaning and feature design that preserves causality and stability."
          defaultOpen
        >
          <p className="leading-relaxed text-slate-700">
            Time series models are sensitive to preprocessing errors. If future information leaks into features,
            evaluation results can look strong and then fail in deployment. We built preprocessing as a strict,
            repeatable pipeline.
          </p>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="font-semibold text-slate-900">Pipeline decisions</div>

            <ol className="mt-3 space-y-3 text-slate-700 text-sm list-decimal list-inside">
              <li>Calendar completion to ensure consistent daily indexing per state.</li>
              <li>Seasonality-aware imputation for missing observations.</li>
              <li>Winsorization of extreme spikes using rolling quantiles.</li>
              <li>Lag and rolling features computed using past values only.</li>
              <li>Separate scaling strategies for neural and tree-based models.</li>
            </ol>
          </div>
        </Section>

        <Section
          id="models"
          title="Time Series Forecasting Models"
          accent="violet"
          subtitle="Three model families with complementary strengths, evaluated under the same rules."
          defaultOpen
        >
          <p className="leading-relaxed text-slate-700">
            No single model dominates every regime. Classical models capture structured seasonality, boosted trees excel
            with engineered lags, and sequence models can represent nonlinear temporal effects. We implemented all three
            for comparison and for a realistic production strategy.
          </p>

          <ModelCard title="1) SARIMAX" tag="Classical baseline">
            <p className="text-slate-700 leading-relaxed">
              SARIMAX captures autocorrelation and seasonality while allowing exogenous covariates. It provides a strong
              baseline and a useful reference for interpreting calendar-driven effects at the state level.
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Model form</div>
              <div className="mt-2 text-sm text-slate-800">
                <BlockMath>
                  {`y_t = c + \\sum_{i=1}^{p} \\phi_i\\, y_{t-i} + \\sum_{j=1}^{q} \\theta_j\\, \\varepsilon_{t-j} + \\beta^\\top x_t + \\varepsilon_t`}
                </BlockMath>
              </div>

              <div className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <KV k="y_t" v="Observed demand at time t" />
                <KV k="x_t" v="Exogenous covariates at time t" />
                <KV k="\\hat{y}_t" v="Model prediction at time t" />
                <KV k="\\varepsilon_t" v="Innovation at time t" />
              </div>
            </div>
          </ModelCard>

          <ModelCard title="2) LSTM" tag="Sequence model">
            <p className="text-slate-700 leading-relaxed">
              LSTM networks can learn nonlinear temporal dynamics from windowed sequences. This is useful when the
              response depends on longer context, but it also increases sensitivity to scaling and window alignment.
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Core update equations</div>
              <div className="mt-2 text-sm text-slate-800 space-y-2">
                <BlockMath>{`f_t = \\sigma\\big(W_f [h_{t-1}, x_t] + b_f\\big)`}</BlockMath>
                <BlockMath>{`i_t = \\sigma\\big(W_i [h_{t-1}, x_t] + b_i\\big)`}</BlockMath>
                <BlockMath>{`\\tilde{c}_t = \\tanh\\big(W_c [h_{t-1}, x_t] + b_c\\big)`}</BlockMath>
                <BlockMath>{`c_t = f_t \\odot c_{t-1} + i_t \\odot \\tilde{c}_t`}</BlockMath>
                <BlockMath>{`o_t = \\sigma\\big(W_o [h_{t-1}, x_t] + b_o\\big)`}</BlockMath>
                <BlockMath>{`h_t = o_t \\odot \\tanh(c_t)`}</BlockMath>
              </div>
            </div>
          </ModelCard>

          <ModelCard title="3) Gradient Boosting (GBM / LightGBM)" tag="Tabular workhorse">
            <p className="text-slate-700 leading-relaxed">
              Gradient boosting performs well when lag and rolling features carry most of the signal. It retrains
              quickly, supports structured interactions, and is practical for frequent iteration.
            </p>

            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="text-sm font-semibold text-slate-900">Example objective</div>
              <div className="mt-2 text-sm text-slate-800">
                <BlockMath>{`\\mathrm{MAE} = \\frac{1}{T} \\sum_{t=1}^{T} \\left|y_t - \\hat{y}_t\\right|`}</BlockMath>
              </div>
            </div>
          </ModelCard>
        </Section>

        <Section
          id="validation-tuning"
          title="Hyperparameter Tuning and Time Series Cross Validation"
          accent="teal"
          subtitle="Walk-forward validation to match forecasting in production."
          defaultOpen
        >
          <p className="leading-relaxed text-slate-700">
            We avoided random splits. Instead, we used walk-forward validation where each fold trains on history and
            validates on a future horizon. This matches how the system is used in practice.
          </p>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="font-semibold text-slate-900">What we tuned</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3 text-sm text-slate-700">
              <MiniCard title="SARIMAX">Orders (p, d, q) and seasonal (P, D, Q, s), plus exogenous covariate design.</MiniCard>
              <MiniCard title="LSTM">Window length, hidden size, dropout, batch size, optimizer and learning rate.</MiniCard>
              <MiniCard title="GBM">Depth, trees, learning rate, subsampling, and regularization.</MiniCard>
            </div>
          </div>
        </Section>

        <Section id="test-setup" title="Testing Data" accent="emerald" subtitle="A strict future holdout window." defaultOpen>
          <p className="leading-relaxed text-slate-700">
            The test period is a strict holdout window in the future. Features are computed using information available
            before the forecast date. This keeps evaluation aligned with real usage.
          </p>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="font-semibold text-slate-900">What we evaluate</div>
            <ul className="mt-3 space-y-2 text-slate-700 text-sm list-disc list-inside">
              <li>Forecasts per state on identical windows across models.</li>
              <li>Absolute errors for operational interpretation.</li>
              <li>Stability across adjacent dates.</li>
              <li>Spatial slices to detect regional bias.</li>
            </ul>
          </div>
        </Section>

        <Section id="results" title="Results" accent="rose" subtitle="Holdout performance summarized with WAPE and bias." defaultOpen>
          <p className="leading-relaxed text-slate-700">
            All models were evaluated on the same future holdout. WAPE is used as the primary metric because it reflects
            total miss relative to total volume at the aggregation level. Bias is used to measure systematic over- or
            under-forecasting.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="font-semibold text-slate-900">Overall metrics (holdout)</div>
              <span className="text-xs rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">
                88 state-week points
              </span>
            </div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <ResultCard
                title="SARIMAX"
                pills={[
                  { label: "WAPE", value: "6.72%" },
                  { label: "Bias", value: "+5.32%" },
                  { label: "MAE", value: "4,022" },
                ]}
                verdict="Lowest WAPE in this holdout window."
              />
              <ResultCard
                title="GBM (LightGBM)"
                pills={[
                  { label: "WAPE", value: "7.81%" },
                  { label: "Bias", value: "+6.45%" },
                  { label: "MAE", value: "4,672" },
                ]}
                verdict="Close to SARIMAX, strong and fast to retrain."
              />
              <ResultCard
                title="LSTM"
                pills={[
                  { label: "WAPE", value: "99.98%" },
                  { label: "Bias", value: "−99.98%" },
                  { label: "MAE", value: "59,806" },
                ]}
                verdict="Under-forecasting indicates a training or inference mismatch in this run."
                tone="danger"
              />
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-slate-50 p-4">
              <div className="font-semibold text-slate-900">Metric definitions</div>
              <div className="mt-3 grid gap-4 sm:grid-cols-2">
                <div className="text-sm text-slate-800">
                  <div className="text-xs font-semibold text-slate-900">Weighted Absolute Percentage Error</div>
                  <div className="mt-2">
                    <BlockMath>{`\\mathrm{WAPE} = \\frac{\\sum_{t=1}^{T} \\left|y_t - \\hat{y}_t\\right|}{\\sum_{t=1}^{T} \\left|y_t\\right|}`}</BlockMath>
                  </div>
                </div>

                <div className="text-sm text-slate-800">
                  <div className="text-xs font-semibold text-slate-900">Bias</div>
                  <div className="mt-2">
                    <BlockMath>{`\\mathrm{Bias} = \\frac{\\sum_{t=1}^{T} \\left(\\hat{y}_t - y_t\\right)}{\\sum_{t=1}^{T} \\left|y_t\\right|}`}</BlockMath>
                  </div>
                </div>
              </div>

              <div className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                <KV k="y_t" v="Observed demand at time t" />
                <KV k="\\hat{y}_t" v="Predicted demand at time t" />
                <KV k="T" v="Number of evaluated time steps" />
                <KV k="t" v="Index over time steps" />
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="font-semibold text-slate-900">Best states (by WAPE)</div>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                These are states where the models tracked demand tightly in the holdout window.
              </p>

              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <RankRow title="SARIMAX best 3" items={[{ k: "GA", v: "3.30%" }, { k: "NY", v: "3.36%" }, { k: "CO", v: "4.13%" }]} />
                <RankRow title="GBM best 3" items={[{ k: "WA", v: "4.50%" }, { k: "FL", v: "4.77%" }, { k: "GA", v: "5.12%" }]} />
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-5">
              <div className="font-semibold text-slate-900">Hardest states (by WAPE)</div>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                These states contributed disproportionately to error in the holdout horizon.
              </p>

              <div className="mt-4 space-y-3 text-sm text-slate-700">
                <RankRow title="SARIMAX worst 3" items={[{ k: "TX", v: "11.06%" }, { k: "WI", v: "10.38%" }, { k: "CA", v: "10.14%" }]} />
                <RankRow title="GBM worst 3" items={[{ k: "WI", v: "12.08%" }, { k: "TX", v: "11.49%" }, { k: "CA", v: "10.60%" }]} />
              </div>
            </div>
          </div>
        </Section>

        <Section
          id="errors"
          title="Errors and Diagnostics"
          accent="rose"
          subtitle="Metrics that are mathematically correct and operationally meaningful."
          defaultOpen
        >
          <p className="leading-relaxed text-slate-700">
            Aggregate accuracy alone does not explain failure modes. We track core metrics and pair them with diagnostic
            views to identify where errors concentrate, whether forecasts drift systematically, and whether performance
            changes after the train-test boundary.
          </p>

          <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="font-semibold text-slate-900">Core metrics</div>
            <div className="mt-3 space-y-3 text-sm text-slate-700">
              <Metric
                name="MAE"
                eq={`\\mathrm{MAE} = \\frac{1}{T} \\sum_{t=1}^{T} \\left|y_t - \\hat{y}_t\\right|`}
                desc="Average absolute miss in demand units."
              />
              <Metric
                name="RMSE"
                eq={`\\mathrm{RMSE} = \\sqrt{\\frac{1}{T} \\sum_{t=1}^{T} \\left(y_t - \\hat{y}_t\\right)^2}`}
                desc="Penalizes large misses more heavily."
              />
              <Metric
                name="MAPE (when stable)"
                eq={`\\mathrm{MAPE} = \\frac{100}{T} \\sum_{t=1}^{T} \\left|\\frac{y_t - \\hat{y}_t}{y_t}\\right|`}
                desc="Useful when demand is consistently nonzero."
              />
            </div>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5">
            <div className="font-semibold text-slate-900">Decision-focused checks</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniCard title="Error concentration">Identify whether a small set of high-volume states dominates overall miss.</MiniCard>
              <MiniCard title="Bias direction">Separate total error from systematic over- or under-forecasting.</MiniCard>
              <MiniCard title="Boundary effects">Check whether errors increase immediately after the train-test split.</MiniCard>
            </div>
          </div>
        </Section>

        <Section id="inference" title="Inference" accent="violet" subtitle="What the results suggest and what to fix next." defaultOpen>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="font-semibold text-slate-900">Takeaways</div>
            <ul className="mt-3 space-y-3 text-sm text-slate-700 list-disc list-inside">
              <li>
                SARIMAX achieves the lowest WAPE in this holdout window, which suggests seasonality and calendar-driven
                structure explains a large share of variance at state aggregation.
              </li>
              <li>
                GBM is close in error and is fast to retrain, making it a practical default forecaster for frequent
                updates and iteration.
              </li>
              <li>
                LSTM under-forecasts heavily in this run, which typically indicates a scaling inversion issue, a window
                alignment error, or a mismatch between training and inference checkpoints.
              </li>
              <li>
                Positive bias in SARIMAX and GBM indicates systematic over-forecasting in this period, which can be
                corrected with a lightweight calibration layer if needed.
              </li>
            </ul>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="font-semibold text-slate-900">Why LSTM can fail like this</div>
              <p className="mt-2 text-sm text-slate-700 leading-relaxed">
                A near −100% bias is common when predictions are still in a normalized space while evaluation expects
                original units. Another frequent cause is window and target misalignment, where the model predicts a
                different time index than intended. Because the evaluation artifact contains point-level predictions and
                errors, this is straightforward to localize.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
              <div className="font-semibold text-slate-900">Next steps</div>
              <ul className="mt-3 text-sm text-slate-700 list-disc list-inside space-y-2">
                <li>Validate LSTM inverse-scaling end-to-end per state.</li>
                <li>Add simple unit checks for window alignment and target indexing.</li>
                <li>Add uncertainty reporting using quantiles or conformal intervals.</li>
                <li>Apply per-state bias correction using recent residuals.</li>
              </ul>
            </div>
          </div>
        </Section>

        <Section id="tech-stack" title="Tech Stack" accent="teal" subtitle="What we used and why." defaultOpen>
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <div className="font-semibold text-slate-900">Stack overview</div>
            <div className="mt-4 grid gap-3 sm:grid-cols-2">
              <TechItem title="Python" reason="Training, feature engineering, and evaluation with a mature time series ecosystem." />
              <TechItem title="statsmodels (SARIMAX)" reason="Interpretable baselines with seasonal structure and exogenous covariates." />
              <TechItem title="LightGBM" reason="Fast training and strong tabular performance on lag and rolling features." />
              <TechItem title="LSTM (PyTorch or Keras-style)" reason="Nonlinear sequence modeling for longer temporal dependencies." />
              <TechItem title="Next.js + React + TypeScript" reason="A clean, production-friendly UI structure for the dashboard and project page." />
              <TechItem title="TailwindCSS" reason="Consistent styling across pages without custom CSS drift." />
              <TechItem title="Kepler.gl" reason="Geospatial diagnostics that make regional error patterns easy to spot." />
              <TechItem title="KaTeX" reason="Readable math rendering inside the page." />
              <TechItem title="JSON artifacts" reason="Simple interchange between modeling outputs and the UI, easy to version in Git." />
            </div>
          </div>
        </Section>

        <Section
          id="model-comparison"
          title="Model Comparison & Best System"
          accent="emerald"
          subtitle="A practical way to use multiple models in one forecasting system."
          defaultOpen
        >
          <p className="leading-relaxed text-slate-700">
            In production, the best system is typically not a single model. You want a reliable default, an interpretable
            baseline for sanity checks, and a path for nonlinear models once they are stable.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-5 overflow-x-auto">
            <div className="font-semibold text-slate-900">Comparison table</div>

            <table className="mt-4 w-full min-w-[860px] text-sm">
              <thead>
                <tr className="text-left text-slate-700">
                  <th className="py-2 pr-4">Model</th>
                  <th className="py-2 pr-4">Overall WAPE</th>
                  <th className="py-2 pr-4">Overall Bias</th>
                  <th className="py-2 pr-4">Strength</th>
                  <th className="py-2 pr-4">Weakness</th>
                  <th className="py-2">Role in system</th>
                </tr>
              </thead>
              <tbody className="text-slate-700">
                <tr className="border-t border-slate-200">
                  <td className="py-3 pr-4 font-semibold text-slate-900">SARIMAX</td>
                  <td className="py-3 pr-4">6.72%</td>
                  <td className="py-3 pr-4">+5.32%</td>
                  <td className="py-3 pr-4">Seasonality, interpretability</td>
                  <td className="py-3 pr-4">Limited nonlinear interactions</td>
                  <td className="py-3">Baseline and guardrail</td>
                </tr>

                <tr className="border-t border-slate-200">
                  <td className="py-3 pr-4 font-semibold text-slate-900">GBM (LightGBM)</td>
                  <td className="py-3 pr-4">7.81%</td>
                  <td className="py-3 pr-4">+6.45%</td>
                  <td className="py-3 pr-4">Fast retraining, strong accuracy</td>
                  <td className="py-3 pr-4">Feature design matters</td>
                  <td className="py-3">Primary forecaster</td>
                </tr>

                <tr className="border-t border-slate-200">
                  <td className="py-3 pr-4 font-semibold text-slate-900">LSTM</td>
                  <td className="py-3 pr-4">99.98%</td>
                  <td className="py-3 pr-4">−99.98%</td>
                  <td className="py-3 pr-4">Nonlinear temporal dynamics</td>
                  <td className="py-3 pr-4">Sensitive to scaling and alignment</td>
                  <td className="py-3">Challenger after fixes</td>
                </tr>
              </tbody>
            </table>
          </div>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="font-semibold text-slate-900">Integration plan</div>

            <div className="mt-4 grid gap-3 sm:grid-cols-3">
              <MiniCard title="Default">Use GBM as the daily forecast due to speed and strong performance.</MiniCard>
              <MiniCard title="Sanity checks">Run SARIMAX in parallel and flag deviations or unusual shifts.</MiniCard>
              <MiniCard title="Uplift path">Use LSTM as a challenger once scaling and alignment are verified.</MiniCard>
            </div>

            <div className="mt-5 rounded-xl border border-slate-200 bg-white p-4">
              <div className="text-sm font-semibold text-slate-900">Ensemble sketch</div>
              <div className="mt-3 text-sm text-slate-800">
                <BlockMath>{`\\hat{y}_t^{\\mathrm{ens}} = \\sum_{m} w_m\\,\\hat{y}_{t}^{(m)}, \\quad \\sum_m w_m = 1, \\quad w_m \\propto \\frac{1}{\\epsilon + \\mathrm{WAPE}_{m,\\,\\mathrm{recent}}}`}</BlockMath>
              </div>
              <p className="mt-2 text-xs text-slate-600">Weights are computed from recent residuals (per state) and updated on a sliding window.</p>
            </div>
          </div>
        </Section>

        <Section
          id="conclusion"
          title="Conclusion"
          accent="slate"
          subtitle="A forecasting pipeline that stays consistent from data to dashboard."
          defaultOpen
        >
          <p className="leading-relaxed text-slate-700">
            This project delivers an end-to-end workflow: preprocessing built for causal evaluation, multiple model
            families, consistent scoring artifacts, and a dashboard that makes spatial behavior visible. SARIMAX and GBM
            perform reliably on this holdout window, and the LSTM run highlights the importance of strict alignment and
            scaling checks.
          </p>

          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="font-semibold text-slate-900">Next enhancements</div>
            <ul className="mt-3 space-y-2 text-slate-700 text-sm list-disc list-inside">
              <li>Prediction intervals and calibrated uncertainty per state.</li>
              <li>Per-state bias correction using recent residuals.</li>
              <li>Automated drift detection and retraining triggers.</li>
            </ul>
          </div>
        </Section>

        <footer className="mt-12 border-t border-slate-200 pt-6 pb-10 text-sm text-slate-500">
          <div>
            Repo:{" "}
            <a
              href="https://github.com/arihanth26/m5-geo-forecast"
              target="_blank"
              rel="noopener noreferrer"
              className="text-teal-700 hover:text-teal-900 hover:underline underline-offset-4"
            >
              arihanth26/m5-geo-forecast
            </a>
          </div>
        </footer>
      </div>
    </main>
  );
}

/* ---------- Components ---------- */

function Section({
  id,
  title,
  subtitle,
  accent,
  children,
  defaultOpen,
}: {
  id: string;
  title: string;
  subtitle?: string;
  accent: "teal" | "emerald" | "sky" | "violet" | "rose" | "slate";
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const accentMap: Record<string, string> = {
    teal: "bg-teal-600",
    emerald: "bg-emerald-600",
    sky: "bg-sky-600",
    violet: "bg-violet-600",
    rose: "bg-rose-600",
    slate: "bg-slate-700",
  };

  const [open, setOpen] = useState<boolean>(defaultOpen ?? false);
  const contentId = `${id}-content`;

  return (
    <section id={id} className="scroll-mt-24 py-8">
      <div className="flex items-start gap-4">
        <div className={`mt-2 h-3 w-3 rounded-full ${accentMap[accent]}`} />
        <div className="w-full">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-2xl sm:text-3xl font-semibold text-slate-900">{title}</h2>
              {subtitle ? <p className="mt-2 text-slate-600">{subtitle}</p> : null}
            </div>

            <button
              type="button"
              aria-controls={contentId}
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="mt-1 shrink-0 text-xs text-slate-500 hover:text-slate-700 underline underline-offset-4"
            >
              [{open ? "hide" : "show"}]
            </button>
          </div>

          <div id={contentId} className={`${open ? "mt-6" : "mt-6 hidden"}`}>
            {children}
          </div>

          <div className="mt-8 border-b border-slate-200" />
        </div>
      </div>
    </section>
  );
}

function ModelCard({ title, tag, children }: { title: string; tag: string; children: React.ReactNode }) {
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="text-xl font-semibold text-slate-900">{title}</div>
        <span className="text-xs rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-slate-700">{tag}</span>
      </div>
      <div className="mt-4">{children}</div>
    </div>
  );
}

function MiniCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="mt-1 text-slate-700">{children}</div>
    </div>
  );
}

function KV({ k, v }: { k: string; v: string }) {
  const html = useMemo(() => {
    return katex.renderToString(k, { throwOnError: false, strict: "ignore", displayMode: false });
  }, [k]);

  return (
    <div className="rounded-lg bg-white px-3 py-2 border border-slate-200">
      <div className="text-xs text-slate-900" dangerouslySetInnerHTML={{ __html: html }} />
      <div className="text-xs text-slate-600 mt-1">{v}</div>
    </div>
  );
}

function BlockMath({ children }: { children: string }) {
  const html = useMemo(() => {
    return katex.renderToString(children, { throwOnError: false, strict: "ignore", displayMode: true, trust: true });
  }, [children]);

  return (
    <div
      className="rounded-lg bg-white border border-slate-200 px-3 py-3 text-[13px] leading-relaxed overflow-x-auto"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}

function InlineMath({ children }: { children: string }) {
  return <BlockMath>{children}</BlockMath>;
}

function Metric({ name, eq, desc }: { name: string; eq: string; desc: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="font-semibold text-slate-900">{name}</div>
      </div>
      <div className="mt-2 text-sm text-slate-800">
        <BlockMath>{eq}</BlockMath>
      </div>
      <div className="mt-2 text-slate-700">{desc}</div>
    </div>
  );
}

/* ---------- UI components ---------- */

function HeroStat({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-white/15 bg-white/10 px-4 py-3 text-white">
      <div className="text-xs text-white/70">{label}</div>
      <div className="mt-1 text-lg sm:text-xl font-semibold tracking-tight">{value}</div>
      <div className="mt-1 text-xs text-white/65">{hint}</div>
    </div>
  );
}

function StatCard({ title, value, hint }: { title: string; value: string; hint: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs text-slate-600">{title}</div>
      <div className="mt-1 text-lg font-semibold text-slate-900">{value}</div>
      <div className="mt-1 text-xs text-slate-600">{hint}</div>
    </div>
  );
}

function ResultCard({
  title,
  pills,
  verdict,
  tone,
}: {
  title: string;
  pills: Array<{ label: string; value: string }>;
  verdict: string;
  tone?: "danger";
}) {
  const frame = tone === "danger" ? "border-rose-200 bg-rose-50" : "border-slate-200 bg-slate-50";

  return (
    <div className={`rounded-2xl border ${frame} p-5`}>
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-slate-900">{title}</div>
        <span className="text-[11px] rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">Holdout</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {pills.map((p) => (
          <span
            key={p.label}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
          >
            <span className="text-slate-500">{p.label}</span>
            <span className="font-semibold text-slate-900">{p.value}</span>
          </span>
        ))}
      </div>

      <div className="mt-3 text-sm text-slate-700">{verdict}</div>
    </div>
  );
}

function RankRow({ title, items }: { title: string; items: Array<{ k: string; v: string }> }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="text-xs font-semibold text-slate-900">{title}</div>
      <div className="mt-2 flex flex-wrap gap-2">
        {items.map((it) => (
          <span
            key={it.k}
            className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-xs text-slate-700"
          >
            <span className="font-semibold text-slate-900">{it.k}</span>
            <span className="text-slate-500">{it.v}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

function TechItem({ title, reason }: { title: string; reason: string }) {
  return (
    <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
      <div className="font-semibold text-slate-900">{title}</div>
      <div className="mt-2 text-sm text-slate-700 leading-relaxed">{reason}</div>
    </div>
  );
}

/* --- New flow components --- */

function FlowNode({ title, badge, points }: { title: string; badge: string; points: string[] }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="font-semibold text-slate-900">{title}</div>
        <span className="text-[11px] rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-slate-700">{badge}</span>
      </div>
      <ul className="mt-3 space-y-1.5 text-sm text-slate-700 list-disc list-inside">
        {points.map((p) => (
          <li key={p}>{p}</li>
        ))}
      </ul>
    </div>
  );
}

function FlowLine() {
  return (
    <div className="flex items-center justify-center">
      <div className="rounded-full border border-slate-200 bg-white p-2 text-slate-600 shadow-sm">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}

/* --- Existing flow components (kept) --- */

function FlowRow({ children }: { children: React.ReactNode }) {
  return <div className="flex flex-col gap-3 lg:flex-row lg:items-stretch lg:gap-4">{children}</div>;
}

function FlowStep({ title, desc, badge }: { title: string; desc: string; badge: string }) {
  return (
    <div className="flex-1 rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <div className="flex items-center justify-between gap-3">
        <div className="font-semibold text-slate-900">{title}</div>
        <span className="text-[11px] rounded-full border border-slate-200 bg-white px-2 py-1 text-slate-700">{badge}</span>
      </div>
      <div className="mt-2 text-sm text-slate-700 leading-relaxed">{desc}</div>
    </div>
  );
}

function FlowArrow() {
  return (
    <div className="hidden lg:flex lg:items-center lg:justify-center lg:px-1">
      <div className="rounded-full border border-slate-200 bg-white p-2 text-slate-600">
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
          <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          <path d="M13 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </div>
    </div>
  );
}
