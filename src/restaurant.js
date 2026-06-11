// ==========================================
// RESTAURANT MODULE
// IDs used: restaurant-guest-select, cart-items,
//           cart-total-price, place-order-btn,
//           menu-categories-container, menu-items-grid,
//           orders-list-tbody
// ==========================================
import { db } from './db.js';
import { showToast } from './utils.js';

// In-memory cart: { [menuItemId]: { item, qty } }
let _cart = {};

export function initRestaurantModule() {
  // Category filter buttons (already in HTML, just wire them up)
  const catContainer = document.getElementById('menu-categories-container');
  if (catContainer) {
    catContainer.addEventListener('click', e => {
      const btn = e.target.closest('.cat-btn');
      if (!btn) return;
      catContainer.querySelectorAll('.cat-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMenuGrid(btn.getAttribute('data-category'));
    });
  }

  // Place order button
  const placeBtn = document.getElementById('place-order-btn');
  if (placeBtn) placeBtn.addEventListener('click', _placeOrder);
}

// Update the active-guest dropdown in the restaurant tab
export function updateActiveGuestSelectors() {
  _populateSelector('restaurant-guest-select');
  _populateSelector('laundry-guest-select');
}

function _populateSelector(id) {
  const sel = document.getElementById(id);
  if (!sel) return;
  const prev = sel.value;
  sel.innerHTML = '<option value="">-- Choose Checked-In Room --</option>';
  db.getActiveGuests().forEach(g => {
    const opt = document.createElement('option');
    opt.value = g.roomNumber;
    opt.innerText = `Room ${g.roomNumber} — ${g.name}`;
    sel.appendChild(opt);
  });
  sel.value = prev;
}

// Render menu cards
export function renderMenuGrid(category = 'all') {
  const grid = document.getElementById('menu-items-grid');
  if (!grid) return;

  grid.innerHTML = '';
  db.getMenuItems(category).forEach(item => {
    const inCart = _cart[item.id];
    const card = document.createElement('div');
    card.className = 'menu-item-card glass-panel';
    card.innerHTML = `
      <div class="menu-item-emoji">${item.emoji || '🍽'}</div>
      <div class="menu-item-info">
        <h4>${item.name}</h4>
        <span class="menu-category-tag">${item.category}</span>
      </div>
      <div class="menu-item-footer">
        <span class="menu-item-price">₹${item.price}</span>
        <div class="menu-item-controls">
          ${inCart
            ? `<button class="qty-btn minus-btn" data-id="${item.id}">−</button>
               <span class="qty-count">${inCart.qty}</span>
               <button class="qty-btn plus-btn" data-id="${item.id}">+</button>`
            : `<button class="add-to-cart-btn" data-id="${item.id}">Add</button>`
          }
        </div>
      </div>
    `;
    // Wire cart buttons
    card.querySelector('.add-to-cart-btn')?.addEventListener('click', () => _addToCart(item.id));
    card.querySelector('.plus-btn')?.addEventListener('click', () => _adjustCart(item.id, 1));
    card.querySelector('.minus-btn')?.addEventListener('click', () => _adjustCart(item.id, -1));
    grid.appendChild(card);
  });
}

function _addToCart(itemId) {
  const item = db.getMenuItemById(itemId);
  if (!item) return;
  _cart[itemId] = { item, qty: (_cart[itemId]?.qty ?? 0) + 1 };
  _refreshCart();
  // Re-render the current category
  const activeBtn = document.querySelector('#menu-categories-container .cat-btn.active');
  renderMenuGrid(activeBtn ? activeBtn.getAttribute('data-category') : 'all');
}

function _adjustCart(itemId, delta) {
  if (!_cart[itemId]) return;
  _cart[itemId].qty += delta;
  if (_cart[itemId].qty <= 0) delete _cart[itemId];
  _refreshCart();
  const activeBtn = document.querySelector('#menu-categories-container .cat-btn.active');
  renderMenuGrid(activeBtn ? activeBtn.getAttribute('data-category') : 'all');
}

function _refreshCart() {
  const container = document.getElementById('cart-items');
  const totalEl   = document.getElementById('cart-total-price');
  const placeBtn  = document.getElementById('place-order-btn');
  if (!container) return;

  const entries = Object.values(_cart);

  if (!entries.length) {
    container.innerHTML = `
      <div class="empty-cart-message">
        <i data-lucide="utensils"></i>
        <p>Select items from the menu to add to cart.</p>
      </div>`;
    if (totalEl) totalEl.innerText = '₹0';
    if (placeBtn) placeBtn.disabled = true;
    if (window.lucide) window.lucide.createIcons();
    return;
  }

  const total = entries.reduce((s, e) => s + e.item.price * e.qty, 0);

  container.innerHTML = entries.map(({ item, qty }) => `
    <div class="cart-item-row">
      <span class="cart-item-name">${item.emoji} ${item.name}</span>
      <span class="cart-item-qty">×${qty}</span>
      <span class="cart-item-sub">₹${(item.price * qty).toLocaleString()}</span>
    </div>
  `).join('');

  if (totalEl) totalEl.innerText = `₹${total.toLocaleString()}`;
  if (placeBtn) placeBtn.disabled = false;
}

function _placeOrder() {
  const roomNumber = document.getElementById('restaurant-guest-select')?.value;
  if (!roomNumber) {
    showToast('Please select a guest room first.', 'error');
    return;
  }

  const guest = db.getActiveGuests().find(g => g.roomNumber === roomNumber);
  if (!guest) {
    showToast('No active guest in that room.', 'error');
    return;
  }

  const entries = Object.values(_cart);
  if (!entries.length) {
    showToast('Cart is empty.', 'error');
    return;
  }

  entries.forEach(({ item, qty }) => {
    db.addOrder({
      guestId:   guest.id,
      roomNumber,
      itemName:  item.name,
      price:     item.price,
      quantity:  qty,
      amount:    item.price * qty
    });
  });

  const itemCount = entries.reduce((s, e) => s + e.qty, 0);
  showToast(`✓ Order sent to Room ${roomNumber} (${itemCount} items)`, 'success');

  _cart = {};
  _refreshCart();
  renderMenuGrid('all');
  document.querySelector('#menu-categories-container .cat-btn.active')?.classList.remove('active');
  document.querySelector('#menu-categories-container .cat-btn')?.classList.add('active');
  window.dispatchEvent(new Event('dbChange'));
}

// Render order history table
export function renderOrdersHistory() {
  const tbody = document.getElementById('orders-list-tbody');
  if (!tbody) return;

  const orders = db.getOrders();
  if (!orders.length) {
    tbody.innerHTML = `<tr><td colspan="8" class="text-center empty-state">No dining orders yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  orders.slice().reverse().forEach((order, i) => {
    const guest = db.getGuests().find(g => g.id === order.guestId);
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td><code>#${String(orders.length - i).padStart(3, '0')}</code></td>
      <td>Room ${order.roomNumber}</td>
      <td>${guest ? guest.name : '—'}</td>
      <td>${order.itemName}</td>
      <td>${order.quantity}</td>
      <td>₹${order.price}</td>
      <td>₹${order.amount.toLocaleString()}</td>
      <td>${new Date(order.timestamp).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</td>
    `;
    tbody.appendChild(tr);
  });
}
