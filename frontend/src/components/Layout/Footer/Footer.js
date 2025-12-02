import classNames from "classnames/bind";
import styles from "./Footer.module.scss";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPhone, faEnvelope, faMapMarkerAlt } from "@fortawesome/free-solid-svg-icons";
import { faInstagram, faFacebookF, faYoutube, faGoogle } from "@fortawesome/free-brands-svg-icons";
import { Link } from "react-router-dom";
import { scrollToTop } from "~/services/utils";
import { useEffect, useState } from "react";
import { getRootCategories } from "~/services/category";

const cx = classNames.bind(styles);

const handleScrollToTop = () => {
  setTimeout(() => {
    scrollToTop('smooth');
  }, 0);
};

function Footer() {
  const [categories, setCategories] = useState([]);

  useEffect(() => {
    const fetchCategories = async () => {
      try {
        const data = await getRootCategories();
        const activeCategories = (data || []).filter(cat => cat.status !== false);
        setCategories(activeCategories);
      } catch (error) {
        console.error('Error fetching categories for footer:', error);
        setCategories([]);
      }
    };

    fetchCategories();
  }, []);

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
            {categories.length === 0 ? (
              <span>Danh mục đang được cập nhật...</span>
            ) : (
              categories.map((category) => (
                <Link
                  key={category.id}
                  to={`/products?category=${category.id}`}
                  onClick={handleScrollToTop}
                >
                  {category.name}
                </Link>
              ))
            )}
          </div>
        </div>

        <div className={cx("col")}>
          <h4>Hỗ trợ khách hàng</h4>
          <div className={cx('links-list')}>
            <Link to= '/shopping-guide' onClick={handleScrollToTop}>Hướng dẫn mua hàng</Link>
            <Link to= '/payment-policy' onClick={handleScrollToTop}>Chính sách thanh toán</Link>
            <Link to= '/shipping-policy' onClick={handleScrollToTop}>Chính sách vận chuyển</Link>
            <Link to= '/return-policy' onClick={handleScrollToTop}>Chính sách đổi trả</Link>
            <Link to= '/support?section=faq' onClick={handleScrollToTop}>FAQ</Link>
          </div>
        </div>

  
      </div>
    </footer>
  );
}

export default Footer;
