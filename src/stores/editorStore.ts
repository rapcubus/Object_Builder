import { create } from 'zustand';
import { Shape, ShapeType } from '../types/game';

interface EditorState {
  shapes: Shape[];
  selectedShapeIds: Set<string>;
  projectName: string;
  fileHandle: any | null;
  isInitialized: boolean;

  // Actions
  setProjectName: (name: string) => void;
  setFileHandle: (handle: any | null) => void;
  setInitialized: (val: boolean) => void;

  addShape: (type: ShapeType) => void;
  updateShape: (id: string, props: Partial<Shape>) => void;
  updateSelectedShapes: (props: Partial<Shape>) => void;
  deleteSelectedShapes: () => void;
  deleteShape: (id: string) => void;
  copySelectedShapes: () => void;

  selectShape: (id: string | null, isToggle?: boolean) => void;
  reorderShapes: (startIndex: number, endIndex: number) => void;
  setShapes: (shapes: Shape[]) => void;

  undo: () => void;
  saveHistory: () => void;

  // History stack (simplified for now)
  undoStack: string[];
}

export const useEditorStore = create<EditorState>((set, get) => ({
  shapes: [],
  selectedShapeIds: new Set(),
  projectName: "Untitled_Object",
  fileHandle: null,
  isInitialized: false,
  undoStack: [],

  setProjectName: (name) => set({ projectName: name }),
  setFileHandle: (handle) => set({ fileHandle: handle }),
  setInitialized: (val) => set({ isInitialized: val }),

  setShapes: (shapes) => {
    // 전역적인 데이터 타입 검증 (NaN 및 문자열 혼입 방지)
    const sanitized = shapes.map(s => ({
      ...s,
      x: Number(s.x) || 0,
      y: Number(s.y) || 0,
      depth: Number(s.depth) || 0
    }));
    set({ shapes: sanitized });
  },

  addShape: (type) => {
    get().saveHistory();
    const newShape: Shape = {
      id: 'shape_' + Date.now(),
      name: `New ${type}`,
      type,
      x: 0,
      y: 0,
      width: 50,
      height: 50,
      radius: 25,
      cornerRadius: 5,
      angleLeft: 60,
      angleRight: 60,
      color: '#ffa500',
      alpha: 1,
      rotation: 0,
      depth: get().shapes.length
    };

    set((state) => ({
      shapes: [...state.shapes, newShape],
      selectedShapeIds: new Set([newShape.id])
    }));
  },

  updateShape: (id, props) => {
    set((state) => {
      // NaN 방지: 숫자 필드인 경우 체크
      const sanitizedProps = { ...props };
      if (sanitizedProps.x !== undefined && isNaN(sanitizedProps.x)) sanitizedProps.x = 0;
      if (sanitizedProps.y !== undefined && isNaN(sanitizedProps.y)) sanitizedProps.y = 0;
      if (sanitizedProps.width !== undefined && isNaN(sanitizedProps.width)) sanitizedProps.width = 10;
      if (sanitizedProps.height !== undefined && isNaN(sanitizedProps.height)) sanitizedProps.height = 10;
      if (sanitizedProps.depth !== undefined && isNaN(sanitizedProps.depth)) sanitizedProps.depth = 0;

      let newShapes = state.shapes.map(s => s.id === id ? { ...s, ...sanitizedProps } : s);

      // depth가 변경된 경우 재정렬
      if (sanitizedProps.depth !== undefined) {
        newShapes.sort((a, b) => (Number(a.depth) || 0) - (Number(b.depth) || 0));
      }

      return { shapes: newShapes };
    });
  },

  updateSelectedShapes: (props) => {
    get().saveHistory();
    set((state) => {
      // NaN 방지
      const sanitizedProps = { ...props };
      if (sanitizedProps.x !== undefined && isNaN(sanitizedProps.x)) sanitizedProps.x = 0;
      if (sanitizedProps.y !== undefined && isNaN(sanitizedProps.y)) sanitizedProps.y = 0;
      if (sanitizedProps.depth !== undefined && isNaN(sanitizedProps.depth)) sanitizedProps.depth = 0;

      let newShapes = state.shapes.map(s => state.selectedShapeIds.has(s.id) ? { ...s, ...sanitizedProps } : s);

      // depth가 변경된 경우 재정렬
      if (sanitizedProps.depth !== undefined) {
        newShapes.sort((a, b) => (Number(a.depth) || 0) - (Number(b.depth) || 0));
      }

      return { shapes: newShapes };
    });
  },

  deleteSelectedShapes: () => {
    get().saveHistory();
    set((state) => {
      const nextShapes = state.shapes.filter(s => !state.selectedShapeIds.has(s.id));
      return {
        shapes: nextShapes,
        selectedShapeIds: new Set()
      };
    });
  },

  deleteShape: (id) => {
    get().saveHistory();
    set((state) => {
      const nextShapes = state.shapes.filter(s => s.id !== id);
      const nextSelected = new Set(state.selectedShapeIds);
      nextSelected.delete(id);
      return {
        shapes: nextShapes,
        selectedShapeIds: nextSelected
      };
    });
  },

  copySelectedShapes: () => {
    get().saveHistory();
    const { shapes, selectedShapeIds } = get();
    const newShapes: Shape[] = [];
    const newSelectedIds = new Set<string>();

    // 현재 최대 뎁스 확인 (NaN 제외)
    const validDepths = shapes.map(s => Number(s.depth)).filter(d => !isNaN(d));
    const maxDepth = validDepths.length > 0 ? Math.max(...validDepths) : -1;

    Array.from(selectedShapeIds).forEach((id, index) => {
      const shape = shapes.find(s => s.id === id);
      if (shape) {
        // 명시적으로 필요한 속성만 추출하여 새 객체 생성 (오염 방지)
        const newShape: Shape = {
          id: 'shape_' + (Date.now() + Math.random()),
          name: `${shape.name || shape.type.toUpperCase()} (Copy)`,
          type: shape.type,
          x: (Number(shape.x) || 0) + 10,
          y: (Number(shape.y) || 0) + 10,
          width: Number(shape.width) || 50,
          height: Number(shape.height) || 50,
          radius: Number(shape.radius) || 25,
          cornerRadius: Number(shape.cornerRadius) || 5,
          angleLeft: Number(shape.angleLeft) || 60,
          angleRight: Number(shape.angleRight) || 60,
          color: shape.color || '#ffa500',
          alpha: Number(shape.alpha) || 1,
          rotation: Number(shape.rotation) || 0,
          depth: Number(maxDepth) + 1 + index
        };
        newShapes.push(newShape);
        newSelectedIds.add(newShape.id);
      }
    });

    const nextShapes = [...shapes, ...newShapes].sort((a, b) => (Number(a.depth) || 0) - (Number(b.depth) || 0));

    set({
      shapes: nextShapes,
      selectedShapeIds: newSelectedIds
    });
  },

  selectShape: (id, isToggle = false) => {
    set((state) => {
      const next = new Set(state.selectedShapeIds);
      if (!id) {
        if (!isToggle) next.clear();
      } else {
        if (isToggle) {
          if (next.has(id)) next.delete(id);
          else next.add(id);
        } else {
          next.clear();
          next.add(id);
        }
      }
      return { selectedShapeIds: next };
    });
  },

  reorderShapes: (startIndex, endIndex) => {
    set((state) => {
      const newShapes = [...state.shapes];
      const [removed] = newShapes.splice(startIndex, 1);
      newShapes.splice(endIndex, 0, removed);
      return { shapes: newShapes };
    });
  },

  saveHistory: () => {
    const snapshot = JSON.stringify(get().shapes);
    set((state) => {
      const last = state.undoStack[state.undoStack.length - 1];
      if (last === snapshot) return state;
      const nextStack = [...state.undoStack, snapshot];
      if (nextStack.length > 100) nextStack.shift();
      return { undoStack: nextStack };
    });
  },

  undo: () => {
    set((state) => {
      if (state.undoStack.length === 0) return state;
      const nextStack = [...state.undoStack];
      const previousState = nextStack.pop();
      if (previousState) {
        return {
          shapes: JSON.parse(previousState),
          selectedShapeIds: new Set(),
          undoStack: nextStack
        };
      }
      return state;
    });
  }
}));
