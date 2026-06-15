const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// @route   GET /api/maintenance
// @desc    Get maintenance schedules (Customers: own schedules. Admins: all)
// @access  Private
router.get('/', verifyToken, async (req, res, next) => {
  try {
    let query = `
      SELECT ms.schedule_id, ms.order_id, ms.service_date, ms.service_type, ms.notes, ms.status, ms.created_at,
             o.scheduled_date as order_scheduled_date, u.name as customer_name, c.city,
             emp.name as assigned_employee_name, emp.phone as assigned_employee_phone,
             a.assignment_id, a.status as assignment_status
      FROM maintenance_schedule ms
      JOIN orders o ON ms.order_id = o.order_id
      JOIN customers c ON o.customer_id = c.customer_id
      JOIN users u ON c.user_id = u.user_id
      LEFT JOIN assignments a ON ms.schedule_id = a.schedule_id AND a.status != 'Reassigned'
      LEFT JOIN employees emp ON a.employee_id = emp.employee_id
    `;
    const params = [];

    if (req.user.role !== 'Admin') {
      query += ` WHERE c.user_id = $1`;
      params.push(req.user.user_id);
    }

    query += ` ORDER BY ms.service_date ASC`;

    const result = await pool.query(query, params);
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/maintenance/:id
// @desc    Get single maintenance schedule details
// @access  Private
router.get('/:id', verifyToken, async (req, res, next) => {
  const scheduleId = req.params.id;

  try {
    const query = `
      SELECT ms.schedule_id, ms.order_id, ms.service_date, ms.service_type, ms.notes, ms.status, ms.created_at,
             o.customer_id, c.user_id
      FROM maintenance_schedule ms
      JOIN orders o ON ms.order_id = o.order_id
      JOIN customers c ON o.customer_id = c.customer_id
      WHERE ms.schedule_id = $1
    `;
    const result = await pool.query(query, [scheduleId]);

    if (result.rows.length === 0) {
      const err = new Error('Maintenance schedule not found.');
      err.statusCode = 404;
      throw err;
    }

    const schedule = result.rows[0];

    // Access control
    if (req.user.role !== 'Admin' && schedule.user_id !== req.user.user_id) {
      const err = new Error('Access denied. You do not have permission to view this schedule.');
      err.statusCode = 403;
      throw err;
    }

    res.status(200).json({
      success: true,
      data: schedule
    });
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/maintenance
// @desc    Create a maintenance schedule for an order
// @access  Private
router.post('/', verifyToken, async (req, res, next) => {
  const { order_id, service_date, service_type, notes } = req.body;

  if (!order_id || !service_date || !service_type) {
    return res.status(400).json({ success: false, error: 'Order ID, service date, and service type are required.' });
  }

  try {
    // Check order existence and ownership
    const orderRes = await pool.query(
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

    const result = await pool.query(
      `INSERT INTO maintenance_schedule (order_id, service_date, service_type, notes, status)
       VALUES ($1, $2, $3, $4, 'Pending')
       RETURNING *`,
      [order_id, service_date, service_type, notes || '']
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

// @route   PUT /api/maintenance/:id
// @desc    Update maintenance schedule status/date
// @access  Private/Admin
router.put('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  const scheduleId = req.params.id;
  const { service_date, service_type, notes, status } = req.body;

  try {
    const checkRes = await pool.query(
      `SELECT ms.schedule_id, o.customer_id, c.user_id FROM maintenance_schedule ms
       JOIN orders o ON ms.order_id = o.order_id
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE ms.schedule_id = $1`,
      [scheduleId]
    );

    if (checkRes.rows.length === 0) {
      const err = new Error('Maintenance schedule not found.');
      err.statusCode = 404;
      throw err;
    }

    const schedule = checkRes.rows[0];

    const result = await pool.query(
      `UPDATE maintenance_schedule
       SET service_date = COALESCE($1, service_date),
           service_type = COALESCE($2, service_type),
           notes = COALESCE($3, notes),
           status = COALESCE($4, status)
       WHERE schedule_id = $5
       RETURNING *`,
      [service_date, service_type, notes, status, scheduleId]
    );

    // If status is updated to Done, let's notify the customer
    if (status === 'Done') {
      await pool.query(
        `INSERT INTO notifications (user_id, message, link_url)
         VALUES ($1, $2, $3)`,
        [schedule.user_id, `Your maintenance service on ${service_date || 'scheduled date'} has been marked as Completed!`, `/maintenance.html`]
      );
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

// @route   DELETE /api/maintenance/:id
// @desc    Delete a maintenance schedule
// @access  Private/Admin
router.delete('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  const scheduleId = req.params.id;

  try {
    const checkRes = await pool.query('SELECT schedule_id FROM maintenance_schedule WHERE schedule_id = $1', [scheduleId]);
    if (checkRes.rows.length === 0) {
      const err = new Error('Maintenance schedule not found.');
      err.statusCode = 404;
      throw err;
    }

    await pool.query('DELETE FROM maintenance_schedule WHERE schedule_id = $1', [scheduleId]);

    res.status(200).json({
      success: true,
      data: { message: 'Maintenance schedule deleted successfully.' }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
