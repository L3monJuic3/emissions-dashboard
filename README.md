# Verdantix Emissions Dashboard
## Complete Technical Documentation
---

## Executive Summary

This document presents a complete implementation of a dual-persona carbon emissions tracking platform. The solution uses Cloudflare's edge infrastructure to deliver a serverless, globally distributed application serving both corporate sustainability managers and portfolio investors.

### What's Built

- **Star schema database** (Cloudflare D1)
- **Automated ETL pipeline** (Node.js script)
- **REST API** (Cloudflare Worker, 8 endpoints)
- **React prototype** (Corporate + Investor views)
- **Annotated wireframes** (HTML + design rationale)
- **User management system** (Role-based access control)
- **Deployment strategy** (Cloudflare Pages + Workers)

---

## 1. Backend Architecture

### System Overview

```
CSV Data (50 companies)
        ↓
    ETL Script
        ↓
  Cloudflare D1 (SQLite)
        ↓
 Cloudflare Worker (API)
        ↓
   React Frontend
```

### Data Model: Star Schema

**Why star schema?** Fast aggregations for analytics. One central fact table (emissions) surrounded by dimension tables (company, sector, region).

```
Dimensions:              Fact Table:
- dim_sector            fact_emissions
- dim_region              ↓
- dim_ownership         (company_id, year, scope_1, scope_2, scope_3)
- dim_company                ↓
                         Calculated: total = scope_1 + scope_2 + scope_3
Targets:
- dim_targets
  (baseline_year, net_zero_year)
```

**Key Benefits:**
- Single JOIN for most queries
- Easy to add new dimensions
- Optimized for aggregations (SUM, AVG by sector/region)

### Database Schema

```sql
-- Dimensions (lookup tables)
CREATE TABLE dim_sector (
  sector_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL
);

CREATE TABLE dim_company (
  company_id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT UNIQUE NOT NULL,
  sector_id INTEGER,
  region_id INTEGER,
  FOREIGN KEY (sector_id) REFERENCES dim_sector(sector_id)
);

-- Fact table (measurements)
CREATE TABLE fact_emissions (
  company_id INTEGER,
  year INTEGER,
  scope_1 REAL NOT NULL DEFAULT 0,
  scope_2 REAL NOT NULL DEFAULT 0,
  scope_3 REAL NOT NULL DEFAULT 0,
  total REAL GENERATED ALWAYS AS (scope_1 + scope_2 + scope_3) STORED,
  PRIMARY KEY (company_id, year),
  FOREIGN KEY (company_id) REFERENCES dim_company(company_id)
);

-- Targets
CREATE TABLE dim_targets (
  company_id INTEGER PRIMARY KEY,
  baseline_year INTEGER NOT NULL,
  net_zero_year INTEGER NOT NULL,
  FOREIGN KEY (company_id) REFERENCES dim_company(company_id)
);
```

### ETL Pipeline

**Simple 3-step process:**

```bash
# 1. Read CSV → 2. Transform → 3. Load to D1

node scripts/etl.cjs

# Output:
# Found 50 companies
# Extracted 10 sectors, 6 regions
# Generated SQL (306 lines)
# Loaded to D1
# Verified: 50 companies, 250 emissions records
```

**What it does:**
- Parses CSV file
- Extracts unique companies/sectors/regions
- Generates INSERT statements with proper relationships
- Executes via Wrangler CLI
- Validates data loaded correctly

---

## 2. API Architecture

### Cloudflare Worker Endpoints

```javascript
GET /api/companies              // List all companies
GET /api/companies/:name        // Company details + emissions
GET /api/companies/:name/peers  // Peer comparison (same sector)
GET /api/sectors?year=2022      // Sector aggregations
GET /api/regions?year=2022      // Region aggregations
GET /api/stats                  // Global statistics
GET /api/health                 // Health check
```

### Example: Company Endpoint

```javascript
app.get('/api/companies/:name', async (c) => {
  const name = c.req.param('name');

  // Get company info with targets
  const company = await c.env.DB.prepare(`
    SELECT c.*, s.name as sector, r.name as region,
           t.baseline_year, t.net_zero_year
    FROM dim_company c
    JOIN dim_sector s ON c.sector_id = s.sector_id
    JOIN dim_region r ON c.region_id = r.region_id
    LEFT JOIN dim_targets t ON c.company_id = t.company_id
    WHERE c.name = ?
  `).bind(name).first();

  // Get emissions history
  const emissions = await c.env.DB.prepare(`
    SELECT year, scope_1, scope_2, scope_3, total
    FROM fact_emissions
    WHERE company_id = ?
    ORDER BY year
  `).bind(company.company_id).all();

  return c.json({ company, emissions: emissions.results });
});
```

