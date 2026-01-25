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
      default: null
    },

    customer: {
      name: {
        type: String,
        required: true,
        trim: true
      },
      phone: {
        type: String,
        required: true
      }
    },

    shippingAddress: {
      address: {
        type: String,
        required: true
      },
      city: {
        type: String,
        required: true
      }
    },

    items: [
      {
        product: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "Product",
          required: true
        },
        quantity: {
          type: Number,
          required: true,
          min: 1
        },
        price: {
          type: Number,
          required: true
        }
      }
    ],

    totalAmount: {
      type: Number,
      required: true
    },

    status: {
      type: String,
      enum: ["PENDING", "PAID", "DISPATCHED", "DELIVERED", "CANCELLED"],
      default: "PENDING",
      index: true
    },

    paymentMethod: {
      type: String,
      enum: ["COD", "CARD", "BANK"],
      default: "COD"
    },

    isPaid: {
      type: Boolean,
      default: false
    },

    paidAt: Date,
    dispatchedAt: Date,
    deliveredAt: Date
  },
  {
    timestamps: true
  }
);

const Order = mongoose.models.Order || mongoose.model("Order", orderSchema);
export default Order;
