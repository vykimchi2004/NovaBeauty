import classNames from 'classnames/bind';
import styles from './PolicyPage.module.scss';

const cx = classNames.bind(styles);

function ShippingPolicyPage() {
  return (
    <div className={cx('wrapper')}>
      <div className={cx('header')}>
        <h1 className={cx('title')}>CHÍNH SÁCH VẬN CHUYỂN</h1>
        <p className={cx('subtitle')}>
          Giao hàng toàn quốc qua đối tác uy tín, minh bạch phí và thời gian.
        </p>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>1. Phạm vi giao hàng</h2>
        <p className={cx('text')}>
          NovaBeauty giao hàng toàn quốc thông qua đối tác vận chuyển (ví dụ GHN/GHTK/EMS tùy khu vực).
        </p>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>2. Phí vận chuyển</h2>
        <p className={cx('text')}>Phí vận chuyển được tính dựa trên:</p>
        <ul className={cx('list')}>
          <li>Khoảng cách từ kho đến địa chỉ nhận.</li>
          <li>Trọng lượng và kích thước gói hàng.</li>
          <li>Loại dịch vụ vận chuyển.</li>
        </ul>
        <p className={cx('note')}>
          Phí vận chuyển sẽ hiển thị rõ trước khi bạn xác nhận đơn hàng; nếu có ưu đãi, mức phí đã bao gồm khuyến mại.
        </p>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>3. Thời gian giao hàng</h2>
        <div className={cx('list')}>
          <div>• Nội thành: 1-2 ngày làm việc</div>
          <div>• Tỉnh/thành khác: 3-5 ngày làm việc</div>
          <div>• Vùng xa/đảo: 5-7 ngày làm việc</div>
        </div>
        <p className={cx('note')}>
          Thời gian tính từ khi đơn được xác nhận; có thể thay đổi do thời tiết, lễ/tết, sự cố vận chuyển.
        </p>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>4. Quy trình giao hàng</h2>
        <ul className={cx('list')}>
          <li>Đơn được xử lý và đóng gói trong 24 giờ (ngày làm việc).</li>
          <li>Bàn giao cho đối tác vận chuyển.</li>
          <li>Nhân viên giao hàng liên hệ trước khi giao.</li>
          <li>Khách kiểm tra hàng trước khi nhận.</li>
          <li>Thanh toán (nếu COD) và ký nhận.</li>
        </ul>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>5. Theo dõi đơn hàng</h2>
        <p className={cx('text')}>Bạn có thể theo dõi trạng thái đơn:</p>
        <ul className={cx('list')}>
          <li>Trong tài khoản của bạn tại mục “Lịch sử mua hàng”.</li>
          <li>Qua email/SMS thông báo tự động.</li>
          <li>Liên hệ hotline 1800 6035 hoặc email novabeauty@gmail.com.</li>
        </ul>
      </div>
    </div>
  );
}

export default ShippingPolicyPage;

