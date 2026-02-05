import cron from 'node-cron';

cron.schedule('*/15 * * * *', async () => {
    const expirationTime = new Date(Date.now() - 60 * 60 * 1000); // 1 hour ago

    const abandonedOrders = await Order.find({
        status: 'PENDING',
        paymentMethod: 'PAYFAST',
        createdAt: { $lt: expirationTime }
    });

    for (const order of abandonedOrders) {
        const productIds = order.items.map(item => item.product);
        await Product.updateMany(
            { _id: { $in: productIds } },
            { isActive: true, status: "Available" }
        );
        order.status = 'CANCELLED';
        await order.save();
        console.log(`Released items for abandoned Order: ${order.orderNumber}`);
    }
});