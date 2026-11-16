/* ================================================================
   STORE — database lokal, autentikasi, dan operasi domain
   Tidak mengakses DOM; UI memakai fungsi yang diekspor di sini.
   ================================================================ */

import { seedProducts } from './products.js';

export const DB_KEY = 'bakolsego_db_v2';
export const SESSION_KEY = 'bakolsego_session_v2';
export const THEME_KEY = 'bakolsego_glass_theme_v1';
export const DB_VERSION = 2;
export const LOCALE = 'id-ID';

export const ROLE_META = {
  admin: { label: 'Admin', icon: '🛡️', desc: 'Pengelola sistem' },
  seller: { label: 'Seller', icon: '🧑‍🍳', desc: 'Pemilik toko' },
  buyer: { label: 'Pembeli', icon: '🛒', desc: 'Pelanggan' }
};

export const TABS_BY_ROLE = {
  admin: [
    { id: 'admin-users', label: 'Kelola User', icon: '👥' },
    { id: 'admin-settings', label: 'Pengaturan', icon: '⚙️' }
  ],
  seller: [
    { id: 'seller', label: 'Produk Saya', icon: '🍱' }
  ],
  buyer: [
    { id: 'catalog', label: 'Katalog', icon: '🛍️' }
  ]
};

/* State bersama. Hanya dimutasi lewat fungsi di modul ini. */
export let db = null;
export let session = null;

/* ================================================================
   UTILITAS
   ================================================================ */
export function isoNow() { return new Date().toISOString(); }

