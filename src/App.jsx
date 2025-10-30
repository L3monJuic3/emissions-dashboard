import { useState } from 'react';
import CorporateView from './CorporateView';
import InvestorView from './InvestorView';


function App() {
  const [activeView, setActiveView] = useState('corporate'); // 'corporate' or 'investor'
  console.log(activeView);
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header with View Toggle */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-semibold text-gray-900">Emissions Dashboard</h1>
              <p className="text-sm text-gray-600 mt-1">
                {activeView === 'corporate'
                  ? 'Corporate Sustainability Overview'
                  : 'Market Intelligence & Analytics'}
              </p>
            </div>

            {/* View Toggle */}
            <div className="flex items-center bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setActiveView('corporate')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  activeView === 'corporate'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                🏢 Corporate
              </button>
              <button
                onClick={() => setActiveView('investor')}
                className={`px-4 py-2 rounded-md font-medium transition-all ${
                  activeView === 'investor'
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                📊 Investor
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Render Active View */}
      {activeView === 'corporate' ? <CorporateView /> : <InvestorView />}
    </div>
  );
}

export default App;