import Product from "../../models/common/Products.js";
import path from 'path';
import fs from 'fs';

const safeParse = (data, fallback) => {
    if (typeof data === 'object' && data !== null) return data;
    try {
        return data ? JSON.parse(data) : JSON.parse(fallback);
    } catch (e) {
        return JSON.parse(fallback);
    }
};

export const getAllProducts = async (req, res) => {
    try {
        const { limited, limit, search, category, filter: filterQuery, portal, page, isAdmin } = req.query;

        const pageNum = parseInt(page) || 1;
        const limitNum = parseInt(limit) || 0;
        const skip = (pageNum - 1) * limitNum;

        let mongoFilter = {};

        if (isAdmin !== 'true') {
            mongoFilter.isActive = true;
            mongoFilter.status = { $in: ["Available", "For Sale"] };
        }

        if (limited === 'true') mongoFilter.isLimitedProduct = true;
        if (limited === 'false') mongoFilter.isLimitedProduct = false;

        let conditions = [];

        if (portal) {
            conditions.push({ portal: portal.toUpperCase() });
        }

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

        const totalProducts = await Product.countDocuments(mongoFilter);

        const products = await Product.find(mongoFilter)
            .sort({ createdAt: -1 })
            .skip(limitNum > 0 ? skip : 0)
            .limit(limitNum);

        return res.status(200).json({
            products,
            totalProducts,
            totalPages: limitNum > 0 ? Math.ceil(totalProducts / limitNum) : 1,
            currentPage: pageNum
        });
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

const UPLOAD_BASE_PATH = path.join(process.cwd(), 'uploads');

const ensureDirs = async () => {
    const dirs = ['products', 'lab_test', 'certificate'];
    for (const dir of dirs) {
        const fullPath = path.join(UPLOAD_BASE_PATH, dir);
        if (!fs.existsSync(fullPath)) {
            await fs.promises.mkdir(fullPath, { recursive: true });
        }
    }
};

const handleFileUploads = async (files, pNum, productObj) => {
    await ensureDirs();

    if (files['images']) {
        productObj.imgs_src = [];
        for (let idx = 0; idx < files['images'].length; idx++) {
            const file = files['images'][idx];
            const ext = path.extname(file.originalname) || '.jpg';
            const fileName = `${pNum}_${Date.now()}_${idx}${ext}`;
            const dest = path.join(UPLOAD_BASE_PATH, 'products', fileName);

            await fs.promises.rename(file.path, dest);
            productObj.imgs_src.push(`/uploads/products/${fileName}`);
        }
    }

    if (files['lab_test']?.[0]) {
        const file = files['lab_test'][0];
        const ext = path.extname(file.originalname) || '.jpg';
        const fileName = `${pNum}_lab_${Date.now()}${ext}`;
        const dest = path.join(UPLOAD_BASE_PATH, 'lab_test', fileName);

        await fs.promises.rename(file.path, dest);
        productObj.lab_test_img_src = `/uploads/lab_test/${fileName}`;
    }

    if (files['certificate']?.[0]) {
        const file = files['certificate'][0];
        const ext = path.extname(file.originalname) || '.jpg';
        const fileName = `${pNum}_cert_${Date.now()}${ext}`;
        const dest = path.join(UPLOAD_BASE_PATH, 'certificate', fileName);

        await fs.promises.rename(file.path, dest);
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
            profitSharingModel: Number(req.body.profitSharingModel) || 0,

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
            await handleFileUploads(req.files, newProduct.productNumber, newProduct);
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

        const updateData = { ...req.body };

        if (req.body.price !== undefined) updateData.price = Number(req.body.price) || 0;
        if (req.body.profitMargin !== undefined) updateData.profitMargin = Number(req.body.profitMargin) || 0;
        if (req.body.profitSharingModel !== undefined) updateData.profitSharingModel = Number(req.body.profitSharingModel) || 0;

        if (req.body.portal) updateData.portal = req.body.portal.toUpperCase();

        if (req.body.details) updateData.details = safeParse(req.body.details, "{}");
        if (req.body.tags) updateData.tags = safeParse(req.body.tags, "[]");

        if (req.body.more_information) {
            const moreInfo = safeParse(req.body.more_information, "{}");
            updateData.more_information = {
                ...moreInfo,
                weight: Number(moreInfo.weight) || 0
            };
        }

        if (req.files && Object.keys(req.files).length > 0) {
            if (req.files['images']) {
                product.imgs_src.forEach(oldPath => deletePhysicalFile(oldPath));
            }
            if (req.files['lab_test']) {
                deletePhysicalFile(product.lab_test_img_src);
            }
            if (req.files['certificate']) {
                deletePhysicalFile(product.certificate_img_src);
            }

            await handleFileUploads(req.files, product.productNumber, product);
        }

        updateData.imgs_src = product.imgs_src;
        updateData.lab_test_img_src = product.lab_test_img_src;
        updateData.certificate_img_src = product.certificate_img_src;

        const updated = await Product.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json(updated);
    } catch (error) {
        console.error("UPDATE ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};

const deletePhysicalFile = (relativePath) => {
    if (!relativePath) return;
    const cleanPath = relativePath.startsWith('/') ? relativePath.substring(1) : relativePath;
    const absolutePath = path.join(process.cwd(), cleanPath);

    if (fs.existsSync(absolutePath)) {
        fs.promises.unlink(absolutePath).catch(err => console.error("Unlink error:", err));
    }
};

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);

        if (!product) return res.status(404).json({ message: "Not found" });

        product.imgs_src.forEach(path => deletePhysicalFile(path));
        deletePhysicalFile(product.lab_test_img_src);
        deletePhysicalFile(product.certificate_img_src);

        await Product.findByIdAndDelete(id);

        res.status(200).json({ message: "Product and files deleted!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};