import Order from "../../models/common/Orders.js";

export const orderBook = async (req, res) => {
  try {
    const { customer, shippingAddress, items, paymentMethod } = req.body;

    if (!items || items.length === 0) {
      return res.status(400).json({ message: "No items in order" });
    }
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