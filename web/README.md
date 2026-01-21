<!-- Project README -->
# Spatiotemporal Demand Forecasting Using LSTM, SARIMAX & Gradient Boosting

![Dashboard Preview](assets/dashboard.png)

## Overview

This project presents an end to end spatiotemporal demand forecasting system that combines classical time series models, machine learning, and deep learning with an interactive geospatial analytics dashboard.

Using historical daily demand data across multiple US states, the system forecasts future demand, quantifies uncertainty and error, and enables intuitive exploration of spatial and temporal patterns through a 3D map based interface.

The project emphasizes both modeling rigor and decision focused visualization.

---

## Problem Statement

Retail and supply chain demand is inherently spatiotemporal. Demand varies over time due to seasonality, trends, and promotions, and across geography due to regional behavior, logistics constraints, and market structure.

Most forecasting pipelines either:
- Focus purely on time series accuracy without spatial context, or
- Visualize demand spatially without linking it to forecast quality and model behavior

This project addresses the gap by building a unified system that:
- Forecasts demand at a state level
- Compares multiple modeling approaches
- Surfaces insights through an interactive geospatial dashboard suitable for operational analysis

---

## Objectives

- Forecast state level demand using multiple modeling paradigms
- Compare classical statistical models against machine learning and deep learning approaches
- Quantify forecast error and temporal drift
- Enable interactive exploration of demand, forecasts, and errors across time and geography
- Present results in a decision oriented visual interface

---

## Data

- Dataset: M5 style retail demand data
- Granularity: Daily demand aggregated to state level
- Geography: Selected US states with consistent historical coverage
- Train test split: Time based split to preserve temporal causality

---

## Models Used

### 1. SARIMAX
- Captures trend, seasonality, and autoregressive structure
- Serves as a strong statistical baseline
- Particularly effective for interpretable forecasting and stability

### 2. Gradient Boosting (LightGBM)
- Learns nonlinear relationships and cross feature interactions
- Incorporates lag features, rolling statistics, and calendar effects
- Strong performance for medium horizon forecasts

### 3. LSTM
- Sequence based deep learning model
- Learns long range temporal dependencies
- Evaluated for its ability to adapt to regime changes and demand shifts

Each model produces aligned forecasts to allow direct comparison across time and geography.

---

## Evaluation Metrics

- Absolute Error
- Aggregate demand deviation
- Relative contribution to national demand
- Day over day change analysis

Metrics are computed per state and per time bucket to support spatial comparison.

---

## System Architecture

- Backend
  - Python based data processing and modeling
  - Forecast generation and error computation
- Frontend
  - Next.js and React
  - Deck.gl and MapLibre for 3D geospatial rendering
  - Custom state level interaction, hover, and pinning logic
- State management
  - Centralized store for time index, view mode, and model selection

---

## Interactive Dashboard Features

- 3D extruded US state map with demand encoded as height and color
- Time slider to animate demand and forecasts over time
- Model switcher to compare SARIMAX, Gradient Boosting, and LSTM outputs
- Hover tooltips for instant state level inspection
- Pinning system to analyze 30 day historical vs forecast trajectories
- Distribution plots highlighting median, p05, and p95 behavior
- Top and bottom state rankings and daily movers

---

## Key Insights Enabled

- Identification of regional demand concentration
- Detection of forecast instability across states
- Comparison of model behavior before and after forecast boundary
- Rapid diagnosis of states driving national level error

---

## Use Cases

- Retail demand planning
- Supply chain network analysis
- Forecast monitoring and model comparison
- Decision support for inventory allocation

---

## How to Run

```bash
# install dependencies
npm install

# run the dashboard
npm run dev
