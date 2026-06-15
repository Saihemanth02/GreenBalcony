// GreenBalcony — Administrator Dashboard & Control Panel
import { 
  getAdminStats, getOrders, updateOrderStatus, cancelOrder, getOrderById,
  getEmployees, createEmployee, updateEmployee, deleteEmployee,
  getMaintenanceSchedules, getAssignments, createAssignment, updateAssignmentStatus, deleteAssignment,
  getProducts, createProduct, updateProduct, deleteProduct,
  getCategories, createCategory, deleteCategory
} from './api.js';

// Global Admin State
let stats = {};
let ordersList = [];
let employeesList = [];
let schedulesList = [];
let assignmentsList = [];
let productsList = [];
let categoriesList = [];

// Helper to switch tabs
function switchTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabId) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    if (content.id === `tab-${tabId}`) content.classList.add('active');
    else content.classList.remove('active');
  });

  // Load appropriate data
  if (tabId === 'dashboard') loadDashboardStats();
  if (tabId === 'orders') loadOrders();
  if (tabId === 'workers') loadWorkers();
  if (tabId === 'assignments') loadAssignments();
  if (tabId === 'products') loadProductsAndCategories();
}

// ---------------- TAB 1: Dashboard Stats ----------------
async function loadDashboardStats() {
  showLoader();
  try {
    const res = await getAdminStats();
    if (res.success && res.data) {
      stats = res.data;
      
      document.getElementById('admin-stat-orders').textContent = stats.totalOrders;
      document.getElementById('admin-stat-pending').textContent = stats.pendingOrders;
      document.getElementById('admin-stat-revenue').textContent = formatCurrency(stats.totalRevenue);
      document.getElementById('admin-stat-customers').textContent = stats.totalCustomers;
      document.getElementById('admin-stat-employees').textContent = stats.totalEmployees;

      // Render recent 5 orders
      const container = document.getElementById('admin-recent-orders-list');
      if (container) {
        if (!stats.recentOrders || stats.recentOrders.length === 0) {
          renderEmptyState(container, 'No orders placed yet.', '📦');
        } else {
          container.innerHTML = stats.recentOrders.map(order => `
            <tr>
              <td>#${order.order_id}</td>
              <td>${order.customer_name} (${order.city})</td>
              <td><strong>${order.order_type}</strong></td>
              <td>${formatDate(order.booking_date)}</td>
              <td>${formatCurrency(order.total_amount)}</td>
              <td>
                <select class="admin-status-dropdown" data-id="${order.order_id}" style="min-height:32px; padding:4px 8px;">
                  <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
                  <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
                  <option value="In Progress" ${order.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
                  <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
                  <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
                </select>
              </td>
            </tr>
          `).join('');

          // Bind dropdown events
          document.querySelectorAll('#admin-recent-orders-list .admin-status-dropdown').forEach(select => {
            select.onchange = async () => {
              const id = parseInt(select.dataset.id);
              const status = select.value;
              await updateOrderStatusHandler(id, status);
            };
          });
        }
      }
    }
  } catch (err) {
    showToast('Failed to load dashboard metrics.', 'error');
    console.error(err);
  } finally {
    hideLoader();
  }
}

async function updateOrderStatusHandler(orderId, status) {
  try {
    const res = await updateOrderStatus(orderId, status);
    if (res.success) {
      showToast(`Order #${orderId} marked as ${status}.`, 'success');
      loadDashboardStats();
    }
  } catch (err) {
    showToast(err.message || 'Failed to update order status.', 'error');
  }
}

// ---------------- TAB 2: Orders Management ----------------
async function loadOrders() {
  showLoader();
  try {
    const res = await getOrders();
    if (res.success && res.data) {
      ordersList = res.data;
      applyOrdersFilter();
    }
  } catch (err) {
    showToast('Failed to load orders list.', 'error');
  } finally {
    hideLoader();
  }
}

function applyOrdersFilter() {
  const filterVal = document.getElementById('admin-orders-filter')?.value || 'All';
  if (filterVal === 'All') {
    renderOrdersTable(ordersList);
  } else {
    const filtered = ordersList.filter(o => o.status === filterVal);
    renderOrdersTable(filtered);
  }
}

