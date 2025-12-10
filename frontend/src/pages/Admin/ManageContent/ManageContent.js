import React, { useCallback, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faTrash, faCheck, faTimes, faEye } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './ManageContent.module.scss';
import { getBanners, deleteBanner, updateBanner } from '~/services/banner';
import notify from '~/utils/notification';
import fallbackImage from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);

function ManageContent() {
  const [banners, setBanners] = useState([]);
  const [filteredBanners, setFilteredBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [selectedBanner, setSelectedBanner] = useState(null);

  useEffect(() => {
    fetchBanners();
  }, []);

  const applySearchFilter = useCallback(() => {
    let filtered = [...banners];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (banner) =>
        banner.title?.toLowerCase().includes(term) ||
          banner.description?.toLowerCase().includes(term) ||
        banner.id?.toLowerCase().includes(term)
      );
    }

    setFilteredBanners(filtered);
  }, [banners, searchTerm]);

  useEffect(() => {
    applySearchFilter();
  }, [applySearchFilter]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const data = await getBanners();
      setBanners(data || []);
      setFilteredBanners(data || []);
    } catch (err) {
      console.error('Error fetching banners:', err);
      notify.error('Không thể tải danh sách banner. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedBanner(null);
  };

  const handleViewDetail = (banner) => {
    setSelectedBanner(banner);
    setShowModal(true);
  };

  const handleDelete = async (bannerId) => {
    const confirmed = await notify.confirm(
      'Bạn có chắc chắn muốn xóa banner này?',
      'Xác nhận xóa banner',
      'Xóa',
      'Hủy'
    );
    
    if (!confirmed) return;

    try {
      await deleteBanner(bannerId);
      setBanners(banners.filter((b) => b.id !== bannerId));
      notify.success('Xóa banner thành công!');
      if (selectedBanner?.id === bannerId) {
        closeModal();
      }
    } catch (err) {
      console.error('Error deleting banner:', err);
      notify.error('Không thể xóa banner. Vui lòng thử lại.');
    }
  };

  const handleApprove = async (bannerId) => {
    const confirmed = await notify.confirm(
      'Bạn có chắc muốn duyệt banner này?',
      'Xác nhận duyệt banner',
      'Duyệt',
      'Hủy'
    );

    if (!confirmed) return;

    try {
      await updateBanner(bannerId, {
        status: true,
        rejectionReason: null,
      });
      notify.success('Đã duyệt banner thành công!');
      closeModal();
      fetchBanners();
    } catch (err) {
      console.error('Error approving banner:', err);
      notify.error('Không thể duyệt banner. Vui lòng thử lại.');
    }
  };

  const handleReject = async (banner) => {
    const reason = window.prompt('Nhập lý do từ chối', '');
    if (reason === null) return;
    const trimmed = reason.trim();
    if (!trimmed) return;
    try {
      await updateBanner(banner.id, {
        status: false,
        rejectionReason: trimmed,
      });
      notify.success('Đã từ chối banner.');
      closeModal();
      fetchBanners();
    } catch (err) {
      console.error('Error rejecting banner:', err);
      notify.error('Không thể từ chối banner. Vui lòng thử lại.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('vi-VN');
  };

  if (loading) {
    return (
      <div className={cx('wrapper')}>
        <div className={cx('loading')}>Đang tải dữ liệu...</div>
      </div>
    );
  }

  return (
    <div className={cx('wrapper')}>
      <div className={cx('header')}>
        <h2 className={cx('title')}>Quản lý nội dung (Banners)</h2>
        <div className={cx('headerActions')}>
          <div className={cx('searchBox')}>
            <input
              type="text"
              placeholder="Tìm kiếm theo tiêu đề, mô tả..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cx('searchInput')}
            />
            <button type="button" className={cx('searchBtn')}>
              <FontAwesomeIcon icon={faSearch} />
            </button>
          </div>
        </div>
      </div>

      <div className={cx('tableWrapper')}>
        <table className={cx('table')}>
          <thead>
            <tr>
              <th>Ảnh</th>
              <th>Tiêu đề</th>
              <th>Mô tả</th>
              <th>Ngày tạo</th>
              <th>Ngày bắt đầu</th>
              <th>Ngày kết thúc</th>
              <th>Sản phẩm</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
        {filteredBanners.length === 0 ? (
              <tr>
                <td colSpan="8" className={cx('empty')}>
                  Không có banner nào
                </td>
              </tr>
            ) : (
              filteredBanners.map((banner) => (
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
                        onClick={() => handleViewDetail(banner)}
                        title="Chi tiết"
                      >
                        <FontAwesomeIcon icon={faEye} />
                  </button>
                  <button
                    type="button"
                    className={cx('actionBtn', 'deleteBtn')}
                    onClick={() => handleDelete(banner.id)}
                    title="Xóa"
                  >
                    <FontAwesomeIcon icon={faTrash} />
                  </button>
                </div>
                  </td>
                </tr>
          ))
        )}
          </tbody>
        </table>
      </div>

      {showModal && selectedBanner && (
        <div className={cx('modalOverlay')} onClick={closeModal}>
          <div className={cx('detailModalWrapper')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('detailCard')}>
              <div className={cx('detailLeft')}>
                <div className={cx('detailImage')}>
                  <img
                    className={cx('detailMainImage')}
                    src={selectedBanner.imageUrl || fallbackImage}
                    alt={selectedBanner.title}
                    onError={(e) => {
                      e.target.onerror = null;
                      e.target.src = fallbackImage;
                    }}
                  />
                </div>
            </div>

              <div className={cx('detailRight')}>
                <div className={cx('detailHeaderBlock')}>
                  <h3>Chi tiết banner</h3>
              </div>

                <div className={cx('detailInfoList')}>
                  {[
                    { label: 'Tiêu đề', value: selectedBanner.title || '-' },
                    { label: 'Mô tả', value: selectedBanner.description || '-' },
                    { label: 'Ngày tạo', value: formatDate(selectedBanner.createdAt) },
                    { label: 'Ngày bắt đầu', value: formatDate(selectedBanner.startDate) },
                    { label: 'Ngày kết thúc', value: formatDate(selectedBanner.endDate) },
                    {
                      label: 'Sản phẩm',
                      value:
                        selectedBanner.productNames && selectedBanner.productNames.length > 0
                          ? selectedBanner.productNames.join(', ')
                          : '-',
                    },
                    {
                      label: 'Người tạo',
                      value: selectedBanner.createdByName || selectedBanner.createdBy || '-',
                    },
                  ].map((item, idx) => (
                    <div key={idx} className={cx('detailInfoItem')}>
                      <span className={cx('detailLabel')}>{item.label}:</span>
                      <span className={cx('detailValue')}>{item.value}</span>
                    </div>
                  ))}
                  {selectedBanner.rejectionReason && (
                    <div className={cx('detailInfoItem')}>
                      <span className={cx('detailLabel')}>Lý do từ chối:</span>
                      <span className={cx('detailValue', 'rejectionReason')}>
                        {selectedBanner.rejectionReason}
                      </span>
                    </div>
                )}
              </div>

                {selectedBanner.pendingReview === true && (
                  <div className={cx('detailActions')}>
                    <button
                      type="button"
                      className={cx('actionBtn', 'approveBtn')}
                      onClick={() => handleApprove(selectedBanner.id)}
                    >
                      <FontAwesomeIcon icon={faCheck} />
                      Duyệt
                    </button>
                    <button
                      type="button"
                      className={cx('actionBtn', 'rejectBtn')}
                      onClick={() => handleReject(selectedBanner)}
                    >
                      <FontAwesomeIcon icon={faTimes} />
                      Từ chối
                </button>
                    <button
                      type="button"
                      className={cx('actionBtn', 'deleteBtn')}
                      onClick={() => handleDelete(selectedBanner.id)}
                    >
                      <FontAwesomeIcon icon={faTrash} />
                      Xóa
                </button>
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

export default ManageContent;
