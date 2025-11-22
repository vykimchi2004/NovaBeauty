import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './Vouchers.module.scss';
import cartService from '~/services/cart';
import notify from '~/utils/notification';

const cx = classNames.bind(styles);

function Vouchers() {
  const navigate = useNavigate();
  const [voucherCode, setVoucherCode] = useState('');
  const [applying, setApplying] = useState(false);

  const handleApplyVoucher = async (e) => {
    e.preventDefault();
    if (!voucherCode.trim()) {
      notify.warning('Vui lòng nhập mã voucher');
      return;
    }

    try {
      setApplying(true);
      await cartService.applyVoucher(voucherCode.trim().toUpperCase());
      notify.success('Áp dụng mã voucher thành công!');
      setVoucherCode('');
      // Chuyển đến trang giỏ hàng
      navigate('/cart');
    } catch (error) {
      console.error('Error applying voucher:', error);
      notify.error(error.message || 'Mã voucher không hợp lệ hoặc đã hết hạn. Vui lòng thử lại.');
    } finally {
      setApplying(false);
    }
  };

  return (
    <div className={cx('container')}>
      <div className={cx('content')}>
        <h1 className={cx('title')}>Nhập mã voucher</h1>
        <p className={cx('subtitle')}>
          Nhập mã voucher hoặc mã khuyến mãi để nhận giảm giá cho đơn hàng của bạn
        </p>

        <form className={cx('voucher-form')} onSubmit={handleApplyVoucher}>
          <div className={cx('input-group')}>
            <input
              type="text"
              className={cx('voucher-input')}
              placeholder="Nhập mã voucher (VD: VOUCHER50)"
              value={voucherCode}
              onChange={(e) => {
                // Chỉ cho phép chữ hoa, số, dấu gạch ngang và gạch dưới
                const sanitized = e.target.value
                  .toUpperCase()
                  .replace(/[^A-Z0-9_-]/g, '');
                setVoucherCode(sanitized);
              }}
              maxLength={50}
              disabled={applying}
            />
            <button
              type="submit"
              className={cx('apply-btn')}
              disabled={applying || !voucherCode.trim()}
            >
              {applying ? 'Đang áp dụng...' : 'Áp dụng'}
            </button>
          </div>
          <small className={cx('helper-text')}>
            Mã voucher chỉ áp dụng khi nhập mã. Mã khuyến mãi sẽ tự động áp dụng cho sản phẩm.
          </small>
        </form>

        <div className={cx('info-section')}>
          <h2 className={cx('info-title')}>Lưu ý:</h2>
          <ul className={cx('info-list')}>
            <li>Voucher chỉ áp dụng khi bạn nhập mã vào giỏ hàng</li>
            <li>Khuyến mãi sẽ tự động áp dụng cho sản phẩm có trong chương trình</li>
            <li>Mỗi mã chỉ có thể sử dụng một lần (trừ khi có quy định khác)</li>
            <li>Mã có thể có giới hạn về giá trị đơn hàng tối thiểu</li>
          </ul>
        </div>
      </div>
    </div>
  );
}

export default Vouchers;