function renderOrdersTable(orders) {
  const container = document.getElementById('admin-orders-table-body');
  if (!container) return;

  if (orders.length === 0) {
    container.innerHTML = `<tr><td colspan="7" style="text-align:center;">No matching orders found.</td></tr>`;
    return;
  }

  container.innerHTML = orders.map(order => `
    <tr>
      <td>#${order.order_id}</td>
      <td>
        <div><strong>${order.customer_name}</strong></div>
        <div style="font-size:var(--font-xs); color:var(--text-muted);">${order.customer_email} (${order.city})</div>
      </td>
      <td><strong>${order.order_type}</strong></td>
      <td>${formatDate(order.booking_date)}</td>
      <td>${formatCurrency(order.total_amount)}</td>
      <td>
        <select class="admin-orders-status-dropdown" data-id="${order.order_id}" style="min-height:32px; padding:4px 8px;">
          <option value="Pending" ${order.status === 'Pending' ? 'selected' : ''}>Pending</option>
          <option value="Confirmed" ${order.status === 'Confirmed' ? 'selected' : ''}>Confirmed</option>
          <option value="In Progress" ${order.status === 'In Progress' ? 'selected' : ''}>In Progress</option>
          <option value="Completed" ${order.status === 'Completed' ? 'selected' : ''}>Completed</option>
          <option value="Cancelled" ${order.status === 'Cancelled' ? 'selected' : ''}>Cancelled</option>
        </select>
      </td>
      <td>
        <button class="btn btn-ghost view-order-details-btn" data-id="${order.order_id}" style="min-height:32px; padding:6px 12px; font-size:var(--font-xs);">
          View Details
        </button>
      </td>
    </tr>
  `).join('');

  // Dropdown bindings
  document.querySelectorAll('#admin-orders-table-body .admin-orders-status-dropdown').forEach(select => {
    select.onchange = async () => {
      const id = parseInt(select.dataset.id);
      const status = select.value;
      try {
        const res = await updateOrderStatus(id, status);
        if (res.success) {
          showToast(`Order #${id} updated to ${status}`, 'success');
          loadOrders();
        }
      } catch (err) {
        showToast(err.message, 'error');
      }
    };
  });

  // Details button bindings
  document.querySelectorAll('.view-order-details-btn').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.dataset.id);
      openOrderDetailsModal(id);
    };
  });
}

async function openOrderDetailsModal(orderId) {
  showLoader();
  try {
    const res = await getOrderById(orderId);
    if (res.success && res.data) {
      const order = res.data;
      
      const modal = document.getElementById('admin-order-modal');
      document.getElementById('admin-order-modal-title').textContent = `Order #${order.order_id} Details`;
      
      let itemsHtml = '';
      if (order.items && order.items.length > 0) {
        itemsHtml = order.items.map(item => `
          <div style="display:flex; justify-content:space-between; font-size:var(--font-sm); padding:6px 0; border-bottom:1px solid var(--border-subtle);">
            <div>${item.product_name} <strong>x${item.quantity}</strong></div>
            <div>${formatCurrency(parseFloat(item.unit_price) * item.quantity)}</div>
          </div>
        `).join('');
      } else {
        itemsHtml = `<p style="font-size:var(--font-xs); color:var(--text-muted);">No purchased items. Base maintenance fee applies.</p>`;
      }

      document.getElementById('admin-order-modal-body').innerHTML = `
        <div style="display:flex; flex-direction:column; gap:12px;">
          <div>
            <strong>Customer Profile:</strong> ${order.customer_name} (${order.customer_email})<br>
            <strong>Phone:</strong> ${order.customer_phone || 'N/A'}<br>
            <strong>Shipping Address:</strong> ${order.address}, ${order.city} - ${order.pincode}
          </div>
          <hr style="border:0; border-top:1px solid var(--border-subtle);">
          <div>
            <strong>Order Type:</strong> ${order.order_type}<br>
            <strong>Scheduled Visit Date:</strong> ${formatDate(order.scheduled_date)}<br>
            <strong>Placed On:</strong> ${formatDate(order.booking_date)}<br>
            <strong>Current Status:</strong> <span class="badge badge-info">${order.status}</span>
          </div>
          <hr style="border:0; border-top:1px solid var(--border-subtle);">
          <div>
            <h4 style="margin-bottom:8px;">Purchased Components:</h4>
            ${itemsHtml}
            <div style="display:flex; justify-content:space-between; font-weight:700; margin-top:8px;">
              <div>Total Invoice:</div>
              <div>${formatCurrency(order.total_amount)}</div>
            </div>
          </div>
          <hr style="border:0; border-top:1px solid var(--border-subtle);">
          <div>
            <strong>Payment Method:</strong> ${order.payment ? order.payment.payment_method : 'N/A'}<br>
            <strong>Payment Status:</strong> <span class="badge ${order.payment && order.payment.payment_status === 'Paid' ? 'badge-success' : 'badge-pending'}">${order.payment ? order.payment.payment_status : 'Pending'}</span><br>
            <strong>Transaction ID:</strong> ${order.payment ? order.payment.transaction_id : 'N/A'}
          </div>
          <hr style="border:0; border-top:1px solid var(--border-subtle);">
          <div>
            <strong>Delivery Status:</strong> <span class="badge badge-info">${order.delivery ? order.delivery.delivery_status : 'Pending'}</span><br>
            <strong>Received By:</strong> ${order.delivery && order.delivery.received_by ? order.delivery.received_by : 'Awaiting delivery'}<br>
            <strong>Notes:</strong> ${order.notes || 'No extra notes.'}
          </div>
        </div>
      `;

      if (modal) modal.classList.add('open');
    }
  } catch (err) {
    showToast('Failed to load details.', 'error');
  } finally {
    hideLoader();
  }
}

