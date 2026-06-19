// Color constants for cards (already defined in your styling)
const CARD_COLORS = {
  present: "border-green-500 text-green-500",
  late: "border-amber-500 text-amber-500",
  absent: "border-red-500 text-red-500",
  missed: "border-blue-500 text-blue-500",
};

export default function Cards() {
  return (
    <>
      {/* Card 1: Present Today */}
      <div
        className={`bg-white p-6 rounded-xl shadow-xl hover:shadow-2xl transition duration-300 border-l-4 ${CARD_COLORS.present}`}
      >
        <p className="text-sm font-semibold text-gray-500 uppercase">
          Present Today
        </p>
        <p className="text-4xl font-black mt-2">145 / 150</p>
        <span className="text-sm text-gray-500">
          <span className="font-bold text-green-500">97%</span> On Time
        </span>
      </div>

      {/* Card 2: Late Arrivals */}
      <div
        className={`bg-white p-6 rounded-xl shadow-xl hover:shadow-2xl transition duration-300 border-l-4 ${CARD_COLORS.late}`}
      >
        <p className="text-sm font-semibold text-gray-500 uppercase">
          Late Arrivals
        </p>
        <p className="text-4xl font-black mt-2">5</p>
        <span className="text-sm text-gray-500">
          <span className="font-bold text-red-500">↑ 2%</span> from yesterday
        </span>
      </div>

      {/* Card 3: Total Absences (MTD) */}
      <div
        className={`bg-white p-6 rounded-xl shadow-xl hover:shadow-2xl transition duration-300 border-l-4 ${CARD_COLORS.absent}`}
      >
        <p className="text-sm font-semibold text-gray-500 uppercase">
          Total Absences (MTD)
        </p>
        <p className="text-4xl font-black mt-2">12</p>
        <span className="text-sm text-gray-500">
          <span className="font-bold text-red-500">3</span> unapproved
        </span>
      </div>

      {/* Card 4: Missed Punches */}
      <div
        className={`bg-white p-6 rounded-xl shadow-xl hover:shadow-2xl transition duration-300 border-l-4 ${CARD_COLORS.missed}`}
      >
        <p className="text-sm font-semibold text-gray-500 uppercase">
          Missed Punches
        </p>
        <p className="text-4xl font-black mt-2">3</p>
        <span className="text-sm text-gray-500">
          <span className="font-bold text-blue-500">Action</span> required
        </span>
      </div>
    </>
  );
}
