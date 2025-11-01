import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import moment from 'moment';

const ActivityLogsPage = () => {
  const navigate = useNavigate();
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filter states
  const [filterUser, setFilterUser] = useState('');
  const [filterAction, setFilterAction] = useState('');
  const [filterStartDate, setFilterStartDate] = useState('');
  const [filterEndDate, setFilterEndDate] = useState('');
  const [searchTerm, setSearchTerm] = useState(''); // For description/IP/username search

  const [usersForFilter, setUsersForFilter] = useState([]); // To populate user filter dropdown
  const [actionTypesForFilter, setActionTypesForFilter] = useState([]); // To populate action filter dropdown


  const fetchLogs = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = {
        user_id: filterUser || undefined,
        action: filterAction || undefined,
        start_date: filterStartDate || undefined,
        end_date: filterEndDate || undefined,
        search: searchTerm || undefined,
      };
      const response = await api.get('/users/activity-logs', { params });
      if (response.data.success) {
        setLogs(response.data.data);
      } else {
        setError(response.data.message || 'Failed to fetch activity logs.');
      }
    } catch (err) {
      console.error('Failed to fetch activity logs:', err);
      setError(err.response?.data?.message || 'Failed to load activity logs.');
    } finally {
      setLoading(false);
    }
  }, [filterUser, filterAction, filterStartDate, filterEndDate, searchTerm]);

  const fetchUsersAndActions = useCallback(async () => {
    try {
      // Fetch users for the filter dropdown (only admin and inventory_manager roles)
      const usersRes = await api.get('/users', { params: { role: 'admin,inventory_manager,cashier' } }); // Fetch all roles to be flexible
      if (usersRes.data.success) {
        setUsersForFilter(usersRes.data.data);
      }

      // Extract unique action types from current logs (or fetch a predefined list from backend if available)
      // For now, let's derive from available logs, or provide common ones
      const commonActionTypes = [
        'USER_LOGIN', 'USER_LOGOUT', 'USER_REGISTERED', 'USER_CREATED', 'USER_UPDATED',
        'USER_DELETED', 'PASSWORD_CHANGED', 'CATEGORY_CREATED', 'CATEGORY_UPDATED',
        'CATEGORY_DELETED', 'PRODUCT_CREATED', 'PRODUCT_UPDATED', 'STOCK_UPDATED',
        'PRODUCT_DELETED', 'SUPPLIER_CREATED', 'SUPPLIER_UPDATED', 'SUPPLIER_DELETED',
        'SUPPLIER_BALANCE_UPDATED', 'SALE_CREATED', 'PURCHASE_ORDER_CREATED',
        'PURCHASE_ORDER_UPDATED', 'PURCHASE_CANCELED', 'PURCHASE_PAYMENT_RECORDED',
        'STOCK_RECEIVED', 'STOCK_ADJUSTED', 'SETTING_UPDATED'
      ];
      setActionTypesForFilter(Array.from(new Set(commonActionTypes.concat(logs.map(log => log.action)))));

    } catch (err) {
      console.error('Failed to fetch users for filter or action types:', err);
      // Use defaults if API fails
    }
  }, [logs]); // Depend on logs to update action types from current data


  useEffect(() => {
    fetchLogs();
  }, [fetchLogs]);

  useEffect(() => {
    fetchUsersAndActions();
  }, [fetchUsersAndActions]);


  const handleClearFilters = () => {
    setFilterUser('');
    setFilterAction('');
    setFilterStartDate('');
    setFilterEndDate('');
    setSearchTerm('');
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
          <h1 className="text-2xl font-bold text-gray-900">Activity Logs</h1>
          <p className="text-gray-600">Track all user actions in the system</p>
        </div>
      </div>

      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
          <strong className="font-bold">Error!</strong>
          <span className="block sm:inline"> {error}</span>
        </div>
      )}

      {/* Filters Section */}
      <div className="bg-white rounded-lg shadow p-4 mb-6 grid grid-cols-1 md:grid-cols-6 gap-4 items-end">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Search (Desc/User/IP)</label>
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
            placeholder="Search..."
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">User</label>
          <select
            value={filterUser}
            onChange={(e) => setFilterUser(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Users</option>
            {usersForFilter.map(u => <option key={u.id} value={u.id}>{u.full_name} ({u.username})</option>)}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Action Type</label>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">All Actions</option>
            {actionTypesForFilter.sort().map(action => (
              <option key={action} value={action}>{action.replace(/_/g, ' ').toLowerCase()}</option>
            ))}
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
            onClick={fetchLogs}
            className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Apply
          </button>
        </div>
      </div>

      {/* Activity Logs Table */}
      {loading ? (
        <div className="text-center py-12">Loading activity logs...</div>
      ) : (
        <div className="bg-white rounded-lg shadow overflow-hidden">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date & Time</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Description</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">IP Address</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 whitespace-nowrap text-center text-sm text-gray-500">
                    No activity logs found.
                  </td>
                </tr>
              ) : (
                logs.map((log) => (
                  <tr key={log.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {moment(log.created_at).format('YYYY-MM-DD HH:mm:ss')}
                    </td>
                    <td className="px-6 py-4">
                      <div className="text-sm font-medium text-gray-900">{log.full_name}</div>
                      <div className="text-sm text-gray-500">{log.username} ({log.role})</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {log.action.replace(/_/g, ' ')}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 max-w-xs">{log.description}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{log.ip_address || 'N/A'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default ActivityLogsPage;