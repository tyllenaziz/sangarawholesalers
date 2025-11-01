const db = require('../config/database');
const Setting = require('../models/Setting');
const axios = require('axios');
const moment = require('moment');
require('dotenv').config(); // Ensure dotenv is loaded

// --- M-PESA CONFIGURATION ---
// Fetch M-Pesa credentials from environment variables
const MPESA_CONSUMER_KEY = process.env.MPESA_CONSUMER_KEY;
const MPESA_CONSUMER_SECRET = process.env.MPESA_CONSUMER_SECRET;
const MPESA_SHORTCODE = process.env.MPESA_SHORTCODE;
const MPESA_PASSKEY = process.env.MPESA_PASSKEY;
const MPESA_CALLBACK_URL = process.env.MPESA_CALLBACK_URL;
const MPESA_ENVIRONMENT = process.env.MPESA_ENVIRONMENT || 'sandbox'; // 'sandbox' or 'production'

// Set URLs based on environment
const BASE_URL = MPESA_ENVIRONMENT === 'production' 
    ? 'https://api.safaricom.co.ke' 
    : 'https://sandbox.safaricom.co.ke';

const DARJA_AUTH_URL = `${BASE_URL}/oauth/v1/generate?grant_type=client_credentials`;
const DARJA_STK_PUSH_URL = `${BASE_URL}/mpesa/stkpush/v1/processrequest`;
const DARJA_TRANSACTION_STATUS_URL = `${BASE_URL}/mpesa/stkpushquery/v1/query`;

// In-memory cache for Daraja Access Token and pending transactions
let darajaAccessToken = null;
let darajaAccessTokenExpiry = 0;
const pendingTransactions = {}; // Tracks STK pushes initiated from our POS

// Helper to log activity
const logActivity = async (userId, action, description, ipAddress) => {
  try {
    await db.query(
      'INSERT INTO activity_logs (user_id, action, description, ip_address) VALUES (?, ?, ?, ?)',
      [userId, action, description, ipAddress]
    );
  } catch (error) {
    console.error('Failed to log activity:', error);
  }
};

// --- Daraja API Helpers ---
const getDarajaAccessToken = async () => {
    if (darajaAccessToken && darajaAccessTokenExpiry > Date.now()) {
        console.log('DEBUG: Using cached M-Pesa access token');
        return darajaAccessToken;
    }

    try {
        // Validate environment variables
        if (!MPESA_CONSUMER_KEY || !MPESA_CONSUMER_SECRET) {
            throw new Error('MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET must be set in .env file');
        }

        const auth = Buffer.from(`${MPESA_CONSUMER_KEY}:${MPESA_CONSUMER_SECRET}`).toString('base64');
        console.log(`DEBUG: Requesting M-Pesa access token from ${MPESA_ENVIRONMENT} environment...`);
        console.log(`DEBUG: Auth URL: ${DARJA_AUTH_URL}`);
        
        const response = await axios.get(DARJA_AUTH_URL, {
            headers: {
                'Authorization': `Basic ${auth}`
            },
            timeout: 10000 // 10 second timeout
        });

        darajaAccessToken = response.data.access_token;
        darajaAccessTokenExpiry = Date.now() + (response.data.expires_in * 1000) - 60000; // 1 min buffer
        console.log(`DEBUG: M-Pesa access token retrieved successfully (expires in ${response.data.expires_in}s)`);
        return darajaAccessToken;
    } catch (error) {
        console.error('Failed to get Daraja access token:', error.response?.data || error.message);
        
        // Provide more specific error messages
        if (error.response?.status === 400) {
            console.error('DEBUG: 400 Error details:', JSON.stringify(error.response.data, null, 2));
            throw new Error('Invalid M-Pesa credentials. Please verify MPESA_CONSUMER_KEY and MPESA_CONSUMER_SECRET in .env file.');
        } else if (error.response?.status === 401) {
            throw new Error('Unauthorized M-Pesa access. Check your API credentials.');
        } else {
            throw new Error('Failed to retrieve M-Pesa access token. Check your internet connection and credentials.');
        }
    }
};

