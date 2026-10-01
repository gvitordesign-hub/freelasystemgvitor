# Implementação do Assistente de IA Freela System (OpenRouter + Skills + Memória + RAG)

> **Goal:** Integrar um assistente de IA com OpenRouter no Freela System, operando como coach motivacional proativo no Dashboard e copiloto flutuante (Drawer) em todo o sistema, com memória persistente de hábitos, base de conhecimento (RAG) e execução de ações no CRM (tarefas, notas, clientes e lembretes).
>
> **Architecture:** Arquitetura desacoplada onde um serviço em `src/services/ai/` orquestra chamadas OpenRouter (com Tool Calling), gerenciamento de memórias (`ai_user_memories`) e vetores RAG (`ai_knowledge_embeddings`) via Supabase. A UI conta com um Hero AI Card no `CommandCenter` e um Floating AI Drawer global acessível via `Ctrl + Space`.
>
> **Tech Stack:** React 18, TypeScript, TailwindCSS, Supabase (PostgreSQL + pgvector), OpenRouter API (Claude 3.5 Sonnet / GPT-4o / DeepSeek).

---

## Estrutura de Arquivos Criados e Modificados

```
src/
├── types/
│   └── ai.ts                     # Interfaces (AiConfig, Message, ToolCall, Memory, KnowledgeDoc)
├── services/
│   └── ai/
│       ├── openrouter.ts         # Cliente de API OpenRouter com streaming e Tool Calling
│       ├── tools.ts              # Catálogo de ferramentas CRM (tasks, invoices, reminders, clients)
│       ├── memory.ts             # Extração e recuperação de memórias do usuário no Supabase
│       ├── rag.ts                # Geração de embeddings e busca por similaridade semântica
│       └── systemPrompt.ts       # Montagem dinâmica do prompt com motivação, dados e memórias
├── components/
│   └── ai/
│       ├── AiHeroWidget.tsx      # Widget de motivação e chat rápido no topo do Dashboard
│       ├── AiFloatingDrawer.tsx  # Gaveta lateral flutuante global com histórico e tools
│       └── AiSettingsTab.tsx     # Aba em Configurações para chave OpenRouter, modelo e memórias
├── features/
│   ├── dashboard/
│   │   ├── CommandCenter.tsx     # Inclusão do AiHeroWidget
│   │   └── DashboardPage.tsx     # Inclusão do AiFloatingDrawer global
│   └── settings/
│       └── SettingsView.tsx      # Inclusão da aba de IA
└── lib/
    └── database.ts               # Módulos db.ai (config, messages, memories, knowledge)
```

---

## Tarefas de Implementação

### Tarefa 1: Definição de Tipos e Esquema de Banco de Dados
**Arquivos:**
- Criar: `src/types/ai.ts`
- Modificar: `src/types.ts`
- Criar: `supabase/migrations/20261001_ai_assistant_tables.sql`

**O que fazer:**
1. Criar interfaces para `AiConfig` (apiKey, model, systemPromptAddon, temperature).
2. Criar interfaces para `AiMessage`, `AiMemoryFact`, `AiKnowledgeItem`, `AiToolDefinition`.
3. Criar script SQL para tabelas Supabase com RLS:
   - `ai_user_configs` (user_id PK, openrouter_key, model, assistant_name)
   - `ai_messages` (id, user_id, role, content, tool_calls, created_at)
   - `ai_user_memories` (id, user_id, fact, category, created_at)
   - `ai_knowledge_embeddings` (id, user_id, title, content, embedding vector(1536))
4. Adicionar métodos correspondentes em `src/lib/database.ts` (`db.ai.*`).

---

### Tarefa 2: Serviço Core do OpenRouter e Executor de Ferramentas (Tool Calling)
**Arquivos:**
- Criar: `src/services/ai/openrouter.ts`
- Criar: `src/services/ai/tools.ts`
- Criar: `src/services/ai/systemPrompt.ts`

**O que fazer:**
1. Em `systemPrompt.ts`, criar o prompt base com persona:
   - Focado em produtividade freelancer, tom amigável e enérgico, cobrança executiva de metas semanais e prazos de entregas.
   - Injetar o resumo do usuário (meta semanal, faturamento do mês, tarefas atrasadas e memórias de longo prazo).
