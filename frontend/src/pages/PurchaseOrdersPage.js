import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import moment from 'moment';

const PurchaseOrdersPage = () => {
  const navigate = useNavigate();
  const [purchaseOrders, setPurchaseOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Filters state
  const [filterSupplier, setFilterSupplier] = useState('');
  const [filterStatus, setFilterStatus] = useState(''); // 'ordered', 'received', 'canceled'
  const [filterPaymentStatus, setFilterPaymentStatus] = useState(''); // 'pending', 'partial', 'paid'
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');

  // For add/edit modal
  const [showAddEditModal, setShowAddEditModal] = useState(false);
  const [editingPO, setEditingPO] = useState(null); // null for add, PO object for edit
  const [suppliers, setSuppliers] = useState([]); // For supplier dropdown
  const [products, setProducts] = useState([]); // For product selection in PO items

  // For detail modal
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState(null);

  // For payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentPO, setPaymentPO] = useState(null); // PO object for payment
  const [paymentAmount, setPaymentAmount] = useState('');


  const formatCurrency = (value) => `KES ${parseFloat(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchDependencies = useCallback(async () => {
    try {
      const [suppliersRes, productsRes] = await Promise.all([
        api.get('/suppliers'),
        api.get('/products?is_active=true') // Only active products
      ]);
      if (suppliersRes.data.success) setSuppliers(suppliersRes.data.data);
      if (productsRes.data.success) setProducts(productsRes.data.data);
    } catch (err) {
      console.error('Failed to fetch dependencies (suppliers/products):', err);
      setError('Failed to load suppliers or products for forms.');
    }
  }, []);

  const fetchPurchaseOrders = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        supplier_id: filterSupplier || undefined,
        status: filterStatus || undefined,
        payment_status: filterPaymentStatus || undefined,
        start_date: filterStartDate || undefined,
        end_date: filterEndDate || undefined,
        search: searchTerm || undefined,
      };
      const response = await api.get('/purchases', { params });
      if (response.data.success) {
        setPurchaseOrders(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch purchase orders.');
      }
    } catch (err) {
      console.error('Failed to fetch purchase orders:', err);
      setError(err.response?.data?.message || 'Failed to load purchase orders.');
    } finally {
      setLoading(false);
    }
  }, [filterSupplier, filterStatus, filterPaymentStatus, filterStartDate, filterEndDate, searchTerm]);

  useEffect(() => {
    fetchDependencies();
    fetchPurchaseOrders();
  }, [fetchDependencies, fetchPurchaseOrders]);

  const handleClearFilters = () => {
    setFilterSupplier('');
    setFilterStatus('');
    setFilterPaymentStatus('');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchTerm('');
  };

  // --- CRUD Actions ---
  const handleCreatePO = () => {
    setEditingPO(null); // Clear any previous editing state
    setShowAddEditModal(true);
  };

  const handleEditPO = (po) => {
    // Only allow editing for 'ordered' status POs for simplicity.
    // Full editing might involve managing items, which is more complex.
    if (po.status !== 'ordered') {
        alert("Only 'ordered' purchase orders can be edited directly.");
        return;
    }
    setEditingPO(po);
    setShowAddEditModal(true);
  };

  const handleSavePO = async (poData, itemsData) => {
    setError('');
    try {
      if (editingPO) {
        // For editing, we might only update notes or general PO details, not items for simplicity
        const { supplier_id, total_amount, notes, payment_status } = poData;
        await api.put(`/purchases/${editingPO.id}`, { supplier_id, total_amount, notes, payment_status });
        alert('Purchase order updated successfully!');
      } else {
        await api.post('/purchases', { ...poData, items: itemsData });
        alert('Purchase order created successfully!');
      }
      setShowAddEditModal(false);
      fetchPurchaseOrders(); // Refresh list
    } catch (err) {
      console.error('Failed to save PO:', err);
      setError(err.response?.data?.message || 'Failed to save purchase order.');
    }
  };

  const handleReceivePO = async (poId) => {
    if (!window.confirm('Are you sure you want to mark this purchase order as RECEIVED and update stock?')) return;
    setError('');
    try {
      await api.patch(`/purchases/${poId}/receive`);
      alert('Purchase order marked as received and stock updated!');
      fetchPurchaseOrders();
    } catch (err) {
      console.error('Failed to receive PO:', err);
      setError(err.response?.data?.message || 'Failed to receive purchase order.');
    }
  };

  const handleCancelPO = async (poId) => {
    if (!window.confirm('Are you sure you want to CANCEL this purchase order?')) return;
    setError('');
    try {
      await api.patch(`/purchases/${poId}/cancel`);
      alert('Purchase order canceled!');
      fetchPurchaseOrders();
    } catch (err) {
      console.error('Failed to cancel PO:', err);
      setError(err.response?.data?.message || 'Failed to cancel purchase order.');
    }
  };

  const handleRecordPayment = (po) => {
    setPaymentPO(po);
    setPaymentAmount((po.total_amount - po.amount_paid).toFixed(2)); // Pre-fill with remaining amount
    setShowPaymentModal(true);
  };

  const processPayment = async () => {
    if (!paymentPO || !paymentAmount || parseFloat(paymentAmount) <= 0) {
      setError('Invalid payment amount.');
      return;
    }
    if (parseFloat(paymentAmount) > (paymentPO.total_amount - paymentPO.amount_paid)) {
        alert('Payment amount exceeds outstanding balance.');
        return;
    }

    setError('');
    try {
      await api.patch(`/purchases/${paymentPO.id}/payment`, { amount: parseFloat(paymentAmount) });
      alert(`Payment of ${formatCurrency(paymentAmount)} recorded for PO ${paymentPO.purchase_number}.`);
      setShowPaymentModal(false);
      fetchPurchaseOrders();
    } catch (err) {
      console.error('Failed to record payment:', err);
      setError(err.response?.data?.message || 'Failed to record payment.');
    }
  };

  // --- Detail Modal Handlers ---
  const handleViewDetails = (poId) => {
    setSelectedPOId(poId);
    setShowDetailModal(true);
  };

  const handleCloseDetailModal = () => {
    setShowDetailModal(false);
    setSelectedPOId(null);
  };


  return (
    <div className="p-6">
      {/* Header */}
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
          <h1 className="text-2xl font-bold text-gray-900">Purchase Orders</h1>
          <p className="text-gray-600">Manage orders from your suppliers and track stock receipts</p>
        </div>
        <button
          onClick={handleCreatePO}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          + Create Purchase Order
        </button>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search PO # / Supplier</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="Search..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Supplier</label>
          <select
            value={filterSupplier}
            onChange={(e) => setFilterSupplier(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Suppliers</option>
            {suppliers.map(sup => <option key={sup.id} value={sup.id}>{sup.name}</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Status</label>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Statuses</option>
            <option value="ordered">Ordered</option>
            <option value="received">Received</option>
            <option value="canceled">Canceled</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Payment Status</label>
          <select
            value={filterPaymentStatus}
            onChange={(e) => setFilterPaymentStatus(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="partial">Partial</option>
            <option value="paid">Paid</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={handleClearFilters}
            className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Clear
          </button>
          <button
            onClick={fetchPurchaseOrders}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Purchase Orders Table */}
      {loading ? (
        <div className="text-center py-12">Loading purchase orders...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO #</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Supplier</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Paid</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Payment</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {purchaseOrders.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    No purchase orders found.
                  </td>
                </tr>
              ) : (
                purchaseOrders.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <button onClick={() => handleViewDetails(po.id)} className="text-indigo-600 hover:text-indigo-900">
                        {po.purchase_number}
                      </button>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{po.supplier_name}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{moment(po.created_at).format('YYYY-MM-DD')}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 text-right">{formatCurrency(po.total_amount)}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(po.amount_paid)}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                        po.status === 'received' ? 'bg-green-100 text-green-800' :
                        po.status === 'ordered' ? 'bg-blue-100 text-blue-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {po.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full capitalize ${
                        po.payment_status === 'paid' ? 'bg-green-100 text-green-800' :
                        po.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800' :
                        'bg-red-100 text-red-800'
                      }`}>
                        {po.payment_status}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium space-x-2">
                      {po.status === 'ordered' && (
                        <>
                          <button onClick={() => handleRecordPayment(po)} className="text-green-600 hover:text-green-900">Pay</button>
                          <button onClick={() => handleReceivePO(po.id)} className="text-blue-600 hover:text-blue-900">Receive</button>
                          <button onClick={() => handleEditPO(po)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                          <button onClick={() => handleCancelPO(po.id)} className="text-red-600 hover:text-red-900">Cancel</button>
                        </>
                      )}
                      {po.status === 'received' && po.payment_status !== 'paid' && (
                         <button onClick={() => handleRecordPayment(po)} className="text-green-600 hover:text-green-900">Pay Balance</button>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Add/Edit Purchase Order Modal */}
      {showAddEditModal && (
        <AddEditPurchaseOrderModal
          isOpen={showAddEditModal}
          onClose={() => setShowAddEditModal(false)}
          editingPO={editingPO}
          onSave={handleSavePO}
          suppliers={suppliers}
          products={products}
          formatCurrency={formatCurrency}
        />
      )}

      {/* Purchase Order Detail Modal */}
      {showDetailModal && (
        <PurchaseOrderDetailModal
          isOpen={showDetailModal}
          onClose={handleCloseDetailModal}
          poId={selectedPOId}
          formatCurrency={formatCurrency}
          suppliers={suppliers}
          products={products}
        />
      )}

      {/* Record Payment Modal */}
      {showPaymentModal && paymentPO && (
        <RecordPaymentModal
          isOpen={showPaymentModal}
          onClose={() => setShowPaymentModal(false)}
          po={paymentPO}
          onProcessPayment={processPayment}
          paymentAmount={paymentAmount}
          setPaymentAmount={setPaymentAmount}
          formatCurrency={formatCurrency}
        />
      )}
    </div>
  );
};

// --- Sub-components for Modals (Defined within this file for simplicity,
//     but for a larger app, you might move them to separate files in 'components') ---

// Add/Edit Purchase Order Modal Component
const AddEditPurchaseOrderModal = ({ isOpen, onClose, editingPO, onSave, suppliers, products, formatCurrency }) => {
  const [supplierId, setSupplierId] = useState(editingPO?.supplier_id || '');
  const [notes, setNotes] = useState(editingPO?.notes || '');
  const [poItems, setPoItems] = useState(editingPO?.items || []);
  const [tempProductSearch, setTempProductSearch] = useState('');
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [totalAmount, setTotalAmount] = useState(editingPO?.total_amount || 0);
  const [error, setError] = useState('');

  useEffect(() => {
    // Recalculate total amount when poItems change
    const newTotal = poItems.reduce((sum, item) => sum + (item.quantity * item.unit_cost), 0);
    setTotalAmount(newTotal);
  }, [poItems]);

  const handleProductSearch = (e) => {
    const term = e.target.value;
    setTempProductSearch(term);
    if (term.length > 1) {
      setFilteredProducts(products.filter(p =>
        p.name.toLowerCase().includes(term.toLowerCase()) || p.sku.toLowerCase().includes(term.toLowerCase())
      ));
    } else {
      setFilteredProducts([]);
    }
  };

  const handleAddItem = (product) => {
    // Check if item already in PO
    if (poItems.find(item => item.product_id === product.id)) {
      alert('Product already in purchase order.');
      return;
    }
    setPoItems([...poItems, {
      product_id: product.id,
      product_name: product.name,
      sku: product.sku,
      quantity: 1, // Default quantity
      unit_cost: parseFloat(product.cost_price) // Default to product's cost price
    }]);
    setTempProductSearch('');
    setFilteredProducts([]);
  };

  const handleUpdateItem = (index, field, value) => {
    const newItems = [...poItems];
    newItems[index][field] = parseFloat(value) || 0;
    setPoItems(newItems);
  };

  const handleRemoveItem = (index) => {
    setPoItems(poItems.filter((_, i) => i !== index));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    if (!supplierId) {
      setError('Supplier is required.');
      return;
    }
    if (poItems.length === 0) {
      setError('At least one item is required.');
      return;
    }
    if (poItems.some(item => item.quantity <= 0 || item.unit_cost <= 0)) {
        setError('Quantity and Unit Cost must be positive for all items.');
        return;
    }

    onSave(
      { supplier_id: parseInt(supplierId), notes, total_amount: totalAmount },
      poItems
    );
    onClose(); // Close modal after saving
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-xl font-bold mb-4">
            {editingPO ? `Edit Purchase Order ${editingPO.purchase_number}` : 'Create New Purchase Order'}
          </h2>

          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
              <strong className="font-bold">Error!</strong> {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* PO Details */}
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Supplier *</label>
                <select
                  required
                  value={supplierId}
                  onChange={(e) => setSupplierId(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  disabled={!!editingPO} // Disable supplier selection on edit for simplicity if items aren't editable
                >
                  <option value="">Select Supplier</option>
                  {suppliers.map(sup => (
                    <option key={sup.id} value={sup.id}>{sup.name}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Notes</label>
                <textarea
                  rows="2"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                ></textarea>
              </div>
            </div>

            {/* Product Search and Add to PO */}
            <div className="border-t pt-4 mt-4">
              <h3 className="text-lg font-semibold mb-3">Add Products to Order</h3>
              <div className="relative mb-3">
                <input
                  type="text"
                  placeholder="Search products by name or SKU..."
                  value={tempProductSearch}
                  onChange={handleProductSearch}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                />
                {tempProductSearch && filteredProducts.length > 0 && (
                  <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-48 overflow-y-auto">
                    {filteredProducts.map(product => (
                      <li
                        key={product.id}
                        onClick={() => handleAddItem(product)}
                        className="p-3 hover:bg-gray-100 cursor-pointer border-b last:border-b-0"
                      >
                        <p className="font-medium">{product.name} (SKU: {product.sku})</p>
                        <p className="text-sm text-gray-500">Cost: {formatCurrency(product.cost_price)} | Stock: {product.quantity_in_stock}</p>
                      </li>
                    ))}
                  </ul>
                )}
                {tempProductSearch && filteredProducts.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2 px-2">No matching products found.</p>
                )}
              </div>

              {/* PO Items Table */}
              <div className="bg-gray-50 rounded-lg overflow-hidden">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Product</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Unit Cost</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Total</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {poItems.length === 0 ? (
                      <tr><td colSpan="5" className="px-4 py-3 text-center text-sm text-gray-500">No items in this order.</td></tr>
                    ) : (
                      poItems.map((item, index) => (
                        <tr key={item.product_id}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{item.product_name} ({item.sku})</td>
                          <td className="px-4 py-2 text-sm text-right">
                            <input
                              type="number"
                              min="1"
                              value={item.quantity}
                              onChange={(e) => handleUpdateItem(index, 'quantity', e.target.value)}
                              className="w-20 text-center border border-gray-300 rounded-lg"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm text-right">
                            <input
                              type="number"
                              step="0.01"
                              min="0.01"
                              value={item.unit_cost}
                              onChange={(e) => handleUpdateItem(index, 'unit_cost', e.target.value)}
                              className="w-24 text-center border border-gray-300 rounded-lg"
                            />
                          </td>
                          <td className="px-4 py-2 text-sm font-semibold text-right">{formatCurrency(item.quantity * item.unit_cost)}</td>
                          <td className="px-4 py-2 text-center">
                            <button type="button" onClick={() => handleRemoveItem(index)} className="text-red-600 hover:text-red-900">Remove</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
              <div className="text-right text-lg font-bold mt-4">
                Total Order Amount: {formatCurrency(totalAmount)}
              </div>
            </div>

            {/* Form Actions */}
            <div className="flex gap-3 justify-end pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
              >
                {editingPO ? 'Update Purchase Order' : 'Create Purchase Order'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};


// Purchase Order Detail Modal Component
const PurchaseOrderDetailModal = ({ isOpen, onClose, poId, formatCurrency, suppliers, products }) => {
  const [poDetails, setPoDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchPoDetails = useCallback(async () => {
    if (!poId) return;
    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/purchases/${poId}`);
      if (response.data.success) {
        setPoDetails(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch purchase order details.');
      }
    } catch (err) {
      console.error('Error fetching PO details:', err);
      setError(err.response?.data?.message || 'Error fetching PO details.');
    } finally {
      setLoading(false);
    }
  }, [poId]);

  useEffect(() => {
    if (isOpen) {
      fetchPoDetails();
    }
  }, [isOpen, fetchPoDetails]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="p-6 flex-1">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Purchase Order Details</h2>
          
          {loading ? (
            <div className="text-center py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
              Loading purchase order details...
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          ) : poDetails ? (
            <div>
              {/* PO Summary */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700 mb-6 border-b pb-4">
                <div>
                  <span className="font-medium">PO No:</span> {poDetails.purchase_number}
                </div>
                <div>
                  <span className="font-medium">Date:</span> {moment(poDetails.created_at).format('YYYY-MM-DD HH:mm')}
                </div>
                <div>
                  <span className="font-medium">Supplier:</span> {poDetails.supplier_name || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Created By:</span> {poDetails.created_by_user || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Status:</span> <span className="capitalize">{poDetails.status}</span>
                </div>
                <div>
                  <span className="font-medium">Payment Status:</span> <span className="capitalize">{poDetails.payment_status}</span>
                </div>
              </div>

              {/* PO Items Table */}
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Order Items</h3>
              <div className="bg-gray-50 rounded-lg shadow-sm overflow-hidden mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Cost</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {poDetails.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.product_name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">{item.sku}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">{item.quantity}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.unit_cost)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary */}
              <div className="space-y-2 text-right text-sm text-gray-800 border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-medium">Total Amount:</span>
                  <span>{formatCurrency(poDetails.total_amount)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Amount Paid:</span>
                  <span>{formatCurrency(poDetails.amount_paid)}</span>
                </div>
                {poDetails.total_amount - poDetails.amount_paid > 0.01 && (
                  <div className="flex justify-between text-base font-semibold text-red-600">
                    <span className="font-medium">Balance Due:</span>
                    <span>{formatCurrency(poDetails.total_amount - poDetails.amount_paid)}</span>
                  </div>
                )}
              </div>

              {poDetails.notes && (
                <div className="mt-6 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                  <span className="font-medium">Notes:</span> {poDetails.notes}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No purchase order details found.
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="p-4 border-t flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

// Record Payment Modal Component
const RecordPaymentModal = ({ isOpen, onClose, po, onProcessPayment, paymentAmount, setPaymentAmount, formatCurrency }) => {
    const remainingBalance = po.total_amount - po.amount_paid;

    const handleSubmit = (e) => {
        e.preventDefault();
        if (parseFloat(paymentAmount) <= 0 || parseFloat(paymentAmount) > remainingBalance) {
            alert('Invalid payment amount. Must be positive and not exceed remaining balance.');
            return;
        }
        onProcessPayment(po.id, parseFloat(paymentAmount));
        onClose();
    };

    if (!isOpen || !po) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-md w-full">
                <div className="p-6">
                    <h2 className="text-xl font-bold mb-4">Record Payment for PO #{po.purchase_number}</h2>
                    <div className="mb-4">
                        <p className="text-sm font-medium text-gray-700">Supplier: <span className="font-semibold">{po.supplier_name}</span></p>
                        <p className="text-sm font-medium text-gray-700">Total Amount: <span className="font-semibold">{formatCurrency(po.total_amount)}</span></p>
                        <p className="text-sm font-medium text-gray-700">Amount Paid: <span className="font-semibold">{formatCurrency(po.amount_paid)}</span></p>
                        <p className="text-lg font-bold text-red-600 mt-2">Remaining Balance: {formatCurrency(remainingBalance)}</p>
                    </div>

                    <form onSubmit={handleSubmit} className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Payment Amount *</label>
                            <input
                                type="number"
                                step="0.01"
                                min="0.01"
                                max={remainingBalance.toFixed(2)}
                                value={paymentAmount}
                                onChange={(e) => setPaymentAmount(e.target.value)}
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                                required
                            />
                        </div>

                        <div className="flex gap-3 justify-end pt-4">
                            <button
                                type="button"
                                onClick={onClose}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                            >
                                Record Payment
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
};


export default PurchaseOrdersPage;