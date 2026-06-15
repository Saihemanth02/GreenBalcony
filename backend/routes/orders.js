const express = require('express');
const router = express.Router();
const pool = require('../db/db');
const { verifyToken, requireAdmin } = require('../middleware/auth');

// @route   GET /api/orders
// @desc    Get orders (Customers see their own orders, Admins see all)
// @access  Private
router.get('/', verifyToken, async (req, res, next) => {
  try {
    let query = `
      SELECT o.order_id, o.customer_id, o.order_type, o.booking_date, o.scheduled_date, o.status, o.total_amount, o.notes, o.created_at,
             u.name as customer_name, u.email as customer_email, c.city
      FROM orders o
      JOIN customers c ON o.customer_id = c.customer_id
      JOIN users u ON c.user_id = u.user_id
    `;
    const params = [];

    if (req.user.role !== 'Admin') {
      query += ` WHERE c.user_id = $1`;
      params.push(req.user.user_id);
    }

    query += ` ORDER BY o.order_id DESC`;

    const result = await pool.query(query, params);
    res.status(200).json({
      success: true,
      data: result.rows
    });
  } catch (err) {
    next(err);
  }
});

// @route   GET /api/orders/:id
// @desc    Get order details (including items, payment, and delivery status)
// @access  Private
router.get('/:id', verifyToken, async (req, res, next) => {
  const orderId = req.params.id;

  try {
    // Fetch order main details
    const orderResult = await pool.query(
      `SELECT o.order_id, o.customer_id, o.order_type, o.booking_date, o.scheduled_date, o.status, o.total_amount, o.notes, o.created_at,
              u.name as customer_name, u.email as customer_email, u.phone as customer_phone, c.address, c.city, c.pincode, c.user_id
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       JOIN users u ON c.user_id = u.user_id
       WHERE o.order_id = $1`,
      [orderId]
    );

    if (orderResult.rows.length === 0) {
      const err = new Error('Order not found.');
      err.statusCode = 404;
      throw err;
    }

    const order = orderResult.rows[0];

    // Access control
    if (req.user.role !== 'Admin' && order.user_id !== req.user.user_id) {
      const err = new Error('Access denied. You do not have permission to view this order.');
      err.statusCode = 403;
      throw err;
    }

    // Fetch order items
    const itemsResult = await pool.query(
      `SELECT oi.order_item_id, oi.product_id, oi.quantity, oi.unit_price,
              p.product_name, p.image_url
       FROM order_items oi
       JOIN products p ON oi.product_id = p.product_id
       WHERE oi.order_id = $1`,
      [orderId]
    );
    order.items = itemsResult.rows;

    // Fetch payment status
    const paymentResult = await pool.query(
      `SELECT payment_id, amount, payment_method, payment_status, payment_date, transaction_id
       FROM payments
       WHERE order_id = $1`,
      [orderId]
    );
    order.payment = paymentResult.rows[0] || null;

    // Fetch delivery status
    const deliveryResult = await pool.query(
      `SELECT delivery_id, delivery_date, delivery_status, received_by, delivery_notes
       FROM deliveries
       WHERE order_id = $1`,
      [orderId]
    );
    order.delivery = deliveryResult.rows[0] || null;

    res.status(200).json({
      success: true,
      data: order
    });
  } catch (err) {
    next(err);
  }
});

