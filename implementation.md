
# Implementation Plan: Import Anggaran dari Excel

## Tujuan

Menambahkan alur untuk mengimpor anggaran bulanan dari file Excel ke modul Budget. Setiap baris merepresentasikan satu anggaran untuk satu nama anggaran/account, satu departemen, satu bulan, satu tahun, dan satu nominal. Pengguna dapat memeriksa dan menyelesaikan masalah data sebelum perubahan diterapkan.

## Aturan Import yang Disepakati

1. Satu baris Excel berisi satu kombinasi nama anggaran, departemen, bulan, tahun, dan nominal budget.
2. Departemen harus dipetakan ke departemen yang sudah terdaftar. Sistem tidak membuat departemen baru otomatis.
3. Nama anggaran/account yang belum dikenal harus dipetakan ke data yang sudah ada atau dibuat secara eksplisit oleh pengguna saat proses preview.
4. Kunci pencocokan anggaran adalah kombinasi departemen + account + tahun + bulan.
5. Jika kunci sudah ada, nilai lama ditampilkan bersama nilai baru. Setelah pengguna mengonfirmasi import, nilai lama diganti nilai baru (upsert/replace), bukan dijumlahkan.
6. Baris dengan nilai yang sama ditandai “Tidak berubah” dan tidak perlu ditulis ulang.
7. Tidak ada perubahan data sebelum konfirmasi akhir.

## Alur Pengguna

1. Pengguna membuka aksi **Import Excel** pada halaman Budget dan memilih file `.xlsx` atau `.xls` yang didukung.
2. Sistem membaca workbook dan menentukan sheet/header yang dipakai, lalu menampilkan preview.
3. Sistem menormalisasi header dan nilai dasar (spasi, format angka, nama bulan, serta tahun), tanpa mengubah isi file.
4. Sistem mencocokkan departemen dan nama anggaran dengan data yang tersedia.
5. Pengguna memperbaiki pemetaan yang tidak cocok: pilih departemen/account yang ada, atau buat account baru secara eksplisit jika memang dibutuhkan dan diizinkan.
6. Sistem memvalidasi semua baris dan menampilkan ringkasan: data baru, nilai yang akan ditimpa, tidak berubah, duplikat, dan bermasalah.
7. Pengguna meninjau perubahan dan menekan **Import** untuk menerapkannya.
8. Sistem menampilkan hasil, termasuk jumlah berhasil dan baris yang tidak diimpor bila ada.

## Tahapan Implementasi

### Tahap 1 — Kontrak data dan aturan validasi

- Cocokkan kolom yang tersedia di workbook dengan skema budget aplikasi: nama anggaran/account, bulan, tahun, departemen, dan jumlah.
- Definisikan tipe hasil parsing, misalnya `ParsedBudgetRow`, `ImportRowStatus`, `BudgetImportPreview`, dan daftar error per baris.
- Definisikan status baris: `new`, `update`, `unchanged`, `duplicate`, `invalid`, atau `unmapped`.
- Tetapkan aturan nilai: nominal harus angka valid dan tidak negatif; bulan harus dikenali; tahun harus valid; field wajib tidak boleh kosong.
- Tentukan kebijakan bila beberapa baris file memiliki kunci yang sama. Rekomendasi: tandai sebagai duplikat dan minta pengguna memperbaiki file, jangan memilih nilai secara diam-diam.

### Tahap 2 — Pembacaan workbook

- Tambahkan dependency pembaca Excel yang sesuai dengan stack proyek hanya setelah memeriksa dependency yang sudah ada.
- Batasi format file dan ukuran yang diterima; tampilkan error yang dapat dipahami jika file rusak, kosong, atau sheet tidak berisi kolom wajib.
- Izinkan pengguna memilih sheet bila workbook berisi lebih dari satu sheet yang relevan.
- Parsing dilakukan di sisi klien untuk preview, tanpa mengirim atau menyimpan file di server kecuali arsitektur backend nantinya mengharuskannya.
- Jangan menjalankan formula dari workbook; gunakan nilai tersimpan dan tangani cell kosong atau format angka secara eksplisit.

