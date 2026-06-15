// GreenBalcony — Supabase API Services
const SUPABASE_URL = 'https://lggyihahtgnxpnlhcoun.supabase.co';
const SUPABASE_KEY = 'sb_publishable_HN3KtRz6UroG5tOJpBTzdg_57zUOR2s';
const API_BASE = `${SUPABASE_URL}/rest/v1`;
const AUTH_BASE = `${SUPABASE_URL}/auth/v1`;
const AI_SERVER_BASE = 'http://localhost:5000/api';

function getSupabaseHeaders() {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_KEY,
    'Authorization': `Bearer ${token || SUPABASE_KEY}`
  };
}

async function request(url, options = {}) {
  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        ...getSupabaseHeaders(),
        ...options.headers
      }
    });

    if (response.status === 401) {
      if (!window.location.pathname.endsWith('login.html') && !window.location.pathname.endsWith('register.html')) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        sessionStorage.removeItem('token');
        sessionStorage.removeItem('user');
        window.location.href = 'login.html';
        throw new Error('Session expired. Please log in again.');
      }
    }

    // Supabase REST DELETE/PATCH usually return 204 No Content
    if (response.status === 204) {
      return { success: true };
    }

    const text = await response.text();
    const data = text ? JSON.parse(text) : {};

    if (!response.ok) {
      throw new Error(data.msg || data.error_description || data.message || data.error || `HTTP error! status: ${response.status}`);
    }

    return data;
  } catch (err) {
    console.error(`Request failed to ${url}:`, err.message);
    throw err;
  }
}

// Helper to flatten joined tables in PostgREST
function flattenRelation(item, key, targetKey) {
  if (item[key]) {
    item[targetKey] = item[key][targetKey];
  }
  return item;
}

// 1. Auth API (using Supabase Auth endpoints)
export const loginUser = async (email, password) => {
  const res = await request(`${AUTH_BASE}/token?grant_type=password`, {
    method: 'POST',
    body: JSON.stringify({ email, password })
  });

  // Fetch actual profile from public.users table to get correct role/name
  const userResult = await request(`${API_BASE}/users?user_id=eq.${res.user.id}&select=*`);
  const dbUser = userResult[0];
  const role = dbUser ? dbUser.role : (res.user.user_metadata.role || 'Customer');
  const name = dbUser ? dbUser.name : (res.user.user_metadata.name || 'User');

  return {
    success: true,
    data: {
      token: res.access_token,
      user: {
        user_id: res.user.id,
        name,
        email: res.user.email,
        role
      }
    }
  };
};

export const registerUser = async (payload) => {
  // 1. Supabase Auth Signup
  const res = await request(`${AUTH_BASE}/signup`, {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email,
      password: payload.password,
      data: {
        name: payload.name,
        phone: payload.phone,
        role: 'Customer'
      }
    })
  });

  const user = res.user || res.session?.user;
  if (!user) {
    throw new Error('Failed to retrieve user details from signup response.');
  }

  // 2. Insert user record into public.users table
  await request(`${API_BASE}/users`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: user.id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      role: 'Customer'
    })
  });

  // 3. Insert customer record into public.customers table
  await request(`${API_BASE}/customers`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: user.id,
      address: payload.address || '',
      city: payload.city || '',
      pincode: payload.pincode || ''
    })
  });

  // Send a welcome notification
  await request(`${API_BASE}/notifications`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: user.id,
      message: 'Welcome to GreenBalcony! Browse our catalog to design your dream garden.',
      link_url: '/catalog.html'
    })
  });

  return {
    success: true,
    data: {
      token: res.access_token || null,
      user: {
        user_id: user.id,
        name: payload.name,
        email: payload.email,
        role: 'Customer'
      }
    }
  };
};

