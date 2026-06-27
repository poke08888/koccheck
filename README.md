# LiveScope — Hệ thống báo cáo KOC livestream TikTok

Hệ thống phân tích & quản lý dữ liệu KOC livestream trên TikTok cho công ty TMĐT,
xây dựng từ bản thiết kế `koc-analytics-a.dc.html` (Phương án A — tông ấm Nonelab,
nền sáng). Đây là **hệ thống chạy thật** gồm backend + database + đăng nhập + upload,
không phải bản thiết kế tĩnh.

- **Frontend** — React + Vite, port pixel-perfect từ thiết kế (9 màn hình + đăng nhập).
- **Backend** — Node.js + Express, REST API có xác thực (token).
- **Database** — **SQLite** (mặc định, không cần cài gì) hoặc **PostgreSQL** (đặt `DATABASE_URL`).
- **Dữ liệu** — nạp thật từ file export TikTok Shop `Live Analysis…xlsx`
  (4.176 phiên · 598 KOC · GMV 2.687.648.359 ₫ · kỳ 01–15/04/2026), và **upload file mới ngay trên giao diện**.

> Bản gốc thiết kế nằm trong `project/`. Lịch sử trao đổi thiết kế trong `chats/`.

---

## Cách 1 — Chạy nhanh trên máy (SQLite, không cần cài DB)

Yêu cầu **Node.js ≥ 22.5** (dùng `node:sqlite` built-in).

```bash
cd server && npm install && npm run seed   # nạp dữ liệu mẫu vào SQLite
cd ../web && npm install && npm run build   # build UI
cd ../server && npm start                   # http://localhost:4000
```

Đăng nhập: **admin / admin123** (đổi bằng biến `ADMIN_PASSWORD`).

### Dev mode (hot reload)
```bash
cd server && npm run dev       # API :4000
cd web && npm run dev          # UI  :5173 (proxy /api -> 4000)
```

---

## Cách 2 — Docker + PostgreSQL (khuyên dùng cho production)

```bash
cp .env.example .env           # sửa AUTH_SECRET, ADMIN_PASSWORD, PG_PASSWORD
docker compose up -d --build   # dựng Postgres + app
# mở http://localhost:4000  — app tự seed dữ liệu mẫu lần đầu
```

Chỉ SQLite (1 container, không Postgres):
```bash
docker build -t livescope .
docker run -p 4000:4000 -v livescope_data:/app/server/data livescope
```

---

## Cách 3 — VPS bare-metal (pm2)

```bash
# Node >= 22.5 trên server
cd server && npm ci && npm run seed
pm2 start ecosystem.config.cjs && pm2 save     # giữ chạy 24/7, tự restart
# đặt Nginx/Caddy reverse proxy + HTTPS trỏ về cổng 4000
```

Dùng Postgres thay SQLite: đặt `DATABASE_URL` trong `ecosystem.config.cjs` rồi `npm run seed` lại.

---

## Chọn database

| | SQLite (mặc định) | PostgreSQL (`DATABASE_URL`) |
|---|---|---|
| Cài đặt | Không cần | Cần Postgres server |
| Phù hợp | 1 brand, ít người dùng, đọc nhiều | Đa người dùng, nhiều brand, ghi nhiều |
| Lưu trữ | file `server/data/koc.db` (backup = copy file) | volume Postgres (`pg_dump`) |

Cùng một bộ code; chỉ cần đặt (hoặc bỏ) biến môi trường `DATABASE_URL`.

---

## Biến môi trường

| Biến | Mặc định | Ý nghĩa |
|---|---|---|
| `DATABASE_URL` | *(trống → SQLite)* | chuỗi kết nối Postgres |
| `AUTH_SECRET` | dev secret ⚠️ | khoá ký token — **bắt buộc đặt khi production** |
| `ADMIN_PASSWORD` | `admin123` | mật khẩu admin tạo lần đầu |
| `PORT` | `4000` | cổng HTTP |
| `KOC_DB` | `server/data/koc.db` | đường dẫn file SQLite |

---

## 9 màn hình

Tổng quan · Danh sách KOC · Hồ sơ KOC · So sánh KOC · Phiên Live · Cảnh báo ·
Sản phẩm (Beta) · **Nguồn dữ liệu (upload .xlsx thật)** · Cấu hình (chỉnh trọng số → chấm điểm lại).
Tất cả biểu đồ có tooltip hover; lọc/sắp xếp/tìm kiếm/modal hoạt động đầy đủ.

## Kiến trúc

