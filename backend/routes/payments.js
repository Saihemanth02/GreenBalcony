const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// @route   GET /api/payments
// @desc    Get payments (Customer: own payments. Admin: all)
// @access  Private
router.get('/', verifyToken, async (req, res, next) => {
  try {
    let query = `
      SELECT p.payment_id, p.order_id, p.amount, p.payment_method, p.payment_status, p.payment_date, p.transaction_id, p.created_at,
             o.order_type, o.scheduled_date, u.name as customer_name
      FROM payments p
      JOIN orders o ON p.order_id = o.order_id
      JOIN customers c ON o.customer_id = c.customer_id
      JOIN users u ON c.user_id = u.user_id
    `;
    const params = [];

    if (req.user.role !== 'Admin') {
      query += ` WHERE c.user_id = $1`;
      params.push(req.user.user_id);
    }

    query += ` ORDER BY p.payment_id DESC`;

    const result = await pool.query(query, params);
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/payments/:id
// @desc    Get single payment detail
// @access  Private
router.get('/:id', verifyToken, async (req, res, next) => {
  const paymentId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT p.payment_id, p.order_id, p.amount, p.payment_method, p.payment_status, p.payment_date, p.transaction_id, p.created_at,
              o.customer_id, c.user_id
       FROM payments p
       JOIN orders o ON p.order_id = o.order_id
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE p.payment_id = $1`,
      [paymentId]
    );

    if (result.rows.length === 0) {
      const err = new Error('Payment not found.');
      err.statusCode = 404;
      throw err;
    }

    const payment = result.rows[0];

    // Access control
    if (req.user.role !== 'Admin' && payment.user_id !== req.user.user_id) {
      const err = new Error('Access denied. You do not have permission to view this payment.');
      err.statusCode = 403;
      throw err;
    }

    res.status(200).json({
      success: true,
      data: payment
    });
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/payments
// @desc    Record/Update a payment for an order
// @access  Private
router.post('/', verifyToken, async (req, res, next) => {
  const { order_id, amount, payment_method, transaction_id } = req.body;

  if (!order_id || amount === undefined || !payment_method) {
    return res.status(400).json({ success: false, error: 'Order ID, amount, and payment method are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Verify order exists and ownership
    const orderRes = await client.query(
      `SELECT o.order_id, o.status, c.user_id FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE o.order_id = $1`,
      [order_id]
    );

    if (orderRes.rows.length === 0) {
      const err = new Error('Associated order not found.');
      err.statusCode = 404;
      throw err;
    }

    const order = orderRes.rows[0];

    if (req.user.role !== 'Admin' && order.user_id !== req.user.user_id) {
      const err = new Error('Access denied. You do not own this order.');
      err.statusCode = 403;
      throw err;
    }

    // Check if a payment record already exists for this order
    const checkPayment = await client.query('SELECT payment_id FROM payments WHERE order_id = $1', [order_id]);

    let result;
    const resolvedTxnId = transaction_id || 'TXN' + Date.now() + Math.floor(Math.random() * 1000);

    if (checkPayment.rows.length > 0) {
      // Update existing record
      result = await client.query(
        `UPDATE payments
         SET amount = $1,
             payment_method = $2,
             payment_status = 'Paid',
             payment_date = CURRENT_DATE,
             transaction_id = $3
         WHERE order_id = $4
         RETURNING *`,
        [amount, payment_method, resolvedTxnId, order_id]
      );
    } else {
      // Create new record
      result = await client.query(
        `INSERT INTO payments (order_id, amount, payment_method, payment_status, payment_date, transaction_id)
         VALUES ($1, $2, $3, 'Paid', CURRENT_DATE, $4)
         RETURNING *`,
        [order_id, amount, payment_method, resolvedTxnId]
      );
    }

    // Update order status if order was Pending to Confirmed on payment success!
    if (order.status === 'Pending') {
      await client.query(
        "UPDATE orders SET status = 'Confirmed' WHERE order_id = $1",
        [order_id]
      );
    }

    // Notify user about payment confirmation
    await client.query(
      `INSERT INTO notifications (user_id, message, link_url)
       VALUES ($1, $2, $3)`,
      [order.user_id, `Payment of ₹${amount} for order #${order_id} has been received!`, `/payments.html`]
    );

    await client.query('COMMIT');

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// @route   PUT /api/payments/:id
// @desc    Update payment status
// @access  Private/Admin
router.put('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  const paymentId = req.params.id;
  const { payment_status } = req.body;

  if (!payment_status) {
    return res.status(400).json({ success: false, error: 'Payment status is required.' });
  }

  try {
    const checkRes = await pool.query(
      `SELECT p.payment_id, o.order_id, c.user_id FROM payments p
       JOIN orders o ON p.order_id = o.order_id
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE p.payment_id = $1`,
      [paymentId]
    );

    if (checkRes.rows.length === 0) {
      const err = new Error('Payment record not found.');
      err.statusCode = 404;
      throw err;
    }

    const payment = checkRes.rows[0];

    const result = await pool.query(
      `UPDATE payments
       SET payment_status = $1,
           payment_date = CASE WHEN $1 = 'Paid' THEN CURRENT_DATE ELSE payment_date END
       WHERE payment_id = $2
       RETURNING *`,
      [payment_status, paymentId]
    );

    // If payment status became Paid and order status is Pending, confirm the order
    if (payment_status === 'Paid') {
      await pool.query(
        "UPDATE orders SET status = 'Confirmed' WHERE order_id = $1 AND status = 'Pending'",
        [payment.order_id]
      );
    }

    // Notify user
    await pool.query(
      `INSERT INTO notifications (user_id, message, link_url)
       VALUES ($1, $2, $3)`,
      [payment.user_id, `Payment status for your order #${payment.order_id} has been updated to: ${payment_status}`, `/payments.html`]
    );

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