export const getMyProfile = async () => {
  const user = await request(`${AUTH_BASE}/user`);
  
  const role = user.user_metadata.role || 'Customer';

  // Get matching user profile details
  const userResult = await request(`${API_BASE}/users?user_id=eq.${user.id}&select=*`);
  const profile = userResult[0] || { user_id: user.id, name: user.user_metadata.name, email: user.email, role };

  if (role === 'Customer') {
    const custResult = await request(`${API_BASE}/customers?user_id=eq.${user.id}&select=*`);
    if (custResult.length > 0) {
      profile.customer_details = custResult[0];
    }
  } else if (role === 'Employee') {
    const empResult = await request(`${API_BASE}/employees?user_id=eq.${user.id}&select=*`);
    if (empResult.length > 0) {
      profile.employee_details = empResult[0];
    }
  }

  return {
    success: true,
    data: profile
  };
};

// 2. Customers API
export const getCustomerProfile = async (id) => {
  const res = await request(`${API_BASE}/customers?customer_id=eq.${id}&select=*,users(*)`);
  if (res.length === 0) throw new Error('Customer profile not found');
  
  const customer = res[0];
  if (customer.users) {
    customer.name = customer.users.name;
    customer.email = customer.users.email;
    customer.phone = customer.users.phone;
    customer.role = customer.users.role;
  }

  return { success: true, data: customer };
};

export const updateCustomerProfile = async (id, payload) => {
  // Update customer table
  const custRes = await request(`${API_BASE}/customers?customer_id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      address: payload.address,
      city: payload.city,
      pincode: payload.pincode
    })
  });

  const customer = custRes[0];

  // Update user table
  const userRes = await request(`${API_BASE}/users?user_id=eq.${customer.user_id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      name: payload.name,
      phone: payload.phone
    })
  });

  const user = userRes[0];
  return {
    success: true,
    data: {
      ...customer,
      name: user.name,
      phone: user.phone,
      email: user.email
    }
  };
};

// 3. Categories API
export const getCategories = async () => {
  const res = await request(`${API_BASE}/categories?select=*&order=category_name.asc`);
  return { success: true, data: res };
};

export const createCategory = async (payload) => {
  const res = await request(`${API_BASE}/categories`, {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(payload)
  });
  return { success: true, data: res[0] };
};

export const updateCategory = async (id, payload) => {
  const res = await request(`${API_BASE}/categories?category_id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(payload)
  });
  return { success: true, data: res[0] };
};

export const deleteCategory = async (id) => {
  await request(`${API_BASE}/categories?category_id=eq.${id}`, { method: 'DELETE' });
  return { success: true };
};

// 4. Products API
export const getProducts = async (categoryId = null) => {
  let url = `${API_BASE}/products?select=*,categories(category_name)&order=product_id.desc`;
  if (categoryId) {
    url = `${API_BASE}/products?select=*,categories(category_name)&category_id=eq.${categoryId}&order=product_id.desc`;
  }
  const res = await request(url);
  const products = res.map(p => {
    if (p.categories) p.category_name = p.categories.category_name;
    return p;
  });
  return { success: true, data: products };
};

export const getProductById = async (id) => {
  const res = await request(`${API_BASE}/products?product_id=eq.${id}&select=*,categories(category_name)`);
  if (res.length === 0) throw new Error('Product not found');
  const product = res[0];
  if (product.categories) product.category_name = product.categories.category_name;
  return { success: true, data: product };
};

export const createProduct = async (payload) => {
  const res = await request(`${API_BASE}/products`, {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(payload)
  });
  return { success: true, data: res[0] };
};

export const updateProduct = async (id, payload) => {
  const res = await request(`${API_BASE}/products?product_id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(payload)
  });
  return { success: true, data: res[0] };
};

export const deleteProduct = async (id) => {
  await request(`${API_BASE}/products?product_id=eq.${id}`, { method: 'DELETE' });
  return { success: true };
};

