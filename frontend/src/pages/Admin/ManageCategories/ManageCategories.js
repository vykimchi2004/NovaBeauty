import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faSearch,
  faTrash,
  faEdit,
  faPlus,
  faTimes,
  faChevronDown,
  faChevronRight
} from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './ManageCategories.module.scss';
import { getCategories, deleteCategory, createCategory, updateCategory, getRootCategories } from '~/services/category';
import notify from '~/utils/notification';

const cx = classNames.bind(styles);

function ManageCategories() {
  const [categories, setCategories] = useState([]);
  const [filteredCategories, setFilteredCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingCategory, setEditingCategory] = useState(null);
  const [expandedCategories, setExpandedCategories] = useState(new Set());
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    status: true,
    parentId: ''
  });
  const [formErrors, setFormErrors] = useState({});

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    filterCategories();
  }, [searchTerm, categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data || []);
      setFilteredCategories(data || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
      notify.error('Không thể tải danh sách danh mục. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const filterCategories = () => {
    let filtered = [...categories];

    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      filtered = filtered.filter(category =>
        category.name?.toLowerCase().includes(term) ||
        category.id?.toLowerCase().includes(term) ||
        category.description?.toLowerCase().includes(term)
      );
    }

    setFilteredCategories(filtered);
  };

  const toggleExpand = (categoryId) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(categoryId)) {
      newExpanded.delete(categoryId);
    } else {
      newExpanded.add(categoryId);
    }
    setExpandedCategories(newExpanded);
  };

  const getSubCategories = (parentId) => {
    return categories.filter(cat => cat.parentId === parentId);
  };

  const getRootCategoriesList = () => {
    return filteredCategories.filter(cat => !cat.parentId);
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setFormData({
      name: '',
      description: '',
      status: true,
      parentId: ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);
    setFormData({
      name: category.name || '',
      description: category.description || '',
      status: category.status !== false,
      parentId: category.parentId || category.parentCategory?.id || ''
    });
    setFormErrors({});
    setShowModal(true);
  };

  const handleDelete = async (categoryId) => {
    const confirmed = await notify.confirm(
      'Bạn có chắc chắn muốn xóa danh mục này? Tất cả danh mục con cũng sẽ bị xóa.',
      'Xác nhận xóa danh mục',
      'Xóa',
      'Hủy'
    );
    
    if (!confirmed) return;

    try {
      await deleteCategory(categoryId);
      setCategories(categories.filter(c => c.id !== categoryId));
      notify.success('Xóa danh mục thành công!');
    } catch (err) {
      console.error('Error deleting category:', err);
      notify.error('Không thể xóa danh mục. Vui lòng thử lại.');
    }
  };

  const validateForm = () => {
    const errors = {};
    if (!formData.name?.trim()) errors.name = 'Tên danh mục không được để trống';

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper function to generate ID from name
  const generateCategoryId = (name) => {
    if (!name) return '';
    // Convert Vietnamese to ASCII, remove special chars, uppercase, replace spaces with underscores
    return name
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove diacritics
      .replace(/[^a-zA-Z0-9\s]/g, '') // Remove special characters
      .trim()
      .replace(/\s+/g, '_') // Replace spaces with underscores
      .toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      // Chuẩn bị dữ liệu gửi lên - chỉ gửi các field có giá trị
      const submitData = {
        name: formData.name.trim()
      };
      
      // Tự động generate id từ tên nếu đang tạo mới
      if (!editingCategory) {
        submitData.id = generateCategoryId(formData.name.trim());
        // Nếu id rỗng sau khi generate, thử dùng UUID hoặc timestamp
        if (!submitData.id) {
          submitData.id = 'CAT_' + Date.now();
        }
      }
      
      // Chỉ thêm description nếu có giá trị
      if (formData.description && formData.description.trim().length > 0) {
        submitData.description = formData.description.trim();
      }
      
      // Luôn gửi status (mặc định là true)
      submitData.status = formData.status !== undefined && formData.status !== null ? formData.status : true;
      
      // Chỉ thêm parentId nếu có giá trị
      if (formData.parentId && formData.parentId.trim().length > 0) {
        submitData.parentId = formData.parentId.trim();
      }
      
      console.log('[ManageCategories] Submitting data:', submitData);

      if (editingCategory) {
        await updateCategory(editingCategory.id, submitData);
        notify.success('Cập nhật danh mục thành công!');
      } else {
        await createCategory(submitData);
        notify.success('Thêm danh mục thành công!');
      }

      setShowModal(false);
      fetchCategories();
      
      // Dispatch event to notify other components
      window.dispatchEvent(new CustomEvent('categoriesUpdated'));
    } catch (err) {
      console.error('Error saving category:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        status: err.status,
        response: err.response
      });
      
      // Xử lý các lỗi cụ thể
      let errorMessage = 'Không thể lưu danh mục. Vui lòng thử lại.';
      
      if (err.message) {
        const errMsg = err.message.toLowerCase();
        if (errMsg.includes('tên danh mục đã tồn tại') || errMsg.includes('name already exists') || errMsg.includes('dữ liệu đầu vào không hợp lệ')) {
          errorMessage = 'Tên danh mục đã tồn tại. Vui lòng chọn tên khác.';
          setFormErrors({ ...formErrors, name: 'Tên danh mục đã tồn tại' });
        } else if (errMsg.includes('danh mục không tồn tại') || errMsg.includes('category_not_existed')) {
          errorMessage = 'Danh mục cha không tồn tại. Vui lòng chọn danh mục cha khác.';
          setFormErrors({ ...formErrors, parentId: 'Danh mục cha không tồn tại' });
        } else if (errMsg.includes('dữ liệu đầu vào không hợp lệ') || errMsg.includes('invalid_input')) {
          errorMessage = 'Dữ liệu nhập vào không hợp lệ. Vui lòng kiểm tra lại các trường bắt buộc.';
        } else if (errMsg.includes('forbidden') || errMsg.includes('403')) {
          errorMessage = 'Bạn không có quyền thực hiện thao tác này.';
        } else if (errMsg.includes('unauthorized') || errMsg.includes('401')) {
          errorMessage = 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.';
        } else {
          errorMessage = err.message || errorMessage;
        }
      }
      
      notify.error(errorMessage);
    }
  };

  const renderCategoryRow = (category, level = 0) => {
    const hasChildren = getSubCategories(category.id).length > 0;
    const isExpanded = expandedCategories.has(category.id);

    return (
      <React.Fragment key={category.id}>
        <tr>
          <td style={{ paddingLeft: `${level * 24 + 16}px` }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              {hasChildren ? (
                <button
                  type="button"
                  className={cx('expandBtn')}
                  onClick={() => toggleExpand(category.id)}
                >
                  <FontAwesomeIcon icon={isExpanded ? faChevronDown : faChevronRight} />
                </button>
              ) : (
                <span style={{ width: '16px', display: 'inline-block' }} />
              )}
              <span>{category.id}</span>
            </div>
          </td>
          <td className={cx('nameCell')}>{category.name}</td>
          <td>{category.description || '-'}</td>
          <td>
            <span className={cx('statusBadge', category.status ? 'active' : 'inactive')}>
              {category.status ? 'Hoạt động' : 'Tắt'}
            </span>
          </td>
          <td>{category.parentName || 'Danh mục gốc'}</td>
          <td>
            <div className={cx('actions')}>
              <button
                type="button"
                className={cx('actionBtn', 'editBtn')}
                onClick={() => handleEdit(category)}
                title="Sửa"
              >
                <FontAwesomeIcon icon={faEdit} />
              </button>
              <button
                type="button"
                className={cx('actionBtn', 'deleteBtn')}
                onClick={() => handleDelete(category.id)}
                title="Xóa"
              >
                <FontAwesomeIcon icon={faTrash} />
              </button>
            </div>
          </td>
        </tr>
        {hasChildren && isExpanded && getSubCategories(category.id).map(subCat => renderCategoryRow(subCat, level + 1))}
      </React.Fragment>
    );
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
        <h2 className={cx('title')}>Quản lý danh mục</h2>
        <div className={cx('headerActions')}>
          <div className={cx('searchBox')}>
            <input
              type="text"
              placeholder="Tìm kiếm theo tên, ID..."
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
            Thêm danh mục
          </button>
        </div>
      </div>

      <div className={cx('tableWrapper')}>
        <table className={cx('table')}>
          <thead>
            <tr>
              <th>ID</th>
              <th>Tên danh mục</th>
              <th>Mô tả</th>
              <th>Trạng thái</th>
              <th>Danh mục cha</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {getRootCategoriesList().length === 0 ? (
              <tr>
                <td colSpan="6" className={cx('empty')}>
                  Không có danh mục nào
                </td>
              </tr>
            ) : (
              getRootCategoriesList().map(category => renderCategoryRow(category))
            )}
          </tbody>
        </table>
      </div>

      {/* Modal Add/Edit Category */}
      {showModal && (
        <div className={cx('modalOverlay')} onClick={() => setShowModal(false)}>
          <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3>{editingCategory ? 'Sửa danh mục' : 'Thêm danh mục mới'}</h3>
              <button type="button" className={cx('closeBtn')} onClick={() => setShowModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>

            <form onSubmit={handleSubmit} className={cx('form')}>
              <div className={cx('formGroup', { error: formErrors.name })}>
                <label>Tên danh mục *</label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Nhập tên danh mục"
                />
                {formErrors.name && <span className={cx('errorText')}>{formErrors.name}</span>}
              </div>

              <div className={cx('formGroup')}>
                <label>Mô tả</label>
                <textarea
                  rows="3"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả về danh mục"
                />
              </div>

              <div className={cx('formRow')}>
                <div className={cx('formGroup')}>
                  <label>Danh mục cha</label>
<select
  value={formData.parentId}
  onChange={(e) => setFormData({ ...formData, parentId: e.target.value })}
>
  <option value="">Không có (Danh mục gốc)</option>

  {/* Chỉ cho phép chọn DANH MỤC CHA */}
  {categories
    .filter(cat => 
      // Chỉ hiện danh mục gốc
      !cat.parentId &&
      // Nếu đang sửa → không cho chọn chính nó
      (!editingCategory || cat.id !== editingCategory.id)
    )
    .map(cat => (
      <option key={cat.id} value={cat.id}>{cat.name}</option>
    ))}
</select>
                </div>

                <div className={cx('formGroup')}>
                  <label>Trạng thái</label>
                  <select
                    value={formData.status ? 'true' : 'false'}
                    onChange={(e) => setFormData({ ...formData, status: e.target.value === 'true' })}
                  >
                    <option value="true">Hoạt động</option>
                    <option value="false">Tắt</option>
                  </select>
                </div>
              </div>

              <div className={cx('formActions')}>
                <button type="button" className={cx('cancelBtn')} onClick={() => setShowModal(false)}>
                  Hủy
                </button>
                <button type="submit" className={cx('submitBtn')}>
                  {editingCategory ? 'Cập nhật' : 'Thêm mới'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ManageCategories;
