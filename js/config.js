/* Cài đặt riêng của cửa hàng. Chỉ sửa file này, không cần sửa app.js.
   Lần cập nhật sau, đừng ghi đè file config.js để giữ mật khẩu và link nhận đơn của bạn. */
window.CFG = {
  shopeeAffiliateId: "17344760343",
  adminPass: "haico123", /* ĐỔI mật khẩu trang quản trị */
  perPage: 8,            /* Số sản phẩm mỗi trang ở trang Sản phẩm */
  supabaseUrl: "https://auhmtpvfxticjqitamep.supabase.co/rest",       /* Địa chỉ dự án Supabase, dạng https://xxxx.supabase.co (để trống nếu chưa dùng) */
  supabaseKey: "sb_publishable_bX0JPOujK3LAqNDzEy7ytw_c1QDAaqe",       /* Khóa công khai (Publishable key, bắt đầu bằng sb_publishable_) */
  orderHook: "https://script.google.com/macros/s/AKfycbwA9hZocnkBW7yhzJBFyL6wme-2wO91aWrDtSfQCL_QPlB-NzNh8D43EBOeT22ZV8P-/exec"          /* Dán link Google Apps Script (kết thúc bằng /exec) để nhận đơn qua Google Sheets và Gmail */
};