// 5. Orders API
export const getOrders = async () => {
  const userPayload = getTokenPayload();
  const isAdmin = userPayload && userPayload.role === 'Admin';
  
  let url = `${API_BASE}/orders?select=*,customers(*,users(*))&order=order_id.desc`;
  
  // If customer, join and filter dynamically
  if (!isAdmin) {
    url = `${API_BASE}/orders?select=*,customers!inner(*,users!inner(*))&customers.users.user_id=eq.${userPayload.user_id}&order=order_id.desc`;
  }
  
  const res = await request(url);
  const orders = res.map(order => {
    if (order.customers) {
      order.city = order.customers.city;
      if (order.customers.users) {
        order.customer_name = order.customers.users.name;
        order.customer_email = order.customers.users.email;
      }
    }
    return order;
  });

  return { success: true, data: orders };
};

export const getOrderById = async (id) => {
  const res = await request(`${API_BASE}/orders?order_id=eq.${id}&select=*,customers(*,users(*)),order_items(*,products(*)),payments(*),deliveries(*)`);
  if (res.length === 0) throw new Error('Order not found');
  const order = res[0];

  if (order.customers) {
    order.address = order.customers.address;
    order.city = order.customers.city;
    order.pincode = order.customers.pincode;
    if (order.customers.users) {
      order.customer_name = order.customers.users.name;
      order.customer_email = order.customers.users.email;
      order.customer_phone = order.customers.users.phone;
    }
  }

  // Flatten order items
  order.items = (order.order_items || []).map(item => {
    if (item.products) {
      item.product_name = item.products.product_name;
      item.image_url = item.products.image_url;
    }
    return item;
  });

  order.payment = order.payments ? order.payments[0] || null : null;
  order.delivery = order.deliveries ? order.deliveries[0] || null : null;

  return { success: true, data: order };
};

