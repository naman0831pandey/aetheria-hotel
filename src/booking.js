// ==========================================
// BOOKING MODULE
// IDs used: checkin-form, guest-name, guest-address,
//           check-in-date, check-out-date,
//           room-type-select, room-number-select,
//           rooms-grid, guests-list-tbody, guest-search-input
// ==========================================
import { db } from './db.js';
import { showToast } from './utils.js';

export function initBookingModule() {
  // Guest name / phone / email fields (HTML has guest-name and guest-address only; phone/email absent)
  const form = document.getElementById('checkin-form');
  if (form) form.addEventListener('submit', _handleCheckIn);

  // Two-step room selector: type → number
  const typeSelect = document.getElementById('room-type-select');
  if (typeSelect) {
    typeSelect.addEventListener('change', _populateRoomNumbers);
    _populateRoomNumbers(); // initial state
  }

  // Guest search filter
  const searchInput = document.getElementById('guest-search-input');
  if (searchInput) {
    searchInput.addEventListener('input', () => renderGuestsTable(searchInput.value));
  }
}

function _populateRoomNumbers() {
  const typeSelect   = document.getElementById('room-type-select');
  const numberSelect = document.getElementById('room-number-select');
  if (!typeSelect || !numberSelect) return;

  const type = typeSelect.value;
  numberSelect.innerHTML = '';

  if (!type) {
    numberSelect.innerHTML = '<option value="">Choose category first</option>';
    numberSelect.disabled = true;
    return;
  }

  const rooms = db.getRoomsByType(type);
  numberSelect.disabled = false;

  if (!rooms.length) {
    numberSelect.innerHTML = '<option value="">No rooms in this category</option>';
    return;
  }

  numberSelect.innerHTML = '<option value="">Select Room</option>';
  rooms.forEach(room => {
    const opt = document.createElement('option');
    opt.value  = room.id;
    opt.innerText = `Room ${room.number} — ${room.status === 'occupied' ? '🔴 Occupied' : '🟢 Available'}`;
    opt.disabled = room.status === 'occupied';
    numberSelect.appendChild(opt);
  });
}

function _handleCheckIn(e) {
  e.preventDefault();

  const name       = document.getElementById('guest-name')?.value.trim();
  const address    = document.getElementById('guest-address')?.value.trim();
  const checkIn    = document.getElementById('check-in-date')?.value;
  const checkOut   = document.getElementById('check-out-date')?.value;
  const roomType   = document.getElementById('room-type-select')?.value;
  const roomNumber = document.getElementById('room-number-select')?.value;

  if (!name || !address || !checkIn || !checkOut || !roomType || !roomNumber) {
    showToast('Please fill in all fields before checking in.', 'error');
    return;
  }

  if (new Date(checkOut) <= new Date(checkIn)) {
    showToast('Check-out date must be after check-in date.', 'error');
    return;
  }

  const room = db.getRoomById(roomNumber);
  if (!room || room.status === 'occupied') {
    showToast('Selected room is no longer available.', 'error');
    return;
  }

  const nights = Math.max(1, Math.ceil((new Date(checkOut) - new Date(checkIn)) / 864e5));

  db.addGuest({
    name,
    address,
    roomNumber,
    roomType,
    checkIn: new Date(checkIn).toISOString(),
    checkOut: new Date(checkOut).toISOString(),
    nights,
    estRent: room.rate * nights
  });

  showToast(`✓ ${name} checked into Room ${roomNumber}`, 'success');
  e.target.reset();
  document.getElementById('room-number-select').disabled = true;
  document.getElementById('room-number-select').innerHTML = '<option value="">Choose category first</option>';
  window.dispatchEvent(new Event('dbChange'));
}

// Render room cards in the Rooms Directory grid
export function renderRoomsGrid() {
  const grid = document.getElementById('rooms-grid');
  if (!grid) return;

  grid.innerHTML = '';
  db.getRooms().forEach(room => {
    const isOccupied = room.status === 'occupied';
    const guest = isOccupied
      ? db.getActiveGuests().find(g => g.roomNumber === room.id)
      : null;

    const card = document.createElement('div');
    card.className = `room-card ${isOccupied ? 'occupied' : 'available'}`;
    card.innerHTML = `
      <div class="room-card-header">
        <span class="room-number-badge">Room ${room.number}</span>
        <span class="room-status-dot ${isOccupied ? 'dot-red' : 'dot-green'}"></span>
      </div>
      <p class="room-type-label">${room.name}</p>
      <p class="room-rate">₹${room.rate.toLocaleString()}<span>/night</span></p>
      ${isOccupied && guest
        ? `<p class="room-guest-name">${guest.name}</p>`
        : `<p class="room-available-text">Available</p>`
      }
    `;
    grid.appendChild(card);
  });
}

// Render active guest rows
export function renderGuestsTable(filter = '') {
  const tbody = document.getElementById('guests-list-tbody');
  if (!tbody) return;

  const guests = db.getGuests().filter(g =>
    !filter ||
    g.name.toLowerCase().includes(filter.toLowerCase()) ||
    g.roomNumber.includes(filter)
  );

  if (!guests.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="text-center empty-state">No guests found.</td></tr>`;
    return;
  }

  tbody.innerHTML = '';
  guests.slice().reverse().forEach(guest => {
    const room    = db.getRoomById(guest.roomNumber);
    const nights  = guest.nights ?? 1;
    const rent    = guest.estRent ?? (room ? room.rate * nights : 0);
    const isIn    = guest.status === 'checked-in';

    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td>
        <strong>${guest.name}</strong><br>
        <small class="text-muted">${guest.address}</small>
      </td>
      <td>
        <span class="badge ${isIn ? 'badge-purple' : 'badge-gray'}">Room ${guest.roomNumber}</span>
      </td>
      <td>${guest.address}</td>
      <td>${_fmtDate(guest.checkIn)} → ${_fmtDate(guest.checkOut)}</td>
      <td>${nights}</td>
      <td>₹${rent.toLocaleString()}</td>
      <td>
        <span class="badge ${isIn ? 'badge-green' : 'badge-gray'}">
          ${isIn ? 'Checked In' : 'Checked Out'}
        </span>
      </td>
    `;
    tbody.appendChild(tr);
  });
}

function _fmtDate(iso) {
  return iso ? new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '--';
}
