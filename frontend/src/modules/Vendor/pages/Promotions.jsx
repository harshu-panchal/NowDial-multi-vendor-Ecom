import { useState, useEffect, useMemo, useCallback } from "react";
import {
  FiPlus,
  FiSearch,
  FiEdit,
  FiTrash2,
  FiTag,
  FiCopy,
  FiCheck,
  FiX,
} from "react-icons/fi";
import { motion } from "framer-motion";
import DataTable from "../../Admin/components/DataTable";
import ExportButton from "../../Admin/components/ExportButton";
import Badge from "../../../shared/components/Badge";
import ConfirmModal from "../../Admin/components/ConfirmModal";
import AnimatedSelect from "../../Admin/components/AnimatedSelect";
import { formatPrice } from "../../../shared/utils/helpers";
import { useVendorAuthStore } from "../store/vendorAuthStore";
import {
  getVendorPromotions,
  createVendorPromotion,
  updateVendorPromotion,
  deleteVendorPromotion,
} from "../services/vendorService";
import toast from "react-hot-toast";

const Promotions = () => {
  const { vendor } = useVendorAuthStore();
  const [promotions, setPromotions] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [editingPromo, setEditingPromo] = useState(null);
  const [deleteModal, setDeleteModal] = useState({ isOpen: false, id: null });
  const [copiedCode, setCopiedCode] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  const vendorId = vendor?.id || vendor?._id;

  const fetchPromotions = useCallback(async () => {
    if (!vendorId) return;
    setIsLoading(true);
    try {
      const response = await getVendorPromotions();
      setPromotions(Array.isArray(response?.data) ? response.data : []);
    } finally {
      setIsLoading(false);
    }
  }, [vendorId]);

  useEffect(() => {
    fetchPromotions();
  }, [fetchPromotions]);

  const filteredPromotions = useMemo(
    () =>
      promotions.filter((promo) => {
        const matchesSearch =
          !searchQuery ||
          promo.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
          promo.code?.toLowerCase().includes(searchQuery.toLowerCase());
        const matchesStatus =
          statusFilter === "all" || promo.status === statusFilter;
        return matchesSearch && matchesStatus;
      }),
    [promotions, searchQuery, statusFilter]
  );

  const handleSave = async (promoData) => {
    setIsSaving(true);
    try {
      if (editingPromo?._id) {
        await updateVendorPromotion(editingPromo._id, promoData);
        toast.success("Promotion updated");
      } else {
        await createVendorPromotion(promoData);
        toast.success("Promotion added");
      }
      setEditingPromo(null);
      setShowForm(false);
      fetchPromotions();
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteModal.id) return;
    setIsSaving(true);
    try {
      await deleteVendorPromotion(deleteModal.id);
      toast.success("Promotion deleted");
      setDeleteModal({ isOpen: false, id: null });
      fetchPromotions();
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = (code) => {
    if (!code) return;
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(null), 2000);
    toast.success("Code copied to clipboard");
  };

  const getStatusVariant = (status) => {
    const statusMap = {
      active: "success",
      inactive: "warning",
      expired: "error",
    };
    return statusMap[status] || "warning";
  };

  const columns = [
    {
      key: "name",
      label: "Name",
      sortable: true,
      render: (value, row) => (
        <div>
          <p className="font-semibold text-gray-800">{value}</p>
          {row.code && (
            <div className="flex items-center gap-2 mt-1">
              <code className="text-xs bg-gray-100 px-2 py-1 rounded">
                {row.code}
              </code>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleCopy(row.code);
                }}
                className="p-1 text-gray-600 hover:text-blue-600"
              >
                {copiedCode === row.code ? <FiCheck /> : <FiCopy />}
              </button>
            </div>
          )}
        </div>
      ),
    },
    {
      key: "type",
      label: "Type",
      sortable: true,
      render: (value) => (
        <Badge variant="info">
          {value === "discount"
            ? "Discount"
            : value === "flash_sale"
              ? "Flash Sale"
              : "Promo Code"}
        </Badge>
      ),
    },
    {
      key: "discountValue",
      label: "Discount",
      sortable: true,
      render: (value, row) => (
        <span className="font-semibold">
          {row.discountType === "percentage" ? `${value}%` : formatPrice(value)}
        </span>
      ),
    },
    {
      key: "startDate",
      label: "Period",
      sortable: true,
      render: (value, row) => (
        <div className="text-sm">
          <p>{new Date(value).toLocaleDateString()}</p>
          <p className="text-xs text-gray-500">
            to {new Date(row.endDate).toLocaleDateString()}
          </p>
        </div>
      ),
    },
    {
      key: "usageCount",
      label: "Usage",
      sortable: true,
      render: (value, row) => (
        <span className="text-sm">
          {value || 0} / {row.usageLimit || "Unlimited"}
        </span>
      ),
    },
    {
      key: "status",
      label: "Status",
      sortable: true,
      render: (value) => <Badge variant={getStatusVariant(value)}>{value}</Badge>,
    },
    {
      key: "actions",
      label: "Actions",
      sortable: false,
      render: (_, row) => (
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              setEditingPromo(row);
              setShowForm(true);
            }}
            className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
            title="Edit"
          >
            <FiEdit />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setDeleteModal({ isOpen: true, id: row._id });
            }}
            className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            title="Delete"
          >
            <FiTrash2 />
          </button>
        </div>
      ),
    },
  ];

  if (!vendorId) {
    return (
      <div className="text-center py-12">
        <p className="text-gray-500">Please log in to view promotions</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6"
    >
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div className="lg:hidden">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2 flex items-center gap-2">
            <FiTag className="text-primary-600" />
            Promotions & Offers
          </h1>
          <p className="text-sm sm:text-base text-gray-600">
            Manage discounts and promotional offers
          </p>
        </div>
        <button
          onClick={() => {
            setEditingPromo(null);
            setShowForm(true);
          }}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold"
        >
          <FiPlus />
          <span>Create Promotion</span>
        </button>
      </div>

      <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <div className="flex flex-col sm:flex-row flex-wrap items-stretch sm:items-center gap-3 sm:gap-4">
          <div className="relative flex-1 w-full sm:min-w-[200px]">
            <FiSearch className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search promotions..."
              className="w-full pl-10 pr-4 py-2.5 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 text-sm sm:text-base"
            />
          </div>

          <AnimatedSelect
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            options={[
              { value: "all", label: "All Status" },
              { value: "active", label: "Active" },
              { value: "inactive", label: "Inactive" },
              { value: "expired", label: "Expired" },
            ]}
            className="w-full sm:w-auto min-w-[140px]"
          />

          <div className="w-full sm:w-auto">
            <ExportButton
              data={filteredPromotions}
              headers={[
                { label: "Name", accessor: (row) => row.name },
                { label: "Code", accessor: (row) => row.code },
                { label: "Type", accessor: (row) => row.type },
                {
                  label: "Discount",
                  accessor: (row) =>
                    row.discountType === "percentage"
                      ? `${row.discountValue}%`
                      : formatPrice(row.discountValue),
                },
                { label: "Status", accessor: (row) => row.status },
                {
                  label: "Usage",
                  accessor: (row) =>
                    `${row.usageCount || 0} / ${row.usageLimit || "Unlimited"}`,
                },
              ]}
              filename="vendor-promotions"
            />
          </div>
        </div>
      </div>

      {isLoading ? (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">Loading promotions...</p>
        </div>
      ) : filteredPromotions.length > 0 ? (
        <DataTable
          data={filteredPromotions}
          columns={columns}
          pagination={true}
          itemsPerPage={10}
        />
      ) : (
        <div className="bg-white rounded-xl p-12 shadow-sm border border-gray-200 text-center">
          <p className="text-gray-500">No promotions found</p>
        </div>
      )}

      {showForm && (
        <PromotionForm
          promotion={editingPromo}
          onSave={handleSave}
          onClose={() => {
            setShowForm(false);
            setEditingPromo(null);
          }}
          isSaving={isSaving}
        />
      )}

      <ConfirmModal
        isOpen={deleteModal.isOpen}
        onClose={() => setDeleteModal({ isOpen: false, id: null })}
        onConfirm={handleDelete}
        title="Delete Promotion"
        message="Are you sure you want to delete this promotion? This action cannot be undone."
        confirmText="Delete"
        cancelText="Cancel"
        type="danger"
      />
    </motion.div>
  );
};

