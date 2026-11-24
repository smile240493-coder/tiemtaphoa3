/* Cài đặt riêng của cửa hàng. Chỉ sửa file này, không cần sửa app.js.
   Lần cập nhật sau, đừng ghi đè file config.js để giữ mật khẩu và link nhận đơn của bạn. */
window.CFG = {
  adminPass: "admin123", /* ĐỔI mật khẩu trang quản trị */
  perPage: 8,            /* Số sản phẩm mỗi trang ở trang Sản phẩm */
  supabaseUrl: "",       /* Địa chỉ dự án Supabase, dạng https://xxxx.supabase.co (để trống nếu chưa dùng) */
  supabaseKey: "",       /* Khóa công khai (Publishable key, bắt đầu bằng sb_publishable_) */
  orderHook: ""          /* Dán link Google Apps Script (kết thúc bằng /exec) để nhận đơn qua Google Sheets và Gmail */
};
