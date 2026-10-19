# Implementation Plan: Menghapus Data Dummy dan Menghubungkan Modul ke Database

## Tujuan

Menjadikan database sebagai sumber data utama aplikasi. Setelah migrasi, halaman dan komponen tidak lagi menampilkan data contoh seolah-olah data produksi. Data awal hanya boleh masuk melalui proses seed yang disengaja untuk kebutuhan setup lokal, bukan sebagai fallback runtime.

## Kondisi Saat Ini

- Departemen dan budget sudah memiliki model Prisma, query data, server action, dan sebagian halaman yang terhubung ke database.
- `lib/budget-data.ts` masih menggabungkan data database dengan `DRAF_LOGS` dan fixture budget untuk menyusun data halaman.
- Form PPD masih memakai `INITIAL_DRAFTS`, daftar departemen/account statis, dan `INITIAL_BUDGETS`.
- Tabel laporan PPD masih membaca batas budget dari fixture dan menggunakan periode tetap.
- `prisma/seed.ts` membuat contoh departemen, anggota, account, dan budget dari fixture UI.
- Sidebar memiliki data contoh yang perlu ditelusuri dan diganti dengan data sesi/navigasi yang benar jika memang ditampilkan sebagai data pengguna.

## Prinsip Implementasi

1. Database menjadi satu-satunya sumber data runtime untuk entitas bisnis.
2. Data kosong ditampilkan sebagai empty state; jangan mengisi halaman dengan data contoh sebagai fallback.
3. Seed dipisahkan dari data aplikasi. Menjalankan aplikasi atau migrasi tidak boleh otomatis membuat contoh data bisnis.
4. Jangan menghapus data produksi untuk menghilangkan dummy. Data lama perlu diidentifikasi, ditinjau, lalu dibersihkan secara terkontrol jika sudah ada di database.
5. Pertahankan riwayat finansial. Gunakan status nonaktif/arsip untuk entitas yang sudah direferensikan, bukan penghapusan yang merusak relasi.
6. Simpan nominal sebagai tipe Decimal di Prisma dan ubah ke tipe tampilan hanya pada boundary data.

## Tahap 1 — Audit dan inventarisasi data contoh

- Telusuri seluruh `app`, `components`, `lib`, dan `prisma` untuk fixture, fallback hardcoded, tanggal/periode tetap, ID contoh, dan data sesi palsu.
- Kelompokkan temuan menjadi: data runtime UI, data seed, data autentikasi, dan teks placeholder. Placeholder input bukan data dummy dan tidak perlu dihapus.
- Untuk setiap modul, catat sumber data yang diharapkan, model database yang tersedia, operasi yang belum tersedia, dan halaman/komponen yang mengonsumsinya.
- Pastikan data yang saat ini ada di database memang data contoh sebelum menyusun langkah penghapusan. Jangan menganggap semua record awal pasti aman dihapus.

## Tahap 2 — Tetapkan model dan kontrak data

- Pertahankan model `Department`, `DepartmentMember`, `DepartmentAnnualBudget`, `BudgetAccount`, dan `MonthlyBudget` sebagai fondasi departemen/budget.
- Tetapkan keputusan bisnis hubungan pagu tahunan dan alokasi bulanan: pagu tahunan adalah batas tersendiri atau hanya hasil penjumlahan budget bulanan. Terapkan satu makna secara konsisten pada query dan validasi.
- Rancang model PPD sebelum memindahkan form dari state lokal, minimal mencakup pengajuan, pemilik/departemen, periode, jenis pembayaran, detail item, nominal, status, dan metadata waktu.
- Rancang relasi PPD dengan user, departemen, account, serta budget bulan terkait. Gunakan foreign key dan aturan penghapusan yang menjaga histori.
- Tetapkan tipe input/output untuk query dan server action supaya komponen UI menerima data siap tampil tanpa mengimpor fixture.
- Buat migration Prisma untuk perubahan skema; jangan mengubah database manual tanpa migration yang tercatat.

## Tahap 3 — Hilangkan fixture dari modul Budget dan Departemen

- Ubah `lib/budget-data.ts` agar membaca seluruh data yang diperlukan dari Prisma, termasuk ringkasan aktivitas yang saat ini diambil dari fixture.
- Hilangkan pencampuran `DRAF_LOGS` atau fixture budget ke dalam hasil query. Jika ringkasan tersebut perlu dipertahankan, bangun dari data transaksi nyata atau tampilkan empty state sampai modul sumbernya tersedia.
- Pastikan halaman budget membaca department, account, pagu, alokasi bulanan, dan realisasi dari database dengan filter periode yang dipilih, bukan periode hardcoded.
- Pastikan halaman departemen menampilkan data database dan keadaan kosong yang jelas saat belum ada departemen.
- Pertahankan create/edit/archive dan import yang sudah ada, tetapi pastikan validasi tetap dilakukan di server action dan UI memperbarui hasil dari respons database.
- Hapus file fixture departemen/budget hanya setelah tidak ada lagi import yang menggunakannya. Jangan menghapus tipe domain yang masih diperlukan.

## Tahap 4 — Hubungkan PPD ke database

