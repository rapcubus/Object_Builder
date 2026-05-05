export type ShapeType = 'rect' | 'roundedRect' | 'circle' | 'arc' | 'triangle' | 'rightTriangle' | 'mirroredRightTriangle' | 'trapezoid' | 'pentagon' | 'hexagon';

export interface Shape {
  id: string;
  name?: string;
  type: ShapeType;
  x: number;
  y: number;
  width: number;
  height: number;
  radius?: number;
  cornerRadius?: number;
  angleLeft?: number;
  angleRight?: number;
  arcAngle?: number;
  color: string;
  alpha: number;
  rotation: number;
  depth: number;
  groupId?: string;
  groupStrokeColor?: string;
  groupStrokeThickness?: number;
}

export interface ProjectData {
  version: string;
  projectName: string;
  timestamp: string;
  shapes: Shape[];
  code: string;
}
