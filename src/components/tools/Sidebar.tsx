import React from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { ShapeType } from '../../types/game';
import { 
  Square, 
  Circle, 
  Triangle, 
  Layers, 
  Plus, 
  Pentagon, 
  Hexagon, 
  Box,
  ChevronUp,
  ChevronDown,
  Trash2,
  GripVertical
} from 'lucide-react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';

const Sidebar: React.FC = () => {
  const { shapes, selectedShapeIds, addShape, selectShape, reorderShapes, deleteSelectedShapes } = useEditorStore();

  const handleMove = (e: React.MouseEvent, id: string, direction: 'up' | 'down') => {
    e.stopPropagation();
    const index = shapes.findIndex(s => s.id === id);
    if (direction === 'up' && index < shapes.length - 1) {
        reorderShapes(index, index + 1);
    } else if (direction === 'down' && index > 0) {
        reorderShapes(index, index - 1);
    }
  };

  const onDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    
    // 시각적 인덱스를 실제 shapes 배열 인덱스로 변환
    // (리스트는 reverse 되어 있으므로)
    const sourceIndex = shapes.length - 1 - result.source.index;
    const destinationIndex = shapes.length - 1 - result.destination.index;
    
    reorderShapes(sourceIndex, destinationIndex);
  };

  const shapeButtons: { type: ShapeType, label: string, icon: React.ReactNode }[] = [
    { type: 'rect', label: 'Rect', icon: <Square size={16} /> },
    { type: 'roundedRect', label: 'RoundR', icon: <Box size={16} /> },
    { type: 'circle', label: 'Circle', icon: <Circle size={16} /> },
    { type: 'triangle', label: 'Tri (Iso)', icon: <Triangle size={16} /> },
    { type: 'rightTriangle', label: 'Right T', icon: <Triangle size={16} className="rotate-90" /> },
    { type: 'mirroredRightTriangle', label: 'Mirrored T', icon: <Triangle size={16} className="-rotate-90" /> },
    { type: 'trapezoid', label: 'Trapez', icon: <Box size={16} className="skew-x-12" /> },
    { type: 'pentagon', label: 'Pent', icon: <Pentagon size={16} /> },
    { type: 'hexagon', label: 'Hex', icon: <Hexagon size={16} /> },
  ];

  return (
    <div className="w-72 bg-[#0f0f14] border-r border-white/10 flex flex-col h-full shadow-2xl z-10">
      {/* Header */}
      <div className="p-6 border-b border-white/5 bg-[#1a1a1f]/50">
        <h2 className="text-sm font-bold text-[#ff3366] tracking-[0.2em] mb-1">OBJECT BUILDER</h2>
        <div className="text-xs text-gray-500 uppercase tracking-widest flex items-center gap-2">
          <span>v1.0.0 Stable</span>
          <span className="w-1 h-1 rounded-full bg-green-500"></span>
        </div>
      </div>

      {/* Shape Addition */}
      <div className="p-4 space-y-3">
        <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-widest px-2">Add Shape</h3>
        <div className="grid grid-cols-2 gap-2">
          {shapeButtons.map((btn) => (
            <button
              key={btn.type}
              onClick={() => addShape(btn.type)}
              className="flex items-center gap-3 p-2.5 rounded-lg bg-[#1a1a1f] border border-white/5 hover:border-[#ff3366]/50 hover:bg-[#ff3366]/5 transition-all text-[11px] text-gray-300 group"
            >
              <span className="text-gray-500 group-hover:text-[#ff3366] transition-colors">
                {btn.icon}
              </span>
              {btn.label}
            </button>
          ))}
        </div>
      </div>

      {/* Layer List */}
      <div className="flex-1 overflow-hidden flex flex-col mt-4">
        <div className="px-6 py-2 flex items-center justify-between">
          <h3 className="text-xs font-semibold text-gray-600 uppercase tracking-widest flex items-center gap-2">
            <Layers size={12} /> Layers
          </h3>
          <span className="text-xs text-gray-700 font-mono">{shapes.length} items</span>
        </div>
        
        <div className="flex-1 overflow-y-auto px-4 py-2 space-y-1 custom-scrollbar">
          {shapes.length === 0 ? (
            <div className="py-12 text-center">
              <div className="text-gray-800 mb-2 flex justify-center"><Plus size={24} /></div>
              <p className="text-[11px] text-gray-700 italic">No layers yet</p>
            </div>
          ) : (
            <DragDropContext onDragEnd={onDragEnd}>
              <Droppable droppableId="layers">
                {(provided) => (
                  <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-1">
                    {[...shapes].reverse().map((shape, index) => {
                      const isSelected = selectedShapeIds.has(shape.id);
                      const originalIndex = shapes.length - 1 - index;

                      return (
                        <Draggable key={shape.id} draggableId={shape.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              onClick={(e) => selectShape(shape.id, e.shiftKey)}
                              className={`
                                group flex items-center justify-between p-3 rounded-lg cursor-pointer transition-all border
                                ${isSelected 
                                  ? 'bg-[#ff3366]/10 border-[#ff3366]/30 text-white' 
                                  : snapshot.isDragging ? 'bg-[#1a1a1f] border-[#ff3366]/20' : 'bg-white/[0.02] border-transparent text-gray-400 hover:bg-white/[0.05] hover:text-gray-200'
                                }
                              `}
                            >
                              <div className="flex items-center gap-2 flex-1 min-w-0">
                                <div className="text-gray-800 shrink-0">
                                  <GripVertical size={14} />
                                </div>
                                <div 
                                  className="w-2.5 h-2.5 rounded-full shrink-0" 
                                  style={{ backgroundColor: shape.color, opacity: shape.alpha }}
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className="text-[11px] font-bold text-white truncate">
                                    {shape.name || shape.type.toUpperCase()}
                                  </span>
                                  <span className="text-[9px] text-gray-500 font-mono truncate">
                                    {shape.id}
                                  </span>
                                </div>
                              </div>
                              
                              <div className="flex items-center gap-2 shrink-0 ml-2">
                                <div className="flex flex-col items-end">
                                  <span className="text-[9px] text-gray-500 uppercase font-bold tracking-tighter">Depth</span>
                                  <span className="text-[11px] text-[#ff3366] font-black font-mono">
                                    {shape.depth}
                                  </span>
                                </div>
                                <div className="flex flex-col">
                                  <button 
                                      onClick={(e) => handleMove(e, shape.id, 'up')}
                                      disabled={originalIndex === shapes.length - 1}
                                      className="p-0.5 hover:text-white disabled:opacity-20"
                                  >
                                      <ChevronUp size={12} />
                                  </button>
                                  <button 
                                      onClick={(e) => handleMove(e, shape.id, 'down')}
                                      disabled={originalIndex === 0}
                                      className="p-0.5 hover:text-white disabled:opacity-20"
                                  >
                                      <ChevronDown size={12} />
                                  </button>
                                </div>
                                <button 
                                  onClick={(e) => { 
                                    e.stopPropagation(); 
                                    if (selectedShapeIds.has(shape.id)) {
                                      deleteSelectedShapes();
                                    } else {
                                      const { deleteShape } = useEditorStore.getState();
                                      deleteShape(shape.id);
                                    }
                                  }}
                                  className="p-1.5 hover:bg-red-500/20 hover:text-red-500 rounded transition-colors"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </div>
                            </div>
                          )}
                        </Draggable>
                      );
                    })}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </DragDropContext>
          )}
        </div>
      </div>

      {/* Footer Info */}
      <div className="p-4 border-top border-white/5 bg-black/20">
        <div className="bg-[#1a1a1f] p-3 rounded-lg border border-white/5">
          <div className="text-xs text-gray-600 uppercase mb-1">Current Depth Range</div>
          <div className="text-xs text-gray-400 font-mono flex justify-between">
            <span>Min: 0</span>
            <span>Max: {shapes.length > 0 ? shapes.length - 1 : 0}</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
