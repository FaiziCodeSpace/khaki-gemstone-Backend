import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';
import Order from "../../models/common/Orders.js";
import Product from "../../models/common/Products.js";
import Transaction from "../../models/admin/Transactions.js";
import User from "../../models/users/User.js";
import { generatePayfastSignature } from "../../utils/payfast.js"; 

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

        const totalAmount = productsSum;
        const orderNumber = `ORD-${uuidv4().split("-")[0].toUpperCase()}`;
        const userId = req.user ? req.user._id : null;

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
                status: "PENDING",
                isPaid: false,
                paidAt: null
            }],
            { session }
        );

        await Transaction.create(
            [{
                user: userId,
                source: paymentMethod,
                type: "PURCHASE",
                amount: totalAmount,
                order: order._id,
                products: validatedItems.map(i => i.product),
                status: "PENDING"
            }],
            { session }
        );

        await session.commitTransaction();

        // --- NEW PAYFAST INTEGRATION LOGIC ---
        if (paymentMethod === "PAYFAST") {
            const payfastData = {
                merchant_id: process.env.PAYFAST_MERCHANT_ID || '10000100', // Default Sandbox ID
                merchant_key: process.env.PAYFAST_MERCHANT_KEY || '46f0cd694581a', // Default Sandbox Key
                return_url: `${process.env.FRONTEND_URL}/payment/success`,
                cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
                notify_url: `${process.env.BACKEND_URL}/api/orders/payfast-itn`, // This is the ITN route
                name_first: customer.name,
                m_payment_id: order.orderNumber, // Links back to this order
                amount: totalAmount.toFixed(2),
                item_name: `Order ${order.orderNumber}`
            };

            const signature = generatePayfastSignature(payfastData, process.env.PAYFAST_PASSPHRASE);
            
            return res.status(201).json({
                order,
                payfast: {
                    ...payfastData,
                    signature,
                    url: "https://sandbox.payfast.co.za/eng/process" // Switch to live URL later
                }
            });
        }
        // --- END PAYFAST LOGIC ---

        res.status(201).json(order);
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: "Order creation failed", error: error.message });
    } finally {
        session.endSession();
    }
};

export const handlePaymentCancel = async (req, res) => {
    const { orderNumber } = req.params;

    try {
        const order = await Order.findOne({ orderNumber, status: "PENDING" });
        
        if (order) {
            // Revert products to Available
            const productIds = order.items.map(item => item.product);
            await Product.updateMany(
                { _id: { $in: productIds } }, 
                { isActive: true, status: "Available" }
            );

            order.status = "CANCELLED";
            await order.save();
        }

        // Redirect the user back to the shop or cart
        res.redirect(`${process.env.FRONTEND_URL}/shop?message=payment_cancelled`);
    } catch (error) {
        res.status(500).json({ message: "Error cancelling order", error: error.message });
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

        if (typeof isPaid !== 'undefined') {
            if (order.isPaid === true && isPaid === false) {
                throw new Error("A completed payment cannot be reverted to unpaid.");
            }

            if (order.isPaid === false && isPaid === true) {
                order.isPaid = true;
                order.paidAt = Date.now();
                
                await Transaction.findOneAndUpdate(
                    { order: order._id },
                    { status: "SUCCESS" },
                    { session }
                );
            }
        }


        if (status && order.status !== status) {
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

            if (status === "CANCELLED") {
                const productIds = order.items.map(item => item.product);
                await Product.updateMany(
                    { _id: { $in: productIds } }, 
                    { isActive: true, status: "Available" }, 
                    { session }
                );

                if (!order.isPaid) {
                    await Transaction.findOneAndUpdate(
                        { order: order._id }, 
                        { status: "FAILED" }, 
                        { session }
                    );
                }
            }
        }

        order.isUpdated = true;
        await order.save({ session });

        await session.commitTransaction();
        res.status(200).json(order);
    } catch (error) {
        await session.abortTransaction();
        const statusCode = error.message.includes("reverted") ? 400 : 500;
        res.status(statusCode).json({ message: "Update failed", error: error.message });
    } finally {
        session.endSession();
    }
};