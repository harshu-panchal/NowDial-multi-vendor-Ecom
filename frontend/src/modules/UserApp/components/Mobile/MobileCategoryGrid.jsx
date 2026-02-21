import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { categories } from "../../../../data/categories";
import LazyImage from "../../../../shared/components/LazyImage";

const MobileCategoryGrid = () => {
  return (
    <div className="px-4 py-4">
      <h2 className="text-xl font-bold text-gray-800 mb-4">
        Browse Categories
      </h2>
      <div className="flex gap-3 overflow-x-auto scrollbar-hide pb-2 -mx-4 px-4">
        {categories.map((category, index) => (
          <motion.div
            key={category.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: index * 0.05 }}
            className="flex-shrink-0">
            <Link
              to={`/category/${category.id}`}
              className="flex flex-col items-center gap-2 w-20">
              <div className="w-16 h-16 rounded-xl overflow-hidden bg-gray-100 ring-2 ring-gray-200">
                <LazyImage
                  src={category.image}
                  alt={category.name}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.target.src =
                      "https://via.placeholder.com/64x64?text=Category";
                  }}
                />
              </div>
              <span className="text-xs font-semibold text-gray-700 text-center line-clamp-2">
                {category.name}
              </span>
            </Link>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MobileCategoryGrid;
