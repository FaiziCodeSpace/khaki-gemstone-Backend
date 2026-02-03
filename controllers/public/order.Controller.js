import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';
import Order from "../../models/common/Orders.js";
import Product from "../../models/common/Products.js";
import Transaction from "../../models/admin/Transactions.js";
import User from "../../models/users/User.js";

const DELIVERY_FEE = 250;

export const orderBook = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const { customer, shippingAddress, items, paymentMethod } = req.body;

        const validatedItems = [];
        let productsSum = 0;

        for (const item of items) {
            const product = await Product.findOneAndUpdate(
                { _id: item.product, isActive: true, status: "Active" },
                { isActive: false, status: "Sold" },
                { new: true, session }
            );

            if (!product) throw new Error("One or more items are unavailable");

            productsSum += product.price;
            validatedItems.push({ product: product._id, price: product.price });
        }

        const totalAmount = productsSum + DELIVERY_FEE;
        const orderNumber = `ORD-${uuidv4().split("-")[0].toUpperCase()}`;
        
        const userId = req.user ? req.user._id : null;
        let balanceBefore = 0;
        let balanceAfter = 0;
        let paymentStatus = "PENDING";

        if (userId) {
            const user = await User.findById(userId).session(session);
            if (user) {
                balanceBefore = user.balance || 0;
                balanceAfter = balanceBefore;

                if (paymentMethod === "SOFT_WALLET") {
                    if (balanceBefore < totalAmount) throw new Error("Insufficient wallet balance");
                    balanceAfter = balanceBefore - totalAmount;
                    user.balance = balanceAfter;
                    await user.save({ session });
                    paymentStatus = "SUCCESS";
                }
            }
        } else if (paymentMethod === "SOFT_WALLET") {
            throw new Error("Guest users cannot pay using Soft Wallet");
        }

        // 3. Create Order
        const [order] = await Order.create(
            [{
                orderNumber,
                user: userId,
                customer,
                shippingAddress,
                items: validatedItems,
                totalAmount,
                totalQuantity: validatedItems.length,
                paymentMethod,
                status: paymentStatus === "SUCCESS" ? "PAID" : "PENDING",
                isPaid: paymentStatus === "SUCCESS",
                paidAt: paymentStatus === "SUCCESS" ? Date.now() : null
            }],
            { session }
        );

        // 4. Create Transaction Record
        await Transaction.create(
            [{
                transactionId: `TRX-${uuidv4().split('-')[0].toUpperCase()}`,
                user: userId,
                source: paymentMethod,
                type: "GEMSTONE_PURCHASE",
                amount: totalAmount,
                balanceBefore,
                balanceAfter,
                order: order._id,
                products: validatedItems.map(i => i.product),
                status: paymentStatus
            }],
            { session }
        );

        await session.commitTransaction();
        res.status(201).json(order);
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: "Order creation failed", error: error.message });
    } finally {
        session.endSession();
    }
};

export const getOrders = async (req, res) => {
    try {
        const { status, page = 1, limit = 10 } = req.query;
        const filter = {};
        if (status) filter.status = status;

        const orders = await Order.find(filter)
            .populate("user", "name email") 
            .populate("items.product", "name productNumber")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Order.countDocuments(filter);

        res.status(200).json({
            orders,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
            totalOrders: total
        });
    } catch (error) {
        res.status(500).json({ message: "Error fetching orders", error: error.message });
    }
};

export const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status, isPaid } = req.body;
    const session = await mongoose.startSession();

    try {
        session.startTransaction();
        const order = await Order.findById(id).session(session);
        if (!order) return res.status(404).json({ message: "Order not found" });

        // 1. Sync Payment Toggle
        if (typeof isPaid !== 'undefined' && order.isPaid !== isPaid) {
            order.isPaid = isPaid;
            order.paidAt = isPaid ? Date.now() : null;
            
            await Transaction.findOneAndUpdate(
                { order: order._id },
                { status: isPaid ? "SUCCESS" : "FAILED" },
                { session }
            );
        }

        // 2. Status Transitions
        if (status && order.status !== status) {
            const validTransitions = {
                PENDING: ["PAID", "DISPATCHED", "CANCELLED"],
                PAID: ["DISPATCHED", "CANCELLED"],
                DISPATCHED: ["DELIVERED"],
                DELIVERED: [],
                CANCELLED: []
            };

            if (!validTransitions[order.status]?.includes(status)) {
                throw new Error(`Invalid status transition from ${order.status} to ${status}`);
            }

            order.status = status;
            if (status === "DISPATCHED") order.dispatchedAt = Date.now();
            if (status === "DELIVERED") {
                order.deliveredAt = Date.now();
                if (order.paymentMethod === "COD") {
                    order.isPaid = true;
                    order.paidAt = Date.now();
                    await Transaction.findOneAndUpdate({ order: order._id }, { status: "SUCCESS" }, { session });
                }
            }

            // 3. Handle Cancellation (Stock Revert + Wallet Refund)
            if (status === "CANCELLED") {
                // Revert Product Availability
                const productIds = order.items.map(item => item.product);
                await Product.updateMany({ _id: { $in: productIds } }, { isActive: true }, { session });

                // Update Transaction Status
                await Transaction.findOneAndUpdate({ order: order._id }, { status: "FAILED" }, { session });

                // Refund SOFT_WALLET users
                if (order.paymentMethod === "SOFT_WALLET" && order.user) {
                    const user = await User.findById(order.user).session(session);
                    if (user) {
                        const balanceBefore = user.balance;
                        user.balance += order.totalAmount;
                        await user.save({ session });

                        // Log the Refund Transaction
                        await Transaction.create([{
                            transactionId: `REFUND-${uuidv4().split('-')[0].toUpperCase()}`,
                            user: user._id,
                            type: "INVESTMENT_REFUND",
                            amount: order.totalAmount,
                            balanceBefore,
                            balanceAfter: user.balance,
                            order: order._id,
                            status: "SUCCESS",
                            meta: { reason: "Order Cancelled" }
                        }], { session });
                    }
                }
            }
        }

        order.isUpdated = true;
        await order.save({ session });

        await session.commitTransaction();
        res.status(200).json(order);
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: "Update failed", error: error.message });
    } finally {
        session.endSession();
    }
};