import User from "../models/users/User.js";
import Order from "../models/common/Orders.js";
import Product from "../models/common/Products.js";
import Investment from "../models/investment/Investments.js";
import Transactions from "../models/admin/Transactions.js";

export const getDashboardMetrics = async () => {
  try {
    const now = new Date();
    const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
    const last7d = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

    // Run all major category queries in parallel
    const [userMetrics, orderMetrics, investmentMetrics, transactionMetrics, totalProducts, productsInvestedArr] = await Promise.all([
      /* 1. USER METRICS */
      User.aggregate([
        {
          $facet: {
            totalUsers: [{ $count: "count" }],
            usersLast24h: [{ $match: { createdAt: { $gte: last24h } } }, { $count: "count" }],
            usersBefore24h: [{ $match: { createdAt: { $lt: last24h } } }, { $count: "count" }],
            totalInvestors: [{ $match: { isInvestor: true } }, { $count: "count" }],
            activeInvestors: [{ $match: { isInvestor: true, lastInvestorVisitAt: { $gte: last7d } } }, { $count: "count" }],
            pendingApplications: [{ $match: { "investor.status": "pending", isInvestor: true } }, { $count: "count" }]
          }
        }
      ]),

      /* 2. ORDER METRICS */
      Order.aggregate([
        {
          $facet: {
            totalOrders: [{ $match: { status: { $ne: "CANCELLED" } } }, { $count: "count" }],
            newOrders: [{ $match: { createdAt: { $gte: last24h }, status: "PENDING" } }, { $count: "count" }],
            dispatchedOrders: [{ $match: { status: "DISPATCHED" } }, { $count: "count" }],
            revenue: [
              { $match: { isPaid: true, status: { $ne: "CANCELLED" } } },
              { $group: { _id: null, total: { $sum: "$totalAmount" } } }
            ],
            customers: [
              { $group: { _id: { $cond: [{ $gt: ["$user", null] }, "$user", "$customer.phone"] } } },
              { $count: "total" }
            ],
            revenueOverview: [
              {
                $match: {
                  status: { $in: ["PAID", "DISPATCHED", "COMPLETED"] },
                  createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
                }
              },
              {
                $group: {
                  _id: { $dateToString: { format: "%Y-%m-%d", date: "$createdAt" } },
                  revenue: { $sum: "$totalAmount" }
                }
              },
              { $sort: { "_id": 1 } }
            ]
          }
        }
      ]),

      /* 3. INVESTMENT METRICS */
      Investment.aggregate([
        {
          $facet: {
            counts: [{ $count: "total" }],
            activeInvestment: [
              { $match: { status: "ACTIVE" } },
              { $group: { _id: null, total: { $sum: "$amount" } } }
            ],
            capital: [
              { $group: { _id: null, invested: { $sum: "$amount" }, returned: { $sum: "$returnedAmount" } } }
            ]
          }
        }
      ]),

      /* 4. TRANSACTION METRICS */
      Transactions.aggregate([
        {
          $facet: {
            newTransactions: [{ $match: { createdAt: { $gte: last24h } } }, { $count: "count" }],
            volume: [{ $match: { status: "SUCCESS" } }, { $group: { _id: null, total: { $sum: "$amount" } } }]
          }
        }
      ]),

      /* 5. SIMPLE COUNTS */
      Product.countDocuments(),
      Investment.distinct("product")
    ]);

    // Format results to match your original response structure
    const u = userMetrics[0];
    const o = orderMetrics[0];
    const i = investmentMetrics[0];
    const t = transactionMetrics[0];

    const usersBefore24h = u.usersBefore24h[0]?.count || 0;
    const usersLast24h = u.usersLast24h[0]?.count || 0;

    return {
      totalUsers: u.totalUsers[0]?.count || 0,
      usersGrowthPercent: usersBefore24h === 0 ? 100 : Number(((usersLast24h / usersBefore24h) * 100).toFixed(2)),
      activeInvestors: u.activeInvestors[0]?.count || 0,
      totalInvestors: u.totalInvestors[0]?.count || 0,
      pendingApplications: u.pendingApplications[0]?.count || 0,
      totalProducts,
      totalOrders: o.totalOrders[0]?.count || 0,
      newOrders: o.newOrders[0]?.count || 0,
      dispatchedOrders: o.dispatchedOrders[0]?.count || 0,
      ordersRevenue: o.revenue[0]?.total || 0,
      customers: o.customers[0]?.total || 0,
      totalInvestments: i.counts[0]?.total || 0,
      totalInvestment: i.activeInvestment[0]?.total || 0,
      productsInvested: productsInvestedArr.length,
      revenueOverview: o.revenueOverview.map(item => ({ _id: { day: item._id }, revenue: item.revenue })),
      capitalOverview: {
        invested: i.capital[0]?.invested || 0,
        returned: i.capital[0]?.returned || 0,
        active: (i.capital[0]?.invested || 0) - (i.capital[0]?.returned || 0)
      },
      newTransactions: t.newTransactions[0]?.count || 0,
      transactionVolume: t.volume[0]?.total || 0
    };
  } catch (error) {
    console.error("Dashboard Metrics Error:", error);
    throw new Error("Failed to generate dashboard metrics");
  }
};