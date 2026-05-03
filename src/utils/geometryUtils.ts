import { Shape } from '../types/game';

// 다각형 클리핑 라이브러리는 [ [ [x,y], [x,y]... ] ] 형태의 MultiPolygon을 반환/입력받음
export type PolygonRing = [number, number][];
export type Polygon = PolygonRing[];
export type MultiPolygon = Polygon[];

/**
 * 주어진 중심(cx, cy)과 회전각(rotation도)을 기준으로 2D 점을 회전시킵니다.
 */
function rotatePoint(x: number, y: number, cx: number, cy: number, angleDeg: number): [number, number] {
    const rad = (angleDeg * Math.PI) / 180;
    const cos = Math.cos(rad);
    const sin = Math.sin(rad);
    const nx = (cos * (x - cx)) - (sin * (y - cy)) + cx;
    const ny = (sin * (x - cx)) + (cos * (y - cy)) + cy;
    return [nx, ny];
}

/**
 * Shape 객체를 월드 좌표계 기준의 PolygonRing(점 배열)으로 변환합니다.
 */
export function getShapeWorldPolygon(s: Shape, circleSegments: number = 32): PolygonRing {
    let points: [number, number][] = [];
    let hw = s.width / 2;
    let hh = s.height / 2;

    if (s.type === 'rect') {
        points = [
            [-hw, -hh],
            [hw, -hh],
            [hw, hh],
            [-hw, hh]
        ];
    } else if (s.type === 'roundedRect') {
        // roundedRect는 충돌/실루엣 관점에서는 일단 rect와 동일하게 처리하거나
        // 모서리를 세분화해야 합니다. 여기서는 간소화를 위해 사각형 기반에 모서리 점을 추가
        const r = s.cornerRadius || 0;
        if (r <= 0) {
            points = [[-hw, -hh], [hw, -hh], [hw, hh], [-hw, hh]];
        } else {
            // 각 모서리당 4개의 점으로 근사
            const steps = 4;
            const corners = [
                { cx: hw - r, cy: -hh + r, start: 270 }, // Top-Right
                { cx: hw - r, cy: hh - r, start: 0 },    // Bottom-Right
                { cx: -hw + r, cy: hh - r, start: 90 },   // Bottom-Left
                { cx: -hw + r, cy: -hh + r, start: 180 }  // Top-Left
            ];
            corners.forEach(c => {
                for (let i = 0; i <= steps; i++) {
                    const a = c.start + (90 * i) / steps;
                    const rad = (a * Math.PI) / 180;
                    points.push([c.cx + Math.cos(rad) * r, c.cy + Math.sin(rad) * r]);
                }
            });
        }
    } else if (s.type === 'circle') {
        const r = s.radius || 25;
        for (let i = 0; i < circleSegments; i++) {
            const rad = (i * 2 * Math.PI) / circleSegments;
            points.push([Math.cos(rad) * r, Math.sin(rad) * r]);
        }
    } else if (s.type === 'triangle') {
        points = [
            [0, -hh],
            [-hw, hh],
            [hw, hh]
        ];
    } else if (s.type === 'rightTriangle') {
        points = [
            [-hw, -hh],
            [hw, -hh],
            [-hw, hh]
        ];
    } else if (s.type === 'mirroredRightTriangle') {
        points = [
            [-hw, -hh],
            [hw, -hh],
            [hw, hh]
        ];
    } else if (s.type === 'trapezoid') {
        const al = (s.angleLeft || 60) * Math.PI / 180;
        const ar = (s.angleRight || 60) * Math.PI / 180;
        const dxLeft = s.height / Math.tan(al);
        const dxRight = s.height / Math.tan(ar);
        points = [
            [-hw, -hh],
            [hw, -hh],
            [hw + dxRight, hh],
            [-hw - dxLeft, hh]
        ];
    } else if (s.type === 'pentagon' || s.type === 'hexagon') {
        const sides = s.type === 'pentagon' ? 5 : 6;
        let hw_i = hw, hh_i = hh, y_offset = 0;
        if (s.type === 'hexagon') {
            hw_i = hw / 0.866025;
        } else {
            hw_i = hw / 0.951056;
            hh_i = hh / 0.904508;
            y_offset = (hh_i * (Math.sin(54 * Math.PI / 180) - 1)) / 2;
        }
        for (let i = 0; i < sides; i++) {
            const angle = (i * 2 * Math.PI / sides) - Math.PI / 2;
            points.push([hw_i * Math.cos(angle), hh_i * Math.sin(angle) - y_offset]);
        }
    }

    // 2. 스케일/로테이션 적용 (Shape 내부 좌표계를 월드로)
    // 현재 구현에서는 Shape가 자체 x,y와 rotation을 가짐.
    return points.map(p => rotatePoint(p[0] + s.x, p[1] + s.y, s.x, s.y, s.rotation));
}
