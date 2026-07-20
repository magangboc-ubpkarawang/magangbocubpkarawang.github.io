# Website Profile Magang PUSDATIN × BOC UBP Karawang

Website profil anggota magang **PUSDATIN × BOC Universitas Buana Perjuangan Karawang** dengan tampilan bergaya game interface. Website ini menampilkan data anggota, divisi, profil utama, Alter Profile, galeri, video CV, serta panel administrator untuk mengelola data.

Website publik:

**https://magangpsdxboc-ubpkarawang.github.io/**

---

## Fitur Utama

### Halaman Publik

- Daftar anggota magang.
- Filter anggota berdasarkan divisi dan jabatan.
- Pencarian anggota.
- Detail profil anggota.
- Alter Profile.
- Galeri foto.
- Video CV.
- Data statistik, keterampilan, dan keahlian.
- Tampilan responsif untuk desktop dan perangkat seluler.

### Panel Administrator

- Login administrator.
- Session admin.
- Tambah, edit, hapus, dan pulihkan data anggota.
- Tambah, edit, hapus, dan pulihkan Alter Profile.
- Pengelolaan divisi.
- Upload foto profil.
- Upload galeri.
- Upload video berukuran kecil.
- Pengelolaan media melalui Google Drive.
- Penyimpanan metadata media pada sheet `Asset_Map`.

---

## Teknologi

### Frontend

- HTML5
- CSS3
- JavaScript
- GitHub Pages

### Backend

- Google Apps Script
- Google Sheets
- Google Drive

### Penyimpanan Data

Google Sheets digunakan sebagai database utama dengan sheet:

- `Members`
- `Alters`
- `Divisions`
- `Users`
- `Asset_Map`
- `README`

---

## Struktur Project

```text
magangpsdxboc-ubpkarawang.github.io/
├── index.html
├── profile.html
├── alter.html
├── admin-login.html
├── admin.html
├── admin-members.html
├── admin-alters.html
├── admin-divisions.html
├── 404.html
├── README.md
│
└── assets/
    ├── css/
    │   └── ...
    │
    ├── img/
    │   └── ...
    │
    └── js/
        ├── config.js
        ├── api.js
        ├── admin-api.js
        ├── p3r-intro.js
        ├── p3r-home.js
        ├── p3r-profile.js
        └── p3r-alterprofile.js
```

File Google Apps Script seperti `Config.gs`, `Api.gs`, `Database.gs`, `Auth.gs`, dan file backend lainnya tidak disimpan di dalam repository frontend publik.

---

## Konfigurasi API

Frontend terhubung ke backend Google Apps Script melalui file:

```text
assets/js/config.js
```

Contoh konfigurasi:

```javascript
const API_URL =
  "https://script.google.com/macros/s/DEPLOYMENT_ID/exec";
```

URL deployment harus berasal dari Web App Google Apps Script yang aktif.

Pengaturan deployment yang digunakan:

```text
Execute as: Me
Who has access: Anyone
```

Jangan menyimpan password, pepper, token, credential Google, atau data rahasia lain di dalam file frontend.

---

## Menjalankan Website Secara Lokal

Gunakan Live Server atau server lokal lain.

Contoh menggunakan extension Live Server di Visual Studio Code:

1. Buka folder project.
2. Klik kanan `index.html`.
3. Pilih **Open with Live Server**.
4. Buka alamat yang diberikan, misalnya:

```text
http://127.0.0.1:5500/
```

Jangan membuka halaman langsung menggunakan protokol:

```text
file:///
```

karena beberapa fungsi JavaScript dan request API dapat tidak berjalan dengan benar.

---

## Menjalankan Halaman Publik

Halaman utama:

```text
index.html
```

Profil anggota:

```text
profile.html?id=ID_MEMBER
```

Alter Profile:

```text
alter.html?memberId=ID_MEMBER&id=ID_ALTER
```

Contoh:

```text
profile.html?id=faisalalrico
```

```text
alter.html?memberId=faisalalrico&id=faisalalrico_aigis
```

---

## Menjalankan Panel Administrator

Halaman login:

```text
admin-login.html
```

Setelah login, administrator dapat membuka:

```text
admin.html
admin-members.html
admin-alters.html
admin-divisions.html
```

Session admin disimpan sementara di browser dan diverifikasi kembali melalui Google Apps Script.

---

## Struktur Google Apps Script

Backend Google Apps Script terdiri dari beberapa file utama:

```text
Config.gs
Api.gs
Database.gs
Auth.gs
MemberAdmin.gs
AlterAdmin.gs
DivisionAdmin.gs
DriveStorage.gs
MediaAdmin.gs
```

Fungsi masing-masing file:

| File | Fungsi |
|---|---|
| `Config.gs` | Konfigurasi aplikasi, Spreadsheet, autentikasi, dan Google Drive |
| `Api.gs` | Endpoint GET dan POST |
| `Database.gs` | Membaca dan menormalisasi data Spreadsheet |
| `Auth.gs` | Login, password hash, session, dan logout admin |
| `MemberAdmin.gs` | CRUD anggota |
| `AlterAdmin.gs` | CRUD Alter Profile |
| `DivisionAdmin.gs` | CRUD divisi |
| `DriveStorage.gs` | Upload dan pengelolaan file Google Drive |
| `MediaAdmin.gs` | Pengelolaan metadata media dan `Asset_Map` |

---

## Endpoint Publik

Backend menyediakan endpoint GET berikut:

```text
?action=ping
?action=home
?action=members
?action=member&id=MEMBER_ID
?action=alters
?action=alter&id=ALTER_ID
?action=alter&memberId=MEMBER_ID
?action=divisions
```

Contoh:

