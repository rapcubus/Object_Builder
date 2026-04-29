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

  const handleOpenJson = () => {
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

        <div className="space-y-6">
            <div className="space-y-2">
                <label className="text-xs font-bold text-gray-600 uppercase tracking-widest px-1">Project Name</label>
                <input 
                    type="text" 
                    placeholder="Input Object Name..."
                    value={localName}
                    onChange={(e) => setLocalName(e.target.value)}
                    className="w-full bg-black/40 border border-white/10 rounded-xl px-4 py-3.5 text-white focus:border-[#ff3366] focus:ring-1 focus:ring-[#ff3366]/20 outline-none transition-all"
                />
            </div>

            <div className="space-y-3 pt-4">
                <button 
                    onClick={handleStart}
                    className="w-full flex items-center justify-center gap-3 py-4 rounded-xl bg-[#ff3366] text-white font-bold text-xs hover:bg-[#ff3366]/90 transition-all shadow-xl shadow-[#ff3366]/20"
                >
                    <Rocket size={18} /> CREATE NEW OBJECT
                </button>
                
                <div className="flex items-center gap-3 py-2">
                    <div className="flex-1 h-px bg-white/5"></div>
                    <span className="text-xs text-gray-700 font-bold uppercase tracking-widest">OR</span>
                    <div className="flex-1 h-px bg-white/5"></div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    <button 
                        onClick={handleOpenJson}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-white/10 text-gray-400 hover:bg-white/10 hover:text-white transition-all text-xs font-medium"
                    >
                        <FolderOpen size={16} /> Open JSON
                    </button>
                    <button 
                        onClick={handleStart}
                        className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white/5 border border-[#ff3366]/30 text-[#ff3366] hover:bg-[#ff3366]/5 transition-all text-xs font-bold"
                    >
                        <Zap size={16} /> Just Start
                    </button>
                </div>
            </div>
        </div>

        <div className="mt-8 text-center border-t border-white/5 pt-6">
            <p className="text-xs text-white/40 mb-2 italic tracking-tight">© 2026 RAPCUBUS LAB. ALL RIGHTS RESERVED.</p>
        </div>
      </div>
    </div>
  );
};

export default StartModal;
