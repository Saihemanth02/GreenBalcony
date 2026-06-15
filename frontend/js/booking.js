// GreenBalcony — Multi-Step Booking Wizard
import { createOrder } from './api.js';

let currentStep = 1;
let cartItems = [];
let serviceType = 'Setup';
let scheduledDate = '';
let notes = '';
let paymentMethod = 'UPI';
let calculatedTotal = 0;

// Load cart state
function loadCart() {
  const stored = sessionStorage.getItem('gb_cart');
  if (stored) {
    try {
      cartItems = JSON.parse(stored);
    } catch (e) {
      cartItems = [];
    }
  }
}

// Navigation between steps
function updateWizardUI() {
  // Update Steps Content Visibility
  document.querySelectorAll('.wizard-step-content').forEach((content, index) => {
    if (index + 1 === currentStep) {
      content.classList.add('active');
    } else {
      content.classList.remove('active');
    }
  });

  // Update Progress Bar & Steps indicators
  document.querySelectorAll('.progress-step').forEach((stepEl, index) => {
    if (index + 1 < currentStep) {
      stepEl.className = 'progress-step completed';
    } else if (index + 1 === currentStep) {
      stepEl.className = 'progress-step active';
    } else {
      stepEl.className = 'progress-step';
    }
  });

  // Update Buttons
  const prevBtn = document.getElementById('wizard-prev-btn');
  const nextBtn = document.getElementById('wizard-next-btn');

  if (currentStep === 1) {
    prevBtn.style.display = 'none';
  } else {
    prevBtn.style.display = 'inline-flex';
  }

  if (currentStep === 4) {
    nextBtn.textContent = 'Confirm & Place Order';
    nextBtn.style.backgroundColor = 'var(--accent)';
    nextBtn.style.color = '#000';
  } else {
    nextBtn.textContent = 'Next';
    nextBtn.style.backgroundColor = 'var(--bg-elevated)';
    nextBtn.style.color = 'var(--text-primary)';
  }
}

function renderStep2Products() {
  const container = document.getElementById('booking-products-review');
  if (!container) return;

  if (serviceType === 'Maintenance' && cartItems.length === 0) {
    container.innerHTML = `
      <div style="padding:24px; text-align:center; color:var(--text-secondary);">
        <p>No products selected. Maintenance services have a base fee of ₹500.00.</p>
        <p style="font-size:var(--font-xs); color:var(--text-muted); margin-top:4px;">You can go to the <a href="catalog.html">Catalog</a> to purchase plants or fertilizers.</p>
      </div>
    `;
    return;
  }

  if (cartItems.length === 0) {
    container.innerHTML = `
      <div style="padding:24px; text-align:center; color:var(--text-error);">
        <p>⚠️ Setup orders require purchasing at least one product.</p>
        <a href="catalog.html" class="btn btn-secondary" style="margin-top:16px;">Go to Catalog</a>
      </div>
    `;
    return;
  }

  let html = `
    <div class="table-scroll">
      <table>
        <thead>
          <tr>
            <th>Product Name</th>
            <th>Unit Price</th>
            <th>Quantity</th>
            <th>Subtotal</th>
          </tr>
        </thead>
        <tbody>
  `;

  let subtotal = 0;
  cartItems.forEach(item => {
    const itemSubtotal = parseFloat(item.price) * item.quantity;
    subtotal += itemSubtotal;
    html += `
      <tr>
        <td>${item.product_name}</td>
        <td>${formatCurrency(item.price)}</td>
        <td>${item.quantity}</td>
        <td>${formatCurrency(itemSubtotal)}</td>
      </tr>
    `;
  });

  html += `
        <tr style="font-weight:700;">
          <td colspan="3" style="text-align:right;">Subtotal:</td>
          <td>${formatCurrency(subtotal)}</td>
        </tr>
      </tbody>
    </table>
  </div>
  `;

  container.innerHTML = html;
}

function renderStep4Summary() {
  const typeEl = document.getElementById('summary-service-type');
  const dateEl = document.getElementById('summary-scheduled-date');
  const methodEl = document.getElementById('summary-payment-method');
  const notesEl = document.getElementById('summary-notes');
  const itemsContainer = document.getElementById('summary-items-list');
  const totalEl = document.getElementById('summary-total-amount');

  if (typeEl) typeEl.textContent = serviceType;
  if (dateEl) dateEl.textContent = formatDate(scheduledDate);
  if (methodEl) methodEl.textContent = paymentMethod;
  if (notesEl) notesEl.textContent = notes || 'No additional notes provided.';

  let subtotal = 0;
  let itemsHtml = '';

  if (cartItems.length > 0) {
    itemsHtml = `
      <div class="table-scroll" style="margin-top:12px;">
        <table style="font-size:var(--font-xs);">
          <thead>
            <tr>
              <th>Item</th>
              <th>Qty</th>
              <th>Price</th>
            </tr>
          </thead>
          <tbody>
    `;

    cartItems.forEach(item => {
      const itemSubtotal = parseFloat(item.price) * item.quantity;
      subtotal += itemSubtotal;
      itemsHtml += `
        <tr>
          <td>${item.product_name}</td>
          <td>${item.quantity}</td>
          <td>${formatCurrency(itemSubtotal)}</td>
        </tr>
      `;
    });

    itemsHtml += '</tbody></table></div>';
  } else {
    itemsHtml = '<p style="font-size:var(--font-xs); color:var(--text-muted); margin-top:8px;">No products purchased.</p>';
    if (serviceType === 'Maintenance') {
      subtotal = 500.00; // Flat maintenance base fee
    }
  }

  if (itemsContainer) itemsContainer.innerHTML = itemsHtml;
  calculatedTotal = subtotal;
  if (totalEl) totalEl.textContent = formatCurrency(calculatedTotal);
}

