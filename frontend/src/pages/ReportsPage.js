import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import moment from 'moment'; // For date formatting
// Import Recharts components
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from 'recharts'; // <-- ADD THIS IMPORT
const ReportsPage = () => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [historyError, setHistoryError] = useState(''); // <-- ADD THIS LINE
  const [selectedPeriod, setSelectedPeriod] = useState('today');
  const [selectedReportType, setSelectedReportType] = useState('salesSummary');
  const [reportData, setReportData] = useState(null);
  const [dailyTrendData, setDailyTrendData] = useState([]); // To store data for charts
// For custom date range filters
  const [customStartDate, setCustomStartDate] = useState('');
  const [customEndDate, setCustomEndDate] = useState('');
  const fetchReportData = useCallback(async () => {
    setLoading(true);
    setError('');
    setReportData(null); // Clear previous data

    let endpoint = '';
    const params = {}; // <--- CHANGE THIS: Start with an empty params object

    // Add custom date range if selected and values are present
    if (customStartDate) params.start_date = customStartDate;
    if (customEndDate) params.end_date = customEndDate;

    // Only add 'period' param if no custom dates are specified
    // and the report type usually accepts a period (otherwise, default to backend's logic or 'today')
    if (!customStartDate && !customEndDate) {
        if (['salesSummary', 'profitSummary', 'productWiseSales'].includes(selectedReportType)) {
            params.period = selectedPeriod;
        }
    }
    // For specific reports like top customers, they don't use 'period'
    if (selectedReportType === 'topCustomers' || selectedReportType === 'frequentCustomers') {
        params.limit = 10; // Or allow user to set limit
    }


    switch (selectedReportType) {
      case 'salesSummary':
        endpoint = '/reports/sales/summary';
        break;
      case 'productWiseSales':
        endpoint = '/reports/sales/product-wise';
        break;
      case 'inventoryOverview':
        endpoint = '/reports/inventory/overview';
        // Inventory overview and low stock/near expiry typically don't use 'period' or date ranges for their primary purpose
        // If they did, backend would need to support it. For now, they mostly show current state.
        // We'll pass dates, but the backend might ignore them for these specific reports (which is fine).
        break;
      case 'lowStock':
        endpoint = '/reports/inventory/low-stock';
        break;
      case 'nearExpiry':
        endpoint = '/reports/inventory/near-expiry';
        break;
      case 'profitSummary':
        endpoint = '/reports/profit/summary';
        break;
      case 'topCustomers':
        endpoint = '/reports/customers/top';
        break;
      case 'frequentCustomers':
        endpoint = '/reports/customers/frequent';
        break;
      default:
        setError('Invalid report type selected.');
        setLoading(false);
        return;
    }

    try {
      // Reset daily trend data
      setDailyTrendData([]);

      const response = await api.get(endpoint, { params });
      if (response.data.success) {
        setReportData(response.data.data);

        // Fetch daily trend data if it's a sales/profit related summary
        if (selectedReportType === 'salesSummary' || selectedReportType === 'profitSummary') {
            // Ensure we have start_date and end_date for daily-trend endpoint
            // Reuse existing date/period filters
          
            
          let trendStartDate = customStartDate;
          let trendEndDate = customEndDate;

          if (!trendStartDate || !trendEndDate) {
            // Fallback to period-based dates if custom dates are not set
            const now = moment();
            switch (selectedPeriod) {
              case 'today':
                trendStartDate = now.format('YYYY-MM-DD');
                trendEndDate = now.format('YYYY-MM-DD');
                break;
              case 'week':
                trendStartDate = now.startOf('isoWeek').format('YYYY-MM-DD'); // ISO week starts Monday
                trendEndDate = now.endOf('isoWeek').format('YYYY-MM-DD');
                break;
              case 'month':
                trendStartDate = now.startOf('month').format('YYYY-MM-DD');
                trendEndDate = now.endOf('month').format('YYYY-MM-DD');
                break;
              case 'year':
                trendStartDate = now.startOf('year').format('YYYY-MM-DD');
                trendEndDate = now.endOf('year').format('YYYY-MM-DD');
                break;
              default:
                // Default to a week range if no specific period/dates are set (e.g., last 7 days)
                trendStartDate = moment().subtract(6, 'days').format('YYYY-MM-DD');
                trendEndDate = moment().format('YYYY-MM-DD');
                break;
            }
          }

          if (trendStartDate && trendEndDate) { // Only fetch if we have valid dates
            const trendResponse = await api.get('/reports/sales/daily-trend', {
              params: { start_date: trendStartDate, end_date: trendEndDate }
            });
            if (trendResponse.data.success) {
              setDailyTrendData(trendResponse.data.data);
            } else {
              console.warn('Failed to fetch daily trend data:', trendResponse.data.message);
              setHistoryError(trendResponse.data.message || 'Failed to load trend data.'); // Use historyError for specific chart error
            }
          }
        }
      } else {
        setError(response.data.message || 'Failed to fetch report data.');
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      setError(err.response?.data?.message || 'Error fetching report data.');
    } finally {
      setLoading(false);
    }
  }, [selectedReportType, selectedPeriod, customStartDate, customEndDate]); // <--- ADD customStartDate, customEndDate to dependencies

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);
// eslint-disable-next-line no-unused-vars
  const handleClearFilters = () => {
    setSelectedPeriod('today');
    setSelectedReportType('salesSummary'); // Also reset report type to default
    setCustomStartDate(''); // <--- ADD THIS
    setCustomEndDate('');   // <--- ADD THIS
  };
  const renderReportContent = () => {
    if (loading) {
      return (
        <div className="text-center py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
          Loading report...
        </div>
      );
    }

    if (error) {
      return (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      );
    }

    if (!reportData) {
      return <div className="text-center py-12 text-gray-500">No data available for this report.</div>;
    }

    // Helper to format currency
    const formatCurrency = (value) => `KES ${parseFloat(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

    switch (selectedReportType) {
     case 'salesSummary':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
              <ReportCard title="Total Transactions" value={reportData.total_transactions || 0} icon="📊" />
              <ReportCard title="Total Revenue" value={formatCurrency(reportData.total_revenue)} icon="💰" />
              <ReportCard title="Average Sale" value={formatCurrency(reportData.average_sale)} icon="📉" />
              <ReportCard title="Estimated Profit" value={formatCurrency(reportData.estimated_profit)} icon="📈" />
            </div>
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend</h3>
               {historyError && ( // <-- ADD THIS BLOCK for historyError
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                  <strong className="font-bold">Trend Data Error!</strong>
                  <span className="block sm:inline"> {historyError}</span>
                </div>
              )}
              {dailyTrendData.length === 0 ? (
                <div className="text-center py-6 text-gray-500">No trend data for this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart
                    data={dailyTrendData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Line type="monotone" dataKey="Sales" stroke="#8884d8" activeDot={{ r: 8 }} />
                  </LineChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        );
      case 'productWiseSales':
        return (
          <>
            <h3 className="text-lg font-semibold mb-4">Top Selling Products ({
                (customStartDate && customEndDate) 
                    ? `${moment(customStartDate).format('MMM DD')} - ${moment(customEndDate).format('MMM DD')}` 
                    : selectedPeriod.charAt(0).toUpperCase() + selectedPeriod.slice(1)
            })</h3>
            {historyError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> {historyError}</span>
                </div>
            )}
            {/* Check if reportData is an array and has length > 0 before rendering chart/table */}
            {(Array.isArray(reportData) && reportData.length > 0) ? ( // <--- MODIFIED CONDITIONAL CHECK
              <>
                {/* Bar Chart for Product-Wise Sales */}
                <div className="bg-white rounded-lg shadow p-6 mt-6 mb-6">
                  <h4 className="text-md font-semibold text-gray-800 mb-4">Revenue by Product</h4>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={reportData.map(item => ({ // <--- THIS LINE REMAINS, but its parent conditional ensures reportData is array
                        name: item.product_name,
                        Revenue: parseFloat(item.total_revenue_from_product)
                      }))}
                      margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" angle={-15} textAnchor="end" height={50} interval={0} style={{ fontSize: '0.7rem' }} />
                      <YAxis tickFormatter={(value) => formatCurrency(value)} />
                      <Tooltip formatter={(value) => formatCurrency(value)} />
                      <Legend />
                      <Bar dataKey="Revenue" fill="#8884d8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Tabular data for Product-Wise Sales */}
                <div className="bg-white rounded-lg shadow overflow-hidden mt-6">
                  <h4 className="text-md font-semibold text-gray-800 p-4 border-b">Detailed Sales Table</h4>
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity Sold</th>
                        <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Revenue</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {reportData.map((item) => ( // <--- THIS LINE REMAINS, but its parent conditional ensures reportData is array
                        <tr key={item.product_id}>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.product_name}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.total_quantity_sold}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(item.total_revenue_from_product)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            ) : ( // <--- ADDED ELSE BLOCK FOR NO DATA
              <p className="text-gray-500">No product sales data for this period.</p>
            )}
          </>
        );
      case 'inventoryOverview':
        return (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <ReportCard title="Total Products" value={reportData.total_products || 0} icon="📦" />
            <ReportCard title="Total Items in Stock" value={reportData.total_items || 0} icon="🔢" />
            <ReportCard title="Total Inventory Value (Cost)" value={formatCurrency(reportData.total_value)} icon="💲" />
            <ReportCard title="Low Stock Items" value={reportData.low_stock_count || 0} icon="⚠️" />
          </div>
        );
     case 'lowStock':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Low Stock Products</h3>
            {historyError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> {historyError}</span>
                </div>
            )}
            {(Array.isArray(reportData) && reportData.length > 0) ? ( // <--- UPDATED CONDITIONAL CHECK
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reorder Level</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Category</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.sku}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{item.quantity_in_stock}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.reorder_level}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.category_name || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : ( // <--- ADDED ELSE BLOCK FOR NO DATA
              <p className="text-gray-500">No products currently in low stock.</p>
            )}
          </div>
        );
      case 'nearExpiry':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Products Expiring in 30 Days</h3>
            {historyError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> {historyError}</span>
                </div>
            )}
            {(Array.isArray(reportData) && reportData.length > 0) ? ( // <--- UPDATED CONDITIONAL CHECK
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Stock</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Expiry Date</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.sku}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.quantity_in_stock}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-semibold">{moment(item.expiry_date).format('YYYY-MM-DD')}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.supplier_name || 'N/A'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : ( // <--- ADDED ELSE BLOCK FOR NO DATA
              <p className="text-gray-500">No products are near expiry.</p>
            )}
          </div>
        );
      case 'profitSummary':
        return (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
               <ReportCard title="Total Revenue" value={formatCurrency(reportData.total_revenue)} icon="💸" />
               <ReportCard title="Estimated Profit" value={formatCurrency(reportData.estimated_profit)} icon="📈" />
               <ReportCard title="Gross Margin" value={`${((reportData.estimated_profit / reportData.total_revenue) * 100).toFixed(2) || 0}%`} icon="💰" />
            </div>
            <div className="bg-white rounded-lg shadow p-6 mt-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Profit Trend</h3>
              {historyError && ( // <-- ADD THIS BLOCK for historyError
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                  <strong className="font-bold">Trend Data Error!</strong>
                  <span className="block sm:inline"> {historyError}</span>
                </div>
              )}
              {dailyTrendData.length === 0 ? (
                <div className="text-center py-6 text-gray-500">No trend data for this period.</div>
              ) : (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart
                    data={dailyTrendData}
                    margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis tickFormatter={(value) => formatCurrency(value)} />
                    <Tooltip formatter={(value) => formatCurrency(value)} />
                    <Legend />
                    <Bar dataKey="Profit" fill="#82ca9d" />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </>
        );
      case 'topCustomers':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Top 10 Customers by Total Purchases</h3>
            {historyError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> {historyError}</span>
                </div>
            )}
            {(Array.isArray(reportData) && reportData.length > 0) ? ( // <--- UPDATED CONDITIONAL CHECK
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Purchases</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.phone || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(item.total_purchases)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : ( // <--- ADDED ELSE BLOCK FOR NO DATA
              <p className="text-gray-500">No customer data available.</p>
            )}
          </div>
        );
      case 'frequentCustomers':
        return (
          <div>
            <h3 className="text-lg font-semibold mb-4">Top 10 Frequent Shoppers (by Transactions)</h3>
            {historyError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> {historyError}</span>
                </div>
            )}
            {(Array.isArray(reportData) && reportData.length > 0) ? ( // <--- UPDATED CONDITIONAL CHECK
              <div className="bg-white rounded-lg shadow overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Customer Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Phone</th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total Transactions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((item) => (
                      <tr key={item.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{item.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{item.phone || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{item.total_transactions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : ( // <--- ADDED ELSE BLOCK FOR NO DATA
              <p className="text-gray-500">No customer data available.</p>
            )}
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6">
      <div className="flex items-center gap-4 mb-6">
        <button
          onClick={() => navigate('/dashboard')}
          className="p-2 hover:bg-gray-100 rounded-lg"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
          </svg>
        </button>
        <div className="flex-1">
          <h1 className="text-2xl font-bold text-gray-900">Reports & Analytics</h1>
          <p className="text-gray-600">Gain insights into your business performance</p>
        </div>
      </div>

      <div className="flex flex-col md:flex-row gap-6 mb-6">
        {/* Report Type Selector */}
        <div className="bg-white rounded-lg shadow p-4 md:w-1/4">
          <h3 className="text-md font-semibold text-gray-800 mb-3">Select Report Type</h3>
          <div className="space-y-2">
            {[
              { id: 'salesSummary', name: 'Sales Summary' },
              { id: 'productWiseSales', name: 'Product-Wise Sales' },
              { id: 'profitSummary', name: 'Profit Summary' },
              { id: 'inventoryOverview', name: 'Inventory Overview' },
              { id: 'lowStock', name: 'Low Stock Items' },
              { id: 'nearExpiry', name: 'Near Expiry Products' },
              { id: 'topCustomers', name: 'Top Customers (Purchases)' },
              { id: 'frequentCustomers', name: 'Frequent Customers (Transactions)' },
            ].map(report => (
              <button
                key={report.id}
                onClick={() => setSelectedReportType(report.id)}
                className={`w-full text-left p-3 rounded-lg transition-colors ${
                  selectedReportType === report.id
                    ? 'bg-indigo-100 text-indigo-700 font-medium'
                    : 'hover:bg-gray-50 text-gray-700'
                }`}
              >
                {report.name}
              </button>
            ))}
          </div>
        </div>

        {/* Report Display Area */}
        <div className="flex-1 bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-center mb-4 pb-4 border-b border-gray-200">
            <h2 className="text-xl font-bold text-gray-900 capitalize">
              {selectedReportType.replace(/([A-Z])/g, ' $1').trim()}
            </h2>
            
       {/* Date Range & Period Selectors and Apply Button */}
            <div className="flex flex-wrap items-end gap-4"> {/* Use flex-wrap for better responsiveness */}
                {/* Custom Date Range */}
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">Start Date</label>
                    <input
                        type="date"
                        value={customStartDate}
                        onChange={(e) => setCustomStartDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg text-sm"
                    />
                </div>
                <div>
                    <label className="block text-xs font-medium text-gray-500 mb-1">End Date</label>
                    <input
                        type="date"
                        value={customEndDate}
                        onChange={(e) => setCustomEndDate(e.target.value)}
                        className="p-2 border border-gray-300 rounded-lg text-sm"
                    />
                </div>

                {/* Period Selector (only if no custom dates are set and report supports it) */}
                {!customStartDate && !customEndDate && (selectedReportType === 'salesSummary' || selectedReportType === 'profitSummary' || selectedReportType === 'productWiseSales') && (
                    <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Period</label>
                        <select
                            value={selectedPeriod}
                            onChange={(e) => setSelectedPeriod(e.target.value)}
                            className="p-2 border border-gray-300 rounded-lg text-sm"
                        >
                            <option value="today">Today</option>
                            <option value="week">This Week</option>
                            <option value="month">This Month</option>
                            <option value="year">This Year</option>
                        </select>
                    </div>
                )}
                
                {/* Apply and Clear buttons - now always visible */}
                <div className="flex gap-2">
                    <button
                        onClick={handleClearFilters}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-sm"
                    >
                        Clear
                    </button>
                    <button
                        onClick={fetchReportData}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 text-sm"
                    >
                        Apply
                    </button>
                </div>
            </div>
          </div>
          
          {renderReportContent()}
        </div>
      </div>
    </div>
  );
};

// Simple card component for summary reports
const ReportCard = ({ title, value, icon }) => (
  <div className="bg-indigo-50 rounded-lg p-5 flex items-center justify-between">
    <div>
      <h3 className="text-sm font-medium text-indigo-700">{title}</h3>
      <p className="text-2xl font-bold text-indigo-900 mt-1">{value}</p>
    </div>
    <div className="text-4xl text-indigo-500">{icon}</div>
  </div>
);


export default ReportsPage;