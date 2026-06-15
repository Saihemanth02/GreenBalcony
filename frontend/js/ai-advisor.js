// GreenBalcony — GreenBot AI Advisor Interface
import { 
  getPlantAdvisorRecommendation, 
  getSmartBookingSuggestion, 
  getGardenChatReply, 
  getMyProfile 
} from './api.js';

// Chat state (session-based)
let chatHistory = [];
let existingPlantsList = [];

// Helper to switch advisor tabs
function switchAdvisorTab(tabId) {
  document.querySelectorAll('.tab-btn').forEach(btn => {
    if (btn.dataset.tab === tabId) btn.classList.add('active');
    else btn.classList.remove('active');
  });

  document.querySelectorAll('.tab-content').forEach(content => {
    if (content.id === `tab-${tabId}`) content.classList.add('active');
    else content.classList.remove('active');
  });
}

// ---------------- TAB 1: Plant Care Advisor ----------------
async function handlePlantAdvisorSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('advisor-submit-btn');
  const size = document.getElementById('advisor-size').value;
  const sunlight = document.getElementById('advisor-sunlight').value;
  const city = document.getElementById('advisor-city').value.trim();
  const preferences = document.getElementById('advisor-preferences').value.trim();
  const budget = parseFloat(document.getElementById('advisor-budget').value);

  const loaderEl = document.getElementById('advisor-loading-state');
  const resultCard = document.getElementById('advisor-result-card');

  if (!size || !sunlight || !city || isNaN(budget)) {
    showToast('Please fill out all required fields.', 'warning');
    return;
  }

  // Hide old results, show loader
  if (resultCard) resultCard.style.display = 'none';
  if (loaderEl) loaderEl.style.display = 'flex';
  setButtonLoading(submitBtn, true, 'Consulting...');

  try {
    const res = await getPlantAdvisorRecommendation({
      balcony_size: size,
      sunlight,
      city,
      preferences,
      budget
    });

    if (res.success && res.data) {
      const data = res.data;
      renderPlantAdvisorResult(data);
    }
  } catch (err) {
    handleAiError(err);
  } finally {
    if (loaderEl) loaderEl.style.display = 'none';
    setButtonLoading(submitBtn, false);
  }
}

function renderPlantAdvisorResult(data) {
  const resultCard = document.getElementById('advisor-result-card');
  if (!resultCard) return;

  // Render plants grid
  const grid = document.getElementById('advisor-plants-grid');
  if (grid) {
    grid.innerHTML = data.recommended_plants.map(plant => `
      <div style="background:var(--bg-elevated); padding:16px; border-radius:var(--radius-md); border-left:4px solid var(--accent);">
        <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px;">
          <h4 style="font-size:var(--font-sm); font-weight:600; color:var(--text-primary);">${plant.name}</h4>
          <span class="badge badge-info" style="font-size:10px;">${plant.care_level}</span>
        </div>
        <p style="font-size:var(--font-xs); color:var(--text-secondary); margin-bottom:8px;">${plant.reason}</p>
        <div style="font-size:var(--font-xs); font-weight:700; color:var(--accent);">Est: ${formatCurrency(plant.price_estimate)}</div>
      </div>
    `).join('');
  }

  // Render package badge
  const pkgBadge = document.getElementById('advisor-package-badge');
  if (pkgBadge) {
    pkgBadge.textContent = `${data.suggested_package} Package`;
  }

  // Render tips
  const tipsList = document.getElementById('advisor-tips-list');
  if (tipsList) {
    tipsList.innerHTML = data.care_tips.map(tip => `
      <li style="font-size:var(--font-sm); color:var(--text-secondary); display:flex; align-items:center; gap:8px;">
        <span>🌿</span> ${tip}
      </li>
    `).join('');
  }

  // Warnings banner
  const warnBanner = document.getElementById('advisor-warn-banner');
  if (warnBanner) {
    if (data.warnings && data.warnings.length > 0) {
      warnBanner.innerHTML = `<strong>⚠️ Advisory Warning:</strong> ${data.warnings.join(', ')}`;
      warnBanner.style.display = 'block';
    } else {
      warnBanner.style.display = 'none';
    }
  }

  // Price Total & Note
  const totalEl = document.getElementById('advisor-total-estimate');
  const noteEl = document.getElementById('advisor-confidence-note');

  if (totalEl) totalEl.textContent = formatCurrency(data.estimated_total);
  if (noteEl) noteEl.textContent = data.confidence_note;

  // Pre-fill button binding
  const bookBtn = document.getElementById('advisor-book-plan-btn');
  if (bookBtn) {
    bookBtn.onclick = () => {
      // Map recommended plants into cart
      const mockCart = data.recommended_plants.map(p => {
        // Find if this is one of our catalog products, or map a mock product_id (tulsi=3, moneyplant=2, aloe=1, terracotta=4, hanging=5, vermi=7, neem=8)
        let resolvedId = 1;
        const nameLower = p.name.toLowerCase();
        
        if (nameLower.includes('tulsi')) resolvedId = 3;
        else if (nameLower.includes('money')) resolvedId = 2;
        else if (nameLower.includes('aloe')) resolvedId = 1;
        else if (nameLower.includes('pot') || nameLower.includes('terracotta')) resolvedId = 4;
        else if (nameLower.includes('hanging') || nameLower.includes('basket')) resolvedId = 5;
        else if (nameLower.includes('vermicompost')) resolvedId = 7;
        else if (nameLower.includes('neem')) resolvedId = 8;
        else resolvedId = 1; // default to Aloe Vera

        return {
          product_id: resolvedId,
          product_name: p.name,
          price: p.price_estimate,
          quantity: 1,
          max_qty: 99
        };
      });

      sessionStorage.setItem('gb_cart', JSON.stringify(mockCart));
      sessionStorage.setItem('gb_preselect_service', 'Setup');
      
      showToast('Redirecting to order booking wizard...', 'success');
      setTimeout(() => {
        window.location.href = 'booking.html';
      }, 1000);
    };
  }

  // Display result
  resultCard.style.display = 'block';
}

