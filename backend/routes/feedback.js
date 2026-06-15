const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { verifyToken } = require('../middleware/auth');

// @route   GET /api/feedback
// @desc    Get feedback (Customers: own. Admin: all)
// @access  Private
router.get('/', verifyToken, async (req, res, next) => {
  try {
    let query = `
      SELECT f.feedback_id, f.customer_id, f.order_id, f.rating, f.comments, f.feedback_date, f.created_at,
             o.order_type, u.name as customer_name
      FROM feedback f
      JOIN orders o ON f.order_id = o.order_id
      JOIN customers c ON f.customer_id = c.customer_id
      JOIN users u ON c.user_id = u.user_id
    `;
    const params = [];

    if (req.user.role !== 'Admin') {
      query += ` WHERE c.user_id = $1`;
      params.push(req.user.user_id);
    }

    query += ` ORDER BY f.feedback_id DESC`;

    const result = await pool.query(query, params);
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/feedback
// @desc    Submit feedback for a completed order
// @access  Private
router.post('/', verifyToken, async (req, res, next) => {
  const { order_id, rating, comments } = req.body;

  if (!order_id || rating === undefined) {
    return res.status(400).json({ success: false, error: 'Order ID and rating are required.' });
  }

  if (rating < 1 || rating > 5) {
    return res.status(400).json({ success: false, error: 'Rating must be between 1 and 5.' });
  }

  try {
    // Resolve customer ID and check order status
    const orderRes = await pool.query(
      `SELECT o.order_id, o.status, c.customer_id, c.user_id FROM orders o
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

    // Access control: Only owner of the order can submit feedback
    if (order.user_id !== req.user.user_id) {
      const err = new Error('Access denied. You do not own this order.');
      err.statusCode = 403;
      throw err;
    }

    // Business rule: Feedback only for Completed orders
    if (order.status !== 'Completed') {
      const err = new Error('Feedback can only be submitted for completed orders.');
      err.statusCode = 400;
      throw err;
    }

    const result = await pool.query(
      `INSERT INTO feedback (customer_id, order_id, rating, comments)
       VALUES ($1, $2, $3, $4)
       RETURNING *`,
      [order.customer_id, order_id, rating, comments || '']
    );

    // Notify administrators of new feedback
    const adminUsers = await pool.query("SELECT user_id FROM users WHERE role = 'Admin'");
    for (const admin of adminUsers.rows) {
      await pool.query(
        `INSERT INTO notifications (user_id, message, link_url)
         VALUES ($1, $2, $3)`,
        [admin.user_id, `New ${rating}-star feedback received from customer.`, `/admin.html`]
      );
    }

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') { // UNIQUE constraint violation
      err.statusCode = 400;
      err.message = 'You have already submitted feedback for this order.';
    }
    next(err);
  }
});

// @route   DELETE /api/feedback/:id
// @desc    Delete feedback (Customers can delete own, Admin can delete any)
// @access  Private
router.delete('/:id', verifyToken, async (req, res, next) => {
  const feedbackId = req.params.id;

  try {
    const feedbackRes = await pool.query(
      `SELECT f.feedback_id, c.user_id FROM feedback f
       JOIN customers c ON f.customer_id = c.customer_id
       WHERE f.feedback_id = $1`,
      [feedbackId]
    );

    if (feedbackRes.rows.length === 0) {
      const err = new Error('Feedback not found.');
      err.statusCode = 404;
      throw err;
    }

    const feedback = feedbackRes.rows[0];

    // Access control
    if (req.user.role !== 'Admin' && feedback.user_id !== req.user.user_id) {
      const err = new Error('Access denied. You do not have permission to delete this feedback.');
      err.statusCode = 403;
      throw err;
    }

    await pool.query('DELETE FROM feedback WHERE feedback_id = $1', [feedbackId]);

    res.status(200).json({
      success: true,
      data: { message: 'Feedback successfully deleted.', feedback_id: feedbackId }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
