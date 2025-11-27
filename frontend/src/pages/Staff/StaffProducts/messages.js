export const STAFF_PRODUCT_ERRORS = {
  productId: 'Mã sản phẩm không được để trống',
  name: 'Tên sản phẩm không được để trống',
  brand: 'Thương hiệu không được để trống',
  manufacturingLocation: 'Nơi sản xuất không được để trống',
  descriptionShort: 'Mô tả ngắn hiển thị trên trang chi tiết không được để trống',
  descriptionDetail: 'Mô tả chi tiết không được để trống',
  ingredients: 'Vui lòng nhập thành phần sản phẩm (mỗi dòng một thành phần)',
  uses: 'Vui lòng nhập công dụng sản phẩm',
  usageInstructions: 'Vui lòng nhập hướng dẫn sử dụng',
  characteristics: 'Vui lòng nhập đặc điểm nổi bật',
  mediaRequired: 'Vui lòng tải lên ít nhất một ảnh sản phẩm (có thể kèm video).',
  price: 'Giá sản phẩm phải lớn hơn 0',
  category: 'Vui lòng chọn danh mục',
  weight: 'Trọng lượng phải là số và lớn hơn hoặc bằng 0',
  tax: 'Thuế phải là số và lớn hơn hoặc bằng 0',
  discount: 'Giá trị giảm giá phải là số và lớn hơn hoặc bằng 0'
};

export const STAFF_PRODUCT_MESSAGES = {
  fetchError: 'Không thể tải danh sách sản phẩm. Vui lòng thử lại.',
  deleteConfirm: {
    message: 'Bạn có chắc chắn muốn xóa sản phẩm này?',
    title: 'Xác nhận xóa sản phẩm',
    confirmText: 'Xóa',
    cancelText: 'Hủy'
  },
  deleteSuccess: 'Xóa sản phẩm thành công!',
  deleteError: 'Không thể xóa sản phẩm. Vui lòng thử lại.',
  createSuccess: 'Thêm sản phẩm thành công!',
  updateSuccess: 'Cập nhật sản phẩm thành công!',
  saveError: 'Không thể lưu sản phẩm. Vui lòng thử lại.',
  mediaUploadError: 'Không thể tải tệp media lên. Vui lòng thử lại.',
  imageRequired: 'Vui lòng tải lên ít nhất một ảnh sản phẩm (có thể kèm video).',
  mediaLimitReached: (max) => `Bạn chỉ có thể tải tối đa ${max} tệp cho mỗi sản phẩm.`
};

