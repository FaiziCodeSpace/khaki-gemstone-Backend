import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';
import Order from "../../models/common/Orders.js";
import Product from "../../models/common/Products.js";
import Transaction from "../../models/admin/Transactions.js";
import User from "../../models/users/User.js";
import Investment from "../../models/investment/Investments.js";
import { generatePayfastSignature } from "../../utils/payfast.js";
import Cart from "../../models/public/Cart.js";

export const orderBook = async (req, res) => {
    const session = await mongoose.startSession();
    try {
        session.startTransaction();
        const { customer, shippingAddress, items, paymentMethod } = req.body;

        const validatedItems = [];
        let productsSum = 0;

        for (const item of items) {
            // 1. Find and lock the product
            const product = await Product.findOneAndUpdate(
                {
                    _id: item.product,
                    isActive: true,
                    status: { $in: ["Available", "For Sale"] }
                },
                { isActive: false, status: "Reserved" },
                { new: true, session }
            );

            if (!product) {
                throw new Error(`Item ${item.product} is no longer available.`);
            }

            // 2. Check for investment link
            const investment = await Investment.findOne({
                product: product._id,
                status: 'ACTIVE'
            }).session(session);

            validatedItems.push({
                product: product._id,
                price: product.publicPrice || product.price,
                investment: investment ? investment._id : null
            });

            productsSum += (product.publicPrice || product.price);
        }

        const orderNumber = `ORD-${uuidv4().split("-")[0].toUpperCase()}`;
        const userId = req.user ? (req.user._id || req.user.id) : null;

        // 3. Create the Order
        const [order] = await Order.create(
            [{
                orderNumber,
                user: userId,
                customer,
                shippingAddress,
                items: validatedItems,
                totalAmount: productsSum,
                totalQuantity: validatedItems.length,
                paymentMethod,
                status: "PENDING",
                isPaid: false
            }],
            { session }
        );

        // 4. Create the Transaction record
        await Transaction.create([{
            user: userId,
            source: paymentMethod,
            type: "GEMSTONE_PURCHASE",
            amount: productsSum,
            order: order._id,
            products: validatedItems.map(i => i.product),
            status: "PENDING"
        }], { session });

        await session.commitTransaction();

        try {
            const purchasedProductIds = validatedItems.map(i => i.product);
            await Cart.updateMany(
                { items: { $in: purchasedProductIds } }, 
                { $pull: { items: { $in: purchasedProductIds } } }
            );
        } catch (cleanupErr) {
            console.error("Non-critical: Global cart pull failed", cleanupErr);
        }
        const successResponse = {
            type: 'SUCCESS',
            order,
            message: "Order placed successfully"
        };

        if (paymentMethod === "PAYFAST") {
            const payfastData = {
                merchant_id: process.env.PAYFAST_MERCHANT_ID || '10000100',
                merchant_key: process.env.PAYFAST_MERCHANT_KEY || '46f0cd694581a',
                return_url: `${process.env.FRONTEND_URL}/payment/success`,
                cancel_url: `${process.env.FRONTEND_URL}/payment/cancel`,
                notify_url: `${process.env.BACKEND_URL}/api/orders/payfast-itn`,
                name_first: customer.name.split(" ")[0],
                m_payment_id: order.orderNumber,
                amount: productsSum.toFixed(2),
                item_name: `Order ${order.orderNumber}`
            };

            const signature = generatePayfastSignature(payfastData, process.env.PAYFAST_PASSPHRASE);
            
            return res.status(201).json({ 
                ...successResponse, 
                payfast: { ...payfastData, signature, url: "https://sandbox.payfast.co.za/eng/process" } 
            });
        }

        return res.status(201).json(successResponse);

    } catch (error) {
        if (session.inAtomTransaction()) await session.abortTransaction();
        console.error("Checkout Final Error:", error);
        res.status(500).json({ type: 'ERROR', message: error.message });
    } finally {
        session.endSession();
    }
};

export const updateOrderStatus = async (req, res) => {
    const { id } = req.params;
    const { status, isPaid } = req.body;
    const session = await mongoose.startSession();

    try {
        session.startTransaction();

        const order = await Order.findById(id).session(session);
        if (!order) throw new Error("Order not found");

        if (typeof isPaid !== 'undefined' && !order.isPaid && isPaid) {
            order.isPaid = true;
            order.paidAt = Date.now();
            await Transaction.findOneAndUpdate(
                { order: order._id },
                { status: "SUCCESS" },
                { session }
            );
        }


        if (status && order.status !== status) {
            const oldStatus = order.status;
            order.status = status;

            if (status === "DISPATCHED") {
                order.dispatchedAt = Date.now();
            }

            if (status === "DELIVERED" && oldStatus !== "DELIVERED") {
                order.deliveredAt = Date.now();

                for (const item of order.items) {
                    await Product.findByIdAndUpdate(
                        item.product,
                        { status: "Sold", isActive: false },
                        { session }
                    );

                    if (item.investment) {
                        const inv = await Investment.findOne({
                            _id: item.investment,
                            status: 'ACTIVE'
                        }).session(session);

                        if (inv) {
                            const pureGain = inv.totalExpectedReturn - inv.investmentAmount;

                            await User.findByIdAndUpdate(inv.user, {
                                $inc: {
                                    "investor.totalEarnings": inv.totalExpectedReturn,
                                    "investor.pureProfit": pureGain,
                                    "investor.totalInvestment": -inv.investmentAmount
                                }
                            }, { session });

                            inv.status = 'COMPLETED';
                            await inv.save({ session });
                        }
                    }
                }
            }

            if (status === "CANCELLED" && oldStatus !== "CANCELLED") {
                for (const item of order.items) {
                    const activeInv = await Investment.findOne({
                        product: item.product,
                        status: 'ACTIVE'
                    }).session(session);

                    const productUpdate = activeInv
                        ? {
                            status: "For Sale",
                            portal: "PUBLIC BY INVESTED",
                            isActive: true
                        }
                        : {
                            status: "Available",
                            portal: "INVESTOR",
                            isActive: true
                        };

                    await Product.findByIdAndUpdate(item.product, productUpdate, { session });
                }

                await Transaction.findOneAndUpdate(
                    { order: order._id },
                    { status: "CANCELLED" },
                    { session }
                );
            }
        }

        await order.save({ session });
        await session.commitTransaction();

        return res.status(200).json(order);

    } catch (error) {
        await session.abortTransaction();
        return res.status(400).json({ message: error.message });
    } finally {
        session.endSession();
    }
};

export const handlePaymentCancel = async (req, res) => {
    const { orderNumber } = req.params;
    const session = await mongoose.startSession();

    try {
        session.startTransaction();
        const order = await Order.findOne({ orderNumber, status: "PENDING" }).session(session);

        if (order) {
            for (const item of order.items) {
                const activeInv = await Investment.findOne({ product: item.product, status: 'ACTIVE' }).session(session);

                const productUpdate = activeInv
                    ? { status: "For Sale", portal: "PUBLIC BY INVESTED", isActive: true }
                    : { status: "Available", portal: "INVESTOR", isActive: true };

                await Product.findByIdAndUpdate(item.product, productUpdate, { session });
            }
            order.status = "CANCELLED";
            await order.save({ session });
        }

        await session.commitTransaction();
        res.redirect(`${process.env.FRONTEND_URL}/shop?message=payment_cancelled`);
    } catch (error) {
        await session.abortTransaction();
        res.status(500).json({ message: "Error cancelling order", error: error.message });
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