// ---------------- TAB 2: Smart Booking Assistant ----------------
function handleBookingTagInput(e) {
  if (e.key === 'Enter') {
    e.preventDefault();
    const input = document.getElementById('booking-plants-input');
    const container = document.getElementById('booking-tags-container');
    const text = input.value.trim();

    if (!text) return;

    if (existingPlantsList.includes(text)) {
      showToast('Plant already added to existing list.', 'warning');
      input.value = '';
      return;
    }

    existingPlantsList.push(text);
    input.value = '';

    // Render Tag
    const tag = document.createElement('span');
    tag.className = 'badge badge-info';
    tag.style.margin = '4px';
    tag.style.cursor = 'pointer';
    tag.innerHTML = `${text} <span style="font-weight:700; margin-left:6px;">&times;</span>`;
    
    tag.onclick = () => {
      existingPlantsList = existingPlantsList.filter(item => item !== text);
      tag.remove();
    };

    container.appendChild(tag);
  }
}

async function handleBookingAssistantSubmit(e) {
  e.preventDefault();

  const submitBtn = document.getElementById('booking-assistant-submit-btn');
  const type = document.querySelector('input[name="assistant_service_preference"]:checked').value;
  const budget = parseFloat(document.getElementById('booking-budget').value);
  const concerns = document.getElementById('booking-concerns').value.trim();

  const date1 = document.getElementById('booking-date-1').value;
  const date2 = document.getElementById('booking-date-2').value;
  const date3 = document.getElementById('booking-date-3').value;

  const dates = [date1, date2, date3].filter(d => !!d);

  const loaderEl = document.getElementById('booking-loading-state');
  const resultCard = document.getElementById('booking-result-card');

  if (dates.length === 0 || isNaN(budget)) {
    showToast('Please enter budget and select at least one preferred date.', 'warning');
    return;
  }

  if (resultCard) resultCard.style.display = 'none';
  if (loaderEl) loaderEl.style.display = 'flex';
  setButtonLoading(submitBtn, true, 'Planning...');

  try {
    const res = await getSmartBookingSuggestion({
      service_preference: type,
      budget,
      available_dates: dates,
      existing_plants: existingPlantsList,
      concerns
    });

    if (res.success && res.data) {
      renderBookingAssistantResult(res.data);
    }
  } catch (err) {
    handleAiError(err);
  } finally {
    if (loaderEl) loaderEl.style.display = 'none';
    setButtonLoading(submitBtn, false);
  }
}

