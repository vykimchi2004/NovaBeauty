import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useParams } from 'react-router-dom';
import classNames from 'classnames/bind';
import styles from './ProductDetail.module.scss';
import image1 from '~/assets/images/products/image1.jpg';

const TABS = [
  { id: 'description', label: 'Mô tả sản phẩm' },
  { id: 'ingredients', label: 'Thành phần' },
  { id: 'benefits', label: 'Công dụng' },
  { id: 'howto', label: 'Cách dùng' },
  { id: 'highlights', label: 'Review' },
];

const PRODUCT_INFO = [
  { label: 'Nơi sản xuất', value: 'Hàn Quốc' },
  { label: 'Thương hiệu', value: 'KLAIRS' },
  { label: 'Đặc tính', value: 'Ngày Và Đêm' },
  { label: 'Vấn đề về da', value: 'Da thiếu nước, thiếu ẩm' },
  { label: 'Kết cấu', value: 'Dạng nước' },
  { label: 'Xuất xứ thương hiệu', value: 'Hàn Quốc' },
];

const DESCRIPTION_PARAGRAPHS = [
  'Nước hoa hồng dịu nhẹ giúp cân bằng và làm tươi mới làn da ngay sau khi làm sạch.',
  'Kết cấu mỏng nhẹ, thấm nhanh, phù hợp sử dụng hằng ngày cho mọi loại da.',
];

const INGREDIENTS = [
  { title: 'Sodium Hyaluronate', description: 'Khóa ẩm và giữ nước lâu dài cho da căng mịn.' },
  { title: 'Chiết xuất lô hội', description: 'Làm dịu tức thì, giảm đỏ rát và hỗ trợ phục hồi da.' },
  { title: 'Phyto-Oligo', description: 'Nuôi dưỡng hàng rào bảo vệ, tăng độ mềm mượt.' },
];

const BENEFITS = [
  { title: 'Cân bằng pH', description: 'Đưa da về trạng thái ổn định sau bước làm sạch.' },
  { title: 'Dưỡng ẩm nhanh', description: 'Bổ sung độ ẩm tức thì, hạn chế căng khô.' },
  { title: 'Tăng hiệu quả dưỡng da', description: 'Giúp các sản phẩm kế tiếp thẩm thấu tốt hơn.' },
];

const HOW_TO_STEPS = [
  { title: 'Bước 1', description: 'Làm sạch da và lau khô nhẹ nhàng.' },
  { title: 'Bước 2', description: 'Thấm toner ra bông hoặc tay, áp đều lên mặt.' },
  { title: 'Bước 3', description: 'Tiếp tục serum và kem dưỡng yêu thích.' },
];
const HIGHLIGHTS = [
  { title: 'Thành phần lành tính', description: 'Không cồn, không hương liệu, thân thiện làn da nhạy cảm.' },
  { title: 'Hiệu quả nhanh', description: 'Da mềm hơn rõ rệt chỉ sau vài lần dùng.' },
  { title: 'Phù hợp nhiều loại da', description: 'Giữ ẩm tốt cho da khô, vẫn nhẹ nhàng cho da dầu.' },
];

const REVIEW_STARS = [1, 2, 3, 4, 5];

const createMockProduct = (productId) => ({
  id: productId,
  brand: 'NOVA BEAUTY',
  name: `Sản phẩm làm đẹp cao cấp #${productId}`,
  description: 'Toner dịu nhẹ dưỡng ẩm mỗi ngày, phù hợp mọi loại da.',
  price: `${299000 + (productId - 1) * 10000}`,
  oldPrice: `${399000 + (productId - 1) * 10000}`,
  rating: 5,
  reviews: 12,
  sku: `SKU-${String(productId).padStart(6, '0')}`,
  origin: 'Hàn Quốc',
  images: [image1, image1, image1, image1],
  colors: [
    { id: 1, name: '02 Affection', value: '#FF69B4' },
    { id: 2, name: '01 Natural', value: '#8B4513' },
    { id: 3, name: '03 Coral', value: '#FF6347' },
    { id: 4, name: '04 Red', value: '#DC143C' },
    { id: 5, name: '05 Pink', value: '#FFB6C1' },
    { id: 6, name: '06 Green', value: '#90EE90' },
  ],
});

