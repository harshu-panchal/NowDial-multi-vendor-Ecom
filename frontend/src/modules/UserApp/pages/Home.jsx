import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Link } from "react-router-dom";
import { FiHeart } from "react-icons/fi";
import MobileLayout from "../components/Layout/MobileLayout";
import ProductCard from "../../../shared/components/ProductCard";
import AnimatedBanner from "../components/Mobile/AnimatedBanner";
import NewArrivalsSection from "../components/Mobile/NewArrivalsSection";
import DailyDealsSection from "../components/Mobile/DailyDealsSection";
import RecommendedSection from "../components/Mobile/RecommendedSection";
import FeaturedVendorsSection from "../components/Mobile/FeaturedVendorsSection";
import BrandLogosScroll from "../components/Mobile/BrandLogosScroll";
import LazyImage from "../../../shared/components/LazyImage";
import {
  getMostPopular,
  getTrending,
  getFlashSale,
} from "../data/catalogData";
import PageTransition from "../../../shared/components/PageTransition";
import usePullToRefresh from "../hooks/usePullToRefresh";
import toast from "react-hot-toast";
import heroSlide1 from "../../../../data/hero/slide1.png";
import heroSlide2 from "../../../../data/hero/slide2.png";
import heroSlide3 from "../../../../data/hero/slide3.png";
import heroSlide4 from "../../../../data/hero/slide4.png";
import stylishWatchImg from "../../../../data/products/stylish watch.png";

