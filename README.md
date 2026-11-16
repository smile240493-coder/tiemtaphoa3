# Tiện Ích Store – Website phụ kiện điện thoại và đồ gia dụng (HTML/CSS/JS thuần)

## Cấu trúc
6 trang .html · css/style.css · js/app.js · js/data.js (dữ liệu sản phẩm và ảnh nền) · robots.txt · sitemap.xml · vercel.json

## Triển khai lên Vercel
1. Đưa thư mục dự án lên GitHub. 2. Vercel → Add New → Project → chọn repo → Deploy.
3. Thay `ten-mien-cua-ban.vercel.app` trong các file .html, sitemap.xml, robots.txt bằng tên miền thật.

## Thêm ảnh, video, đổi ảnh nền
Mở /quan-tri (mật khẩu mặc định `admin123`, đổi ở ADMIN_PASS trong js/app.js).
- Sản phẩm: tải nhiều ảnh từ máy, dán link YouTube hoặc .mp4 cho video.
- Tab "Ảnh nền": tải ảnh hoặc dán link để đổi nền banner trang chủ.
- Bấm "Tải data.js", chép đè vào js/data.js, đẩy lên GitHub: khách sẽ thấy thay đổi.

## Mẹo giữ web nhanh
Ảnh tải từ trang quản trị được nén và nhúng vào data.js. Nếu có nhiều sản phẩm, hãy đặt ảnh vào thư mục img/, video mp4 vào video/ rồi nhập đường dẫn (img/ten.jpg) để file data.js nhẹ.

## Giới hạn
Giỏ hàng, đơn hàng và bản nháp lưu trong trình duyệt. Để nhận đơn về một nơi và quản trị từ xa, cần backend (Supabase, Vercel Postgres/Blob…).

## Danh mục, banner, tài khoản (bản cập nhật)
- Trang quản trị có tab "Danh mục" (tên + biểu tượng), "Banner & nền" (nhiều banner chạy luân phiên) và ô "Giá gốc" để làm Flash Sale.
- Khách có thể đăng ký, đăng nhập (dang-nhap.html) và xem đơn của mình (tai-khoan.html).
- LƯU Ý: tài khoản khách lưu trong trình duyệt (localStorage), chỉ dùng được trên chính thiết bị đã đăng ký. Muốn tài khoản dùng chung mọi thiết bị cần backend (Supabase Auth, Firebase Auth...).

## Nhận đơn hàng qua Telegram
Hàm api/order.js gửi mỗi đơn về Telegram của chủ shop. Trên Vercel (Settings > Environment Variables) tạo 2 biến:
TELEGRAM_BOT_TOKEN (mã bot từ @BotFather) và TELEGRAM_CHAT_ID (mã cuộc trò chuyện). Sau đó Redeploy.
KHÔNG ghi token vào mã nguồn hay đưa lên GitHub.

## Chatbot
Nút "Chat với shop" ở góc trái dưới. Bot trả lời theo từ khóa và tìm sản phẩm trong data.js (không cần máy chủ, không tốn phí).
Muốn sửa câu trả lời (giao hàng, bảo hành, thanh toán, địa chỉ...), mở js/app.js, tìm "const FAQ" và sửa nội dung trong ngoặc kép.
