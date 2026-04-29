import React from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { 
  Save, 
  FolderOpen, 
  Undo2, 
  FileCode, 
  Settings,
  Edit3
} from 'lucide-react';

const Toolbar: React.FC = () => {
  const { projectName, setProjectName, undo, undoStack } = useEditorStore();

  const handleOpen = () => {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    input.onchange = (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const content = JSON.parse(event.target?.result as string);
          if (content.shapes) {
            useEditorStore.getState().setShapes(content.shapes);
            if (content.projectName) {
              useEditorStore.getState().setProjectName(content.projectName);
            }
          }
        } catch (err) {
          console.error("Failed to parse JSON", err);
          alert("Invalid JSON file");
        }
      };
      reader.readAsText(file);
    };
    input.click();
  };

  const handleExport = () => {
    // 임시 export 로직 (Zustand 스토어의 내용을 파일로 저장)
    alert('Export logic will be integrated soon.');
  };

  return (
    <div className="h-14 bg-[#0f0f14] border-b border-white/10 flex items-center justify-between px-6 shadow-lg z-20">
      {/* Project Info */}
      <div className="flex items-center gap-4">
        <div className="flex items-center gap-2 bg-[#1a1a1f] px-3 py-1.5 rounded-lg border border-white/5">
            <span className="text-xs text-gray-600 uppercase font-bold tracking-tighter">Project</span>
            <div className="flex items-center gap-2 group">
                <label htmlFor="project-name-header" className="sr-only">Project Name</label>
                <input 
                    id="project-name-header"
                    name="project-name-header"
                    type="text" 
                    value={projectName} 
                    onChange={(e) => setProjectName(e.target.value)}
                    className="bg-transparent border-none text-xs font-bold text-gray-200 outline-none w-32 focus:text-[#ff3366] transition-colors"
                />
                <Edit3 size={10} className="text-gray-700 group-hover:text-gray-500" />
            </div>
        </div>
      </div>

      {/* Main Actions */}
      <div className="flex items-center gap-2">
        <div className="flex items-center gap-1 bg-[#1a1a1f] p-1 rounded-xl border border-white/5 mr-4">
            <button 
                onClick={undo}
                disabled={undoStack.length === 0}
                className={`p-2 rounded-lg transition-all ${undoStack.length === 0 ? 'text-gray-800' : 'text-gray-400 hover:bg-white/5 hover:text-white'}`}
                title="Undo (Ctrl+Z)"
            >
                <Undo2 size={18} />
            </button>
        </div>

        <div className="flex items-center gap-2">
            <button 
                onClick={handleOpen}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1a1f] border border-white/5 text-gray-400 hover:bg-white/5 hover:text-white transition-all text-xs font-medium"
            >
                <FolderOpen size={16} /> Open
            </button>
            <button className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1a1f] border border-white/5 text-gray-400 hover:bg-white/5 hover:text-white transition-all text-xs font-medium">
                <Save size={16} /> Save
            </button>
            <div className="w-px h-4 bg-white/10 mx-1"></div>
            <button 
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#ff3366] text-white hover:bg-[#ff3366]/90 transition-all text-xs font-bold shadow-lg shadow-[#ff3366]/20"
            >
                <FileCode size={16} /> Export Code
            </button>
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-4">
        <button className="p-2 text-gray-600 hover:text-gray-400 transition-colors">
            <Settings size={18} />
        </button>
        <div className="flex items-center gap-3 pl-4 border-l border-white/10">
            <div className="text-right">
                <div className="text-xs font-bold text-gray-500 leading-none">RAPCUBUS</div>
                <div className="text-xs text-gray-700 tracking-widest">LABS</div>
            </div>
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#ff3366] to-[#ff0099] flex items-center justify-center font-black text-white text-xs">R</div>
        </div>
      </div>
    </div>
  );
};

export default Toolbar;