```text
https://script.google.com/macros/s/DEPLOYMENT_ID/exec?action=home
```

---

## Endpoint Administrator

Endpoint administrator menggunakan metode POST dan membutuhkan token session.

### Autentikasi

```text
login
session
verify-session
logout
admin-ping
change-password
```

### Member

```text
members-list
member-get
member-create
member-update
member-delete
member-restore
```

### Alter Profile

```text
alters-list
alter-get
alter-create
alter-update
alter-delete
alter-restore
```

### Divisi

```text
divisions-list
division-get
division-create
division-update
division-delete
```

### Media

```text
media-list
media-get
media-upload
media-replace
media-delete
media-restore
media-audit
```

---

## Pengelolaan Media

Media baru dapat disimpan melalui Google Drive.

Struktur folder yang digunakan:

```text
Root Folder
├── Members
│   └── MEMBER_ID
│       ├── Profile
│       ├── Gallery
│       └── Video
│
├── Alters
│   └── ALTER_ID
│       ├── Profile
│       ├── Gallery
│       └── Video
│
└── Website
    ├── Logo
    ├── Placeholder
    └── General
```

Metadata file dicatat pada sheet:

```text
Asset_Map
```

Media lama seperti:

```text
uploads/members/...
uploads/gallery/...
assets/img/...
```

tetap dapat disimpan pada Spreadsheet, tetapi file tersebut harus benar-benar tersedia di repository atau diganti dengan URL publik.

---

## Batas Upload Video

Upload melalui browser menggunakan Base64 sehingga tidak cocok untuk video besar.

Rekomendasi:

```text
Foto profil       maksimal 5 MB
Gambar galeri     maksimal 8 MB
Video langsung    maksimal sekitar 20 MB
```

Untuk video berukuran besar, misalnya 100 MB:

1. Upload manual ke Google Drive atau YouTube.
2. Pastikan file dapat diakses publik.
3. Masukkan URL video ke kolom `video_cv`.

Progress upload saat ini dihitung berdasarkan proses operasi, bukan berdasarkan jumlah byte yang sudah terkirim.

---

## Izin Google Drive

Agar media dapat dibuka oleh pengunjung, file harus memiliki akses:

```text
Anyone with the link
Viewer
```

Beberapa akun Google Workspace dapat melarang pembagian publik. Dalam kondisi tersebut, upload dapat berhasil tetapi perubahan izin file akan gagal.

Contoh error:

```text
DRIVE_PUBLIC_SHARING_FAILED
Access denied: DriveApp
```

Solusinya adalah menggunakan folder milik akun yang mengizinkan akses publik atau meminta administrator Google Workspace mengaktifkan external sharing.

---

## Reset Password Administrator

Password administrator tidak disimpan sebagai teks biasa.

Untuk menyiapkan atau mereset password:

1. Buka **Apps Script → Project Settings → Script Properties**.
2. Tambahkan:

```text
P3R_SETUP_EMAIL
P3R_SETUP_PASSWORD
```

3. Jalankan fungsi:

```javascript
siapkanPasswordAdminPertama();
```

4. Periksa hasil menggunakan:

```javascript
cekStatusAutentikasi();
```

Jangan menghapus properti:

```text
P3R_AUTH_PEPPER
```

karena pepper digunakan untuk memverifikasi password yang sudah di-hash.

---

## Deploy Google Apps Script

Setelah kode backend diperbarui:

1. Buka Google Apps Script.
2. Pilih **Deploy**.
3. Pilih **Manage deployments**.
4. Klik **Edit**.
5. Pilih **New version**.
6. Klik **Deploy**.

Perubahan yang hanya disimpan di editor belum digunakan oleh URL `/exec` sebelum deployment diperbarui.

---

## Deploy GitHub Pages

Repository harus bernama:

```text
magangpsdxboc-ubpkarawang.github.io
```

Push project:

```bash
git init
git branch -M main
git add .
git commit -m "Initial deployment website PUSDATIN X BOC"
git remote add origin https://github.com/magangpsdxboc-ubpkarawang/magangpsdxboc-ubpkarawang.github.io.git
git push -u origin main
```

Aktifkan GitHub Pages melalui:

```text
Repository
→ Settings
→ Pages
→ Deploy from a branch
→ main
→ /(root)
```

Alamat website:

```text
https://magangpsdxboc-ubpkarawang.github.io/
```

---

## Memperbarui Website

Setelah melakukan perubahan pada frontend:

```bash
git add .
git commit -m "Update website"
git push
```

GitHub Pages akan membangun ulang website berdasarkan branch `main`.

Untuk perubahan backend Google Apps Script, lakukan deployment versi baru secara terpisah.

---

## Keamanan

Jangan memasukkan data berikut ke repository:

```text
Password administrator
P3R_AUTH_PEPPER
P3R_SETUP_PASSWORD
Token session
Credential Google
Service account
File .env
```

File frontend bersifat publik dan dapat dibaca oleh siapa saja.

---

## Catatan Pengembangan

Project ini merupakan hasil migrasi dari sistem berbasis Laravel menuju arsitektur statis dan serverless:

```text
GitHub Pages
→ Frontend

Google Apps Script
→ API dan autentikasi

Google Sheets
→ Database

Google Drive
→ Penyimpanan media
```

Media lama tidak dimigrasikan secara otomatis agar data lama tetap aman selama proses transisi.

---

## Lisensi

Project ini digunakan untuk kebutuhan internal dan dokumentasi kegiatan magang **PUSDATIN × BOC Universitas Buana Perjuangan Karawang**.

Penggunaan, distribusi, dan modifikasi di luar kebutuhan project harus mendapatkan izin dari pengelola.
