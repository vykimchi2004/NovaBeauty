import classNames from 'classnames/bind';
import styles from './PolicyPage.module.scss';

const cx = classNames.bind(styles);

function PaymentPolicyPage() {
  return (
    <div className={cx('wrapper')}>
      <div className={cx('header')}>
        <h1 className={cx('title')}>CHÍNH SÁCH THANH TOÁN</h1>
        <p className={cx('subtitle')}>
          NovaBeauty hỗ trợ thanh toán nhanh, an toàn qua MoMo và COD.
        </p>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>1. Phương thức thanh toán</h2>
        <p className={cx('text')}>Chúng tôi hỗ trợ hai phương thức:</p>
        <ul className={cx('list')}>
          <li><strong>Thanh toán qua MoMo:</strong> Bạn được chuyển hướng sang trang MoMo để hoàn tất giao dịch.</li>
          <li><strong>Thanh toán khi nhận hàng (COD):</strong> Trả tiền mặt trực tiếp cho nhân viên giao hàng khi nhận sản phẩm.</li>
        </ul>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>2. Quy trình thanh toán</h2>
        <ul className={cx('list')}>
          <li>Chọn sản phẩm và thêm vào giỏ hàng.</li>
          <li>Điền thông tin giao hàng.</li>
          <li>Chọn phương thức thanh toán (MoMo hoặc COD).</li>
          <li>Xác nhận đơn hàng.</li>
          <li>Hoàn tất thanh toán trên MoMo (nếu chọn MoMo).</li>
          <li>Nhận email xác nhận đơn hàng.</li>
        </ul>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>3. Lưu ý khi thanh toán</h2>
        <ul className={cx('list')}>
          <li>Đảm bảo thông tin thanh toán và địa chỉ giao hàng chính xác.</li>
          <li>Kiểm tra số tiền cần thanh toán trước khi xác nhận.</li>
          <li>Giữ lại mã đơn hàng để tra cứu sau này.</li>
          <li>Nếu gặp lỗi thanh toán, hãy thử lại sau vài phút hoặc liên hệ CSKH.</li>
        </ul>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>4. Bảo mật thanh toán</h2>
        <p className={cx('text')}>
          Tất cả giao dịch đều được mã hóa và bảo vệ an toàn. Thông tin thanh toán của bạn
          được xử lý qua cổng MoMo/đối tác thanh toán đáng tin cậy; NovaBeauty không lưu trữ
          thông tin thẻ của bạn.
        </p>
      </div>
    </div>
  );
}

export default PaymentPolicyPage;

