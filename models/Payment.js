import mongoose from "mongoose";

const paymentSchema = new mongoose.Schema({
  user: {
    name: String,
    email: String,
    phone: String,
  },
  razorpay_order_id: String,
  razorpay_payment_id: String,
  razorpay_signature: String,
  amount: Number, // Optional: if you want to store the amount
  status: {
    type: String,
    default: "success",
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("Payment", paymentSchema);
