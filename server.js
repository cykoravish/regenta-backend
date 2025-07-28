import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import Razorpay from "razorpay";
import crypto from "crypto";
import { dbConnect } from "./helpers/dbConnect.js";
import Payment from "./models/Payment.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize Razorpay
const razorpay = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID || "rzp_test_9999999999",
  key_secret: process.env.RAZORPAY_KEY_SECRET || "your_secret_key_here",
});

// Routes
app.get("/", (req, res) => {
  res.json({ message: "Razorpay Backend Server is running!" });
});

// Create order
app.post("/api/create-order", async (req, res) => {
  try {
    const { amount, currency = "INR" } = req.body;

    if (!amount) {
      return res.status(400).json({ error: "Amount is required" });
    }

    const options = {
      amount: Math.round(amount * 100), // Convert to paise
      currency,
      receipt: `receipt_${Date.now()}`,
      payment_capture: 1,
    };

    const order = await razorpay.orders.create(options);

    res.json({
      success: true,
      order: {
        id: order.id,
        amount: order.amount,
        currency: order.currency,
      },
    });
  } catch (error) {
    console.error("Error creating order:", error);
    res.status(500).json({
      error: "Failed to create order",
      details: error.message,
    });
  }
});

// Verify payment
app.post("/api/verify-payment", async (req, res) => {
  try {
    const {
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      user,
      amount,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({
        success: false,
        error: "Missing required payment details",
      });
    }

    // Create signature for verification
    const body = razorpay_order_id + "|" + razorpay_payment_id;
    const expectedSignature = crypto
      .createHmac(
        "sha256",
        process.env.RAZORPAY_KEY_SECRET || "your_secret_key_here"
      )
      .update(body.toString())
      .digest("hex");

    const isAuthentic = expectedSignature === razorpay_signature;

    if (isAuthentic) {
      await Payment.create({
        user, // expects { name, email, phone }
        razorpay_order_id,
        razorpay_payment_id,
        razorpay_signature,
        amount,
        status: "success",
      });

      console.log("Payment verified & saved to DB");

      res.json({
        success: true,
        message: "Payment verified and saved to database",
      });
    } else {
      res.status(400).json({
        success: false,
        error: "Payment verification failed",
        details: error.message,
      });
    }
  } catch (error) {
    console.error("Error verifying payment:", error);
    res.status(500).json({
      success: false,
      error: "Payment verification failed",
      details: error.message,
    });
  }
});

// Get payment details
app.get("/api/payment/:paymentId", async (req, res) => {
  try {
    const { paymentId } = req.params;
    const payment = await razorpay.payments.fetch(paymentId);

    res.json({
      success: true,
      payment,
    });
  } catch (error) {
    console.error("Error fetching payment:", error);
    res.status(500).json({
      error: "Failed to fetch payment details",
      details: error.message,
    });
  }
});

dbConnect().then(() => {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
});
