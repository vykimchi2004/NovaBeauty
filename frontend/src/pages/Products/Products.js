import React from 'react';
import classNames from 'classnames/bind';
import styles from '../Categories/Makeup/Category.module.scss';
import image1 from '~/assets/images/products/image1.jpg';
import { Link } from 'react-router-dom';
import { scrollToTop } from '~/services/utils';

const cx = classNames.bind(styles);

function Products() {
  // Mock all-products list (mixed categories)
  const products = Array.from({ length: 12 }).map((_, i) => ({
    id: i + 1,
    name: 'SAGE BEAUTY',
    desc: 'Sản phẩm nổi bật thuộc nhiều danh mục',
    price: `${299000 + i * 10000}đ`,
    oldPrice: i % 2 === 0 ? `${399000 + i * 10000}đ` : '',
    discount: i % 2 === 0 ? '-20%' : '',
  }));

  return (
    <div className={cx('makeup-page')}>
      {' '}
      {/* Reuse layout styles */}
      {/* Sidebar filters (same format as Makeup) */}
      <aside className={cx('sidebar')}>
        <h2 className={cx('filter-title')}>BỘ LỌC</h2>

        {/* Nhóm lọc danh mục */}
        <div className={cx('filter-group')}>
          <h3>Danh mục</h3>
          <ul>
            <li>
              <label>
                <input type="checkbox" /> Trang điểm
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Chăm sóc da
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Chăm sóc cơ thể
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Chăm sóc tóc
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Phụ kiện
              </label>
            </li>
          </ul>
        </div>

        {/* Nhóm lọc giá */}
        <div className={cx('filter-group')}>
          <h3>Giá sản phẩm</h3>
          <ul>
            <li>
              <label>
                <input type="checkbox" /> Dưới 500.000đ
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> 500.000đ - 1.000.000đ
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> 1.000.000đ - 1.500.000đ
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> 1.500.000đ - 2.000.000đ
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Trên 2.000.000đ
              </label>
            </li>
          </ul>
        </div>

        {/* Nhóm lọc thương hiệu */}
        <div className={cx('filter-group')}>
          <h3>Thương hiệu</h3>
          <input type="text" className={cx('filter-search')} placeholder="Tìm" />
          <ul>
            <li>
              <label>
                <input type="checkbox" /> Clio
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Amuse
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Laneige
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> Innisfree
              </label>
            </li>
            <li>
              <label>
                <input type="checkbox" /> The Face Shop
              </label>
            </li>
          </ul>
          <button className={cx('see-more')}>Xem thêm</button>
        </div>
      </aside>
      {/* Content: all products grid */}
      <div className={cx('content')}>
        <h1 className={cx('title')}>Tất cả sản phẩm</h1>
        <div className={cx('product-grid')}>
          {products.map((p) => (
            <Link key={p.id} to={`/product/${p.id}`} className={cx('product-card')} onClick={() => scrollToTop()}>
              <div className={cx('img-wrap')}>
                <img src={image1} alt={p.name} />
                <span className={cx('freeship')}>FREESHIP</span>
              </div>
              <div className={cx('info')}>
                <h4>{p.name}</h4>
                <p className={cx('desc')}>{p.desc}</p>
                <div className={cx('price-section')}>
                  <span className={cx('price')}>{p.price}</span>
                  {p.oldPrice && <span className={cx('old-price')}>{p.oldPrice}</span>}
                  {p.discount && <span className={cx('discount')}>{p.discount}</span>}
                </div>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}

export default Products;
