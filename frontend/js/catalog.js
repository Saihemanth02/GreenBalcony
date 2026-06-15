// GreenBalcony — Catalog & Cart Manager
import { getProducts, getCategories } from './api.js';

// Local State for Cart
let cart = [];

function loadCartFromStorage() {
  const stored = sessionStorage.getItem('gb_cart');
  if (stored) {
    try {
      cart = JSON.parse(stored);
    } catch (e) {
      cart = [];
    }
  }
}

function saveCartToStorage() {
  sessionStorage.setItem('gb_cart', JSON.stringify(cart));
}

// Render Cart Drawer Contents
function renderCart() {
  const cartList = document.getElementById('cart-items-list');
  const cartSubtotalEl = document.getElementById('cart-subtotal');
  const cartCountEl = document.getElementById('cart-badge-count');
  
  if (!cartList || !cartSubtotalEl) return;

  if (cart.length === 0) {
    cartList.innerHTML = `
      <div style="text-align:center; padding:32px 16px; color:var(--text-muted);">
        <span style="font-size:32px;">🛒</span>
        <p style="margin-top:8px; font-size:var(--font-sm);">Your cart is empty.</p>
      </div>
    `;
    cartSubtotalEl.textContent = formatCurrency(0);
    if (cartCountEl) cartCountEl.style.display = 'none';
    return;
  }

  let subtotal = 0;
  let count = 0;

  cartList.innerHTML = cart.map(item => {
    const itemSubtotal = parseFloat(item.price) * item.quantity;
    subtotal += itemSubtotal;
    count += item.quantity;

    return `
      <div style="display:flex; justify-content:space-between; align-items:center; border-bottom:1px solid var(--border-subtle); padding:12px 0;">
        <div style="flex:1; padding-right:12px;">
          <div style="font-size:var(--font-sm); font-weight:600; color:var(--text-primary);">${item.product_name}</div>
          <div style="font-size:var(--font-xs); color:var(--accent); margin-top:2px;">${formatCurrency(item.price)} each</div>
        </div>
        <div style="display:flex; align-items:center; gap:8px;">
          <button class="btn btn-ghost cart-qty-btn" data-id="${item.product_id}" data-action="dec" style="min-height:28px; width:28px; padding:0; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">-</button>
          <span style="font-size:var(--font-sm); font-weight:600; min-width:16px; text-align:center;">${item.quantity}</span>
          <button class="btn btn-ghost cart-qty-btn" data-id="${item.product_id}" data-action="inc" style="min-height:28px; width:28px; padding:0; border-radius:var(--radius-sm); border:1px solid var(--border-subtle);">+</button>
          <button class="btn btn-danger cart-remove-btn" data-id="${item.product_id}" style="min-height:28px; width:28px; padding:0; border-radius:var(--radius-sm); margin-left:8px;">&times;</button>
        </div>
      </div>
    `;
  }).join('');

  cartSubtotalEl.textContent = formatCurrency(subtotal);
  
  if (cartCountEl) {
    cartCountEl.textContent = count;
    cartCountEl.style.display = count > 0 ? 'inline-block' : 'none';
  }

  // Attach event listeners to cart controls
  document.querySelectorAll('.cart-qty-btn').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.dataset.id);
      const action = btn.dataset.action;
      updateCartItemQuantity(id, action);
    };
  });

  document.querySelectorAll('.cart-remove-btn').forEach(btn => {
    btn.onclick = () => {
      const id = parseInt(btn.dataset.id);
      removeFromCart(id);
    };
  });
}

function updateCartItemQuantity(id, action) {
  const index = cart.findIndex(item => item.product_id === id);
  if (index === -1) return;

  if (action === 'inc') {
    // Check stock limit if possible (we can enforce a default threshold or keep it simple)
    if (cart[index].quantity >= cart[index].max_qty) {
      showToast(`Out of stock! Maximum available is ${cart[index].max_qty}.`, 'warning');
      return;
    }
    cart[index].quantity += 1;
  } else if (action === 'dec') {
    if (cart[index].quantity > 1) {
      cart[index].quantity -= 1;
    } else {
      cart.splice(index, 1);
    }
  }
  
  saveCartToStorage();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter(item => item.product_id !== id);
  saveCartToStorage();
  renderCart();
  showToast('Item removed from cart.', 'info');
}

function addToCart(product) {
  const existingIndex = cart.findIndex(item => item.product_id === product.product_id);
  
  if (existingIndex !== -1) {
    if (cart[existingIndex].quantity >= product.quantity) {
      showToast(`Cannot add more. Only ${product.quantity} in stock.`, 'warning');
      return;
    }
    cart[existingIndex].quantity += 1;
  } else {
    if (product.quantity < 1) {
      showToast('This item is currently out of stock.', 'warning');
      return;
    }
    cart.push({
      product_id: product.product_id,
      product_name: product.product_name,
      price: product.price,
      quantity: 1,
      max_qty: product.quantity
    });
  }

  saveCartToStorage();
  renderCart();
  showToast(`${product.product_name} added to cart!`, 'success');

  // Open cart drawer on add
  const cartDrawer = document.getElementById('cart-sidebar');
  if (cartDrawer) {
    cartDrawer.classList.add('open');
  }
}

