import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './ProductDetail.module.scss';
import image1 from '~/assets/images/products/image1.jpg';

const cx = classNames.bind(styles);

function ProductDetail() {
  const { id } = useParams();
  const [selectedColor, setSelectedColor] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');

  // Mock product data
  const productId = Number(id);
  const product = {
    id: productId,
    brand: 'SAGE BEAUTY',
    name: `Sản phẩm làm đẹp cao cấp #${productId}`,
    description:
      'Sản phẩm chất lượng cao với thành phần thiên nhiên, phù hợp cho mọi loại da. Cam kết hàng chính hãng, đảm bảo hiệu quả tối ưu.',
    price: `${299000 + (productId - 1) * 10000}`,
    oldPrice: `${399000 + (productId - 1) * 10000}`,
    rating: 5,
    reviews: 12,
    sku: `SKU-${String(productId).padStart(6, '0')}`,
    origin: 'Hàn Quốc',
    images: [image1, image1, image1, image1], // Mock multiple images
    colors: [
      { id: 1, name: '02 Affection', value: '#FF69B4' },
      { id: 2, name: '01 Natural', value: '#8B4513' },
      { id: 3, name: '03 Coral', value: '#FF6347' },
      { id: 4, name: '04 Red', value: '#DC143C' },
      { id: 5, name: '05 Pink', value: '#FFB6C1' },
      { id: 6, name: '06 Green', value: '#90EE90' },
    ],
  };

  const productInfo = [
    { label: 'Nơi sản xuất', value: 'Hàn Quốc' },
    { label: 'Thương hiệu', value: 'KLAIRS' },
    { label: 'Đặc tính', value: 'Ngày Và Đêm' },
    { label: 'Vấn đề về da', value: 'Da thiếu nước, thiếu ẩm' },
    { label: 'Kết cấu', value: 'Dạng nước' },
    { label: 'Xuất xứ thương hiệu', value: 'Hàn Quốc' },
  ];

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  return (
    <div className={cx('wrapper')}>
      {/* Breadcrumb */}
      <div className={cx('breadcrumb')}>
        <Link to="/">Trang chủ</Link>
        <span> / </span>
        <Link to="/products">Sản phẩm</Link>
        <span> / </span>
        <span>{product.name}</span>
      </div>

      <div className={cx('container')}>
        {/* Left: Image Gallery */}
        <div className={cx('image-section')}>
          <div className={cx('main-image')}>
            <img src={product.images[selectedImage]} alt={product.name} />
          </div>
          <div className={cx('thumbnail-list')}>
            {product.images.map((img, index) => (
              <div
                key={index}
                className={cx('thumbnail', { active: selectedImage === index })}
                onClick={() => setSelectedImage(index)}
              >
                <img src={img} alt={`${product.name} ${index + 1}`} />
              </div>
            ))}
          </div>
        </div>

        {/* Right: Product Information */}
        <div className={cx('info-section')}>
          <div className={cx('brand')}>{product.brand}</div>
          <h1 className={cx('product-name')}>{product.name}</h1>

          <div className={cx('rating-section')}>
            <div className={cx('stars')}>
              {[...Array(5)].map((_, i) => (
                <span key={i} className={cx('star', { filled: i < product.rating })}>
                  ★
                </span>
              ))}
            </div>
            <span className={cx('reviews')}>({product.reviews})</span>
            <span className={cx('origin')}>Xuất xứ: {product.origin}</span>
            <span className={cx('sku')}>SKU: {product.sku}</span>
          </div>

          <div className={cx('price-section')}>
            <div className={cx('current-price')}>{parseInt(product.price).toLocaleString('vi-VN')}đ</div>
            {product.oldPrice && (
              <div className={cx('old-price-wrapper')}>
                <span className={cx('old-price')}>{parseInt(product.oldPrice).toLocaleString('vi-VN')}đ</span>
                <span className={cx('discount-tag')}>-20%</span>
              </div>
            )}
          </div>

          <div className={cx('color-section')}>
            <label className={cx('color-label')}>
              Color: <span className={cx('color-name')}>{product.colors[selectedColor].name}</span>
            </label>
            <div className={cx('color-options')}>
              {product.colors.map((color, index) => (
                <button
                  key={color.id}
                  className={cx('color-btn', { selected: selectedColor === index })}
                  style={{ backgroundColor: color.value }}
                  onClick={() => setSelectedColor(index)}
                  aria-label={color.name}
                />
              ))}
            </div>
          </div>

          <div className={cx('quantity-section')}>
            <label className={cx('quantity-label')}>Số lượng:</label>
            <div className={cx('quantity-control')}>
              <button onClick={() => handleQuantityChange(-1)} className={cx('qty-btn')}>
                -
              </button>
              <input type="number" value={quantity} readOnly className={cx('qty-input')} />
              <button onClick={() => handleQuantityChange(1)} className={cx('qty-btn')}>
                +
              </button>
            </div>
          </div>

          <div className={cx('action-buttons')}>
            <button className={cx('btn-cart')}>
              <span>🛒</span> Thêm vào giỏ hàng
            </button>
            <button className={cx('btn-buy-now')}>MUA NGAY</button>
            <button className={cx('btn-favorite')}>❤️</button>
          </div>

          <div className={cx('benefits')}>
            <div className={cx('benefit-item')}>
              <span>✓</span> Miễn phí giao hàng 24h
            </div>
            <div className={cx('benefit-item')}>
              <span>✓</span> Cam kết hàng chính hãng
            </div>
            <div className={cx('benefit-item')}>
              <span>✓</span> Đổi/trả hàng trong 7 ngày
            </div>
          </div>

          <div className={cx('description-section')}>
            <h3>Mô tả sản phẩm</h3>
            <p>{product.description}</p>
          </div>
        </div>
      </div>

      {/* Product Info Table */}
      <div className={cx('description-section')}>
        <h3>Thông tin sản phẩm</h3>
        <div style={{ overflowX: 'auto' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse' }}>
            <tbody>
              {productInfo.map((row, idx) => (
                <tr key={idx} style={{ borderTop: '1px solid #eee' }}>
                  <td style={{ width: '28%', padding: '14px 16px', background: '#f8f9fa', fontWeight: 600 }}>
                    {row.label}
                  </td>
                  <td style={{ padding: '14px 16px' }}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Tabs */}
      <div className={cx('description-section')}>
        <div style={{ display: 'flex', gap: 12, borderBottom: '1px solid #eee', marginBottom: 16 }}>
          {[
            { id: 'description', label: 'Mô tả sản phẩm' },
            { id: 'ingredients', label: 'Thành phần' },
            { id: 'benefits', label: 'Công dụng' },
            { id: 'howto', label: 'Cách dùng' },
            { id: 'reviews', label: 'Review' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => setActiveTab(t.id)}
              style={{
                padding: '10px 14px',
                border: 'none',
                background: activeTab === t.id ? '#ff80b5' : 'transparent',
                color: activeTab === t.id ? '#fff' : '#2c3e50',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
              }}
            >
              {t.label}
            </button>
          ))}
        </div>

        {activeTab === 'description' && (
          <div>
            <p>
              Nước Hoa Hồng Klairs Supple Preparation là sản phẩm đến từ thương hiệu mỹ phẩm nổi tiếng của Hàn Quốc. Với
              chiết xuất từ thực vật tự nhiên an toàn, giúp cân bằng độ pH và làm dịu da.
            </p>
          </div>
        )}

        {activeTab === 'ingredients' && (
          <div>
            <h4>Thành phần chính</h4>
            <ul>
              <li>
                <b>Sodium Hyaluronate:</b> Giữ ẩm, cải thiện độ săn chắc.
              </li>
              <li>
                <b>Chiết xuất lô hội:</b> Làm dịu mát da.
              </li>
              <li>
                <b>Phyto-Oligo:</b> Dưỡng ẩm, giúp da mềm mịn.
              </li>
              <li>
                <b>Axit Amin lúa mì:</b> Giảm viêm, cung cấp ẩm sâu.
              </li>
              <li>
                <b>Chiết xuất rau sâm:</b> Ngăn ngừa lão hóa.
              </li>
            </ul>
          </div>
        )}

        {activeTab === 'benefits' && (
          <div>
            <ul>
              <li>Hỗ trợ cân bằng độ pH, làm dịu da.</li>
              <li>Giảm nguy cơ kích ứng, cấp ẩm sâu.</li>
              <li>Tăng hiệu quả cho các bước skincare tiếp theo.</li>
            </ul>
          </div>
        )}

        {activeTab === 'howto' && (
          <div>
            <p>
              Sử dụng sau bước làm sạch. Đổ lượng vừa đủ ra bông tẩy trang hoặc tay sạch, thoa đều và vỗ nhẹ cho thẩm
              thấu. Dùng sáng và tối.
            </p>
          </div>
        )}

        {activeTab === 'reviews' && (
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 16 }}>
              <div style={{ fontSize: 48, fontWeight: 700, color: '#ff80b5' }}>0</div>
              <div style={{ color: '#666' }}>Chưa có đánh giá</div>
            </div>
            <div>
              <h4>Đánh giá sản phẩm này</h4>
              <div style={{ display: 'flex', gap: 6, margin: '8px 0 12px' }}>
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} style={{ fontSize: 22, color: '#ddd' }}>
                    ★
                  </span>
                ))}
              </div>
              <textarea
                rows={4}
                placeholder="Nhập mô tả ở đây"
                style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }}
              />
              <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  style={{
                    padding: '10px 16px',
                    background: '#2c3e50',
                    color: '#fff',
                    border: 'none',
                    borderRadius: 8,
                    cursor: 'pointer',
                  }}
                >
                  Gửi
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default ProductDetail;
