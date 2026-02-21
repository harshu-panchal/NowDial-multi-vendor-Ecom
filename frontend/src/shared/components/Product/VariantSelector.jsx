import { useState, useEffect } from 'react';
import { FiCheck } from 'react-icons/fi';
import { formatPrice } from '../../utils/helpers';

const VariantSelector = ({ variants, onVariantChange, currentPrice }) => {
  const [selectedVariant, setSelectedVariant] = useState(null);

  useEffect(() => {
    // Initialize with default variant or first available
    if (variants) {
      if (variants.defaultVariant) {
        setSelectedVariant(variants.defaultVariant);
      } else if (variants.sizes && variants.sizes.length > 0) {
        setSelectedVariant({ size: variants.sizes[0] });
      } else if (variants.colors && variants.colors.length > 0) {
        setSelectedVariant({ color: variants.colors[0] });
      }
    }
  }, [variants]);

  useEffect(() => {
    if (selectedVariant && onVariantChange) {
      onVariantChange(selectedVariant);
    }
  }, [selectedVariant, onVariantChange]);

  if (!variants || (!variants.sizes && !variants.colors)) {
    return null;
  }

  const handleSizeSelect = (size) => {
    setSelectedVariant((prev) => ({
      ...prev,
      size,
    }));
  };

  const handleColorSelect = (color) => {
    setSelectedVariant((prev) => ({
      ...prev,
      color,
    }));
  };

  const getVariantPrice = () => {
    if (!variants.prices || !selectedVariant) return currentPrice;
    
    if (selectedVariant.size && variants.prices[selectedVariant.size]) {
      return variants.prices[selectedVariant.size];
    }
    if (selectedVariant.color && variants.prices[selectedVariant.color]) {
      return variants.prices[selectedVariant.color];
    }
    return currentPrice;
  };

  const isVariantAvailable = (variantType, value) => {
    if (!variants.stock) return true;
    const key = variantType === 'size' ? `size_${value}` : `color_${value}`;
    return variants.stock[key] !== undefined && variants.stock[key] > 0;
  };

  return (
    <div className="space-y-6">
      {/* Size Variants */}
      {variants.sizes && variants.sizes.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Size: <span className="font-normal text-gray-600">{selectedVariant?.size || 'Select size'}</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {variants.sizes.map((size) => {
              const isSelected = selectedVariant?.size === size;
              const isAvailable = isVariantAvailable('size', size);
              
              return (
                <button
                  key={size}
                  onClick={() => handleSizeSelect(size)}
                  disabled={!isAvailable}
                  className={`relative px-6 py-3 rounded-xl font-semibold border-2 transition-all duration-300 ${
                    isSelected
                      ? 'border-primary-600 bg-primary-50 text-primary-700'
                      : isAvailable
                      ? 'border-gray-200 hover:border-primary-400 bg-white text-gray-700'
                      : 'border-gray-100 bg-gray-50 text-gray-400 cursor-not-allowed opacity-50'
                  }`}
                >
                  {size}
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                      <FiCheck className="text-white text-xs" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Color Variants */}
      {variants.colors && variants.colors.length > 0 && (
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-3">
            Color: <span className="font-normal text-gray-600">{selectedVariant?.color || 'Select color'}</span>
          </label>
          <div className="flex flex-wrap gap-3">
            {variants.colors.map((color) => {
              const isSelected = selectedVariant?.color === color;
              const isAvailable = isVariantAvailable('color', color);
              
              // Check if color is a hex code or color name
              const isHexColor = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/.test(color);
              
              return (
                <button
                  key={color}
                  onClick={() => handleColorSelect(color)}
                  disabled={!isAvailable}
                  className={`relative w-12 h-12 rounded-full border-2 transition-all duration-300 ${
                    isSelected
                      ? 'border-primary-600 scale-110 shadow-lg'
                      : isAvailable
                      ? 'border-gray-300 hover:border-primary-400 hover:scale-105'
                      : 'border-gray-200 opacity-50 cursor-not-allowed'
                  }`}
                  style={
                    isHexColor
                      ? {
                          backgroundColor: color,
                        }
                      : {}
                  }
                  title={color}
                >
                  {!isHexColor && (
                    <span className="text-xs font-semibold text-gray-700">{color.charAt(0)}</span>
                  )}
                  {isSelected && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-primary-600 rounded-full flex items-center justify-center">
                      <FiCheck className="text-white text-xs" />
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Price Display */}
      {getVariantPrice() !== currentPrice && (
        <div className="p-4 bg-primary-50 rounded-xl border border-primary-200">
          <p className="text-sm text-gray-600 mb-1">Selected variant price:</p>
          <p className="text-xl font-bold text-primary-700">{formatPrice(getVariantPrice())}</p>
        </div>
      )}
    </div>
  );
};

export default VariantSelector;

