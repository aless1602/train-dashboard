import React from "react";
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

export type SortableGridItem = {
  id: string;
  node: React.ReactNode;
  gridClassName?: string;
};

/**
 * Composant qui rend une carte déplaçable individuellement.
 * Il gère son apparence pendant le déplacement et son animation.
 */
function SortableCard({
  id,
  children,
  gridClassName = "",
}: {
  id: string;
  children: React.ReactNode;
  gridClassName?: string;
}) {
  const { setNodeRef, attributes, listeners, transform, transition, isDragging } =
    useSortable({ id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className={`cursor-grab active:cursor-grabbing ${
        isDragging ? "opacity-70" : ""
      } ${gridClassName}`}
    >
      {children}
    </div>
  );
}

/**
 * permet de mémoriser l’ordre des cartes entre les sessions grâce au localStorage.
 * Si de nouvelles cartes apparaissent, elles sont ajoutées à la fin sans perdre l’ordre déjà défini par l’utilisateur.
 */
function usePersistentOrder(orderKey: string, ids: string[]) {
  const [order, setOrder] = React.useState<string[]>(() => {
    try {
      const raw = localStorage.getItem(orderKey);
      if (!raw) return ids;
      const saved = JSON.parse(raw) as string[];
      /* merge: on garde l’ordre sauvegardé et on ajoute les nouveaux ids en fin */
      const merged = [...saved.filter((x) => ids.includes(x)), ...ids.filter((x) => !saved.includes(x))];
      return merged;
    } catch {
      return ids;
    }
  });

  React.useEffect(() => {
    /* Si la liste des ids change , on met à jour l’ordre en gardant l’ordre sauvegardé */
    setOrder((prev) => {
      const merged = [...prev.filter((x) => ids.includes(x)), ...ids.filter((x) => !prev.includes(x))];
      if (JSON.stringify(prev) !== JSON.stringify(merged)) {
        try {
          localStorage.setItem(orderKey, JSON.stringify(merged));
        } catch {}
        return merged;
      }
      return prev;
    });
  }, [ids.join("|")]);

  const setAndPersist = (next: string[]) => {
    setOrder(next);
    try {
      localStorage.setItem(orderKey, JSON.stringify(next));
    } catch {}
  };

  return [order, setAndPersist] as const;
}

export default function SortableGrid({
  items,
  orderKey,
  className = "",
}: {
  items: SortableGridItem[];
  orderKey: string;
  className?: string;
}) {
  const ids = React.useMemo(() => items.map((i) => i.id), [items]);
  const [order, setOrder] = usePersistentOrder(orderKey, ids);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 }, /* petit seuil pour éviter les drags involontaires */
    })
  );

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over || active.id === over.id) return;
    const oldIndex = order.indexOf(String(active.id));
    const newIndex = order.indexOf(String(over.id));
    setOrder(arrayMove(order, oldIndex, newIndex));
  };

  /* On rend dans l’ordre courant */
  const ordered = order
    .map((id) => items.find((i) => i.id === id))
    .filter(Boolean) as SortableGridItem[];

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={onDragEnd}>
      <SortableContext items={ordered.map((i) => i.id)} strategy={rectSortingStrategy}>
        <div className={className}>
          {ordered.map((i) => (
            <SortableCard key={i.id} id={i.id} gridClassName={i.gridClassName}>
              {i.node}
            </SortableCard>
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
