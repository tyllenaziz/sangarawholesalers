import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import moment from 'moment'; // For date formatting in discount rules


const SettingsPage = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('general'); // 'general', 'taxRates', 'discountRules', 'backup'
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [successMessage, setSuccessMessage] = useState('');

  // General Settings States
  const [generalSettings, setGeneralSettings] = useState([]);

  // Tax Rates States
  const [taxRates, setTaxRates] = useState([]);
  const [showAddEditTaxModal, setShowAddEditTaxModal] = useState(false);
  const [editingTaxRate, setEditingTaxRate] = useState(null);
  const [taxFormData, setTaxFormData] = useState({
    name: '',
    rate: 0.00,
    is_default: false,
    is_active: true,
    description: ''
  });

  // Discount Rules States
  const [discountRules, setDiscountRules] = useState([]);
  const [showAddEditDiscountModal, setShowAddEditDiscountModal] = useState(false);
  const [editingDiscountRule, setEditingDiscountRule] = useState(null);
  const [discountFormData, setDiscountFormData] = useState({
    name: '',
    code: '',
    type: 'percentage', // 'percentage' or 'fixed_amount'
    value: 0.00,
    min_purchase_amount: 0.00,
    applies_to: 'all_products', // 'all_products', 'specific_categories', 'specific_products'
    is_active: true,
    start_date: '',
    end_date: '',
    description: ''
  });

  // Backup/Restore States // <-- NEW CODE
  const [backupLoading, setBackupLoading] = useState(false);
  const [backupList, setBackupList] = useState([]);
  const [listBackupsLoading, setListBackupsLoading] = useState(false);
  const [backupError, setBackupError] = useState('');
  // END NEW CODE

  const formatCurrency = (value) => `KES ${parseFloat(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // --- General Settings Fetch/Save ---
  const fetchGeneralSettings = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const response = await api.get('/settings');
      if (response.data.success) {
        setGeneralSettings(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch general settings.');
      }
    } catch (err) {
      console.error('Failed to fetch general settings:', err);
      setError(err.response?.data?.message || 'Failed to load general settings.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleGeneralSettingChange = (key_name, value) => {
    setGeneralSettings(prevSettings =>
      prevSettings.map(setting =>
        setting.key_name === key_name ? { ...setting, key_value: value } : setting
      )
    );
  };

  const handleUpdateGeneralSetting = async (key_name) => {
    setIsSaving(true);
    setSuccessMessage('');
    setError('');
    const settingToUpdate = generalSettings.find(s => s.key_name === key_name);
    if (!settingToUpdate) {
      setError('Setting not found.');
      setIsSaving(false);
      return;
    }

    try {
      await api.put(`/settings/${key_name}`, { key_value: settingToUpdate.key_value });
      setSuccessMessage(`${settingToUpdate.description || settingToUpdate.key_name} updated successfully!`);
    } catch (err) {
      console.error(`Failed to update ${key_name}:`, err);
      setError(err.response?.data?.message || `Failed to update ${key_name}.`);
    } finally {
      setIsSaving(false);
    }
  };

  // Helper to render different input types based on key_name for general settings
  const renderGeneralSettingInput = (setting) => {
    const commonProps = {
      value: setting.key_value,
      onChange: (e) => handleGeneralSettingChange(setting.key_name, e.target.value),
      className: "w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500",
      disabled: isSaving // Disable inputs during save operation
    };

    // If it's an M-Pesa setting, display it as read-only text (optional: hide entirely if preferred)
    if (['mpesa_consumer_key', 'mpesa_consumer_secret', 'mpesa_passkey', 'mpesa_shortcode', 'mpesa_callback_url', 'mpesa_environment'].includes(setting.key_name)) {
        return (
            <input
                type={setting.key_name.includes('secret') || setting.key_name.includes('passkey') ? 'password' : 'text'}
                value={setting.key_value}
                readOnly // Make them read-only
                title="Managed via backend .env file for security"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg bg-gray-100 cursor-not-allowed"
            />
        );
    }

    // Default editable fields
    switch (setting.key_name) {
      case 'vat_rate':
        return <input type="number" step="0.0001" {...commonProps} />;
      case 'business_name':
      case 'currency_symbol':
        return <input type="text" {...commonProps} />;
      case 'business_address':
        return <textarea rows="3" {...commonProps} />;
      case 'business_phone':
        return <input type="tel" {...commonProps} />;
      case 'business_email':
        return <input type="email" {...commonProps} />;
      default:
        return <input type="text" {...commonProps} />;
    }
  };
  // --- Tax Rates Fetch/CRUD ---
  const fetchTaxRates = useCallback(async () => {
    setLoading(true); // Reusing general loading for simplicity, could separate
    setError('');
    try {
      const response = await api.get('/tax-rates');
      if (response.data.success) {
        setTaxRates(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch tax rates.');
      }
    } catch (err) {
      console.error('Failed to fetch tax rates:', err);
      setError(err.response?.data?.message || 'Failed to load tax rates.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleTaxFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setTaxFormData(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
  };

  const handleAddEditTax = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');
    setError('');

    try {
      if (editingTaxRate) {
        await api.put(`/tax-rates/${editingTaxRate.id}`, taxFormData);
        setSuccessMessage('Tax rate updated successfully!');
      } else {
        await api.post('/tax-rates', taxFormData);
        setSuccessMessage('Tax rate created successfully!');
      }
      setShowAddEditTaxModal(false);
      setEditingTaxRate(null);
      resetTaxForm();
      fetchTaxRates();
    } catch (err) {
      console.error('Failed to save tax rate:', err);
      setError(err.response?.data?.message || 'Failed to save tax rate.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetTaxForm = () => {
    setTaxFormData({
      name: '',
      rate: 0.00,
      is_default: false,
      is_active: true,
      description: ''
    });
    setError(''); // Clear error on form reset
  };

  const handleEditTax = (tax) => {
    setEditingTaxRate(tax);
    setTaxFormData({
      name: tax.name,
      rate: tax.rate,
      is_default: tax.is_default,
      is_active: tax.is_active,
      description: tax.description || ''
    });
    setShowAddEditTaxModal(true);
  };

  const handleDeleteTax = async (id) => {
    if (!window.confirm('Are you sure you want to delete this tax rate? This cannot be undone.')) return;
    setIsSaving(true);
    setSuccessMessage('');
    setError('');
    try {
      await api.delete(`/tax-rates/${id}`);
      setSuccessMessage('Tax rate deleted successfully!');
      fetchTaxRates();
    } catch (err) {
      console.error('Failed to delete tax rate:', err);
      setError(err.response?.data?.message || 'Failed to delete tax rate.');
    } finally {
      setIsSaving(false);
    }
  };


  // --- Discount Rules Fetch/CRUD ---
  const fetchDiscountRules = useCallback(async () => {
    setLoading(true); // Reusing general loading for simplicity
    setError('');
    try {
      const response = await api.get('/discount-rules');
      if (response.data.success) {
        setDiscountRules(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch discount rules.');
      }
    } catch (err) {
      console.error('Failed to fetch discount rules:', err);
      setError(err.response?.data?.message || 'Failed to load discount rules.');
    } finally {
      setLoading(false);
    }
  }, []);

  const handleDiscountFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setDiscountFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : (name === 'value' || name === 'min_purchase_amount' ? parseFloat(value) : value)
    }));
  };

  const handleAddEditDiscount = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    setSuccessMessage('');
    setError('');

    try {
      // Validate dates
      if (discountFormData.start_date && discountFormData.end_date && moment(discountFormData.start_date).isAfter(moment(discountFormData.end_date))) {
        setError('Start date cannot be after end date.');
        setIsSaving(false);
        return;
      }

      if (editingDiscountRule) {
        await api.put(`/discount-rules/${editingDiscountRule.id}`, discountFormData);
        setSuccessMessage('Discount rule updated successfully!');
      } else {
        await api.post('/discount-rules', discountFormData);
        setSuccessMessage('Discount rule created successfully!');
      }
      setShowAddEditDiscountModal(false);
      setEditingDiscountRule(null);
      resetDiscountForm();
      fetchDiscountRules();
    } catch (err) {
      console.error('Failed to save discount rule:', err);
      setError(err.response?.data?.message || 'Failed to save discount rule.');
    } finally {
      setIsSaving(false);
    }
  };

  const resetDiscountForm = () => {
    setDiscountFormData({
      name: '',
      code: '',
      type: 'percentage',
      value: 0.00,
      min_purchase_amount: 0.00,
      applies_to: 'all_products',
      is_active: true,
      start_date: '',
      end_date: '',
      description: ''
    });
    setError(''); // Clear error on form reset
  };

  const handleEditDiscount = (discount) => {
    setEditingDiscountRule(discount);
    setDiscountFormData({
      name: discount.name,
      code: discount.code || '',
      type: discount.type,
      value: discount.value,
      min_purchase_amount: discount.min_purchase_amount,
      applies_to: discount.applies_to,
      is_active: discount.is_active,
      start_date: discount.start_date ? moment(discount.start_date).format('YYYY-MM-DD') : '',
      end_date: discount.end_date ? moment(discount.end_date).format('YYYY-MM-DD') : '',
      description: discount.description || ''
    });
    setShowAddEditDiscountModal(true);
  };

  const handleDeleteDiscount = async (id) => {
    if (!window.confirm('Are you sure you want to delete this discount rule? This cannot be undone.')) return;
    setIsSaving(true);
    setSuccessMessage('');
    setError('');
    try {
      await api.delete(`/discount-rules/${id}`);
      setSuccessMessage('Discount rule deleted successfully!');
      fetchDiscountRules();
    } catch (err) {
      console.error('Failed to delete discount rule:', err);
      setError(err.response?.data?.message || 'Failed to delete discount rule.');
    } finally {
      setIsSaving(false);
    }
  };

  // --- Backup Functions --- // <-- NEW CODE
  const fetchBackups = useCallback(async () => {
    setListBackupsLoading(true);
    setBackupError('');
    try {
      const response = await api.get('/settings/backups');
      if (response.data.success) {
        setBackupList(response.data.data);
      } else {
        setBackupError(response.data.message || 'Failed to fetch backup list.');
      }
    } catch (err) {
      console.error('Failed to fetch backup list:', err);
      setBackupError(err.response?.data?.message || 'Error fetching backup list.');
    } finally {
      setListBackupsLoading(false);
    }
  }, []);

  const handleCreateBackup = async () => {
    if (!window.confirm('Are you sure you want to create a new database backup? This may take a moment.')) return;
    setBackupLoading(true);
    setSuccessMessage('');
    setBackupError('');
    try {
      const response = await api.post('/settings/backup');
      if (response.data.success) {
        setSuccessMessage('Database backup created successfully!');
        fetchBackups(); // Refresh the list of backups
      } else {
        setBackupError(response.data.message || 'Failed to create database backup.');
      }
    } catch (err) {
      console.error('Failed to create backup:', err);
      setBackupError(err.response?.data?.message || 'Error creating database backup.');
    } finally {
      setBackupLoading(false);
    }
  };
  // END NEW CODE

  // --- Main useEffect to fetch data based on active tab ---
  useEffect(() => {
    if (activeTab === 'general') {
      fetchGeneralSettings();
    } else if (activeTab === 'taxRates') {
      fetchTaxRates();
    } else if (activeTab === 'discountRules') {
      fetchDiscountRules();
    } else if (activeTab === 'backup') { // <-- ADD THIS
      fetchBackups();
    }
  }, [activeTab, fetchGeneralSettings, fetchTaxRates, fetchDiscountRules, fetchBackups]); // <-- ADD fetchBackups to dependencies

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
          <h1 className="text-2xl font-bold text-gray-900">System Settings</h1>
          <p className="text-gray-600">Configure business information, taxes, and discounts</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}
      {successMessage && (
        <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Success!</strong>
          <span className="block sm:inline"> {successMessage}</span>
        </div>
      )}

      {/* Tabs for Settings Categories */}
      <div className="flex border-b border-gray-200 mb-6">
        <button
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'general' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('general')}
        >
          General
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'taxRates' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('taxRates')}
        >
          Tax Rates
        </button>
        <button
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'discountRules' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('discountRules')}
        >
          Discount Rules
        </button>
        <button // <-- ADD THIS NEW TAB BUTTON // <-- NEW CODE
          className={`py-2 px-4 text-sm font-medium ${activeTab === 'backup' ? 'border-b-2 border-indigo-600 text-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
          onClick={() => setActiveTab('backup')}
        >
          Backup & Restore
        </button>
        {/* END NEW CODE */}
      </div>

      {loading ? (
        <div className="text-center py-12">Loading settings...</div>
      ) : (
        <>
          {/* General Settings Tab Content */}
          {activeTab === 'general' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Store Information</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {generalSettings.map(setting => (
                  <div key={setting.key_name} className="flex items-center justify-between p-3 border-b border-gray-200 last:border-b-0">
                    <div className="flex-1 mr-4">
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        {setting.description || setting.key_name.replace(/_/g, ' ').replace(/\b\w/g, char => char.toUpperCase())}
                      </label>
                      {renderGeneralSettingInput(setting)}
                    </div>
                    <button
                      onClick={() => handleUpdateGeneralSetting(setting.key_name)}
                      disabled={isSaving}
                      className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isSaving ? 'Saving...' : 'Save'}
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tax Rates Tab Content */}
          {activeTab === 'taxRates' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Manage Tax Rates</h2>
                <button
                  onClick={() => { setEditingTaxRate(null); resetTaxForm(); setShowAddEditTaxModal(true); }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  + Add Tax Rate
                </button>
              </div>

              {/* Tax Rates Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Rate</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Default</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Active</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Description</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {taxRates.length === 0 ? (
                      <tr><td colSpan="6" className="px-4 py-3 text-center text-sm text-gray-500">No tax rates found.</td></tr>
                    ) : (
                      taxRates.map(tax => (
                        <tr key={tax.id}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{tax.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-500 text-right">{(tax.rate * 100).toFixed(2)}%</td>
                          <td className="px-4 py-2 text-center">
                            {tax.is_default ? <span className="text-green-500">✅</span> : <span className="text-gray-400">➖</span>}
                          </td>
                          <td className="px-4 py-2 text-center">
                            {tax.is_active ? <span className="text-green-500">✅</span> : <span className="text-red-500">❌</span>}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500 max-w-xs">{tax.description || 'N/A'}</td>
                          <td className="px-4 py-2 text-center text-sm space-x-2">
                            <button onClick={() => handleEditTax(tax)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                            <button onClick={() => handleDeleteTax(tax.id)} className="text-red-600 hover:text-red-900">Delete</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Discount Rules Tab Content */}
          {activeTab === 'discountRules' && (
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-gray-900">Manage Discount Rules</h2>
                <button
                  onClick={() => { setEditingDiscountRule(null); resetDiscountForm(); setShowAddEditDiscountModal(true); }}
                  className="bg-indigo-600 text-white px-4 py-2 rounded-lg hover:bg-indigo-700"
                >
                  + Add Discount Rule
                </button>
              </div>

              {/* Discount Rules Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Code</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Type & Value</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Min Purchase</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Active</th>
                      <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Validity</th>
                      <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {discountRules.length === 0 ? (
                      <tr><td colSpan="7" className="px-4 py-3 text-center text-sm text-gray-500">No discount rules found.</td></tr>
                    ) : (
                      discountRules.map(discount => (
                        <tr key={discount.id}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{discount.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{discount.code || 'N/A'}</td>
                          <td className="px-4 py-2 text-sm text-gray-900">
                            {discount.type === 'percentage' ? `${(discount.value * 100).toFixed(2)}%` : formatCurrency(discount.value)} {discount.type === 'fixed_amount' ? 'Fixed' : 'Percentage'}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">{formatCurrency(discount.min_purchase_amount)}</td>
                          <td className="px-4 py-2 text-center">
                            {discount.is_active ? <span className="text-green-500">✅</span> : <span className="text-red-500">❌</span>}
                          </td>
                          <td className="px-4 py-2 text-sm text-gray-500">
                            {discount.start_date && discount.end_date ?
                              `${moment(discount.start_date).format('MMM DD')} - ${moment(discount.end_date).format('MMM DD')}` : 'Always Valid'}
                          </td>
                          <td className="px-4 py-2 text-center text-sm space-x-2">
                            <button onClick={() => handleEditDiscount(discount)} className="text-indigo-600 hover:text-indigo-900">Edit</button>
                            <button onClick={() => handleDeleteDiscount(discount.id)} className="text-red-600 hover:text-red-900">Delete</button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Backup & Restore Tab Content */} {/* <-- NEW CODE */}
          {activeTab === 'backup' && (
            <div className="bg-white rounded-lg shadow p-6">
              <h2 className="text-xl font-bold text-gray-900 mb-6">Database Backups</h2>
              <p className="text-gray-600 mb-4">Create and manage snapshots of your database.</p>

              <div className="mb-6 flex justify-end">
                <button
                  onClick={handleCreateBackup}
                  disabled={backupLoading}
                  className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  {backupLoading ? (
                    <span className="flex items-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Creating Backup...
                    </span>
                  ) : (
                    <>
                      <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4-4v8" /></svg>
                      Create New Backup
                    </>
                  )}
                </button>
              </div>

              {backupError && (
                <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                  <strong className="font-bold">Error!</strong>
                  <span className="block sm:inline"> {backupError}</span>
                </div>
              )}

              {listBackupsLoading ? (
                <div className="text-center py-12">Loading backups...</div>
              ) : backupList.length === 0 ? (
                <div className="text-center py-12 text-gray-500">No backups found.</div>
              ) : (
                <div className="overflow-x-auto bg-gray-50 rounded-lg border">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">File Name</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Date</th>
                        <th className="px-4 py-2 text-right text-xs font-medium text-gray-500 uppercase">Size</th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {backupList.map(backup => (
                        <tr key={backup.name}>
                          <td className="px-4 py-2 text-sm font-medium text-gray-900">{backup.name}</td>
                          <td className="px-4 py-2 text-sm text-gray-500">{moment(backup.date).format('YYYY-MM-DD HH:mm')}</td>
                          <td className="px-4 py-2 text-sm text-gray-500 text-right">{(backup.size / (1024 * 1024)).toFixed(2)} MB</td>
                          <td className="px-4 py-2 text-center text-sm space-x-2">
                            {/* Download button (requires backend endpoint) */}
                            {/* <button className="text-green-600 hover:text-green-900">Download</button> */}
                            {/* Restore button (highly sensitive, requires careful implementation) */}
                            {/* <button className="text-yellow-600 hover:text-yellow-900">Restore</button> */}
                            {/* Delete backup file (requires backend endpoint) */}
                            {/* <button className="text-red-600 hover:text-red-900">Delete</button> */}
                            <span className="text-gray-400 text-xs"> (Future actions) </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}
          {/* END NEW CODE */}
        </>
      )}

      {/* Add/Edit Tax Rate Modal */}
      {showAddEditTaxModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingTaxRate ? 'Edit Tax Rate' : 'Add New Tax Rate'}
              </h2>
              {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">{error}</div>}
              <form onSubmit={handleAddEditTax} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={taxFormData.name}
                    onChange={handleTaxFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Rate (%) *</label>
                  <input
                    type="number"
                    name="rate"
                    step="0.0001" // Allow for precise decimal rates
                    min="0"
                    max="1" // Rate should be between 0 and 1 (e.g., 0.16)
                    value={taxFormData.rate}
                    onChange={handleTaxFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">Enter as decimal (e.g., 0.16 for 16%)</p>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="is_default"
                    checked={taxFormData.is_default}
                    onChange={handleTaxFormChange}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label className="text-sm font-medium text-gray-700">Set as Default</label>
                </div>
                <div className="flex items-center space-x-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={taxFormData.is_active}
                    onChange={handleTaxFormChange}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label className="text-sm font-medium text-gray-700">Is Active</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    rows="2"
                    value={taxFormData.description}
                    onChange={handleTaxFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  ></textarea>
                </div>
                <div className="flex gap-3 justify-end pt-4">
                  <button
                    type="button"
                    onClick={() => { setShowAddEditTaxModal(false); setEditingTaxRate(null); resetTaxForm(); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : (editingTaxRate ? 'Update Tax Rate' : 'Create Tax Rate')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Add/Edit Discount Rule Modal */}
      {showAddEditDiscountModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-lg w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">
                {editingDiscountRule ? 'Edit Discount Rule' : 'Add New Discount Rule'}
              </h2>
              {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">{error}</div>}
              <form onSubmit={handleAddEditDiscount} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Name *</label>
                  <input
                    type="text"
                    name="name"
                    value={discountFormData.name}
                    onChange={handleDiscountFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Code (Optional)</label>
                  <input
                    type="text"
                    name="code"
                    value={discountFormData.code}
                    onChange={handleDiscountFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Unique code for application (e.g., SUMMER20)</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Discount Type *</label>
                  <select
                    name="type"
                    value={discountFormData.type}
                    onChange={handleDiscountFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  >
                    <option value="percentage">Percentage</option>
                    <option value="fixed_amount">Fixed Amount</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Value *</label>
                  <input
                    type="number"
                    name="value"
                    step="0.01"
                    min="0"
                    value={discountFormData.value}
                    onChange={handleDiscountFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    required
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    {discountFormData.type === 'percentage' ? 'Enter as decimal (e.g., 0.10 for 10%)' : 'Enter KES amount (e.g., 50.00 for KES 50)'}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Minimum Purchase Amount</label>
                  <input
                    type="number"
                    name="min_purchase_amount"
                    step="0.01"
                    min="0"
                    value={discountFormData.min_purchase_amount}
                    onChange={handleDiscountFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Applies To</label>
                  <select
                    name="applies_to"
                    value={discountFormData.applies_to}
                    onChange={handleDiscountFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  >
                    <option value="all_products">All Products</option>
                    {/* Placeholder for specific categories/products - requires more backend/frontend logic */}
                    {/* <option value="specific_categories">Specific Categories</option> */}
                    {/* <option value="specific_products">Specific Products</option> */}
                  </select>
                </div>
                <div className="flex items-center space-x-2 col-span-2">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={discountFormData.is_active}
                    onChange={handleDiscountFormChange}
                    className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                  />
                  <label className="text-sm font-medium text-gray-700">Is Active</label>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Start Date</label>
                  <input
                    type="date"
                    name="start_date"
                    value={discountFormData.start_date}
                    onChange={handleDiscountFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">End Date</label>
                  <input
                    type="date"
                    name="end_date"
                    value={discountFormData.end_date}
                    onChange={handleDiscountFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                  <textarea
                    name="description"
                    rows="2"
                    value={discountFormData.description}
                    onChange={handleDiscountFormChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  ></textarea>
                </div>
                <div className="flex gap-3 justify-end pt-4 col-span-2">
                  <button
                    type="button"
                    onClick={() => { setShowAddEditDiscountModal(false); setEditingDiscountRule(null); resetDiscountForm(); }}
                    className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50"
                  >
                    {isSaving ? 'Saving...' : (editingDiscountRule ? 'Update Discount Rule' : 'Create Discount Rule')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SettingsPage;