# IMPLEMENTASI PRD — Analytical Engine & Web App Kelayakan Pembiayaan

Baca `docs/PRD.md` dan `docs/IMPLEMENTATION_PLAN.md` — itu referensi utama.
Ikuti 8 fase di `.claude-instruction.md`.

Aturan:
1. Engine di /lib/engine/ adalah fungsi murni — no db, no fetch, no process.env
2. Uang = bigint di DB, number bulat di engine
3. No NaN/Infinity — null untuk tak terdefinisi
4. Setiap Server Action verifikasi sesi + kepemilikan
5. Jangan gunakan em dash (—) di UI
6. Gunakan Recharts untuk grafik
7. Token warna di globals.css sesuai PRD §12