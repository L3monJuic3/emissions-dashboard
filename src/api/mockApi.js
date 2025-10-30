// Mock API for local development
// This simulates the Cloudflare Worker API using your CSV data

import rawData from './emissions-data.json';

// Simulate network delay
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// Mock API functions
export const mockApi = {
  async getCompanies() {
    await delay(300);

    // Get unique companies
    const companiesMap = new Map();
    rawData.forEach(row => {
      if (!companiesMap.has(row.Company)) {
        companiesMap.set(row.Company, {
          id: companiesMap.size + 1,
          name: row.Company,
          sector: row.Sector,
          region: row.Region,
          ownership: row.Ownership,
          baseline_year: parseInt(row['Baseline Year']),
          net_zero_year: parseInt(row['Net Zero Year']),
          interim_target_year: row['Interim Target Year'] ? parseInt(row['Interim Target Year']) : null,
          interim_reduction_percent: row['Interim Reduction %'] ? parseInt(row['Interim Reduction %']) : null,
        });
      }
    });

    return Array.from(companiesMap.values());
  },

  async getCompanyData(companyName) {
    await delay(300);

    // Find company
    const companyRows = rawData.filter(row => row.Company === companyName);
    if (companyRows.length === 0) {
      throw new Error('Company not found');
    }

    const firstRow = companyRows[0];
    const company = {
      id: 1,
      name: companyName,
      sector: firstRow.Sector,
      region: firstRow.Region,
      ownership: firstRow.Ownership,
      baseline_year: parseInt(firstRow['Baseline Year']),
      net_zero_year: parseInt(firstRow['Net Zero Year']),
      interim_target_year: firstRow['Interim Target Year'] ? parseInt(firstRow['Interim Target Year']) : null,
      interim_reduction_percent: firstRow['Interim Reduction %'] ? parseInt(firstRow['Interim Reduction %']) : null,
    };

    // Get emissions data
    const emissions = companyRows.map(row => ({
      year: parseInt(row.Year),
      scope_1: parseFloat(row['Scope 1']),
      scope_2: row['Scope 2'] ? parseFloat(row['Scope 2']) : null,
      scope_3: parseFloat(row['Scope 3']),
      total: parseFloat(row['Scope 1']) +
             (row['Scope 2'] ? parseFloat(row['Scope 2']) : 0) +
             parseFloat(row['Scope 3'])
    })).sort((a, b) => a.year - b.year);

    return {
      success: true,
      company,
      emissions,
    };
  },

  async getPeerCompanies(companyName, limit = 4, year = 2022) {
    await delay(300);

    // Find company sector
    const companyRow = rawData.find(row => row.Company === companyName);
    if (!companyRow) {
      throw new Error('Company not found');
    }

    const sector = companyRow.Sector;

    // Get current company's emissions
    const currentCompanyData = rawData.filter(
      row => row.Company === companyName && parseInt(row.Year) === year
    )[0];

    const currentCompanyEmissions = currentCompanyData ?
      parseFloat(currentCompanyData['Scope 1']) +
      (currentCompanyData['Scope 2'] ? parseFloat(currentCompanyData['Scope 2']) : 0) +
      parseFloat(currentCompanyData['Scope 3']) : 0;

    // Get peer companies in same sector
    const peerCompaniesMap = new Map();
    rawData
      .filter(row =>
        row.Sector === sector &&
        row.Company !== companyName &&
        parseInt(row.Year) === year
      )
      .forEach(row => {
        if (!peerCompaniesMap.has(row.Company)) {
          const total = parseFloat(row['Scope 1']) +
                       (row['Scope 2'] ? parseFloat(row['Scope 2']) : 0) +
                       parseFloat(row['Scope 3']);

          peerCompaniesMap.set(row.Company, {
            name: row.Company,
            sector: row.Sector,
            region: row.Region,
            total_emissions: total,
            year: year,
            is_current_company: 0
          });
        }
      });

    // Get random peers (limit)
    const peers = Array.from(peerCompaniesMap.values())
      .sort(() => Math.random() - 0.5)
      .slice(0, limit);

    // Add current company
    const allCompanies = [
      {
        name: companyName,
        sector: sector,
        region: companyRow.Region,
        total_emissions: currentCompanyEmissions,
        year: year,
        is_current_company: 1
      },
      ...peers
    ];

    return {
      success: true,
      year,
      sector,
      companies: allCompanies
    };
  },

  async getSectors(year = 2022) {
    await delay(300);

    const sectorMap = new Map();

    rawData
      .filter(row => parseInt(row.Year) === year)
      .forEach(row => {
        const sector = row.Sector;
        const scope1 = parseFloat(row['Scope 1']);
        const scope2 = row['Scope 2'] ? parseFloat(row['Scope 2']) : 0;
        const scope3 = parseFloat(row['Scope 3']);

        if (!sectorMap.has(sector)) {
          sectorMap.set(sector, {
            sector,
            company_count: 0,
            total_scope_1: 0,
            total_scope_2: 0,
            total_scope_3: 0,
            total_emissions: 0,
          });
        }

        const data = sectorMap.get(sector);
        data.company_count++;
        data.total_scope_1 += scope1;
        data.total_scope_2 += scope2;
        data.total_scope_3 += scope3;
        data.total_emissions += scope1 + scope2 + scope3;
      });

    const sectors = Array.from(sectorMap.values())
      .sort((a, b) => b.total_emissions - a.total_emissions);

    return {
      success: true,
      year,
      sectors
    };
  },

  async getRegions(year = 2022) {
    await delay(300);

    const regionMap = new Map();

    rawData
      .filter(row => parseInt(row.Year) === year)
      .forEach(row => {
        const region = row.Region;
        const scope1 = parseFloat(row['Scope 1']);
        const scope2 = row['Scope 2'] ? parseFloat(row['Scope 2']) : 0;
        const scope3 = parseFloat(row['Scope 3']);

        if (!regionMap.has(region)) {
          regionMap.set(region, {
            region,
            company_count: 0,
            total_scope_1: 0,
            total_scope_2: 0,
            total_scope_3: 0,
            total_emissions: 0,
          });
        }

        const data = regionMap.get(region);
        data.company_count++;
        data.total_scope_1 += scope1;
        data.total_scope_2 += scope2;
        data.total_scope_3 += scope3;
        data.total_emissions += scope1 + scope2 + scope3;
      });

    const regions = Array.from(regionMap.values())
      .sort((a, b) => b.total_emissions - a.total_emissions);

    return {
      success: true,
      year,
      regions
    };
  }
};