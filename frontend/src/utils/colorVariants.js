const COLOR_VARIANT_VERSION = 'COLOR_VARIANTS_V1';

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
    const imageUrl = ensureString(entry.imageUrl || entry.photoUrl || entry.thumbnailUrl);

    return {
      name,
      code,
      stockQuantity: stockQuantity !== null && stockQuantity !== undefined ? Number(stockQuantity) : null,
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

export const createEmptyVariantFormState = () => ({
  id: `variant-${Date.now()}-${Math.random().toString(16).slice(2)}`,
  name: '',
  code: '',
  stockQuantity: '',
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
      imageUrl: ensureString(variant.imageUrl),
    }))
    .filter((variant) => variant.name || variant.code);

export const serializeVariantPayload = (variants = []) =>
  JSON.stringify({
    type: COLOR_VARIANT_VERSION,
    variants,
  });

export const hasVariantData = (value) => normalizeVariantRecords(value).length > 0;