// ---------------- TAB 3: Worker Management ----------------
async function loadWorkers() {
  showLoader();
  try {
    const res = await getEmployees();
    if (res.success && res.data) {
      employeesList = res.data;
      renderWorkers();
    }
  } catch (err) {
    showToast('Failed to load workers list.', 'error');
  } finally {
    hideLoader();
  }
}

function renderWorkers() {
  const container = document.getElementById('admin-workers-grid');
  if (!container) return;

  if (employeesList.length === 0) {
    renderEmptyState(container, 'No employee accounts. Add a gardener to get started!', '🧑‍🌾');
    return;
  }

  container.innerHTML = employeesList.map(emp => `
    <div class="card" style="display:flex; flex-direction:column; justify-content:space-between;">
      <div>
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h3 style="font-size:var(--font-md); font-weight:600; color:var(--text-primary);">${emp.name}</h3>
          <span class="badge badge-info">${emp.role}</span>
        </div>
        <div style="font-size:var(--font-sm); color:var(--text-secondary); margin-bottom:4px;">
          📞 Phone: ${emp.phone || 'N/A'}
        </div>
        <div style="font-size:var(--font-sm); color:var(--text-secondary); margin-bottom:4px;">
          ✉ Email: ${emp.email}
        </div>
        <div style="font-size:var(--font-sm); color:var(--text-secondary); margin-bottom:12px;">
          ⭐ Experience: <strong>${emp.experience} years</strong>
        </div>
      </div>
      <div style="display:flex; gap:8px; border-top:1px solid var(--border-subtle); padding-top:12px;">
        <button class="btn btn-secondary edit-worker-btn" data-id="${emp.employee_id}" style="flex:1; min-height:36px; padding:6px;">Edit</button>
        <button class="btn btn-danger delete-worker-btn" data-id="${emp.employee_id}" style="flex:1; min-height:36px; padding:6px;">Delete</button>
      </div>
    </div>
  `).join('');

  // Bind edit events
  document.querySelectorAll('.edit-worker-btn').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.dataset.id);
      openWorkerModal(id);
    };
  });

  // Bind delete events
  document.querySelectorAll('.delete-worker-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = parseInt(btn.dataset.id);
      const confirm = await confirmModal('Are you sure you want to delete this employee? Their user profile will also be deleted.');
      if (confirm) {
        showLoader();
        try {
          const res = await deleteEmployee(id);
          if (res.success) {
            showToast('Employee deleted successfully.', 'success');
            loadWorkers();
          }
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          hideLoader();
        }
      }
    };
  });
}

