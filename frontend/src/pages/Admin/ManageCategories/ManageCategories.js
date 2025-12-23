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
import { getCategories, deleteCategory, createCategory, updateCategory } from '~/services/category';
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
  const [parentDropdownOpen, setParentDropdownOpen] = useState(false);
  const [hoverParentId, setHoverParentId] = useState('');
  const [formErrors, setFormErrors] = useState({});

  // Lưu parentId ban đầu của category khi edit (để khóa rule)
  const [originalParentId, setOriginalParentId] = useState('');

  useEffect(() => {
    fetchCategories();
  }, []);

  // Luôn sync filteredCategories theo categories + searchTerm
  useEffect(() => {
    filterCategories();
  }, [searchTerm, categories]);

  const fetchCategories = async () => {
    try {
      setLoading(true);
      const data = await getCategories();
      setCategories(data || []);
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

  // ====== HELPERS: root/child ======
  const isRootCategory = (cat) => !cat?.parentId && !cat?.parentCategory?.id;
  const isChildCategory = (cat) => !!(cat?.parentId || cat?.parentCategory?.id);

  // Lấy tất cả id con của một danh mục (để tránh chọn chính nó hoặc con của nó làm cha)
  const getDescendantIds = (parentId) => {
    const children = categories.filter(cat => cat.parentId === parentId);
    return children.reduce((acc, child) => {
      acc.push(child.id);
      acc.push(...getDescendantIds(child.id));
      return acc;
    }, []);
  };

  // Tính độ sâu (level) của một danh mục: 0 = gốc, 1 = con, 2 = cháu
  const getCategoryLevel = (categoryId) => {
    if (!categoryId) return 0;
    const category = categories.find(c => c.id === categoryId);
    if (!category || !category.parentId) return 0;

    let level = 1;
    let currentId = category.parentId;

    while (currentId) {
      const parent = categories.find(c => c.id === currentId);
      if (!parent || !parent.parentId) break;
      level++;
      if (level >= 3) break; // Tối đa 3 cấp (0, 1, 2)
      currentId = parent.parentId;
    }

    return level;
  };

  // Lấy đường dẫn đầy đủ của danh mục (cha > con)
  const getCategoryPath = (categoryId) => {
    if (!categoryId) return '';
    const category = categories.find(c => c.id === categoryId);
    if (!category) return '';

    const path = [category.name];
    let currentParentId = category.parentId;

    while (currentParentId) {
      const parent = categories.find(c => c.id === currentParentId);
      if (!parent) break;
      path.unshift(parent.name);
      currentParentId = parent.parentId;
    }

    return path.join(' > ');
  };

  // ====== OPTIONS FOR DROPDOWN ======
  const excludeIdsForSelection = editingCategory
    ? [editingCategory.id, ...getDescendantIds(editingCategory.id)]
    : [];

  // Chỉ hiển thị danh mục gốc ở cột trái
  const rootOptions = categories
    .filter(cat => !cat.parentId && !excludeIdsForSelection.includes(cat.id))
    .sort((a, b) => (a.name || '').localeCompare(b.name || ''));

  const selectedParentLabel = (() => {
    if (!formData.parentId) return 'Không có (Danh mục gốc)';
    const found = categories.find(c => c.id === formData.parentId);
    if (!found) return 'Danh mục không tồn tại';

    const level = getCategoryLevel(formData.parentId);
    if (level === 1) return getCategoryPath(formData.parentId);
    return found.name;
  })();

  // ====== RULE: chỉ cho "danh mục con -> danh mục cha", không cho "danh mục cha -> danh mục con" ======
  const handleSelectParent = (id) => {
    // RULES khi đang sửa
    if (editingCategory) {
      const editingIsRoot = isRootCategory(editingCategory);
      const editingIsChild = isChildCategory(editingCategory);

      // 1) Không cho danh mục cha (root) thành danh mục con
      if (editingIsRoot && id) {
        notify.warning('Danh mục cha không thể chuyển thành danh mục con.');
        return;
      }

      // 2) Danh mục con: CHỈ cho phép chọn root (''), hoặc giữ nguyên parent cũ
      if (editingIsChild) {
        const allow = (id === '') || (id === originalParentId);
        if (!allow) {
          notify.warning('Chỉ cho phép chuyển danh mục con lên thành danh mục cha (Danh mục gốc).');
          return;
        }
      }
    }

    // (Giữ rule 3 cấp của bạn)
    if (id) {
      const selectedCategory = categories.find(c => c.id === id);
      if (selectedCategory) {
        const level = getCategoryLevel(id);
        if (level >= 2) {
          notify.warning('Không thể chọn danh mục này làm cha. Chỉ cho phép tối đa 3 cấp (cha - con - cháu).');
          return;
        }
      }
    }

    setFormData(prev => ({ ...prev, parentId: id || '' }));
    setParentDropdownOpen(false);
    setHoverParentId('');
  };

  const handleAdd = () => {
    setEditingCategory(null);
    setOriginalParentId('');
    setParentDropdownOpen(false);
    setHoverParentId('');
    setFormErrors({});
    setFormData({
      name: '',
      description: '',
      status: true,
      parentId: ''
    });
    setShowModal(true);
  };

  const handleEdit = (category) => {
    setEditingCategory(category);

    const parent = category.parentId || category.parentCategory?.id || '';
    setOriginalParentId(parent);

    setParentDropdownOpen(false);
    setHoverParentId('');
    setFormErrors({});

    setFormData({
      name: category.name || '',
      description: category.description || '',
      status: category.status !== false,
      parentId: parent
    });

    setShowModal(true);
  };

  // ✅ FIX: xóa xong phải refetch để tránh UI cũ (cascading/expanded)
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
      notify.success('Xóa danh mục thành công!');

      setExpandedCategories(new Set());
      await fetchCategories();

      window.dispatchEvent(new CustomEvent('categoriesUpdated'));
    } catch (err) {
      console.error('Error deleting category:', err);
      notify.error('Không thể xóa danh mục. Vui lòng thử lại.');
    }
  };

  const validateForm = () => {
    const errors = {};

    if (!formData.name?.trim()) {
      errors.name = 'Tên danh mục không được để trống';
    }

    // RULES khi sửa
    if (editingCategory) {
      const editingIsRoot = isRootCategory(editingCategory);
      const editingIsChild = isChildCategory(editingCategory);

      // Không cho cha -> con
      if (editingIsRoot && formData.parentId) {
        errors.parentId = 'Danh mục cha không thể chuyển thành danh mục con.';
      }

      // Con: chỉ cho root hoặc giữ nguyên
      if (editingIsChild) {
        const allow = (formData.parentId === '') || (formData.parentId === originalParentId);
        if (!allow) {
          errors.parentId = 'Chỉ cho phép chuyển danh mục con lên thành danh mục cha (Danh mục gốc).';
        }
      }
    }

    // Kiểm tra giới hạn 3 cấp (nếu có parentId)
    if (formData.parentId) {
      const parentLevel = getCategoryLevel(formData.parentId);
      if (parentLevel >= 2) {
        errors.parentId = 'Không thể chọn danh mục này làm cha. Chỉ cho phép tối đa 3 cấp (cha - con - cháu).';
      } else {
        const newLevel = parentLevel + 1;
        if (newLevel >= 3) {
          errors.parentId = 'Danh mục mới sẽ vượt quá giới hạn 3 cấp. Vui lòng chọn danh mục cha khác.';
        }
      }
    }

    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  // Helper function to generate ID from name
  const generateCategoryId = (name) => {
    if (!name) return '';
    return name
      .replace(/đ/g, 'd')
      .replace(/Đ/g, 'D')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9\s]/g, '')
      .trim()
      .replace(/\s+/g, '_')
      .toUpperCase();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      const trimmedName = formData.name.trim();
      const submitData = { name: trimmedName };

      // Luôn generate ID từ tên (theo code bạn)
      const newId = generateCategoryId(trimmedName);
      submitData.id = newId ? newId : 'CAT_' + Date.now();

      if (formData.description && formData.description.trim().length > 0) {
        submitData.description = formData.description.trim();
      }

      submitData.status =
        formData.status !== undefined && formData.status !== null ? formData.status : true;

      // ✅ QUAN TRỌNG: UPDATE phải gửi parentId rõ ràng để xóa parentId cũ (đưa lên root)
      if (editingCategory) {
        submitData.parentId =
          formData.parentId && formData.parentId.trim().length > 0 ? formData.parentId.trim() : null;
      } else {
        // Create: chỉ gửi parentId khi có chọn cha
        if (formData.parentId && formData.parentId.trim().length > 0) {
          submitData.parentId = formData.parentId.trim();
        }
      }

      console.log('[ManageCategories] Submitting data:', submitData);

      if (editingCategory) {
        const oldId = editingCategory.id;
        const idChanged = oldId !== submitData.id;

        await updateCategory(oldId, submitData);
        notify.success('Cập nhật danh mục thành công!');

        if (idChanged) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
      } else {
        await createCategory(submitData);
        notify.success('Thêm danh mục thành công!');
      }

      setShowModal(false);

      // ✅ Refresh chắc chắn + reset UI state
      setExpandedCategories(new Set());
      setParentDropdownOpen(false);
      setHoverParentId('');
      await fetchCategories();

      window.dispatchEvent(new CustomEvent('categoriesUpdated'));
    } catch (err) {
      console.error('Error saving category:', err);
      console.error('Error details:', {
        message: err.message,
        code: err.code,
        status: err.status,
        response: err.response
      });

      let errorMessage = 'Không thể lưu danh mục. Vui lòng thử lại.';

      if (err.message) {
        const errMsg = err.message.toLowerCase();
        if (
          errMsg.includes('tên danh mục đã tồn tại') ||
          errMsg.includes('name already exists') ||
          errMsg.includes('dữ liệu đầu vào không hợp lệ')
        ) {
          errorMessage = 'Tên danh mục đã tồn tại. Vui lòng chọn tên khác.';
          setFormErrors(prev => ({ ...prev, name: 'Tên danh mục đã tồn tại' }));
        } else if (errMsg.includes('danh mục không tồn tại') || errMsg.includes('category_not_existed')) {
          errorMessage = 'Danh mục cha không tồn tại. Vui lòng chọn danh mục cha khác.';
          setFormErrors(prev => ({ ...prev, parentId: 'Danh mục cha không tồn tại' }));
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

    const parentNameComputed = category.parentId
      ? categories.find(c => c.id === category.parentId)?.name || '-'
      : 'Danh mục gốc';

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
          {/* ✅ Render theo parentId (không phụ thuộc parentName từ BE) */}
          <td>{parentNameComputed}</td>
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

        {hasChildren &&
          isExpanded &&
          getSubCategories(category.id).map(subCat => renderCategoryRow(subCat, level + 1))}
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

  const editingIsRoot = editingCategory ? isRootCategory(editingCategory) : false;
  const editingIsChild = editingCategory ? isChildCategory(editingCategory) : false;

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
                <div className={cx('formGroup', { error: formErrors.parentId })}>
                  <label>Danh mục cha</label>

                  <div className={cx('parentDropdown')}>
                    <button
                      type="button"
                      className={cx('parentDropdownToggle')}
                      disabled={editingCategory && editingIsRoot} // root không được thành con
                      onClick={() => {
                        if (editingCategory && editingIsRoot) {
                          notify.warning('Danh mục cha không thể chuyển thành danh mục con.');
                          return;
                        }
                        setParentDropdownOpen(prev => !prev);
                      }}
                    >
                      <span>{selectedParentLabel}</span>
                      <FontAwesomeIcon icon={faChevronDown} />
                    </button>

                    {parentDropdownOpen && (
                      <div
                        className={cx('parentDropdownMenu')}
                        onMouseLeave={(e) => {
                          const relatedTarget = e.relatedTarget;
                          if (!relatedTarget || typeof relatedTarget.closest !== 'function') {
                            setHoverParentId('');
                            return;
                          }
                          if (!relatedTarget.closest('.childDropdown') && !relatedTarget.closest('.parentOption')) {
                            setHoverParentId('');
                          }
                        }}
                      >
                        <div className={cx('parentColumn')}>
                          {/* Nếu đang edit và là CHILD -> chỉ hiển thị đúng 1 lựa chọn: đưa lên ROOT */}
                          {editingCategory && editingIsChild ? (
                            <div
                              className={cx('parentOption', !formData.parentId && 'active')}
                              onClick={() => handleSelectParent('')}
                            >
                              Không có (Danh mục gốc)
                            </div>
                          ) : (
                            <>
                              <div
                                className={cx('parentOption', !formData.parentId && 'active')}
                                onMouseEnter={() => setHoverParentId('')}
                                onClick={() => handleSelectParent('')}
                              >
                                Không có (Danh mục gốc)
                              </div>

                              {rootOptions.length === 0 && (
                                <div className={cx('emptyOption')}>Chưa có danh mục</div>
                              )}

                              {rootOptions.map(cat => {
                                const hasChildren = categories.some(c => c.parentId === cat.id);
                                const isHovered = hoverParentId === cat.id;

                                const childOpts =
                                  isHovered && hasChildren
                                    ? categories.filter(
                                        c => c.parentId === cat.id && !excludeIdsForSelection.includes(c.id)
                                      )
                                    : [];

                                return (
                                  <div
                                    key={cat.id}
                                    className={cx(
                                      'parentOption',
                                      formData.parentId === cat.id && 'active',
                                      hasChildren && 'hasChildren'
                                    )}
                                    onMouseEnter={() => setHoverParentId(cat.id)}
                                    onClick={() => handleSelectParent(cat.id)}
                                  >
                                    <span>{cat.name}</span>
                                    {hasChildren && (
                                      <FontAwesomeIcon icon={faChevronRight} className={cx('arrowRight')} />
                                    )}

                                    {isHovered && hasChildren && childOpts.length > 0 && (
                                      <div
                                        className={cx('childDropdown')}
                                        onMouseEnter={() => setHoverParentId(cat.id)}
                                        onMouseLeave={() => setHoverParentId('')}
                                      >
                                        {childOpts.map(childCat => (
                                          <div
                                            key={childCat.id}
                                            className={cx(
                                              'childOption',
                                              formData.parentId === childCat.id && 'active'
                                            )}
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              handleSelectParent(childCat.id);
                                            }}
                                          >
                                            {childCat.name}
                                          </div>
                                        ))}
                                      </div>
                                    )}
                                  </div>
                                );
                              })}
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  {formErrors.parentId && <span className={cx('errorText')}>{formErrors.parentId}</span>}
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
