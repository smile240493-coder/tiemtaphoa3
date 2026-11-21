/* Cài đặt riêng của cửa hàng. Chỉ sửa file này, không cần sửa app.js.
   Lần cập nhật sau, đừng ghi đè file config.js để giữ mật khẩu và link nhận đơn của bạn. */
window.CFG = {
  adminPass: "haico123", /* ĐỔI mật khẩu trang quản trị */
  orderHook: "const EMAIL_NHAN_DON = "smile240493@gmail.com";

function doPost(e) {
  try {
    const d = JSON.parse(e.postData.contents);
    if (d.website) return ContentService.createTextOutput("ok");
    const s = (v, n) => String(v || "").replace(/[\r\n]+/g, " ").slice(0, n);
    const name = s(d.name, 80), phone = s(d.phone, 15), addr = s(d.addr, 200),
          note = s(d.note, 300), id = s(d.id, 20);
    const items = (Array.isArray(d.items) ? d.items : []).slice(0, 50).map(x => s(x, 120));
    if (!name || !/^0\d{9}$/.test(phone) || !addr || !items.length)
      return ContentService.createTextOutput("invalid");
    const total = Number(d.total) || 0;
    const money = String(total).replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    let sh = ss.getSheetByName("Đơn hàng");
    if (!sh) {
      sh = ss.insertSheet("Đơn hàng");
      sh.appendRow(["Thời gian", "Mã đơn", "Họ tên", "Số điện thoại", "Địa chỉ", "Ghi chú", "Sản phẩm", "Tổng tiền", "Trạng thái"]);
      sh.getRange("D:D").setNumberFormat("@");
    }
    sh.appendRow([new Date(), id, name, phone, addr, note, items.join("\n"), total, "Mới"]);

    MailApp.sendEmail(EMAIL_NHAN_DON, "Đơn hàng mới " + id + " - " + name,
      "Mã đơn: " + id + "\nKhách: " + name + "\nĐiện thoại: " + phone +
      "\nĐịa chỉ: " + addr + (note ? "\nGhi chú: " + note : "") +
      "\n\nSản phẩm:\n" + items.join("\n") + "\n\nTổng: " + money + "đ");
    return ContentService.createTextOutput("ok");
  } catch (err) {
    return ContentService.createTextOutput("error");
  }
}"          /* Dán link Google Apps Script (kết thúc bằng /exec) để nhận đơn qua Google Sheets và Gmail */
};
