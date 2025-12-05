export const formatFullAddress = (address) => {
  if (!address) return '';
  const parts = [address.address, address.wardName, address.districtName, address.provinceName]
    .filter(Boolean)
    .join(', ');
  return parts;
};

export const normalizeAddressPayload = (addr) => addr || {};

