-- GreenBalcony Seed Data (UUID user_id compatible)

TRUNCATE TABLE notifications, feedback, deliveries, payments, assignments, maintenance_schedule, order_items, orders, products, categories, employees, customers, users RESTART IDENTITY CASCADE;

-- Insert Users with static UUID strings
INSERT INTO users (user_id, name, email, phone, role) VALUES
('00000000-0000-0000-0000-000000000001', 'Ravi Kumar', 'ravi@gmail.com', '9876543210', 'Customer'),
('00000000-0000-0000-0000-000000000002', 'Sita Lakshmi', 'sita@gmail.com', '9876543211', 'Customer'),
('00000000-0000-0000-0000-000000000003', 'Arun Reddy', 'admin@greenbalcony.com', '9876543219', 'Admin'),
('00000000-0000-0000-0000-000000000004', 'Meena Devi', 'meena@greenbalcony.com', '9876543212', 'Employee'),
('00000000-0000-0000-0000-000000000005', 'Suresh Babu', 'suresh@greenbalcony.com', '9876543213', 'Employee'),
('00000000-0000-0000-0000-000000000006', 'Kavitha Rao', 'kavitha@gmail.com', '9876543214', 'Customer'),
('00000000-0000-0000-0000-000000000007', 'Venkat Naidu', 'venkat@greenbalcony.com', '9876543215', 'Employee');

-- Insert Customers
INSERT INTO customers (user_id, address, city, pincode) VALUES
('00000000-0000-0000-0000-000000000001', 'Fl. 402, Lotus Apts, Madhapur', 'Hyderabad', '500081'),
('00000000-0000-0000-0000-000000000002', 'Door 10-4-5, Beach Road', 'Visakhapatnam', '530003'),
('00000000-0000-0000-0000-000000000006', 'Flat 12, Siri Towers, Benz Circle', 'Vijayawada', '520010');

-- Insert Employees
INSERT INTO employees (user_id, name, phone, role, experience) VALUES
('00000000-0000-0000-0000-000000000004', 'Meena Devi', '9876543212', 'Gardener', 5),
('00000000-0000-0000-0000-000000000005', 'Suresh Babu', '9876543213', 'Cleaner', 3),
('00000000-0000-0000-0000-000000000007', 'Venkat Naidu', '9876543215', 'Helper', 2);

-- Insert Categories
INSERT INTO categories (category_name, category_type, description) VALUES
('Plants', 'Flora', 'Beautiful and air-purifying indoor & outdoor balcony plants'),
('Pots', 'Containers', 'Clay, terracotta, ceramic, and self-watering pots and planters'),
('Decor', 'Aesthetic', 'String lights, wind chimes, and pebbles to decorate your balcony'),
('Fertilizers', 'Care Products', 'Organic vermicompost, neem powder, and plant health essentials');

-- Insert Products
INSERT INTO products (product_name, category_id, price, quantity, description, image_url) VALUES
('Aloe Vera', 1, 150.00, 50, 'Healing medicinal succulent, low maintenance.', 'https://images.unsplash.com/photo-1596547609652-9cf5d8d76921?auto=format&fit=crop&q=80&w=200'),
('Money Plant', 1, 120.00, 60, 'Stunning climber, helps purify air and brings positive energy.', 'https://images.unsplash.com/photo-1545241047-6083a3684587?auto=format&fit=crop&q=80&w=200'),
('Tulsi (Holy Basil)', 1, 90.00, 100, 'Sacred Indian herb with outstanding medicinal properties.', 'https://images.unsplash.com/photo-1615485290382-441e4d049cb5?auto=format&fit=crop&q=80&w=200'),
('Terracotta Pot', 2, 199.00, 40, 'Eco-friendly traditional baked clay pot for healthy roots.', 'https://images.unsplash.com/photo-1611080626919-7cf5a9dbab5b?auto=format&fit=crop&q=80&w=200'),
('Hanging Basket', 2, 250.00, 30, 'Sturdy plastic planter with hanging chains, perfect for trailing plants.', 'https://images.unsplash.com/photo-1525498128493-380d1990a112?auto=format&fit=crop&q=80&w=200'),
('Solar String Lights', 3, 499.00, 25, '10-meter solar powered warm yellow LED fairy lights for night glow.', 'https://images.unsplash.com/photo-1517263904808-5dc91e3e7044?auto=format&fit=crop&q=80&w=200'),
('Vermicompost (Organic)', 4, 150.00, 80, 'Premium organic worm compost rich in nitrogen and trace minerals.', 'https://images.unsplash.com/photo-1599599810769-bcde5a160d32?auto=format&fit=crop&q=80&w=200'),
('Neem Cake Powder', 4, 180.00, 45, 'Excellent organic fertilizer and natural pest repellent for soil.', 'https://images.unsplash.com/photo-1585320806297-9794b3e4eeae?auto=format&fit=crop&q=80&w=200');

