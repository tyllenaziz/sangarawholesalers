import React, { useState, useEffect, useCallback } from 'react'; // ADD useEffect and useCallback
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import api from '../services/api'; // ADD this line
import moment from 'moment'; // ADD this line (make sure you've run 'npm install moment' in frontend)
// Import Recharts components
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar
} from 'recharts';
const DashboardPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  // State for dashboard data
  const [todaySalesSummary, setTodaySalesSummary] = useState(null);
  const [inventoryOverview, setInventoryOverview] = useState(null);
  const [lowStockProducts, setLowStockProducts] = useState([]);
  const [nearExpiryProducts, setNearExpiryProducts] = useState([]); // <-- ADD THIS LINE
  const [totalCustomers, setTotalCustomers] = useState(null);
  const [recentSales, setRecentSales] = useState([]);
  const [showAlertsModal, setShowAlertsModal] = useState(false); // <-- ADD THIS LINE
  const [loadingDashboard, setLoadingDashboard] = useState(true);
  const [error, setError] = useState('');
// State for chart data
  const [salesTrendData, setSalesTrendData] = useState([]); // For a sales trend chart
  const [profitTrendData, setProfitTrendData] = useState([]); // For a profit trend chart
  const formatCurrency = (value) => `KES ${parseFloat(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchDashboardData = useCallback(async () => {
    setLoadingDashboard(true);
    setError('');
    try {
      // Fetch Today's Sales Summary
      const salesSummaryRes = await api.get('/reports/sales/summary', { params: { period: 'today' } });
      if (salesSummaryRes.data.success) {
        setTodaySalesSummary(salesSummaryRes.data.data);
      }

      // Fetch Inventory Overview
      const inventoryOverviewRes = await api.get('/reports/inventory/overview');
      if (inventoryOverviewRes.data.success) {
        setInventoryOverview(inventoryOverviewRes.data.data);
      }

      // Fetch Low Stock Products
      const lowStockRes = await api.get('/products/low-stock');
      if (lowStockRes.data.success) {
        setLowStockProducts(lowStockRes.data.data);
      }
const nearExpiryRes = await api.get('/reports/inventory/near-expiry'); // <-- ADD THIS LINE
      if (nearExpiryRes.data.success) {
        setNearExpiryProducts(nearExpiryRes.data.data);
      }
      // Fetch Total Customers
      const totalCustomersRes = await api.get('/reports/customers/total');
      if (totalCustomersRes.data.success) {
        setTotalCustomers(totalCustomersRes.data.data);
      }

      // Fetch Recent Sales (last 5)
      // Backend getAllSales supports 'limit' implicitly by only returning 100,
      // so we explicitly slice here to ensure only the top 5 are displayed.
      const recentSalesRes = await api.get('/sales'); 
      if (recentSalesRes.data.success) {
        setRecentSales(recentSalesRes.data.data.slice(0,5));
      }
// --- Fetch Chart Data (last 7 days for trends) ---
      const sevenDaysAgo = moment().subtract(6, 'days').format('YYYY-MM-DD');
      const today = moment().format('YYYY-MM-DD');

      const salesTrendRes = await api.get('/reports/sales/daily-trend', {
        params: { start_date: sevenDaysAgo, end_date: today }
      });
      if (salesTrendRes.data.success) {
          setSalesTrendData(salesTrendRes.data.data.map(item => ({
              name: item.name,
              Sales: item.Sales,
              Profit: item.Profit
          })));
          setProfitTrendData(salesTrendRes.data.data.map(item => ({ // Profit trend data uses the same structure
              name: item.name,
              Profit: item.Profit, // Ensure correct dataKey matches BarChart's dataKey
          })));
      }
    } catch (err) {
      console.error('Failed to fetch dashboard data:', err);
      setError(err.response?.data?.message || 'Failed to load dashboard data.');
    } finally {
      setLoadingDashboard(false);
    }
  }, []); // Empty dependency array as we want it to run once on mount

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="flex h-screen bg-gray-100">
      <aside
        className={`${
          sidebarOpen ? 'w-64' : 'w-20'
        } bg-indigo-900 text-white transition-all duration-300 flex flex-col`}
      >
        <div className="p-4 flex items-center justify-between border-b border-indigo-800">
          {sidebarOpen && (
            <div className="flex items-center gap-2">
              <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span className="font-bold text-lg">Sangara</span>
            </div>
          )}
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="p-2 hover:bg-indigo-800 rounded-lg"
          >
            {sidebarOpen ? '✕' : '☰'}
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
          <button className="w-full flex items-center gap-3 p-3 bg-indigo-800 rounded-lg">
            <span>📊</span>
            {sidebarOpen && <span>Dashboard</span>}
          </button>
          <button
  onClick={() => navigate('/pos')}
  className="w-full flex items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition-colors"
>
  <span>🛒</span>
  {sidebarOpen && <span>Point of Sale</span>}
</button>
          <button
  onClick={() => navigate('/products')}
  className="w-full flex items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition-colors"
>
  <span>📦</span>
  {sidebarOpen && <span>Products</span>}
</button>
<button
            onClick={() => navigate('/stock-adjustments')}
            className="w-full flex items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition-colors"
          >
            <span>📊</span> {/* Icon for stock/inventory */}
            {sidebarOpen && <span>Stock Adjustments</span>}
          </button>
<button
  onClick={() => navigate('/categories')}
  className="w-full flex items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition-colors"
>
  <span>🏷️</span>
  {sidebarOpen && <span>Categories</span>}
</button>
<button
  onClick={() => navigate('/suppliers')}
  className="w-full flex items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition-colors"
>
  <span>🚚</span>
  {sidebarOpen && <span>Suppliers</span>}
</button>
<button
            onClick={() => navigate('/purchase-orders')}
            className="w-full flex items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition-colors"
          >
            <span>📄</span> {/* PO icon */}
            {sidebarOpen && <span>Purchase Orders</span>}
          </button>
          <button
            onClick={() => navigate('/customers')}
            className="w-full flex items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition-colors"
          >
            <span>👥</span>
            {sidebarOpen && <span>Customers</span>}
          </button>
          <button
            onClick={() => navigate('/sales-history')}
            className="w-full flex items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition-colors"
          >
            <span>📜</span> {/* You can choose a different emoji/icon if preferred */}
            {sidebarOpen && <span>Sales & Transactions</span>}
          </button>
          <button
            onClick={() => navigate('/reports')} // <-- ADD THIS NAVIGATION LINK
            className="w-full flex items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition-colors"
          >
            <span>📈</span>
            {sidebarOpen && <span>Reports</span>}
          </button>
          <button
            onClick={() => navigate('/users')}
            className="w-full flex items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition-colors"
          >
            <span>🛠️</span> {/* Choose a suitable icon */}
            {sidebarOpen && <span>User Management</span>}
          </button>
          {user?.role === 'admin' && ( // Only show Activity Logs to admins
            <button
              onClick={() => navigate('/activity-logs')}
              className="w-full flex items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition-colors"
            >
              <span>📝</span> {/* Log icon */}
              {sidebarOpen && <span>Activity Logs</span>}
            </button>
          )}
          {user?.role === 'admin' && ( // Only show settings to admins
            <button
              onClick={() => navigate('/settings')}
              className="w-full flex items-center gap-3 p-3 hover:bg-indigo-800 rounded-lg transition-colors"
            >
              <span>⚙️</span> {/* Settings icon */}
              {sidebarOpen && <span>Settings</span>}
            </button>
          )}
        </nav>

        <div className="p-4 border-t border-indigo-800">
          <div className="flex items-center gap-3 mb-3">
            <div className="w-10 h-10 bg-indigo-700 rounded-full flex items-center justify-center flex-shrink-0">
              <span>👤</span>
            </div>
            {sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium truncate">{user?.full_name}</p>
                <p className="text-xs text-indigo-300 truncate">{user?.role}</p>
              </div>
            )}
          </div>
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-2 p-2 hover:bg-indigo-800 rounded-lg transition-colors text-sm"
          >
            <span>🚪</span>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      <div className="flex-1 flex flex-col overflow-hidden">
        <header className="bg-white shadow-sm border-b border-gray-200 p-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
              <p className="text-sm text-gray-500">Welcome back, {user?.full_name}!</p>
            </div>
            <button className="relative p-2 hover:bg-gray-100 rounded-lg">
              <span className="text-2xl">🔔</span>
              {(lowStockProducts.length > 0 || nearExpiryProducts.length > 0) && ( // <-- UPDATED CONDITION
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full"></span>
              )}
            </button>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto p-6">
          {loadingDashboard ? (
            <div className="text-center py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
              Loading dashboard data...
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          ) : (
            <>
            {/* Quick Actions */}
              <div className="bg-white rounded-lg shadow p-6 mb-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Quick Actions</h2>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <button
                    onClick={() => navigate('/pos')}
                    className="flex flex-col items-center p-4 rounded-lg bg-indigo-50 hover:bg-indigo-100 text-indigo-800"
                  >
                    <span className="text-3xl mb-2">🛒</span>
                    <span className="text-sm font-medium">New Sale</span>
                  </button>
                  <button
                    onClick={() => navigate('/products')} // Or open a modal to add product
                    className="flex flex-col items-center p-4 rounded-lg bg-green-50 hover:bg-green-100 text-green-800"
                  >
                    <span className="text-3xl mb-2">📦</span>
                    <span className="text-sm font-medium">Add Product</span>
                  </button>
                  <button
                    onClick={() => navigate('/purchase-orders')} // Or open a modal to create PO
                    className="flex flex-col items-center p-4 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-800"
                  >
                    <span className="text-3xl mb-2">📄</span>
                    <span className="text-sm font-medium">Create PO</span>
                  </button>
                  <button
                    onClick={() => setShowAlertsModal(true)} // Open alerts modal
                    className="flex flex-col items-center p-4 rounded-lg bg-red-50 hover:bg-red-100 text-red-800 relative"
                  >
                    <span className="text-3xl mb-2">🚨</span>
                    <span className="text-sm font-medium">View Alerts</span>
                    {(lowStockProducts.length + nearExpiryProducts.length) > 0 && (
                      <span className="absolute top-1 right-1 px-2 py-0.5 bg-red-600 text-white text-xs font-bold rounded-full">
                        {lowStockProducts.length + nearExpiryProducts.length}
                      </span>
                    )}
                  </button>
                </div>
              </div>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl mb-4">💰</div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Today's Sales</h3>
                  <p className="text-2xl font-bold text-gray-900">{formatCurrency(todaySalesSummary?.total_revenue)}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {todaySalesSummary?.total_transactions || 0} transactions
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl mb-4">📦</div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Total Products</h3>
                  <p className="text-2xl font-bold text-gray-900">{inventoryOverview?.total_products || 0}</p>
                  <p className="text-sm text-gray-500 mt-1">
                    {inventoryOverview?.total_items || 0} items in stock
                  </p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl mb-4">⚠️</div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Low Stock Items</h3>
                  <p className="text-2xl font-bold text-gray-900">{lowStockProducts.length}</p>
                  <p className="text-sm text-gray-500 mt-1">Action needed for these products</p>
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <div className="text-3xl mb-4">👥</div>
                  <h3 className="text-sm font-medium text-gray-600 mb-1">Total Customers</h3>
                  <p className="text-2xl font-bold text-gray-900">{totalCustomers?.total_customers || 0}</p>
                  <p className="text-sm text-gray-500 mt-1">Registered in the system</p>
                </div>
              </div>
{/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Sales Trend (Last 7 Days)</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart
                      data={salesTrendData}
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
                </div>
                <div className="bg-white rounded-lg shadow p-6">
                  <h2 className="text-lg font-semibold text-gray-900 mb-4">Profit Trend (Last 7 Days)</h2>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart
                      data={profitTrendData}
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
                </div>
              </div>
             {/* Recent Sales */}
              <div className="bg-white rounded-lg shadow p-6">
                <h2 className="text-lg font-semibold text-gray-900 mb-4">Recent Sales</h2>
                <div className="space-y-3">
                  {recentSales.length === 0 ? (
                    <div className="text-center py-6 text-gray-500">No recent sales.</div>
                  ) : (
                    recentSales.map((sale) => (
                      <div key={sale.id} className="flex items-center justify-between p-3 hover:bg-gray-50 rounded-lg">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center">
                            <span>🛒</span>
                          </div>
                          <div>
                            <p className="font-medium text-gray-900">Invoice #{sale.invoice_number}</p>
                            <p className="text-sm text-gray-500">{sale.customer_name || 'Walk-in Customer'}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(sale.total)}</p>
                          <p className="text-xs text-gray-500">{moment(sale.created_at).fromNow()}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
                <div className="mt-4 text-center">
                   {/* This route will be implemented for the Sales/Transactions page */}
                   <button
                     onClick={() => navigate('/sales-history')}
                     className="text-indigo-600 hover:text-indigo-700 font-medium"
                   >
                     View All Sales
                   </button>
                 </div>
              </div>
            </>
          )}
        </main>
      </div> {/* This closes the "flex-1 flex flex-col overflow-hidden" div */}

      {/* Alerts Modal - Now correctly placed outside the main tag, but within the DashboardPage component */}
      {showAlertsModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="p-6 flex-1">
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Active Alerts</h2>

              {lowStockProducts.length === 0 && nearExpiryProducts.length === 0 && (
                <div className="text-center py-12 text-gray-500">
                  <p>🎉 No active alerts! Your inventory looks good.</p>
                </div>
              )}

              {lowStockProducts.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-red-700 mb-3">⚠️ Low Stock Items ({lowStockProducts.length})</h3>
                  <div className="bg-red-50 p-4 rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-red-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-red-700 uppercase">Product</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-red-700 uppercase">Stock</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-red-700 uppercase">Reorder Level</th>
                        </tr>
                      </thead>
                      <tbody>
                        {lowStockProducts.map(p => (
                          <tr key={p.id} className="border-b border-red-100 last:border-b-0">
                            <td className="px-4 py-2 text-sm font-medium text-red-900">{p.name} ({p.sku})</td>
                            <td className="px-4 py-2 text-sm text-red-800 text-right">{p.quantity_in_stock}</td>
                            <td className="px-4 py-2 text-sm text-red-800 text-right">{p.reorder_level}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {nearExpiryProducts.length > 0 && (
                <div className="mb-6">
                  <h3 className="text-lg font-semibold text-yellow-700 mb-3">🗓️ Near Expiry Items ({nearExpiryProducts.length})</h3>
                  <div className="bg-yellow-50 p-4 rounded-lg overflow-x-auto">
                    <table className="min-w-full divide-y divide-yellow-200">
                      <thead>
                        <tr>
                          <th className="px-4 py-2 text-left text-xs font-medium text-yellow-700 uppercase">Product</th>
                          <th className="px-4 py-2 text-right text-xs font-medium text-yellow-700 uppercase">Stock</th>
                          <th className="px-4 py-2 text-left text-xs font-medium text-yellow-700 uppercase">Expiry Date</th>
                        </tr>
                      </thead>
                      <tbody>
                        {nearExpiryProducts.map(p => (
                          <tr key={p.id} className="border-b border-yellow-100 last:border-b-0">
                            <td className="px-4 py-2 text-sm font-medium text-yellow-900">{p.name} ({p.sku})</td>
                            <td className="px-4 py-2 text-sm text-yellow-800 text-right">{p.quantity_in_stock}</td>
                            <td className="px-4 py-2 text-sm text-yellow-800">{moment(p.expiry_date).format('YYYY-MM-DD')}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

            </div>
            {/* Modal Actions */}
            <div className="p-4 border-t flex justify-end">
              <button
                onClick={() => setShowAlertsModal(false)}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div> // This closes the entire DashboardPage component's root div
  );
};

export default DashboardPage;