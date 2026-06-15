const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { verifyToken } = require('../middleware/auth');

// @route   GET /api/customers/:id
// @desc    Get customer profile details
// @access  Private
router.get('/:id', verifyToken, async (req, res, next) => {
  const customerId = req.params.id;

  try {
    // Fetch customer details joining with users
    const customerResult = await pool.query(
      `SELECT c.customer_id, c.user_id, c.address, c.city, c.pincode, c.created_at, 
              u.name, u.email, u.phone, u.role
       FROM customers c
       JOIN users u ON c.user_id = u.user_id
       WHERE c.customer_id = $1`,
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      const err = new Error('Customer profile not found.');
      err.statusCode = 404;
      throw err;
    }

    const customer = customerResult.rows[0];

    // Access control: Only the customer owner or an Admin can access
    if (req.user.role !== 'Admin' && customer.user_id !== req.user.user_id) {
      const err = new Error('Access denied. You do not have permission to view this profile.');
      err.statusCode = 403;
      throw err;
    }

    res.status(200).json({
      success: true,
      data: customer
    });
  } catch (err) {
    next(err);
  }
});

// @route   PUT /api/customers/:id
// @desc    Update customer profile details
// @access  Private
router.put('/:id', verifyToken, async (req, res, next) => {
  const customerId = req.params.id;
  const { address, city, pincode, name, phone } = req.body;

  try {
    // Fetch customer to check ownership
    const customerResult = await pool.query(
      'SELECT user_id FROM customers WHERE customer_id = $1',
      [customerId]
    );

    if (customerResult.rows.length === 0) {
      const err = new Error('Customer profile not found.');
      err.statusCode = 404;
      throw err;
    }

    const customer = customerResult.rows[0];

    // Access control: Only the customer owner or an Admin can update
    if (req.user.role !== 'Admin' && customer.user_id !== req.user.user_id) {
      const err = new Error('Access denied. You do not have permission to update this profile.');
      err.statusCode = 403;
      throw err;
    }

    // Begin updates
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update customers table
      await client.query(
        `UPDATE customers 
         SET address = COALESCE($1, address), 
             city = COALESCE($2, city), 
             pincode = COALESCE($3, pincode)
         WHERE customer_id = $4`,
        [address, city, pincode, customerId]
      );

      // Update users table (name, phone)
      await client.query(
        `UPDATE users
         SET name = COALESCE($1, name),
             phone = COALESCE($2, phone)
         WHERE user_id = $3`,
        [name, phone, customer.user_id]
      );

      await client.query('COMMIT');

      // Fetch updated profile
      const updatedResult = await client.query(
        `SELECT c.customer_id, c.user_id, c.address, c.city, c.pincode,
                u.name, u.email, u.phone, u.role
         FROM customers c
         JOIN users u ON c.user_id = u.user_id
         WHERE c.customer_id = $1`,
        [customerId]
      );

      res.status(200).json({
        success: true,
        data: updatedResult.rows[0]
      });
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }
  } catch (err) {
    next(err);
  }
});

module.exports = router;
