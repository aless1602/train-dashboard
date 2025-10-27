import { useEffect, useState } from "react";
import { fetchLiveAt, matchesBruxCharleroi } from "../lib/irail";
import { NIVELLES } from "../lib/constants";
import type { TEntry } from "../types";


type KPIState = { loading: boolean; avgDelayMin: number; cancelPct: number };
/**
 * Ce hook s’occupe de calculer les indicateurs iRail affichés sur le dashboard.
 * Comme demandé, on travaille sur la gare de Nivelles, mais on peut lui passer n’importe quel nom de station.
 */
export default function useKpis(station: string = NIVELLES): KPIState {
  const [state, setState] = useState<KPIState>({
    loading: true,
    avgDelayMin: 0,
    cancelPct: 0,
  });

  useEffect(() => {
    // Permet d’annuler les requêtes si le composant est démonté
    const controller = new AbortController();

    (async () => {
      try {
        // On passe l’état en loading pour informer l’interface
        setState((s) => ({ ...s, loading: true }));
        const now = new Date();

        // Étape 1 : calcul du retard moyen sur la prochaine heure
        const [depsNow, arrsNow] = await Promise.all([
          fetchLiveAt(station, "departure", undefined, controller.signal),
          fetchLiveAt(station, "arrival", undefined, controller.signal),
        ]);

        // On ne garde que les trains vers/depuis Bruxelles ou Charleroi
        const nextHour = [...depsNow, ...arrsNow]
          .filter((e) => matchesBruxCharleroi(e.otherStation))
          .filter((e) => {
            const minutes = (e.when.getTime() - now.getTime()) / 60000;
            return minutes >= 0 && minutes <= 60;
          });

        // Retard moyen (en minutes, arrondi à l’unité supérieure)
        const avgDelayMin = nextHour.length
          ? Math.ceil(
              nextHour.reduce((sum, e) => sum + e.delaySec, 0) / nextHour.length / 60
            )
          : 0;

        // Étape 2 : calcul du pourcentage de trains annulés sur les trois dernières heures
        const minus60 = new Date(now.getTime() - 60 * 60000);
        const minus120 = new Date(now.getTime() - 120 * 60000);

        // On récupère les horaires à H, H-1h et H-2h pour les arrivées et les départs
        const [depsM60, arrsM60, depsM120, arrsM120] = await Promise.all([
          fetchLiveAt(station, "departure", minus60, controller.signal),
          fetchLiveAt(station, "arrival", minus60, controller.signal),
          fetchLiveAt(station, "departure", minus120, controller.signal),
          fetchLiveAt(station, "arrival", minus120, controller.signal),
        ]);

        // On fusionne les données de ces trois heures et on garde celles correspondant aux trajets pertinents
        const last3h: TEntry[] = [
          ...depsNow,
          ...arrsNow,
          ...depsM60,
          ...arrsM60,
          ...depsM120,
          ...arrsM120,
        ]
          .filter((e) => matchesBruxCharleroi(e.otherStation))
          .filter((e) => {
            const minutes = (now.getTime() - e.when.getTime()) / 60000;
            return minutes >= 0 && minutes <= 180;
          });

        // Calcul du pourcentage d’annulations
        const total = last3h.length;
        const canceled = last3h.filter((e) => e.canceled).length;
        const cancelPct = total ? Math.round((canceled / total) * 100) : 0;

        // Mise à jour finale des indicateurs
        setState({ loading: false, avgDelayMin, cancelPct });
      } catch (err: any) {
        // Si l’erreur n’est pas liée à une annulation manuelle, on la log
        if (err?.name !== "AbortError") console.error(err);
        setState((s) => ({ ...s, loading: false }));
      }
    })();

    // Nettoyage à la fin du cycle de vie du composant
    return () => controller.abort();
  }, [station]);

  return state;
}
