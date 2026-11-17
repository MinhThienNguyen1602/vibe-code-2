Hãy đóng vai một kỹ sư Frontend chuyên xây dựng học liệu Toán học tương tác. Hãy tạo cho tôi ứng dụng web một trang mang tên **"Máy Mô Phỏng Bội Chung Nhỏ Nhất Bằng Bánh Răng" (Gear Ratio & LCM Simulator)** chạy hoàn toàn ở phía client (không dùng API ngoài, dùng HTML5, CSS thuần và Vanilla JavaScript).

### 1. Yêu cầu kiến trúc & Tách file (Quan trọng)
- Xuất ra mã nguồn tách biệt rõ ràng thành **3 file riêng biệt**:
  1. `index.html`: Khung HTML ngữ nghĩa, không chứa CSS inline hay mã JS nội tuyến.
  2. `style.css`: Toàn bộ định dạng giao diện, liên kết qua `<link rel="stylesheet" href="style.css">`.
  3. `app.js`: Toàn bộ logic tính toán và điều khiển SVG/DOM, liên kết qua `<script src="app.js" defer></script>`.
- Toàn bộ giao diện bọc trong container gốc có class `.gear-lcm-app` và tiền tố class CSS là `.gl-` để cô lập style, tránh xung đột khi nhúng làm module trong trang web lớn.
- Trong `app.js`, tách bạch hoàn toàn các hàm tính toán toán học thuần túy (tính ƯCLN, BCNN, số vòng quay, góc quay) với tầng dựng hình SVG. Tuyệt đối không viết cứng mã màu (hex/rgb) trong `app.js` hoặc thẻ `<svg>`; mọi trạng thái màu sắc của bánh răng và điểm đánh dấu phải điều khiển thông qua **class CSS** và biến CSS.

### 2. Kế thừa hệ thống màu & Giao diện từ ứng dụng trước
Hãy sử dụng chính xác bộ biến màu và thông số thẩm mỹ dưới đây trong `style.css` (đổi tiền tố sang `--gl-`) để đồng bộ giao diện với các học liệu khác của tôi:
```css
.gear-lcm-app {
  --gl-bg-canvas: #f4f6f9;
  --gl-bg-surface: #ffffff;
  --gl-bg-subtle: #f8fafc;
  --gl-bg-muted: #f1f5f9;
  --gl-border-hairline: #e2e8f0;
  --gl-border-strong: #cbd5e1;

  --gl-text-primary: #0f172a;
  --gl-text-secondary: #475569;
  --gl-text-muted: #64748b;

  /* Dùng cho Bánh răng A */
  --gl-blue-solid: #2563eb;
  --gl-blue-soft: #eff6ff;
  --gl-blue-border: #bfdbfe;

  /* Dùng cho Bánh răng B */
  --gl-amber-solid: #d97706;
  --gl-amber-soft: #fffbeb;
  --gl-amber-border: #fde68a;

  /* Dùng cho Điểm tiếp xúc / Trạng thái gặp lại (BCNN) */
  --gl-green-solid: #15803d;
  --gl-green-deep: #14532d;
  --gl-green-soft: #f0fdf4;
  --gl-green-border: #bbf7d0;

  --gl-radius-lg: 14px;
  --gl-radius-md: 10px;
  --gl-radius-sm: 7px;
  --gl-shadow-card: 0 1px 3px rgba(15, 23, 42, 0.05), 0 4px 16px rgba(15, 23, 42, 0.04);
  --gl-ease: cubic-bezier(0.16, 1, 0.3, 1);
}