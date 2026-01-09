import Favorite from "../../models/public/Favorite.js";

export const addToFavorite = async (req, res) => {
  try {
    const { productId } = req.body;
    const userId = req.user.id; 

    const cart = await Favorite.findOneAndUpdate(
      { userId },
      { $addToSet: { items: productId } },
      { new: true, upsert: true } 
    ).populate("items");

    res.status(200).json({
      message: "Product added to Favorite",
      cart
    });
  } catch (error) {
    res.status(500).json({ message: "Error adding to Favorite", error: error.message });
  }
};