document.addEventListener('DOMContentLoaded', () => {
  // Auth guard
  const payload = requireAuth();
  if (!payload) return;

  loadCart();

  // Wizard Elements
  const prevBtn = document.getElementById('wizard-prev-btn');
  const nextBtn = document.getElementById('wizard-next-btn');

  // Step 1: Service Type selection
  const serviceRadios = document.getElementsByName('service_type');
  serviceRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      serviceType = e.target.value;
      
      // Auto-set default date limit (restrict picking past dates)
      const datePicker = document.getElementById('booking-date-picker');
      if (datePicker) {
        const today = new Date();
        today.setDate(today.getDate() + 1); // must book at least 1 day in advance
        const yyyy = today.getFullYear();
        const mm = String(today.getMonth() + 1).padStart(2, '0');
        const dd = String(today.getDate()).padStart(2, '0');
        datePicker.min = `${yyyy}-${mm}-${dd}`;
      }
    });
  });

  // Check if session storage preselected a type (e.g. from AI plant-advisor / booking-assistant)
  const preSelectedType = sessionStorage.getItem('gb_preselect_service');
  if (preSelectedType) {
    serviceType = preSelectedType;
    const radioEl = document.querySelector(`input[name="service_type"][value="${preSelectedType}"]`);
    if (radioEl) radioEl.checked = true;
    sessionStorage.removeItem('gb_preselect_service');
  }

  // Next / Prev button triggers
  if (prevBtn) {
    prevBtn.onclick = () => {
      if (currentStep > 1) {
        currentStep--;
        updateWizardUI();
      }
    };
  }

  if (nextBtn) {
    nextBtn.onclick = async () => {
      if (currentStep === 1) {
        // Step 1 Validation
        currentStep = 2;
        renderStep2Products();
        updateWizardUI();
      } else if (currentStep === 2) {
        // Step 2 Validation: If Setup order, must have items
        if (serviceType === 'Setup' && cartItems.length === 0) {
          showToast('Please select at least one product for a garden setup order.', 'warning');
          return;
        }
        currentStep = 3;
        updateWizardUI();
      } else if (currentStep === 3) {
        // Step 3 Validation: Date and Notes
        const datePicker = document.getElementById('booking-date-picker');
        const notesText = document.getElementById('booking-notes');
        
        if (!datePicker || !datePicker.value) {
          showToast('Please select a service scheduled date.', 'warning');
          return;
        }

        scheduledDate = datePicker.value;
        notes = notesText ? notesText.value.trim() : '';

        currentStep = 4;
        renderStep4Summary();
        updateWizardUI();
      } else if (currentStep === 4) {
        // Step 4 Submit: Final confirmation
        const paymentRadio = document.querySelector('input[name="payment_method"]:checked');
        paymentMethod = paymentRadio ? paymentRadio.value : 'UPI';

        setButtonLoading(nextBtn, true, 'Booking Garden...');

        try {
          const payload = {
            order_type: serviceType,
            scheduled_date: scheduledDate,
            notes: notes,
            payment_method: paymentMethod,
            items: cartItems.map(item => ({
              product_id: item.product_id,
              quantity: item.quantity
            }))
          };

          const res = await createOrder(payload);
          if (res.success && res.data) {
            // Empty Cart
            sessionStorage.removeItem('gb_cart');
            cartItems = [];

            // Open Success Modal
            const successModal = document.getElementById('booking-success-modal');
            const bookingIdText = document.getElementById('success-booking-id');
            const bookingTotalText = document.getElementById('success-booking-total');

            if (bookingIdText) bookingIdText.textContent = `#${res.data.order_id}`;
            if (bookingTotalText) bookingTotalText.textContent = formatCurrency(res.data.total_amount);

            if (successModal) {
              successModal.classList.add('open');
            }

            showToast('Garden order placed successfully!', 'success');

            // Modal Button
            const closeBtn = document.getElementById('success-modal-close-btn');
            if (closeBtn) {
              closeBtn.onclick = () => {
                successModal.classList.remove('open');
                window.location.href = 'dashboard.html';
              };
            }
          }
        } catch (err) {
          showToast(err.message || 'Failed to place booking order.', 'error');
        } finally {
          setButtonLoading(nextBtn, false);
        }
      }
    };
  }

  // Pre-load Date constraints on start
  const defaultRadio = document.querySelector('input[name="service_type"]:checked');
  if (defaultRadio) {
    serviceType = defaultRadio.value;
  }
  const datePicker = document.getElementById('booking-date-picker');
  if (datePicker) {
    const today = new Date();
    today.setDate(today.getDate() + 1);
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    datePicker.min = `${yyyy}-${mm}-${dd}`;
  }

  updateWizardUI();
});
