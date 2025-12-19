import React, { useCallback, useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faEye, faTimes, faTrash } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './ManageProduct.module.scss';
import { getProducts, deleteProduct } from '~/services/product';
import notify from '~/utils/notification';
import fallbackImage from '~/assets/images/products/image1.jpg';
import ProductDetailView from './components/ProductDetailView';
import {
  extractTextureInfo,
  extractReviewHighlights
} from '~/utils/productPresentation';
import { createStatusHelpers } from '~/utils/statusHelpers';
import { normalizeVariantRecords } from '~/utils/productVariants';

const cx = classNames.bind(styles);

const STATUS_CONFIG = {
  DA_DUYET: { label: 'Đã duyệt', class: 'active' },
  CHO_DUYET: { label: 'Chờ duyệt', class: 'pending' },
  TU_CHOI: { label: 'Từ chối', class: 'rejected' }
};

const { getNormalizedProductStatus, formatStatusDisplay } = createStatusHelpers(STATUS_CONFIG);

const getProductMediaList = (product) => {
  if (!product) return [];

  const urls = [];
  const pushIfValid = (url) => {
    if (url && typeof url === 'string' && !urls.includes(url)) {
      urls.push(url);
    }
  };

  pushIfValid(product.defaultMediaUrl);
  if (Array.isArray(product.mediaUrls)) {
    product.mediaUrls.forEach(pushIfValid);
  }

  const variantRecords = normalizeVariantRecords(product?.manufacturingLocation);
  variantRecords.forEach((variant) => {
    pushIfValid(variant?.imageUrl);
  });

  return urls;
};

