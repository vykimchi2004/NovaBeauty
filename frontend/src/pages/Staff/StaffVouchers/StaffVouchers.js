import React from 'react';
import classNames from 'classnames/bind';
import styles from './StaffVouchers.module.scss';
import { useNavigate } from 'react-router-dom';
import {  faArrowLeft} from '@fortawesome/free-solid-svg-icons';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import VoucherFormModal from './components/Voucher/VoucherFormModal';
import PromotionFormModal from './components/Promotion/PromotionFormModal';
import DetailModal from './components/DetailModal/DetailModal';
import { useStaffVouchersState } from './hooks/useStaffVouchers';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';

const cx = classNames.bind(styles);

function StaffVouchers() {
  const navigate = useNavigate();
  
  // Get current user to check role
  const currentUser = storage.get(STORAGE_KEYS.USER);
  const userRole = currentUser?.role?.name?.toUpperCase() || '';
  const isAdmin = userRole === 'ADMIN';
  
  const {
    searchTerm,
    selectedDate,
    statusFilter,
    setSearchTerm,
    setSelectedDate,
    setStatusFilter,
    clearFilters,
    combinedEntries,
    voucherLoading,
    promotionLoading,
    renderStatusBadge,
    detailItem,
    setDetailItem,
    handleDelete,
    // voucher modal
    showVoucherModal,
    voucherForm,
    voucherErrors,
    voucherImagePreview,
    uploadingVoucherImage,
    openAddVoucher,
    openEditVoucher,
    closeVoucherModal,
    handleVoucherFormChange,
    handleVoucherImageChange,
    handleVoucherScopeChange,
    toggleVoucherCategory,
    toggleVoucherProduct,
    submitVoucher,
    // promotion modal
    showPromotionModal,
    promotionForm,
    promotionErrors,
    promotionImagePreview,
    uploadingPromotionImage,
    openAddPromotion,
    openEditPromotion,
    closePromotionModal,
    handlePromotionFormChange,
    handlePromotionScopeChange,
    togglePromotionCategory,
    togglePromotionProduct,
    handlePromotionImageChange,
    submitPromotion,
    categories,
    products,
  } = useStaffVouchersState();

  return (
    <div className={cx('wrapper')}>
      <div className={cx('pageHeader')}>
        <h1 className={cx('pageTitle')}>Voucher & Khuyến mãi</h1>
        <button 
          type="button" 
          className={cx('dashboardBtn')} 
          onClick={() => navigate('/staff')}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Dashboard
        </button>
        
      </div>

      <section className={cx('filterBar')}>
        <div className={cx('filterRow')}>
          <input
            type="text"
            className={cx('searchInput')}
            placeholder="Tìm kiếm theo tên, mã..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
          <input
            type="date"
            className={cx('dateInput')}
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
          />
          <select
            className={cx('selectInput')}
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="PENDING_APPROVAL">Chờ duyệt</option>
            <option value="APPROVED">Đã duyệt</option>
            <option value="REJECTED">Không duyệt</option>
            <option value="EXPIRED">Hết hạn</option>
          </select>
        </div>
        <div className={cx('filterActions')}>
          <button type="button" className={cx('primaryBtn')} onClick={openAddVoucher}>
            Thêm voucher
          </button>
          <button type="button" className={cx('secondaryBtn')} onClick={openAddPromotion}>
            Thêm khuyến mãi
          </button>
        </div>
      </section>

      <div className={cx('tableCard')}>
        <div className={cx('tableHeader')}>
          <h3 className={cx('tableTitle')}>Danh sách Voucher / Khuyến mãi</h3>
        </div>
        <div className={cx('tableWrap')}>
          <table className={cx('table')}>
            <thead>
              <tr>
                <th>Mã</th>
                <th>Tên</th>
                <th>Loại</th>
                <th>Giảm giá</th>
                <th>Ngày bắt đầu</th>
                <th>Ngày kết thúc</th>
                <th>Trạng thái</th>
                <th>Hành động</th>
              </tr>
            </thead>
            <tbody>
              {voucherLoading || promotionLoading ? (
                <tr>
                  <td colSpan={8} className={cx('emptyState')}>
                    Đang tải dữ liệu...
                  </td>
                </tr>
              ) : combinedEntries.length === 0 ? (
                <tr>
                  <td colSpan={8} className={cx('emptyState')}>
                    Không có dữ liệu phù hợp
                  </td>
                </tr>
              ) : (
                combinedEntries.map((item) => {
                  const isVoucher = item.__type === 'voucher' || item.applyScope === 'ORDER';
                  return (
                    <tr key={item.id}>
                      <td className={cx('codeCell')}>{item.code}</td>
                      <td>
                        <div>{item.name}</div>
                        <p className={cx('desc')}>{item.description || '-'}</p>
                      </td>
                      <td>
                        {isVoucher
                          ? 'Voucher'
                          : item.applyScope === 'PRODUCT'
                          ? 'Khuyến mãi sản phẩm'
                          : 'Khuyến mãi danh mục'}
                      </td>
                      <td>
                        {item.discountValue}
                        {item.discountValueType === 'AMOUNT' ? ' ₫' : '%'}
                      </td>
                      <td>{item.startDate ? new Date(item.startDate).toLocaleDateString('vi-VN') : '-'}</td>
                      <td>{item.expiryDate ? new Date(item.expiryDate).toLocaleDateString('vi-VN') : '-'}</td>
                      <td>
                        {(() => {
                          const info = renderStatusBadge(item.status);
                          return (
                            <span className={cx('statusBadge', info.className)}>
                              {info.label}
                            </span>
                          );
                        })()}
                      </td>
                      <td>
                        <div className={cx('actions')}>
                          <button
                            type="button"
                            className={cx('actionBtn', 'primary')}
                            onClick={() => setDetailItem(item)}
                          >
                            Chi tiết
                          </button>
                          <button
                            type="button"
                            className={cx('actionBtn', 'neutral')}
                            onClick={() => (isVoucher ? openEditVoucher(item) : openEditPromotion(item))}
                            disabled={item.status === 'APPROVED'}
                            title={item.status === 'APPROVED' ? 'Không thể sửa voucher/khuyến mãi đã được duyệt' : ''}
                          >
                            Sửa
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              className={cx('actionBtn', 'danger')}
                              onClick={() => handleDelete(item, isVoucher)}
                            >
                              Xóa
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <VoucherFormModal
        open={showVoucherModal}
        mode={voucherForm.id ? 'edit' : 'add'}
        formData={voucherForm}
        formErrors={voucherErrors}
        categories={categories}
        products={products}
        previewUrl={voucherImagePreview}
        uploadingImage={uploadingVoucherImage}
        onClose={closeVoucherModal}
        onChange={handleVoucherFormChange}
        onSubmit={submitVoucher}
        onScopeChange={handleVoucherScopeChange}
        onToggleCategory={toggleVoucherCategory}
        onToggleProduct={toggleVoucherProduct}
        onFileChange={handleVoucherImageChange}
      />

      <PromotionFormModal
        open={showPromotionModal}
        mode={promotionForm.id ? 'edit' : 'add'}
        formData={promotionForm}
        formErrors={promotionErrors}
        categories={categories}
        products={products}
        previewUrl={promotionImagePreview}
        uploadingImage={uploadingPromotionImage}
        onClose={closePromotionModal}
        onChange={handlePromotionFormChange}
        onSubmit={submitPromotion}
        onScopeChange={handlePromotionScopeChange}
        onToggleCategory={togglePromotionCategory}
        onToggleProduct={togglePromotionProduct}
        onFileChange={handlePromotionImageChange}
      />

      <DetailModal
        item={detailItem}
        onClose={() => setDetailItem(null)}
        formatScope={(scope) => (scope === 'PRODUCT' ? 'Khuyến mãi sản phẩm' : 'Khuyến mãi danh mục')}
      />
    </div>
  );
}

export default StaffVouchers;
 
