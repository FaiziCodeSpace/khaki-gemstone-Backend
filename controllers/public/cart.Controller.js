import Cart from "../../models/public/Cart.js";

export const addToCart = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id; 

    const cart = await Cart.findOneAndUpdate(
      { userId },
      { $addToSet: { items: productId } },
      { new: true, upsert: true } 
    ).populate("items");

    res.status(200).json({
      message: "Product added to cart",
      cart
    });
  } catch (error) {
    res.status(500).json({ message: "Error adding to cart", error: error.message });
  }
};

export const getCart = async (req, res) => {
  try {
    const userId = req.user.id;

    const cart = await Cart.findOne({ userId }).populate("items");

    if (!cart) {
      return res.status(200).json({
        items: [],
      });
    }

    res.status(200).json(cart);
  } catch (error) {
    res.status(500).json({
      message: "Error fetching cart",
      error: error.message,
    });
  }
};
