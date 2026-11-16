// Define o ícone/nome do .exe com rcedit (evita o winCodeSign, que exige privilégio de symlink no Windows).
const path = require('path');
const fs = require('fs');
const { execFileSync } = require('child_process');
const root = path.join(__dirname, '..');
const exe = path.join(root, 'release', 'win-unpacked', 'GVITOR SYSTEM.exe');
const ico = path.join(root, 'build', 'icon.ico');
const rcedit = require.resolve('rcedit/bin/rcedit-x64.exe');
if (!fs.existsSync(exe)) { console.error('exe não encontrado: ' + exe); process.exit(1); }
execFileSync(rcedit, [exe, '--set-icon', ico, '--set-version-string', 'ProductName', 'GVITOR SYSTEM', '--set-version-string', 'FileDescription', 'GVITOR SYSTEM'], { stdio: 'inherit' });
console.log('ícone aplicado em', exe);
