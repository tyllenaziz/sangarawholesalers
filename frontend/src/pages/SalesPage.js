import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import moment from 'moment'; // For date formatting
import SaleDetailModal from '../components/SaleDetailModal'; // <-- ADD THIS IMPORT
const SalesPage = () => {
  const navigate = useNavigate();
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
const [showSaleDetailModal, setShowSaleDetailModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState(null);
  // Filter states
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('');
  const [cashiers, setCashiers] = useState([]); // To populate cashier filter dropdown
  const [selectedCashier, setSelectedCashier] = useState('');

  const formatCurrency = (value) => `KES ${parseFloat(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchSales = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        payment_method: paymentMethod || undefined,
        user_id: selectedCashier || undefined,
      };
      const response = await api.get('/sales', { params });
      if (response.data.success) {
        setSales(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch sales.');
      }
    } catch (err) {
      console.error('Failed to fetch sales:', err);
      setError(err.response?.data?.message || 'Failed to load sales history.');
    } finally {
      setLoading(false);
    }
  }, [startDate, endDate, paymentMethod, selectedCashier]);

  const fetchCashiers = useCallback(async () => {
    try {
      // Assuming a /users endpoint will eventually be created for user management
      // For now, let's mock or use a temporary approach if no /users route exists.
      // If no /users route exists, you would need to add one to your backend,
      // or filter distinct users from sales if that's acceptable for this report.
      // For this example, let's simulate fetching users for the dropdown.
      // In a real scenario, you'd add a userController.getUsers or similar.
      const response = await api.get('/users/cashiers'); // This endpoint needs to be created or mocked
      if (response.data.success) {
         setCashiers(response.data.data);
      }
      // For now, let's just use dummy data if the API call fails or the endpoint isn't ready
    } catch (error) {
      console.warn('Could not fetch cashiers for filter. Using dummy data.', error);
      setCashiers([
        { id: 1, full_name: 'Admin User' }, // Example for the default admin user
        { id: 2, full_name: 'Jane Doe' },
        { id: 3, full_name: 'John Smith' },
      ]);
    }
  }, []);

  useEffect(() => {
    fetchSales();
    fetchCashiers();
  }, [fetchSales, fetchCashiers]);

  const handleClearFilters = () => {
    setStartDate('');
    setEndDate('');
    setPaymentMethod('');
    setSelectedCashier('');
  };
const handleViewSale = (saleId) => {
    setSelectedSaleId(saleId);
    setShowSaleDetailModal(true);
  };

  const handleCloseSaleDetailModal = () => {
    setShowSaleDetailModal(false);
    setSelectedSaleId(null); // Clear selected sale ID when closing
  };
  return (
    <div className="p-6">
      {/* Header with Back Button */}
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
          <h1 className="text-2xl font-bold text-gray-900">Sales History</h1>
          <p className="text-gray-600">View and track all sales transactions</p>
        </div>
      </div>

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Method</label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All</option>
            <option value="cash">Cash</option>
            <option value="mpesa">M-Pesa</option>
            <option value="card">Card</option>
            <option value="credit">Credit</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Cashier</label>
          <select
            value={selectedCashier}
            onChange={(e) => setSelectedCashier(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All</option>
            {cashiers.map(cashier => (
              <option key={cashier.id} value={cashier.id}>{cashier.full_name}</option>
            ))}
          </select>
        </div>
        <div className="md:col-span-4 flex justify-end gap-2 mt-4 md:mt-0">
          <button
            onClick={handleClearFilters}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear Filters
          </button>
          <button
            onClick={fetchSales}
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Apply Filters
          </button>
        </div>
      </div>

      {/* Sales Table */}
      {loading ? (
        <div className="text-center py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
          Loading sales transactions...
        </div>
      ) : error ? (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Invoice
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Date
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cashier
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Total
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Payment
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {sales.length === 0 ? (
                <tr>
                  <td colSpan="7" className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    No sales found for the selected filters.
                  </td>
                </tr>
              ) : (
                sales.map((sale) => (
                  <tr key={sale.id} className="hover:bg-gray-50 cursor-pointer" onClick={() => handleViewSale(sale.id)}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {sale.invoice_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {moment(sale.created_at).format('YYYY-MM-DD HH:mm')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {sale.customer_name || 'Walk-in'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {sale.cashier_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-semibold">
                      {formatCurrency(sale.total)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`px-2 py-1 text-xs font-semibold rounded-full capitalize ${
                        sale.payment_method === 'cash' ? 'bg-green-100 text-green-800' :
                        sale.payment_method === 'mpesa' ? 'bg-blue-100 text-blue-800' :
                        sale.payment_method === 'card' ? 'bg-purple-100 text-purple-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {sale.payment_method}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <button
                        onClick={() => alert(`View details for invoice ${sale.invoice_number}`)} // Implement a proper view modal/page later
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        View
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
       {/* Sale Detail Modal */}
      <SaleDetailModal
        isOpen={showSaleDetailModal}
        onClose={handleCloseSaleDetailModal}
        saleId={selectedSaleId}
      />
    </div>
  );
};

export default SalesPage;