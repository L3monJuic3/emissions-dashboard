// Cloudflare Worker API for Emissions Dashboard
// Built with Hono framework

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { prettyJSON } from 'hono/pretty-json';

const app = new Hono();

// Middleware
app.use('/*', cors({
  origin: '*', // In production, specify your domain
  allowMethods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowHeaders: ['Content-Type'],
}));

app.use('/*', prettyJSON());

// Root endpoint
app.get('/', (c) => {
  return c.json({
    name: 'Emissions API',
    version: '1.0.0',
    endpoints: {
      companies: '/api/companies',
      company: '/api/companies/:name',
      peers: '/api/companies/:name/peers',
      sectors: '/api/sectors?year=2022',
      regions: '/api/regions?year=2022',
    }
  });
});

// Get all companies
app.get('/api/companies', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT
        c.*,
        COUNT(e.id) as emission_records,
        MIN(e.year) as first_year,
        MAX(e.year) as latest_year
      FROM companies c
      LEFT JOIN emissions e ON c.id = e.company_id
      GROUP BY c.id
      ORDER BY c.name
    `).all();

    return c.json({
      success: true,
      count: results.length,
      companies: results
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get single company with emissions data
app.get('/api/companies/:name', async (c) => {
  try {
    const name = decodeURIComponent(c.req.param('name'));

    // Get company info
    const company = await c.env.DB.prepare(
      'SELECT * FROM companies WHERE name = ?'
    ).bind(name).first();

    if (!company) {
      return c.json({ success: false, error: 'Company not found' }, 404);
    }

    // Get emissions data
    const { results: emissions } = await c.env.DB.prepare(`
      SELECT
        year,
        scope_1,
        scope_2,
        scope_3,
        (scope_1 + COALESCE(scope_2, 0) + scope_3) as total
      FROM emissions
      WHERE company_id = ?
      ORDER BY year
    `).bind(company.id).all();

    return c.json({
      success: true,
      company,
      emissions,
      summary: {
        total_records: emissions.length,
        baseline_emissions: emissions.find(e => e.year == company.baseline_year)?.total || null,
        latest_emissions: emissions[emissions.length - 1]?.total || null,
      }
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get peer companies for comparison
app.get('/api/companies/:name/peers', async (c) => {
  try {
    const name = decodeURIComponent(c.req.param('name'));
    const limit = parseInt(c.req.query('limit') || '5');
    const year = parseInt(c.req.query('year') || new Date().getFullYear().toString());

    // Get company info
    const company = await c.env.DB.prepare(
      'SELECT id, sector, region FROM companies WHERE name = ?'
    ).bind(name).first();

    if (!company) {
      return c.json({ success: false, error: 'Company not found' }, 404);
    }

    // Get current company's emissions for comparison
    const currentCompanyEmissions = await c.env.DB.prepare(`
      SELECT
        '${name}' as name,
        c.sector,
        (e.scope_1 + COALESCE(e.scope_2, 0) + e.scope_3) as total_emissions,
        e.year,
        1 as is_current_company
      FROM companies c
      JOIN emissions e ON c.id = e.company_id
      WHERE c.name = ? AND e.year = ?
    `).bind(name, year).first();

    // Get peer companies in same sector
    const { results: peers } = await c.env.DB.prepare(`
      SELECT
        c.name,
        c.sector,
        c.region,
        (e.scope_1 + COALESCE(e.scope_2, 0) + e.scope_3) as total_emissions,
        e.year,
        0 as is_current_company
      FROM companies c
      JOIN emissions e ON c.id = e.company_id
      WHERE c.sector = ?
        AND c.name != ?
        AND e.year = ?
      ORDER BY RANDOM()
      LIMIT ?
    `).bind(company.sector, name, year, limit).all();

    const allCompanies = currentCompanyEmissions
      ? [currentCompanyEmissions, ...peers]
      : peers;

    return c.json({
      success: true,
      year,
      sector: company.sector,
      companies: allCompanies
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get sector aggregations
app.get('/api/sectors', async (c) => {
  try {
    const year = parseInt(c.req.query('year') || new Date().getFullYear().toString());

    const { results } = await c.env.DB.prepare(`
      SELECT
        c.sector,
        COUNT(DISTINCT c.id) as company_count,
        SUM(e.scope_1) as total_scope_1,
        SUM(COALESCE(e.scope_2, 0)) as total_scope_2,
        SUM(e.scope_3) as total_scope_3,
        SUM(e.scope_1 + COALESCE(e.scope_2, 0) + e.scope_3) as total_emissions,
        AVG(e.scope_1 + COALESCE(e.scope_2, 0) + e.scope_3) as avg_emissions
      FROM companies c
      JOIN emissions e ON c.id = e.company_id
      WHERE e.year = ?
      GROUP BY c.sector
      ORDER BY total_emissions DESC
    `).bind(year).all();

    return c.json({
      success: true,
      year,
      sectors: results
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get region aggregations
app.get('/api/regions', async (c) => {
  try {
    const year = parseInt(c.req.query('year') || new Date().getFullYear().toString());

    const { results } = await c.env.DB.prepare(`
      SELECT
        c.region,
        COUNT(DISTINCT c.id) as company_count,
        SUM(e.scope_1) as total_scope_1,
        SUM(COALESCE(e.scope_2, 0)) as total_scope_2,
        SUM(e.scope_3) as total_scope_3,
        SUM(e.scope_1 + COALESCE(e.scope_2, 0) + e.scope_3) as total_emissions,
        AVG(e.scope_1 + COALESCE(e.scope_2, 0) + e.scope_3) as avg_emissions
      FROM companies c
      JOIN emissions e ON c.id = e.company_id
      WHERE e.year = ?
      GROUP BY c.region
      ORDER BY total_emissions DESC
    `).bind(year).all();

    return c.json({
      success: true,
      year,
      regions: results
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Search companies by name, sector, or region
app.get('/api/search', async (c) => {
  try {
    const query = c.req.query('q') || '';
    const sector = c.req.query('sector');
    const region = c.req.query('region');

    let sql = `
      SELECT DISTINCT c.*
      FROM companies c
      WHERE 1=1
    `;
    const params = [];

    if (query) {
      sql += ` AND c.name LIKE ?`;
      params.push(`%${query}%`);
    }

    if (sector) {
      sql += ` AND c.sector = ?`;
      params.push(sector);
    }

    if (region) {
      sql += ` AND c.region = ?`;
      params.push(region);
    }

    sql += ` ORDER BY c.name LIMIT 50`;

    const { results } = await c.env.DB.prepare(sql).bind(...params).all();

    return c.json({
      success: true,
      count: results.length,
      companies: results
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get available years
app.get('/api/years', async (c) => {
  try {
    const { results } = await c.env.DB.prepare(`
      SELECT DISTINCT year
      FROM emissions
      ORDER BY year DESC
    `).all();

    return c.json({
      success: true,
      years: results.map(r => r.year)
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// Get statistics
app.get('/api/stats', async (c) => {
  try {
    const stats = await c.env.DB.prepare(`
      SELECT
        (SELECT COUNT(*) FROM companies) as total_companies,
        (SELECT COUNT(*) FROM emissions) as total_emissions_records,
        (SELECT COUNT(DISTINCT sector) FROM companies) as total_sectors,
        (SELECT COUNT(DISTINCT region) FROM companies) as total_regions,
        (SELECT MIN(year) FROM emissions) as earliest_year,
        (SELECT MAX(year) FROM emissions) as latest_year
    `).first();

    return c.json({
      success: true,
      stats
    });
  } catch (error) {
    return c.json({ success: false, error: error.message }, 500);
  }
});

// 404 handler
app.notFound((c) => {
  return c.json({
    success: false,
    error: 'Not found',
    message: 'The requested endpoint does not exist'
  }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    success: false,
    error: err.message
  }, 500);
});

export default app;