const DEFAULT_STATUS_ALIASES = {
  DA_DUYET: ['DA_DUYET', 'DUOC_DUYET', 'DUYET', 'DA_DUYET_'],
  CHO_DUYET: ['CHO_DUYET', 'CHO_PHE_DUYET', 'CHUA_DUYET', 'CHUA_PHE_DUYET', 'DANG_CHO'],
  TU_CHOI: ['TU_CHOI', 'KHONG_DUYET', 'BI_TU_CHOI']
};

const DEFAULT_STATUS_PHRASE_MAP = {
  CHO_DUYET: [
    'cho duyet',
    'chờ duyệt',
    'cho phe duyet',
    'chờ phê duyệt',
    'chua duyet',
    'chưa duyệt',
    'chua phe duyet',
    'chưa phê duyệt',
    'dang cho'
  ],
  DA_DUYET: ['da duyet', 'đã duyệt', 'duoc duyet', 'được duyệt'],
  TU_CHOI: ['tu choi', 'từ chối', 'khong duyet', 'không duyệt', 'bi tu choi']
};

const STATUS_VALUE_CANDIDATES = ['status', 'value', 'code', 'key', 'name', 'type', 'state', 'displayName', 'label'];

const removeVietnameseTones = (value = '') =>
  value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/đ/gi, 'd');

const normalizeEnumKey = (value = '') =>
  removeVietnameseTones(value)
    .toUpperCase()
    .replace(/\s+/g, '_');

const normalizeLabelText = (value = '') =>
  removeVietnameseTones(value)
    .toLowerCase()
    .replace(/\s+/g, ' ')
    .trim();

export const resolveStatusValue = (status) => {
  if (status === null || status === undefined) return '';
  if (typeof status === 'string' || typeof status === 'number' || typeof status === 'boolean') {
    return String(status);
  }
  if (typeof status === 'object') {
    for (const key of STATUS_VALUE_CANDIDATES) {
      if (status[key]) return String(status[key]);
    }
  }
  return '';
};

export const createStatusHelpers = (
  statusConfig,
  {
    aliases = DEFAULT_STATUS_ALIASES,
    phraseMap = DEFAULT_STATUS_PHRASE_MAP
  } = {}
) => {
  const configKeys = Object.keys(statusConfig || {});

  const aliasLookup = Object.entries(aliases).reduce((acc, [canonical, aliasList]) => {
    if (!configKeys.includes(canonical)) return acc;
    [...aliasList, canonical].forEach((alias) => {
      acc[normalizeEnumKey(alias)] = canonical;
    });
    return acc;
  }, {});

  const filteredPhraseMap = Object.entries(phraseMap).reduce((acc, [canonical, phrases]) => {
    if (configKeys.includes(canonical)) {
      acc[canonical] = phrases;
    }
    return acc;
  }, {});

  const normalizeStatus = (status) => {
    const resolved = resolveStatusValue(status);
    if (!resolved && resolved !== 0) return '';
    const raw = String(resolved).trim();
    if (!raw) return '';

    if (statusConfig[raw]) return raw;

    const normalizedKey = normalizeEnumKey(raw);
    if (statusConfig[normalizedKey]) return normalizedKey;

    if (aliasLookup[normalizedKey]) return aliasLookup[normalizedKey];

    const normalizedLabel = normalizeLabelText(raw);

    const directMatch = Object.entries(statusConfig).find(
      ([, config]) => normalizeLabelText(config.label) === normalizedLabel
    );
    if (directMatch) return directMatch[0];

    for (const [canonical, phrases] of Object.entries(filteredPhraseMap)) {
      if (phrases.some((phrase) => normalizedLabel.includes(normalizeLabelText(phrase)))) {
        return canonical;
      }
    }

    return '';
  };

  const getNormalizedProductStatus = (product = {}) => {
    const normalized = normalizeStatus(product.status);
    if (normalized) return normalized;

    if (product.rejectionReason && !product.approvedAt && configKeys.includes('TU_CHOI')) {
      return 'TU_CHOI';
    }
    if (product.approvedAt && configKeys.includes('DA_DUYET')) {
      return 'DA_DUYET';
    }
    if (configKeys.includes('CHO_DUYET')) {
      return 'CHO_DUYET';
    }
    return '';
  };

  const formatStatusDisplay = (status) => {
    const normalized = normalizeStatus(status);
    if (normalized && statusConfig[normalized]) {
      return statusConfig[normalized].label;
    }

    const resolved = resolveStatusValue(status);
    return resolved || '-';
  };

  return {
    normalizeStatus,
    getNormalizedProductStatus,
    formatStatusDisplay
  };
};

