# Spesifikasi Aplikasi — BakolSego (Katalog & Dashboard UMKM Kuliner)

Versi: 2.0
Status: disetujui untuk implementasi prototipe produksi
Basis: `bakolsego_katalog_dashboard_umkm_kuliner (1).html` (prototipe satu file, mode pembeli/admin tanpa autentikasi)

---

## 1. Ringkasan & Tujuan

BakolSego adalah aplikasi web katalog kuliner UMKM yang menghubungkan **pembeli** dengan **penjual (seller)** melalui WhatsApp, dengan **admin** yang mengelola akun pengguna.

Prototipe hanya punya dua mode tampilan (pembeli & "admin" yang sebenarnya adalah pengelola produk). Versi produksi ini menambahkan:

1. **Autentikasi & otorisasi berbasis peran** (admin / seller / pembeli).
2. **Pemisahan data per seller** — setiap seller hanya mengelola produk miliknya.
3. **Manajemen pengguna oleh admin** (buat, ubah, nonaktifkan, hapus, reset password).
4. **Basis data lokal (localStorage)** dengan skema berversi, data dummy, dan audit log ringan.

Aplikasi kini berupa **proyek Vite vanilla JavaScript** yang dipecah menjadi modul (`src/main.js`, `src/store.js`, `src/products.js`, `src/ui.js`) dengan CSS terpisah. Hasil build tetap statis dan bisa di-hosting di folder mana pun (`base: './'`).

### Tujuan non-fungsional
- Tetap mempertahankan bahasa visual prototipe: glassmorphism iOS, tema terang/gelap, responsif 320px–1440px.
- Tidak ada dependensi runtime baru selain Tailwind CDN yang sudah dipakai; satu-satunya paket proyek adalah Vite (devDependency).
- Semua input pengguna di-escape sebelum masuk `innerHTML` (anti-XSS).
- Waktu muat awal < 1 detik pada perangkat kelas menengah (data dummy kecil).

---

## 2. Ruang Lingkup

### Termasuk
- Katalog publik yang langsung tampil tanpa login, dengan tombol **Masuk** dan **Daftar** di kanan atas.
- Halaman login dengan email/password dan tombol tampilkan/sembunyikan kata sandi.
- Registrasi mandiri akun pembeli dengan email wajib `@gmail.com`.
- Sesi login persisten (bertahan setelah refresh) dan logout kembali ke katalog publik.
- Tiga dashboard per peran dengan navigasi berbeda.
- CRUD pengguna (admin), CRUD produk (seller), katalog + pesanan WhatsApp (pembeli).
- Pengaturan nomor WhatsApp toko, reset data demo, audit log.
- Data dummy: 1 admin, 3 seller, 3 pembeli, 10 produk.

### Tidak termasuk (roadmap, lihat §11)
- Backend/API, database server, multi-perangkat.
- Registrasi mandiri pembeli/seller dan verifikasi email.
- Pembayaran, keranjang, ongkir, riwayat pesanan.
- Unggah gambar produk sebagai file PNG/JPG (maksimal 2 MB) yang dikompres di browser dan disimpan sebagai data URI; fallback ke SVG preset kategori.

---

## 3. Peran & Hak Akses

| Kemampuan | Admin | Seller | Pembeli |
|---|---|---|---|
| Login / logout | ✅ | ✅ | ✅ |
| Lihat katalog produk aktif | ✅ | ✅ (miliknya) | ✅ |
| Buat / ubah / hapus produk | ❌ | ✅ (hanya miliknya) | ❌ |
| Ubah stok, harga, unggulan, status tayang | ❌ | ✅ (hanya miliknya) | ❌ |
| Lihat daftar semua pengguna | ✅ | ❌ | ❌ |
| Buat / ubah / nonaktifkan / hapus pengguna | ✅ | ❌ | ❌ |
| Reset password pengguna | ✅ | ❌ | ❌ |
| Ubah nomor WhatsApp toko | ✅ | ❌ | ❌ |
| Pesan produk via WhatsApp | ❌ (pratinjau) | ❌ | ✅ |
| Reset seluruh data demo | ✅ | ❌ | ❌ |

**Aturan penjagaan:**
- Tamu boleh melihat katalog, tetapi setiap aksi (memesan, mengelola produk/user) memerlukan sesi valid dan peran yang sesuai.
- Setiap aksi sensitif memeriksa ulang peran dan kepemilikan data (bukan hanya menyembunyikan tombol).
- Admin tidak dapat menonaktifkan atau menghapus akunnya sendiri.
- Seller dengan produk aktif tidak dapat dihapus; gunakan **nonaktifkan** agar produknya juga tidak tayang.
- Seller nonaktif tidak bisa login; produknya disembunyikan dari katalog.

