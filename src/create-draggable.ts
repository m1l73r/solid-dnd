import {
  createEffect,
  createSignal,
  onCleanup,
  onMount,
  type Setter,
} from "solid-js";

import { type Id, type Listeners, useDragDropContext } from "./drag-drop-context";
import {
  elementLayout,
  noopTransform,
  type Transform,
  transformsAreEqual,
} from "./layout";
import { transformStyle } from "./style";

export interface Draggable {
  (element: HTMLElement, accessor?: () => { skipTransform?: boolean }): void;
  ref: Setter<HTMLElement | null>;
  get isActiveDraggable(): boolean;
  get dragActivators(): Listeners;
  get transform(): Transform;
}


const createDraggable = (id: Id, data: Record<string, any> = {}): Draggable => {
  const [state, { addDraggable, removeDraggable, draggableActivators }] = useDragDropContext()!;
  const [node, setNode] = createSignal<HTMLElement | null>(null);

  let isRegistered = false;

  const tryRegister = () => {
    const el = node();
    if (el && !isRegistered) {
      isRegistered = true;
      addDraggable({
        id,
        node: el,
        layout: elementLayout(el),
        data,
      });
    }
  };

  // Try when ref is assigned
  const refSetter: Setter<HTMLElement | null> = (el) => {
    setNode(el);
    queueMicrotask(tryRegister); // in case DOM is ready
  };

  onMount(() => {
    tryRegister(); // fallback in case it wasn’t ready earlier
  });

  onCleanup(() => removeDraggable(id));

  const isActiveDraggable = () => state.active.draggableId === id;
  const transform = () => state.draggables[id]?.transform || noopTransform();

  const draggable = Object.defineProperties(
    (element: HTMLElement, accessor?: () => { skipTransform?: boolean }) => {
      const config = accessor ? accessor() : {};

      createEffect(() => {
        const resolvedNode = node();
        const activators = draggableActivators(id);
        if (resolvedNode) {
          for (const key in activators) {
            resolvedNode.addEventListener(key, activators[key]);
          }
        }
        onCleanup(() => {
          if (resolvedNode) {
            for (const key in activators) {
              resolvedNode.removeEventListener(key, activators[key]);
            }
          }
        });
      });

      setNode(element);
      queueMicrotask(tryRegister); // double-safe registration

      if (!config.skipTransform) {
        createEffect(() => {
          const resolvedTransform = transform();
          if (!transformsAreEqual(resolvedTransform, noopTransform())) {
            const style = transformStyle(resolvedTransform);
            element.style.setProperty("transform", style.transform ?? null);
          } else {
            element.style.removeProperty("transform");
          }
        });
      }
    },
    {
      ref: { enumerable: true, value: refSetter },
      isActiveDraggable: { enumerable: true, get: isActiveDraggable },
      dragActivators: { enumerable: true, get: () => draggableActivators(id, true) },
      transform: { enumerable: true, get: transform },
    }
  ) as Draggable;

  return draggable;
};


export { createDraggable };
