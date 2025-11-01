import React, { useState, useEffect, useCallback } from 'react';
import api from '../services/api';
import moment from 'moment'; // For date formatting

const ProductMovementModal = ({ isOpen, onClose, productId }) => {
  const [productDetails, setProductDetails] = useState(null);
  const [movementHistory, setMovementHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const formatCurrency = (value) => `KES ${parseFloat(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const fetchMovementData = useCallback(async () => {
    if (!productId) {
      setProductDetails(null);
      setMovementHistory([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [productRes, movementRes] = await Promise.all([
        api.get(`/products/${productId}`), // Fetch product details to display name/SKU
        api.get(`/stock-adjustments/products/${productId}/movement`) // Fetch movement history
      ]);

      if (productRes.data.success) {
        setProductDetails(productRes.data.data);
      } else {
        throw new Error(productRes.data.message || 'Failed to fetch product details.');
      }

      if (movementRes.data.success) {
        setMovementHistory(movementRes.data.data);
      } else {
        throw new Error(movementRes.data.message || 'Failed to fetch movement history.');
      }

    } catch (err) {
      console.error('Error fetching product movement data:', err);
      setError(err.message || 'Error fetching product movement data.');
    } finally {
      setLoading(false);
    }
  }, [productId]); // Re-fetch whenever productId changes

  useEffect(() => {
    if (isOpen) { // Only fetch if modal is open
      fetchMovementData();
    }
  }, [isOpen, fetchMovementData]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        <div className="p-6 flex-1">
          <h2 className="text-xl font-bold mb-4 text-gray-900">
            Stock Movement History
            {productDetails && (
              <span className="ml-2 text-indigo-600">
                : {productDetails.name} (SKU: {productDetails.sku})
              </span>
            )}
          </h2>
          
          {loading ? (
            <div className="text-center py-12 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mr-3"></div>
              Loading movement history...
            </div>
          ) : error ? (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative text-center" role="alert">
              <strong className="font-bold">Error!</strong>
              <span className="block sm:inline"> {error}</span>
            </div>
          ) : (
            <div>
              <div className="bg-white rounded-lg shadow overflow-hidden border">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date & Time</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Qty Change</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Price/Cost</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reference</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Reason/Performer</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {movementHistory.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-4 py-3 text-center text-sm text-gray-500">No movement history found for this product.</td>
                      </tr>
                    ) : (
                      movementHistory.map((entry, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-500">
                            {moment(entry.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                          </td>
                          <td className={`px-4 py-2 whitespace-nowrap text-sm font-medium capitalize ${
                              entry.type === 'sale' ? 'text-blue-600' :
                              entry.type === 'purchase' ? 'text-green-600' :
                              'text-purple-600'
                          }`}>
                            {entry.type.replace('_', ' ')}
                          </td>
                          <td className={`px-4 py-2 whitespace-nowrap text-sm text-right font-semibold ${
                              entry.quantity_change > 0 ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {entry.quantity_change > 0 ? `+${entry.quantity_change}` : entry.quantity_change}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm text-right text-gray-500">
                            {entry.price_at_change ? formatCurrency(entry.price_at_change) : 'N/A'}
                          </td>
                          <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">
                            {entry.reference}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {entry.reason} {entry.performed_by && `(${entry.performed_by})`}
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
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

export default ProductMovementModal;