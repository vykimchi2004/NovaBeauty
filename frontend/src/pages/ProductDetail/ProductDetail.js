import React, { useState, useRef, useEffect } from 'react';
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

  // Mock product data
  const productId = Number(id);
  const product = {
    id: productId,
    brand: 'NOVA BEAUTY',
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

  // Custom smooth scroll function
  const smoothScrollTo = (targetPosition, duration = 600) => {
    const startPosition = window.pageYOffset || document.documentElement.scrollTop;
    const distance = targetPosition - startPosition;
    let startTime = null;

    function animation(currentTime) {
      if (startTime === null) startTime = currentTime;
      const timeElapsed = currentTime - startTime;
      const progress = Math.min(timeElapsed / duration, 1);
      
      // Easing function for smooth animation (ease-in-out)
      const ease = progress < 0.5 
        ? 2 * progress * progress 
        : 1 - Math.pow(-2 * progress + 2, 2) / 2;
      
      window.scrollTo(0, startPosition + distance * ease);
      
      if (timeElapsed < duration) {
        requestAnimationFrame(animation);
      }
    }

    requestAnimationFrame(animation);
  };

  useEffect(() => {
    const handleScroll = () => {
      if (tabsSectionRef.current) {
        const rect = tabsSectionRef.current.getBoundingClientRect();
        // Show fixed tabs when the tabs section reaches the top
        setShowFixedTabs(rect.top <= 0);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Check initial state

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const handleQuantityChange = (delta) => {
    setQuantity((prev) => Math.max(1, prev + delta));
  };

  const handleTabClick = (tabId) => {
    setActiveTab(tabId);
    // Scroll to content section when clicking a tab with smooth animation
    if (contentRefs[tabId]?.current) {
      const element = contentRefs[tabId].current;
      if (!element) return;
      
      // Wait for next frame to ensure DOM is ready
      requestAnimationFrame(() => {
        // Get the fixed tabs height for offset calculation
        const fixedTabsHeight = showFixedTabs && tabsContainerRef.current 
          ? tabsContainerRef.current.offsetHeight 
          : 0;
        const offset = fixedTabsHeight > 0 ? fixedTabsHeight + 20 : 20;
        
        // Get current scroll position
        const currentScrollTop = window.pageYOffset || document.documentElement.scrollTop;
        
        // Get element position relative to viewport
        const elementRect = element.getBoundingClientRect();
        const elementTop = elementRect.top + currentScrollTop;
        
        // Calculate target position with offset
        const targetPosition = Math.max(0, elementTop - offset);
        
        // Check if we need to scroll (element is below current position)
        if (targetPosition > currentScrollTop || elementRect.top < offset) {
          // Use custom smooth scroll function for guaranteed smooth animation
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
      <div className={cx('description-section')} ref={tabsSectionRef}>
        {/* Fixed tabs that appear when scrolling */}
        {showFixedTabs && (
          <div className={cx('tabs-container', 'tabs-fixed')} ref={tabsContainerRef}>
            {[
              { id: 'description', label: 'Mô tả sản phẩm' },
              { id: 'ingredients', label: 'Thành phần' },
              { id: 'benefits', label: 'Công dụng' },
              { id: 'howto', label: 'Cách dùng' },
              { id: 'highlights', label: 'Review' },
            ].map((t) => (
              <button
                key={t.id}
                onClick={() => handleTabClick(t.id)}
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
        )}
        
        {/* Original tabs container */}
        <div className={cx('tabs-container')}>  
          {[
            { id: 'description', label: 'Mô tả sản phẩm' },
            { id: 'ingredients', label: 'Thành phần' },
            { id: 'benefits', label: 'Công dụng' },
            { id: 'howto', label: 'Cách dùng' },
            { id: 'highlights', label: 'Review' },
          ].map((t) => (
            <button
              key={t.id}
              onClick={() => handleTabClick(t.id)}
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

        {/* Description Section */}
        <div ref={contentRefs.description} className={cx('tab-content')}>
          <h4 className={cx('content-title')}>Mô tả sản phẩm</h4>
          <p>
            Nước Hoa Hồng Klairs Supple Preparation là sản phẩm đến từ thương hiệu mỹ phẩm nổi tiếng của Hàn Quốc. Với
            chiết xuất từ thực vật tự nhiên an toàn, giúp cân bằng độ pH và làm dịu da.
          </p>
          <p>
            Sản phẩm được nghiên cứu và phát triển bởi đội ngũ chuyên gia hàng đầu về chăm sóc da, với công thức độc đáo
            kết hợp giữa công nghệ hiện đại và tinh chất thiên nhiên. Nước hoa hồng này không chỉ giúp làm sạch sâu mà
            còn cung cấp độ ẩm cần thiết cho da, tạo nền tảng hoàn hảo cho các bước skincare tiếp theo.
          </p>
          <p>
            Được thiết kế đặc biệt cho làn da nhạy cảm, sản phẩm không chứa cồn, không gây kích ứng, phù hợp sử dụng hàng
            ngày. Với kết cấu nhẹ nhàng, dễ thấm, không để lại cảm giác nhờn rít, mang lại cảm giác tươi mát và sảng khoái
            cho làn da.
          </p>
        </div>

        {/* Ingredients Section */}
        <div ref={contentRefs.ingredients} className={cx('tab-content')}>
          <h4 className={cx('content-title')}>Thành phần</h4>
          <p>
            Sản phẩm được tạo nên từ các thành phần tự nhiên cao cấp, được lựa chọn kỹ lưỡng để đảm bảo an toàn và hiệu quả
            tối đa cho làn da.
          </p>
          <ul className={cx('ingredients-list')}>
            <li>
              <b>Sodium Hyaluronate:</b> Đây là một dạng muối của axit hyaluronic, có khả năng giữ ẩm vượt trội. Thành phần
              này giúp cải thiện độ săn chắc và đàn hồi của da, làm mờ nếp nhăn và mang lại làn da căng bóng, mịn màng.
              Sodium Hyaluronate có khả năng giữ nước gấp 1000 lần trọng lượng của nó, giúp da luôn được dưỡng ẩm sâu.
            </li>
            <li>
              <b>Chiết xuất lô hội (Aloe Vera Extract):</b> Được biết đến với đặc tính làm dịu và chống viêm tự nhiên,
              chiết xuất lô hội giúp làm mát da, giảm kích ứng và đỏ da. Thành phần này cũng hỗ trợ quá trình phục hồi da,
              giúp làn da trở nên khỏe mạnh và tươi trẻ hơn.
            </li>
            <li>
              <b>Phyto-Oligo:</b> Một thành phần dưỡng ẩm độc đáo được chiết xuất từ thực vật, giúp dưỡng ẩm sâu cho da,
              cải thiện kết cấu da và mang lại cảm giác mềm mịn. Phyto-Oligo cũng hỗ trợ củng cố hàng rào bảo vệ da tự nhiên,
              giúp da khỏe mạnh hơn.
            </li>
            <li>
              <b>Axit Amin lúa mì (Wheat Amino Acids):</b> Có khả năng giảm viêm và kích ứng, đồng thời cung cấp độ ẩm sâu
              cho da. Thành phần này giúp làm dịu da, giảm mẩn đỏ và hỗ trợ quá trình tái tạo tế bào da, mang lại làn da
              mịn màng và sáng khỏe.
            </li>
            <li>
              <b>Chiết xuất rau sâm (Panax Ginseng Root Extract):</b> Một trong những thành phần quý giá với đặc tính chống
              oxy hóa mạnh mẽ, giúp ngăn ngừa lão hóa da. Chiết xuất này giúp cải thiện độ đàn hồi của da, làm mờ nếp nhăn
              và mang lại làn da trẻ trung, rạng rỡ.
            </li>
          </ul>
        </div>

        {/* Benefits Section */}
        <div ref={contentRefs.benefits} className={cx('tab-content')}>
          <h4 className={cx('content-title')}>Công dụng</h4>
          <p>
            Nước Hoa Hồng Klairs Supple Preparation mang lại nhiều lợi ích vượt trội cho làn da của bạn:
          </p>
          <ul className={cx('benefits-list')}>
            <li>
              <strong>Hỗ trợ cân bằng độ pH:</strong> Sau khi làm sạch, da thường có độ pH cao hơn bình thường. Sản phẩm
              giúp cân bằng độ pH tự nhiên của da về mức lý tưởng (5.5), tạo môi trường lành mạnh cho da và giúp da hoạt động
              tốt nhất. Đồng thời, sản phẩm cũng có tác dụng làm dịu da, giảm cảm giác căng kéo và khó chịu sau khi rửa mặt.
            </li>
            <li>
              <strong>Giảm nguy cơ kích ứng và cấp ẩm sâu:</strong> Với các thành phần dịu nhẹ, không chứa cồn và các chất
              gây kích ứng, sản phẩm giúp giảm thiểu nguy cơ kích ứng da. Đồng thời, các thành phần dưỡng ẩm như Sodium
              Hyaluronate và Phyto-Oligo giúp cấp ẩm sâu cho da, mang lại làn da mềm mịn, căng bóng và đàn hồi.
            </li>
            <li>
              <strong>Tăng hiệu quả cho các bước skincare tiếp theo:</strong> Khi da được cân bằng pH và dưỡng ẩm đầy đủ,
              các sản phẩm skincare tiếp theo sẽ được hấp thụ tốt hơn. Nước hoa hồng này giúp chuẩn bị da sẵn sàng cho các
              bước dưỡng da tiếp theo, tăng cường hiệu quả của serum, kem dưỡng và các sản phẩm khác trong quy trình
              skincare của bạn.
            </li>
            <li>
              <strong>Củng cố hàng rào bảo vệ da:</strong> Các thành phần như axit amin và chiết xuất thực vật giúp củng
              cố hàng rào bảo vệ da tự nhiên, giúp da khỏe mạnh hơn và chống lại các tác nhân gây hại từ môi trường.
            </li>
          </ul>
        </div>

        {/* How to Use Section */}
        <div ref={contentRefs.howto} className={cx('tab-content')}>
          <h4 className={cx('content-title')}>Cách dùng</h4>
          <p>
            Để đạt được hiệu quả tối ưu, bạn nên sử dụng sản phẩm theo các bước sau:
          </p>
          <ol className={cx('howto-list')}>
            <li>
              <strong>Bước 1 - Làm sạch da:</strong> Trước tiên, hãy làm sạch da mặt bằng sữa rửa mặt phù hợp với loại da
              của bạn. Rửa sạch bằng nước ấm và lau khô nhẹ nhàng bằng khăn mềm.
            </li>
            <li>
              <strong>Bước 2 - Sử dụng Nước Hoa Hồng:</strong> Đổ một lượng vừa đủ (khoảng 3-5 giọt) ra bông tẩy trang hoặc
              lòng bàn tay sạch. Nếu dùng bông tẩy trang, thấm đều và nhẹ nhàng thoa lên toàn bộ khuôn mặt theo hướng từ
              trong ra ngoài, từ dưới lên trên. Nếu dùng tay, thoa đều và vỗ nhẹ cho đến khi sản phẩm thẩm thấu hoàn toàn.
            </li>
            <li>
              <strong>Bước 3 - Tiếp tục quy trình skincare:</strong> Sau khi nước hoa hồng đã thẩm thấu, bạn có thể tiếp
              tục với các bước skincare tiếp theo như serum, kem dưỡng mắt, kem dưỡng ẩm, và kem chống nắng (vào buổi sáng).
            </li>
            <li>
              <strong>Thời gian sử dụng:</strong> Sử dụng 2 lần mỗi ngày, vào buổi sáng và buổi tối, sau bước làm sạch và
              trước các bước dưỡng da khác. Để đạt kết quả tốt nhất, hãy kiên trì sử dụng hàng ngày.
            </li>
          </ol>
          <p className={cx('note')}>
            <strong>Lưu ý:</strong> Tránh để sản phẩm tiếp xúc với mắt. Nếu vô tình dính vào mắt, hãy rửa ngay bằng nước
            sạch. Bảo quản nơi khô ráo, thoáng mát, tránh ánh nắng trực tiếp.
          </p>
        </div>

        {/* Highlights Section */}
        <div ref={contentRefs.highlights} className={cx('tab-content')}>
          <h4 className={cx('content-title')}>Review</h4>
          <p>
            Sản phẩm này được đánh giá cao bởi những ưu điểm vượt trội sau:
          </p>
          <ul className={cx('highlights-list')}>
            <li>
              <span className={cx('check-icon')}>✓</span>
              <div>
                <strong>Thành phần thiên nhiên an toàn:</strong> Sản phẩm được chiết xuất từ các thành phần thiên nhiên,
                không chứa các hóa chất độc hại, an toàn cho mọi loại da, kể cả da nhạy cảm. Tất cả các thành phần đều đã
                được kiểm tra và chứng nhận an toàn, không gây kích ứng hay dị ứng.
              </div>
            </li>
            <li>
              <span className={cx('check-icon')}>✓</span>
              <div>
                <strong>Công nghệ dưỡng ẩm sâu:</strong> Với công thức độc đáo kết hợp Sodium Hyaluronate và các thành phần
                dưỡng ẩm khác, sản phẩm cung cấp độ ẩm sâu cho da, giúp da mềm mịn, căng bóng và tươi trẻ. Hiệu quả dưỡng
                ẩm có thể cảm nhận được ngay sau lần sử dụng đầu tiên.
              </div>
            </li>
            <li>
              <span className={cx('check-icon')}>✓</span>
              <div>
                <strong>Hàng chính hãng:</strong> Cam kết 100% hàng chính hãng, có tem chống giả và chứng nhận chất lượng
                từ nhà sản xuất. Mỗi sản phẩm đều được nhập khẩu trực tiếp từ Hàn Quốc, đảm bảo chất lượng và an toàn cho
                người sử dụng.
              </div>
            </li>
            <li>
              <span className={cx('check-icon')}>✓</span>
              <div>
                <strong>Hiệu quả nhanh chóng:</strong> Kết quả rõ rệt chỉ sau vài lần sử dụng. Da sẽ trở nên mịn màng hơn,
                cân bằng hơn và sẵn sàng hơn cho các bước skincare tiếp theo. Phù hợp với quy trình skincare hàng ngày,
                không tốn nhiều thời gian.
              </div>
            </li>
            <li>
              <span className={cx('check-icon')}>✓</span>
              <div>
                <strong>Phù hợp mọi loại da:</strong> Sản phẩm dịu nhẹ, không gây kích ứng, phù hợp với cả da nhạy cảm, da
                khô, da dầu và da hỗn hợp. Công thức không chứa cồn, không chứa hương liệu nhân tạo, an toàn cho mọi làn da.
              </div>
            </li>
          </ul>
        </div>
      </div>

      {/* Reviews Section - Moved to bottom */}
      <div className={cx('description-section')}>
        <h3 style={{ marginBottom: 24 }}>Đánh giá sản phẩm</h3>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, marginBottom: 32, padding: '20px', background: '#f8f9fa', borderRadius: 12 }}>
          <div style={{ fontSize: 48, fontWeight: 700, color: '#ff80b5' }}>{product.rating}.0</div>
          <div>
            <div style={{ display: 'flex', gap: 4, marginBottom: 8 }}>
              {[...Array(5)].map((_, i) => (
                <span key={i} style={{ fontSize: 24, color: i < product.rating ? '#ff80b5' : '#ddd' }}>
                  ★
                </span>
              ))}
            </div>
            <div style={{ color: '#666' }}>Dựa trên {product.reviews} đánh giá</div>
          </div>
        </div>
        
        <div style={{ marginTop: 32 }}>
          <h4 style={{ marginBottom: 16 }}>Viết đánh giá của bạn</h4>
          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            {[1, 2, 3, 4, 5].map((s) => (
              <span key={s} style={{ fontSize: 22, color: '#ddd', cursor: 'pointer' }}>
                ★
              </span>
            ))}
          </div>
          <textarea
            rows={4}
            placeholder="Chia sẻ trải nghiệm của bạn về sản phẩm này..."
            style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb', fontFamily: 'inherit' }}
          />
          <div style={{ marginTop: 12, display: 'flex', justifyContent: 'flex-end' }}>
            <button
              style={{
                padding: '10px 24px',
                background: '#ff80b5',
                color: '#fff',
                border: 'none',
                borderRadius: 8,
                cursor: 'pointer',
                fontWeight: 600,
                fontSize: 14,
              }}
            >
              Gửi đánh giá
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default ProductDetail;
