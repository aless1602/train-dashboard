export type ArrDep = "arrival" | "departure"; //Type de sens du train : arrivée ou départ 

/* Structure représentant un train ou un bus */
export type TEntry = {
  when: Date; // date et heure de l'arrivée ou du départ
  arrdep: ArrDep; // sens : arrivée ou départ
  otherStation: string; // Nom de la gare ou de l'arrêt opposé  
  platform?: string; // numéro de quai (optionnel)
  delaySec: number; // retard en secondes
  canceled: boolean; // Si le train est annulé
  shortName?: string; //nom court du train
  isBus?: boolean; //vrai si c'est un bus (utilisé en cas de travaux, etc)
};
