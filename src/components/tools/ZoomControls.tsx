import React from 'react';
import { ZoomIn, ZoomOut } from 'lucide-react';

const ZoomControls: React.FC = () => {
  // Phaser 씬에 이벤트를 보내기 위한 간단한 브릿지
  // 실제 구현에서는 Phaser 씬에 전역 이벤트를 보내거나 스토어를 통할 수 있음
  const handleZoom = (type: 'in' | 'out' | 'reset') => {
    // 씬을 찾아 줌 함수 호출 (임시 방식)
    const scene = (window as any).phaserGame?.scene.getScene('ObjectBuilderScene');
    if (scene) {
        if (type === 'in') (scene as any).cameras.main.setZoom(Math.min((scene as any).cameras.main.zoom + 0.2, 5.0));
        else if (type === 'out') (scene as any).cameras.main.setZoom(Math.max((scene as any).cameras.main.zoom - 0.2, 0.5));
        else (scene as any).cameras.main.setZoom(1.0);
    }
  };

  return (
    <div className="absolute bottom-8 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-[#0f0f14]/80 backdrop-blur-md p-1.5 rounded-2xl border border-white/10 shadow-2xl z-20 transition-opacity hover:opacity-100 opacity-60">
        <button 
            onClick={() => handleZoom('out')}
            className="p-2.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
            title="Zoom Out"
        >
            <ZoomOut size={18} />
        </button>
        <button 
            onClick={() => handleZoom('reset')}
            className="px-4 py-2 rounded-lg text-[11px] font-bold text-gray-500 hover:text-white transition-all"
            title="Reset Zoom"
        >
            100%
        </button>
        <button 
            onClick={() => handleZoom('in')}
            className="p-2.5 rounded-xl text-gray-400 hover:bg-white/5 hover:text-white transition-all"
            title="Zoom In"
        >
            <ZoomIn size={18} />
        </button>
    </div>
  );
};

export default ZoomControls;
