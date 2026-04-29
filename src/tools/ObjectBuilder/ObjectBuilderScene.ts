import Phaser from 'phaser';
import { useEditorStore } from '../../stores/editorStore';
import { Shape } from '../../types/game';

/**
 * 리팩토링된 오브젝트 빌더 씬
 * UI 로직은 React로 이관하고, 렌더링과 게임 월드 인터랙션만 담당합니다.
 */
export default class ObjectBuilderScene extends Phaser.Scene {
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private selectionBoxGraphics!: Phaser.GameObjects.Graphics;
  private previewContainer!: Phaser.GameObjects.Container;

  private isDragging: boolean = false;
  private isBoxSelecting: boolean = false;
  private isPanning: boolean = false;
  private dragStartPos: Phaser.Math.Vector2 | null = null;

  private dragStartStates: Map<string, { x: number; y: number }> = new Map();
  private dragStartPointerPos: { x: number; y: number } | null = null;
  private graphicsMap: Map<string, Phaser.GameObjects.Graphics> = new Map();

  private unsubscribe?: () => void;

  constructor() {
    super('ObjectBuilderScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a1f');
    this.gridGraphics = this.add.graphics();
    this.previewContainer = this.add.container(0, 0);
    this.selectionGraphics = this.add.graphics().setDepth(1000);
    this.selectionBoxGraphics = this.add.graphics().setDepth(1001);

    this.input.mouse?.disableContextMenu();

    // 단축키 설정
    this.input.keyboard?.on('keydown-DELETE', () => {
      useEditorStore.getState().deleteSelectedShapes();
    });

    this.input.keyboard?.on('keydown-Z', (event: KeyboardEvent) => {
      if (event.ctrlKey) {
        useEditorStore.getState().undo();
      }
    });

    // 방향키 이동 처리
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
      this.handleKeyDown(event);
    });

    // 마우스 이벤트 설정
    this.setupMouseEvents();

    // Zustand 스토어 구독
    this.unsubscribe = useEditorStore.subscribe((state, prevState) => {
      // 도형 데이터가 변경되었거나 선택이 변경된 경우 재렌더링
      if (state.shapes !== prevState.shapes || state.selectedShapeIds !== prevState.selectedShapeIds) {
        this.renderPreview();
      }
    });

    // 씬 파괴 시 구독 해제
    this.events.once('destroy', () => {
      if (this.unsubscribe) {
        this.unsubscribe();
        this.unsubscribe = undefined;
      }
    });

    this.updateUIPlacement();
    this.scale.on('resize', () => {
      this.updateUIPlacement();
      this.renderPreview();
    });

    // 초기 렌더링
    this.renderPreview();
  }

  private isPointerOverUI(pointer: Phaser.Input.Pointer): boolean {
    if (!pointer.event) return false;
    const target = pointer.event.target as HTMLElement;
    return target && target !== this.game.canvas;
  }

  private setupMouseEvents() {
    // 씬 수준의 포인터 다운 (배경 클릭 시 선택 해제 등)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: any[]) => {
      if (this.isPointerOverUI(pointer)) return;

      if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        this.isPanning = true;
        this.dragStartPos = new Phaser.Math.Vector2(pointer.x, pointer.y);
        return;
      }

      if (currentlyOver.length === 0) {
        if (!pointer.event.shiftKey) {
          useEditorStore.getState().selectShape(null);
        }
        this.isBoxSelecting = true;
        this.dragStartPos = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPanning && this.dragStartPos) {
        const dx = (pointer.x - this.dragStartPos.x) / this.cameras.main.zoom;
        const dy = (pointer.y - this.dragStartPos.y) / this.cameras.main.zoom;
        this.cameras.main.scrollX -= dx;
        this.cameras.main.scrollY -= dy;
        this.dragStartPos.set(pointer.x, pointer.y);
        return;
      }

      if (this.isBoxSelecting && this.dragStartPos) {
        this.drawSelectionBox(this.dragStartPos.x, this.dragStartPos.y, pointer.worldX, pointer.worldY);
      }
    });

    this.input.on('pointerup', (pointer: Phaser.Input.Pointer) => {
      if (this.isPanning) {
        this.isPanning = false;
        this.dragStartPos = null;
        return;
      }

      if (this.isBoxSelecting && this.dragStartPos) {
        this.finishBoxSelection(this.dragStartPos.x, this.dragStartPos.y, pointer.worldX, pointer.worldY, pointer.event.shiftKey);
        this.isBoxSelecting = false;
        this.dragStartPos = null;
        this.selectionBoxGraphics.clear();
      }
    });

    // 마우스 휠 줌
    this.input.on('wheel', (pointer: Phaser.Input.Pointer, _gameObjects: any[], _deltaX: number, deltaY: number, _deltaZ: number) => {
      if (this.isPointerOverUI(pointer)) return;
      
      const cam = this.cameras.main;
      const oldZoom = cam.zoom;
      let newZoom = oldZoom;

      if (deltaY > 0) {
        newZoom = Math.max(oldZoom - 0.2, 0.5);
      } else {
        newZoom = Math.min(oldZoom + 0.2, 5.0);
      }

      if (newZoom !== oldZoom) {
        cam.setZoom(newZoom);
      }
    });
  }

  private handleKeyDown(event: KeyboardEvent) {
    const store = useEditorStore.getState();
    if (store.selectedShapeIds.size === 0) return;
    if (document.activeElement?.tagName === 'INPUT') return;

    const step = event.shiftKey ? 10 : 1;
    let dx = 0, dy = 0;

    if (event.key === 'ArrowLeft') dx = -step;
    else if (event.key === 'ArrowRight') dx = step;
    else if (event.key === 'ArrowUp') dy = -step;
    else if (event.key === 'ArrowDown') dy = step;

    if (dx !== 0 || dy !== 0) {
      store.updateSelectedShapes({ x: 0, y: 0 }); // 스냅샷 저장용 (더미) - 개선 필요
      // 실제 이동 로직은 스토어에서 직접 수행하거나 여기서 수정 후 반영
      const nextShapes = store.shapes.map(s => {
        if (store.selectedShapeIds.has(s.id)) {
          return { ...s, x: s.x + dx, y: s.y + dy };
        }
        return s;
      });
      store.setShapes(nextShapes);
      event.preventDefault();
    }
  }

  private drawGrid() {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x333344, 0.5);
    const range = 2000;
    const step = 20;

    for (let y = -range; y <= range; y += step) this.gridGraphics.lineBetween(-range, y, range, y);
    for (let x = -range; x <= range; x += step) this.gridGraphics.lineBetween(x, -range, x, range);

    this.gridGraphics.lineStyle(1, 0x444466, 0.8);
    for (let y = -range; y <= range; y += 100) this.gridGraphics.lineBetween(-range, y, range, y);
    for (let x = -range; x <= range; x += 100) this.gridGraphics.lineBetween(x, -range, x, range);

    this.gridGraphics.lineStyle(2, 0xff3366, 0.6);
    this.gridGraphics.lineBetween(0, -range, 0, range);
    this.gridGraphics.lineBetween(-range, 0, range, 0);
  }

  private updateUIPlacement() {
    const { width, height } = this.scale;
    this.cameras.main.setViewport(0, 0, width, height);
    this.cameras.main.setScroll(-width / 2, -height / 2);
    this.drawGrid();
  }

  private renderPreview() {
    if (!this.previewContainer) return;
    const store = useEditorStore.getState();
    const shapes = store.shapes;
    const selectedIds = store.selectedShapeIds;

    // 외곽선 그래픽 초기화
    if (this.selectionGraphics) this.selectionGraphics.clear();

    // 현재 스토어에 있는 ID 세트
    const shapeIds = new Set(shapes.map(s => s.id));

    // 스토어에 없는 기존 그래픽 제거
    this.graphicsMap.forEach((g, id) => {
      if (!shapeIds.has(id)) {
        g.destroy();
        this.graphicsMap.delete(id);
      }
    });

    const sortedShapes = [...shapes].sort((a, b) => a.depth - b.depth);

    sortedShapes.forEach((s, index) => {
      let g = this.graphicsMap.get(s.id);
      let isNew = false;

      if (!g) {
        g = this.add.graphics();
        this.graphicsMap.set(s.id, g);
        this.previewContainer.add(g);
        isNew = true;

        // 새 오브젝트인 경우에만 이벤트 설정 (한 번만)
        g.setData('id', s.id);

        g.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          if (pointer.rightButtonDown()) return;
          if (!useEditorStore.getState().selectedShapeIds.has(s.id) || pointer.event.shiftKey) {
            useEditorStore.getState().selectShape(s.id, pointer.event.shiftKey);
          }
        });

        let isDragHistorySaved = false;
        g.on('dragstart', (pointer: Phaser.Input.Pointer) => {
          this.isDragging = true;
          this.dragStartStates.clear();
          this.dragStartPointerPos = { x: pointer.worldX, y: pointer.worldY };

          // 최신 상태 확인 및 선택 업데이트 (필요 시)
          let currentStore = useEditorStore.getState();
          if (!currentStore.selectedShapeIds.has(s.id) && !pointer.event.shiftKey) {
            currentStore.selectShape(s.id);
            currentStore = useEditorStore.getState(); // 상태 갱신
          }

          // 현재 선택된 모든 도형의 시작 위치 저장
          currentStore.selectedShapeIds.forEach(id => {
            const model = currentStore.shapes.find(sh => sh.id === id);
            if (model) this.dragStartStates.set(id, { x: model.x, y: model.y });
          });
        });

        g.on('drag', (pointer: Phaser.Input.Pointer) => {
          if (!this.dragStartPointerPos) return;
          const totalDX = Math.round(pointer.worldX - this.dragStartPointerPos.x);
          const totalDY = Math.round(pointer.worldY - this.dragStartPointerPos.y);
          if (totalDX === 0 && totalDY === 0) return;

          const currentStore = useEditorStore.getState();
          if (!isDragHistorySaved) {
            currentStore.saveHistory();
            isDragHistorySaved = true;
          }

          const nextShapes = currentStore.shapes.map(sh => {
            const startState = this.dragStartStates.get(sh.id);
            if (startState) {
              return { ...sh, x: startState.x + totalDX, y: startState.y + totalDY };
            }
            return sh;
          });
          currentStore.setShapes(nextShapes);

          if (this.selectionGraphics) this.selectionGraphics.clear();
        });

        g.on('dragend', () => {
          this.isDragging = false;
          this.dragStartStates.clear();
          this.dragStartPointerPos = null;
          isDragHistorySaved = false;
          this.renderPreview();
        });
      }

      // 속성 업데이트 (매번 호출)
      g.clear();
      const color = parseInt(s.color.replace('#', ''), 16);
      g.fillStyle(color, s.alpha);

      let hw = 0, hh = 0;
      if (s.type === 'rect' || s.type === 'roundedRect') {
        hw = s.width / 2; hh = s.height / 2;
        if (s.type === 'rect') g.fillRect(-hw, -hh, s.width, s.height);
        else g.fillRoundedRect(-hw, -hh, s.width, s.height, s.cornerRadius || 0);
      } else if (s.type === 'circle') {
        hw = hh = s.radius || 25;
        g.fillCircle(0, 0, hw);
      } else if (s.type === 'triangle' || s.type === 'rightTriangle' || s.type === 'mirroredRightTriangle') {
        hw = s.width / 2; hh = s.height / 2;
        if (s.type === 'triangle') g.fillTriangle(0, -hh, -hw, hh, hw, hh);
        else if (s.type === 'rightTriangle') g.fillTriangle(-hw, -hh, hw, -hh, -hw, hh);
        else if (s.type === 'mirroredRightTriangle') g.fillTriangle(-hw, -hh, hw, -hh, hw, hh);
      } else if (s.type === 'trapezoid') {
        hw = s.width / 2; hh = s.height / 2;
        const aL = (s.angleLeft || 60) * (Math.PI / 180);
        const aR = (s.angleRight || 60) * (Math.PI / 180);
        const dxL = hh * 2 / Math.tan(aL);
        const dxR = hh * 2 / Math.tan(aR);
        const points = [{ x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw + dxR, y: hh }, { x: -hw - dxL, y: hh }];
        g.fillPoints(points, true);
        const minX = Math.min(-hw, -hw - dxL);
        const maxX = Math.max(hw, hw + dxR);
        hw = (maxX - minX) / 2;
      } else if (s.type === 'pentagon' || s.type === 'hexagon') {
        const sides = s.type === 'pentagon' ? 5 : 6;
        const points = [];
        let hw_i = s.width / 2, hh_i = s.height / 2, y_offset = 0;
        if (s.type === 'hexagon') { hw_i = (s.width / 2) / 0.866025; hh_i = s.height / 2; }
        else if (s.type === 'pentagon') {
          hw_i = (s.width / 2) / 0.951056; hh_i = (s.height / 2) / 0.904508;
          y_offset = (hh_i * (Math.sin(54 * Math.PI / 180) - 1)) / 2;
        }
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
          points.push({ x: hw_i * Math.cos(angle), y: hh_i * Math.sin(angle) - y_offset });
        }
        g.fillPoints(points, true);
        hw = s.width / 2; hh = s.height / 2;
      }

      g.setPosition(s.x, s.y);
      g.setAngle(s.rotation);

      // Depth 설정 (z-index)
      this.previewContainer.moveTo(g, index);

      const hitArea = new Phaser.Geom.Rectangle(-hw, -hh, Math.max(hw * 2, 15), Math.max(hh * 2, 15));
      g.setInteractive({ hitArea, hitAreaCallback: Phaser.Geom.Rectangle.Contains, useHandCursor: true, draggable: true });

      if (selectedIds.has(s.id) && !this.isDragging) {
        this.drawSelectionHighlight(s);
      }
    });
  }

  private drawSelectionHighlight(s: Shape) {
    if (!this.selectionGraphics) return;
    const g = this.selectionGraphics;
    g.lineStyle(2, 0xffffff, 1);
    const d = 3;
    const rad = (s.rotation || 0) * (Math.PI / 180);
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const toWorld = (px: number, py: number) => ({ x: s.x + (px * cos - py * sin), y: s.y + (px * sin + py * cos) });

    if (s.type === 'rect' || s.type === 'roundedRect') {
      const hw = s.width / 2 + d, hh = s.height / 2 + d;
      const points = [toWorld(-hw, -hh), toWorld(hw, -hh), toWorld(hw, hh), toWorld(-hw, hh)];
      g.strokePoints(points, true);
    } else if (s.type === 'circle') {
      g.strokeCircle(s.x, s.y, (s.radius || 25) + d);
    } else if (s.type === 'triangle' || s.type === 'rightTriangle' || s.type === 'mirroredRightTriangle') {
      const hh = s.height / 2 + d, hw = s.width / 2 + d;
      let points = [];
      if (s.type === 'triangle') points = [toWorld(0, -hh), toWorld(-hw, hh), toWorld(hw, hh)];
      else if (s.type === 'rightTriangle') points = [toWorld(-hw, -hh), toWorld(hw, -hh), toWorld(-hw, hh)];
      else points = [toWorld(-hw, -hh), toWorld(hw, -hh), toWorld(hw, hh)];
      g.strokePoints(points, true);
    } else if (s.type === 'trapezoid') {
      const hw = s.width / 2 + d, hh = s.height / 2 + d;
      const aL = (s.angleLeft || 60) * (Math.PI / 180), aR = (s.angleRight || 60) * (Math.PI / 180);
      const dxL = (hh * 2) / Math.tan(aL), dxR = (hh * 2) / Math.tan(aR);
      const points = [toWorld(-hw, -hh), toWorld(hw, -hh), toWorld(hw + dxR, hh), toWorld(-hw - dxL, hh)];
      g.strokePoints(points, true);
    } else if (s.type === 'pentagon' || s.type === 'hexagon') {
      const sides = s.type === 'pentagon' ? 5 : 6;
      const points = [];
      let hw_i = (s.width / 2 + d), hh_i = (s.height / 2 + d), y_offset = 0;
      if (s.type === 'hexagon') hw_i = hw_i / 0.866025;
      else if (s.type === 'pentagon') {
        hw_i = hw_i / 0.951056; hh_i = hh_i / 0.904508;
        y_offset = (hh_i * (Math.sin(54 * Math.PI / 180) - 1)) / 2;
      }
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
        points.push(toWorld(hw_i * Math.cos(angle), hh_i * Math.sin(angle) - y_offset));
      }
      g.strokePoints(points, true);
    }
    g.lineStyle(1, 0xffffff, 0.5);
    g.lineBetween(s.x - 5, s.y, s.x + 5, s.y);
    g.lineBetween(s.x, s.y - 5, s.x, s.y + 5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(s.x, s.y, 3);
  }

  private drawSelectionBox(x1: number, y1: number, x2: number, y2: number) {
    this.selectionBoxGraphics.clear();
    this.selectionBoxGraphics.lineStyle(1, 0xffa500, 1);
    this.selectionBoxGraphics.fillStyle(0xffa500, 0.1);
    const x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.abs(x1 - x2), h = Math.abs(y1 - y2);
    this.selectionBoxGraphics.strokeRect(x, y, w, h);
    this.selectionBoxGraphics.fillRect(x, y, w, h);
  }

  private finishBoxSelection(x1: number, y1: number, x2: number, y2: number, isToggle: boolean) {
    const x = Math.min(x1, x2), y = Math.min(y1, y2), w = Math.abs(x1 - x2), h = Math.abs(y1 - y2);
    const rect = new Phaser.Geom.Rectangle(x, y, w, h);
    const store = useEditorStore.getState();

    store.saveHistory();
    const nextSelectedIds = isToggle ? new Set(store.selectedShapeIds) : new Set<string>();

    store.shapes.forEach(shape => {
      if (Phaser.Geom.Rectangle.Contains(rect, shape.x, shape.y)) {
        nextSelectedIds.add(shape.id);
      }
    });

    setTimeout(() => {
      useEditorStore.setState({ selectedShapeIds: nextSelectedIds });
    }, 0);
  }
}
