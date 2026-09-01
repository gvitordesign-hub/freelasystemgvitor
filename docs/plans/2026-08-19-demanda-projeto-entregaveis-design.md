# Design: Demanda de Projeto com Múltiplos Entregáveis & Cardápio de Serviços

**Data:** 2026-08-19  
**Status:** Aprovado para Implementação  
**Autor:** Antigravity & Gonçalo

---

## 1. Visão Geral
Esta funcionalidade permite que profissionais criem demandas completas de projetos (ex: *"CD CAROLL SOUÁ"*) contendo múltiplos entregáveis/peças (ex: *"Motion - Ouça Agora"*, *"Capa para Youtube"*, *"Capa Sua Música"*) com valores individuais discriminados, somando automaticamente o valor total do projeto e oferecendo acompanhamento do progresso em tempo real por meio de uma barra de progresso no Kanban.

Além disso, introduz o **Cardápio de Entregáveis / Serviços** na aba de Configurações, onde os serviços frequentes e seus preços base ficam cadastrados para inserção em 1 clique na criação de demandas.

---

## 2. Arquitetura e Modelagem de Dados

### 2.1 Interface de Entregável (`DeliverableItem`)
```typescript
export interface DeliverableItem {
  id: string;
  title: string;
  value: number;
  completed: boolean;
  serviceId?: string;
}
```

### 2.2 Atualização da Interface `Task`
```typescript
export interface Task {
  id: string;
  title: string;
  clientId: string;
  invoiceId?: string;
  value: number;
  day: DayOfWeek;
  date: string;
  status: Status;
  category: string;
  briefing?: string;
  addToPortfolio?: boolean;
  position: number;
  deliverables?: DeliverableItem[];
}
```

### 2.3 Banco de Dados (Supabase / SQL)
- Adicionar coluna `deliverables JSONB DEFAULT '[]'::jsonb` na tabela `tasks`.
- Utilizar a tabela existente `services` para persistir o Cardápio de Entregáveis.

---

## 3. Componentes e Fluxo de Telas

### 3.1 Cardápio de Serviços (`SettingsView.tsx`)
- Nova seção: **Cardápio de Entregáveis / Serviços**.
- Permite listar, criar, editar e excluir serviços pré-cadastrados (Nome, Categoria, Valor Padrão).
- Integração total com `db.services` no Supabase e estado global.

### 3.2 Modal de Criação / Edição de Demanda (`TaskModal.tsx`)
- Seleção de Cliente e Título da Demanda (ex: *"CD CAROLL SOUÁ"*).
- Painel de Entregáveis:
  - Chips rápidos com serviços do Cardápio: clique para adicionar instantaneamente.
  - Adição manual de entregáveis avulsos.
  - Edição de nome e preço de cada peça.
  - Cálculo e atualização automática do valor total da demanda.

### 3.3 Kanban Board & Card com Barra de Progresso (`KanbanBoard.tsx`)
- Card consolidado da demanda no dia correspondente.
- Barra de progresso neon dinâmica indicando `X/Y entregáveis concluídos (Z%)`.
- Mini-checklist interativo no card para marcar peças como concluídas sem abrir modal.
- Quando 100% concluído, indicação visual destacada.

### 3.4 Modal de Detalhes da Demanda (`TaskDetailModal.tsx`)
- Visualização completa da lista de entregáveis com checkboxes, valores e status de conclusão.

### 3.5 Nota de Projeto & WhatsApp (`ProjectNoteModal.tsx`)
- Discriminação dos entregáveis e seus valores unitários na cópia de texto para WhatsApp e faturamento da Nota de Projeto.

---

## 4. Testes e Validação
1. Cadastrar novos serviços no Cardápio em Configurações.
2. Criar uma nova Demanda no Kanban selecionando múltiplos entregáveis do Cardápio.
3. Verificar a soma automática do valor e criação do card no Kanban.
4. Marcar entregáveis como concluídos e verificar a evolução da barra de progresso (0% -> 33% -> 66% -> 100%).
5. Verificar os dados no `ProjectNoteModal` (WhatsApp e fatura).
