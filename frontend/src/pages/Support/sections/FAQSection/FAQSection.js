import React, { useState } from 'react';
import classNames from 'classnames/bind';
import styles from './FAQSection.module.scss';

const cx = classNames.bind(styles);

const CATEGORIES = [
  {
    id: 'delivery',
    label: 'Giao hàng và thanh toán',
    content: {
      title: 'Chính Sách Giao Nhận Và Thanh Toán',
      lastUpdated: 'Cập nhật lần cuối: November 2, 2022',
      sections: [
        {
          heading: 'I. Giao hàng toàn quốc',
          paragraphs: [
            'NovaBeauty giao hàng hóa đến tận nơi khách hàng yêu cầu trên toàn quốc. Thời gian vận chuyển từ 3 ngày đến tối đa 5 ngày làm việc (áp dụng với khu vực: Thành phố Hồ Chí Minh và Hà Nội), các khu vực khác thời gian vận chuyển tối đa là 6 ngày làm việc.',
            'Thời gian được tính từ lúc chúng tôi hoàn tất việc xác nhận đơn hàng với bạn đến khi nhận được hàng, không kể ngày Lễ hay thứ 7 và Chủ nhật.',
            'Khi có nhu cầu về thông tin hoặc mua sắm sản phẩm. Hãy gọi cho chúng tôi qua số 1800 6035. Chúng tôi luôn sẵn sàng phục vụ bạn.'
          ]
        }
      ]
    }
  },
  {
    id: 'account',
    label: 'Tài khoản thành viên',
    content: {
      title: 'Tài Khoản Thành Viên',
      lastUpdated: 'Cập nhật lần cuối: November 2, 2022',
      sections: [
        {
          heading: 'I. Đăng ký tài khoản',
          paragraphs: [
            'Bạn có thể đăng ký tài khoản thành viên trên website NovaBeauty để nhận được nhiều ưu đãi đặc biệt.',
            'Tài khoản thành viên giúp bạn theo dõi đơn hàng, lịch sử mua hàng và tích điểm thưởng.',
            'Để đăng ký, vui lòng điền đầy đủ thông tin cá nhân và xác thực email hoặc số điện thoại.'
          ]
        }
      ]
    }
  },
  {
    id: 'guide',
    label: 'Hướng Dẫn Sử Dụng Website',
    content: {
      title: 'Hướng Dẫn Sử Dụng Website',
      lastUpdated: 'Cập nhật lần cuối: November 2, 2022',
      sections: [
        {
          heading: 'I. Hướng dẫn cơ bản',
          paragraphs: [
            'Website NovaBeauty được thiết kế thân thiện và dễ sử dụng.',
            'Bạn có thể tìm kiếm sản phẩm bằng thanh tìm kiếm hoặc duyệt theo danh mục.',
            'Để mua hàng, thêm sản phẩm vào giỏ hàng và tiến hành thanh toán.'
          ]
        }
      ]
    }
  },
  {
    id: 'contact',
    label: 'Liên hệ',
    content: {
      title: 'Liên Hệ Với Chúng Tôi',
      lastUpdated: 'Cập nhật lần cuối: November 2, 2022',
      sections: [
        {
          heading: 'I. Thông tin liên hệ',
          paragraphs: [
            'Hotline: 1800 6035 (Miễn phí)',
            'Email: novabeauty@gmail.com',
            'Thời gian làm việc: 8:00 - 22:00 hàng ngày',
            'Địa chỉ: 123 Đường ABC, Quận XYZ, TP. Hồ Chí Minh'
          ]
        }
      ]
    }
  },
  {
    id: 'about',
    label: 'Về NovaBeauty',
    content: {
      title: 'Về NovaBeauty',
      lastUpdated: 'Cập nhật lần cuối: November 2, 2022',
      sections: [
        {
          heading: 'I. Giới thiệu',
          paragraphs: [
            'NovaBeauty là thương hiệu mỹ phẩm uy tín, chuyên cung cấp các sản phẩm làm đẹp chất lượng cao.',
            'Chúng tôi cam kết mang đến cho khách hàng những sản phẩm chính hãng với giá cả hợp lý.',
            'Với đội ngũ tư vấn chuyên nghiệp, NovaBeauty luôn sẵn sàng hỗ trợ bạn trong mọi nhu cầu làm đẹp.'
          ]
        }
      ]
    }
  }
];

function FAQSection() {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
  };

  const activeCategoryData = CATEGORIES.find(cat => cat.id === activeCategory);

  return (
    <div className={cx('faqContainer')}>
      <div className={cx('faqSidebar')}>
        <h3 className={cx('faqSidebarTitle')}>Danh mục</h3>
        <ul className={cx('faqLinkList')}>
          {CATEGORIES.map((category) => (
            <li key={category.id}>
              <button
                type="button"
                className={cx('faqLink', { active: activeCategory === category.id })}
                onClick={() => handleCategoryClick(category.id)}
              >
                {category.label}
              </button>
            </li>
          ))}
        </ul>
      </div>
      <div className={cx('faqContent')}>
        {activeCategoryData && (
          <div className={cx('contentArea')}>
            <div className={cx('breadcrumb')}>
              Trang chủ &gt; Câu hỏi thường gặp
            </div>
            <h2 className={cx('contentTitle')}>{activeCategoryData.content.title}</h2>
            <div className={cx('lastUpdated')}>{activeCategoryData.content.lastUpdated}</div>
            {activeCategoryData.content.sections.map((section, index) => (
              <div key={index} className={cx('contentSection')}>
                <h3 className={cx('sectionHeading')}>{section.heading}</h3>
                {section.paragraphs.map((paragraph, pIndex) => (
                  <p key={pIndex} className={cx('sectionParagraph')}>{paragraph}</p>
                ))}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default FAQSection;

