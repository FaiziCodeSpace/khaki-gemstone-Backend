// controllers/Webhook/ITN.Controller.js
import Orders from "../../models/common/Orders.js";
import Transaction from "../../models/admin/Transactions.js";
import { generatePayfastSignature } from "../../utils/payfast.js";

export const handlePayfastITN = async (req, res) => {
    try {
        const itnData = req.body;
        const { m_payment_id, payment_status, amount_gross, pf_payment_id, signature } = itnData;

        // --- SECURITY: Verify Signature ---
        const dataForSignature = { ...itnData };
        delete dataForSignature.signature; // Remove signature to re-calculate it
        const checkSignature = generatePayfastSignature(dataForSignature, process.env.PAYFAST_PASSPHRASE);

        if (signature !== checkSignature) {
            console.error("ITN Security Breach: Signature Mismatch");
            return res.status(400).send("Invalid Signature");
        }

        const order = await Orders.findOne({ orderNumber: m_payment_id });
        if (!order) return res.status(404).send("Order not found");

        // --- RULE: Don't process if already paid (Idempotency) ---
        if (order.isPaid) {
            return res.status(200).send("OK"); // Already processed
        }

        if (payment_status === "COMPLETE") {
            // PayFast amount is a string, order amount is a number
            if (Math.abs(parseFloat(amount_gross) - order.totalAmount) < 0.01) {
                order.isPaid = true;
                order.status = "PAID";
                order.paidAt = Date.now();
                order.paymentId = pf_payment_id;
                await order.save();

                await Transaction.findOneAndUpdate(
                    { order: order._id },
                    { status: "SUCCESS" }
                );
            }
        } else if (payment_status === "CANCELLED" || payment_status === "FAILED") {
            // Optional: You could trigger the "Available" inventory revert here 
            // but your Cron job handles this safely anyway.
        }

        res.status(200).send("OK");
    } catch (error) {
        console.error("ITN Error:", error);
        res.status(500).send("Internal Server Error");
    }
};