import Phaser from 'phaser';
import { useEditorStore } from '../../stores/editorStore';
import { Shape } from '../../types/game';
import polygonClipping from 'polygon-clipping';
import { getShapeWorldPolygon } from '../../utils/geometryUtils';

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
  private groupGraphicsMap: Map<string, Phaser.GameObjects.Graphics> = new Map();
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys;
  private isKeyboardMoving: boolean = false;
  private lastMoveTime: number = 0;
  private unsubscribe?: () => void;

  constructor() {
    super('ObjectBuilderScene');
  }

  create() {
    this.cameras.main.setBackgroundColor('#1a1a1f');
    this.gridGraphics = this.add.graphics();
    // previewContainer depth를 1로 설정하여 격자(gridGraphics) 위에 렌더링 보장
    this.previewContainer = this.add.container(0, 0).setDepth(1);
    this.selectionGraphics = this.add.graphics().setDepth(1000);
    this.selectionBoxGraphics = this.add.graphics().setDepth(1001);

    this.input.mouse?.disableContextMenu();

    // 키보드 커서 키 설정
    this.cursors = this.input.keyboard!.createCursorKeys();

    // 단축키 설정
    this.input.keyboard?.on('keydown-DELETE', () => {
      useEditorStore.getState().deleteSelectedShapes();
    });

    this.input.keyboard?.on('keydown-Z', (event: KeyboardEvent) => {
      if (event.ctrlKey) {
        useEditorStore.getState().undo();
      }
    });

    // 마우스 이벤트 설정
    this.setupMouseEvents();

    // Zustand 스토어 구독 — shapes 또는 selectedShapeIds가 바뀔 때만 렌더링
    // 드래그 중에는 건너뜀: drag → setShapes → renderPreview → setPosition → drag 재발동 루프 방지
    let prevShapes = useEditorStore.getState().shapes;
    let prevSelected = useEditorStore.getState().selectedShapeIds;
    this.unsubscribe = useEditorStore.subscribe((state) => {
      if (state.shapes !== prevShapes || state.selectedShapeIds !== prevSelected) {
        prevShapes = state.shapes;
        prevSelected = state.selectedShapeIds;
        if (!this.isDragging) {
          this.renderPreview();
        }
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

  update(_time: number, delta: number) {
    this.handleKeyboardMovement(delta);
  }

  private handleKeyboardMovement(_delta: number) {
    const store = useEditorStore.getState();
    if (store.selectedShapeIds.size === 0) return;

    const keys = this.cursors;
    const up = keys.up.isDown;
    const down = keys.down.isDown;
    const left = keys.left.isDown;
    const right = keys.right.isDown;

    if (up || down || left || right) {
      const now = Date.now();
      const moveInterval = 500; // 사용자 요청: 500ms 간격

      // 최초 누름 또는 500ms 경과 시 이동
      if (!this.isKeyboardMoving || (now - this.lastMoveTime >= moveInterval)) {
        if (!this.isKeyboardMoving) {
          store.saveHistory();
          this.isKeyboardMoving = true;
        }

        let dx = 0, dy = 0;
        if (left) dx = -1;
        else if (right) dx = 1;
        if (up) dy = -1;
        else if (down) dy = 1;

        if (dx !== 0 || dy !== 0) {
          this.applyMovement(dx, dy);
          this.lastMoveTime = now;
        }
      }
    } else {
      this.isKeyboardMoving = false;
    }
  }

  private applyMovement(dx: number, dy: number) {
    const store = useEditorStore.getState();
    const nextShapes = store.shapes.map(s => {
      if (store.selectedShapeIds.has(s.id)) {
        return { ...s, x: Math.round(s.x + dx), y: Math.round(s.y + dy) };
      }
      return s;
    });
    store.setShapes(nextShapes);
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

  // ─────────────────────────────────────────────────────────────
  // 도형의 로컬 좌표 기준 꼭짓점 포인트를 반환하는 순수 함수
  // offset: 선택 하이라이트용 팽창값 (기본 0)
  // ─────────────────────────────────────────────────────────────
  private getShapePoints(s: Shape, offset = 0): { x: number; y: number }[] | null {
    const hw = s.width / 2 + offset;
    const hh = s.height / 2 + offset;

    if (s.type === 'rect' || s.type === 'roundedRect') {
      return [{ x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }, { x: -hw, y: hh }];
    }
    if (s.type === 'circle') {
      return null; // circle은 별도 처리
    }
    if (s.type === 'triangle') {
      return [{ x: 0, y: -hh }, { x: -hw, y: hh }, { x: hw, y: hh }];
    }
    if (s.type === 'rightTriangle') {
      return [{ x: -hw, y: -hh }, { x: hw, y: -hh }, { x: -hw, y: hh }];
    }
    if (s.type === 'mirroredRightTriangle') {
      return [{ x: -hw, y: -hh }, { x: hw, y: -hh }, { x: hw, y: hh }];
    }
    if (s.type === 'trapezoid') {
      const baseHh = s.height / 2; // offset 없이 각도 계산
      const aL = (s.angleLeft || 60) * (Math.PI / 180);
      const aR = (s.angleRight || 60) * (Math.PI / 180);
      const dxL = baseHh * 2 / Math.tan(aL);
      const dxR = baseHh * 2 / Math.tan(aR);
      return [
        { x: -hw, y: -hh }, { x: hw, y: -hh },
        { x: hw + dxR, y: hh }, { x: -hw - dxL, y: hh }
      ];
    }
    if (s.type === 'pentagon' || s.type === 'hexagon') {
      const sides = s.type === 'pentagon' ? 5 : 6;
      let hw_i = hw, hh_i = hh, y_offset = 0;
      if (s.type === 'hexagon') {
        hw_i = hw / 0.866025;
      } else {
        hw_i = hw / 0.951056;
        hh_i = hh / 0.904508;
        y_offset = (hh_i * (Math.sin(54 * Math.PI / 180) - 1)) / 2;
      }
      const points = [];
      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
        points.push({ x: hw_i * Math.cos(angle), y: hh_i * Math.sin(angle) - y_offset });
      }
      return points;
    }
    return null;
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

    const currentGroupIds = new Set<string>();
    const groupShapesMap = new Map<string, Shape[]>();

    shapes.forEach(s => {
      if (s.groupId) {
        currentGroupIds.add(s.groupId);
        if (!groupShapesMap.has(s.groupId)) groupShapesMap.set(s.groupId, []);
        groupShapesMap.get(s.groupId)!.push(s);
      }
    });

    this.groupGraphicsMap.forEach((g, id) => {
      if (!currentGroupIds.has(id)) {
        g.destroy();
        this.groupGraphicsMap.delete(id);
      }
    });

    const sortedShapes = [...shapes].sort((a, b) => a.depth - b.depth);

    // 그룹 외곽선(다각형 병합) 그리기
    groupShapesMap.forEach((groupShapes, groupId) => {
      const hasStroke = groupShapes.some(s => s.groupStrokeThickness && s.groupStrokeThickness > 0);
      if (!hasStroke) {
        const g = this.groupGraphicsMap.get(groupId);
        if (g) g.clear();
        return;
      }

      let g = this.groupGraphicsMap.get(groupId);
      if (!g) {
        g = this.add.graphics();
        this.previewContainer.add(g);
        this.groupGraphicsMap.set(groupId, g);
      }
      g.clear();

      try {
        const polygons = groupShapes.map(s => [getShapeWorldPolygon(s)]);
        const merged = (polygonClipping.union as any)(...polygons);

        const strokeShape = groupShapes.find(s => s.groupStrokeThickness && s.groupStrokeThickness > 0);
        const color = parseInt((strokeShape!.groupStrokeColor || '#ffffff').replace('#', ''), 16);
        const thickness = strokeShape!.groupStrokeThickness || 2;
        
        g.lineStyle(thickness, color, 1);
        
        merged.forEach(polygon => {
          polygon.forEach(ring => {
            const points = ring.map((p: any) => new Phaser.Math.Vector2(p[0], p[1]));
            g!.strokePoints(points, true);
          });
        });
        
        // 뎁스를 최소치보다 낮게 설정
        const minDepth = Math.min(...groupShapes.map(s => s.depth));
        g.setData('depth', minDepth - 0.5);
      } catch (e) {
        console.warn('Polygon clipping failed', e);
      }
    });

    sortedShapes.forEach((s) => {
      let g = this.graphicsMap.get(s.id);

      if (!g) {
        g = this.add.graphics();
        this.graphicsMap.set(s.id, g);
        this.previewContainer.add(g);

        // 새 오브젝트인 경우에만 이벤트 설정 (한 번만)
        g.setData('id', s.id);

        // ── 히트 영역 & 인터랙션은 최초 1회만 설정 ──────────────
        const hitArea = new Phaser.Geom.Rectangle(-25, -25, 50, 50);
        g.setInteractive({
          hitArea,
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
          useHandCursor: true,
          draggable: true
        });
        // hitArea 참조를 Data에 보관 (이후 위치만 갱신)
        g.setData('hitArea', hitArea);
        // ──────────────────────────────────────────────────────

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

          let currentStore = useEditorStore.getState();
          if (!currentStore.selectedShapeIds.has(s.id) && !pointer.event.shiftKey) {
            currentStore.selectShape(s.id);
            currentStore = useEditorStore.getState();
          }

          // 히스토리 저장 (1회)
          if (!isDragHistorySaved) {
            currentStore.saveHistory();
            isDragHistorySaved = true;
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

          // ── Zustand store에 쓰지 않고 Phaser 객체만 직접 이동 ──
          // drag 중 setShapes 호출은 React 렌더 사이클과 충돌하여
          // "Maximum update depth exceeded" 에러를 유발하므로 금지
          this.dragStartStates.forEach((startState, id) => {
            const gfx = this.graphicsMap.get(id);
            if (gfx) {
              gfx.setPosition(startState.x + totalDX, startState.y + totalDY);
            }
          });

          if (this.selectionGraphics) this.selectionGraphics.clear();
        });

        g.on('dragend', () => {
          // dragend에서 최종 위치를 store에 딱 1회 커밋
          const store = useEditorStore.getState();
          const nextShapes = store.shapes.map(sh => {
            const gfx = this.graphicsMap.get(sh.id);
            if (gfx && this.dragStartStates.has(sh.id)) {
              return { ...sh, x: Math.round(gfx.x), y: Math.round(gfx.y) };
            }
            return sh;
          });
          store.setShapes(nextShapes);

          this.isDragging = false;
          this.dragStartStates.clear();
          this.dragStartPointerPos = null;
          isDragHistorySaved = false;
          this.renderPreview();
        });

      }

      // 속성 업데이트 (매번 호출)
      // 도형 그리기 (getShapePoints 활용)
      g.clear();
      const color = parseInt(s.color.replace('#', ''), 16);
      g.fillStyle(color, s.alpha);

      let hw = s.width / 2, hh = s.height / 2;

      if (s.type === 'rect') {
        g.fillRect(-hw, -hh, s.width, s.height);
      } else if (s.type === 'roundedRect') {
        g.fillRoundedRect(-hw, -hh, s.width, s.height, s.cornerRadius || 0);
      } else if (s.type === 'circle') {
        hw = hh = s.radius || 25;
        g.fillCircle(0, 0, hw);
      } else {
        const points = this.getShapePoints(s);
        if (points) g.fillPoints(points, true);
        // trapezoid의 경우 히트영역을 실제 바운딩 박스로 확장
        if (s.type === 'trapezoid' && points) {
          const xs = points.map(p => p.x);
          hw = (Math.max(...xs) - Math.min(...xs)) / 2;
        }
      }

      g.setPosition(s.x, s.y);
      g.setAngle(s.rotation);

      // Depth 설정 (z-index) 및 속성 기록
      g.setData('depth', s.depth);

      // ── 히트 영역 좌표만 갱신 (setInteractive 재호출 없음) ────
      const storedHitArea = g.getData('hitArea') as Phaser.Geom.Rectangle | undefined;
      if (storedHitArea) {
        storedHitArea.setTo(-hw, -hh, Math.max(hw * 2, 15), Math.max(hh * 2, 15));
      }
      // ────────────────────────────────────────────────────────

      if (selectedIds.has(s.id) && !this.isDragging) {
        this.drawSelectionHighlight(s);
      }
    });

    // 전체 컨테이너 자식들을 depth 기준으로 정렬
    this.previewContainer.list.sort((a, b) => (a.getData('depth') || 0) - (b.getData('depth') || 0));
  }


  private drawSelectionHighlight(s: Shape) {
    if (!this.selectionGraphics) return;
    const g = this.selectionGraphics;
    g.lineStyle(2, 0xffffff, 1);

    const d = 3; // 하이라이트 �진 반경
    const rad = (s.rotation || 0) * (Math.PI / 180);
    const cos = Math.cos(rad), sin = Math.sin(rad);
    // 로컈 좌표를 월드 좌표로 변환
    const toWorld = (px: number, py: number) => ({ x: s.x + (px * cos - py * sin), y: s.y + (px * sin + py * cos) });

    if (s.type === 'circle') {
      g.strokeCircle(s.x, s.y, (s.radius || 25) + d);
    } else {
      const points = this.getShapePoints(s, d);
      if (points) {
        g.strokePoints(points.map(p => toWorld(p.x, p.y)), true);
      }
    }

    // 중심점 표시
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

    // setTimeout 해킹 제거 — Zustand setState 직접 호출
    useEditorStore.setState({ selectedShapeIds: nextSelectedIds });
  }
}
