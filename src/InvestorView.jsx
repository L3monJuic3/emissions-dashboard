import { useState, useEffect } from 'react';
import { BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { fetchSectors, fetchRegions } from './data';

const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4', '#84cc16'];

function InvestorView() {
  const [sectors, setSectors] = useState([]);
  const [regions, setRegions] = useState([]);
  const [selectedYear, setSelectedYear] = useState(2022);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('sectors');

  const availableYears = [2018, 2019, 2020, 2021, 2022];

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setError(null);

      try {
        const [sectorsData, regionsData] = await Promise.all([
          fetchSectors(selectedYear),
          fetchRegions(selectedYear)
        ]);

        setSectors(sectorsData);
        setRegions(regionsData);
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
        console.error('Error loading investor data:', err);
      }
    }

    loadData();
  }, [selectedYear]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading market data...</p>
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
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  const totalEmissions = sectors.reduce((sum, s) => sum + s.total_emissions, 0);
  const totalCompanies = sectors.reduce((sum, s) => sum + s.company_count, 0);

  const scopeBreakdown = [
    {
      name: 'Scope 1',
      value: sectors.reduce((sum, s) => sum + s.total_scope_1, 0),
      percentage: ((sectors.reduce((sum, s) => sum + s.total_scope_1, 0) / totalEmissions) * 100).toFixed(1)
    },
    {
      name: 'Scope 2',
      value: sectors.reduce((sum, s) => sum + s.total_scope_2, 0),
      percentage: ((sectors.reduce((sum, s) => sum + s.total_scope_2, 0) / totalEmissions) * 100).toFixed(1)
    },
    {
      name: 'Scope 3',
      value: sectors.reduce((sum, s) => sum + s.total_scope_3, 0),
      percentage: ((sectors.reduce((sum, s) => sum + s.total_scope_3, 0) / totalEmissions) * 100).toFixed(1)
    }
  ];

  return (
    <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Total Emissions</p>
          <p className="text-2xl font-bold text-gray-900">{totalEmissions.toLocaleString()}</p>
          <p className="text-xs text-gray-500 mt-1">tCO2e in {selectedYear}</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Companies Tracked</p>
          <p className="text-2xl font-bold text-gray-900">{totalCompanies}</p>
          <p className="text-xs text-gray-500 mt-1">Across all sectors</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Sectors</p>
          <p className="text-2xl font-bold text-gray-900">{sectors.length}</p>
          <p className="text-xs text-gray-500 mt-1">Industry categories</p>
        </div>

        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-sm text-gray-600 mb-1">Regions</p>
          <p className="text-2xl font-bold text-gray-900">{regions.length}</p>
          <p className="text-xs text-gray-500 mt-1">Geographic areas</p>
        </div>
      </div>

      {/* Year Selector */}
      <div className="bg-white rounded-lg shadow p-4 mb-6">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">Select Year</h3>
          <div className="flex gap-2">
            {availableYears.map(year => (
              <button
                key={year}
                onClick={() => setSelectedYear(year)}
                className={`px-4 py-2 rounded-md font-medium transition-colors ${
                  selectedYear === year
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                {year}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Emissions Type Breakdown */}
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4">Global Emissions Breakdown by Scope</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={scopeBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percentage }) => `${name}: ${percentage}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {scopeBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip formatter={(value) => value.toLocaleString() + ' tCO2e'} />
            </PieChart>
          </ResponsiveContainer>

          <div className="flex flex-col justify-center">
            {scopeBreakdown.map((scope, index) => (
              <div key={scope.name} className="flex items-center justify-between py-3 border-b last:border-b-0">
                <div className="flex items-center">
                  <div
                    className="w-4 h-4 rounded mr-3"
                    style={{ backgroundColor: COLORS[index % COLORS.length] }}
                  ></div>
                  <span className="font-medium text-gray-900">{scope.name}</span>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-gray-900">{scope.value.toLocaleString()} tCO2e</p>
                  <p className="text-sm text-gray-500">{scope.percentage}%</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="bg-white rounded-lg shadow mb-6">
        <div className="border-b border-gray-200">
          <nav className="flex -mb-px">
            <button
              onClick={() => setActiveTab('sectors')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'sectors'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              By Sector
            </button>
            <button
              onClick={() => setActiveTab('regions')}
              className={`px-6 py-4 text-sm font-medium border-b-2 transition-colors ${
                activeTab === 'regions'
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              By Region
            </button>
          </nav>
        </div>

        <div className="p-6">
          {activeTab === 'sectors' ? (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Emissions by Sector ({selectedYear})</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={sectors} layout="vertical" margin={{ left: 100 }}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" label={{ value: 'Total Emissions (tCO2e)', position: 'insideBottom', offset: -5 }} />
                    <YAxis type="category" dataKey="sector" />
                    <Tooltip formatter={(value) => value.toLocaleString() + ' tCO2e'} />
                    <Legend />
                    <Bar dataKey="total_emissions" fill="#3b82f6" name="Total Emissions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sector</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Companies</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Scope 1</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Scope 2</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Scope 3</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sectors.map((sector) => (
                      <tr key={sector.sector} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{sector.sector}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{sector.company_count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{sector.total_scope_1.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{sector.total_scope_2.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{sector.total_scope_3.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{sector.total_emissions.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                          {((sector.total_emissions / totalEmissions) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          ) : (
            <>
              <div className="mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Total Emissions by Region ({selectedYear})</h3>
                <ResponsiveContainer width="100%" height={400}>
                  <BarChart data={regions}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="region" angle={-15} textAnchor="end" height={100} />
                    <YAxis label={{ value: 'Total Emissions (tCO2e)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip formatter={(value) => value.toLocaleString() + ' tCO2e'} />
                    <Legend />
                    <Bar dataKey="total_emissions" fill="#10b981" name="Total Emissions" />
                  </BarChart>
                </ResponsiveContainer>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Region</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Companies</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Scope 1</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Scope 2</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Scope 3</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">% of Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {regions.map((region) => (
                      <tr key={region.region} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{region.region}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{region.company_count}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{region.total_scope_1.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{region.total_scope_2.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">{region.total_scope_3.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 text-right">{region.total_emissions.toLocaleString()}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 text-right">
                          {((region.total_emissions / totalEmissions) * 100).toFixed(1)}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </div>
    </main>
  );
}

export default InvestorView;