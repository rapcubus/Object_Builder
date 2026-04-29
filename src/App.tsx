import React from 'react';
import { HashRouter as Router, Routes, Route } from 'react-router-dom';
import Sidebar from './components/tools/Sidebar';
import Inspector from './components/tools/Inspector';
import Toolbar from './components/tools/Toolbar';
import PhaserCanvas from './components/tools/PhaserCanvas';
import ZoomControls from './components/tools/ZoomControls';
import StartModal from './components/tools/StartModal';

const EditorLayout: React.FC = () => {
  return (
    <div className="flex flex-col h-screen overflow-hidden select-none relative">
      <StartModal />
      <Toolbar />
      <div className="flex flex-1 overflow-hidden relative">
        <Sidebar />
        
        <main className="flex-1 relative bg-[#1a1a1f] overflow-hidden">
          <PhaserCanvas />
          <ZoomControls />
          
          {/* Overlay Grid Info */}
          <div className="absolute top-4 left-4 pointer-events-none">
            <div className="bg-black/40 backdrop-blur-sm px-3 py-1.5 rounded border border-white/5 text-xs font-mono text-gray-500 uppercase tracking-widest">
              Grid: 20px / 100px
            </div>
          </div>
        </main>

        <Inspector />
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen bg-[#1a1a1f] text-white font-sans">
        <Routes>
          <Route path="/" element={<EditorLayout />} />
        </Routes>
      </div>
    </Router>
  );
};

export default App;