// --- TRANSACTION INITIATION ---
const initiateStkPush = async (req, res) => {
    const { amount, phone_number, sale_id } = req.body;
    const userId = req.user.id;

    // Validation
    if (!amount || !phone_number || !sale_id) {
        return res.status(400).json({ success: false, message: 'Amount, phone number, and sale ID are required.' });
    }
    if (parseFloat(amount) <= 0) {
        return res.status(400).json({ success: false, message: 'Amount must be positive.' });
    }
    if (!phone_number.startsWith('254') || phone_number.length !== 12 || !/^\d+$/.test(phone_number)) {
        return res.status(400).json({ success: false, message: 'Invalid M-Pesa phone number format (e.g., 2547XXXXXXXX).' });
    }

    // Validate M-Pesa configuration
    if (!MPESA_SHORTCODE || !MPESA_PASSKEY || !MPESA_CALLBACK_URL) {
        return res.status(500).json({ 
            success: false, 
            message: 'M-Pesa configuration incomplete. Please set MPESA_SHORTCODE, MPESA_PASSKEY, and MPESA_CALLBACK_URL in .env file.' 
        });
    }

    try {
        const accessToken = await getDarajaAccessToken();

        // --- REAL DARAJA API CALL ---
        const timestamp = moment().format('YYYYMMDDHHmmss');
        const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');
        const transactionRef = `Sale${sale_id}`;
        const partyA = phone_number;
        const partyB = MPESA_SHORTCODE;

        const payload = {
            "BusinessShortCode": MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "TransactionType": "CustomerPayBillOnline",
            "Amount": Math.round(parseFloat(amount)),
            "PartyA": partyA,
            "PartyB": partyB,
            "PhoneNumber": partyA,
            "CallBackURL": MPESA_CALLBACK_URL,
            "AccountReference": transactionRef,
            "TransactionDesc": `Payment for Sale ID ${sale_id}`
        };

        console.log(`DEBUG: Initiating STK Push to ${DARJA_STK_PUSH_URL}`);
        console.log(`DEBUG: Payload (without password):`, {
            ...payload,
            Password: '***HIDDEN***'
        });

        const response = await axios.post(DARJA_STK_PUSH_URL, payload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000 // 30 second timeout
        });

        console.log('DEBUG: STK Push Response:', JSON.stringify(response.data, null, 2));

        if (response.data.ResponseCode === '0') {
            const merchantRequestId = response.data.MerchantRequestID;
            pendingTransactions[merchantRequestId] = {
                sale_id,
                user_id: userId,
                amount: parseFloat(amount),
                phone_number,
                timestamp: new Date().toISOString(),
                status: 'PENDING_STK',
                checkout_request_id: response.data.CheckoutRequestID
            };
            await logActivity(userId, 'MPESA_INITIATED', `STK Push initiated for KES ${amount} to ${phone_number}. Tracking ID: ${merchantRequestId}`, req.ip);
            return res.json({
                success: true,
                message: response.data.CustomerMessage || 'STK Push initiated successfully. Check your phone for confirmation.',
                data: { 
                    merchantRequestId, 
                    checkoutRequestId: response.data.CheckoutRequestID,
                    shortcode: MPESA_SHORTCODE,
                    environment: MPESA_ENVIRONMENT
                }
            });
        } else {
            throw new Error(response.data.ResponseDescription || 'Failed to initiate STK Push.');
        }

    } catch (error) {
        console.error('STK Push Initiation Error:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('DEBUG: Full error response:', JSON.stringify(error.response.data, null, 2));
        }
        await logActivity(userId, 'MPESA_INITIATE_FAILED', `STK Push initiation failed. Error: ${error.message}`, req.ip);
        res.status(500).json({ 
            success: false, 
            message: error.response?.data?.errorMessage || error.message || 'Failed to initiate M-Pesa transaction.',
            details: error.response?.data
        });
    }
};

