import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import classNames from 'classnames/bind';
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import {
  faMagnifyingGlass,
  faCalendarDays,
  faArrowRight,
  faXmark,
  faAngleRight,
  faAngleLeft,
} from '@fortawesome/free-solid-svg-icons';
import styles from '../Profile.module.scss';
import orderService from '~/services/order';

import defaultProductImage from '~/assets/images/products/image1.jpg';
import { formatCurrency, getApiBaseUrl } from '~/services/utils';
import { normalizeMediaUrl } from '~/services/productUtils';
import CancelOrderDialog from '~/components/Common/ConfirmDialog/CancelOrderDialog';
import RefundRequestModal from '~/components/Common/RefundRequestModal/RefundRequestModal';
import RegularOrderModal from './RegularOrderModal';
import RefundOrderModal from './RefundOrderModal';

const cx = classNames.bind(styles);

// Parse refund information from order (prefer dedicated fields, fallback to note)
const parseRefundInfo = (order) => {
    if (!order) {
        return {
            reason: '',
            reasonType: null,
            description: '',
            returnAddress: '',
            refundMethod: '',
            bank: '',
            accountNumber: '',
            accountHolder: '',
            mediaUrls: [],
        };
    }

    // Collect all possible media URLs from various fields
    let mediaUrls = [];
    
    // Check refundMediaUrls (primary field)
    if (order.refundMediaUrls) {
        try {
            let parsed = order.refundMediaUrls;
            if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            if (Array.isArray(parsed)) {
                mediaUrls = parsed;
                console.log('🔍 OrdersSection - Parsed mediaUrls from refundMediaUrls:', mediaUrls);
            } else if (typeof parsed === 'string' && parsed.trim().startsWith('[')) {
                parsed = JSON.parse(parsed);
                if (Array.isArray(parsed)) {
                    mediaUrls = parsed;
                }
            }
        } catch (e) {
            console.error('Failed to parse refund media URLs', e, 'Raw value:', order.refundMediaUrls);
        }
    }
    
    // Check nested refund object
    if (mediaUrls.length === 0 && order.refund?.mediaUrls) {
        try {
            let parsed = order.refund.mediaUrls;
            if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            if (Array.isArray(parsed)) {
                mediaUrls = parsed;
                console.log('🔍 OrdersSection - Found mediaUrls in order.refund.mediaUrls:', mediaUrls);
            }
        } catch (e) {
            console.warn('Failed to parse order.refund.mediaUrls', e);
        }
    }
    
    // Check other possible fields
    if (mediaUrls.length === 0 && order.mediaUrls) {
        try {
            let parsed = order.mediaUrls;
            if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            if (Array.isArray(parsed)) {
                mediaUrls = parsed;
                console.log('🔍 OrdersSection - Found mediaUrls in order.mediaUrls:', mediaUrls);
            }
        } catch (e) {
            console.warn('Failed to parse order.mediaUrls', e);
        }
    }
    
    // Check attachments field
    if (mediaUrls.length === 0 && order.attachments) {
        try {
            let parsed = order.attachments;
            if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            if (Array.isArray(parsed)) {
                mediaUrls = parsed.map(att => att.url || att.path || att);
                console.log('🔍 OrdersSection - Found mediaUrls in order.attachments:', mediaUrls);
            }
        } catch (e) {
            console.warn('Failed to parse order.attachments', e);
        }
    }
    
    // Check files field
    if (mediaUrls.length === 0 && order.files) {
        try {
            let parsed = order.files;
            if (typeof parsed === 'string') {
                parsed = JSON.parse(parsed);
            }
            if (Array.isArray(parsed)) {
                mediaUrls = parsed.map(file => file.url || file.path || file);
                console.log('🔍 OrdersSection - Found mediaUrls in order.files:', mediaUrls);
            }
        } catch (e) {
            console.warn('Failed to parse order.files', e);
        }
    }

    // First, try to get from dedicated refund fields (new way)
    if (order.refundReasonType || order.refundDescription || order.refundReturnAddress || mediaUrls.length > 0) {

        return {
            reason: order.refundReasonType === 'store' 
                ? 'Sản phẩm gặp sự cố từ cửa hàng'
                : order.refundReasonType === 'customer'
                ? 'Thay đổi nhu cầu / Mua nhầm'
                : '',
            reasonType: order.refundReasonType || null,
            description: order.refundDescription || '',
            returnAddress: order.refundReturnAddress || '',
            refundMethod: order.refundMethod || '',
            bank: order.refundBank || '',
            accountNumber: order.refundAccountNumber || '',
            accountHolder: order.refundAccountHolder || '',
            mediaUrls: mediaUrls,
        };
    }

    // Fallback: parse from note
    const note = order.note || '';
    if (!note || typeof note !== 'string') {
        return {
            reason: '',
            reasonType: null,
            description: '',
            returnAddress: '',
            refundMethod: '',
            bank: '',
            accountNumber: '',
            accountHolder: '',
            mediaUrls: [],
        };
    }

    const info = {
        reason: '',
        reasonType: null,
        description: '',
        returnAddress: '',
        refundMethod: '',
        bank: '',
        accountNumber: '',
        accountHolder: '',
        mediaUrls: [],
    };

    // Parse reason - check for both patterns
    if (note.includes('Sản phẩm gặp sự cố từ cửa hàng')) {
        info.reason = 'Sản phẩm gặp sự cố từ cửa hàng';
        info.reasonType = 'store';
    } else if (note.includes('Thay đổi nhu cầu / Mua nhầm') || note.includes('Thay đổi nhu cầu')) {
        info.reason = 'Thay đổi nhu cầu / Mua nhầm';
        info.reasonType = 'customer';
    }

    // Parse description - look for "Mô tả:" or text after reason
    const descMatch = note.match(/Mô tả:\s*(.+?)(?:\n|Địa chỉ|Phương thức|$)/i);
    if (descMatch) {
        info.description = descMatch[1].trim();
    }

    // Parse return address - more flexible pattern (handle both with and without newlines)
    const addressMatch = note.match(/Địa chỉ gửi hàng:\s*(.+?)(?:\n|Phương thức|$)/i);
    if (addressMatch) {
        info.returnAddress = addressMatch[1].trim();
    } else {
        // Try without newline - look for "Địa chỉ gửi hàng:" followed by text until "Phương thức"
        const addressMatchNoNewline = note.match(/Địa chỉ gửi hàng:\s*([^Phương]+?)(?=Phương thức|$)/i);
        if (addressMatchNoNewline) {
            info.returnAddress = addressMatchNoNewline[1].trim();
        }
    }

    // Parse refund method - more flexible pattern
    const methodMatch = note.match(/Phương thức hoàn tiền:\s*(.+?)(?:\n|Ngân hàng|Số tài khoản|Chủ tài khoản|$)/i);
    if (methodMatch) {
        info.refundMethod = methodMatch[1].trim();
    } else {
        // Try without newline
        const methodMatchNoNewline = note.match(/Phương thức hoàn tiền:\s*([^Ngân|Số|Chủ]+?)(?=Ngân hàng|Số tài khoản|Chủ tài khoản|$)/i);
        if (methodMatchNoNewline) {
            info.refundMethod = methodMatchNoNewline[1].trim();
        }
    }

    // Parse bank info
    const bankMatch = note.match(/Ngân hàng:\s*(.+?)(?:\n|Số tài khoản|Chủ tài khoản|$)/i);
    if (bankMatch) {
        info.bank = bankMatch[1].trim();
    } else {
        const bankMatchNoNewline = note.match(/Ngân hàng:\s*([^Số|Chủ]+?)(?=Số tài khoản|Chủ tài khoản|$)/i);
        if (bankMatchNoNewline) {
            info.bank = bankMatchNoNewline[1].trim();
        }
    }

    const accountMatch = note.match(/Số tài khoản:\s*(.+?)(?:\n|Chủ tài khoản|$)/i);
    if (accountMatch) {
        info.accountNumber = accountMatch[1].trim();
    } else {
        const accountMatchNoNewline = note.match(/Số tài khoản:\s*([^Chủ]+?)(?=Chủ tài khoản|$)/i);
        if (accountMatchNoNewline) {
            info.accountNumber = accountMatchNoNewline[1].trim();
        }
    }

    const holderMatch = note.match(/Chủ tài khoản:\s*(.+?)(?:\n|$)/i);
    if (holderMatch) {
        info.accountHolder = holderMatch[1].trim();
    }

    return info;
};