// Sequential Transaction for creating orders from the client side
export const createOrder = async (payload) => {
  const userPayload = getTokenPayload();
  const user_id = userPayload.user_id;

  // 1. Ensure user profile exists in public.users table
  const userRes = await request(`${API_BASE}/users?user_id=eq.${user_id}&select=user_id`);
  if (userRes.length === 0) {
    await request(`${API_BASE}/users`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: user_id,
        name: userPayload.name || 'User',
        email: userPayload.email || '',
        phone: userPayload.phone || '',
        role: 'Customer'
      })
    });
  }

  // 2. Ensure customer profile exists in public.customers table
  const custRes = await request(`${API_BASE}/customers?user_id=eq.${user_id}&select=customer_id`);
  let customerId;
  if (custRes.length === 0) {
    const newCust = await request(`${API_BASE}/customers`, {
      method: 'POST',
      headers: { 'Prefer': 'return=representation' },
      body: JSON.stringify({
        user_id: user_id,
        address: '',
        city: 'Hyderabad',
        pincode: ''
      })
    });
    customerId = newCust[0].customer_id;
  } else {
    customerId = custRes[0].customer_id;
  }

  let calculatedTotal = 0;
  const itemsToInsert = [];

  // 2. Fetch prices & verify stock sequential loop
  if (payload.items && payload.items.length > 0) {
    for (const item of payload.items) {
      const prodRes = await request(`${API_BASE}/products?product_id=eq.${item.product_id}&select=*`);
      if (prodRes.length === 0) throw new Error('Product not found');
      
      const product = prodRes[0];
      if (product.quantity < item.quantity) {
        throw new Error(`Insufficient stock for ${product.product_name}. Available: ${product.quantity}`);
      }

      calculatedTotal += parseFloat(product.price) * item.quantity;
      itemsToInsert.push({
        product_id: item.product_id,
        quantity: item.quantity,
        unit_price: product.price
      });
    }
  } else {
    calculatedTotal = 500.00; // default maintenance fee
  }

  // 3. Create Order
  const orderRes = await request(`${API_BASE}/orders`, {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      customer_id: customerId,
      order_type: payload.order_type,
      scheduled_date: payload.scheduled_date,
      status: 'Pending',
      total_amount: calculatedTotal,
      notes: payload.notes || ''
    })
  });

  const newOrder = orderRes[0];

  // 4. Create Order Items (Bulk insert)
  if (itemsToInsert.length > 0) {
    const bulkItems = itemsToInsert.map(v => ({
      order_id: newOrder.order_id,
      product_id: v.product_id,
      quantity: v.quantity,
      unit_price: v.unit_price
    }));

    await request(`${API_BASE}/order_items`, {
      method: 'POST',
      body: JSON.stringify(bulkItems)
    });

    // 5. Decrement inventory
    for (const item of itemsToInsert) {
      await request(`${API_BASE}/products?product_id=eq.${item.product_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          quantity: parseInt(await getProductStock(item.product_id)) - item.quantity
        })
      });
    }
  }

  // Helper to fetch current product quantity
  async function getProductStock(pid) {
    const r = await request(`${API_BASE}/products?product_id=eq.${pid}&select=quantity`);
    return r[0]?.quantity || 0;
  }

  // 6. Create Payment Record (Pending)
  const transactionId = 'TXN' + Date.now();
  await request(`${API_BASE}/payments`, {
    method: 'POST',
    body: JSON.stringify({
      order_id: newOrder.order_id,
      amount: calculatedTotal,
      payment_method: payload.payment_method,
      payment_status: 'Pending',
      transaction_id: transactionId
    })
  });

  // 7. Create Delivery Record
  await request(`${API_BASE}/deliveries`, {
    method: 'POST',
    body: JSON.stringify({
      order_id: newOrder.order_id,
      delivery_status: 'Pending',
      delivery_notes: payload.order_type === 'Setup' ? 'Awaiting assembly.' : 'Care checklist.'
    })
  });

  // 8. If Maintenance, create schedule automatically
  if (payload.order_type === 'Maintenance') {
    await request(`${API_BASE}/maintenance_schedule`, {
      method: 'POST',
      body: JSON.stringify({
        order_id: newOrder.order_id,
        service_date: payload.scheduled_date,
        service_type: 'Plant Care',
        notes: payload.notes || 'Routine maintenance.',
        status: 'Pending'
      })
    });
  }

  // 9. Notifications
  await request(`${API_BASE}/notifications`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: user_id,
      message: `Your order #${newOrder.order_id} (${payload.order_type}) was placed successfully!`,
      link_url: '/dashboard.html'
    })
  });

  return {
    success: true,
    data: {
      order_id: newOrder.order_id,
      total_amount: newOrder.total_amount,
      scheduled_date: newOrder.scheduled_date
    }
  };
};

export const updateOrderStatus = async (id, status) => {
  const orderRes = await request(`${API_BASE}/orders?order_id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({ status })
  });

  const order = orderRes[0];

  // Auto-deliver on Complete
  if (status === 'Completed') {
    await request(`${API_BASE}/deliveries?order_id=eq.${id}`, {
      method: 'PATCH',
      body: JSON.stringify({
        delivery_status: 'Delivered',
        delivery_date: new Date().toISOString().split('T')[0],
        received_by: 'Customer'
      })
    });
  }

  // Notify
  const cust = await request(`${API_BASE}/customers?customer_id=eq.${order.customer_id}&select=user_id`);
  if (cust.length > 0) {
    await request(`${API_BASE}/notifications`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: cust[0].user_id,
        message: `Your order #${id} status has been updated to: ${status}`,
        link_url: '/dashboard.html'
      })
    });
  }

  return { success: true };
};

