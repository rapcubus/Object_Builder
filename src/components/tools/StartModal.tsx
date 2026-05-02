import React, { useState } from 'react';
import { useEditorStore } from '../../stores/editorStore';
import { Rocket, FolderOpen, Zap, Sparkles } from 'lucide-react';

const StartModal: React.FC = () => {
  const { isInitialized, setInitialized, setProjectName, projectName } = useEditorStore();
  const [localName, setLocalName] = useState(projectName);

  if (isInitialized) return null;

  const handleStart = () => {
    setProjectName(localName || "Untitled_Object");
    setInitialized(true);
  };

  const handleOpenJson = async () => {
    try {
      // File System Access API 지원 여부 확인
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
          useEditorStore.getState().setInitialized(true);
        }
      } else {
        // Fallback for older browsers
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
                useEditorStore.getState().setInitialized(true);
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
        console.error("Failed to open file", err);
        alert("Failed to open file");
      }
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#0a0a0f]/80 backdrop-blur-md">
      <div className="w-full max-w-md bg-[#1a1a1f] border border-white/10 rounded-2xl p-8 shadow-2xl animate-in zoom-in-95 duration-300">
        <div className="flex flex-col items-center text-center mb-8">
            <div className="p-4 bg-[#ff3366]/10 rounded-2xl mb-4 border border-[#ff3366]/20">
                <Sparkles size={32} className="text-[#ff3366]" />
            </div>
            <h1 className="text-2xl font-black text-white tracking-widest mb-1">OBJECT BUILDER</h1>
            <div className="text-xs font-bold text-[#ff3366] uppercase tracking-[0.3em]">Next-Gen Editor</div>
        </div>

        <div className="space-y-4">
            <button 
                onClick={handleStart}
                className="w-full flex items-center justify-center gap-4 py-6 rounded-2xl bg-[#ff3366] text-white font-black text-sm hover:bg-[#ff3366]/90 transition-all shadow-xl shadow-[#ff3366]/20 group"
            >
                <div className="p-2 bg-white/20 rounded-lg group-hover:scale-110 transition-transform">
                    <Rocket size={20} />
                </div>
                <div className="flex flex-col items-start">
                    <span>START NEW PROJECT</span>
                    <span className="text-[10px] font-medium opacity-60">새 프로젝트 시작하기</span>
                </div>
            </button>
            
            <button 
                onClick={handleOpenJson}
                className="w-full flex items-center justify-center gap-4 py-6 rounded-2xl bg-white/5 border border-white/10 text-gray-300 hover:bg-white/10 hover:text-white transition-all text-sm font-bold group"
            >
                <div className="p-2 bg-white/5 rounded-lg group-hover:scale-110 transition-transform">
                    <FolderOpen size={20} />
                </div>
                <div className="flex flex-col items-start">
                    <span>OPEN JSON FILE</span>
                    <span className="text-[10px] font-medium opacity-60">기존 파일 불러오기</span>
                </div>
            </button>
        </div>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
            <p className="text-xs text-white/40 mb-2 italic tracking-tight">© 2026 RAPCUBUS LAB. ALL RIGHTS RESERVED.</p>
        </div>
      </div>
    </div>
  );
};

export default StartModal;
