import Phaser from 'phaser';

interface Shape {
  id: string;
  name?: string; // 레이어 표시 이름 (선택적)
  type: 'rect' | 'roundedRect' | 'circle' | 'triangle' | 'rightTriangle' | 'mirroredRightTriangle' | 'trapezoid' | 'pentagon' | 'hexagon';
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  cornerRadius?: number;
  angleLeft?: number;  // 사다리꼴 왼쪽 상단 내각 (기본 60)
  angleRight?: number; // 사다리꼴 오른쪽 상단 내각 (기본 60)
  color: string; // Hex string: #ffffff
  alpha: number;
  rotation: number;
  depth: number;
}

/**
 * 전용 도구 페이지용 오브젝트 빌더 씬
 * (260404) 리사이즈 안정화 및 고정 좌표계(0,0 중심)로 재설계됨
 */
export default class ObjectBuilderScene extends Phaser.Scene {
  private shapes: Shape[] = [];
  private selectedShapeIds: Set<string> = new Set();
  private previewContainer!: Phaser.GameObjects.Container;
  private uiContainer!: HTMLDivElement;
  private gridGraphics!: Phaser.GameObjects.Graphics;
  private selectionGraphics!: Phaser.GameObjects.Graphics;
  private selectionBoxGraphics!: Phaser.GameObjects.Graphics;
  private isDragging: boolean = false;
  private isBoxSelecting: boolean = false;
  private isPanning: boolean = false; // (260407) 화면 이동 상태
  private dragStartPos: Phaser.Math.Vector2 | null = null;
  
  // (260406) 다중 드래그 안정화용 초기 상태 저장소
  private dragStartStates: Map<string, { x: number; y: number }> = new Map();
  private dragStartPointerPos: { x: number; y: number } | null = null;
  private graphicsMap: Map<string, Phaser.GameObjects.Graphics> = new Map();

  // (260405) 실행 취소(Undo) 레이어 상태 스택
  private undoStack: string[] = [];
  private readonly MAX_UNDO = 100;
  
  private isInitialized: boolean = false;
  private projectName: string = "Untitled_Object";
  private fileHandle: any = null;
  private autoSaveTimer: any = null;
  
  constructor() {
    super('ObjectBuilderScene');
  }

  private static readonly PRESETS: Record<string, Omit<Shape, 'id'>[]> = {
    'Player: Character': [
      { type: 'rect', x: -18, y: 3.5, width: 10, height: 22, color: '#27ae60', alpha: 1, rotation: 0, depth: 0 },
      { type: 'roundedRect', x: 3, y: 0, width: 40, height: 65, cornerRadius: 20, color: '#2ecc71', alpha: 1, rotation: 0, depth: 1 },
      { type: 'roundedRect', x: 10.5, y: -14.5, width: 25, height: 12, cornerRadius: 6, color: '#34495e', alpha: 1, rotation: 0, depth: 2 },
      { type: 'circle', x: 15, y: -16.5, radius: 3, width: 0, height: 0, color: '#ffffff', alpha: 0.4, rotation: 0, depth: 3 }
    ],
    'Player: Full Drill': [
      { type: 'rect', x: -18, y: 3.5, width: 10, height: 22, color: '#27ae60', alpha: 1, rotation: 0, depth: 0 },
      { type: 'roundedRect', x: 3, y: 0, width: 40, height: 65, cornerRadius: 20, color: '#2ecc71', alpha: 1, rotation: 0, depth: 1 },
      { type: 'roundedRect', x: 10.5, y: -14.5, width: 25, height: 12, cornerRadius: 6, color: '#34495e', alpha: 1, rotation: 0, depth: 2 },
      { type: 'circle', x: 15, y: -16.5, radius: 3, width: 0, height: 0, color: '#ffffff', alpha: 0.4, rotation: 0, depth: 3 },
      { type: 'roundedRect', x: 28, y: 7.5, width: 56, height: 26, cornerRadius: 4, color: '#ffa500', alpha: 1, rotation: 0, depth: 4 },
      { type: 'triangle', x: 75, y: 7.5, width: 31.2, height: 38, color: '#bdc3c7', alpha: 1, rotation: 90, depth: 5 }
    ],
    'Base Lander': [
      { type: 'roundedRect', x: 0, y: 52, width: 140, height: 15, cornerRadius: 5, color: '#1a1a1a', alpha: 0.8, rotation: 0, depth: 0 },
      { type: 'roundedRect', x: 0, y: -15, width: 200, height: 130, cornerRadius: 20, color: '#444444', alpha: 1, rotation: 0, depth: 1 },
      { type: 'roundedRect', x: 0, y: -15, width: 180, height: 110, cornerRadius: 15, color: '#666666', alpha: 1, rotation: 0, depth: 2 },
      { type: 'rect', x: -20, y: -35, width: 160, height: 10, color: '#00f2ff', alpha: 1, rotation: 0, depth: 3 },
      { type: 'rect', x: 75, y: -10, width: 50, height: 10, color: '#00f2ff', alpha: 1, rotation: 0, depth: 4 },
      { type: 'roundedRect', x: -35, y: -70, width: 90, height: 40, cornerRadius: 8, color: '#222222', alpha: 1, rotation: 0, depth: 5 },
      { type: 'roundedRect', x: -35, y: -69, width: 78, height: 26, cornerRadius: 7, color: '#ffa500', alpha: 1, rotation: 0, depth: 6 },
      { type: 'rect', x: -15, y: -109, width: 4, height: 38, color: '#888888', alpha: 1, rotation: 0, depth: 7 },
      { type: 'circle', x: -15, y: -130, radius: 4, width: 0, height: 0, color: '#ff0000', alpha: 1, rotation: 0, depth: 8 }
    ],
    'Enemy: Basic': [
      { type: 'rect', x: 0, y: 0, width: 30, height: 30, color: '#f1c40f', alpha: 1, rotation: 45, depth: 0 }
    ],
    'Enemy: Sniper': [
      { type: 'circle', x: 0, y: 0, radius: 18, width: 0, height: 0, color: '#633975', alpha: 1, rotation: 0, depth: 0 },
      { type: 'circle', x: -15, y: -12, radius: 9, width: 0, height: 0, color: '#633975', alpha: 1, rotation: 0, depth: 1 },
      { type: 'circle', x: 12, y: -15, radius: 7.2, width: 0, height: 0, color: '#633975', alpha: 1, rotation: 0, depth: 2 },
      { type: 'circle', x: 15, y: 12, radius: 10.8, width: 0, height: 0, color: '#633975', alpha: 1, rotation: 0, depth: 3 },
      { type: 'circle', x: -12, y: 15, radius: 6, width: 0, height: 0, color: '#633975', alpha: 1, rotation: 0, depth: 4 }
    ],
    'Enemy: Tanker': [
      { type: 'rect', x: -10, y: 0, width: 80, height: 80, color: '#2c3e50', alpha: 1, rotation: 0, depth: 0 },
      { type: 'rightTriangle', x: 40, y: 0, width: 20, height: 80, color: '#2c3e50', alpha: 1, rotation: 0, depth: 1 }
    ],
    'Enemy: Suicide': [
      { type: 'circle', x: 0, y: 0, radius: 10.5, width: 0, height: 0, color: '#f39c12', alpha: 1, rotation: 0, depth: 0 },
      { type: 'triangle', x: 0, y: -13, width: 7, height: 9.1, color: '#f39c12', alpha: 1, rotation: 180, depth: 1 },
      { type: 'triangle', x: 9.2, y: -9.2, width: 7, height: 9.1, color: '#f39c12', alpha: 1, rotation: 225, depth: 2 },
      { type: 'triangle', x: 13, y: 0, width: 7, height: 9.1, color: '#f39c12', alpha: 1, rotation: 270, depth: 3 },
      { type: 'triangle', x: 9.2, y: 9.2, width: 7, height: 9.1, color: '#f39c12', alpha: 1, rotation: 315, depth: 4 },
      { type: 'triangle', x: 0, y: 13, width: 7, height: 9.1, color: '#f39c12', alpha: 1, rotation: 0, depth: 5 },
      { type: 'triangle', x: -9.2, y: 9.2, width: 7, height: 9.1, color: '#f39c12', alpha: 1, rotation: 45, depth: 6 },
      { type: 'triangle', x: -13, y: 0, width: 7, height: 9.1, color: '#f39c12', alpha: 1, rotation: 90, depth: 7 },
      { type: 'triangle', x: -9.2, y: -9.2, width: 7, height: 9.1, color: '#f39c12', alpha: 1, rotation: 135, depth: 8 }
    ],
    'Mineral: Amber (Yellow)': [
      { type: 'roundedRect', x: 0, y: -9, width: 60, height: 18, cornerRadius: 10, color: '#333333', alpha: 1, rotation: 0, depth: 0 },
      { type: 'circle', x: 0, y: -45, radius: 30, width: 0, height: 0, color: '#ffa500', alpha: 0.25, rotation: 0, depth: 1 },
      { type: 'circle', x: 0, y: -45, radius: 18, width: 0, height: 0, color: '#ffa500', alpha: 0.5, rotation: 0, depth: 2 },
      // 메인 결정 (다층 구조)
      { type: 'triangle', x: 0, y: -50, width: 44, height: 85, color: '#f1c40f', alpha: 0.85, rotation: 0, depth: 3 },
      { type: 'triangle', x: 0, y: -40, width: 30, height: 60, color: '#ffffff', alpha: 0.15, rotation: 0, depth: 4 },
      // 사이드 결정 (4개로 강화)
      { type: 'triangle', x: -18, y: -25, width: 22, height: 53, color: '#d35400', alpha: 0.9, rotation: -25, depth: 5 },
      { type: 'triangle', x: 18, y: -25, width: 22, height: 53, color: '#d35400', alpha: 0.9, rotation: 25, depth: 6 },
      { type: 'triangle', x: -10, y: -20, width: 15, height: 35, color: '#e67e22', alpha: 0.8, rotation: -45, depth: 7 },
      { type: 'triangle', x: 10, y: -20, width: 15, height: 35, color: '#e67e22', alpha: 0.8, rotation: 45, depth: 8 },
      // 하이라이트
      { type: 'circle', x: 8, y: -72, radius: 4, width: 0, height: 0, color: '#ffffff', alpha: 0.4, rotation: 0, depth: 9 }
    ],
    'Mineral: Sapphire (Blue)': [
      { type: 'roundedRect', x: 0, y: -9, width: 60, height: 18, cornerRadius: 10, color: '#333333', alpha: 1, rotation: 0, depth: 0 },
      { type: 'circle', x: 0, y: -45, radius: 30, width: 0, height: 0, color: '#00f2ff', alpha: 0.25, rotation: 0, depth: 1 },
      { type: 'circle', x: 0, y: -45, radius: 18, width: 0, height: 0, color: '#00f2ff', alpha: 0.5, rotation: 0, depth: 2 },
      { type: 'triangle', x: 0, y: -50, width: 44, height: 85, color: '#3498db', alpha: 0.85, rotation: 0, depth: 3 },
      { type: 'triangle', x: 0, y: -40, width: 30, height: 60, color: '#ffffff', alpha: 0.15, rotation: 0, depth: 4 },
      { type: 'triangle', x: -18, y: -25, width: 22, height: 53, color: '#2980b9', alpha: 0.9, rotation: -25, depth: 5 },
      { type: 'triangle', x: 18, y: -25, width: 22, height: 53, color: '#2980b9', alpha: 0.9, rotation: 25, depth: 6 },
      { type: 'triangle', x: -10, y: -20, width: 15, height: 35, color: '#2c3e50', alpha: 0.8, rotation: -45, depth: 7 },
      { type: 'triangle', x: 10, y: -20, width: 15, height: 35, color: '#2c3e50', alpha: 0.8, rotation: 45, depth: 8 },
      { type: 'circle', x: 8, y: -72, radius: 4, width: 0, height: 0, color: '#ffffff', alpha: 0.4, rotation: 0, depth: 9 }
    ],
    'Mineral: Amethyst (Purple)': [
      { type: 'roundedRect', x: 0, y: -9, width: 60, height: 18, cornerRadius: 10, color: '#333333', alpha: 1, rotation: 0, depth: 0 },
      { type: 'circle', x: 0, y: -45, radius: 30, width: 0, height: 0, color: '#e056fd', alpha: 0.25, rotation: 0, depth: 1 },
      { type: 'circle', x: 0, y: -45, radius: 18, width: 0, height: 0, color: '#e056fd', alpha: 0.5, rotation: 0, depth: 2 },
      { type: 'triangle', x: 0, y: -50, width: 44, height: 85, color: '#9b59b6', alpha: 0.85, rotation: 0, depth: 3 },
      { type: 'triangle', x: 0, y: -40, width: 30, height: 60, color: '#ffffff', alpha: 0.15, rotation: 0, depth: 4 },
      { type: 'triangle', x: -18, y: -25, width: 22, height: 53, color: '#6d214f', alpha: 0.9, rotation: -25, depth: 5 },
      { type: 'triangle', x: 18, y: -25, width: 22, height: 53, color: '#6d214f', alpha: 0.9, rotation: 25, depth: 6 },
      { type: 'triangle', x: -10, y: -20, width: 15, height: 35, color: '#4834d4', alpha: 0.8, rotation: -45, depth: 7 },
      { type: 'triangle', x: 10, y: -20, width: 15, height: 35, color: '#4834d4', alpha: 0.8, rotation: 45, depth: 8 },
      { type: 'circle', x: 8, y: -72, radius: 4, width: 0, height: 0, color: '#ffffff', alpha: 0.4, rotation: 0, depth: 9 }
    ]
  };

