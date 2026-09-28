import Product from "../../models/common/Products.js";
import cloudinary from '../../config/cloudinary.js';
import { uploadBuffer } from '../../utils/uploadToCloudinary.js';

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

        if (portal?.toUpperCase() === 'PUBLIC') {
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

// Each file arrives from multer as an in-memory buffer (req.files[field][i].buffer);
// this uploads them all to Cloudinary in parallel and stores back the URL + public_id.
const handleFileUploads = async (files, pNum, productObj) => {
    if (files['images']) {
        const uploads = files['images'].map((file, idx) =>
            uploadBuffer(file.buffer, {
                folder: 'khakigemstone/products',
                public_id: `${pNum}_${Date.now()}_${idx}`,
            })
        );
        const results = await Promise.all(uploads);
        productObj.imgs_src = results.map(r => r.secure_url);
        productObj.imgs_public_id = results.map(r => r.public_id);
    }

    if (files['lab_test']?.[0]) {
        const result = await uploadBuffer(files['lab_test'][0].buffer, {
            folder: 'khakigemstone/lab_test',
            public_id: `${pNum}_lab_${Date.now()}`,
        });
        productObj.lab_test_img_src = result.secure_url;
        productObj.lab_test_img_public_id = result.public_id;
    }

    if (files['certificate']?.[0]) {
        const result = await uploadBuffer(files['certificate'][0].buffer, {
            folder: 'khakigemstone/certificate',
            public_id: `${pNum}_cert_${Date.now()}`,
        });
        productObj.certificate_img_src = result.secure_url;
        productObj.certificate_img_public_id = result.public_id;
    }
};

export const createProduct = async (req, res) => {
    try {
        const details = safeParse(req.body.details, "{}");
        const moreInfo = safeParse(req.body.more_information, "{}");
        const tags = safeParse(req.body.tags, "[]");

        const newProduct = new Product({
            productNumber: req.body.productNumber,
            name: req.body.name,
            description: req.body.description,
            gem_size: req.body.gem_size,
            location: req.body.location,

            price: Number(req.body.price) || 0,
            profitMargin: Number(req.body.profitMargin) || 0,
            profitSharingModel: Number(req.body.profitSharingModel) || 0,

            portal: req.body.portal?.toUpperCase(),
            details,
            more_information: moreInfo,
            tags,

            imgs_src: []
        });

        if (!newProduct.productNumber) {
            return res.status(400).json({ error: "Product Number is required." });
        }

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
                weight: moreInfo.weight
            };
        }

        if (req.files && Object.keys(req.files).length > 0) {
            if (req.files['images']) {
                (product.imgs_public_id || []).forEach(id => deleteCloudinaryFile(id));
            }
            if (req.files['lab_test']) {
                deleteCloudinaryFile(product.lab_test_img_public_id);
            }
            if (req.files['certificate']) {
                deleteCloudinaryFile(product.certificate_img_public_id);
            }

            await handleFileUploads(req.files, product.productNumber, product);
        }

        updateData.imgs_src = product.imgs_src;
        updateData.imgs_public_id = product.imgs_public_id;
        updateData.lab_test_img_src = product.lab_test_img_src;
        updateData.lab_test_img_public_id = product.lab_test_img_public_id;
        updateData.certificate_img_src = product.certificate_img_src;
        updateData.certificate_img_public_id = product.certificate_img_public_id;

        const updated = await Product.findByIdAndUpdate(id, updateData, { new: true });
        res.status(200).json(updated);
    } catch (error) {
        console.error("UPDATE ERROR:", error);
        res.status(500).json({ error: error.message });
    }
};

// Fire-and-forget Cloudinary deletion — mirrors the old local-disk unlink:
// best-effort cleanup, never blocks or fails the request over it.
const deleteCloudinaryFile = (publicId) => {
    if (!publicId) return;
    cloudinary.uploader.destroy(publicId).catch(err => console.error("Cloudinary destroy error:", err));
};

export const deleteProduct = async (req, res) => {
    try {
        const { id } = req.params;
        const product = await Product.findById(id);

        if (!product) return res.status(404).json({ message: "Not found" });

        (product.imgs_public_id || []).forEach(pid => deleteCloudinaryFile(pid));
        deleteCloudinaryFile(product.lab_test_img_public_id);
        deleteCloudinaryFile(product.certificate_img_public_id);

        await Product.findByIdAndDelete(id);

        res.status(200).json({ message: "Product and files deleted!" });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};