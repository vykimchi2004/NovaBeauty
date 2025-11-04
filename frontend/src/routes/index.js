// Pages
import Home from '../pages/Home/Home';
import Makeup from '../pages/Categories/Makeup/Makeup';
import Skincare from '../pages/Categories/Skincare/Skincare';
import PersonalCare from '../pages/Categories/PersonalCare/PersonalCare';
import Perfume from '../pages/Categories/Perfume/Perfume';
import Accessories from '../pages/Categories/Accessories/Accessories';
import HairCare from '../pages/Categories/HairCare/HairCare';
import Promo from '../pages/Promo/Promo';
import Products from '../pages/Products';
import ProductDetail from '../pages/ProductDetail';

// Layouts
import DefaultLayout from '../layouts/DefaultLayout';
import { LoginModal } from '~/pages/Auth';

// Public routes
const publicRoutes = [
  { path: '/', component: Home, layout: DefaultLayout },
  { path: '/makeup', component: Makeup, layout: DefaultLayout },
  { path: '/skincare', component: Skincare, layout: DefaultLayout },
  { path: '/personal-care', component: PersonalCare, layout: DefaultLayout },
  { path: '/perfume', component: Perfume, layout: DefaultLayout },
  { path: '/accessories', component: Accessories, layout: DefaultLayout },
  { path: '/haircare', component: HairCare, layout: DefaultLayout },
  { path: '/promo', component: Promo, layout: DefaultLayout },
  { path: '/products', component: Products, layout: DefaultLayout },
  { path: '/product/:id', component: ProductDetail, layout: DefaultLayout },
];

const privateRoutes = [];

export { publicRoutes, privateRoutes };
