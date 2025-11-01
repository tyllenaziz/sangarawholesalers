// C:\Users\Tyllen Aziz\Desktop\sangara-wholesalers\frontend\src\pages\ProductsPage.js
import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import moment from 'moment'; // For expiry_date formatting
import ProductMovementModal from '../components/ProductMovementModal'; // <-- ADD THIS LINE
const ProductsPage = () => {
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    sku: '',
    barcode: '',
    category_id: '',
    supplier_id: '',
    unit: '',
    cost_price: '',
    selling_price: '',
    quantity_in_stock: 0,
    reorder_level: 10,
    description: '',
    expiry_date: '', // <--- ADDED COMMA HERE
    is_active: true // <-- NOW CORRECT
  });
  // State for Product Movement History Modal
  const [showMovementModal, setShowMovementModal] = useState(false);
  const [selectedProductIdForMovement, setSelectedProductIdForMovement] = useState(null);

  const fetchDependencies = useCallback(async () => {
    try {
      const [categoriesRes, suppliersRes] = await Promise.all([
        api.get('/categories'),
        api.get('/suppliers')
      ]);
      if (categoriesRes.data.success) setCategories(categoriesRes.data.data);
      if (suppliersRes.data.success) setSuppliers(suppliersRes.data.data);
    } catch (error) {
      console.error('Failed to fetch dependencies (categories/suppliers):', error);
      alert('Failed to load categories or suppliers.');
    }
  }, []);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      // Fetch only active products for the main list, consistent with POS
      const response = await api.get('/products?is_active=true'); // <-- FETCH ONLY ACTIVE PRODUCTS
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
      alert('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, []); // Empty dependency array as this runs once on mount or when triggered

  useEffect(() => {
    fetchDependencies();
    fetchProducts();
  }, [fetchDependencies, fetchProducts]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      const payload = {
            ...formData, // <--- This assumes is_active is correctly in formData
            category_id: formData.category_id ? parseInt(formData.category_id) : null,
            supplier_id: formData.supplier_id ? parseInt(formData.supplier_id) : null,
            cost_price: parseFloat(formData.cost_price),
            selling_price: parseFloat(formData.selling_price),
            quantity_in_stock: parseInt(formData.quantity_in_stock),
            reorder_level: parseInt(formData.reorder_level),
            description: formData.description || null, // Ensure description also sends null if empty
            expiry_date: formData.expiry_date || null,
            is_active: formData.is_active // <-- ENSURE THIS IS EXPLICITLY SENT
          };
      if (editingProduct) {
        await api.put(`/products/${editingProduct.id}`, payload);
        alert('Product updated successfully!');
      } else {
        await api.post('/products', payload);
        alert('Product created successfully!');
      }
      
      setShowAddModal(false);
      setEditingProduct(null);
      resetForm();
      fetchProducts(); // Refresh the product list
    } catch (error) {
      console.error('Failed to save product:', error);
      alert(error.response?.data?.message || 'Failed to save product');
    }
  };

  const handleEdit = (product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      sku: product.sku,
      barcode: product.barcode || '',
      category_id: product.category_id || '',
      supplier_id: product.supplier_id || '',
      unit: product.unit,
      cost_price: product.cost_price,
      selling_price: product.selling_price,
      quantity_in_stock: product.quantity_in_stock,
      reorder_level: product.reorder_level,
      description: product.description || '',
     expiry_date: product.expiry_date ? moment(product.expiry_date).format('YYYY-MM-DD') : '', // Format date for input
      is_active: product.is_active // <-- ADD THIS LINE
    });
    setShowAddModal(true);
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to DEACTIVATE this product? It will no longer be available for sale.')) return; // Clarify it's a soft delete
    
    try {
      await api.delete(`/products/${id}`); // This performs a soft delete (is_active = false)
      alert('Product deactivated successfully!');
      fetchProducts(); // Refresh the product list
    } catch (error) {
      console.error('Failed to deactivate product:', error);
      alert('Failed to deactivate product');
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      sku: '',
      barcode: '',
      category_id: '',
      supplier_id: '',
      unit: '',
      cost_price: '',
      selling_price: '',
      quantity_in_stock: 0,
      reorder_level: 10,
      description: '',
      expiry_date: ''
    });
  };

  const handleViewMovement = (productId) => {
    setSelectedProductIdForMovement(productId);
    setShowMovementModal(true);
  };

  const handleCloseMovementModal = () => {
    setShowMovementModal(false);
    setSelectedProductIdForMovement(null);
  };


  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
  );

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
          <h1 className="text-2xl font-bold text-gray-900">Products</h1>
          <p className="text-gray-600">Manage your product inventory</p>
        </div>
        <button
          onClick={() => {
            setEditingProduct(null);
            resetForm();
            setShowAddModal(true);
          }}
          className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
        >
          + Add Product
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <input
          type="text"
          placeholder="Search products by name, SKU, or barcode..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
        />
      </div>

      {/* Products Table */}
      {loading ? (
        <div className="text-center py-12">Loading products...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Product
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  SKU
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Stock
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cost Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Selling Price
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Expiry Date
                </th> {/* ADDED expiry date column */}
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan="8" className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500"> {/* colspan increased */}
                    No products found.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => (
                  <tr key={product.id}>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{product.name}</div>
                      <div className="text-sm text-gray-500">{product.category_name || 'No category'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.sku}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        product.quantity_in_stock <= product.reorder_level
                          ? 'bg-red-100 text-red-800'
                          : 'bg-green-100 text-green-800'
                      }`}>
                        {product.quantity_in_stock} {product.unit}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      KES {parseFloat(product.cost_price).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-medium">
                      KES {parseFloat(product.selling_price).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {product.expiry_date ? moment(product.expiry_date).format('YYYY-MM-DD') : 'N/A'}
                    </td> {/* ADDED expiry date display */}
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                      <button
                        onClick={() => handleEdit(product)}
                        className="text-indigo-600 hover:text-indigo-900"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleViewMovement(product.id)}
                        className="text-gray-600 hover:text-gray-900"
                        title="View Stock Movement History"
                      >
                        Movement
                      </button>
                      <button
                        onClick={() => handleDelete(product.id)}
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

          {filteredProducts.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              No products found
            </div>
          )}
        </div>
      )}

      {/* Add/Edit Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingProduct ? 'Edit Product' : 'Add New Product'}
              </h2>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Product Name *
                    </label>
                    <input
                      type="text"
                      required
                      name="name" // Added name attribute
                      value={formData.name}
                      onChange={(e) => setFormData({...formData, name: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU *
                    </label>
                    <input
                      type="text"
                      required
                      name="sku" // Added name attribute
                      value={formData.sku}
                      onChange={(e) => setFormData({...formData, sku: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Barcode
                    </label>
                    <input
                      type="text"
                      name="barcode" // Added name attribute
                      value={formData.barcode}
                      onChange={(e) => setFormData({...formData, barcode: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Category
                    </label>
                    <select
                      name="category_id" // Added name attribute
                      value={formData.category_id}
                      onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select category</option>
                      {categories.map((cat) => (
                        <option key={cat.id} value={cat.id}>{cat.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Supplier
                    </label>
                    <select
                      name="supplier_id" // Added name attribute
                      value={formData.supplier_id}
                      onChange={(e) => setFormData({...formData, supplier_id: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select supplier</option>
                      {suppliers.map((sup) => (
                        <option key={sup.id} value={sup.id}>{sup.name}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Unit *
                    </label>
                    <select
                      required
                      name="unit" // Added name attribute
                      value={formData.unit}
                      onChange={(e) => setFormData({...formData, unit: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    >
                      <option value="">Select unit</option>
                      <option value="pcs">Pieces</option>
                      <option value="kg">Kilograms</option>
                      <option value="ltr">Liters</option>
                      <option value="box">Box</option>
                      <option value="pack">Pack</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Cost Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      name="cost_price" // Added name attribute
                      value={formData.cost_price}
                      onChange={(e) => setFormData({...formData, cost_price: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Selling Price *
                    </label>
                    <input
                      type="number"
                      step="0.01"
                      required
                      name="selling_price" // Added name attribute
                      value={formData.selling_price}
                      onChange={(e) => setFormData({...formData, selling_price: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Initial Stock
                    </label>
                    <input
                      type="number"
                      name="quantity_in_stock" // Added name attribute
                      value={formData.quantity_in_stock}
                      onChange={(e) => setFormData({...formData, quantity_in_stock: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Reorder Level
                    </label>
                    <input
                      type="number"
                      name="reorder_level" // Added name attribute
                      value={formData.reorder_level}
                      onChange={(e) => setFormData({...formData, reorder_level: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Expiry Date
                    </label>
                    <input
                      type="date"
                      name="expiry_date" // Added name attribute
                      value={formData.expiry_date}
                      onChange={(e) => setFormData({...formData, expiry_date: e.target.value})}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    />
                  </div>
                </div>

                 <div className="col-span-2"> {/* New div to span two columns if needed, or single column */}
                    <div className="flex items-center space-x-2">
                        <input
                            type="checkbox"
                            id="is_active_product"
                            name="is_active"
                            checked={formData.is_active}
                            onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                            className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                        />
                        <label htmlFor="is_active_product" className="text-sm font-medium text-gray-700">
                            Product is Active (available for sale)
                        </label>
                    </div>
                  </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Description
                  </label>
                  <textarea
                    rows="3"
                    name="description" // Added name attribute
                    value={formData.description}
                    onChange={(e) => setFormData({...formData, description: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>

                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddModal(false);
                      setEditingProduct(null);
                      resetForm();
                    }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                  >
                    {editingProduct ? 'Update' : 'Create'} Product
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Product Movement History Modal */}
      <ProductMovementModal
        isOpen={showMovementModal}
        onClose={handleCloseMovementModal}
        productId={selectedProductIdForMovement}
      />
    </div>
  );
};

export default ProductsPage;