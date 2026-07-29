# PRD — Analytical Engine & Web App untuk Analisis Kelayakan Pembiayaan

**Versi:** 1.1 (MVP)
**Tipe:** Private advanced analysis tool (bukan SaaS)
**Boilerplate:** [codeguide-starter-fullstack](https://github.com/CodeGuide-dev/codeguide-starter-fullstack) — Next.js 15, Drizzle ORM + PostgreSQL, Better Auth, Tailwind CSS v4, shadcn/ui
**Status:** Siap diimplementasikan dengan Claude Code
**Dokumen pasangan:** `IMPLEMENTATION_PLAN.md`

> **Perubahan dari v1.0.** Versi ini menutup lima celah yang membuat v1.0 belum bisa diimplementasikan tanpa asumsi tambahan: (1) DER, ROI, dan Break-Even Point membutuhkan input yang belum dikumpulkan di form; (2) basis kuotasi biaya (flat vs efektif) tidak dibedakan, padahal justru di situ letak ketidaksetaraan perbandingan syariah–konvensional; (3) varian base/best/worst disebut tanpa definisi kuantitatif; (4) NPV/IRR tidak menyatakan arus kas mana yang didiskonto; (5) tidak ada penanganan kasus batas (DSCR negatif, IRR tak terdefinisi). Ringkasan lengkap ada di §14.

---

## 1. Ringkasan Eksekutif

Alat analisis privat untuk menguji kelayakan pembiayaan, baik skema konvensional maupun syariah, dengan seluruh formula dan asumsi terbuka untuk diperiksa. Bukan skor "kotak hitam" — setiap angka yang tampil di dashboard bisa ditelusuri balik ke rumus dan input yang menghasilkannya.

MVP berfokus pada alur inti: input skenario manual, proyeksi arus kas, rasio kelayakan (DSCR/DER/ROI/BEP), valuasi (NPV/IRR), normalisasi biaya efektif tahunan, dan dashboard hasil. Fase lanjutan (Monte Carlo, AI layer, structure optimizer) mengikuti roadmap V2–V5 dan tidak termasuk cakupan MVP ini.

## 2. Latar Belakang & Masalah

Analisis kelayakan pembiayaan konvensional dan syariah biasanya dilakukan dengan kerangka kerja terpisah, sehingga sulit membandingkan biaya efektif riil dan profil risiko kedua skema untuk kebutuhan dana yang sama.

Masalahnya bukan sekadar perbedaan istilah. Akar persoalannya adalah **basis kuotasi yang berbeda**. Margin murabahah dan ujrah ijarah umumnya dikutip sebagai persentase *flat* atas pokok awal, sedangkan bunga anuitas dan bagi hasil musyarakah mutanaqishah bekerja atas *saldo menurun*. Angka yang terlihat sama besar sebenarnya tidak sebanding:

| Skema | Kuotasi | Pokok | Tenor | Total dibayar | **Biaya efektif tahunan (EAR)** |
|---|---|---|---|---|---|
| Anuitas konvensional | 12% p.a. (efektif) | Rp100 jt | 24 bln | Rp112.976.333 | **12,68%** |
| Murabahah | 8% p.a. (flat) | Rp100 jt | 24 bln | Rp116.000.000 | **15,71%** |
| Musyarakah mutanaqishah | 12% p.a. (saldo menurun) | Rp100 jt | 24 bln | Rp112.500.000 | **12,68%** |

Murabahah yang dikutip 8% ternyata lebih mahal daripada anuitas yang dikutip 12%. Perbandingan yang jujur baru mungkin dilakukan setelah semua skema dinormalkan ke satu ukuran yang sama. Alat ini melakukan normalisasi itu sebagai perhitungan inti, bukan sebagai fitur tambahan.

## 3. Prinsip Desain Produk

- **Privat, bukan SaaS.** Akses dibatasi ke pemilik/pengguna yang diotorisasi, tanpa onboarding publik.
- **Transparansi penuh.** Semua hasil dapat ditelusuri balik ke formula dan asumsi. Setiap kartu metrik di UI menampilkan rumus dan angka masukannya.
- **Kesetaraan perlakuan syariah–konvensional.** Kedua skema dinormalkan ke *Effective Annual Rate* yang diturunkan dari jadwal pembayaran aktual, bukan dari angka kuotasi.
- **Jujur soal batasan.** Model ini menyederhanakan kenyataan. Asumsi dan keterbatasannya dinyatakan terbuka di §11, bukan disembunyikan di balik antarmuka yang rapi.
- **Sederhana dulu, dalam kemudian.** MVP memprioritaskan alur inti yang benar dan bisa diverifikasi, bukan fitur lengkap sekaligus.

## 4. Target Pengguna

Pengguna tunggal/internal (pemilik alat) yang mengevaluasi kelayakan pembiayaan untuk kebutuhan sendiri atau klien yang didampingi. Bukan produk multi-tenant, tetapi setiap skenario tetap terikat pada `userId` agar perluasan ke beberapa pengguna internal nanti tidak memerlukan migrasi data.

## 5. Glosarium & Definisi Metrik

Bagian ini mengikat istilah supaya implementasi tidak menebak. Notasi: `t` = indeks bulan (1..n), `n` = tenor dalam bulan.

| Istilah | Definisi operasional |
|---|---|
| **CFADS**_t | *Cash Flow Available for Debt Service* = Pendapatan_t − Opex_t − Capex_t. Arus kas usaha **sebelum** pembayaran pembiayaan. |
| **Debt service** D_t | Total kewajiban ke pemberi dana pada bulan t (pokok + margin/bunga/ujrah), yaitu angsuran yang benar-benar dibayar. |
| **Arus kas bersih** | CFADS_t − D_t. Sisa untuk pemilik usaha. |
| **DSCR**_t | CFADS_t ÷ D_t. Rasio kemampuan membayar. |
| **EAR** | *Effective Annual Rate* — biaya efektif tahunan hasil normalisasi, diturunkan dari IRR jadwal pembayaran aktual. Ini satu-satunya angka yang boleh dipakai untuk membandingkan antar-skema. |
| **Arus kas inkremental** ΔCF_t | (Δ Pendapatan_t − Δ Opex_t). Tambahan arus kas yang timbul **karena** pembiayaan ini, dipakai untuk NPV dan IRR. |
| **Margin kontribusi** | (Pendapatan − Biaya variabel) ÷ Pendapatan, dalam persen. Dipakai untuk menurunkan biaya tetap dan menghitung BEP. |

### 5.1 Ambang Batas Kelayakan

| Metrik | Aman (`feasible`) | Perlu perhatian (`watch`) | Tidak aman (`risky`) |
|---|---|---|---|
| DSCR per periode | ≥ 1,25 | 1,00 – 1,24 | < 1,00 |
| NPV | > 0 | — | ≤ 0 |
| IRR | > discount rate | ± 2 pp dari discount rate | < discount rate |
| DER | ≤ 2,0 | 2,01 – 3,00 | > 3,00 |

**Status kelayakan skenario** (ditampilkan di kartu dashboard) ditentukan dari skenario *base*:
- `LAYAK` — DSCR rata-rata ≥ 1,25 **dan** DSCR minimum ≥ 1,00 **dan** NPV > 0
- `WASPADA` — DSCR rata-rata ≥ 1,00 tetapi salah satu syarat lain tidak terpenuhi
- `TIDAK LAYAK` — DSCR rata-rata < 1,00

## 6. Cakupan MVP

### 6.1 Termasuk MVP

- Input skenario pembiayaan secara manual (form self-assessment, §7)
- Perhitungan jadwal pembiayaan untuk empat skema: murabahah, ijarah, musyarakah mutanaqishah, dan anuitas konvensional — termasuk konversi basis flat ↔ efektif
- **Normalisasi EAR**: setiap skenario menampilkan biaya efektif tahunannya, apa pun basis kuotasinya
- Proyeksi arus kas bulanan untuk varian base/best/worst (§8)
- Rasio kelayakan: DSCR per periode, DER, ROI, Break-Even Point (dalam omzet rupiah)
- Valuasi: NPV dan IRR atas arus kas inkremental, dengan discount rate yang bisa diubah pengguna
- Dashboard daftar skenario + halaman detail hasil per skenario
- CRUD skenario penuh (buat, lihat, ubah, hapus)
- Panel "Bagaimana ini dihitung" pada setiap metrik — menampilkan rumus dan nilai masukan
- Landing page (§9)
- Seed data 20 kasus untuk demo/uji
- Autentikasi privat (Better Auth, tanpa pendaftaran publik)

### 6.2 Eksplisit Di Luar Cakupan MVP

| Fitur | Fase |
|---|---|
| Sensitivity engine + tornado chart | V2 |
| Akad Comparator penuh: perbandingan sisi-berdampingan banyak skema sekaligus rekomendasi | V2 |
| Terminal value / nilai residu pada valuasi | V2 |
| Monte Carlo simulation + distribusi probabilistik | V3 |
| Anomaly detection | V3 |
| Structure Optimizer | V4 |
| Document extraction, assumption calibration | V4 |
| Sharia reasoning, narrative generation, conversational copilot | V4–V5 |
| Ekspor PDF/Excel, multi-user, audit log | Belum dijadwalkan |

> Catatan: MVP menghitung biaya pembiayaan untuk **satu skema yang dipilih** per skenario. Membandingkan dua skema dilakukan dengan membuat dua skenario dan melihat EAR keduanya — bukan modul comparator penuh.

## 7. Input Skenario (Form Self-Assessment)

Dikelompokkan menjadi empat langkah agar form tidak terasa panjang.

**Langkah 1 — Identitas**

| Field | Tipe | Validasi | Wajib |
|---|---|---|---|
| Nama skenario | teks | 3–120 karakter | ya |
| Jenis usaha / sektor | pilihan | dari daftar sektor | ya |
| Tujuan pembiayaan | teks | 3–200 karakter | ya |
| Profil risiko | pilihan | rendah / sedang / tinggi | ya |

**Langkah 2 — Struktur Pembiayaan**

| Field | Tipe | Validasi | Wajib |
|---|---|---|---|
| Kebutuhan dana | rupiah | 1 jt – 500 M | ya |
| Tenor | bulan | 3 – 240 | ya |
| Jenis skema | pilihan | syariah / konvensional | ya |
| Jenis akad | pilihan | murabahah / ijarah / musyarakah mutanaqishah — wajib bila skema = syariah, harus kosong bila konvensional | kondisional |
| Tingkat biaya tahunan | persen | 0 – 60 | ya |
| **Basis kuotasi** | pilihan | flat / efektif | ya |

Field **basis kuotasi** adalah tambahan terpenting di v1.1. Tanpa itu, angka 8% pada murabahah dan 12% pada anuitas akan diperlakukan setara, padahal tidak. Nilai bawaan mengikuti praktik umum: murabahah dan ijarah → `flat`; musyarakah mutanaqishah dan konvensional → `efektif`. Pengguna tetap bisa menimpanya.

**Langkah 3 — Kondisi Usaha Saat Ini**

| Field | Tipe | Validasi | Wajib |
|---|---|---|---|
| Pendapatan bulanan awal | rupiah | ≥ 0 | ya |
| Opex bulanan awal | rupiah | ≥ 0 | ya |
| Pertumbuhan pendapatan tahunan | persen | −50 s.d. 100 | ya |
| Inflasi biaya tahunan | persen | −20 s.d. 50 | ya |
| Margin kontribusi | persen | 1 – 100 | ya |
| Ekuitas awal | rupiah | > 0 | ya |
| Kewajiban lain (di luar pembiayaan ini) | rupiah | ≥ 0 | ya (boleh 0) |

**Langkah 4 — Dampak Pembiayaan & Asumsi Valuasi**

| Field | Tipe | Validasi | Wajib |
|---|---|---|---|
| Tambahan pendapatan bulanan | rupiah | ≥ 0 | ya |
| Tambahan opex bulanan | rupiah | ≥ 0 | ya |
| Discount rate tahunan | persen | 0 – 40, bawaan 12 | ya |

Dua field pertama menjawab pertanyaan "apa yang berubah karena pembiayaan ini?" dan menjadi dasar NPV/IRR. Tanpa keduanya, NPV hanya akan mengukur nilai seluruh usaha yang sudah berjalan terhadap dana pembiayaan — angka yang besar tetapi tidak bermakna. Form menampilkan penjelasan singkat ini di samping input, bukan sekadar label.

## 8. Definisi Varian Skenario

Varian dijalankan sebagai pengali level terhadap deret proyeksi, bukan terhadap tingkat pertumbuhan. Jadwal pembiayaan **tidak** ikut berubah, karena kewajiban ke pemberi dana bersifat tetap tanpa memandang realisasi usaha.

| Varian | Pengali pendapatan | Pengali opex | Tafsir |
|---|---|---|---|
| `base` | 1,00 | 1,00 | Asumsi apa adanya dari pengguna |
| `best` | 1,08 | 0,97 | Penjualan di atas rencana, efisiensi biaya tercapai |
| `worst` | 0,90 | 1,05 | Penjualan meleset 10%, biaya membengkak 5% |

Angka ini sengaja konservatif dan simetris agar bisa dijelaskan. Varian yang dikalibrasi per sektor atau ditarik dari distribusi masuk cakupan V2 (sensitivity) dan V3 (Monte Carlo).

## 9. User Stories (Functional Requirements MVP)

1. **Sebagai pengguna**, saya bisa membuat skenario baru melalui form empat langkah (§7), dengan validasi yang menolak kombinasi tidak sah (misalnya skema konvensional tetapi jenis akad terisi).
2. **Sebagai pengguna**, saya bisa melihat proyeksi arus kas bulanan untuk varian base/best/worst dalam bentuk tabel dan grafik, dengan kolom CFADS, debt service, dan arus kas bersih terpisah.
3. **Sebagai pengguna**, saya bisa melihat DSCR per periode dengan indikator visual berdasarkan ambang 1,25 dan 1,00, serta melihat DSCR terendah sepanjang tenor.
4. **Sebagai pengguna**, saya bisa melihat biaya efektif tahunan (EAR) skenario dan membandingkannya dengan angka kuotasi yang saya masukkan.
5. **Sebagai pengguna**, saya bisa melihat DER, ROI, dan Break-Even Point (omzet impas bulanan, dalam rupiah dan sebagai persentase omzet saat ini).
6. **Sebagai pengguna**, saya bisa melihat NPV dan IRR dengan discount rate yang bisa saya ubah, dan hasilnya dihitung ulang tanpa perlu membuat skenario baru.
7. **Sebagai pengguna**, saya bisa membuka panel "Bagaimana ini dihitung" di setiap metrik untuk melihat rumus dan nilai masukannya.
8. **Sebagai pengguna**, saya bisa melihat daftar semua skenario di dashboard dengan status kelayakan, DSCR rata-rata, EAR, dan NPV.
9. **Sebagai pengguna**, saya bisa mengubah skenario yang sudah dibuat; hasil perhitungan tersimpan otomatis diperbarui.
10. **Sebagai pengguna**, saya bisa menghapus skenario dengan konfirmasi terlebih dahulu.
11. **Sebagai pengguna**, saya melihat pesan yang jelas ketika sebuah metrik tidak terdefinisi (§10), bukan `NaN` atau halaman error.
12. **Sebagai pengunjung landing page**, saya memahami apa yang bisa dilakukan alat ini dan bisa langsung masuk ke dashboard/login.

## 10. Kasus Batas & Penanganannya

Kasus-kasus berikut muncul pada seed data dan harus ditangani, bukan diserahkan ke perilaku bawaan JavaScript.

| Kondisi | Perilaku yang diharapkan |
|---|---|
| CFADS negatif (opex > pendapatan) | DSCR ditampilkan negatif dengan badge `risky` dan catatan "arus kas usaha negatif". Terjadi pada seed #14. |
| Debt service = 0 (tingkat biaya 0% dan pokok 0) | DSCR tidak terdefinisi, tampilkan `—`. Tidak boleh `Infinity`. |
| Seluruh arus kas inkremental negatif | IRR tidak terdefinisi. Tampilkan `—` dengan tooltip "IRR tidak dapat dihitung karena seluruh arus kas proyek negatif". |
| IRR punya lebih dari satu akar (tanda arus kas berubah > 1 kali) | Kembalikan akar pertama pada rentang wajar dan tandai "hasil IRR tidak unik — gunakan NPV sebagai acuan utama". |
| Ekuitas awal = 0 | DER tidak terdefinisi, tampilkan `—`. Validasi form mencegah nilai 0. |
| Margin kontribusi menghasilkan biaya tetap negatif | BEP tetap dihitung, tetapi diberi catatan bahwa margin kontribusi kemungkinan lebih rendah dari yang diisi. |
| Tenor sangat panjang (> 120 bulan) | Tabel arus kas diringkas per tahun secara bawaan, detail bulanan tersedia lewat toggle. |

## 11. Batasan Model yang Diakui

Dinyatakan terbuka agar hasil tidak dibaca melebihi kemampuannya, dan agar konsisten dengan prinsip transparansi di §3.

- **Tanpa nilai residu.** Valuasi berhenti di akhir tenor; aset yang masih produktif setelahnya tidak dihitung. Akibatnya NPV cenderung *understate*, terutama pada tenor pendek dengan aset berumur panjang.
- **Tanpa pajak.** Seluruh arus kas dihitung sebelum pajak penghasilan badan.
- **Tanpa modal kerja bergulir.** Perubahan piutang, persediaan, dan utang usaha tidak dimodelkan.
- **Pertumbuhan deterministik dan mulus.** Pendapatan tumbuh secara majemuk bulanan tanpa musiman. Untuk usaha dengan siklus panen atau musim ramai (seed #4, #17, #20) ini penyederhanaan yang cukup besar.
- **Tanpa risiko gagal bayar.** Model mengasumsikan seluruh angsuran dibayar tepat waktu; tidak ada denda, restrukturisasi, atau *grace period*.
- **EAR mengabaikan biaya di luar jadwal angsuran.** Biaya administrasi, asuransi/takaful, notaris, dan provisi tidak diperhitungkan. Dalam praktiknya biaya ini bisa menggeser EAR beberapa poin persentase.
- **Musyarakah mutanaqishah disederhanakan** menjadi pokok lurus ditambah imbal hasil atas sisa porsi kepemilikan bank. Skema riil dapat memakai porsi bagi hasil yang dinegosiasikan terpisah dari nisbah kepemilikan.

Catatan-catatan ini ditampilkan sebagai bagian *collapsible* di halaman detail skenario, bukan hanya hidup di dokumen ini.

## 12. Sistem Desain

**Arahan:** clean, modern, premium. Melanjutkan identitas visual dari dokumen konsep (LaTeX): teal gelap + amber, dengan warna semantik untuk indikator kelayakan.

### 12.1 Palet Warna (token)

| Token | Hex | Peran | Kontras vs `ivory` |
|---|---|---|---|
| `deepteal` | `#0B4F4A` | Brand utama, heading, navigasi | 9,4:1 — AAA |
| `amber` | `#C1892E` | Aksen dan sorotan | 2,9:1 — **hanya untuk elemen ≥ 24px atau non-teks** |
| `amber-deep` | `#8A5F16` | Teks/ikon di atas latar terang bila perlu warna amber | 5,6:1 — AA |
| `ivory` | `#FAF7EF` | Latar utama (hangat, bukan putih polos) | — |
| `ink` | `#14201F` | Teks utama | 15,8:1 — AAA |
| `slate` | `#5B6472` | Teks sekunder/caption | 5,3:1 — AA |
| `feasible` | `#3F7C58` | Indikator DSCR aman (hijau hutan) | 4,9:1 — AA |
| `watch` | `#8A6D1F` | Indikator DSCR perlu perhatian | 5,4:1 — AA |
| `risky` | `#B5533C` | Indikator DSCR tidak aman (terracotta) | 4,6:1 — AA |

Token `watch` dan `amber-deep` adalah tambahan v1.1. `watch` diperlukan karena §5.1 mendefinisikan tiga tingkat status, sedangkan v1.0 hanya menyediakan dua warna. `amber-deep` diperlukan karena `amber` di atas `ivory` tidak lolos kontras 4,5:1 untuk teks berukuran normal — dipakai untuk tombol dan garis aksen, bukan untuk teks kecil.

### 12.2 Tipografi (3 peran, via `next/font/google`)

| Peran | Font | Alasan |
|---|---|---|
| Display/Heading | **Poppins** (600/700) | Melanjutkan identitas dokumen konsep; geometris, tegas |
| Body/UI | **Inter** (400/500) | Legibilitas tinggi untuk antarmuka padat data |
| Angka/Data finansial | **JetBrains Mono** (400/500) | *Tabular figures* agar kolom angka sejajar — memperkuat kesan presisi, bukan dekorasi |

### 12.3 Prinsip Layout

- Latar ivory, bukan putih polos atau near-black — konsisten dengan nuansa dokumen cetak.
- Border-radius sedang (`8px` kartu, `6px` kontrol) — premium tapi bersahabat.
- Data finansial selalu memakai font mono dengan `font-variant-numeric: tabular-nums`.
- Indikator kelayakan memakai warna semantik **dan** teks/ikon, tidak hanya warna — agar tetap terbaca oleh pengguna dengan defisiensi penglihatan warna.
- Angka rupiah ditulis ringkas di kartu ringkasan (`Rp1,2 M`, `Rp450 jt`) dan lengkap di tabel (`Rp450.000.000`).
- Hindari elemen dekoratif tanpa fungsi — kerapian dan keterbacaan data adalah prioritas.

## 13. Non-Functional Requirements

**Keamanan & akses**
- Autentikasi privat (Better Auth). Pendaftaran publik dimatikan; akun awal dibuat lewat skrip, bukan halaman *sign-up*.
- Setiap Server Action memverifikasi sesi dan memastikan skenario yang diakses milik pengguna tersebut. Tidak ada endpoint yang menerima `userId` dari klien.
- Seluruh kalkulasi finansial dijalankan di server (Server Actions), bukan di client.

**Ketepatan numerik**
- Nilai rupiah disimpan sebagai bilangan bulat (`bigint`) dalam satuan rupiah penuh — kolom `integer` PostgreSQL akan meluap di atas Rp2,147 miliar, dan seed data sudah menyentuh Rp2 miliar.
- Persentase disimpan sebagai `numeric` dengan presisi tetap, bukan `float`.
- Toleransi pembulatan yang diterima pada validasi: ±Rp1 untuk nilai uang, ±0,0001 untuk rasio dan tingkat.

**Kinerja**
- Perhitungan satu skenario tenor 60 bulan untuk tiga varian selesai < 50 ms di server.
- Dashboard membaca hasil dari cache (`scenario_results`), tidak menghitung ulang saat render.
- LCP landing page < 2,5 detik pada koneksi 4G simulasi.

**Aksesibilitas**
- Target WCAG 2.1 AA: kontras teks ≥ 4,5:1, seluruh alur form dapat diselesaikan dengan keyboard, setiap input punya label terkait, dan pesan galat terhubung ke input lewat `aria-describedby`.
- Grafik menyediakan padanan tabel sebagai sumber data yang dapat dibaca pembaca layar.

**Responsivitas**
- Desktop adalah target utama; tablet (≥ 768px) harus tetap nyaman dipakai. Di bawah 768px, tabel arus kas beralih ke tampilan kartu dengan gulir horizontal.

**Kemudahan diperluas**
- Skema database dirancang agar mudah diperluas ke tabel fase lanjutan (`assumptions` dengan distribusi, `akad_structures` terpisah, `simulation_runs`, `ai_*`) tanpa migrasi besar-besaran. Enum disimpan sebagai `pgEnum` agar penambahan akad baru terkendali.

## 14. Metrik Keberhasilan MVP

Kriteria di bawah dapat diverifikasi, bukan sekadar dinyatakan.

1. **Kebenaran formula.** Seluruh nilai acuan pada tabel uji di `IMPLEMENTATION_PLAN.md` §7 lolos dengan toleransi ±Rp1 / ±0,0001. Minimal 3 kasus seed (#1, #4, #14) juga dicocokkan manual dengan spreadsheet pembanding.
2. **Kelengkapan alur.** Seluruh 20 skenario seed dapat dibuka, dihitung, diubah, dan dihapus tanpa error di konsol maupun server.
3. **Distribusi hasil masuk akal.** Ketiga skenario berprofil risiko tinggi (#4, #14, #20) tidak berstatus `LAYAK`, dan tidak ada skenario berisiko rendah yang berstatus `TIDAK LAYAK`.
4. **Normalisasi bekerja.** EAR seluruh seed berada pada rentang 10%–16%, sehingga skema syariah dan konvensional benar-benar sebanding meski basis kuotasinya berbeda.
5. **Kasus batas tertangani.** Tidak ada `NaN`, `Infinity`, atau `null` yang bocor ke UI pada seluruh 20 skenario dan ketiga variannya.
6. **Aksesibilitas.** Audit Lighthouse pada `/` dan `/dashboard` mendapat skor Accessibility ≥ 95, tanpa pelanggaran kontras.
7. **Responsif.** Landing page, dashboard, dan halaman detail dapat digunakan pada 1440px, 1024px, dan 768px.

## 15. Landing Page — Tujuan & Pesan Kunci

**Tujuan halaman:** menjelaskan satu proposisi nilai inti — analisis kelayakan pembiayaan syariah dan konvensional dalam satu kerangka yang transparan — dan mengarahkan pengguna masuk ke dashboard.

**Pesan kunci per bagian** (copy lengkap dan spesifikasi implementasi ada di `IMPLEMENTATION_PLAN.md` §9):

1. **Hero** — tesis utama: satu kebutuhan dana, dua skema, satu perbandingan yang adil. Elemen visual signature: perbandingan sisi-berdampingan biaya efektif syariah vs konvensional, memakai angka nyata dari tabel §2 (bukan headline + gradient generik).
2. **Masalah** — kenapa perbandingan syariah–konvensional biasanya tidak apple-to-apple: perbedaan basis kuotasi flat vs saldo menurun.
3. **Cara kerja** — 3 langkah: isi asumsi → engine menghitung → lihat hasil transparan.
4. **Prinsip transparansi** — tidak ada skor kotak hitam; setiap metrik membuka rumusnya.
5. **CTA** — masuk ke dashboard.

Elemen signature di hero mengambil angka dari §2 karena itu demonstrasi paling ringkas dari proposisi nilai: dua kuotasi yang terlihat berlawanan (8% vs 12%) ternyata berbalik urutannya setelah dinormalkan.

## 16. Roadmap Pasca-MVP

| Fase | Cakupan |
|---|---|
| V2 | Sensitivity engine + tornado chart; Akad Comparator penuh (multi-skema berdampingan); terminal value pada valuasi |
| V3 | Monte Carlo engine + visualisasi distribusi; Anomaly Detection |
| V4 | Structure Optimizer; Document Extraction Agent; Assumption Calibration Agent |
| V5 | Narrative Generation Agent; Conversational Copilot; Sharia Reasoning Agent (dengan alur konfirmasi DPS) |

Detail teknis tiap modul mengikuti dokumen konsep komprehensif (LaTeX) yang sudah disusun sebelumnya.

## 17. Ringkasan Perubahan v1.0 → v1.1

| # | Temuan pada v1.0 | Perbaikan di v1.1 |
|---|---|---|
| 1 | `calculateDER`, `calculateROI`, dan `calculateBreakEven` memerlukan input (ekuitas, harga jual/unit, biaya variabel/unit) yang tidak ada di form maupun skema DB | Ditambahkan `ekuitasAwal`, `kewajibanLain`, dan `marginKontribusiPersen`. BEP dinyatakan dalam omzet rupiah, bukan unit — sesuai untuk usaha jasa dan ritel campuran (§7) |
| 2 | Basis kuotasi flat vs efektif tidak dibedakan, sehingga perbandingan justru tidak apple-to-apple — bertentangan dengan proposisi nilai produk | Ditambahkan field `basisTingkatBiaya` dan normalisasi EAR sebagai perhitungan inti (§2, §5) |
| 3 | Varian base/best/worst disebut tanpa definisi kuantitatif | Pengali eksplisit dan tetap (§8) |
| 4 | NPV/IRR tidak menyatakan arus kas mana yang didiskonto; memakai arus kas seluruh usaha akan menghasilkan IRR di atas 100% yang menyesatkan | Valuasi memakai arus kas **inkremental** dengan dua field baru (§5, §7) |
| 5 | Discount rate disebut "bisa diubah" tetapi tidak tersimpan di skema | `discountRateTahunan` menjadi kolom skenario |
| 6 | User story "mengedit skenario" ada, tetapi tidak ada route maupun Server Action untuk itu | `updateScenario` dan route edit masuk cakupan (§9) |
| 7 | Tabel `scenarios` tidak memiliki `userId` padahal produk memakai Better Auth | `userId` wajib dan seluruh query difilter per pengguna (§13) |
| 8 | Kolom `integer` untuk rupiah meluap di atas Rp2,147 miliar sementara seed #20 bernilai Rp2 miliar | Nilai uang memakai `bigint` (§13) |
| 9 | Tidak ada penanganan `NaN`/`Infinity` untuk DSCR dan IRR | Tabel kasus batas (§10) |
| 10 | Palet hanya punya dua warna status untuk tiga tingkat, dan `amber` tidak lolos kontras untuk teks | Token `watch` dan `amber-deep` (§12.1) |
| 11 | Batasan model tidak dinyatakan, padahal produk mengklaim transparansi penuh | Bagian batasan yang diakui (§11) |
| 12 | Metrik keberhasilan tidak terukur ("hasil yang masuk akal") | Tujuh kriteria yang dapat diverifikasi (§14) |
