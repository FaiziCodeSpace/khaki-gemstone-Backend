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

      /* 3. FIXED INVESTMENT METRICS (Matching your Schema fields) */
      Investment.aggregate([
        {
          $facet: {
            counts: [{ $count: "total" }],
            financials: [
              {
                $group: {
                  _id: null,
                  // Summing the correct schema field: investmentAmount
                  totalCapitalInvested: { $sum: "$investmentAmount" },
                  // Summing the potential ROI
                  totalEstimatedProfit: { $sum: "$estimatedProfit" },
                  // Summing the total liability (Principal + Profit)
                  totalExpectedReturn: { $sum: "$totalExpectedReturn" }
                }
              }
            ],
            activeInvestments: [
              { $match: { status: "ACTIVE" } },
              { $group: { _id: null, total: { $sum: "$investmentAmount" } } }
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

      Product.countDocuments(),
      Investment.distinct("product")
    ]);

    const u = userMetrics[0];
    const o = orderMetrics[0];
    const i = investmentMetrics[0];
    const t = transactionMetrics[0];

    const invFin = i.financials[0] || {};

    return {
      totalUsers: u.totalUsers[0]?.count || 0,
      activeInvestors: u.activeInvestors[0]?.count || 0,
      totalInvestors: u.totalInvestors[0]?.count || 0,
      pendingApplications: u.pendingApplications[0]?.count || 0,
      totalProducts,
      totalOrders: o.totalOrders[0]?.count || 0,
      ordersRevenue: o.revenue[0]?.total || 0,
      
      // Collective Investment Metrics
      totalInvestmentsCount: i.counts[0]?.total || 0,
      totalActiveCapital: i.activeInvestments[0]?.total || 0, // Money currently tied up in ACTIVE assets
      investmentAnalytics: {
        totalVolume: invFin.totalCapitalInvested || 0,       // Every PKR ever invested
        projectedPayout: invFin.totalExpectedReturn || 0,   // Total amount Admin needs to pay back eventually
        totalEstimatedProfit: invFin.totalEstimatedProfit || 0 // Total profit margin across all assets
      },

      productsInvested: productsInvestedArr.length,
      revenueOverview: o.revenueOverview.map(item => ({ _id: { day: item._id }, revenue: item.revenue })),
      newTransactions: t.newTransactions[0]?.count || 0,
      transactionVolume: t.volume[0]?.total || 0
    };
  } catch (error) {
    console.error("Dashboard Metrics Error:", error);
    throw new Error("Failed to generate dashboard metrics");
  }
};