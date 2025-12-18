import { Link } from 'react-router-dom';
import { useEffect, useState } from 'react';
import classNames from 'classnames/bind';
import styles from './Navbar.module.scss';
import { getRootCategories, getSubCategories } from '~/services/category';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faBars, faChevronRight } from '@fortawesome/free-solid-svg-icons';

const cx = classNames.bind(styles);

function Navbar({ open = false, setOpen = () => { }, onLoginClick = () => { } }) {
  // read user from localStorage if available (expects JSON { name })
  let user = null;
  try {
    const raw = typeof window !== 'undefined' ? localStorage.getItem('user') : null;
    if (raw) user = JSON.parse(raw);
  } catch (e) {
    user = null;
  }

  const [isMobile, setIsMobile] = useState(
    typeof window !== 'undefined' ? window.innerWidth <= 992 : false,
  );
  const [categories, setCategories] = useState([]);
  const [activeCategoryId, setActiveCategoryId] = useState(null);
  const [subCategories, setSubCategories] = useState([]);
  const [grandChildrenMap, setGrandChildrenMap] = useState({}); // Map childId -> grandchildren array
  const [activeSource, setActiveSource] = useState(null); // 'vertical' or 'horizontal'

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

  const handleMouseEnterCategory = async (categoryId, source) => {
    if (isMobile) return;

    setActiveCategoryId(categoryId);
    setActiveSource(source);

    try {
      // Lấy danh mục con (level 1)
      const data = await getSubCategories(categoryId);
      const activeSubs = (data || []).filter((cat) => cat.status !== false);
      setSubCategories(activeSubs);

      // Lấy danh mục cháu (level 2) cho mỗi danh mục con
      const grandChildrenData = {};
      for (const sub of activeSubs) {
        try {
          const grandChildren = await getSubCategories(sub.id);
          const activeGrandChildren = (grandChildren || []).filter((cat) => cat.status !== false);
          if (activeGrandChildren.length > 0) {
            grandChildrenData[sub.id] = activeGrandChildren;
          }
        } catch (err) {
          console.error(`Error fetching grandchildren for ${sub.id}:`, err);
        }
      }
      setGrandChildrenMap(grandChildrenData);
    } catch (error) {
      console.error('Error fetching subcategories for navbar:', error);
      setSubCategories([]);
      setGrandChildrenMap({});
    }
  };

  const handleMouseLeaveNavbar = () => {
    if (isMobile) return;
    setActiveCategoryId(null);
    setActiveSource(null);
    setSubCategories([]);
    setGrandChildrenMap({});
  };

  return (
    <nav className={cx('navbar')} onMouseLeave={handleMouseLeaveNavbar}>
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
        {/* Product Categories Dropdown (Desktop) */}
        {!isMobile && (
          <li className={cx('category-dropdown-wrapper')}>
            <div className={cx('category-btn')}>
              <FontAwesomeIcon icon={faBars} className={cx('cat-icon')} />
              <span>Danh Mục Sản Phẩm</span>
            </div>

            <div className={cx('dropdown-container')}>
              {/* Left Side: Root Categories */}
              <ul className={cx('vertical-menu')}>
                {categories.map((category) => (
                  <li
                    key={category.id}
                    className={cx('vertical-item', {
                      active: activeCategoryId === category.id,
                    })}
                    onMouseEnter={() => handleMouseEnterCategory(category.id, 'vertical')}
                  >
                    <Link to={`/products?category=${category.id}`}>
                      {category.name}
                      <FontAwesomeIcon icon={faChevronRight} className={cx('arrow-icon')} />
                    </Link>
                  </li>
                ))}
              </ul>

              {/* Right Side: Subcategories (Mega Panel) */}
              <div className={cx('sub-panel')}>
                {categories.length > 0 && !activeCategoryId && (
                  <div className={cx('placeholder-panel')}>
                    {/* Optional: Show popular products or default content here */}
                  </div>
                )}

                {activeCategoryId && subCategories.length > 0 && (
                  <div className={cx('mega-content')}>
                    {subCategories.map((sub) => {
                      const grandchildren = grandChildrenMap[sub.id] || [];
                      return (
                        <div key={sub.id} className={cx('megaItemGroup')}>
                          <Link
                            to={`/products?category=${sub.id}`}
                            className={cx('megaItem', 'megaItemParent')}
                            onClick={() => setOpen(false)}
                          >
                            {sub.name}
                          </Link>
                          {grandchildren.length > 0 && (
                            <div className={cx('grandChildrenList')}>
                              {grandchildren.map((grandchild) => (
                                <Link
                                  key={grandchild.id}
                                  to={`/products?category=${grandchild.id}`}
                                  className={cx('megaItem', 'megaItemChild')}
                                  onClick={() => setOpen(false)}
                                >
                                  {grandchild.name}
                                </Link>
                              ))}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          </li>
        )}

        <li onMouseEnter={() => {
          setActiveCategoryId(null);
          setActiveSource(null);
        }}>
          <Link to="/promo" onClick={() => setOpen(false)}>
            Khuyến mãi hot
          </Link>
        </li>

        {/* Re-add horizontal categories for Desktop (Redundant per user request) */}
        {!isMobile && categories.map((category) => (
          <li
            key={`h-${category.id}`} // use unique key prefix
            onMouseEnter={() => handleMouseEnterCategory(category.id, 'horizontal')}
          >
            <Link to={`/products?category=${category.id}`} onClick={() => setOpen(false)}>
              {category.name}
            </Link>

            {/* Horizontal Menu Hover Dropdown */}
            {/* Only show horizontal dropdown if source is horizontal */}
            {!isMobile && activeCategoryId === category.id && activeSource === 'horizontal' && subCategories.length > 0 && (
              <div className={cx('megaDropdown')}>
                {subCategories.map((sub) => {
                  const grandchildren = grandChildrenMap[sub.id] || [];
                  return (
                    <div key={sub.id} className={cx('megaItemGroup')}>
                      <Link
                        to={`/products?category=${sub.id}`}
                        className={cx('megaItem', 'megaItemParent')}
                        onClick={() => setOpen(false)}
                      >
                        {sub.name}
                      </Link>
                      {grandchildren.length > 0 && (
                        <div className={cx('grandChildrenList')}>
                          {grandchildren.map((grandchild) => (
                            <Link
                              key={grandchild.id}
                              to={`/products?category=${grandchild.id}`}
                              className={cx('megaItem', 'megaItemChild')}
                              onClick={() => setOpen(false)}
                            >
                              {grandchild.name}
                            </Link>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </li>
        ))}



        {/* Mobile-only category rendering (keep existing logic simpler or just list them) */}
        {isMobile && categories.map((category) => (
          <li
            key={category.id}
          >
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
