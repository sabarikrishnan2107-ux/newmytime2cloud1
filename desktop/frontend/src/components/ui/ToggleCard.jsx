const ToggleCard = ({ label, checked, onChange }) => (
  <div className="flex flex-col gap-2 w-full sm:w-auto">
    <label className="relative bg-white dark:bg-slate-900 flex items-center cursor-pointer gap-3 p-2 rounded-lg border border-border w-full sm:w-auto transition-colors">
      <div
        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out ${
          checked ? "bg-emerald-500" : "bg-slate-700"
        }`}
      >
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={onChange}
        />
        <span
          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
            checked ? "translate-x-5" : "translate-x-0"
          }`}
        />
      </div>
      <span className="text-sm text-gray-600 dark:text-slate-300 font-medium select-none">
        {label}
      </span>
    </label>
  </div>
);

export default ToggleCard;