function renderBookingAssistantResult(data) {
  const resultCard = document.getElementById('booking-result-card');
  if (!resultCard) return;

  const recommendedSvc = document.getElementById('booking-rec-service');
  const suggestedProd = document.getElementById('booking-suggested-products');
  const optimalDate = document.getElementById('booking-optimal-date');
  const total = document.getElementById('booking-total-est');
  const reason = document.getElementById('booking-reason-text');
  const tip = document.getElementById('booking-tip-banner');
  const urgency = document.getElementById('booking-urgency-badge');

  if (recommendedSvc) {
    recommendedSvc.innerHTML = `
      <span class="badge badge-success">${data.recommended_service}</span>
      <span class="badge badge-info">${data.service_type}</span>
    `;
  }

  if (suggestedProd) {
    if (data.suggested_products && data.suggested_products.length > 0) {
      suggestedProd.innerHTML = data.suggested_products.map(p => `
        <div style="font-size:var(--font-sm); color:var(--text-secondary); margin-bottom:6px;">
          ☘ <strong>${p.product_name}</strong> — ${p.reason} 
          <span style="color:var(--accent); font-weight:600;">(${formatCurrency(p.estimated_price)})</span>
        </div>
      `).join('');
    } else {
      suggestedProd.innerHTML = '<div style="font-size:var(--font-xs); color:var(--text-muted);">No components needed.</div>';
    }
  }

  if (optimalDate) optimalDate.textContent = formatDate(data.optimal_date);
  if (total) total.textContent = formatCurrency(data.estimated_total);
  if (reason) reason.textContent = data.booking_reason;
  if (tip) tip.textContent = `💡 Follow-up advice: ${data.follow_up_tip}`;

  if (urgency) {
    urgency.textContent = `${data.urgency} Urgency`;
    urgency.className = `badge ${
      data.urgency === 'High' ? 'badge-error' : 
      data.urgency === 'Medium' ? 'badge-pending' : 'badge-success'
    }`;
  }

  // Action Button
  const bookBtn = document.getElementById('booking-book-now-btn');
  if (bookBtn) {
    bookBtn.onclick = () => {
      // Map suggested items
      const mockCart = (data.suggested_products || []).map(p => {
        let resolvedId = 1;
        const nameLower = p.product_name.toLowerCase();
        
        if (nameLower.includes('tulsi')) resolvedId = 3;
        else if (nameLower.includes('money')) resolvedId = 2;
        else if (nameLower.includes('aloe')) resolvedId = 1;
        else if (nameLower.includes('pot') || nameLower.includes('terracotta')) resolvedId = 4;
        else if (nameLower.includes('hanging') || nameLower.includes('basket')) resolvedId = 5;
        else if (nameLower.includes('vermicompost')) resolvedId = 7;
        else if (nameLower.includes('neem')) resolvedId = 8;

        return {
          product_id: resolvedId,
          product_name: p.product_name,
          price: p.estimated_price,
          quantity: 1,
          max_qty: 99
        };
      });

      sessionStorage.setItem('gb_cart', JSON.stringify(mockCart));
      sessionStorage.setItem('gb_preselect_service', data.recommended_service);

      showToast('Applying recommended options...', 'success');
      setTimeout(() => {
        window.location.href = 'booking.html';
      }, 1000);
    };
  }

  resultCard.style.display = 'block';
}

// ---------------- TAB 3: GreenBot Interactive Chat ----------------
function appendChatMessage(role, message) {
  const windowEl = document.getElementById('chat-messages-window');
  if (!windowEl) return;

  const bubble = document.createElement('div');
  bubble.style.display = 'flex';
  bubble.style.flexDirection = 'column';
  bubble.style.marginBottom = '16px';
  bubble.style.maxWidth = '80%';
  
  if (role === 'user') {
    bubble.style.marginLeft = 'auto';
    bubble.innerHTML = `
      <div style="background:var(--accent); color:#000; padding:12px 16px; border-radius:var(--radius-lg) var(--radius-lg) 0 var(--radius-lg); font-size:var(--font-sm); font-weight:500;">
        ${message}
      </div>
      <div style="font-size:10px; color:var(--text-muted); text-align:right; margin-top:4px;">You</div>
    `;
  } else {
    bubble.style.marginRight = 'auto';
    bubble.innerHTML = `
      <div style="background:var(--bg-surface); border:1px solid var(--border-subtle); padding:16px; border-radius:var(--radius-lg) var(--radius-lg) var(--radius-lg) 0; font-size:var(--font-sm); box-shadow:var(--shadow-card);">
        <div style="font-weight:600; color:var(--accent); margin-bottom:6px; display:flex; align-items:center; gap:6px;">🌿 GreenBot</div>
        <div style="color:var(--text-primary); white-space:pre-line;">${message}</div>
      </div>
      <div style="font-size:10px; color:var(--text-muted); margin-top:4px; margin-left:4px;">GreenBot</div>
    `;
  }

  windowEl.appendChild(bubble);
  windowEl.scrollTop = windowEl.scrollHeight;

  // Toggle Starter prompt list (hide if chat is active)
  const starters = document.getElementById('chat-starters-list');
  if (starters) starters.style.display = 'none';
}

function showChatTypingIndicator() {
  const windowEl = document.getElementById('chat-messages-window');
  if (!windowEl) return;

  const indicator = document.createElement('div');
  indicator.id = 'chat-typing-indicator';
  indicator.style.marginRight = 'auto';
  indicator.style.marginBottom = '16px';
  indicator.innerHTML = `
    <div style="background:var(--bg-surface); border:1px solid var(--border-subtle); padding:12px 16px; border-radius:var(--radius-lg) var(--radius-lg) var(--radius-lg) 0; box-shadow:var(--shadow-card);">
      <div class="typing-indicator">
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
        <span class="typing-dot"></span>
      </div>
    </div>
  `;

  windowEl.appendChild(indicator);
  windowEl.scrollTop = windowEl.scrollHeight;
}

