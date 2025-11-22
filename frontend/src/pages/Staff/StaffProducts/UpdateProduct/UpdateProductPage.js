import React from 'react';
import ProductFormModal from '../components/ProductFormModal';

function UpdateProductPage(props) {
  return (
    <ProductFormModal
      title="Sửa sản phẩm"
      submitLabel="Cập nhật"
      {...props}
    />
  );
}

export default UpdateProductPage;





