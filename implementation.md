
# Implementation Plan: Manajemen User dan Departemen Berdasarkan Role

## Tujuan

Melengkapi CRUD user untuk Admin serta mengatur akses departemen bagi user ber-role `STAFF` dan `DEPT_HEAD`. User hanya dapat melihat departemen tempat mereka memiliki keanggotaan aktif. Dept Head dapat mengelola anggota pada departemen yang ditugaskan kepadanya; Staff mendapat akses lihat sesuai penugasan. Fitur manajemen user hanya boleh digunakan Admin. Role selain Admin tidak boleh membuka halaman, membaca daftar user, atau menjalankan operasi manajemen user melalui server action.

## Kondisi Saat Ini

- `/dashboard/users` hanya dapat diakses Admin dan sudah menampilkan daftar user serta mengubah role.
- Create, edit profil, dan delete user belum tersedia.
- Pengecekan Admin sudah ada di `app/actions/user.ts`, tetapi perlu diterapkan konsisten pada setiap action baru.
- `/dashboard/department`, `lib/route-permissions.ts`, dan action departemen saat ini membatasi akses kepada Admin.
- Model `DepartmentMember` memiliki relasi opsional ke `User` melalui `userId`, serta role keanggotaan `PIC` atau `MEMBER`. Ini dapat dipakai untuk menentukan departemen yang dikelola Dept Head.
- Saat ini user `DEPT_HEAD` yang ditambahkan ke departemen otomatis mendapat keanggotaan `PIC`.

## Kebijakan Akses

| Fitur | Admin | Dept Head | Staff | Role lain |
| --- | --- | --- | --- |
| Manajemen user (list, create, edit, delete, ubah role) | Ya, semua user | Tidak | Tidak |
| Atur akses/keanggotaan user ke departemen | Semua departemen, termasuk penugasan PIC | Dapat menambah/mengeluarkan Staff sebagai MEMBER di departemen yang menjadi tanggung jawabnya; tidak dapat menetapkan PIC | Tidak |
| Lihat departemen | Semua departemen | Departemen yang ditugaskan sebagai PIC | Departemen tempat ia menjadi anggota aktif |
| Kelola anggota departemen | Semua departemen | Departemen yang ditugaskan sebagai PIC | Tidak |
| Buat, ubah detail, arsip departemen | Ya | Tidak | Tidak |

Admin mengatur penugasan departemen dan PIC melalui keanggotaan `DepartmentMember` yang terhubung ke akun (`userId`). Dept Head ditentukan dari keanggotaan aktif dengan `role = PIC`; Staff memperoleh akses lihat dari keanggotaan aktif dengan `role = MEMBER`. Dept Head dapat mengelola roster Staff pada departemen dalam cakupannya, tetapi tidak dapat menetapkan atau memindahkan PIC. Relasi saat ini memungkinkan satu user memiliki akses ke beberapa departemen. Dept Head dan Staff hanya mendapat cakupan berdasarkan keanggotaan masing-masing.

## Tahap 1 — Lengkapi CRUD User untuk Admin

- Perluas `app/actions/user.ts` dengan action create, update profil, dan delete. Setiap action harus memuat ulang sesi di server dan menolak role selain `ADMIN`.
- Pertahankan `getUsersAction` dan `updateUserRoleAction` sebagai operasi khusus Admin. Jangan mengandalkan penyembunyian tombol atau navigasi sebagai kontrol akses.
- Buat form/dialog untuk nama, email, role, dan password awal. Hash password memakai helper `hashPassword` yang juga digunakan saat registrasi; jangan mengirim atau menampilkan hash ke client.
- Untuk edit, sediakan perubahan nama, email, dan role. Perubahan password dapat dilakukan lewat input password baru opsional atau action reset password terpisah; nilai kosong tidak mengubah password.
- Validasi input di server: field wajib, format email, panjang password minimum, role harus anggota enum `Role`, dan email harus unik. Tangani konflik unique constraint dengan pesan yang jelas.
- Tambahkan konfirmasi sebelum delete. Tolak penghapusan akun sendiri dan lindungi sistem dari penghapusan Admin terakhir. Hapus akun melalui Prisma dengan memperhatikan relasi yang memakai `onDelete: SetNull`; pastikan perilaku histori dan data terkait sudah dipahami sebelum memilih hard delete.
- Revalidate `/dashboard/users` setelah mutasi. Bila user yang diubah sedang memiliki sesi aktif, dokumentasikan bahwa token sesi mungkin tetap membawa role lama sampai login ulang, atau tambahkan mekanisme invalidasi sesi jika tersedia.

## Tahap 2 — Tegaskan Guard Manajemen User

- Pertahankan pemeriksaan Admin di `app/dashboard/users/page.tsx` dan pastikan semua action user melakukan pemeriksaan role sendiri.
- Pertahankan `/dashboard/users` hanya untuk `Role.ADMIN` di `lib/route-permissions.ts`.
- Tampilkan menu `Kelola Pengguna` hanya kepada Admin di `components/app-sidebar.tsx`.
- Pastikan akses langsung ke URL oleh Dept Head, Staff, Finance, atau Executive diarahkan ke rute yang diizinkan.
- Pastikan action juga menolak request langsung dari role non-Admin, meskipun request dibuat tanpa membuka halaman UI.

## Tahap 3 — Terapkan Akses Departemen untuk Dept Head dan Staff

