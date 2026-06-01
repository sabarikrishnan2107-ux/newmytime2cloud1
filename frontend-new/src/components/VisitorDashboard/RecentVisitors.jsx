"use client";

import { useTranslation } from "react-i18next";

export default function RecentVisitors() {
  const { t } = useTranslation();
  const visitors = [
    { name: "John Doe", type: t("visitor.dashboard.types.client"), time: "10:30 AM", statusKey: "checkedin" },
    { name: "Sarah Smith", type: t("visitor.dashboard.types.vendor"), time: "11:00 AM", statusKey: "checkedout" },
    { name: "Ali Khan", type: t("visitor.dashboard.types.interviewee"), time: "11:15 AM", statusKey: "pending" },
  ];

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full border border-gray-200 rounded-xl">
        <thead className="bg-gray-50">
          <tr>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">{t("visitor.common.name")}</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">{t("visitor.common.type")}</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">{t("visitor.common.time")}</th>
            <th className="p-3 text-left text-sm font-semibold text-gray-600">{t("visitor.common.status")}</th>
          </tr>
        </thead>
        <tbody>
          {visitors.map((v, index) => (
            <tr key={index} className="border-t">
              <td className="p-3">{v.name}</td>
              <td className="p-3">{v.type}</td>
              <td className="p-3">{v.time}</td>
              <td className={`p-3 font-medium ${
                v.statusKey === "checkedin"
                  ? "text-green-600"
                  : v.statusKey === "checkedout"
                  ? "text-gray-500"
                  : "text-yellow-600"
              }`}>
                {t(`visitor.common.statuses.${v.statusKey}`)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
