import React from 'react';
import classNames from 'classnames/bind';
import styles from './StaffBanners.module.scss';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faArrowLeft, faPlus, faEdit, faTrash, faEye } from '@fortawesome/free-solid-svg-icons';
import BannerFormModal from './components/BannerFormModal';
import { useStaffBannersState } from './hooks/useStaffBanners';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';

const cx = classNames.bind(styles);

function StaffBanners() {
  const navigate = useNavigate();
  
  // Get current user to check role
  const currentUser = storage.get(STORAGE_KEYS.USER);
  const userRole = currentUser?.role?.name?.toUpperCase() || '';
  const isAdmin = userRole === 'ADMIN';
  
  // Check if banner is approved
  const isBannerApproved = (banner) => {
    return banner.status === true && banner.pendingReview === false;
  };
  
  const {
    searchTerm,
    selectedDate,
    statusFilter,
    setSearchTerm,
    setSelectedDate,
    setStatusFilter,
    clearFilters,
    filteredBanners,
    bannerLoading,
    renderStatusBadge,
    detailItem,
    setDetailItem,
    handleDelete,
    // banner modal
    showBannerModal,
    bannerForm,
    bannerErrors,
    bannerImagePreview,
    uploadingBannerImage,
    openAddBanner,
    openEditBanner,
    closeBannerModal,
    handleBannerFormChange,
    handleTargetTypeChange,
    handleBannerImageChange,
    submitBanner,
    handleBannerCategorySelect,
    handleBannerBrandSelect,
    categories,
    brandOptions,
    loadingCategories,
  } = useStaffBannersState();

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  return (
    <div className={cx('wrapper')}>
      <div className={cx('pageHeader')}>
        <h1 className={cx('pageTitle')}>Quản lý nội dung (Banners)</h1>
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
            placeholder="Tìm kiếm theo tiêu đề, mô tả..."
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
          </select>
          <button type="button" className={cx('addBtn')} onClick={openAddBanner}>
            <FontAwesomeIcon icon={faPlus} />
            Thêm banner
          </button>
        </div>
      </section>

      <div className={cx('tableWrapper')}>
        {bannerLoading ? (
          <div className={cx('loading')}>Đang tải dữ liệu...</div>
        ) : (
          <table className={cx('table')}>
            <thead>
              <tr>
                <th>Ảnh</th>
                <th>Tiêu đề</th>
                <th>Mô tả</th>
                <th>Ngày tạo</th>
                <th>Ngày bắt đầu</th>
                <th>Ngày kết thúc</th>
                <th>Trạng thái</th>
                <th>Sản phẩm</th>
                <th>Thao tác</th>
              </tr>
            </thead>
            <tbody>
              {filteredBanners.length === 0 ? (
                <tr>
                  <td colSpan="9" className={cx('empty')}>
                    Không có banner nào
                  </td>
                </tr>
              ) : (
                filteredBanners.map((banner) => {
                  const statusInfo = renderStatusBadge(banner);
                  return (
                    <tr key={banner.id}>
                      <td>
                        {banner.imageUrl ? (
                          <img src={banner.imageUrl} alt={banner.title} className={cx('thumbnail')} />
                        ) : (
                          <span className={cx('noImage')}>-</span>
                        )}
                      </td>
                      <td className={cx('titleCell')}>{banner.title}</td>
                      <td className={cx('descriptionCell')}>
                        {banner.description ? (
                          <span title={banner.description}>
                            {banner.description.length > 50
                              ? `${banner.description.substring(0, 50)}...`
                              : banner.description}
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>{formatDate(banner.createdAt)}</td>
                      <td>{formatDate(banner.startDate)}</td>
                      <td>{formatDate(banner.endDate)}</td>
                      <td>
                        <span className={cx('statusBadge', statusInfo.className)}>
                          {statusInfo.label}
                        </span>
                      </td>
                      <td>
                        {banner.productNames && banner.productNames.length > 0 ? (
                          <span title={banner.productNames.join(', ')}>
                            {banner.productNames.length} sản phẩm
                          </span>
                        ) : (
                          '-'
                        )}
                      </td>
                      <td>
                        <div className={cx('actions')}>
                          <button
                            type="button"
                            className={cx('actionBtn', 'viewBtn')}
                            onClick={() => setDetailItem(banner)}
                            title="Chi tiết"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                          <button
                            type="button"
                            className={cx('actionBtn', 'editBtn')}
                            onClick={() => openEditBanner(banner)}
                            disabled={isBannerApproved(banner)}
                            title={isBannerApproved(banner) ? 'Không thể sửa banner đã được duyệt' : 'Sửa'}
                          >
                            <FontAwesomeIcon icon={faEdit} />
                          </button>
                          {isAdmin && (
                            <button
                              type="button"
                              className={cx('actionBtn', 'deleteBtn')}
                              onClick={() => handleDelete(banner.id)}
                              title="Xóa"
                            >
                              <FontAwesomeIcon icon={faTrash} />
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
        )}
      </div>

      {/* Banner Form Modal */}
      <BannerFormModal
        open={showBannerModal}
        mode={bannerForm.id ? 'edit' : 'add'}
        formData={bannerForm}
        formErrors={bannerErrors}
        previewUrl={bannerImagePreview}
        uploadingImage={uploadingBannerImage}
        categories={categories}
        brandOptions={brandOptions}
        loadingCategories={loadingCategories}
        onClose={closeBannerModal}
        onChange={handleBannerFormChange}
        onSubmit={submitBanner}
        onFileChange={handleBannerImageChange}
        onSelectCategory={handleBannerCategorySelect}
        onSelectBrand={handleBannerBrandSelect}
        onSelectTargetType={handleTargetTypeChange}
      />

      {/* Detail Modal */}
      {detailItem && (
        <div className={cx('modalOverlay')} onClick={() => setDetailItem(null)}>
          <div className={cx('detailModal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('detailHeader')}>
              <h3>Chi tiết banner</h3>
              <button
                type="button"
                className={cx('closeBtn')}
                onClick={() => setDetailItem(null)}
              >
                <FontAwesomeIcon icon={faArrowLeft} />
              </button>
            </div>
            <div className={cx('detailBody')}>
              {detailItem.imageUrl && (
                <div className={cx('detailImage')}>
                  <img src={detailItem.imageUrl} alt={detailItem.title} />
                </div>
              )}
              <div className={cx('detailInfo')}>
                <div className={cx('detailRow')}>
                  <strong>Tiêu đề:</strong>
                  <span>{detailItem.title}</span>
                </div>
                {detailItem.description && (
                  <div className={cx('detailRow')}>
                    <strong>Mô tả:</strong>
                    <span>{detailItem.description}</span>
                  </div>
                )}
                <div className={cx('detailRow')}>
                  <strong>Ngày tạo:</strong>
                  <span>{formatDate(detailItem.createdAt)}</span>
                </div>
                <div className={cx('detailRow')}>
                  <strong>Ngày bắt đầu:</strong>
                  <span>{formatDate(detailItem.startDate)}</span>
                </div>
                <div className={cx('detailRow')}>
                  <strong>Ngày kết thúc:</strong>
                  <span>{formatDate(detailItem.endDate)}</span>
                </div>
                <div className={cx('detailRow')}>
                  <strong>Trạng thái:</strong>
                  <span className={cx('statusBadge', renderStatusBadge(detailItem).className)}>
                    {renderStatusBadge(detailItem).label}
                  </span>
                </div>
                {detailItem.productNames && detailItem.productNames.length > 0 && (
                  <div className={cx('detailRow')}>
                    <strong>Sản phẩm:</strong>
                    <span>{detailItem.productNames.join(', ')}</span>
                  </div>
                )}
                {detailItem.rejectionReason && (
                  <div className={cx('detailRow')}>
                    <strong>Lý do từ chối:</strong>
                    <span className={cx('rejectionReason')}>{detailItem.rejectionReason}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default StaffBanners;