const MobileHome = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [dragOffset, setDragOffset] = useState(0);
  const [autoSlidePaused, setAutoSlidePaused] = useState(false);

  const slides = [
    { image: heroSlide1 },
    { image: heroSlide2 },
    { image: heroSlide3 },
    { image: heroSlide4 },
  ];

  const mostPopular = getMostPopular();
  const trending = getTrending();
  const flashSale = getFlashSale();

  // Auto-slide functionality (pauses when user is dragging)
  useEffect(() => {
    if (autoSlidePaused) return;

    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, [slides.length, autoSlidePaused]);

  // Minimum swipe distance (in pixels) to trigger slide change
  const minSwipeDistance = 50;

  const onTouchStart = (e) => {
    e.stopPropagation(); // Prevent pull-to-refresh from interfering
    setTouchEnd(null);
    const touch = e.targetTouches[0];
    setTouchStart(touch.clientX);
    setDragOffset(0);
    setAutoSlidePaused(true);
  };

  const onTouchMove = (e) => {
    if (touchStart === null) return;
    e.stopPropagation(); // Prevent pull-to-refresh from interfering
    const touch = e.targetTouches[0];
    const currentX = touch.clientX;
    // Calculate difference: positive when swiping left, negative when swiping right
    const diff = touchStart - currentX;
    // Constrain the drag offset to prevent over-dragging
    // Use container width for better responsiveness
    const containerWidth = e.currentTarget?.offsetWidth || 400;
    const maxDrag = containerWidth * 0.5; // Maximum drag distance (50% of container)
    // dragOffset: positive = swiping left (show next), negative = swiping right (show previous)
    setDragOffset(Math.max(-maxDrag, Math.min(maxDrag, diff)));
    setTouchEnd(currentX);
  };

  const onTouchEnd = (e) => {
    if (e) e.stopPropagation(); // Prevent pull-to-refresh from interfering

    if (touchStart === null) {
      setAutoSlidePaused(false);
      return;
    }

    // Calculate swipe distance: positive = left swipe, negative = right swipe
    const distance = touchStart - (touchEnd || touchStart);
    const isLeftSwipe = distance > minSwipeDistance; // Finger moved left = show next slide
    const isRightSwipe = distance < -minSwipeDistance; // Finger moved right = show previous slide

    if (isLeftSwipe) {
      // Swipe left (finger moved left) - go to next slide (slide moves left)
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    } else if (isRightSwipe) {
      // Swipe right (finger moved right) - go to previous slide (slide moves right)
      setCurrentSlide((prev) => (prev - 1 + slides.length) % slides.length);
    }

    // Reset touch state
    setTouchStart(null);
    setTouchEnd(null);
    setDragOffset(0);

    // Resume auto-slide after a short delay
    setTimeout(() => {
      setAutoSlidePaused(false);
    }, 2000);
  };

  // Pull to refresh handler
  const handleRefresh = async () => {
    return new Promise((resolve) => {
      setTimeout(() => {
        toast.success("Refreshed");
        resolve();
      }, 1000);
    });
  };

  const {
    pullDistance,
    isPulling,
    elementRef,
    handleTouchStart,
    handleTouchMove,
    handleTouchEnd,
  } = usePullToRefresh(handleRefresh);

  return (
    <PageTransition>
      <MobileLayout>
        <div
          ref={elementRef}
          className="w-full"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{
            transform: `translateY(${Math.min(pullDistance, 80)}px)`,
            transition: isPulling ? "none" : "transform 0.3s ease-out",
          }}>
          {/* Hero Banner */}
          <div className="px-4 py-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
              <div
                className="relative w-full h-48 md:h-80 lg:h-[400px] xl:h-[450px] rounded-xl md:rounded-2xl overflow-hidden lg:col-span-2"
                data-carousel
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
                style={{ touchAction: "pan-y", userSelect: "none" }}>
                {/* Slider Container - All slides in a row */}
                <motion.div
                  className="flex h-full"
                  style={{
                    width: `${slides.length * 100}%`,
                    height: "100%",
                  }}
                  animate={{
                    x:
                      dragOffset !== 0
                        ? `calc(-${currentSlide * (100 / slides.length)
                        }% - ${dragOffset}px)`
                        : `-${currentSlide * (100 / slides.length)}%`,
                  }}
                  transition={{
                    duration: dragOffset !== 0 ? 0 : 0.6,
                    ease: [0.25, 0.46, 0.45, 0.94], // Smooth easing
                    type: "tween",
                  }}>
                  {slides.map((slide, index) => (
                    <div
                      key={index}
                      className="flex-shrink-0"
                      style={{
                        width: `${100 / slides.length}%`,
                        height: "100%",
                      }}>
                      <LazyImage
                        src={slide.image}
                        alt={`Slide ${index + 1}`}
                        className="w-full h-full object-cover pointer-events-none select-none"
                        draggable={false}
                        onError={(e) => {
                          e.target.src = `https://via.placeholder.com/400x200?text=Slide+${index + 1
                            }`;
                        }}
                      />
                    </div>
                  ))}
                </motion.div>
                <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2 z-10 pointer-events-none">
                  {slides.map((_, index) => (
                    <button
                      key={index}
                      onClick={() => {
                        setCurrentSlide(index);
                        setAutoSlidePaused(true);
                        setTimeout(() => setAutoSlidePaused(false), 2000);
                      }}
                      className={`h-1.5 rounded-full transition-all pointer-events-auto ${index === currentSlide
                        ? "bg-white w-6"
                        : "bg-white/50 w-1.5"
                        }`}
                    />
                  ))}
                </div>
              </div>

              {/* Side Banner for Large Screens */}
              <div className="hidden lg:block lg:col-span-1 h-[400px] xl:h-[450px] rounded-2xl overflow-hidden relative bg-gray-900 group">
                <div className="absolute inset-0 bg-gradient-to-b from-transparent to-black/90 z-10" />
                <LazyImage
                  src={stylishWatchImg}
                  alt="Premium Watch"
                  className="w-full h-full object-contain p-8 group-hover:scale-110 transition-transform duration-700"
                  onError={(e) => {
                    e.target.src = "https://via.placeholder.com/400x400?text=Premium+Watch";
                  }}
                />
                <div className="absolute inset-x-0 bottom-0 p-8 z-20 flex flex-col items-center text-center">
                  <span className="text-yellow-400 font-bold text-3xl mb-2 tracking-wider drop-shadow-lg">PREMIUM</span>
                  <p className="text-gray-300 text-sm mb-6 font-medium">Exclusive Collection</p>
                  <Link
                    to="/offers"
                    className="bg-white text-gray-900 font-bold py-3.5 px-10 rounded-xl w-full hover:bg-gray-100 transition-all transform hover:-translate-y-1 shadow-lg hover:shadow-xl uppercase tracking-widest text-sm"
                  >
                    Shop Now
                  </Link>
                </div>
              </div>
            </div>
          </div>

          {/* Brand Logos Scroll */}
          <BrandLogosScroll />

          {/* Featured Vendors Section */}
          <FeaturedVendorsSection />

          {/* Animated Banner */}
          <AnimatedBanner />

          {/* New Arrivals */}
          <NewArrivalsSection />



          {/* Most Popular */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Most Popular</h2>
              <Link
                to="/search"
                className="text-sm text-primary-600 font-semibold">
                See All
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {mostPopular.slice(0, 6).map((product, index) => (
                <motion.div
                  key={product.id}
                  className={index === 5 ? "xl:hidden" : ""}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Daily Deals */}
          <DailyDealsSection />



          {/* Flash Sale */}
          {flashSale.length > 0 && (
            <div className="px-4 py-4 bg-gradient-to-br from-red-50 to-orange-50">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h2 className="text-xl font-bold text-gray-800">
                    Flash Sale
                  </h2>
                  <p className="text-xs text-gray-600">Limited time offers</p>
                </div>
                <Link
                  to="/flash-sale"
                  className="text-sm text-primary-600 font-semibold">
                  See All
                </Link>
              </div>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 md:gap-6">
                {flashSale.slice(0, 6).map((product, index) => (
                  <motion.div
                    key={product.id}
                    className={index === 5 ? "xl:hidden" : ""}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}>
                    <ProductCard product={product} isFlashSale={true} />
                  </motion.div>
                ))}
              </div>
            </div>
          )}

          {/* Trending Items */}
          <div className="px-4 py-4">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-gray-800">Trending Now</h2>
              <Link
                to="/search"
                className="text-sm text-primary-600 font-semibold">
                See All
              </Link>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
              {trending.slice(0, 6).map((product, index) => (
                <motion.div
                  key={product.id}
                  className={index === 5 ? "hidden xl:block 2xl:hidden" : ""}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}>
                  <ProductCard product={product} />
                </motion.div>
              ))}
            </div>
          </div>

          {/* Recommended for You */}
          <RecommendedSection />

          {/* Tagline Section */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
            className="px-4 py-12 text-left">
            <motion.h2
              className="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-black text-gray-400 leading-tight flex items-center justify-start gap-3 flex-wrap"
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, delay: 0.2 }}>
              <span>Shop from 50+ Trusted Vendors</span>
              <motion.span
                animate={{
                  scale: [1, 1.2, 1],
                }}
                transition={{
                  duration: 1.5,
                  repeat: Infinity,
                  repeatDelay: 2,
                }}
                className="text-primary-500 inline-block">
                <FiHeart className="text-5xl sm:text-6xl md:text-7xl lg:text-8xl fill-primary-500" />
              </motion.span>
            </motion.h2>
          </motion.div>

          {/* Bottom Spacing */}
          <div className="h-4" />
        </div>
      </MobileLayout>
    </PageTransition>
  );
};

export default MobileHome;