const PromotionForm = ({ promotion, onSave, onClose, isSaving }) => {
  const [formData, setFormData] = useState({
    name: promotion?.name || "",
    type: promotion?.type || "discount",
    code: promotion?.code || "",
    description: promotion?.description || "",
    discountType: promotion?.discountType || "percentage",
    discountValue: promotion?.discountValue || 0,
    minPurchase: promotion?.minPurchase || 0,
    maxDiscount: promotion?.maxDiscount || 0,
    startDate: promotion?.startDate
      ? new Date(promotion.startDate).toISOString().split("T")[0]
      : "",
    endDate: promotion?.endDate
      ? new Date(promotion.endDate).toISOString().split("T")[0]
      : "",
    usageLimit: promotion?.usageLimit || 0,
    status: promotion?.status || "active",
    productIds: promotion?.productIds || [],
  });

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!formData.startDate || !formData.endDate) {
      toast.error("Start and end dates are required");
      return;
    }

    if (new Date(formData.startDate) >= new Date(formData.endDate)) {
      toast.error("End date must be after start date");
      return;
    }

    onSave({
      ...formData,
      code: formData.type === "promo_code" ? formData.code : "",
      startDate: new Date(formData.startDate).toISOString(),
      endDate: new Date(formData.endDate).toISOString(),
      discountValue: Number(formData.discountValue) || 0,
      minPurchase: Number(formData.minPurchase) || 0,
      maxDiscount: Number(formData.maxDiscount) || 0,
      usageLimit: Number(formData.usageLimit) || 0,
    });
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-[10000] flex items-center justify-center p-4">
      <div className="bg-white rounded-xl p-6 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">
            {promotion ? "Edit Promotion" : "Create Promotion"}
          </h3>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <FiX className="text-xl text-gray-600" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Type *
            </label>
            <select
              value={formData.type}
              onChange={(e) => setFormData({ ...formData, type: e.target.value })}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="discount">Discount</option>
              <option value="flash_sale">Flash Sale</option>
              <option value="promo_code">Promo Code</option>
            </select>
          </div>

          {formData.type === "promo_code" && (
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Promo Code *
              </label>
              <input
                type="text"
                value={formData.code}
                onChange={(e) =>
                  setFormData({ ...formData, code: e.target.value.toUpperCase() })
                }
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                placeholder="SAVE20"
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Discount Type *
            </label>
            <select
              value={formData.discountType}
              onChange={(e) =>
                setFormData({ ...formData, discountType: e.target.value })
              }
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="percentage">Percentage</option>
              <option value="fixed">Fixed Amount</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Discount Value *
            </label>
            <input
              type="number"
              value={formData.discountValue}
              onChange={(e) =>
                setFormData({
                  ...formData,
                  discountValue: parseFloat(e.target.value),
                })
              }
              required
              min="0"
              step="0.01"
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                Start Date *
              </label>
              <input
                type="date"
                value={formData.startDate}
                onChange={(e) =>
                  setFormData({ ...formData, startDate: e.target.value })
                }
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-gray-600 mb-2">
                End Date *
              </label>
              <input
                type="date"
                value={formData.endDate}
                onChange={(e) =>
                  setFormData({ ...formData, endDate: e.target.value })
                }
                required
                className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-semibold text-gray-600 mb-2">
              Status *
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              required
              className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          <div className="flex justify-end gap-2 pt-4 border-t border-gray-200">
            <button
              type="button"
              onClick={onClose}
              className="px-6 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors font-semibold"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSaving}
              className="px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors font-semibold disabled:opacity-60"
            >
              {isSaving ? "Saving..." : promotion ? "Update" : "Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default Promotions;
