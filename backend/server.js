const express = require('express');
const axios = require('axios');
const app = express();

app.use(express.json());

// M-Pesa Daraja API endpoints
const MPESA_BASE_URL = 'https://sandbox.safaricom.co.ke'; // Use sandbox for testing

// Get OAuth token
async function getMpesaToken() {
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');
    
    const response = await axios.get(
        `${MPESA_BASE_URL}/oauth/v1/generate?grant_type=client_credentials`,
        {
            headers: {
                Authorization: `Basic ${auth}`
            }
        }
    );
    
    return response.data.access_token;
}

// Initiate STK Push
app.post('/api/initiate-payment', async (req, res) => {
    try {
        const { name, phone, invoice, amount, email } = req.body;
        
        const token = await getMpesaToken();
        
        const timestamp = new Date().toISOString().replace(/[^0-9]/g, '').slice(0, 14);
        const password = Buffer.from(
            `${process.env.SHORTCODE}${process.env.PASSKEY}${timestamp}`
        ).toString('base64');
        
        const stkPushRequest = {
            BusinessShortCode: process.env.SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: phone,
            PartyB: process.env.SHORTCODE,
            PhoneNumber: phone,
            CallBackURL: 'https://your-domain.com/api/mpesa-callback',
            AccountReference: invoice,
            TransactionDesc: `Payment for invoice ${invoice}`
        };
        
        const response = await axios.post(
            `${MPESA_BASE_URL}/mpesa/stkpush/v1/processrequest`,
            stkPushRequest,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );
        
        res.json({
            success: true,
            transactionId: response.data.CheckoutRequestID,
            message: 'STK Push sent successfully'
        });
        
    } catch (error) {
        console.error('M-Pesa error:', error.response?.data || error.message);
        res.status(500).json({
            success: false,
            message: error.response?.data?.errorMessage || 'Payment initiation failed'
        });
    }
});

app.listen(3000, () => console.log('Server running on port 3000'));
