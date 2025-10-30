# Emissions Dashboard

A dual-persona carbon emissions tracking platform built with React, featuring distinct interfaces for corporate sustainability managers and portfolio investors.

## Overview

This dashboard visualizes Scope 1, 2, and 3 emissions data for 50 companies across 10 sectors and 6 global regions (2018-2022). Users can switch between two persona-specific views optimized for different use cases.

## User Personas

### Corporate Persona
**Target User:** Sustainability Manager

**Features:**
- Company selector (50 companies)
- Emissions trend visualization with Net Zero trajectory
- Year-over-year change analysis
- Peer company benchmarking
- Progress tracking toward reduction goals

### Investor Persona
**Target User:** Asset Manager / Portfolio Analyst

**Features:**
- Market-wide emissions aggregation
- Sector and region breakdown analysis
- Scope 1/2/3 distribution visualization
- Year-over-year comparison (2018-2022)
- Portfolio exposure insights

## Tech Stack

- **Frontend:** React 18 + Vite
- **Styling:** Tailwind CSS
- **Charts:** Recharts
- **Data:** Mock API (browser-based, no backend required)

## Quick Start

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## Data

- **Companies:** 50
- **Sectors:** Mining, Transport, Utilities, Finance, Chemicals, Energy, Manufacturing, Retail, Healthcare, Technology
- **Regions:** Asia-Pacific, Africa, Europe, Middle East, North America, South America
- **Time Range:** 2018-2022 (5 years)
- **Records:** 250 emissions data points

## Features

- **Dual Persona Toggle:** Instant switching between Corporate and Investor views
- **Interactive Charts:** Line charts, bar charts, and pie charts with hover tooltips
- **Real-time Filtering:** Company selector, year selector, and tab navigation
- **Responsive Design:** Works on desktop and tablet
- **Mock API:** Fully functional without backend (ready for API integration)

## Project Structure

```
src/
├── App.jsx              # Main app with persona toggle
├── CorporateView.jsx    # Corporate persona dashboard
├── InvestorView.jsx     # Investor persona dashboard
├── data.js              # API wrapper functions
└── api/
    ├── mockApi.js       # Mock backend (browser-based)
    └── emissions-data.json  # Emissions dataset
```

## API Integration

Currently uses a mock API for local development. To connect to a real API:

1. Set `USE_MOCK_API = false` in `src/data.js`
2. Configure `VITE_API_URL` environment variable
3. Deploy backend (compatible with Cloudflare Workers, Node.js, etc.)

## Use Cases

**Corporate View:**
- Track company-specific emissions over time
- Monitor progress toward Net Zero targets
- Compare performance against peer companies
- Generate sustainability reports

**Investor View:**
- Analyze emissions across investment portfolio
- Identify high-emission sectors and regions
- Assess climate risk exposure
- Make informed ESG investment decisions

## Deployment

Ready for deployment to:
- Cloudflare Pages (recommended)
- AWS (Complicated)