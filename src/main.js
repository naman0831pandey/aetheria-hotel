import { db, initDB } from './db.js';
import { showToast } from './utils.js';
import { renderDashboard } from './dashboard.js';
import { initBookingModule, renderRoomsGrid, renderGuestsTable } from './booking.js';
import { initRestaurantModule, updateActiveGuestSelectors, renderMenuGrid, renderOrdersHistory } from './restaurant.js';
import { initLaundryModule, renderLaundryLedger } from './laundry.js';

// Re-export so legacy callers still work (not needed after refactor, but kept for safety)
export { showToast };

// Init DB
initDB();

// Global App State
const state = {
  activeTab: 'dashboard',
  currentInvoiceGuest: null
};

// Document Loaded Handler
document.addEventListener('DOMContentLoaded', () => {
  if (window.lucide) window.lucide.createIcons();

  setupNavigation();
  window.addEventListener('dbChange', handleDataChange);

  initBookingModule();
  initRestaurantModule();
  initLaundryModule();
  initBillingModule();

  startClock();

  const resetBtn = document.getElementById('reset-db-btn');
  if (resetBtn) {
    resetBtn.addEventListener('click', () => {
      if (confirm('Reset the database to factory settings? All data will be cleared.')) {
        db.reset();
        showToast('Database reset. Reloading…', 'success');
        setTimeout(() => window.location.reload(), 1000);
      }
    });
  }

  handleDataChange();
});

// SPA navigation
function setupNavigation() {
  const navItems = document.querySelectorAll('.nav-item');
  const panels   = document.querySelectorAll('.tab-panel');

  navItems.forEach(item => {
    item.addEventListener('click', () => {
      const targetTab = item.getAttribute('data-tab');

      navItems.forEach(b => b.classList.remove('active'));
      item.classList.add('active');

      const headers = {
        dashboard:  { title: 'Executive Operations',      desc: 'Operational metrics and real-time overview of the property.' },
        bookings:   { title: 'Bookings & Rooms Directory', desc: 'Manage guest check-ins, room allocations, and view room statuses.' },
        restaurant: { title: 'In-Room Dining',             desc: 'Place food and beverage orders directly onto guest rooms.' },
        laundry:    { title: 'Valet Laundry Service',      desc: 'Record laundry requests and calculate service charges.' },
        billing:    { title: 'Checkout Ledger & Billing',  desc: 'Review itemized guest expenses, print receipts, and check out guests.' }
      };

      const h = headers[targetTab];
      if (h) {
        document.getElementById('page-title').innerText    = h.title;
        document.getElementById('page-subtitle').innerText = h.desc;
      }

      panels.forEach(panel => {
        panel.classList.remove('active');
        if (panel.id === targetTab) panel.classList.add('active');
      });

      state.activeTab = targetTab;

      if (targetTab === 'restaurant') renderMenuGrid('all');
    });
  });
}

// Global reactivity — re-render all tabs on any data change
function handleDataChange() {
  updateActiveGuestSelectors();
  updateCheckoutSelectors();

  renderDashboard();
  renderRoomsGrid();
  renderGuestsTable();
  renderOrdersHistory();
  renderLaundryLedger();

  if (window.lucide) window.lucide.createIcons();

  // Re-draw invoice if a guest is selected
  const checkoutSelect = document.getElementById('checkout-guest-select');
  if (checkoutSelect?.value) renderInvoice(checkoutSelect.value);
}

// Live clock
function startClock() {
  const el = document.getElementById('current-time');
  if (!el) return;
  const update = () => {
    el.innerText = new Date().toLocaleString(undefined, {
      weekday: 'short', month: 'short', day: 'numeric',
      hour: '2-digit', minute: '2-digit', second: '2-digit'
    });
  };
  update();
  setInterval(update, 1000);
}

/* ==========================================
   BILLING & CHECKOUT SUB-MODULE
   ========================================== */
function initBillingModule() {
  const checkoutSelect     = document.getElementById('checkout-guest-select');
  const completeCheckoutBtn = document.getElementById('complete-checkout-btn');
  const printInvoiceBtn    = document.getElementById('print-invoice-btn');

  if (checkoutSelect) {
    checkoutSelect.addEventListener('change', e => {
      const guestId = e.target.value;
      if (!guestId) {
        document.getElementById('invoice-empty').style.display   = 'flex';
        document.getElementById('invoice-bill').style.display    = 'none';
        document.getElementById('checkout-quick-totals').style.display = 'none';
        document.getElementById('checkout-actions').style.display = 'none';
        state.currentInvoiceGuest = null;
      } else {
        renderInvoice(guestId);
      }
    });
  }

  if (completeCheckoutBtn) {
    completeCheckoutBtn.addEventListener('click', () => {
      if (!state.currentInvoiceGuest) return;
      const { guest } = state.currentInvoiceGuest;
      if (confirm(`Confirm checkout for ${guest.name} (Room ${guest.roomNumber})? Room will be cleared.`)) {
        db.checkoutGuest(guest.id);
        showToast(`Checkout complete for ${guest.name}. Room ${guest.roomNumber} is now available.`, 'success');

        checkoutSelect.value = '';
        checkoutSelect.dispatchEvent(new Event('change'));
        window.dispatchEvent(new Event('dbChange'));
      }
    });
  }

  if (printInvoiceBtn) {
    printInvoiceBtn.addEventListener('click', () => window.print());
  }
}

