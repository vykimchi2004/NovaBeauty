import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from './Navbar.module.scss';
import { getRootCategories } from '~/services/category';

const cx = classNames.bind(styles);

function Navbar({ open = false, setOpen = () => {}, onLoginClick = () => {} }) {
  // read user from localStorage if available (expects JSON { name })
  let user = null;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (raw) user = JSON.parse(raw);
  } catch (e) {
    user = null;
  }

  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' ? window.innerWidth <= 992 : false);
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth <= 992);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  // close on Escape when drawer is open
  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === 'Escape') {
        setOpen(false);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, setOpen]);

  // Fetch categories from API
  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getRootCategories();
        // Filter only active categories
        const activeCategories = (data || []).filter(cat => cat.status !== false);
        setCategories(activeCategories);
      } catch (error) {
        console.error('Error fetching categories for navbar:', error);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

  return (
    <nav className={cx('navbar')}>
      <div className={cx('overlay', { active: open })} onClick={() => setOpen(false)} />
      <ul className={cx('menu', { active: open })}>
        {/* back row at top - visible in drawer only on mobile */}
        {isMobile && (
          <li className={cx('back-row')}>
            <Link
              to="/"
              onClick={() => {
                setOpen(false);
              }}
            >
              ← Trang chủ
            </Link>
          </li>
        )}
        <li>
          <Link to="/promo" onClick={() => setOpen(false)}>
            Khuyến mãi hot
          </Link>
        </li>
        {/* Dynamic categories from API - added to the right */}
        {categories.map((category) => (
          <li key={category.id}>
            <Link to={`/products?category=${category.id}`} onClick={() => setOpen(false)}>
              {category.name}
            </Link>
          </li>
        ))}

        {/* user footer pinned to bottom on mobile drawer; render only on mobile */}
        {isMobile && (
          <li className={cx('user-footer')}>
            {user ? (
              <div className={cx('user-footer-inner')}>Xin chào, {user.name}</div>
            ) : (
              <button
                type="button"
                className={cx('user-footer-inner')}
                onClick={() => {
                  setOpen(false);
                  onLoginClick();
                }}
              >
                Đăng nhập
              </button>
            )}
          </li>
        )}
      </ul>
    </nav>
  );
}

export default Navbar;
