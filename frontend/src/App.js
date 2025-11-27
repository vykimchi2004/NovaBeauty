import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, useLocation } from 'react-router-dom';
import { publicRoutes } from './routes';
import { storage } from './services/utils';
import { STORAGE_KEYS } from './services/config';
import './App.css';

function ScrollToTop() {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo({
      top: 0,
      left: 0,
      behavior: 'instant'
    });
  }, [pathname]);

  return null;
}

function App() {
  // Tự động đăng xuất chỉ khi mở lại website (không phải reload)
  useEffect(() => {
    // Kiểm tra xem đây có phải là lần đầu mở website trong session này không
    const isFirstLoad = !sessionStorage.getItem('app_initialized');
    
    if (isFirstLoad) {
      // Đây là lần đầu mở website (không phải reload)
      // Đánh dấu rằng app đã được khởi tạo trong session này
      sessionStorage.setItem('app_initialized', 'true');
      
      // Xóa token và user info khi mở lại website
      storage.remove(STORAGE_KEYS.TOKEN);
      storage.remove(STORAGE_KEYS.USER);
      
      // Xóa cả sessionStorage nếu có
      try {
        sessionStorage.removeItem(STORAGE_KEYS.TOKEN);
        sessionStorage.removeItem(STORAGE_KEYS.USER);
      } catch (error) {
        console.warn('Error clearing sessionStorage:', error);
      }
    }
    // Nếu đã có flag 'app_initialized', nghĩa là đây là reload trang, không xóa token
  }, []); // Chỉ chạy một lần khi component mount

  return (
    <BrowserRouter>
      <ScrollToTop />
      <Routes>
        {publicRoutes.map((route, index) => {
          const Layout = route.layout || React.Fragment;
          const Component = route.component;
          
          return (
            <Route
              key={index}
              path={route.path}
              element={
                <Layout>
                  <Component />
                </Layout>
              }
            />
          );
        })}
      </Routes>
    </BrowserRouter>
  );
}

export default App;
