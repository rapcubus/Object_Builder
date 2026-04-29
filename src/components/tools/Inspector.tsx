import React from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { Trash2, Copy, Sliders, Hash, Move, Maximize, RotateCw, Palette, Layers as LayersIcon } from 'lucide-react';

const Inspector: React.FC = () => {
  const { shapes, selectedShapeIds, updateSelectedShapes, deleteSelectedShapes, copySelectedShapes } = useEditorStore();

  const selectedShapes = shapes.filter(s => selectedShapeIds.has(s.id));
  const isMultiSelect = selectedShapeIds.size > 1;
  const isSingleSelect = selectedShapeIds.size === 1;
  const target = isSingleSelect ? selectedShapes[0] : null;

  if (selectedShapeIds.size === 0) {
    return (
      <div className="w-80 bg-[#0f0f14] border-l border-white/10 flex flex-col h-full shadow-2xl z-10">
        <div className="p-6 border-b border-white/5 bg-[#1a1a1f]/50">
          <h2 className="text-sm font-bold text-gray-700 tracking-[0.2em] mb-1 uppercase">Properties</h2>
          <div className="text-xs text-gray-800 uppercase tracking-widest">No Selection</div>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center p-10 text-center opacity-20">
          <div className="w-16 h-16 rounded-full border-2 border-dashed border-gray-600 flex items-center justify-center mb-4">
            <Sliders size={24} className="text-gray-600" />
          </div>
          <p className="text-xs text-gray-600 font-medium">Select an object<br/>to edit properties</p>
        </div>
      </div>
    );
  }

  return (
    <div className="w-80 bg-[#0f0f14] border-l border-white/10 flex flex-col h-full shadow-2xl z-10 animate-in slide-in-from-right duration-300">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-[#1a1a1f]/50">
        <h2 className="text-sm font-bold text-[#ff3366] tracking-[0.2em] mb-1 uppercase">Properties</h2>
        <div className="text-xs text-gray-500 uppercase tracking-widest">
          {isMultiSelect ? `${selectedShapeIds.size} items selected` : target?.type}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-5 space-y-6 custom-scrollbar">
        {isMultiSelect ? (
          <div className="space-y-6">
             <div className="bg-[#1a1a1f] p-8 rounded-xl border border-white/5 flex flex-col items-center text-center">
                <div className="p-4 bg-[#ff3366]/10 rounded-full mb-4">
                    <LayersIcon size={32} className="text-[#ff3366]" />
                </div>
                <h4 className="font-bold text-white mb-1">Group Edit</h4>
                <p className="text-[11px] text-gray-500">Apply changes to {selectedShapeIds.size} layers simultaneously.</p>
             </div>
             
             <div className="grid grid-cols-1 gap-2">
                <button 
                    onClick={copySelectedShapes}
                    className="flex items-center justify-center gap-3 p-3 rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400 hover:bg-cyan-500/20 transition-all text-xs font-bold"
                >
                    <Copy size={14} /> Duplicate Group
                </button>
                <button 
                    onClick={deleteSelectedShapes}
                    className="flex items-center justify-center gap-3 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 hover:bg-red-500/20 transition-all text-xs font-bold"
                >
                    <Trash2 size={14} /> Delete Group
                </button>
             </div>
          </div>
        ) : target && (
          <div className="space-y-5">
            {/* Name */}
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-tighter flex items-center gap-2">
                    <Hash size={12} /> Layer Name
                </label>
                <input 
                    type="text" 
                    value={target.name || ''} 
                    onChange={(e) => updateSelectedShapes({ name: e.target.value })}
                    className="w-full bg-[#1a1a1f] border border-white/10 rounded-lg px-3 py-2.5 text-xs text-white focus:border-[#ff3366] outline-none transition-colors"
                />
            </div>

            {/* Transform */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-tighter flex items-center gap-2">
                    <Move size={12} /> Position
                </label>
                <div className="grid grid-cols-2 gap-3">
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-mono">X</span>
                        <input 
                            type="number" 
                            value={target.x} 
                            onChange={(e) => updateSelectedShapes({ x: Number(e.target.value) })}
                            className="w-full bg-[#1a1a1f] border border-white/10 rounded-lg pl-6 pr-2 py-2 text-xs font-mono text-cyan-400 focus:border-cyan-500/50 outline-none"
                        />
                    </div>
                    <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-mono">Y</span>
                        <input 
                            type="number" 
                            value={target.y} 
                            onChange={(e) => updateSelectedShapes({ y: Number(e.target.value) })}
                            className="w-full bg-[#1a1a1f] border border-white/10 rounded-lg pl-6 pr-2 py-2 text-xs font-mono text-cyan-400 focus:border-cyan-500/50 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Dimensions */}
            <div className="space-y-3">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-tighter flex items-center gap-2">
                    <Maximize size={12} /> Dimensions
                </label>
                <div className="grid grid-cols-2 gap-3">
                    {target.type === 'circle' ? (
                        <div className="col-span-2 relative">
                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-mono">RADIUS</span>
                            <input 
                                type="number" 
                                value={target.radius || 25} 
                                onChange={(e) => updateSelectedShapes({ radius: Number(e.target.value) })}
                                className="w-full bg-[#1a1a1f] border border-white/10 rounded-lg pl-14 pr-2 py-2 text-xs font-mono text-green-400 focus:border-green-500/50 outline-none"
                            />
                        </div>
                    ) : (
                        <>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-mono">W</span>
                                <input 
                                    type="number" 
                                    value={target.width} 
                                    onChange={(e) => updateSelectedShapes({ width: Number(e.target.value) })}
                                    className="w-full bg-[#1a1a1f] border border-white/10 rounded-lg pl-7 pr-2 py-2 text-xs font-mono text-green-400 focus:border-green-500/50 outline-none"
                                />
                            </div>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-mono">H</span>
                                <input 
                                    type="number" 
                                    value={target.height} 
                                    onChange={(e) => updateSelectedShapes({ height: Number(e.target.value) })}
                                    className="w-full bg-[#1a1a1f] border border-white/10 rounded-lg pl-7 pr-2 py-2 text-xs font-mono text-green-400 focus:border-green-500/50 outline-none"
                                />
                            </div>
                        </>
                    )}
            </div>
        </div>

            {/* Shape Specific Props */}
            {(target.type === 'roundedRect' || target.type === 'trapezoid') && (
                <div className="space-y-4 pt-2 pb-2">
                    {target.type === 'roundedRect' && (
                        <div className="space-y-2">
                            <div className="flex justify-between items-center">
                                <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                                    <Maximize size={10} /> Corner Radius
                                </label>
                                <span className="text-xs text-gray-400 font-mono">{target.cornerRadius || 0}px</span>
                            </div>
                            <input 
                                type="range" 
                                min="0" max="100" step="1" 
                                value={target.cornerRadius || 0} 
                                onChange={(e) => updateSelectedShapes({ cornerRadius: Number(e.target.value) })}
                                className="w-full h-1.5 bg-[#1a1a1f] rounded-lg appearance-none cursor-pointer accent-green-500"
                            />
                        </div>
                    )}

                    {target.type === 'trapezoid' && (
                        <>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                                        <Sliders size={10} /> Left Angle
                                    </label>
                                    <span className="text-xs text-gray-400 font-mono">{target.angleLeft || 60}°</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" max="89" step="1" 
                                    value={target.angleLeft || 60} 
                                    onChange={(e) => updateSelectedShapes({ angleLeft: Number(e.target.value) })}
                                    className="w-full h-1.5 bg-[#1a1a1f] rounded-lg appearance-none cursor-pointer accent-green-500"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                                        <Sliders size={10} /> Right Angle
                                    </label>
                                    <span className="text-xs text-gray-400 font-mono">{target.angleRight || 60}°</span>
                                </div>
                                <input 
                                    type="range" 
                                    min="1" max="89" step="1" 
                                    value={target.angleRight || 60} 
                                    onChange={(e) => updateSelectedShapes({ angleRight: Number(e.target.value) })}
                                    className="w-full h-1.5 bg-[#1a1a1f] rounded-lg appearance-none cursor-pointer accent-green-500"
                                />
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Appearance */}
            <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-600 uppercase tracking-tighter flex items-center gap-2">
                        <Palette size={12} /> Style
                    </label>
                    <div className="flex gap-2">
                        <input 
                            type="color" 
                            value={target.color} 
                            onChange={(e) => updateSelectedShapes({ color: e.target.value })}
                            className="w-10 h-10 p-0 bg-transparent border-0 cursor-pointer overflow-hidden rounded-md"
                        />
                        <input 
                            type="text" 
                            value={target.color} 
                            onChange={(e) => updateSelectedShapes({ color: e.target.value })}
                            className="flex-1 bg-[#1a1a1f] border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-white focus:border-[#ff3366] outline-none uppercase"
                        />
                    </div>
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-tighter">Opacity</label>
                        <span className="text-xs text-gray-400 font-mono">{Math.round(target.alpha * 100)}%</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" max="1" step="0.01" 
                        value={target.alpha} 
                        onChange={(e) => updateSelectedShapes({ alpha: Number(e.target.value) })}
                        className="w-full h-1.5 bg-[#1a1a1f] rounded-lg appearance-none cursor-pointer accent-[#ff3366]"
                    />
                </div>

                <div className="space-y-2">
                    <div className="flex justify-between items-center">
                        <label className="text-xs font-bold text-gray-600 uppercase tracking-tighter flex items-center gap-2">
                            <RotateCw size={12} /> Rotation
                        </label>
                        <span className="text-xs text-gray-400 font-mono">{target.rotation}°</span>
                    </div>
                    <input 
                        type="range" 
                        min="0" max="360" step="1" 
                        value={target.rotation} 
                        onChange={(e) => updateSelectedShapes({ rotation: Number(e.target.value) })}
                        className="w-full h-1.5 bg-[#1a1a1f] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                    />
                </div>
            </div>

            {/* Depth & Order */}
            <div className="space-y-4 pt-4 border-t border-white/5">
                <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                            <LayersIcon size={10} /> List Order
                        </label>
                        <div className="bg-[#1a1a1f]/50 border border-white/5 rounded-lg px-3 py-2 text-xs font-mono text-gray-500">
                            #{shapes.findIndex(s => s.id === target.id)}
                        </div>
                    </div>
                    <div className="space-y-2">
                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2">
                            <Sliders size={10} /> Rendering Depth
                        </label>
                        <input 
                            type="number" 
                            value={target.depth} 
                            onChange={(e) => updateSelectedShapes({ depth: Number(e.target.value) })}
                            className="w-full bg-[#1a1a1f] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-orange-400 focus:border-orange-500/50 outline-none"
                        />
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-2 pt-4">
                <button 
                    onClick={copySelectedShapes}
                    className="flex items-center justify-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10 text-white hover:bg-white/10 transition-all text-[11px]"
                >
                    <Copy size={12} /> Copy
                </button>
                <button 
                    onClick={deleteSelectedShapes}
                    className="flex items-center justify-center gap-2 p-2 rounded-lg bg-red-500/5 border border-red-500/20 text-red-400 hover:bg-red-500/10 transition-all text-[11px]"
                >
                    <Trash2 size={12} /> Delete
                </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Inspector;
