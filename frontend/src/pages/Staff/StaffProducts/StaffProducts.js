import React from 'react';
import { useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPlus, faSearch, faArrowLeft, faCalendarAlt } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './StaffProducts.module.scss';
import AddProductPage from './components/AddProduct/AddProductPage';
import UpdateProductPage from './components/UpdateProduct/UpdateProductPage';
import ProductDetailPage from './components/ProductDetail/ProductDetailPage';
import { useStaffProductsState, MAX_MEDIA_ITEMS } from './hooks/useStaffProducts';
import fallbackImage from '~/assets/images/products/image1.jpg';
const cx = classNames.bind(styles);

function StaffProducts() {
  const navigate = useNavigate();
  const {
    loading,
    products,
    filteredProducts,
    searchTerm,
    setSearchTerm,
    selectedDate,
    setSelectedDate,
    statusFilter,
    setStatusFilter,
    categories,
    categoriesTree,
    loadingCategories,
    formData,
    formErrors,
    mediaFiles,
    fileInputRef,
    uploadingMedia,
    isAddModalOpen,
    isEditModalOpen,
    viewingProduct,
    handleAdd,
    handleEdit,
    handleCloseModal,
    handleMediaSelect,
    handleFormDataChange,
    handleRemoveMedia,
    handleSetDefaultMedia,
    handleToggleColorVariants,
    handleAddVariant,
    handleRemoveVariant,
    handleVariantChange,
    handleVariantStockChange,
    handleVariantImageChange,
    handleSubmit,
    handleViewDetail,
    handleCloseViewDetail,
    formatPrice,
    getStatusBadge,
    filterProducts,
    getNormalizedProductStatus,
  } = useStaffProductsState();


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
        <h2 className={cx('title')}>Quản lý sản phẩm</h2>
        <button 
          type="button" 
          className={cx('dashboardBtn')} 
          onClick={() => navigate('/staff')}
        >
          <FontAwesomeIcon icon={faArrowLeft} />
          Dashboard
        </button>
      </div>

      <div className={cx('filterSection')}>
        <div className={cx('filterRow')}>
          <input
            type="text"
            placeholder="Tìm kiếm theo mã sản phẩm, tên, danh mục..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className={cx('searchInput')}
          />
          <div className={cx('dateInputWrapper')}>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className={cx('dateInput')}
              placeholder="dd/mm/yyyy"
            />
            <FontAwesomeIcon icon={faCalendarAlt} className={cx('calendarIcon')} />
          </div>
          <div className={cx('sortGroup')}>
            <span className={cx('sortLabel')}>Trạng thái:</span>
            <select
              className={cx('sortSelect')}
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option value="all">Tất cả</option>
              <option value="CHO_DUYET">Chờ duyệt</option>
              <option value="DA_DUYET">Đã duyệt</option>
              <option value="TU_CHOI">Bị từ chối</option>
            </select>
          </div>
          <button type="button" className={cx('searchBtn')} onClick={filterProducts}>
            <FontAwesomeIcon icon={faSearch} />
            Tìm kiếm
          </button>
        </div>
        <button type="button" className={cx('addBtn')} onClick={handleAdd}>
          <FontAwesomeIcon icon={faPlus} />
          Thêm sản phẩm
        </button>
      </div>

      <div className={cx('tableWrapper')}>
        <div className={cx('tableHeader')}>
          <h3 className={cx('tableTitle')}>Danh sách sản phẩm</h3>
        </div>
        <table className={cx('table')}>
          <thead>
            <tr>
              <th>Ảnh</th>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Giá</th>
              <th>Trạng thái</th>
              <th>Hành động</th>
            </tr>
          </thead>
          <tbody>
            {filteredProducts.length === 0 ? (
              <tr>
                <td colSpan="6" className={cx('empty')}>
                  Không có sản phẩm nào
                </td>
              </tr>
            ) : (
              filteredProducts.map((product) => (
                <tr key={product.id}>
                  <td className={cx('imageCell')}>
                    {product.defaultMediaUrl || (product.mediaUrls && product.mediaUrls.length > 0) ? (
                      <img 
                        src={product.defaultMediaUrl || product.mediaUrls[0]} 
                        alt={product.name}
                        className={cx('productImage')}
                        onError={(e) => {
                          e.target.onerror = null;
                          e.target.src = fallbackImage;
                        }}
                      />
                    ) : (
                      <div className={cx('noImage')}></div>
                    )}
                  </td>
                  <td>
                    <div className={cx('productName')}>{product.name}</div>
                    <div className={cx('productCode')}>
                      Mã sản phẩm: <span>{product.id || '-'}</span>
                    </div>
                  </td>
                  <td>{product.categoryName || '-'}</td>
                  <td className={cx('priceCell')}>
                    {formatPrice(product.price)}
                  </td>
                  <td>{getStatusBadge(product.status, product)}</td>
                  <td>
                    <div className={cx('actions')}>
                      <button
                        onClick={() => handleViewDetail(product)}
                        className={cx('actionBtn', 'viewBtn')}
                      >
                        Xem chi tiết
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      <AddProductPage
        open={isAddModalOpen}
        formData={formData}
        formErrors={formErrors}
        categories={categories}
        categoriesTree={categoriesTree}
        loadingCategories={loadingCategories}
        uploadingMedia={uploadingMedia}
        maxMediaItems={MAX_MEDIA_ITEMS}
        fileInputRef={fileInputRef}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        onFormDataChange={handleFormDataChange}
        onMediaSelect={handleMediaSelect}
        onRemoveMedia={handleRemoveMedia}
        onSetDefaultMedia={handleSetDefaultMedia}
      onToggleColorVariants={handleToggleColorVariants}
      onAddVariant={handleAddVariant}
      onRemoveVariant={handleRemoveVariant}
      onVariantChange={handleVariantChange}
      onVariantStockChange={handleVariantStockChange}
      onVariantImageChange={handleVariantImageChange}
        mediaFiles={mediaFiles}
      />
      <UpdateProductPage
        open={isEditModalOpen}
        formData={formData}
        formErrors={formErrors}
        categories={categories}
        categoriesTree={categoriesTree}
        loadingCategories={loadingCategories}
        uploadingMedia={uploadingMedia}
        maxMediaItems={MAX_MEDIA_ITEMS}
        fileInputRef={fileInputRef}
        onClose={handleCloseModal}
        onSubmit={handleSubmit}
        onFormDataChange={handleFormDataChange}
        onMediaSelect={handleMediaSelect}
        onRemoveMedia={handleRemoveMedia}
        onSetDefaultMedia={handleSetDefaultMedia}
      onToggleColorVariants={handleToggleColorVariants}
      onAddVariant={handleAddVariant}
      onRemoveVariant={handleRemoveVariant}
      onVariantChange={handleVariantChange}
      onVariantStockChange={handleVariantStockChange}
      onVariantImageChange={handleVariantImageChange}
        mediaFiles={mediaFiles}
      />
      <ProductDetailPage
        open={Boolean(viewingProduct)}
        product={viewingProduct}
        formatPrice={formatPrice}
        getStatusBadge={(status) => getStatusBadge(status, viewingProduct)}
        getNormalizedStatus={getNormalizedProductStatus}
        onClose={handleCloseViewDetail}
        onEdit={(product) => {
          handleCloseViewDetail();
          handleEdit(product);
        }}
      />
    </div>
  );
}

export default StaffProducts;
