import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import moment from 'moment'; // For date formatting
import { useAuth } from '../contexts/AuthContext'; // To get logged-in cashier's name if needed

const SaleDetailModal = ({ isOpen, onClose, saleId }) => {
  const [saleDetails, setSaleDetails] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { user } = useAuth(); // Get current logged-in user for cashier name fallback

  const formatCurrency = (value) => `KES ${parseFloat(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchSaleDetails = useCallback(async () => {
    if (!saleId) {
      setSaleDetails(null);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const response = await api.get(`/sales/${saleId}`);
      if (response.data.success) {
        setSaleDetails(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch sale details.');
      }
    } catch (err) {
      console.error('Error fetching sale details:', err);
      setError(err.response?.data?.message || 'Error fetching sale details.');
    } finally {
      setLoading(false);
    }
  }, [saleId]); // Re-fetch whenever saleId changes

  useEffect(() => {
    if (isOpen) { // Only fetch if modal is open
      fetchSaleDetails();
    }
  }, [isOpen, fetchSaleDetails]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="p-6 flex-1">
          <h2 className="text-xl font-bold mb-4 text-gray-900">Sale Details</h2>
          
          {loading ? (
            <div className="text-center py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
              Loading sale details...
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          ) : saleDetails ? (
            <div>
              {/* Sale Summary */}
              <div className="grid grid-cols-2 gap-x-4 gap-y-2 text-sm text-gray-700 mb-6 border-b pb-4">
                <div>
                  <span className="font-medium">Invoice No:</span> {saleDetails.invoice_number}
                </div>
                <div>
                  <span className="font-medium">Date:</span> {moment(saleDetails.created_at).format('YYYY-MM-DD HH:mm')}
                </div>
                <div>
                  <span className="font-medium">Customer:</span> {saleDetails.customer_name || 'Walk-in Customer'}
                </div>
                <div>
                  <span className="font-medium">Cashier:</span> {saleDetails.cashier_name || user?.full_name || 'N/A'}
                </div>
                <div>
                  <span className="font-medium">Payment Method:</span> <span className="capitalize">{saleDetails.payment_method}</span>
                </div>
                <div>
                  <span className="font-medium">Payment Status:</span> <span className="capitalize">{saleDetails.payment_status}</span>
                </div>
              </div>

              {/* Sale Items Table */}
              <h3 className="text-lg font-semibold mb-3 text-gray-800">Items Sold</h3>
              <div className="bg-gray-50 rounded-lg shadow-sm overflow-hidden mb-6">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-100">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Product</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Total</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {saleDetails.items.map(item => (
                      <tr key={item.id}>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{item.product_name}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">{item.quantity}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500 text-right">{formatCurrency(item.unit_price)}</td>
                        <td className="px-4 py-2 whitespace-nowrap text-sm font-semibold text-gray-900 text-right">{formatCurrency(item.subtotal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Financial Summary */}
              <div className="space-y-2 text-right text-sm text-gray-800 border-t pt-4">
                <div className="flex justify-between">
                  <span className="font-medium">Subtotal:</span>
                  <span>{formatCurrency(saleDetails.subtotal)}</span>
                </div>
                {saleDetails.discount > 0 && (
                  <div className="flex justify-between">
                    <span className="font-medium">Discount:</span>
                    <span>- {formatCurrency(saleDetails.discount)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span className="font-medium">Tax (16%):</span>
                  <span>{formatCurrency(saleDetails.tax)}</span>
                </div>
                <div className="flex justify-between text-lg font-bold mt-2 pt-2 border-t">
                  <span>Grand Total:</span>
                  <span>{formatCurrency(saleDetails.total)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-medium">Amount Paid:</span>
                  <span>{formatCurrency(saleDetails.amount_paid)}</span>
                </div>
                {saleDetails.change_amount > 0 && (
                  <div className="flex justify-between text-base font-semibold text-green-600">
                    <span className="font-medium">Change Given:</span>
                    <span>{formatCurrency(saleDetails.change_amount)}</span>
                  </div>
                )}
                {saleDetails.total - saleDetails.amount_paid > 0.01 && ( // Display balance due if partial payment
                  <div className="flex justify-between text-base font-semibold text-red-600">
                    <span className="font-medium">Balance Due:</span>
                    <span>{formatCurrency(saleDetails.total - saleDetails.amount_paid)}</span>
                  </div>
                )}
              </div>

              {saleDetails.notes && (
                <div className="mt-6 p-3 bg-gray-50 rounded-lg text-sm text-gray-700">
                  <span className="font-medium">Notes:</span> {saleDetails.notes}
                </div>
              )}
            </div>
          ) : (
            <div className="text-center py-12 text-gray-500">
              No sale details found.
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

export default SaleDetailModal;