  public loadPreset(name: string) {
    const preset = ObjectBuilderScene.PRESETS[name];
    if (preset) {
      this.shapes = preset.map((s, i) => ({
        ...s,
        id: 'shape_' + Date.now() + '_' + i,
        name: s.name || `${s.type}_${i}`
      }));
      this.selectedShapeIds.clear();
      this.refreshShapeList();
      this.renderInspector();
      this.renderPreview();
    }
  }

  init() {
    this.shapes = [];
    this.selectedShapeIds.clear();
  }

  create() {
    // (260404) 배경 및 월드 중심 설정
    this.cameras.main.setBackgroundColor('#1a1a1f');
    this.gridGraphics = this.add.graphics();
    
    // 독립 툴이므로 (0,0)을 월드 중심으로 사용
    this.previewContainer = this.add.container(0, 0);
    
    // 초기화 방식을 프로젝트 생성 모달로 변경
    this.renderSplashModal();
    this.selectionGraphics = this.add.graphics().setDepth(1000);
    this.selectionBoxGraphics = this.add.graphics().setDepth(1001);
    
    // (260407) 우클릭 메뉴 비활성화 (화면 이동 시 방해 금지)
    this.input.mouse?.disableContextMenu();

    // 단축키 설정
    this.input.keyboard?.on('keydown-DELETE', () => this.deleteSelectedShape());
    
    // 방향키 이동 처리 (Shift 조합 시 10px씩 이동)
    this.input.keyboard?.on('keydown', (event: KeyboardEvent) => {
        this.handleKeyDown(event);
    });

    // (260405) 단축키 설정
    this.input.keyboard?.on('keydown-Z', (event: KeyboardEvent) => {
      if (event.ctrlKey) {
          this.undo();
      }
    });

    // (260406) 마우스 기반 인터랙션 (다중 선택/해제/화면 이동)
    this.input.on('pointerdown', (pointer: Phaser.Input.Pointer, currentlyOver: any[]) => {
      // (260407) 우클릭 또는 휠 클릭 시 화면 이동(Panning) 시작
      if (pointer.rightButtonDown() || pointer.middleButtonDown()) {
        this.isPanning = true;
        this.dragStartPos = new Phaser.Math.Vector2(pointer.x, pointer.y);
        return;
      }

      if (currentlyOver.length === 0) {
          // 빈 공간 클릭: Shift가 없으면 선택 해제, 있으면 박스 선택 준비
          if (!pointer.event.shiftKey) {
            this.selectShape(null);
          }
          this.isBoxSelecting = true;
          this.dragStartPos = new Phaser.Math.Vector2(pointer.worldX, pointer.worldY);
      }
    });

    this.input.on('pointermove', (pointer: Phaser.Input.Pointer) => {
      if (this.isPanning && this.dragStartPos) {
        // (260407) 화면 이동 처리: 마우스 이동량만큼 카메라 스크롤 조정
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

    // 화면 크기 및 좌표 동기화 (초기)
    this.updateUIPlacement();

    // 화면 크기 변경 핸들러
    this.scale.on('resize', () => {
        // 즉시 위치 재계산 및 50ms 지연 후 재렌더링 (블랙아웃 방지)
        this.updateUIPlacement();
        this.time.delayedCall(50, () => this.renderPreview());
    });
  }

  private handleKeyDown(event: KeyboardEvent) {
    if (this.selectedShapeIds.size === 0) return;
    
    // 부적절한 상황(입력창 포커스 등)에서의 단축키 방지
    if (document.activeElement?.tagName === 'INPUT') return;

    const step = event.shiftKey ? 10 : 1;
    let dx = 0, dy = 0;

    if (event.key === 'ArrowLeft') dx = -step;
    else if (event.key === 'ArrowRight') dx = step;
    else if (event.key === 'ArrowUp') dy = -step;
    else if (event.key === 'ArrowDown') dy = step;

    if (dx !== 0 || dy !== 0) {
        this.saveHistory();
        event.preventDefault();

        this.selectedShapeIds.forEach(id => {
            const shape = this.shapes.find(s => s.id === id);
            if (shape) {
                shape.x += dx;
                shape.y += dy;
            }
        });

        this.renderPreview();
        this.updateInspectorValues();
    }
  }

  private saveHistory() {
    // 현재 상태를 JSON으로 압축하여 스택에 저장
    const snapshot = JSON.stringify(this.shapes);
    
    // 마지막 상태와 동일하면 저장하지 않음 (중복 방지)
    if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === snapshot) {
        return;
    }

    this.undoStack.push(snapshot);
    if (this.undoStack.length > this.MAX_UNDO) {
        this.undoStack.shift(); // 100개 초과 시 가장 오래된 것 삭제
    }
  }

  public undo() {
    if (this.undoStack.length === 0) return;
    
    const previousState = this.undoStack.pop();
    if (previousState) {
        this.shapes = JSON.parse(previousState);
        this.selectedShapeIds.clear();
        this.refreshShapeList();
        this.renderPreview();
        this.renderInspector();
    }
  }

  public async openJSON() {
    // (260410) 작업 중인 내용이 있으면 저장 확인 (시작 화면이 아닐 때만)
    if (this.isInitialized && this.shapes.length > 0) {
      if (!confirm('현재 작업 중인 내용이 있습니다. 저장하지 않고 새로운 파일을 여시겠습니까?')) {
        return;
      }
    }

    try {
      let content = "";
      let fileName = "";
      
      if ('showOpenFilePicker' in window) {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          }],
        });
        this.fileHandle = handle;
        const file = await handle.getFile();
        content = await file.text();
        fileName = handle.name;
      } else {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = '.json';
        const filePromise = new Promise<File | null>((resolve) => {
          input.onchange = (e: any) => resolve(e.target.files[0]);
        });
        input.click();
        const file = await filePromise;
        if (!file) return;
        content = await file.text();
        fileName = file.name;
      }

