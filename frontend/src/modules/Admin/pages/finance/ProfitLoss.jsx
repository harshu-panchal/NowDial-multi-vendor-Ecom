import { useState, useEffect, useMemo } from "react";
import { FiDollarSign, FiTrendingUp, FiTrendingDown } from "react-icons/fi";
import { motion } from "framer-motion";
import ProfitLossChart from "../../components/Analytics/ProfitLossChart";
import AnimatedSelect from "../../components/AnimatedSelect";
import { formatPrice } from '../../../../shared/utils/helpers';
import { useAnalyticsStore } from "../../../../shared/store/analyticsStore";

const ProfitLoss = () => {
  const [period, setPeriod] = useState("month");
  const { financialSummary, isLoading, fetchFinancialSummary } = useAnalyticsStore();

  useEffect(() => {
    const periodMap = {
      week: 'daily',
      month: 'daily',
      year: 'monthly'
    };
    fetchFinancialSummary(periodMap[period] || 'monthly');
  }, [period, fetchFinancialSummary]);

  const chartData = useMemo(() => {
    return financialSummary.map(item => ({
      ...item,
      date: item._id,
    }));
  }, [financialSummary]);

  const financials = useMemo(() => {
    const revenue = financialSummary.reduce((sum, item) => sum + item.revenue, 0);
    // Derived values for demo consistency with mock UI
    const costOfGoods = revenue * 0.6;
    const operatingExpenses = revenue * 0.2;
    const grossProfit = revenue - costOfGoods;
    const netProfit = grossProfit - operatingExpenses;
    const profitMargin = revenue > 0 ? (netProfit / revenue) * 100 : 0;

    return {
      revenue,
      costOfGoods,
      operatingExpenses,
      grossProfit,
      netProfit,
      profitMargin,
    };
  }, [financialSummary]);

  if (isLoading && financialSummary.length === 0) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6">
      <div className="lg:hidden">
        <h1 className="text-2xl sm:text-3xl font-bold text-gray-800 mb-2">
          Profit & Loss
        </h1>
        <p className="text-sm sm:text-base text-gray-600">
          View financial performance and profitability
        </p>
      </div>

        <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-200">
        <AnimatedSelect
          value={period}
          onChange={(e) => setPeriod(e.target.value)}
          options={[
            { value: "week", label: "Last 7 Days" },
            { value: "month", label: "Last 30 Days" },
            { value: "year", label: "Last Year" },
          ]}
          className="min-w-[140px]"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Income</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Total Revenue</span>
              <span className="font-bold text-green-600">
                {formatPrice(financials.revenue)}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <h3 className="text-lg font-bold text-gray-800 mb-4">Expenses</h3>
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Cost of Goods Sold</span>
              <span className="font-bold text-red-600">
                {formatPrice(financials.costOfGoods)}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-gray-600">Operating Expenses</span>
              <span className="font-bold text-red-600">
                {formatPrice(financials.operatingExpenses)}
              </span>
            </div>
            <div className="border-t border-gray-200 pt-4 flex items-center justify-between">
              <span className="font-semibold text-gray-800">
                Total Expenses
              </span>
              <span className="font-bold text-red-600">
                {formatPrice(
                  financials.costOfGoods + financials.operatingExpenses
                )}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Gross Profit</p>
            <FiTrendingUp className="text-green-600" />
          </div>
          <p className="text-2xl font-bold text-green-600">
            {formatPrice(financials.grossProfit)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Net Profit</p>
            <FiDollarSign className="text-blue-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {formatPrice(financials.netProfit)}
          </p>
        </div>
        <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm text-gray-600">Profit Margin</p>
            <FiTrendingDown className="text-purple-600" />
          </div>
          <p className="text-2xl font-bold text-gray-800">
            {financials.profitMargin.toFixed(2)}%
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl p-6 shadow-sm border border-gray-200">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-gray-800">Financial Trends</h3>
          <AnimatedSelect
            value={period}
            onChange={(e) => setPeriod(e.target.value)}
            options={[
              { value: "week", label: "Last 7 Days" },
              { value: "month", label: "Last 30 Days" },
              { value: "year", label: "Last Year" },
            ]}
            className="min-w-[140px]"
          />
        </div>
        <ProfitLossChart data={chartData} period={period} />
      </div>
    </motion.div>
  );
};

export default ProfitLoss;
