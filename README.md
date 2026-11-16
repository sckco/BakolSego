<div align="center">

# 🍚 BakolSego

**Katalog & dashboard UMKM kuliner — satu aplikasi, tiga peran.**

Dibuat oleh [Buffy](https://codebuff.com) 🤖

[![Vite](https://img.shields.io/badge/Vite-7-646CFF?logo=vite&logoColor=white)](https://vite.dev)
[![JavaScript](https://img.shields.io/badge/JavaScript-Vanilla-F7DF1E?logo=javascript&logoColor=black)](#)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-CDN-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Status](https://img.shields.io/badge/status-aktif-22c55e)](#)

</div>

---

## Tentang

BakolSego adalah web statis untuk UMKM kuliner: **admin** mengelola pengguna, **seller** mengelola produknya sendiri, dan **pembeli** menjelajah katalog lalu memesan lewat WhatsApp. Semua data disimpan di `localStorage` browser — tanpa backend, tanpa database, tanpa biaya server.

Tampilannya memakai gaya *glassmorphism* iOS dengan tema terang/gelap, dan tetap nyaman dari layar 320px sampai desktop.

## Fitur

| Peran | Yang bisa dilakukan |
| :--- | :--- |
| 🛡️ **Admin** | Buat, ubah, nonaktifkan, dan hapus akun; reset password; atur nomor WhatsApp admin; lihat audit log; reset data demo |
| 🏪 **Seller** | Tambah, edit, hapus produk **miliknya sendiri**; atur harga, stok, kategori, gambar, dan label unggulan |
| 🛒 **Pembeli** | Cari produk/toko, filter kategori, urutkan, lihat detail, lalu checkout langsung ke WhatsApp seller |

Detail kecil yang sudah diurus: isolasi data antar-seller, akun nonaktif tidak bisa login, validasi form, escaping HTML anti-XSS, dan nomor telepon dinormalisasi ke format `62...`.

## Akun Demo

| Peran | Email | Password |
| :--- | :--- | :--- |
| Admin | `admin@bakolsego.id` | `admin123` |
| Seller | `sari@bakolsego.id` · `joko@bakolsego.id` · `rina@bakolsego.id` | `seller123` |
| Pembeli | `budi@bakolsego.id` · `sinta@bakolsego.id` · `dewi@bakolsego.id` | `buyer123` |

Data awal: 7 pengguna dan 10 produk. Untuk kembali ke kondisi bersih, login sebagai admin → **Pengaturan** → **Reset Data Demo**.

## Menjalankan

```bash
npm install     # sekali saja
npm run dev     # http://localhost:5173
```

```bash
npm run build     # hasil produksi di dist/
npm run preview   # cek hasil build secara lokal
```

Karena memakai ES module, `index.html` **tidak bisa** dibuka langsung lewat `file://`. Hasil build memakai path relatif (`base: './'`), jadi folder `dist/` bisa ditaruh di subfolder hosting mana pun.

## Struktur Proyek

```
BakolSego/
├── index.html          # markup aplikasi (entry Vite)
├── src/
│   ├── main.js         # bootstrap, event binding, jembatan handler global
│   ├── store.js        # localStorage, auth, CRUD user & produk, audit log
│   ├── products.js     # kategori, gambar SVG bawaan, seed produk
│   ├── ui.js           # render katalog/seller/admin, form, modal, tema
│   └── style.css       # token tema, glassmorphism, animasi
├── vite.config.js
└── spec.md             # spesifikasi lengkap aplikasi
```

Arsitekturnya satu arah: `products → store → ui → main`. Tidak ada framework UI dan tidak ada dependensi runtime selain Tailwind dari CDN.

## Catatan

- Password di-hash dengan **SHA-256** di sisi klien. Ini cukup untuk demo, **bukan** untuk produksi — aplikasi nyata butuh backend, argon2/bcrypt, dan cookie HttpOnly.
- Data tersimpan per-browser. Ganti browser atau bersihkan site data = mulai dari data demo lagi.
- Tailwind dimuat dari CDN, jadi tampilan butuh koneksi internet.

---

<div align="center">

### Dibuat oleh Buffy 🤖

Web ini **dirancang dan ditulis oleh Buffy**, agen coding AI dari [Codebuff](https://codebuff.com) — mulai dari desain antarmuka, logika tiga peran, sampai pemecahan proyek menjadi modul Vite. Bukan template, bukan hasil sekali jadi: setiap komponen, validasi, dan perbaikan bug dikerjakan langsung dalam sesi coding bersama pemilik repo.

Coba sendiri di [freebuff.com](https://freebuff.com) · Spesifikasi lengkap: [`spec.md`](spec.md)

</div>
