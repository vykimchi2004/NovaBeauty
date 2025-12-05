import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faLock,
  faUnlock,
  faEdit,
  faPlus,
} from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './ManageStaffAccounts.module.scss';
import { getUsers, updateUser, createStaff, getRoles } from '~/services/user';
import notify from '~/utils/notification';

const cx = classNames.bind(styles);

// Dữ liệu mẫu nhân viên
const MOCK_STAFF = [
  {
    id: 'NV001',
    fullName: 'Nguyễn Văn A',
    email: 'vana@novabeauty.com',
    phoneNumber: '0123456789',
    isActive: true,
  },
  {
    id: 'NV004',
    fullName: 'Lê Thị B',
    email: 'ThiB@novabeauty.com',
    phoneNumber: '0123456789',
    isActive: false,
  },
];

function ManageStaffAccounts() {
  const [staff, setStaff] = useState([]);
  const [filteredStaff, setFilteredStaff] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState(null);
  const [roles, setRoles] = useState([]);
  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    phoneNumber: '',
    address: '',
    roleName: 'STAFF',
    isActive: true
  });
  const [formErrors, setFormErrors] = useState({});

  // Fetch staff from API
  useEffect(() => {
    fetchStaff();
    fetchRoles();
  }, []);

  const fetchRoles = async () => {
    try {
      const data = await getRoles();
      setRoles(data || []);
    } catch (err) {
      console.error('Error fetching roles:', err);
    }
  };

  // Filter staff when search term or status changes
  useEffect(() => {
    filterStaff();
  }, [searchTerm, filterStatus, staff]);

  const fetchStaff = async () => {
    try {
      setLoading(true);
      const data = await getUsers();
      console.log('[ManageStaffAccounts] Fetched users data:', data);
      
      const staffList = data
        .filter(user => {
          const roleName = user.role?.name?.toUpperCase() || '';
          return roleName === 'STAFF' || roleName === 'CUSTOMER_SUPPORT';
        })
        .map(user => {
          // Đảm bảo isActive luôn là boolean, mặc định true nếu undefined/null
          // Kiểm tra cả isActive và active (trường hợp Jackson serialize khác)
          const isActiveValue = user.isActive !== undefined && user.isActive !== null 
            ? user.isActive 
            : (user.active !== undefined && user.active !== null ? user.active : true);
          console.log(`[ManageStaffAccounts] User ${user.email} - isActive: ${user.isActive}, active: ${user.active}, final: ${isActiveValue}`);
          return {
            ...user,
            isActive: isActiveValue
          };
        })
        .sort((a, b) => {
          if (a.isActive === b.isActive) return 0;
          return a.isActive ? -1 : 1;
        });
      
      console.log('[ManageStaffAccounts] Processed staff list:', staffList);
      setStaff(staffList);
      setFilteredStaff(staffList);
    } catch (err) {
      console.error('Error fetching staff:', err);
      // Fallback to mock data if API fails
      setStaff(MOCK_STAFF);
      setFilteredStaff(MOCK_STAFF);
    } finally {
      setLoading(false);
    }
  };

  const filterStaff = () => {
    let filtered = [...staff];

    // Filter by search term
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(
        (employee) =>
          employee.fullName?.toLowerCase().includes(term) ||
          employee.email?.toLowerCase().includes(term) ||
          employee.phoneNumber?.includes(term) ||
          employee.id?.toLowerCase().includes(term)
      );
    }

    // Filter by status
    if (filterStatus !== 'all') {
      const isActive = filterStatus === 'active';
      filtered = filtered.filter((employee) => employee.isActive === isActive);
    }

    setFilteredStaff(filtered);
  };

  const handleToggleStatus = async (employee) => {
    try {
      const currentStatus = employee.isActive === true; // Đảm bảo boolean
      const newStatus = !currentStatus;
      console.log('[ManageStaffAccounts] Toggling status - Current:', currentStatus, 'New:', newStatus);
      
      await updateUser(employee.id, { isActive: newStatus });
      
      // Cập nhật state ngay lập tức
      const updatedStaff = staff.map((s) => 
        s.id === employee.id ? { ...s, isActive: newStatus } : s
      );
      setStaff(updatedStaff);
      
      // Reload để đảm bảo đồng bộ với backend
      await fetchStaff();
      
      notify.success(
        newStatus
          ? 'Đã mở khóa tài khoản!'
          : 'Đã khóa tài khoản!'
      );
    } catch (err) {
      console.error('Error updating staff status:', err);
      notify.error('Không thể cập nhật trạng thái. Vui lòng thử lại.');
      // Reload để đảm bảo state đúng
      fetchStaff();
    }
  };

  const handleEdit = (employee) => {
    setEditingStaff(employee);
    // Đảm bảo isActive luôn là boolean
    const isActive = employee.isActive === true;
    setFormData({
      fullName: employee.fullName || '',
      email: employee.email || '',
      phoneNumber: employee.phoneNumber || '',
      address: employee.address || '',
      roleName: employee.role?.name || 'STAFF',
      isActive: isActive
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleAddStaff = () => {
    setEditingStaff(null);
    setFormData({
      fullName: '',
      email: '',
      phoneNumber: '',
      address: '',
      roleName: 'STAFF',
      isActive: true
    });
    setFormErrors({});
    setShowModal(true);
  };

  const validateForm = () => {
    const errors = {};
    
    // Kiểm tra Họ tên
    if (!formData.fullName?.trim()) {
      errors.fullName = 'Họ tên không được để trống';
    } else if (formData.fullName.trim().length < 2) {
      errors.fullName = 'Họ tên phải có ít nhất 2 ký tự';
    }
    
    // Kiểm tra Email
    if (!formData.email?.trim()) {
      errors.email = 'Email không được để trống';
    } else {
      // Kiểm tra định dạng email
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(formData.email.trim())) {
        errors.email = 'Email không đúng định dạng (ví dụ: user@example.com)';
      }
    }
    
    // Kiểm tra Vai trò
    if (!formData.roleName) {
      errors.roleName = 'Vai trò không được để trống';
    } else {
      // Chỉ cho phép STAFF hoặc CUSTOMER_SUPPORT
      const roleName = formData.roleName.toUpperCase();
      if (roleName !== 'STAFF' && roleName !== 'CUSTOMER_SUPPORT') {
        errors.roleName = 'Vai trò không hợp lệ. Chỉ cho phép STAFF hoặc CUSTOMER_SUPPORT';
      }
    }
    
    // Kiểm tra Số điện thoại (nếu có)
    if (formData.phoneNumber && formData.phoneNumber.trim()) {
      const phoneNumber = formData.phoneNumber.trim();
      // Phải bắt đầu bằng 0 và có đúng 10 chữ số
      const phoneRegex = /^0[0-9]{9}$/;
      if (!phoneRegex.test(phoneNumber)) {
        errors.phoneNumber = 'Hãy nhập số điện thoại bắt đầu từ 0 và đủ 10 số';
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isSaving) return;
    if (!validateForm()) return;

    try {
      setIsSaving(true);
      if (editingStaff) {
        // Chuyển đổi roleName thành role để match với backend UserUpdateRequest
        // Chỉ gửi các trường có giá trị hoặc đã thay đổi
        const updateData = {};
        
        // FullName - luôn gửi nếu có giá trị
        if (formData.fullName && formData.fullName.trim()) {
          updateData.fullName = formData.fullName.trim();
        }
        
        // PhoneNumber - gửi kể cả khi empty để có thể xóa
        if (formData.phoneNumber !== undefined) {
          updateData.phoneNumber = formData.phoneNumber || '';
        }
        
        // Address - gửi kể cả khi empty để có thể xóa
        if (formData.address !== undefined) {
          updateData.address = formData.address || '';
        }
        
        // Role - chuyển đổi roleName thành role
        if (formData.roleName) {
          updateData.role = formData.roleName;
        }
        
        // isActive - luôn gửi khi đang edit
        if (formData.isActive !== undefined) {
          updateData.isActive = formData.isActive;
        }
        
        console.log('[ManageStaffAccounts] Updating staff with data:', updateData);
        await updateUser(editingStaff.id, updateData);
        notify.success('Cập nhật tài khoản nhân viên thành công!');
      } else {
        // Thêm tài khoản nhân viên mới
        // Đảm bảo isActive = true khi tạo mới
        const staffData = {
          ...formData,
          isActive: true // Luôn true cho tài khoản mới
        };
        console.log('[ManageStaffAccounts] Creating staff with data:', staffData);
        await createStaff(staffData);
        notify.success('Thêm tài khoản nhân viên thành công! Mật khẩu tạm thời đã được gửi qua email cho nhân viên.');
      }

      setShowModal(false);
      await fetchStaff();
    } catch (err) {
      console.error('[ManageStaffAccounts] Error saving staff:', err);
      console.error('[ManageStaffAccounts] Error details:', {
        message: err.message,
        code: err.code,
        stack: err.stack
      });
      
      // Xử lý các lỗi cụ thể
      let errorMessage = 'Không thể lưu tài khoản nhân viên. Vui lòng thử lại.';
      
      if (err.message) {
        const errMsg = err.message.toLowerCase();
        if (errMsg.includes('user existed') || errMsg.includes('email') || errMsg.includes('đã tồn tại')) {
          errorMessage = 'Email này đã được sử dụng cho một tài khoản khác. Vui lòng chọn email khác.';
          setFormErrors({ ...formErrors, email: 'Email đã tồn tại' });
        } else if (errMsg.includes('role') || errMsg.includes('vai trò')) {
          errorMessage = 'Vai trò không hợp lệ. Vui lòng chọn lại.';
          setFormErrors({ ...formErrors, roleName: 'Vai trò không hợp lệ' });
        } else if (errMsg.includes('dữ liệu đầu vào không hợp lệ') || errMsg.includes('invalid_input')) {
          errorMessage = 'Dữ liệu nhập vào không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.';
        } else if (errMsg.includes('lỗi hệ thống') || errMsg.includes('internal_server_error')) {
          errorMessage = 'Lỗi hệ thống khi lưu tài khoản. Vui lòng thử lại sau.';
        } else if (errMsg.includes('forbidden') || errMsg.includes('403')) {
          errorMessage = 'Bạn không có quyền thực hiện thao tác này. Vui lòng đăng nhập lại với tài khoản Admin.';
        } else if (errMsg.includes('unauthorized') || errMsg.includes('401')) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        } else {
          errorMessage = err.message || 'Không thể lưu tài khoản nhân viên. Vui lòng thử lại.';
        }
      }
      
      notify.error(errorMessage);
    } finally {
      setIsSaving(false);
    }
  };

  const handleSearch = () => {
    filterStaff();
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
        <h2 className={cx('title')}>Quản lý tài khoản nhân viên</h2>
        <div className={cx('headerActions')}>
          <div className={cx('searchBox')}>
            <input
              type="text"
              placeholder="Tìm kiếm theo Email, SĐT..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              className={cx('searchInput')}
            />
            <button type="button" className={cx('searchBtn')} onClick={handleSearch}>
              <FontAwesomeIcon icon={faSearch} />
              Tìm kiếm
            </button>
          </div>
          <div className={cx('sortGroup')}>
            <span className={cx('sortLabel')}>Sắp xếp:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className={cx('sortSelect')}
            >
              <option value="all">Tất cả</option>
              <option value="active">Hoạt động</option>
              <option value="inactive">Đã khóa</option>
            </select>
          </div>
          <button type="button" className={cx('addBtn')} onClick={handleAddStaff}>
            <FontAwesomeIcon icon={faPlus} />
            Thêm nhân viên
          </button>
        </div>
      </div>

      <div className={cx('tableWrapper')}>
        <table className={cx('table')}>
          <thead>
            <tr>
              <th>Mã nhân viên</th>
              <th>Tên nhân viên</th>
              <th>Email</th>
              <th>SĐT</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredStaff.length === 0 ? (
              <tr>
                <td colSpan="6" className={cx('empty')}>
                  Không tìm thấy nhân viên nào
                </td>
              </tr>
            ) : (
              filteredStaff.map((employee) => {
                // Đảm bảo isActive luôn là boolean
                const isActive = employee.isActive === true;
                return (
                <tr key={employee.id} className={cx({ inactive: !isActive })}>
                  <td className={cx('idCell')}>{employee.id}</td>
                  <td>
                    <span className={cx('staffName')}>{employee.fullName || 'N/A'}</span>
                  </td>
                  <td>{employee.email || 'N/A'}</td>
                  <td>{employee.phoneNumber || 'N/A'}</td>
                  <td>
                    <span className={cx('statusBadge', { active: isActive })}>
                      {isActive ? 'Hoạt động' : 'Đã khóa'}
                    </span>
                  </td>
                  <td>
                    <div className={cx('actions')}>
                      <button
                        onClick={() => handleEdit(employee)}
                        className={cx('actionBtn', 'editBtn')}
                        title="Sửa"
                      >
                        Sửa
                      </button>
                      <button
                        onClick={() => handleToggleStatus(employee)}
                        className={cx('actionBtn', isActive ? 'lockBtn' : 'unlockBtn')}
                        title={isActive ? 'Khóa' : 'Mở khóa'}
                      >
                        {isActive ? 'Khóa' : 'Mở khóa'}
                      </button>
                    </div>
                  </td>
                </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add/Edit Staff */}
      {showModal && (
        <div className={cx('modalOverlay')} onClick={() => setShowModal(false)}>
          <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3>{editingStaff ? 'Sửa nhân viên' : 'Thêm nhân viên mới'}</h3>
              <button type="button" className={cx('closeBtn')} onClick={() => setShowModal(false)}>
                ×
              </button>
            </div>

            <form onSubmit={handleSubmit} className={cx('form')}>
              {!editingStaff && (
                <div className={cx('infoBox')} style={{ 
                  padding: '12px', 
                  backgroundColor: '#e3f2fd', 
                  borderRadius: '4px', 
                  marginBottom: '16px',
                  fontSize: '14px',
                  color: '#1976d2'
                }}>
                  <strong>Lưu ý:</strong> Mật khẩu tạm thời sẽ được hệ thống tự động tạo và gửi qua email cho nhân viên.
                </div>
              )}
              
              <div className={cx('formGroup', { error: formErrors.fullName })}>
                <label>Họ tên *</label>
                <input
                  type="text"
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="Nhập họ tên"
                />
                {formErrors.fullName && <span className={cx('errorText')}>{formErrors.fullName}</span>}
              </div>

              <div className={cx('formGroup', { error: formErrors.email })}>
                <label>Email *</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="Nhập email"
                  disabled={!!editingStaff}
                />
                {formErrors.email && <span className={cx('errorText')}>{formErrors.email}</span>}
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup', { error: formErrors.phoneNumber })}>
                  <label>Số điện thoại</label>
                  <input
                    type="tel"
                    value={formData.phoneNumber}
                    onChange={(e) => {
                      // Chỉ cho phép nhập số
                      const value = e.target.value.replace(/[^0-9]/g, '');
                      // Giới hạn 10 ký tự
                      const limitedValue = value.slice(0, 10);
                      setFormData({ ...formData, phoneNumber: limitedValue });
                    }}
                    onKeyPress={(e) => {
                      // Chỉ cho phép nhập số
                      if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete' && e.key !== 'Tab' && e.key !== 'Enter') {
                        e.preventDefault();
                      }
                    }}
                    placeholder="Nhập SĐT (bắt đầu bằng 0, 10 số)"
                    maxLength={10}
                  />
                  {formErrors.phoneNumber && <span className={cx('errorText')}>{formErrors.phoneNumber}</span>}
                </div>

                <div className={cx('formGroup', { error: formErrors.roleName })}>
                  <label>Vai trò *</label>
                  <select
                    value={formData.roleName}
                    onChange={(e) => setFormData({ ...formData, roleName: e.target.value })}
                  >
                    {roles.filter(r => r.name === 'STAFF' || r.name === 'CUSTOMER_SUPPORT').map(role => (
                      <option key={role.id} value={role.name}>{role.name}</option>
                    ))}
                  </select>
                  {formErrors.roleName && <span className={cx('errorText')}>{formErrors.roleName}</span>}
                </div>
              </div>

              <div className={cx('formGroup')}>
                <label>Địa chỉ</label>
                <textarea
                  rows="3"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  placeholder="Nhập địa chỉ"
                />
              </div>

              {editingStaff && (
                <div className={cx('formGroup')}>
                  <label>Trạng thái</label>
                  <select
                    value={formData.isActive ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, isActive: e.target.value === 'true' })}
                  >
                    <option value="true">Hoạt động</option>
                    <option value="false">Đã khóa</option>
                  </select>
                </div>
              )}

              <div className={cx('formActions')}>
                <button type="button" className={cx('cancelBtn')} onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className={cx('submitBtn')} disabled={isSaving}>
                  {isSaving ? 'Đang lưu...' : editingStaff ? 'Cập nhật' : 'Lưu nhân viên'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageStaffAccounts;