---

## 4. Alur Utama

### 4.1 Login
1. Pengguna membuka aplikasi → katalog publik langsung tampil; bila sesi valid, dashboard peran dimuat otomatis.
2. Pengguna menekan **Masuk** di kanan atas lalu mengisi email + password; ikon mata di kolom kata sandi bisa menampilkan atau menyembunyikan isinya.
3. Email wajib berformat `@gmail.com` (format lain ditolak sebelum autentikasi). Sistem mencari user dengan email (case-insensitive), membandingkan hash password, dan memeriksa status aktif.
4. Gagal → pesan generik "Email atau password salah" (tidak membocorkan akun mana yang ada).
5. Berhasil → sesi disimpan, audit log mencatat `login`, dashboard peran dirender.
6. Logout → sesi dihapus, state UI direset, kembali ke katalog publik.

### 4.2 Registrasi Pembeli
1. Pengunjung menekan **Daftar** di kanan atas atau tautan "Daftar sekarang" di halaman login.
2. Form: nama (2–60 karakter), email wajib berakhiran `@gmail.com`, nomor WhatsApp (10–15 digit), password minimal 6 karakter.
3. Email duplikat dan format selain Gmail ditolak dengan pesan inline.
4. Berhasil → akun pembeli dibuat, sesi langsung dimulai, audit log mencatat `register`, dan katalog tampil.
5. Akun seller tetap dibuat oleh admin melalui Kelola User.

### 4.3 Admin — Kelola User
1. Admin membuka tab **Kelola User**; tabel menampilkan nama, email, peran, kontak, jumlah produk, status, aksi.
2. Pencarian (nama/email/toko) dan filter peran tersedia.
3. **Tambah user**: nama, email, password awal, peran, nomor WhatsApp, nama toko (wajib untuk seller).
4. **Edit user**: nama, email, peran, kontak, toko, status aktif. Password tidak ditampilkan.
5. **Reset password**: admin memasukkan password baru (min. 6 karakter); hash diperbarui.
6. **Hapus user**: hanya jika bukan diri sendiri dan seller tanpa produk. Konfirmasi wajib.
7. Semua aksi tercatat di audit log.

### 4.4 Seller — Kelola Produk
1. Seller membuka tab **Produk Saya**; ringkasan statistik (total, tayang, stok menipis, habis, nilai inventaris) + tabel produk miliknya.
2. **Tambah produk**: nama, kategori, harga, stok, deskripsi, gambar (unggah PNG/JPG maksimal 2 MB), unggulan, status tayang.
3. **Edit / hapus** hanya untuk produk dengan `sellerId` miliknya.
4. Stok 0 otomatis ditandai "Habis" dan tombol pesan dinonaktifkan di katalog pembeli.
5. Perubahan langsung tersimpan ke localStorage dan terlihat di katalog pembeli.

### 4.5 Pembeli — Pilih Produk & WhatsApp
1. Pembeli melihat katalog produk **aktif** dari **seller aktif**.
2. Filter: pencarian (nama/deskripsi/toko), kategori, hanya unggulan, urutan (unggulan, harga, stok, nama).
3. Kartu produk menampilkan gambar, kategori, toko, harga, stok, dan tombol **Pesan via WhatsApp**.
4. Klik tombol → pesan terformat (produk, kategori, harga, toko, nama pembeli) dibuka ke `https://wa.me/<nomor seller>`.
5. Jika popup diblokir → modal pratinjau berisi teks pesanan + tautan manual + tombol salin.
6. Nomor tujuan: nomor WhatsApp seller pemilik produk; fallback ke nomor toko di pengaturan.

---

## 5. Model Data (localStorage)

Kunci penyimpanan:

| Kunci | Isi |
|---|---|
| `bakolsego_db_v2` | Seluruh basis data (lihat skema di bawah) |
| `bakolsego_session_v2` | `{ userId, issuedAt }` |
| `bakolsego_glass_theme_v1` | `'light'` \| `'dark'` (kompatibel dengan prototipe) |

### 5.1 Skema `db`