// Calculate refund summary
const calculateRefund = (order, refundInfo) => {
    if (!order || !order.items) {
        return {
            productValue: 0,
            shippingFee: 0,
            secondShippingFee: 0,
            returnPenalty: 0,
            total: refundInfo.refundAmount ?? order?.refundAmount ?? 0,
            totalPaid: order?.refundTotalPaid ?? 0,
        };
    }

    const selectedItems = order.items.filter((item) =>
        refundInfo.selectedProducts.includes(item.id),
    );
    const productValue = selectedItems.reduce(
        (sum, item) => sum + (item.totalPrice || item.finalPrice || 0),
        0,
    );
    const shippingFee = order.shippingFee || 0;
    const totalPaid = order.refundTotalPaid ?? order.totalAmount ?? productValue + shippingFee;

    const estimatedReturnShippingFee = [
        order.refundSecondShippingFee,
        refundInfo.returnFee,
        order.refundReturnFee,
        order.estimatedReturnShippingFee,
        order.shippingFee,
    ].find((val) => typeof val === 'number') ?? 0;
    const secondShippingFee = Math.max(0, Math.round(estimatedReturnShippingFee));

    const storedPenalty = order.refundPenaltyAmount;
    const returnPenalty =
        typeof storedPenalty === 'number'
            ? storedPenalty
            : refundInfo.reasonType === 'customer'
                ? Math.max(0, Math.round(productValue * 0.1))
                : 0;

    const storedTotal = refundInfo.refundAmount ?? order.refundAmount;
    const total =
        typeof storedTotal === 'number'
            ? storedTotal
            : refundInfo.reasonType === 'store'
                ? totalPaid + secondShippingFee
                : Math.max(0, totalPaid - secondShippingFee - returnPenalty);

    return {
        productValue,
        shippingFee,
        secondShippingFee,
        returnPenalty,
        total,
        totalPaid,
    };
};

