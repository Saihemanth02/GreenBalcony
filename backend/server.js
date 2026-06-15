const express = require('express');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

// Route Imports
const authRouter = require('./routes/auth');
const customersRouter = require('./routes/customers');
const categoriesRouter = require('./routes/categories');
const productsRouter = require('./routes/products');
const ordersRouter = require('./routes/orders');
const maintenanceRouter = require('./routes/maintenance');
const employeesRouter = require('./routes/employees');
const assignmentsRouter = require('./routes/assignments');
const paymentsRouter = require('./routes/payments');
const deliveriesRouter = require('./routes/deliveries');
const feedbackRouter = require('./routes/feedback');
const notificationsRouter = require('./routes/notifications');
const adminRouter = require('./routes/admin');
const aiRouter = require('./routes/ai');

// Middleware Import
const errorHandler = require('./middleware/errorHandler');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS and JSON Parsing
app.use(cors());
app.use(express.json());

// API Routes
app.use('/api/auth', authRouter);
app.use('/api/customers', customersRouter);
app.use('/api/categories', categoriesRouter);
app.use('/api/products', productsRouter);
app.use('/api/orders', ordersRouter);
app.use('/api/maintenance', maintenanceRouter);
app.use('/api/employees', employeesRouter);
app.use('/api/assignments', assignmentsRouter);
app.use('/api/payments', paymentsRouter);
app.use('/api/deliveries', deliveriesRouter);
app.use('/api/feedback', feedbackRouter);
app.use('/api/notifications', notificationsRouter);
app.use('/api/admin', adminRouter);
app.use('/api/ai', aiRouter);

// Serve Frontend Statically
app.use(express.static(path.join(__dirname, '../frontend')));

// Fallback for HTML routing
app.get('*', (req, res, next) => {
  // If request is for /api, don't serve index.html, forward to error
  if (req.path.startsWith('/api')) {
    const err = new Error('API Endpoint not found');
    err.statusCode = 404;
    return next(err);
  }
  res.sendFile(path.join(__dirname, '../frontend/index.html'));
});

// Global Error Handler
app.use(errorHandler);

// Start Server (only if run directly)
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`GreenBalcony server running on port ${PORT}`);
    console.log(`Open http://localhost:${PORT} in your browser to view the application.`);
  });
}

module.exports = app;
