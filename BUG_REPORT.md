# Báo cáo Lỗi

## Trạng thái
ĐÃ SỬA CHỮA — ✅ THÀNH CÔNG (xem "Kết quả Sửa lỗi" ở cuối)

## Tiêu đề Lỗi
Người dùng chưa đăng nhập vẫn truy cập trực tiếp được trang Dashboard và các URL nội bộ khác để xem dữ liệu.

## Mô tả Lỗi
Hiện tại, khi người dùng chưa thực hiện đăng nhập (hoặc trong phiên ẩn danh không có Session/Cookie), họ vẫn có thể truy cập trực tiếp vào các đường dẫn nội bộ của hệ thống như:
* `/dashboard`
* `/admin/*` (upload, accounts, products, tags, settings)
* `/team/*` (content, booking)
* `/guideline`

Hệ thống không hề chặn truy cập hay chuyển hướng người dùng về trang đăng nhập (`/login`), đồng thời vẫn tải dữ liệu từ database thông qua các API và hiển thị đầy đủ số liệu thực tế trên giao diện.

## Các bước tái hiện
1. Mở một cửa sổ trình duyệt ẩn danh (Private/Incognito) mới.
2. Truy cập trực tiếp đường dẫn: `https://tiktok-video-pfm.vercel.app/dashboard` (hoặc chạy dev server local tại `http://localhost:3000/dashboard`).
3. Quan sát kết quả: Giao diện Sidebar, Dashboard hiển thị và toàn bộ dữ liệu (GMV, Đơn hàng, Lượt xem, danh sách Video...) được hiển thị đầy đủ thay vì bị chuyển hướng về `/login`.

## Kết quả Thực tế vs Kết quả Mong đợi
* **Kết quả Thực tế**: Người dùng chưa đăng nhập vẫn có thể truy cập và xem được toàn bộ thông tin nhạy cảm của dashboard.
* **Kết quả Mong đợi**: Nếu chưa đăng nhập, mọi lượt truy cập vào các đường dẫn nội bộ phải bị chặn ngay lập tức ở cấp độ Server (hoặc Client) và chuyển hướng người dùng về trang `/login`. Chỉ khi đăng nhập thành công mới được phép xem nội dung này. Ngược lại, nếu đã đăng nhập rồi mà cố truy cập `/login` thì sẽ được tự động chuyển hướng sang `/dashboard`.

## Ngữ cảnh & Môi trường
* **Framework**: Next.js 16.2.3 (App Router).
* **Cơ chế xác thực**: Supabase Auth.
* **Môi trường bị lỗi**: Cả môi trường Production (Vercel) và Local Dev.

---

## Phân tích Nguyên nhân Gốc rễ (Root Cause Analysis)

### 1. (ĐÃ ĐÍNH CHÍNH) Quy ước file — `proxy.ts` là ĐÚNG với Next.js 16
> ⚠️ **Đính chính khi thực thi:** Giả định ban đầu ("file đặt sai tên `proxy.ts` nên bị bỏ qua, phải đổi thành `middleware.ts`") là **SAI** với Next.js 16.2.3.
> Kể từ Next.js 16, quy ước đã đổi từ `middleware.ts` sang **`proxy.ts`** (export hàm `proxy`). Bản build xác nhận: dùng `middleware.ts` sẽ báo *"The middleware file convention is deprecated. Please use proxy instead"*, còn `proxy.ts` được nhận diện là `ƒ Proxy (Middleware)` và **vẫn chạy bình thường**.
>
> Vì vậy file `src/proxy.ts` cũ **có chạy** — nguyên nhân lỗi thực sự nằm ở **mục #2 (logic thiếu chiều chặn)** và ở việc session chỉ lưu trong localStorage (mục bổ sung bên dưới), khiến proxy không đọc được cookie phiên đăng nhập.

**Nguyên nhân bổ sung — Session không lưu vào cookie:** Client khởi tạo bằng `createClient` của `@supabase/supabase-js`, chỉ lưu session vào `localStorage`. Middleware/Proxy chạy ở Server không đọc được `localStorage`, nên dù có logic chặn cũng không thể biết người dùng đã đăng nhập hay chưa. Cần chuyển sang `createBrowserClient` của `@supabase/ssr` để đồng bộ session vào cookie.

