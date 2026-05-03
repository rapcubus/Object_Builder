import React from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { Trash2, Copy, Sliders, Hash, Move, Maximize, RotateCw, Palette, Layers as LayersIcon, Link, Link2Off } from 'lucide-react';

const Inspector: React.FC = () => {
    const { shapes, selectedShapeIds, updateSelectedShapes, deleteSelectedShapes, copySelectedShapes, saveHistory, setShapes, groupSelectedShapes, ungroupSelectedShapes } = useEditorStore();

    const selectedShapes = shapes.filter(s => selectedShapeIds.has(s.id));
    const isMultiSelect = selectedShapeIds.size > 1;
    const isSingleSelect = selectedShapeIds.size === 1;
    const target = isSingleSelect ? selectedShapes[0] : null;

    // Local state for numeric inputs to handle negative signs and empty values
    const [tempX, setTempX] = React.useState(target?.x.toString() || '0');
    const [tempY, setTempY] = React.useState(target?.y.toString() || '0');

    React.useEffect(() => {
        if (target) {
            setTempX(Math.round(target.x).toString());
            setTempY(Math.round(target.y).toString());
        }
    }, [target?.id, target?.x, target?.y]);

    // Group rotation reference state
    const groupRotationRef = React.useRef<{
        centerX: number;
        centerY: number;
        initialShapes: { id: string; x: number; y: number; rotation: number }[];
        initialReferenceRotation: number;
    } | null>(null);

    const snapRotation = (val: number) => {
        const snapPoints = [0, 90, 180, 270, 360];
        const threshold = 5;
        for (const point of snapPoints) {
            if (Math.abs(val - point) < threshold) return point % 360;
        }
        return val;
    };

    const handleGroupRotationStart = () => {
        saveHistory();
        if (selectedShapes.length === 0) return;

        // Calculate geometric center of selected shapes
        const centerX = selectedShapes.reduce((sum, s) => sum + s.x, 0) / selectedShapes.length;
        const centerY = selectedShapes.reduce((sum, s) => sum + s.y, 0) / selectedShapes.length;

        groupRotationRef.current = {
            centerX,
            centerY,
            initialShapes: selectedShapes.map(s => ({ id: s.id, x: s.x, y: s.y, rotation: s.rotation })),
            initialReferenceRotation: selectedShapes[0].rotation
        };
    };

    const handleGroupRotationChange = (rawVal: number) => {
        if (!groupRotationRef.current) return;

        const newVal = snapRotation(rawVal);
        const { centerX, centerY, initialShapes, initialReferenceRotation } = groupRotationRef.current;
        const deltaDeg = newVal - initialReferenceRotation;
        const deltaRad = deltaDeg * (Math.PI / 180);
        const cos = Math.cos(deltaRad);
        const sin = Math.sin(deltaRad);

        const nextShapes = shapes.map(s => {
            const initial = initialShapes.find(is => is.id === s.id);
            if (initial) {
                const dx = initial.x - centerX;
                const dy = initial.y - centerY;
                // Orbit position + Rotate individual shape
                return {
                    ...s,
                    x: Math.round(centerX + (dx * cos - dy * sin)),
                    y: Math.round(centerY + (dx * sin + dy * cos)),
                    rotation: Math.round((initial.rotation + deltaDeg) % 360)
                };
            }
            return s;
        });

        setShapes(nextShapes);
    };

    const handleRotationKeyDown = (e: React.KeyboardEvent, currentVal: number, onChange: (val: number) => void) => {
        if (e.key === 'PageUp') {
            e.preventDefault();
            saveHistory();
            const nextVal = (Math.floor(currentVal / 15) + 1) * 15;
            onChange(nextVal % 360);
        } else if (e.key === 'PageDown') {
            e.preventDefault();
            saveHistory();
            const nextVal = (Math.ceil(currentVal / 15) - 1) * 15;
            const finalVal = nextVal < 0 ? nextVal + 360 : nextVal;
            onChange(finalVal % 360);
        }
    };

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
                    <p className="text-xs text-gray-600 font-medium">Select an object<br />to edit properties</p>
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

                        {/* Common Properties */}
                        <div className="space-y-5 pt-2">
                            <label className="text-xs font-bold text-gray-600 uppercase tracking-tighter flex items-center gap-2">
                                <Palette size={12} /> Common Style
                            </label>

                            {/* Color */}
                            <div className="space-y-2">
                                <div className="flex gap-2">
                                    <input
                                        type="color"
                                        value={selectedShapes[0].color}
                                        onMouseDown={() => saveHistory()}
                                        onChange={(e) => updateSelectedShapes({ color: e.target.value })}
                                        className="w-10 h-10 p-0 bg-transparent border-0 cursor-pointer overflow-hidden rounded-md"
                                    />
                                    <input
                                        type="text"
                                        value={selectedShapes[0].color}
                                        onChange={(e) => updateSelectedShapes({ color: e.target.value })}
                                        className="flex-1 bg-[#1a1a1f] border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-white focus:border-[#ff3366] outline-none uppercase"
                                    />
                                </div>
                            </div>

                            {/* Opacity */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest cursor-pointer">Opacity</label>
                                    <span className="text-xs text-gray-400 font-mono">{Math.round(selectedShapes[0].alpha * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="1" step="0.01"
                                    value={selectedShapes[0].alpha}
                                    onMouseDown={() => saveHistory()}
                                    onChange={(e) => updateSelectedShapes({ alpha: Number(e.target.value) })}
                                    className="w-full h-1.5 bg-[#1a1a1f] rounded-lg appearance-none cursor-pointer accent-[#ff3366]"
                                />
                            </div>

                            {/* Rotation */}
                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                                        <RotateCw size={12} /> Rotation
                                    </label>
                                    <span className="text-xs text-gray-400 font-mono">{selectedShapes[0].rotation}°</span>
                                </div>
                                <input
                                    type="range"
                                    min="0" max="360" step="0.1"
                                    value={selectedShapes[0].rotation}
                                    onMouseDown={handleGroupRotationStart}
                                    onChange={(e) => handleGroupRotationChange(Number(e.target.value))}
                                    onKeyDown={(e) => handleRotationKeyDown(e, selectedShapes[0].rotation, handleGroupRotationChange)}
                                    className="w-full h-1.5 bg-[#1a1a1f] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                            </div>
                        </div>

                        {/* Group Outline Style */}
                        {selectedShapes.some(s => s.groupId) && (
                            <div className="space-y-5 pt-4 border-t border-white/5">
                                <label className="text-xs font-bold text-indigo-400 uppercase tracking-tighter flex items-center gap-2">
                                    <Link size={12} /> Group Silhouette Outline
                                </label>

                                {/* Thickness */}
                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest cursor-pointer">Thickness</label>
                                        <span className="text-xs text-gray-400 font-mono">{selectedShapes[0].groupStrokeThickness || 0}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="20" step="1"
                                        value={selectedShapes[0].groupStrokeThickness || 0}
                                        onMouseDown={() => saveHistory()}
                                        onChange={(e) => updateSelectedShapes({ groupStrokeThickness: Number(e.target.value) })}
                                        className="w-full h-1.5 bg-[#1a1a1f] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>

                                {/* Color */}
                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={selectedShapes[0].groupStrokeColor || '#ffffff'}
                                            onMouseDown={() => saveHistory()}
                                            onChange={(e) => updateSelectedShapes({ groupStrokeColor: e.target.value })}
                                            className="w-10 h-10 p-0 bg-transparent border-0 cursor-pointer overflow-hidden rounded-md"
                                        />
                                        <input
                                            type="text"
                                            value={selectedShapes[0].groupStrokeColor || '#ffffff'}
                                            onChange={(e) => updateSelectedShapes({ groupStrokeColor: e.target.value })}
                                            className="flex-1 bg-[#1a1a1f] border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-white focus:border-indigo-500 outline-none uppercase"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

                        <div className="grid grid-cols-1 gap-2 pt-4 border-t border-white/5">
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

                        <div className="grid grid-cols-2 gap-2 mt-2">
                            <button
                                onClick={groupSelectedShapes}
                                disabled={selectedShapes.length < 2}
                                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-indigo-500/10 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/20 transition-all text-[11px] font-bold disabled:opacity-30"
                            >
                                <Link size={14} /> Group
                            </button>
                            <button
                                onClick={ungroupSelectedShapes}
                                disabled={!selectedShapes.some(s => s.groupId)}
                                className="flex items-center justify-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-all text-[11px] font-bold disabled:opacity-30"
                            >
                                <Link2Off size={14} /> Ungroup
                            </button>
                        </div>
                    </div>
                ) : target && (
                    <div className="space-y-5">
                        {/* Name */}
                        <div className="space-y-2">
                            <label htmlFor="layer-name" className="text-xs font-bold text-gray-600 uppercase tracking-tighter flex items-center gap-2 cursor-pointer">
                                <Hash size={12} /> Layer Name
                            </label>
                            <input
                                id="layer-name"
                                name="layer-name"
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
                                    <label htmlFor="pos-x" className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-mono cursor-pointer">X</label>
                                    <input
                                        id="pos-x"
                                        name="pos-x"
                                        type="text"
                                        value={tempX}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setTempX(val);
                                            if (val !== "" && val !== "-" && !isNaN(Number(val))) {
                                                updateSelectedShapes({ x: Number(val) });
                                            }
                                        }}
                                        onBlur={() => {
                                            if (tempX === "" || tempX === "-") {
                                                updateSelectedShapes({ x: 0 });
                                                setTempX("0");
                                            }
                                        }}
                                        className="w-full bg-[#1a1a1f] border border-white/10 rounded-lg pl-6 pr-2 py-2 text-xs font-mono text-cyan-400 focus:border-cyan-500/50 outline-none"
                                    />
                                </div>
                                <div className="relative">
                                    <label htmlFor="pos-y" className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-mono cursor-pointer">Y</label>
                                    <input
                                        id="pos-y"
                                        name="pos-y"
                                        type="text"
                                        value={tempY}
                                        onChange={(e) => {
                                            const val = e.target.value;
                                            setTempY(val);
                                            if (val !== "" && val !== "-" && !isNaN(Number(val))) {
                                                updateSelectedShapes({ y: Number(val) });
                                            }
                                        }}
                                        onBlur={() => {
                                            if (tempY === "" || tempY === "-") {
                                                updateSelectedShapes({ y: 0 });
                                                setTempY("0");
                                            }
                                        }}
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
                                        <label htmlFor="radius" className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-mono cursor-pointer uppercase">Radius</label>
                                        <input
                                            id="radius"
                                            name="radius"
                                            type="number"
                                            value={target.radius || 25}
                                            onChange={(e) => updateSelectedShapes({ radius: Number(e.target.value) })}
                                            className="w-full bg-[#1a1a1f] border border-white/10 rounded-lg pl-16 pr-2 py-2 text-xs font-mono text-green-400 focus:border-green-500/50 outline-none"
                                        />
                                    </div>
                                ) : (
                                    <>
                                        <div className="relative">
                                            <label htmlFor="dim-w" className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-mono cursor-pointer">W</label>
                                            <input
                                                id="dim-w"
                                                name="dim-w"
                                                type="number"
                                                value={target.width}
                                                onChange={(e) => updateSelectedShapes({ width: Number(e.target.value) })}
                                                className="w-full bg-[#1a1a1f] border border-white/10 rounded-lg pl-7 pr-2 py-2 text-xs font-mono text-green-400 focus:border-green-500/50 outline-none"
                                            />
                                        </div>
                                        <div className="relative">
                                            <label htmlFor="dim-h" className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-gray-600 font-mono cursor-pointer">H</label>
                                            <input
                                                id="dim-h"
                                                name="dim-h"
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
                                            <label htmlFor="corner-radius" className="text-[10px] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                                                <Maximize size={10} /> Corner Radius
                                            </label>
                                            <span className="text-xs text-gray-400 font-mono">{target.cornerRadius || 0}px</span>
                                        </div>
                                        <input
                                            id="corner-radius"
                                            name="corner-radius"
                                            type="range"
                                            min="0" max={Math.min(target.width, target.height) / 2} step="1"
                                            value={target.cornerRadius || 0}
                                            onMouseDown={() => saveHistory()}
                                            onChange={(e) => updateSelectedShapes({ cornerRadius: Number(e.target.value) })}
                                            className="w-full h-1.5 bg-[#1a1a1f] rounded-lg appearance-none cursor-pointer accent-green-500"
                                        />
                                    </div>
                                )}

                                {target.type === 'trapezoid' && (
                                    <>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label htmlFor="angle-left" className="text-[10px] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                                                    <Sliders size={10} /> Left Angle
                                                </label>
                                                <span className="text-xs text-gray-400 font-mono">{target.angleLeft || 60}°</span>
                                            </div>
                                            <input
                                                id="angle-left"
                                                name="angle-left"
                                                type="range"
                                                min="1" max="89" step="1"
                                                value={target.angleLeft || 60}
                                                onMouseDown={() => saveHistory()}
                                                onChange={(e) => updateSelectedShapes({ angleLeft: Number(e.target.value) })}
                                                className="w-full h-1.5 bg-[#1a1a1f] rounded-lg appearance-none cursor-pointer accent-green-500"
                                            />
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <label htmlFor="angle-right" className="text-[10px] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                                                    <Sliders size={10} /> Right Angle
                                                </label>
                                                <span className="text-xs text-gray-400 font-mono">{target.angleRight || 60}°</span>
                                            </div>
                                            <input
                                                id="angle-right"
                                                name="angle-right"
                                                type="range"
                                                min="1" max="89" step="1"
                                                value={target.angleRight || 60}
                                                onMouseDown={() => saveHistory()}
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
                                <label htmlFor="color-hex" className="text-xs font-bold text-gray-600 uppercase tracking-tighter flex items-center gap-2 cursor-pointer">
                                    <Palette size={12} /> Style
                                </label>
                                <div className="flex gap-2">
                                    <input
                                        id="color-picker"
                                        name="color-picker"
                                        type="color"
                                        value={target.color}
                                        onMouseDown={() => saveHistory()}
                                        onChange={(e) => updateSelectedShapes({ color: e.target.value })}
                                        className="w-10 h-10 p-0 bg-transparent border-0 cursor-pointer overflow-hidden rounded-md"
                                    />
                                    <input
                                        id="color-hex"
                                        name="color-hex"
                                        type="text"
                                        value={target.color}
                                        onChange={(e) => updateSelectedShapes({ color: e.target.value })}
                                        className="flex-1 bg-[#1a1a1f] border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-white focus:border-[#ff3366] outline-none uppercase"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="opacity" className="text-xs font-bold text-gray-600 uppercase tracking-tighter cursor-pointer">Opacity</label>
                                    <span className="text-xs text-gray-400 font-mono">{Math.round(target.alpha * 100)}%</span>
                                </div>
                                <input
                                    id="opacity"
                                    name="opacity"
                                    type="range"
                                    min="0" max="1" step="0.01"
                                    value={target.alpha}
                                    onMouseDown={() => saveHistory()}
                                    onChange={(e) => updateSelectedShapes({ alpha: Number(e.target.value) })}
                                    className="w-full h-1.5 bg-[#1a1a1f] rounded-lg appearance-none cursor-pointer accent-[#ff3366]"
                                />
                            </div>

                            <div className="space-y-2">
                                <div className="flex justify-between items-center">
                                    <label htmlFor="rotation" className="text-xs font-bold text-gray-600 uppercase tracking-tighter flex items-center gap-2 cursor-pointer">
                                        <RotateCw size={12} /> Rotation
                                    </label>
                                    <span className="text-xs text-gray-400 font-mono">{target.rotation}°</span>
                                </div>
                                <input
                                    id="rotation"
                                    name="rotation"
                                    type="range"
                                    min="0" max="360" step="0.1"
                                    value={target.rotation}
                                    onMouseDown={() => saveHistory()}
                                    onChange={(e) => {
                                        const snapped = snapRotation(Number(e.target.value));
                                        updateSelectedShapes({ rotation: snapped });
                                    }}
                                    onKeyDown={(e) => handleRotationKeyDown(e, target.rotation, (val) => updateSelectedShapes({ rotation: val }))}
                                    className="w-full h-1.5 bg-[#1a1a1f] rounded-lg appearance-none cursor-pointer accent-cyan-500"
                                />
                            </div>
                        </div>

                        {/* Group Outline Style (Single Select Group Edge Case) */}
                        {target.groupId && (
                            <div className="space-y-5 pt-4 border-t border-white/5">
                                <label className="text-xs font-bold text-indigo-400 uppercase tracking-tighter flex items-center gap-2">
                                    <Link size={12} /> Group Silhouette Outline
                                </label>

                                <div className="space-y-2">
                                    <div className="flex justify-between items-center">
                                        <label className="text-[10px] font-bold text-gray-700 uppercase tracking-widest cursor-pointer">Thickness</label>
                                        <span className="text-xs text-gray-400 font-mono">{target.groupStrokeThickness || 0}px</span>
                                    </div>
                                    <input
                                        type="range"
                                        min="0" max="20" step="1"
                                        value={target.groupStrokeThickness || 0}
                                        onMouseDown={() => saveHistory()}
                                        onChange={(e) => updateSelectedShapes({ groupStrokeThickness: Number(e.target.value) })}
                                        className="w-full h-1.5 bg-[#1a1a1f] rounded-lg appearance-none cursor-pointer accent-indigo-500"
                                    />
                                </div>

                                <div className="space-y-2">
                                    <div className="flex gap-2">
                                        <input
                                            type="color"
                                            value={target.groupStrokeColor || '#ffffff'}
                                            onMouseDown={() => saveHistory()}
                                            onChange={(e) => updateSelectedShapes({ groupStrokeColor: e.target.value })}
                                            className="w-10 h-10 p-0 bg-transparent border-0 cursor-pointer overflow-hidden rounded-md"
                                        />
                                        <input
                                            type="text"
                                            value={target.groupStrokeColor || '#ffffff'}
                                            onChange={(e) => updateSelectedShapes({ groupStrokeColor: e.target.value })}
                                            className="flex-1 bg-[#1a1a1f] border border-white/10 rounded-lg px-3 py-2 text-[11px] font-mono text-white focus:border-indigo-500 outline-none uppercase"
                                        />
                                    </div>
                                </div>
                            </div>
                        )}

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
                                    <label htmlFor="depth" className="text-[10px] font-bold text-gray-700 uppercase tracking-widest flex items-center gap-2 cursor-pointer">
                                        <Sliders size={10} /> Rendering Depth
                                    </label>
                                    <input
                                        id="depth"
                                        name="depth"
                                        type="number"
                                        value={target.depth}
                                        onChange={(e) => updateSelectedShapes({ depth: Number(e.target.value) })}
                                        className="w-full bg-[#1a1a1f] border border-white/10 rounded-lg px-3 py-2 text-xs font-mono text-orange-400 focus:border-orange-500/50 outline-none"
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Actions */}
                        {target.groupId && (
                            <div className="pt-4 border-t border-white/5">
                                <button
                                    onClick={ungroupSelectedShapes}
                                    className="w-full flex items-center justify-center gap-2 p-2 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 hover:bg-orange-500/20 transition-all text-[11px] font-bold"
                                >
                                    <Link2Off size={12} /> Ungroup This Group
                                </button>
                            </div>
                        )}
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