export const cancelOrder = async (id) => {
  await request(`${API_BASE}/orders?order_id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'Cancelled' })
  });

  // Revert product quantities
  const items = await request(`${API_BASE}/order_items?order_id=eq.${id}`);
  for (const item of items) {
    const prod = await request(`${API_BASE}/products?product_id=eq.${item.product_id}&select=quantity`);
    if (prod.length > 0) {
      await request(`${API_BASE}/products?product_id=eq.${item.product_id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          quantity: prod[0].quantity + item.quantity
        })
      });
    }
  }

  // Update payments/deliveries
  await request(`${API_BASE}/payments?order_id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ payment_status: 'Failed' })
  });

  await request(`${API_BASE}/deliveries?order_id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ delivery_status: 'Failed', delivery_notes: 'Cancelled.' })
  });

  return { success: true };
};

// 6. Maintenance API
export const getMaintenanceSchedules = async () => {
  const userPayload = getTokenPayload();
  const isAdmin = userPayload && userPayload.role === 'Admin';

  let url = `${API_BASE}/maintenance_schedule?select=*,orders(*,customers(*,users(*))),assignments(*,employees(*))&order=service_date.asc`;
  
  if (!isAdmin) {
    url = `${API_BASE}/maintenance_schedule?select=*,orders!inner(*,customers!inner(*,users!inner(*))),assignments(*,employees(*))&orders.customers.users.user_id=eq.${userPayload.user_id}&order=service_date.asc`;
  }

  const res = await request(url);
  const schedules = res.map(item => {
    // Map assignments & employees
    const activeAssign = (item.assignments || []).find(a => a.status !== 'Reassigned');
    if (activeAssign) {
      item.assignment_id = activeAssign.assignment_id;
      item.assignment_status = activeAssign.status;
      if (activeAssign.employees) {
        item.assigned_employee_name = activeAssign.employees.name;
        item.assigned_employee_phone = activeAssign.employees.phone;
      }
    }
    
    // Map customer name & city
    if (item.orders && item.orders.customers) {
      item.city = item.orders.customers.city;
      if (item.orders.customers.users) {
        item.customer_name = item.orders.customers.users.name;
      }
    }
    return item;
  });

  return { success: true, data: schedules };
};

export const createMaintenanceSchedule = async (payload) => {
  const res = await request(`${API_BASE}/maintenance_schedule`, {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(payload)
  });
  return { success: true, data: res[0] };
};

export const updateMaintenanceSchedule = async (id, payload) => {
  const res = await request(`${API_BASE}/maintenance_schedule?schedule_id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(payload)
  });

  // Notify customer if Done
  if (payload.status === 'Done') {
    const sched = res[0];
    const order = await request(`${API_BASE}/orders?order_id=eq.${sched.order_id}&select=customers(user_id)`);
    if (order.length > 0 && order[0].customers) {
      await request(`${API_BASE}/notifications`, {
        method: 'POST',
        body: JSON.stringify({
          user_id: order[0].customers.user_id,
          message: `Your maintenance service on ${sched.service_date} has been marked Completed!`,
          link_url: '/maintenance.html'
        })
      });
    }
  }

  return { success: true, data: res[0] };
};

export const deleteMaintenanceSchedule = async (id) => {
  await request(`${API_BASE}/maintenance_schedule?schedule_id=eq.${id}`, { method: 'DELETE' });
  return { success: true };
};

// 7. Employees API
export const getEmployees = async () => {
  const res = await request(`${API_BASE}/employees?select=*,users(email)&order=employee_id.desc`);
  const employees = res.map(e => {
    if (e.users) e.email = e.users.email;
    return e;
  });
  return { success: true, data: employees };
};

export const getEmployeeById = async (id) => {
  const res = await request(`${API_BASE}/employees?employee_id=eq.${id}&select=*,users(email)`);
  if (res.length === 0) throw new Error('Employee not found');
  const emp = res[0];
  if (emp.users) emp.email = emp.users.email;
  return { success: true, data: emp };
};

export const createEmployee = async (payload) => {
  // 1. Create User in Supabase Auth
  const signupRes = await request(`${AUTH_BASE}/signup`, {
    method: 'POST',
    body: JSON.stringify({
      email: payload.email,
      password: 'Password@123',
      data: { name: payload.name, phone: payload.phone, role: 'Employee' }
    })
  });

  const user = signupRes.user || signupRes.session?.user;

  // 2. Insert into users
  await request(`${API_BASE}/users`, {
    method: 'POST',
    body: JSON.stringify({
      user_id: user.id,
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      role: 'Employee'
    })
  });

  // 3. Insert into employees
  const empRes = await request(`${API_BASE}/employees`, {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      user_id: user.id,
      name: payload.name,
      phone: payload.phone,
      role: payload.role,
      experience: payload.experience
    })
  });

  return { success: true, data: empRes[0] };
};

export const updateEmployee = async (id, payload) => {
  const empRes = await request(`${API_BASE}/employees?employee_id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      name: payload.name,
      phone: payload.phone,
      role: payload.role,
      experience: payload.experience
    })
  });

  const emp = empRes[0];

  await request(`${API_BASE}/users?user_id=eq.${emp.user_id}`, {
    method: 'PATCH',
    body: JSON.stringify({
      name: payload.name,
      phone: payload.phone,
      email: payload.email
    })
  });

  return { success: true, data: emp };
};

