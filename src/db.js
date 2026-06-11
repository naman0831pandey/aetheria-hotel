// ============================================
// DATABASE MODULE: In-Memory State Management
// ============================================

function generateId(prefix) {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// Room types with their nightly rates
const ROOM_TYPES = {
  A: { label: 'Type A', rate: 1000 },
  B: { label: 'Type B', rate: 2000 },
  C: { label: 'Type C', rate: 3000 },
  D: { label: 'Type D', rate: 4000 }
};

// 9 rooms: 3 per floor (101-103, 201-203, 301-303) assigned to types A-D
const defaultRooms = [
  { id: '101', number: '101', name: 'Type A Room', type: 'A', rate: 1000, status: 'available' },
  { id: '102', number: '102', name: 'Type B Room', type: 'B', rate: 2000, status: 'available' },
  { id: '103', number: '103', name: 'Type C Room', type: 'C', rate: 3000, status: 'available' },
  { id: '201', number: '201', name: 'Type A Room', type: 'A', rate: 1000, status: 'available' },
  { id: '202', number: '202', name: 'Type B Room', type: 'B', rate: 2000, status: 'available' },
  { id: '203', number: '203', name: 'Type D Room', type: 'D', rate: 4000, status: 'available' },
  { id: '301', number: '301', name: 'Type C Room', type: 'C', rate: 3000, status: 'available' },
  { id: '302', number: '302', name: 'Type B Room', type: 'B', rate: 2000, status: 'available' },
  { id: '303', number: '303', name: 'Type D Room', type: 'D', rate: 4000, status: 'available' }
];

// Default menu items
const defaultMenuItems = [
  { id: 'm_1', name: 'Masala Chai', category: 'Beverage', price: 80, emoji: '☕' },
  { id: 'm_2', name: 'Fresh Lime Soda', category: 'Beverage', price: 120, emoji: '🍋' },
  { id: 'm_3', name: 'Mango Lassi', category: 'Beverage', price: 150, emoji: '🥛' },
  { id: 'm_4', name: 'Samosa Platter', category: 'Snack', price: 180, emoji: '🥟' },
  { id: 'm_5', name: 'Paneer Tikka', category: 'Snack', price: 320, emoji: '🧀' },
  { id: 'm_6', name: 'French Fries', category: 'Snack', price: 200, emoji: '🍟' },
  { id: 'm_7', name: 'Dal Makhani', category: 'Main Course', price: 350, emoji: '🍛' },
  { id: 'm_8', name: 'Butter Chicken', category: 'Main Course', price: 420, emoji: '🍗' },
  { id: 'm_9', name: 'Veg Biryani', category: 'Main Course', price: 380, emoji: '🍚' },
  { id: 'm_10', name: 'Gulab Jamun', category: 'Dessert', price: 160, emoji: '🍮' }
];

// Laundry services
export const LAUNDRY_SERVICES = [
  { id: 'express-wash', name: 'Express Wash', rate: 200 },
  { id: 'regular-wash', name: 'Regular Wash', rate: 150 },
  { id: 'dry-cleaning', name: 'Dry Cleaning', rate: 300 },
  { id: 'ironing', name: 'Ironing Only', rate: 100 },
  { id: 'delicate-wash', name: 'Delicate/Woollen Wash', rate: 250 }
];

// Database object
export const db = {
  rooms: JSON.parse(JSON.stringify(defaultRooms)),
  guests: [],
  orders: [],
  laundry: [],

  // ── ROOMS ──────────────────────────────
  getRooms() { return this.rooms; },
  getRoomsByType(type) { return this.rooms.filter(r => r.type === type); },
  getAvailableRooms() { return this.rooms.filter(r => r.status === 'available'); },
  getAvailableRoomsByType(type) { return this.rooms.filter(r => r.type === type && r.status === 'available'); },
  getRoomById(id) { return this.rooms.find(r => r.id === id); },
  getRoomTypes() { return ROOM_TYPES; },

  updateRoomStatus(roomId, status) {
    const room = this.getRoomById(roomId);
    if (room) { room.status = status; }
  },

  // ── GUESTS ─────────────────────────────
  getGuests() { return this.guests; },
  getActiveGuests() { return this.guests.filter(g => g.status === 'checked-in'); },
  getGuestById(id) { return this.guests.find(g => g.id === id); },

  addGuest(data) {
    const guest = { id: generateId('g'), ...data, status: 'checked-in' };
    this.guests.push(guest);
    this.updateRoomStatus(data.roomNumber, 'occupied');
    this.notifyChange();
    return guest;
  },

  checkoutGuest(guestId) {
    const guest = this.getGuestById(guestId);
    if (!guest) return;
    guest.status = 'checked-out';
    this.updateRoomStatus(guest.roomNumber, 'available');
    this.notifyChange();
  },

  // ── ORDERS ─────────────────────────────
  getOrders() { return this.orders; },
  getOrdersByGuest(guestId) { return this.orders.filter(o => o.guestId === guestId); },

  addOrder(data) {
    const order = { id: generateId('o'), ...data, timestamp: new Date().toISOString() };
    this.orders.push(order);
    this.notifyChange();
    return order;
  },

  // ── LAUNDRY ────────────────────────────
  getLaundry() { return this.laundry; },
  getLaundryBillsByGuest(guestId) { return this.laundry.filter(l => l.guestId === guestId); },

  addLaundryBill(data) {
    const bill = { id: generateId('l'), ...data, timestamp: new Date().toISOString() };
    this.laundry.push(bill);
    this.notifyChange();
    return bill;
  },

  // ── MENU ───────────────────────────────
  getMenuItems(category = 'all') {
    return category === 'all' ? defaultMenuItems : defaultMenuItems.filter(m => m.category === category);
  },
  getMenuCategories() {
    return ['all', ...new Set(defaultMenuItems.map(m => m.category))];
  },
  getMenuItemById(id) { return defaultMenuItems.find(m => m.id === id); },

  // ── UTILITIES ──────────────────────────
  reset() {
    this.guests = [];
    this.orders = [];
    this.laundry = [];
    this.rooms = JSON.parse(JSON.stringify(defaultRooms));
    this.notifyChange();
  },

  notifyChange() {
    window.dispatchEvent(new Event('dbChange'));
  }
};

export function initDB() {
  try {
    const saved = localStorage.getItem('aetheria_db_v2');
    if (saved) {
      const data = JSON.parse(saved);
      db.guests = data.guests || [];
      db.orders = data.orders || [];
      db.laundry = data.laundry || [];
      db.rooms = data.rooms || JSON.parse(JSON.stringify(defaultRooms));
    }
  } catch (e) {
    console.warn('Could not load saved data:', e);
  }

  window.addEventListener('dbChange', () => {
    try {
      localStorage.setItem('aetheria_db_v2', JSON.stringify({
        guests: db.guests,
        orders: db.orders,
        laundry: db.laundry,
        rooms: db.rooms
      }));
    } catch (e) {
      console.warn('Could not persist data:', e);
    }
  });
}
