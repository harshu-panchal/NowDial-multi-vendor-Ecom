import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { FiSave, FiX, FiUpload } from "react-icons/fi";
import { motion, AnimatePresence } from "framer-motion";
import { useCategoryStore } from "../../../shared/store/categoryStore";
import { useBrandStore } from "../../../shared/store/brandStore";
import {
  getProductById,
  createProduct,
  updateProduct,
  getAllVendors,
  uploadAdminImage,
} from "../services/adminService";
import CategorySelector from "./CategorySelector";
import AnimatedSelect from "./AnimatedSelect";
import toast from "react-hot-toast";
import Button from "./Button";

const ProductFormModal = ({ isOpen, onClose, productId, onSuccess }) => {
  const location = useLocation();
  const isAppRoute = location.pathname.startsWith("/app");
  const isEdit = productId && productId !== "new";

  const { categories, initialize: initCategories } = useCategoryStore();
  const { brands, initialize: initBrands } = useBrandStore();
  const [vendors, setVendors] = useState([]);
  const [isUploadingMainImage, setIsUploadingMainImage] = useState(false);
  const [isUploadingGallery, setIsUploadingGallery] = useState(false);

  const [formData, setFormData] = useState({
    name: "",
    unit: "",
    price: "",
    originalPrice: "",
    image: "",
    images: [],
    categoryId: null,
    subcategoryId: null,
    brandId: null,
    vendorId: "",
    stock: "in_stock",
    stockQuantity: "",
    totalAllowedQuantity: "",
    minimumOrderQuantity: "",
    warrantyPeriod: "",
    guaranteePeriod: "",
    hsnCode: "",
    flashSale: false,
    isNewArrival: false,
    isFeatured: false,
    isVisible: true,
    codAllowed: true,
    returnable: true,
    cancelable: true,
    taxIncluded: false,
    description: "",
    tags: [],
    variants: {
      sizes: [],
      colors: [],
      materials: [],
      prices: {},
      defaultVariant: {},
    },
    seoTitle: "",
    seoDescription: "",
    relatedProducts: [],
    faqs: [],
  });

  const extractId = (value) => {
    if (!value) return "";
    if (typeof value === "string") return value;
    if (typeof value === "object") return value._id || value.id || "";
    return String(value);
  };

  useEffect(() => {
    initCategories();
    initBrands();
  }, [initCategories, initBrands]);

  useEffect(() => {
    const fetchVendors = async () => {
      try {
        const response = await getAllVendors({ status: "approved", limit: 200 });
        const vendorRows = response.data?.vendors || [];
        setVendors(vendorRows);
      } catch (error) {
        setVendors([]);
      }
    };

    fetchVendors();
  }, []);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        const response = await getProductById(productId);
        const product = response.data;

        if (product) {
          const productCategoryId = extractId(product.categoryId);
          const productBrandId = extractId(product.brandId);
          const productVendorId = extractId(product.vendorId);

          // Determine if categoryId is a subcategory
          const category = categories.find(
            (cat) => String(cat.id) === String(productCategoryId) || String(cat._id) === String(productCategoryId)
          );
          const isSubcategory = category && category.parentId;

          setFormData({
            name: product.name || "",
            unit: product.unit || "",
            price: product.price || "",
            originalPrice: product.originalPrice || product.price || "",
            image: product.image || "",
            images: product.images || [],
            categoryId: isSubcategory
              ? category.parentId
              : productCategoryId || null,
            subcategoryId: isSubcategory
              ? productCategoryId
              : product.subcategoryId || null,
            brandId: productBrandId || null,
            vendorId: productVendorId || "",
            stock: product.stock || "in_stock",
            stockQuantity: product.stockQuantity || "",
            totalAllowedQuantity: product.totalAllowedQuantity || "",
            minimumOrderQuantity: product.minimumOrderQuantity || "",
            warrantyPeriod: product.warrantyPeriod || "",
            guaranteePeriod: product.guaranteePeriod || "",
            hsnCode: product.hsnCode || "",
            flashSale: product.flashSale || false,
            isNewArrival: product.isNewArrival || false,
            isFeatured: product.isFeatured || false,
            isVisible: product.isVisible !== undefined ? product.isVisible : true,
            codAllowed:
              product.codAllowed !== undefined ? product.codAllowed : true,
            returnable:
              product.returnable !== undefined ? product.returnable : true,
            cancelable:
              product.cancelable !== undefined ? product.cancelable : true,
            taxIncluded:
              product.taxIncluded !== undefined ? product.taxIncluded : false,
            description: product.description || "",
            tags: product.tags || [],
            variants: {
              sizes: product.variants?.sizes || [],
              colors: product.variants?.colors || [],
              materials: product.variants?.materials || [],
              prices: product.variants?.prices || {},
              defaultVariant: product.variants?.defaultVariant || {},
            },
            seoTitle: product.seoTitle || "",
            seoDescription: product.seoDescription || "",
            relatedProducts: product.relatedProducts || [],
            faqs: Array.isArray(product.faqs) ? product.faqs : [],
          });
        }
      } catch (error) {
        toast.error("Failed to fetch product details");
        onClose();
      }
    };

    if (isOpen && isEdit && productId && categories.length > 0) {
      fetchProduct();
    } else if (isOpen && !isEdit) {
      // Reset form for new product
      setFormData({
        name: "",
        unit: "",
        price: "",
        originalPrice: "",
        image: "",
        images: [],
        categoryId: null,
        subcategoryId: null,
        brandId: null,
        vendorId: "",
        stock: "in_stock",
        stockQuantity: "",
        totalAllowedQuantity: "",
        minimumOrderQuantity: "",
        warrantyPeriod: "",
        guaranteePeriod: "",
        hsnCode: "",
        flashSale: false,
        isNewArrival: false,
        isFeatured: false,
        isVisible: true,
        codAllowed: true,
        returnable: true,
        cancelable: true,
        taxIncluded: false,
        description: "",
        tags: [],
        variants: {
          sizes: [],
          colors: [],
          materials: [],
          prices: {},
          defaultVariant: {},
        },
        seoTitle: "",
        seoDescription: "",
        relatedProducts: [],
        faqs: [],
      });
    }
  }, [isOpen, isEdit, productId, onClose, categories]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type?.startsWith("image/")) {
      toast.error("Please select an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image size should be less than 5MB");
      return;
    }

    setIsUploadingMainImage(true);
    try {
      const response = await uploadAdminImage(file, "products");
      const imageUrl = response?.data?.url;
      if (!imageUrl) {
        toast.error("Image upload failed");
        return;
      }
      setFormData((prev) => ({
        ...prev,
        image: imageUrl,
      }));
      toast.success("Image uploaded");
    } catch (error) {
      // Error toast handled by api interceptor
    } finally {
      setIsUploadingMainImage(false);
      e.target.value = "";
    }
  };

  const handleGalleryUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    // Validate all files
    const validFiles = files.filter((file) => {
      if (!file.type.startsWith("image/")) {
        toast.error(`${file.name} is not an image file`);
        return false;
      }
      if (file.size > 5 * 1024 * 1024) {
        toast.error(`${file.name} size should be less than 5MB`);
        return false;
      }
      return true;
    });

    if (validFiles.length === 0) return;

    setIsUploadingGallery(true);
    try {
      const uploadResults = await Promise.allSettled(
        validFiles.map((file) => uploadAdminImage(file, "products"))
      );

      const successfulUrls = uploadResults
        .filter((result) => result.status === "fulfilled")
        .map((result) => result.value?.data?.url)
        .filter(Boolean);

      if (successfulUrls.length > 0) {
        setFormData((prev) => ({
          ...prev,
          images: [...(prev.images || []), ...successfulUrls],
        }));
        toast.success(`${successfulUrls.length} image(s) added to gallery`);
      }
    } finally {
      setIsUploadingGallery(false);
      e.target.value = "";
    }
  };

  const removeGalleryImage = (index) => {
    setFormData({
      ...formData,
      images: formData.images.filter((_, i) => i !== index),
    });
  };

  const handleFaqChange = (index, field, value) => {
    setFormData((prev) => {
      const nextFaqs = [...(prev.faqs || [])];
      nextFaqs[index] = {
        ...(nextFaqs[index] || { question: "", answer: "" }),
        [field]: value,
      };
      return { ...prev, faqs: nextFaqs };
    });
  };

  const addFaq = () => {
    setFormData((prev) => ({
      ...prev,
      faqs: [...(prev.faqs || []), { question: "", answer: "" }],
    }));
  };

  const removeFaq = (index) => {
    setFormData((prev) => ({
      ...prev,
      faqs: (prev.faqs || []).filter((_, i) => i !== index),
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.name || !formData.price || !formData.stockQuantity) {
      toast.error("Please fill in all required fields");
      return;
    }
    if (!formData.vendorId) {
      toast.error("Please select a vendor");
      return;
    }

    if (!formData.categoryId && !formData.subcategoryId) {
      toast.error("Please select a category");
      return;
    }

    const hasInvalidFaq = (formData.faqs || []).some((faq) => {
      const question = String(faq?.question || "").trim();
      const answer = String(faq?.answer || "").trim();
      return (question && !answer) || (!question && answer);
    });
    if (hasInvalidFaq) {
      toast.error("Each FAQ must have both question and answer");
      return;
    }

    // Determine final categoryId - use subcategoryId if selected, otherwise categoryId
    const finalCategoryId = formData.subcategoryId || formData.categoryId || null;

    if (!finalCategoryId) {
      toast.error("Please select a valid category");
      return;
    }

    const submissionData = {
      ...formData,
      price: parseFloat(formData.price),
      originalPrice: formData.originalPrice
        ? parseFloat(formData.originalPrice)
        : null,
      stockQuantity: parseInt(formData.stockQuantity),
      totalAllowedQuantity: formData.totalAllowedQuantity
        ? parseInt(formData.totalAllowedQuantity)
        : null,
      minimumOrderQuantity: formData.minimumOrderQuantity
        ? parseInt(formData.minimumOrderQuantity)
        : null,
      categoryId: finalCategoryId,
      subcategoryId: formData.subcategoryId || null,
      brandId: formData.brandId || null,
      vendorId: formData.vendorId || null,
      faqs: (formData.faqs || [])
        .map((faq) => ({
          question: String(faq?.question || "").trim(),
          answer: String(faq?.answer || "").trim(),
        }))
        .filter((faq) => faq.question && faq.answer),
    };

    try {
      if (isEdit) {
        await updateProduct(productId, submissionData);
        toast.success("Product updated successfully");
      } else {
        await createProduct(submissionData);
        toast.success("Product created successfully");
      }

      if (onSuccess) {
        onSuccess();
      }
      onClose();
    } catch (error) {
      // Error is handled in interceptor
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/50 z-[10000]"
          />

          {/* Modal Content - Mobile: Slide up from bottom, Desktop: Center with scale */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`fixed inset-0 z-[10000] flex ${isAppRoute ? "items-start pt-[10px]" : "items-end"
              } sm:items-center justify-center p-4 pointer-events-none`}>
            <motion.div
              variants={{
                hidden: {
                  y: isAppRoute ? "-100%" : "100%",
                  scale: 0.95,
                  opacity: 0,
                },
                visible: {
                  y: 0,
                  scale: 1,
                  opacity: 1,
                  transition: {
                    type: "spring",
                    damping: 22,
                    stiffness: 350,
                    mass: 0.7,
                  },
                },
                exit: {
                  y: isAppRoute ? "-100%" : "100%",
                  scale: 0.95,
                  opacity: 0,
                  transition: {
                    type: "spring",
                    damping: 30,
                    stiffness: 400,
                  },
                },
              }}
              initial="hidden"
              animate="visible"
              exit="exit"
              onClick={(e) => e.stopPropagation()}
              className={`bg-white ${isAppRoute ? "rounded-b-3xl" : "rounded-t-3xl"
                } sm:rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] flex flex-col pointer-events-auto`}
              style={{ willChange: "transform" }}>
              {/* Header */}
              <div className="flex items-center justify-between p-4 sm:p-6 border-b border-gray-200 flex-shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    {isEdit ? "Edit Product" : "Create Product"}
                  </h2>
                  <p className="text-sm text-gray-600 mt-1">
                    {isEdit
                      ? "Update product information"
                      : "Add a new product to your catalog"}
                  </p>
                </div>
                <button
                  onClick={onClose}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                  <FiX className="text-xl text-gray-600" />
                </button>
              </div>

              {/* Form Content - Scrollable */}
              <div className="overflow-y-auto flex-1 p-4 sm:p-6">
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Basic Information */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Basic Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Product Name <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="text"
                          name="name"
                          value={formData.name}
                          onChange={handleChange}
                          required
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Unit
                        </label>
                        <input
                          type="text"
                          name="unit"
                          value={formData.unit}
                          onChange={handleChange}
                          placeholder="e.g., Piece, Kilogram, Gram"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Category <span className="text-red-500">*</span>
                        </label>
                        <CategorySelector
                          value={formData.categoryId}
                          subcategoryId={formData.subcategoryId}
                          onChange={handleChange}
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Brand
                        </label>
                        <AnimatedSelect
                          name="brandId"
                          value={formData.brandId || ""}
                          onChange={handleChange}
                          placeholder="Select Brand"
                          options={[
                            { value: "", label: "Select Brand" },
                            ...brands
                              .filter((brand) => brand.isActive !== false)
                              .map((brand) => ({
                                value: String(brand.id),
                                label: brand.name,
                              })),
                          ]}
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Vendor <span className="text-red-500">*</span>
                        </label>
                        <AnimatedSelect
                          name="vendorId"
                          value={formData.vendorId || ""}
                          onChange={handleChange}
                          placeholder="Select Vendor"
                          options={[
                            { value: "", label: "Select Vendor" },
                            ...vendors.map((vendor) => ({
                              value: String(vendor._id || vendor.id),
                              label: vendor.storeName || vendor.name || "Vendor",
                            })),
                          ]}
                        />
                      </div>

                      <div className="md:col-span-2">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Description
                        </label>
                        <textarea
                          name="description"
                          value={formData.description}
                          onChange={handleChange}
                          rows={3}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Product description..."
                        />
                      </div>
                    </div>
                  </div>

                  {/* Pricing */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Pricing
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Price <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="price"
                          value={formData.price}
                          onChange={handleChange}
                          required
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Original Price (for discount)
                        </label>
                        <input
                          type="number"
                          name="originalPrice"
                          value={formData.originalPrice}
                          onChange={handleChange}
                          min="0"
                          step="0.01"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Product Media */}
                  <div className="bg-gradient-to-br from-primary-50 to-primary-100 rounded-xl p-4 sm:p-6 border-2 border-primary-200 shadow-lg">
                    <h3 className="text-xl font-bold text-primary-800 mb-6 flex items-center gap-2">
                      <FiUpload className="text-2xl" />
                      Product Media
                    </h3>

                    <div className="space-y-6">
                      {/* Main Image */}
                      <div className="bg-white rounded-lg p-4 border border-primary-200">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">
                          Main Image
                        </h4>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Upload Main Image
                          </label>
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleImageUpload}
                              className="hidden"
                              id="main-image-upload-modal"
                              disabled={isUploadingMainImage}
                            />
                            <label
                              htmlFor="main-image-upload-modal"
                              className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary-300 rounded-lg transition-colors bg-white ${isUploadingMainImage ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary-500 hover:bg-primary-50"}`}>
                              <FiUpload className="text-lg text-primary-600" />
                              <span className="text-sm font-medium text-gray-700">
                                {isUploadingMainImage
                                  ? "Uploading Main Image..."
                                  : formData.image
                                    ? "Change Main Image"
                                    : "Choose Main Image"}
                              </span>
                            </label>
                          </div>
                          {formData.image && (
                            <div className="mt-4 flex items-start gap-4">
                              <img
                                src={formData.image}
                                alt="Main Preview"
                                className="w-24 h-24 object-cover rounded-lg border-2 border-primary-300 shadow-md"
                                onError={(e) => {
                                  e.target.style.display = "none";
                                }}
                              />
                              <button
                                type="button"
                                onClick={() =>
                                  setFormData({ ...formData, image: "" })
                                }
                                className="mt-2 px-4 py-2 text-sm text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors font-medium">
                                Remove Image
                              </button>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Product Gallery */}
                      <div className="bg-white rounded-lg p-4 border border-primary-200">
                        <h4 className="text-lg font-semibold text-gray-800 mb-4">
                          Product Gallery
                        </h4>
                        <div>
                          <label className="block text-sm font-semibold text-gray-700 mb-2">
                            Upload Gallery Images (Multiple)
                          </label>
                          <div className="relative">
                            <input
                              type="file"
                              accept="image/*"
                              multiple
                              onChange={handleGalleryUpload}
                              className="hidden"
                              id="gallery-upload-modal"
                              disabled={isUploadingGallery}
                            />
                            <label
                              htmlFor="gallery-upload-modal"
                              className={`flex items-center justify-center gap-2 w-full px-4 py-3 border-2 border-dashed border-primary-300 rounded-lg transition-colors bg-white ${isUploadingGallery ? "cursor-not-allowed opacity-60" : "cursor-pointer hover:border-primary-500 hover:bg-primary-50"}`}>
                              <FiUpload className="text-lg text-primary-600" />
                              <span className="text-sm font-medium text-gray-700">
                                {isUploadingGallery
                                  ? "Uploading Gallery Images..."
                                  : "Choose Gallery Images"}
                              </span>
                            </label>
                          </div>
                          {formData.images && formData.images.length > 0 && (
                            <div className="mt-4">
                              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {formData.images.map((img, index) => (
                                  <div key={index} className="relative group">
                                    <img
                                      src={img}
                                      alt={`Gallery ${index + 1}`}
                                      className="w-full h-24 object-cover rounded-lg border-2 border-primary-300 shadow-md"
                                      onError={(e) => {
                                        e.target.style.display = "none";
                                      }}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => removeGalleryImage(index)}
                                      className="absolute top-1 right-1 p-1 bg-red-500 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                                      title="Remove image">
                                      <FiX className="text-xs" />
                                    </button>
                                  </div>
                                ))}
                              </div>
                              <p className="mt-2 text-xs text-gray-500">
                                {formData.images.length} image(s) in gallery
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Inventory */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Inventory
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Stock Quantity <span className="text-red-500">*</span>
                        </label>
                        <input
                          type="number"
                          name="stockQuantity"
                          value={formData.stockQuantity}
                          onChange={handleChange}
                          required
                          min="0"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Stock Status
                        </label>
                        <AnimatedSelect
                          name="stock"
                          value={formData.stock}
                          onChange={handleChange}
                          options={[
                            { value: "in_stock", label: "In Stock" },
                            { value: "low_stock", label: "Low Stock" },
                            { value: "out_of_stock", label: "Out of Stock" },
                          ]}
                        />
                      </div>
                    </div>
                  </div>

                  {/* Additional Product Information */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Additional Product Information
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Total Allowed Quantity
                        </label>
                        <input
                          type="number"
                          name="totalAllowedQuantity"
                          value={formData.totalAllowedQuantity}
                          onChange={handleChange}
                          min="0"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Enter total allowed quantity"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Minimum Order Quantity
                        </label>
                        <input
                          type="number"
                          name="minimumOrderQuantity"
                          value={formData.minimumOrderQuantity}
                          onChange={handleChange}
                          min="1"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Enter minimum order quantity"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Warranty Period
                        </label>
                        <input
                          type="text"
                          name="warrantyPeriod"
                          value={formData.warrantyPeriod}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="e.g., 1 Year, 6 Months"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Guarantee Period
                        </label>
                        <input
                          type="text"
                          name="guaranteePeriod"
                          value={formData.guaranteePeriod}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="e.g., 1 Year, 6 Months"
                        />
                      </div>

                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          HSN Code
                        </label>
                        <input
                          type="text"
                          name="hsnCode"
                          value={formData.hsnCode}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="Enter HSN Code"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Product Variants */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Product Variants
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Sizes (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={(formData.variants?.sizes || []).join(", ")}
                          onChange={(e) => {
                            const sizes = e.target.value
                              .split(",")
                              .map((s) => s.trim())
                              .filter((s) => s);
                            setFormData({
                              ...formData,
                              variants: { ...formData.variants, sizes },
                            });
                          }}
                          placeholder="S, M, L, XL"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          Colors (comma-separated)
                        </label>
                        <input
                          type="text"
                          value={(formData.variants?.colors || []).join(", ")}
                          onChange={(e) => {
                            const colors = e.target.value
                              .split(",")
                              .map((c) => c.trim())
                              .filter((c) => c);
                            setFormData({
                              ...formData,
                              variants: { ...formData.variants, colors },
                            });
                          }}
                          placeholder="Red, Blue, Green"
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Tags */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Tags
                    </h3>
                    <div>
                      <input
                        type="text"
                        value={(formData.tags || []).join(", ")}
                        onChange={(e) => {
                          const tags = e.target.value
                            .split(",")
                            .map((t) => t.trim())
                            .filter((t) => t);
                          setFormData({ ...formData, tags });
                        }}
                        placeholder="tag1, tag2, tag3"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    </div>
                  </div>

                  {/* Product FAQs */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-lg font-bold text-gray-800">Product FAQs</h3>
                      <button
                        type="button"
                        onClick={addFaq}
                        className="px-3 py-1.5 text-xs font-semibold bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
                      >
                        Add FAQ
                      </button>
                    </div>
                    <div className="space-y-3">
                      {(formData.faqs || []).map((faq, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-3 bg-gray-50 space-y-2">
                          <div className="flex items-center justify-between">
                            <p className="text-xs font-semibold text-gray-600">FAQ #{index + 1}</p>
                            <button
                              type="button"
                              onClick={() => removeFaq(index)}
                              className="text-xs text-red-600 hover:text-red-700"
                            >
                              Remove
                            </button>
                          </div>
                          <input
                            type="text"
                            value={faq.question || ""}
                            onChange={(e) => handleFaqChange(index, "question", e.target.value)}
                            placeholder="Question"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                          />
                          <textarea
                            value={faq.answer || ""}
                            onChange={(e) => handleFaqChange(index, "answer", e.target.value)}
                            rows={2}
                            placeholder="Answer"
                            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white"
                          />
                        </div>
                      ))}
                      {(formData.faqs || []).length === 0 && (
                        <p className="text-xs text-gray-500">No FAQs added yet.</p>
                      )}
                    </div>
                  </div>

                  {/* SEO */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      SEO Settings
                    </h3>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          SEO Title
                        </label>
                        <input
                          type="text"
                          name="seoTitle"
                          value={formData.seoTitle}
                          onChange={handleChange}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="SEO optimized title"
                        />
                      </div>
                      <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-2">
                          SEO Description
                        </label>
                        <textarea
                          name="seoDescription"
                          value={formData.seoDescription}
                          onChange={handleChange}
                          rows={2}
                          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                          placeholder="SEO meta description"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Options */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Options
                    </h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="flashSale"
                          checked={formData.flashSale}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          Flash Sale
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="isNewArrival"
                          checked={formData.isNewArrival}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          New Arrival
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="isFeatured"
                          checked={formData.isFeatured}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          Featured Product
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="isVisible"
                          checked={formData.isVisible}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          Visible to Customers
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Product Settings */}
                  <div>
                    <h3 className="text-lg font-bold text-gray-800 mb-4">
                      Product Settings
                    </h3>
                    <div className="space-y-2">
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="codAllowed"
                          checked={formData.codAllowed}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          COD Allowed
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="returnable"
                          checked={formData.returnable}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          Returnable
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="cancelable"
                          checked={formData.cancelable}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          Cancelable
                        </span>
                      </label>
                      <label className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          name="taxIncluded"
                          checked={formData.taxIncluded}
                          onChange={handleChange}
                          className="w-4 h-4 text-primary-600 rounded focus:ring-primary-500"
                        />
                        <span className="text-sm font-semibold text-gray-700">
                          Tax Included in Prices
                        </span>
                      </label>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
                    <Button
                      type="button"
                      onClick={onClose}
                      variant="secondary"
                      size="sm">
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      variant="primary"
                      icon={FiSave}
                      size="sm">
                      {isEdit ? "Update Product" : "Create Product"}
                    </Button>
                  </div>
                </form>
              </div>
            </motion.div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
};

export default ProductFormModal;
