import React, { useEffect, useMemo, useState, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faQuestionCircle,
  faTriangleExclamation,
  faPhone,
  faEnvelope,
  faList,
  faSearch,
  faArrowLeft
} from '@fortawesome/free-solid-svg-icons';
import classNames from 'classnames/bind';
import styles from './Support.module.scss';
import FAQSection from './sections/FAQSection/FAQSection';
import SupportRequestSection from './sections/SupportRequestSection/SupportRequestSection';

const cx = classNames.bind(styles);

// Gợi ý tìm kiếm: liệt kê toàn bộ câu hỏi hiện có trong FAQ (label + mã số ngắn)
const POPULAR_QUESTIONS = [
  { label: 'Giao hàng đến đâu và mất bao lâu?', code: 'q1' },
  { label: 'Phí vận chuyển tính thế nào?', code: 'q2' },
  { label: 'Thanh toán hỗ trợ hình thức nào?', code: 'q3' },
  { label: 'Có thể đổi địa chỉ giao hàng sau khi đặt?', code: 'q4' },
  { label: 'Cách đăng ký tài khoản?', code: 'q5' },
  { label: 'Lợi ích của tài khoản?', code: 'q6' },
  { label: 'Quên mật khẩu làm sao?', code: 'q7' },
  { label: 'Cập nhật thông tin cá nhân ở đâu?', code: 'q8' },
  { label: 'Kiểm tra trạng thái đơn hàng như thế nào?', code: 'q9' },
  { label: 'Muốn hủy đơn hàng được không?', code: 'q10' },
  { label: 'Không thấy email xác nhận đơn hàng?', code: 'q11' },
  { label: 'Trường hợp nào được đổi trả/hoàn tiền?', code: 'q12' },
  { label: 'Sản phẩm cần đảm bảo điều kiện gì khi đổi trả?', code: 'q13' },
  { label: 'Quy trình đổi trả như thế nào?', code: 'q14' },
  { label: 'Ai chịu chi phí vận chuyển khi đổi trả?', code: 'q15' },
  { label: 'Thời gian hoàn tiền là bao lâu?', code: 'q16' },
  { label: 'Sau 7 ngày có thể đổi trả không?', code: 'q17' }
];

const QUICK_LINKS = [
  {
    id: 'faq',
    label: 'Các câu hỏi thường gặp',
    description: 'Giải đáp nhanh những thắc mắc phổ biến về mua sắm, giao hàng, đổi trả…',
    icon: faQuestionCircle
  },
  {
    id: 'policies',
    label: 'Chính sách',
    description: 'Truy cập nhanh các trang hướng dẫn mua hàng, thanh toán, vận chuyển, đổi trả.',
    icon: faList
  },
  {
    id: 'quality',
    label: 'Gửi yêu cầu hỗ trợ / khiếu nại',
    description: 'Khi bạn cần phản hồi dịch vụ, đội ngũ CSKH của chúng tôi luôn sẵn sàng lắng nghe.',
    icon: faTriangleExclamation
  },

];

const SECTION_KEYS = QUICK_LINKS.reduce((acc, item) => {
  acc[item.id] = true;
  return acc;
}, {});

const SECTION_LABELS = {
  faq: 'Các câu hỏi thường gặp',
  policies: 'Chính sách',
  quality: 'Gửi yêu cầu hỗ trợ / khiếu nại',
};

