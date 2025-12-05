import React, { useState, useEffect } from 'react';
import classNames from 'classnames/bind';
import styles from './FAQSection.module.scss';

const cx = classNames.bind(styles);

// Bộ câu hỏi gọn, chia nhóm giống tinh thần SupportUser (LuminaBook)
const CATEGORIES = [
  {
    id: 'delivery',
    label: 'Giao hàng & thanh toán',
    faqs: [
      {
        code: 'q1',
        slug: 'giao-hang-den-dau-va-mat-bao-lau',
        question: 'Giao hàng đến đâu và mất bao lâu?',
        answer:
          'Chúng tôi giao toàn quốc. Hà Nội/TP.HCM: 3-5 ngày làm việc; các tỉnh khác tối đa 6 ngày (không tính Lễ, Thứ 7/CN). Thời gian tính từ khi đơn được xác nhận. Khu vực trung tâm có thể nhận sớm hơn; vùng xa/hải đảo có thể thêm 1-2 ngày.'
      },
      {
        code: 'q2',
        slug: 'phi-van-chuyen-tinh-the-nao',
        question: 'Phí vận chuyển tính thế nào?',
        answer:
          'Phí dựa trên trọng lượng/kích thước gói hàng và địa chỉ nhận. Hệ thống tính chính xác ở bước thanh toán sau khi bạn nhập địa chỉ. Nếu đang có khuyến mãi vận chuyển, mức phí hiển thị đã bao gồm ưu đãi.'
      },
      {
        code: 'q3',
        slug: 'ho-tro-hinh-thuc-thanh-toan-nao',
        question: 'Thanh toán hỗ trợ hình thức nào?',
        answer:
          'Ví MoMo (online) và COD (trả tiền khi nhận hàng). Khi chọn MoMo, bạn được chuyển tới trang MoMo để thanh toán an toàn. Với COD, bạn thanh toán khi nhận hàng; vui lòng chuẩn bị tiền mặt hoặc hỏi nhân viên giao hàng về hỗ trợ quẹt thẻ (nếu có).'
      },
      {
        code: 'q4',
        slug: 'doi-dia-chi-giao-hang-sau-khi-dat',
        question: 'Có thể đổi địa chỉ giao hàng sau khi đặt?',
        answer:
          'Liên hệ hotline 1800 6035 hoặc email novabeauty@gmail.com ngay sau khi đặt. Nếu đơn chưa xác nhận hoặc chưa bàn giao cho hãng vận chuyển, chúng tôi có thể đổi địa chỉ. Khi đơn đã tới hãng, thời gian xử lý sẽ lâu hơn và có thể phát sinh phí điều chỉnh theo chính sách hãng.'
      }
    ]
  },
  {
    id: 'account',
    label: 'Tài khoản',
    faqs: [
      {
        code: 'q5',
        slug: 'cach-dang-ky-tai-khoan',
        question: 'Cách đăng ký tài khoản?',
        answer:
          'Nhấn “Đăng nhập” → “Đăng ký”, điền họ tên, email/số điện thoại, mật khẩu và xác thực OTP/email để kích hoạt. Nếu không nhận được OTP/email, kiểm tra Spam/Quảng cáo và thử gửi lại sau 1-2 phút.'
      },
      {
        code: 'q6',
        slug: 'loi-ich-tai-khoan',
        question: 'Lợi ích của tài khoản?',
        answer:
          'Theo dõi đơn, xem lịch sử mua, lưu nhiều địa chỉ giao hàng, nhận ưu đãi/voucher cá nhân hóa và điểm thưởng (khi có chương trình). Thông tin được lưu giúp thanh toán nhanh hơn cho các đơn kế tiếp.'
      },
      {
        code: 'q7',
        slug: 'quen-mat-khau-lam-sao',
        question: 'Quên mật khẩu làm sao?',
        answer:
          'Chọn “Quên mật khẩu” tại trang đăng nhập, nhập email đã đăng ký, nhận OTP và đặt lại mật khẩu mới. Nếu không thấy email OTP, kiểm tra Spam/Promotions hoặc thử lại sau vài phút.'
      },
      {
        code: 'q8',
        slug: 'cap-nhat-thong-tin-ca-nhan-o-dau',
        question: 'Cập nhật thông tin cá nhân ở đâu?',
        answer:
          'Vào “Hồ sơ cá nhân” sau khi đăng nhập để chỉnh họ tên, số điện thoại, địa chỉ mặc định hoặc đổi mật khẩu. Khi đổi SĐT/email, hãy nhập đúng để nhận thông báo đơn hàng.'
      }
    ]
  },
  {
    id: 'orders',
    label: 'Đơn hàng',
    faqs: [
      {
        code: 'q9',
        slug: 'kiem-tra-trang-thai-don-hang',
        question: 'Kiểm tra trạng thái đơn hàng như thế nào?',
        answer:
          'Đăng nhập → “Lịch sử mua hàng” để xem trạng thái: Chờ xác nhận, Chờ lấy hàng, Đang giao, Đã giao, Đã hủy, Trả hàng. Với đơn đang giao, bạn sẽ thấy mã vận đơn (nếu có) để tra lộ trình.'
      },
      {
        code: 'q10',
        slug: 'huy-don-hang-duoc-khong',
        question: 'Muốn hủy đơn hàng được không?',
        answer:
          'Nếu đơn chưa chuyển sang giao hàng, bạn có thể gửi yêu cầu hủy trong “Lịch sử mua hàng” hoặc liên hệ hotline 1800 6035. Đơn đã đóng gói/giao cho hãng có thể không hủy được; nếu đã thanh toán online, hãy liên hệ CSKH để được hỗ trợ phương án phù hợp.'
      },
      {
        code: 'q11',
        slug: 'khong-thay-email-xac-nhan',
        question: 'Không thấy email xác nhận đơn hàng?',
        answer:
          'Kiểm tra hộp thư Spam/Promotions. Nếu vẫn không thấy, liên hệ CSKH để được gửi lại. Đảm bảo email nhập khi đặt hàng chính xác; chúng tôi khuyến khích tạo tài khoản để theo dõi đơn thuận tiện hơn.'
      }
    ]
  },
  {
    id: 'returns',
    label: 'Đổi trả & hoàn tiền',
    faqs: [
      {
        code: 'q12',
        slug: 'truong-hop-duoc-doi-tra-hoan-tien',
        question: 'Trường hợp nào được đổi trả/hoàn tiền?',
        answer:
          'Sản phẩm được trả hàng/hoàn tiền trong các trường hợp: sản phẩm bị lỗi do nhà sản xuất, không đúng với mô tả trên website, bị hư hỏng trong quá trình vận chuyển, giao nhầm sản phẩm, khách hàng đổi ý/không còn nhu cầu sử dụng, hoặc đặt nhầm sản phẩm. Yêu cầu trả hàng/hoàn tiền phải được thực hiện trong vòng 7 ngày kể từ ngày nhận hàng.'
      },
      {
        code: 'q13',
        slug: 'dieu-kien-san-pham-khi-doi-tra',
        question: 'Sản phẩm cần đảm bảo điều kiện gì khi đổi trả?',
        answer:
          'Sản phẩm đổi trả phải còn nguyên vẹn, chưa sử dụng, còn đầy đủ bao bì và tem mác. Không được trầy xước hoặc hư hỏng do người dùng. Vui lòng cung cấp ảnh/video rõ ràng về tình trạng sản phẩm và lý do trả hàng để làm bằng chứng xác thực.'
      },
      {
        code: 'q14',
        slug: 'quy-trinh-doi-tra',
        question: 'Quy trình đổi trả như thế nào?',
        answer:
          'Bước 1: Tại mục "Lịch sử mua hàng" → "Đã giao", chọn nút "Yêu cầu trả hàng/Hoàn tiền" tại sản phẩm đủ điều kiện.\n'
          + 'Bước 2: Cung cấp thông tin đơn hàng và lý do đổi trả.\n'
          + 'Bước 3: Chụp ảnh sản phẩm (nếu có lỗi) và gửi cho chúng tôi.\n'
          + 'Bước 4: Chờ xác nhận từ bộ phận hỗ trợ.\n'
          + 'Bước 5: Đóng gói sản phẩm và gửi về địa chỉ được chỉ định.\n'
          + 'Bước 6: Nhận sản phẩm mới và hoàn tiền (nếu đủ điều kiện) sau 3-5 ngày làm việc kể từ khi chúng tôi nhận được đơn trả hàng.'
      },
      {
        code: 'q15',
        slug: 'chi-phi-van-chuyen-khi-doi-tra',
        question: 'Ai chịu chi phí vận chuyển khi đổi trả?',
        answer:
          'Khách hàng vui lòng thanh toán trước chi phí vận chuyển cho đơn hàng trả về cửa hàng. Nếu sản phẩm có lỗi từ phía cửa hàng (sản phẩm bị lỗi, sai mô tả, thiếu phụ kiện, lỗi sản xuất), chúng tôi sẽ hoàn lại 100% giá trị sản phẩm và chi phí vận chuyển trả hàng. Nếu yêu cầu trả hàng/hoàn tiền xuất phát từ lý do cá nhân (đặt nhầm, không thích, không còn nhu cầu), chúng tôi sẽ trừ 10% giá trị sản phẩm và khách hàng sẽ chịu toàn bộ chi phí vận chuyển trả hàng.'
      },
      {
        code: 'q16',
        slug: 'thoi-gian-hoan-tien-bao-lau',
        question: 'Thời gian hoàn tiền là bao lâu?',
        answer:
          'Thời gian hoàn tiền: 3-5 ngày làm việc sau khi chúng tôi nhận được sản phẩm trả về và kiểm tra xác nhận. Tiền sẽ được hoàn về tài khoản ngân hàng mà bạn cung cấp. Nếu thanh toán bằng MoMo, tiền có thể được hoàn về ví MoMo của bạn.'
      },
      {
        code: 'q17',
        slug: 'sau-7-ngay-co-the-doi-tra-khong',
        question: 'Sau 7 ngày có thể đổi trả không?',
        answer:
          'Sau thời hạn 7 ngày, nếu bạn vẫn muốn trả hàng/hoàn tiền, vui lòng liên hệ bộ phận Chăm sóc khách hàng qua Hotline 1800 6035 hoặc gửi đơn khiếu nại để được hỗ trợ xử lý. Chúng tôi sẽ xem xét từng trường hợp cụ thể.'
      }
    ]
  }
];

