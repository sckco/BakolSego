/* ================================================================
   UI — render, form, modal, tema, dan alur login
   ================================================================ */

import {
  db, session, ROLE_META, TABS_BY_ROLE, THEME_KEY,
  currentUser, authenticate, startSession, endSession, saveDatabase, logAction,
  findUser, productCountFor, productsForSeller, visibleProducts, sellerOf,
  createProduct, updateProduct, deleteProduct,
  createUser, updateUser, removeUser, setUserActive,
  updateSettings, resetDemo,
  formatRupiah, parseInteger, normalizePhone, formatPhone, formatDateTime
} from './store.js';
import { CATEGORIES, createLocalFoodSvg, safeImageUrl } from './products.js';

const $ = (id) => document.getElementById(id);

export const ui = {
  activeTab: null,
  catalog: { search: '', category: 'Semua', featuredOnly: false, sortBy: 'featured' },
  sellerSearch: '',
  adminSearch: '',
  adminRole: 'all',
  editingProductId: null,
  editingUserId: null,
  confirmCallback: null,
  waUrl: ''
};

/* ================================================================
   UTILITAS TAMPILAN
   ================================================================ */
export function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

export function initials(name) {
  return String(name || '?').trim().split(/\s+/).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function ensureRole(...roles) {
  const user = currentUser();
  if (!user || !roles.includes(user.role)) {
    toast('Akses ditolak. Anda tidak memiliki izin untuk aksi ini.', 'error');
    return null;
  }
  return user;
}

/* ================================================================
   TOAST & MODAL
   ================================================================ */
export function toast(message, type = 'success') {
  const palette = {
    success: 'bg-emerald-600 text-white',
    error: 'bg-red-600 text-white',
    info: 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
  };
  const el = document.createElement('div');
  el.className = `pointer-events-auto px-4 py-3 rounded-2xl shadow-xl text-xs font-bold max-w-xs animate-ios-card ${palette[type] || palette.success}`;
  el.setAttribute('role', type === 'error' ? 'alert' : 'status');
  el.textContent = message;
  const container = $('toast-container');
  if (!container) return;
  container.appendChild(el);
  setTimeout(() => { el.remove(); }, 3500);
}

export function openModal(id) {
  const modal = $(id);
  if (!modal) return;
  modal.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
  const focusable = modal.querySelector('input:not([type="hidden"]):not([readonly]), select, textarea, button');
  if (focusable) setTimeout(() => focusable.focus(), 40);
}

export function closeModal(id) {
  const modal = $(id);
  if (!modal) return;
  modal.classList.add('hidden');
  if (!document.querySelector('#product-modal:not(.hidden), #user-modal:not(.hidden), #confirm-modal:not(.hidden), #wa-modal:not(.hidden)')) {
    document.body.style.overflow = '';
  }
}

export function askConfirm(options, onConfirm) {
  $('confirm-title').textContent = options.title || 'Konfirmasi';
  $('confirm-message').textContent = options.message || '';
  $('confirm-extra').innerHTML = options.extraHtml || '';
  const okBtn = $('btn-confirm-ok');
  okBtn.textContent = options.okText || 'Ya, Lanjutkan';
  const danger = options.tone !== 'primary';
  okBtn.className = `ios-tap px-5 py-2.5 rounded-2xl text-white text-sm font-extrabold shadow-md ${danger ? 'bg-red-600 hover:bg-red-700 shadow-red-600/20' : 'bg-orange-600 hover:bg-orange-700 shadow-orange-600/20'}`;
  $('confirm-icon').className = `w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 text-white ${danger ? 'bg-red-600' : 'bg-orange-600'}`;
  ui.confirmCallback = onConfirm;
  openModal('confirm-modal');
}

export function runConfirm() {
  const callback = ui.confirmCallback;
  closeModal('confirm-modal');
  ui.confirmCallback = null;
  if (typeof callback === 'function') callback();
}

/* ================================================================
   TEMA
   ================================================================ */
export function applyTheme(theme) {
  const normalized = theme === 'dark' ? 'dark' : 'light';
  document.documentElement.setAttribute('data-theme', normalized);
  try { localStorage.setItem(THEME_KEY, normalized); } catch (err) { /* abaikan */ }
}

export function toggleTheme() {
  const next = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  applyTheme(next);
}

export function initTheme() {
  let saved = null;
  try { saved = localStorage.getItem(THEME_KEY); } catch (err) { saved = null; }
  if (saved === 'dark' || saved === 'light') {
    document.documentElement.setAttribute('data-theme', saved);
    return;
  }
  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', prefersDark ? 'dark' : 'light');
}

/* ================================================================
   RENDER SHELL
   ================================================================ */
export function renderApp() {
  const user = currentUser();
  if (!user || !user.active) {
    if (session) endSession();
    showGuestView();
    return;
  }
  showAppView(user);
}

/** Tampilkan/ sembunyikan elemen header khusus tamu. */
function setGuestHeader(isGuest) {
  const guestActions = $('guest-actions');
  const userBox = $('header-user-box');
  const logoutBtn = $('btn-logout');
  const roleChip = $('header-role-chip');
  if (!guestActions || !userBox || !logoutBtn) return;

  if (isGuest) {
    guestActions.classList.remove('hidden');
    guestActions.classList.add('flex');
    userBox.classList.add('hidden');
    userBox.classList.remove('sm:flex');
    logoutBtn.classList.add('hidden');
    roleChip.classList.add('hidden');
  } else {
    guestActions.classList.add('hidden');
    guestActions.classList.remove('flex');
    userBox.classList.remove('hidden');
    userBox.classList.add('sm:flex');
    logoutBtn.classList.remove('hidden');
  }
}

/** Katalog publik: bisa dilihat tanpa login. */
export function showGuestView() {
  $('app-header').classList.remove('hidden');
  $('view-login').classList.add('hidden');
  $('view-register').classList.add('hidden');
  $('view-app').classList.remove('hidden');
  $('role-nav').innerHTML = '';
  ['seller', 'admin-users', 'admin-settings'].forEach(id => {
    const section = $('section-' + id);
    if (section) section.classList.add('hidden');
  });
  $('section-catalog').classList.remove('hidden');
  setGuestHeader(true);
  hideLoginError();
  hideRegisterError();
  resetPasswordVisibility();
  ui.activeTab = null;
  renderCatalog();
}

export function showLoginView() {
  $('app-header').classList.add('hidden');
  $('view-app').classList.add('hidden');
  $('view-register').classList.add('hidden');
  $('view-login').classList.remove('hidden');
  $('view-login').classList.add('flex');
  hideLoginError();
  resetPasswordVisibility();
  const emailInput = $('login-email');
  if (emailInput) emailInput.focus();
}

export function showRegisterView() {
  $('app-header').classList.add('hidden');
  $('view-app').classList.add('hidden');
  $('view-login').classList.add('hidden');
  $('view-register').classList.remove('hidden');
  $('view-register').classList.add('flex');
  hideRegisterError();
  resetPasswordVisibility();
  $('register-form').reset();
  const nameInput = $('register-name');
  if (nameInput) nameInput.focus();
}

export function showAppView(user) {
  setGuestHeader(false);
  $('view-login').classList.add('hidden');
  $('view-register').classList.add('hidden');
  $('app-header').classList.remove('hidden');
  $('view-app').classList.remove('hidden');

  const meta = ROLE_META[user.role];
  $('header-role-chip').textContent = `${meta.icon} ${meta.label}`;
  $('header-role-chip').className = 'hidden sm:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-extrabold border border-orange-500/30 bg-orange-500/10 text-orange-700 dark:text-orange-300';
  $('header-user-initials').textContent = initials(user.name);
  $('header-user-name').textContent = user.name;
  $('header-user-sub').textContent = user.role === 'seller' ? user.storeName : meta.desc;

  renderRoleNav(user);
  switchTab(ui.activeTab);
}

export function renderRoleNav(user) {
  const tabs = TABS_BY_ROLE[user.role] || [];
  if (!tabs.some(t => t.id === ui.activeTab)) ui.activeTab = tabs[0] ? tabs[0].id : null;

  $('role-nav').innerHTML = tabs.map(tab => {
    const active = tab.id === ui.activeTab;
    return `
      <button type="button" role="tab" data-tab="${tab.id}" aria-selected="${active}"
        onclick="switchTab('${tab.id}')"
        class="ios-tap shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${active ? 'ios-segment-active' : 'ios-segment-inactive'}">
        <span aria-hidden="true">${tab.icon}</span><span>${tab.label}</span>
      </button>`;
  }).join('');
}

export function switchTab(tabId) {
  const user = currentUser();
  if (!user) { showLoginView(); return; }
  const allowed = (TABS_BY_ROLE[user.role] || []).some(t => t.id === tabId);
  if (!allowed) {
    toast('Akses ditolak untuk halaman tersebut.', 'error');
    return;
  }

  ui.activeTab = tabId;
  document.querySelectorAll('#role-nav [data-tab]').forEach(btn => {
    const active = btn.getAttribute('data-tab') === tabId;
    btn.setAttribute('aria-selected', String(active));
    btn.className = `ios-tap shrink-0 flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-bold transition-all duration-200 ${active ? 'ios-segment-active' : 'ios-segment-inactive'}`;
  });

  ['catalog', 'seller', 'admin-users', 'admin-settings'].forEach(id => {
    const section = $('section-' + id);
    if (section) section.classList.toggle('hidden', id !== tabId);
  });

  if (tabId === 'catalog') renderCatalog();
  else if (tabId === 'seller') renderSellerPanel();
  else if (tabId === 'admin-users') renderAdminUsers();
  else if (tabId === 'admin-settings') renderAdminSettings();
}

/* ================================================================
   KATALOG PEMBELI
   ================================================================ */
export function getFilteredProducts() {
  const { search, category, featuredOnly, sortBy } = ui.catalog;
  const needle = search.trim().toLowerCase();

  const items = visibleProducts().filter(product => {
    const seller = sellerOf(product);
    const haystack = `${product.name} ${product.description} ${seller ? seller.storeName : ''}`.toLowerCase();
    const matchSearch = !needle || haystack.includes(needle);
    const matchCategory = category === 'Semua' || product.category === category;
    const matchFeatured = !featuredOnly || product.featured;
    return matchSearch && matchCategory && matchFeatured;
  });

  const sorters = {
    'featured': (a, b) => Number(b.featured) - Number(a.featured) || a.name.localeCompare(b.name),
    'price-asc': (a, b) => a.price - b.price,
    'price-desc': (a, b) => b.price - a.price,
    'stock-desc': (a, b) => b.stock - a.stock,
    'name-asc': (a, b) => a.name.localeCompare(b.name)
  };
  items.sort(sorters[sortBy] || sorters.featured);
  return items;
}

export function renderCategoryPills() {
  const categories = ['Semua', ...CATEGORIES];
  $('category-pills').innerHTML = categories.map(category => {
    const active = ui.catalog.category === category;
    return `
      <button type="button" onclick="setCatalogCategory('${category}')"
        class="ios-tap px-3.5 py-1.5 rounded-full text-xs font-extrabold border transition-colors ${active
          ? 'pill-active'
          : 'ios-glass-subtle ink-secondary hover:ink-primary'}">
        ${escapeHtml(category)}
      </button>`;
  }).join('');
}

export function renderCatalog() {
  renderCategoryPills();

  const heroNumber = $('catalog-hero-wa-number');
  if (heroNumber) heroNumber.textContent = formatPhone(db.settings.whatsappNumber || '');
  const heroLink = $('catalog-hero-wa');
  if (heroLink) {
    const number = normalizePhone(db.settings.whatsappNumber || '');
    heroLink.innerHTML = `WhatsApp Toko: <strong class="text-white font-mono">${escapeHtml(formatPhone(number))}</strong>`;
  }

  const items = getFilteredProducts();
  const total = visibleProducts().length;
  const grid = $('catalog-grid');
  const empty = $('catalog-empty');

  $('catalog-result-count').textContent = `Menampilkan ${items.length} dari ${total} produk`;

  if (items.length === 0) {
    grid.classList.add('hidden');
    grid.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }

  empty.classList.add('hidden');
  grid.classList.remove('hidden');

  grid.innerHTML = items.map((product, index) => {
    const seller = sellerOf(product);
    const outOfStock = Number(product.stock) <= 0;
    const lowStock = !outOfStock && Number(product.stock) <= 5;
    const image = safeImageUrl(product.imageUrl) || createLocalFoodSvg(product.category, product.name);

    const stockBadge = outOfStock
      ? '<span class="text-xs font-bold text-white bg-red-600 px-2.5 py-0.5 rounded-lg">Stok Habis</span>'
      : lowStock
        ? `<span class="text-xs font-extrabold text-slate-950 bg-amber-400 px-2.5 py-0.5 rounded-lg">Sisa ${Number(product.stock)}</span>`
        : `<span class="text-xs font-bold text-white bg-emerald-600 px-2.5 py-0.5 rounded-lg">Stok: ${Number(product.stock)}</span>`;

    return `
      <article style="animation-delay:${Math.min(index * 45, 360)}ms"
        class="animate-ios-card glass-card sheen ios-glass group rounded-3xl flex flex-col overflow-hidden ${outOfStock ? 'opacity-85' : ''}">
        <div class="img-veil relative aspect-[16/10] bg-slate-200 dark:bg-slate-800 overflow-hidden border-b ios-divider">
          <img src="${escapeHtml(image)}" alt="${escapeHtml(product.name)}"
            onerror="this.onerror=null;this.src='${createLocalFoodSvg(product.category, product.name)}';"
            class="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500 ${outOfStock ? 'grayscale-[50%]' : ''}" />
          <div class="absolute top-2.5 left-2.5 right-2.5 flex items-start justify-between gap-1.5 pointer-events-none">
            <span class="text-[11px] font-bold px-2.5 py-0.5 rounded-full border border-white/20 bg-slate-900/85 text-white backdrop-blur-md">${escapeHtml(product.category)}</span>
            ${product.featured ? '<span class="text-[11px] font-extrabold px-2.5 py-0.5 rounded-full bg-amber-400 text-slate-950 border border-amber-500">⭐ Unggulan</span>' : ''}
          </div>
        </div>
        <div class="p-4 flex-1 flex flex-col justify-between gap-4">
          <div class="space-y-1.5">
            <p class="text-[11px] font-extrabold uppercase tracking-wide text-emerald-700 dark:text-emerald-400 truncate">${escapeHtml(seller ? seller.storeName : 'BakolSego')}</p>
            <h3 class="font-display font-extrabold text-base ink-primary leading-snug">${escapeHtml(product.name)}</h3>
            <p class="text-xs font-medium ink-secondary leading-relaxed line-clamp-2" title="${escapeHtml(product.description)}">${escapeHtml(product.description)}</p>
          </div>
          <div class="space-y-3 pt-2.5 border-t ios-divider">
            <div class="flex items-center justify-between gap-2">
              <div>
                <span class="block text-[10px] font-extrabold uppercase tracking-wider ink-muted">Harga</span>
                <span class="price-tag font-display font-extrabold text-lg">${formatRupiah(product.price)}</span>
              </div>
              ${stockBadge}
            </div>
            ${outOfStock
              ? '<button type="button" disabled class="w-full py-2.5 px-4 rounded-2xl bg-slate-300 text-slate-700 dark:bg-slate-700 dark:text-slate-300 text-xs font-extrabold cursor-not-allowed">Stok Sementara Habis</button>'
              : `<button type="button" onclick="orderViaWhatsApp('${escapeHtml(product.id)}')"
                  class="ios-tap w-full py-2.5 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2">
                  <svg class="w-4 h-4 fill-current" viewBox="0 0 24 24" aria-hidden="true"><path d="M12.031 6.172c-3.181 0-5.767 2.586-5.768 5.766-.001 1.298.38 2.27 1.019 3.287l-.582 2.128 2.182-.573c.978.58 1.911.928 3.145.929 3.178 0 5.767-2.587 5.768-5.766.001-3.187-2.575-5.77-5.764-5.771zm3.392 8.244c-.144.405-.837.774-1.17.824-.299.045-.677.063-1.092-.069-.252-.08-.575-.187-.988-.365-1.739-.751-2.874-2.502-2.961-2.617-.087-.116-.708-.94-.708-1.793s.448-1.273.607-1.446c.159-.173.346-.217.462-.217l.332.006c.106.005.249-.04.39.298.144.347.491 1.2.534 1.287.043.087.072.188.014.304-.058.116-.087.188-.173.289l-.26.304c-.087.086-.177.18-.076.354.101.174.449.741.964 1.201.662.591 1.221.774 1.394.86s.274.072.376-.043c.101-.116.433-.506.549-.68.116-.173.231-.145.39-.087s1.011.477 1.184.564.289.13.332.202c.045.072.045.419-.1.824z"/></svg>
                  <span>Pesan via WhatsApp</span>
                </button>`}
          </div>
        </div>
      </article>`;
  }).join('');
}

export function setCatalogCategory(category) {
  ui.catalog.category = category;
  renderCatalog();
}

export function clearCatalogSearch() {
  ui.catalog.search = '';
  $('catalog-search').value = '';
  $('btn-clear-search').classList.add('hidden');
  renderCatalog();
}

export function resetCatalogFilters() {
  ui.catalog = { search: '', category: 'Semua', featuredOnly: false, sortBy: 'featured' };
  $('catalog-search').value = '';
  $('catalog-sort').value = 'featured';
  $('catalog-featured-only').checked = false;
  $('btn-clear-search').classList.add('hidden');
  renderCatalog();
}

export function orderViaWhatsApp(productId) {
  const buyer = currentUser();
  if (!buyer) {
    toast('Masuk atau daftar dulu untuk memesan.', 'info');
    showLoginView();
    return;
  }
  if (buyer.role !== 'buyer') {
    toast('Hanya akun pembeli yang bisa memesan lewat WhatsApp.', 'error');
    return;
  }

  const product = visibleProducts().find(p => p.id === productId);
  if (!product) { toast('Produk tidak tersedia atau sudah disembunyikan.', 'error'); return; }
  if (Number(product.stock) <= 0) { toast('Stok produk ini sedang habis.', 'error'); return; }

  const seller = sellerOf(product);
  const number = normalizePhone((seller && seller.phone) || db.settings.whatsappNumber || '');
  if (!number) { toast('Nomor WhatsApp penjual belum diatur.', 'error'); return; }

  const storeName = seller ? seller.storeName : db.settings.storeName;
  const message = `Halo ${storeName}, saya ${buyer.name} ingin memesan:\n` +
    `• Produk: *${product.name}*\n` +
    `• Kategori: ${product.category}\n` +
    `• Harga: ${formatRupiah(product.price)}\n` +
    `• Jumlah: 1 porsi\n\n` +
    `Apakah stok masih tersedia? Terima kasih.`;

  const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;
  const popup = window.open(url, '_blank', 'noopener,noreferrer');

  if (!popup || popup.closed || typeof popup.closed === 'undefined') {
    ui.waUrl = url;
    $('wa-preview-text').value = message;
    const link = $('wa-open-link');
    link.href = url;
    link.textContent = `Buka tautan wa.me/${number} (${formatPhone(number)}) ↗`;
    openModal('wa-modal');
    toast('Popup diblokir — gunakan pratinjau pesan.', 'info');
  } else {
    toast(`Membuka WhatsApp ${formatPhone(number)} untuk "${product.name}"...`, 'success');
  }
}

export function copyWaPreview() {
  const textarea = $('wa-preview-text');
  if (!textarea) return;
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);
  let copied = false;
  try { copied = document.execCommand('copy'); } catch (err) { copied = false; }
  if (!copied && navigator.clipboard) {
    navigator.clipboard.writeText(textarea.value).then(
      () => toast('Pesan berhasil disalin.', 'success'),
      () => toast('Gagal menyalin. Salin manual dari kotak pesan.', 'error')
    );
    return;
  }
  toast(copied ? 'Pesan berhasil disalin.' : 'Gagal menyalin. Salin manual dari kotak pesan.', copied ? 'success' : 'error');
}