### 2. Logic kiểm tra Auth trong file cấu hình cũ chưa đầy đủ
Ngay cả khi logic trong file `src/proxy.ts` được Next.js nhận dạng và kích hoạt, hàm `proxy` hiện tại chỉ có duy nhất một chiều kiểm tra:
* Nếu người dùng **đã đăng nhập** (có cookie) mà truy cập `/login` -> chuyển hướng về `/dashboard`.
* File **thiếu hoàn toàn** chiều ngược lại: "Nếu người dùng **chưa đăng nhập** (không có cookie) và truy cập các trang nội bộ -> chuyển hướng về `/login`".

### 3. Thiếu cơ chế Client-side Auth Guard
Ở layout chính của các trang nội bộ `src/app/(main)/layout.tsx`, component `UserProvider` từ `@/components/user-context.tsx` được sử dụng để bọc các trang con.
Tuy nhiên, `UserProvider` chỉ quản lý trạng thái đăng nhập (`user`, `loading`) chứ không hề chứa logic chuyển hướng khi `user` bằng `null` và `loading` bằng `false`. Do đó, layout chính và các trang con vẫn render bình thường bất kể trạng thái đăng nhập.

### 4. Phân quyền Database (RLS) chưa tối ưu cho bảng Metrics
Các hàm RPC lấy dữ liệu hiển thị (ví dụ: `get_videos_with_period_metrics` và `get_videos_summary_for_period`) được định nghĩa trên Database PostgreSQL chạy dưới dạng `SECURITY INVOKER` (quyền người gọi). Nhưng bảng phụ thuộc chính `video_period_metrics` lại có RLS Policy SELECT cho phép truy cập công khai không giới hạn (`USING (true)` cho cả role `anon`):
```sql
CREATE POLICY "Allow public read access on video_period_metrics"
  ON video_period_metrics FOR SELECT
  USING (true);
```
Điều này khiến client chưa đăng nhập (sử dụng anonymous key của Supabase) vẫn có thể truy vấn và lấy toàn bộ dữ liệu metrics thông qua RPC.

### Sơ đồ luồng xử lý lỗi hiện tại:
```
[Request: /dashboard] 
       │
       ├─> (Next.js bỏ qua file src/proxy.ts do sai tên)
       │
       ▼
[Render Dashboard Page]
       │
       ├─> [Client-side Fetching] ──> (Gọi supabase.rpc với anon key)
       │                                     │
       │                                     ▼
       │                              (Bảng metrics mở public SELECT = true)
       │                                     │
       ▼                                     ▼
[Hiển thị đầy đủ giao diện] <─── [Nhận toàn bộ dữ liệu metrics từ Database]
```

---

## Đề xuất Sửa lỗi (Proposed Fixes)

### 📌 Phương án Khuyến nghị: Thiết lập Next.js Middleware chính thức sử dụng `@supabase/ssr` (Bảo vệ ở cấp Server)

Đây là phương án tối ưu và bảo mật nhất, giúp chặn truy cập trái phép ngay từ khi request gửi tới Server (trước khi render HTML và tải code JS của trang nội bộ).

**Chi tiết các bước thực hiện:**

1. **Cấu hình lại file Proxy (giữ nguyên `src/proxy.ts` — đúng quy ước Next.js 16):**
   Viết lại `src/proxy.ts` (export hàm `proxy`), sử dụng `createServerClient` của `@supabase/ssr` để đọc/đồng bộ cookie session và xử lý chuyển hướng 2 chiều bằng `getUser()`:
   * Nếu không có user (chưa đăng nhập) và pathname không phải `/login`: Redirect về `/login`.
   * Nếu đã có user (đã đăng nhập) và pathname là `/login`: Redirect về `/dashboard`.

2. **Cập nhật Client-side Supabase Initialization (`src/lib/supabase.ts`):**
   Chuyển từ `createClient` của `@supabase/supabase-js` sang `createBrowserClient` của `@supabase/ssr`.
   * **Lý do**: Để middleware trên server đọc được cookie session, client-side sau khi đăng nhập thành công bằng `signInWithPassword` cần lưu session vào cookie trình duyệt. `createBrowserClient` sẽ tự động xử lý việc đồng bộ session giữa localStorage và cookie một cách đáng tin cậy.

3. **Gia cố bảo mật dữ liệu ở Database (Defense in Depth):**
   * Sửa policy của bảng `video_period_metrics` để chỉ cho phép tài khoản đã đăng nhập đọc (`TO authenticated USING (true)` thay vì public cho tất cả).

