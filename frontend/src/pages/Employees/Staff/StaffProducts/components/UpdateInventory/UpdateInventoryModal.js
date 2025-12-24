import React, { useState, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from './UpdateInventoryModal.module.scss';
import { updateProduct } from '~/services/product';
import { normalizeVariantRecords, serializeVariantPayload } from '~/utils/productVariants';
import notify from '~/utils/notification';

const cx = classNames.bind(styles);

function UpdateInventoryModal({ open, product, onClose, onSuccess }) {
  const [variantStockUpdates, setVariantStockUpdates] = useState({});
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && product) {
      // Initialize variant stock updates
      if (product.manufacturingLocation) {
        const variants = normalizeVariantRecords(product.manufacturingLocation);
        const updates = {};
        variants.forEach((v, idx) => {
          updates[idx] = '';
        });
        setVariantStockUpdates(updates);
      } else {
        setVariantStockUpdates({ 0: '' });
      }
    }
  }, [open, product]);

  const calculateTotalStock = (prod) => {
    if (prod.manufacturingLocation) {
      const variants = normalizeVariantRecords(prod.manufacturingLocation);
      if (variants.length > 0) {
        return variants.reduce((sum, variant) => {
          const stock = variant.stockQuantity;
          return sum + (stock !== null && stock !== undefined ? Number(stock) : 0);
        }, 0);
      }
    }
    return prod.stockQuantity !== null && prod.stockQuantity !== undefined 
      ? Number(prod.stockQuantity) 
      : 0;
  };

  const handleSubmit = async () => {
    if (!product) return;

    const MIN_STOCK = 50; // Tồn kho tối thiểu

    // Check if at least one variant has a value
    const hasAnyUpdate = Object.values(variantStockUpdates).some((v) => v && v !== '' && parseInt(v, 10) !== 0);
    if (!hasAnyUpdate) {
      notify.warning('Vui lòng nhập số lượng cần thêm hoặc bớt cho ít nhất một mã màu');
      return;
    }

    try {
      setLoading(true);

      // Nếu sản phẩm có mã màu, cập nhật riêng từng mã màu
      if (product.manufacturingLocation) {
        const variants = normalizeVariantRecords(product.manufacturingLocation);
        if (variants.length > 0) {
          const updatedVariants = variants.map((v, idx) => {
            const changeQty = variantStockUpdates[idx] ? parseInt(variantStockUpdates[idx], 10) : 0;
            
            // Skip if NaN or 0
            if (Number.isNaN(changeQty) || changeQty === 0) {
              return v;
            }

            const currentStock = v.stockQuantity || 0;
            const newStock = currentStock + changeQty;

            // Kiểm tra giảm xuống dưới 50
            if (newStock < MIN_STOCK) {
              const variantName = v.name || v.code || 'Mã màu';
              throw new Error(`Không thể giảm tồn kho của ${variantName} xuống dưới ${MIN_STOCK} sản phẩm (hiện tại: ${currentStock}, thay đổi: ${changeQty})`);
            }

            return {
              ...v,
              stockQuantity: newStock,
            };
          });
          
          const updatedManufacturingLocation = serializeVariantPayload(updatedVariants, 'Mã màu');
          const updatePayload = {
            ...product,
            manufacturingLocation: updatedManufacturingLocation,
          };
          await updateProduct(product.id, updatePayload);
          notify.success('Cập nhật tồn kho thành công');
        }
      } else {
        // Sản phẩm không có mã màu, cập nhật trực tiếp
        const changeQty = variantStockUpdates[0] ? parseInt(variantStockUpdates[0], 10) : 0;
        if (!Number.isNaN(changeQty) && changeQty !== 0) {
          const currentStock = product.stockQuantity || 0;
          const newStock = currentStock + changeQty;
          
          // Kiểm tra giảm xuống dưới 50
          if (newStock < MIN_STOCK) {
            throw new Error(`Không thể giảm tồn kho xuống dưới ${MIN_STOCK} sản phẩm (hiện tại: ${currentStock}, thay đổi: ${changeQty})`);
          }

          const updatePayload = {
            ...product,
            stockQuantity: newStock,
          };
          await updateProduct(product.id, updatePayload);
          
          const changeText = changeQty > 0 ? `+${changeQty}` : `${changeQty}`;
          notify.success(`Cập nhật tồn kho thành công (${changeText} sản phẩm)`);
        }
      }

      onClose();
      if (onSuccess) {
        onSuccess();
      }
    } catch (err) {
      console.error('[UpdateInventoryModal] updateStock error:', err);
      notify.error(err?.message || 'Không thể cập nhật tồn kho. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const handleClose = () => {
    setVariantStockUpdates({});
    onClose();
  };

  if (!open || !product) {
    return null;
  }

  const totalStock = calculateTotalStock(product);

  return (
    <div
      className={cx('modalOverlay')}
      onClick={handleClose}
      role="presentation"
    >
      <div
        className={cx('modalContent')}
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-labelledby="stockUpdateModalTitle"
      >
        <div className={cx('modalHeader')}>
          <h3 id="stockUpdateModalTitle" className={cx('modalTitle')}>
            Cập nhật tồn kho
          </h3>
          <button
            type="button"
            className={cx('modalCloseBtn')}
            onClick={handleClose}
            aria-label="Đóng modal"
            disabled={loading}
          >
            ✕
          </button>
        </div>
        <div className={cx('modalBody')}>
          <div className={cx('formGroup')}>
            <label className={cx('label')}>Sản phẩm</label>
            <div className={cx('productInfo')}>
              <strong className={cx('productName')}>{product.name}</strong>
              <div className={cx('productCode')}>
                Mã: {product.id}
              </div>
              <div className={cx('currentStock')}>
                Tồn kho hiện tại: <strong>{totalStock.toLocaleString('vi-VN')}</strong>
              </div>
            </div>
          </div>

          {/* Hiển thị input cho từng mã màu hoặc sản phẩm */}
          {product.manufacturingLocation ? (
            (() => {
              const variants = normalizeVariantRecords(product.manufacturingLocation);
              return variants.length > 0 ? (
                <div className={cx('variantStockContainer')}>
                  <label className={cx('label')}>
                    Cập nhật tồn kho theo mã màu <span className={cx('required')}>*</span>
                  </label>
                  {variants.map((variant, idx) => {
                    const variantName = variant.name || variant.code || `Mã màu ${idx + 1}`;
                    const variantCode = variant.code || '';
                    const displayName = variantCode ? `${variantName} (${variantCode})` : variantName;
                    const currentStock = variant.stockQuantity || 0;
                    const addQty = variantStockUpdates[idx] ? parseInt(variantStockUpdates[idx], 10) : 0;
                    const newStock = currentStock + (Number.isNaN(addQty) ? 0 : addQty);
                    
                    return (
                      <div key={idx} className={cx('variantStockGroup')}>
                        <div className={cx('variantStockHeader')}>
                          <strong className={cx('variantName')}>{displayName}</strong>
                          <span className={cx('variantCurrentStock')}>
                            Hiện tại: {currentStock.toLocaleString('vi-VN')}
                          </span>
                        </div>
                        <input
                          type="number"
                          value={variantStockUpdates[idx] || ''}
                          onChange={(e) => setVariantStockUpdates({ ...variantStockUpdates, [idx]: e.target.value })}
                          placeholder="Nhập số lượng (+ thêm, - bớt)"
                          className={cx('input')}
                          disabled={loading}
                        />
                        {(variantStockUpdates[idx] && variantStockUpdates[idx] !== '') && (
                          <div className={cx('newStockPreview')}>
                            Sau cập nhật: <strong>{newStock.toLocaleString('vi-VN')}</strong>
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : null;
            })()
          ) : (
            <div className={cx('formGroup')}>
              <label htmlFor="stockAddValue" className={cx('label')}>
                Số lượng thay đổi <span className={cx('required')}>*</span>
              </label>
              <input
                id="stockAddValue"
                type="number"
                value={variantStockUpdates[0] || ''}
                onChange={(e) => setVariantStockUpdates({ 0: e.target.value })}
                placeholder="Nhập số lượng (+ thêm, - bớt)"
                className={cx('input')}
                disabled={loading}
              />
              {(variantStockUpdates[0] && variantStockUpdates[0] !== '') && (
                <div className={cx('newStockPreview')}>
                  Tồn kho sau cập nhật: <strong>{(totalStock + (parseInt(variantStockUpdates[0], 10) || 0)).toLocaleString('vi-VN')}</strong>
                </div>
              )}
            </div>
          )}
        </div>
        <div className={cx('modalFooter')}>
          <button
            type="button"
            className={cx('btn', 'btnCancel')}
            onClick={handleClose}
            disabled={loading}
          >
            Hủy
          </button>
          <button
            type="button"
            className={cx('btn', 'btnSubmit')}
            onClick={handleSubmit}
            disabled={loading}
          >
            {loading ? 'Đang cập nhật...' : 'Cập nhật'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default UpdateInventoryModal;