### Why Cloudflare Workers?

| Feature | Benefit |
|---------|---------|
| Zero cold starts | <10ms startup time |
| Global edge | Runs in 280+ cities |
| Free tier | 100K requests/day |
| Simple deployment | One command: `wrangler deploy` |


---

## 3. Frontend Implementation

### Tech Stack

| Technology | Why? |
|------------|------|
| **React 18** | Component reusability, rich ecosystem |
| **Vite** | 10-100x faster than CRA, instant HMR |
| **Tailwind CSS** | Rapid prototyping, consistent design |
| **Recharts** | Declarative charts, responsive by default |

### Component Structure

```
App.jsx                    # Root + persona toggle
  ├─ CorporateView.jsx     # Sustainability manager dashboard
  │   ├─ CompanySelector
  │   ├─ InfoCards (sector, region, target)
  │   ├─ EmissionsTrendChart (Line chart with target)
  │   ├─ EmissionsTable (YoY data)
  │   └─ PeerComparisonChart (Bar chart)
  │
  └─ InvestorView.jsx      # Asset manager dashboard
      ├─ SummaryCards (portfolio metrics)
      ├─ YearSelector
      ├─ ScopeBreakdown (Pie chart)
      └─ TabbedView
          ├─ SectorTab (Chart + Table)
          └─ RegionTab (Chart + Table)
```

### Key Features

**1. Persona Toggle**
```jsx
const [activeView, setActiveView] = useState('corporate');

<button onClick={() => setActiveView('corporate')}>
  🏢 Corporate
</button>
<button onClick={() => setActiveView('investor')}>
  📊 Investor
</button>
```

**2. API Integration**
```javascript
// Switch between mock and real API
const USE_MOCK_API = false;
const API_URL = 'https://emissions-api.ethan-lane.workers.dev/api';

export async function fetchCompanyData(name) {
  const response = await fetch(`${API_URL}/companies/${encodeURIComponent(name)}`);
  return response.json();
}
```

---

## 4. UX Design & Wireframes

### User Journeys

**Corporate User (Sustainability Manager):**
```
1. Select company from dropdown
2. View emissions trend vs Net Zero target
3. Check year-over-year progress
4. Compare to peer companies (same sector)
5. Identify actions needed
```

**Investor User (Asset Manager):**
```
1. View portfolio-wide emissions
2. Select year to analyze
3. Review scope breakdown (1/2/3)
4. Explore by sector or region
5. Identify high-risk areas
```

### Design Principles

1. **Clarity over complexity** - Simple charts, clear labels
2. **Progressive disclosure** - Summary → Visual → Detail
3. **Consistent patterns** - Same layout structure across views
4. **Accessibility** - WCAG AA compliant colors, keyboard navigation

### Wireframes Delivered

- `https://www.figma.com/design/5tmmPGdhDOwZpa8hnUqWtw/Verandix-Emissions-Wireframe?node-id=0-1&t=xM8KtFHutgO8vGb5-1`


**Key Design Decisions:**

| Component | Corporate View | Investor View |
|-----------|---------------|---------------|
| **Primary metric** | Company emissions | Portfolio totals |
| **Time control** | In timeline (all years visible) | Year selector (buttons) |
| **Comparison** | Peer companies (4 bars) | Sector/region (tabs) |
| **Chart type** | Line (trends) | Pie + Bar (distributions) |

---

## 5. User Management & Roles

### Role Definitions

| Role | Access Scope | Primary Use Case |
|------|-------------|------------------|
| **Corporate** | Own company + sector peers | Sustainability manager tracking progress |
| **Investor** | All companies, aggregations | Portfolio analyst assessing exposure |
| **Admin** | Full system access | Platform administrator |
| **Auditor** | Read-only, all data | Third-party verification |

### Permission Matrix

| Action | Corporate | Investor | Admin | Auditor |
|--------|-----------|----------|-------|---------|
| View own company | ✅ | ❌ | ✅ | ✅ |
| View peer companies | ✅ (sector only) | ✅ | ✅ | ✅ |
| View all companies | ❌ | ✅ | ✅ | ✅ |
| Sector aggregations | ❌ | ✅ | ✅ | ✅ |
| Edit data | ❌ | ❌ | ✅ | ❌ |
| Export data | ✅ | ✅ | ✅ | ✅ |

