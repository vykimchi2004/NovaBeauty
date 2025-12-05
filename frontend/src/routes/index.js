// Pages
import Home from '../pages/Home/Home';
import CategoryPage from '../pages/Categories/CategoryPage';
import Promo from '../pages/Promo/Promo';
import Products from '../pages/Products/Products';
import BestSellersPage from '../pages/BestSellers/BestSellers';
import ProductDetail from '../pages/ProductDetail/ProductDetail';
import Profile from '../pages/Profile/Profile';
import AdminPage from '../pages/Admin/AdminPage';
import StaffPage from '../pages/Staff/StaffPage';
import Support from '../pages/CustomerSupport/Support';
import PaymentPolicyPage from '../pages/CustomerSupport/policies/PaymentPolicyPage';
import ShippingPolicyPage from '../pages/CustomerSupport/policies/ShippingPolicyPage';
import ReturnPolicyPage from '../pages/CustomerSupport/policies/ReturnPolicyPage';
import CustomerSupportPage from '../pages/CustomerSupportStaff/CustomerSupportPage';
import Cart from '../pages/Cart/Cart';
import CheckoutDetailPage from '../pages/CheckoutPage/CheckoutDetails/CheckoutDetailPage';
import ConfirmCheckoutPage from '../pages/CheckoutPage/ConfirmCheckout/ConfirmCheckoutPage';
import OrderSuccessPage from '../pages/CheckoutPage/OrderSuccess/OrderSuccessPage';
import Vouchers from '../pages/Vouchers/Vouchers';

// Layouts
import DefaultLayout from '../layouts/DefaultLayout/DefaultLayout';


// Public routes
const publicRoutes = [
  { path: '/', component: Home, layout: DefaultLayout },
  { path: '/makeup', component: CategoryPage, layout: DefaultLayout },
  { path: '/skincare', component: CategoryPage, layout: DefaultLayout },
  { path: '/personal-care', component: CategoryPage, layout: DefaultLayout },
  { path: '/perfume', component: CategoryPage, layout: DefaultLayout },
  { path: '/accessories', component: CategoryPage, layout: DefaultLayout },
  { path: '/haircare', component: CategoryPage, layout: DefaultLayout },
  { path: '/promo', component: Promo, layout: DefaultLayout },
  { path: '/products', component: Products, layout: DefaultLayout },
  { path: '/best-sellers', component: BestSellersPage, layout: DefaultLayout },
  { path: '/product/:id', component: ProductDetail, layout: DefaultLayout },
  { path: '/profile', component: Profile, layout: DefaultLayout },
  { path: '/support', component: Support, layout: DefaultLayout },
  { path: '/support/payment-policy', component: PaymentPolicyPage, layout: DefaultLayout },
  { path: '/support/shipping-policy', component: ShippingPolicyPage, layout: DefaultLayout },
  { path: '/support/return-policy', component: ReturnPolicyPage, layout: DefaultLayout },
  { path: '/cart', component: Cart, layout: DefaultLayout },
  { path: '/checkout', component: CheckoutDetailPage, layout: DefaultLayout },
  { path: '/checkout/confirm', component: ConfirmCheckoutPage, layout: DefaultLayout },
  { path: '/order-success', component: OrderSuccessPage, layout: DefaultLayout },
  { path: '/vouchers', component: Vouchers, layout: DefaultLayout },
  // Admin shell with nested routes
  { path: '/admin/*', component: AdminPage },
  // Staff shell with nested routes
  { path: '/staff/*', component: StaffPage },
  // Customer support shell
  { path: '/customer-support/*', component: CustomerSupportPage },
];

const privateRoutes = [];

export { publicRoutes, privateRoutes };