```json
{
  "meta": { "version": 2, "seededAt": "ISO-8601", "updatedAt": "ISO-8601" },
  "users": [
    {
      "id": "usr-...",
      "name": "string",
      "email": "string (unik, lowercase)",
      "passwordHash": "sha256 hex",
      "role": "admin | seller | buyer",
      "phone": "string (digit, format 62...)",
      "storeName": "string (wajib seller)",
      "active": true,
      "createdAt": "ISO-8601"
    }
  ],
  "products": [
    {
      "id": "prd-...",
      "sellerId": "usr-...",
      "name": "string",
      "category": "Makanan Berat | Minuman | Camilan",
      "price": 15000,
      "stock": 10,
      "description": "string",
      "imageUrl": "string (URL/data URI, opsional)",
      "featured": false,
      "active": true,
      "createdAt": "ISO-8601",
      "updatedAt": "ISO-8601"
    }
  ],
  "settings": { "storeName": "BakolSego", "whatsappNumber": "6280000000000" },
  "auditLog": [
    { "id": "log-...", "at": "ISO-8601", "actorId": "usr-...", "actorName": "string", "action": "string", "detail": "string" }
  ]
}
```

### 5.2 Aturan persistensi
- Jika kunci tidak ada / JSON rusak / `meta.version` bukan 2 → database di-seed ulang dengan data dummy.
- Setiap mutasi memanggil `saveDB()` dan memperbarui `meta.updatedAt`.
- Audit log dibatasi 200 entri terbaru.
- Penulisan gagal (kuota penuh) → toast error, perubahan di memori dibatalkan pada operasi berikutnya dengan memuat ulang DB.

### 5.3 Data dummy

| Peran | Email | Password | Catatan |
|---|---|---|---|
| Admin | `admin@gmail.com` | `admin123` | Admin BakolSego |
| Seller | `sari@gmail.com` | `seller123` | Dapur Bu Sari, 3 produk |
| Seller | `joko@gmail.com` | `seller123` | Sego Joko, 3 produk |
| Seller | `rina@gmail.com` | `seller123` | Rina Snacks, 4 produk |
| Pembeli | `budi@gmail.com` | `buyer123` | Budi Santoso |
| Pembeli | `sinta@gmail.com` | `buyer123` | Sinta Maharani |
| Pembeli | `dewi@gmail.com` | `buyer123` | Dewi Lestari |

10 produk kuliner nusantara (4 makanan berat, 3 minuman, 3 camilan), termasuk satu produk stok 0 dan satu produk nonaktif untuk menguji tampilan.

---

## 6. Aturan Validasi

**User**
- Nama: 3–60 karakter.
- Email: format valid, unik (case-insensitive).
- Password: minimal 6 karakter; disimpan sebagai SHA-256 dari `bakolsego::<password>` (bukan plaintext).
- Peran: salah satu dari `admin`, `seller`, `buyer`.
- Nomor WhatsApp: 9–15 digit setelah normalisasi (`08…` → `628…`).
- `storeName` wajib 2–60 karakter untuk seller.

**Produk**
- Nama: 3–80 karakter, unik per seller.
- Kategori: salah satu dari 3 kategori tetap.
- Harga: bilangan bulat 0–10.000.000.
- Stok: bilangan bulat 0–10.000.
- Deskripsi: 10–500 karakter.
- Gambar: unggah file PNG/JPG maksimal 2 MB, diperkecil ke sisi maksimal 1200 px lalu disimpan sebagai data URI; kosong berarti memakai SVG preset kategori.

Semua pesan kesalahan ditampilkan inline di atas form (daftar) dan fokus ke field pertama yang salah.

---

## 7. UI / UX

- **Header**: brand, chip peran, nama pengguna, tombol tema, tombol keluar.
- **Navigasi tab** menyesuaikan peran; tab aktif memakai gaya segmented control.
- **Login**: kartu glass, form email/password dengan tombol lihat kata sandi, dan kotak error.
- **Tabel** dapat di-scroll horizontal di layar kecil; kartu statistik grid 2–5 kolom.
- **Modal**: form produk, form user, konfirmasi, pratinjau WhatsApp; tutup via tombol, overlay, dan `Escape`.
- **Toast**: sukses / error / info, hilang otomatis 3,5 detik.
- **Aksesibilitas**: label form eksplisit, `aria-*` pada modal/tab, fokus awal di field pertama, kontras teks mengikuti token tema, target sentuh ≥ 40px.
- **Tema**: terang/gelap persisten; menghormati `prefers-color-scheme` saat pertama kali.

---

## 8. Keamanan & Batasan (penting)

Aplikasi ini **client-side murni**. Hash password dan pemeriksaan peran meningkatkan kerapian data, tetapi **bukan keamanan sebenarnya**: siapa pun yang membuka DevTools dapat membaca/mengubah localStorage.

