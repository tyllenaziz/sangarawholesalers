import React, { useRef, useState, useEffect, useCallback } from 'react'; // ADD useState, useEffect, useCallback
import moment from 'moment';
import { useAuth } from '../contexts/AuthContext';
import api from '../services/api'; // ADD this import

const ReceiptModal = ({ isOpen, onClose, saleDetails }) => {
  const receiptRef = useRef();
  const { user } = useAuth();

  // New state for dynamic business settings
  const [businessSettings, setBusinessSettings] = useState({
    business_name: process.env.REACT_APP_NAME || 'Sangara Wholesalers',
    business_address: '123 Market Street, Nairobi',
    business_phone: '+254 7XX XXX XXX',
    business_slogan: 'Your Reliable Wholesale Partner', // Add to settings table if desired
    currency_symbol: 'KES'
  });

  const fetchBusinessSettings = useCallback(async () => {
    try {
      const response = await api.get('/settings');
      if (response.data.success) {
        const newSettings = {};
        response.data.data.forEach(setting => {
          newSettings[setting.key_name] = setting.key_value;
        });
        setBusinessSettings(prev => ({ ...prev, ...newSettings }));
      }
    } catch (error) {
      console.error('Failed to fetch business settings for receipt:', error);
      // Fallback to default/hardcoded if fetching fails
    }
  }, []);

  useEffect(() => {
    if (isOpen) { // Fetch settings only when the modal is about to open
      fetchBusinessSettings();
    }
  }, [isOpen, fetchBusinessSettings]); // Fetch every time modal opens

  if (!isOpen || !saleDetails) return null;

  const {
    invoice_number,
    customer_name,
    created_at,
    items,
    subtotal,
    discount,
    tax,
    total,
    amount_paid,
    change_amount,
    payment_method,
  } = saleDetails;

  const handlePrint = () => {
    // Get the content of the receipt div
    const printContent = receiptRef.current.innerHTML;

    // Open a new window for printing
    const printWindow = window.open('', '', 'height=600,width=800');
    printWindow.document.write('<html><head><title>Receipt</title>');
    // Include some basic inline styles for print layout
    printWindow.document.write('<style>');
    printWindow.document.write(`
      body { font-family: sans-serif; margin: 0; padding: 0; }
      .receipt-container {
        width: 80mm; /* Standard thermal printer width */
        margin: 0 auto;
        padding: 5mm;
        font-size: 10pt;
      }
      .text-xs { font-size: 0.75rem; }
      .text-sm { font-size: 0.875rem; }
      .text-md { font-size: 1rem; }
      .text-lg { font-size: 1.125rem; }
      .font-bold { font-weight: 700; }
      .text-center { text-align: center; }
      .border-b { border-bottom: 1px dashed #ccc; }
      .pb-2 { padding-bottom: 0.5rem; }
      .mb-2 { margin-bottom: 0.5rem; }
      .mb-4 { margin-bottom: 1rem; }
      .mt-4 { margin-top: 1rem; }
      .flex { display: flex; }
      .justify-between { justify-content: space-between; }
      .items-center { align-items: center; }
      .w-full { width: 100%; }
      /* Hide elements not meant for print */
      .no-print { display: none !important; }
    `);
    printWindow.document.write('</style></head><body>');
    printWindow.document.write('<div class="receipt-container">'); // Wrap content in a container for specific print styling
    printWindow.document.write(printContent);
    printWindow.document.write('</div></body></html>');
    printWindow.document.close();
    printWindow.focus(); // Focus the new window
    printWindow.print(); // Trigger the print dialog
    printWindow.close(); // Close the print window after printing
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <div className="bg-white rounded-lg max-w-xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
        {/* Receipt Content - This div is what we want to print */}
        <div ref={receiptRef} className="p-6 print:p-0 print:text-black"> {/* Added ref for printing */}
          <div className="text-center mb-6 print:mb-3">
           <h2 className="text-2xl font-bold text-gray-900 print:text-xl print:font-extrabold">{businessSettings.business_name}</h2>
            <p className="text-sm text-gray-600 print:text-xs">{businessSettings.business_slogan}</p>
            <p className="text-sm text-gray-600 print:text-xs">{businessSettings.business_address}</p>
            <p className="text-sm text-gray-600 print:text-xs">{businessSettings.business_phone}</p>
            <p className="text-xs text-gray-500 mt-2 print:mt-1">------------------------------------------</p>
            <h3 className="text-xl font-semibold mt-2 print:text-lg">SALES RECEIPT</h3>
            <p className="text-sm mt-1 print:text-xs">Invoice #: <span className="font-medium">{invoice_number}</span></p>
            <p className="text-sm print:text-xs">Date: <span className="font-medium">{moment(created_at).format('YYYY-MM-DD HH:mm:ss')}</span></p>
            <p className="text-sm print:text-xs">Cashier: <span className="font-medium">{saleDetails.cashier_name || user?.full_name || 'N/A'}</span></p>
            {customer_name && <p className="text-sm print:text-xs">Customer: <span className="font-medium">{customer_name}</span></p>}
            <p className="text-xs text-gray-500 mt-2 print:mt-1">------------------------------------------</p>
          </div>

          <div className="mb-6 print:mb-3">
            <table className="min-w-full text-left text-sm print:text-xs">
              <thead>
                <tr className="border-b border-gray-300 print:border-gray-500">
                  <th className="py-2">Item</th>
                  <th className="py-2 text-right">Qty</th>
                  <th className="py-2 text-right">Price</th>
                  <th className="py-2 text-right">Total</th>
                </tr>
              </thead>
              <tbody>
                {items && items.map((item) => (
                  <tr key={item.id}>
                    <td className="py-1">{item.product_name}</td>
                    <td className="py-1 text-right">{item.quantity}</td>
                    <td className="py-1 text-right">{(item.unit_price).toLocaleString()}</td>
                    <td className="py-1 text-right">{(item.subtotal).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="text-xs text-gray-500 mt-2 print:mt-1">------------------------------------------</p>
          </div>

          <div className="space-y-1 text-right text-sm print:text-xs mb-6 print:mb-3">
            <div className="flex justify-between">
              <span>Subtotal:</span>
              <span className="font-medium">{businessSettings.currency_symbol} {subtotal.toLocaleString()}</span> {/* UPDATED */}
            </div>
            {discount > 0 && (
              <div className="flex justify-between">
                <span>Discount:</span>
                <span className="font-medium">- {businessSettings.currency_symbol} {discount.toLocaleString()}</span> {/* UPDATED */}
              </div>
            )}
            <div className="flex justify-between">
              <span>Tax (VAT 16%):</span>
              <span className="font-medium">{businessSettings.currency_symbol} {tax.toLocaleString()}</span> {/* UPDATED */}
            </div>
            <p className="text-xs text-gray-500 mt-2 print:mt-1">------------------------------------------</p>
            <div className="flex justify-between text-lg font-bold print:text-base">
              <span>GRAND TOTAL:</span>
              <span>{businessSettings.currency_symbol} {total.toLocaleString()}</span> {/* UPDATED */}
            </div>
          </div>

          <div className="space-y-1 text-sm print:text-xs text-gray-700 print:text-black">
            <div className="flex justify-between">
              <span>Payment Method:</span>
              <span className="font-medium capitalize">{payment_method}</span>
            </div>
            <div className="flex justify-between">
              <span>Amount Paid:</span>
              <span className="font-medium">{businessSettings.currency_symbol} {amount_paid.toLocaleString()}</span> {/* UPDATED */}
            </div>
            {change_amount > 0 && (
              <div className="flex justify-between text-base print:text-sm font-semibold">
                <span>Change Given:</span>
                <span>{businessSettings.currency_symbol} {change_amount.toLocaleString()}</span> {/* UPDATED */}
              </div>
            )}
            {amount_paid < total && (
              <div className="flex justify-between text-base print:text-sm font-semibold text-red-600">
                <span>Balance Due:</span>
                <span>{businessSettings.currency_symbol} {(total - amount_paid).toLocaleString()}</span> {/* UPDATED */}
              </div>
            )}
          </div>

          <div className="text-center mt-6 text-sm print:text-xs print:mt-3">
            <p>Thanks for shopping with sangara!</p>
            <p>Visit us again soon!</p>
          </div>
        </div>

        {/* Action Buttons (hidden during print) */}
        <div className="p-4 border-t flex justify-end gap-3 print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50"
          >
            Close
          </button>
          <button
            onClick={handlePrint} // <--- Now uses the native browser print
            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
          >
            Print Receipt
          </button>
        </div>
      </div>
    </div>
  );
};

export default ReceiptModal;