import React, { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from './StaffMagazines.module.scss';
import { getMagazines, createMagazine } from '~/services/magazine';
import BannerFormModal from '../StaffBanners/components/BannerFormModal';
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

  useEffect(() => { fetchList(); }, []);

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
    } catch (err) {
      console.error(err);
      notify.error('Không thể tải danh sách Tạp chí.');
    } finally { setLoading(false); }
  };

  const openAdd = () => {
    setForm({ ...DEFAULT, startDate: new Date().toISOString().split('T')[0] });
    setErrors({});
    setShowModal(true);
  };

  const handleChange = (k, v) => setForm((p) => ({ ...p, [k]: v }));

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

      <div className={cx('list')}>
        {loading ? <div>Đang tải...</div> : (
          items.length === 0 ? <div>Không có tạp chí nào</div> : (
            items.map((it) => (
              <div key={it.id} className={cx('item')}>
                <img src={it.imageUrl} alt={it.title} />
                <div className={cx('meta')}>
                  <h3>{it.title}</h3>
                  <p>{it.description}</p>
                </div>
              </div>
            ))
          )
        )}
      </div>

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
