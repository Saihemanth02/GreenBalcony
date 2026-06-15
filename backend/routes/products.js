const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// @route   GET /api/products
// @desc    Get all products (optionally filtered by category_id)
// @access  Public
router.get('/', async (req, res, next) => {
  const { category_id } = req.query;

  try {
    let query = `
      SELECT p.product_id, p.product_name, p.category_id, p.price, p.quantity, p.description, p.image_url, p.created_at,
             c.category_name
      FROM products p
      JOIN categories c ON p.category_id = c.category_id
    `;
    const params = [];

    if (category_id) {
      query += ` WHERE p.category_id = $1`;
      params.push(category_id);
    }

    query += ` ORDER BY p.product_id DESC`;

    const result = await pool.query(query, params);
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/products/:id
// @desc    Get a single product details
// @access  Public
router.get('/:id', async (req, res, next) => {
  const productId = req.params.id;

  try {
    const result = await pool.query(
      `SELECT p.product_id, p.product_name, p.category_id, p.price, p.quantity, p.description, p.image_url, p.created_at,
              c.category_name
       FROM products p
       JOIN categories c ON p.category_id = c.category_id
       WHERE p.product_id = $1`,
      [productId]
    );

    if (result.rows.length === 0) {
      const err = new Error('Product not found.');
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

// @route   POST /api/products
// @desc    Create a product
// @access  Private/Admin
router.post('/', verifyToken, requireAdmin, async (req, res, next) => {
  const { product_name, category_id, price, quantity, description, image_url } = req.body;

  if (!product_name || !category_id || price === undefined || quantity === undefined) {
    return res.status(400).json({ success: false, error: 'Product name, category ID, price, and quantity are required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO products (product_name, category_id, price, quantity, description, image_url)
       VALUES ($1, $2, $3, $4, $5, $6)
       RETURNING *`,
      [product_name, category_id, price, quantity, description, image_url]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23503') { // Foreign key constraint error
      err.statusCode = 400;
      err.message = 'Invalid Category ID.';
    }
    next(err);
  }
});

// @route   PUT /api/products/:id
// @desc    Update a product
// @access  Private/Admin
router.put('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  const productId = req.params.id;
  const { product_name, category_id, price, quantity, description, image_url } = req.body;

  try {
    const checkProduct = await pool.query('SELECT product_id FROM products WHERE product_id = $1', [productId]);
    if (checkProduct.rows.length === 0) {
      const err = new Error('Product not found.');
      err.statusCode = 404;
      throw err;
    }

    const result = await pool.query(
      `UPDATE products
       SET product_name = COALESCE($1, product_name),
           category_id = COALESCE($2, category_id),
           price = COALESCE($3, price),
           quantity = COALESCE($4, quantity),
           description = COALESCE($5, description),
           image_url = COALESCE($6, image_url)
       WHERE product_id = $7
       RETURNING *`,
      [product_name, category_id, price, quantity, description, image_url, productId]
    );

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23503') {
      err.statusCode = 400;
      err.message = 'Invalid Category ID.';
    }
    next(err);
  }
});

// @route   DELETE /api/products/:id
// @desc    Delete a product
// @access  Private/Admin
router.delete('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  const productId = req.params.id;

  try {
    const checkProduct = await pool.query('SELECT product_id FROM products WHERE product_id = $1', [productId]);
    if (checkProduct.rows.length === 0) {
      const err = new Error('Product not found.');
      err.statusCode = 404;
      throw err;
    }

    await pool.query('DELETE FROM products WHERE product_id = $1', [productId]);

    res.status(200).json({
      success: true,
      data: { message: 'Product successfully deleted.' }
    });
  } catch (err) {
    if (err.code === '23503') { // Foreign key constraint violation (used in order_items)
      err.statusCode = 400;
      err.message = 'Cannot delete product because it is part of existing customer orders.';
    }
    next(err);
  }
});

module.exports = router;
