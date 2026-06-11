// ==========================================
// LAUNDRY MODULE
// IDs used: laundry-form, laundry-guest-select,
//           laundry-service-select, clothes-count,
//           laundry-rate-preview, laundry-total-preview,
//           laundry-list-tbody
// ==========================================
import { db, LAUNDRY_SERVICES } from './db.js';
import { showToast } from './utils.js';

export function initLaundryModule() {
  // Populate service dropdown
  const serviceSelect = document.getElementById('laundry-service-select');
  if (serviceSelect) {
    serviceSelect.innerHTML = '<option value="">-- Select Service --</option>';
    LAUNDRY_SERVICES.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.innerText = `${s.name} — ₹${s.rate}/piece`;
      serviceSelect.appendChild(opt);
    });
    serviceSelect.addEventListener('change', _updatePreview);
  }

  const countInput = document.getElementById('clothes-count');
  if (countInput) countInput.addEventListener('input', _updatePreview);

  const form = document.getElementById('laundry-form');
  if (form) form.addEventListener('submit', _handleSubmit);
}

function _updatePreview() {
  const serviceId = document.getElementById('laundry-service-select')?.value;
  const qty       = parseInt(document.getElementById('clothes-count')?.value) || 0;
  const rateEl    = document.getElementById('laundry-rate-preview');
  const totalEl   = document.getElementById('laundry-total-preview');

  const service = LAUNDRY_SERVICES.find(s => s.id === serviceId);

  if (rateEl) rateEl.innerText = service ? `₹${service.rate}` : '₹0';
  if (totalEl) totalEl.innerText = service && qty ? `₹${(service.rate * qty).toLocaleString()}` : '₹0';
}

function _handleSubmit(e) {
  e.preventDefault();

  const roomNumber = document.getElementById('laundry-guest-select')?.value;
  const serviceId  = document.getElementById('laundry-service-select')?.value;
  const qty        = parseInt(document.getElementById('clothes-count')?.value) || 0;

  if (!roomNumber || !serviceId || qty < 1) {
    showToast('Please fill in all laundry request fields.', 'error');
    return;
  }

  const guest = db.getActiveGuests().find(g => g.roomNumber === roomNumber);
  if (!guest) {
    showToast('No active guest found in that room.', 'error');
    return;
  }

  const service = LAUNDRY_SERVICES.find(s => s.id === serviceId);
  if (!service) return;

  const amount = service.rate * qty;

  db.addLaundryBill({
    guestId:     guest.id,
    guestName:   guest.name,
    roomNumber,
    serviceName: service.name,
    serviceId,
    quantity:    qty,
    rate:        service.rate,
    amount
  });

  showToast(`✓ Laundry registered: ${service.name} ×${qty} for Room ${roomNumber} — ₹${amount.toLocaleString()}`, 'success');
  e.target.reset();
  _updatePreview();
  window.dispatchEvent(new Event('dbChange'));
}

export function renderLaundryLedger() {
  const tbody = document.getElementById('laundry-list-tbody');
  if (!tbody) return;

  const bills = db.getLaundry();
  if (!bills.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="text-center empty-state">No laundry requests yet.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  bills.slice().reverse().forEach(bill => {
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>Room ${bill.roomNumber}</td>
      <td>${bill.guestName ?? '—'}</td>
      <td>${bill.serviceName}</td>
      <td>${bill.quantity} pcs</td>
      <td>₹${bill.amount.toLocaleString()}</td>
      <td>${new Date(bill.timestamp).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })}</td>
    `;
    tbody.appendChild(tr);
  });
}
