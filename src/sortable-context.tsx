import {
  createContext,
  createEffect,
  type ParentComponent,
  untrack,
  useContext,
} from "solid-js";
import { createStore, type Store } from "solid-js/store";

import { type Id, useDragDropContext } from "./drag-drop-context";
import { moveArrayItem } from "./move-array-item";

interface SortableContextState {
  initialIds: Array<Id>;
  sortedIds: Array<Id>;
}

interface SortableContextProps {
  ids: Array<Id>;
}

type SortableContext = [Store<SortableContextState>, {}];

const Context = createContext<SortableContext>();

const SortableProvider: ParentComponent<SortableContextProps> = (props) => {
  const [dndState] = useDragDropContext()!;

  const [state, setState] = createStore<SortableContextState>({
    initialIds: [],
    sortedIds: [],
  });

  const isValidIndex = (index: number): boolean => {
    return index >= 0 && index < state.initialIds.length;
  };

  createEffect(() => {
    setState("initialIds", [...props.ids]);
    setState("sortedIds", [...props.ids]);
  });

  createEffect(() => {
    if (dndState.active.draggableId && dndState.active.droppableId) {
      untrack(() => {
        const fromIndex = state.sortedIds.indexOf(dndState.active.draggableId!);
        const toIndex = state.initialIds.indexOf(dndState.active.droppableId!);

        if (!isValidIndex(fromIndex) || !isValidIndex(toIndex)) {
          setState("sortedIds", [...props.ids]);
        } else if (fromIndex !== toIndex) {
          const resorted = moveArrayItem(state.sortedIds, fromIndex, toIndex);
          setState("sortedIds", resorted);
        }
      });
    } else {
      setState("sortedIds", [...props.ids]);
    }
  });

  const actions = {};
  const context: SortableContext = [state, actions];

  return <Context.Provider value={context}>{props.children}</Context.Provider>;
};

const useSortableContext = (): SortableContext | null => {
  return useContext(Context) || null;
};

export { Context, SortableProvider, useSortableContext };