function FAQSection({ initialQuestion }) {
  const [activeCategory, setActiveCategory] = useState(CATEGORIES[0].id);
  const [selectedFaqIndex, setSelectedFaqIndex] = useState(null);
  const [showAnswerOnly, setShowAnswerOnly] = useState(false);

  // Tự động mở câu hỏi nếu có initialQuestion
  useEffect(() => {
    if (initialQuestion) {
      for (let catIndex = 0; catIndex < CATEGORIES.length; catIndex++) {
        const category = CATEGORIES[catIndex];
        const faqIndex = category.faqs.findIndex(
          (faq) => faq.code === initialQuestion || faq.slug === initialQuestion
        );
        if (faqIndex !== -1) {
          setActiveCategory(category.id);
          setSelectedFaqIndex(faqIndex);
          setShowAnswerOnly(true);
          return;
        }
      }
    } else {
      // mặc định chọn câu đầu tiên của category hiện tại
      const current = CATEGORIES.find((c) => c.id === activeCategory);
      if (current && current.faqs.length > 0) {
        setSelectedFaqIndex(0);
        setShowAnswerOnly(false);
      }
    }
  }, [initialQuestion, activeCategory]);

  const handleCategoryClick = (categoryId) => {
    setActiveCategory(categoryId);
    const cat = CATEGORIES.find((c) => c.id === categoryId);
    setSelectedFaqIndex(cat?.faqs?.length ? 0 : null);
    setShowAnswerOnly(false);
  };

  const handleSelectFaq = (faqIndex) => {
    setSelectedFaqIndex(faqIndex);
    setShowAnswerOnly(true);
  };

  const handleBackToList = () => {
    setShowAnswerOnly(false);
  };

  const activeCategoryData = CATEGORIES.find((cat) => cat.id === activeCategory);
  const faqList = activeCategoryData?.faqs || [];
  const activeFaq = selectedFaqIndex != null ? faqList[selectedFaqIndex] : null;

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
            <h2 className={cx('contentTitle')}>Câu hỏi thường gặp</h2>
            {!showAnswerOnly && (
              <div className={cx('faqList')}>
                {faqList.map((faq, index) => (
                  <div key={index} className={cx('faqItem')}>
                    <button
                      type="button"
                      className={cx('faqQuestion')}
                      onClick={() => handleSelectFaq(index)}
                    >
                      <span className={cx('questionText')}>{faq.question}</span>
                      
                    </button>
              </div>
            ))}
              </div>
            )}

            {showAnswerOnly && (
              <div className={cx('answerPanel', { single: showAnswerOnly })}>
                <button type="button" className={cx('answerBack')} onClick={handleBackToList}>
                  ← Quay lại danh sách câu hỏi
                </button>
                {activeFaq ? (
                  <>
                    <div className={cx('answerTitle')}>{activeFaq.question}</div>
                    <div className={cx('answerBody')}>
                      <p>{activeFaq.answer}</p>
                    </div>
                  </>
                ) : (
                  <div className={cx('answerPlaceholder')}>Chọn một câu hỏi để xem nội dung</div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default FAQSection;

