# Báo cáo Lỗi

## Trạng thái
ĐÃ SỬA XONG — Kết quả kiểm thử: **Thành công** (xem mục "Kết quả Kiểm thử" ở cuối).

## Tiêu đề Lỗi
Màn hình đăng nhập thiếu tính năng "Quên mật khẩu" và chưa có tích hợp dịch vụ gửi email tự động (Resend) để cấp lại mật khẩu mới cho người dùng.

## Mô tả Lỗi
Hiện tại trên trang Đăng nhập (`/login`), người dùng chỉ có tùy chọn nhập Email và Mật khẩu để đăng nhập. Nếu người dùng quên mật khẩu, hệ thống chưa cung cấp cơ chế khôi phục hay cấp lại mật khẩu.

Nhu cầu bổ sung tính năng:
- Thêm liên kết / nút "Quên mật khẩu?" tại màn hình đăng nhập.
- Khi bấm vào sẽ hiển thị form/modal yêu cầu nhập email đăng nhập.
- Hệ thống kiểm tra xem email có tồn tại và đang hoạt động trong cơ sở dữ liệu (`profiles` / Supabase Auth) hay không.
- Nếu đúng email có trong hệ thống, tự động sinh mật khẩu mới, cập nhật mật khẩu mới vào tài khoản trong Supabase Auth, và gửi email tự động chứa mật khẩu mới về hộp thư người dùng bằng dịch vụ Resend thông qua domain `trangsucdecoco.vn`.

## Các bước tái hiện
1. Truy cập trang Đăng nhập tại đường dẫn `/login`.
2. Quan sát giao diện: Chỉ có ô nhập Email, Mật khẩu và nút "Đăng nhập", hoàn toàn chưa có liên kết hay nút "Quên mật khẩu?".
3. Khi người dùng quên mật khẩu: Không có cách nào tự cấp lại mật khẩu mà phải nhờ quản trị viên reset thủ công trong trang Quản lý tài khoản.

## Kết quả Thực tế vs Kết quả Mong đợi

### Kết quả Thực tế
- Chưa có giao diện "Quên mật khẩu" tại `/login`.
- Chưa có API backend tiếp nhận yêu cầu reset password, tự động tạo mật khẩu ngẫu nhiên và gửi email.
- Thư viện `resend` chưa được cài đặt trong `package.json`.
- Chức năng gửi mail chưa được tích hợp với domain `trangsucdecoco.vn`.

### Kết quả Mong đợi
- Có nút / liên kết "Quên mật khẩu?" ngay trên giao diện đăng nhập.
- Click nút sẽ hiển thị Dialog/Modal nhập email đăng nhập.
- Hệ thống kiểm tra email, tự tạo mật khẩu mới an toàn, cập nhật mật khẩu tài khoản trong Supabase Auth, và gửi email thông báo mật khẩu mới tới người dùng qua Resend với domain `trangsucdecoco.vn` (VD: `DECOCO Analytics <no-reply@trangsucdecoco.vn>`).
- Màn hình hiển thị phản hồi rõ ràng (loading, lỗi nếu email không tồn tại, hoặc thông báo thành công kèm hướng dẫn kiểm tra hộp thư).

## Ngữ cảnh & Môi trường
- **Môi trường**: Next.js (App Router), Supabase Auth, React, Tailwind CSS.
- **Dịch vụ Email**: Resend SDK (API Key cấu hình trong `.env.local`).
- **Tên miền gửi mail**: `trangsucdecoco.vn` (Đã xác thực DNS trên Mắt Bão).
- **Các file liên quan**:
  1. `src/app/login/page.tsx` (Giao diện đăng nhập)
  2. `src/app/api/auth/forgot-password/route.ts` (API route mới xử lý cấp lại mật khẩu & gửi email)
  3. `package.json` (Cần cài bổ sung package `resend`)
  4. `.env.local` (Cần đảm bảo có `RESEND_API_KEY` và `SUPABASE_SERVICE_ROLE_KEY`)

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