function removeChatTypingIndicator() {
  const indicator = document.getElementById('chat-typing-indicator');
  if (indicator) indicator.remove();
}

async function sendChatMessage(question) {
  if (!question.trim()) return;

  // Append user bubble
  appendChatMessage('user', question);

  // Clear input
  const textInput = document.getElementById('chat-input-textarea');
  if (textInput) textInput.value = '';

  showChatTypingIndicator();

  try {
    const res = await getGardenChatReply({
      chatHistory,
      question
    });

    removeChatTypingIndicator();

    if (res.success && res.data) {
      const reply = res.data.reply;
      
      // Append bot bubble
      appendChatMessage('greenbot', reply);

      // Save to local history state
      chatHistory.push({ role: 'user', message: question });
      chatHistory.push({ role: 'greenbot', message: reply });
    }
  } catch (err) {
    removeChatTypingIndicator();
    handleAiError(err);
  }
}

// ---------------- AI ERROR SHIELDS ----------------
function handleAiError(err) {
  // Map rate limits, confusion, and outages
  if (err.message && err.message.includes('429')) {
    showToast('Too many requests. Please wait an hour.', 'warning');
  } else if (err.message && err.message.includes('422')) {
    showToast('GreenBot got confused. Please rephrase.', 'error');
  } else if (err.message && err.message.includes('503')) {
    showToast('GreenBot is resting. Try again in a moment.', 'error');
  } else {
    showToast('AI advisor encountered an error. Check configuration.', 'error');
  }
  console.error('AI Error Captured:', err);
}

// ---------------- BOOTSTRAP ----------------
document.addEventListener('DOMContentLoaded', async () => {
  // Auth guard
  const payload = requireAuth();
  if (!payload) return;

  // Pre-fill profile city if possible
  try {
    const profileRes = await getMyProfile();
    if (profileRes.success && profileRes.data) {
      const profile = profileRes.data;
      const cityEl = document.getElementById('advisor-city');
      if (cityEl && profile.customer_details) {
        cityEl.value = profile.customer_details.city || '';
      }
    }
  } catch (err) {
    console.error('Failed to pre-populate city:', err);
  }

  // 1. Tab Navigation Links
  document.querySelectorAll('.tabs-nav .tab-btn').forEach(btn => {
    btn.onclick = () => switchAdvisorTab(btn.dataset.tab);
  });

  // 2. Advisor Form Submit
  const advisorForm = document.getElementById('advisor-form');
  if (advisorForm) {
    advisorForm.onsubmit = handlePlantAdvisorSubmit;
  }

  // 3. Booking Assistant Tag Box & Submit
  const bookingTagInput = document.getElementById('booking-plants-input');
  if (bookingTagInput) {
    bookingTagInput.onkeydown = handleBookingTagInput;
  }

  const bookingForm = document.getElementById('booking-assistant-form');
  if (bookingForm) {
    bookingForm.onsubmit = handleBookingAssistantSubmit;
  }

  // 4. Chat interactions
  const chatSendBtn = document.getElementById('chat-send-btn');
  const chatInput = document.getElementById('chat-input-textarea');
  const clearChatBtn = document.getElementById('chat-clear-btn');

  if (chatSendBtn && chatInput) {
    chatSendBtn.onclick = () => {
      sendChatMessage(chatInput.value);
    };
    
    // Send on Ctrl+Enter
    chatInput.onkeydown = (e) => {
      if (e.key === 'Enter' && e.ctrlKey) {
        e.preventDefault();
        sendChatMessage(chatInput.value);
      }
    };
  }

  // Clickable starters prompt chips
  document.querySelectorAll('.chat-prompt-chip').forEach(chip => {
    chip.onclick = () => {
      sendChatMessage(chip.textContent.trim());
    };
  });

  // Clear Chat Trigger
  if (clearChatBtn) {
    clearChatBtn.onclick = async () => {
      if (chatHistory.length === 0) return;
      const confirm = await confirmModal('Reset chat history and clear chat logs?');
      if (confirm) {
        chatHistory = [];
        const windowEl = document.getElementById('chat-messages-window');
        if (windowEl) windowEl.innerHTML = '';
        const starters = document.getElementById('chat-starters-list');
        if (starters) starters.style.display = 'flex';
        showToast('Chat history cleared.', 'info');
      }
    };
  }

  switchAdvisorTab('plants');
});
