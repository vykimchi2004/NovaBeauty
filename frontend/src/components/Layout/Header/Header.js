import classNames from 'classnames/bind';
import React from 'react';
import styles from './Header.module.scss';
import Hamburger from '~/components/Common/Hamburger';
import logoImg from '~/assets/icons/logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faUser, faShoppingCart, faSearch } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
const cx = classNames.bind(styles);

function Header({ cartCount = 0, open = false, setOpen = () => {}, onLoginClick, user, onLogoutClick, onProfileClick }) {
  const displayName = (user && (user.username || user.fullName || user.name || (user.email && String(user.email).split('@')[0]))) || 'Tài khoản';
  const [showMenu, setShowMenu] = React.useState(false);

  React.useEffect(() => {
    const onDocClick = (e) => {
      if (!e.target.closest) return;
      if (!e.target.closest('.nb-account')) setShowMenu(false);
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, []);
  return (
    <header className={cx('wrapper')}>
      <div className={cx('inner')}>
        <Hamburger className={cx('header-hamburger')} open={open} setOpen={setOpen} ariaLabel="Toggle menu" />

        <div>
          <Link to="/">
            <img src={logoImg} alt="NovaBeauty" className={cx('logo')} />
          </Link>
        </div>

        <div className={cx('search')}>
          <input placeholder="Tìm kiếm sản phẩm..." spellCheck={false} />
          <button className={cx('search-btn')} aria-label="Tìm kiếm">
            <FontAwesomeIcon className={cx('icon')} icon={faSearch} />
          </button>
        </div>

        <div className={cx('actions')}>
          <Link
            to="/support"
            className={cx('support')}
            onClick={() => {
              if (typeof window !== 'undefined' && window.scrollTo) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <FontAwesomeIcon className={cx('icon')} icon={faPhone} />
            <span className={cx('text')}>Liên hệ</span>
          </Link>

          {/* Account: nếu có user -> dropdown, không thì mở Login */}
          <div
            className={`${cx('account')} nb-account`}
            onClick={() => {
              if (user) {
                setShowMenu((s) => !s);
              } else {
                onLoginClick?.();
              }
            }}
            style={{ cursor: 'pointer', position: 'relative' }}
          >
            <FontAwesomeIcon className={cx('icon')} icon={faUser} />
            <span className={cx('text')}>{displayName}</span>

            {user && showMenu && (
              <div
                className={cx('dropdown')}
                style={{
                  position: 'absolute',
                  top: '100%',
                  right: 0,
                  background: '#fff',
                  border: '1px solid #eee',
                  borderRadius: 6,
                  boxShadow: '0 6px 24px rgba(0,0,0,0.08)',
                  minWidth: 180,
                  zIndex: 1000,
                  padding: 8
                }}
              >
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    onProfileClick?.();
                  }}
                  style={{ padding: '10px 12px', borderRadius: 6 }}
                  className={cx('dropdown-item')}
                >
                  Xem chi tiết
                </div>
                <div
                  onClick={async (e) => {
                    e.stopPropagation();
                    setShowMenu(false);
                    await onLogoutClick?.();
                  }}
                  style={{ padding: '10px 12px', borderRadius: 6, color: '#e03131' }}
                  className={cx('dropdown-item')}
                >
                  Đăng xuất
                </div>
              </div>
            )}
          </div>

          <Link
            to="/cart"
            className={cx('cart')}
            onClick={() => {
              if (typeof window !== 'undefined' && window.scrollTo) {
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }
            }}
          >
            <FontAwesomeIcon className={cx('icon')} icon={faShoppingCart} />
            <span className={cx('text')}>Giỏ hàng ({cartCount})</span>
          </Link>
        </div>
      </div>
    </header>
  );
}

export default Header;
