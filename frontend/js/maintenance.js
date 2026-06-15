// GreenBalcony — Customer Maintenance Schedule Handler
import { getMaintenanceSchedules } from './api.js';

let allSchedules = [];

function renderTimeline(schedules) {
  const container = document.getElementById('maintenance-timeline');
  if (!container) return;

  if (schedules.length === 0) {
    renderEmptyState(container, 'No maintenance scheduled. Book a service to get started.', '📅');
    return;
  }

  container.innerHTML = `
    <div style="position:relative; padding-left:32px; display:flex; flex-direction:column; gap:24px;">
      <!-- Vertical timeline accent line -->
      <div style="position:absolute; top:4px; bottom:4px; left:8px; width:2px; background:var(--border-subtle);"></div>
      
      ${schedules.map(item => {
        let badgeClass = 'badge-pending';
        let dotColor = 'var(--status-pending)';
        
        if (item.status === 'Done') {
          badgeClass = 'badge-success';
          dotColor = 'var(--status-success)';
        } else if (item.status === 'Skipped') {
          badgeClass = 'badge-error';
          dotColor = 'var(--status-error)';
        } else if (item.status === 'In Progress') {
          badgeClass = 'badge-info';
          dotColor = 'var(--status-info)';
        }

        return `
          <div style="position:relative;">
            <!-- Timeline dot indicator -->
            <div style="position:absolute; left:-32px; top:12px; width:18px; height:18px; border-radius:50%; background:var(--bg-base); border:3px solid ${dotColor}; z-index:2; box-shadow:0 0 10px ${dotColor}44;"></div>
            
            <div class="card" style="padding:20px;">
              <div style="display:flex; justify-content:space-between; align-items:flex-start; flex-wrap:wrap; gap:12px; margin-bottom:12px;">
                <div>
                  <h3 style="font-size:var(--font-lg); font-weight:600; color:var(--text-primary);">${item.service_type} Service</h3>
                  <div style="font-size:var(--font-xs); color:var(--text-secondary); margin-top:2px;">
                    Order Reference: <strong>#${item.order_id}</strong>
                  </div>
                </div>
                <div style="display:flex; flex-direction:column; align-items:flex-end; gap:4px;">
                  <span style="font-size:var(--font-sm); font-weight:600; color:var(--accent);">🗓 ${formatDate(item.service_date)}</span>
                  <span class="badge ${badgeClass}">${item.status}</span>
                </div>
              </div>
              
              <div style="font-size:var(--font-sm); color:var(--text-secondary); background:var(--bg-elevated); padding:12px; border-radius:var(--radius-md); border-left:3px solid var(--accent); margin-bottom:12px;">
                <strong>Instruction Notes:</strong><br>
                ${item.notes || 'No instructions provided.'}
              </div>

              <div style="display:flex; justify-content:space-between; align-items:center; border-top:1px solid var(--border-subtle); padding-top:12px; font-size:var(--font-xs); color:var(--text-muted);">
                <div>
                  🛠 Assigner: <strong>GreenBalcony Administrator</strong>
                </div>
                <div>
                  🧑‍🌾 Gardener: <strong>${item.assigned_employee_name || 'Awaiting assignment'}</strong> 
                  ${item.assigned_employee_phone ? `(ph: ${item.assigned_employee_phone})` : ''}
                </div>
              </div>
            </div>
          </div>
        `;
      }).join('')}
    </div>
  `;
}

document.addEventListener('DOMContentLoaded', async () => {
  // Guard
  const payload = requireAuth();
  if (!payload) return;

  showLoader();

  try {
    const res = await getMaintenanceSchedules();
    if (res.success && res.data) {
      allSchedules = res.data;
      renderTimeline(allSchedules);
    }
  } catch (err) {
    console.error('Failed to load maintenance schedules:', err);
    showToast('Failed to load maintenance records.', 'error');
  } finally {
    hideLoader();
  }

  // Filter Buttons binding
  document.querySelectorAll('.tab-btn').forEach(btn => {
    btn.onclick = () => {
      document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const filterValue = btn.dataset.filter;
      if (filterValue === 'all') {
        renderTimeline(allSchedules);
      } else {
        const filtered = allSchedules.filter(s => s.status.toLowerCase() === filterValue.toLowerCase());
        renderTimeline(filtered);
      }
    };
  });
});
