// ==========================================
// DASHBOARD MODULE
// ==========================================
import { db } from './db.js';

export function renderDashboard() {
  _renderOccupancy();
  _renderRevenue();
  _renderGuestCount();
  _renderOrderStats();
  _renderRoomStrip();
  _renderActivityLog();
}

function _renderOccupancy() {
  const rooms = db.getRooms();
  const occupied = rooms.filter(r => r.status === 'occupied').length;
  const total = rooms.length;
  const pct = total ? Math.round((occupied / total) * 100) : 0;

  _set('stat-occupancy', `${pct}%`);
  _set('stat-rooms-count', `${occupied} of ${total} Rooms Booked`);
  const fill = document.getElementById('occupancy-fill');
  if (fill) fill.style.width = `${pct}%`;
}

function _renderRevenue() {
  let roomRev = 0;
  db.getActiveGuests().forEach(g => {
    const room = db.getRoomById(g.roomNumber);
    if (room) {
      const nights = Math.max(1, Math.ceil((new Date(g.checkOut) - new Date(g.checkIn)) / 864e5));
      roomRev += room.rate * nights;
    }
  });
  const foodRev  = db.getOrders().reduce((s, o) => s + o.amount, 0);
  const lndrRev  = db.getLaundry().reduce((s, l) => s + l.amount, 0);
  const total    = roomRev + foodRev + lndrRev;

  _set('stat-revenue', `₹${total.toLocaleString()}`);
  _set('stat-revenue-breakdown',
    `Rooms: ₹${roomRev.toLocaleString()} | Dining: ₹${foodRev.toLocaleString()} | Laundry: ₹${lndrRev.toLocaleString()}`);
}

function _renderGuestCount() {
  _set('stat-guests', db.getActiveGuests().length);
}

function _renderOrderStats() {
  const orders = db.getOrders();
  const total   = orders.reduce((s, o) => s + o.amount, 0);
  _set('stat-orders', orders.length);
  _set('stat-orders-today', `${orders.length} orders · ₹${total.toLocaleString()} in sales`);
}

function _renderRoomStrip() {
  const container = document.getElementById('rooms-strip-container');
  if (!container) return;

  container.innerHTML = '';
  db.getRooms().forEach(room => {
    const block = document.createElement('div');
    block.className = `room-block ${room.status}`;
    block.title = `Room ${room.number} — ${room.name} (${room.status})`;
    block.innerText = room.number;
    container.appendChild(block);
  });

  const badge = document.getElementById('room-overview-badge');
  if (badge) badge.innerText = `${db.getRooms().length} Rooms Total`;
}

function _renderActivityLog() {
  const container = document.getElementById('activity-log');
  if (!container) return;

  const events = [];

  db.getActiveGuests().forEach(g => events.push({
    time: new Date(g.checkIn),
    icon: '🛎',
    text: `${g.name} checked into Room ${g.roomNumber}`
  }));

  db.getOrders().slice(-4).forEach(o => events.push({
    time: new Date(o.timestamp),
    icon: '🍽',
    text: `Room ${o.roomNumber}: ${o.itemName} ×${o.quantity}`
  }));

  db.getLaundry().slice(-3).forEach(l => events.push({
    time: new Date(l.timestamp),
    icon: '👔',
    text: `Room ${l.roomNumber}: ${l.serviceName} (${l.quantity} pcs)`
  }));

  events.sort((a, b) => b.time - a.time);

  if (!events.length) {
    container.innerHTML = '<div class="empty-state">No recent activity.</div>';
    return;
  }

  container.innerHTML = events.slice(0, 6).map(e => `
    <div class="activity-item">
      <span class="activity-icon">${e.icon}</span>
      <div class="activity-body">
        <span class="activity-text">${e.text}</span>
        <span class="activity-time">${e.time.toLocaleTimeString()}</span>
      </div>
    </div>
  `).join('');
}

function _set(id, val) {
  const el = document.getElementById(id);
  if (el) el.innerText = val;
}
