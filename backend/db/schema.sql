-- GreenBalcony PostgreSQL Schema
-- MCA Mini Project (Supabase UUID compatible)

DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS feedback CASCADE;
DROP TABLE IF EXISTS deliveries CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS assignments CASCADE;
DROP TABLE IF EXISTS maintenance_schedule CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS employees CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- TABLE 1: users (Supabase Auth compatible UUID)
CREATE TABLE users (
  user_id UUID PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) UNIQUE NOT NULL,
  phone VARCHAR(15),
  role VARCHAR(20) NOT NULL DEFAULT 'Customer' CHECK (role IN ('Customer', 'Admin', 'Employee')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 2: customers
CREATE TABLE customers (
  customer_id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  address VARCHAR(300),
  city VARCHAR(100),
  pincode VARCHAR(10),
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 3: employees
CREATE TABLE employees (
  employee_id SERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  name VARCHAR(100) NOT NULL,
  phone VARCHAR(15),
  role VARCHAR(50) NOT NULL CHECK (role IN ('Gardener', 'Cleaner', 'Helper')),
  experience INT DEFAULT 0 CHECK (experience >= 0),
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 4: categories
CREATE TABLE categories (
  category_id SERIAL PRIMARY KEY,
  category_name VARCHAR(100) UNIQUE NOT NULL,
  category_type VARCHAR(50),
  description TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 5: products
CREATE TABLE products (
  product_id SERIAL PRIMARY KEY,
  product_name VARCHAR(150) NOT NULL,
  category_id INT NOT NULL REFERENCES categories(category_id) ON DELETE RESTRICT,
  price NUMERIC(10,2) NOT NULL CHECK (price >= 0),
  quantity INT NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  description TEXT,
  image_url VARCHAR(500),
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 6: orders
CREATE TABLE orders (
  order_id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  order_type VARCHAR(30) NOT NULL CHECK (order_type IN ('Setup', 'Maintenance')),
  booking_date DATE NOT NULL DEFAULT CURRENT_DATE,
  scheduled_date DATE NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'Confirmed', 'In Progress', 'Completed', 'Cancelled')),
  total_amount NUMERIC(10,2) DEFAULT 0 CHECK (total_amount >= 0),
  notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 7: order_items
CREATE TABLE order_items (
  order_item_id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  product_id INT NOT NULL REFERENCES products(product_id) ON DELETE RESTRICT,
  quantity INT NOT NULL DEFAULT 1 CHECK (quantity > 0),
  unit_price NUMERIC(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 8: maintenance_schedule
CREATE TABLE maintenance_schedule (
  schedule_id SERIAL PRIMARY KEY,
  order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  service_date DATE NOT NULL,
  service_type VARCHAR(80) NOT NULL CHECK (service_type IN ('Watering', 'Cleaning', 'Fertilizing', 'Plant Care', 'Pruning')),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (status IN ('Pending', 'In Progress', 'Done', 'Skipped')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 9: assignments
CREATE TABLE assignments (
  assignment_id SERIAL PRIMARY KEY,
  schedule_id INT NOT NULL REFERENCES maintenance_schedule(schedule_id) ON DELETE CASCADE,
  employee_id INT NOT NULL REFERENCES employees(employee_id) ON DELETE CASCADE,
  assigned_date DATE NOT NULL DEFAULT CURRENT_DATE,
  status VARCHAR(20) NOT NULL DEFAULT 'Assigned' CHECK (status IN ('Assigned', 'Completed', 'Reassigned')),
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 10: payments
CREATE TABLE payments (
  payment_id SERIAL PRIMARY KEY,
  order_id INT UNIQUE NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  amount NUMERIC(10,2) NOT NULL CHECK (amount >= 0),
  payment_method VARCHAR(20) NOT NULL CHECK (payment_method IN ('UPI', 'Card', 'Cash', 'NetBanking')),
  payment_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (payment_status IN ('Pending', 'Paid', 'Failed', 'Refunded')),
  payment_date DATE,
  transaction_id VARCHAR(100),
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 11: deliveries
CREATE TABLE deliveries (
  delivery_id SERIAL PRIMARY KEY,
  order_id INT UNIQUE NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  delivery_date DATE,
  delivery_status VARCHAR(20) NOT NULL DEFAULT 'Pending' CHECK (delivery_status IN ('Pending', 'Dispatched', 'Delivered', 'Failed')),
  received_by VARCHAR(100),
  delivery_notes TEXT,
  created_at TIMESTAMP DEFAULT NOW()
);

-- TABLE 12: feedback
CREATE TABLE feedback (
  feedback_id SERIAL PRIMARY KEY,
  customer_id INT NOT NULL REFERENCES customers(customer_id) ON DELETE CASCADE,
  order_id INT NOT NULL REFERENCES orders(order_id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comments TEXT,
  feedback_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE (customer_id, order_id)
);

-- TABLE 13: notifications
CREATE TABLE notifications (
  notification_id SERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES users(user_id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  notification_date TIMESTAMP DEFAULT NOW(),
  is_read BOOLEAN NOT NULL DEFAULT FALSE,
  link_url VARCHAR(300),
  created_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for optimized searching
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_id ON order_items(product_id);
CREATE INDEX idx_maintenance_order_id ON maintenance_schedule(order_id);
CREATE INDEX idx_assignments_schedule_id ON assignments(schedule_id);
CREATE INDEX idx_assignments_employee_id ON assignments(employee_id);
CREATE INDEX idx_payments_order_id ON payments(order_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_feedback_customer_id ON feedback(customer_id);
CREATE INDEX idx_products_category_id ON products(category_id);
