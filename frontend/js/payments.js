// GreenBalcony — Payments & Invoicing Handler
import { getPayments, getOrderById } from './api.js';

let allPayments = [];

// Helper to render the Invoice Modal
async function openInvoiceModal(orderId) {
  showLoader();
  try {
    const res = await getOrderById(orderId);
    if (res.success && res.data) {
      const order = res.data;
      
      const modal = document.getElementById('invoice-modal');
      const invoiceNumber = document.getElementById('invoice-number');
      const invoiceDate = document.getElementById('invoice-date');
      const invoiceType = document.getElementById('invoice-order-type');
      const customerName = document.getElementById('invoice-cust-name');
      const customerAddress = document.getElementById('invoice-cust-addr');
      
      const itemsList = document.getElementById('invoice-items-list');
      const totalAmountEl = document.getElementById('invoice-total-amount');
      const payMethod = document.getElementById('invoice-pay-method');
      const payStatus = document.getElementById('invoice-pay-status');
      const txnId = document.getElementById('invoice-txn-id');

      // Populate header
      if (invoiceNumber) invoiceNumber.textContent = `#GB-ORD-${order.order_id}`;
      if (invoiceDate) invoiceDate.textContent = formatDate(order.booking_date);
      if (invoiceType) invoiceType.textContent = order.order_type;
      if (customerName) customerName.textContent = order.customer_name;
      if (customerAddress) customerAddress.textContent = `${order.address}, ${order.city} - ${order.pincode}`;

      // Populate items
      let html = '';
      let subtotal = 0;
      
      if (order.items && order.items.length > 0) {
        order.items.forEach(item => {
          const sub = parseFloat(item.unit_price) * item.quantity;
          subtotal += sub;
          html += `
            <tr>
              <td>${item.product_name}</td>
              <td>${item.quantity}</td>
              <td>${formatCurrency(item.unit_price)}</td>
              <td style="text-align:right;">${formatCurrency(sub)}</td>
            </tr>
          `;
        });
      } else {
        // Flat maintenance fee
        subtotal = 500.00;
        html += `
          <tr>
            <td>Balcony Garden Maintenance Base Service Fee</td>
            <td>1</td>
            <td>${formatCurrency(500.00)}</td>
            <td style="text-align:right;">${formatCurrency(500.00)}</td>
          </tr>
        `;
      }

      if (itemsList) itemsList.innerHTML = html;
      if (totalAmountEl) totalAmountEl.textContent = formatCurrency(order.total_amount || subtotal);

      // Populate payment metadata
      if (order.payment) {
        if (payMethod) payMethod.textContent = order.payment.payment_method;
        if (payStatus) {
          payStatus.textContent = order.payment.payment_status;
          payStatus.className = `badge ${
            order.payment.payment_status === 'Paid' ? 'badge-success' : 
            order.payment.payment_status === 'Pending' ? 'badge-pending' : 'badge-error'
          }`;
        }
        if (txnId) txnId.textContent = order.payment.transaction_id || 'N/A';
      } else {
        if (payMethod) payMethod.textContent = 'UPI';
        if (payStatus) {
          payStatus.textContent = 'Unpaid';
          payStatus.className = 'badge badge-error';
        }
        if (txnId) txnId.textContent = 'N/A';
      }

      // Open Modal
      if (modal) {
        modal.classList.add('open');
      }
    }
  } catch (err) {
    showToast('Failed to load invoice details.', 'error');
    console.error(err);
  } finally {
    hideLoader();
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Auth guard
  const payload = requireAuth();
  if (!payload) return;

  const paymentsBody = document.getElementById('payments-table-body');
  const modal = document.getElementById('invoice-modal');
  const modalClose = document.getElementById('invoice-modal-close');
  const printBtn = document.getElementById('invoice-print-btn');

  // Close modal click
  if (modalClose && modal) {
    modalClose.onclick = () => modal.classList.remove('open');
  }

  // Print trigger
  if (printBtn) {
    printBtn.onclick = () => {
      window.print();
    };
  }

  showLoader();

  try {
    const res = await getPayments();
    if (res.success && res.data) {
      allPayments = res.data;

      if (allPayments.length === 0) {
        if (paymentsBody) {
          paymentsBody.innerHTML = `
            <tr>
              <td colspan="6" style="text-align:center; padding:32px; color:var(--text-muted);">
                No payment history available. Place a booking to see invoices.
              </td>
            </tr>
          `;
        }
      } else {
        if (paymentsBody) {
          paymentsBody.innerHTML = allPayments.map(pay => {
            let badgeClass = 'badge-pending';
            if (pay.payment_status === 'Paid') badgeClass = 'badge-success';
            else if (pay.payment_status === 'Failed' || pay.payment_status === 'Refunded') badgeClass = 'badge-error';

            return `
              <tr style="cursor:pointer;" class="payment-row" data-order-id="${pay.order_id}">
                <td>#${pay.order_id}</td>
                <td><strong>${pay.order_type}</strong></td>
                <td>${formatCurrency(pay.amount)}</td>
                <td><span style="font-family:monospace;">${pay.payment_method}</span></td>
                <td><span class="badge ${badgeClass}">${pay.payment_status}</span></td>
                <td>${formatDate(pay.payment_date || pay.created_at)}</td>
              </tr>
            `;
          }).join('');

          // Click handler to open Invoice modal
          document.querySelectorAll('.payment-row').forEach(row => {
            row.onclick = () => {
              const orderId = parseInt(row.dataset.orderId);
              openInvoiceModal(orderId);
            };
          });
        }
      }

      // Check URL search parameters (dashboard click redirect)
      const urlParams = new URLSearchParams(window.location.search);
      const queryOrderId = urlParams.get('order_id');
      if (queryOrderId) {
        openInvoiceModal(parseInt(queryOrderId));
      }
    }
  } catch (err) {
    console.error('Payments load failure:', err);
    showToast('Failed to load payment records.', 'error');
  } finally {
    hideLoader();
  }
});
