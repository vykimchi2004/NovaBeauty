import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTimes } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from '../../StaffProducts.module.scss';
import fallbackImage from '~/assets/images/products/image1.jpg';
import { extractReviewHighlights, extractTextureInfo } from '~/utils/productPresentation';
import { normalizeVariantRecords } from '~/utils/colorVariants';

const cx = classNames.bind(styles);

function ProductDetailPage({
  open,
  product,
  formatPrice,
  getStatusBadge,
  getNormalizedStatus,
  onClose,
  onEdit,
}) {
  const detailProduct = product || {};

  const isVideoUrl = (url = '') => {
    const normalized = url?.split('?')[0]?.toLowerCase() || '';
    const videoExtensions = ['.mp4', '.mov', '.webm', '.avi', '.mkv', '.ogg'];
    return videoExtensions.some((ext) => normalized.endsWith(ext));
  };

  const mediaList = useMemo(() => {
    const items = [];
    const pushIfValid = (url) => {
      if (url && typeof url === 'string' && !items.some((item) => item.url === url)) {
        items.push({
          url,
          type: isVideoUrl(url) ? 'VIDEO' : 'IMAGE',
        });
      }
    };

    pushIfValid(detailProduct.defaultMediaUrl);
    if (Array.isArray(detailProduct.mediaUrls)) {
      detailProduct.mediaUrls.forEach(pushIfValid);
    }

    return items;
  }, [product]);

  const [selectedMediaIndex, setSelectedMediaIndex] = useState(0);

  useEffect(() => {
    setSelectedMediaIndex(0);
  }, [product?.id]);

  const hasMedia = mediaList.length > 0;
  const selectedMedia = hasMedia ? mediaList[selectedMediaIndex] || mediaList[0] : null;

  const textureInfo =
    detailProduct.texture ||
    detailProduct.author ||
    extractTextureInfo(detailProduct) ||
    'Chưa cập nhật';
  const skinTypeInfo =
    detailProduct.skinType || detailProduct.publisher || 'Chưa cập nhật';
  const reviewHighlights =
    detailProduct.characteristics ||
    extractReviewHighlights(detailProduct) ||
    'Chưa có đánh giá';

  const colorVariants = React.useMemo(
    () => normalizeVariantRecords(detailProduct.manufacturingLocation),
    [detailProduct.manufacturingLocation],
  );

  useEffect(() => {
    if (product) {
      console.log('Product detail data:', {
        texture: detailProduct.texture,
        author: detailProduct.author,
        skinType: detailProduct.skinType,
        publisher: detailProduct.publisher,
        textureInfo,
        skinTypeInfo,
        colorVariants,
      });
    }
  }, [product, textureInfo, skinTypeInfo, colorVariants]);

  const formatWeight = (weight) => {
    if (weight === null || weight === undefined || weight === '') return '-';
    return `${weight} g`;
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
      if (
        finalPrice &&
        finalPrice > 0 &&
        Math.abs(finalPrice - expectedPrice) < expectedPrice * 0.1
      ) {
        displayFinalPrice = finalPrice;
      } else {
        displayFinalPrice = Math.round(unitPrice * 1.08);
      }
    } else if (finalPrice && finalPrice > 0) {
      displayUnitPrice = Math.round(finalPrice / 1.08);
      displayFinalPrice = finalPrice;
    }

    return `${formatPrice(displayUnitPrice)} (Hiển thị: ${formatPrice(
      displayFinalPrice,
    )})`;
  };

  const infoRows = [
    { label: 'Mã sản phẩm', value: detailProduct.id || '-' },
    { label: 'Tên sản phẩm', value: detailProduct.name || '-' },
    { label: 'Danh mục', value: detailProduct.categoryName || '-' },
    { label: 'Thương hiệu', value: detailProduct.brand || '-' },
    { label: 'Xuất xứ thương hiệu', value: detailProduct.brandOrigin || '-' },
  ];

  if (detailProduct.size) {
    infoRows.push({ label: 'Kích thước / Quy cách', value: detailProduct.size });
  }

  infoRows.push(
    {
      label: 'Giá niêm yết',
      value: formatPriceWithTax(detailProduct.unitPrice, detailProduct.price),
    },
    {
      label: 'Giá nhập',
      value: detailProduct.purchasePrice ? formatPrice(detailProduct.purchasePrice) : '-',
    },
    { label: 'Thuế', value: '8%' },
    { label: 'Trọng lượng', value: formatWeight(detailProduct.weight) },
    { label: 'Kết cấu', value: textureInfo },
    { label: 'Loại da', value: skinTypeInfo },
    { label: 'Ngày gửi', value: formatDateTime(detailProduct.createdAt) },
  );

  if (detailProduct.approvedAt) {
    infoRows.push({ label: 'Ngày duyệt', value: formatDateTime(detailProduct.approvedAt) });
  }

  if (detailProduct.approvedByName) {
    infoRows.push({ label: 'Người duyệt', value: detailProduct.approvedByName });
  }

  // Hiển thị tồn kho (chỉ khi không có color variants)
  if (!colorVariants || colorVariants.length === 0) {
    if (detailProduct.stockQuantity !== undefined && detailProduct.stockQuantity !== null) {
      infoRows.push({ 
        label: 'Hàng tồn kho', 
        value: detailProduct.stockQuantity.toLocaleString('vi-VN') 
      });
    }
  }

  if (detailProduct.quantitySold !== undefined && detailProduct.quantitySold !== null) {
    infoRows.push({ label: 'Số lượng đã bán', value: detailProduct.quantitySold });
  }

  const handleEdit = () => {
    if (onEdit) onEdit(detailProduct);
  };

  const normalizedStatus = getNormalizedStatus
    ? getNormalizedStatus(detailProduct)
    : detailProduct.status;

  if (!open || !product) {
    return null;
  }

  return (
    <div className={cx('modalOverlay')} onClick={onClose}>
      <div
        className={cx('modalContent', 'detailModal')}
        onClick={(e) => e.stopPropagation()}
      >
        <div className={cx('modalHeader')}>
          <h3>Chi tiết sản phẩm</h3>
          <button className={cx('closeBtn')} onClick={onClose}>
            <FontAwesomeIcon icon={faTimes} />
          </button>
        </div>
        <div className={cx('modalBody')}>
          <div className={cx('detailPage')}>
            <div className={cx('detailCard')}>
              <div className={cx('detailLeft')}>
                <div className={cx('detailImage')}>
                  {hasMedia ? (
                    <>
                      <div className={cx('detailMainImageWrapper')}>
                        {selectedMedia?.type === 'VIDEO' ? (
                          <video
                            className={cx('detailMainVideo')}
                            src={selectedMedia?.url}
                            controls
                          >
                            Trình duyệt không hỗ trợ video.
                          </video>
                        ) : (
                          <img
                            className={cx('detailMainImage')}
                            src={selectedMedia?.url || fallbackImage}
                            alt={detailProduct.name}
                            onError={(e) => {
                              e.target.onerror = null;
                              e.target.src = fallbackImage;
                            }}
                          />
                        )}
                      </div>
                      {mediaList.length > 1 && (
                        <div className={cx('detailThumbList')}>
                          {mediaList.map((media, index) => (
                            <button
                              type="button"
                              key={`${media.url}-${index}`}
                              className={cx('detailThumbButton', {
                                active: selectedMediaIndex === index,
                              })}
                              onClick={() => setSelectedMediaIndex(index)}
                            >
                              {media.type === 'VIDEO' ? (
                                <div className={cx('videoThumbPlaceholder')}>Video</div>
                              ) : (
                                <img
                                  src={media.url}
                                  alt={`${detailProduct.name} ${index + 1}`}
                                  onError={(e) => {
                                    e.target.style.display = 'none';
                                  }}
                                />
                              )}
                            </button>
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <div className={cx('noImageLarge')}>Không có media</div>
                  )}
                </div>
              </div>

              <div className={cx('detailRight')}>
                <div className={cx('detailHeaderBlock')}>
                  <h3>Thông tin sản phẩm</h3>
                  <div className={cx('detailStatus')}>
                    {getStatusBadge ? getStatusBadge(detailProduct.status) : normalizedStatus}
                  </div>
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
                  <span className={cx('detailInfoLabel')}>Mô tả sản phẩm</span>
                  <p className={cx('detailInfoValue')}>
                    {detailProduct.description || 'Chưa có mô tả chi tiết.'}
                  </p>
                </div>

                <div className={cx('detailTextGroup')}>
                  <span className={cx('detailInfoLabel')}>Thành phần</span>
                  <p className={cx('detailInfoValue')}>
                    {detailProduct.ingredients || 'Chưa cập nhật thành phần.'}
                  </p>
                </div>

                <div className={cx('detailTextGroup')}>
                  <span className={cx('detailInfoLabel')}>Công dụng</span>
                  <p className={cx('detailInfoValue')}>
                    {detailProduct.uses || 'Chưa cập nhật công dụng.'}
                  </p>
                </div>

                <div className={cx('detailTextGroup')}>
                  <span className={cx('detailInfoLabel')}>Hướng dẫn sử dụng</span>
                  <p className={cx('detailInfoValue')}>
                    {detailProduct.usageInstructions || 'Chưa cập nhật hướng dẫn sử dụng.'}
                  </p>
                </div>

                {reviewHighlights && (
                  <div className={cx('detailTextGroup')}>
                    <span className={cx('detailInfoLabel')}>Điểm nổi bật</span>
                    <p className={cx('detailInfoValue')}>{reviewHighlights}</p>
                  </div>
                )}

                {colorVariants && colorVariants.length > 0 && (
                  <div className={cx('detailTextGroup')}>
                    <span className={cx('detailInfoLabel')}>Mã màu</span>
                    <div className={cx('variantDetailList')}>
                      {colorVariants.map((variant) => (
                        <div
                          key={variant.code || variant.name}
                          className={cx('variantDetailCard')}
                        >
                          <div className={cx('variantDetailImageWrapper')}>
                            {variant.imageUrl ? (
                              <img
                                src={variant.imageUrl}
                                alt={variant.name || variant.code}
                                className={cx('variantDetailImage', 'clickable')}
                                onClick={() => {
                                  const index = mediaList.findIndex(
                                    (m) => m.url === variant.imageUrl,
                                  );
                                  if (index >= 0) {
                                    setSelectedMediaIndex(index);
                                  } else {
                                    const newIndex = mediaList.length;
                                    mediaList.push({
                                      url: variant.imageUrl,
                                      type: isVideoUrl(variant.imageUrl) ? 'VIDEO' : 'IMAGE',
                                    });
                                    setSelectedMediaIndex(newIndex);
                                  }
                                }}
                              />
                            ) : (
                              <div className={cx('noImageSmall')}>Không có ảnh</div>
                            )}
                          </div>
                          <div className={cx('variantDetailInfo')}>
                            <div className={cx('variantDetailName')}>
                              {variant.name || variant.code || 'Mã màu'}
                            </div>
                            <div className={cx('variantDetailCode')}>
                              Mã: {variant.code || 'Không có'}
                            </div>
                            <div className={cx('variantDetailStock')}>
                              Tồn kho: {variant.stockQuantity ?? 'Chưa cập nhật'}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {detailProduct.rejectionReason && (
                  <div className={cx('detailTextGroup', 'rejectionReason')}>
                    <span className={cx('detailInfoLabel')}>Lý do từ chối</span>
                    <p className={cx('detailInfoValue')}>{detailProduct.rejectionReason}</p>
                  </div>
                )}

                <div className={cx('detailActions')}>
                  <button className={cx('primaryBtn')} onClick={handleEdit}>
                    <FontAwesomeIcon icon={faEdit} />
                    Sửa sản phẩm
                  </button>
                  <button className={cx('secondaryBtn')} onClick={onClose}>
                    Đóng
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;


