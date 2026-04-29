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
      <div className="p-4 space-y-3 border-b border-white/5">
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
      <div className="flex-1 overflow-hidden flex flex-col">
        <div className="px-6 py-4 flex items-center justify-between border-b border-white/5 bg-black/10">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest flex items-center gap-2">
            <Layers size={14} /> Layers
          </h3>
          <span className="text-[10px] text-gray-600 font-mono font-bold">{shapes.length} OBJECTS</span>
        </div>
        
        <div className="flex-1 overflow-y-auto px-2 py-2 space-y-1 custom-scrollbar">
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
                                group flex items-center p-2 rounded-lg cursor-pointer transition-all border
                                ${isSelected 
                                  ? 'bg-[#ff3366]/10 border-[#ff3366]/30 shadow-lg shadow-[#ff3366]/5' 
                                  : snapshot.isDragging ? 'bg-[#1a1a1f] border-[#ff3366]/20' : 'bg-white/[0.02] border-transparent hover:bg-white/[0.05]'
                                }
                              `}
                            >
                              {/* Left: Info */}
                              <div className="flex items-center gap-3 flex-1 min-w-0">
                                <GripVertical size={14} className="text-gray-700 shrink-0" />
                                <div 
                                  className="w-3 h-3 rounded-full shrink-0 border border-white/10" 
                                  style={{ backgroundColor: shape.color, opacity: shape.alpha }}
                                />
                                <div className="flex flex-col min-w-0">
                                  <span className={`text-[11px] font-bold truncate ${isSelected ? 'text-white' : 'text-gray-300'}`}>
                                    {shape.name || shape.type.toUpperCase()}
                                  </span>
                                  <span className="text-[9px] text-gray-600 uppercase font-bold tracking-widest truncate">
                                    {shape.type}
                                  </span>
                                </div>
                              </div>
                              
                              {/* Right: Controls & Depth */}
                              <div className="flex items-center gap-3 shrink-0 ml-4">
                                <div className="flex flex-col items-end pr-2 border-r border-white/5">
                                  <span className="text-[8px] text-gray-600 uppercase font-black tracking-tighter">Depth</span>
                                  <span className="text-[12px] text-[#ff3366] font-black font-mono leading-none mt-0.5">
                                    {shape.depth}
                                  </span>
                                </div>
                                
                                <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                                  <button 
                                      onClick={(e) => handleMove(e, shape.id, 'up')}
                                      disabled={originalIndex === shapes.length - 1}
                                      className="p-0.5 text-gray-500 hover:text-white disabled:opacity-10"
                                  >
                                      <ChevronUp size={12} />
                                  </button>
                                  <button 
                                      onClick={(e) => handleMove(e, shape.id, 'down')}
                                      disabled={originalIndex === 0}
                                      className="p-0.5 text-gray-500 hover:text-white disabled:opacity-10"
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
                                  className="p-2 text-gray-600 hover:bg-red-500/20 hover:text-red-500 rounded-lg transition-all"
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
      <div className="p-4 border-t border-white/5 bg-black/30">
        <div className="bg-[#1a1a1f] p-3 rounded-xl border border-white/5">
          <div className="text-[10px] text-gray-600 uppercase font-bold mb-1.5 tracking-widest">Stack Range</div>
          <div className="text-xs text-gray-400 font-mono flex justify-between items-center">
            <div className="flex flex-col">
              <span className="text-[8px] text-gray-700 uppercase">Min</span>
              <span>0</span>
            </div>
            <div className="w-8 h-px bg-white/5"></div>
            <div className="flex flex-col items-end">
              <span className="text-[8px] text-gray-700 uppercase">Max</span>
              <span>{shapes.length > 0 ? shapes.length - 1 : 0}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Sidebar;
