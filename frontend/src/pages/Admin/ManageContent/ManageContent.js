import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faTrash,
  faEdit,
  faPlus,
  faTimes,
  faArrowUp,
  faArrowDown
} from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './ManageContent.module.scss';
import { getBanners, deleteBanner, createBanner, updateBanner, updateBannerOrder } from '~/services/banner';
import notify from '~/utils/notification';

const cx = classNames.bind(styles);

function ManageContent() {
  const [banners, setBanners] = useState([]);
  const [filteredBanners, setFilteredBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingBanner, setEditingBanner] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    imageUrl: '',
    linkUrl: '',
    orderIndex: 0,
    isActive: true
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchBanners();
  }, []);

  useEffect(() => {
    filterBanners();
  }, [searchTerm, banners]);

  const fetchBanners = async () => {
    try {
      setLoading(true);
      const data = await getBanners();
      const sorted = (data || []).sort((a, b) => (a.orderIndex || 0) - (b.orderIndex || 0));
      setBanners(sorted);
      setFilteredBanners(sorted);
    } catch (err) {
      console.error('Error fetching banners:', err);
      notify.error('Không thể tải danh sách banner. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const filterBanners = () => {
    let filtered = [...banners];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(banner =>
        banner.title?.toLowerCase().includes(term) ||
        banner.id?.toLowerCase().includes(term)
      );
    }

    setFilteredBanners(filtered);
  };

  const handleAdd = () => {
    setEditingBanner(null);
    setFormData({
      title: '',
      imageUrl: '',
      linkUrl: '',
      orderIndex: banners.length,
      isActive: true
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (banner) => {
    setEditingBanner(banner);
    setFormData({
      title: banner.title || '',
      imageUrl: banner.imageUrl || '',
      linkUrl: banner.linkUrl || '',
      orderIndex: banner.orderIndex || 0,
      isActive: banner.isActive !== false
    });
    setFormErrors({});
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
      setBanners(banners.filter(b => b.id !== bannerId));
      notify.success('Xóa banner thành công!');
    } catch (err) {
      console.error('Error deleting banner:', err);
      notify.error('Không thể xóa banner. Vui lòng thử lại.');
    }
  };

  const handleMoveOrder = async (bannerId, direction) => {
    const banner = banners.find(b => b.id === bannerId);
    if (!banner) return;

    const currentIndex = banner.orderIndex || 0;
    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;

    if (newIndex < 0 || newIndex >= banners.length) return;

    try {
      await updateBannerOrder(bannerId, newIndex);
      fetchBanners();
    } catch (err) {
      console.error('Error updating banner order:', err);
      notify.error('Không thể thay đổi thứ tự. Vui lòng thử lại.');
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.title?.trim()) errors.title = 'Tiêu đề không được để trống';
    if (!formData.imageUrl?.trim()) errors.imageUrl = 'URL hình ảnh không được để trống';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const submitData = {
        title: formData.title.trim(),
        imageUrl: formData.imageUrl.trim(),
        linkUrl: formData.linkUrl?.trim() || null,
        orderIndex: formData.orderIndex,
        isActive: formData.isActive
      };

      if (editingBanner) {
        await updateBanner(editingBanner.id, submitData);
        notify.success('Cập nhật banner thành công!');
      } else {
        await createBanner(submitData);
        notify.success('Thêm banner thành công!');
      }

      setShowModal(false);
      fetchBanners();
    } catch (err) {
      console.error('Error saving banner:', err);
      notify.error(err.message || 'Không thể lưu banner. Vui lòng thử lại.');
    }
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
              placeholder="Tìm kiếm theo tiêu đề..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={cx('searchInput')}
            />
            <button type="button" className={cx('searchBtn')}>
              <FontAwesomeIcon icon={faSearch} />
            </button>
          </div>
          <button type="button" className={cx('addBtn')} onClick={handleAdd}>
            <FontAwesomeIcon icon={faPlus} />
            Thêm banner
          </button>
        </div>
      </div>

      <div className={cx('bannerGrid')}>
        {filteredBanners.length === 0 ? (
          <div className={cx('empty')}>Không có banner nào</div>
        ) : (
          filteredBanners.map((banner, index) => (
            <div key={banner.id} className={cx('bannerCard')}>
              <div className={cx('bannerImage')}>
                <img src={banner.imageUrl} alt={banner.title} />
                <div className={cx('bannerOverlay')}>
                  <span className={cx('orderBadge')}>#{banner.orderIndex || index + 1}</span>
                  <span className={cx('statusBadge', banner.isActive ? 'active' : 'inactive')}>
                    {banner.isActive ? 'Hiển thị' : 'Ẩn'}
                  </span>
                </div>
              </div>
              <div className={cx('bannerInfo')}>
                <h4>{banner.title}</h4>
                {banner.linkUrl && <p className={cx('link')}>{banner.linkUrl}</p>}
                <div className={cx('actions')}>
                  <button
                    type="button"
                    className={cx('actionBtn', 'moveBtn')}
                    onClick={() => handleMoveOrder(banner.id, 'up')}
                    disabled={index === 0}
                    title="Lên"
                  >
                    <FontAwesomeIcon icon={faArrowUp} />
                  </button>
                  <button
                    type="button"
                    className={cx('actionBtn', 'moveBtn')}
                    onClick={() => handleMoveOrder(banner.id, 'down')}
                    disabled={index === banners.length - 1}
                    title="Xuống"
                  >
                    <FontAwesomeIcon icon={faArrowDown} />
                  </button>
                  <button
                    type="button"
                    className={cx('actionBtn', 'editBtn')}
                    onClick={() => handleEdit(banner)}
                    title="Sửa"
                  >
                    <FontAwesomeIcon icon={faEdit} />
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
              </div>
            </div>
          ))
        )}
      </div>

      {/* Modal Add/Edit Banner */}
      {showModal && (
        <div className={cx('modalOverlay')} onClick={() => setShowModal(false)}>
          <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3>{editingBanner ? 'Sửa banner' : 'Thêm banner mới'}</h3>
              <button type="button" className={cx('closeBtn')} onClick={() => setShowModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={cx('form')}>
              <div className={cx('formGroup', { error: formErrors.title })}>
                <label>Tiêu đề *</label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="Nhập tiêu đề banner"
                />
                {formErrors.title && <span className={cx('errorText')}>{formErrors.title}</span>}
              </div>

              <div className={cx('formGroup', { error: formErrors.imageUrl })}>
                <label>URL hình ảnh *</label>
                <input
                  type="url"
                  value={formData.imageUrl}
                  onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
                  placeholder="https://..."
                />
                {formErrors.imageUrl && <span className={cx('errorText')}>{formErrors.imageUrl}</span>}
                {formData.imageUrl && (
                  <img src={formData.imageUrl} alt="Preview" className={cx('previewImage')} />
                )}
              </div>

              <div className={cx('formGroup')}>
                <label>URL liên kết</label>
                <input
                  type="url"
                  value={formData.linkUrl}
                  onChange={(e) => setFormData({ ...formData, linkUrl: e.target.value })}
                  placeholder="https://..."
                />
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup')}>
                  <label>Thứ tự hiển thị</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.orderIndex}
                    onChange={(e) => setFormData({ ...formData, orderIndex: parseInt(e.target.value) || 0 })}
                  />
                </div>

                <div className={cx('formGroup')}>
                  <label>Trạng thái</label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                  >
                    <option value="true">Hiển thị</option>
                    <option value="false">Ẩn</option>
                  </select>
                </div>
              </div>

              <div className={cx('formActions')}>
                <button type="button" className={cx('cancelBtn')} onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className={cx('submitBtn')}>
                  {editingBanner ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageContent;
