<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# GVITOR SYSTEM

Sistema de gestão pessoal para profissionais criativos: clientes, tarefas, finanças, orçamentos, portfólio e metas.

## Stack

- **React 19 + TypeScript** (Vite)
- **Tailwind CSS 4**
- **Supabase** (PostgreSQL + Auth + RLS)
- **Recharts**, **framer-motion**, **lucide-react**

## Rodar localmente

**Pré-requisitos:** Node.js 20+

1. Instalar dependências:
   `npm install`
2. Configurar variáveis de ambiente em `.env.local`:
   - `VITE_SUPABASE_URL` — URL do projeto Supabase
   - `VITE_SUPABASE_ANON_KEY` — chave anônima (pública) do projeto
3. Rodar o app:
   `npm run dev`

Build de produção: `npm run build` (gera em `dist/`).

## Banco de dados

O schema completo está em [`schema.sql`](schema.sql). Todas as tabelas usam **Row Level Security** com isolamento estrito por `user_id` (cada usuário só enxerga e altera os próprios dados).

Para aplicar via Supabase CLI:

```bash
supabase db push
```

> **Atenção:** nunca crie policies que liberem o role `anon` ou usem UUID de fallback. Isso expõe todos os dados publicamente.

## Deploy

Hospedado na **Vercel** (build: `npm run build`, output: `dist`).

## Estrutura

```
src/
  features/        # módulos por área (dashboard, clients, finance, ...)
  components/      # componentes compartilhados
  lib/             # cliente Supabase e utilitários
  app/             # rotas e layout
supabase/
  migrations/      # migrations SQL versionadas
```
