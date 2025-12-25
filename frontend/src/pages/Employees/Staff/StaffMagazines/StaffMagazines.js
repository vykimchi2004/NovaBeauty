import React, { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from './StaffMagazines.module.scss';
import { getMagazines, createMagazine } from '~/services/magazine';
import MagazineFormModal from './components/MagazineFormModal';
import { storage } from '~/services/utils';
import { STORAGE_KEYS } from '~/services/config';
import notify from '~/utils/notification';

const cx = classNames.bind(styles);

const DEFAULT = {
  title: '',
  description: '',
  imageUrl: '',
  startDate: '',
  endDate: '',
  isMagazine: true,
  targetType: 'all',
  productIds: [],
};

export default function StaffMagazines() {
  const currentUser = storage.get(STORAGE_KEYS.USER) || {};
  const role = currentUser?.role?.name?.toUpperCase?.() || '';
  const isAdmin = role === 'ADMIN';

  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [form, setForm] = useState(DEFAULT);
  const [errors, setErrors] = useState({});
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 4;

  useEffect(() => { 
    fetchList(); 
  }, []);
  
  useEffect(() => {
    // Log counts to console for debugging
    // eslint-disable-next-line no-console
    console.log('[StaffMagazines] items:', items.length, 'paginated:', paginatedItems.length, 'page:', currentPage, 'totalPages:', totalPages);
  }, [items, paginatedItems, currentPage, totalPages]);

  const fetchList = async () => {
    try {
      setLoading(true);
      const data = await getMagazines();
      const magazines = data || [];
      if (!isAdmin) {
        const me = currentUser.id;
        setItems(magazines.filter((m) => m.createdBy === me));
      } else {
        setItems(magazines);
      }
      setCurrentPage(1);
    } catch (err) {
      console.error(err);
      notify.error('Không thể tải danh sách Tạp chí.');
    } finally { 
      setLoading(false); 
    }
  };

  const openAdd = () => {
    setForm({ ...DEFAULT, startDate: new Date().toISOString().split('T')[0] });
    setErrors({});
    setShowModal(true);
  };

  const handleChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const totalPages = Math.ceil(items.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedItems = items.slice(startIndex, endIndex);

  const submit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: form.title,
        content: form.content,
        imageUrl: form.imageUrl,
        startDate: form.startDate,
        endDate: form.endDate,
        status: form.status !== false,
      };
      await createMagazine(payload);
      notify.success('Thêm Tạp chí thành công');
      setShowModal(false);
      fetchList();
    } catch (err) {
      console.error(err);
      notify.error(err.message || 'Không thể thêm tạp chí');
    }
  };

  return (
    <div className={cx('wrapper')}>
      <div className={cx('header')}>
        <h1>Quản lý Tạp chí làm đẹp</h1>
        {!isAdmin && (
          <button className={cx('addBtn')} onClick={openAdd}>Thêm Tạp chí</button>
        )}
      </div>
      <div className={cx('tableWrapper')}>
        <div className={cx('debug')}>Items: {items.length} — Shown: {paginatedItems.length} — Page: {currentPage}/{totalPages}</div>
        <table className={cx('table')}>
          <thead>
            <tr>
              <th className={cx('colImage')}>ẢNH</th>
              <th className={cx('colTitle')}>TIÊU ĐỀ</th>
              <th className={cx('colCategory')}>DANH MỤC</th>
              <th className={cx('colDesc')}>MÔ TẢ</th>
              <th className={cx('colDate')}>NGÀY TẠO</th>
              <th className={cx('colAction')}>THAO TÁC</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan="6" className={cx('loadingRow')}>Đang tải...</td>
              </tr>
            ) : items.length === 0 ? (
              <tr>
                <td colSpan="6" className={cx('emptyRow')}>Không có tạp chí nào</td>
              </tr>
            ) : (
              paginatedItems.map((it) => (
                <tr key={it.id}>
                  <td className={cx('imageCell')}>
                    <img src={it.imageUrl} alt={it.title} />
                  </td>
                  <td className={cx('titleCell')}>{it.title}</td>
                  <td className={cx('categoryCell')}>
                    <span className={cx('badge')}>Góc review</span>
                  </td>
                  <td className={cx('descriptionCell')}>
                    {it.description?.substring(0, 50)}...
                  </td>
                  <td className={cx('dateCell')}>
                    {it.createdAt ? new Date(it.createdAt).toLocaleDateString('vi-VN') : '-'}
                  </td>
                  <td className={cx('actionCell')}>
                    <button className={cx('actionBtn', 'viewBtn')} title="Xem">👁️</button>
                    <button className={cx('actionBtn', 'editBtn')} title="Chỉnh sửa">✏️</button>
                    <button className={cx('actionBtn', 'deleteBtn')} title="Xóa">🗑️</button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className={cx('pagination')}>
          <button
            type="button"
            className={cx('paginationBtn')}
            disabled={currentPage === 1}
            onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
          >
            Trước
          </button>
          <span className={cx('paginationInfo')}>
            Trang {currentPage}/{totalPages}
          </span>
          <button
            type="button"
            className={cx('paginationBtn')}
            disabled={currentPage === totalPages}
            onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
          >
            Tiếp
          </button>
        </div>
      )}

      <MagazineFormModal
        open={showModal}
        formData={form}
        onChange={handleChange}
        onClose={() => setShowModal(false)}
        onSubmit={submit}
      />
    </div>
  );
}
