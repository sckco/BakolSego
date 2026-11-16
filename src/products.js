/* ================================================================
   PRODUK — kategori, gambar preset, dan data dummy katalog
   ================================================================ */

export const CATEGORIES = ['Makanan Berat', 'Minuman', 'Camilan'];

/**
 * Membuat gambar makanan lokal (data URI SVG) tanpa aset eksternal.
 * Dipakai sebagai gambar bawaan dan fallback saat URL gambar gagal dimuat.
 */
export function createLocalFoodSvg(category, label) {
  const themes = {
    'Makanan Berat': { bg1: '#FEF3C7', bg2: '#FDE68A', accent: '#EA580C', secondary: '#059669' },
    'Minuman': { bg1: '#ECFDF5', bg2: '#D1FAE5', accent: '#059669', secondary: '#D97706' },
    'Camilan': { bg1: '#FFF7ED', bg2: '#FFEDD5', accent: '#D97706', secondary: '#EA580C' }
  };
  const t = themes[category] || themes['Makanan Berat'];
  const safeLabel = String(label || category || '').replace(/[<>&"']/g, '').slice(0, 34);
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="320" height="200" viewBox="0 0 320 200">
      <defs><linearGradient id="g" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${t.bg1}"/><stop offset="100%" stop-color="${t.bg2}"/>
      </linearGradient></defs>
      <rect width="320" height="200" fill="url(#g)"/>
      <circle cx="28" cy="28" r="44" fill="${t.accent}" opacity="0.08"/>
      <circle cx="295" cy="175" r="55" fill="${t.secondary}" opacity="0.08"/>
      <circle cx="160" cy="98" r="52" fill="${t.accent}" opacity="0.18"/>
      <circle cx="160" cy="98" r="34" fill="${t.accent}" opacity="0.55"/>
      <circle cx="148" cy="88" r="7" fill="#FFFFFF" opacity="0.85"/>
      <circle cx="172" cy="104" r="9" fill="#FFFFFF" opacity="0.75"/>
      <rect x="65" y="164" width="190" height="23" rx="11.5" fill="#0F172A" opacity="0.88"/>
      <text x="160" y="179" font-family="sans-serif" font-size="11" font-weight="700" fill="#FFFFFF" text-anchor="middle">${safeLabel}</text>
    </svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg.trim());
}

/** Hanya izinkan URL gambar http(s) dan data URI gambar. */
export function safeImageUrl(value) {
  const url = String(value ?? '').trim();
  if (!url) return '';
  if (/^https?:\/\//i.test(url) || /^data:image\//i.test(url)) return url;
  return '';
}

/**
 * Sepuluh produk dummy milik tiga seller.
 * @param {string} timestamp ISO time yang dipakai untuk createdAt/updatedAt.
 */
export function seedProducts(timestamp) {
  return [
    { id: 'prd-001', sellerId: 'usr-sari', name: 'Sego Sambel Iwak Pe Asap', category: 'Makanan Berat', price: 18000, stock: 24, description: 'Nasi pulen hangat dengan ikan pari asap gurih, sambal tomat terasi segar, lalapan kemangi, dan tahu goreng.', imageUrl: createLocalFoodSvg('Makanan Berat', 'Sego Sambel Iwak Pe'), featured: true, active: true },
    { id: 'prd-002', sellerId: 'usr-sari', name: 'Sego Ayam Suwir Kemangi Pedas', category: 'Makanan Berat', price: 15000, stock: 30, description: 'Nasi putih daun jeruk dengan suwiran ayam bumbu kuning pedas harum daun kemangi dan serundeng kelapa.', imageUrl: createLocalFoodSvg('Makanan Berat', 'Sego Ayam Kemangi'), featured: true, active: true },
    { id: 'prd-003', sellerId: 'usr-sari', name: 'Es Dawet Ayu Gula Aren Asli', category: 'Minuman', price: 8000, stock: 40, description: 'Cendol pandan alami berpadu santan gurih segar dan sirup gula aren organik wangi nangka.', imageUrl: createLocalFoodSvg('Minuman', 'Es Dawet Ayu Aren'), featured: false, active: true },
    { id: 'prd-004', sellerId: 'usr-joko', name: 'Sego Empal Gepuk Serundeng', category: 'Makanan Berat', price: 24000, stock: 12, description: 'Daging sapi empal gepuk empuk manis gurih, taburan serundeng lengkuas, sambal bajak, dan tempe bacem.', imageUrl: createLocalFoodSvg('Makanan Berat', 'Sego Empal Gepuk'), featured: true, active: true },
    { id: 'prd-005', sellerId: 'usr-joko', name: 'Nasi Pecel Madiun Komplit', category: 'Makanan Berat', price: 14000, stock: 0, description: 'Sayuran rebus segar disiram bumbu kacang sangrai khas Madiun, lengkap dengan rempeyek kacang renyah.', imageUrl: createLocalFoodSvg('Makanan Berat', 'Nasi Pecel Madiun'), featured: false, active: true },
    { id: 'prd-006', sellerId: 'usr-joko', name: 'Wedang Uwuh Rempah Komplit', category: 'Minuman', price: 10000, stock: 18, description: 'Minuman tradisional hangat racikan jahe emprit bakar, kayu secang, cengkeh, kayu manis, dan gula batu.', imageUrl: createLocalFoodSvg('Minuman', 'Wedang Uwuh Rempah'), featured: false, active: true },
    { id: 'prd-007', sellerId: 'usr-rina', name: 'Keripik Tempe Sagu Renyah (200g)', category: 'Camilan', price: 12000, stock: 35, description: 'Keripik tempe kedelai pilihan berbalut tepung sagu berbumbu bawang putih ketumbar, tipis dan ekstra renyah.', imageUrl: createLocalFoodSvg('Camilan', 'Keripik Tempe Sagu'), featured: true, active: true },
    { id: 'prd-008', sellerId: 'usr-rina', name: 'Pisang Sale Gulung Crispy', category: 'Camilan', price: 13500, stock: 15, description: 'Pisang raja manis alami yang diasap lalu digulung kulit lumpia renyah dengan sentuhan wijen panggang.', imageUrl: createLocalFoodSvg('Camilan', 'Pisang Sale Crispy'), featured: false, active: true },
    { id: 'prd-009', sellerId: 'usr-rina', name: 'Rempeyek Kacang Tanah (150g)', category: 'Camilan', price: 9000, stock: 22, description: 'Rempeyek tipis renyah dengan kacang tanah utuh, daun jeruk, dan bumbu ketumbar khas rumahan.', imageUrl: createLocalFoodSvg('Camilan', 'Rempeyek Kacang'), featured: false, active: true },
    { id: 'prd-010', sellerId: 'usr-rina', name: 'Es Teh Melati Jumbo (1L)', category: 'Minuman', price: 7000, stock: 50, description: 'Teh melati seduh dingin satu liter, manisnya bisa dipilih, cocok untuk makan bersama keluarga.', imageUrl: createLocalFoodSvg('Minuman', 'Es Teh Melati Jumbo'), featured: false, active: false }
  ].map(product => ({ ...product, createdAt: timestamp, updatedAt: timestamp }));
}
