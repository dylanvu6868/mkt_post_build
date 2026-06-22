export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 prose prose-sm prose-invert">
      <h1 className="text-2xl font-bold tracking-tight">Chính sách bảo mật</h1>
      <p className="text-muted-foreground">Cập nhật lần cuối: 23/06/2026</p>

      <h2>1. Thông tin chúng tôi thu thập</h2>
      <p>Khi bạn sử dụng Vitba AI, chúng tôi thu thập:</p>
      <ul>
        <li>Thông tin tài khoản: tên, email, mật khẩu (đã mã hóa)</li>
        <li>Dữ liệu sử dụng: nội dung bạn tạo, lịch sử tạo, dự án</li>
        <li>Thông tin kết nối: khi bạn liên kết tài khoản Facebook, chúng tôi lưu trữ token truy cập (đã mã hóa) và thông tin trang Facebook của bạn</li>
        <li>Thông tin thanh toán: được xử lý qua bên thứ ba (SePay), chúng tôi không lưu thông tin thẻ</li>
      </ul>

      <h2>2. Cách chúng tôi sử dụng thông tin</h2>
      <ul>
        <li>Cung cấp và cải thiện dịch vụ tạo nội dung marketing</li>
        <li>Quản lý tài khoản và xác thực người dùng</li>
        <li>Đăng nội dung lên Facebook theo yêu cầu của bạn</li>
        <li>Gửi thông báo liên quan đến dịch vụ</li>
      </ul>

      <h2>3. Dữ liệu Facebook</h2>
      <p>Khi bạn kết nối Facebook, chúng tôi truy cập:</p>
      <ul>
        <li>Danh sách trang bạn quản lý (pages_show_list)</li>
        <li>Thống kê tương tác (pages_read_engagement)</li>
        <li>Quyền đăng bài (pages_manage_posts)</li>
        <li>Nội dung trang (pages_read_user_content)</li>
      </ul>
      <p>Chúng tôi chỉ sử dụng các quyền này theo yêu cầu của bạn và không chia sẻ dữ liệu Facebook với bên thứ ba.</p>

      <h2>4. Bảo mật dữ liệu</h2>
      <ul>
        <li>Token Facebook được mã hóa AES-256 trước khi lưu trữ</li>
        <li>Mật khẩu được băm bằng bcrypt</li>
        <li>Kết nối HTTPS được áp dụng cho toàn bộ hệ thống</li>
        <li>Truy cập dữ liệu được kiểm soát và ghi log</li>
      </ul>

      <h2>5. Quyền của bạn</h2>
      <ul>
        <li>Xem, sửa, xóa tài khoản và dữ liệu bất kỳ lúc nào</li>
        <li>Hủy kết nối Facebook trong phần Cài đặt</li>
        <li>Yêu cầu xóa toàn bộ dữ liệu qua email hỗ trợ</li>
      </ul>

      <h2>6. Liên hệ</h2>
      <p>Email: <a href="mailto:dylanvu6868@gmail.com" className="text-foreground underline">dylanvu6868@gmail.com</a></p>
    </div>
  );
}