### Tahap 3 — Preview dan pemetaan

- Buat UI langkah import yang menyediakan pemilihan file, preview tabel, dan ringkasan validasi.
- Tampilkan nomor baris sumber agar pengguna mudah memperbaiki workbook.
- Tampilkan kolom sumber dan nilai yang telah dibaca, serta nilai target yang telah dipetakan.
- Pencocokan nama dapat menormalisasi kapitalisasi dan spasi, tetapi tidak boleh otomatis menganggap nama mirip sebagai identik tanpa pilihan pengguna.
- Untuk departemen/account yang tidak cocok, sediakan pilihan pemetaan ke entitas terdaftar. Pembuatan account baru harus berupa aksi eksplisit dan meminta detail yang diperlukan.
- Tampilkan nilai lama dan nilai baru pada baris `update`; tandai baris `unchanged` dan jelaskan bahwa baris tersebut tidak akan mengubah data.
- Cegah konfirmasi import jika masih ada baris invalid, duplikat, atau belum dipetakan yang dipilih untuk diimpor. Beri opsi mengecualikan baris bermasalah jika kebijakan produk mengizinkan import parsial.

### Tahap 4 — Penerapan import

- Sebelum konfirmasi, hitung ulang preview terhadap state data terbaru agar perubahan yang terjadi sejak preview tidak tertimpa secara tak terduga.
- Terapkan semua baris valid yang dipilih sebagai satu aksi atomik pada state/data store yang tersedia.
- Untuk kunci yang belum ada, buat budget baru; untuk kunci yang sama, ganti nominal dengan nilai Excel.
- Jangan mengubah realisasi, dana ditahan, atau riwayat PPD ketika mengganti nominal budget. Terapkan validasi aturan budget yang sudah ada, termasuk batas minimum sebesar realisasi + dana ditahan.
- Jika suatu update melanggar aturan tersebut, tandai error dan minta koreksi nominal atau pengecualian baris; jangan diam-diam mengubah nilai.
- Tampilkan hasil import dan perbarui tampilan budget sesuai periode yang diimpor.

### Tahap 5 — Integrasi dan pemeliharaan

- Tambahkan tombol/dialog import pada `BudgetView` atau container halaman budget, bukan pada komponen presentasi tabel.
- Pisahkan parser, validator, dan kalkulasi preview dari komponen UI agar dapat dipakai ulang dan diperiksa secara terisolasi.
- Pertahankan format model agar dapat dipakai oleh API/database di masa depan; jangan mengikat parser langsung ke bentuk state UI.
- Sediakan template Excel dan petunjuk header/format kolom agar pengguna dapat menyiapkan file dengan konsisten.

## Kriteria Penerimaan

- File yang valid menghasilkan preview yang benar sebelum data berubah.
- Baris dengan departemen atau account tidak dikenal dapat dipetakan atau ditandai untuk diperbaiki; tidak ada entitas yang dibuat diam-diam.
- Baris dengan kombinasi yang sudah ada menampilkan nominal lama dan baru, lalu mengganti nominal hanya setelah konfirmasi.
- Baris identik tidak menghasilkan perubahan.
- Baris duplikat dalam file dan input invalid ditunjukkan dengan nomor baris yang jelas.
- Nilai realisasi dan dana ditahan tetap utuh; update di bawah batas minimum yang diizinkan ditolak dengan pesan jelas.
- Pengguna melihat ringkasan hasil setelah import selesai.

## Risiko dan Mitigasi

- **Nama berbeda tipis menyebabkan duplikasi:** gunakan pemetaan eksplisit, jangan auto-create dari teks bebas.
- **Overwrite tidak disengaja:** preview perubahan lama/baru dan konfirmasi akhir wajib.
- **Workbook memiliki format tidak konsisten:** validasi header, tipe angka, sheet, dan tanggal/bulan; tampilkan error per baris.
- **Duplikat menimpa satu sama lain:** deteksi duplikat internal file sebelum menerapkan import.
- **Preview usang:** hitung ulang konflik dengan data terbaru sebelum commit.
- **Update melanggar komitmen dana:** validasi terhadap realisasi dan dana ditahan sebelum menyimpan.

