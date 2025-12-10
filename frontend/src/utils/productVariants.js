const PRODUCT_VARIANT_VERSION = 'COLOR_VARIANTS_V1';

const ensureString = (value) => (value ?? '').toString().trim();

const convertEntryToVariant = (entry) => {
  if (!entry) return null;
  if (typeof entry === 'string' || typeof entry === 'number') {
    const text = ensureString(entry);
    if (!text) return null;
    return {
      name: text,
      code: text,
      stockQuantity: null,
      imageUrl: '',
    };
  }
  if (typeof entry === 'object') {
    const name = ensureString(entry.name || entry.label || entry.displayName);
    const code = ensureString(entry.code || entry.hex || entry.colorCode || entry.value);
    const stockQuantity =
      entry.stockQuantity ?? entry.quantity ?? entry.inventory ?? entry.stock ?? null;
    const quantitySold =
      entry.quantitySold ?? entry.sold ?? entry.soldQuantity ?? null;
    const price = entry.price ?? null;
    const purchasePrice = entry.purchasePrice ?? null;
    const length = entry.length ?? null;
    const width = entry.width ?? null;
    const height = entry.height ?? null;
    const weight = entry.weight ?? null;
    const imageUrl = ensureString(entry.imageUrl || entry.photoUrl || entry.thumbnailUrl);

    return {
      name,
      code,
      stockQuantity: stockQuantity !== null && stockQuantity !== undefined ? Number(stockQuantity) : null,
      quantitySold: quantitySold !== null && quantitySold !== undefined ? Number(quantitySold) : null,
      price: price !== null && price !== undefined ? Number(price) : null,
      purchasePrice: purchasePrice !== null && purchasePrice !== undefined ? Number(purchasePrice) : null,
      length: length !== null && length !== undefined ? Number(length) : null,
      width: width !== null && width !== undefined ? Number(width) : null,
      height: height !== null && height !== undefined ? Number(height) : null,
      weight: weight !== null && weight !== undefined ? Number(weight) : null,
      imageUrl,
    };
  }
  return null;
};

export const normalizeVariantRecords = (value) => {
  if (!value) return [];

  const parse = (raw) => {
    if (!raw) return [];
    if (Array.isArray(raw)) {
      return raw
        .map(convertEntryToVariant)
        .filter(Boolean);
    }
    if (typeof raw === 'object') {
      if (Array.isArray(raw.variants)) return parse(raw.variants);
      if (Array.isArray(raw.colors)) return parse(raw.colors);
      if (Array.isArray(raw.data)) return parse(raw.data);
    }
    if (typeof raw === 'string') {
      try {
        const parsed = JSON.parse(raw);
        return parse(parsed);
      } catch {
        return raw
          .split(',')
          .map((part) => convertEntryToVariant(part))
          .filter(Boolean);
      }
    }
    return [];
  };

  return parse(value);
};

// Lấy variantLabel từ manufacturingLocation JSON
export const getVariantLabel = (value) => {
  if (!value) return 'Mã màu';
  
  try {
    if (typeof value === 'string') {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && parsed.variantLabel) {
        return parsed.variantLabel;
      }
    } else if (typeof value === 'object' && value.variantLabel) {
      return value.variantLabel;
    }
  } catch {
    // Nếu không parse được, dùng mặc định
  }
  
  return 'Mã màu';
};

export const createEmptyVariantFormState = () => ({
  id: `variant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: '',
  code: '',
  stockQuantity: '',
  price: '', // Giá riêng cho variant (nếu khác giá)
  purchasePrice: '', // Giá nhập riêng cho variant (nếu khác giá)
  length: '', // Chiều dài (cm) cho variant (nếu khác giá)
  width: '', // Chiều rộng (cm) cho variant (nếu khác giá)
  height: '', // Chiều cao (cm) cho variant (nếu khác giá)
  weight: '', // Trọng lượng (gram) cho variant (nếu khác giá)
  imageUrl: '',
  imagePreview: '',
  imageFile: null,
});

export const mapVariantsToFormState = (rawValue) => {
  const normalized = normalizeVariantRecords(rawValue);
  if (!normalized.length) return [];

  return normalized.map((variant) => ({
    ...createEmptyVariantFormState(),
    name: ensureString(variant.name || variant.code),
    code: ensureString(variant.code || variant.name),
    stockQuantity:
      variant.stockQuantity !== undefined && variant.stockQuantity !== null
        ? ensureString(variant.stockQuantity)
        : '',
    price:
      variant.price !== undefined && variant.price !== null
        ? ensureString(variant.price)
        : '',
    purchasePrice:
      variant.purchasePrice !== undefined && variant.purchasePrice !== null
        ? ensureString(variant.purchasePrice)
        : '',
    length:
      variant.length !== undefined && variant.length !== null
        ? ensureString(variant.length)
        : '',
    width:
      variant.width !== undefined && variant.width !== null
        ? ensureString(variant.width)
        : '',
    height:
      variant.height !== undefined && variant.height !== null
        ? ensureString(variant.height)
        : '',
    weight:
      variant.weight !== undefined && variant.weight !== null
        ? ensureString(variant.weight)
        : '',
    imageUrl: ensureString(variant.imageUrl),
    imagePreview: ensureString(variant.imageUrl),
  }));
};

export const buildVariantPayload = (variants = []) =>
  variants
    .map((variant) => ({
      name: ensureString(variant.name) || null,
      code: ensureString(variant.code) || null,
      stockQuantity:
        variant.stockQuantity !== undefined && variant.stockQuantity !== null && variant.stockQuantity !== ''
          ? Number(variant.stockQuantity)
          : null,
      quantitySold:
        variant.quantitySold !== undefined && variant.quantitySold !== null && variant.quantitySold !== ''
          ? Number(variant.quantitySold)
          : 0, // Mặc định là 0 khi tạo variant mới
      price:
        variant.price !== undefined && variant.price !== null && variant.price !== ''
          ? Number(variant.price)
          : null, // Giá riêng cho variant (nếu khác giá)
      purchasePrice:
        variant.purchasePrice !== undefined && variant.purchasePrice !== null && variant.purchasePrice !== ''
          ? Number(variant.purchasePrice)
          : null, // Giá nhập riêng cho variant (nếu khác giá)
      length:
        variant.length !== undefined && variant.length !== null && variant.length !== ''
          ? Number(variant.length)
          : null, // Chiều dài (cm) cho variant (nếu khác giá)
      width:
        variant.width !== undefined && variant.width !== null && variant.width !== ''
          ? Number(variant.width)
          : null, // Chiều rộng (cm) cho variant (nếu khác giá)
      height:
        variant.height !== undefined && variant.height !== null && variant.height !== ''
          ? Number(variant.height)
          : null, // Chiều cao (cm) cho variant (nếu khác giá)
      weight:
        variant.weight !== undefined && variant.weight !== null && variant.weight !== ''
          ? Number(variant.weight)
          : null, // Trọng lượng (gram) cho variant (nếu khác giá)
      imageUrl: ensureString(variant.imageUrl),
    }))
    .filter((variant) => variant.name || variant.code);

export const serializeVariantPayload = (variants = [], variantLabel = null) =>
  JSON.stringify({
    type: PRODUCT_VARIANT_VERSION,
    variantLabel: variantLabel || 'Mã màu', // Lưu label vào JSON
    variants,
  });

export const hasVariantData = (value) => normalizeVariantRecords(value).length > 0;