      if (content) {
        const loadedData = JSON.parse(content);
        let loadedShapes: Shape[] = [];
        let loadedProjectName = this.projectName;

        if (Array.isArray(loadedData)) {
          loadedShapes = loadedData;
        } else if (loadedData && loadedData.shapes && Array.isArray(loadedData.shapes)) {
          loadedShapes = loadedData.shapes;
          loadedProjectName = loadedData.projectName || loadedProjectName;
        }

        if (loadedShapes.length > 0) {
          this.saveHistory();
          this.shapes = loadedShapes;
          this.projectName = loadedProjectName;
          this.selectedShapeIds.clear();
          this.refreshShapeList();
          this.renderPreview();
          this.renderInspector();
          
          if (!this.isInitialized) {
            this.completeInitialization();
          } else {
            this.updateUIHeader(); // 불러오기 후 헤더 갱신
          }
          alert(`Successfully loaded: ${fileName}`);
        } else {
          alert('No valid shapes found in this file.');
        }
      }
    } catch (err) {
      console.error('File open failed or cancelled:', err);
    }
  }

  public exportJSON() {
    const now = new Date();
    const dateStr = now.getFullYear() + 
                    String(now.getMonth() + 1).padStart(2, '0') + 
                    String(now.getDate()).padStart(2, '0') + 
                    String(now.getHours()).padStart(2, '0') + 
                    String(now.getMinutes()).padStart(2, '0') + 
                    String(now.getSeconds()).padStart(2, '0');
    
    // (260405) 통합 JSON 포맷 구성
    const exportData = {
        version: "1.0.0",
        projectName: this.projectName,
        timestamp: now.toISOString(),
        shapes: this.shapes,
        code: this.getGeneratedCode()
    };

    const data = JSON.stringify(exportData, null, 2);
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `OBJECT BUILDER_${dateStr}.json`;
    a.click();
    URL.revokeObjectURL(url);
  }

  public importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e: any) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (re) => {
        try {
          const content = re.target?.result as string;
          const loadedData = JSON.parse(content);
          
          let loadedShapes: Shape[] = [];
          
          // (260405) 구 버전(배열)과 신 버전(객체) 모두 호환 가능하게 처리
          if (Array.isArray(loadedData)) {
              loadedShapes = loadedData;
          } else if (loadedData && loadedData.shapes && Array.isArray(loadedData.shapes)) {
              loadedShapes = loadedData.shapes;
          }

          if (loadedShapes.length > 0) {
            this.saveHistory(); // 로드 전 히스토리 저장
            this.shapes = loadedShapes;
            this.selectedShapeIds.clear();
            this.refreshShapeList();
            this.renderPreview();
            this.renderInspector();
            alert('Project loaded successfully!');
          } else {
            alert('No valid shapes found in this file.');
          }
        } catch (err) {
          alert('Failed to load JSON file.');
          console.error(err);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }

  private drawGrid() {
    this.gridGraphics.clear();
    this.gridGraphics.lineStyle(1, 0x333344, 0.5);
    
    const range = 2000;
    const step = 20;

    // (260404) 월드 0,0 기반 그리드 그리기 (중앙 집중형)
    for (let y = -range; y <= range; y += step) {
      this.gridGraphics.lineBetween(-range, y, range, y);
    }
    for (let x = -range; x <= range; x += step) {
      this.gridGraphics.lineBetween(x, -range, x, range);
    }

    // 100단위 그리드 강조
    this.gridGraphics.lineStyle(1, 0x444466, 0.8);
    for (let y = -range; y <= range; y += 100) {
      this.gridGraphics.lineBetween(-range, y, range, y);
    }
    for (let x = -range; x <= range; x += 100) {
      this.gridGraphics.lineBetween(x, -range, x, range);
    }

    // 중심축 강조 (좌표 0,0 지점)
    this.gridGraphics.lineStyle(2, 0xff3366, 0.6);
    this.gridGraphics.lineBetween(0, -range, 0, range);
    this.gridGraphics.lineBetween(-range, 0, range, 0);
  }

  private createUI() {
    this.uiContainer = document.createElement('div');
    this.uiContainer.id = 'builder-ui-root';
    this.uiContainer.style.cssText = `
      position: absolute;
      top: 0; left: 0; width: 100%; height: 100%;
      pointer-events: none;
      font-family: 'Inter', sans-serif;
      color: #fff;
      display: flex;
      justify-content: space-between;
    `;

    // 1. 좌측 패널 (도형 목록 및 추가)
    const leftPanel = document.createElement('div');
    leftPanel.style.cssText = `
      width: 300px; background: rgba(15, 15, 20, 0.95);
      border-right: 1px solid #333; padding: 20px;
      pointer-events: auto; overflow-y: auto; height: 100vh;
      display: flex; flex-direction: column; box-sizing: border-box;
      box-shadow: 10px 0 30px rgba(0,0,0,0.5);
    `;

    leftPanel.innerHTML = `
      <div style="margin-bottom: 15px; border-bottom: 2px solid #ff3366; padding-bottom: 10px;">
        <h2 style="margin: 0; color: #fff; font-size: 18px; letter-spacing: 1px;">OBJECT BUILDER</h2>
        <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 5px;">
          <span style="font-size: 10px; color: #ff3366;">v1.0.0 STABLE</span>
          <span style="font-size: 9px; color: #666; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100px;" id="ui-project-name">[ ${this.projectName} ]</span>
        </div>
      </div>
      <div id="ui-file-info" style="margin-bottom: 20px; font-size: 11px; color: #888; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; background: rgba(255,255,255,0.05); padding: 5px 8px; border-radius: 4px;">
        File: ${this.fileHandle ? this.fileHandle.name : 'No file linked'}
      </div>
      
      <div style="margin-bottom: 25px;">
        <h3 style="font-size: 11px; color: #666; margin-bottom: 10px; text-transform: uppercase;">Shapes</h3>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <button onclick="window.builder.addShape('rect')" style="padding: 8px; background: #333; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 4px; font-size: 11px;">■ Rect</button>
          <button onclick="window.builder.addShape('roundedRect')" style="padding: 8px; background: #333; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 4px; font-size: 11px;">▢ RoundR</button>
          <button onclick="window.builder.addShape('circle')" style="padding: 8px; background: #333; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 4px; font-size: 11px;">● Circle</button>
          <button onclick="window.builder.addShape('triangle')" style="padding: 8px; background: #333; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 4px; font-size: 11px;">▲ Tri (Iso)</button>
          <button onclick="window.builder.addShape('rightTriangle')" style="padding: 8px; background: #333; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 4px; font-size: 11px;">◥ Right T</button>
          <button onclick="window.builder.addShape('mirroredRightTriangle')" style="padding: 8px; background: #333; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 4px; font-size: 11px;">◤ Mirrored T</button>
          <button onclick="window.builder.addShape('trapezoid')" style="padding: 8px; background: #333; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 4px; font-size: 11px;">⬔ Trapez</button>
          <button onclick="window.builder.addShape('pentagon')" style="padding: 8px; background: #333; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 4px; font-size: 11px;">⬠ Pent</button>
          <button onclick="window.builder.addShape('hexagon')" style="padding: 8px; background: #333; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 4px; font-size: 11px;">⬢ Hex</button>
        </div>
      </div>

      <div style="flex: 1; min-height: 0; display: flex; flex-direction: column; margin-bottom: 20px;">
        <h3 style="font-size: 11px; color: #666; margin-bottom: 10px; text-transform: uppercase;">Layers</h3>
        <div id="shape-list-container" style="flex: 1; overflow-y: auto; display: flex; flex-direction: column; gap: 4px; padding-right: 5px;"></div>
      </div>

      <div style="border-top: 1px solid #333; padding-top: 15px; display: flex; flex-direction: column; gap: 8px;">
        <button onclick="window.builder.copyCode()" style="width: 100%; padding: 12px; background: #ff3366; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;">COPY CODE / JSON</button>
        <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 8px;">
          <button onclick="window.builder.saveToFileWithNotice()" style="padding: 10px; background: #333; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 4px; font-size: 11px;">SAVE JSON</button>
          <button onclick="window.builder.openJSON()" style="padding: 10px; background: #333; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 4px; font-size: 11px;">OPEN JSON</button>
          <button onclick="window.builder.showProjectInfo()" style="padding: 10px; background: #222; border: 1px solid #444; color: #777; cursor: pointer; border-radius: 4px; font-size: 11px;">INFO</button>
          <button onclick="window.builder.undo()" style="padding: 10px; background: #333; border: 1px solid #444; color: #fff; cursor: pointer; border-radius: 4px; font-size: 11px;">UNDO (Ctrl+Z)</button>
        </div>
        <div style="margin-top: 15px; font-size: 9px; color: #fff; opacity: 0.5; text-align: center; letter-spacing: 0.5px;">
          © 2026 RAPCUBUS LAB
        </div>
      </div>
    `;

    // 2. 우측 패널 (속성 편집)
    const rightPanel = document.createElement('div');
    rightPanel.id = 'inspector-panel';
    rightPanel.style.cssText = `
      width: 300px; background: rgba(15, 15, 20, 0.95);
      border-left: 1px solid #333; padding: 25px;
      pointer-events: auto; display: none; height: 100vh; box-sizing: border-box;
      box-shadow: -10px 0 30px rgba(0,0,0,0.5);
    `;

    // 🔍 줌 컨트롤 UI (하단 중앙 고정)
    const zoomControls = document.createElement('div');
    zoomControls.id = 'zoom-controls';
    zoomControls.style.cssText = `
      position: fixed; bottom: 40px; left: 50%; transform: translateX(-50%);
      display: flex; gap: 15px; pointer-events: auto; z-index: 1000;
      background: rgba(0,0,0,0.85); padding: 12px 20px; border-radius: 40px;
      border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 10px 30px rgba(0,0,0,0.8);
      backdrop-filter: blur(10px);
    `;
    zoomControls.innerHTML = `
      <button onclick="window.builder.zoomOut()" style="width: 36px; height: 36px; background: #333; border: none; color: #fff; border-radius: 50%; cursor: pointer; font-size: 20px; transition: 0.2s;">-</button>
      <button onclick="window.builder.resetZoom()" style="padding: 0 18px; height: 36px; background: #333; border: none; color: #fff; border-radius: 18px; cursor: pointer; font-size: 13px; font-weight: bold;">100%</button>
      <button onclick="window.builder.zoomIn()" style="width: 36px; height: 36px; background: #333; border: none; color: #fff; border-radius: 50%; cursor: pointer; font-size: 20px; transition: 0.2s;">+</button>
    `;

    this.uiContainer.appendChild(leftPanel);
    this.uiContainer.appendChild(rightPanel);
    this.uiContainer.appendChild(zoomControls);
    
    document.getElementById('game-container')?.appendChild(this.uiContainer);

    // 전역 접근 허용
    (window as any).builder = this;
    this.refreshShapeList();
  }

  private renderSplashModal() {
    const modal = document.createElement('div');
    modal.id = 'splash-modal';
    modal.style.cssText = `
      position: absolute; top:0; left:0; width:100%; height:100%;
      background: rgba(10, 10, 15, 0.2);
      display: flex; align-items: center; justify-content: center;
      z-index: 10000; pointer-events: auto;
      font-family: 'Inter', sans-serif;
    `;

    modal.innerHTML = `
      <div style="width: 450px; padding: 40px; background: #1a1a1f; border: 1px solid #333; border-radius: 12px; box-shadow: 0 20px 50px rgba(0,0,0,0.8); text-align: center;">
        <div style="margin-bottom: 30px;">
          <h1 style="margin: 0; color: #fff; font-size: 24px; letter-spacing: 2px;">OBJECT BUILDER</h1>
          <div style="color: #ff3366; font-size: 11px; margin-top: 5px; font-weight: bold;">v1.0.0 STABLE</div>
        </div>

        <div style="margin-bottom: 30px; text-align: left;">
          <label style="display: block; font-size: 11px; color: #666; margin-bottom: 8px; text-transform: uppercase;">New Project Name</label>
          <input type="text" id="new-project-name" placeholder="Input Object Name Here" style="width: 100%; background: #000; border: 1px solid #444; color: #fff; padding: 15px; border-radius: 6px; font-size: 16px; box-sizing: border-box; outline: none; border-color: #ff3366;">
        </div>

        <div style="display: flex; flex-direction: column; gap: 12px;">
          <button onclick="window.builder.initNewProject()" style="width: 100%; padding: 15px; background: #ff3366; color: #fff; border: none; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 14px; transition: 0.2s;">CREATE NEW OBJECT</button>
          <button onclick="window.builder.openJSON()" style="width: 100%; padding: 12px; background: #333; color: #fff; border: 1px solid #444; border-radius: 6px; cursor: pointer; font-size: 13px;">OPEN EXISTING JSON</button>
          <div style="display: flex; align-items: center; gap: 10px; margin: 10px 0;">
            <div style="flex: 1; height: 1px; background: #333;"></div>
            <span style="font-size: 11px; color: #444;">OR</span>
            <div style="flex: 1; height: 1px; background: #333;"></div>
          </div>
          <button onclick="window.builder.startDirectly()" style="width: 100%; padding: 12px; background: #333; color: #fff; border: 1px solid #ff3366; border-radius: 6px; cursor: pointer; font-size: 13px; font-weight: bold;">JUST START (NO FILE)</button>
        </div>
        
        <div style="margin-top: 30px; font-size: 11px; color: #444;">
          * Creating a new object will prompt you to pick a save location.
        </div>
        <div style="margin-top: 20px; font-size: 10px; color: #fff; opacity: 0.5; letter-spacing: 1px;">
          © 2026 RAPCUBUS LAB. All Rights Reserved.
        </div>
      </div>
    `;

    document.getElementById('game-container')?.appendChild(modal);
    (window as any).builder = this; // 전역 등록 보장
  }

  public async initNewProject() {
    const nameInput = document.getElementById('new-project-name') as HTMLInputElement;
    const name = nameInput?.value?.trim() || "Untitled_Object";
    
    this.projectName = name;
    
    try {
      if ('showSaveFilePicker' in window) {
        const now = new Date();
        const dateStr = now.getFullYear() + 
                        String(now.getMonth() + 1).padStart(2, '0') + 
                        String(now.getDate()).padStart(2, '0') + 
                        String(now.getHours()).padStart(2, '0') + 
                        String(now.getMinutes()).padStart(2, '0') + 
                        String(now.getSeconds()).padStart(2, '0');
        
        const defaultName = `${this.projectName}_${dateStr}.json`;
        
        this.fileHandle = await (window as any).showSaveFilePicker({
          suggestedName: defaultName,
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] },
          }],
        });
        
        await this.saveToFile();
        alert(`Project initialized: ${defaultName}`);
      } else {
        alert('File System Access API is not supported in this browser. Auto-save will use LocalStorage instead.');
      }

      this.completeInitialization();

    } catch (err) {
      console.error('Project initialization cancelled or failed:', err);
    }
  }

  public startDirectly() {
    const nameInput = document.getElementById('new-project-name') as HTMLInputElement;
    this.projectName = nameInput?.value?.trim() || "Untitled_Object";
    this.completeInitialization();
  }

  private completeInitialization() {
    this.isInitialized = true;
    const modal = document.getElementById('splash-modal');
    modal?.remove();

    if (!this.uiContainer) {
      this.createUI();
    }
    this.uiContainer.style.display = 'flex';
    this.updateUIPlacement();
    this.updateUIHeader(); // 헤더 정보 동기화
    this.renderPreview();
    this.setupBeforeUnload();
    this.startAutoSave();
  }

  private updateUIHeader() {
    const nameEl = document.getElementById('ui-project-name');
    const fileEl = document.getElementById('ui-file-info');
    if (nameEl) nameEl.textContent = `[ ${this.projectName} ]`;
    if (fileEl) {
      fileEl.textContent = `File: ${this.fileHandle ? this.fileHandle.name : 'No file linked'}`;
    }
  }

  private setupBeforeUnload() {
    window.addEventListener('beforeunload', (e) => {
      if (this.shapes.length > 0) {
        e.preventDefault();
        e.returnValue = ''; 
      }
    });
  }

  private startAutoSave() {
    if (this.autoSaveTimer) clearInterval(this.autoSaveTimer);
    this.autoSaveTimer = setInterval(() => {
      this.saveToFile();
      console.log('Auto-saved at ' + new Date().toLocaleTimeString());
    }, 5 * 60 * 1000); 
  }

  private async saveToFile() {
    const exportData = {
        version: "1.0.0",
        projectName: this.projectName,
        timestamp: new Date().toISOString(),
        shapes: this.shapes,
        code: this.getGeneratedCode()
    };
    const data = JSON.stringify(exportData, null, 2);

    if (this.fileHandle) {
      try {
        const writable = await this.fileHandle.createWritable();
        await writable.write(data);
        await writable.close();
      } catch (err) {
        console.error('Auto-save failed:', err);
      }
    } else {
      localStorage.setItem(`backup_${this.projectName}`, data);
    }
  }

  public saveToFileWithNotice() {
    this.saveToFile().then(() => {
      alert('Project saved successfully!');
    });
  }

  private updateUIPlacement() {
    const { width, height } = this.scale;
    
    // (260404) 고정 좌표계 로직: 카메라를 중앙 좌표 (0,0)에 맞춤
    this.cameras.main.setViewport(0, 0, width, height);
    this.cameras.main.setScroll(-width / 2, -height / 2);
    
    this.drawGrid(); 
  }

  public addShape(type: Shape['type']) {
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
      depth: this.shapes.length
    };
    this.saveHistory(); // (260405) 추가 전 저장
    this.shapes.push(newShape);
    this.selectShape(newShape.id);
    this.refreshShapeList();
    this.renderPreview();
  }

  public selectShape(id: string | null, isToggle: boolean = false) {
    if (!id) {
        if (!isToggle) this.selectedShapeIds.clear();
    } else {
        if (isToggle) {
            if (this.selectedShapeIds.has(id)) this.selectedShapeIds.delete(id);
            else this.selectedShapeIds.add(id);
        } else {
            this.selectedShapeIds.clear();
            this.selectedShapeIds.add(id);
        }
    }

    this.refreshShapeList();
    this.renderInspector();
    
    if (this.selectionGraphics) this.selectionGraphics.clear();

    // 모든 선택된 도형에 하이라이트 표시
    this.selectedShapeIds.forEach(sid => {
      const shape = this.shapes.find(s => s.id === sid);
      if (shape) this.drawSelectionHighlight(shape);
    });
  }

  private drawSelectionBox(x1: number, y1: number, x2: number, y2: number) {
    this.selectionBoxGraphics.clear();
    this.selectionBoxGraphics.lineStyle(1, 0xffa500, 1);
    this.selectionBoxGraphics.fillStyle(0xffa500, 0.1);
    
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x1 - x2);
    const h = Math.abs(y1 - y2);

    this.selectionBoxGraphics.strokeRect(x, y, w, h);
    this.selectionBoxGraphics.fillRect(x, y, w, h);
  }

  private finishBoxSelection(x1: number, y1: number, x2: number, y2: number, isToggle: boolean) {
    const x = Math.min(x1, x2);
    const y = Math.min(y1, y2);
    const w = Math.abs(x1 - x2);
    const h = Math.abs(y1 - y2);
    
    const rect = new Phaser.Geom.Rectangle(x, y, w, h);
    
    if (!isToggle) this.selectedShapeIds.clear();

    this.shapes.forEach(shape => {
      // 도형의 중심점이 박스 안에 포함되는지 체크
      if (Phaser.Geom.Rectangle.Contains(rect, shape.x, shape.y)) {
        this.selectedShapeIds.add(shape.id);
      }
    });

    this.selectShape(null, true); // UI 갱신 유도
  }

  public handleLayerDragStart(index: number, event: DragEvent) {
    if (event.dataTransfer) {
      event.dataTransfer.setData('text/plain', index.toString());
      event.dataTransfer.effectAllowed = 'move';
      
      const target = event.target as HTMLElement;
      target.style.opacity = '0.4';
      target.style.border = '1px dashed #ff3366';
    }
  }

  public handleLayerDragOver(event: DragEvent) {
    event.preventDefault();
    if (event.dataTransfer) {
      event.dataTransfer.dropEffect = 'move';
    }
    const target = (event.target as HTMLElement).closest('.layer-item') as HTMLElement;
    if (target) {
      const rect = target.getBoundingClientRect();
      const isBottom = (event.clientY - rect.top) > rect.height / 2;
      
      target.style.borderTop = isBottom ? '1px solid transparent' : '2px solid #ff3366';
      target.style.borderBottom = isBottom ? '2px solid #ff3366' : '1px solid transparent';
      target.dataset.dropSide = isBottom ? 'bottom' : 'top';
    }
  }

  public handleLayerDragLeave(event: DragEvent) {
    const target = (event.target as HTMLElement).closest('.layer-item') as HTMLElement;
    if (target) {
      target.style.borderTop = '1px solid transparent';
      target.style.borderBottom = '1px solid transparent';
    }
  }

  public handleLayerDrop(toIndex: number, event: DragEvent) {
    event.preventDefault();
    const fromIndex = parseInt(event.dataTransfer?.getData('text/plain') || '-1');
    const target = (event.target as HTMLElement).closest('.layer-item') as HTMLElement;
    
    if (fromIndex !== -1 && target) {
      this.saveHistory(); // (260405) 순서 변경 전 저장
      const isBottom = target.dataset.dropSide === 'bottom';
      // 하단 드롭이면 타겟 인덱스 뒤에, 상단 드롭이면 타겟 인덱스 위치에 삽입
      let finalIndex = isBottom ? toIndex + 1 : toIndex;

      if (fromIndex !== finalIndex) {
        this.moveShape(fromIndex, finalIndex);
        this.refreshShapeList();
        this.renderPreview();
      } else {
        this.refreshShapeList();
      }
    } else {
      this.refreshShapeList();
    }
  }

  private moveShape(fromIndex: number, toIndex: number) {
    if (fromIndex === toIndex) return;
    const element = this.shapes.splice(fromIndex, 1)[0];
    // 이동하려는 위치가 자신보다 뒤쪽이면, 자신을 뺀 후의 인덱스로 보정
    const adjustedToIndex = (fromIndex < toIndex) ? toIndex - 1 : toIndex;
    this.shapes.splice(adjustedToIndex, 0, element);
  }

  private refreshShapeList() {
    const list = document.getElementById('shape-list-container');
    if (!list) return;

    // (260405) 사용자가 정리한 순서(배열 순서) 그대로 렌더링
    list.innerHTML = this.shapes.map((s, i) => {
      const isSelected = this.selectedShapeIds.has(s.id);
      
      return `
        <div 
          class="layer-item"
          draggable="true"
          ondragstart="window.builder.handleLayerDragStart(${i}, event)"
          ondragover="window.builder.handleLayerDragOver(event)"
          ondragleave="window.builder.handleLayerDragLeave(event)"
          ondrop="window.builder.handleLayerDrop(${i}, event)"
          onclick="window.builder.selectShape('${s.id}', event.shiftKey)" 
          style="
            padding: 8px 10px; 
            background: ${isSelected ? '#333' : 'rgba(255,255,255,0.03)'};
            border-radius: 6px; 
            cursor: pointer; 
            font-size: 13px; 
            display: flex; 
            align-items: center;
            justify-content: space-between;
            border: 1px solid ${isSelected ? '#ff3366' : 'transparent'};
            transition: 0.15s;
            margin-bottom: 2px;
          "
        >
          <div style="display: flex; align-items: center; gap: 8px; flex: 1; overflow: hidden;">
            <span style="color: #555; cursor: grab; font-size: 14px;" title="Drag to reorder list only">☰</span>
            <span style="font-size: 18px; filter: grayscale(1); opacity: 0.6;">${this.getShapeIcon(s.type)}</span>
            <span style="color: #aaa; overflow: hidden; text-overflow: ellipsis; white-space: nowrap;">${s.name || s.type.toUpperCase()}</span>
          </div>
          <div style="display: flex; align-items: center; gap: 6px;">
            <span style="font-size: 9px; color: #666;">D:${s.depth}</span>
            <span style="color: ${s.color}; font-size: 10px;">●</span>
          </div>
        </div>
      `;
    }).join('');
  }

  private getShapeIcon(type: string): string {
    const icons: Record<string, string> = {
      rect: '■',
      roundedRect: '▢',
      circle: '●',
      triangle: '▲',
      rightTriangle: '◥',
      mirroredRightTriangle: '◤',
      trapezoid: '⬔',
      pentagon: '⬠',
      hexagon: '⬢'
    };
    return icons[type] || '⬡';
  }

  private renderInspector() {
    const panel = document.getElementById('inspector-panel');
    if (!panel) return;

    if (this.selectedShapeIds.size === 0) {
      panel.style.display = 'none';
      return;
    }

    if (this.selectedShapeIds.size > 1) {
        panel.style.display = 'block';
        panel.innerHTML = `
            <h3 style="margin-top: 0; color: #ff3366; font-size: 16px;">MULTI-INSPECTOR</h3>
            <div style="text-align: center; padding: 40px 0; background: rgba(255,255,255,0.02); border-radius: 8px; margin-top: 20px;">
                <div style="font-size: 40px; margin-bottom: 15px;">📁</div>
                <div style="color: #fff; font-weight: bold;">${this.selectedShapeIds.size} Items Selected</div>
                <div style="color: #666; font-size: 12px; margin-top: 5px;">Group editing coming soon</div>
            </div>
            <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 20px;">
                <button onclick="window.builder.copySelectedShape()" style="padding: 12px; background: rgba(0,255,255,0.1); color: #00ffff; border: 1px solid #006666; cursor: pointer; border-radius: 4px; font-weight: bold;">COPY GROUP</button>
                <button onclick="window.builder.deleteSelectedShape()" style="padding: 12px; background: rgba(255,0,0,0.1); color: #ff4444; border: 1px solid #600; cursor: pointer; border-radius: 4px; font-weight: bold;">DELETE GROUP</button>
            </div>
        `;
        return;
    }

    // 단일 선택의 경우
    const singleId = Array.from(this.selectedShapeIds)[0];
    const shape = this.shapes.find(s => s.id === singleId);
    if (!shape) {
      panel.style.display = 'none';
      return;
    }

    panel.style.display = 'block';
    panel.innerHTML = `
      <h3 style="margin-top: 0; color: #ff3366; font-size: 16px;">PROPERTIES</h3>
      <div style="display: flex; flex-direction: column; gap: 18px; margin-top: 20px;">
        ${this.createInspectorInput('Layer Name', shape.name || shape.type.toUpperCase(), (v) => this.updateSelectedShape({ name: v }), 'text')}
        ${this.createInspectorInput('Offset X', shape.x, (v) => this.updateSelectedShape({ x: Number(v) }))}
        ${this.createInspectorInput('Offset Y', shape.y, (v) => this.updateSelectedShape({ y: Number(v) }))}
        ${shape.type !== 'circle' ? this.createInspectorInput('Width', shape.width, (v) => this.updateSelectedShape({ width: Number(v) })) : ''}
        ${shape.type !== 'circle' ? this.createInspectorInput('Height', shape.height, (v) => this.updateSelectedShape({ height: Number(v) })) : ''}
        ${shape.type === 'circle' ? this.createInspectorInput('Radius', shape.radius || 25, (v) => this.updateSelectedShape({ radius: Number(v) })) : ''}
        ${shape.type === 'roundedRect' ? this.createInspectorInput('Corner R', shape.cornerRadius || 5, (v) => this.updateSelectedShape({ cornerRadius: Number(v) })) : ''}
        ${shape.type === 'trapezoid' ? this.createInspectorInput('Angle L (Top)', shape.angleLeft || 60, (v) => this.updateSelectedShape({ angleLeft: Number(v) }), 'number', 1, 179, 1) : ''}
        ${shape.type === 'trapezoid' ? this.createInspectorInput('Angle R (Top)', shape.angleRight || 60, (v) => this.updateSelectedShape({ angleRight: Number(v) }), 'number', 1, 179, 1) : ''}
        ${this.createInspectorInput('Depth (Order)', shape.depth, (v) => this.updateSelectedShape({ depth: Number(v) }), 'number', -100, 100, 1)}
        ${this.createInspectorInput('Color', shape.color, (v) => this.updateSelectedShape({ color: v }), 'color')}
        ${this.createInspectorInput('Alpha', shape.alpha, (v) => this.updateSelectedShape({ alpha: Number(v) }), 'number', 0, 1, 0.1)}
        ${this.createInspectorInput('Rotation', shape.rotation, (v) => this.updateSelectedShape({ rotation: Number(v) }), 'number', 0, 360, 1)}
        <div style="display: grid; grid-template-columns: 1fr; gap: 8px; margin-top: 20px;">
          <button onclick="window.builder.copySelectedShape()" style="padding: 12px; background: rgba(0,255,255,0.1); color: #00ffff; border: 1px solid #006666; cursor: pointer; border-radius: 4px; font-weight: bold;">COPY LAYER</button>
          <button onclick="window.builder.deleteSelectedShape()" style="padding: 12px; background: rgba(255,0,0,0.1); color: #ff4444; border: 1px solid #600; cursor: pointer; border-radius: 4px; font-weight: bold;">DELETE LAYER</button>
        </div>
      </div>
    `;
  }

  public zoomIn() {
    const newZoom = Math.min(this.cameras.main.zoom + 0.2, 5.0);
    this.cameras.main.setZoom(newZoom);
  }

  public zoomOut() {
    const newZoom = Math.max(this.cameras.main.zoom - 0.2, 0.5);
    this.cameras.main.setZoom(newZoom);
  }

  public resetZoom() {
    this.cameras.main.setZoom(1.0);
  }

  private createInspectorInput(label: string, value: any, onChange: (v: string) => void, type = 'number', min = -500, max = 500, step = 1) {
    if (type === 'range') {
        const val = typeof value === 'number' ? value : 0;
        return `
            <div>
                <label style="display: flex; justify-content: space-between; font-size: 11px; color: #666; margin-bottom: 5px;">
                    <span>${label}</span>
                    <span style="color: #0f0;">${val}</span>
                </label>
                <input type="range" value="${val}" min="${min}" max="${max}" step="${step}" oninput="window.builder.${this.getInlineCallback(onChange, 'this.value')}" style="width: 100%; accent-color: #ff3366;">
            </div>
        `;
    }

    if (type === 'color') {
        return `
            <div>
                <label style="display: block; font-size: 11px; color: #666; margin-bottom: 5px;">${label}</label>
                <div style="display: flex; gap: 10px; align-items: center;">
                    <input type="color" id="inspector-${label.toLowerCase().replace(' ', '-')}" value="${value}" onchange="window.builder.${this.getInlineCallback(onChange, 'this.value')}" style="
                        width: 40px; height: 40px; background: none; border: 1px solid #333; padding: 0; cursor: pointer; border-radius: 4px;
                    ">
                    <input type="text" id="inspector-text-${label.toLowerCase().replace(' ', '-')}" value="${value}" onchange="window.builder.${this.getInlineCallback(onChange, 'this.value')}" style="
                        flex: 1; background: #000; border: 1px solid #333; color: #0f0; padding: 10px; border-radius: 4px; font-size: 14px; text-transform: uppercase;
                    ">
                </div>
            </div>
        `;
    }

    return `
      <div>
        <label style="display: block; font-size: 11px; color: #666; margin-bottom: 5px;">${label}</label>
        <input type="${type}" id="inspector-${label.toLowerCase().replace(/[\(\)]/g, '').replace(' ', '-')}" value="${value}" min="${min}" max="${max}" step="${step}" onchange="window.builder.${this.getInlineCallback(onChange, 'this.value')}" style="
          width: 100%; background: #000; border: 1px solid #333; color: #0f0; padding: 10px; border-radius: 4px; box-sizing: border-box; font-size: 14px;
        ">
      </div>
    `;
  }

  private updateInspectorValues() {
    if (this.selectedShapeIds.size === 0) return;
    const singleId = Array.from(this.selectedShapeIds)[0];
    const shape = this.shapes.find(s => s.id === singleId);
    if (!shape) return;

    const mapping: Record<string, any> = {
        'layer-name': shape.name || shape.type.toUpperCase(),
        'offset-y': shape.y,
        'width': shape.width,
        'height': shape.height,
        'radius': shape.radius,
        'corner-r': shape.cornerRadius,
        'color': shape.color,
        'alpha': shape.alpha,
        'rotation': shape.rotation,
        'depth-(order)': shape.depth,
        'angle-l-(top)': shape.angleLeft || 60,
        'angle-r-(top)': shape.angleRight || 60
    };

    Object.keys(mapping).forEach(key => {
        const input = document.getElementById(`inspector-${key}`) as HTMLInputElement;
        if (input) input.value = mapping[key];
        
        const textInput = document.getElementById(`inspector-text-${key}`) as HTMLInputElement;
        if (textInput) textInput.value = mapping[key];

        // Range 타입의 경우 옆의 숫자 텍스트도 업데이트 필요할 수 있으나, 현재 구조상 전체 리렌더링이 안전함
    });
  }

  private getInlineCallback(cb: (v: string) => void, paramName: string): string {
    const fnName = 'cb_' + Math.random().toString(36).substr(2, 9);
    (this as any)[fnName] = cb;
    return `${fnName}(${paramName})`;
  }

  private updateSelectedShape(props: Partial<Shape>) {
    if (this.selectedShapeIds.size === 0) return;
    
    this.saveHistory(); // (260405) 수정 전 저장
    this.selectedShapeIds.forEach(id => {
      const shape = this.shapes.find(s => s.id === id);
      if (shape) {
        Object.assign(shape, props);
      }
    });

    this.renderPreview();
    this.refreshShapeList();
  }

  public deleteSelectedShape() {
    if (this.selectedShapeIds.size === 0) return;
    this.saveHistory(); // (260405) 삭제 전 저장
    this.shapes = this.shapes.filter(s => !this.selectedShapeIds.has(s.id));
    this.selectedShapeIds.clear();
    this.refreshShapeList();
    this.renderInspector();
    this.renderPreview();
  }

  public copySelectedShape() {
    if (this.selectedShapeIds.size === 0) return;
    this.saveHistory(); // (260405) 복사 전 저장

    const newSelections: string[] = [];
    this.selectedShapeIds.forEach(id => {
      const shape = this.shapes.find(s => s.id === id);
      if (shape) {
        const newShape: Shape = {
          ...JSON.parse(JSON.stringify(shape)),
          id: 'shape_' + (Date.now() + Math.random()),
          name: `${shape.name || shape.type.toUpperCase()} (Copy)`,
          x: shape.x + 10,
          y: shape.y + 10
        };
        this.shapes.push(newShape);
        newSelections.push(newShape.id);
      }
    });

    this.selectedShapeIds.clear();
    newSelections.forEach(id => this.selectedShapeIds.add(id));
    
    this.refreshShapeList();
    this.renderPreview();
    this.renderInspector();
  }

  private renderPreview() {
    if (!this.previewContainer) return;
    this.previewContainer.removeAll(true);
    this.graphicsMap.clear(); // (260406) 맵 초기화
    if (this.selectionGraphics) this.selectionGraphics.clear();
    
    // (260405) 화면 렌더링 순서는 다시 depth 속성을 따름 (사용자의 요청: 리스트 순서와 뎁스 분리)
    const sortedShapes = this.shapes.slice().sort((a, b) => a.depth - b.depth);

    sortedShapes.forEach(s => {
      const g = this.add.graphics();
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
        
        const points = [
          { x: -hw, y: -hh },
          { x: hw, y: -hh },
          { x: hw + dxR, y: hh },
          { x: -hw - dxL, y: hh }
        ];
        g.fillPoints(points, true);
        // 바운딩 박스 보정 (선택 하이라이트용)
        const minX = Math.min(-hw, -hw - dxL);
        const maxX = Math.max(hw, hw + dxR);
        hw = (maxX - minX) / 2;
      } else if (s.type === 'pentagon' || s.type === 'hexagon') {
        const sides = s.type === 'pentagon' ? 5 : 6;
        const points = [];
        
        // (260407) 정규화: 사각형(Rect)과 동일한 width/height가 실제 출력되도록 보정 (Stretching 가능)
        let hw_i = s.width / 2;
        let hh_i = s.height / 2;
        let y_offset = 0;

        if (s.type === 'hexagon') {
          hw_i = (s.width / 2) / 0.866025; // 1 / cos(30)
          hh_i = s.height / 2;
        } else if (s.type === 'pentagon') {
          // 오각형 가로/세로 정규화 상수: sin(72) ≈ 0.951056, (1 + sin(54))/2 ≈ 0.904508
          hw_i = (s.width / 2) / 0.951056;
          hh_i = (s.height / 2) / 0.904508;
          y_offset = (hh_i * (Math.sin(54 * Math.PI / 180) - 1)) / 2; // Y축 중심 보정
        }

        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
          points.push({
            x: hw_i * Math.cos(angle),
            y: hh_i * Math.sin(angle) - y_offset
          });
        }
        g.fillPoints(points, true);
        
        // 하이라이트/히트 박스용 hw, hh 설정
        hw = s.width / 2;
        hh = s.height / 2;
      }

      g.setPosition(s.x, s.y);
      g.setAngle(s.rotation);
      g.setData('id', s.id);
      this.graphicsMap.set(s.id, g); // (260406) 맵에 저장
      
      // 인터렉션 설정 강화
      const hitArea = new Phaser.Geom.Rectangle(-hw, -hh, Math.max(hw * 2, 15), Math.max(hh * 2, 15));
      g.setInteractive({
          hitArea: hitArea,
          hitAreaCallback: Phaser.Geom.Rectangle.Contains,
          useHandCursor: true,
          draggable: true
      });

      g.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
          // 우측 버튼이 아닌 경우에만 선택 처리
          if (pointer.rightButtonDown()) return;
          
          // (260406) 이미 선택된 도형을 클릭했을 때는 선택을 새로고침하지 않음
          // 이렇게 해야 다중 선택된 상태에서 드래그를 시작할 때 그룹이 해제되지 않음
          if (!this.selectedShapeIds.has(s.id) || pointer.event.shiftKey) {
              this.selectShape(s.id, pointer.event.shiftKey);
          }
      });
      
      // (260406) 드래그 중 History 과다 생성을 방지하기 위한 보조 플래그
      let isDragHistorySaved = false;

      // (260406) 드래그 시작 시점의 스냅샷 캡처
      g.on('dragstart', (pointer: Phaser.Input.Pointer) => {
          this.isDragging = true;
          this.dragStartStates.clear();
          this.dragStartPointerPos = { x: pointer.worldX, y: pointer.worldY };

          // 드래그 대상이 현재 선택된 그룹에 포함되어 있지 않으면, 개별 선택으로 전환
          if (!this.selectedShapeIds.has(s.id) && !pointer.event.shiftKey) {
            this.selectShape(s.id);
          }

          // 모든 선택된 도형들의 초기 위치 저장
          this.selectedShapeIds.forEach(id => {
            const model = this.shapes.find(sh => sh.id === id);
            if (model) {
                this.dragStartStates.set(id, { x: model.x, y: model.y });
            }
          });
      });

      // 드래그 중 실시간 위치 반영
      g.on('drag', (pointer: Phaser.Input.Pointer) => {
          if (!this.dragStartPointerPos) return;

          // 마우스 포인터의 총 이동량 계산 (Phaser 내부 dragX 대신 사용)
          const totalDX = Math.round(pointer.worldX - this.dragStartPointerPos.x);
          const totalDY = Math.round(pointer.worldY - this.dragStartPointerPos.y);

          if (totalDX === 0 && totalDY === 0) return;

          if (!isDragHistorySaved) {
            this.saveHistory();
            isDragHistorySaved = true;
          }

          // 그룹 내 모든 도형의 위치를 스냅샷 기반으로 일괄 업데이트
          this.selectedShapeIds.forEach(id => {
              const startState = this.dragStartStates.get(id);
              const targetModel = this.shapes.find(sh => sh.id === id);
              if (startState && targetModel) {
                  targetModel.x = startState.x + totalDX;
                  targetModel.y = startState.y + totalDY;
                  
                  // 시각적 위치 업데이트 (graphicsMap 활용)
                  const targetGraphics = this.graphicsMap.get(id);
                  if (targetGraphics) {
                      targetGraphics.setPosition(targetModel.x, targetModel.y);
                  }
              }
          });
          
          // (260407) 드래그 중에는 외곽선을 숨김 (터치 중일 때 흰색 선 제거 요청 반영)
          if (this.selectionGraphics) {
            this.selectionGraphics.clear();
          }

          this.updateInspectorValues();
      });

      g.on('dragend', () => {
          this.isDragging = false;
          this.dragStartStates.clear();
          this.dragStartPointerPos = null;
          isDragHistorySaved = false;
          this.renderPreview(); // 최종 위치 정렬 및 갱신
      });

      this.previewContainer.add(g);

      // 선택 강조 표시
      if (this.selectedShapeIds.has(s.id) && !this.isDragging) {
          this.drawSelectionHighlight(s);
      }
    });
  }

  private drawSelectionHighlight(s: Shape) {
    if (!this.selectionGraphics) return;
    const g = this.selectionGraphics;
    
    // (260407) 흰색 외곽선 (2px)
    g.lineStyle(2, 0xffffff, 1);
    
    // 외곽선을 도형 밖으로 띄우기 위한 오프셋 (3px)
    const d = 3;
    
    // 로컬 좌표를 월드 좌표로 변환하는 함수 (회전 반영)
    const rad = (s.rotation || 0) * (Math.PI / 180);
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    
    const toWorld = (px: number, py: number) => {
      return {
        x: s.x + (px * cos - py * sin),
        y: s.y + (px * sin + py * cos)
      };
    };

    if (s.type === 'rect' || s.type === 'roundedRect') {
      const hw = s.width / 2 + d;
      const hh = s.height / 2 + d;
      const points = [
        toWorld(-hw, -hh), toWorld(hw, -hh), toWorld(hw, hh), toWorld(-hw, hh)
      ];
      if (s.type === 'roundedRect') {
        // RoundedRect 외곽선은 간편하게 strokePoints 대신 strokeRoundedRect를 월드 변환 없이 쓰기 어려우므로 
        // 다중 포인트로 그리거나, 단순히 박스 형태로 제공 (여기선 박스 유지)
        g.strokePoints(points, true);
      } else {
        g.strokePoints(points, true);
      }
    } else if (s.type === 'circle') {
      g.strokeCircle(s.x, s.y, (s.radius || 25) + d);
    } else if (s.type === 'triangle') {
      const hh = s.height / 2 + d, hw = s.width / 2 + d;
      const points = [toWorld(0, -hh), toWorld(-hw, hh), toWorld(hw, hh)];
      g.strokePoints(points, true);
    } else if (s.type === 'rightTriangle') {
      const hh = s.height / 2 + d, hw = s.width / 2 + d;
      const points = [toWorld(-hw, -hh), toWorld(hw, -hh), toWorld(-hw, hh)];
      g.strokePoints(points, true);
    } else if (s.type === 'mirroredRightTriangle') {
      const hh = s.height / 2 + d, hw = s.width / 2 + d;
      const points = [toWorld(-hw, -hh), toWorld(hw, -hh), toWorld(hw, hh)];
      g.strokePoints(points, true);
    } else if (s.type === 'trapezoid') {
      const hw = s.width / 2 + d;
      const hh = s.height / 2 + d;
      const aL = (s.angleLeft || 60) * (Math.PI / 180);
      const aR = (s.angleRight || 60) * (Math.PI / 180);
      const dxL = (hh * 2) / Math.tan(aL);
      const dxR = (hh * 2) / Math.tan(aR);
      const points = [
        toWorld(-hw, -hh), toWorld(hw, -hh), 
        toWorld(hw + dxR, hh), toWorld(-hw - dxL, hh)
      ];
      g.strokePoints(points, true);
    } else if (s.type === 'pentagon' || s.type === 'hexagon') {
      const sides = s.type === 'pentagon' ? 5 : 6;
      const points = [];
      let hw_i = (s.width / 2 + d);
      let hh_i = (s.height / 2 + d);
      let y_offset = 0;

      if (s.type === 'hexagon') {
        hw_i = hw_i / 0.866025;
      } else if (s.type === 'pentagon') {
        hw_i = hw_i / 0.951056;
        hh_i = hh_i / 0.904508;
        y_offset = (hh_i * (Math.sin(54 * Math.PI / 180) - 1)) / 2;
      }

      for (let i = 0; i < sides; i++) {
        const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
        const lx = hw_i * Math.cos(angle);
        const ly = hh_i * Math.sin(angle) - y_offset;
        points.push(toWorld(lx, ly));
      }
      g.strokePoints(points, true);
    }

    // 중심 포인트 표시
    g.lineStyle(1, 0xffffff, 0.5);
    g.lineBetween(s.x - 5, s.y, s.x + 5, s.y);
    g.lineBetween(s.x, s.y - 5, s.x, s.y + 5);
    g.fillStyle(0xffffff, 1);
    g.fillCircle(s.x, s.y, 3);
  }

  public showProjectInfo() {
    if (this.fileHandle) {
      alert(`[ INFO ]\n\nProject: ${this.projectName}\nFile: ${this.fileHandle.name}\n\n* Auto-save is active (every 5 mins).`);
    } else {
      alert(`[ INFO ]\n\nProject: ${this.projectName}\nSaving to: LocalStorage (Backup)`);
    }
  }

  public copyCode() {
    const code = this.getGeneratedCode();
    // (260405) 나중에 불러올 수 있도록 JSON 데이터를 주석으로 포함
    const projectData = `/* PROJECT_DATA: ${JSON.stringify(this.shapes)} */\n\n`;
    
    navigator.clipboard.writeText(projectData + code).then(() => {
        alert('Code and Project Data copied to clipboard!');
    });
  }

  private getGeneratedCode(): string {
    let code = `// Object Building Code\n`;
    code += `const graphics = scene.add.graphics();\n\n`;

    // (260405) 복사되는 코드 역시 depth 순서대로 정렬하여 렌더링 순서 보장
    const sortedShapes = this.shapes.slice().sort((a, b) => a.depth - b.depth);

    sortedShapes.forEach(s => {
      const colorHex = '0x' + s.color.replace('#', '');
      
      code += `// Layer: ${s.name || s.type.toUpperCase()}\n`;
      code += `graphics.save();\n`;
      code += `graphics.translate(${s.x}, ${s.y});\n`;
      if (s.rotation !== 0) {
        code += `graphics.rotate(Phaser.Math.DegToRad(${s.rotation}));\n`;
      }
      code += `graphics.fillStyle(${colorHex}, ${s.alpha});\n`;
      
      if (s.type === 'rect') {
        code += `graphics.fillRect(${-s.width / 2}, ${-s.height / 2}, ${s.width}, ${s.height});\n`;
      } else if (s.type === 'roundedRect') {
        code += `graphics.fillRoundedRect(${-s.width / 2}, ${-s.height / 2}, ${s.width}, ${s.height}, ${s.cornerRadius});\n`;
      } else if (s.type === 'circle') {
        code += `graphics.fillCircle(0, 0, ${s.radius});\n`;
      } else if (s.type === 'triangle') {
        code += `graphics.fillTriangle(0, ${-s.height / 2}, ${-s.width / 2}, ${s.height / 2}, ${s.width / 2}, ${s.height / 2});\n`;
      } else if (s.type === 'rightTriangle') {
        code += `graphics.fillTriangle(${-s.width / 2}, ${-s.height / 2}, ${s.width / 2}, ${-s.height / 2}, ${-s.width / 2}, ${s.height / 2});\n`;
      } else if (s.type === 'mirroredRightTriangle') {
        code += `graphics.fillTriangle(${-s.width / 2}, ${-s.height / 2}, ${s.width / 2}, ${-s.height / 2}, ${s.width / 2}, ${s.height / 2});\n`;
      } else if (s.type === 'trapezoid') {
        const hh = s.height / 2, hw = s.width / 2;
        const aL = (s.angleLeft || 60) * (Math.PI / 180), aR = (s.angleRight || 60) * (Math.PI / 180);
        const dxL = (hh * 2) / Math.tan(aL), dxR = (hh * 2) / Math.tan(aR);
        code += `graphics.fillPoints([{x:${-hw},y:${-hh}}, {x:${hw},y:${-hh}}, {x:${hw + dxR},y:${hh}}, {x:${-hw - dxL},y:${hh}}], true);\n`;
      } else if (s.type === 'pentagon' || s.type === 'hexagon') {
        const sides = s.type === 'pentagon' ? 5 : 6;
        
        // (260407) 정규화 적용된 코드 생성 (Stretching 대응)
        let hw_i = s.width / 2;
        let hh_i = s.height / 2;
        let y_offset = 0;

        if (s.type === 'hexagon') {
          hw_i = (s.width / 2) / 0.866025;
          hh_i = s.height / 2;
        } else if (s.type === 'pentagon') {
          hw_i = (s.width / 2) / 0.951056;
          hh_i = (s.height / 2) / 0.904508;
          y_offset = (hh_i * (Math.sin(54 * Math.PI / 180) - 1)) / 2;
        }

        let pStr = '';
        for (let i = 0; i < sides; i++) {
          const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
          const px = (hw_i * Math.cos(angle)).toFixed(1);
          const py = (hh_i * Math.sin(angle) - y_offset).toFixed(1);
          pStr += `{x:${px},y:${py}}${i === sides - 1 ? '' : ', '}`;
        }
        code += `graphics.fillPoints([${pStr}], true);\n`;
      }
      code += `graphics.restore();\n\n`;
    });

    return code;
  }

  public exit() {
    if (confirm('프로젝트를 저장하셨나요? 메인 로비로 돌아갑니다.')) {
        window.location.href = 'index.html';
    }
  }
}
