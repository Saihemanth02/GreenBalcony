// GreenBalcony — Feedback Handler
import { getFeedback, submitFeedback, deleteFeedback, getOrders } from './api.js';

let selectedRating = 0;
let completedOrders = [];
let pastFeedbackList = [];

// Populate Past Feedback Cards
function renderPastFeedback() {
  const container = document.getElementById('past-feedback-container');
  if (!container) return;

  if (pastFeedbackList.length === 0) {
    renderEmptyState(container, 'You have not submitted any feedback yet.', '💬');
    return;
  }

  container.innerHTML = pastFeedbackList.map(feed => {
    // Generate star string
    let stars = '';
    for (let i = 1; i <= 5; i++) {
      stars += i <= feed.rating ? '★' : '☆';
    }

    return `
      <div class="card" style="margin-bottom:16px;">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
          <div>
            <h4 style="color:var(--accent); font-size:var(--font-sm);">Order Reference: #${feed.order_id}</h4>
            <div style="font-size:var(--font-xs); color:var(--text-muted);">${formatDateTime(feed.created_at)}</div>
          </div>
          <div style="display:flex; align-items:center; gap:12px;">
            <span style="color:#fbbf24; font-size:var(--font-md); letter-spacing:2px;">${stars}</span>
            <button class="btn btn-danger delete-feedback-btn" data-id="${feed.feedback_id}" style="min-height:32px; padding:6px 12px; font-size:var(--font-xs);">
              Delete
            </button>
          </div>
        </div>
        <p style="font-size:var(--font-sm); color:var(--text-secondary); background:var(--bg-elevated); padding:12px; border-radius:var(--radius-md);">
          "${feed.comments || 'No comment text provided.'}"
        </p>
      </div>
    `;
  }).join('');

  // Attach delete triggers
  document.querySelectorAll('.delete-feedback-btn').forEach(btn => {
    btn.onclick = async () => {
      const id = parseInt(btn.dataset.id);
      const confirm = await confirmModal('Are you sure you want to delete this feedback?');
      if (confirm) {
        showLoader();
        try {
          const res = await deleteFeedback(id);
          if (res.success) {
            showToast('Feedback deleted successfully.', 'success');
            // Reload page data
            await loadFeedbackData();
          }
        } catch (err) {
          showToast(err.message || 'Failed to delete feedback.', 'error');
        } finally {
          hideLoader();
        }
      }
    };
  });
}

// Load both lists from API
async function loadFeedbackData() {
  try {
    const [ordersRes, feedbackRes] = await Promise.all([
      getOrders(),
      getFeedback()
    ]);

    if (ordersRes.success) {
      // Filter only Completed orders
      completedOrders = ordersRes.data.filter(o => o.status === 'Completed');
      
      const dropdown = document.getElementById('feedback-order-select');
      if (dropdown) {
        if (completedOrders.length === 0) {
          dropdown.innerHTML = '<option value="">No completed orders available</option>';
        } else {
          dropdown.innerHTML = '<option value="">-- Choose a Completed Order --</option>' + 
            completedOrders.map(o => `
              <option value="${o.order_id}">Order #${o.order_id} (${o.order_type}) — ${formatDate(o.scheduled_date)}</option>
            `).join('');
        }
      }
    }

    if (feedbackRes.success) {
      pastFeedbackList = feedbackRes.data;
      renderPastFeedback();
    }
  } catch (err) {
    console.error('Feedback details load failure:', err);
    showToast('Failed to load feedback details.', 'error');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Auth guard
  const payload = requireAuth();
  if (!payload) return;

  // Star Rating widget logic
  const stars = document.querySelectorAll('.star-rating-widget span');
  stars.forEach((star, index) => {
    // Hover highlight
    star.onmouseover = () => {
      stars.forEach((s, idx) => {
        if (idx <= index) s.classList.add('hover');
        else s.classList.remove('hover');
      });
    };

    star.onmouseout = () => {
      stars.forEach(s => s.classList.remove('hover'));
    };

    // Click select
    star.onclick = () => {
      selectedRating = index + 1;
      stars.forEach((s, idx) => {
        if (idx < selectedRating) s.classList.add('selected');
        else s.classList.remove('selected');
      });
    };
  });

  // Submit trigger
  const feedbackForm = document.getElementById('feedback-submit-form');
  if (feedbackForm) {
    feedbackForm.onsubmit = async (e) => {
      e.preventDefault();

      const orderSelect = document.getElementById('feedback-order-select');
      const commentsText = document.getElementById('feedback-comments');
      const submitBtn = document.getElementById('feedback-submit-btn');

      if (!orderSelect || !orderSelect.value) {
        showToast('Please select a completed order reference.', 'warning');
        return;
      }

      if (selectedRating === 0) {
        showToast('Please click on a star rating between 1 and 5.', 'warning');
        return;
      }

      setButtonLoading(submitBtn, true, 'Submitting Feedback...');

      try {
        const payload = {
          order_id: parseInt(orderSelect.value),
          rating: selectedRating,
          comments: commentsText ? commentsText.value.trim() : ''
        };

        const res = await submitFeedback(payload);
        if (res.success) {
          showToast('Feedback submitted successfully! Thank you.', 'success');
          
          // Reset Form
          feedbackForm.reset();
          selectedRating = 0;
          stars.forEach(s => s.classList.remove('selected'));
          
          // Reload Lists
          await loadFeedbackData();
        }
      } catch (err) {
        showToast(err.message || 'Failed to submit feedback. Have you already reviewed this order?', 'error');
      } finally {
        setButtonLoading(submitBtn, false);
      }
    };
  }

  // Load Initial Data
  showLoader();
  await loadFeedbackData();
  hideLoader();
});