export const deleteEmployee = async (id) => {
  const emp = await request(`${API_BASE}/employees?employee_id=eq.${id}&select=user_id`);
  if (emp.length === 0) throw new Error('Employee not found');
  
  // Deleting user cascade-deletes the employee profile
  await request(`${API_BASE}/users?user_id=eq.${emp[0].user_id}`, { method: 'DELETE' });
  return { success: true };
};

// 8. Assignments API
export const getAssignments = async () => {
  const res = await request(`${API_BASE}/assignments?select=*,employees(*),maintenance_schedule(*,orders(*,customers(*,users(*))))&order=assignment_id.desc`);
  const assignments = res.map(a => {
    if (a.employees) {
      a.employee_name = a.employees.name;
      a.employee_phone = a.employees.phone;
      a.employee_role = a.employees.role;
    }
    if (a.maintenance_schedule) {
      a.service_date = a.maintenance_schedule.service_date;
      a.service_type = a.maintenance_schedule.service_type;
      a.schedule_status = a.maintenance_schedule.status;
      if (a.maintenance_schedule.orders && a.maintenance_schedule.orders.customers) {
        a.city = a.maintenance_schedule.orders.customers.city;
        if (a.maintenance_schedule.orders.customers.users) {
          a.customer_name = a.maintenance_schedule.orders.customers.users.name;
        }
      }
    }
    return a;
  });

  return { success: true, data: assignments };
};

export const createAssignment = async (payload) => {
  // Reassign old active assignments
  await request(`${API_BASE}/assignments?schedule_id=eq.${payload.schedule_id}&status=eq.Assigned`, {
    method: 'PATCH',
    body: JSON.stringify({ status: 'Reassigned' })
  });

  const res = await request(`${API_BASE}/assignments`, {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      schedule_id: payload.schedule_id,
      employee_id: payload.employee_id,
      status: 'Assigned'
    })
  });

  // Notify customer
  const emp = await request(`${API_BASE}/employees?employee_id=eq.${payload.employee_id}&select=name`);
  const ms = await request(`${API_BASE}/maintenance_schedule?schedule_id=eq.${payload.schedule_id}&select=*,orders(customers(user_id))`);
  
  if (ms.length > 0 && ms[0].orders?.customers) {
    await request(`${API_BASE}/notifications`, {
      method: 'POST',
      body: JSON.stringify({
        user_id: ms[0].orders.customers.user_id,
        message: `Gardener ${emp[0]?.name || 'Staff'} has been assigned to your ${ms[0].service_type} visit on ${ms[0].service_date}.`,
        link_url: '/maintenance.html'
      })
    });
  }

  return { success: true, data: res[0] };
};