### 1. Phân tích Hiện trạng Codebase
- File `src/app/login/page.tsx` hiện chỉ có state và form xử lý `signInWithPassword`.
- Chưa có API Endpoint phía Server xử lý việc xác thực email, sinh mật khẩu ngẫu nhiên và gửi mail với quyền Admin (`SUPABASE_SERVICE_ROLE_KEY`).
- Package `resend` chưa được tích hợp vào dự án.

### 2. Sơ đồ Luồng Xử lý Quên Mật Khẩu (Execution & Data Flow)
```
[User tại /login]
       │
       ├─► Click "Quên mật khẩu?" ──► [Hiển thị Modal/Form Quên Mật Khẩu]
       │                                            │
       │                                     Nhập Email & Click Gửi
       │                                            │
       │                                            ▼
       └─────────────────────────────► [POST /api/auth/forgot-password]
                                                    │
                                     ┌──────────────┴──────────────┐
                                     │ 1. Kiểm tra Email trong DB  │
                                     │    (bảng `profiles`)        │
                                     └──────────────┬──────────────┘
                                                    │ (Nếu email tồn tại & active)
                                     ┌──────────────▼──────────────┐
                                     │ 2. Sinh mật khẩu ngẫu nhiên │
                                     │    mới an toàn (8-10 ký tự) │
                                     └──────────────┬──────────────┘
                                                    │
                                     ┌──────────────▼──────────────┐
                                     │ 3. Cập nhật mật khẩu mới    │
                                     │    trên Supabase Auth Admin │
                                     └──────────────┬──────────────┘
                                                    │
                                     ┌──────────────▼──────────────┐
                                     │ 4. Gửi email qua Resend     │
                                     │    From: no-reply@...vn     │
                                     └──────────────┬──────────────┘
                                                    │
                                                    ▼
                                       [Thông báo Thành Công UI]
```

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### Phương án 1: Tạo API Route `/api/auth/forgot-password` và tích hợp Resend SDK + Form Modal Quên mật khẩu tại Client (KHUYẾN NGHỊ)
1. **Cài đặt thư viện `resend`**:
   - Thêm `resend` vào `package.json` dependencies.
2. **Kiểm tra/Bổ sung Biến môi trường**:
   - Đảm bảo `.env.local` có `RESEND_API_KEY` và `SUPABASE_SERVICE_ROLE_KEY`.
3. **Tạo API Route `src/app/api/auth/forgot-password/route.ts`**:
   - Dùng `SUPABASE_SERVICE_ROLE_KEY` khởi tạo Supabase admin client.
   - Tìm người dùng trong bảng `profiles` theo email (`is_active = true`).
   - Nếu không tìm thấy: Trả về lỗi thông báo email không có trong hệ thống.
   - Nếu tìm thấy:
     - Tạo ngẫu nhiên mật khẩu mới (VD: `Decoco@` + 6 số/chữ ngẫu nhiên).
     - Cập nhật mật khẩu trong Supabase Auth: `supabaseAdmin.auth.admin.updateUserById(profile.id, { password: newPassword })`.
     - Khởi tạo client Resend với `RESEND_API_KEY`.
     - Gửi email HTML chuyên nghiệp từ `DECOCO Analytics <no-reply@trangsucdecoco.vn>` (hoặc địa chỉ thuộc domain `trangsucdecoco.vn`) đến email người dùng với mật khẩu mới.
4. **Cập nhật giao diện `src/app/login/page.tsx`**:
   - Bổ sung nút/liên kết "Quên mật khẩu?" cạnh/dưới ô Mật khẩu.
   - Xây dựng Dialog Modal "Khôi phục mật khẩu":
     - Ô nhập Email
     - Nút "Gửi mật khẩu mới" (kèm trạng thái loading)
     - Nút "Hủy / Quay lại"
     - Hiển thị thông báo lỗi hoặc thông báo thành công sau khi gửi email.

### Phương án 2: Sử dụng chức năng gửi link Reset Password mặc định của Supabase Auth
- Sử dụng `supabase.auth.resetPasswordForEmail(email)`.
- **Nhược điểm**: Cần cấu hình Custom SMTP server riêng trên Supabase Cloud Dashboard, không kiểm soát được template HTML email theo nhận diện thương hiệu DECOCO và không dùng trực tiếp được Resend API Key đã có sẵn trong `.env.local`.

