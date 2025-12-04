// Pages
import Home from '../pages/Home/Home';
import CategoryPage from '../pages/Categories/CategoryPage';
import Makeup from '../pages/Categories/Makeup/Makeup';
import Skincare from '../pages/Categories/Skincare/Skincare';
import PersonalCare from '../pages/Categories/PersonalCare/PersonalCare';
import Perfume from '../pages/Categories/Perfume/Perfume';
import Accessories from '../pages/Categories/Accessories/Accessories';
import HairCare from '../pages/Categories/HairCare/HairCare';
import Promo from '../pages/Promo/Promo';
import Products from '../pages/Products/Products';
import BestSellersPage from '../pages/BestSellers/BestSellers';
import ProductDetail from '../pages/ProductDetail/ProductDetail';
import Profile from '../pages/Profile/Profile';
import AdminPage from '../pages/Admin/AdminPage';
import StaffPage from '../pages/Staff/StaffPage';
import Support from '../pages/Support/Support';
import CustomerSupportPage from '../pages/CustomerSupport/CustomerSupportPage';
import Cart from '../pages/Cart/Cart';
import Vouchers from '../pages/Vouchers/Vouchers';

// Layouts
import DefaultLayout from '../layouts/DefaultLayout/DefaultLayout';
import { LoginModal } from '~/pages/Auth';

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
  { path: '/cart', component: Cart, layout: DefaultLayout },
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