### Implementation: Cloudflare Access

**Why Cloudflare Access?**
- Zero-config SSO (Google, Okta, Azure AD)
- JWT tokens managed automatically
- Built-in MFA support
- No password storage needed

```javascript
// Worker middleware
async function requireRole(c, allowedRoles) {
  const token = c.req.header('Authorization')?.replace('Bearer ', '');
  const payload = await verifyJWT(token);

  if (!allowedRoles.includes(payload.role)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  c.set('user', payload);
  await next();
}

// Protected endpoint
app.get('/api/companies', requireRole(['investor', 'admin']), async (c) => {
  // Only investors/admins can list all companies
});
```

### Data Filtering by Role

```javascript
// Corporate users see only their company + sector peers
if (user.role === 'corporate') {
  const companies = await c.env.DB.prepare(`
    SELECT * FROM dim_company
    WHERE company_id = ?
       OR sector_id = (SELECT sector_id FROM dim_company WHERE company_id = ?)
  `).bind(user.company_id, user.company_id).all();
}

// Investors see everything
if (user.role === 'investor') {
  const companies = await c.env.DB.prepare(`
    SELECT * FROM dim_company
  `).all();
}
```

---

## 6. Permissioning System

### Row-Level Security

Filter data at query level based on user role:

```javascript
// Corporate: Only own company
const companyFilter = user.role === 'corporate'
  ? `WHERE company_id = ${user.company_id}`
  : ``; // Investors see all

const query = `SELECT * FROM dim_company ${companyFilter}`;
```
---

## 7. Hosting & Deployment

### Why Cloudflare?

**The Short Answer:** One platform for everything, no cold starts, global edge deployment, extremely cost-effective.

### Comparison Table

| Factor | Cloudflare | AWS | Vercel |
|--------|-----------|-----|--------|
| **Cold starts** | 0ms | 100-500ms | 50-200ms |
| **Global distribution** | 280+ cities | 33 regions | 70+ cities |
| **Database included** | Yes (D1) | No (separate RDS) | Add-on |
| **Free tier** | 100K req/day | Limited | 100 GB-hours |
| **Setup complexity** | 5 minutes | 30+ minutes | 10 minutes |
| **Monthly cost (10M req)** | ~$5 | ~$50 | ~$20 |

### Deployment Architecture

```
┌─────────────────┐
│ GitHub Repo     │
└────────┬────────┘
         │ git push
         ↓
┌─────────────────┐
│ GitHub Actions  │ (Optional CI/CD)
└────────┬────────┘
         │
         ├──────────────────┬─────────────────┐
         ↓                  ↓                 ↓
┌────────────────┐  ┌──────────────┐  ┌──────────────┐
│Cloudflare Pages│  │Cloudflare    │  │Cloudflare D1 │
│ (Frontend)     │  │Worker (API)  │  │ (Database)   │
└────────────────┘  └──────────────┘  └──────────────┘
```

### Deployment Commands

```bash
# 1. Deploy Database
npx wrangler d1 create emissions-db
npx wrangler d1 execute emissions-db --remote --file=schema.sql
node scripts/etl.cjs

# 2. Deploy API
cd emissions-api
npx wrangler deploy
# → https://emissions-api.your-subdomain.workers.dev

# 3. Deploy Frontend
cd emissions-dashboard
npm run build
npx wrangler pages deploy dist --project-name=emissions-dashboard
# → https://emissions-dashboard.pages.dev
```

**Total deployment time:** <5 minutes

### Why This Beats Alternatives

**vs AWS:**
Basically just AWS complexity (Typically a big company platform/ micro-service architecture (Kubernetes) etc.)
- No VPC configuration
- No load balancer setup
- No RDS provisioning
- No container orchestration
- No SSL certificate management

**vs Vercel:**
- Database included (no separate Postgres)
- Better free tier for APIs
- True edge computing (not just CDN)

---

## 8. Scalability Considerations

### Scaling to 10,000 Companies

**API optimizations:**
```javascript
// 1. Add response caching
const cache = caches.default;
const cacheKey = new Request(c.req.url);
const cachedResponse = await cache.match(cacheKey);

if (cachedResponse) return cachedResponse;

// 2. Implement pagination - Very good for displaying large amounts of data on the UI fast
const page = c.req.query('page') || 1;
const limit = 100;
const offset = (page - 1) * limit;

const companies = await db.prepare(`
  SELECT * FROM dim_company
  LIMIT ? OFFSET ?
