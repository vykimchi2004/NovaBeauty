import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faTimes } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from '../../StaffVouchers.module.scss';
import { getActiveProducts } from '~/services/product';

const cx = classNames.bind(styles);

function DetailModal({ item, onClose, formatScope }) {
  const [activeProductNames, setActiveProductNames] = useState([]);

  useEffect(() => {
    if (!item || !item.productIds || item.productIds.length === 0) {
      setActiveProductNames([]);
      return;
    }

    let mounted = true;
    (async () => {
      try {
        const activeProducts = await getActiveProducts();
        if (mounted) {
          // Filter only products that are in item.productIds and are active
          const filtered = activeProducts
            .filter((product) => item.productIds.includes(product.id))
            .map((product) => product.name);
          setActiveProductNames(filtered);
        }
      } catch (error) {
        console.error('Error fetching active products for detail:', error);
        if (mounted) {
          // Fallback to original productNames if fetch fails
          setActiveProductNames(item.productNames || []);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [item]);

  if (!item) return null;
  const isVoucher = item.applyScope === 'ORDER' || item.__type === 'voucher';

  const formatDate = (value) => {
    if (!value) return '-';
    try {
      return new Date(value).toLocaleDateString('vi-VN');
    } catch {
      return value;
    }
  };

  return (
    <div className={cx('modalOverlay')} onClick={onClose}>
      <div className={cx('detailCard')} onClick={(e) => e.stopPropagation()}>
        <div className={cx('detailHeader')}>
          <h3>Chi tiết {isVoucher ? 'voucher' : 'khuyến mãi'}</h3>
          <button type="button" className={cx('closeBtn')} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className={cx('detailBody')}>
          {(item.imageUrl || item.previewUrl) && (
            <div className={cx('detailRow')}>
              <span>Hình ảnh:</span>
              <div className={cx('detailImage')}>
                <img src={item.imageUrl || item.previewUrl} alt={item.name} />
              </div>
            </div>
          )}
          <div className={cx('detailRow')}>
            <span>Mã:</span>
            <strong>{item.code}</strong>
          </div>
          <div className={cx('detailRow')}>
            <span>Tên:</span>
            <strong>{item.name}</strong>
          </div>
          <div className={cx('detailRow')}>
            <span>Loại:</span>
            <strong>{isVoucher ? 'Voucher (áp dụng toàn đơn)' : formatScope(item.applyScope)}</strong>
          </div>
          <div className={cx('detailRow')}>
            <span>Giảm giá:</span>
            <strong>
              {item.discountValue}% ({item.discountValueType === 'AMOUNT' ? 'Số tiền' : 'Phần trăm'})
            </strong>
          </div>
          <div className={cx('detailRow')}>
            <span>Thời gian:</span>
            <strong>
              {formatDate(item.startDate)} - {formatDate(item.expiryDate)}
            </strong>
          </div>
          <div className={cx('detailRow')}>
            <span>Giới hạn:</span>
            <strong>
              {item.usageCount || 0} / {item.usageLimit && item.usageLimit > 0 ? item.usageLimit : 'Không giới hạn'}
            </strong>
          </div>
          <div className={cx('detailRow')}>
            <span>Mô tả:</span>
            <p>{item.description || 'Chưa có mô tả'}</p>
          </div>
          <div className={cx('detailRow')}>
            <span>Giảm tối đa:</span>
            <p>{item.maxDiscountValue || 'Không giới hạn'}</p>
          </div>
          <div className={cx('detailRow')}>
            <span>Đơn hàng tối thiểu:</span>
            <p>{item.minOrderValue || 'Không yêu cầu'}</p>
          </div>
          {!isVoucher && item.categoryNames?.length > 0 && (
            <div className={cx('detailRow')}>
              <span>Danh mục:</span>
              <p>{item.categoryNames.join(', ')}</p>
            </div>
          )}
          {!isVoucher && activeProductNames.length > 0 && (
            <div className={cx('detailRow', 'productRow')}>
              <span>Sản phẩm:</span>
              <div className={cx('productList')}>
                {activeProductNames.map((name, idx) => (
                  <span key={idx} className={cx('productTag')}>
                    {name}
                  </span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default DetailModal;

