import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../services/api';
import { debounce } from 'lodash';
import CustomerFormModal from '../components/CustomerFormModal';
import ReceiptModal from '../components/ReceiptModal';
import SuccessAlert from '../components/SuccessAlert'; // <-- ADD THIS LINE

const POSPage = () => {
  const navigate = useNavigate();
  
  // Refs for focusing inputs
  const productSearchInputRef = useRef(null);
  const customerSearchInputRef = useRef(null);

  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState([]);
  const [searchTerm, setSearchTerm] = useState(''); // For product search
  
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [amountPaid, setAmountPaid] = useState('');
  const [manualDiscount, setManualDiscount] = useState(0); // Cart-level manual discount
  const [discountCode, setDiscountCode] = useState(''); // New state for discount code input
  const [appliedDiscountRule, setAppliedDiscountRule] = useState(null); // Stores the fetched discount rule
  const [discountCodeError, setDiscountCodeError] = useState(''); // Error for discount code application
  const [successMessage, setSuccessMessage] = useState(''); // Success message for discount code
// Global Success Alert States (NEW)
  const [showPaymentSuccessAlert, setShowPaymentSuccessAlert] = useState(false);
  const [paymentSuccessMessage, setPaymentSuccessMessage] = useState('');
  const [defaultTaxRate, setDefaultTaxRate] = useState(0.16); // Default fallback, will be fetched from settings

  // Loyalty Points Redemption states
  const [customerLoyaltyPoints, setCustomerLoyaltyPoints] = useState(0); // Available points for selected customer
  const [redeemLoyaltyPoints, setRedeemLoyaltyPoints] = useState(false); // Toggle to redeem points
  const loyaltyPointValue = 1; // KES value per 1 loyalty point (e.g., 1 point = KES 1)

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [processing, setProcessing] = useState(false);

  // M-Pesa Payment States
  const [mpesaPhoneNumber, setMpesaPhoneNumber] = useState('');
  const [mpesaTransactionStatus, setMpesaTransactionStatus] = useState(null); // 'INITIATING', 'PENDING', 'SUCCESS', 'FAILED'
  const [mpesaTrackingId, setMpesaTrackingId] = useState(null); // MerchantRequestID from STK push
  const [mpesaShortcode, setMpesaShortcode] = useState(null); // M-Pesa shortcode from settings
      const [mpesaPhoneError, setMpesaPhoneError] = useState(''); // <-- ADD THIS LINE (for red error message)

  // M-Pesa Polling States (NEW)
  const [mpesaPollingInterval, setMpesaPollingInterval] = useState(null); // To store the interval ID
  const [mpesaPollingAttempts, setMpesaPollingAttempts] = useState(0);   // To count attempts
  const MAX_POLLING_ATTEMPTS = 15; // Max 15 attempts * 2 seconds = 30 seconds wait

  // Customer selection states
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false); // For adding new customer

  // Receipt states
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [lastSaleDetails, setLastSaleDetails] = useState(null);

  // Helper to format currency
  const formatCurrency = (value) => `KES ${parseFloat(value || 0).toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  // --- Data Fetching ---
  const fetchProducts = async () => {
    try {
      const response = await api.get('/products?is_active=true');
      if (response.data.success) {
        setProducts(response.data.data);
      }
    } catch (error) {
      console.error('Failed to fetch products:', error);
    }
  };

  const fetchDefaultTaxRate = useCallback(async () => {
    try {
      const response = await api.get('/tax-rates', { params: { is_default: true, is_active: true } });
      if (response.data.success && response.data.data.length > 0) {
        setDefaultTaxRate(parseFloat(response.data.data[0].rate));
      } else {
        console.warn('No active default tax rate found, falling back to 16%.');
        setDefaultTaxRate(0.16);
      }
    } catch (error) {
      console.error('Failed to fetch default tax rate:', error);
      setDefaultTaxRate(0.16); // Fallback
    }
  }, []);

  // --- Discount Code Handlers ---
  const applyDiscountCode = async () => {
    setDiscountCodeError('');
    setAppliedDiscountRule(null);
    setSuccessMessage('');

    if (!discountCode) {
      setDiscountCodeError('Please enter a discount code.');
      return;
    }

    try {
      const response = await api.get(`/discount-rules`, { params: { code: discountCode, active_only: true } });
      if (response.data.success && response.data.data.length > 0) {
        const rule = response.data.data[0];
        if (calculateSubtotal() >= rule.min_purchase_amount) {
          setAppliedDiscountRule(rule);
          setSuccessMessage('Discount code applied!');
        } else {
          setDiscountCodeError(`Minimum purchase of ${formatCurrency(rule.min_purchase_amount)} required.`);
        }
      } else {
        setDiscountCodeError('Invalid or expired discount code.');
      }
    } catch (error) {
      console.error('Failed to apply discount code:', error);
      setDiscountCodeError(error.response?.data?.message || 'Error applying discount code.');
    }
  };

  const removeDiscountCode = () => {
    setDiscountCode('');
    setAppliedDiscountRule(null);
    setDiscountCodeError('');
    setSuccessMessage('');
  };

  // --- Main useEffect to fetch initial data ---
  useEffect(() => {
    fetchProducts();
    fetchDefaultTaxRate();
    productSearchInputRef.current?.focus();
  }, [fetchDefaultTaxRate]); // fetchDefaultTaxRate is a dependency of this effect

  // eslint-disable-next-line react-hooks/exhaustive-deps
  const fetchCustomers = useCallback(
    debounce(async (search) => {
      if (!search || search.length < 2) {
        setCustomerSearchResults([]);
        return;
      }
      try {
        const response = await api.get('/customers', { params: { search } });
        if (response.data.success) {
          setCustomerSearchResults(response.data.data);
        }
      } catch (error) {
        console.error('Failed to fetch customers for search:', error);
        setCustomerSearchResults([]);
      }
    }, 300),
    [] // Empty dependency array as debounce handles function stability
  );

  // --- M-Pesa Phone Handler (NEW) ---
  const handleMpesaPhoneChange = (e) => {
    const input = e.target.value;
    // Only allow digits
    const numericInput = input.replace(/\D/g, '');
    
    // Ensure it always starts with 254
    let formattedInput = numericInput;
    if (!formattedInput.startsWith('254')) {
        formattedInput = '254' + numericInput.replace(/^0+/, ''); // Remove leading zeros if pasted, then prepend 254
    }

    // Limit to 12 digits (254 + 9 digits)
    if (formattedInput.length > 12) {
        formattedInput = formattedInput.substring(0, 12);
    }

    setMpesaPhoneNumber(formattedInput);

    // Real-time validation
    if (formattedInput.length === 12 && formattedInput.startsWith('2547')) {
        setMpesaPhoneError(''); // Valid format
    } else if (formattedInput.length > 3) { // Only show error if they've started typing beyond '254'
         setMpesaPhoneError('Invalid format. Must be 12 digits starting with 2547 (e.g., 254712345678).');
    } else {
        setMpesaPhoneError(''); // Clear error if just '254'
    }
  };
  // --- Customer Handlers ---
  const handleCustomerSearchChange = (e) => {
    const term = e.target.value;
    setCustomerSearchTerm(term);
    fetchCustomers(term);
  };

  const selectCustomer = async (customer) => {
    setCustomerSearchTerm('');
    setCustomerSearchResults([]);
    setRedeemLoyaltyPoints(false); // Reset redemption toggle when customer changes

    try {
      const response = await api.get(`/customers/${customer.id}`); // Fetch full customer details
      if (response.data.success) {
        setSelectedCustomer(response.data.data);
        setCustomerLoyaltyPoints(response.data.data.loyalty_points || 0);
      } else {
        console.error('Failed to fetch detailed customer for POS:', response.data.message);
        setSelectedCustomer(customer); // Fallback to basic customer if detailed fetch fails
        setCustomerLoyaltyPoints(customer.loyalty_points || 0); // Use basic points as fallback
      }
    } catch (error) {
      console.error('Error fetching detailed customer for POS:', error);
      setSelectedCustomer(customer); // Fallback
      setCustomerLoyaltyPoints(customer.loyalty_points || 0); // Fallback
    }
  };

  const clearSelectedCustomer = () => {
    setSelectedCustomer(null);
    setCustomerLoyaltyPoints(0);
    setRedeemLoyaltyPoints(false);
  };

  const handleAddCustomerInPos = () => {
    setShowCustomerModal(true);
  };

  const handleCustomerModalClose = useCallback(() => {
    setShowCustomerModal(false);
    if (customerSearchTerm) {
      fetchCustomers(customerSearchTerm);
    }
    customerSearchInputRef.current?.focus();
  }, [customerSearchTerm, fetchCustomers]);

  const handleCustomerSaveSuccess = useCallback(() => {
    console.log('Customer saved successfully!');
    handleCustomerModalClose();
  }, [handleCustomerModalClose]);

  // --- Cart & Products Handlers ---
  const handleProductSearch = (value) => {
    setSearchTerm(value);
  };

  const addToCart = (product) => {
    const existing = cart.find(item => item.id === product.id);
    
    if (existing) {
      if (existing.quantity >= product.quantity_in_stock) {
        alert('Insufficient stock!');
        return;
      }
      setCart(cart.map(item =>
        item.id === product.id
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      if (product.quantity_in_stock <= 0) {
        alert('Product out of stock!');
        return;
      }
      setCart([...cart, {
        id: product.id,
        name: product.name,
        price: parseFloat(product.selling_price),
        cost: parseFloat(product.cost_price),
        quantity: 1,
        max_stock: product.quantity_in_stock
      }]);
    }
    setSearchTerm('');
    productSearchInputRef.current?.focus();
  };

  const updateQuantity = (productId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(productId);
      return;
    }

    const productInCart = cart.find(item => item.id === productId);
    if (newQuantity > productInCart.max_stock) {
      alert('Insufficient stock!');
      return;
    }

    setCart(cart.map(item =>
      item.id === productId
        ? { ...item, quantity: newQuantity }
        : item
    ));
  };

  const removeFromCart = (productId) => {
    setCart(cart.filter(item => item.id !== productId));
  };

  const cleanupPosState = () => {
    setCart([]);
    setManualDiscount(0);
    setDiscountCode('');
    setAppliedDiscountRule(null);
    setDiscountCodeError('');
    setSuccessMessage('');
    setAmountPaid('');
    setSelectedCustomer(null);
    setCustomerLoyaltyPoints(0);
    setRedeemLoyaltyPoints(false);
    setMpesaPhoneNumber('');
    setMpesaTransactionStatus(null);
    setMpesaTrackingId(null);
    setMpesaShortcode(null);

    // M-Pesa Polling Cleanup
    if (mpesaPollingInterval) {
      clearInterval(mpesaPollingInterval);
      setMpesaPollingInterval(null);
    }
    setMpesaPollingAttempts(0);

    // Global Success Alert Cleanup (NEW)
    setPaymentSuccessMessage(''); // <-- ADD THIS
    setShowPaymentSuccessAlert(false); // <-- ADD THIS

    setShowPaymentModal(false);
    fetchProducts();
  };

  const clearCart = () => {
    if (window.confirm('Clear all items from cart?')) {
      cleanupPosState(); // Use centralized cleanup
    }
  };

  // --- Calculation Functions ---
  const calculateSubtotal = () => {
    return cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
  };

  const calculateTax = () => {
    const subtotal = calculateSubtotal();
    return subtotal * defaultTaxRate;
  };

  // Helper to calculate total discount from manual input and discount code (excluding loyalty)
  const calculateDiscountWithoutLoyalty = () => {
    let subtotalForDiscount = calculateSubtotal();
    let calculatedDiscount = manualDiscount;

    if (appliedDiscountRule && subtotalForDiscount >= appliedDiscountRule.min_purchase_amount) {
      if (appliedDiscountRule.type === 'percentage') {
        calculatedDiscount += subtotalForDiscount * appliedDiscountRule.value;
      } else if (appliedDiscountRule.type === 'fixed_amount') {
        calculatedDiscount += appliedDiscountRule.value;
      }
    }
    return Math.min(calculatedDiscount, subtotalForDiscount); // Cap at subtotal
  };

  const calculateTotal = () => {
    const subtotal = calculateSubtotal();
    const tax = calculateTax();
    let totalNonLoyaltyDiscount = calculateDiscountWithoutLoyalty();

    // Calculate initial total after subtotal, tax, and non-loyalty discounts
    let currentTotal = subtotal + tax - totalNonLoyaltyDiscount;

    // Apply loyalty points discount if redeemed
    let loyaltyDiscount = 0;
    if (redeemLoyaltyPoints && selectedCustomer && customerLoyaltyPoints > 0) {
      loyaltyDiscount = customerLoyaltyPoints * loyaltyPointValue;
      // Cap loyalty discount: should not exceed currentTotal (which is after other discounts/tax)
      loyaltyDiscount = Math.min(loyaltyDiscount, Math.max(0, currentTotal)); // Ensure currentTotal is not negative for capping
    }
    
    currentTotal -= loyaltyDiscount; // Deduct loyalty discount

    return Math.max(0, currentTotal); // Ensure final total is not negative
  };

  const calculateChange = () => {
    const paid = parseFloat(amountPaid) || 0;
    const total = calculateTotal(); // Use calculateTotal which includes all discounts
    return paid - total;
  };

  // --- Checkout & Payment Handlers ---
  const handleCheckout = () => {
    if (cart.length === 0) {
      alert('Cart is empty!');
      return;
    }
   // Reset M-Pesa states when opening payment modal
    let prefillPhone = selectedCustomer?.phone ? selectedCustomer.phone.replace(/\D/g, '') : '';
    if (prefillPhone && !prefillPhone.startsWith('254')) {
        prefillPhone = '254' + prefillPhone.replace(/^0+/, '');
    }
    setMpesaPhoneNumber(prefillPhone || '254'); // Default to '254' if no customer phone

    setMpesaTransactionStatus(null);
    setMpesaTrackingId(null);
    setMpesaShortcode(null);
    if (mpesaPollingInterval) {
        clearInterval(mpesaPollingInterval);
        setMpesaPollingInterval(null);
    }
    setMpesaPollingAttempts(0);

    setAmountPaid(calculateTotal().toFixed(2)); // Pre-fill amount paid with calculated total
    setShowPaymentModal(true);
  };
  
  const processPayment = async () => {
    // Re-calculate all final values one last time for submission
    const finalSubtotal = calculateSubtotal();
    const finalTax = calculateTax();
    const finalTotalCalculated = calculateTotal(); // This is the final calculated total AFTER all discounts

    const paid = parseFloat(amountPaid) || 0;
    
    // --- STEP 1: Frontend Validation ---
    if (paymentMethod === 'mpesa' && !mpesaPhoneNumber) {
        alert('M-Pesa requires a phone number.');
        return;
    }
    if (paid < finalTotalCalculated && paymentMethod !== 'credit' && paymentMethod !== 'mpesa') { // M-Pesa is pending, so paid < total is fine
        alert('Insufficient payment amount!');
        return;
    }
    if (paymentMethod === 'mpesa' && finalTotalCalculated <= 0) {
        alert('M-Pesa payment cannot be initiated for zero or negative amount.');
        return;
    }

    setProcessing(true); // Start processing indicator

    try {
        // --- STEP 2: Calculate Loyalty Redemption for SaleData ---
        let finalLoyaltyPointsRedeemed = 0;
        let finalLoyaltyDiscountAmount = 0;

        if (redeemLoyaltyPoints && selectedCustomer && customerLoyaltyPoints > 0) {
            const nonLoyaltyDiscountAmount = calculateDiscountWithoutLoyalty();
            const availableForLoyaltyDiscount = (finalSubtotal + finalTax - nonLoyaltyDiscountAmount);
            finalLoyaltyDiscountAmount = Math.min(customerLoyaltyPoints * loyaltyPointValue, Math.max(0, availableForLoyaltyDiscount));
            finalLoyaltyPointsRedeemed = Math.round(finalLoyaltyDiscountAmount / loyaltyPointValue);
        }

        const totalDiscountForDb = calculateDiscountWithoutLoyalty(); // Manual + Code Discount

        // --- STEP 3: Create Sale Record in Database (ALWAYS FIRST) ---
        // We create the sale FIRST, so we have a sale_id to track M-Pesa against.
        const saleDataForCreation = {
            customer_id: selectedCustomer ? selectedCustomer.id : null,
            // user_id is handled by backend from req.user
            items: cart.map(item => ({
                product_id: item.id,
                product_name: item.name,
                quantity: item.quantity,
                unit_price: item.price,
                discount: 0, // Item-level discount is 0 for now
                subtotal: item.price * item.quantity
            })),
            subtotal: finalSubtotal,
            discount: totalDiscountForDb,
            loyalty_points_redeemed: finalLoyaltyPointsRedeemed,
            loyalty_discount_amount: finalLoyaltyDiscountAmount,
            tax_rate: defaultTaxRate,
            tax: finalTax,
            total: finalTotalCalculated,
            amount_paid: paid, // This is the amount paid by OTHER means, or expected for M-Pesa
            change_amount: calculateChange(),
            payment_method: paymentMethod,
            payment_status: paymentMethod === 'mpesa' ? 'pending' : (paid >= finalTotalCalculated ? 'paid' : (paymentMethod === 'credit' ? 'partial' : 'pending')),
            notes: ''
        };

        const saleCreationResponse = await api.post('/sales', saleDataForCreation);
        const saleId = saleCreationResponse.data.data.id; // Get the newly created sale ID
        const initialSaleDetails = saleCreationResponse.data.data; // Store initial sale details


        // --- STEP 4: M-Pesa Specific Logic (If M-Pesa is selected) ---
        if (paymentMethod === 'mpesa') {
            setMpesaTransactionStatus('INITIATING'); // Update UI status
            setProcessing(true); // Keep processing indicator for STK push
            
            // Call backend endpoint to initiate STK Push
            const stkPushRes = await api.post('/payment/stk-push', {
                amount: finalTotalCalculated, // Amount for M-Pesa transaction
                phone_number: mpesaPhoneNumber,
                sale_id: saleId, // Link STK push to the created sale
            });

            if (stkPushRes.data.success) {
                setMpesaTrackingId(stkPushRes.data.data.merchantRequestId);
                setMpesaShortcode(stkPushRes.data.data.shortcode);
                setMpesaTransactionStatus('PENDING'); // STK push initiated, now pending confirmation
                
setPaymentSuccessMessage(stkPushRes.data.message || 'STK Push initiated. Check your phone for prompt.');
            setShowPaymentSuccessAlert(true); // <-- Use custom alert
                // Start polling for payment status
                setMpesaPollingAttempts(0);
                const intervalId = setInterval(async () => {
                    setMpesaPollingAttempts(prev => prev + 1);
                    // Use a functional update for mpesaPollingAttempts, but for immediate check, 
                    // calculate it here if needed for logging. The state will update on next render.
                    const currentAttempts = mpesaPollingAttempts + 1; 
                    
                    if (currentAttempts > MAX_POLLING_ATTEMPTS) {
                        clearInterval(intervalId);
                        setMpesaPollingInterval(null);
                        setMpesaTransactionStatus('FAILED');
setPaymentSuccessMessage('M-Pesa transaction timed out. Please check transaction status manually.');
                    setShowPaymentSuccessAlert(true); // <-- Use custom alert                        cleanupPosState(); // Clean up but keep error visible
                        return;
                    }

                    try {
                        const statusRes = await api.post('/payment/check-status', {
                            checkoutRequestId: stkPushRes.data.data.checkoutRequestId || stkPushRes.data.data.merchantRequestId // Use CheckoutRequestID if available, else MerchantRequestID
                        });

                        if (statusRes.data.success && statusRes.data.status === 'COMPLETED') {
                            clearInterval(intervalId);
                            setMpesaPollingInterval(null);
                            setMpesaTransactionStatus('SUCCESS');
setPaymentSuccessMessage('M-Pesa payment confirmed successfully!');
                        setShowPaymentSuccessAlert(true); // <-- Use custom alert
                            // Fetch updated sale details for receipt (backend callback might update it)
                            const updatedSaleRes = await api.get(`/sales/${saleId}`);
                            if (updatedSaleRes.data.success) {
                                setLastSaleDetails(updatedSaleRes.data.data);
                            } else {
                                setLastSaleDetails({ ...initialSaleDetails, payment_status: 'paid' }); // Fallback
                            }
                            setShowReceiptModal(true);
                            cleanupPosState(); // Centralized cleanup
                            return;
                        } else if (statusRes.data.success && (statusRes.data.status === 'PENDING' || statusRes.data.status === 'UNKNOWN')) {
                            // Still pending, continue polling
                            console.log(`M-Pesa status check: ${statusRes.data.status}. Attempt ${currentAttempts}/${MAX_POLLING_ATTEMPTS}`);
                        } else {
                            // Failed status from check-status endpoint
                            clearInterval(intervalId);
                            setMpesaPollingInterval(null);
                            setMpesaTransactionStatus('FAILED');
setPaymentSuccessMessage(`M-Pesa transaction failed: ${statusRes.data.message}`);
                        setShowPaymentSuccessAlert(true); // <-- Use custom alert                            cleanupPosState();
                            return;
                        }
                    } catch (pollError) {
                        console.error('M-Pesa Polling Error:', pollError.response?.data || pollError.message);
                        // Do not show an alert on every polling error, just log it.
                        // User will be alerted if max attempts are reached.
                    }
                }, 2000); // Poll every 2 seconds
                setMpesaPollingInterval(intervalId);

                // IMPORTANT: Exit this processPayment function here. The rest of the flow
                // will be handled by the polling interval once it resolves.
                return; 
            } else {
                // STK Push initiation failed from backend
                setMpesaTransactionStatus('FAILED');
                throw new Error(stkPushRes.data.message || 'M-Pesa STK Push failed to initialize.');
            }
        }
        
        // --- STEP 5: Finalize & Reset UI for Non-M-Pesa Payments (Cash, Card, Credit) ---
        setLastSaleDetails(initialSaleDetails); 
        setShowReceiptModal(true); 
        
        cleanupPosState(); // Centralized cleanup
    } catch (error) {
        console.error('Payment error:', error);
setPaymentSuccessMessage(error.response?.data?.message || error.message || 'Payment failed. Check console for details.');
    setShowPaymentSuccessAlert(true); // <-- Use custom alert        setMpesaTransactionStatus('FAILED'); // Set M-Pesa status to failed if an error occurred during initiation or general processing
    } finally {
        setProcessing(false); // Stop processing indicator (will be re-enabled for M-Pesa polling)
    }
  };

  const handleReceiptModalClose = () => {
    setShowReceiptModal(false);
    setLastSaleDetails(null);
    productSearchInputRef.current?.focus();
  };

  // --- Product Filtering ---
  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    product.sku.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchTerm))
  );

  return (
    <div className="h-screen flex flex-col bg-gray-100">
      {/* Header */}
      <div className="bg-white shadow-sm px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-100 rounded-lg"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
          </button>
          <div>
            <h1 className="text-xl font-bold text-gray-900">Point of Sale</h1>
            <p className="text-sm text-gray-500">Process customer transactions</p>
          </div>
        </div>
        <button
          onClick={clearCart}
          className="text-red-600 hover:text-red-700 font-medium"
        >
          Clear Cart
        </button>
      </div>

      <div className="flex-1 flex overflow-hidden">
        {/* Products Section */}
        <div className="flex-1 flex flex-col p-6 overflow-hidden">
          {/* Product Search */}
          <div className="mb-4">
            <input
              ref={productSearchInputRef}
              type="text"
              placeholder="Search by name, SKU, or scan barcode..."
              value={searchTerm}
              onChange={(e) => handleProductSearch(e.target.value)}
              className="w-full px-4 py-3 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-lg"
              autoFocus
            />
          </div>

          {/* Products Grid */}
          <div className="flex-1 overflow-y-auto">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {(searchTerm ? filteredProducts : products.slice(0, 20)).map((product) => (
                <button
                  key={product.id}
                  onClick={() => addToCart(product)}
                  className="bg-white p-4 rounded-lg shadow hover:shadow-lg transition-shadow text-left"
                  disabled={product.quantity_in_stock <= 0}
                >
                  <div className="font-semibold text-gray-900 mb-1">{product.name}</div>
                  <div className="text-sm text-gray-500 mb-2">SKU: {product.sku}</div>
                  <div className="flex justify-between items-center">
                    <span className="text-lg font-bold text-indigo-600">
                      {formatCurrency(product.selling_price)}
                    </span>
                    <span className={`text-xs px-2 py-1 rounded-full ${
                      product.quantity_in_stock > product.reorder_level + 5
                        ? 'bg-green-100 text-green-800'
                        : product.quantity_in_stock > 0
                        ? 'bg-yellow-100 text-yellow-800'
                        : 'bg-red-100 text-red-800'
                    }`}>
                      {product.quantity_in_stock > 0 ? `${product.quantity_in_stock} in stock` : 'Out of stock'}
                    </span>
                  </div>
                </button>
              ))}
            </div>

            {filteredProducts.length === 0 && (
              <div className="text-center py-12 text-gray-500">
                No products found
              </div>
            )}
          </div>
        </div>
{/* Right Sidebar: Customer & Cart Section - Now the main scrollable container */}
        <div className="w-96 bg-white shadow-lg flex flex-col h-full overflow-y-auto"> {/* ADD overflow-y-auto here, remove h-full from children */}
          
          {/* Customer Selection Section */}
          <div className="p-4 border-b flex-shrink-0"> {/* flex-shrink-0 is good */}
            <h2 className="text-lg font-bold text-gray-900 mb-3">Customer</h2>
            {selectedCustomer ? (
              // --- When a customer IS selected ---
              <div className="bg-indigo-50 p-3 rounded-lg border border-indigo-200">
                <div className="flex justify-between items-center mb-2">
                  <div className="flex-1">
                    <p className="font-semibold text-indigo-800">{selectedCustomer.name}</p>
                    <p className="text-sm text-indigo-600">{selectedCustomer.phone}</p>
                  </div>
                  <button
                    onClick={clearSelectedCustomer}
                    className="text-red-600 hover:text-red-800 p-1"
                    title="Remove Customer"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                  </button>
                </div>

                {/* Loyalty Points Display and Redemption */}
                {customerLoyaltyPoints > 0 && ( // Only show if customer has points
                  <div className="mt-2 pt-2 border-t border-indigo-100">
                    <div className="flex justify-between items-center text-sm">
                      <span className="font-medium text-indigo-700">Available Points:</span>
                      <span className="font-bold text-indigo-900">{customerLoyaltyPoints}</span>
                    </div>
                    <div className="flex items-center space-x-2 mt-1">
                      <input
                        type="checkbox"
                        id="redeemPoints"
                        checked={redeemLoyaltyPoints}
                        onChange={() => setRedeemLoyaltyPoints(!redeemLoyaltyPoints)}
                        className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
                      />
                      <label htmlFor="redeemPoints" className="text-sm font-medium text-gray-700">
                        Redeem {customerLoyaltyPoints} points for {formatCurrency(customerLoyaltyPoints * loyaltyPointValue)} discount
                      </label>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              // --- When NO customer IS selected ---
              <>
                <div className="relative mb-2">
                  <input
                    ref={customerSearchInputRef}
                    type="text"
                    placeholder="Search customer by name or phone..."
                    value={customerSearchTerm}
                    onChange={handleCustomerSearchChange}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  />
                  {customerSearchTerm && customerSearchResults.length > 0 && (
                    <ul className="absolute z-10 w-full bg-white border border-gray-300 rounded-lg shadow-lg mt-1 max-h-60 overflow-y-auto">
                      {customerSearchResults.map(customer => (
                        <li
                          key={customer.id}
                          onClick={() => selectCustomer(customer)}
                          className="p-3 hover:bg-gray-100 cursor-pointer border-b border-gray-100 last:border-b-0"
                        >
                          <p className="font-medium text-gray-900">{customer.name}</p>
                          <p className="text-sm text-gray-500">{customer.phone}</p>
                        </li>
                      ))}
                    </ul>
                  )}
                  {customerSearchTerm.length >= 2 && customerSearchResults.length === 0 && (
                    <p className="text-sm text-gray-500 mt-2 px-2">No customers found.</p>
                  )}
                  {customerSearchTerm.length < 2 && customerSearchResults.length > 0 && (
                    <p className="text-sm text-gray-500 mt-2 px-2">Type at least 2 characters to search.</p>
                  )}
                </div>
                <button
                  onClick={handleAddCustomerInPos}
                  className="w-full bg-gray-200 text-gray-800 px-4 py-2 rounded-lg hover:bg-gray-300"
                >
                  + Add New Customer
                </button>
              </>
            )}
          </div>
          {/* Cart Section - This section takes minimal space so summary is visible if possible, but the whole parent scrolls */}
          <div className="p-4 border-b flex-shrink-0"> {/* flex-shrink-0 for Cart Section */}
            <h2 className="text-lg font-bold text-gray-900 mb-3">Cart ({cart.length})</h2>

            {/* Cart Items - Explicitly scrollable within THIS section */}
            <div className="max-h-60 overflow-y-scroll space-y-3 pr-2 border-b pb-2 mb-2"> {/* UPDATED max-h, overflow here */}
              {cart.length === 0 ? (
                <div className="text-center py-12 text-gray-400">
                  <svg className="w-16 h-16 mx-auto mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                  <p>Cart is empty</p>
                </div>
              ) : (
                cart.map((item) => (
                  <div key={item.id} className="bg-gray-50 p-3 rounded-lg">
                    <div className="flex justify-between items-start mb-2">
                      <div className="flex-1">
                        <div className="font-medium text-gray-900">{item.name}</div>
                        <div className="text-sm text-gray-500">
                          {formatCurrency(item.price)} each
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.id)}
                        className="text-red-600 hover:text-red-800 p-1"
                      >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateQuantity(item.id, parseInt(e.target.value) || 0)}
                          className="w-16 text-center border border-gray-300 rounded-lg py-1"
                          min="1"
                          max={item.max_stock}
                        />
                        <button
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="w-8 h-8 bg-gray-200 hover:bg-gray-300 rounded-lg flex items-center justify-center"
                        >
                          +
                        </button>
                      </div>
                      <div className="font-bold text-gray-900">
                        {formatCurrency(item.price * item.quantity)}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Cart Summary */}
          <div className="border-t p-4 space-y-3 flex-shrink-0"> {/* flex-shrink-0 is good */}
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Subtotal:</span>
              <span className="font-medium">{formatCurrency(calculateSubtotal())}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-gray-600">Tax ({Math.round(defaultTaxRate * 100)}%):</span>
              <span className="font-medium">{formatCurrency(calculateTax())}</span>
            </div>

            {/* Discount Code Application */}
            <div className="relative border-t pt-3 mt-3">
              <label className="block text-sm font-medium text-gray-700 mb-1">Discount Code</label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  value={discountCode}
                  onChange={(e) => setDiscountCode(e.target.value)}
                  className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                  placeholder="Enter code"
                />
                {!appliedDiscountRule ? (
                  <button
                    type="button"
                    onClick={applyDiscountCode}
                    disabled={!discountCode}
                    className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50"
                  >
                    Apply
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={removeDiscountCode}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
                  >
                    Remove
                  </button>
                )}
              </div>
              {discountCodeError && <p className="text-red-500 text-xs mt-1">{discountCodeError}</p>}
              {successMessage && <p className="text-green-600 text-xs mt-1">{successMessage}</p>}
              {appliedDiscountRule && !discountCodeError && !successMessage && <p className="text-green-600 text-xs mt-1">Code '{appliedDiscountRule.code || appliedDiscountRule.name}' applied!</p>}
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-600 text-sm">Manual Discount:</span>
              <input
                type="number"
                value={manualDiscount}
                onChange={(e) => setManualDiscount(parseFloat(e.target.value) || 0)}
                className="w-24 px-2 py-1 border border-gray-300 rounded text-right"
                placeholder="0"
                min="0"
              />
            </div>
            <div className="flex justify-between text-lg font-bold pt-2 border-t">
              <span>Total:</span>
              <span className="text-indigo-600">{formatCurrency(calculateTotal())}</span>
            </div>

            <button
              onClick={handleCheckout}
              disabled={cart.length === 0}
              className="w-full bg-indigo-600 text-white py-3 rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed font-semibold"
            >
              Proceed to Payment
            </button>
          </div>
        </div>
      </div>
      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="p-6">
              <h2 className="text-xl font-bold mb-4">Complete Payment</h2>

{/* Total */}
              <div className="bg-indigo-50 p-4 rounded-lg mb-4">
                <div className="text-sm text-gray-600 mb-1">Total Amount</div>
                <div className="text-3xl font-bold text-indigo-600">
                  {formatCurrency(calculateTotal())}
                </div>
              </div>

              {/* M-Pesa Shortcode Display (if M-Pesa is selected and we have the shortcode) */}
              {paymentMethod === 'mpesa' && mpesaShortcode && ( 
                <div className="text-center bg-gray-100 p-2 rounded-lg mb-4">
                  <p className="text-sm text-gray-700">Pay to Till/Paybill:</p>
                  <p className="text-lg font-bold text-gray-900">{mpesaShortcode}</p>
                </div>
              )}

              {/* Payment Method */}
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Payment Method
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {['cash', 'mpesa', 'card', 'credit'].map((method) => (
                    <button
                      key={method}
                      onClick={() => {
                        setPaymentMethod(method);
                        // Reset M-Pesa status if changing method
                        if (method !== 'mpesa') {
                          setMpesaTransactionStatus(null);
                          setMpesaTrackingId(null);
                          if (mpesaPollingInterval) {
                            clearInterval(mpesaPollingInterval);
                            setMpesaPollingInterval(null);
                          }
                          setMpesaPollingAttempts(0);
                        }
                      }}
                      className={`p-3 border-2 rounded-lg capitalize ${
                        paymentMethod === method
                          ? 'border-indigo-600 bg-indigo-50 text-indigo-600'
                          : 'border-gray-300 hover:border-gray-400'
                      }`}
                      disabled={processing} // Disable method change while processing
                    >
                      {method === 'mpesa' ? 'M-PESA' : method}
                    </button>
                  ))}
                </div>
              </div>

              {/* M-PESA Input and Status Display */}
              {paymentMethod === 'mpesa' && (
                <div className="mb-4">
                  {(mpesaTransactionStatus === null || mpesaTransactionStatus === 'FAILED') && (
                    <>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        M-Pesa Phone Number *
                      </label>
                      <div className="relative">
                        <input
                            type="tel"
                            value={mpesaPhoneNumber}
                            onChange={handleMpesaPhoneChange} // <-- USE NEW HANDLER
                            className={`w-full px-4 py-2 border rounded-lg focus:ring-2 focus:outline-none ${
                                mpesaPhoneError ? 'border-red-500 focus:ring-red-500' : 'border-gray-300 focus:ring-indigo-500'
                            }`}
                            placeholder="2547XXXXXXXX"
                            maxLength="12"
                            required
                            disabled={processing || mpesaTransactionStatus === 'PENDING'}
                        />
                      </div>
                      {/* RED ERROR MESSAGE FOR INVALID PHONE */}
                      {mpesaPhoneError && (
                        <p className="text-sm text-red-600 mt-1">{mpesaPhoneError}</p>
                      )}
                    </>
                  )}
                  
                  
                  {mpesaTransactionStatus === 'INITIATING' && (
                    <p className="text-sm text-blue-600 mt-2 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Initiating STK Push...
                    </p>
                  )}
                  {mpesaTransactionStatus === 'PENDING' && mpesaTrackingId && (
                    <p className="text-sm text-blue-600 mt-2 flex items-center">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                      Check your phone for the STK Push prompt (Tracking ID: {mpesaTrackingId})... (Attempt {mpesaPollingAttempts}/{MAX_POLLING_ATTEMPTS})
                    </p>
                  )}
                  {mpesaTransactionStatus === 'FAILED' && (
                    <p className="text-sm text-red-600 mt-2">M-Pesa transaction failed or timed out.</p>
                  )}
                  {mpesaTransactionStatus === 'SUCCESS' && (
                    <p className="text-sm text-green-600 mt-2">M-Pesa payment confirmed successfully!</p>
                  )}
                </div>
              )}

              {/* Amount Paid */}
              {paymentMethod !== 'mpesa' && ( // Only show amount paid for non-M-Pesa methods
                <div className="mb-4">
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Amount Paid *
                  </label>
                  <input
                    type="number"
                    value={amountPaid}
                    onChange={(e) => setAmountPaid(e.target.value)}
                    className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500"
                    placeholder="Enter amount"
                    step="0.01"
                    autoFocus
                    disabled={processing}
                  />
                </div>
              )}

              {/* Change / Balance Due */}
              {(amountPaid && parseFloat(amountPaid) >= calculateTotal() && paymentMethod !== 'mpesa') ? (
                <div className="bg-green-50 p-3 rounded-lg mb-4">
                  <div className="text-sm text-gray-600">Change</div>
                  <div className="text-xl font-bold text-green-600">
                    {formatCurrency(calculateChange())}
                  </div>
                </div>
              ) : (amountPaid && parseFloat(amountPaid) < calculateTotal() && paymentMethod !== 'mpesa' && paymentMethod !== 'credit') ? (
                 <div className="bg-red-50 p-3 rounded-lg mb-4">
                 <div className="text-sm text-gray-600">Balance Due</div>
                 <div className="text-xl font-bold text-red-600">
                   {formatCurrency(-calculateChange())}
                 </div>
               </div>
              ) : null}

              {/* Buttons */}
              <div className="flex gap-3">
                <button
                  onClick={() => {
                    setShowPaymentModal(false);
                    setAmountPaid('');
                    // Ensure polling is stopped if user cancels
                    if (mpesaPollingInterval) {
                        clearInterval(mpesaPollingInterval);
                        setMpesaPollingInterval(null);
                    }
                    setMpesaTransactionStatus(null);
                    setMpesaPollingAttempts(0);
                    setProcessing(false);
                  }}
                  disabled={processing && mpesaTransactionStatus !== 'FAILED'} // Allow cancel if M-Pesa failed
                  className="flex-1 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50"
                >
                  Cancel
                </button>
                <button
                    onClick={processPayment}
                    disabled={
                        processing || 
                        (paymentMethod === 'mpesa' && (mpesaTransactionStatus === 'PENDING' || mpesaTransactionStatus === 'INITIATING')) || 
                        (paymentMethod === 'mpesa' && (!mpesaPhoneNumber || mpesaPhoneError)) || // <-- ADD mpesaPhoneError CHECK HERE
                        (paymentMethod !== 'mpesa' && !amountPaid) || 
                        (paymentMethod !== 'credit' && paymentMethod !== 'mpesa' && parseFloat(amountPaid) < calculateTotal())
                    }
                    
                    className="flex-1 px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed"
                  >
                    {
                        processing ? 'Processing...' :
                        (paymentMethod === 'mpesa' && mpesaTransactionStatus === 'INITIATING') ? 'Initiating M-Pesa...' :
                        (paymentMethod === 'mpesa' && mpesaTransactionStatus === 'PENDING') ? `Waiting M-Pesa (${mpesaPollingAttempts}/${MAX_POLLING_ATTEMPTS})...` :
                        'Complete Sale'
                    }
                  </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Add New Customer Modal */}
      <CustomerFormModal
        isOpen={showCustomerModal}
        onClose={handleCustomerModalClose}
        editingCustomer={null}
        onSaveSuccess={handleCustomerSaveSuccess}
      />

      {/* Receipt Modal */}
      <ReceiptModal
        isOpen={showReceiptModal}
        onClose={handleReceiptModalClose}
        saleDetails={lastSaleDetails}
      />
      {/* Custom Success Alert for Payment (NEW) */}
      <SuccessAlert
        message={paymentSuccessMessage}
        isOpen={showPaymentSuccessAlert}
        onClose={() => setShowPaymentSuccessAlert(false)}
      />
    </div>
  );
};

export default POSPage;