function openWorkerModal(employeeId = null) {
  const modal = document.getElementById('admin-worker-modal');
  const title = document.getElementById('worker-modal-title');
  const form = document.getElementById('worker-form');
  const idInput = document.getElementById('worker-id');

  const nameInput = document.getElementById('worker-name');
  const emailInput = document.getElementById('worker-email');
  const phoneInput = document.getElementById('worker-phone');
  const roleSelect = document.getElementById('worker-role');
  const expInput = document.getElementById('worker-experience');

  form.reset();
  idInput.value = '';

  if (employeeId) {
    title.textContent = 'Edit Employee Profile';
    const emp = employeesList.find(e => e.employee_id === employeeId);
    if (emp) {
      idInput.value = emp.employee_id;
      nameInput.value = emp.name;
      emailInput.value = emp.email;
      emailInput.disabled = true; // Email changes restricted
      phoneInput.value = emp.phone || '';
      roleSelect.value = emp.role;
      expInput.value = emp.experience || 0;
    }
  } else {
    title.textContent = 'Register New Employee';
    emailInput.disabled = false;
  }

  if (modal) modal.classList.add('open');
}

// ---------------- TAB 4: Assignments ----------------
async function loadAssignments() {
  showLoader();
  try {
    const [msRes, empRes, assignRes] = await Promise.all([
      getMaintenanceSchedules(),
      getEmployees(),
      getAssignments()
    ]);

    schedulesList = msRes.success ? msRes.data : [];
    employeesList = empRes.success ? empRes.data : [];
    assignmentsList = assignRes.success ? assignRes.data : [];

    // 1. Populate Schedule Dropdown (only Pending schedules)
    const scheduleSelect = document.getElementById('assign-schedule-select');
    if (scheduleSelect) {
      const pendingSchedules = schedulesList.filter(s => s.status === 'Pending');
      if (pendingSchedules.length === 0) {
        scheduleSelect.innerHTML = '<option value="">No pending schedules available</option>';
      } else {
        scheduleSelect.innerHTML = '<option value="">-- Select Pending Schedule --</option>' +
          pendingSchedules.map(s => `
            <option value="${s.schedule_id}">[Sched #${s.schedule_id}] Order #${s.order_id} — ${s.service_type} on ${formatDate(s.service_date)} (${s.city})</option>
          `).join('');
      }
    }

    // 2. Populate Employee Dropdown
    const employeeSelect = document.getElementById('assign-employee-select');
    if (employeeSelect) {
      if (employeesList.length === 0) {
        employeeSelect.innerHTML = '<option value="">No workers available</option>';
      } else {
        employeeSelect.innerHTML = '<option value="">-- Choose Employee --</option>' +
          employeesList.map(e => `
            <option value="${e.employee_id}">${e.name} (${e.role})</option>
          `).join('');
      }
    }

    // 3. Render Assignments list
    const container = document.getElementById('admin-assignments-list');
    if (container) {
      if (assignmentsList.length === 0) {
        renderEmptyState(container, 'No employee assignments recorded.', '📋');
      } else {
        container.innerHTML = assignmentsList.map(assign => {
          let badgeClass = 'badge-pending';
          if (assign.status === 'Completed') badgeClass = 'badge-success';
          else if (assign.status === 'Reassigned') badgeClass = 'badge-error';

          const actionBtn = assign.status === 'Assigned' 
            ? `<button class="btn btn-primary complete-assignment-btn" data-id="${assign.assignment_id}" style="min-height:32px; padding:6px 12px; font-size:var(--font-xs); background-color: var(--accent); color: #000;">Mark Complete</button>`
            : '';

          return `
            <tr>
              <td>#${assign.assignment_id}</td>
              <td>${formatDate(assign.service_date)}</td>
              <td><strong>${assign.service_type}</strong></td>
              <td>
                <div><strong>${assign.employee_name}</strong></div>
                <div style="font-size:var(--font-xs); color:var(--text-muted);">${assign.employee_role}</div>
              </td>
              <td>${assign.customer_name} (${assign.city})</td>
              <td><span class="badge ${badgeClass}">${assign.status}</span></td>
              <td>${actionBtn}</td>
            </tr>
          `;
        }).join('');

        // Bind Mark Complete buttons
        document.querySelectorAll('.complete-assignment-btn').forEach(btn => {
          btn.onclick = async () => {
            const id = parseInt(btn.dataset.id);
            showLoader();
            try {
              const res = await updateAssignmentStatus(id, 'Completed');
              if (res.success) {
                showToast('Assignment successfully completed!', 'success');
                loadAssignments();
              }
            } catch (err) {
              showToast(err.message, 'error');
            } finally {
              hideLoader();
            }
          };
        });
      }
    }
  } catch (err) {
    showToast('Failed to load assignments.', 'error');
  } finally {
    hideLoader();
  }
}

