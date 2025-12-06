import React from 'react';
import ProductFormModal from '../ProductFormModal';

function AddProductPage(props) {
  return (
    <ProductFormModal
      title="Thêm sản phẩm mới"
      submitLabel="Thêm mới"
      {...props}
    />
  );
}

export default AddProductPage;


