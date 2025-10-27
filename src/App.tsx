import { useState, useEffect } from "react";
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core";

import type { DragEndEvent } from "@dnd-kit/core";

import {
  SortableContext,
  useSortable,
  arrayMove,
  rectSortingStrategy,
} from "@dnd-kit/sortable";


import { CSS } from "@dnd-kit/utilities";
import Switch from "./components/Switch";
import Clock from "./components/Clock";
import TrainList from "./components/TrainList";
import useKpis from "./hooks/useKpis";
import SortableGrid, { type SortableGridItem } from "./components/SortableGrid";
import Section from "./components/Section";
import Card from "./components/Card";

/* Structure des deux colonnes principales du dashboard */
type ColumnsState = {
  left: string[];
  right: string[];
};

/* Composant pour rendre une card déplacable */
function SortableCard({ id, children }: { id: string; children: React.ReactNode }) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id });

  const style = { transform: CSS.Transform.toString(transform), transition };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing ${isDragging ? "opacity-60 scale-[1.02]" : ""
        } transition-transform duration-150`}
    >
      {children}
    </div>
  );
}
/* Composant principal de l'app */
export default function App() {
  const [showBus, setShowBus] = useState(false);
  const [trainFilter, setTrainFilter] = useState<"all" | "departure" | "arrival">("all");
  const kpis = useKpis();

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } })
  );

  /* Chargement de la disposition depuis le localStorage */
  const [columns, setColumns] = useState<ColumnsState>(() => {
    const defaultLayout: ColumnsState = {
      left: ["section-kpis", "train-list"],
      right: ["pull-requests", "tickets", "builds", "monitoring"],
    };

    try {
      const saved = localStorage.getItem("train-dashboard:columns");
      if (saved) {
        const parsed: ColumnsState = JSON.parse(saved);
        const allIds = [...defaultLayout.left, ...defaultLayout.right];
        for (const id of allIds) {
          if (!parsed.left.includes(id) && !parsed.right.includes(id)) {
            parsed.right.push(id);
          }
        }
        return parsed;
      }
    } catch {
      /* on garde la disposition par défaut */
    }
    return defaultLayout;
  });

  /* Sauvegarder dans localStorage à chaque modif */
  useEffect(() => {
    localStorage.setItem("train-dashboard:columns", JSON.stringify(columns));
  }, [columns]);

  /* Indications iRail */
  const kpiCards: SortableGridItem[] = [
    {
      id: "kpi-delay",
      node: (
        <Card>
          <div className="text-sm text-gray-500">
            Prochaine heure — Retard moyen
          </div>
          <div className="mt-2 text-2xl font-semibold">
            {kpis.loading ? "…" : `${kpis.avgDelayMin} min`}
          </div>
        </Card>
      ),
    },
    {
      id: "kpi-cancel",
      node: (
        <Card>
          <div className="text-sm text-gray-500">3h passées — % annulés</div>
          <div className="mt-2 text-2xl font-semibold">
            {kpis.loading ? "…" : `${kpis.cancelPct} %`}
          </div>
        </Card>
      ),
    },
  ];

  /* Les cards du dashboard */
  const allSections: Record<string, React.ReactNode> = {
    "section-kpis": (
      <Section title="Indicateurs SNCB">
        <SortableGrid
          items={kpiCards}
          orderKey="train-dashboard:kpi-order"
          className="grid grid-cols-1 gap-4 sm:grid-cols-2"
        />
      </Section>
    ),

    "train-list": (
      <Section title="Prochains trains — Gare de Nivelles">
        <div className="flex flex-wrap items-center justify-between mb-3 gap-3">
          {/* Switch */}
          <Switch checked={showBus} onChange={setShowBus} label="Afficher bus" />

          {/* Filtres */}
          <div className="flex gap-2">
            {(["all", "departure", "arrival"] as const).map((mode) => (
              <button
                key={mode}
                onClick={() => setTrainFilter(mode)}
                className={`text-xs font-medium px-3 py-1 rounded-full border transition-colors
              ${trainFilter === mode
                    ? "bg-blue-600 text-white border-blue-600"
                    : "bg-white border-gray-300 text-gray-600 hover:bg-gray-100"
                  }`}
              >
                {mode === "all"
                  ? "Tous"
                  : mode === "departure"
                    ? "Départs"
                    : "Arrivées"}
              </button>
            ))}
          </div>
        </div>

        <TrainList includeBus={showBus} filter={trainFilter} />
      </Section>
    ),

    /* exemple de cartes pour les differentes taches à afficher dans le dashboard */
    "pull-requests": (
      <Card>
        <div className="text-gray-800 font-semibold text-lg flex items-center gap-2">
          Pull Requests en attente
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Affiche les Pull Requests ici.
        </p>
      </Card>
    ),
    "tickets": (
      <Card>
        <div className="text-gray-800 font-semibold text-lg flex items-center gap-2">
          Tickets urgents
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Liste les incidents critiques ici.
        </p>
      </Card>
    ),
    "builds": (
      <Card>
        <div className="text-gray-800 font-semibold text-lg flex items-center gap-2">
          Builds en erreur
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Affiche les builds en erreurs ici.
        </p>
      </Card>
    ),
    "monitoring": (
      <Card>
        <div className="text-gray-800 font-semibold text-lg flex items-center gap-2">
          Alertes / Monitoring
        </div>
        <p className="text-sm text-gray-500 mt-2">
          Affiche les alertes critiques du système de monitoring ici.
        </p>
      </Card>
    ),
  };

  /* Trouve dans quelle colonne se trouve une card */
  const findContainer = (id: string): "left" | "right" | null => {
    if (columns.left.includes(id)) return "left";
    if (columns.right.includes(id)) return "right";
    return null;
  };

  /* Gère le déplacement d'une card */
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const activeContainer = findContainer(active.id as string);
    const overContainer =
      findContainer(over.id as string) ||
      (over.id === "left-placeholder" ? "left" : "right");

    if (!activeContainer || !overContainer) return;

    /* réarrangement dans la même colonne */
    if (activeContainer === overContainer) {
      const oldIndex = columns[activeContainer].indexOf(active.id as string);
      const newIndex = columns[activeContainer].indexOf(over.id as string);
      if (oldIndex === newIndex || newIndex === -1) return;
      setColumns((prev: ColumnsState) => ({
        ...prev,
        [activeContainer]: arrayMove(prev[activeContainer], oldIndex, newIndex),
      }));
    } else {
      /* déplacement entre colonnes */
      setColumns((prev: ColumnsState) => {
        const from = [...prev[activeContainer]];
        const to = [...prev[overContainer]];
        from.splice(from.indexOf(active.id as string), 1);
        if ((over.id as string).includes("placeholder")) to.push(active.id as string);
        else {
          const overIndex = to.indexOf(over.id as string);
          to.splice(overIndex + 1, 0, active.id as string);
        }
        return { ...prev, [activeContainer]: from, [overContainer]: to };
      });
    }

    // forcer le recalcul visuel 
    requestAnimationFrame(() => {
      window.dispatchEvent(new Event("resize"));
    });
  };

  useEffect(() => {
  /* Rafraîchit la page toutes les 15 minutes */
  const interval = setInterval(() => {
    window.location.reload();
  }, 1 * 60 * 1000);

  return () => clearInterval(interval);
}, []);

  /* Affichage du dashboard */
  return (
    <div className="min-h-dvh bg-gray-50 text-gray-900 p-6">
      <div className="mx-auto max-w-[90rem] px-8 xl:px-12">
        {/* en-tête titre + heure */}
        <header className="mb-8 flex items-center justify-between">
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <Clock className="text-4xl font-semibold text-gray-800" />
        </header>

        {/* grille principale */}
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
        >
          <div className="grid gap-6 md:grid-cols-2 items-start">
            {(["left", "right"] as const).map((col) => {
              const items =
                columns[col].length === 0
                  ? [`${col}-placeholder`]
                  : columns[col];

              return (
                <SortableContext
                  key={col}
                  items={items}
                  strategy={rectSortingStrategy}
                >
                  <div
                    className={`grid gap-4 p-2 border border-dashed rounded-lg transition-all duration-200 min-h-[80px] ${columns[col].length === 0
                      ? "bg-gray-50 border-gray-300"
                      : "bg-transparent border-gray-200"
                      }`}
                  >
                    {columns[col].length === 0 && (
                      <SortableCard id={`${col}-placeholder`}>
                        <div className="h-32 rounded-md border border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-400 italic">
                          Glissez ici
                        </div>
                      </SortableCard>
                    )}

                    {columns[col].map((id: string) => (
                      <SortableCard key={id} id={id}>
                        {allSections[id]}
                      </SortableCard>
                    ))}
                  </div>
                </SortableContext>
              );
            })}
          </div>
        </DndContext>
      </div>
    </div>
  );

}
