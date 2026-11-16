/* ================================================================
   MAIN — bootstrap aplikasi Vite
   ================================================================ */

import { loadDatabase, readSession, hashPassword, sha256Hex, seedDatabase } from './store.js';
import * as UI from './ui.js';

const $ = (id) => document.getElementById(id);

/* ================================================================
   EVENT BINDING
   ================================================================ */
export function bindEvents() {
  $('login-form').addEventListener('submit', UI.handleLoginSubmit);
  $('login-password-toggle').addEventListener('click', UI.togglePasswordVisibility);
  $('register-form').addEventListener('submit', UI.handleRegisterSubmit);
  $('register-password-toggle').addEventListener('click', UI.toggleRegisterPasswordVisibility);
  $('product-form').addEventListener('submit', UI.handleProductSubmit);
  $('user-form').addEventListener('submit', UI.handleUserSubmit);

  $('catalog-search').addEventListener('input', (event) => {
    UI.ui.catalog.search = event.target.value;
    $('btn-clear-search').classList.toggle('hidden', event.target.value.length === 0);
    UI.renderCatalog();
  });
  $('catalog-sort').addEventListener('change', (event) => {
    UI.ui.catalog.sortBy = event.target.value;
    UI.renderCatalog();
  });
  $('catalog-featured-only').addEventListener('change', (event) => {
    UI.ui.catalog.featuredOnly = event.target.checked;
    UI.renderCatalog();
  });
  $('seller-search').addEventListener('input', (event) => {
    UI.ui.sellerSearch = event.target.value;
    UI.renderSellerPanel();
  });
  $('admin-user-search').addEventListener('input', (event) => {
    UI.ui.adminSearch = event.target.value;
    UI.renderAdminUsers();
  });
  $('admin-role-filter').addEventListener('change', (event) => {
    UI.ui.adminRole = event.target.value;
    UI.renderAdminUsers();
  });
  $('settings-wa').addEventListener('input', UI.updateWaPreview);
  $('user-role').addEventListener('change', UI.syncUserRoleFields);
  $('product-image-file').addEventListener('change', UI.handleProductImageSelect);
  $('product-name').addEventListener('input', () => {
    if (!$('product-image').value) UI.updateProductImagePreview();
  });
  $('product-category').addEventListener('change', () => {
    if (!$('product-image').value) UI.updateProductImagePreview();
  });
  $('btn-confirm-ok').addEventListener('click', UI.runConfirm);

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') UI.closeAllModals();
  });
}

/* ================================================================
   INISIALISASI
   ================================================================ */
export function initApp() {
  UI.initTheme();
  loadDatabase();
  readSession();
  bindEvents();
  registerGlobals();
  UI.renderApp();
}

/*
 * Atribut onclick di HTML (dan di template string UI) memanggil fungsi global.
 * ES module tidak menaruh fungsinya di window, jadi dijembatani di sini.
 * Dipanggil saat init agar tetap menempel ke window yang aktif (mis. setelah reload).
 */
export function registerGlobals() {
  Object.assign(window, {
    initApp,
    login: UI.login,
    logout: UI.logout,
    showLogin: UI.showLoginView,
    showRegister: UI.showRegisterView,
    showGuest: UI.showGuestView,
    switchTab: UI.switchTab,
    toggleTheme: UI.toggleTheme,
    openProductModal: UI.openProductModal,
    closeModal: UI.closeModal,
    clearProductImage: UI.clearProductImage,
    confirmDeleteProduct: UI.confirmDeleteProduct,
    openUserModal: UI.openUserModal,
    toggleUserActive: UI.toggleUserActive,
    confirmDeleteUser: UI.confirmDeleteUser,
    saveSettings: UI.saveSettings,
    resetDemoData: UI.resetDemoData,
    orderViaWhatsApp: UI.orderViaWhatsApp,
    copyWaPreview: UI.copyWaPreview,
    setCatalogCategory: UI.setCatalogCategory,
    clearCatalogSearch: UI.clearCatalogSearch,
    resetCatalogFilters: UI.resetCatalogFilters,
    runConfirm: UI.runConfirm,
    togglePasswordVisibility: UI.togglePasswordVisibility,
    toggleRegisterPasswordVisibility: UI.toggleRegisterPasswordVisibility,

    /* Dipakai untuk pengujian dan debugging dari konsol. */
    renderApp: UI.renderApp,
    renderCatalog: UI.renderCatalog,
    renderSellerPanel: UI.renderSellerPanel,
    renderAdminUsers: UI.renderAdminUsers,
    renderAdminSettings: UI.renderAdminSettings,
    handleProductSubmit: UI.handleProductSubmit,
    handleUserSubmit: UI.handleUserSubmit,
    handleRegisterSubmit: UI.handleRegisterSubmit,
    askConfirm: UI.askConfirm,
    hashPassword,
    sha256Hex,
    seedDatabase
  });
}

registerGlobals();

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initApp);
} else {
  initApp();
}