2. Em `tools.ts`, declarar as tools JSON schema para OpenRouter:
   - `create_task`: Cria demanda no Kanban.
   - `update_task_status`: Move demanda entre colunas (Backlog -> Pendente -> Concluído).
   - `create_reminder`: Cria lembrete com alarme para cobrar cliente.
   - `update_invoice`: Atualiza valor customizado ou status de notas.
   - `save_user_memory`: Salva fatos relevantes aprendidos sobre o usuário.
3. Em `openrouter.ts`, implementar a chamada `fetch('https://openrouter.ai/api/v1/chat/completions')` suportando execução cíclica de tools até resposta final de texto.

---

### Tarefa 3: Sistema de Memória Persistente e Base de Conhecimento (RAG)
**Arquivos:**
- Criar: `src/services/ai/memory.ts`
- Criar: `src/services/ai/rag.ts`

**O que fazer:**
1. Em `memory.ts`:
   - Método `getUserMemories(userId)` para carregar os fatos mais relevantes e injetar no prompt.
   - Método `extractAndSaveMemories(conversationHistory)` que roda em background pós-resposta para extrair novos aprendizados.
2. Em `rag.ts`:
   - Geração de embeddings usando OpenRouter ou OpenAI embeddings.
   - Função de busca por similaridade de cosseno (`match_knowledge_embeddings`) via RPC Supabase.

---

### Tarefa 4: Aba de Configurações de IA na Tela de Ajustes
**Arquivos:**
- Criar: `src/components/ai/AiSettingsTab.tsx`
- Modificar: `src/features/settings/SettingsView.tsx`

**O que fazer:**
1. Adicionar seção "Assistente de IA & OpenRouter" no `SettingsView`.
2. Input para salvar a chave da OpenRouter com botão de teste de validação.
3. Seletor de modelos com sugestões populares:
   - `anthropic/claude-3.5-sonnet` (Recomendado para tools complexas)
   - `openai/gpt-4o-mini` (Super rápido e econômico)
   - `deepseek/deepseek-chat` (Ótimo custo-benefício)
   - `meta-llama/llama-3.3-70b-instruct`
4. Lista visual das memórias aprendidas com botão para excluir fatos indesejados.

---

### Tarefa 5: Hero AI Card no Topo do Dashboard
**Arquivos:**
- Criar: `src/components/ai/AiHeroWidget.tsx`
- Modificar: `src/features/dashboard/CommandCenter.tsx`

**O que fazer:**
1. Criar um card elegante com vidro/glassmorphism e gradiente dinâmico no topo do `CommandCenter`.
2. Exibir:
   - Saudação personalizada e frase motivacional contextual (calculada com base nas tarefas e metas da semana).
   - Botão rápido para "Plano de Hoje" e "Cobranças Pendentes".
   - Input inline para digitar comandos imediatos (ex: *"Criei uma reunião com a Maria amanhã às 10h"*).

---

### Tarefa 6: Floating AI Drawer Global
**Arquivos:**
- Criar: `src/components/ai/AiFloatingDrawer.tsx`
- Modificar: `src/features/dashboard/DashboardPage.tsx`

**O que fazer:**
1. Botão flutuante moderno no canto inferior direito com badge de status e atalho `Ctrl + Space`.
2. Drawer lateral retrátil animado com:
   - Histórico de mensagens persistido.
   - Indicador visual elegante quando o agente estiver chamando uma tool (ex: *"Agendando tarefa no Kanban..."*).
   - Botões de ações rápidas sugeridas ("Quais minhas metas hoje?", "Quem preciso cobrar?", "Resumo da semana").

---

### Tarefa 7: Validação Integrada e Build
**Comandos:**
```bash
npm run build
```
**Critérios de Aceite:**
1. Build sem nenhum erro de tipagem no TypeScript.
2. Inserção de chave OpenRouter salva com sucesso.
3. Chat no Dashboard e no Drawer executando criação e alteração de tarefas e notas no CRM.
4. Memórias sendo gravadas e reaproveitadas entre sessões.