`).bind(limit, offset).all();
```
---

## 9. Alternative Architecture

### Option: AWS Lambda + PostgreSQL

**Architecture:**

```
Route 53 (DNS)
    ↓
CloudFront (CDN)
    ↓
API Gateway
    ↓
Lambda Functions (Node.js)
    ↓
RDS PostgreSQL
```

**Why consider this?**

| Advantage | Why It Matters |
|-----------|----------------|
| **Mature ecosystem** | More third-party integrations |
| **PostgreSQL features** | Advanced analytics (window functions, CTEs) |
| **Team familiarity** | Most devs know AWS |
| **Enterprise trust** | Easier to get buy-in from large orgs |


### Cloudflare vs AWS Comparison

| Factor | Cloudflare | AWS |
|--------|-----------|-----|
| **Setup time** | 5 minutes | 30-60 minutes |
| **Cold starts** | 0ms | 100-500ms |
| **Connection pooling** | Not needed | Required (RDS Proxy) |
| **Scaling complexity** | Automatic | Manual (ASG, RDS sizing) |
| **Cost (10M req)** | $5/month | $50-100/month |
| **PostgreSQL features** | Limited (SQLite) | Full (RDS) |
| **Vendor lock-in** | Medium | High |

### When to Choose AWS

1. **Complex analytics:** Need advanced SQL (window functions, recursive CTEs)
2. **Large datasets:** >100 GB database
3. **Enterprise requirements:** Must use AWS for compliance
4. **Team expertise:** Entire team knows AWS, nobody knows Cloudflare

### When to Choose Cloudflare

1. **Speed to market:** Launch in days, not weeks
2. **Global users:** Sub-50ms latency worldwide
3. **Cost-sensitive:** Startup budget
4. **Simple queries:** Aggregations, JOINs sufficient (no complex SQL)
5. **Serverless-first:** Don't want to manage infrastructure

**Recommendation for Verdantix:** Start with Cloudflare (faster iteration), migrate to AWS if you need heavier features

---

## 10. Trade-offs & Future Improvements

### Trade-offs Made

| Decision | Trade-off | Mitigation |
|----------|-----------|-----------|
| **Cloudflare D1 (SQLite)** | Limited to 10 GB | Monitor usage, plan migration at 5 GB |
| **No real-time updates** | Data refreshed nightly | Acceptable for emissions (not real-time) |
| **No authentication** | No granular permissions | Add more roles in v2 |

### Constraints Acknowledged

1. **Dataset size:** 50 companies is small. Real system needs 10,000+
2. **Limited Time** 3-5 hours is not enough time to prototype a working model

---

## 11. Deliverables Summary

### Code Repositories

```
emissions-dashboard/           # Frontend (React)
├── src/
│   ├── App.jsx               # Persona toggle
│   ├── CorporateView.jsx     # Corporate dashboard
│   ├── InvestorView.jsx      # Investor dashboard
│   └── data.js               # API client
└── package.json

emissions-api/                 # Backend (Cloudflare Worker)
├── src/
│   └── index.js              # API routes
├── schema.sql                # Database schema
└── wrangler.toml             # Cloudflare config

emissions-dashboard-source/   # ETL + Scripts
└── scripts/
    └── etl.cjs               # CSV → D1 pipeline
```

### Live Deployments

- **Frontend:** https://emissions-dashboard.pages.dev
- **API:** https://emissions-api.ethan-lane.workers.dev
- **Demo:** Ready for live presentation

---

## Appendix: Quick Reference

### API Endpoints
```
GET  /api/companies              # List all companies
GET  /api/companies/:name        # Company details + emissions
GET  /api/companies/:name/peers  # Peer comparison
GET  /api/sectors?year=YYYY      # Sector aggregations
GET  /api/regions?year=YYYY      # Region aggregations
GET  /api/stats                  # Global statistics
GET  /api/health                 # Health check
```

### Environment Variables
```bash
# Frontend (.env)
VITE_API_URL=https://emissions-api.your-subdomain.workers.dev/api

# Backend (wrangler.toml)
[[d1_databases]]
binding = "DB"
database_name = "emissions-db"
database_id = "your-database-id"
```

### Quick Deploy
```bash
# Database
npx wrangler d1 execute emissions-db --remote --file=schema.sql
node scripts/etl.cjs

# API
cd emissions-api && npx wrangler deploy

# Frontend
cd emissions-dashboard && npm run build && npx wrangler pages deploy dist
```

---

**End of Documentation**