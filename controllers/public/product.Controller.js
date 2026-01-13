import Product from "../../models/common/Products.js";

export const getAllProducts = async (req, res) => {
    try {
        const { limited, limit } = req.query;
        let filter = {};

        // 1. If 'true', only show limited
        if (limited === 'true') {
            filter.isLimitedProduct = true;
        } 
        // 2. If 'false', only show normal products
        else if (limited === 'false') {
            filter.isLimitedProduct = false;
        }
        // 3. If undefined, it returns everything (Normal + Limited)

        const products = await Product.find(filter)
            .sort({ createdAt: -1 })
            .limit(parseInt(limit) || 0);

        return res.status(200).json(products);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

export const getProductById = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        if (!product) {
            return res.status(404).json({ message: "Product not found" });
        }
        return res.status(200).json(product);
    } catch (error) {
        return res.status(500).json({ error: error.message });
    }
};

