const Radio = ({ label, ...props }) => (
    <label className="flex items-center gap-2 text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer">
        <input type="radio" className="text-indigo-600 focus:ring-indigo-500 w-3.5 h-3.5" {...props} />
        {label}
    </label>
);

export { Radio }
