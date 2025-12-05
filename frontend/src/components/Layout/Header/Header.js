import classNames from 'classnames/bind';
import React, { useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import styles from './Header.module.scss';
import Hamburger from '~/components/Common/Hamburger';
import logoImg from '~/assets/icons/logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faUser, faShoppingCart, faSearch } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
import { normalizeMediaUrl } from '~/services/productUtils';
import { getApiBaseUrl } from '~/services/utils';
import { useProductSearch } from '~/hooks/useProductSearch';

const cx = classNames.bind(styles);

function Header({ cartCount = 0, open = false, setOpen = () => {}, onLoginClick, user, onLogoutClick, onProfileClick }) {
  const displayName = (user && (user.username || user.fullName || user.name || (user.email && String(user.email).split('@')[0]))) || 'Tài khoản';
  const [showMenu, setShowMenu] = React.useState(false);
  const navigate = useNavigate();
  const API_BASE_URL = React.useMemo(() => getApiBaseUrl(), []);
  const searchRef = useRef(null);

  // Use custom search hook
  const {
    searchQuery,
    searchResults,
    isSearching,
    showSearchResults,
    handleSearchChange,
    handleSearchFocus,
    clearSearch,
    hideSearchResults,
  } = useProductSearch();

  React.useEffect(() => {
    const onDocClick = (e) => {
      if (!e.target.closest) return;
      if (!e.target.closest('.nb-account')) setShowMenu(false);
      // Đóng search results khi click bên ngoài
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        hideSearchResults();
      }
    };
    document.addEventListener('click', onDocClick);
    return () => document.removeEventListener('click', onDocClick);
  }, [hideSearchResults]);

  const handleProductClick = (productId) => {
    clearSearch();
    navigate(`/product/${productId}`);
  };

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim() && searchResults.length > 0) {
      handleProductClick(searchResults[0].id);
    }
  };
  return (
    <header className={cx('wrapper')}>
      <div className={cx('inner')}>
        <Hamburger className={cx('header-hamburger')} open={open} setOpen={setOpen} ariaLabel="Toggle menu" />

        <div>
          <Link to="/">
            <img src={logoImg} alt="NovaBeauty" className={cx('logo')} />
          </Link>
        </div>

        <div className={cx('search')} ref={searchRef}>
          <form onSubmit={handleSearchSubmit} className={cx('search-form')}>
            <input
              type="text"
              placeholder="Tìm kiếm sản phẩm..."
              spellCheck={false}
              value={searchQuery}
              onChange={(e) => handleSearchChange(e.target.value)}
              onFocus={handleSearchFocus}
            />
            <button type="submit" className={cx('search-btn')} aria-label="Tìm kiếm">
              <FontAwesomeIcon className={cx('icon')} icon={faSearch} />
            </button>

            {/* Search Results Dropdown */}
            {showSearchResults && (
              <div className={cx('search-results')}>
              {isSearching ? (
                <div className={cx('search-loading')}>Đang tìm kiếm...</div>
              ) : searchResults.length > 0 ? (
                <>
                  {searchResults.map((product) => {
                    const productImage = product.defaultMediaUrl
                      ? normalizeMediaUrl(product.defaultMediaUrl, API_BASE_URL)
                      : product.mediaUrls?.[0]
                        ? normalizeMediaUrl(product.mediaUrls[0], API_BASE_URL)
                        : null;
                    
                    return (
                      <div
                        key={product.id}
                        className={cx('search-result-item')}
                        onClick={() => handleProductClick(product.id)}
                      >
                        {productImage && (
                          <img
                            src={productImage}
                            alt={product.name}
                            className={cx('search-result-image')}
                            onError={(e) => {
                              e.target.style.display = 'none';
                            }}
                          />
                        )}
                        <div className={cx('search-result-info')}>
                          <div className={cx('search-result-name')}>{product.name}</div>
                          {product.price && (
                            <div className={cx('search-result-price')}>
                              {new Intl.NumberFormat('vi-VN', {
                                style: 'currency',
                                currency: 'VND',
                              }).format(product.price)}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </>
              ) : searchQuery.trim() && !isSearching ? (
                <div className={cx('search-no-results')}>Không tìm thấy sản phẩm</div>
              ) : null}
              </div>
            )}
          </form>
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
