const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// @route   GET /api/categories
// @desc    Get all categories
// @access  Public
router.get('/', async (req, res, next) => {
  try {
    const result = await pool.query('SELECT * FROM categories ORDER BY category_name ASC');
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/categories
// @desc    Create a category
// @access  Private/Admin
router.post('/', verifyToken, requireAdmin, async (req, res, next) => {
  const { category_name, category_type, description } = req.body;

  if (!category_name) {
    return res.status(400).json({ success: false, error: 'Category name is required.' });
  }

  try {
    const result = await pool.query(
      `INSERT INTO categories (category_name, category_type, description) 
       VALUES ($1, $2, $3) 
       RETURNING *`,
      [category_name, category_type, description]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    // Check for unique constraint violation (PostgreSQL 23505)
    if (err.code === '23505') {
      err.statusCode = 400;
      err.message = 'Category name already exists.';
    }
    next(err);
  }
});

// @route   PUT /api/categories/:id
// @desc    Update a category
// @access  Private/Admin
router.put('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  const categoryId = req.params.id;
  const { category_name, category_type, description } = req.body;

  try {
    const checkResult = await pool.query('SELECT category_id FROM categories WHERE category_id = $1', [categoryId]);
    if (checkResult.rows.length === 0) {
      const err = new Error('Category not found.');
      err.statusCode = 404;
      throw err;
    }

    const result = await pool.query(
      `UPDATE categories 
       SET category_name = COALESCE($1, category_name), 
           category_type = COALESCE($2, category_type), 
           description = COALESCE($3, description)
       WHERE category_id = $4 
       RETURNING *`,
      [category_name, category_type, description, categoryId]
    );

    res.status(200).json({
      success: true,
      data: result.rows[0]
    });
  } catch (err) {
    if (err.code === '23505') {
      err.statusCode = 400;
      err.message = 'Category name already exists.';
    }
    next(err);
  }
});

// @route   DELETE /api/categories/:id
// @desc    Delete a category
// @access  Private/Admin
router.delete('/:id', verifyToken, requireAdmin, async (req, res, next) => {
  const categoryId = req.params.id;

  try {
    const checkResult = await pool.query('SELECT category_id FROM categories WHERE category_id = $1', [categoryId]);
    if (checkResult.rows.length === 0) {
      const err = new Error('Category not found.');
      err.statusCode = 404;
      throw err;
    }

    // Because products category_id uses REFERENCES ON DELETE RESTRICT, deleting category with products will fail.
    // Let's catch that explicitly and send a useful message.
    await pool.query('DELETE FROM categories WHERE category_id = $1', [categoryId]);

    res.status(200).json({
      success: true,
      data: { message: 'Category successfully deleted.' }
    });
  } catch (err) {
    if (err.code === '23503') { // Foreign key constraint violation
      err.statusCode = 400;
      err.message = 'Cannot delete category because it contains active products.';
    }
    next(err);
  }
});

module.exports = router;