// --- CHECK PAYMENT STATUS ---
const checkPaymentStatus = async (req, res) => {
    const { checkoutRequestId } = req.body;
    const userId = req.user.id;

    // Validation
    if (!checkoutRequestId) {
        return res.status(400).json({ 
            success: false, 
            message: 'CheckoutRequestID is required.' 
        });
    }

    // Validate M-Pesa configuration
    if (!MPESA_SHORTCODE || !MPESA_PASSKEY) {
        return res.status(500).json({ 
            success: false, 
            message: 'M-Pesa configuration incomplete. Please set MPESA_SHORTCODE and MPESA_PASSKEY in .env file.' 
        });
    }

    try {
        const accessToken = await getDarajaAccessToken();

        // Generate timestamp and password for query
        const timestamp = moment().format('YYYYMMDDHHmmss');
        const password = Buffer.from(`${MPESA_SHORTCODE}${MPESA_PASSKEY}${timestamp}`).toString('base64');

        const queryPayload = {
            "BusinessShortCode": MPESA_SHORTCODE,
            "Password": password,
            "Timestamp": timestamp,
            "CheckoutRequestID": checkoutRequestId
        };

        console.log(`DEBUG: Querying payment status for CheckoutRequestID: ${checkoutRequestId}`);

        const response = await axios.post(DARJA_TRANSACTION_STATUS_URL, queryPayload, {
            headers: {
                'Authorization': `Bearer ${accessToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });

        console.log('DEBUG: Status Query Response:', JSON.stringify(response.data, null, 2));

        const resultCode = response.data.ResultCode;
        let status = 'PENDING';
        let message = 'Transaction is pending';

        if (resultCode === '0') {
            status = 'COMPLETED';
            message = 'Payment completed successfully';
        } else if (resultCode === '1032') {
            status = 'CANCELLED';
            message = 'Payment cancelled by user';
        } else if (resultCode === '1037') {
            status = 'TIMEOUT';
            message = 'Payment timeout - user did not enter PIN';
        } else if (resultCode === '1') {
            status = 'FAILED';
            message = 'Insufficient funds or payment failed';
        } else if (resultCode === '1001') {
            status = 'FAILED';
            message = 'Invalid phone number';
        } else if (resultCode === '1019') {
            status = 'FAILED';
            message = 'Transaction expired';
        } else if (resultCode === '1025' || resultCode === '1026') {
            status = 'PENDING';
            message = 'Transaction is still being processed';
        } else {
            status = 'UNKNOWN';
            message = response.data.ResultDesc || 'Unknown status';
        }

        await logActivity(
            userId, 
            'MPESA_STATUS_CHECK', 
            `Payment status checked for CheckoutRequestID: ${checkoutRequestId}. Status: ${status}`, 
            req.ip
        );

        return res.json({
            success: true,
            status,
            message,
            data: {
                resultCode,
                resultDesc: response.data.ResultDesc,
                merchantRequestId: response.data.MerchantRequestID,
                checkoutRequestId: response.data.CheckoutRequestID
            }
        });

    } catch (error) {
        console.error('Payment Status Check Error:', error.response?.data || error.message);
        if (error.response?.data) {
            console.error('DEBUG: Full error response:', JSON.stringify(error.response.data, null, 2));
        }
        
        await logActivity(
            userId, 
            'MPESA_STATUS_CHECK_FAILED', 
            `Payment status check failed for CheckoutRequestID: ${checkoutRequestId}. Error: ${error.message}`, 
            req.ip
        );

        res.status(500).json({ 
            success: false, 
            message: error.response?.data?.errorMessage || error.message || 'Failed to check payment status.',
            details: error.response?.data
        });
    }
};

// --- M-Pesa Callback Handler ---
const handleCallback = async (req, res) => {
    const callbackData = req.body;
    console.log('MPESA CALLBACK RECEIVED:', JSON.stringify(callbackData, null, 2));

    const result = callbackData.Body && callbackData.Body.stkCallback;
    
    if (!result) {
        console.error('MPESA CALLBACK ERROR: Invalid Callback Data Structure.');
        return res.json({ ResultCode: 1, ResultDesc: 'Invalid Callback Data Received' });
    }

    const merchantRequestId = result.MerchantRequestID;
    const checkoutRequestId = result.CheckoutRequestID;
    const resultCode = result.ResultCode;
    const resultDesc = result.ResultDesc;

    const transaction = pendingTransactions[merchantRequestId];
    
    if (!transaction) {
        console.error(`MPESA CALLBACK ERROR: MerchantRequestID ${merchantRequestId} not found in pending transactions.`);
        return res.json({ ResultCode: 1, ResultDesc: 'Transaction Not Found Locally' });
    }

    let status = 'FAILED';
    let mpesaReceiptNumber = null;
    let transactionDate = null;
    let amountPaidByMpesa = 0;
    
    if (resultCode === 0) {
        status = 'COMPLETED';
        const callbackMetadata = result.CallbackMetadata && result.CallbackMetadata.Item;
        if (callbackMetadata) {
            mpesaReceiptNumber = callbackMetadata.find(item => item.Name === 'MpesaReceiptNumber')?.Value;
            transactionDate = callbackMetadata.find(item => item.Name === 'TransactionDate')?.Value;
            amountPaidByMpesa = parseFloat(callbackMetadata.find(item => item.Name === 'Amount')?.Value);
        }
        console.log(`MPESA SUCCESS: MerchantRequestID: ${merchantRequestId}, Receipt: ${mpesaReceiptNumber}`);
    } else {
        status = 'FAILED';
        console.warn(`MPESA FAILED: MerchantRequestID: ${merchantRequestId}, ResultCode: ${resultCode}, ResultDesc: ${resultDesc}`);
    }

    transaction.status = status;
    transaction.mpesa_receipt = mpesaReceiptNumber;
    transaction.transaction_date = transactionDate;
    transaction.amount_paid_by_mpesa = amountPaidByMpesa;

    try {
        if (status === 'COMPLETED') {
            const [saleRows] = await db.query(
                'SELECT total, amount_paid FROM sales WHERE id = ?',
                [transaction.sale_id]
            );
            const originalSale = saleRows[0];

            const newAmountPaid = parseFloat(originalSale.amount_paid) + amountPaidByMpesa;
            const newPaymentStatus = (newAmountPaid >= originalSale.total) ? 'paid' : 'partial';

            await db.query(
                `UPDATE sales SET 
                 amount_paid = ?, 
                 payment_status = ?, 
                 mpesa_receipt_number = ?,
                 transaction_id = ?
                 WHERE id = ?`,
                [newAmountPaid, newPaymentStatus, mpesaReceiptNumber, merchantRequestId, transaction.sale_id]
            );

            await logActivity(transaction.user_id, 'MPESA_PAID', `M-Pesa payment confirmed for Sale ID ${transaction.sale_id}. Receipt: ${mpesaReceiptNumber}. Amount: ${amountPaidByMpesa}`, 'MPESA_IP');
        } else {
            await logActivity(transaction.user_id, 'MPESA_FAILED', `M-Pesa payment failed for Sale ID ${transaction.sale_id}. Result: ${resultDesc}`, 'MPESA_IP');
        }
    } catch (sqlError) {
        console.error('MPESA CALLBACK DB UPDATE ERROR:', sqlError.message);
        await logActivity(transaction.user_id, 'MPESA_DB_UPDATE_FAILED', `Failed to update sale DB for M-Pesa callback. Sale ID ${transaction.sale_id}. Error: ${sqlError.message}`, 'MPESA_IP');
    }

    res.json({ ResultCode: 0, ResultDesc: 'Accepted' });
    delete pendingTransactions[merchantRequestId];
};

module.exports = {
    initiateStkPush,
    checkPaymentStatus,
    handleCallback,
    pendingTransactions
};