import mongoose from "mongoose";
import { v4 as uuidv4 } from 'uuid';
import Order from "../../models/common/Orders.js";
import Product from "../../models/common/Products.js";

const DELIVERY_FEE = 250;

export const orderBook = async (req, res) => {
  const session = await mongoose.startSession();
  try {
    session.startTransaction();
    const { customer, shippingAddress, items, paymentMethod } = req.body;

    const validatedItems = [];
    let productsSum = 0; // Separate sum for products

    for (const item of items) {
      const product = await Product.findOneAndUpdate(
        { _id: item.product, isActive: true },
        { isActive: false },
        { new: true, session }
      );

      if (!product) throw new Error("One or more items are unavailable");

      productsSum += product.price;
      validatedItems.push({ product: product._id, price: product.price });
    }

    const orderNumber = `ORD-${uuidv4().split("-")[0].toUpperCase()}`;

    const order = await Order.create(
      [
        {
          orderNumber,
          user: req.user ? req.user._id : null,
          customer,
          shippingAddress,
          items: validatedItems,
          // ✅ FIX: Add Delivery Fee to the total stored in DB
          totalAmount: productsSum + DELIVERY_FEE,
          totalQuantity: validatedItems.length,
          paymentMethod,
          status: "PENDING"
        }
      ],
      { session }
    );

    await session.commitTransaction();
    res.status(201).json(order[0]);
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

    // if (req.user.role !== 'admin') filter.user = req.user._id;

    const orders = await Order.find(filter)
      .populate("user", "name email")
      .populate("items.product", "name image")
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

  try {
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: "Order not found" });

    // Handle Payment Toggle
    if (typeof isPaid !== 'undefined') {
      order.isPaid = isPaid;
      order.paidAt = isPaid ? Date.now() : null;
    }

    // Handle Status Transitions
    if (status && order.status !== status) {
      const validTransitions = {
        PENDING: ["PAID", "DISPATCHED", "CANCELLED"],
        PAID: ["DISPATCHED", "CANCELLED"],
        DISPATCHED: ["DELIVERED"],
        DELIVERED: [],
        CANCELLED: []
      };

      const allowed = validTransitions[order.status];
      if (allowed && allowed.includes(status)) {
        order.status = status;
        
        if (status === "DISPATCHED") order.dispatchedAt = Date.now();
        if (status === "DELIVERED") {
          order.deliveredAt = Date.now();
          // Logic: If COD and delivered, it's usually paid now
          if (order.paymentMethod === "COD") {
            order.isPaid = true;
            order.paidAt = Date.now();
          }
        }
      }
    }
    order.isUpdated = true;
    await order.save();
    res.status(200).json(order);
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};
