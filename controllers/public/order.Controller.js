import Order from "../../models/common/Orders.js";
import Product from "../../models/common/Products.js";
export const orderBook = async (req, res) => {
  try {
    const { customer, shippingAddress, items, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in order" });
    }

    // 1. Extract IDs to check availability
    const productIds = items.map(item => item.product);

    // 2. Find these products in the DB
    const foundProducts = await Product.find({
      _id: { $in: productIds }
    });

    // 3. Validation: Check if all products exist and are active
    for (const item of items) {
      const dbProduct = foundProducts.find(p => p._id.toString() === item.product.toString());

      if (!dbProduct) {
        return res.status(404).json({ message: `Product ${item.product} not found.` });
      }

      if (!dbProduct.isActive) {
        return res.status(400).json({ 
          message: `The item "${dbProduct.name}" is no longer available.` 
        });
      }
    }

    // 4. Proceed with order creation if all checks pass
    const orderNumber = `ORD-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const totalAmount = items.reduce((acc, item) => acc + (item.price * item.quantity), 0);

    const newOrder = new Order({
      orderNumber,
      user: req.user ? req.user._id : null,
      customer,
      shippingAddress,
      items,
      totalAmount,
      paymentMethod
    });

    const savedOrder = await newOrder.save();
    res.status(201).json(savedOrder);

  } catch (error) {
    res.status(500).json({ message: "Order creation failed", error: error.message });
  }
};

export const getOrders = async (req, res) => {
  try {
    const { status, page = 1, limit = 10 } = req.query;

    const filter = {};
    if (status) filter.status = status;
    
    if (req.user.role !== 'admin') filter.user = req.user._id;

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
  const { status } = req.body;

  try {
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (status === "PAID") {
      order.isPaid = true;
      order.paidAt = Date.now();
      
      const productIds = order.items.map(item => item.product);
      await Product.updateMany(
        { _id: { $in: productIds } },
        { $set: { isActive: false } }
      );
    }

    if (status === "DISPATCHED") {
      order.dispatchedAt = Date.now();
    }

    if (status === "DELIVERED") {
      order.deliveredAt = Date.now();
    }

    order.status = status;
    const updatedOrder = await order.save();

    res.status(200).json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: "Update failed", error: error.message });
  }
};