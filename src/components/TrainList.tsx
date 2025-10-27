import { useEffect, useMemo, useState } from "react";
import StatusBadge from "./StatusBadge";
import { fetchLiveAt, matchesBruxCharleroi } from "../lib/irail";
import { NIVELLES } from "../lib/constants";
import type { TEntry } from "../types";

export default function TrainList({
  includeBus = false,
  station = NIVELLES,
  filter = "all",
}: {
  includeBus?: boolean;
  station?: string;
  filter?: "all" | "departure" | "arrival";
}) {
  const [itemsRaw, setItemsRaw] = useState<TEntry[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const controller = new AbortController();

    (async () => {
      try {
        setLoading(true);
        const [deps, arrs] = await Promise.all([
          fetchLiveAt(station, "departure", undefined, controller.signal),
          fetchLiveAt(station, "arrival", undefined, controller.signal),
        ]);

        const all = [...deps, ...arrs]
          .filter((e) => matchesBruxCharleroi(e.otherStation))
          .filter((e) => {
            const minutes = (e.when.getTime() - Date.now()) / 60000;
            return minutes >= 0 && minutes <= 120;
          })
          .sort((a, b) => a.when.getTime() - b.when.getTime());

        setItemsRaw(all);
      } catch (err: any) {
        if (err?.name !== "AbortError") console.error(err);
      } finally {
        setLoading(false);
      }
    })();

    return () => controller.abort();
  }, [station]);

  //filtrage lorsqu'il y a des bus + filtre départ/arrivée
  const items = useMemo(() => {
  return itemsRaw
    .filter((e) => includeBus || !e.isBus)
    .filter((e) =>
      filter === "all" ? true : e.arrdep === filter
    );
}, [itemsRaw, includeBus, filter]);


  if (loading) return <div className="text-sm text-gray-500">Chargement…</div>;
  if (!items.length)
    return (
      <div className="text-sm text-gray-500">
        Aucun train trouvé sur 2 h pour Bruxelles/Charleroi.
      </div>
    );

  return (
    <ul className="divide-y">
      {items.map((t, i) => {
        const hhmm = t.when.toLocaleTimeString("fr-BE", {
          hour: "2-digit",
          minute: "2-digit",
        });
        const sense =
          t.arrdep === "departure"
            ? { label: "Départ", arrow: "→", prep: "vers" }
            : { label: "Arrivée", arrow: "←", prep: "de" };

        return (
          <li key={i} className="py-2 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="w-16 tabular-nums">{hhmm}</span>
              <span
                className={`text-xs rounded border px-2 py-0.5 ${
                  t.arrdep === "departure"
                    ? "bg-blue-50 border-blue-200 text-blue-700"
                    : "bg-purple-50 border-purple-200 text-purple-700"
                }`}
              >
                {sense.label}
              </span>
              {t.shortName && (
                <span
                  className={`text-xs font-semibold px-2 py-0.5 rounded border ${
                    t.isBus
                      ? "bg-rose-50 border-rose-200 text-rose-700"
                      : "bg-gray-100 border-gray-200"
                  }`}
                >
                  {t.shortName}
                </span>
              )}
              <span className="font-medium">
                {sense.arrow} {sense.prep} {t.otherStation}
              </span>
              <span className="text-xs text-gray-500">
                Voie {t.platform ?? "?"}
              </span>
            </div>

            <StatusBadge
              status={t.canceled ? "cancel" : "ok"}
              delaySec={t.delaySec}
            />
          </li>
        );
      })}
    </ul>
  );
}
