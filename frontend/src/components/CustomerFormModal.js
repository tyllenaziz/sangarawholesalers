
import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import moment from 'moment'; // For date formatting

// We'll need the SaleDetailModal here
import SaleDetailModal from './SaleDetailModal'; // <-- NEW IMPORT: Make sure this path is correct relative to components folder

const CustomerFormModal = ({ isOpen, onClose, editingCustomer, onSaveSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    outstanding_balance: 0,
    loyalty_points: 0,
    total_purchases: 0
  });
  const [loading, setLoading] = useState(false); // For saving/fetching customer details
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('details'); // 'details' or 'history'

  // State for Purchase History
  const [purchaseHistory, setPurchaseHistory] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState('');

  // State for Sale Detail Modal
  const [showSaleDetailModal, setShowSaleDetailModal] = useState(false);
  const [selectedSaleId, setSelectedSaleId] = useState(null);

  const formatCurrency = (value) => `KES ${parseFloat(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;


  useEffect(() => {
    if (editingCustomer) {
      setFormData({
        name: editingCustomer.name,
        email: editingCustomer.email || '',
        phone: editingCustomer.phone,
        address: editingCustomer.address || '',
        outstanding_balance: editingCustomer.outstanding_balance || 0,
        loyalty_points: editingCustomer.loyalty_points || 0,
        total_purchases: editingCustomer.total_purchases || 0
      });
      setActiveTab('details'); // Reset to details tab when editing a customer
    } else {
      resetForm();
    }
  }, [editingCustomer, isOpen]); // Reset or load data when modal opens or editingCustomer changes

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phone: '',
      address: '',
      outstanding_balance: 0,
      loyalty_points: 0,
      total_purchases: 0
    });
    setError('');
    setHistoryError('');
    setActiveTab('details');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      if (editingCustomer) {
        const { total_purchases, loyalty_points, ...editableData } = formData;
        const payload = { 
          ...editableData, 
          // Ensure these values revert to the original if not explicitly editable
          total_purchases: editingCustomer.total_purchases, 
          loyalty_points: editingCustomer.loyalty_points 
        };
        await api.put(`/customers/${editingCustomer.id}`, payload);
        alert('Customer updated successfully!');
      } else {
        await api.post('/customers', formData);
        alert('Customer created successfully!');
      }
      
      onSaveSuccess(); // Callback to parent to re-fetch data
      onClose(); // Close modal
      resetForm();
    } catch (err) {
      console.error('Failed to save customer:', err);
      setError(err.response?.data?.message || 'Failed to save customer.');
    } finally {
      setLoading(false);
    }
  };

  // --- Purchase History Functions ---
  const fetchPurchaseHistory = useCallback(async () => {
    if (!editingCustomer || !editingCustomer.id) {
      setPurchaseHistory([]);
      return;
    }

    setHistoryLoading(true);
    setHistoryError('');
    try {
      // Use the existing /sales endpoint, filtered by customer_id
      const response = await api.get('/sales', { params: { customer_id: editingCustomer.id } });
      if (response.data.success) {
        setPurchaseHistory(response.data.data);
      } else {
        setHistoryError(response.data.message || 'Failed to fetch purchase history.');
      }
    } catch (err) {
      console.error('Failed to fetch purchase history:', err);
      setHistoryError(err.response?.data?.message || 'Failed to load purchase history.');
    } finally {
      setHistoryLoading(false);
    }
  }, [editingCustomer]);

  useEffect(() => {
    if (isOpen && activeTab === 'history') {
      fetchPurchaseHistory();
    }
  }, [isOpen, activeTab, fetchPurchaseHistory]);

  const handleViewSale = (saleId) => {
    setSelectedSaleId(saleId);
    setShowSaleDetailModal(true);
  };

  const handleCloseSaleDetailModal = () => {
    setShowSaleDetailModal(false);
    setSelectedSaleId(null);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto"> {/* Increased max-w-2xl to max-w-4xl */}
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {editingCustomer ? `Edit Customer: ${editingCustomer.name}` : 'Add New Customer'}
          </h2>

          {/* Tabs */}
          {editingCustomer && ( // Only show tabs if editing an existing customer
            <div className="flex border-b border-gray-200 mb-6">
              <button
                className={`py-2 px-4 text-sm font-medium ${activeTab === 'details' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('details')}
              >
                Customer Details
              </button>
              <button
                className={`py-2 px-4 text-sm font-medium ${activeTab === 'history' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                onClick={() => setActiveTab('history')}
              >
                Purchase History
              </button>
            </div>
          )}

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          )}

          {/* Details Tab Content */}
          {activeTab === 'details' && (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Customer Name *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({...formData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="e.g., John Doe"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Phone Number *
                  </label>
                  <input
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={(e) => setFormData({...formData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="0712345678"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Email
                  </label>
                  <input
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="customer@example.com"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Address
                  </label>
                  <textarea
                    rows="2"
                    value={formData.address}
                    onChange={(e) => setFormData({...formData, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Physical address"
                  />
                </div>

                {editingCustomer && ( // These fields are read-only or system managed
                  <>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Outstanding Balance
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.outstanding_balance}
                        onChange={(e) => setFormData({...formData, outstanding_balance: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                        placeholder="0.00"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Loyalty Points
                      </label>
                      <input
                        type="number"
                        value={formData.loyalty_points}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="col-span-2">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Total Purchases
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.total_purchases}
                        readOnly
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 focus:ring-2 focus:ring-indigo-500"
                      />
                    </div>
                  </>
                )}
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={onClose}
                  disabled={loading}
                  className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Saving...
                    </span>
                  ) : (
                    editingCustomer ? 'Update' : 'Create'
                  )}
                </button>
              </div>
            </form>
          )}

          {/* History Tab Content */}
          {activeTab === 'history' && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold mb-3">Customer's Sales History</h3>
              {historyError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
                  <strong className="font-bold">Error!</strong> {historyError}
                </div>
              )}
              {historyLoading ? (
                <div className="text-center py-6">Loading purchase history...</div>
              ) : purchaseHistory.length === 0 ? (
                <div className="text-center py-6 text-gray-500">No sales found for this customer.</div>
              ) : (
                <div className="bg-white rounded-lg shadow overflow-hidden border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Invoice</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Payment</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {purchaseHistory.map(sale => (
                        <tr key={sale.id} className="hover:bg-gray-50">
                          <td className="px-4 py-2 text-sm font-medium text-indigo-600">
                            <button onClick={() => handleViewSale(sale.id)}>{sale.invoice_number}</button>
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">{moment(sale.created_at).format('YYYY-MM-DD')}</td>
                          <td className="px-4 py-2 text-sm text-right font-semibold">{formatCurrency(sale.total)}</td>
                          <td className="px-4 py-2 text-sm text-gray-500 capitalize">{sale.payment_method}</td>
                          <td className="px-4 py-2 text-center">
                            <button onClick={() => handleViewSale(sale.id)} className="text-indigo-600 hover:text-indigo-900 text-sm">View</button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Sale Detail Modal (for viewing individual sales from history) */}
      <SaleDetailModal
        isOpen={showSaleDetailModal}
        onClose={handleCloseSaleDetailModal}
        saleId={selectedSaleId}
      />
    </div>
  );
};

export default CustomerFormModal;