const ORDER_TABS = [
  { id: 'pending', label: 'Chờ xác nhận' },
  { id: 'ready', label: 'Chờ lấy hàng' },
  { id: 'shipping', label: 'Đang giao hàng' },
  { id: 'delivered', label: 'Đã giao' },
  { id: 'returned', label: 'Trả hàng' },
  { id: 'cancelled', label: 'Đã hủy' },
];

function OrdersSection({ getStatusClass, defaultTab }) {
  const navigate = useNavigate();
  const location = useLocation();
  
  // Get initial tab from URL query params, defaultTab prop, or default to first tab
  const getInitialTab = () => {
    const searchParams = new URLSearchParams(location.search);
    const tabFromUrl = searchParams.get('tab');
    return tabFromUrl || defaultTab || ORDER_TABS[0].id;
  };
  
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(() => getInitialTab());
  const [searchTerm, setSearchTerm] = useState('');
  const [orderDate, setOrderDate] = useState('');
  const [sortOption, setSortOption] = useState('newest');
  const [selectedOrderId, setSelectedOrderId] = useState(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isRefundModalOpen, setIsRefundModalOpen] = useState(false);
  const [orderDetails, setOrderDetails] = useState({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelling, setCancelling] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showRefundModal, setShowRefundModal] = useState(false);
  const [refundOrderId, setRefundOrderId] = useState(null);
  const itemsPerPage = 3;

  useEffect(() => {
    fetchOrders();
    
    // Auto-refresh orders every 30 seconds to get latest status updates
    const interval = setInterval(() => {
      fetchOrders();
    }, 30000); // 30 seconds
    
    // Also refresh when tab becomes visible (user switches back to tab)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        fetchOrders();
      }
    };
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    // Cleanup
    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Map status enum từ backend sang Vietnamese text
  const mapStatusToVietnamese = (status) => {
    if (!status) return 'Chờ xác nhận';
    const statusUpper = status.toUpperCase();
    // Map enum names từ backend
    if (statusUpper === 'CREATED' || statusUpper === 'PENDING') return 'Chờ xác nhận';
    if (statusUpper === 'CONFIRMED' || statusUpper === 'PAID') return 'Chờ lấy hàng';
    if (statusUpper === 'SHIPPED') return 'Đang giao hàng';
    if (statusUpper === 'DELIVERED') return 'Đã giao';
    // Phân biệt các trạng thái refund/return
    if (statusUpper === 'RETURN_REQUESTED') return 'Trả hàng/hoàn tiền';
    if (statusUpper === 'RETURN_CS_CONFIRMED') return 'CSKH đang xử lý';
    if (statusUpper === 'RETURN_STAFF_CONFIRMED') return 'Nhân viên xác nhận hàng';
    if (statusUpper === 'REFUNDED') return 'Hoàn tiền thành công';
    if (statusUpper === 'RETURN_REJECTED') return 'Từ chối Trả hàng/hoàn tiền';
    // Fallback cho các trạng thái return khác
    if (statusUpper.startsWith('RETURN_') || statusUpper === 'RETURNED') return 'Trả hàng/hoàn tiền';
    if (statusUpper === 'CANCELLED') return 'Đã hủy';
    // Fallback: check Vietnamese text
    const statusLower = status.toLowerCase();
    if (statusLower.includes('chờ xác nhận') || statusLower.includes('pending')) return 'Chờ xác nhận';
    if (statusLower.includes('chờ lấy hàng') || statusLower.includes('ready')) return 'Chờ lấy hàng';
    if (statusLower.includes('đang giao') || statusLower.includes('shipping')) return 'Đang giao hàng';
    if (statusLower.includes('đã giao') || statusLower.includes('delivered')) return 'Đã giao';
    if (statusLower.includes('trả hàng') || statusLower.includes('return') || statusLower.includes('refund')) return 'Trả hàng/hoàn tiền';
    if (statusLower.includes('đã hủy') || statusLower.includes('cancelled')) return 'Đã hủy';
    return 'Chờ xác nhận';
  };

  // Map status từ API sang statusKey
  const getStatusKey = (status) => {
    if (!status) return 'pending';
    const statusUpper = status.toUpperCase();
    // Map enum names từ backend
    if (statusUpper === 'CREATED' || statusUpper === 'PENDING') return 'pending';
    if (statusUpper === 'CONFIRMED' || statusUpper === 'PAID') return 'ready';
    if (statusUpper === 'SHIPPED') return 'shipping';
    if (statusUpper === 'DELIVERED') return 'delivered';
    // Phân biệt các trạng thái refund/return
    if (statusUpper === 'RETURN_REQUESTED') return 'returned';
    if (statusUpper === 'RETURN_CS_CONFIRMED') return 'returned';
    if (statusUpper === 'RETURN_STAFF_CONFIRMED') return 'returned';
    if (statusUpper === 'REFUNDED') return 'returned';
    if (statusUpper === 'RETURN_REJECTED') return 'returned';
    // Fallback cho các trạng thái return khác
    if (statusUpper.startsWith('RETURN_') || statusUpper === 'RETURNED') return 'returned';
    if (statusUpper === 'CANCELLED') return 'cancelled';
    // Fallback: check Vietnamese text or English keywords
    const statusLower = status.toLowerCase();
    if (statusLower.includes('chờ xác nhận') || statusLower.includes('pending')) return 'pending';
    if (statusLower.includes('chờ lấy hàng') || statusLower.includes('ready') || statusLower.includes('paid')) return 'ready';
    if (statusLower.includes('đang giao') || statusLower.includes('shipping')) return 'shipping';
    if (statusLower.includes('đã giao') || statusLower.includes('delivered')) return 'delivered';
    if (statusLower.includes('trả hàng') || statusLower.includes('return') || statusLower.includes('refund')) return 'returned';
    if (statusLower.includes('đã hủy') || statusLower.includes('cancelled')) return 'cancelled';
    return 'pending';
  };

  const fetchOrders = async () => {
    try {
      setLoading(true);
      const data = await orderService.getMyOrders();
      // Map dữ liệu từ API về format cần thiết
      const mappedOrders = Array.isArray(data)
        ? data
            .map((order, index) => {
              if (!order) return null;
              const orderDate = order.orderDateTime
                ? new Date(order.orderDateTime)
                : order.createdAt
                ? new Date(order.createdAt)
                : order.orderDate
                ? new Date(order.orderDate)
                : new Date();

              const rawStatus = order.status || 'CREATED';
              const status = mapStatusToVietnamese(rawStatus);
              const statusKey = getStatusKey(rawStatus);

              const mappedItems =
                order.items?.map((item, idx) => ({
                  name: item.name || item.product?.name || 'Sản phẩm',
                  quantity: item.quantity ?? 0,
                  thumbnail:
                    item.imageUrl ||
                    item.product?.defaultMedia?.mediaUrl ||
                    item.product?.mediaUrls?.[0] ||
                    defaultProductImage,
                  _idx: idx,
                })) || [];

              const orderId = order.id || order.code || `DH${order.id || index}`;
              const displayCode = order.code || order.id || `DH${order.id || index}`;

              return {
                key: orderId,
                id: orderId,
                orderId,
                displayCode,
                date: orderDate.toISOString().split('T')[0],
                dateDisplay: orderDate.toLocaleDateString('vi-VN'),
                total:
                  typeof order.totalAmount === 'number'
                    ? `${order.totalAmount.toLocaleString('vi-VN')}đ`
                    : order.totalAmount || '0đ',
                status,
                statusKey,
                items: mappedItems,
                rawStatus,
              };
            })
            .filter(Boolean)
        : [];
      setOrders(mappedOrders);
      
      // Fetch chi tiết đơn hàng cho những đơn hàng không có items
      // để lấy số lượng sản phẩm
      const ordersWithoutItems = mappedOrders.filter(order => 
        !order.items || order.items.length === 0
      );
      
      if (ordersWithoutItems.length > 0) {
        // Fetch chi tiết cho các đơn hàng không có items
        Promise.all(
          ordersWithoutItems.map(async (order) => {
            try {
              const detail = await orderService.getOrderById(order.orderId || order.id);
              if (detail && detail.items) {
                setOrderDetails((prev) => ({ ...prev, [order.orderId || order.id]: detail }));
              }
            } catch (err) {
              console.error(`Error fetching detail for order ${order.id}:`, err);
            }
          })
        );
      }
    } catch (error) {
      console.error('Error fetching orders:', error);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetail = async (orderId, orderStatus) => {
    if (!orderId) return;
    
    // Đóng tất cả modal trước
    setIsModalOpen(false);
    setIsRefundModalOpen(false);
    
    setSelectedOrderId(orderId);
    
    // Kiểm tra ngay dựa trên tab hiện tại - nếu ở tab "returned", luôn mở RefundOrderModal
    if (activeTab === 'returned') {
      setIsRefundModalOpen(true);
    } else {
      // Kiểm tra dựa trên status
      const statusUpper = String(orderStatus || '').trim().toUpperCase();
      const isReturnOrder = statusUpper.startsWith('RETURN_') || 
                           statusUpper === 'REFUNDED' || 
                           statusUpper === 'RETURNED';
      if (isReturnOrder) {
        setIsRefundModalOpen(true);
      } else {
        setIsModalOpen(true);
      }
    }
    
    // Nếu đã có cache, không cần load lại
    if (orderDetails[orderId]) {
      return;
    }
    
    // Load order detail
    try {
      setDetailLoading(true);
      const detail = await orderService.getOrderById(orderId);
      setOrderDetails((prev) => ({ ...prev, [orderId]: detail || null }));
      
      // Sau khi load xong, kiểm tra lại để đảm bảo mở đúng modal
      if (activeTab === 'returned') {
        setIsRefundModalOpen(true);
        setIsModalOpen(false);
      } else {
        const isReturnOrder = checkIfRefundOrder(detail, orderStatus);
        if (isReturnOrder) {
          setIsRefundModalOpen(true);
          setIsModalOpen(false);
        } else {
          setIsModalOpen(true);
          setIsRefundModalOpen(false);
        }
      }
    } catch (err) {
      console.error('OrdersSection: Lỗi khi tải chi tiết đơn hàng', err);
      // Nếu có lỗi và đang ở tab returned, vẫn mở RefundOrderModal
      if (activeTab === 'returned') {
        setIsRefundModalOpen(true);
        setIsModalOpen(false);
      } else {
        setIsModalOpen(true);
        setIsRefundModalOpen(false);
      }
    } finally {
      setDetailLoading(false);
    }
  };
  
  // Helper function to check if order is a refund order
  const checkIfRefundOrder = (order, orderStatus) => {
    // Nếu đang ở tab "returned", luôn coi là refund order
    if (activeTab === 'returned') {
      console.log('OrdersSection: Tab is "returned", opening RefundOrderModal');
      return true;
    }
    
    // Kiểm tra status
    const statusUpper = String(orderStatus || order?.status || '').trim().toUpperCase();
    if (statusUpper.startsWith('RETURN_') || 
        statusUpper === 'REFUNDED' || 
        statusUpper === 'RETURNED') {
      console.log('OrdersSection: Status indicates refund order:', statusUpper);
      return true;
    }
    
    // Kiểm tra các field refund trong order
    if (order) {
      if (order.refundReasonType || 
          order.refundDescription || 
          order.refundReturnAddress ||
          order.refundMethod ||
          order.refundMediaUrls ||
          (order.note && (
            order.note.includes('Yêu cầu hoàn tiền') ||
            order.note.includes('trả hàng') ||
            order.note.includes('hoàn tiền')
          ))) {
        console.log('OrdersSection: Order has refund fields, opening RefundOrderModal');
        return true;
      }
    }
    
    console.log('OrdersSection: Opening RegularOrderModal');
    return false;
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
    setIsRefundModalOpen(false);
    setSelectedOrderId(null);
    setShowCancelDialog(false);
  };

  const handleCancelOrder = () => {
    if (!selectedOrderId) return;
    setShowCancelDialog(true);
  };

  const handleConfirmCancel = async (reason) => {
    if (!selectedOrderId) return;
    try {
      setCancelling(true);
      const { ok } = await orderService.cancelOrder(selectedOrderId, reason);
      if (!ok) {
        alert('Không thể hủy đơn hàng. Vui lòng thử lại sau.');
        setCancelling(false);
        return;
      }
      // Cập nhật order details và refresh danh sách
      const updatedDetail = await orderService.getOrderById(selectedOrderId);
      setOrderDetails((prev) => ({ ...prev, [selectedOrderId]: updatedDetail || null }));
      // Refresh orders list
      await fetchOrders();
      // Đóng dialog và modal
      setShowCancelDialog(false);
      handleCloseModal();
      // Chuyển sang tab "Đã hủy"
      setActiveTab('cancelled');
    } catch (error) {
      console.error('Error cancelling order:', error);
      alert('Không thể hủy đơn hàng. Vui lòng thử lại sau.');
    } finally {
      setCancelling(false);
    }
  };

  const filteredOrders = useMemo(() => {
    const search = searchTerm.trim().toLowerCase();

    return orders
      .filter((order) => {
        // Kiểm tra statusKey trước (cách chính)
        let matchesTab = order.statusKey === activeTab;
        
        // Fallback: nếu statusKey không khớp, kiểm tra rawStatus trực tiếp
        // Điều này giúp xử lý trường hợp statusKey không được set đúng
        if (!matchesTab && order.rawStatus) {
          const rawStatus = String(order.rawStatus).trim().toUpperCase();
          const statusKeyFromRaw = getStatusKey(rawStatus);
          matchesTab = statusKeyFromRaw === activeTab;
          
          // Log để debug nếu có vấn đề với DELIVERED orders
          if (!matchesTab && activeTab === 'delivered' && rawStatus === 'DELIVERED') {
            console.warn('OrdersSection: DELIVERED order has mismatched statusKey:', {
              id: order.id,
              rawStatus: rawStatus,
              expectedStatusKey: 'delivered',
              actualStatusKey: order.statusKey,
              recalculatedStatusKey: statusKeyFromRaw
            });
          }
        }
        
        const matchesSearch =
          !search ||
          order.id.toLowerCase().includes(search) ||
          order.items?.some((item) => item.name.toLowerCase().includes(search));
        const matchesDate = !orderDate || order.date === orderDate;

        return matchesTab && matchesSearch && matchesDate;
      })
      .sort((a, b) =>
        sortOption === 'oldest'
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date),
      );
  }, [orders, activeTab, orderDate, searchTerm, sortOption]);

  // Sync activeTab with URL query params when URL changes (e.g., browser back/forward or reload)
  useEffect(() => {
    const searchParams = new URLSearchParams(location.search);
    const tabFromUrl = searchParams.get('tab');
    const tabToUse = tabFromUrl || defaultTab || ORDER_TABS[0].id;
    // Always sync with URL to ensure reload keeps the correct tab
    if (tabToUse !== activeTab) {
      setActiveTab(tabToUse);
    }
  }, [location.search]);

  // Reset về trang 1 khi thay đổi tab, search, filter
  useEffect(() => {
    setCurrentPage(1);
  }, [activeTab, searchTerm, orderDate, sortOption]);

  // Tính toán phân trang
  const totalPages = Math.ceil(filteredOrders.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedOrders = filteredOrders.slice(startIndex, endIndex);

  const handlePageChange = (page) => {
    setCurrentPage(page);
    // Scroll mượt mà lên đầu danh sách đơn hàng
    // Sử dụng requestAnimationFrame để đảm bảo DOM đã render xong
    requestAnimationFrame(() => {
      setTimeout(() => {
        // Tìm phần header của ordersCard để scroll đến đó
        const ordersCardElement = document.querySelector(`.${cx('ordersCard')}`);
        const ordersHeaderElement = document.querySelector(`.${cx('ordersHeader')}`);
        const ordersListElement = document.querySelector(`.${cx('ordersList')}`);
        
        const targetElement = ordersHeaderElement || ordersCardElement || ordersListElement;
        
        if (targetElement) {
          const elementTop = targetElement.getBoundingClientRect().top + window.pageYOffset;
          const offset = 100; // Offset để không sát quá đầu trang
          
          window.scrollTo({
            top: elementTop - offset,
            behavior: 'smooth'
          });
        } else {
          // Fallback: scroll lên đầu trang
          window.scrollTo({ 
            top: 0, 
            behavior: 'smooth' 
          });
        }
      }, 50);
    });
  };

  return (
    <div className={cx('card', 'ordersCard')}>
      <div className={cx('ordersHeader')}>
        <h2>Lịch sử mua hàng</h2>
        <p>Quản lý và theo dõi trạng thái các đơn hàng đã đặt tại Nova Beauty.</p>
      </div>

      <div className={cx('ordersTabs')}>
        {ORDER_TABS.map((tab) => (
          <button
            type="button"
            key={tab.id}
            className={cx('ordersTab', activeTab === tab.id && 'ordersTabActive')}
            onClick={() => {
              setActiveTab(tab.id);
              // Update URL query params to persist tab on reload
              const searchParams = new URLSearchParams(location.search);
              if (tab.id === ORDER_TABS[0].id) {
                // If selecting default tab, remove tab param
                searchParams.delete('tab');
              } else {
                searchParams.set('tab', tab.id);
              }
              // Preserve section param if exists
              if (!searchParams.get('section')) {
                searchParams.set('section', 'orders');
              }
              const newSearch = searchParams.toString();
              navigate(`${location.pathname}${newSearch ? `?${newSearch}` : ''}`, { replace: true });
            }}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className={cx('ordersFilters')}>
        <div className={cx('ordersSearchField')}>
          <FontAwesomeIcon icon={faMagnifyingGlass} />
          <input
            type="text"
            placeholder="Tìm kiếm theo mã đơn, tên sản phẩm,..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
          />
        </div>

        <div className={cx('ordersDateField')}>
          <FontAwesomeIcon icon={faCalendarDays} />
          <input
            type="date"
            value={orderDate}
            onChange={(event) => setOrderDate(event.target.value)}
          />
        </div>

        <button type="button" className={cx('btn', 'btnDark')}>
          Tìm kiếm
        </button>

        <div className={cx('ordersSortField')}>
          <label htmlFor="order-sort">Sắp xếp:</label>
          <select
            id="order-sort"
            value={sortOption}
            onChange={(event) => setSortOption(event.target.value)}
          >
            <option value="newest">Ngày mới nhất</option>
            <option value="oldest">Ngày cũ nhất</option>
          </select>
        </div>
      </div>

      <div className={cx('ordersList')}>
        {loading ? (
          <p className={cx('emptyMessage')}>Đang tải đơn hàng...</p>
        ) : filteredOrders.length === 0 ? (
          <p className={cx('emptyMessage')}>
            {orders.length === 0 
              ? 'Bạn chưa có đơn hàng nào.' 
              : 'Không có đơn hàng nào phù hợp với bộ lọc hiện tại.'}
          </p>
        ) : (
          paginatedOrders.map((order) => {
            const [firstItem] = order.items || [];
            // Tính tổng số lượng tất cả sản phẩm trong đơn
            // Nếu items rỗng, thử lấy từ orderDetails đã cache
            let itemsToCalculate = order.items || [];
            if (itemsToCalculate.length === 0 && orderDetails[order.orderId || order.id]?.items) {
              itemsToCalculate = orderDetails[order.orderId || order.id].items;
            }
            const totalQuantity = itemsToCalculate.reduce((sum, item) => {
              return sum + (item.quantity ?? 0);
            }, 0);
            return (
              <div key={order.id} className={cx('orderCard')}>
                <div className={cx('orderHeaderRow')}>
                  <div>
                    <p className={cx('orderCode')}>Đơn hàng #{order.displayCode || order.id}</p>
                    <span className={cx('orderDate')}>
                      Ngày đặt: {order.dateDisplay || order.date}
                    </span>
                  </div>
                  <span className={cx('orderStatus', getStatusClass(order.rawStatus || order.status))}>
                    {mapStatusToVietnamese(order.rawStatus || order.status)}
                  </span>
                </div>

                <div className={cx('orderBody')}>
                  {firstItem && (
                    <img
                      src={firstItem.thumbnail}
                      alt={firstItem.name}
                      className={cx('orderThumbnail')}
                    />
                  )}
                  <div className={cx('orderInfo')}>
                    <p className={cx('orderItemName')}>{firstItem?.name}</p>
                    <span className={cx('orderItemQuantity')}>
                      Số lượng: {totalQuantity}
                    </span>
                  </div>
                  <div className={cx('orderTotal')}>
                    <span>Tổng tiền</span>
                    <strong>{order.total}</strong>
                  </div>
                </div>

                <div className={cx('orderFooter')}>
                  {(() => {
                    const rawStatus = order.rawStatus || order.status || '';
                    const statusUpper = String(rawStatus).toUpperCase();
                    const isRejected = statusUpper === 'RETURN_REJECTED';
                    
                    if (isRejected) {
                      return (
                        <button 
                          type="button" 
                          className={cx('orderActionBtn')}
                          onClick={(e) => {
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedOrderId(order.orderId || order.id);
                            setShowCancelDialog(true);
                          }}
                        >
                          Hủy
                        </button>
                      );
                    }
                    
                    return null;
                  })()}
                  {order.statusKey === 'delivered' && (
                    <button
                      type="button"
                      className={cx('orderRefundBtn')}
                      onClick={() => {
                        const orderId = order.orderId || order.id;
                        setRefundOrderId(orderId);
                        setShowRefundModal(true);
                      }}
                    >
                      Trả hàng/hoàn tiền
                    </button>
                  )}
                  <button
                    type="button"
                    className={cx('orderDetailBtn')}
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      console.log('OrdersSection: Button clicked, activeTab:', activeTab);
                      handleViewDetail(order.orderId || order.id, order.status || order.statusKey);
                    }}
                  >
                    Xem chi tiết
                    <FontAwesomeIcon icon={faArrowRight} />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Pagination */}
      {!loading && filteredOrders.length > 0 && totalPages > 1 && (
        <div className={cx('ordersPagination')}>
          <div className={cx('paginationPages')}>
            {(() => {
              const pages = [];
              const showPages = 5; // Số trang hiển thị xung quanh trang hiện tại
              
              // Luôn hiển thị trang đầu tiên
              pages.push(
                <button
                  key={1}
                  type="button"
                  className={cx('paginationPage', currentPage === 1 && 'active')}
                  onClick={() => handlePageChange(1)}
                >
                  1
                </button>
              );
              
              if (totalPages <= showPages + 2) {
                // Nếu tổng số trang ít, hiển thị tất cả
                for (let i = 2; i <= totalPages; i++) {
                  pages.push(
                    <button
                      key={i}
                      type="button"
                      className={cx('paginationPage', currentPage === i && 'active')}
                      onClick={() => handlePageChange(i)}
                    >
                      {i}
                    </button>
                  );
                }
              } else {
                // Logic hiển thị thông minh cho nhiều trang
                let startPage = Math.max(2, currentPage - 1);
                let endPage = Math.min(totalPages - 1, currentPage + 1);
                
                // Điều chỉnh để luôn hiển thị 5 trang ở giữa (nếu có thể)
                if (currentPage <= 3) {
                  startPage = 2;
                  endPage = Math.min(5, totalPages - 1);
                } else if (currentPage >= totalPages - 2) {
                  startPage = Math.max(2, totalPages - 4);
                  endPage = totalPages - 1;
                }
                
                // Thêm dấu "..." sau trang 1 nếu cần
                if (startPage > 2) {
                  pages.push(
                    <span key="dots-start" className={cx('paginationDots')}>
                      ...
                    </span>
                  );
                }
                
                // Thêm các trang ở giữa
                for (let i = startPage; i <= endPage; i++) {
                  pages.push(
                    <button
                      key={i}
                      type="button"
                      className={cx('paginationPage', currentPage === i && 'active')}
                      onClick={() => handlePageChange(i)}
                    >
                      {i}
                    </button>
                  );
                }
                
                // Thêm dấu "..." trước trang cuối nếu cần
                if (endPage < totalPages - 1) {
                  pages.push(
                    <span key="dots-end" className={cx('paginationDots')}>
                      ...
                    </span>
                  );
                }
                
                // Luôn hiển thị trang cuối cùng
                pages.push(
                  <button
                    key={totalPages}
                    type="button"
                    className={cx('paginationPage', currentPage === totalPages && 'active')}
                    onClick={() => handlePageChange(totalPages)}
                  >
                    {totalPages}
                  </button>
                );
              }
              
              return pages;
            })()}
          </div>
          
          {currentPage > 1 && (
            <button
              type="button"
              className={cx('paginationPrev')}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              <FontAwesomeIcon icon={faAngleLeft} />
            </button>
          )}
          
          {currentPage < totalPages && (
            <button
              type="button"
              className={cx('paginationNext')}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              <FontAwesomeIcon icon={faAngleRight} />
            </button>
          )}
        </div>
      )}

      {/* Regular Order Detail Modal */}
      {isModalOpen && (
        <RegularOrderModal
          order={orderDetails[selectedOrderId]}
          loading={detailLoading}
          onClose={handleCloseModal}
          onCancel={() => setShowCancelDialog(true)}
          cancelling={cancelling}
        />
      )}

      {/* Refund Order Detail Modal */}
      {isRefundModalOpen && (
        <RefundOrderModal
          order={orderDetails[selectedOrderId]}
          loading={detailLoading}
          onClose={handleCloseModal}
          onSuccess={() => {
            fetchOrders(); // Refresh orders list after successful cancellation
          }}
        />
      )}

      {/* Cancel Order Dialog */}
      <CancelOrderDialog
        open={showCancelDialog}
        loading={cancelling}
        onConfirm={handleConfirmCancel}
        onCancel={() => !cancelling && setShowCancelDialog(false)}
      />

      {/* Refund Request Modal */}
      <RefundRequestModal
        open={showRefundModal}
        orderId={refundOrderId}
        onClose={() => {
          setShowRefundModal(false);
          setRefundOrderId(null);
        }}
        onSuccess={() => {
          fetchOrders(); // Refresh orders list after successful refund request
        }}
      />
    </div>
  );
}

export default OrdersSection;