const cx = classNames.bind(styles);

function ProductDetail() {
  const { id } = useParams();
  const [selectedColor, setSelectedColor] = useState(0);
  const [quantity, setQuantity] = useState(1);
  const [selectedImage, setSelectedImage] = useState(0);
  const [activeTab, setActiveTab] = useState('description');
  const [showFixedTabs, setShowFixedTabs] = useState(false);
  const tabsSectionRef = useRef(null);
  const tabsContainerRef = useRef(null);
  const contentRefs = {
    description: useRef(null),
    ingredients: useRef(null),
    benefits: useRef(null),
    howto: useRef(null),
    highlights: useRef(null),
  };

  const productId = Number(id);
  const product = useMemo(() => createMockProduct(productId), [productId]);

  const smoothScrollTo = (targetPosition, duration = 600) => {
    const startPosition = window.pageYOffset || document.documentElement.scrollTop;
    const distance = targetPosition - startPosition;
    let startTime = null;

    const animation = (currentTime) => {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      const ease = progress < 0.5
        ? 2 * progress * progress
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;

      window.scrollTo(0, startPosition + distance * ease);

      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    };

    requestAnimationFrame(animation);
  };

  useEffect(() => {
    const handleScroll = () => {
      let isFixed = false;

      if (tabsSectionRef.current) {
        const rect = tabsSectionRef.current.getBoundingClientRect();
        isFixed = rect.top <= 0;
        setShowFixedTabs(isFixed);
      }

      const headerOffset = isFixed && tabsContainerRef.current
        ? tabsContainerRef.current.offsetHeight + 20
        : (tabsSectionRef.current?.offsetTop || 0) - window.pageYOffset + 20;

      const scrollPosition = window.pageYOffset + headerOffset + 1;
      let currentTab = TABS[0].id;

      TABS.forEach(({ id }) => {
        const section = contentRefs[id]?.current;
        if (!section) return;
        const sectionTop = section.offsetTop;

        if (sectionTop <= scrollPosition) {
          currentTab = id;
        }
      });

      setActiveTab((prev) => (prev === currentTab ? prev : currentTab));
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    handleScroll();

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    if (contentRefs[tabId]?.current) {
      const element = contentRefs[tabId].current;
      if (!element) return;
      
      requestAnimationFrame(() => {
        const fixedTabsHeight = showFixedTabs && tabsContainerRef.current 
          ? tabsContainerRef.current.offsetHeight 
          : 0;
        const offset = fixedTabsHeight > 0 ? fixedTabsHeight + 20 : 20;
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        const elementRect = element.getBoundingClientRect();
        const elementTop = elementRect.top + currentScrollTop;
        const targetPosition = Math.max(0, elementTop - offset);
        if (targetPosition > currentScrollTop || elementRect.top < offset) {
          smoothScrollTo(targetPosition, 600);
        }
      });
    }
  };

  return (
    <div className={cx('wrapper')}>

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
        <div className={cx('info-table-wrapper')}>
          <table className={cx('info-table')}>
            <tbody>
              {PRODUCT_INFO.map((row, idx) => (
                <tr key={idx} className={cx('info-row')}>
                  <td className={cx('info-cell-label')}>{row.label}</td>
                  <td className={cx('info-cell-value')}>{row.value}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Detail Tabs */}
      <div className={cx('description-section')} ref={tabsSectionRef}>
        {/* Fixed tabs that appear when scrolling */}
        {showFixedTabs && (
          <div className={cx('tabs-container', 'tabs-fixed')} ref={tabsContainerRef}>
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => handleTabClick(t.id)}
                className={cx('tab-button', { active: activeTab === t.id })}
              >
                {t.label}
              </button>
            ))}
          </div>
        )}
        
        {/* Original tabs container */}
        <div className={cx('tabs-container')}>
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabClick(t.id)}
              className={cx('tab-button', { active: activeTab === t.id })}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Description Section */}
        <div ref={contentRefs.description} className={cx('tab-content')}>
          <h4 className={cx('content-title')}>Mô tả sản phẩm</h4>
          {DESCRIPTION_PARAGRAPHS.map((text, idx) => (
            <p key={idx}>{text}</p>
          ))}
        </div>

        {/* Ingredients Section */}
        <div ref={contentRefs.ingredients} className={cx('tab-content')}>
          <h4 className={cx('content-title')}>Thành phần</h4>
          <p>Sản phẩm được tạo nên từ các thành phần tự nhiên cao cấp, được lựa chọn kỹ lưỡng để đảm bảo an toàn và hiệu quả tối đa cho làn da.</p>
          <ul className={cx('ingredients-list')}>
            {INGREDIENTS.map(({ title, description }) => (
              <li key={title}>
                <strong>{title}:</strong> {description}
              </li>
            ))}
          </ul>
        </div>

        {/* Benefits Section */}
        <div ref={contentRefs.benefits} className={cx('tab-content')}>
          <h4 className={cx('content-title')}>Công dụng</h4>
          <p>Nước Hoa Hồng Klairs Supple Preparation mang lại nhiều lợi ích vượt trội cho làn da của bạn:</p>
          <ul className={cx('benefits-list')}>
            {BENEFITS.map(({ title, description }) => (
              <li key={title}>
                <strong>{title}:</strong> {description}
              </li>
            ))}
          </ul>
        </div>

        {/* How to Use Section */}
        <div ref={contentRefs.howto} className={cx('tab-content')}>
          <h4 className={cx('content-title')}>Cách dùng</h4>
          <p>Để đạt được hiệu quả tối ưu, bạn nên sử dụng sản phẩm theo các bước sau:</p>
          <ol className={cx('howto-list')}>
            {HOW_TO_STEPS.map(({ title, description }) => (
              <li key={title}>
                <strong>{title}:</strong> {description}
              </li>
            ))}
          </ol>
          <p className={cx('note')}>
            <strong>Lưu ý:</strong> Tránh để sản phẩm tiếp xúc với mắt. Nếu vô tình dính vào mắt, hãy rửa ngay bằng nước
            sạch. Bảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp.
          </p>
        </div>

        {/* Highlights Section */}
        <div ref={contentRefs.highlights} className={cx('tab-content')}>
          <h4 className={cx('content-title')}>Review</h4>
          <p>Sản phẩm này được đánh giá cao bởi những ưu điểm vượt trội sau:</p>
          <ul className={cx('highlights-list')}>
            {HIGHLIGHTS.map(({ title, description }) => (
              <li key={title}>
                <span className={cx('check-icon')}>✓</span>
                <div>
                  <strong>{title}:</strong> {description}
                </div>
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Reviews Section - Moved to bottom */}
      <div className={cx('description-section')}>
        <h3 className={cx('reviews-title')}>Đánh giá sản phẩm</h3>
        <div className={cx('reviews-summary')}>
          <div className={cx('reviews-score')}>{product.rating}.0</div>
          <div className={cx('reviews-summary-content')}>
            <div className={cx('reviews-stars')}>
              {REVIEW_STARS.map((star) => (
                <span key={star} className={cx('reviews-star', { filled: star <= product.rating })}>
                  ★
                </span>
              ))}
            </div>
            <div className={cx('reviews-count')}>Dựa trên {product.reviews} đánh giá</div>
          </div>
        </div>

        <div className={cx('review-form')}>
          <h4>Viết đánh giá của bạn</h4>
          <div className={cx('review-rating-input')}>
            {REVIEW_STARS.map((star) => (
              <span key={star} className={cx('review-form-star')}>
                ★
              </span>
            ))}
          </div>
          <textarea
            rows={4}
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
            className={cx('review-textarea')}
          />
          <div className={cx('review-actions')}>
            <button className={cx('review-submit')}>Gửi đánh giá</button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
