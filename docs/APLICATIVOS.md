# Aplicativos nativos do GVITOR SYSTEM

Os apps são um "casco" que **abre o sistema publicado na VPS** (`https://sistema.gvitor.com.br`).
Por isso **não precisam ser refeitos a cada atualização**: atualizou o site na VPS
(`cd ~/gvitor-system && git pull && docker compose up -d --build`), o app já abre a versão nova.
Os dados continuam no Supabase; precisa de internet (sem internet aparece a tela "Sem conexão").
O login de cada app é independente do navegador (entre uma vez em cada).

> Só é preciso gerar o app de novo se mudar: ícone, nome, permissões do aplicativo ou o **endereço do site**
> (alterar em `desktop/main.cjs`, `mobile/capacitor.config.json` e nos dois `offline.html`/`webapp`).

## Android (Capacitor) — pasta `mobile/`
Não precisa instalar Android Studio nem configurar secrets: o APK é gerado no GitHub.
1. GitHub > Actions > "Gerar APK Android" > Run workflow.
2. Ao terminar, baixe o artefato `GVITOR-SYSTEM-apk` (zip com `app-debug.apk`) e instale no celular
   (permita "instalar apps de fontes desconhecidas"). Se já tiver a versão antiga instalada, ela é atualizada por cima.

## Windows (Electron) — pasta `desktop/`
```bash
cd desktop
npm install          # só na primeira vez
npm run dist
```
Saída em `desktop/release/`:
- `GVITOR-SYSTEM-Instalador-1.0.0.exe` — instala com atalho na área de trabalho e no menu Iniciar.
- `GVITOR-SYSTEM-Portatil-1.0.0.exe` — abre direto, sem instalar.

Testar sem gerar instalador: `cd desktop && npm start`.
O Windows pode mostrar o aviso "SmartScreen" porque o app não é assinado: "Mais informações > Executar assim mesmo".
