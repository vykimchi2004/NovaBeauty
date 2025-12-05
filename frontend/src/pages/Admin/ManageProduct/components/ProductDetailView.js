import React from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faChevronLeft, faXmark, faCheck, faTrash } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from '../ManageProduct.module.scss';
import fallbackImage from '~/assets/images/products/image1.jpg';
import { normalizeVariantRecords } from '~/utils/colorVariants';

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
  const colorVariants = React.useMemo(
    () => normalizeVariantRecords(product?.manufacturingLocation),
    [product?.manufacturingLocation]
  );

  const handleVariantImageClick = (imageUrl) => {
    if (!imageUrl || !mediaList || !mediaList.length || !onSelectImage) return;
    const index = mediaList.findIndex((url) => url === imageUrl);
    if (index >= 0) {
      onSelectImage(index);
    }
  };

  const formatDateTime = (value) => {
    if (!value) return '-';
    return new Date(value).toLocaleString('vi-VN');
  };

  const formatPriceWithTax = (unitPrice, finalPrice) => {
    if (!unitPrice && !finalPrice) return '-';

    let displayUnitPrice = 0;
    let displayFinalPrice = 0;

    if (unitPrice && unitPrice > 0) {
      displayUnitPrice = unitPrice;
      const expectedPrice = unitPrice * 1.08;
      if (finalPrice && finalPrice > 0 && Math.abs(finalPrice - expectedPrice) < expectedPrice * 0.1) {
        displayFinalPrice = finalPrice;
      } else {
        displayFinalPrice = Math.round(expectedPrice);
      }
    } else if (finalPrice && finalPrice > 0) {
      displayUnitPrice = Math.round(finalPrice / 1.08);
      displayFinalPrice = finalPrice;
    }

    if (displayUnitPrice <= 0 && displayFinalPrice <= 0) {
      return '-';
    }

    const formattedUnit = displayUnitPrice > 0 ? formatPrice(displayUnitPrice) : '-';
    const formattedFinal = displayFinalPrice > 0 ? formatPrice(displayFinalPrice) : '-';

    return `${formattedUnit} (Hiển thị: ${formattedFinal})`;
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
    { label: 'Ngày gửi', value: formatDateTime(product.createdAt) }
  );

  if (product.approvedAt) {
    infoRows.push({ label: 'Ngày duyệt', value: formatDateTime(product.approvedAt) });
  }

  if (product.approvedByName) {
    infoRows.push({ label: 'Người duyệt', value: product.approvedByName });
  }

  if (product.quantitySold !== undefined && product.quantitySold !== null) {
    infoRows.push({ label: 'Số lượng đã bán', value: product.quantitySold });
  }


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

          {colorVariants.length > 0 && (
            <div className={cx('detailTextGroup')}>
              <span className={cx('detailInfoLabel')}>Mã màu & tồn kho</span>
              <div className={cx('variantDetailList')}>
                {colorVariants.map((variant, index) => (
                  <div
                    key={`${variant.code || variant.name || 'variant'}-${index}`}
                    className={cx('variantDetailCard')}
                  >
                    <div
                      className={cx('variantDetailImage', { clickable: !!variant.imageUrl })}
                      onClick={() => handleVariantImageClick(variant.imageUrl)}
                      role={variant.imageUrl ? 'button' : undefined}
                      tabIndex={variant.imageUrl ? 0 : undefined}
                      onKeyDown={(e) => {
                        if (!variant.imageUrl) return;
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          handleVariantImageClick(variant.imageUrl);
                        }
                      }}
                    >
                      {variant.imageUrl ? (
                        <img src={variant.imageUrl} alt={variant.name || variant.code || `Mã màu ${index + 1}`} />
                      ) : (
                        <span>Không có ảnh</span>
                      )}
                    </div>
                    <div className={cx('variantDetailInfo')}>
                      <strong>{variant.name || variant.code || `Mã màu ${index + 1}`}</strong>
                      <span>Mã: {variant.code || 'Chưa cập nhật'}</span>
                      <span>
                        Tồn kho:{' '}
                        {variant.stockQuantity !== null && variant.stockQuantity !== undefined
                          ? variant.stockQuantity
                          : 'Chưa cập nhật'}
                  </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {product.rejectionReason && (
            <div className={cx('detailTextGroup')}>
              <span className={cx('detailInfoLabel')}>Lý do từ chối</span>
              <p className={cx('detailParagraph', 'rejectionReason')}>{product.rejectionReason}</p>
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
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailView;