```
server/
  seed.js              # nạp dữ liệu từ xlsx (CLI)
  ecosystem.config.cjs # pm2
  src/
    db.js              # chọn adapter theo DATABASE_URL
    db/{schema,sqlite,pg}.js   # schema theo dialect + 2 adapter async
    ingest.js          # parse .xlsx (unzip thuần Node) -> DB  (dùng chung seed + upload)
    scoring.js         # mô hình chấm điểm 5 trục -> hạng S/A/B/C/D
    aggregate.js       # tổng hợp dashboard (dialect-safe)
    alerts.js          # sinh cảnh báo từ dữ liệu thật
    auth.js            # scrypt + token HMAC (node:crypto)
    defaults.js        # trọng số / ngưỡng mặc định
    server.js          # Express: auth, upload, API, phục vụ UI, auto-seed
web/  src/{App,api,format}.jsx + screens/*.jsx   # React UI
Dockerfile · docker-compose.yml · .env.example
```

### REST API

| Method | Endpoint | Quyền | Mô tả |
|--------|----------|-------|------|
| POST | `/api/auth/login` | — | đăng nhập, trả token |
| GET | `/api/auth/me` | token | thông tin user |
| GET | `/api/health` | — | trạng thái + dialect DB |
| GET | `/api/dashboard` | token | toàn bộ bundle dữ liệu |
| GET | `/api/kocs/:id/sessions` | token | phiên thật của 1 KOC |
| GET | `/api/settings` | token | trọng số + ngưỡng |
| PUT | `/api/settings/weights` | admin | đổi trọng số → chấm điểm lại |
| POST | `/api/datasets/upload` | admin, leader | upload .xlsx → nạp + chấm điểm lại |
| DELETE | `/api/datasets/:id` | admin | xoá 1 lần upload (xoá phiên theo `dataset_id` + chấm lại) |
| GET | `/api/users` | admin | danh sách người dùng |
| POST | `/api/users` | admin | tạo người dùng + gán quyền |
| DELETE | `/api/users/:id` | admin | xoá người dùng (không tự xoá / phải còn ≥1 admin) |
| PUT | `/api/users/:id/role` | admin | đổi vai trò user (leader↔viewer↔admin) |
| PUT | `/api/users/:id/password` | admin | đặt lại mật khẩu cho user |
| PUT | `/api/settings/thresholds` | admin | thêm/sửa/xoá ngưỡng cảnh báo |
| POST | `/api/auth/password` | token | tự đổi mật khẩu (cần mật khẩu hiện tại) |
| GET | `/api/audit` | admin | nhật ký thao tác (ai làm gì, lúc nào) |

### Phân quyền (3 vai trò)

| Vai trò | Xem | Upload dữ liệu | Xoá dữ liệu | Tạo/quản lý user |
|---------|:---:|:---:|:---:|:---:|
| **admin** | ✔ | ✔ | ✔ | ✔ |
| **leader** | ✔ | ✔ | — | — |
| **viewer** (người xem) | ✔ | — | — | — |

Admin tạo & gán quyền cho user ở màn **Cấu hình → Quản lý người dùng**. Backend
chặn theo vai trò (middleware `requireRole`), không chỉ ẩn nút ở giao diện.

### Nhật ký thao tác & mật khẩu

- **Nhật ký** (màn riêng, chỉ admin): ghi lại đăng nhập, upload, xoá dữ liệu,
  tạo/xoá user, đổi/đặt lại mật khẩu, đổi trọng số — kèm người thực hiện & thời gian.
- **Đổi mật khẩu**: mỗi user tự đổi ở **Cấu hình → Đổi mật khẩu của tôi**; admin
  đặt lại mật khẩu cho user khác ngay trong bảng Quản lý người dùng.
- **Sửa vai trò**: admin đổi vai trò user đã tạo qua dropdown trong bảng Quản lý
  người dùng (có ràng buộc phải còn ≥ 1 admin).
- **Ngưỡng cảnh báo**: admin thêm/sửa/xoá ngưỡng ngay ở **Cấu hình** (tên, mô tả,
  giá trị, màu); người khác chỉ xem.

### Mô hình chấm điểm KOC

5 trục chuẩn hoá 0–100, gộp theo trọng số (mặc định 30/25/20/15/10): Hiệu suất giờ
(DT/giờ), CVR, CTR, Quy mô GMV (log), Độ đều đặn (số phiên). Hạng S ≥ 75 · A ≥ 65 ·
B ≥ 50 · C ≥ 33 · D < 33. Tái tạo đúng bản thiết kế (Tun Phạm 81/S, Hứa Ngân 73/A).

---

## Còn thiếu để chạy đầy đủ nghiệp vụ

- **SKU/sản phẩm** (tên, giá, tồn, hoàn) — file LIVE chỉ có số lượng → màn Sản phẩm để **Beta**.
- **Chi phí & hoa hồng** KOC → để tính ROI/lợi nhuận.
- **Nhiều brand/đa kỳ** đã hỗ trợ ở DB & upload; cần feed dữ liệu định kỳ để so sánh kỳ-trên-kỳ.
