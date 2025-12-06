export const formatFullAddress = (address) => {
  if (!address) return '';
  const parts = [address.address, address.wardName, address.districtName, address.provinceName]
    .filter(Boolean)
    .join(', ');
  return parts;
};

export const normalizeAddressPayload = (form) => ({
    recipientName: form.recipientName?.trim() ?? '',
    recipientPhoneNumber: form.recipientPhoneNumber?.trim() ?? '',
    provinceName: form.provinceName ?? '',
    provinceID: form.provinceID ?? '',
    districtName: form.districtName ?? '',
    districtID: form.districtID ?? '',
    wardName: form.wardName ?? '',
    wardCode: form.wardCode ?? '',
    address: form.address?.trim() ?? '',
    postalCode: form.postalCode?.trim() ?? '',
    defaultAddress: !!form.defaultAddress,
});