/* ================================================================
   SELLER
   ================================================================ */
function statCard(label, value, tone = 'slate', hint = '') {
  const tones = {
    slate: 'text-slate-900 dark:text-white',
    orange: 'text-orange-700 dark:text-orange-300',
    emerald: 'text-emerald-700 dark:text-emerald-400',
    amber: 'text-amber-600 dark:text-amber-400',
    red: 'text-red-600 dark:text-red-400'
  };
  return `
    <div class="ios-glass stat-card stat-${escapeHtml(tone)} rounded-2xl p-4 pl-5">
      <div class="flex items-center gap-2">
        <span class="stat-dot" aria-hidden="true"></span>
        <p class="text-[11px] font-extrabold uppercase tracking-wider ink-muted">${escapeHtml(label)}</p>
      </div>
      <p class="font-display text-2xl font-extrabold ${tones[tone] || tones.slate} mt-1.5 leading-none tabular-nums">${value}</p>
      ${hint ? `<p class="text-[11px] font-medium ink-muted mt-1.5">${hint}</p>` : ''}
    </div>`;
}

export function renderSellerPanel() {
  const user = ensureRole('seller');
  if (!user) return;

  $('seller-store-name').textContent = user.storeName || 'Anda';
  const all = productsForSeller(user.id);
  const activeCount = all.filter(p => p.active).length;
  const lowStock = all.filter(p => p.stock > 0 && p.stock <= 5).length;
  const outOfStock = all.filter(p => p.stock <= 0).length;
  const inventoryValue = all.reduce((sum, p) => sum + (Number(p.price) || 0) * (Number(p.stock) || 0), 0);

  $('seller-stats').innerHTML = [
    statCard('Total Produk', all.length),
    statCard('Tayang', activeCount, 'emerald'),
    statCard('Stok Menipis', lowStock, 'amber', 'Sisa 1–5'),
    statCard('Stok Habis', outOfStock, 'red'),
    statCard('Nilai Inventaris', formatRupiah(inventoryValue), 'orange')
  ].join('');

  const needle = ui.sellerSearch.trim().toLowerCase();
  const rows = all
    .filter(p => !needle || `${p.name} ${p.category}`.toLowerCase().includes(needle))
    .sort((a, b) => Number(b.active) - Number(a.active) || a.name.localeCompare(b.name));

  $('seller-product-count').textContent = `${rows.length} dari ${all.length} produk`;

  const tbody = $('seller-product-tbody');
  const empty = $('seller-empty');
  if (rows.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = rows.map(product => {
    const stockBadge = Number(product.stock) <= 0
      ? '<span class="text-[11px] font-bold text-white bg-red-600 px-2 py-0.5 rounded-lg">Habis</span>'
      : Number(product.stock) <= 5
        ? `<span class="text-[11px] font-extrabold text-slate-950 bg-amber-400 px-2 py-0.5 rounded-lg">${Number(product.stock)}</span>`
        : `<span class="text-[11px] font-bold text-white bg-emerald-600 px-2 py-0.5 rounded-lg">${Number(product.stock)}</span>`;

    return `
      <tr class="admin-row align-middle">
        <td class="px-4 py-3">
          <div class="flex items-center gap-3 min-w-0">
            <img src="${escapeHtml(safeImageUrl(product.imageUrl) || createLocalFoodSvg(product.category, product.name))}" alt=""
              class="w-12 h-9 rounded-lg object-cover border ios-divider bg-slate-200 shrink-0" />
            <div class="min-w-0">
              <p class="font-bold ink-primary truncate max-w-[220px]">${escapeHtml(product.name)}</p>
              <p class="text-[11px] ink-muted">Diperbarui ${escapeHtml(formatDateTime(product.updatedAt))}</p>
            </div>
          </div>
        </td>
        <td class="px-4 py-3"><span class="text-xs font-bold ink-secondary">${escapeHtml(product.category)}</span></td>
        <td class="px-4 py-3"><span class="text-sm font-extrabold ink-price whitespace-nowrap">${formatRupiah(product.price)}</span></td>
        <td class="px-4 py-3">${stockBadge}</td>
        <td class="px-4 py-3">
          <div class="flex flex-wrap gap-1">
            <span class="text-[11px] font-bold px-2 py-0.5 rounded-lg ${product.active ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'}">${product.active ? 'Tayang' : 'Draf'}</span>
            ${product.featured ? '<span class="text-[11px] font-bold px-2 py-0.5 rounded-lg bg-amber-400 text-slate-950">⭐</span>' : ''}
          </div>
        </td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <button type="button" onclick="openProductModal('${escapeHtml(product.id)}')" class="ios-tap px-2.5 py-1.5 rounded-lg ios-glass-subtle text-[11px] font-extrabold ink-primary">Edit</button>
          <button type="button" onclick="confirmDeleteProduct('${escapeHtml(product.id)}')" class="ios-tap px-2.5 py-1.5 rounded-lg bg-red-600 text-white text-[11px] font-extrabold">Hapus</button>
        </td>
      </tr>`;
  }).join('');
}

/* ================================================================
   MODAL PRODUK
   ================================================================ */
export function updateProductImagePreview() {
  const preview = $('product-image-preview');
  if (!preview) return;
  const typed = safeImageUrl($('product-image').value);
  const category = $('product-category').value;
  const name = $('product-name').value.trim() || category;
  preview.src = typed || createLocalFoodSvg(category, name);
}

export function renderPresetButtons() {
  $('product-preset-list').innerHTML = CATEGORIES.map(category => `
    <button type="button" onclick="applyImagePreset('${category}')" class="ios-tap px-2.5 py-1.5 rounded-xl ios-glass-subtle text-[11px] font-bold ink-primary">
      ${escapeHtml(category)}
    </button>`).join('');
}

export function applyImagePreset(category) {
  $('product-category').value = category;
  $('product-image').value = createLocalFoodSvg(category, $('product-name').value.trim() || category);
  updateProductImagePreview();
}

export function openProductModal(productId = null) {
  const user = ensureRole('seller');
  if (!user) return;

  let product = null;
  if (productId) {
    product = db.products.find(p => p.id === productId && p.sellerId === user.id);
    if (!product) { toast('Produk tidak ditemukan atau bukan milik Anda.', 'error'); return; }
  }

  ui.editingProductId = product ? product.id : null;
  $('product-modal-title').textContent = product ? 'Edit Produk' : 'Tambah Produk';
  $('product-form').reset();
  $('product-form-error').classList.add('hidden');
  $('product-error-list').innerHTML = '';

  $('product-id').value = product ? product.id : '';
  $('product-name').value = product ? product.name : '';
  $('product-category').value = product ? product.category : CATEGORIES[0];
  $('product-price').value = product ? String(product.price) : '';
  $('product-stock').value = product ? String(product.stock) : '';
  $('product-desc').value = product ? product.description : '';
  $('product-image').value = product ? (product.imageUrl || '') : '';
  $('product-featured').checked = product ? Boolean(product.featured) : false;
  $('product-active').checked = product ? Boolean(product.active) : true;

  renderPresetButtons();
  updateProductImagePreview();
  openModal('product-modal');
}

function validateProductInput() {
  const errors = [];
  const name = $('product-name').value.trim();
  const category = $('product-category').value;
  const price = parseInteger($('product-price').value);
  const stock = parseInteger($('product-stock').value);
  const description = $('product-desc').value.trim();
  const imageUrl = $('product-image').value.trim();

  if (name.length < 3 || name.length > 80) errors.push('Nama produk harus 3–80 karakter.');
  if (!CATEGORIES.includes(category)) errors.push('Kategori produk tidak valid.');
  if (price === null || price < 0 || price > 10000000) errors.push('Harga harus bilangan bulat antara 0 dan 10.000.000.');
  if (stock === null || stock < 0 || stock > 10000) errors.push('Stok harus bilangan bulat antara 0 dan 10.000.');
  if (description.length < 10 || description.length > 500) errors.push('Deskripsi harus 10–500 karakter.');
  if (imageUrl && !safeImageUrl(imageUrl)) errors.push('URL gambar harus diawali http://, https://, atau data:image/.');

  const duplicate = db.products.some(p =>
    p.sellerId === currentUser().id &&
    p.id !== ui.editingProductId &&
    p.name.trim().toLowerCase() === name.toLowerCase()
  );
  if (duplicate) errors.push('Anda sudah memiliki produk dengan nama yang sama.');

  return { errors, values: { name, category, price, stock, description, imageUrl } };
}

function showFormErrors(kind, errors) {
  const box = $(kind + '-form-error');
  const list = $(kind + '-error-list');
  list.innerHTML = errors.map(message => `<li>${escapeHtml(message)}</li>`).join('');
  box.classList.remove('hidden');
}

export function handleProductSubmit(event) {
  event.preventDefault();
  const user = ensureRole('seller');
  if (!user) return;

  const { errors, values } = validateProductInput();
  if (errors.length > 0) {
    showFormErrors('product', errors);
    return;
  }

  const payload = {
    ...values,
    featured: $('product-featured').checked,
    active: $('product-active').checked
  };

  if (ui.editingProductId) {
    const product = updateProduct(ui.editingProductId, user.id, payload);
    if (!product) { toast('Produk tidak ditemukan.', 'error'); return; }
    logAction('product.update', `Memperbarui produk "${values.name}".`);
    toast('Produk berhasil diperbarui.', 'success');
  } else {
    createProduct(user.id, payload);
    logAction('product.create', `Menambahkan produk "${values.name}".`);
    toast('Produk baru berhasil ditayangkan.', 'success');
  }

  saveDatabase();
  closeModal('product-modal');
  ui.editingProductId = null;
  renderSellerPanel();
}

export function confirmDeleteProduct(productId) {
  const user = ensureRole('seller');
  if (!user) return;
  const product = db.products.find(p => p.id === productId && p.sellerId === user.id);
  if (!product) { toast('Produk tidak ditemukan atau bukan milik Anda.', 'error'); return; }

  askConfirm({
    title: 'Hapus produk?',
    message: `"${product.name}" akan dihapus permanen dari katalog Anda.`,
    okText: 'Ya, Hapus'
  }, () => {
    const removed = deleteProduct(productId, user.id);
    if (!removed) return;
    logAction('product.delete', `Menghapus produk "${product.name}".`);
    saveDatabase();
    renderSellerPanel();
    toast('Produk dihapus.', 'success');
  });
}

/* ================================================================
   ADMIN — KELOLA USER
   ================================================================ */
export function renderAdminUsers() {
  const admin = ensureRole('admin');
  if (!admin) return;

  const counts = { admin: 0, seller: 0, buyer: 0 };
  db.users.forEach(user => { counts[user.role] = (counts[user.role] || 0) + 1; });

  $('admin-stats').innerHTML = [
    statCard('Total User', db.users.length),
    statCard('Seller', counts.seller, 'orange'),
    statCard('Pembeli', counts.buyer, 'emerald'),
    statCard('Admin', counts.admin, 'amber')
  ].join('');

  const needle = ui.adminSearch.trim().toLowerCase();
  const rows = db.users
    .filter(user => {
      const matchRole = ui.adminRole === 'all' || user.role === ui.adminRole;
      const haystack = `${user.name} ${user.email} ${user.storeName || ''}`.toLowerCase();
      return matchRole && (!needle || haystack.includes(needle));
    })
    .sort((a, b) => a.role.localeCompare(b.role) || a.name.localeCompare(b.name));

  $('admin-user-count').textContent = `${rows.length} dari ${db.users.length} user`;

  const tbody = $('admin-user-tbody');
  const empty = $('admin-empty');
  if (rows.length === 0) {
    tbody.innerHTML = '';
    empty.classList.remove('hidden');
    return;
  }
  empty.classList.add('hidden');

  tbody.innerHTML = rows.map(user => {
    const isSelf = user.id === admin.id;
    const productTotal = user.role === 'seller' ? productCountFor(user.id) : 0;
    const roleBadge = user.role === 'admin'
      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
      : user.role === 'seller'
        ? 'bg-orange-600 text-white'
        : 'bg-emerald-600 text-white';

    return `
      <tr class="admin-row align-middle">
        <td class="px-4 py-3">
          <div class="flex items-center gap-3 min-w-0">
            <div class="w-9 h-9 rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900 flex items-center justify-center text-xs font-extrabold shrink-0">${escapeHtml(initials(user.name))}</div>
            <div class="min-w-0">
              <p class="font-bold ink-primary truncate max-w-[220px]">${escapeHtml(user.name)}${isSelf ? ' <span class="text-[10px] font-extrabold text-orange-600">(Anda)</span>' : ''}</p>
              <p class="text-[11px] ink-muted truncate max-w-[220px]">${escapeHtml(user.email)}</p>
            </div>
          </div>
        </td>
        <td class="px-4 py-3"><span class="text-[11px] font-extrabold px-2 py-0.5 rounded-lg ${roleBadge}">${escapeHtml(ROLE_META[user.role].label)}</span></td>
        <td class="px-4 py-3">
          <p class="text-xs font-bold ink-secondary whitespace-nowrap">${escapeHtml(formatPhone(user.phone))}</p>
          <p class="text-[11px] ink-muted truncate max-w-[160px]">${escapeHtml(user.role === 'seller' ? (user.storeName || '—') : ROLE_META[user.role].desc)}</p>
        </td>
        <td class="px-4 py-3"><span class="text-xs font-bold ink-secondary">${user.role === 'seller' ? productTotal + ' produk' : '—'}</span></td>
        <td class="px-4 py-3">
          <span class="text-[11px] font-bold px-2 py-0.5 rounded-lg ${user.active ? 'bg-emerald-600 text-white' : 'bg-slate-400 text-white'}">${user.active ? 'Aktif' : 'Nonaktif'}</span>
        </td>
        <td class="px-4 py-3 text-right whitespace-nowrap">
          <button type="button" onclick="openUserModal('${escapeHtml(user.id)}')" class="ios-tap px-2.5 py-1.5 rounded-lg ios-glass-subtle text-[11px] font-extrabold ink-primary">Edit</button>
          <button type="button" onclick="toggleUserActive('${escapeHtml(user.id)}')" ${isSelf ? 'disabled title="Tidak dapat menonaktifkan akun sendiri"' : ''}
            class="ios-tap px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold ${isSelf ? 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed' : 'bg-amber-400 text-slate-950'}">${user.active ? 'Nonaktifkan' : 'Aktifkan'}</button>
          <button type="button" onclick="confirmDeleteUser('${escapeHtml(user.id)}')" ${isSelf ? 'disabled title="Tidak dapat menghapus akun sendiri"' : ''}
            class="ios-tap px-2.5 py-1.5 rounded-lg text-[11px] font-extrabold ${isSelf ? 'bg-slate-200 text-slate-400 dark:bg-slate-700 dark:text-slate-500 cursor-not-allowed' : 'bg-red-600 text-white'}">Hapus</button>
        </td>
      </tr>`;
  }).join('');
}

/* ================================================================
   MODAL USER
   ================================================================ */
export function syncUserRoleFields() {
  const role = $('user-role').value;
  $('user-store-wrap').classList.toggle('hidden', role !== 'seller');
  const isEdit = Boolean(ui.editingUserId);
  $('user-active-wrap').classList.toggle('hidden', !isEdit);
  $('user-password-label').innerHTML = isEdit
    ? 'Password Baru <span class="text-[10px] font-bold text-slate-500">(opsional)</span>'
    : 'Password Awal <span class="text-red-500">*</span>';
  $('user-password-hint').textContent = isEdit
    ? 'Kosongkan bila tidak ingin mengubah password. Isi untuk mereset password.'
    : 'Minimal 6 karakter. Disimpan sebagai hash SHA-256.';
}

export function openUserModal(userId = null) {
  const admin = ensureRole('admin');
  if (!admin) return;

  let user = null;
  if (userId) {
    user = findUser(userId);
    if (!user) { toast('User tidak ditemukan.', 'error'); return; }
  }

  ui.editingUserId = user ? user.id : null;
  $('user-modal-title').textContent = user ? 'Edit User' : 'Tambah User';
  $('user-form').reset();
  $('user-form-error').classList.add('hidden');
  $('user-error-list').innerHTML = '';

  $('user-id').value = user ? user.id : '';
  $('user-name').value = user ? user.name : '';
  $('user-email').value = user ? user.email : '';
  $('user-role').value = user ? user.role : 'buyer';
  $('user-phone').value = user ? formatPhone(user.phone) : '';
  $('user-store').value = user ? (user.storeName || '') : '';
  $('user-password').value = '';
  $('user-active').checked = user ? Boolean(user.active) : true;

  syncUserRoleFields();
  openModal('user-modal');
}

function validateUserInput() {
  const errors = [];
  const name = $('user-name').value.trim();
  const email = $('user-email').value.trim().toLowerCase();
  const role = $('user-role').value;
  const phone = normalizePhone($('user-phone').value.trim());
  const storeName = $('user-store').value.trim();
  const password = $('user-password').value;

  const editingUser = ui.editingUserId ? findUser(ui.editingUserId) : null;

  if (name.length < 3 || name.length > 60) errors.push('Nama harus 3–60 karakter.');
  if (!GMAIL_PATTERN.test(email)) errors.push('Email wajib memakai format nama@gmail.com.');
  const duplicate = db.users.some(u => u.email.toLowerCase() === email && (!editingUser || u.id !== editingUser.id));
  if (duplicate) errors.push('Email sudah digunakan user lain.');
  if (!['admin', 'seller', 'buyer'].includes(role)) errors.push('Peran tidak valid.');
  if (phone.length < 9 || phone.length > 15) errors.push('Nomor WhatsApp harus 9–15 digit (contoh 0812-3456-7890).');
  if (role === 'seller' && (storeName.length < 2 || storeName.length > 60)) errors.push('Nama toko wajib diisi (2–60 karakter) untuk seller.');
  if (!editingUser && password.length < 6) errors.push('Password awal minimal 6 karakter.');
  if (editingUser && password && password.length < 6) errors.push('Password baru minimal 6 karakter.');

  return { errors, values: { name, email, role, phone, storeName, password } };
}

export function handleUserSubmit(event) {
  event.preventDefault();
  const admin = ensureRole('admin');
  if (!admin) return;

  const { errors, values } = validateUserInput();
  if (errors.length > 0) {
    showFormErrors('user', errors);
    return;
  }

  if (ui.editingUserId) {
    const user = findUser(ui.editingUserId);
    if (!user) { toast('User tidak ditemukan.', 'error'); return; }

    const becomesNonSeller = values.role !== 'seller' && productCountFor(user.id) > 0;
    if (becomesNonSeller) {
      toast('Ubah peran ditolak: seller ini masih memiliki produk.', 'error');
      return;
    }

    updateUser(user.id, { ...values, active: $('user-active').checked });
    logAction('user.update', `Memperbarui user "${values.name}" (${ROLE_META[values.role].label}).${values.password ? ' Password direset.' : ''}`);
    toast('Data user berhasil diperbarui.', 'success');
  } else {
    createUser(values);
    logAction('user.create', `Membuat user "${values.name}" sebagai ${ROLE_META[values.role].label}.`);
    toast('User baru berhasil dibuat.', 'success');
  }

  saveDatabase();
  closeModal('user-modal');
  ui.editingUserId = null;
  renderAdminUsers();
}

export function toggleUserActive(userId) {
  const admin = ensureRole('admin');
  if (!admin) return;
  if (userId === admin.id) { toast('Anda tidak dapat menonaktifkan akun sendiri.', 'error'); return; }
  const user = findUser(userId);
  if (!user) return;

  const nextActive = !user.active;
  setUserActive(user.id, nextActive);
  logAction('user.toggle', `${nextActive ? 'Mengaktifkan' : 'Menonaktifkan'} akun "${user.name}".`);
  saveDatabase();
  renderAdminUsers();
  toast(`Akun ${user.name} ${nextActive ? 'diaktifkan' : 'dinonaktifkan'}.`, nextActive ? 'success' : 'info');
}

export function confirmDeleteUser(userId) {
  const admin = ensureRole('admin');
  if (!admin) return;
  if (userId === admin.id) { toast('Anda tidak dapat menghapus akun sendiri.', 'error'); return; }
  const user = findUser(userId);
  if (!user) return;

  const products = productCountFor(user.id);
  if (products > 0) {
    toast(`Tidak dapat menghapus: ${user.name} masih memiliki ${products} produk. Nonaktifkan akun atau hapus produknya dulu.`, 'error');
    return;
  }

  askConfirm({
    title: 'Hapus user?',
    message: `Akun "${user.name}" (${user.email}) akan dihapus permanen dan tidak bisa login lagi.`,
    okText: 'Ya, Hapus'
  }, () => {
    const removed = removeUser(userId);
    if (!removed) return;
    logAction('user.delete', `Menghapus user "${user.name}".`);
    saveDatabase();
    renderAdminUsers();
    toast('User dihapus.', 'success');
  });
}

/* ================================================================
   ADMIN — PENGATURAN
   ================================================================ */
export function renderAdminSettings() {
  const admin = ensureRole('admin');
  if (!admin) return;

  $('settings-store-name').value = db.settings.storeName || 'BakolSego';
  $('settings-wa').value = formatPhone(db.settings.whatsappNumber || '');
  updateWaPreview();
  renderAuditLog();
}

export function updateWaPreview() {
  const digits = normalizePhone($('settings-wa').value);
  $('settings-wa-preview').textContent = digits
    ? `Nomor tersimpan: ${formatPhone(digits)} — dipakai bila seller tidak punya nomor.`
    : 'Nomor belum diisi.';
}

export function saveSettings() {
  const admin = ensureRole('admin');
  if (!admin) return;

  const storeName = $('settings-store-name').value.trim();
  const phone = normalizePhone($('settings-wa').value);

  if (storeName.length < 2 || storeName.length > 60) { toast('Nama toko harus 2–60 karakter.', 'error'); return; }
  if (phone.length < 9 || phone.length > 15) { toast('Nomor WhatsApp tidak valid (9–15 digit).', 'error'); return; }

  updateSettings({ storeName, whatsappNumber: phone });
  logAction('settings.update', `Memperbarui pengaturan toko (${storeName}, ${formatPhone(phone)}).`);
  saveDatabase();
  renderAdminSettings();
  toast('Pengaturan berhasil disimpan.', 'success');
}

export function renderAuditLog() {
  const entries = db.auditLog.slice(0, 40);
  const list = $('audit-list');
  if (entries.length === 0) {
    list.innerHTML = '<li class="text-xs font-medium ink-muted">Belum ada aktivitas.</li>';
    return;
  }
  list.innerHTML = entries.map(entry => `
    <li class="p-3 rounded-2xl ios-glass-subtle">
      <div class="flex items-start justify-between gap-2">
        <p class="text-xs font-extrabold ink-primary">${escapeHtml(entry.actorName)} <span class="font-mono text-[10px] font-bold text-orange-600 dark:text-orange-300">${escapeHtml(entry.action)}</span></p>
        <span class="text-[10px] font-semibold ink-muted whitespace-nowrap">${escapeHtml(formatDateTime(entry.at))}</span>
      </div>
      <p class="text-[11px] font-medium ink-secondary mt-0.5">${escapeHtml(entry.detail)}</p>
    </li>`).join('');
}

export function resetDemoData() {
  const admin = ensureRole('admin');
  if (!admin) return;

  askConfirm({
    title: 'Reset data demo?',
    message: 'Seluruh user dan produk akan dikembalikan ke data dummy awal. Perubahan yang sudah dibuat akan hilang.',
    okText: 'Ya, Reset'
  }, () => {
    resetDemo(admin.id);
    ui.activeTab = null;
    ui.catalog = { search: '', category: 'Semua', featuredOnly: false, sortBy: 'featured' };
    renderApp();
    toast('Data demo berhasil direset.', 'success');
  });
}

/* ================================================================
   LOGIN
   ================================================================ */
export function showLoginError(message) {
  $('login-error-text').textContent = message;
  $('login-error').classList.remove('hidden');
}

export function hideLoginError() {
  $('login-error').classList.add('hidden');
}

const GMAIL_PATTERN = /^[a-z0-9][a-z0-9._%+-]*@gmail\.com$/i;

export function showRegisterError(message) {
  $('register-error-text').textContent = message;
  $('register-error').classList.remove('hidden');
}

export function hideRegisterError() {
  $('register-error').classList.add('hidden');
}

export function handleRegisterSubmit(event) {
  event.preventDefault();
  const name = $('register-name').value.trim();
  const email = $('register-email').value.trim().toLowerCase();
  const phone = normalizePhone($('register-phone').value.trim());
  const password = $('register-password').value;

  const errors = [];
  if (name.length < 2 || name.length > 60) errors.push('Nama wajib 2–60 karakter.');
  if (!GMAIL_PATTERN.test(email)) {
    errors.push('Email wajib memakai format nama@gmail.com.');
  } else if (db.users.some(u => u.email.toLowerCase() === email)) {
    errors.push('Email ini sudah terdaftar. Silakan masuk.');
  }
  if (!/^[0-9]{10,15}$/.test(phone)) errors.push('Nomor WhatsApp tidak valid (10–15 digit).');
  if (password.length < 6) errors.push('Password minimal 6 karakter.');

  if (errors.length) {
    showRegisterError(errors.join(' '));
    return;
  }

  const user = createUser({ name, email, phone, password, role: 'buyer' });
  startSession(user.id);
  logAction('register', `Mendaftar akun pembeli baru (${email}).`);
  saveDatabase();
  hideRegisterError();
  $('register-form').reset();
  ui.activeTab = null;
  renderApp();
  toast(`Akun berhasil dibuat. Selamat datang, ${name.split(' ')[0]}!`, 'success');
}

function applyPasswordVisibility({ inputId, toggleId, openId, offId }, show) {
  const input = $(inputId);
  const toggle = $(toggleId);
  if (!input || !toggle) return;

  input.type = show ? 'text' : 'password';
  toggle.setAttribute('aria-pressed', String(show));
  const label = show ? 'Sembunyikan kata sandi' : 'Tampilkan kata sandi';
  toggle.setAttribute('aria-label', label);
  toggle.title = label;
  const open = $(openId);
  const off = $(offId);
  if (open) open.classList.toggle('hidden', show);
  if (off) off.classList.toggle('hidden', !show);
}

const LOGIN_PASSWORD = { inputId: 'login-password', toggleId: 'login-password-toggle', openId: 'login-eye-open', offId: 'login-eye-off' };
const REGISTER_PASSWORD = { inputId: 'register-password', toggleId: 'register-password-toggle', openId: 'register-eye-open', offId: 'register-eye-off' };

export function togglePasswordVisibility() {
  const show = $('login-password').type === 'password';
  applyPasswordVisibility(LOGIN_PASSWORD, show);
  $('login-password').focus();
}

export function toggleRegisterPasswordVisibility() {
  const show = $('register-password').type === 'password';
  applyPasswordVisibility(REGISTER_PASSWORD, show);
  $('register-password').focus();
}

export function resetPasswordVisibility() {
  applyPasswordVisibility(LOGIN_PASSWORD, false);
  applyPasswordVisibility(REGISTER_PASSWORD, false);
}

export function login(email, password) {
  const result = authenticate(email, password);
  if (result.error) {
    showLoginError(result.error);
    return false;
  }
  const user = result.user;
  startSession(user.id);
  logAction('login', `Masuk sebagai ${ROLE_META[user.role].label}.`);
  saveDatabase();
  hideLoginError();
  $('login-form').reset();
  ui.activeTab = null;
  renderApp();
  toast(`Selamat datang, ${user.name.split(' ')[0]}!`, 'success');
  return true;
}

export function handleLoginSubmit(event) {
  event.preventDefault();
  const email = $('login-email').value.trim().toLowerCase();
  const password = $('login-password').value;

  if (!email || !password) {
    showLoginError('Email dan password wajib diisi.');
    return;
  }
  if (!GMAIL_PATTERN.test(email)) {
    showLoginError('Email wajib memakai format nama@gmail.com.');
    return;
  }
  login(email, password);
}

export function logout() {
  if (currentUser()) {
    logAction('logout', 'Keluar dari aplikasi.');
    saveDatabase();
  }
  endSession();
  ui.activeTab = null;
  ui.confirmCallback = null;
  ['product-modal', 'user-modal', 'confirm-modal', 'wa-modal'].forEach(closeModal);
  renderApp();
  toast('Anda telah keluar.', 'info');
}

/* Dipakai tombol Escape di main.js */
export function closeAllModals() {
  ['product-modal', 'user-modal', 'confirm-modal', 'wa-modal'].forEach(closeModal);
  ui.confirmCallback = null;
  document.body.style.overflow = '';
}

