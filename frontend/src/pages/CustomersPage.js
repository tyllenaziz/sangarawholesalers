import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import CustomerFormModal from '../components/CustomerFormModal'; // <-- ADD THIS LINE

const CustomersPage = () => {
  const navigate = useNavigate();
  const [customers, setCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddEditModal, setShowAddEditModal] = useState(false); // <-- CHANGED 'showModal' to 'showAddEditModal'
  const [editingCustomer, setEditingCustomer] = useState(null);
  // Removed formData and resetForm from here as they are now managed by CustomerFormModal

  const formatCurrency = (value) => `KES ${parseFloat(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchCustomers = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { search: searchTerm || undefined };
      const response = await api.get('/customers', { params });
      if (response.data.success) {
        setCustomers(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch customers.');
      }
    } catch (err) {
      console.error('Failed to fetch customers:', err);
      setError(err.response?.data?.message || 'Failed to load customer data.');
    } finally {
      setLoading(false);
    }
  }, [searchTerm]);

  useEffect(() => {
    fetchCustomers();
  }, [fetchCustomers]);

  

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setShowAddEditModal(true); // <-- Use new modal state variable
  };

  const handleDelete = async (id, totalTransactions) => {
    if (totalTransactions > 0) {
      alert('Cannot delete customer with existing sales history. Consider deactivating or merging records instead.');
      return;
    }

    if (!window.confirm('Are you sure you want to delete this customer? This action cannot be undone.')) return;
    
    setError('');
    try {
      await api.delete(`/customers/${id}`);
      alert('Customer deleted successfully!');
      fetchCustomers();
    } catch (err) {
      console.error('Failed to delete customer:', err);
      setError(err.response?.data?.message || 'Failed to delete customer.');
    }
  };

  const handleAddCustomerClick = () => {
    setEditingCustomer(null); // Ensure we're adding, not editing
    setShowAddEditModal(true);
  };

  const handleModalClose = () => {
    setShowAddEditModal(false);
    setEditingCustomer(null); // Clear editing customer state
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
          <h1 className="text-2xl font-bold text-gray-900">Customers</h1>
          <p className="text-gray-600">Manage your customer database and loyalty programs</p>
        </div>
        <button
          onClick={handleAddCustomerClick} // <-- Use new handler
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          + Add Customer
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search customers by name, email, or phone..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Customers Table */}
      {loading ? (
        <div className="text-center py-12 flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
          Loading customers...
        </div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Customer Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Purchases
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Loyalty Points
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Outstanding Balance
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {customers.length === 0 ? (
                <tr>
                  <td colSpan="6" className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    No customers found.
                  </td>
                </tr>
              ) : (
                customers.map((customer) => (
                  <tr key={customer.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{customer.name}</div>
                      <div className="text-sm text-gray-500">{customer.email || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {customer.phone}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {formatCurrency(customer.total_purchases)} ({customer.total_transactions_count || 0} orders)
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-indigo-600 font-semibold">
                      {customer.loyalty_points || 0}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`${
                        parseFloat(customer.outstanding_balance) > 0 ? 'text-red-600' : 'text-green-600'
                      } font-semibold`}>
                        {formatCurrency(customer.outstanding_balance)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(customer)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id, customer.total_transactions_count)}
                        className="text-red-600 hover:text-red-900"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Customer Modal */}
      {/* Customer Add/Edit Modal (now using the reusable component) */}
      <CustomerFormModal
        isOpen={showAddEditModal} // <-- Use new modal state variable
        onClose={handleModalClose}
        editingCustomer={editingCustomer}
        onSaveSuccess={fetchCustomers} // Refreshes the list after a successful save
      />
    </div>
  );
};

export default CustomersPage;