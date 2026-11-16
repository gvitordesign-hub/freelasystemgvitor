// Copia o build web (../dist) para ./app, que é o que o app de Windows empacota.
const fs = require('fs');
const path = require('path');
const src = path.join(__dirname, '..', '..', 'dist');
const dst = path.join(__dirname, '..', 'app');

function copyDir(from, to) {
  fs.mkdirSync(to, { recursive: true });
  for (const entry of fs.readdirSync(from, { withFileTypes: true })) {
    const a = path.join(from, entry.name);
    const b = path.join(to, entry.name);
    if (entry.isDirectory()) copyDir(a, b);
    else fs.copyFileSync(a, b);
  }
}

if (!fs.existsSync(path.join(src, 'index.html'))) {
  console.error('dist/ não encontrado. Rode "npm run build" na raiz do projeto antes (com o .env.local do Supabase).');
  process.exit(1);
}
fs.rmSync(dst, { recursive: true, force: true });
copyDir(src, dst);
console.log('app/ atualizado a partir de dist/');