export const updateAssignmentStatus = async (id, status) => {
  const res = await request(`${API_BASE}/assignments?assignment_id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({ status })
  });

  const assign = res[0];

  if (status === 'Completed') {
    // Set maintenance schedule to Done
    await request(`${API_BASE}/maintenance_schedule?schedule_id=eq.${assign.schedule_id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status: 'Done' })
    });
  }

  return { success: true, data: assign };
};

export const deleteAssignment = async (id) => {
  await request(`${API_BASE}/assignments?assignment_id=eq.${id}`, { method: 'DELETE' });
  return { success: true };
};

// 9. Payments API
export const getPayments = async () => {
  const userPayload = getTokenPayload();
  const isAdmin = userPayload && userPayload.role === 'Admin';

  let url = `${API_BASE}/orders?select=*,payments(*),customers(*,users(*))&order=order_id.desc`;
  if (!isAdmin) {
    url = `${API_BASE}/orders?select=*,payments(*),customers!inner(*,users!inner(*))&customers.users.user_id=eq.${userPayload.user_id}&order=order_id.desc`;
  }

  const res = await request(url);
  const payments = res.map(order => {
    const pay = order.payments && order.payments[0] ? order.payments[0] : null;
    return {
      order_id: order.order_id,
      order_type: order.order_type,
      amount: pay ? pay.amount : order.total_amount,
      payment_method: pay ? pay.payment_method : 'N/A',
      payment_status: pay ? pay.payment_status : 'Pending',
      payment_date: pay ? pay.payment_date : null,
      created_at: order.created_at,
      customer_name: order.customers && order.customers.users ? order.customers.users.name : 'Customer'
    };
  });

  return { success: true, data: payments };
};

export const getPaymentById = async (id) => {
  const res = await request(`${API_BASE}/payments?payment_id=eq.${id}&select=*`);
  if (res.length === 0) throw new Error('Payment not found');
  return { success: true, data: res[0] };
};

export const createPayment = async (payload) => {
  const res = await request(`${API_BASE}/payments`, {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(payload)
  });
  return { success: true, data: res[0] };
};

export const updatePaymentStatus = async (id, status) => {
  const res = await request(`${API_BASE}/payments?payment_id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({ payment_status: status })
  });
  return { success: true, data: res[0] };
};

// 10. Deliveries API
export const getDeliveries = async () => {
  const res = await request(`${API_BASE}/deliveries?select=*,orders(*,customers(*,users(*)))&order=delivery_id.desc`);
  const deliveries = res.map(d => {
    if (d.orders) {
      d.order_type = d.orders.order_type;
      d.scheduled_date = d.orders.scheduled_date;
      if (d.orders.customers) {
        d.city = d.orders.customers.city;
        if (d.orders.customers.users) {
          d.customer_name = d.orders.customers.users.name;
        }
      }
    }
    return d;
  });
  return { success: true, data: deliveries };
};

export const getDeliveryById = async (id) => {
  const res = await request(`${API_BASE}/deliveries?delivery_id=eq.${id}&select=*`);
  if (res.length === 0) throw new Error('Delivery not found');
  return { success: true, data: res[0] };
};

export const createDelivery = async (payload) => {
  const res = await request(`${API_BASE}/deliveries`, {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(payload)
  });
  return { success: true, data: res[0] };
};

export const updateDeliveryStatus = async (id, payload) => {
  const res = await request(`${API_BASE}/deliveries?delivery_id=eq.${id}`, {
    method: 'PATCH',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify(payload)
  });
  return { success: true, data: res[0] };
};

// 11. Feedback API
export const getFeedback = async () => {
  const userPayload = getTokenPayload();
  const isAdmin = userPayload && userPayload.role === 'Admin';

  let url = `${API_BASE}/feedback?select=*,orders(*),customers(*,users(*))&order=feedback_id.desc`;
  if (!isAdmin) {
    url = `${API_BASE}/feedback?select=*,orders(*),customers!inner(*,users!inner(*))&customers.users.user_id=eq.${userPayload.user_id}&order=feedback_id.desc`;
  }

  const res = await request(url);
  const feedbacks = res.map(f => {
    if (f.orders) f.order_type = f.orders.order_type;
    if (f.customers && f.customers.users) f.customer_name = f.customers.users.name;
    return f;
  });

  return { success: true, data: feedbacks };
};

export const submitFeedback = async (payload) => {
  // Resolve customer_id
  const userPayload = getTokenPayload();
  const custRes = await request(`${API_BASE}/customers?user_id=eq.${userPayload.user_id}&select=customer_id`);
  if (custRes.length === 0) throw new Error('Customer profile not found');

  const res = await request(`${API_BASE}/feedback`, {
    method: 'POST',
    headers: { 'Prefer': 'return=representation' },
    body: JSON.stringify({
      customer_id: custRes[0].customer_id,
      order_id: payload.order_id,
      rating: payload.rating,
      comments: payload.comments
    })
  });

  return { success: true, data: res[0] };
};

export const deleteFeedback = async (id) => {
  await request(`${API_BASE}/feedback?feedback_id=eq.${id}`, { method: 'DELETE' });
  return { success: true };
};

// 12. Notifications API
export const getNotifications = async () => {
  const userPayload = getTokenPayload();
  const res = await request(`${API_BASE}/notifications?user_id=eq.${userPayload.user_id}&order=notification_id.desc`);
  return { success: true, data: res };
};

export const markNotificationAsRead = async (id) => {
  await request(`${API_BASE}/notifications?notification_id=eq.${id}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_read: true })
  });
  return { success: true };
};

