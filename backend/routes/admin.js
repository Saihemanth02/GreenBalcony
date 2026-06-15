const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// @route   GET /api/admin/stats
// @desc    Get dashboard metrics and statistics
// @access  Private/Admin
router.get('/stats', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    // 1. Total Orders count
    const totalOrdersRes = await pool.query('SELECT COUNT(*) as count FROM orders');
    const totalOrders = parseInt(totalOrdersRes.rows[0].count);

    // 2. Pending Orders count
    const pendingOrdersRes = await pool.query("SELECT COUNT(*) as count FROM orders WHERE status = 'Pending'");
    const pendingOrders = parseInt(pendingOrdersRes.rows[0].count);

    // 3. Total Revenue (sum of all PAID payments)
    const revenueRes = await pool.query("SELECT COALESCE(SUM(amount), 0) as total FROM payments WHERE payment_status = 'Paid'");
    const totalRevenue = parseFloat(revenueRes.rows[0].total);

    // 4. Total Customers count
    const totalCustomersRes = await pool.query('SELECT COUNT(*) as count FROM customers');
    const totalCustomers = parseInt(totalCustomersRes.rows[0].count);

    // 5. Total Employees count
    const totalEmployeesRes = await pool.query('SELECT COUNT(*) as count FROM employees');
    const totalEmployees = parseInt(totalEmployeesRes.rows[0].count);

    // 6. Recent 5 Orders
    const recentOrdersRes = await pool.query(
      `SELECT o.order_id, o.order_type, o.booking_date, o.scheduled_date, o.status, o.total_amount,
              u.name as customer_name, c.city
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       JOIN users u ON c.user_id = u.user_id
       ORDER BY o.order_id DESC
       LIMIT 5`
    );

    res.status(200).json({
      success: true,
      data: {
        totalOrders,
        pendingOrders,
        totalRevenue,
        totalCustomers,
        totalEmployees,
        recentOrders: recentOrdersRes.rows
      }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
