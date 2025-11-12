import sp1Img from '~/assets/images/products/sp1.jpg';
import sp2Img from '~/assets/images/products/sp2.jpg';
import sonMoiImg from '~/assets/images/products/sonmoi.png';
import image1Img from '~/assets/images/products/image1.jpg';

export const STATUS_CLASS_MAP = {
  'Chờ xác nhận': 'pending',
  'Chờ lấy hàng': 'ready',
  'Đang giao hàng': 'shipping',
  'Đã giao': 'delivered',
  'Trả hàng': 'returned',
  'Đã hủy': 'cancelled',
};

export const ORDERS_DATA = [
  {
    id: 'DH23501',
    date: '2025-09-25',
    dateDisplay: '25/09/2025',
    total: '520.000đ',
    status: 'Chờ xác nhận',
    statusKey: 'pending',
    items: [
      {
        name: 'Son kem lì Nova Velvet',
        quantity: 2,
        thumbnail: sonMoiImg,
      },
    ],
  },
  {
    id: 'DH23488',
    date: '2025-09-20',
    dateDisplay: '20/09/2025',
    total: '1.280.000đ',
    status: 'Chờ lấy hàng',
    statusKey: 'ready',
    items: [
      {
        name: 'Bảng phấn mắt Aurora Glow',
        quantity: 1,
        thumbnail: sp1Img,
      },
    ],
  },
  {
    id: 'DH23452',
    date: '2025-09-12',
    dateDisplay: '12/09/2025',
    total: '890.000đ',
    status: 'Đang giao hàng',
    statusKey: 'shipping',
    items: [
      {
        name: 'Kem nền LightFit SPF35',
        quantity: 1,
        thumbnail: sp2Img,
      },
    ],
  },
  {
    id: 'DH23410',
    date: '2025-09-05',
    dateDisplay: '05/09/2025',
    total: '430.000đ',
    status: 'Đã giao',
    statusKey: 'delivered',
    items: [
      {
        name: 'Phấn phủ kiềm dầu Airy Matte',
        quantity: 1,
        thumbnail: image1Img,
      },
    ],
  },
  {
    id: 'DH23364',
    date: '2025-08-30',
    dateDisplay: '30/08/2025',
    total: '360.000đ',
    status: 'Trả hàng',
    statusKey: 'returned',
    items: [
      {
        name: 'Mascara Volume Lift',
        quantity: 1,
        thumbnail: sp2Img,
      },
    ],
  },
  {
    id: 'DH23320',
    date: '2025-08-22',
    dateDisplay: '22/08/2025',
    total: '290.000đ',
    status: 'Đã hủy',
    statusKey: 'cancelled',
    items: [
      {
        name: 'Kẻ mắt nước SharpLine',
        quantity: 1,
        thumbnail: sp1Img,
      },
    ],
  },
];

export const PLACEHOLDER_CONTENT = {
  complaint: {
    title: 'Đơn khiếu nại',
    description: 'Bạn sẽ sớm có thể gửi và theo dõi các đơn khiếu nại tại đây.',
  },
};



