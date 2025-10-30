import { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import {
  fetchAllCompanies,
  fetchCompanyData,
  fetchPeerCompanies,
  calculateNetZeroPath,
  formatEmissionsForChart,
  calculateReduction,
  calculateYoYChange
} from './data';

function CorporateView() {
  const [companies, setCompanies] = useState([]);
  const [selectedCompanyName, setSelectedCompanyName] = useState('Climate Corp');
  const [companyData, setCompanyData] = useState(null);
  const [emissionsData, setEmissionsData] = useState([]);
  const [peerCompanies, setPeerCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Load list of companies on mount
  useEffect(() => {
    async function loadCompanies() {
      try {
        const allCompanies = await fetchAllCompanies();
        setCompanies(allCompanies);
      } catch (err) {
        console.error('Failed to load companies:', err);
      }
    }
    loadCompanies();
  }, []);

  // Load selected company data
  useEffect(() => {
    async function loadData() {
      if (!selectedCompanyName) return;

      setLoading(true);
      setError(null);

      try {
        const data = await fetchCompanyData(selectedCompanyName);
        setCompanyData(data.company);
        setEmissionsData(data.emissions);

        const latestYear = data.emissions[data.emissions.length - 1]?.year;
        if (latestYear) {
          const peers = await fetchPeerCompanies(selectedCompanyName, 4, latestYear);
          setPeerCompanies(peers);
        }

        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        console.error('Error loading data:', err);
      }
    }

    loadData();
  }, [selectedCompanyName]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading emissions data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center bg-white p-8 rounded-lg shadow max-w-md">
          <div className="text-red-600 text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Error Loading Data</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!companyData || !emissionsData.length) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">No data available</p>
        </div>
      </div>
    );
  }

  const currentEmissions = emissionsData[emissionsData.length - 1]?.total || 0;
  const baselineEmissions = emissionsData.find(e => e.year == companyData.baseline_year)?.total || emissionsData[0]?.total || 0;
  const reduction = calculateReduction(baselineEmissions, currentEmissions);

  const netZeroPath = calculateNetZeroPath(
    companyData.baseline_year,
    baselineEmissions,
    companyData.net_zero_year
  );

  const combinedData = formatEmissionsForChart(emissionsData, netZeroPath);

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Company Selector */}
      {companies.length > 0 && (
        <div className="bg-white rounded-lg shadow p-4 mb-6">
          <div className="flex items-center gap-4">
            <label htmlFor="company-select" className="text-sm font-medium text-gray-700">
              Select Company:
            </label>
            <select
              id="company-select"
              value={selectedCompanyName}
              onChange={(e) => setSelectedCompanyName(e.target.value)}
              className="flex-1 border border-gray-300 rounded-md px-4 py-2 focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              {companies.map((company) => (
                <option key={company.id} value={company.name}>
                  {company.name} ({company.sector})
                </option>
              ))}
            </select>
          </div>
        </div>
      )}

      {/* Company Info Card */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h2 className="text-xl font-semibold text-gray-900 mb-4">{companyData.name}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-gray-600">Sector</p>
            <p className="text-lg font-medium text-gray-900">{companyData.sector}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Region</p>
            <p className="text-lg font-medium text-gray-900">{companyData.region}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Net Zero Target</p>
            <p className="text-lg font-medium text-gray-900">{companyData.net_zero_year}</p>
          </div>
          <div>
            <p className="text-sm text-gray-600">Reduction Since {companyData.baseline_year}</p>
            <p className="text-lg font-medium text-green-600">{reduction}%</p>
          </div>
        </div>
      </div>

      {/* Emissions Trend Chart */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Emissions Trend vs Net Zero Target</h3>
        <ResponsiveContainer width="100%" height={350}>
          <LineChart data={combinedData}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="year" />
            <YAxis label={{ value: 'tCO2e', angle: -90, position: 'insideLeft' }} />
            <Tooltip />
            <Legend />
            <Line type="monotone" dataKey="scope_1" stroke="#ef4444" name="Scope 1" strokeWidth={2} />
            <Line type="monotone" dataKey="scope_2" stroke="#f59e0b" name="Scope 2" strokeWidth={2} />
            <Line type="monotone" dataKey="scope_3" stroke="#6366f1" name="Scope 3" strokeWidth={2} />
            <Line type="monotone" dataKey="total" stroke="#10b981" name="Total Emissions" strokeWidth={3} />
            <Line type="monotone" dataKey="target" stroke="#9ca3af" strokeDasharray="5 5" name="Net Zero Target" strokeWidth={2} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Emissions Table */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Emissions Data (tCO2e)</h3>
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Year</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope 1</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope 2</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Scope 3</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">YoY Change</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {emissionsData.map((data, index) => {
                const prevTotal = index > 0 ? emissionsData[index - 1].total : null;
                const change = calculateYoYChange(data.total, prevTotal);

                return (
                  <tr key={data.year}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.year}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{data.scope_1?.toLocaleString() || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{data.scope_2?.toLocaleString() || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">{data.scope_3?.toLocaleString() || '-'}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{data.total?.toLocaleString()}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {change ? (
                        <span className={parseFloat(change) < 0 ? 'text-green-600' : 'text-red-600'}>
                          {parseFloat(change) > 0 ? '+' : ''}{change}%
                        </span>
                      ) : (
                        <span className="text-gray-400">-</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Peer Comparison */}
      {peerCompanies.length > 0 && (
        <div className="bg-white rounded-lg shadow p-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">
            Peer Comparison ({emissionsData[emissionsData.length - 1]?.year} Total Emissions)
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={peerCompanies}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" angle={-15} textAnchor="end" height={80} />
              <YAxis label={{ value: 'tCO2e', angle: -90, position: 'insideLeft' }} />
              <Tooltip />
              <Bar
                dataKey="total_emissions"
                fill="#3b82f6"
                name="Total Emissions"
              >
                {peerCompanies.map((entry, index) => (
                  <Bar
                    key={`bar-${index}`}
                    fill={entry.is_current_company ? '#10b981' : '#3b82f6'}
                  />
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p className="text-xs text-gray-500 mt-2">
            <span className="inline-block w-3 h-3 bg-green-500 mr-1"></span>
            Your company
            <span className="inline-block w-3 h-3 bg-blue-500 ml-3 mr-1"></span>
            Peer companies
          </p>
        </div>
      )}
    </main>
  );
}

export default CorporateView;