import mongoose from "mongoose";

const orderSchema = new mongoose.Schema(
  {
    orderNumber: {
      type: String,
      unique: true,
      required: true,
      index: true
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
      index: true
    },
    customer: {
      name: { type: String, required: true, trim: true },
      phone: { type: String, required: true }
    },
    shippingAddress: {
      address: { type: String, required: true },
      city: { type: String, required: true }
    },
    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        price: { type: Number, required: true },
        investment: { type: mongoose.Schema.Types.ObjectId, ref: "Investment", default: null } 
      }
    ],
    totalAmount: { type: Number, required: true },
    totalQuantity: { type: Number, required: true },
    status: {
      type: String,
      enum: ["PENDING", "PAID", "DISPATCHED", "DELIVERED", "CANCELLED"],
      default: "PENDING",
      index: true
    },
    paymentMethod: {
      type: String,
      enum: ["COD", "PAYFAST", "CASH", "POS", "BANK_TRANSFER"],
      default: "COD"
    },
    paymentId: {
      type: String,
      default: null
    },
    isUpdated: {
      type: Boolean,
      default: false
    },
    isPaid: {
      type: Boolean,
      default: false
    },
    paidAt: Date,
    dispatchedAt: Date,
    deliveredAt: Date
  },
  { timestamps: true }
);

export default mongoose.models.Order || mongoose.model("Order", orderSchema);