// @route   POST /api/orders
// @desc    Create a new order, its items, and register a payment record (TRANSACTIONAL)
// @access  Private
router.post('/', verifyToken, async (req, res, next) => {
  const { order_type, scheduled_date, notes, items, payment_method } = req.body;

  if (!order_type || !scheduled_date || !payment_method) {
    return res.status(400).json({ success: false, error: 'Order type, scheduled date, and payment method are required.' });
  }

  if (order_type === 'Setup' && (!items || items.length === 0)) {
    return res.status(400).json({ success: false, error: 'Setup orders must include at least one product.' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // 1. Resolve Customer ID
    let customerId;
    let userId = req.user.user_id;

    if (req.user.role === 'Customer') {
      const customerRes = await client.query('SELECT customer_id FROM customers WHERE user_id = $1', [userId]);
      if (customerRes.rows.length === 0) {
        const err = new Error('Customer profile not found for this user.');
        err.statusCode = 400;
        throw err;
      }
      customerId = customerRes.rows[0].customer_id;
    } else if (req.user.role === 'Admin') {
      if (!req.body.customer_id) {
        const err = new Error('Admin must provide customer_id to create an order.');
        err.statusCode = 400;
        throw err;
      }
      customerId = req.body.customer_id;
      // Get the user_id of the customer for notifications later
      const userRes = await client.query('SELECT user_id FROM customers WHERE customer_id = $1', [customerId]);
      if (userRes.rows.length > 0) {
        userId = userRes.rows[0].user_id;
      }
    } else {
      const err = new Error('Only customers or admins can create orders.');
      err.statusCode = 403;
      throw err;
    }

    let calculatedTotal = 0;
    const validatedItems = [];

    // 2. Validate products, prices, and stock (only if setup, or if maintenance has items)
    if (items && items.length > 0) {
      for (const item of items) {
        const productRes = await client.query(
          'SELECT product_id, product_name, price, quantity FROM products WHERE product_id = $1',
          [item.product_id]
        );

        if (productRes.rows.length === 0) {
          const err = new Error(`Product with ID ${item.product_id} does not exist.`);
          err.statusCode = 400;
          throw err;
        }

        const product = productRes.rows[0];

        // Stock check
        if (product.quantity < item.quantity) {
          const err = new Error(`Insufficient stock for product: ${product.product_name}. Available: ${product.quantity}, Requested: ${item.quantity}`);
          err.statusCode = 400;
          throw err;
        }

        // Deduct inventory
        await client.query(
          'UPDATE products SET quantity = quantity - $1 WHERE product_id = $2',
          [item.quantity, item.product_id]
        );

        const itemSubtotal = parseFloat(product.price) * parseInt(item.quantity);
        calculatedTotal += itemSubtotal;

        validatedItems.push({
          product_id: product.product_id,
          quantity: item.quantity,
          unit_price: product.price
        });
      }
    } else {
      // For maintenance only, let's assume a default base maintenance service fee if no products are purchased
      // Let's set a flat fee of ₹500 for maintenance setup
      calculatedTotal = 500.00; 
    }

    // 3. Create Order
    const orderRes = await client.query(
      `INSERT INTO orders (customer_id, order_type, scheduled_date, status, total_amount, notes)
       VALUES ($1, $2, $3, 'Pending', $4, $5)
       RETURNING order_id, scheduled_date, total_amount`,
      [customerId, order_type, scheduled_date, calculatedTotal, notes || '']
    );

    const newOrder = orderRes.rows[0];

    // 4. Create Order Items
    for (const vItem of validatedItems) {
      await client.query(
        `INSERT INTO order_items (order_id, product_id, quantity, unit_price)
         VALUES ($1, $2, $3, $4)`,
        [newOrder.order_id, vItem.product_id, vItem.quantity, vItem.unit_price]
      );
    }

    // 5. Create Payment Record (Pending)
    const transactionId = 'TXN' + Date.now() + Math.floor(Math.random() * 1000);
    await client.query(
      `INSERT INTO payments (order_id, amount, payment_method, payment_status, transaction_id)
       VALUES ($1, $2, $3, 'Pending', $4)`,
      [newOrder.order_id, calculatedTotal, payment_method, transactionId]
    );

    // 6. Create Delivery Record
    await client.query(
      `INSERT INTO deliveries (order_id, delivery_status, delivery_notes)
       VALUES ($1, 'Pending', $2)`,
      [newOrder.order_id, order_type === 'Setup' ? 'Awaiting assembly of setup items.' : 'Maintenance checklist materials.']
    );

    // 7. If Maintenance order, let's create a pending maintenance schedule automatically!
    if (order_type === 'Maintenance') {
      await client.query(
        `INSERT INTO maintenance_schedule (order_id, service_date, service_type, notes, status)
         VALUES ($1, $2, 'Plant Care', $3, 'Pending')`,
        [newOrder.order_id, scheduled_date, notes || 'Scheduled maintenance visit.']
      );
    }

    // 8. Create notification for customer
    await client.query(
      `INSERT INTO notifications (user_id, message, link_url)
       VALUES ($1, $2, $3)`,
      [userId, `Your order #${newOrder.order_id} (${order_type}) was placed successfully!`, `/dashboard.html`]
    );

    await client.query('COMMIT');

    res.status(201).json({
      success: true,
      data: {
        order_id: newOrder.order_id,
        total_amount: newOrder.total_amount,
        scheduled_date: newOrder.scheduled_date,
        transaction_id: transactionId
      }
    });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

// @route   PUT /api/orders/:id/status
// @desc    Update order status
// @access  Private/Admin
router.put('/:id/status', verifyToken, requireAdmin, async (req, res, next) => {
  const orderId = req.params.id;
  const { status } = req.body;

  if (!status) {
    return res.status(400).json({ success: false, error: 'Status is required.' });
  }

  try {
    const orderRes = await pool.query(
      `SELECT o.order_id, c.user_id, o.status, o.order_type, o.scheduled_date FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE o.order_id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      const err = new Error('Order not found.');
      err.statusCode = 404;
      throw err;
    }

    const order = orderRes.rows[0];

    // Begin updates
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      await client.query(
        'UPDATE orders SET status = $1 WHERE order_id = $2',
        [status, orderId]
      );

      // If status is updated to completed, automatically update delivery to Delivered
      if (status === 'Completed') {
        await client.query(
          `UPDATE deliveries 
           SET delivery_status = 'Delivered', delivery_date = CURRENT_DATE, received_by = 'Customer'
           WHERE order_id = $1`,
          [orderId]
        );
      }

      // Create notification
      await client.query(
        `INSERT INTO notifications (user_id, message, link_url)
         VALUES ($1, $2, $3)`,
        [order.user_id, `Your order #${orderId} status has been updated to: ${status}`, `/dashboard.html`]
      );

      await client.query('COMMIT');
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }

    res.status(200).json({
      success: true,
      data: { order_id: orderId, status }
    });
  } catch (err) {
    next(err);
  }
});

// @route   DELETE /api/orders/:id
// @desc    Cancel order (sets status = 'Cancelled' and refunds/adjusts stock)
// @access  Private
router.delete('/:id', verifyToken, async (req, res, next) => {
  const orderId = req.params.id;

  try {
    const orderRes = await pool.query(
      `SELECT o.order_id, c.user_id, o.status, o.total_amount 
       FROM orders o
       JOIN customers c ON o.customer_id = c.customer_id
       WHERE o.order_id = $1`,
      [orderId]
    );

    if (orderRes.rows.length === 0) {
      const err = new Error('Order not found.');
      err.statusCode = 404;
      throw err;
    }

    const order = orderRes.rows[0];

    // Access control
    if (req.user.role !== 'Admin' && order.user_id !== req.user.user_id) {
      const err = new Error('Access denied. You do not have permission to cancel this order.');
      err.statusCode = 403;
      throw err;
    }

    if (order.status === 'Completed' || order.status === 'Cancelled') {
      const err = new Error(`Cannot cancel an order that is already ${order.status}.`);
      err.statusCode = 400;
      throw err;
    }

    // Cancel order in transaction
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // Update status
      await client.query("UPDATE orders SET status = 'Cancelled' WHERE order_id = $1", [orderId]);

      // Return items back to stock
      const itemsRes = await client.query('SELECT product_id, quantity FROM order_items WHERE order_id = $1', [orderId]);
      for (const item of itemsRes.rows) {
        await client.query('UPDATE products SET quantity = quantity + $1 WHERE product_id = $2', [item.quantity, item.product_id]);
      }

      // Update payment status if any
      await client.query("UPDATE payments SET payment_status = 'Refunded' WHERE order_id = $1 AND payment_status = 'Paid'", [orderId]);
      await client.query("UPDATE payments SET payment_status = 'Failed' WHERE order_id = $1 AND payment_status = 'Pending'", [orderId]);

      // Update delivery status
      await client.query("UPDATE deliveries SET delivery_status = 'Failed', delivery_notes = 'Order cancelled by customer.' WHERE order_id = $1", [orderId]);

      // Notify customer
      await client.query(
        `INSERT INTO notifications (user_id, message, link_url)
         VALUES ($1, $2, $3)`,
        [order.user_id, `Your order #${orderId} was cancelled successfully.`, `/dashboard.html`]
      );

      await client.query('COMMIT');
    } catch (dbErr) {
      await client.query('ROLLBACK');
      throw dbErr;
    } finally {
      client.release();
    }

    res.status(200).json({
      success: true,
      data: { message: 'Order successfully cancelled.', order_id: orderId }
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
