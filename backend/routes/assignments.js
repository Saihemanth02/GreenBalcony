const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// @route   GET /api/assignments
// @desc    Get all assignments
// @access  Private/Admin
router.get('/', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT a.assignment_id, a.schedule_id, a.employee_id, a.assigned_date, a.status, a.created_at,
              emp.name as employee_name, emp.phone as employee_phone, emp.role as employee_role,
              ms.service_date, ms.service_type, ms.status as schedule_status,
              u.name as customer_name, c.city
       FROM assignments a
       JOIN employees emp ON a.employee_id = emp.employee_id
       JOIN maintenance_schedule ms ON a.schedule_id = ms.schedule_id
       JOIN orders o ON ms.order_id = o.order_id
       JOIN customers c ON o.customer_id = c.customer_id
       JOIN users u ON c.user_id = u.user_id
       ORDER BY a.assignment_id DESC`
    );
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/assignments/:id
// @desc    Get single assignment details
// @access  Private/Admin
router.get('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  const assignmentId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT a.assignment_id, a.schedule_id, a.employee_id, a.assigned_date, a.status, a.created_at,
              emp.name as employee_name, ms.service_date, ms.service_type
       FROM assignments a
       JOIN employees emp ON a.employee_id = emp.employee_id
       JOIN maintenance_schedule ms ON a.schedule_id = ms.schedule_id
       WHERE a.assignment_id = $1`,
      [assignmentId]
    );

    if (result.rows.length === 0) {
      const err = new Error('Assignment not found.');
      err.statusCode = 404;
      throw err;
    }

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/assignments
// @desc    Assign an employee to a maintenance schedule
// @access  Private/Admin
router.post('/', verifyToken, requireAdmin, async (req, res, next) => {
  const { schedule_id, employee_id } = req.body;

  if (!schedule_id || !employee_id) {
    return res.status(400).json({ success: false, error: 'Schedule ID and Employee ID are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Verify employee exists
    const empRes = await client.query('SELECT employee_id, name, user_id FROM employees WHERE employee_id = $1', [employee_id]);
    if (empRes.rows.length === 0) {
      const err = new Error('Employee not found.');
      err.statusCode = 404;
      throw err;
    }
    const employee = empRes.rows[0];

    // 2. Verify maintenance schedule exists
    const msRes = await client.query(
      `SELECT ms.schedule_id, ms.service_date, ms.service_type, o.customer_id, c.user_id as customer_user_id 
       FROM maintenance_schedule ms
       JOIN orders o ON ms.order_id = o.order_id
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE ms.schedule_id = $1`,
      [schedule_id]
    );
    if (msRes.rows.length === 0) {
      const err = new Error('Maintenance schedule not found.');
      err.statusCode = 404;
      throw err;
    }
    const schedule = msRes.rows[0];

    // 3. Deactivate previous assignments for this schedule (mark as Reassigned)
    await client.query(
      `UPDATE assignments 
       SET status = 'Reassigned' 
       WHERE schedule_id = $1 AND status = 'Assigned'`,
      [schedule_id]
    );

    // 4. Create new assignment
    const result = await client.query(
      `INSERT INTO assignments (schedule_id, employee_id, status)
       VALUES ($1, $2, 'Assigned')
       RETURNING *`,
      [schedule_id, employee_id]
    );

    // 5. Notify customer
    await client.query(
      `INSERT INTO notifications (user_id, message, link_url)
       VALUES ($1, $2, $3)`,
      [
        schedule.customer_user_id,
        `Employee ${employee.name} has been assigned to your ${schedule.service_type} schedule on ${schedule.service_date}.`,
        `/maintenance.html`
      ]
    );

    // 6. Notify employee
    await client.query(
      `INSERT INTO notifications (user_id, message, link_url)
       VALUES ($1, $2, $3)`,
      [
        employee.user_id,
        `You have been assigned to a new ${schedule.service_type} service schedule on ${schedule.service_date}.`,
        `/maintenance.html`
      ]
    );

    await client.query('COMMIT');

    res.status(201).json({
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

// @route   PUT /api/assignments/:id
// @desc    Update assignment status (Assigned, Completed, Reassigned)
// @access  Private/Admin
router.put('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  const assignmentId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, error: 'Status is required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const assignRes = await client.query(
      `SELECT a.assignment_id, a.schedule_id, a.employee_id, emp.name as employee_name,
              ms.service_date, ms.service_type, o.customer_id, c.user_id as customer_user_id
       FROM assignments a
       JOIN employees emp ON a.employee_id = emp.employee_id
       JOIN maintenance_schedule ms ON a.schedule_id = ms.schedule_id
       JOIN orders o ON ms.order_id = o.order_id
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE a.assignment_id = $1`,
      [assignmentId]
    );

    if (assignRes.rows.length === 0) {
      const err = new Error('Assignment not found.');
      err.statusCode = 404;
      throw err;
    }

    const assignment = assignRes.rows[0];

    // Update assignment status
    const result = await client.query(
      `UPDATE assignments
       SET status = $1
       WHERE assignment_id = $2
       RETURNING *`,
      [status, assignmentId]
    );

    // If marked completed, automatically update maintenance schedule status to 'Done'
    if (status === 'Completed') {
      await client.query(
        `UPDATE maintenance_schedule
         SET status = 'Done'
         WHERE schedule_id = $1`,
        [assignment.schedule_id]
      );

      // Notify customer
      await client.query(
        `INSERT INTO notifications (user_id, message, link_url)
         VALUES ($1, $2, $3)`,
        [
          assignment.customer_user_id,
          `Your ${assignment.service_type} service by ${assignment.employee_name} has been successfully completed!`,
          `/maintenance.html`
        ]
      );
    }

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

// @route   DELETE /api/assignments/:id
// @desc    Remove an assignment
// @access  Private/Admin
router.delete('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  const assignmentId = req.params.id;

  try {
    const checkRes = await pool.query('SELECT assignment_id FROM assignments WHERE assignment_id = $1', [assignmentId]);
    if (checkRes.rows.length === 0) {
      const err = new Error('Assignment not found.');
      err.statusCode = 404;
      throw err;
    }

    await pool.query('DELETE FROM assignments WHERE assignment_id = $1', [assignmentId]);

    res.status(200).json({
      success: true,
      data: { message: 'Assignment successfully removed.' }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
