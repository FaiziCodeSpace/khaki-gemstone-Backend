import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';

const transactionSchema = new mongoose.Schema(
    {
        transactionId: {
            type: String,
            unique: true,
            index: true,
            default: () => `TRX-${uuidv4().split('-')[0].toUpperCase()}`
        },

        user: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: false,
            index: true
        },
        source: {
            type: String,
            enum: ["SOFT_WALLET", "BANK_TRANSFER", "CREDIT_CARD", "JAZZ_CASH", "EASY_PAISA", "COD", "PAYFAST", "CASH", "POS"],
        },
        type: {
            type: String,
            enum: [
                "INVESTMENT",
                "INVESTMENT_REFUND",
                "BALANCE_TOPUP",
                "GEMSTONE_PURCHASE"
            ],
            required: true
        },

        amount: {
            type: Number,
            required: true
        },

        currency: {
            type: String,
            default: "PKR"
        },

        balanceBefore: {
            type: Number,
        },

        balanceAfter: {
            type: Number,
        },

        status: {
            type: String,
            enum: ["PENDING", "SUCCESS", "FAILED"],
            default: "SUCCESS"
        },

        investment: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Investment"
        },
        order: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Order",
            index: true
        },
        products: [
            {
                type: mongoose.Schema.Types.ObjectId,
                ref: "Product"
            }
        ],

        paymentRef: {
            type: String
        },

        meta: {
            type: Object
        }
    },
    { timestamps: true }
);

export default mongoose.model("Transaction", transactionSchema);
