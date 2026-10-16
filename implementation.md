# Implementation Plan: Refactor Komponen Menjadi Reusable

## Tujuan

Merapikan `BudgetView`, `PpdForm`, dan `DepartmentView` agar mudah digunakan ulang di halaman atau alur lain. Komponen tampilan menerima data dan callback melalui props; container mengelola state, data, dan aturan bisnis. Refactor mempertahankan perilaku halaman yang ada.

## Kondisi Saat Ini

- `app/dashboard/budget/page.tsx`, `app/dashboard/ppd/page.tsx`, dan `app/dashboard/department/page.tsx` masing-masing merender satu komponen fitur.
- `components/budget/budget-view.tsx` menggabungkan data contoh, kalkulasi, state filter/edit, aturan validasi, aksi budget, dan seluruh tampilan.
- `components/ppd/ppd-form.tsx` menggabungkan daftar draf, pemilihan draf, state editor, kalkulasi total, serta tampilan form.
- `components/department/department-view.tsx` menggabungkan data departemen, filter, state dialog, CRUD departemen, pengelolaan anggota, anggaran, dan tampilan.
- Data contoh dan state lokal saat ini membuat ketiga UI terikat ke sumber data dan alur spesifiknya.

## Prinsip Desain

1. Pisahkan container (state dan aturan bisnis) dari komponen presentasi (render props dan memanggil callback).
2. Gunakan tipe domain yang eksplisit untuk data dan props. Hindari props bertipe `any` dan komponen generik yang menyatukan domain berbeda.
3. Data contoh berada di modul demo/fixture, bukan di dalam komponen presentasi.
4. Komponen reusable tidak mengambil data sendiri dan tidak bergantung pada rute tertentu.
5. Pertahankan perilaku, validasi, aksesibilitas, dan tampilan yang sudah ada selama ekstraksi.
6. Ekstrak bagian yang punya batas tanggung jawab jelas; hindari memecah komponen menjadi banyak file kecil tanpa manfaat penggunaan ulang atau pemeliharaan.

## Struktur Target

Nama dan lokasi final dapat disesuaikan dengan konvensi proyek. Struktur awal yang disarankan:

```text
components/
  budget/
    budget-view.tsx                 # container halaman budget
    budget-view.types.ts            # tipe domain dan props
    budget-view.data.ts             # data demo sementara
    components/
      budget-period-filter.tsx
      department-budget-list.tsx
      account-budget-table.tsx
      budget-dialogs.tsx
  ppd/
    ppd-page.tsx                    # container daftar dan draf aktif
    ppd-form.tsx                    # editor PPD berbasis props
    ppd.types.ts
    ppd.data.ts                     # data demo sementara
    components/
      ppd-draft-list.tsx
  department/
    department-view.tsx             # container halaman departemen
    department-view.types.ts
    department-view.data.ts         # data demo sementara
    components/
      department-list.tsx
      department-detail.tsx
      department-form-dialog.tsx
      member-management.tsx
```

`components/ppd/ppd-form.tsx` saat ini berfungsi seperti halaman lengkap. Perubahan nama menjadi `PpdPage`/`PpdView` dapat dilakukan bila editor form dipisahkan, tetapi halaman route harus tetap merender container lengkap.

## Rencana Implementasi

### Tahap 1 — Tipe domain dan batas data

- Definisikan atau pisahkan tipe `Department`, `Account`, `BudgetEntry`, `DrafLogItem`, `Draft`, `ReportRow`, `Member`, beserta status dan peran yang dipakai.
- Letakkan tipe bersama pada modul domain yang relevan, bukan membuat satu file tipe besar untuk seluruh fitur.
- Pindahkan konstanta data contoh dari file komponen ke fixture/demo masing-masing.
- Tetapkan kontrak props dan callback sebelum memindahkan markup.

**Kriteria selesai:** tidak ada tipe penting yang diduplikasi antar file; presentational component tidak mengimpor data contoh.

### Tahap 2 — BudgetView

- Pertahankan `BudgetView` sebagai container pemilik periode terpilih, departemen terpilih, data budget, status edit/tambah, validasi, dan feedback.
- Ekstrak UI periode dan pencarian, daftar departemen dengan ringkasan, tabel account budget, riwayat draft, serta dialog tambah/edit ke komponen props-driven.
- Definisikan callback terarah seperti `onPeriodChange`, `onDepartmentSelect`, `onBudgetSave`, `onBudgetCreate`, dan `onCopyPreviousPeriod`.
- Pertahankan aturan bahwa budget tidak boleh di bawah nilai dana ditahan + realisasi; pertahankan juga kalkulasi saldo dan total.
- Pastikan dialog menerima data opsi dan error melalui props, bukan membaca konstanta atau state container secara langsung.

**Kriteria selesai:** container masih mengorkestrasi aksi; bagian UI hasil ekstraksi dapat menerima data berbeda tanpa mengubah implementasinya.

