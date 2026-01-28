import Product from "../../models/common/Products.js";
import path from 'path';
import fs from 'fs';

export const getAllProducts = async (req, res) => {
    try {
        const { limited, limit, search, category, filter: filterQuery } = req.query;
        let mongoFilter = {};

        // if (req.user?.role !== 'admin') {
        //     mongoFilter.isActive = true;
        // }

        if (limited === 'true') mongoFilter.isLimitedProduct = true;
        if (limited === 'false') mongoFilter.isLimitedProduct = false;

        let conditions = [];

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

// Create Product 
const UPLOAD_BASE_PATH = path.join(process.cwd(), 'uploads');

const safeParse = (data, fallback) => {
    if (typeof data === 'object') return data;
    try {
        return JSON.parse(data || fallback);
    } catch (e) {
        return JSON.parse(fallback);
    }
};

const handleFileUploads = (files, pNum, productObj) => {
    const dirs = ['products', 'lab_test', 'certificate'];
    dirs.forEach(dir => {
        const fullPath = path.join(UPLOAD_BASE_PATH, dir);
        if (!fs.existsSync(fullPath)) fs.mkdirSync(fullPath, { recursive: true });
    });

    if (files['images']) {
        files['images'].forEach((file, idx) => {
            const ext = path.extname(file.originalname) || '.jpg';
            const fileName = `${pNum}_${Date.now()}_${idx}${ext}`;
            const dest = path.join(UPLOAD_BASE_PATH, 'products', fileName);
            fs.renameSync(file.path, dest);
            productObj.imgs_src.push(`/uploads/products/${fileName}`);
        });
    }

    if (files['lab_test']?.[0]) {
        const file = files['lab_test'][0];
        const ext = path.extname(file.originalname) || '.jpg';
        const fileName = `${pNum}_lab_${Date.now()}${ext}`;
        fs.renameSync(file.path, path.join(UPLOAD_BASE_PATH, 'lab_test', fileName));
        productObj.lab_test_img_src = `/uploads/lab_test/${fileName}`;
    }

    if (files['certificate']?.[0]) {
        const file = files['certificate'][0];
        const ext = path.extname(file.originalname) || '.jpg';
        const fileName = `${pNum}_cert_${Date.now()}${ext}`;
        fs.renameSync(file.path, path.join(UPLOAD_BASE_PATH, 'certificate', fileName));
        productObj.certificate_img_src = `/uploads/certificate/${fileName}`;
    }
};

export const createProduct = async (req, res) => {
    try {
        const details = safeParse(req.body.details, "{}");
        const more_information = safeParse(req.body.more_information, "{}");
        const tags = safeParse(req.body.tags, "[]");

        const newProduct = new Product({
            ...req.body,
            price: Number(req.body.price) || 0,
            profitMargin: Number(req.body.profitMargin) || 0, 
            portal: req.body.portal?.toUpperCase(), 
            details,
            more_information: {
                ...more_information,
                weight: Number(more_information.weight) || 0
            },
            tags,
            imgs_src: []
        });

        if (req.files && Object.keys(req.files).length > 0) {
            handleFileUploads(req.files, newProduct.productNumber, newProduct);
        }

        const savedProduct = await newProduct.save();
        res.status(201).json(savedProduct);
    } catch (error) {
        console.error("CREATE ERROR:", error); 
        res.status(500).json({ error: error.message });
    }
};

export const updateProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);
        if (!product) return res.status(404).json({ message: "Product not found" });

        // 1. Use safeParse to match createProduct logic
        const updateData = {
            ...req.body,
            // Ensure portal is uppercase if provided
            ...(req.body.portal && { portal: req.body.portal.toUpperCase() })
        };

        if (req.body.details) updateData.details = safeParse(req.body.details, "{}");

        if (req.body.more_information) {
            const moreInfo = safeParse(req.body.more_information, "{}");
            updateData.more_information = {
                ...moreInfo,
                // Consistency fix: cast weight to number just like in create
                weight: Number(moreInfo.weight) || 0
            };
        }

        if (req.body.tags) updateData.tags = safeParse(req.body.tags, "[]");

        // 2. Consistency fix: ensure numeric types
        if (req.body.price) updateData.price = Number(req.body.price);
        if (req.body.profitMargin) updateData.profitMargin = Number(req.body.profitMargin);

        // 3. Handle Files
        if (req.files && Object.keys(req.files).length > 0) {
            // Note: handleFileUploads modifies the 'product' object by reference
            handleFileUploads(req.files, product.productNumber, product);
            updateData.imgs_src = product.imgs_src;
            updateData.lab_test_img_src = product.lab_test_img_src;
            updateData.certificate_img_src = product.certificate_img_src;
        }

        const updated = await Product.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json(updated);
    } catch (error) {
        console.error("UPDATE ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};

// Delete Product 
export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const deletedProduct = await Product.findByIdAndDelete(id);

        if (!deletedProduct) {
            return res.status(404).json({ message: "Product not found" });
        }

        res.status(200).json({ message: "Product Deleted successfully" });
    } catch (error) {
        res.status(500).json({ message: "Delete failed", error: error.message });
    }
};