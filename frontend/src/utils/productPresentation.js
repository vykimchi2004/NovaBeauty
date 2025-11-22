const normalizeToArray = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) {
    return value.filter(Boolean).map((item) => (typeof item === 'string' ? item.trim() : item)).filter(Boolean);
  }
  if (typeof value === 'string') {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }
  return [];
};

export const extractColorOptions = (product = {}) => {
  const candidates = [
    product.colorOptions,
    product.colors,
    product.availableColors,
    product.colorVariants,
    product.shades,
    product.lipstickColors,
    product.color
  ];

  const collected = [];

  candidates.forEach((source) => {
    const list = normalizeToArray(source);
    list.forEach((item) => {
      if (item && !collected.includes(item)) {
        collected.push(item);
      }
    });
  });

  return collected;
};

export const extractTextureInfo = (product = {}) => {
  return (
    product.texture ||
    product.textureDescription ||
    product.textureType ||
    product.structure ||
    product.characteristicStructure ||
    ''
  );
};

export const extractReviewHighlights = (product = {}) => {
  return (
    product.reviewHighlights ||
    product.reviewSummary ||
    product.advantages ||
    product.pros ||
    product.review ||
    ''
  );
};