// ---------------- TAB 5: Products & Categories ----------------
async function loadProductsAndCategories() {
  showLoader();
  try {
    const [prodRes, catRes] = await Promise.all([
      getProducts(),
      getCategories()
    ]);

    productsList = prodRes.success ? prodRes.data : [];
    categoriesList = catRes.success ? catRes.data : [];

    renderProductsTable();
    renderCategoriesTable();
    populateProductModalDropdowns();
  } catch (err) {
    showToast('Failed to load catalog inventory.', 'error');
  } finally {
    hideLoader();
  }
}

function renderProductsTable() {
  const container = document.getElementById('admin-products-table-body');
  if (!container) return;

  if (productsList.length === 0) {
    container.innerHTML = `<tr><td colspan="7" style="text-align:center;">No products stocked.</td></tr>`;
    return;
  }

  container.innerHTML = productsList.map(prod => `
    <tr>
      <td>#${prod.product_id}</td>
      <td>
        <div style="display:flex; align-items:center; gap:8px;">
          <img src="${prod.image_url || 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?auto=format&fit=crop&q=80&w=50'}" style="width:40px; height:40px; object-fit:cover; border-radius:var(--radius-sm);">
          <div>
            <strong>${prod.product_name}</strong>
          </div>
        </div>
      </td>
      <td><span class="badge badge-info">${prod.category_name}</span></td>
      <td>${formatCurrency(prod.price)}</td>
      <td>${prod.quantity} units</td>
      <td>
        <div style="display:flex; gap:8px;">
          <button class="btn btn-ghost edit-product-btn" data-id="${prod.product_id}" style="min-height:32px; padding:6px 12px; font-size:var(--font-xs);">Edit</button>
          <button class="btn btn-danger delete-product-btn" data-id="${prod.product_id}" style="min-height:32px; padding:6px 12px; font-size:var(--font-xs);">Delete</button>
        </div>
      </td>
    </tr>
  `).join('');

  // Bind triggers
  document.querySelectorAll('.edit-product-btn').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.dataset.id);
      openProductModal(id);
    };
  });

  document.querySelectorAll('.delete-product-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = parseInt(btn.dataset.id);
      const confirm = await confirmModal('Are you sure you want to delete this product?');
      if (confirm) {
        showLoader();
        try {
          const res = await deleteProduct(id);
          if (res.success) {
            showToast('Product successfully deleted.', 'success');
            loadProductsAndCategories();
          }
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          hideLoader();
        }
      }
    };
  });
}

function openProductModal(productId = null) {
  const modal = document.getElementById('admin-product-modal');
  const title = document.getElementById('product-modal-title');
  const form = document.getElementById('product-form');
  const idInput = document.getElementById('product-id');

  const nameInput = document.getElementById('product-name');
  const catSelect = document.getElementById('product-category');
  const priceInput = document.getElementById('product-price');
  const qtyInput = document.getElementById('product-quantity');
  const descText = document.getElementById('product-description');
  const imgInput = document.getElementById('product-image-url');

  form.reset();
  idInput.value = '';

  if (productId) {
    title.textContent = 'Edit Product Catalog Item';
    const prod = productsList.find(p => p.product_id === productId);
    if (prod) {
      idInput.value = prod.product_id;
      nameInput.value = prod.product_name;
      catSelect.value = prod.category_id;
      priceInput.value = prod.price;
      qtyInput.value = prod.quantity;
      descText.value = prod.description || '';
      imgInput.value = prod.image_url || '';
    }
  } else {
    title.textContent = 'Add Product to Catalog';
  }

  if (modal) modal.classList.add('open');
}

