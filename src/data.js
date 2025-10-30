// Data API wrapper - works with mock API locally, can switch to real API later
import { mockApi } from './api/mockApi';

// Toggle this to switch between mock and real API
const USE_MOCK_API = false;
const API_URL = import.meta.env.VITE_API_URL || '/api';
console.log(API_URL)
// Fetch all companies
export async function fetchAllCompanies() {
  if (USE_MOCK_API) {
    return mockApi.getCompanies();
  }

  const response = await fetch(`${API_URL}/companies`);
  if (!response.ok) throw new Error('Failed to fetch companies');
  const data = await response.json();
  return data.companies;
}

// Fetch company data with emissions
export async function fetchCompanyData(companyName) {
  if (USE_MOCK_API) {
    return mockApi.getCompanyData(companyName);
  }

  const response = await fetch(`${API_URL}/companies/${encodeURIComponent(companyName)}`);
  if (!response.ok) throw new Error('Failed to fetch company data');
  return response.json();
}

// Fetch peer companies for comparison
export async function fetchPeerCompanies(companyName, limit = 4, year = new Date().getFullYear()) {
  if (USE_MOCK_API) {
    const data = await mockApi.getPeerCompanies(companyName, limit, year);
    return data.companies || [];
  }

  const response = await fetch(
    `${API_URL}/companies/${encodeURIComponent(companyName)}/peers?limit=${limit}&year=${year}`
  );
  if (!response.ok) throw new Error('Failed to fetch peer companies');
  const data = await response.json();
  return data.companies || [];
}

// Fetch sector aggregations
export async function fetchSectors(year = new Date().getFullYear()) {
  if (USE_MOCK_API) {
    const data = await mockApi.getSectors(year);
    return data.sectors;
  }

  const response = await fetch(`${API_URL}/sectors?year=${year}`);
  if (!response.ok) throw new Error('Failed to fetch sectors');
  const data = await response.json();
  return data.sectors;
}

// Fetch region aggregations
export async function fetchRegions(year = new Date().getFullYear()) {
  if (USE_MOCK_API) {
    const data = await mockApi.getRegions(year);
    return data.regions;
  }

  const response = await fetch(`${API_URL}/regions?year=${year}`);
  if (!response.ok) throw new Error('Failed to fetch regions');
  const data = await response.json();
  return data.regions;
}

// Calculate net zero trajectory (client-side calculation)
export function calculateNetZeroPath(baselineYear, baselineEmissions, targetYear) {
  const yearlyReduction = baselineEmissions / (targetYear - baselineYear);
  const trajectory = [];

  for (let year = baselineYear; year <= targetYear; year++) {
    trajectory.push({
      year,
      target: Math.max(0, baselineEmissions - (yearlyReduction * (year - baselineYear)))
    });
  }

  return trajectory;
}

// Format emissions data for charts (helper function)
export function formatEmissionsForChart(emissions, netZeroPath) {
  return emissions.map(emission => {
    const targetData = netZeroPath.find(target => target.year === emission.year);
    return {
      ...emission,
      target: targetData ? targetData.target : null
    };
  });
}

// Calculate year-over-year change
export function calculateYoYChange(current, previous) {
  if (!previous) return null;
  return (((current - previous) / previous) * 100).toFixed(1);
}

// Calculate reduction percentage from baseline
export function calculateReduction(baseline, current) {
  if (!baseline) return 0;
  return (((baseline - current) / baseline) * 100).toFixed(1);
}