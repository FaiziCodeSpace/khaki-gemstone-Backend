import Product from "../../models/common/Products.js";

export const getAllProducts = async (req, res) => {
    try {
        const { limited, limit, search, category, filter: filterQuery } = req.query;
        let mongoFilter = {};

        if (limited === 'true') mongoFilter.isLimitedProduct = true;
        if (limited === 'false') mongoFilter.isLimitedProduct = false;

        let conditions = [];

        // 1. ULTIMATE SEARCH: Checks every text field
        if (search) {
            conditions.push({
                $or: [
                    { name: { $regex: search, $options: 'i' } },
                    { description: { $regex: search, $options: 'i' } },
                    { tags: { $regex: search, $options: 'i' } },
                    { "details.gemstone": { $regex: search, $options: 'i' } },
                    { "details.cut_type": { $regex: search, $options: 'i' } },
                    { "details.color": { $regex: search, $options: 'i' } },
                    { "details.clarity": { $regex: search, $options: 'i' } },
                    { "more_information.origin": { $regex: search, $options: 'i' } },
                    { "more_information.treatment": { $regex: search, $options: 'i' } },
                    { productNumber: { $regex: search, $options: 'i' } }
                ]
            });
        }

        // 2. Category & Filter: Checking the Tags "Safety Net"
        // We use Regex here too so 'Rough' matches 'Rough Stones'
        if (category) {
            const catPattern = category.split(',').map(s => s.trim()).join('|');
            conditions.push({ tags: { $regex: catPattern, $options: 'i' } });
        }

        if (filterQuery) {
            const filterPattern = filterQuery.split(',').map(s => s.trim()).join('|');
            conditions.push({ tags: { $regex: filterPattern, $options: 'i' } });
        }

        if (conditions.length > 0) {
            mongoFilter.$and = conditions;
        }

        const products = await Product.find(mongoFilter)
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

