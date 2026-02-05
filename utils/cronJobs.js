import cron from 'node-cron';
import Order from '../models/common/Orders.js';
import Product from '../models/common/Products.js';

cron.schedule('*/15 * * * *', async () => {
    // 1 hour ago
    const expirationTime = new Date(Date.now() - 60 * 60 * 1000); 

    const abandonedOrders = await Order.find({
        status: 'PENDING',
        paymentMethod: 'PAYFAST',
        createdAt: { $lt: expirationTime }
    });

    for (const order of abandonedOrders) {
        for (const item of order.items) {
            // Check if this specific item had an investor
            const productUpdate = item.investment 
                ? { 
                    status: "For Sale", 
                    portal: "PUBLIC BY INVESTED", 
                    isActive: true 
                  } 
                : { 
                    status: "Available", 
                    portal: "INVESTOR", 
                    isActive: true 
                  };

            await Product.findByIdAndUpdate(item.product, productUpdate);
        }

        order.status = 'CANCELLED';
        await order.save();
        console.log(`[CRON] Order ${order.orderNumber} cancelled. Inventory restored.`);
    }
});