export function uid(prefix) {
  return `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

const rupiahFormatter = new Intl.NumberFormat(LOCALE, {
  style: 'currency', currency: 'IDR', minimumFractionDigits: 0, maximumFractionDigits: 0
});

export function formatRupiah(amount) { return rupiahFormatter.format(Number(amount) || 0); }

export function parseInteger(value) {
  const raw = String(value ?? '').trim();
  if (raw === '' || !/^-?\d+$/.test(raw)) return null;
  return Number(raw);
}

export function normalizePhone(input) {
  let digits = String(input ?? '').replace(/[^\d]/g, '');
  if (!digits) return '';
  if (digits.startsWith('0')) digits = '62' + digits.slice(1);
  else if (digits.startsWith('8')) digits = '62' + digits;
  return digits;
}

export function formatPhone(digits) {
  const clean = String(digits ?? '').replace(/[^\d]/g, '');
  if (!clean) return '—';
  if (clean.startsWith('62')) {
    const rest = clean.slice(2);
    const parts = rest.length > 7 ? [rest.slice(0, 3), rest.slice(3, 7), rest.slice(7)] : [rest];
    return '+62 ' + parts.filter(Boolean).join('-');
  }
  return '+' + clean;
}

export function formatDateTime(iso) {
  try {
    return new Intl.DateTimeFormat(LOCALE, {
      day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit'
    }).format(new Date(iso));
  } catch (err) {
    return '—';
  }
}

/* ================================================================
   HASH PASSWORD (SHA-256 sinkron, tanpa dependensi)
   ================================================================ */
function rotr(x, n) { return (x >>> n) | (x << (32 - n)); }

export function sha256Hex(message) {
  const K = [
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
    0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
    0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
    0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
    0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
    0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2
  ];
  const H = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];

  const bytes = new TextEncoder().encode(message);
  const bitLength = bytes.length * 8;
  const totalLength = Math.ceil((bytes.length + 9) / 64) * 64;
  const buffer = new Uint8Array(totalLength);
  buffer.set(bytes);
  buffer[bytes.length] = 0x80;
  const view = new DataView(buffer.buffer);
  view.setUint32(totalLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(totalLength - 4, bitLength >>> 0);

  const w = new Uint32Array(64);
  for (let offset = 0; offset < totalLength; offset += 64) {
    for (let t = 0; t < 16; t++) w[t] = view.getUint32(offset + t * 4);
    for (let t = 16; t < 64; t++) {
      const s0 = rotr(w[t - 15], 7) ^ rotr(w[t - 15], 18) ^ (w[t - 15] >>> 3);
      const s1 = rotr(w[t - 2], 17) ^ rotr(w[t - 2], 19) ^ (w[t - 2] >>> 10);
      w[t] = (w[t - 16] + s0 + w[t - 7] + s1) >>> 0;
    }

    let a = H[0], b = H[1], c = H[2], d = H[3], e = H[4], f = H[5], g = H[6], h = H[7];
    for (let t = 0; t < 64; t++) {
      const S1 = rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25);
      const ch = (e & f) ^ (~e & g);
      const temp1 = (h + S1 + ch + K[t] + w[t]) >>> 0;
      const S0 = rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22);
      const maj = (a & b) ^ (a & c) ^ (b & c);
      const temp2 = (S0 + maj) >>> 0;
      h = g; g = f; f = e; e = (d + temp1) >>> 0;
      d = c; c = b; b = a; a = (temp1 + temp2) >>> 0;
    }

    H[0] = (H[0] + a) >>> 0; H[1] = (H[1] + b) >>> 0;
    H[2] = (H[2] + c) >>> 0; H[3] = (H[3] + d) >>> 0;
    H[4] = (H[4] + e) >>> 0; H[5] = (H[5] + f) >>> 0;
    H[6] = (H[6] + g) >>> 0; H[7] = (H[7] + h) >>> 0;
  }

  return H.map(x => x.toString(16).padStart(8, '0')).join('');
}

export function hashPassword(password) {
  return sha256Hex('bakolsego::' + String(password ?? ''));
}

/* ================================================================
   DATA DUMMY
   ================================================================ */
function buildSeedUsers(createdAt) {
  return [
    { id: 'usr-admin', name: 'Admin BakolSego', email: 'admin@bakolsego.id', passwordHash: hashPassword('admin123'), role: 'admin', phone: '6281200000001', storeName: 'BakolSego HQ', active: true, createdAt },
    { id: 'usr-sari', name: 'Sari Wulandari', email: 'sari@bakolsego.id', passwordHash: hashPassword('seller123'), role: 'seller', phone: '6281234567890', storeName: 'Dapur Bu Sari', active: true, createdAt },
    { id: 'usr-joko', name: 'Joko Prasetyo', email: 'joko@bakolsego.id', passwordHash: hashPassword('seller123'), role: 'seller', phone: '6281298765432', storeName: 'Sego Joko', active: true, createdAt },
    { id: 'usr-rina', name: 'Rina Kartika', email: 'rina@bakolsego.id', passwordHash: hashPassword('seller123'), role: 'seller', phone: '6281355556666', storeName: 'Rina Snacks', active: true, createdAt },
    { id: 'usr-budi', name: 'Budi Santoso', email: 'budi@bakolsego.id', passwordHash: hashPassword('buyer123'), role: 'buyer', phone: '6281211112222', storeName: '', active: true, createdAt },
    { id: 'usr-sinta', name: 'Sinta Maharani', email: 'sinta@bakolsego.id', passwordHash: hashPassword('buyer123'), role: 'buyer', phone: '6281333334444', storeName: '', active: true, createdAt },
    { id: 'usr-dewi', name: 'Dewi Lestari', email: 'dewi@bakolsego.id', passwordHash: hashPassword('buyer123'), role: 'buyer', phone: '6281255557777', storeName: '', active: true, createdAt }
  ];
}

export function seedDatabase() {
  const createdAt = isoNow();
  return {
    meta: { version: DB_VERSION, seededAt: createdAt, updatedAt: createdAt },
    users: buildSeedUsers(createdAt),
    products: seedProducts(createdAt),
    settings: { storeName: 'BakolSego', whatsappNumber: '6280000000000' },
    auditLog: [
      { id: 'log-seed', at: createdAt, actorId: 'system', actorName: 'Sistem', action: 'seed', detail: 'Database demo dibuat (7 user, 10 produk).' }
    ]
  };
}

/* ================================================================
   LAPISAN DATABASE
   ================================================================ */
function persistDatabase() {
  try {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
    return true;
  } catch (err) {
    return false;
  }
}

export function loadDatabase() {
  try {
    const raw = localStorage.getItem(DB_KEY);
    if (!raw) throw new Error('kosong');
    const parsed = JSON.parse(raw);
    if (!parsed || parsed.meta?.version !== DB_VERSION || !Array.isArray(parsed.users) || !Array.isArray(parsed.products)) {
      throw new Error('skema lama');
    }
    parsed.settings = parsed.settings || { storeName: 'BakolSego', whatsappNumber: '6280000000000' };
    parsed.auditLog = Array.isArray(parsed.auditLog) ? parsed.auditLog : [];
    db = parsed;
    return db;
  } catch (err) {
    const seeded = seedDatabase();
    db = seeded;
    try { localStorage.setItem(DB_KEY, JSON.stringify(seeded)); } catch (e) { /* kuota penuh */ }
    return db;
  }
}

export function saveDatabase() {
  if (!db) return false;
  db.meta.updatedAt = isoNow();
  return persistDatabase();
}

export function logAction(action, detail) {
  const actor = currentUser();
  db.auditLog.unshift({
    id: uid('log'),
    at: isoNow(),
    actorId: actor ? actor.id : 'system',
    actorName: actor ? actor.name : 'Sistem',
    action,
    detail
  });
  db.auditLog = db.auditLog.slice(0, 200);
}

/* ================================================================
   SESI & OTORISASI
   ================================================================ */
export function readSession() {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (!raw) { session = null; return null; }
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.userId !== 'string') return null;
    session = parsed;
    return session;
  } catch (err) {
    session = null;
    return null;
  }
}

export function currentUser() {
  if (!session || !db) return null;
  return db.users.find(u => u.id === session.userId) || null;
}

/** Verifikasi kredensial tanpa mengubah state. */
export function authenticate(email, password) {
  const normalizedEmail = String(email ?? '').trim().toLowerCase();
  const user = db.users.find(u => u.email.toLowerCase() === normalizedEmail);

  if (!user || user.passwordHash !== hashPassword(password)) {
    return { error: 'Email atau password salah.' };
  }
  if (!user.active) {
    return { error: 'Akun ini dinonaktifkan. Hubungi admin BakolSego.' };
  }
  return { user };
}

export function startSession(userId) {
  session = { userId, issuedAt: isoNow() };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (err) { /* abaikan */ }
  return session;
}

export function endSession() {
  session = null;
  try { localStorage.removeItem(SESSION_KEY); } catch (err) { /* abaikan */ }
}

/* ================================================================
   KUERI DOMAIN
   ================================================================ */
export function findUser(userId) {
  return db.users.find(u => u.id === userId) || null;
}

export function productCountFor(userId) {
  return db.products.filter(p => p.sellerId === userId).length;
}

export function productsForSeller(userId) {
  return db.products.filter(p => p.sellerId === userId);
}

export function visibleProducts() {
  const activeSellerIds = new Set(
    db.users.filter(u => u.role === 'seller' && u.active).map(u => u.id)
  );
  return db.products.filter(p => p.active && activeSellerIds.has(p.sellerId));
}

export function sellerOf(product) {
  return db.users.find(u => u.id === product.sellerId) || null;
}

/* ================================================================
   MUTASI PRODUK
   ================================================================ */
export function createProduct(sellerId, values) {
  const now = isoNow();
  const product = {
    id: uid('prd'),
    sellerId,
    name: values.name,
    category: values.category,
    price: values.price,
    stock: values.stock,
    description: values.description,
    imageUrl: values.imageUrl,
    featured: Boolean(values.featured),
    active: Boolean(values.active),
    createdAt: now,
    updatedAt: now
  };
  db.products.push(product);
  return product;
}

export function updateProduct(productId, sellerId, values) {
  const product = db.products.find(p => p.id === productId && p.sellerId === sellerId);
  if (!product) return null;
  Object.assign(product, {
    name: values.name,
    category: values.category,
    price: values.price,
    stock: values.stock,
    description: values.description,
    imageUrl: values.imageUrl,
    featured: Boolean(values.featured),
    active: Boolean(values.active),
    updatedAt: isoNow()
  });
  return product;
}

export function deleteProduct(productId, sellerId) {
  const index = db.products.findIndex(p => p.id === productId && p.sellerId === sellerId);
  if (index === -1) return null;
  const [removed] = db.products.splice(index, 1);
  return removed;
}

/* ================================================================
   MUTASI USER
   ================================================================ */
export function createUser(values) {
  const user = {
    id: uid('usr'),
    name: values.name,
    email: values.email,
    passwordHash: hashPassword(values.password),
    role: values.role,
    phone: values.phone,
    storeName: values.role === 'seller' ? values.storeName : '',
    active: true,
    createdAt: isoNow()
  };
  db.users.push(user);
  return user;
}

export function updateUser(userId, values) {
  const user = findUser(userId);
  if (!user) return null;
  user.name = values.name;
  user.email = values.email;
  user.role = values.role;
  user.phone = values.phone;
  user.storeName = values.role === 'seller' ? values.storeName : '';
  user.active = Boolean(values.active);
  if (values.password) user.passwordHash = hashPassword(values.password);
  return user;
}

export function removeUser(userId) {
  const index = db.users.findIndex(u => u.id === userId);
  if (index === -1) return null;
  const [removed] = db.users.splice(index, 1);
  return removed;
}

export function setUserActive(userId, active) {
  const user = findUser(userId);
  if (!user) return null;
  user.active = Boolean(active);
  return user;
}

/* ================================================================
   PENGATURAN & RESET
   ================================================================ */
export function updateSettings({ storeName, whatsappNumber }) {
  db.settings.storeName = storeName;
  db.settings.whatsappNumber = whatsappNumber;
  return db.settings;
}

/** Kembalikan seluruh data ke seed dan pertahankan admin yang sedang login. */
export function resetDemo(adminId) {
  db = seedDatabase();
  session = { userId: adminId, issuedAt: isoNow() };
  try { localStorage.setItem(SESSION_KEY, JSON.stringify(session)); } catch (err) { /* abaikan */ }
  saveDatabase();
  return db;
}
