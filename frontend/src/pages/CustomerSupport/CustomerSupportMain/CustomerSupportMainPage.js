import React from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './CustomerSupportMainPage.scss';

const cx = classNames.bind(styles);

function CustomerSupportMainPage() {
  const navigate = useNavigate();

  return (
    <div className={cx('dashboard')}>
      <h1 className={cx('dashboardTitle')}>Trung tâm hỗ trợ khách hàng</h1>

      <div className={cx('dashboardGrid')}>
        <div
          className={cx('card')}
          onClick={() => navigate('/customer-support/complaints')}
        >
          <h2 className={cx('cardTitle')}>Quản lý khiếu nại</h2>
          <p className={cx('cardDescription')}>
            Xem và xử lý các đơn khiếu nại từ khách hàng, theo dõi trạng thái và kết quả xử lý.
          </p>
        </div>

        <div
          className={cx('card')}
          onClick={() => navigate('/customer-support/reviews')}
        >
          <h2 className={cx('cardTitle')}>Đánh giá &amp; bình luận</h2>
          <p className={cx('cardDescription')}>
            Quản lý đánh giá, bình luận về sản phẩm, phản hồi lại khách và xử lý nội dung vi phạm.
          </p>
        </div>

        <div
          className={cx('card')}
          onClick={() => navigate('/customer-support/refund-management')}
        >
          <h2 className={cx('cardTitle')}>Trả hàng / Hoàn tiền</h2>
          <p className={cx('cardDescription')}>
            Theo dõi và xử lý yêu cầu trả hàng, hoàn tiền theo quy trình CSKH hiện tại.
          </p>
        </div>

        <div
          className={cx('card')}
          onClick={() => navigate('/customer-support/notifications')}
        >
          <h2 className={cx('cardTitle')}>Thông báo</h2>
          <p className={cx('cardDescription')}>
            Xem các thông báo liên quan tới khiếu nại, hoàn tiền và hoạt động của khách hàng.
          </p>
        </div>

        <div
          className={cx('card')}
          onClick={() => navigate('/customer-support/profile')}
        >
          <h2 className={cx('cardTitle')}>Hồ sơ nhân viên CSKH</h2>
          <p className={cx('cardDescription')}>
            Cập nhật thông tin cá nhân và mật khẩu cho tài khoản chăm sóc khách hàng.
          </p>
        </div>

        <div className={cx('card', 'quickActions')}>
          <h2 className={cx('cardTitle')}>Tác vụ nhanh</h2>
          <div className={cx('quickActionButtons')}>
            <button
              type="button"
              className={cx('quickActionBtn')}
              onClick={() => navigate('/customer-support/complaints')}
            >
              Xử lý khiếu nại mới
            </button>
            <button
              type="button"
              className={cx('quickActionBtn')}
              onClick={() => navigate('/customer-support/refund-management')}
            >
              Yêu cầu hoàn tiền
            </button>
            <button
              type="button"
              className={cx('quickActionBtn')}
              onClick={() => navigate('/customer-support/reviews')}
            >
              Theo dõi đánh giá
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CustomerSupportMainPage;


