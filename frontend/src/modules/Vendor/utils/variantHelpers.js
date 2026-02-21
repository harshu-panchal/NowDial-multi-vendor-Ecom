const normalizePart = (value) => String(value || "").trim().toLowerCase();

const uniqueClean = (values) => {
  const seen = new Set();
  const out = [];
  for (const raw of values || []) {
    const value = String(raw || "").trim();
    if (!value) continue;
    const key = normalizePart(value);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(value);
  }
  return out;
};

export const parseVariantAxis = (text) =>
  uniqueClean(String(text || "").split(","));

export const createVariantKey = (size, color) =>
  `${normalizePart(size)}|${normalizePart(color)}`;

export const buildVariantCombinations = (sizes = [], colors = []) => {
  const cleanSizes = uniqueClean(sizes);
  const cleanColors = uniqueClean(colors);

  if (cleanSizes.length > 0 && cleanColors.length > 0) {
    return cleanSizes.flatMap((size) =>
      cleanColors.map((color) => ({ size, color, key: createVariantKey(size, color) }))
    );
  }
  if (cleanSizes.length > 0) {
    return cleanSizes.map((size) => ({ size, color: "", key: createVariantKey(size, "") }));
  }
  if (cleanColors.length > 0) {
    return cleanColors.map((color) => ({ size: "", color, key: createVariantKey("", color) }));
  }
  return [];
};

const toEntries = (rawPrices) => {
  if (!rawPrices) return [];
  if (rawPrices instanceof Map) return Array.from(rawPrices.entries());
  if (typeof rawPrices === "object") return Object.entries(rawPrices);
  return [];
};

const parsePriceValue = (value) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
};

const resolveCombinationPrice = (rawPrices, size, color) => {
  const entries = toEntries(rawPrices);
  if (!entries.length) return null;

  const sizePart = normalizePart(size);
  const colorPart = normalizePart(color);
  const candidates = [
    `${sizePart}|${colorPart}`,
    `${sizePart}-${colorPart}`,
    `${sizePart}_${colorPart}`,
    `${sizePart}:${colorPart}`,
    sizePart && !colorPart ? sizePart : null,
    colorPart && !sizePart ? colorPart : null,
  ].filter(Boolean);

  for (const candidate of candidates) {
    const exact = entries.find(([key]) => String(key).trim() === candidate);
    if (exact) {
      const parsed = parsePriceValue(exact[1]);
      if (parsed !== null) return parsed;
    }
    const normalized = entries.find(([key]) => normalizePart(key) === candidate);
    if (normalized) {
      const parsed = parsePriceValue(normalized[1]);
      if (parsed !== null) return parsed;
    }
  }
  return null;
};

export const normalizeVariantStateForForm = (rawVariants = {}, basePrice = "") => {
  const sizes = uniqueClean(rawVariants?.sizes || []);
  const colors = uniqueClean(rawVariants?.colors || []);
  const combinations = buildVariantCombinations(sizes, colors);
  const fallbackPrice = parsePriceValue(basePrice);

  const prices = {};
  combinations.forEach(({ size, color, key }) => {
    const resolved = resolveCombinationPrice(rawVariants?.prices, size, color);
    if (resolved !== null) prices[key] = resolved;
    else if (fallbackPrice !== null) prices[key] = fallbackPrice;
  });

  const defaultVariant = {
    size: String(rawVariants?.defaultVariant?.size || "").trim(),
    color: String(rawVariants?.defaultVariant?.color || "").trim(),
  };

  return { sizes, colors, prices, defaultVariant };
};

export const syncVariantPricesWithAxes = (currentPrices = {}, sizes = [], colors = [], fallbackPrice = "") => {
  const combinations = buildVariantCombinations(sizes, colors);
  const next = {};
  const parsedFallback = parsePriceValue(fallbackPrice);

  combinations.forEach(({ key }) => {
    const parsedCurrent = parsePriceValue(currentPrices[key]);
    if (parsedCurrent !== null) {
      next[key] = parsedCurrent;
    } else if (parsedFallback !== null) {
      next[key] = parsedFallback;
    }
  });
  return next;
};

export const buildVariantPayload = (rawVariants = {}) => {
  const sizes = uniqueClean(rawVariants?.sizes || []);
  const colors = uniqueClean(rawVariants?.colors || []);
  const combinations = buildVariantCombinations(sizes, colors);
  const prices = {};

  combinations.forEach(({ key }) => {
    const parsed = parsePriceValue(rawVariants?.prices?.[key]);
    if (parsed !== null) {
      prices[key] = parsed;
    }
  });

  const defaultVariant = {
    size: String(rawVariants?.defaultVariant?.size || "").trim(),
    color: String(rawVariants?.defaultVariant?.color || "").trim(),
  };

  const hasVariants = sizes.length > 0 || colors.length > 0;
  if (!hasVariants) return { sizes: [], colors: [], prices: {}, defaultVariant: {} };

  return {
    sizes,
    colors,
    prices,
    defaultVariant,
  };
};
