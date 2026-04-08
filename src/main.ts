import Phaser from 'phaser';
import ObjectBuilderScene from './ObjectBuilderScene';

/**
 * 오브젝트 빌더 전용 독립 실행 설정
 */
const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.AUTO,
  width: window.innerWidth,
  height: window.innerHeight,
  parent: 'game-container',
  backgroundColor: '#111111',
  scale: {
    mode: Phaser.Scale.EXPAND, // 리사이즈에 유연하게 대응하기 위해 EXPAND 모드 유지
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: [ObjectBuilderScene] // 빌더 씬만 단독 실행
};

// 빌더 인스턴스 초기화
new Phaser.Game(config);

// 전역 접근을 위한 (window.game) 설정
(window as any).game = config; // 실제 인스턴스는 new Phaser.Game() 리턴값이지만 여기서는 설정 참조용 
