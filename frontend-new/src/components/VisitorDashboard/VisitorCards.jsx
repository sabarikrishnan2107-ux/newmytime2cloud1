"use client";

import { useTranslation } from "react-i18next";

export default function VisitorCards() {
  const { t } = useTranslation();
  const cards = [
    { title: t("visitor.dashboard.cards.total"), value: 120, color: "border-blue-500" },
    { title: t("visitor.dashboard.cards.checkedIn"), value: 85, color: "border-green-500" },
    { title: t("visitor.dashboard.cards.checkedOut"), value: 70, color: "border-gray-500" },
    { title: t("visitor.dashboard.cards.pendingApproval"), value: 10, color: "border-yellow-500" },
  ];

  return (
    <>
      {cards.map((card, index) => (
        <div
          key={index}
          className={`bg-white rounded-xl shadow-md p-6 flex flex-col justify-center items-center hover:shadow-lg transition border-b-4 ${card.color}`}
        >
          <div className="text-3xl font-bold text-gray-800">{card.value}</div>
          <div className="text-gray-500 mt-2">{card.title}</div>
        </div>
      ))}
    </>
  );
}