function populateProductModalDropdowns() {
  const catSelect = document.getElementById('product-category');
  if (catSelect) {
    catSelect.innerHTML = categoriesList.map(c => `
      <option value="${c.category_id}">${c.category_name}</option>
    `).join('');
  }
}

function renderCategoriesTable() {
  const container = document.getElementById('admin-categories-list');
  if (!container) return;

  if (categoriesList.length === 0) {
    container.innerHTML = `<li style="padding:8px; color:var(--text-muted);">No categories created.</li>`;
    return;
  }

  container.innerHTML = categoriesList.map(cat => `
    <li style="display:flex; justify-content:space-between; align-items:center; padding:12px; border-bottom:1px solid var(--border-subtle);">
      <div>
        <strong>${cat.category_name}</strong> <span style="font-size:10px; color:var(--text-muted);">(${cat.category_type || 'N/A'})</span>
        <div style="font-size:var(--font-xs); color:var(--text-secondary); margin-top:2px;">${cat.description || ''}</div>
      </div>
      <button class="btn btn-danger delete-category-btn" data-id="${cat.category_id}" style="min-height:28px; width:28px; padding:0; border-radius:var(--radius-sm); font-size:var(--font-xs);">&times;</button>
    </li>
  `).join('');

  // Bind delete triggers
  document.querySelectorAll('.delete-category-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = parseInt(btn.dataset.id);
      const confirm = await confirmModal('Are you sure you want to delete this category? It will fail if it contains active products.');
      if (confirm) {
        showLoader();
        try {
          const res = await deleteCategory(id);
          if (res.success) {
            showToast('Category deleted successfully.', 'success');
            loadProductsAndCategories();
          }
        } catch (err) {
          showToast(err.message, 'error');
        } finally {
          hideLoader();
        }
      }
    };
  });
}