### Sơ đồ luồng hoạt động đề xuất sau khi sửa:
```
[Request: /dashboard]
       │
       ▼
[Next.js Middleware (src/middleware.ts)]
       │
       ├──> [Chưa đăng nhập?] ──> Có ──> [Redirect về /login]
       │
       └──> [Đã đăng nhập?] ──> Có ──> [NextResponse.next()] ──> [Hiển thị Dashboard]
```

---

## Kế hoạch Xác minh

1. **Kiểm tra truy cập ẩn danh (chưa đăng nhập):**
   * Xóa toàn bộ Cookie/Local Storage trên trình duyệt hoặc sử dụng tab ẩn danh mới.
   * Truy cập `/dashboard`.
   * **Kết quả mong đợi**: Hệ thống tự động chuyển hướng ngay lập tức về `/login`. Màn hình Dashboard không được phép nhấp nháy hay hiển thị bất cứ thông tin nào.

2. **Kiểm tra đăng nhập:**
   * Truy cập `/login` và thực hiện đăng nhập bằng tài khoản hợp lệ.
   * **Kết quả mong đợi**: Đăng nhập thành công và chuyển hướng mượt mà sang `/dashboard`. Số liệu hiển thị đầy đủ.

3. **Kiểm tra chuyển hướng ngược khi đã đăng nhập:**
   * Khi đang ở `/dashboard` (đã đăng nhập), truy cập trực tiếp URL `/login`.
   * **Kết quả mong đợi**: Tự động chuyển hướng ngược lại `/dashboard`.

4. **Kiểm tra đăng xuất:**
   * Thực hiện Đăng xuất.
   * **Kết quả mong đợi**: Phiên làm việc bị xóa ở cả client và cookie, trình duyệt chuyển ngay về `/login`. Bấm nút Back trên trình duyệt không thể quay lại trang dashboard.

---

## Kết quả Sửa lỗi (Fix Result) — ✅ THÀNH CÔNG

### Các thay đổi đã áp dụng (Minimal changes)
1. **`src/proxy.ts`** — viết lại logic dùng `createServerClient` (`@supabase/ssr`) + `getUser()`, chặn 2 chiều (chưa đăng nhập → `/login`; đã đăng nhập vào `/login` → `/dashboard`). Giữ tên file `proxy.ts` (đúng quy ước Next.js 16, không dùng `middleware.ts` đã deprecate).
2. **`src/lib/supabase.ts`** — chuyển `createClient` → `createBrowserClient` (`@supabase/ssr`) để session đồng bộ vào cookie cho Server đọc được. Giữ nguyên biến export `supabase` nên toàn bộ import hiện có không đổi.
3. **`supabase/migrations/harden_video_period_metrics_read.sql`** — (Defense in Depth) siết policy SELECT của `video_period_metrics` từ public `USING (true)` → `TO authenticated`.

### Kiểm thử tự động (build + reproduce script)
* **`npm run build`**: ✅ Compiled successfully, TypeScript pass, không còn cảnh báo deprecate; proxy được nhận diện `ƒ Proxy (Middleware)`.
* **Script tái hiện** (chạy `npm start` rồi curl khi CHƯA đăng nhập):

```
=== TEST 1: /dashboard      → status=307 redirect=/login   ✅
=== TEST 2: /admin/upload   → status=307 redirect=/login   ✅
=== TEST 3: /team/booking   → status=307 redirect=/login   ✅
=== TEST 4: /login          → status=200 (no redirect)     ✅
```

→ Trước khi sửa, các trang trên trả về `200` và render dữ liệu. Sau khi sửa, mọi trang nội bộ đều bị chặn (`307 → /login`) khi chưa đăng nhập. **Lỗi đã được khắc phục.**

### Lưu ý khi triển khai
* **Đăng nhập lại 1 lần:** Người dùng đang có session cũ (lưu ở localStorage) sẽ bị đưa về `/login` ở lần truy cập đầu tiên sau khi deploy và cần đăng nhập lại 1 lần để tạo cookie session mới. Đây là hành vi mong đợi.
* **Migration RLS chạy thủ công:** File `harden_video_period_metrics_read.sql` cần chạy trên đúng project Supabase của app (`mrmwwlqolqsoyuxasrta.supabase.co`). Kết nối MCP hiện tại chỉ truy cập được project HR khác (`pmuxcbwxjczrzeigowoi`) nên **không thể tự động push** migration này — vui lòng chạy qua Supabase SQL Editor / CLI.
