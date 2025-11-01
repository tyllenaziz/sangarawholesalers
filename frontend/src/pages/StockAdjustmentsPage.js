import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import moment from 'moment';

const StockAdjustmentsPage = () => {
  const navigate = useNavigate();
  const [adjustments, setAdjustments] = useState([]);
  const [products, setProducts] = useState([]); // For product dropdown in form
  const [inventoryStats, setInventoryStats] = useState(null); // To display total stock value

  const [initialLoading, setInitialLoading] = useState(true); // For products and inventoryStats
  const [adjustmentsLoading, setAdjustmentsLoading] = useState(true); // For adjustments history
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Filter states
  const [filterProduct, setFilterProduct] = useState('');
  const [filterType, setFilterType] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // Form states for new adjustment
  const [formData, setFormData] = useState({
    product_id: '',
    adjustment_type: 'correction_add', // Default type
    quantity: '',
    reason: ''
  });

  const adjustmentTypes = [
    { value: 'correction_add', label: 'Correction (Add)' },
    { value: 'correction_subtract', label: 'Correction (Subtract)' },
    { value: 'damaged', label: 'Damaged' },
    { value: 'lost', label: 'Lost' },
    { value: 'found', label: 'Found' },
    { value: 'sale_return', label: 'Customer Return' },
    { value: 'returned_to_supplier', label: 'Returned to Supplier' },
    { value: 'received_from_other_location', label: 'Received (Transfer In)' },
  ];

  const formatCurrency = (value) => `KES ${parseFloat(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchInitialData = useCallback(async () => {
      setInitialLoading(true); // <--- CHANGED
    setError('');
    try {
      const [productsRes, statsRes] = await Promise.all([
        api.get('/products?is_active=true'),
        api.get('/reports/inventory/overview') // Uses Product.getStatistics() via reports
      ]);

      if (productsRes.data.success) setProducts(productsRes.data.data);
      if (statsRes.data.success) setInventoryStats(statsRes.data.data);

    } catch (err) {
      console.error('Failed to fetch initial data:', err);
      setError('Failed to load products or inventory statistics.');
    } finally {
       setInitialLoading(false); // <--- CHANGED
    }
  }, []);

  const fetchAdjustments = useCallback(async () => {
     setAdjustmentsLoading(true); // <--- CHANGED
    setError('');
    try {
      const params = {
        product_id: filterProduct || undefined,
        adjustment_type: filterType || undefined,
        start_date: filterStartDate || undefined,
        end_date: filterEndDate || undefined,
      };
      const response = await api.get('/stock-adjustments', { params });
      if (response.data.success) {
        setAdjustments(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch stock adjustments.');
      }
    } catch (err) {
      console.error('Failed to fetch adjustments:', err);
      setError(err.response?.data?.message || 'Failed to load stock adjustments history.');
    } finally {
      setAdjustmentsLoading(false); // <--- CHANGED
    }
  }, [filterProduct, filterType, filterStartDate, filterEndDate]);

  useEffect(() => {
    fetchInitialData();
  }, [fetchInitialData]);

useEffect(() => { // <--- UPDATED useEffect
    if (!initialLoading) { // Only fetch adjustments after initial product/stats data is loaded
      fetchAdjustments();
    }
  }, [initialLoading, fetchAdjustments]); // Depend on initialLoading


  const handleClearFilters = () => {
    setFilterProduct('');
    setFilterType('');
    setFilterStartDate('');
    setFilterEndDate('');
  };

  const handleFormChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleCreateAdjustment = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setError('');

    if (!formData.product_id || !formData.adjustment_type || !formData.quantity || parseFloat(formData.quantity) <= 0) {
      setError('Please fill in all required fields (Product, Type, Quantity) with a positive quantity.');
      setIsSaving(false);
      return;
    }

    try {
      await api.post('/stock-adjustments', {
        ...formData,
        quantity: parseFloat(formData.quantity),
        product_id: parseInt(formData.product_id)
      });
      alert('Stock adjustment created successfully!');
      setFormData({
        product_id: '',
        adjustment_type: 'correction_add',
        quantity: '',
        reason: ''
      });
      fetchAdjustments(); // Refresh history
      fetchInitialData(); // Refresh inventory stats (total value, etc.)
    } catch (err) {
      console.error('Failed to create adjustment:', err);
      setError(err.response?.data?.message || 'Failed to create stock adjustment.');
    } finally {
      setIsSaving(false);
    }
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
          <h1 className="text-2xl font-bold text-gray-900">Stock Adjustments</h1>
          <p className="text-gray-600">Record changes to inventory levels outside of sales or purchases</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {initialLoading ? ( // <--- CHANGED

        <div className="text-center py-12">Loading inventory data...</div>
      ) : (
        <>
          {/* Total Stock Value Card */}
          <div className="bg-indigo-50 rounded-lg shadow p-5 flex items-center justify-between mb-6">
            <div>
              <h3 className="text-sm font-medium text-indigo-700">Total Inventory Value (Cost)</h3>
              <p className="text-3xl font-bold text-indigo-900 mt-1">
                {formatCurrency(inventoryStats?.total_value)}
              </p>
            </div>
            <div className="text-5xl text-indigo-500">💲</div>
          </div>

          {/* New Stock Adjustment Form */}
          <div className="bg-white rounded-lg shadow p-6 mb-6">
            <h2 className="text-xl font-bold text-gray-900 mb-4">Create New Adjustment</h2>
            <form onSubmit={handleCreateAdjustment} className="grid grid-cols-1 md:grid-cols-4 gap-4 items-end">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Product *</label>
                <select
                  name="product_id"
                  value={formData.product_id}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                  disabled={isSaving}
                >
                  <option value="">Select Product</option>
                  {products.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku}) - Stock: {p.quantity_in_stock}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Adjustment Type *</label>
                <select
                  name="adjustment_type"
                  value={formData.adjustment_type}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  required
                  disabled={isSaving}
                >
                  {adjustmentTypes.map(type => (
                    <option key={type.value} value={type.value}>{type.label}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Quantity *</label>
                <input
                  type="number"
                  name="quantity"
                  value={formData.quantity}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  min="1"
                  required
                  disabled={isSaving}
                />
              </div>
              <div className="col-span-1 md:col-span-4"> {/* Reason can take more space */}
                <label className="block text-sm font-medium text-gray-700 mb-1">Reason (Optional)</label>
                <textarea
                  name="reason"
                  rows="2"
                  value={formData.reason}
                  onChange={handleFormChange}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={isSaving}
                ></textarea>
              </div>
              <div className="col-span-1 md:col-span-4 flex justify-end">
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSaving ? 'Saving...' : 'Record Adjustment'}
                </button>
              </div>
            </form>
          </div>

          {/* Filters for Adjustment History */}
          <div className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Product</label>
              <select
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Products</option>
                {products.map(p => <option key={p.id} value={p.id}>{p.name} (SKU: {p.sku})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Type</label>
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              >
                <option value="">All Types</option>
                {adjustmentTypes.map(type => <option key={type.value} value={type.value}>{type.label}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
              <input
                type="date"
                value={filterStartDate}
                onChange={(e) => setFilterStartDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
              <input
                type="date"
                value={filterEndDate}
                onChange={(e) => setFilterEndDate(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleClearFilters}
                className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Clear
              </button>
              <button
                onClick={fetchAdjustments}
                className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                Apply
              </button>
            </div>
          </div>

          {/* Adjustments History Table */}
          {/* Adjustments History Table */}
          <div className="bg-white rounded-lg shadow overflow-hidden">
            <h2 className="text-xl font-bold text-gray-900 p-6 border-b">Adjustment History</h2>
            {adjustmentsLoading ? ( // <--- ADDED conditional rendering for adjustmentsLoading
                <div className="text-center py-12">Loading adjustments history...</div>
            ) : (
                <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                    <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Type</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Reason</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Adjusted By</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {adjustments.length === 0 ? (
                    <tr>
                        <td colSpan="6" className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                        No stock adjustments found.
                        </td>
                    </tr>
                    ) : (
                    adjustments.map((adj) => (
                        <tr key={adj.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {moment(adj.created_at).format('YYYY-MM-DD HH:mm')}
                        </td>
                        <td className="px-6 py-4">
                            <div className="text-sm font-medium text-gray-900">{adj.product_name}</div>
                            <div className="text-sm text-gray-500">SKU: {adj.sku}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 capitalize">
                            {adjustmentTypes.find(type => type.value === adj.adjustment_type)?.label || adj.adjustment_type.replace(/_/g, ' ')}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-right font-semibold">
                            <span className={`${adj.quantity > 0 ? 'text-green-600' : 'text-red-600'}`}>
                            {adj.quantity > 0 ? `+${adj.quantity}` : adj.quantity}
                            </span>
                        </td>
                        <td className="px-6 py-4 text-sm text-gray-500 max-w-xs truncate">{adj.reason || 'N/A'}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{adj.adjusted_by_user}</td>
                        </tr>
                    ))
                    )}
                </tbody>
                </table>
            )} {/* <--- CLOSING TAG FOR THE CONDITIONAL RENDERING */}
          </div>
        </>
      )}
    </div>
  );
};

export default StockAdjustmentsPage;