import classNames from 'classnames/bind';
import styles from './PolicyPage.module.scss';

const cx = classNames.bind(styles);

function ReturnPolicyPage() {
  return (
    <div className={cx('wrapper')}>
      <div className={cx('header')}>
        <h1 className={cx('title')}>CHÍNH SÁCH ĐỔI TRẢ</h1>
        <p className={cx('subtitle')}>
          Hỗ trợ đổi trả/hoàn tiền rõ ràng, quy trình minh bạch.
        </p>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>1. Điều kiện đổi trả</h2>
        <p className={cx('text')}>Áp dụng khi:</p>
        <ul className={cx('list')}>
          <li>Sản phẩm lỗi do nhà sản xuất, hư hỏng khi vận chuyển, giao nhầm, sai mô tả.</li>
          <li>Khách đổi ý/không còn nhu cầu/đặt nhầm (chấp nhận trong 7 ngày từ lúc nhận hàng).</li>
        </ul>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>2. Thời gian và điều kiện sản phẩm</h2>
        <ul className={cx('list')}>
          <li>Yêu cầu đổi/hoàn gửi trong vòng 7 ngày kể từ ngày nhận hàng.</li>
          <li>Sản phẩm còn nguyên tem/mác, chưa sử dụng; bao bì, phụ kiện còn đủ.</li>
          <li>Vui lòng cung cấp ảnh/video rõ ràng về tình trạng sản phẩm và lỗi (nếu có) để làm bằng chứng.</li>
        </ul>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>3. Quy trình đổi trả</h2>
        <ul className={cx('list')}>
          <li>Tại “Lịch sử mua hàng” → “Đã giao”, chọn “Yêu cầu trả hàng/Hoàn tiền” với sản phẩm đủ điều kiện.</li>
          <li>Cung cấp thông tin đơn hàng, lý do đổi trả và ảnh/video (nếu lỗi).</li>
          <li>Chờ CSKH xác nhận và hướng dẫn gửi hàng.</li>
          <li>Đóng gói sản phẩm và gửi về địa chỉ được chỉ định.</li>
          <li>Nhận sản phẩm mới hoặc hoàn tiền sau 3-5 ngày làm việc từ khi chúng tôi nhận hàng trả (nếu đủ điều kiện).</li>
        </ul>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>4. Chi phí</h2>
        <ul className={cx('list')}>
          <li>Nếu lỗi/nhầm lẫn từ NovaBeauty: hoàn 100% giá trị sản phẩm và hỗ trợ phí vận chuyển trả hàng.</li>
          <li>Nếu lý do cá nhân (đặt nhầm/không ưng): khách thanh toán phí gửi hàng; có thể khấu trừ 10% giá trị sản phẩm.</li>
        </ul>
      </div>

      <div className={cx('section')}>
        <h2 className={cx('sectionTitle')}>5. Hoàn tiền</h2>
        <p className={cx('text')}>
          Thời gian hoàn tiền: 3-5 ngày làm việc sau khi chúng tôi nhận và kiểm tra sản phẩm trả. MoMo: hoàn về ví MoMo; COD: hoàn qua tài khoản ngân hàng bạn cung cấp.
        </p>
      </div>
    </div>
  );
}

export default ReturnPolicyPage;

