import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faTrash,
  faLock,
  faUnlock,
  faEnvelope,
  faPhone,
  faMapMarkerAlt,
  faCalendarAlt,
  faEdit,
  faTimes
} from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './ManageCustomerAccounts.module.scss';
import { getUsers, deleteUser, updateUser } from '~/services/user';

const cx = classNames.bind(styles);

function ManageCustomerAccounts() {
  const [customers, setCustomers] = useState([]);
  const [filteredCustomers, setFilteredCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [error, setError] = useState(null);
  const [editingCustomer, setEditingCustomer] = useState(null);
  const [editForm, setEditForm] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    isActive: true
  });

  // Fetch customers from API
  useEffect(() => {
    fetchCustomers();
  }, []);

  // Filter customers when search term or status changes
  useEffect(() => {
    filterCustomers();
  }, [searchTerm, filterStatus, customers]);

  const fetchCustomers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await getUsers();
      // Filter only customers (exclude admin and staff)
      const customerList = data.filter(user => {
        const roleName = user.role?.name?.toUpperCase() || '';
        return roleName !== 'ADMIN' && roleName !== 'STAFF' && roleName !== 'CUSTOMER_SUPPORT';
      });
      setCustomers(customerList);
      setFilteredCustomers(customerList);
    } catch (err) {
      console.error('Error fetching customers:', err);
      setError('Không thể tải danh sách khách hàng. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const filterCustomers = () => {
    let filtered = [...customers];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(customer =>
        customer.fullName?.toLowerCase().includes(term) ||
        customer.email?.toLowerCase().includes(term) ||
        customer.phoneNumber?.includes(term) ||
        customer.id?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      const isActive = filterStatus === 'active';
      filtered = filtered.filter(customer => customer.isActive === isActive);
    }

    setFilteredCustomers(filtered);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      return;
    }

    try {
      await deleteUser(userId);
      // Remove from local state
      setCustomers(customers.filter(c => c.id !== userId));
      alert('Xóa tài khoản thành công!');
    } catch (err) {
      console.error('Error deleting customer:', err);
      alert('Không thể xóa tài khoản. Vui lòng thử lại.');
    }
  };

  const handleToggleStatus = async (customer) => {
    try {
      const newStatus = !customer.isActive;
      await updateUser(customer.id, { isActive: newStatus });
      // Update local state
      setCustomers(customers.map(c =>
        c.id === customer.id ? { ...c, isActive: newStatus } : c
      ));
      alert(newStatus ? 'Đã kích hoạt tài khoản!' : 'Đã khóa tài khoản!');
    } catch (err) {
      console.error('Error updating customer status:', err);
      alert('Không thể cập nhật trạng thái. Vui lòng thử lại.');
    }
  };

  const handleEdit = (customer) => {
    setEditingCustomer(customer);
    setEditForm({
      fullName: customer.fullName || '',
      email: customer.email || '',
      phoneNumber: customer.phoneNumber || '',
      address: customer.address || '',
      isActive: customer.isActive !== undefined ? customer.isActive : true
    });
  };

  const handleCloseEdit = () => {
    setEditingCustomer(null);
    setEditForm({
      fullName: '',
      email: '',
      phoneNumber: '',
      address: '',
      isActive: true
    });
  };

  const handleSaveEdit = async () => {
    if (!editingCustomer) return;

    try {
      await updateUser(editingCustomer.id, editForm);
      // Update local state
      setCustomers(customers.map(c =>
        c.id === editingCustomer.id ? { ...c, ...editForm } : c
      ));
      alert('Cập nhật thông tin thành công!');
      handleCloseEdit();
    } catch (err) {
      console.error('Error updating customer:', err);
      alert('Không thể cập nhật thông tin. Vui lòng thử lại.');
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('vi-VN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit'
      });
    } catch {
      return 'N/A';
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
        <h2 className={cx('title')}>Quản lý tài khoản khách hàng</h2>
        <div className={cx('stats')}>
          <span className={cx('statItem')}>
            Tổng số: <strong>{customers.length}</strong>
          </span>
          <span className={cx('statItem')}>
            Đang hoạt động: <strong>{customers.filter(c => c.isActive).length}</strong>
          </span>
          <span className={cx('statItem')}>
            Đã khóa: <strong>{customers.filter(c => !c.isActive).length}</strong>
          </span>
        </div>
      </div>

      {error && (
        <div className={cx('error')}>
          {error}
          <button onClick={fetchCustomers} className={cx('retryBtn')}>
            Thử lại
          </button>
        </div>
      )}

      <div className={cx('filters')}>
        <div className={cx('searchBox')}>
          <FontAwesomeIcon icon={faSearch} className={cx('searchIcon')} />
          <input
            type="text"
            placeholder="Tìm kiếm theo tên, email, số điện thoại..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cx('searchInput')}
          />
        </div>

        <div className={cx('filterGroup')}>
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className={cx('filterSelect')}
          >
            <option value="all">Tất cả trạng thái</option>
            <option value="active">Đang hoạt động</option>
            <option value="inactive">Đã khóa</option>
          </select>
        </div>
      </div>

      <div className={cx('tableWrapper')}>
        <table className={cx('table')}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên khách hàng</th>
              <th>Email</th>
              <th>Số điện thoại</th>
              <th>Địa chỉ</th>
              <th>Ngày tạo</th>
              <th>Trạng thái</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {filteredCustomers.length === 0 ? (
              <tr>
                <td colSpan="8" className={cx('empty')}>
                  Không tìm thấy khách hàng nào
                </td>
              </tr>
            ) : (
              filteredCustomers.map((customer) => (
                <tr key={customer.id} className={cx({ inactive: !customer.isActive })}>
                  <td className={cx('idCell')}>{customer.id?.substring(0, 8)}...</td>
                  <td>
                    <span className={cx('userName')}>{customer.fullName || 'N/A'}</span>
                  </td>
                  <td>
                    <div className={cx('infoCell')}>
                      <FontAwesomeIcon icon={faEnvelope} className={cx('infoIcon')} />
                      {customer.email || 'N/A'}
                    </div>
                  </td>
                  <td>
                    <div className={cx('infoCell')}>
                      <FontAwesomeIcon icon={faPhone} className={cx('infoIcon')} />
                      {customer.phoneNumber || 'N/A'}
                    </div>
                  </td>
                  <td>
                    <div className={cx('infoCell')}>
                      <FontAwesomeIcon icon={faMapMarkerAlt} className={cx('infoIcon')} />
                      <span className={cx('address')} title={customer.address}>
                        {customer.address || 'N/A'}
                      </span>
                    </div>
                  </td>
                  <td>
                    <div className={cx('infoCell')}>
                      <FontAwesomeIcon icon={faCalendarAlt} className={cx('infoIcon')} />
                      {formatDate(customer.createAt)}
                    </div>
                  </td>
                  <td>
                    <span className={cx('statusBadge', { active: customer.isActive })}>
                      {customer.isActive ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td>
                    <div className={cx('actions')}>
                      <button
                        onClick={() => handleEdit(customer)}
                        className={cx('actionBtn', 'editBtn')}
                        title="Sửa thông tin"
                      >
                        <FontAwesomeIcon icon={faEdit} />
                      </button>
                      <button
                        onClick={() => handleToggleStatus(customer)}
                        className={cx('actionBtn', 'toggleBtn')}
                        title={customer.isActive ? 'Khóa tài khoản' : 'Mở khóa tài khoản'}
                      >
                        <FontAwesomeIcon icon={customer.isActive ? faLock : faUnlock} />
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id)}
                        className={cx('actionBtn', 'deleteBtn')}
                        title="Xóa tài khoản"
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

      {/* Edit Modal */}
      {editingCustomer && (
        <div className={cx('modalOverlay')} onClick={handleCloseEdit}>
          <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3 className={cx('modalTitle')}>Sửa thông tin khách hàng</h3>
              <button className={cx('closeBtn')} onClick={handleCloseEdit}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className={cx('modalBody')}>
              <div className={cx('formGroup')}>
                <label className={cx('formLabel')}>Tên khách hàng</label>
                <input
                  type="text"
                  className={cx('formInput')}
                  value={editForm.fullName}
                  onChange={(e) => setEditForm({ ...editForm, fullName: e.target.value })}
                  placeholder="Nhập tên khách hàng"
                />
              </div>
              <div className={cx('formGroup')}>
                <label className={cx('formLabel')}>Email</label>
                <input
                  type="email"
                  className={cx('formInput')}
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                  placeholder="Nhập email"
                />
              </div>
              <div className={cx('formGroup')}>
                <label className={cx('formLabel')}>Số điện thoại</label>
                <input
                  type="tel"
                  className={cx('formInput')}
                  value={editForm.phoneNumber}
                  onChange={(e) => setEditForm({ ...editForm, phoneNumber: e.target.value })}
                  placeholder="Nhập số điện thoại"
                />
              </div>
              <div className={cx('formGroup')}>
                <label className={cx('formLabel')}>Địa chỉ</label>
                <textarea
                  className={cx('formInput', 'formTextarea')}
                  value={editForm.address}
                  onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                  placeholder="Nhập địa chỉ"
                  rows="3"
                />
              </div>
              <div className={cx('formGroup')}>
                <label className={cx('formLabel')}>
                  <input
                    type="checkbox"
                    checked={editForm.isActive}
                    onChange={(e) => setEditForm({ ...editForm, isActive: e.target.checked })}
                    className={cx('formCheckbox')}
                  />
                  <span>Tài khoản đang hoạt động</span>
                </label>
              </div>
            </div>
            <div className={cx('modalFooter')}>
              <button className={cx('cancelBtn')} onClick={handleCloseEdit}>
                Hủy
              </button>
              <button className={cx('saveBtn')} onClick={handleSaveEdit}>
                Lưu thay đổi
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageCustomerAccounts;
