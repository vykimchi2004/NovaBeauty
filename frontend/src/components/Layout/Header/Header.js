import classNames from 'classnames/bind';
import styles from './Header.module.scss';
import Hamburger from '~/components/Common/Hamburger';
import logoImg from '~/assets/icons/logo.png';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faPhone, faUser, faShoppingCart, faSearch } from '@fortawesome/free-solid-svg-icons';
import { Link } from 'react-router-dom';
const cx = classNames.bind(styles);

function Header({ cartCount = 0, open = false, setOpen = () => {}, onLoginClick }) {
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
          <div className={cx('support')}>
            <FontAwesomeIcon className={cx('icon')} icon={faPhone} />
            <span className={cx('text')}>19002631</span>
          </div>

          {/* Khi click vào account thì mở form Login */}
          <div className={cx('account')} onClick={onLoginClick} style={{ cursor: 'pointer' }}>
            <FontAwesomeIcon className={cx('icon')} icon={faUser} />
            <span className={cx('text')}>Tài khoản</span>
          </div>

          <div className={cx('cart')}>
            <FontAwesomeIcon className={cx('icon')} icon={faShoppingCart} />
            <span className={cx('text')}>Giỏ hàng ({cartCount})</span>
          </div>
        </div>
      </div>
    </header>
  );
}

export default Header;
