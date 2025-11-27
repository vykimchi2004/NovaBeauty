import React, { useEffect, useState } from 'react';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSearch, faEye, faTimes, faCheck, faXmark, faTrash } from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './ManageProduct.module.scss';
import { getProducts, processProductApproval, deleteProduct } from '~/services/product';
import notify from '~/utils/notification';
import fallbackImage from '~/assets/images/products/image1.jpg';
import ProductDetailView from './components/ProductDetailView';
import {
  extractTextureInfo,
  extractReviewHighlights
} from '~/utils/productPresentation';
import { createStatusHelpers } from '~/utils/statusHelpers';
import { normalizeVariantRecords } from '~/utils/colorVariants';

const cx = classNames.bind(styles);

const STATUS_CONFIG = {
  DA_DUYET: { label: 'Đã duyệt', class: 'active' },
  CHO_DUYET: { label: 'Chờ duyệt', class: 'pending' },
  TU_CHOI: { label: 'Từ chối', class: 'rejected' }
};

const { normalizeStatus, getNormalizedProductStatus, formatStatusDisplay } = createStatusHelpers(STATUS_CONFIG);

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
  const [filterStatus, setFilterStatus] = useState('all');
  const [viewingProduct, setViewingProduct] = useState(null);
  const [showApproveConfirm, setShowApproveConfirm] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [processingApproval, setProcessingApproval] = useState(false);
  const [processingRejection, setProcessingRejection] = useState(false);
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

  useEffect(() => {
    applyFilters();
  }, [products, searchTerm, filterStatus]);

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

  const applyFilters = () => {
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

    if (filterStatus !== 'all') {
      list = list.filter((product) => getNormalizedProductStatus(product) === filterStatus);
    }

    setFilteredProducts(list);
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

  const openApprovePrompt = (product) => {
    setViewingProduct(product);
    setSelectedImageIndex(0);
    setShowRejectModal(false);
    setShowDeleteConfirm(false);
    setRejectReason('');
    setShowApproveConfirm(true);
  };

  const openRejectPrompt = (product) => {
    setViewingProduct(product);
    setSelectedImageIndex(0);
    setShowApproveConfirm(false);
    setShowDeleteConfirm(false);
    setRejectReason('');
    setShowRejectModal(true);
  };

  const openDeletePrompt = (product) => {
    setViewingProduct(product);
    setSelectedImageIndex(0);
    setShowApproveConfirm(false);
    setShowRejectModal(false);
    setShowDeleteConfirm(true);
  };

  const handleCloseViewDetail = () => {
    if (processingApproval || processingRejection) return;
    setViewingProduct(null);
    setShowApproveConfirm(false);
    setShowRejectModal(false);
    setShowDeleteConfirm(false);
    setRejectReason('');
    setSelectedImageIndex(0);
  };

  const handleApproveClick = () => {
    setShowApproveConfirm(true);
  };

  const handleApproveConfirm = async () => {
    if (!viewingProduct) return;

    try {
      setProcessingApproval(true);
      await processProductApproval({
        productId: viewingProduct.id,
        action: 'APPROVE'
      });
      notify.success('Sản phẩm đã được duyệt thành công!');
      setShowApproveConfirm(false);
      setViewingProduct(null);
      setRejectReason('');
      await fetchProducts();
    } catch (err) {
      console.error('Error approving product:', err);
      notify.error('Không thể duyệt sản phẩm. Vui lòng thử lại.');
    } finally {
      setProcessingApproval(false);
    }
  };

  const handleRejectClick = () => {
    setShowRejectModal(true);
    setRejectReason('');
  };

  const handleDeleteClick = () => {
    setShowDeleteConfirm(true);
  };

  const handleRejectSubmit = async () => {
    if (!viewingProduct) return;
    if (!rejectReason.trim()) {
      notify.warning('Vui lòng nhập lý do không duyệt.');
      return;
    }

    try {
      setProcessingRejection(true);
      await processProductApproval({
        productId: viewingProduct.id,
        action: 'REJECT',
        reason: rejectReason.trim()
      });
      notify.success('Sản phẩm không được duyệt. Lý do đã được lưu.');
      setShowRejectModal(false);
      setRejectReason('');
      setViewingProduct(null);
      await fetchProducts();
    } catch (err) {
      console.error('Error rejecting product:', err);
      notify.error('Không thể từ chối sản phẩm. Vui lòng thử lại.');
    } finally {
      setProcessingRejection(false);
    }
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
            <h2 className={cx('title')}>Duyệt sản phẩm</h2>
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
              <div className={cx('sortGroup')}>
                <span className={cx('sortLabel')}>Trạng thái:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className={cx('sortSelect')}
                >
                  <option value="all">Tất cả</option>
                  <option value="CHO_DUYET">Chờ duyệt</option>
                  <option value="DA_DUYET">Đã duyệt</option>
                  <option value="TU_CHOI">Từ chối</option>
                </select>
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
                  <th>Trạng thái</th>
                  <th>Trọng lượng</th>
                  <th>Ngày gửi</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.length === 0 ? (
                  <tr>
                    <td colSpan="8" className={cx('empty')}>
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
                      <td>{getStatusBadge(product.status, product)}</td>
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
                          {normalizeStatus(product.status) === 'CHO_DUYET' && (
                            <>
                              <button
                                type="button"
                                className={cx('actionBtn', 'approveBtn')}
                                onClick={() => openApprovePrompt(product)}
                                title="Duyệt sản phẩm"
                              >
                                <FontAwesomeIcon icon={faCheck} /> Duyệt
                              </button>
                              <button
                                type="button"
                                className={cx('actionBtn', 'rejectBtn')}
                                onClick={() => openRejectPrompt(product)}
                                title="Không duyệt"
                              >
                                <FontAwesomeIcon icon={faXmark} /> Không duyệt
                              </button>
                            </>
                          )}
                          <button
                            type="button"
                            className={cx('actionBtn', 'deleteBtn')}
                            onClick={() => openDeletePrompt(product)}
                            title="Xóa sản phẩm"
                          >
                            <FontAwesomeIcon icon={faTrash} /> Xóa
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
          onApprove={handleApproveClick}
          onReject={handleRejectClick}
          onDelete={handleDeleteClick}
          processingApproval={processingApproval}
          processingRejection={processingRejection}
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

      {/* Modal Xác Nhận Duyệt */}
      {showApproveConfirm && (
        <div className={cx('modalOverlay')} onClick={() => setShowApproveConfirm(false)}>
          <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3>Xác nhận duyệt sản phẩm</h3>
              <button type="button" className={cx('closeBtn')} onClick={() => setShowApproveConfirm(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className={cx('form')}>
              <p>Bạn có chắc chắn muốn duyệt sản phẩm này không?</p>
              <div className={cx('formActions')}>
                <button type="button" className={cx('cancelBtn')} onClick={() => setShowApproveConfirm(false)}>
                  Hủy
                </button>
                <button
                  type="button"
                  className={cx('approveBtn')}
                  onClick={handleApproveConfirm}
                  disabled={processingApproval}
                >
                  {processingApproval ? 'Đang duyệt...' : 'Xác nhận'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal Nhập Lý Do Từ Chối */}
      {showRejectModal && (
        <div className={cx('modalOverlay')} onClick={() => setShowRejectModal(false)}>
          <div className={cx('modal')} onClick={(e) => e.stopPropagation()}>
            <div className={cx('modalHeader')}>
              <h3>Nhập lý do không duyệt</h3>
              <button type="button" className={cx('closeBtn')} onClick={() => setShowRejectModal(false)}>
                <FontAwesomeIcon icon={faTimes} />
              </button>
            </div>
            <div className={cx('form')}>
              <div className={cx('formGroup')}>
                <label>Lý do không duyệt *</label>
                <textarea
                  rows="4"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Nhập lý do không duyệt sản phẩm..."
                />
              </div>
              <div className={cx('formActions')}>
                <button type="button" className={cx('cancelBtn')} onClick={() => setShowRejectModal(false)}>
                  Hủy
                </button>
                <button
                  type="button"
                  className={cx('rejectBtn')}
                  onClick={handleRejectSubmit}
                  disabled={processingRejection}
                >
                  {processingRejection ? 'Đang gửi...' : 'Gửi'}
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

