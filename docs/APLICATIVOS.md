# Aplicativos nativos do GVITOR SYSTEM

Os apps são o mesmo sistema (React + Supabase) dentro de um "casco" nativo. Os dados continuam
no Supabase; precisa de internet. O login de cada app é independente (entre uma vez em cada).

## Windows (Electron) — pasta `desktop/`
Gerar os instaladores (na raiz do projeto, com o `.env.local` do Supabase presente):

```bash
npm run build
cd desktop
npm install          # só na primeira vez
npm run dist
```

Saída em `desktop/release/`:
- `GVITOR-SYSTEM-Instalador-1.0.0.exe` — instala com atalho na área de trabalho e no menu Iniciar.
- `GVITOR-SYSTEM-Portatil-1.0.0.exe` — abre direto, sem instalar.

Testar sem gerar instalador: `npm run build` na raiz e depois `cd desktop && npm start`.
O Windows pode mostrar o aviso "SmartScreen" porque o app não é assinado: "Mais informações > Executar assim mesmo".

## Android (Capacitor) — pasta `mobile/`
Não precisa instalar Android Studio: o APK é gerado no GitHub.
1. No GitHub: Settings > Secrets and variables > Actions > crie `VITE_SUPABASE_URL` e `VITE_SUPABASE_ANON_KEY`
   (os mesmos valores do `.env.local`).
2. Actions > "Gerar APK Android" > Run workflow.
3. Ao terminar, baixe o artefato `GVITOR-SYSTEM-apk` (zip com `app-debug.apk`) e instale no celular
   (permita "instalar apps de fontes desconhecidas" para o navegador/arquivos).

Para gerar localmente (opcional) é preciso JDK 21 + Android SDK:
`npm run build && cd mobile && npm install && npm run sync && cd android && ./gradlew assembleDebug`.

## Atualizando os apps
Depois de mudanças no sistema: gere o build de novo (`npm run build`) e refaça o instalador do Windows /
rode o workflow do APK. A versão do site na VPS continua sendo atualizada com `git pull && docker compose up -d --build`.
