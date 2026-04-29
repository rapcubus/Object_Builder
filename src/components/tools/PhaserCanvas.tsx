import React, { useEffect, useRef } from 'react';
import Phaser from 'phaser';
import ObjectBuilderScene from '../../tools/ObjectBuilder/ObjectBuilderScene';

interface PhaserCanvasProps {
  className?: string;
}

const PhaserCanvas: React.FC<PhaserCanvasProps> = ({ className }) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const gameRef = useRef<Phaser.Game | null>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const config: Phaser.Types.Core.GameConfig = {
      type: Phaser.AUTO,
      width: '100%',
      height: '100%',
      parent: containerRef.current,
      backgroundColor: '#1a1a1f',
      scene: [ObjectBuilderScene],
      scale: {
        mode: Phaser.Scale.RESIZE,
        autoCenter: Phaser.Scale.CENTER_BOTH
      }
    };

    const game = new Phaser.Game(config);
    gameRef.current = game;
    (window as any).phaserGame = game;

    return () => {
      game.destroy(true);
      gameRef.current = null;
      (window as any).phaserGame = null;
    };
  }, []);

  return (
    <div 
      ref={containerRef} 
      className={`w-full h-full relative overflow-hidden ${className}`}
    />
  );
};

export default PhaserCanvas;
