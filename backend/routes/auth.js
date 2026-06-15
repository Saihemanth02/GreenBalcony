const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const pool = require('../db/db');
const { verifyToken } = require('../middleware/auth');
require('dotenv').config();

const JWT_SECRET = process.env.JWT_SECRET || 'supersecretjwtkeyforgreenbalcony123';

// @route   POST /api/auth/register
// @desc    Register a new customer
// @access  Public
router.post('/register', async (req, res, next) => {
  const { name, email, phone, password, address, city, pincode } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Check if user already exists
    const userExists = await client.query('SELECT user_id FROM users WHERE email = $1', [email]);
    if (userExists.rows.length > 0) {
      const err = new Error('Email is already registered.');
      err.statusCode = 400;
      throw err;
    }

    // Hash password (saltRounds: 12)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash(password, salt);

    // Insert user
    const userInsertResult = await client.query(
      'INSERT INTO users (name, email, phone, password, role) VALUES ($1, $2, $3, $4, $5) RETURNING user_id, name, email, role, created_at',
      [name, email, phone, hashedPassword, 'Customer']
    );

    const newUser = userInsertResult.rows[0];

    // Insert customer profile
    await client.query(
      'INSERT INTO customers (user_id, address, city, pincode) VALUES ($1, $2, $3, $4)',
      [newUser.user_id, address || '', city || '', pincode || '']
    );

    await client.query('COMMIT');

    // Create JWT
    const token = jwt.sign(
      { user_id: newUser.user_id, email: newUser.email, role: newUser.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    // Add welcome notification
    await pool.query(
      'INSERT INTO notifications (user_id, message, link_url) VALUES ($1, $2, $3)',
      [newUser.user_id, 'Welcome to GreenBalcony! Get started by booking a service.', '/dashboard.html']
    );

    res.status(201).json({
      success: true,
      data: {
        token,
        user: {
          user_id: newUser.user_id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role
        }
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// @route   POST /api/auth/login
// @desc    Authenticate user & get token
// @access  Public
router.post('/login', async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ success: false, error: 'Email and password are required.' });
  }

  try {
    const userResult = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      const err = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    const user = userResult.rows[0];

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      const err = new Error('Invalid email or password.');
      err.statusCode = 401;
      throw err;
    }

    // Sign Token
    const token = jwt.sign(
      { user_id: user.user_id, email: user.email, role: user.role },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    res.status(200).json({
      success: true,
      data: {
        token,
        user: {
          user_id: user.user_id,
          name: user.name,
          email: user.email,
          role: user.role
        }
      }
    });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/auth/me
// @desc    Get current user profile
// @access  Private
router.get('/me', verifyToken, async (req, res, next) => {
  try {
    const userResult = await pool.query(
      'SELECT user_id, name, email, phone, role, created_at FROM users WHERE user_id = $1',
      [req.user.user_id]
    );

    if (userResult.rows.length === 0) {
      const err = new Error('User not found.');
      err.statusCode = 404;
      throw err;
    }

    const user = userResult.rows[0];

    // Join customer profile or employee profile if appropriate
    if (user.role === 'Customer') {
      const customerResult = await pool.query(
        'SELECT customer_id, address, city, pincode FROM customers WHERE user_id = $1',
        [user.user_id]
      );
      if (customerResult.rows.length > 0) {
        user.customer_details = customerResult.rows[0];
      }
    } else if (user.role === 'Employee') {
      const employeeResult = await pool.query(
        'SELECT employee_id, role as emp_role, experience FROM employees WHERE user_id = $1',
        [user.user_id]
      );
      if (employeeResult.rows.length > 0) {
        user.employee_details = employeeResult.rows[0];
      }
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
