import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';

// ES Module에서 __dirname 설정
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// package.json에서 버전 정보 읽기
const packageJsonPath = path.resolve(__dirname, '../package.json');
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'));
const version = packageJson.version;

const distPath = path.resolve(__dirname, '../dist');
const itchDir = path.resolve(__dirname, '../Itch');
const zipFileName = `Object_Builder_${version}.zip`;
const zipFilePath = path.join(itchDir, zipFileName);

console.log(`📦 Packaging for Itch.io (Version: ${version})...`);

// Itch 폴더 생성
if (!fs.existsSync(itchDir)) {
    fs.mkdirSync(itchDir);
    console.log('✅ Created Itch directory.');
}

try {
    // PowerShell을 사용하여 dist 폴더 압축
    // -Path "dist\*" 를 사용하여 dist 폴더 내부의 파일들만 압축되도록 함
    // -Force 옵션으로 기존 파일 덮어쓰기
    const command = `powershell -Command "Compress-Archive -Path '${distPath}\\*' -DestinationPath '${zipFilePath}' -Force"`;
    
    console.log(`🚀 Zipping dist contents to ${zipFileName}...`);
    execSync(command, { stdio: 'inherit' });
    
    console.log(`✨ Successfully created: ${zipFilePath}`);
} catch (error) {
    console.error('❌ Failed to create zip file:', error.message);
    process.exit(1);
}