- Tambahkan query server untuk mengambil draft/pengajuan PPD, daftar departemen aktif, account aktif, dan pagu budget berdasarkan periode yang dipilih.
- Muat data awal PPD dari server page dan kirim sebagai props ke komponen client. Form baru harus dimulai sebagai draft kosong; jangan membuat draft contoh otomatis.
- Ganti pemilihan departemen dan account statis dengan data dari database. Account yang ditawarkan harus dibatasi ke departemen yang dipilih.
- Ganti pengecekan sisa budget berbasis `INITIAL_BUDGETS` dan periode tetap dengan data dari query database. Definisikan jelas apakah validasi menghitung alokasi, realisasi, dan pengajuan yang masih menahan dana.
- Simpan perubahan draft dan detail baris melalui server action. Pastikan tambah, edit, hapus, dan pemilihan draft bekerja terhadap ID database, bukan ID seperti `draft-1` atau `row-${Date.now()}` sebagai identitas persisten.
- Sajikan loading, empty, error, dan sukses secara eksplisit agar data kosong atau gagal dimuat tidak terlihat seperti nilai nol yang valid.

## Tahap 5 — Bersihkan seed dan pemuatan awal

- Hentikan penggunaan fixture komponen sebagai sumber `prisma/seed.ts`.
- Pisahkan kebutuhan bootstrap administrator dari data contoh departemen/budget. Kredensial awal tidak boleh dibuat diam-diam oleh alur runtime, dan pengaturan awal harus terdokumentasi serta aman untuk lingkungan target.
- Jadikan seed demo opsional dan eksplisit untuk development saja, atau hapus seed demo jika tidak diperlukan. Seed untuk development harus memakai dataset yang jelas diberi label contoh dan tidak otomatis berjalan pada deployment.
- Pastikan migrasi hanya mengubah struktur dan tidak menyisipkan data dummy.
- Setelah migrasi konsumen selesai, hapus `INITIAL_DEPARTMENTS`, `ACCOUNTS`, `DEPARTMENTS`, `INITIAL_BUDGETS`, `DRAF_LOGS`, `INITIAL_DRAFTS`, dan fixture lain yang sudah tidak direferensikan.

## Tahap 6 — Bersihkan data dummy yang mungkin sudah tersimpan

- Periksa record yang sudah tersimpan pada database target dan tentukan bersama pemilik data mana yang merupakan data uji.
- Siapkan daftar record terdampak berdasarkan identitas bisnis yang bisa diverifikasi; jangan menghapus hanya berdasarkan nama yang tampak generik.
- Gunakan backup dan migration/script pembersihan yang dapat ditinjau sebelum dijalankan. Untuk record yang sudah direferensikan transaksi, pertimbangkan arsip/nonaktif alih-alih delete.
- Jalankan pembersihan hanya setelah database target dan record yang dimaksud telah dipastikan. Lingkungan development dapat dibersihkan terpisah dari staging/production.

## Tahap 7 — Penanganan tampilan dan error

- Tambahkan empty state untuk daftar budget, departemen, anggota, draft PPD, dan account yang belum tersedia.
- Bedakan data kosong dari kegagalan query; tampilkan pesan error dan sediakan tindakan muat ulang bila sesuai.
- Pastikan tidak ada fallback ke fixture ketika query gagal. Fallback semacam itu menyamarkan masalah koneksi dan menampilkan data yang menyesatkan.
- Perbarui sidebar atau ringkasan pengguna agar menggunakan identitas/session nyata; hapus label atau statistik contoh yang tampil sebagai data pengguna.

## Tahap 8 — Urutan penerapan

1. Audit fixture dan verifikasi data database yang sudah ada.
2. Sepakati makna pagu tahunan versus anggaran bulanan dan aturan sisa budget PPD.
3. Tambahkan model dan migration PPD yang dibutuhkan.
4. Implementasikan query dan server action PPD.
5. Migrasikan Budget dan Departemen agar seluruh hasil runtime hanya dari database.
6. Migrasikan PPD dari fixture/state lokal ke database.
7. Pisahkan/hentikan seed demo dan hapus fixture yang tidak lagi dipakai.
8. Tinjau data di setiap lingkungan dan lakukan pembersihan terkontrol bila diperlukan.
9. Periksa alur kosong, gagal memuat, create/update, dan konsistensi antar modul sebelum menyatakan migrasi selesai.

## Kriteria Penerimaan

- Tidak ada data bisnis dummy yang diimpor oleh halaman atau komponen runtime.
- Tidak ada fallback data contoh ketika query database gagal atau menghasilkan data kosong.
- Departemen, account, budget, dan PPD yang ditampilkan berasal dari database.
- Draft PPD baru tidak muncul sebelum dibuat pengguna; setelah disimpan, draft dapat dimuat kembali dari database.
- Nilai sisa budget mengikuti periode dan data realisasi/pengajuan yang berlaku, bukan fixture atau tanggal tetap.
- Fixture yang tidak digunakan telah dihapus, dan seed demo tidak berjalan otomatis di lingkungan deployment.
- Data yang memang harus dipertahankan tidak terhapus sebagai efek samping pembersihan dummy.

## Di Luar Cakupan

- Mengubah tampilan besar modul selain yang diperlukan untuk empty/loading/error state.
- Mengimplementasikan approval PPD lengkap jika alur dan peran approver belum disepakati.
- Menghapus record dari database target tanpa identifikasi dan tinjauan terpisah.
- Mengganti provider database atau sistem autentikasi kecuali audit menunjukkan hal tersebut menjadi prasyarat.
