// GreenBalcony — Customer Dashboard Handler
import { getOrders, getMaintenanceSchedules, getPayments, getNotifications } from './api.js';

// Get time-based greeting
function getGreeting(name) {
  const hour = new Date().getHours();
  let greeting = 'Good evening';
  if (hour < 12) greeting = 'Good morning';
  else if (hour < 17) greeting = 'Good afternoon';
  return `${greeting}, ${name}!`;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Ensure authenticated
  const payload = requireAuth();
  if (!payload) return;

  // Render initial greeting
  const welcomeText = document.getElementById('welcome-user-text');
  if (welcomeText) {
    const cachedUser = JSON.parse(localStorage.getItem('user') || sessionStorage.getItem('user'));
    welcomeText.textContent = getGreeting(cachedUser ? cachedUser.name : 'Gardener');
  }

  showLoader();

  try {
    // 1. Fetch Orders, Schedules, Payments, and Notifications in parallel
    const [ordersRes, maintRes, paymentsRes, notifRes] = await Promise.all([
      getOrders().catch(() => ({ success: false, data: [] })),
      getMaintenanceSchedules().catch(() => ({ success: false, data: [] })),
      getPayments().catch(() => ({ success: false, data: [] })),
      getNotifications().catch(() => ({ success: false, data: [] }))
    ]);

    // 2. Compute Dashboard stats
    const orders = ordersRes.success ? ordersRes.data : [];
    const schedules = maintRes.success ? maintRes.data : [];
    const payments = paymentsRes.success ? paymentsRes.data : [];
    const notifications = notifRes.success ? notifRes.data : [];

    // Active Bookings (Pending, Confirmed, In Progress)
    const activeBookingsCount = orders.filter(o => ['Pending', 'Confirmed', 'In Progress'].includes(o.status)).length;
    const activeBookingsEl = document.getElementById('stat-active-bookings');
    if (activeBookingsEl) activeBookingsEl.textContent = activeBookingsCount;

    // Upcoming Maintenance visits (status 'Pending' or 'In Progress' service schedules)
    const upcomingMaintCount = schedules.filter(s => ['Pending', 'In Progress'].includes(s.status)).length;
    const upcomingMaintEl = document.getElementById('stat-upcoming-maintenance');
    if (upcomingMaintEl) upcomingMaintEl.textContent = upcomingMaintCount;

    // Total Spent (sum of all PAID payments)
    const totalSpent = payments
      .filter(p => p.payment_status === 'Paid')
      .reduce((sum, p) => sum + parseFloat(p.amount), 0);
    const totalSpentEl = document.getElementById('stat-total-spent');
    if (totalSpentEl) totalSpentEl.textContent = formatCurrency(totalSpent);

    // Unread Notifications count
    const unreadCount = notifications.filter(n => !n.is_read).length;
    const unreadEl = document.getElementById('stat-unread-notifications');
    if (unreadEl) unreadEl.textContent = unreadCount;

    // 3. Render Recent Orders (Limit to 5)
    const recentOrdersContainer = document.getElementById('dashboard-recent-orders');
    if (recentOrdersContainer) {
      const recentOrders = orders;
      if (recentOrders.length === 0) {
        renderEmptyState(recentOrdersContainer, 'No orders found. Set up your garden today!', '🌱');
      } else {
        let tableHtml = `
          <div class="table-scroll">
            <table>
              <thead>
                <tr>
                  <th>Order ID</th>
                  <th>Type</th>
                  <th>Booking Date</th>
                  <th>Schedule Date</th>
                  <th>Amount</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
        `;

        recentOrders.forEach(order => {
          let badgeClass = 'badge-pending';
          if (order.status === 'Completed') badgeClass = 'badge-success';
          else if (order.status === 'Cancelled') badgeClass = 'badge-error';
          else if (order.status === 'Confirmed' || order.status === 'In Progress') badgeClass = 'badge-info';

          tableHtml += `
            <tr style="cursor:pointer;" onclick="window.location.href='payments.html?order_id=${order.order_id}'">
              <td>#${order.order_id}</td>
              <td><strong>${order.order_type}</strong></td>
              <td>${formatDate(order.booking_date)}</td>
              <td>${formatDate(order.scheduled_date)}</td>
              <td>${formatCurrency(order.total_amount)}</td>
              <td><span class="badge ${badgeClass}">${order.status}</span></td>
            </tr>
          `;
        });

        tableHtml += '</tbody></table></div>';
        recentOrdersContainer.innerHTML = tableHtml;
      }
    }

    // 4. Render Upcoming Maintenance visits (Limit to 3)
    const maintContainer = document.getElementById('dashboard-upcoming-maintenance');
    if (maintContainer) {
      const upcomingVisits = schedules.filter(s => ['Pending', 'In Progress'].includes(s.status)).slice(0, 3);
      if (upcomingVisits.length === 0) {
        renderEmptyState(maintContainer, 'No upcoming maintenance scheduled.', '📅');
      } else {
        let cardsHtml = '<div style="display:flex; flex-direction:column; gap:16px;">';
        
        upcomingVisits.forEach(visit => {
          let badgeClass = 'badge-pending';
          if (visit.status === 'In Progress') badgeClass = 'badge-info';

          cardsHtml += `
            <div class="card" style="padding:16px; display:flex; justify-content:space-between; align-items:center;">
              <div>
                <h4 style="color:var(--accent); font-size:var(--font-sm);">${visit.service_type} Service</h4>
                <div style="font-size:var(--font-xs); color:var(--text-secondary); margin-top:4px;">
                  🗓 Scheduled Date: <strong>${formatDate(visit.service_date)}</strong>
                </div>
                <div style="font-size:var(--font-xs); color:var(--text-muted); margin-top:2px;">
                  Worker: ${visit.assigned_employee_name || 'Awaiting assignment'} ${visit.assigned_employee_phone ? `(${visit.assigned_employee_phone})` : ''}
                </div>
              </div>
              <div>
                <span class="badge ${badgeClass}">${visit.status}</span>
              </div>
            </div>
          `;
        });

        cardsHtml += '</div>';
        maintContainer.innerHTML = cardsHtml;
      }
    }
  } catch (err) {
    console.error('Dashboard error:', err);
    showToast('Failed to load dashboard data. Please try again.', 'error');
  } finally {
    hideLoader();
  }
});