-- Insert Orders
INSERT INTO orders (customer_id, order_type, booking_date, scheduled_date, status, total_amount, notes) VALUES
(1, 'Setup', '2026-06-10', '2026-07-10', 'Pending', 799.00, 'Need setting up near the east balcony railing.'),
(2, 'Maintenance', '2026-06-12', '2026-07-15', 'Confirmed', 1100.00, 'Please inspect yellowing leaves on money plant.'),
(1, 'Setup', '2026-06-01', '2026-06-10', 'Completed', 450.00, 'Quick setup of Tulsi plants.');

-- Insert Order Items
INSERT INTO order_items (order_id, product_id, quantity, unit_price) VALUES
(1, 1, 2, 150.00),
(1, 6, 1, 499.00),
(2, 2, 5, 120.00),
(2, 5, 2, 250.00),
(3, 3, 5, 90.00);

-- Insert Maintenance Schedule
INSERT INTO maintenance_schedule (order_id, service_date, service_type, notes, status) VALUES
(2, '2026-07-15', 'Plant Care', 'Inspect yellowing leaves, prune if necessary', 'Pending'),
(2, '2026-07-22', 'Watering', 'Water checks and misting', 'Pending'),
(3, '2026-06-10', 'Cleaning', 'Setup cleaning and organization', 'Done'),
(3, '2026-06-12', 'Fertilizing', 'Apply vermicompost and neem cake powder', 'Done');

-- Insert Assignments
INSERT INTO assignments (schedule_id, employee_id, assigned_date, status) VALUES
(3, 1, '2026-06-09', 'Completed'),
(4, 2, '2026-06-11', 'Completed');

-- Insert Payments
INSERT INTO payments (order_id, amount, payment_method, payment_status, payment_date, transaction_id) VALUES
(1, 799.00, 'UPI', 'Pending', NULL, 'TXN2026061001'),
(2, 1100.00, 'Card', 'Paid', '2026-06-12', 'TXN2026061202'),
(3, 450.00, 'UPI', 'Paid', '2026-06-01', 'TXN2026060103');

-- Insert Deliveries
INSERT INTO deliveries (order_id, delivery_date, delivery_status, received_by, delivery_notes) VALUES
(2, '2026-07-12', 'Pending', NULL, 'Waiting for dispatch of pots and plants'),
(3, '2026-06-09', 'Delivered', 'Ravi Kumar', 'Delivered directly to customer hand');

-- Insert Feedback
INSERT INTO feedback (customer_id, order_id, rating, comments, feedback_date) VALUES
(1, 3, 5, 'Amazing setup. The Tulsi plants are looking very fresh and healthy!', '2026-06-11');

-- Insert Notifications
INSERT INTO notifications (user_id, message, is_read, link_url) VALUES
('00000000-0000-0000-0000-000000000001', 'Welcome to GreenBalcony! Browse our catalog to design your dream garden.', TRUE, '/catalog.html'),
('00000000-0000-0000-0000-000000000001', 'Your setup service order #3 has been completed! Please share your feedback.', FALSE, '/feedback.html'),
('00000000-0000-0000-0000-000000000002', 'Payment of ₹1,100.00 received for order #2. Scheduled for 15 Jul 2026.', FALSE, '/payments.html'),
('00000000-0000-0000-0000-000000000003', 'New high-rating feedback received from customer Ravi Kumar.', FALSE, '/admin.html');
