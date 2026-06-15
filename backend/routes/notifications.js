const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { verifyToken } = require('../middleware/auth');

// @route   GET /api/notifications
// @desc    Get all notifications for logged-in user
// @access  Private
router.get('/', verifyToken, async (req, res, next) => {
  try {
    const result = await pool.query(
      `SELECT notification_id, message, notification_date, is_read, link_url
       FROM notifications
       WHERE user_id = $1
       ORDER BY notification_id DESC`,
      [req.user.user_id]
    );

    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// @route   PATCH /api/notifications/read-all
// @desc    Mark all notifications for logged-in user as read
// @access  Private
router.patch('/read-all', verifyToken, async (req, res, next) => {
  try {
    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE user_id = $1`,
      [req.user.user_id]
    );

    res.status(200).json({
      success: true,
      data: { message: 'All notifications marked as read.' }
    });
  } catch (err) {
    next(err);
  }
});

// @route   PATCH /api/notifications/:id/read
// @desc    Mark a single notification as read
// @access  Private
router.patch('/:id/read', verifyToken, async (req, res, next) => {
  const notificationId = req.params.id;

  try {
    const checkRes = await pool.query(
      'SELECT user_id FROM notifications WHERE notification_id = $1',
      [notificationId]
    );

    if (checkRes.rows.length === 0) {
      const err = new Error('Notification not found.');
      err.statusCode = 404;
      throw err;
    }

    const notification = checkRes.rows[0];

    // Access control
    if (notification.user_id !== req.user.user_id) {
      const err = new Error('Access denied. You do not own this notification.');
      err.statusCode = 403;
      throw err;
    }

    await pool.query(
      `UPDATE notifications
       SET is_read = TRUE
       WHERE notification_id = $1`,
      [notificationId]
    );

    res.status(200).json({
      success: true,
      data: { message: 'Notification marked as read.', notification_id: notificationId }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