function updateCheckoutSelectors() {
  const sel = document.getElementById('checkout-guest-select');
  if (!sel) return;

  const prev = sel.value;
  sel.innerHTML = '<option value="">-- Select Room for Checkout --</option>';

  db.getActiveGuests().forEach(g => {
    const opt = document.createElement('option');
    opt.value    = g.id;
    opt.innerText = `Room ${g.roomNumber} — ${g.name}`;
    sel.appendChild(opt);
  });

  sel.value = prev;
}

function renderInvoice(guestId) {
  const guest = db.getGuestById(guestId);
  if (!guest) return;

  const room    = db.getRoomById(guest.roomNumber);
  const roomRate = room ? room.rate : 0;

  const checkInDate  = new Date(guest.checkIn);
  const checkOutDate = new Date(guest.checkOut);
  const diffDays     = Math.max(1, Math.ceil((checkOutDate - checkInDate) / 864e5));
  const roomRentTotal = diffDays * roomRate;

  const guestOrders  = db.getOrdersByGuest(guestId);
  const foodTotal    = guestOrders.reduce((s, o) => s + o.amount, 0);

  const guestLaundry = db.getLaundryBillsByGuest(guestId);
  const laundryTotal = guestLaundry.reduce((s, l) => s + l.amount, 0);

  state.currentInvoiceGuest = { guest, totalRent: roomRentTotal, foodTotal, laundryTotal };

  // Quick totals panel
  _set('checkout-quick-rent',    `₹${roomRentTotal.toLocaleString()}`);
  _set('checkout-quick-dining',  `₹${foodTotal.toLocaleString()}`);
  _set('checkout-quick-laundry', `₹${laundryTotal.toLocaleString()}`);
  document.getElementById('checkout-quick-totals').style.display = 'grid';
  document.getElementById('checkout-actions').style.display      = 'block';

  // Invoice panel
  document.getElementById('invoice-empty').style.display = 'none';
  document.getElementById('invoice-bill').style.display  = 'block';

  _set('invoice-id',           guestId.replace('g_', '').toUpperCase().slice(0, 8));
  _set('invoice-date',         new Date().toLocaleDateString('en-IN'));
  _set('invoice-guest-name',   guest.name);
  _set('invoice-guest-address', guest.address);
  _set('invoice-room-num',     guest.roomNumber);
  _set('invoice-room-type',    `Type ${guest.roomType} — ${room ? room.name : 'Standard'}`);
  _set('invoice-checkin',      checkInDate.toLocaleDateString('en-IN'));
  _set('invoice-checkout',     checkOutDate.toLocaleDateString('en-IN'));
  _set('invoice-nights',       diffDays);

  // Line items
  const tbody = document.getElementById('invoice-items-tbody');
  tbody.innerHTML = '';

  // Room rent row
  _addRow(tbody, 'Lodging & Room Rent', room ? room.name : 'Standard lodging', `₹${roomRate.toLocaleString()}`, `${diffDays} Nights`, `₹${roomRentTotal.toLocaleString()}`);

  // Dining
  if (guestOrders.length) {
    _addGroupHeader(tbody, 'In-Room Dining Charges');
    guestOrders.forEach(o =>
      _addRow(tbody, o.itemName, '', `₹${o.price}`, `${o.quantity} Qty`, `₹${o.amount.toLocaleString()}`, true));
  }

  // Laundry
  if (guestLaundry.length) {
    _addGroupHeader(tbody, 'Valet Laundry Services');
    guestLaundry.forEach(l =>
      _addRow(tbody, l.serviceName, '', `₹${l.rate}`, `${l.quantity} Pieces`, `₹${l.amount.toLocaleString()}`, true));
  }

  // Totals
  const subtotal  = roomRentTotal + foodTotal + laundryTotal;
  const cgst      = Math.round(subtotal * 0.09);
  const sgst      = Math.round(subtotal * 0.09);
  const grandTotal = subtotal + cgst + sgst;

  _set('invoice-subtotal',   `₹${subtotal.toLocaleString()}`);
  _set('invoice-cgst',       `₹${cgst.toLocaleString()}`);
  _set('invoice-sgst',       `₹${sgst.toLocaleString()}`);
  _set('invoice-grand-total', `₹${grandTotal.toLocaleString()}`);
}

function _addGroupHeader(tbody, label) {
  const tr = document.createElement('tr');
  tr.className = 'invoice-group-row';
  tr.innerHTML = `<td colspan="4"><strong>${label}</strong></td>`;
  tbody.appendChild(tr);
}

function _addRow(tbody, name, desc, rate, qty, amount, indent = false) {
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="${indent ? 'indent-item' : ''}">
      <strong>${name}</strong>
      ${desc ? `<span class="invoice-item-desc">${desc}</span>` : ''}
    </td>
    <td class="text-center">${rate}</td>
    <td class="text-center">${qty}</td>
    <td class="text-right">${amount}</td>
  `;
  tbody.appendChild(tr);
}

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
}