- Ubah otorisasi halaman `app/dashboard/department/page.tsx` agar menerima `ADMIN`, `DEPT_HEAD`, dan `STAFF`.
- Untuk Admin, muat semua departemen dan sediakan seluruh kontrol yang ada.
- Untuk Dept Head, query hanya departemen dengan keanggotaan aktif miliknya (`userId` dan `role = PIC`); jangan mengirim departemen lain ke client.
- Untuk Staff, query hanya departemen dengan keanggotaan aktif miliknya (`userId` dan `role = MEMBER`) dan tampilkan sebagai akses lihat saja.
- Perluas kontrak data `lib/department-data.ts` agar dapat menerima scope daftar ID departemen yang diizinkan. Admin tetap dapat memakai query semua departemen.
- Atur kontrol UI di `components/department/department-view.tsx` dan komponen turunannya: Dept Head dapat mengelola anggota departemen yang ditugaskan; Staff hanya dapat melihat informasi dan anggota; keduanya tidak melihat kontrol buat/arsip departemen.
- Perlihatkan keadaan kosong yang informatif apabila Dept Head atau Staff belum memiliki penugasan departemen aktif.
- Perbarui `lib/route-permissions.ts` dan `components/app-sidebar.tsx` agar menu/rute Department tersedia untuk Admin, Dept Head, dan Staff.

## Tahap 4 — Amankan Mutasi Departemen di Server

- Ganti helper `canManageDepartments` yang hanya mengizinkan Admin dengan pemeriksaan terpisah untuk operasi administratif, penugasan akses, dan pengelolaan keanggotaan.
- Operasi create/update/archive departemen tetap khusus Admin.
- Tambahkan kontrol Admin untuk memberi atau mencabut akses user ke departemen melalui `DepartmentMember`, serta menetapkan Staff sebagai `MEMBER` dan Dept Head sebagai `PIC` sesuai role akun.
- Operasi tambah/keluarkan anggota dapat dilakukan Admin pada semua departemen dan Dept Head hanya pada departemen dengan keanggotaan PIC aktif miliknya; Dept Head hanya boleh menambah/mengeluarkan user Staff sebagai `MEMBER`.
- Staff tidak dapat menambah, mengeluarkan, atau mengubah keanggotaan. Action baca departemen harus tetap membatasi hasil ke keanggotaan aktif Staff tersebut.
- Pada setiap action, validasi ulang role, status keanggotaan, dan cakupan departemen berdasarkan sesi dan database di server. Jangan mempercayai `departmentId` dari client.
- Batasi daftar kandidat anggota sesuai kebijakan role. Perubahan keanggotaan yang dapat menetapkan PIC atau menugaskan user ke departemen tambahan hanya boleh dilakukan Admin; Dept Head tidak boleh memberi dirinya atau user lain akses ke departemen tambahan.
- Revalidate halaman departemen dan modul lain yang terdampak setelah mutasi.

## Tahap 5 — Perbarui Data dan UI Manajemen User

- Ubah `app/dashboard/users/page.tsx` dari tabel baca/ubah-role menjadi daftar dengan aksi tambah, edit, dan hapus.
- Perluas `components/users/user-table.tsx` dan tambahkan komponen form/dialog yang konsisten dengan pola UI proyek.
- Tampilkan nama, email, role, tanggal bergabung, serta aksi yang tersedia. Jangan pernah menampilkan password atau hash.
- Sediakan feedback sukses/error, status proses, dan konfirmasi delete; pertahankan perlindungan agar Admin tidak dapat mengubah atau menghapus dirinya sendiri dari UI.

## Tahap 6 — Verifikasi dan Kriteria Penerimaan

- Admin dapat melihat semua user serta membuat, mengubah, menghapus, dan mengubah role dengan validasi server.
- Dept Head, Staff, dan role non-Admin lain tidak dapat mengakses `/dashboard/users`, menu manajemen user, maupun action manajemen user.
- Request langsung ke server action user oleh non-Admin ditolak.
- Dept Head hanya melihat departemen yang ditugaskan sebagai PIC dan hanya dapat mengelola keanggotaan departemen tersebut.
- Staff hanya melihat departemen tempat ia terdaftar sebagai anggota aktif dan tidak dapat mengubah keanggotaan atau detail departemen.
- Dept Head dan Staff tidak dapat membaca data departemen lain dengan mengganti ID request.
- Admin dapat menetapkan/mencabut akses departemen serta menetapkan Dept Head/PIC. Dept Head hanya dapat mengelola keanggotaan Staff sebagai MEMBER di departemen yang ditugaskan kepadanya.
- Perubahan role/keanggotaan segera tercermin pada cakupan akses berikutnya.
- Operasi administrasi departemen tetap khusus Admin.
- Email duplikat, role tidak valid, password tidak memenuhi syarat, penghapusan diri sendiri, dan penghapusan Admin terakhir ditolak dengan pesan yang dapat dipahami.
- Relasi Dept Head/PIC dan anggota tetap konsisten setelah create/edit/delete user dan mutasi anggota departemen.

## Urutan Implementasi

1. Tetapkan aturan penghapusan user dan konfirmasi Admin menjadi satu-satunya pihak yang dapat memberi/mencabut akses serta menetapkan PIC.
2. Implementasikan action CRUD user yang hanya menerima Admin.
3. Implementasikan UI CRUD user dan guard halaman/navigasi Admin-only.
4. Tambahkan kontrol Admin untuk menetapkan/mencabut akses departemen Staff dan Dept Head.
5. Tambahkan query departemen dengan scope keanggotaan user dan peran PIC/MEMBER.
6. Perbarui guard halaman, navigasi, kontrol UI, dan action agar Dept Head dapat mengelola anggota dalam cakupan PIC dan Staff mendapat akses lihat saja.
7. Tinjau relasi delete Prisma dan konsistensi penugasan setelah perubahan role atau penghapusan user.
8. Verifikasi akses normal dan akses langsung/action untuk setiap role berdasarkan kriteria penerimaan.
