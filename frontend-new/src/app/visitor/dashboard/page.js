"use client";

import VisitorCards from '@/components/VisitorDashboard/VisitorCards';
import VisitorChart from '@/components/VisitorDashboard/VisitorChart';
import VisitorTypeChart from '@/components/VisitorDashboard/VisitorTypeChart';
import RecentVisitors from '@/components/VisitorDashboard/RecentVisitors';
import { useTranslation } from 'react-i18next';

export default function VisitorDashboard() {
  const { t } = useTranslation();
  return (
    <div className="p-8 bg-gray-100 min-h-screen">
      {/* Page Title */}
      <div className="text-4xl font-extrabold text-gray-800 mb-5">
        {t('visitor.dashboard.title')}
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
        <VisitorCards />
      </div>

      {/* Charts Section */}
      <h2 className="text-2xl font-bold text-gray-700 mb-5">{t('visitor.dashboard.trends')}</h2>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-10">
        <div className="bg-white p-6 rounded-xl shadow-xl">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {t('visitor.dashboard.dailyFlow')}
          </h3>
          <VisitorChart />
        </div>

        <div className="bg-white p-6 rounded-xl shadow-xl">
          <h3 className="text-xl font-bold text-gray-800 mb-4">
            {t('visitor.dashboard.typeBreakdown')}
          </h3>
          <VisitorTypeChart />
        </div>
      </div>

      {/* Recent Visitors Table */}
      <div className="bg-white p-6 rounded-xl shadow-xl">
        <h3 className="text-xl font-bold text-gray-800 mb-4">{t('visitor.dashboard.recentVisitors')}</h3>
        <RecentVisitors />
      </div>
    </div>
  );
}
