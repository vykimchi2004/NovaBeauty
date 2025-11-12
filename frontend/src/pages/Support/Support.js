import React, { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
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

const QUICK_LINKS = [
  {
    id: 'faq',
    label: 'Các câu hỏi thường gặp',
    description: 'Giải đáp nhanh những thắc mắc phổ biến về mua sắm, giao hàng, đổi trả…',
    icon: faQuestionCircle
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
  quality: 'Gửi yêu cầu hỗ trợ / khiếu nại',
};

function Support() {
  const location = useLocation();
  const navigate = useNavigate();

  const querySection = useMemo(() => {
    const params = new URLSearchParams(location.search);
    const section = params.get('section');
    return section && SECTION_KEYS[section] ? section : null;
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

  const renderSectionContent = () => {
    if (activeSection === 'faq') {
      return <FAQSection />;
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
          <form
            className={cx('heroSearch')}
            onSubmit={(e) => {
              e.preventDefault();
            }}
          >
            <FontAwesomeIcon icon={faSearch} className={cx('searchIcon')} />
            <input className={cx('heroInput')} placeholder="Tìm kiếm câu hỏi, chính sách, hướng dẫn..." />
            <button type="submit" className={cx('heroButton')}>
              Tìm kiếm
            </button>
          </form>
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
        <div className={cx('contentWrapper')}>
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

