import React from 'react';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faXmark } from '@fortawesome/free-solid-svg-icons';
import styles from '../Profile.module.scss';
import { formatCurrency } from '~/services/utils';
import defaultProductImage from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);

function RegularOrderModal({ order, loading, onClose, onCancel, cancelling }) {
  if (!order && !loading) {
    return null;
  }

  return (
    <div className={cx('orderModalOverlay')} onClick={onClose}>
      <div className={cx('orderModalContent')} onClick={(e) => e.stopPropagation()}>
        <div className={cx('orderModalHeader')}>
          <h3>Chi tiết đơn hàng</h3>
          <button
            type="button"
            className={cx('orderModalClose')}
            onClick={onClose}
          >
            <FontAwesomeIcon icon={faXmark} />
          </button>
        </div>

        <div className={cx('orderModalBody')}>
          {loading ? (
            <p className={cx('emptyMessage')}>Đang tải chi tiết...</p>
          ) : order ? (
            <div className={cx('orderDetailGrid')}>
              <div>
                <p className={cx('detailLabel')}>Mã đơn hàng</p>
                <p className={cx('detailValue')}>
                  #{order?.code || order?.id || '—'}
                </p>
              </div>
              <div>
                <p className={cx('detailLabel')}>Người nhận</p>
                <p className={cx('detailValue')}>
                  {order?.receiverName || order?.customerName || '—'}
                </p>
              </div>
              <div>
                <p className={cx('detailLabel')}>Số điện thoại</p>
                <p className={cx('detailValue')}>
                  {order?.receiverPhone || '—'}
                </p>
              </div>
              <div className={cx('detailFull')}>
                <p className={cx('detailLabel')}>Địa chỉ</p>
                <p className={cx('detailValue')}>
                  {order?.shippingAddress || '—'}
                </p>
              </div>
              <div>
                <p className={cx('detailLabel')}>Phương thức thanh toán</p>
                <p className={cx('detailValue')}>
                  {order?.paymentMethod === 'COD'
                    ? 'Thanh toán khi nhận hàng (COD)'
                    : order?.paymentMethod === 'MOMO'
                    ? 'Thanh toán qua ví MoMo'
                    : order?.paymentMethod || '—'}
                </p>
              </div>
              <div>
                <p className={cx('detailLabel')}>Tổng tiền</p>
                <p className={cx('detailValue', 'detailTotal')}>
                  {formatCurrency(order?.totalAmount || 0, 'VND')}
                </p>
              </div>
              {order?.note && (
                <div className={cx('detailFull')}>
                  <p className={cx('detailLabel')}>Ghi chú</p>
                  <p className={cx('detailValue', 'detailNoteValue')}>
                    {order.note}
                  </p>
                </div>
              )}
              <div className={cx('detailFull')}>
                <p className={cx('detailLabel')}>Sản phẩm</p>
                <div className={cx('detailItems')}>
                  {(order?.items || []).map((item, idx) => (
                    <div key={idx} className={cx('detailItem')}>
                      <img
                        src={
                          item.imageUrl ||
                          item.product?.defaultMedia?.mediaUrl ||
                          item.product?.mediaUrls?.[0] ||
                          defaultProductImage
                        }
                        alt={item.name}
                        className={cx('detailItemImage')}
                      />
                      <div className={cx('detailItemInfo')}>
                        <p className={cx('detailItemName')}>
                          {item.name || item.product?.name || 'Sản phẩm'}
                        </p>
                        <p className={cx('detailItemMeta')}>
                          Số lượng: {item.quantity || 0} • Giá:{' '}
                          {item.unitPrice != null
                            ? formatCurrency(item.unitPrice, 'VND')
                            : '—'}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <p className={cx('emptyMessage')}>Không tải được chi tiết đơn hàng</p>
          )}
        </div>

        <div className={cx('orderModalFooter')}>
          {order && (() => {
            const currentOrder = order;
            const rawStatusUpper = String(currentOrder?.status || '').trim().toUpperCase();
            const canCancel = currentOrder && (
              rawStatusUpper === 'CREATED' ||
              rawStatusUpper === 'PENDING' ||
              rawStatusUpper === 'CONFIRMED'
            );
            return canCancel ? (
              <button
                type="button"
                className={cx('btn', 'btnDanger')}
                onClick={onCancel}
                disabled={cancelling}
                style={{ marginRight: '10px' }}
              >
                {cancelling ? 'Đang hủy...' : 'Hủy đơn hàng'}
              </button>
            ) : null;
          })()}
          <button
            type="button"
            className={cx('btn', 'btnPrimary')}
            onClick={onClose}
          >
            Đóng
          </button>
        </div>
      </div>
    </div>
  );
}

export default RegularOrderModal;

