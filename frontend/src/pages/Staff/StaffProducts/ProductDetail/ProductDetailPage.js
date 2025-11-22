import React, { useEffect, useMemo, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faEdit, faTimes } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from '../StaffProducts.module.scss';
import fallbackImage from '~/assets/images/products/image1.jpg';
import {
  extractReviewHighlights,
  extractTextureInfo
} from '~/utils/productPresentation';

const cx = classNames.bind(styles);

function ProductDetailPage({
  open,
  product,
  formatPrice,
  getStatusBadge,
  getNormalizedStatus,
  onClose,
  onEdit
}) {
  const detailProduct = product || {};

  const mediaList = useMemo(() => {
    const urls = [];
    const pushIfValid = (url) => {
      if (url && typeof url === 'string' && !urls.includes(url)) {
        urls.push(url);
      }
    };

    pushIfValid(detailProduct.defaultMediaUrl);
    if (Array.isArray(detailProduct.mediaUrls)) {
      detailProduct.mediaUrls.forEach(pushIfValid);
    }

    return urls;
  }, [product]);

  const [selectedImageIndex, setSelectedImageIndex] = useState(0);

  useEffect(() => {
    setSelectedImageIndex(0);
  }, [product?.id]);

  const hasMedia = mediaList.length > 0;
  const selectedImageUrl = hasMedia ? mediaList[selectedImageIndex] || mediaList[0] : null;

  // Extract từ backend fields: texture, skinType, characteristics -> reviewHighlights
  // Fallback về author/publisher nếu texture/skinType chưa có (cho dữ liệu cũ)
  const textureInfo = detailProduct.texture || detailProduct.author || extractTextureInfo(detailProduct) || 'Chưa cập nhật';
  const skinTypeInfo = detailProduct.skinType || detailProduct.publisher || 'Chưa cập nhật';
  const reviewHighlights = detailProduct.characteristics || extractReviewHighlights(detailProduct) || 'Chưa có đánh giá';
  
  // Parse colorCodes từ manufacturingLocation (lưu dạng JSON)
  const colorCodes = React.useMemo(() => {
    if (!detailProduct.manufacturingLocation) return [];
    try {
      const parsed = JSON.parse(detailProduct.manufacturingLocation);
      if (Array.isArray(parsed)) return parsed;
      return [];
    } catch (e) {
      // Nếu không phải JSON, thử parse như comma-separated
      if (detailProduct.manufacturingLocation.includes(',')) {
        return detailProduct.manufacturingLocation.split(',').map(c => c.trim()).filter(c => c);
      } else if (detailProduct.manufacturingLocation.trim()) {
        return [detailProduct.manufacturingLocation.trim()];
      }
      return [];
    }
  }, [detailProduct.manufacturingLocation]);
  
  // Debug: log để kiểm tra dữ liệu
  useEffect(() => {
    if (product) {
      console.log('Product detail data:', {
        texture: detailProduct.texture,
        author: detailProduct.author,
        skinType: detailProduct.skinType,
        publisher: detailProduct.publisher,
        textureInfo,
        skinTypeInfo,
        colorCodes
      });
    }
  }, [product, textureInfo, skinTypeInfo, colorCodes]);

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
    
    // unitPrice là giá niêm yết (chưa tính thuế)
    // finalPrice là giá đã tính thuế (price = unitPrice * 1.08 - discount)
    
    let displayUnitPrice = 0;
    let displayFinalPrice = 0;
    
    if (unitPrice && unitPrice > 0) {
      // Nếu có unitPrice, dùng nó làm giá niêm yết
      displayUnitPrice = unitPrice;
      
      // Kiểm tra xem finalPrice có hợp lý không
      // Nếu finalPrice ≈ unitPrice * 1.08 (sai số nhỏ), thì dùng finalPrice
      // Nếu không, tính từ unitPrice
      const expectedPrice = unitPrice * 1.08;
      if (finalPrice && finalPrice > 0 && Math.abs(finalPrice - expectedPrice) < expectedPrice * 0.1) {
        // finalPrice gần với giá tính từ unitPrice, dùng finalPrice
        displayFinalPrice = finalPrice;
      } else {
        // Tính từ unitPrice với tax 8%
        displayFinalPrice = Math.round(unitPrice * 1.08);
      }
    } else if (finalPrice && finalPrice > 0) {
      // Nếu không có unitPrice, tính ngược từ finalPrice
      // Giả sử finalPrice = unitPrice * 1.08 (không có discount)
      displayUnitPrice = Math.round(finalPrice / 1.08);
      displayFinalPrice = finalPrice;
    }
    
    return `${formatPrice(displayUnitPrice)} (Hiển thị: ${formatPrice(displayFinalPrice)})`;
  };

  const infoRows = [
    { label: 'Mã sản phẩm', value: detailProduct.id || '-' },
    { label: 'Tên sản phẩm', value: detailProduct.name || '-' },
    { label: 'Danh mục', value: detailProduct.categoryName || '-' },
    { label: 'Thương hiệu', value: detailProduct.brand || '-' },
    { label: 'Xuất xứ thương hiệu', value: detailProduct.brandOrigin || '-' }
  ];

  if (detailProduct.size) {
    infoRows.push({ label: 'Kích thước / Quy cách', value: detailProduct.size });
  }

  infoRows.push(
    { label: 'Giá niêm yết', value: formatPriceWithTax(detailProduct.unitPrice, detailProduct.price) },
    { label: 'Thuế', value: '8%' },
    { label: 'Trọng lượng', value: formatWeight(detailProduct.weight) },
    { label: 'Kết cấu', value: textureInfo },
    { label: 'Loại da', value: skinTypeInfo },
    { label: 'Ngày gửi', value: formatDateTime(detailProduct.createdAt) }
  );

  if (detailProduct.approvedAt) {
    infoRows.push({ label: 'Ngày duyệt', value: formatDateTime(detailProduct.approvedAt) });
  }

  if (detailProduct.approvedByName) {
    infoRows.push({ label: 'Người duyệt', value: detailProduct.approvedByName });
  }

  if (detailProduct.quantitySold !== undefined && detailProduct.quantitySold !== null) {
    infoRows.push({ label: 'Số lượng đã bán', value: detailProduct.quantitySold });
  }

  const handleEdit = () => {
    if (onEdit) onEdit(detailProduct);
  };

  const normalizedStatus = getNormalizedStatus ? getNormalizedStatus(detailProduct) : detailProduct.status;

  if (!open || !product) {
    return null;
  }

  return (
    <div className={cx('modalOverlay')} onClick={onClose}>
      <div className={cx('modalContent', 'detailModal')} onClick={(e) => e.stopPropagation()}>
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
                        <img
                          className={cx('detailMainImage')}
                          src={selectedImageUrl || fallbackImage}
                          alt={detailProduct.name}
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
                              className={cx('detailThumbButton', {
                                active: selectedImageIndex === index
                              })}
                              onClick={() => setSelectedImageIndex(index)}
                            >
                              <img
                                src={url}
                                alt={`${detailProduct.name} ${index + 1}`}
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
                    <div className={cx('noImageLarge')}>Không có ảnh</div>
                  )}
                </div>
              </div>

              <div className={cx('detailRight')}>
                <div className={cx('detailHeaderBlock')}>
                  <h3>Thông tin sản phẩm</h3>
                  <div className={cx('detailStatus')}>{getStatusBadge(detailProduct.status)}</div>
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
                  <p className={cx('detailParagraph')}>{detailProduct.description || 'Chưa có mô tả'}</p>
                </div>

                <div className={cx('detailTextGroup')}>
                  <span className={cx('detailInfoLabel')}>Thành phần</span>
                  <p className={cx('detailParagraph')}>{detailProduct.ingredients || 'Chưa cập nhật'}</p>
                </div>

                <div className={cx('detailTextGroup')}>
                  <span className={cx('detailInfoLabel')}>Công dụng</span>
                  <p className={cx('detailParagraph')}>{detailProduct.uses || 'Chưa cập nhật'}</p>
                </div>

                <div className={cx('detailTextGroup')}>
                  <span className={cx('detailInfoLabel')}>Cách dùng</span>
                  <p className={cx('detailParagraph')}>
                    {detailProduct.usageInstructions || 'Chưa cập nhật'}
                  </p>
                </div>

                <div className={cx('detailTextGroup')}>
                  <span className={cx('detailInfoLabel')}>Review (Ưu điểm)</span>
                  <p className={cx('detailParagraph')}>{reviewHighlights}</p>
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

                {detailProduct.rejectionReason && (
                  <div className={cx('detailTextGroup')}>
                    <span className={cx('detailInfoLabel')}>Lý do từ chối</span>
                    <p className={cx('detailParagraph', 'rejectionReason')}>
                      {detailProduct.rejectionReason}
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className={cx('modalFooter')}>
            <button type="button" className={cx('cancelBtn')} onClick={onClose}>
              Đóng
            </button>
            {normalizedStatus !== 'DA_DUYET' && (
              <button type="button" className={cx('editBtn')} onClick={handleEdit}>
                <FontAwesomeIcon icon={faEdit} />
                Sửa sản phẩm
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetailPage;