export const markAllNotificationsRead = async () => {
  const userPayload = getTokenPayload();
  await request(`${API_BASE}/notifications?user_id=eq.${userPayload.user_id}`, {
    method: 'PATCH',
    body: JSON.stringify({ is_read: true })
  });
  return { success: true };
};

// 13. Admin Dashboard Statistics aggregation inside JS client
export const getAdminStats = async () => {
  // Fetch orders, payments, customers, and employees in parallel
  const [ordersRes, paymentsRes, customersRes, employeesRes] = await Promise.all([
    getOrders(),
    getPayments(),
    request(`${API_BASE}/customers?select=customer_id`),
    request(`${API_BASE}/employees?select=employee_id`)
  ]);

  const orders = ordersRes.data || [];
  const payments = paymentsRes.data || [];
  
  const totalOrders = orders.length;
  const pendingOrders = orders.filter(o => o.status === 'Pending').length;
  const totalRevenue = payments.filter(p => p.payment_status === 'Paid').reduce((sum, p) => sum + parseFloat(p.amount), 0);
  const totalCustomers = customersRes.length;
  const totalEmployees = employeesRes.length;
  const recentOrders = orders.slice(0, 5);

  return {
    success: true,
    data: {
      totalOrders,
      pendingOrders,
      totalRevenue,
      totalCustomers,
      totalEmployees,
      recentOrders
    }
  };
};

// 14. AI Features API (delegates securely to Node.js Express server)
async function aiRequest(path, body) {
  const token = localStorage.getItem('token') || sessionStorage.getItem('token');
  try {
    const response = await fetch(`${AI_SERVER_BASE}${path}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        ...(token && { 'Authorization': `Bearer ${token}` })
      },
      body: JSON.stringify(body)
    });

    const data = await response.json();
    if (!response.ok) {
      throw new Error(data.error || `HTTP error! status: ${response.status}`);
    }
    return data;
  } catch (err) {
    console.error(`AI API fail: ${path}`, err.message);
    throw err;
  }
}

export const getPlantAdvisorRecommendation = (payload) => aiRequest('/ai/plant-advisor', payload);
export const getSmartBookingSuggestion = (payload) => aiRequest('/ai/booking-assistant', payload);
export const getGardenChatReply = (payload) => aiRequest('/ai/garden-chat', payload);
