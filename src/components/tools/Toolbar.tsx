import React from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { 
  Save, 
  FolderOpen, 
  Undo2, 
  Settings,
  Edit3
} from 'lucide-react';

const Toolbar: React.FC = () => {
  const { projectName, setProjectName, undo, undoStack, shapes, fileHandle, setFileHandle } = useEditorStore();

  const handleOpen = async () => {
    try {
      if ('showOpenFilePicker' in window) {
        const [handle] = await (window as any).showOpenFilePicker({
          types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }],
          multiple: false
        });
        const file = await handle.getFile();
        const content = JSON.parse(await file.text());
        
        if (content.shapes) {
          useEditorStore.getState().setShapes(content.shapes);
          useEditorStore.getState().setProjectName(content.projectName || file.name.replace('.json', ''));
          useEditorStore.getState().setFileHandle(handle);
        }
      } else {
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
                useEditorStore.getState().setProjectName(content.projectName || file.name.replace('.json', ''));
              }
            } catch (err) {
              console.error("Failed to parse JSON", err);
              alert("Invalid JSON file");
            }
          };
          reader.readAsText(file);
        };
        input.click();
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error("Open failed", err);
      }
    }
  };

  const handleSave = async () => {
    // 확장자가 없는 경우 붙여주기
    const fileName = projectName.toLowerCase().endsWith('.json') 
      ? projectName 
      : `${projectName}.json`;

    const data = JSON.stringify({ projectName, shapes }, null, 2);

    try {
      if (fileHandle) {
        // 기존 파일이 있는 경우 덮어쓰기 확인
        if (window.confirm(`기존 파일에 덮어씌우시겠습니까?`)) {
          const writable = await fileHandle.createWritable();
          await writable.write(data);
          await writable.close();
          alert('저장되었습니다.');
        }
      } else {
        // 새 프로젝트인 경우 파일 저장 창 열기
        if ('showSaveFilePicker' in window) {
          const handle = await (window as any).showSaveFilePicker({
            suggestedName: fileName,
            types: [{ description: 'JSON Files', accept: { 'application/json': ['.json'] } }]
          });
          const writable = await handle.createWritable();
          await writable.write(data);
          await writable.close();
          setFileHandle(handle);
          alert('저장되었습니다.');
        } else {
          // Fallback: Download
          const blob = new Blob([data], { type: 'application/json' });
          const url = URL.createObjectURL(blob);
          const a = document.createElement('a');
          a.href = url;
          a.download = fileName;
          a.click();
          URL.revokeObjectURL(url);
        }
      }
    } catch (err) {
      if ((err as Error).name !== 'AbortError') {
        console.error("Save failed", err);
        alert("저장에 실패했습니다.");
      }
    }
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
            <button 
                onClick={handleSave}
                className="flex items-center gap-2 px-4 py-2 rounded-lg bg-[#1a1a1f] border border-white/5 text-gray-400 hover:bg-white/5 hover:text-white transition-all text-xs font-medium"
            >
                <Save size={16} /> Save
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
