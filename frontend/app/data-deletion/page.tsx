export default function DataDeletionPage() {
  return (
    <div className="max-w-3xl mx-auto px-6 py-16 prose prose-sm prose-invert">
      <h1 className="text-2xl font-bold tracking-tight">Hướng dẫn xóa dữ liệu</h1>
      <p className="text-muted-foreground">Cập nhật lần cuối: 23/06/2026</p>

      <h2>Xóa kết nối Facebook</h2>
      <p>Để hủy liên kết tài khoản Facebook khỏi Vitba AI:</p>
      <ol>
        <li>Đăng nhập vào <strong>vitbaai.xyz</strong></li>
        <li>Vào <strong>Marketing Hub</strong> &gt; <strong>Facebook</strong></li>
        <li>Click <strong>&ldquo;Ngắt kết nối&rdquo;</strong></li>
      </ol>
      <p>Khi ngắt kết nối, toàn bộ token truy cập và thông tin trang Facebook sẽ bị xóa khỏi hệ thống ngay lập tức.</p>

      <h2>Xóa từ phía Facebook</h2>
      <p>Bạn cũng có thể xóa kết nối từ Facebook:</p>
      <ol>
        <li>Vào <strong>Facebook Settings</strong> &gt; <strong>Security and Login</strong> &gt; <strong>Apps and Websites</strong></li>
        <li>Tìm <strong>Vitba AI</strong> &gt; click <strong>Remove</strong></li>
      </ol>

      <h2>Xóa toàn bộ tài khoản</h2>
      <p>Nếu bạn muốn xóa hoàn toàn tài khoản và tất cả dữ liệu liên quan (dự án, nội dung, lịch sử, kết nối OAuth), gửi email đến:</p>
      <p><a href="mailto:dylanvu6868@gmail.com" className="text-foreground underline">dylanvu6868@gmail.com</a></p>
      <p>Tiêu đề: <strong>&ldquo;Yêu cầu xóa tài khoản Vitba AI&rdquo;</strong></p>
      <p>Chúng tôi sẽ xử lý trong vòng 48 giờ và xác nhận qua email khi hoàn tất.</p>

      <h2>Dữ liệu bị xóa bao gồm</h2>
      <ul>
        <li>Thông tin tài khoản (tên, email)</li>
        <li>Tất cả dự án và nội dung đã tạo</li>
        <li>Lịch sử tạo nội dung</li>
        <li>Brand voice profiles</li>
        <li>Kết nối OAuth (Facebook tokens)</li>
        <li>Thông tin trang Facebook đã lưu</li>
        <li>Log hoạt động</li>
      </ul>
    </div>
  );
}