// ---------------- GLOBAL MOUNT ----------------
document.addEventListener('DOMContentLoaded', () => {
  // Secured admin checks
  const payload = requireAdmin();
  if (!payload) return;

  // Bind Tab clicks
  document.querySelectorAll('.navbar .nav-link, .tabs-nav .tab-btn').forEach(btn => {
    if (btn.dataset.tab) {
      btn.onclick = () => switchTab(btn.dataset.tab);
    }
  });

  // Bind interactive stat cards
  const cardOrders = document.getElementById('admin-card-orders');
  if (cardOrders) {
    cardOrders.onclick = () => {
      const ordersFilter = document.getElementById('admin-orders-filter');
      if (ordersFilter) ordersFilter.value = 'All';
      switchTab('orders');
    };
  }

  const cardPending = document.getElementById('admin-card-pending');
  if (cardPending) {
    cardPending.onclick = () => {
      const ordersFilter = document.getElementById('admin-orders-filter');
      if (ordersFilter) ordersFilter.value = 'Pending';
      switchTab('orders');
    };
  }

  const cardEmployees = document.getElementById('admin-card-employees');
  if (cardEmployees) {
    cardEmployees.onclick = () => {
      switchTab('workers');
    };
  }

  // Bind orders filter change
  const ordersFilter = document.getElementById('admin-orders-filter');
  if (ordersFilter) {
    ordersFilter.onchange = () => {
      applyOrdersFilter();
    };
  }

  // Global Modals click to close
  document.querySelectorAll('.modal-close, .modal-overlay').forEach(el => {
    el.onclick = (e) => {
      if (e.target.classList.contains('modal-close') || e.target.classList.contains('modal-overlay')) {
        const modal = el.closest('.modal-overlay');
        if (modal) modal.classList.remove('open');
      }
    };
  });

  // Worker Modal trigger
  const addWorkerBtn = document.getElementById('admin-add-worker-btn');
  if (addWorkerBtn) {
    addWorkerBtn.onclick = () => openWorkerModal();
  }

  // Worker Form submit handler
  const workerForm = document.getElementById('worker-form');
  if (workerForm) {
    workerForm.onsubmit = async (e) => {
      e.preventDefault();
      
      const id = document.getElementById('worker-id').value;
      const name = document.getElementById('worker-name').value.trim();
      const email = document.getElementById('worker-email').value.trim();
      const phone = document.getElementById('worker-phone').value.trim();
      const role = document.getElementById('worker-role').value;
      const experience = parseInt(document.getElementById('worker-experience').value);

      const submitBtn = workerForm.querySelector("button[type='submit']");
      setButtonLoading(submitBtn, true);

      try {
        let res;
        const payload = { name, email, phone, role, experience };
        
        if (id) {
          // Update
          res = await updateEmployee(parseInt(id), payload);
          showToast('Employee updated successfully.', 'success');
        } else {
          // Create
          res = await createEmployee(payload);
          showToast('Employee registered successfully!', 'success');
        }

        if (res.success) {
          document.getElementById('admin-worker-modal').classList.remove('open');
          loadWorkers();
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setButtonLoading(submitBtn, false);
      }
    };
  }

  // Assignment Form submit handler
  const assignForm = document.getElementById('admin-assign-form');
  if (assignForm) {
    assignForm.onsubmit = async (e) => {
      e.preventDefault();

      const scheduleId = document.getElementById('assign-schedule-select').value;
      const employeeId = document.getElementById('assign-employee-select').value;
      const submitBtn = assignForm.querySelector("button[type='submit']");

      if (!scheduleId || !employeeId) {
        showToast('Please select a schedule and employee.', 'warning');
        return;
      }

      setButtonLoading(submitBtn, true, 'Assigning...');

      try {
        const res = await createAssignment({
          schedule_id: parseInt(scheduleId),
          employee_id: parseInt(employeeId)
        });

        if (res.success) {
          showToast('Employee assigned to schedule successfully!', 'success');
          assignForm.reset();
          loadAssignments();
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setButtonLoading(submitBtn, false);
      }
    };
  }

  // Product Modal triggers
  const addProductBtn = document.getElementById('admin-add-product-btn');
  if (addProductBtn) {
    addProductBtn.onclick = () => openProductModal();
  }

  // Product Form submit handler
  const productForm = document.getElementById('product-form');
  if (productForm) {
    productForm.onsubmit = async (e) => {
      e.preventDefault();

      const id = document.getElementById('product-id').value;
      const product_name = document.getElementById('product-name').value.trim();
      const category_id = parseInt(document.getElementById('product-category').value);
      const price = parseFloat(document.getElementById('product-price').value);
      const quantity = parseInt(document.getElementById('product-quantity').value);
      const description = document.getElementById('product-description').value.trim();
      const image_url = document.getElementById('product-image-url').value.trim();

      const submitBtn = productForm.querySelector("button[type='submit']");
      setButtonLoading(submitBtn, true);

      const payload = { product_name, category_id, price, quantity, description, image_url };

      try {
        let res;
        if (id) {
          res = await updateProduct(parseInt(id), payload);
          showToast('Product updated successfully.', 'success');
        } else {
          res = await createProduct(payload);
          showToast('Product added successfully!', 'success');
        }

        if (res.success) {
          document.getElementById('admin-product-modal').classList.remove('open');
          loadProductsAndCategories();
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setButtonLoading(submitBtn, false);
      }
    };
  }

  // Category Add submit handler
  const addCatBtn = document.getElementById('admin-add-category-btn');
  if (addCatBtn) {
    addCatBtn.onclick = async () => {
      const nameInput = document.getElementById('admin-new-category-name');
      const typeInput = document.getElementById('admin-new-category-type');
      const descInput = document.getElementById('admin-new-category-desc');

      const category_name = nameInput ? nameInput.value.trim() : '';
      const category_type = typeInput ? typeInput.value.trim() : '';
      const description = descInput ? descInput.value.trim() : '';

      if (!category_name) {
        showToast('Please enter a category name.', 'warning');
        return;
      }

      setButtonLoading(addCatBtn, true, 'Creating...');
      
      try {
        const res = await createCategory({ category_name, category_type, description });
        if (res.success) {
          showToast('Category created!', 'success');
          if (nameInput) nameInput.value = '';
          if (typeInput) typeInput.value = '';
          if (descInput) descInput.value = '';
          loadProductsAndCategories();
        }
      } catch (err) {
        showToast(err.message, 'error');
      } finally {
        setButtonLoading(addCatBtn, false, 'Add Category');
      }
    };
  }

  // Initial load
  switchTab('dashboard');
});