document.addEventListener('DOMContentLoaded', async () => {
  // Guard page
  const payload = requireAuth();
  if (!payload) return;

  loadCartFromStorage();
  renderCart();

  const productsContainer = document.getElementById('catalog-products-grid');
  const categoryTabsContainer = document.getElementById('category-filter-tabs');

  // Toggle Cart Drawer
  const cartToggleBtn = document.getElementById('cart-toggle-btn');
  const cartCloseBtn = document.getElementById('cart-sidebar-close');
  const cartDrawer = document.getElementById('cart-sidebar');

  if (cartToggleBtn && cartDrawer) {
    cartToggleBtn.onclick = () => cartDrawer.classList.toggle('open');
  }
  if (cartCloseBtn && cartDrawer) {
    cartCloseBtn.onclick = () => cartDrawer.classList.remove('open');
  }

  // Clear Cart trigger
  const clearCartBtn = document.getElementById('clear-cart-btn');
  if (clearCartBtn) {
    clearCartBtn.onclick = async () => {
      if (cart.length === 0) return;
      const confirm = await confirmModal('Are you sure you want to clear your cart?');
      if (confirm) {
        cart = [];
        saveCartToStorage();
        renderCart();
        showToast('Cart cleared.', 'info');
      }
    };
  }

  // Proceed to booking trigger
  const proceedBtn = document.getElementById('proceed-booking-btn');
  if (proceedBtn) {
    proceedBtn.onclick = () => {
      if (cart.length === 0) {
        showToast('Your cart is empty. Add items to proceed.', 'warning');
        return;
      }
      // Save cart state
      saveCartToStorage();
      window.location.href = 'booking.html';
    };
  }

  showLoader();

  try {
    // Fetch products and categories
    const [productsRes, categoriesRes] = await Promise.all([
      getProducts(),
      getCategories()
    ]);

    const products = productsRes.success ? productsRes.data : [];
    const categories = categoriesRes.success ? categoriesRes.data : [];

    // 1. Render Category tabs (pills)
    if (categoryTabsContainer) {
      let pillsHtml = `
        <button class="tab-btn active" data-id="all" style="border-radius:var(--radius-full); margin-right:4px;">
          All
        </button>
      `;

      categories.forEach(cat => {
        pillsHtml += `
          <button class="tab-btn" data-id="${cat.category_id}" style="border-radius:var(--radius-full); margin-right:4px;">
            ${cat.category_name}
          </button>
        `;
      });

      categoryTabsContainer.innerHTML = pillsHtml;

      // Click event for category filters
      document.querySelectorAll('#category-filter-tabs .tab-btn').forEach(btn => {
        btn.onclick = () => {
          document.querySelectorAll('#category-filter-tabs .tab-btn').forEach(b => b.classList.remove('active'));
          btn.classList.add('active');
          const catId = btn.dataset.id;
          filterAndRenderProducts(catId);
        };
      });
    }

    // Render Product helper
    function renderProductGrid(productList) {
      if (!productsContainer) return;

      if (productList.length === 0) {
        renderEmptyState(productsContainer, 'No products found in this category.', '🌱');
        return;
      }

      productsContainer.innerHTML = productList.map(prod => {
        const isOutOfStock = prod.quantity < 1;
        const stockStatusText = isOutOfStock 
          ? '<span class="badge badge-error" style="margin-bottom:8px;">Out of Stock</span>' 
          : `<span class="badge badge-success" style="margin-bottom:8px;">${prod.quantity} In Stock</span>`;

        return `
          <div class="card" style="display:flex; flex-direction:column; justify-content:space-between; height:100%; min-height:380px; padding:16px;">
            <div style="position:relative;">
              <img src="${prod.image_url || 'https://images.unsplash.com/photo-1463936575829-25148e1db1b8?auto=format&fit=crop&q=80&w=300'}" 
                   alt="${prod.product_name}" 
                   style="width:100%; height:180px; object-fit:cover; border-radius:var(--radius-md); background:#222; margin-bottom:12px;">
              <span class="badge badge-info" style="position:absolute; top:8px; right:8px;">${prod.category_name}</span>
            </div>
            <div>
              <h3 style="font-size:var(--font-md); font-weight:600; margin-bottom:4px; color:var(--text-primary);">${prod.product_name}</h3>
              <p style="font-size:var(--font-xs); color:var(--text-secondary); margin-bottom:8px; line-clamp:2; display:-webkit-box; -webkit-line-clamp:2; -webkit-box-orient:vertical; overflow:hidden;">
                ${prod.description || 'No description available.'}
              </p>
            </div>
            <div style="margin-top:auto; display:flex; flex-direction:column;">
              <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:12px;">
                <span style="font-size:var(--font-md); font-weight:700; color:var(--accent);">${formatCurrency(prod.price)}</span>
                ${stockStatusText}
              </div>
              <button class="btn btn-primary btn-block add-to-cart-btn" 
                      data-id="${prod.product_id}" 
                      ${isOutOfStock ? 'disabled' : ''} 
                      style="background-color: var(--accent); color: #000;">
                ${isOutOfStock ? 'Sold Out' : '🛒 Add to Cart'}
              </button>
            </div>
          </div>
        `;
      }).join('');

      // Add trigger handlers to catalog items
      document.querySelectorAll('.add-to-cart-btn').forEach(btn => {
        btn.onclick = () => {
          const id = parseInt(btn.dataset.id);
          const product = products.find(p => p.product_id === id);
          if (product) addToCart(product);
        };
      });
    }

    // Filter Logic
    function filterAndRenderProducts(catId) {
      if (catId === 'all') {
        renderProductGrid(products);
      } else {
        const filtered = products.filter(p => p.category_id === parseInt(catId));
        renderProductGrid(filtered);
      }
    }

    // Initialize with all products
    renderProductGrid(products);

  } catch (err) {
    console.error('Catalog load failure:', err);
    showToast('Failed to load products. Please reload.', 'error');
  } finally {
    hideLoader();
  }
});