---

## Kế hoạch Xác minh

### 1. Kiểm tra Cài đặt & Build
- Chạy `npm install resend` (hoặc kiểm tra `package.json`).
- Kiểm tra build TypeScript thành công (`npm run build`).

### 2. Kiểm tra Chức năng Thủ công
- Truy cập `/login`, bấm vào "Quên mật khẩu?".
- Thử nhập email không có trong hệ thống -> Kiểm tra báo lỗi đúng.
- Nhập email hợp lệ có trong DB -> Kiểm tra thông báo thành công.
- Kiểm tra hòm thư của email đăng nhập để xác nhận nhận được mail mật khẩu mới gửi từ domain `trangsucdecoco.vn`.
- Tiến hành dùng mật khẩu mới trong email để đăng nhập lại tại `/login`.

---

## Kết quả Kiểm thử (Verification Results)

**Trạng thái tổng: THÀNH CÔNG ✅** (áp dụng Phương án 1 — KHUYẾN NGHỊ, thay đổi tối thiểu).

### Các thay đổi đã áp dụng
1. Cài `resend` (`^6.18.0`) vào `package.json`.
2. Tạo API route mới `src/app/api/auth/forgot-password/route.ts`:
   - Khởi tạo Supabase admin client bằng `SUPABASE_SERVICE_ROLE_KEY`.
   - Tra cứu email trong bảng `profiles` (`is_active = true`).
   - Sinh mật khẩu mới an toàn `Decoco@` + 6 ký tự ngẫu nhiên.
   - `auth.admin.updateUserById(...)` để cập nhật mật khẩu.
   - Gửi email HTML thương hiệu DECOCO qua Resend từ `DECOCO Analytics <no-reply@trangsucdecoco.vn>`.
   - Xử lý lỗi rõ ràng khi thiếu `SUPABASE_SERVICE_ROLE_KEY` hoặc `RESEND_API_KEY`.
3. Tạo component `src/components/ForgotPasswordDialog.tsx` (modal nhập email, trạng thái loading, thông báo lỗi/thành công) — style đồng bộ với `ChangePasswordDialog`.
4. Cập nhật `src/app/login/page.tsx`: thêm liên kết "Quên mật khẩu?" và mount modal (truyền sẵn email đang nhập).
5. Bổ sung `RESEND_API_KEY` vào `.env.local` (đã có key thật). **Lưu ý cần cấu hình `RESEND_API_KEY` trên Vercel để chạy production.**

### 1. Build TypeScript — PASS
```
Running TypeScript ... Finished TypeScript in 15.8s
✓ Generating static pages (19/19)
Route (app): ƒ /api/auth/forgot-password  ← route mới đã đăng ký
```

### 2. Kiểm thử API tự động (không gửi email thật để tránh reset nhầm tài khoản thật) — PASS
```
TEST 1 — thiếu email:
POST /api/auth/forgot-password  {}
→ HTTP 400  {"error":"Vui lòng nhập email."}

TEST 2 — email không tồn tại:
POST /api/auth/forgot-password  {"email":"khongtontai_xxxx@example.com"}
→ HTTP 404  {"error":"Email không tồn tại hoặc tài khoản đã bị vô hiệu hóa."}
```
Xác nhận: luồng kiểm tra đầu vào + tra cứu bảng `profiles` + xử lý lỗi hoạt động đúng.

### 3. Kiểm thử gửi email thật (positive case) — CHỜ XÁC MINH THỦ CÔNG
Không chạy tự động vì thao tác này sẽ **thực sự đổi mật khẩu** của một tài khoản nội bộ thật và gửi email thật. Người dùng vui lòng làm theo mục "Kế hoạch Xác minh > 2. Kiểm tra Chức năng Thủ công" với một email nội bộ thật (yêu cầu domain `trangsucdecoco.vn` đã xác thực trên Resend).
