import Cart from "../../models/public/Cart.js";

export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;
    const cart = await Cart.findOne({ userId }).populate("items");

    if (!cart) return res.status(200).json([]);

    const availableItems = cart.items.filter(item => item.isActive !== false);
    res.status(200).json(availableItems);
  } catch (error) {
    res.status(500).json({ message: "Error fetching cart" });
  }
};

export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id;

    const cart = await Cart.findOneAndUpdate(
      { userId },
      { $addToSet: { items: productId } },
      { new: true, upsert: true }
    ).populate("items");

    res.status(200).json(cart.items);
  } catch (error) {
    res.status(500).json({ message: "Error adding to cart" });
  }
};

export const removeFromCart = async (req, res) => {
  try {
    const { productId } = req.params;
    const userId = req.user.id;

    const cart = await Cart.findOneAndUpdate(
      { userId },
      { $pull: { items: productId } },
      { new: true }
    ).populate("items");

    res.status(200).json(cart ? cart.items : []);
  } catch (error) {
    res.status(500).json({ message: "Error removing from cart", error: error.message });
  }
};

export const clearCart = async (req, res) => {
    try {
        const id = req.user._id; 
        const updatedCart = await Cart.findOneAndUpdate(
            { userId: id }, 
            { $set: { items: [] } }, 
            { new: true }
        );

        if (!updatedCart) {
            return res.status(404).json({ message: "Cart not found" });
        }

        res.status(200).json({ message: "Cart cleared", items: [] });
    } catch (error) {
        console.error("Clear Cart Error:", error);
        res.status(500).json({ message: "Failed to clear cart" });
    }
};

