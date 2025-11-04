import classNames from "classnames/bind";
import styles from "./Footer.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhone, faEnvelope, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { faInstagram, faFacebookF, faYoutube, faGoogle } from "@fortawesome/free-brands-svg-icons";
import { Link } from "react-router-dom";

const cx = classNames.bind(styles);

function Footer() {
  return (
    <footer className={cx("wrapper")}>
      <div className={cx("inner")}>
        <div className={cx("col")}>
          <h4>THÔNG TIN LIÊN HỆ</h4>
          <div className={cx("contact-item")}>
            <FontAwesomeIcon icon={faMapMarkerAlt} />
            <div>136 Xuân Thủy, phường Cầu Giấy, TP.Hà Nội</div>
          </div>
          <div className={cx("contact-item")}>
            <FontAwesomeIcon icon={faPhone} />
            <div>Hotline: 0123 456 789</div>
          </div>
          <div className={cx("contact-item")}>
            <FontAwesomeIcon icon={faEnvelope} />
            <div>Email: novabeauty@gmail.com</div>
          </div>
          <div className={cx("contact-item")}>
            <div>Hỗ trợ 24/7</div>
          </div>

          <div className={cx('socials')}>
            <a aria-label="Instagram" ><FontAwesomeIcon icon={faInstagram} /></a>
            <a aria-label="Facebook" ><FontAwesomeIcon icon={faFacebookF} /></a>
            <a aria-label="YouTube" ><FontAwesomeIcon icon={faYoutube} /></a>
            <a aria-label="Google" ><FontAwesomeIcon icon={faGoogle} /></a>
          </div>
        </div>

        <div className={cx("col")}>
          <h4>DANH MỤC</h4>
          <div className={cx('links-list')}>
            <Link to='/makeup'>Trang điểm</Link>
            <Link to='/skincare'>Chăm sóc da</Link>
            <Link to='/personal-care'>Chăm sóc cơ thể</Link>
            <Link to='/haircare'>Chăm sóc tóc</Link>
            <Link to='/perfume'>Tool & Brushes</Link>
          </div>
        </div>

        <div className={cx("col")}>
          <h4>Hỗ trợ khách hàng</h4>
          <div className={cx('links-list')}>
            <Link to= '/shopping-guide'>Hướng dẫn mua hàng</Link>
            <Link to= '/payment-policy'>Chính sách thanh toán</Link>
            <Link to= '/shipping-policy'>Chính sách vận chuyển</Link>
            <Link to= '/return-policy'>Chính sách đổi trả</Link>
            <Link to= '/faq'>FAQ</Link>
          </div>
        </div>

  
      </div>
    </footer>
  );
}

export default Footer;
