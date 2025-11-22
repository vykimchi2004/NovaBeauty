import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faXmark, faCheck, faTrash } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from '../ManageProduct.module.scss';
import fallbackImage from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);

function ProductDetailView({
  product,
  mediaList,
  hasMedia,
  selectedImageIndex,
  onSelectImage,
  selectedImageUrl,
  onBack,
  onClose,
  onApprove,
  onReject,
  onDelete,
  processingApproval,
  processingRejection,
  processingDelete,
  getStatusBadge,
  getNormalizedStatus,
  formatPrice,
  formatWeight,
  formatDate,
  textureInfo,
  skinTypeInfo,
  reviewHighlights
}) {
  // Parse colorCodes từ manufacturingLocation (lưu dạng JSON)
  const colorCodes = React.useMemo(() => {
    if (!product?.manufacturingLocation) return [];
    try {
      const parsed = JSON.parse(product.manufacturingLocation);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (e) {
      // Nếu không phải JSON, thử parse như comma-separated
      if (product.manufacturingLocation.includes(',')) {
        return product.manufacturingLocation.split(',').map(c => c.trim()).filter(c => c);
      } else if (product.manufacturingLocation.trim()) {
        return [product.manufacturingLocation.trim()];
      }
      return [];
    }
  }, [product?.manufacturingLocation]);
  const formatPriceWithTax = (price) => {
    if (!price) return '-';
    const unitPrice = price * 1.08; // Giá hiển thị = giá niêm yết × 1.08
    return `${formatPrice(price)} (Hiển thị: ${formatPrice(unitPrice)})`;
  };

  const infoRows = [
    { label: 'Mã sản phẩm', value: product.id || '-' },
    { label: 'Tên sản phẩm', value: product.name || '-' },
    { label: 'Danh mục', value: product.categoryName || '-' },
    { label: 'Thương hiệu', value: product.brand || '-' },
    { label: 'Xuất xứ thương hiệu', value: product.brandOrigin || '-' }
  ];

  if (product.size) {
    infoRows.push({ label: 'Kích thước / Quy cách', value: product.size });
  }

  infoRows.push(
    { label: 'Giá niêm yết', value: formatPriceWithTax(product.unitPrice, product.price) },
    { label: 'Thuế', value: '8%' },
    { label: 'Trọng lượng', value: formatWeight(product.weight) },
    { label: 'Kết cấu', value: textureInfo || 'Chưa cập nhật' },
    { label: 'Loại da', value: skinTypeInfo || 'Chưa cập nhật' },
    { label: 'Ngày gửi', value: formatDate(product.createdAt) }
  );


  return (
    <div className={cx('detailPage')}>
      <button type="button" className={cx('detailBackBtn')} onClick={onBack}>
        <FontAwesomeIcon icon={faChevronLeft} />
        <span>Quay lại danh sách</span>
      </button>

      <div className={cx('detailCard')}>
        <div className={cx('detailLeft')}>
          <div className={cx('detailImage')}>
            {hasMedia ? (
              <>
                <div className={cx('detailMainImageWrapper')}>
                  <img
                    className={cx('detailMainImage')}
                    src={selectedImageUrl || fallbackImage}
                    alt={product.name}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = fallbackImage;
                    }}
                  />
                </div>
                {mediaList.length > 1 && (
                  <div className={cx('detailThumbList')}>
                    {mediaList.map((url, index) => (
                      <button
                        type="button"
                        key={`${url}-${index}`}
                        className={cx('detailThumbButton', { active: selectedImageIndex === index })}
                        onClick={() => onSelectImage(index)}
                      >
                        <img
                          src={url}
                          alt={`${product.name} ${index + 1}`}
                          onError={(e) => {
                            e.target.style.display = 'none';
                          }}
                        />
                      </button>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <div className={cx('mediaPlaceholder')}>Không có ảnh</div>
            )}
          </div>
        </div>

        <div className={cx('detailRight')}>
          <div className={cx('detailHeaderBlock')}>
            <h3>Chi tiết sản phẩm</h3>
            <div className={cx('detailStatus')}>{getStatusBadge(product.status)}</div>
          </div>

          <div className={cx('detailInfoList')}>
            {infoRows.map((item) => (
              <div className={cx('detailInfoRow')} key={item.label}>
                <span className={cx('detailInfoLabel')}>{item.label}</span>
                <span className={cx('detailInfoValue')}>{item.value}</span>
              </div>
            ))}
          </div>


          <div className={cx('detailTextGroup')}>
            <span className={cx('detailInfoLabel')}>Mô tả</span>
            <p className={cx('detailParagraph')}>{product.description || 'Chưa có mô tả'}</p>
          </div>

          <div className={cx('detailTextGroup')}>
            <span className={cx('detailInfoLabel')}>Thành phần</span>
            <p className={cx('detailParagraph')}>{product.ingredients || 'Chưa cập nhật'}</p>
          </div>

          <div className={cx('detailTextGroup')}>
            <span className={cx('detailInfoLabel')}>Công dụng</span>
            <p className={cx('detailParagraph')}>{product.uses || 'Chưa cập nhật'}</p>
          </div>

          <div className={cx('detailTextGroup')}>
            <span className={cx('detailInfoLabel')}>Hướng dẫn sử dụng</span>
            <p className={cx('detailParagraph')}>{product.usageInstructions || 'Chưa cập nhật'}</p>
          </div>

          <div className={cx('detailTextGroup')}>
            <span className={cx('detailInfoLabel')}>Review (Ưu điểm)</span>
            <p className={cx('detailParagraph')}>{reviewHighlights || 'Chưa có đánh giá'}</p>
          </div>

          {colorCodes.length > 0 && (
            <div className={cx('detailTextGroup')}>
              <span className={cx('detailInfoLabel')}>Mã màu</span>
              <div className={cx('colorCodesList')}>
                {colorCodes.map((colorCode, index) => (
                  <span key={index} className={cx('colorCodeButton', 'readOnly')}>
                    {colorCode}
                  </span>
                ))}
              </div>
            </div>
          )}

          <div className={cx('detailActions')}>
            <button
              type="button"
              className={cx('cancelBtn')}
              onClick={onClose}
              disabled={processingApproval || processingRejection || processingDelete}
            >
              Đóng
            </button>

            {(!getNormalizedStatus || getNormalizedStatus(product) === 'CHO_DUYET') && (
              <>
                <button
                  type="button"
                  className={cx('approveBtn')}
                  onClick={onApprove}
                  disabled={processingApproval || processingRejection || processingDelete}
                >
                  <FontAwesomeIcon icon={faCheck} />
                  Duyệt
                </button>
                <button
                  type="button"
                  className={cx('rejectBtn')}
                  onClick={onReject}
                  disabled={processingApproval || processingRejection || processingDelete}
                >
                  <FontAwesomeIcon icon={faXmark} />
                  Không duyệt
                </button>
              </>
            )}

            <button
              type="button"
              className={cx('deleteBtn')}
              onClick={onDelete}
              disabled={processingApproval || processingRejection || processingDelete}
            >
              <FontAwesomeIcon icon={faTrash} />
              Xóa sản phẩm
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailView;

