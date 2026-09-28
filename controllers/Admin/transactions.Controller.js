import Transaction from "../../models/admin/Transactions.js";

export const getAllTransactions = async (req, res) => {
    try {
        const { status, type, userId, page = 1, limit = 10 } = req.query;

        // Build Query Object
        const query = {};
        if (status) query.status = status;
        if (type) query.type = type;
        if (userId) query.user = userId;

        // Execute query with pagination and population
        const transactions = await Transaction.find(query)
            .populate("user", "name email")
            .populate("order")
            .populate("products", "name price productNumber")
            .sort({ createdAt: -1 })
            .limit(limit * 1)
            .skip((page - 1) * limit);

        const total = await Transaction.countDocuments(query);

        res.status(200).json({
            success: true,
            count: transactions.length,
            totalPages: Math.ceil(total / limit),
            currentPage: Number(page),
            data: transactions,
        });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};


export const getTransactionById = async (req, res) => {
    try {
        const { id } = req.params;

        // Search by either MongoDB _id OR your custom transactionId string
        const transaction = await Transaction.findOne({
            $or: [{ _id: mongoose.isValidObjectId(id) ? id : null }, { transactionId: id }]
        })
        .populate("user", "name email")
        .populate("order")
        .populate("products")
        .populate("investment");

        if (!transaction) {
            return res.status(404).json({ success: false, message: "Transaction not found" });
        }

        res.status(200).json({ success: true, data: transaction });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
};