function ManageProduct() {
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [viewingProduct, setViewingProduct] = useState(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [processingDelete, setProcessingDelete] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const viewingMediaList = viewingProduct ? getProductMediaList(viewingProduct) : [];
  const hasMediaToShow = viewingMediaList.length > 0;
  const selectedImageUrl =
    (hasMediaToShow && (viewingMediaList[selectedImageIndex] || viewingMediaList[0])) || '';
  // Extract từ backend fields: texture, skinType, characteristics -> reviewHighlights
  // Fallback về author/publisher nếu texture/skinType chưa có (cho dữ liệu cũ)
  const textureInfo = viewingProduct
    ? viewingProduct.texture || viewingProduct.author || extractTextureInfo(viewingProduct) || 'Chưa cập nhật'
    : '';
  const skinTypeInfo = viewingProduct ? viewingProduct.skinType || viewingProduct.publisher || 'Chưa cập nhật' : '';
  const reviewHighlights = viewingProduct
    ? viewingProduct.characteristics || extractReviewHighlights(viewingProduct) || 'Chưa có đánh giá'
    : '';

  useEffect(() => {
    fetchProducts();
  }, []);

  const applyFilters = useCallback(() => {
    let list = [...(products || [])];
    const keyword = searchTerm.trim().toLowerCase();

    if (keyword) {
      list = list.filter(
        (product) =>
          product.name?.toLowerCase().includes(keyword) ||
          product.brand?.toLowerCase().includes(keyword) ||
          product.categoryName?.toLowerCase().includes(keyword) ||
          product.id?.toLowerCase().includes(keyword)
      );
    }

    setFilteredProducts(list);
  }, [products, searchTerm]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const fetchProducts = async () => {
    try {
      setLoading(true);
      const data = await getProducts();
      setProducts(data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      notify.error('Không thể tải danh sách sản phẩm. Vui lòng thử lại.');
    } finally {
      setLoading(false);
    }
  };

  const formatPrice = (price) => {
    const value = Math.round(Number(price) || 0);
    return (
      new Intl.NumberFormat('vi-VN', {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      }).format(value) + ' ₫'
    );
  };

  const formatWeight = (weight) => {
    if (weight === null || weight === undefined || weight === '') return '-';
    return `${weight} g`;
  };

  const formatDate = (date) => {
    if (!date) return '-';
    return new Date(date).toLocaleDateString('vi-VN');
  };

  const getStatusBadge = (status, product) => {
    const normalized = getNormalizedProductStatus(product);
    const statusInfo = STATUS_CONFIG[normalized] || {
      label: formatStatusDisplay(status),
      class: 'default'
    };
    return <span className={cx('statusBadge', statusInfo.class)}>{statusInfo.label}</span>;
  };

  const handleViewDetail = (product) => {
    setViewingProduct(product);
    setSelectedImageIndex(0);
  };

  const openDeletePrompt = (product) => {
    setViewingProduct(product);
    setSelectedImageIndex(0);
    setShowDeleteConfirm(true);
  };

  const handleCloseViewDetail = () => {
    setViewingProduct(null);
    setShowDeleteConfirm(false);
    setSelectedImageIndex(0);
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleDeleteConfirm = async () => {
    if (!viewingProduct) return;
    try {
      setProcessingDelete(true);
      await deleteProduct(viewingProduct.id);
      notify.success('Đã xóa sản phẩm.');
      setShowDeleteConfirm(false);
      setViewingProduct(null);
      await fetchProducts();
    } catch (err) {
      console.error('Error deleting product:', err);
      notify.error('Không thể xóa sản phẩm. Vui lòng thử lại.');
    } finally {
      setProcessingDelete(false);
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
      {!viewingProduct && (
        <>
          <div className={cx('header')}>
            <h2 className={cx('title')}>Quản lý sản phẩm</h2>
            <div className={cx('headerActions')}>
              <div className={cx('searchBox')}>
                <input
                  type="text"
                  placeholder="Tìm kiếm theo tên, thương hiệu, mã sản phẩm..."
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
                  <th>Tên & mã sản phẩm</th>
                  <th>Danh mục</th>
                  <th>Thương hiệu</th>
                  <th>Giá</th>
                  <th>Trọng lượng</th>
                  <th>Ngày gửi</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="7" className={cx('empty')}>
                      Không có sản phẩm nào
                    </td>
                  </tr>
                ) : (
                  filteredProducts.map((product) => (
                    <tr key={product.id}>
                      <td className={cx('nameCell')}>
                        <div className={cx('productName')}>{product.name || '-'}</div>
                        <div className={cx('productCode')}>
                          Mã: <span>{product.id || '-'}</span>
                        </div>
                      </td>
                      <td>{product.categoryName || '-'}</td>
                      <td>{product.brand || '-'}</td>
                      <td className={cx('priceCell')}>{formatPrice(product.price)}</td>
                      <td>{formatWeight(product.weight)}</td>
                      <td>{formatDate(product.createdAt)}</td>
                      <td>
                        <div className={cx('actions')}>
                          <button
                            type="button"
                            className={cx('actionBtn', 'viewBtn')}
                            onClick={() => handleViewDetail(product)}
                            title="Xem chi tiết"
                          >
                            <FontAwesomeIcon icon={faEye} />
                          </button>
                          <button
                            type="button"
                            className={cx('actionBtn', 'deleteBtn')}
                            onClick={() => openDeletePrompt(product)}
                            title="Xóa sản phẩm"
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
        </>
      )}

      {viewingProduct && (
        <ProductDetailView
          product={viewingProduct}
          mediaList={viewingMediaList}
          hasMedia={hasMediaToShow}
          selectedImageIndex={selectedImageIndex}
          onSelectImage={setSelectedImageIndex}
          selectedImageUrl={selectedImageUrl || fallbackImage}
          onBack={handleCloseViewDetail}
          onClose={handleCloseViewDetail}
          onDelete={handleDeleteClick}
          processingDelete={processingDelete}
          getStatusBadge={(status) => getStatusBadge(status, viewingProduct)}
          getNormalizedStatus={getNormalizedProductStatus}
          formatPrice={formatPrice}
          formatWeight={formatWeight}
          formatDate={formatDate}
          textureInfo={textureInfo}
          skinTypeInfo={skinTypeInfo}
          reviewHighlights={reviewHighlights}
        />
      )}
      {showDeleteConfirm && (
        <div className={cx('modalOverlay')} onClick={() => setShowDeleteConfirm(false)}>
          <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3>Xác nhận xóa sản phẩm</h3>
              <button type="button" className={cx('closeBtn')} onClick={() => setShowDeleteConfirm(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className={cx('form')}>
              <p>Bạn có chắc chắn muốn xóa sản phẩm này? Thao tác không thể hoàn tác.</p>
              <div className={cx('formActions')}>
                <button type="button" className={cx('cancelBtn')} onClick={() => setShowDeleteConfirm(false)}>
                  Hủy
                </button>
                <button
                  type="button"
                  className={cx('deleteBtn')}
                  onClick={handleDeleteConfirm}
                  disabled={processingDelete}
                >
                  {processingDelete ? 'Đang xóa...' : 'Xóa'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}

export default ManageProduct;

