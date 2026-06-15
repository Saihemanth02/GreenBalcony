const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// @route   GET /api/deliveries
// @desc    Get all deliveries
// @access  Private/Admin
router.get('/', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT d.delivery_id, d.order_id, d.delivery_date, d.delivery_status, d.received_by, d.delivery_notes, d.created_at,
              o.order_type, o.scheduled_date, u.name as customer_name, c.city
       FROM deliveries d
       JOIN orders o ON d.order_id = o.order_id
       JOIN customers c ON o.customer_id = c.customer_id
       JOIN users u ON c.user_id = u.user_id
       ORDER BY d.delivery_id DESC`
    );
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/deliveries/:id
// @desc    Get single delivery details
// @access  Private
router.get('/:id', verifyToken, async (req, res, next) => {
  const deliveryId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT d.delivery_id, d.order_id, d.delivery_date, d.delivery_status, d.received_by, d.delivery_notes, d.created_at,
              o.customer_id, c.user_id
       FROM deliveries d
       JOIN orders o ON d.order_id = o.order_id
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE d.delivery_id = $1`,
      [deliveryId]
    );

    if (result.rows.length === 0) {
      const err = new Error('Delivery record not found.');
      err.statusCode = 404;
      throw err;
    }

    const delivery = result.rows[0];

    // Access control
    if (req.user.role !== 'Admin' && delivery.user_id !== req.user.user_id) {
      const err = new Error('Access denied. You do not have permission to view this delivery.');
      err.statusCode = 403;
      throw err;
    }

    res.status(200).json({
      success: true,
      data: delivery
    });
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/deliveries
// @desc    Create a delivery record
// @access  Private/Admin
router.post('/', verifyToken, requireAdmin, async (req, res, next) => {
  const { order_id, delivery_date, delivery_status, received_by, delivery_notes } = req.body;

  if (!order_id) {
    return res.status(400).json({ success: false, error: 'Order ID is required.' });
  }

  try {
    const checkOrder = await pool.query('SELECT order_id FROM orders WHERE order_id = $1', [order_id]);
    if (checkOrder.rows.length === 0) {
      const err = new Error('Order not found.');
      err.statusCode = 404;
      throw err;
    }

    const result = await pool.query(
      `INSERT INTO deliveries (order_id, delivery_date, delivery_status, received_by, delivery_notes)
       VALUES ($1, $2, COALESCE($3, 'Pending'), $4, $5)
       RETURNING *`,
      [order_id, delivery_date, delivery_status, received_by, delivery_notes || '']
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') { // UNIQUE constraint violation
      err.statusCode = 400;
      err.message = 'A delivery record already exists for this order.';
    }
    next(err);
  }
});

// @route   PUT /api/deliveries/:id
// @desc    Update delivery status
// @access  Private/Admin
router.put('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  const deliveryId = req.params.id;
  const { delivery_status, received_by, delivery_notes, delivery_date } = req.body;

  if (!delivery_status) {
    return res.status(400).json({ success: false, error: 'Delivery status is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const checkRes = await client.query(
      `SELECT d.delivery_id, o.order_id, c.user_id FROM deliveries d
       JOIN orders o ON d.order_id = o.order_id
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE d.delivery_id = $1`,
      [deliveryId]
    );

    if (checkRes.rows.length === 0) {
      const err = new Error('Delivery record not found.');
      err.statusCode = 404;
      throw err;
    }

    const delivery = checkRes.rows[0];

    const result = await client.query(
      `UPDATE deliveries
       SET delivery_status = $1,
           received_by = COALESCE($2, received_by),
           delivery_notes = COALESCE($3, delivery_notes),
           delivery_date = COALESCE($4, CASE WHEN $1 = 'Delivered' THEN CURRENT_DATE ELSE delivery_date END)
       WHERE delivery_id = $5
       RETURNING *`,
      [delivery_status, received_by, delivery_notes, delivery_date, deliveryId]
    );

    // Notify user
    await client.query(
      `INSERT INTO notifications (user_id, message, link_url)
       VALUES ($1, $2, $3)`,
      [delivery.user_id, `Your order #${delivery.order_id} delivery status has been updated to: ${delivery_status}`, `/dashboard.html`]
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

module.exports = router;
