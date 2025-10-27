export default function StatusBadge({
  status,
  delaySec,
}: {
  status: "ok" | "cancel";
  delaySec: number;
}) {
  if (status === "cancel") {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-red-100 text-red-700 border border-red-300">
        Annulé
      </span>
    );
  }
  if (delaySec > 0) {
    return (
      <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-700 border border-amber-300">
        +{Math.round(delaySec / 60)} min
      </span>
    );
  }
  return (
    <span className="px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-700 border border-emerald-300">
      À l'heure
    </span>
  );
}