### Tahap 3 — PpdForm

- Pisahkan daftar draf/pencarian/filter/pemilihan dari editor PPD.
- Ubah editor menjadi form reusable yang menerima `value`/data PPD, daftar account atau opsi terkait, status submit, error, dan callback perubahan/submit.
- Tentukan satu sumber kebenaran untuk nilai form. Saat draf aktif berubah, nilai editor harus mengikuti draf yang dipilih; perubahan form tidak boleh tanpa sengaja mengubah draf lain.
- Pisahkan model data draf dari representasi baris laporan bila kebutuhan datanya berbeda.
- Pertahankan kalkulasi total, validasi field, jenis pembayaran, informasi bank, dan perilaku simpan/kirim yang ada.

**Kriteria selesai:** editor dapat dipakai untuk draf berbeda dengan props, tanpa mengakses daftar draf global atau data contoh secara langsung.

### Tahap 4 — DepartmentView

- Pertahankan `DepartmentView` sebagai container pemilik daftar departemen, filter, pilihan aktif, state dialog, dan aksi CRUD.
- Ekstrak daftar/filter departemen dan panel detail menjadi komponen presentasi.
- Buat form departemen yang bisa digunakan untuk tambah dan edit melalui props `initialValue`, `mode`, `onSubmit`, dan `onCancel`.
- Ekstrak pengelolaan anggota dengan props anggota, filter, dan callback tambah/keluarkan.
- Pertahankan aturan anggaran yang berlaku saat ini dan tautan atau tampilan budget sesuai desain produk; jangan mengubah hak edit hanya sebagai efek samping refactor.

**Kriteria selesai:** operasi tambah/edit departemen serta tambah/keluarkan anggota tetap diputuskan container dan komponen form menerima data melalui props.

### Tahap 5 — Integrasi halaman

- Pertahankan metadata dan tanggung jawab routing di `app/dashboard/*/page.tsx`.
- Halaman PPD merender container halaman (misalnya `PpdPage`), bukan editor presentasi tanpa konteks daftar draf.
- Pastikan import/export konsisten dan tidak ada circular dependency antara container dan subkomponen.
- Jangan menambahkan fetch/API layer sebagai bagian refactor ini kecuali memang sudah diperlukan; bentuk props disiapkan agar integrasi data bisa dilakukan kemudian.

### Tahap 6 — Pemeriksaan perilaku

Lakukan pemeriksaan setelah tiap fitur diekstrak:

| Modul | Alur yang diperiksa |
|---|---|
| Budget | Ganti periode dan departemen, cari account, tambah dan ubah budget, salin budget periode lalu, validasi batas dana ditahan + realisasi, tampilkan feedback dan empty state. |
| PPD | Pilih draf, cari/filter draf, ubah field dan baris, hitung total, validasi form, simpan/kirim, lalu pilih draf lain dan pastikan nilainya benar. |
| Departemen | Cari/filter departemen, pilih detail, tambah/edit departemen, tambah/keluarkan anggota, filter anggota, dan tampilkan empty state. |

Periksa juga tampilan responsif, label input, navigasi keyboard, dan identitas key pada daftar setelah komponen dipisah.

## Urutan Kerja yang Disarankan

1. Inventarisasi tipe, aksi, dan state tiap fitur; sepakati kontrak props.
2. Refactor satu fitur pada satu waktu, mulai dari bagian UI yang punya batas paling jelas.
3. Setelah ekstraksi, hubungkan kembali container dan halaman route sebelum lanjut ke fitur berikutnya.
4. Periksa alur utama dan bandingkan perilaku dengan versi sebelum perubahan.
5. Rapikan nama file dan ekspor setelah bentuk final komponen stabil.

## Risiko dan Mitigasi

- **State form PPD tidak sinkron saat draf berganti:** gunakan nilai draf aktif sebagai sumber data yang jelas dan tangani sinkronisasi saat ID draf berubah.
- **Validasi berpindah atau terduplikasi:** aturan bisnis tetap berada di container/domain; presentational form hanya menampilkan error dan mengirim input.
- **Props terlalu besar:** kelompokkan data terkait dalam tipe objek jika membantu keterbacaan, tetapi hindari membuat satu prop `data` tanpa kontrak yang jelas.
- **Refactor mengubah fitur:** pindahkan markup dan state secara bertahap, serta periksa alur tiap modul sebelum meneruskan.
- **Komponen terlalu terfragmentasi:** ekstrak berdasarkan tanggung jawab dan kebutuhan reuse yang nyata, bukan hanya ukuran file.

## Di Luar Cakupan

- Integrasi API atau database dan penggantian seluruh data demo.
- Perubahan kebijakan anggaran, persetujuan PPD, atau hak akses.
- Perubahan desain visual yang tidak dibutuhkan untuk ekstraksi.
- Penggabungan tiga fitur ke dalam satu komponen generik.

---

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