Konsekuensi yang harus disadari:
- Jangan gunakan untuk data pelanggan nyata, kredensial nyata, atau transaksi finansial.
- Otorisasi hanya mencegah kesalahan UI, bukan serangan.
- Untuk produksi nyata diperlukan backend (auth server, hashing bcrypt/argon2, session cookie HttpOnly), yang berada di luar lingkup versi ini (§11).

Mitigasi yang tetap diterapkan:
- Semua string dari pengguna di-escape sebelum dirender.
- Gambar divalidasi tipe (PNG/JPG) dan ukuran (maksimal 2 MB) sebelum disimpan; data URI di-escape saat dirender.
- Tidak ada data sensitif di URL; pesan WhatsApp dibentuk dari data produk yang sudah tersimpan.
- Audit log membantu penelusuran perubahan.

---

## 9. Kriteria Penerimaan

1. Membuka aplikasi tanpa sesi menampilkan katalog publik; tidak ada dashboard peran yang terlihat dan aksi memesan mengarahkan ke login.
2. Login dengan tiap akun dummy membuka dashboard peran yang sesuai; setelah refresh sesi tetap aktif.
3. Pembeli tidak melihat tombol/menu kelola produk atau kelola user; memanggil aksi terlarang via konsol ditolak.
4. Seller hanya melihat dan dapat mengubah produk miliknya; produk seller lain tidak muncul di tabelnya.
5. Seller dapat menambah, mengubah, dan menghapus produk; perubahan langsung muncul di katalog pembeli setelah login sebagai pembeli.
6. Admin dapat membuat user baru, mengubah data, mereset password, menonaktifkan, dan menghapus user tanpa produk.
7. Admin tidak dapat menghapus/menonaktifkan dirinya sendiri; seller yang masih punya produk tidak dapat dihapus.
8. User nonaktif tidak dapat login dan produk seller nonaktif hilang dari katalog.
9. Tombol WhatsApp membuka `wa.me` dengan nomor seller yang benar dan pesan berisi nama produk, harga, serta nama pembeli.
10. Filter pencarian, kategori, unggulan, dan urutan bekerja serta menampilkan jumlah hasil yang benar.
11. Validasi menolak email duplikat, password < 6 karakter, harga negatif, stok desimal, dan deskripsi terlalu pendek.
12. Registrasi menolak email selain `@gmail.com` dan email duplikat; email Gmail baru langsung membuat akun pembeli dan masuk ke katalog.
12. Semua data bertahan setelah refresh; "Reset Data Demo" mengembalikan 7 user dan 10 produk awal.
13. Tidak ada error runtime di konsol pada alur utama; tema terang/gelap berfungsi.

---

## 10. Struktur File & Menjalankan

```
BakolSego/
├── index.html                               ← markup aplikasi (entry Vite)
├── src/
│   ├── main.js                              ← bootstrap, event binding, jembatan handler global
│   ├── store.js                             ← localStorage, seed, auth, CRUD user/produk, audit
│   ├── products.js                          ← kategori, gambar preset SVG, seed 10 produk
│   ├── ui.js                                ← render katalog/seller/admin, form, modal, tema
│   └── style.css                            ← token tema, glassmorphism, animasi
├── vite.config.js                           ← base './'
├── package.json                             ← skrip dev/build/preview
├── spec.md                                  ← dokumen ini
└── bakolsego_katalog_dashboard_umkm_kuliner (1).html   ← prototipe v1 (arsip)
```

- `npm install` sekali, lalu `npm run dev` untuk pengembangan (`http://localhost:5173`).
- `npm run build` menghasilkan folder `dist/` yang siap di-hosting statis; `npm run preview` untuk mengujinya.
- `index.html` tidak bisa lagi dibuka lewat `file://` karena memakai ES module.
- Untuk kembali ke kondisi awal: login admin → Pengaturan → **Reset Data Demo**, atau hapus kunci `bakolsego_db_v2` di DevTools.

---

## 11. Roadmap Produksi Nyata

1. Backend (mis. Supabase/Postgres + Auth) dengan hashing argon2 dan cookie HttpOnly.
2. Registrasi seller + verifikasi email/WhatsApp, moderasi admin.
3. Pindahkan gambar ke object storage agar tidak dibatasi kuota localStorage.
4. Riwayat pesanan, status pesanan, dan integrasi WhatsApp Business API.
5. Uji otomatis end-to-end (Playwright) untuk alur 3 peran.
6. Logging & monitoring, backup data, serta kebijakan privasi.
