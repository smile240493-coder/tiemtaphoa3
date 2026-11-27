# Tiệm Tạp Hóa – Website phụ kiện điện thoại và đồ gia dụng (HTML/CSS/JS thuần)

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

## Nhận đơn hàng (Google Sheets + Gmail)
Đơn hàng gửi về Google Apps Script của bạn: ghi vào Google Sheets và gửi email thông báo.
Dán link Apps Script (kết thúc bằng /exec) vào js/config.js, mục orderHook. Mật khẩu quản trị cũng đặt ở js/config.js (adminPass).

## Chatbot
Nút "Chat với shop" ở góc trái dưới. Bot trả lời theo từ khóa và tìm sản phẩm trong data.js (không cần máy chủ, không tốn phí).
Muốn sửa câu trả lời (giao hàng, bảo hành, thanh toán, địa chỉ...), mở js/app.js, tìm "const FAQ" và sửa nội dung trong ngoặc kép.

## Mua ngay
Mỗi sản phẩm có nút "Mua ngay": khách điền họ tên, số điện thoại, địa chỉ và đặt hàng luôn, không qua giỏ hàng. Đơn gửi về Google Sheets và Gmail như đơn từ giỏ hàng.

## Phân trang
Trang Sản phẩm chia trang, mặc định 12 sản phẩm mỗi trang. Đổi số này ở js/config.js, mục perPage.

## Supabase (thêm sản phẩm trực tiếp trên web, không qua Git)
1. Tạo dự án Supabase, chạy file supabase-setup.sql trong SQL Editor (sửa email quản trị trước khi chạy).
2. Tạo tài khoản quản trị (Authentication > Users) và tắt đăng ký tự do.
3. Điền supabaseUrl và supabaseKey (Publishable key) vào js/config.js.
4. Vào /quan-tri, đăng nhập bằng email và mật khẩu, thêm sản phẩm, ảnh, video: khách thấy ngay.
Để trống supabaseUrl/supabaseKey thì web dùng js/data.js như trước.

## Hiển thị sản phẩm
Sản phẩm xếp ngang: 2 cột trên điện thoại, 3 cột trên máy tính bảng, 4 cột trên máy tính. Trang Sản phẩm có nút chuyển Lưới/Danh sách và phân trang đánh số (mặc định 8 sản phẩm mỗi trang, đổi ở perPage trong js/config.js).

## Link riêng cho từng sản phẩm
Mỗi sản phẩm có link dạng /p/12-ten-san-pham (api/p.js + chi-tiet.html). Link hiện đúng ảnh, tên, giá khi đăng Facebook. Trang quản trị có nút "Sao chép link" ở mỗi sản phẩm.

## Khu giải trí (thư mục game/)
Trang /game có 4 game chạy ngay trong trình duyệt, miễn phí, không cần máy chủ: lật hình, rắn săn mồi, 2048, cờ ca-rô.
Mỗi game gồm một file .html và một file .js cùng tên trong thư mục game/. Điểm cao lưu trên máy người chơi (localStorage).
Muốn thêm game mới: copy một cặp file, sửa nội dung, rồi thêm thẻ vào game/index.html và dòng vào sitemap.xml.

## Đặt hàng theo ảnh và Hoàn tiền Shopee
Cần chạy file supabase-tinh-nang-moi.sql một lần trong Supabase. Khách dùng trang /dat-theo-anh và /hoan-tien-shopee; bạn xử lý ở trang quản trị, tab "Đặt theo ảnh" và "Hoàn tiền Shopee".
Cấu hình trong js/config.js: cashbackPercent (tỷ lệ hoàn cho khách) và shopeeDeeplink (không bắt buộc, mẫu link tiếp thị liên kết có {url} và {sub}).

## Tự động đổi link Shopee thành link tiếp thị của cửa hàng
Hàm api/aff.js gọi Shopee Affiliate Open API (generateShortLink). Cần AppID và Secret đã được Shopee cấp quyền Open API.
Đặt hai biến SHOPEE_APP_ID và SHOPEE_SECRET trong Vercel (Settings, Environment Variables), rồi Redeploy. KHÔNG ghi chúng vào mã nguồn.
Sau đó bật shopeeAuto: true trong js/config.js và chạy lại file supabase-tinh-nang-moi.sql một lần.
