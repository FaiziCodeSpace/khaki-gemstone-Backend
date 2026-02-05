import Order from "../../models/common/Orders.js";
import Transaction from "../../models/admin/Transactions.js";
import { generatePayfastSignature } from "../../utils/payfast.js";

export const handlePayfastITN = async (req, res) => {
    const pfData = { ...req.body };
    const pfSignature = pfData.signature;
    delete pfData.signature;
    const checkSignature = generatePayfastSignature(pfData, process.env.PAYFAST_PASSPHRASE);

    if (pfSignature !== checkSignature) {
        console.error("PAYFAST SECURITY ALERT: Invalid Signature");
        return res.status(400).send("Invalid Signature");
    }

    try {
        const orderNumber = pfData.m_payment_id;
        const paymentStatus = pfData.payment_status;

        const order = await Order.findOne({ orderNumber });
        if (!order) return res.status(404).send("Order not found");

        if (paymentStatus === "COMPLETE") {
            order.isPaid = true;
            order.paidAt = new Date();
            order.status = "PAID";
            order.paymentId = pfData.pf_payment_id; 
            
            await order.save();
            await Transaction.findOneAndUpdate(
                { order: order._id },
                { status: "SUCCESS" }
            );
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error("ITN Error:", error);
        res.status(500).send("Internal Error");
    }
};