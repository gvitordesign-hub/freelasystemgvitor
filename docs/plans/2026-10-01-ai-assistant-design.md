# Documento de Arquitetura & Design: Assistente de IA Freela System (OpenRouter + RAG + Skills + Memória)

## 1. Visão Geral & Objetivos
Transformar o **Freela System** em uma central inteligente através de um assistente de IA focado em:
1. **Coach de Produtividade & Accountability**: Motivar o usuário a bater metas semanais e mensais, cobrando proativamente sobre prazos e notas pendentes.
2. **Operador do CRM (Tool Calling / Skills)**: Executar alterações reais no banco (agendar demandas, criar lembretes de cobrança, alterar notas, cadastrar ou atualizar clientes).
3. **Memória Persistente de Longo Prazo**: Conhecer o usuário com o tempo (seus gostos, valores de serviços habituais, estilo de comunicação, clientes preferenciais).
4. **Base de Conhecimento com RAG (Retrieval-Augmented Generation)**: Permitir busca semântica em arquivos de regras, contratos, histórico e scripts de atendimento.
5. **Onipresença no Sistema**:
   - **Hero AI Card no topo do Dashboard**: Com saudações inteligentes, status diário de cobrança/motivação e prompt direto.
   - **Floating Copilot Drawer**: Painel deslizante flutuante disponível em todas as telas (Kanban, Finanças, Clientes, etc.), acessível por botão flutuante e atalho `Ctrl + Space`.

---

## 2. Componentes e Estrutura de Dados (Supabase)

### A. Tabelas Necessárias
1. **`ai_user_config`** (ou campos em `user_stats`):
   - `openrouter_api_key`: chave criptografada/armazenada por usuário.
   - `selected_model`: modelo padrão (ex: `anthropic/claude-3.5-sonnet`, `deepseek/deepseek-chat`, `openai/gpt-4o-mini`).
   - `assistant_name`: Nome personalizado (ex: "Atlas", "Freela Bot").
   - `tone`: Tom de voz ("Executivo e Focado", "Amigável & Motivador", "Direto ao Ponto").

2. **`ai_messages`**:
   - `id`, `user_id`, `role` ('system' | 'user' | 'assistant' | 'tool'), `content`, `tool_calls`, `created_at`.

3. **`ai_user_memories`** (Memória Persistente):
   - `id`, `user_id`, `fact` (ex: "Gonçalo prefere revisar tarefas na segunda-feira pela manhã"), `category` ('preferencia' | 'cliente' | 'financeiro' | 'habito'), `importance`, `created_at`.

4. **`ai_knowledge_embeddings`** (RAG via `pgvector`):
   - `id`, `user_id`, `title`, `content`, `embedding` (vector 1536), `metadata`.

---

## 3. Catálogo de Skills / Tools Executáveis pelo Agente

| Nome da Tool | O que faz no CRM |
| :--- | :--- |
| `create_task` | Cria nova demanda no Kanban com título, cliente, data, valor e status. |
| `update_task` | Altera status, data de entrega ou valor de uma demanda existente. |
| `create_reminder` | Adiciona um lembrete com horário e alarme (ex: "Cobrar nota do Cliente X"). |
| `update_invoice` | Ajusta o valor customizado ou status ('Pago' / 'Pendente') de uma fatura. |
| `get_system_summary`| Lê em tempo real as metas, tarefas atrasadas e valores a receber para formular conselhos e cobranças assertivas. |
| `save_memory_fact` | O próprio agente aciona quando descobre algo relevante e duradouro sobre você. |

---

## 4. Interfaces do Usuário

1. **Dashboard Hero AI Banner**:
   - Posicionado no topo do `CommandCenter.tsx`.
   - Apresenta:
     - Avatar pulsante com aura neon na cor do tema ativo.
     - Resumo motivacional matinal (com base no progresso das metas e pendências).
     - Input rápido integrado para executar comandos imediatos ("Crie uma tarefa de logo para o João amanhã às 14h").
2. **Floating Copilot Drawer**:
   - Botão flutuante sutil no canto inferior direito (`Ctrl + Space`).
   - Abre um chat lateral moderno (Glassmorphism, histórico de mensagens, botões de ação rápida, indicação de tools executadas).
3. **Aba de Configurações de IA (`SettingsView`)**:
   - Campo para colar a OpenRouter API Key (com teste de conexão).
   - Seletor de modelos da OpenRouter com busca rápida.
   - Gerenciador de memórias gravadas (onde você pode ver e apagar fatos aprendidos pelo assistente).
