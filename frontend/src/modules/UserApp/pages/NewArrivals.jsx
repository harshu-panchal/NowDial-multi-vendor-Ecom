import { useState, useMemo, useEffect, useRef } from 'react';
import { FiArrowLeft, FiFilter, FiGrid, FiList, FiX, FiTag, FiSearch } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import MobileLayout from "../components/Layout/MobileLayout";
import ProductCard from '../../../shared/components/ProductCard';
import ProductListItem from '../components/Mobile/ProductListItem';
import { getAllNewArrivals } from '../data/catalogData';
import PageTransition from '../../../shared/components/PageTransition';
import useInfiniteScroll from '../../../shared/hooks/useInfiniteScroll';

const MobileNewArrivals = () => {
    const navigate = useNavigate();
    const [catalogVersion, setCatalogVersion] = useState(0);
    // Memoize the items array to prevent infinite loops in useInfiniteScroll
    const allNewArrivals = useMemo(() => getAllNewArrivals(), [catalogVersion]);
    const [showFilters, setShowFilters] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [viewMode, setViewMode] = useState('grid'); // 'grid' or 'list'
    const [filters, setFilters] = useState({
        category: '',
        minPrice: '',
        maxPrice: '',
        minRating: '',
    });

    const filteredProducts = useMemo(() => {
        let result = allNewArrivals;

        if (filters.minPrice) {
            result = result.filter((product) => product.price >= parseFloat(filters.minPrice));
        }
        if (filters.maxPrice) {
            result = result.filter((product) => product.price <= parseFloat(filters.maxPrice));
        }
        if (filters.minRating) {
            result = result.filter(
                (product) => product.rating >= parseFloat(filters.minRating)
            );
        }

        if (searchQuery) {
            result = result.filter((product) =>
                product.name.toLowerCase().includes(searchQuery.toLowerCase())
            );
        }

        return result;
    }, [allNewArrivals, filters, searchQuery]);

    const { displayedItems, hasMore, isLoading, loadMore, loadMoreRef } = useInfiniteScroll(
        filteredProducts,
        5,
        5
    );

    const filterButtonRef = useRef(null);

    const handleFilterChange = (name, value) => {
        setFilters({ ...filters, [name]: value });
    };

    const clearFilters = () => {
        setFilters({
            category: '',
            minPrice: '',
            maxPrice: '',
            minRating: '',
        });
        setSearchQuery("");
    };

    // Check if any filter is active
    const hasActiveFilters =
        filters.minPrice || filters.maxPrice || filters.minRating || filters.category;

    // Close filter dropdown when clicking outside
    useEffect(() => {
        const handleClickOutside = (event) => {
            if (
                showFilters &&
                filterButtonRef.current &&
                !filterButtonRef.current.contains(event.target) &&
                !event.target.closest(".filter-dropdown")
            ) {
                setShowFilters(false);
            }
        };

        document.addEventListener("mousedown", handleClickOutside);
        document.addEventListener("touchstart", handleClickOutside);

        return () => {
            document.removeEventListener("mousedown", handleClickOutside);
            document.removeEventListener("touchstart", handleClickOutside);
        };
    }, [showFilters]);

    useEffect(() => {
        const handleCatalogUpdate = () => setCatalogVersion((prev) => prev + 1);
        window.addEventListener("catalog-cache-updated", handleCatalogUpdate);
        return () => {
            window.removeEventListener("catalog-cache-updated", handleCatalogUpdate);
        };
    }, []);

    return (
        <PageTransition>
            <MobileLayout showBottomNav={true} showCartBar={true}>
                <div className="w-full pb-24">
                    {/* Header */}
                    <div className="px-4 py-4 bg-gradient-to-r from-cyan-50 to-blue-50 border-b border-gray-200 sticky top-1 z-30">
                        <div className="flex items-center gap-3 mb-3">
                            <button
                                onClick={() => navigate(-1)}
                                className="p-2 hover:bg-white/50 rounded-full transition-colors"
                            >
                                <FiArrowLeft className="text-xl text-gray-700" />
                            </button>
                            <div className="flex-1">
                                <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                    New Arrivals <span className="text-cyan-500">✨</span>
                                </h1>
                                <p className="text-[10px] text-gray-500 mt-0.5">
                                    {filteredProducts.length} new items available
                                </p>
                            </div>
                            <div className="flex items-center gap-2">
                                {/* View Toggle Buttons */}
                                <div className="flex items-center bg-gray-100 rounded-lg p-1">
                                    <button
                                        onClick={() => setViewMode('list')}
                                        className={`p-1 rounded transition-colors ${viewMode === 'list'
                                            ? 'bg-white text-primary-600 shadow-sm'
                                            : 'text-gray-600'
                                            }`}
                                    >
                                        <FiList className="text-sm" />
                                    </button>
                                    <button
                                        onClick={() => setViewMode('grid')}
                                        className={`p-1 rounded transition-colors ${viewMode === 'grid'
                                            ? 'bg-white text-primary-600 shadow-sm'
                                            : 'text-gray-600'
                                            }`}
                                    >
                                        <FiGrid className="text-sm" />
                                    </button>
                                </div>
                                <div ref={filterButtonRef} className="relative">
                                    <button
                                        onClick={() => setShowFilters(!showFilters)}
                                        className={`p-1.5 glass-card rounded-lg hover:bg-white/80 transition-colors ${showFilters ? "bg-white/80" : ""
                                            }`}
                                    >
                                        <FiFilter
                                            className={`text-sm transition-colors ${hasActiveFilters ? "text-blue-600" : "text-gray-600"
                                                }`}
                                        />
                                    </button>

                                    {/* Filter Dropdown */}
                                    <AnimatePresence>
                                        {showFilters && (
                                            <>
                                                {/* Backdrop */}
                                                <motion.div
                                                    initial={{ opacity: 0 }}
                                                    animate={{ opacity: 1 }}
                                                    exit={{ opacity: 0 }}
                                                    onClick={() => setShowFilters(false)}
                                                    className="fixed inset-0 bg-black/20 z-[10000]"
                                                />
                                                <motion.div
                                                    initial={{ opacity: 0, y: -10, scale: 0.95 }}
                                                    animate={{ opacity: 1, y: 0, scale: 1 }}
                                                    exit={{ opacity: 0, y: -10, scale: 0.95 }}
                                                    transition={{
                                                        type: "spring",
                                                        stiffness: 300,
                                                        damping: 30,
                                                    }}
                                                    className="filter-dropdown absolute right-0 top-full w-56 bg-white rounded-xl shadow-2xl border border-gray-200 z-[10001] overflow-hidden"
                                                    style={{ marginTop: "-50px" }}>
                                                    {/* Header */}
                                                    <div className="flex items-center justify-between px-2 py-1.5 border-b border-gray-200 bg-gray-50">
                                                        <div className="flex items-center gap-1.5">
                                                            <FiFilter className="text-sm text-gray-700" />
                                                            <h3 className="text-sm font-bold text-gray-800">
                                                                Filters
                                                            </h3>
                                                        </div>
                                                        <button
                                                            onClick={() => setShowFilters(false)}
                                                            className="p-0.5 hover:bg-gray-200 rounded-full transition-colors">
                                                            <FiX className="text-sm text-gray-600" />
                                                        </button>
                                                    </div>

                                                    {/* Filter Content */}
                                                    <div className="max-h-[50vh] overflow-y-auto scrollbar-hide">
                                                        <div className="p-2 space-y-2">
                                                            {/* Price Range */}
                                                            <div>
                                                                <h4 className="font-semibold text-gray-700 mb-1 text-xs">
                                                                    Price Range
                                                                </h4>
                                                                <div className="space-y-1.5">
                                                                    <input
                                                                        type="number"
                                                                        placeholder="Min Price"
                                                                        value={filters.minPrice}
                                                                        onChange={(e) =>
                                                                            handleFilterChange("minPrice", e.target.value)
                                                                        }
                                                                        className="w-full px-2 py-1.5 rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                                                                    />
                                                                    <input
                                                                        type="number"
                                                                        placeholder="Max Price"
                                                                        value={filters.maxPrice}
                                                                        onChange={(e) =>
                                                                            handleFilterChange("maxPrice", e.target.value)
                                                                        }
                                                                        className="w-full px-2 py-1.5 rounded-md border border-gray-200 bg-white focus:outline-none focus:ring-1 focus:ring-primary-500 text-xs"
                                                                    />
                                                                </div>
                                                            </div>

                                                            {/* Rating Filter */}
                                                            <div>
                                                                <h4 className="font-semibold text-gray-700 mb-1 text-xs">
                                                                    Minimum Rating
                                                                </h4>
                                                                <div className="space-y-0.5">
                                                                    {[4, 3, 2, 1].map((rating) => (
                                                                        <label
                                                                            key={rating}
                                                                            className="flex items-center gap-1.5 cursor-pointer p-1 rounded-md hover:bg-gray-50 transition-colors">
                                                                            <input
                                                                                type="radio"
                                                                                name="minRating"
                                                                                value={rating}
                                                                                checked={
                                                                                    filters.minRating === rating.toString()
                                                                                }
                                                                                onChange={(e) =>
                                                                                    handleFilterChange(
                                                                                        "minRating",
                                                                                        e.target.value
                                                                                    )
                                                                                }
                                                                                className="w-3 h-3 appearance-none rounded-full border-2 border-gray-300 bg-white checked:bg-white checked:border-primary-500 relative cursor-pointer"
                                                                                style={{
                                                                                    backgroundImage:
                                                                                        filters.minRating === rating.toString()
                                                                                            ? "radial-gradient(circle, #10b981 40%, transparent 40%)"
                                                                                            : "none",
                                                                                }}
                                                                            />
                                                                            <span className="text-xs text-gray-700">
                                                                                {rating}+ Stars
                                                                            </span>
                                                                        </label>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Footer */}
                                                    <div className="border-t border-gray-200 p-2 bg-gray-50 space-y-1.5">
                                                        <button
                                                            onClick={clearFilters}
                                                            className="w-full py-1.5 bg-gray-200 text-gray-700 rounded-md font-semibold text-xs hover:bg-gray-300 transition-colors">
                                                            Clear All
                                                        </button>
                                                        <button
                                                            onClick={() => setShowFilters(false)}
                                                            className="w-full py-1.5 gradient-green text-white rounded-md font-semibold text-xs hover:shadow-glow-green transition-all">
                                                            Apply Filters
                                                        </button>
                                                    </div>
                                                </motion.div>
                                            </>
                                        )}
                                    </AnimatePresence>
                                </div>
                            </div>
                        </div>
                        {/* Full Width Search Bar */}
                        <div className="relative mt-2 w-full">
                            <FiSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm" />
                            <input
                                type="text"
                                placeholder="Search new arrivals..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                                className="w-full pl-9 pr-10 py-2.5 bg-white border border-gray-200 shadow-sm rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-primary-500/20 focus:border-primary-500 transition-all"
                            />
                            {searchQuery && (
                                <button
                                    onClick={() => setSearchQuery("")}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 p-1 hover:bg-gray-100 rounded-full transition-colors"
                                >
                                    <FiX className="text-sm" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Products List */}
                    <div className="px-4 py-4">
                        {filteredProducts.length === 0 ? (
                            <div className="text-center py-12">
                                <div className="text-6xl text-gray-300 mx-auto mb-4">🏷️</div>
                                <h3 className="text-xl font-bold text-gray-800 mb-2">No new arrivals</h3>
                                <p className="text-gray-600">Check back later for fresh products!</p>
                            </div>
                        ) : viewMode === 'grid' ? (
                            <>
                                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 xl:grid-cols-5 gap-3 md:gap-6">
                                    {displayedItems.map((product, index) => (
                                        <motion.div
                                            key={product.id}
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: index * 0.05 }}
                                        >
                                            <ProductCard product={product} />
                                        </motion.div>
                                    ))}
                                </div>

                                {hasMore && (
                                    <div ref={loadMoreRef} className="mt-6 flex flex-col items-center gap-4">
                                        {isLoading && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <span className="text-sm">Loading more products...</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={loadMore}
                                            disabled={isLoading}
                                            className="px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? 'Loading...' : 'Load More'}
                                        </button>
                                    </div>
                                )}
                            </>
                        ) : (
                            <>
                                <div className="space-y-3">
                                    {displayedItems.map((product, index) => (
                                        <ProductListItem
                                            key={product.id}
                                            product={product}
                                            index={index}
                                        />
                                    ))}
                                </div>

                                {hasMore && (
                                    <div ref={loadMoreRef} className="mt-6 flex flex-col items-center gap-4">
                                        {isLoading && (
                                            <div className="flex items-center gap-2 text-gray-600">
                                                <span className="text-sm">Loading more products...</span>
                                            </div>
                                        )}
                                        <button
                                            onClick={loadMore}
                                            disabled={isLoading}
                                            className="px-6 py-3 gradient-green text-white rounded-xl font-semibold hover:shadow-glow-green transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                                        >
                                            {isLoading ? 'Loading...' : 'Load More'}
                                        </button>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </MobileLayout>
        </PageTransition>
    );
};

export default MobileNewArrivals;
