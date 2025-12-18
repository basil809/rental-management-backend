const axios = require('axios');
const moment = require('moment');
const Tenant = require('../models/tenants');
const Payment = require('../models/payments'); // your payment model
require('dotenv').config();

// ✅ Normalize phone to Safaricom format: 2547XXXXXXXX
function normalizePhone(phone) {
    let cleaned = phone.toString().replace(/\D/g, ""); // remove non-digits

    if (cleaned.startsWith("0")) {
        cleaned = "254" + cleaned.substring(1); // 07... → 2547...
    } else if (cleaned.startsWith("254")) {
        cleaned = cleaned; // already correct
    } else if (cleaned.startsWith("7")) {
        cleaned = "254" + cleaned; // 7... → 2547...
    }

    return cleaned;
}

const getAccessToken = async () => {
    const auth = Buffer.from(`${process.env.CONSUMER_KEY}:${process.env.CONSUMER_SECRET}`).toString('base64');

    const res = await axios.get('https://sandbox.safaricom.co.ke/oauth/v1/generate?grant_type=client_credentials', {
        headers: {
            Authorization: `Basic ${auth}`,
        },
    });

    return res.data.access_token;
};

const initiateSTKPush = async (req, res) => {
    const { phoneNumber, amount, accountRef } = req.body;

    try {
        const accessToken = await getAccessToken();
        const timestamp = moment().format('YYYYMMDDHHmmss');
        const password = Buffer.from(
            `${process.env.SHORTCODE}${process.env.PASSKEY}${timestamp}`
        ).toString('base64');

        const normalizedPhone = normalizePhone(phoneNumber);

        const stkPushData = {
            BusinessShortCode: process.env.SHORTCODE,
            Password: password,
            Timestamp: timestamp,
            TransactionType: 'CustomerPayBillOnline',
            Amount: amount,
            PartyA: normalizedPhone,  // ✅ normalized phone
            PartyB: process.env.SHORTCODE,
            PhoneNumber: normalizedPhone, // ✅ normalized phone
            CallBackURL: process.env.CALLBACK_URL,
            AccountReference: accountRef,
            TransactionDesc: "Rent Payment",
        };

        const response = await axios.post(
            'https://sandbox.safaricom.co.ke/mpesa/stkpush/v1/processrequest',
            stkPushData,
            {
                headers: {
                    Authorization: `Bearer ${accessToken}`,
                },
            }
        );

        res.status(200).json({
            success: true,
            message: "STK Push sent to phone. Complete payment with M-Pesa PIN.",
            data: response.data,
        });
    } catch (err) {
        console.error("STK Push error", err.response?.data || err.message);
        res.status(500).json({ success: false, message: "Failed to initiate STK Push" });
    }
};

// Temporary in-memory store for statuses
let mpesaStatusStore = {}; 
// Example:
// mpesaStatusStore[CheckoutRequestID] = { status: "success" | "failed" | "pending", message }

// ---------------------------
//  HANDLE CALLBACK
// ---------------------------
const handleCallback = async (req, res) => {
    try {
        const callbackData = req.body;
        console.log("Callback Received: ", JSON.stringify(callbackData));

        const stkCallback = callbackData?.Body?.stkCallback;
        const CheckoutRequestID = stkCallback?.CheckoutRequestID;

        if (!CheckoutRequestID) {
            return res.status(400).json({ message: "Missing CheckoutRequestID" });
        }

        // Default status: pending
        if (!mpesaStatusStore[CheckoutRequestID]) {
            mpesaStatusStore[CheckoutRequestID] = { status: "pending" };
        }

        // ---------------------------
        // SUCCESSFUL PAYMENT
        // ---------------------------
        if (stkCallback?.ResultCode === 0) {
            const metadata = stkCallback.CallbackMetadata?.Item || [];

            const amount = metadata.find(i => i.Name === 'Amount')?.Value;
            const phone = metadata.find(i => i.Name === 'PhoneNumber')?.Value;

            if (!amount || !phone) {
                mpesaStatusStore[CheckoutRequestID] = {
                    status: "failed",
                    message: "Missing amount or phone in callback"
                };
                return res.status(400).json({ message: "Missing amount or phone in callback" });
            }

            const normalizedPhone = normalizePhone(phone);
            const tenant = await Tenant.findOne({ phone: normalizedPhone });

            if (!tenant) {
                console.warn(`⚠️ No tenant found with phone ${normalizedPhone}`);
                mpesaStatusStore[CheckoutRequestID] = {
                    status: "failed",
                    message: "Tenant not found"
                };
                return res.status(404).json({ message: "Tenant not found" });
            }

            // ---------------------------
            // SAVE PAYMENT TO MONGO
            // ---------------------------
            await Payment.create({
                tenant: tenant._id,
                tenantName: tenant.name,
                property: tenant.property,
                roomNumber: tenant.roomNumber,
                amountPaid: amount,
                date: new Date(),
                paymentMethod: 'Mpesa',
                comment: 'M-Pesa STK Rent Payment',
                actor: 'Tenant'
            });

            await Tenant.findByIdAndUpdate(tenant._id, { $inc: { amountPaid: amount } });

            console.log(`✅ Payment of KES ${amount} saved for ${tenant.name}`);

            // Store success status
            mpesaStatusStore[CheckoutRequestID] = { status: "success" };

        } else {
            // ---------------------------
            // FAILED PAYMENT
            // ---------------------------
            console.log(`❌ STK Push failed: ${stkCallback?.ResultDesc}`);

            mpesaStatusStore[CheckoutRequestID] = {
                status: "failed",
                message: stkCallback?.ResultDesc
            };
        }

        res.status(200).json({ message: "Callback processed" });

    } catch (err) {
        console.error("❌ Error in handleCallback:", err);

        const CheckoutRequestID = req?.body?.Body?.stkCallback?.CheckoutRequestID;

        if (CheckoutRequestID) {
            mpesaStatusStore[CheckoutRequestID] = {
                status: "failed",
                message: "Server error during callback"
            };
        }

        res.status(500).json({ message: "Internal server error" });
    }
};


// ---------------------------
//  NEW: CHECK MPESA STATUS
// ---------------------------
const checkMpesaStatus = (req, res) => {
    const { CheckoutRequestID } = req.query;

    if (!CheckoutRequestID) {
        return res.status(400).json({
            status: 'failed',
            message: 'Missing CheckoutRequestID'
        });
    }

    // If no callback yet → pending
    const record = mpesaStatusStore[CheckoutRequestID] || { status: "pending" };
    res.json(record);
};


module.exports = {
    initiateSTKPush,
    handleCallback,
    checkMpesaStatus
};

