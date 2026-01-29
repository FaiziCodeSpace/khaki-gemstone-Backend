import User from "../models/users/User.js";
import Order from "../models/common/Orders.js";
import Product from "../models/common/Products.js";
import Investment from "../models/investment/Investments.js"

export const getDashboardMetrics = async () => {
  const now = new Date();
  const last24h = new Date(now.getTime() - 24 * 60 * 60 * 1000);
  const last7d = new Date();
  last7d.setDate(now.getDate() - 7);
  const firstDayOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastDayOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);

  /* ================= USERS ================= */

  const totalUsers = await User.countDocuments();

  const usersLast24h = await User.countDocuments({
    createdAt: { $gte: last24h }
  });

  const usersBefore24h = await User.countDocuments({
    createdAt: { $lt: last24h }
  });

  const usersGrowthPercent =
    usersBefore24h === 0
      ? 100
      : Number(((usersLast24h / usersBefore24h) * 100).toFixed(2));

  const totalInvestors = await User.countDocuments({ isInvestor: true });

  const activeInvestors = await User.countDocuments({
    isInvestor: true,
    lastInvestorVisitAt: { $gte: last7d }
  });

  /* ================= APPLICATIONS ================= */

  const pendingApplications = await User.countDocuments({
    "investor.status": "pending",
    "isInvestor": true
  });

  /* ================= PRODUCTS ================= */

  const totalProducts = await Product.countDocuments();

  /* ================= ORDERS ================= */

  const totalOrders = await Order.countDocuments({ status: { $ne: "CANCELLED" } });

  // 2. New Orders in last 24h
  const newOrders = await Order.countDocuments({
    createdAt: { $gte: last24h }
  });

  // 3. "On Way" - Dispatched but not yet finished
  const dispatchedOrders = await Order.countDocuments({
    status: "DISPATCHED"
  });

  const ordersRevenueAgg = await Order.aggregate([
    {
      $match: {
        isPaid: true,
        status: { $ne: "CANCELLED" }
      }
    },
    {
      $group: {
        _id: null,
        revenue: { $sum: "$totalAmount" }
      }
    }
  ]);

  const ordersRevenue = ordersRevenueAgg[0]?.revenue || 0;

  const customersAgg = await Order.aggregate([
    {
      $group: {
        _id: {
          $cond: [
            { $gt: ["$user", null] },
            "$user",
            "$customer.phone"
          ]
        }
      }
    },
    { $count: "total" }
  ]);

  const customers = customersAgg[0]?.total || 0;


  /* ================= INVESTMENTS ================= */

  const totalInvestments = await Investment.countDocuments();

  const totalInvestmentAgg = await Investment.aggregate([
    { $match: { status: "ACTIVE" } },
    { $group: { _id: null, total: { $sum: "$amount" } } }
  ]);

  const totalInvestment = totalInvestmentAgg[0]?.total || 0;

  const productsInvested = (await Investment.distinct("product")).length;

  /* ================= REVENUE OVERVIEW ================= */

  const revenueOverview = await Order.aggregate([
    {
      $match: {
        status: { $in: ["PAID", "DISPATCHED", "COMPLETED"] },
        createdAt: { $gte: firstDayOfLastMonth, $lte: lastDayOfLastMonth }
      }
    },
    {
      $group: {
        _id: {
          day: {
            $dateToString: { format: "%Y-%m-%d", date: "$createdAt" }
          }
        },
        revenue: { $sum: "$totalAmount" }
      }
    },
    { $sort: { "_id.day": 1 } }
  ]);

  /* ================= CAPITAL OVERVIEW ================= */

  const capitalAgg = await Investment.aggregate([
    {
      $group: {
        _id: null,
        invested: { $sum: "$amount" },
        returned: { $sum: "$returnedAmount" }
      }
    }
  ]);

  const capitalOverview = {
    invested: capitalAgg[0]?.invested || 0,
    returned: capitalAgg[0]?.returned || 0,
    active:
      (capitalAgg[0]?.invested || 0) -
      (capitalAgg[0]?.returned || 0)
  };

  /* ================= FINAL RESPONSE ================= */

  return {
    totalUsers,
    usersGrowthPercent,
    activeInvestors,
    totalInvestors,
    pendingApplications,
    totalProducts,
    totalOrders,
    newOrders,
    dispatchedOrders,
    ordersRevenue,
    customers,
    totalInvestments,
    totalInvestment,
    productsInvested,
    revenueOverview,
    capitalOverview
  };
};