## Di Luar Cakupan Awal

- Menyimpan arsip file Excel yang diunggah.
- Membuat departemen baru otomatis.
- Sinkronisasi atau rollback import dari file historis.
- Import data realisasi atau transaksi PPD.
- Mengubah struktur database/backend kecuali dibutuhkan oleh tahap integrasi berikutnya.

## Keputusan Tambahan: Cakupan Import dan Export

Import mendukung dua cakupan yang berbeda:

1. **Import tahunan**: file dapat memuat anggaran untuk beberapa atau seluruh bulan dalam satu tahun. Setiap baris diproses mandiri berdasarkan departemen, account/nama anggaran, tahun, dan bulan.
2. **Import tabel/periode tertentu**: dari tabel anggaran yang sedang dibuka, pengguna dapat mengekspor data tabel sebagai file lalu mengimpor file revisi untuk rebudgeting. Import dibatasi ke cakupan tabel tersebut, termasuk departemen, tahun, dan bulan/periode yang sedang dipilih.

Keduanya memakai preview, pemetaan, validasi, dan konfirmasi yang sama. Cakupan file ditampilkan dengan jelas sebelum pengguna mengonfirmasi.

### Export dari tabel

- Sediakan aksi **Export** pada setiap tabel yang mendukung ekspor anggaran.
- Ekspor mengikuti cakupan tabel yang sedang dibuka (misalnya departemen terpilih dan periode filter), tetapi tidak dipersempit oleh pencarian teks atau pagination sehingga file tetap menjadi representasi lengkap tabel/periode tersebut.
- Sertakan kolom identitas stabil seperti `accountId` dan `departmentId`, beserta nama/kode yang dapat dibaca, tahun, bulan, dan nominal budget. ID dipakai untuk pencocokan; nama/kode membantu pengguna meninjau dan mengedit file.
- Sertakan petunjuk penggunaan dan format file pada sheet terpisah atau baris/header yang tidak ambigu. Format hasil export dapat diimpor kembali sebagai template.

### Aturan import berdasarkan cakupan

- Import tahunan menerima baris dari banyak bulan pada tahun yang sama. Tampilkan tahun yang terdeteksi dan minta pengguna memastikan cakupan sebelum lanjut. Jika terdapat lebih dari satu tahun, beri ringkasan dan validasi cakupan secara eksplisit.
- Import dari tabel hanya menerima baris yang cocok dengan departemen dan periode tabel tersebut. Baris di luar cakupan ditandai sebagai error agar tidak mengubah tabel/periode lain secara tidak sengaja.
- Import bersifat **parsial/upsert**: hanya baris yang tercantum dalam file yang diproses. Baris tabel yang tidak tercantum tidak dihapus, dikosongkan, atau diubah menjadi nol.
- Untuk baris yang cocok dengan data existing, tampilkan nilai lama dan baru dan ganti nilai setelah konfirmasi. Baris baru ditambahkan sesuai aturan validasi.
- Gunakan ID stabil dari file export jika tersedia. Untuk file tanpa ID, lakukan pemetaan berdasarkan departemen + account + tahun + bulan dan tandai ketidakcocokan agar ditinjau pengguna.
- Deteksi duplikat berdasarkan kunci tersebut di dalam file, termasuk jika ID dan label memberi hasil pencocokan yang bertentangan.

### Kriteria penerimaan tambahan

- Pengguna dapat mengekspor tabel/periode yang sedang dibuka, mengedit nominal, lalu mengimpor ulang file itu untuk rebudgeting.
- File revisi yang hanya memuat beberapa baris hanya mengubah baris tersebut; data lain pada tabel tetap utuh.
- Import tabel menolak atau meminta pengguna mengecualikan baris dari departemen/periode lain.
- Import tahunan dapat memproses beberapa bulan dalam satu file, dengan preview dan ringkasan perubahan per bulan.
- File export mempertahankan identitas yang cukup agar dapat diimpor kembali tanpa mengandalkan kecocokan nama yang rapuh.
