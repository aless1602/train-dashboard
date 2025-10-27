export default function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  label?: string;
}) {
  return (
    <div className="flex items-center gap-3 select-none">
      {label && (
        <span className="text-sm font-medium text-gray-900">{label}</span>
      )}

      <label className="relative inline-block h-6 w-11 cursor-pointer">
        <input
          type="checkbox"
          className="sr-only"
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          aria-label={label || "toggle"}
        />

        {/* pillule */}
        <div
          className={`h-6 w-11 rounded-full transition-colors duration-300 ${
            checked ? "bg-emerald-500" : "bg-gray-300"
          }`}
        />

        {/* petit bouton mobile */}
        <div
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white shadow-md transition-transform duration-300 ${
            checked ? "translate-x-5 rotate-[360deg]" : ""
          }`}
        />
      </label>
    </div>
  );
}
