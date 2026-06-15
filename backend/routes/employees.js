const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const pool = require('../db/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// @route   GET /api/employees
// @desc    Get all employees
// @access  Private/Admin
router.get('/', verifyToken, requireAdmin, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT e.employee_id, e.user_id, e.name, e.phone, e.role, e.experience, e.created_at,
              u.email
       FROM employees e
       JOIN users u ON e.user_id = u.user_id
       ORDER BY e.employee_id DESC`
    );
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/employees/:id
// @desc    Get single employee details
// @access  Private/Admin
router.get('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  const employeeId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT e.employee_id, e.user_id, e.name, e.phone, e.role, e.experience, e.created_at,
              u.email
       FROM employees e
       JOIN users u ON e.user_id = u.user_id
       WHERE e.employee_id = $1`,
      [employeeId]
    );

    if (result.rows.length === 0) {
      const err = new Error('Employee not found.');
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

// @route   POST /api/employees
// @desc    Create an employee (along with their user account)
// @access  Private/Admin
router.post('/', verifyToken, requireAdmin, async (req, res, next) => {
  const { name, phone, role, experience, email } = req.body;

  if (!name || !role) {
    return res.status(400).json({ success: false, error: 'Employee name and role are required.' });
  }

  const generatedEmail = email || `${name.toLowerCase().replace(/\s+/g, '')}@greenbalcony.com`;
  const defaultPassword = 'Password@123';

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if email already exists
    const emailCheck = await client.query('SELECT user_id FROM users WHERE email = $1', [generatedEmail]);
    if (emailCheck.rows.length > 0) {
      const err = new Error(`Email ${generatedEmail} is already registered.`);
      err.statusCode = 400;
      throw err;
    }

    // Hash default password
    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(defaultPassword, salt);

    // Create user
    const userRes = await client.query(
      `INSERT INTO users (name, email, phone, password, role)
       VALUES ($1, $2, $3, $4, 'Employee')
       RETURNING user_id`,
      [name, generatedEmail, phone || '', hashedPassword]
    );

    const userId = userRes.rows[0].user_id;

    // Create employee profile
    const employeeRes = await client.query(
      `INSERT INTO employees (user_id, name, phone, role, experience)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [userId, name, phone || '', role, experience || 0]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        ...employeeRes.rows[0],
        email: generatedEmail
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// @route   PUT /api/employees/:id
// @desc    Update employee details
// @access  Private/Admin
router.put('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  const employeeId = req.params.id;
  const { name, phone, role, experience, email } = req.body;

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Fetch employee to find user_id
    const empRes = await client.query('SELECT user_id FROM employees WHERE employee_id = $1', [employeeId]);
    if (empRes.rows.length === 0) {
      const err = new Error('Employee not found.');
      err.statusCode = 404;
      throw err;
    }

    const userId = empRes.rows[0].user_id;

    // Update employee profile
    await client.query(
      `UPDATE employees
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           role = COALESCE($3, role),
           experience = COALESCE($4, experience)
       WHERE employee_id = $5`,
      [name, phone, role, experience, employeeId]
    );

    // Update associated user record
    await client.query(
      `UPDATE users
       SET name = COALESCE($1, name),
           phone = COALESCE($2, phone),
           email = COALESCE($3, email)
       WHERE user_id = $4`,
      [name, phone, email, userId]
    );

    await client.query('COMMIT');

    // Retrieve updated info
    const updatedRes = await pool.query(
      `SELECT e.employee_id, e.user_id, e.name, e.phone, e.role, e.experience, u.email
       FROM employees e
       JOIN users u ON e.user_id = u.user_id
       WHERE e.employee_id = $1`,
      [employeeId]
    );

    res.status(200).json({
      success: true,
      data: updatedRes.rows[0]
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// @route   DELETE /api/employees/:id
// @desc    Delete employee (deletes associated user and cascades profile)
// @access  Private/Admin
router.delete('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  const employeeId = req.params.id;

  try {
    const empRes = await pool.query('SELECT user_id FROM employees WHERE employee_id = $1', [employeeId]);
    if (empRes.rows.length === 0) {
      const err = new Error('Employee not found.');
      err.statusCode = 404;
      throw err;
    }

    const userId = empRes.rows[0].user_id;

    // Deleting from users will cascade delete the employee profile automatically due to REFERENCES ON DELETE CASCADE
    await pool.query('DELETE FROM users WHERE user_id = $1', [userId]);

    res.status(200).json({
      success: true,
      data: { message: 'Employee and user profile deleted successfully.' }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
