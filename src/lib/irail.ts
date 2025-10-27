import type { ArrDep, TEntry } from "../types";
import { UA } from "./constants";

/**
 * Supprime les accents des noms de gares pour faciliter les comparaisons.
 * Exemple : Bruxelles et Bruxelles-Midi seront traitées de la même manière.
 */
const stripDiacritics = (s: string) =>
  s.normalize("NFD").replace(/\p{Diacritic}/gu, "");

/**
 * Vérifie si une station correspond à Bruxelles ou Charleroi.
 * On s'en sert pour filtrer les trains qui nous intéressent dans le dashboard.
 */
export const matchesBruxCharleroi = (name: string) =>
  /brux|charleroi/i.test(stripDiacritics(name));

/**
 * Cette fonction interroge l’API iRail pour une heure donnée
 * et renvoie la liste des trains sous forme d’objets normalisés.
 *
 * Elle prend en paramètre :
 *  - le nom de la station, par exemple Nivelles
 *  - le type de données souhaité : départs ou arrivées
 *  - une date optionnelle pour préciser l’heure
 *
 * L’objectif est d’obtenir les trains d’une tranche d’environ une heure.
 */
async function fetchSingleHour(
  station: string,
  arrdep: ArrDep,
  dt?: Date,
  signal?: AbortSignal
): Promise<TEntry[]> {
  // On construit l’URL de la requête vers l’API
  const url = new URL("https://api.irail.be/liveboard/");
  url.searchParams.set("format", "json");
  url.searchParams.set("lang", "fr");
  url.searchParams.set("station", station);
  url.searchParams.set("arrdep", arrdep);

  // Si une date est précisée, on la formate au format attendu par l’API (hhmm et ddmmyy)
  if (dt) {
    const hh = String(dt.getHours()).padStart(2, "0");
    const mm = String(dt.getMinutes()).padStart(2, "0");
    const dd = String(dt.getDate()).padStart(2, "0");
    const mo = String(dt.getMonth() + 1).padStart(2, "0");
    const yy = String(dt.getFullYear()).slice(-2);
    url.searchParams.set("time", `${hh}${mm}`);
    url.searchParams.set("date", `${dd}${mo}${yy}`);
  }

  // On envoie la requête HTTP vers iRail
  const res = await fetch(url.toString(), {
    headers: { Accept: "application/json", "User-Agent": UA },
    signal,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);

  // L’API renvoie un objet avec soit "departures", soit "arrivals"
  const j = await res.json();
  const rows =
    arrdep === "departure"
      ? j?.departures?.departure ?? []
      : j?.arrivals?.arrival ?? [];

  // On transforme chaque résultat brut de l’API en un objet exploitable par le dashboard
  const mapped = rows.map((r: any) => {
    const rawShort =
      r?.vehicleinfo?.shortname ??
      String(r.vehicle || "").split(".").pop() ??
      "";
    const shortName = String(rawShort)
      .toUpperCase()
      .replace(/^([A-Z]+)0*(\d+)/, "$1 $2");

    // Certains véhicules sont en réalité des bus de remplacement
    const isBus =
      /^BUS\b/i.test(rawShort) ||
      /^BE\.NMBS\.BUS/i.test(String(r.vehicle || ""));

    return {
      when: new Date(Number(r.time) * 1000),
      arrdep,
      otherStation: r.station,
      platform: r.platform ?? undefined,
      delaySec: Number(r.delay ?? 0) || 0,
      canceled: String(r.canceled) === "1",
      shortName,
      isBus,
    } as TEntry;
  });

  // On supprime les doublons éventuels (même train, même horaire)
  const unique = new Map<string, TEntry>();
  for (const t of mapped) {
    const key = `${t.shortName}-${t.when.getTime()}`;
    if (!unique.has(key)) unique.set(key, t);
  }

  return Array.from(unique.values());
}

/**
 * Cette version étendue appelle fetchSingleHour deux fois :
 * - une première fois pour l’heure en cours
 * - une seconde fois pour l’heure suivante
 *
 * On combine ensuite les deux résultats pour obtenir les trains à venir
 * sur les deux prochaines heures.
 */
export async function fetchLiveAt(
  station: string,
  arrdep: ArrDep,
  dt: Date = new Date(),
  signal?: AbortSignal
): Promise<TEntry[]> {
  const now = new Date(dt);
  const nextHour = new Date(dt.getTime() + 60 * 60 * 1000);

  // On récupère les données des deux heures en parallèle
  const [h1, h2] = await Promise.all([
    fetchSingleHour(station, arrdep, now, signal),
    fetchSingleHour(station, arrdep, nextHour, signal),
  ]);

  // On fusionne les résultats et on les trie chronologiquement avant de les renvoyer
  return [...h1, ...h2].sort((a, b) => a.when.getTime() - b.when.getTime());
}