function Support() {
  const location = useLocation();
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const contentWrapperRef = useRef(null);

  const querySection = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('section');
    return section && SECTION_KEYS[section] ? section : null;
  }, [location.search]);
  const queryQuestion = useMemo(() => {
    const params = new URLSearchParams(location.search);
    return params.get('question') || null;
  }, [location.search]);

  const [activeSection, setActiveSection] = useState(querySection || null);

  useEffect(() => {
    if (querySection && querySection !== activeSection) {
      setActiveSection(querySection);
    }
    if (!querySection && activeSection) {
      setActiveSection(null);
    }
  }, [querySection, activeSection]);

  // Scroll đến phần FAQ khi mở từ tìm kiếm
  useEffect(() => {
    const targetQuestion = queryQuestion || location.state?.openQuestion;
    if (activeSection === 'faq' && targetQuestion && contentWrapperRef.current) {
      setTimeout(() => {
        contentWrapperRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 300);
    }
  }, [activeSection, queryQuestion, location.state?.openQuestion]);

  const handleSelectSection = (id) => {
    setActiveSection(id);
    navigate(
      {
        pathname: '/support',
        search: `?section=${id}`
      },
      { replace: true }
    );
  };

  const handleBackToMenu = () => {
    setActiveSection(null);
    navigate(
      {
        pathname: '/support',
        search: ''
      },
      { replace: true }
    );
  };

const filteredSuggestions = useMemo(() => {
  if (!searchTerm.trim()) return POPULAR_QUESTIONS;
  const term = searchTerm.toLowerCase();
  return POPULAR_QUESTIONS.filter((q) => q.label.toLowerCase().includes(term));
}, [searchTerm]);

const goToQuestion = (code, labelForInput) => {
  if (labelForInput) {
    setSearchTerm(labelForInput);
  }
    navigate(
      {
        pathname: '/support',
      search: `?section=faq&question=${encodeURIComponent(code)}`
      },
      { replace: true }
    );
    setActiveSection('faq');
    // Giữ suggestions hiển thị sau khi chọn câu hỏi
  };

const handleSelectSuggestion = (sug) => {
  goToQuestion(sug.code, sug.label);
  };

  const renderSectionContent = () => {
    if (activeSection === 'faq') {
      const openQuestion = queryQuestion || location.state?.openQuestion;
      return <FAQSection initialQuestion={openQuestion} />;
    }

    if (activeSection === 'policies') {
      return (
        <div className={cx('policies')}>
          <p className={cx('policiesIntro')}>
            Chọn trang chính sách/hướng dẫn mà bạn cần:
          </p>
          <div className={cx('policiesList')}>
              <Link to="/support/payment-policy">
                <span>Chính sách thanh toán</span>
                <small>Hỗ trợ MoMo và COD, quy trình thanh toán an toàn.</small>
              </Link>
              <Link to="/support/shipping-policy">
                <span>Chính sách vận chuyển</span>
                <small>Phạm vi giao hàng, phí, thời gian và quy trình giao.</small>
              </Link>
              <Link to="/support/return-policy">
                <span>Chính sách đổi trả</span>
                <small>Điều kiện, quy trình đổi trả/hoàn tiền rõ ràng.</small>
              </Link>
          </div>
        </div>
      );
    }

    if (activeSection === 'quality') {
      return <SupportRequestSection />;
    }

    return null;
  };

  return (
    <div className={cx('wrapper')}>
      <section className={cx('hero')}>
        <div className={cx('heroInner')}>
          <h2 className={cx('heroTitle')}>Xin chào, chúng tôi có thể giúp gì cho bạn?</h2>
          <div className={cx('heroSearchBox')}>
            <form
              className={cx('heroSearch')}
            onSubmit={(e) => {
              e.preventDefault();
              if (!searchTerm.trim()) return;
              const term = searchTerm.toLowerCase();
              const match = POPULAR_QUESTIONS.find((q) => q.label.toLowerCase().includes(term));
              if (match) {
                goToQuestion(match.code, match.label);
              } else {
                const fallbackSlug = encodeURIComponent(searchTerm.trim());
                navigate(
                  {
                    pathname: '/support',
                    search: `?section=faq&question=${fallbackSlug}`
                  },
                  { replace: true }
                );
                setActiveSection('faq');
                setShowSuggestions(false);
              }
            }}
            >
              <FontAwesomeIcon icon={faSearch} className={cx('searchIcon')} />
              <input
                className={cx('heroInput')}
                placeholder="Tìm kiếm câu hỏi, chính sách, hướng dẫn..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                onFocus={() => setShowSuggestions(true)}
                onBlur={() => setTimeout(() => setShowSuggestions(false), 120)}
              />
              <button type="submit" className={cx('heroButton')}>
                Tìm kiếm
              </button>
            </form>
            {showSuggestions && filteredSuggestions.length > 0 && (
              <div className={cx('suggestList')}>
                {filteredSuggestions.map((sug) => (
                  <button
                    key={sug.code}
                    type="button"
                    className={cx('suggestItem')}
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={() => handleSelectSuggestion(sug)}
                  >
                    {sug.label}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>
      {/* Quick help cards */}
      {!activeSection && (
        <div className={cx('quickGrid')}>
          {QUICK_LINKS.map((item) => (
            <button
              key={item.id}
              type="button"
              className={cx('card')}
              onClick={() => handleSelectSection(item.id)}
            >
              <FontAwesomeIcon icon={item.icon} className={cx('cardIcon')} />
              <div className={cx('cardTitle')}>{item.label}</div>
              <p className={cx('cardDesc')}>{item.description}</p>
            </button>
          ))}
        </div>
      )}

      {activeSection && (
        <div className={cx('contentWrapper')} ref={contentWrapperRef}>
          <div className={cx('contentHeader')}>
            <button type="button" className={cx('backButton')} onClick={handleBackToMenu}>
              <FontAwesomeIcon icon = {faArrowLeft} />
            </button>
            <h3 className={cx('contentTitle')}>{SECTION_LABELS[activeSection]}</h3>
          </div>
          <div className={cx('sectionContent')}>{renderSectionContent()}</div>
        </div>
      )}

      <h2 className={cx('sectionTitle')}>Quý khách có thể liên hệ với chúng tôi qua các hình thức sau</h2>

      {/* Contact methods */}
      <div className={cx('contactGrid')}>
        <div className={cx('contactCard')}>
          <FontAwesomeIcon icon={faPhone} className={cx('contactIcon')} />
          <div className={cx('contactTitle')}>Gọi chúng tôi</div>
          <div className={cx('contactText')}>18006035</div>
        </div>

        <div className={cx('contactCard')}>
          <FontAwesomeIcon icon={faEnvelope} className={cx('contactIcon')} />
          <div className={cx('contactTitle')}>Gửi email cho chúng tôi</div>
          <div className={cx('contactText')}>novabeauty@gmail.com</div>
        </div>

        <div className={cx('contactCard')}>
          <FontAwesomeIcon icon={faList} className={cx('contactIcon')} />
          <div className={cx('contactTitle')}>Để lại lời nhắn cho chúng tôi</div>
        </div>
      </div>
    </div>
  );
}

export default Support;

