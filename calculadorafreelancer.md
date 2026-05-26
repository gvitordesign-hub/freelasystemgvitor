# Skill: Freelancer Financial Engine & Technical Rate (Nexus OS)

## 🎯 Objetivo
Esta skill capacita o sistema para calcular a saúde financeira de um freelancer, transformando desejos subjetivos (salário) e custos objetivos (boletos) em um valor de hora técnica lucrativo e sustentável.

## 🧠 Lógica de Negócio (Business Rules)

### 1. Disponibilidade Real (Capacity)
O sistema deve distinguir "horas trabalhadas" de "horas faturáveis". 
- **Fórmula:** `Horas_Uteis_Mensais = (Horas_Produtivas_Dia * Dias_Trabalhados_Semana * 4.33)`
- **Regra de Ouro:** Recomendar que o usuário não ultrapasse 6h produtivas/dia para garantir tempo de gestão e evitar burnout.

### 2. Composição de Custos (The Burn Rate)
O custo mensal total é a soma de:
- **Custos Fixos:** Softwares, internet, energia, aluguel/coworking.
- **Impostos/Legal:** Valor fixo do MEI (DAS) ou porcentagem de notas fiscais.
- **Reserva de Hardware:** `Custo_Equipamento / Meses_de_Vida_Util` (Ex: R$ 6.000 / 36 meses).

### 3. O Cálculo da Hora Técnica (The Math)
A hora técnica deve cobrir o custo de vida, o custo do negócio e a margem de segurança.
- **Salário Alvo (Net):** O quanto o usuário quer "limpo" no bolso.
- **Fórmula Final:** `Valor_Hora = (Salario_Alvo + Custos_Totais_Mensais) / Horas_Uteis_Mensais`
- **Fator Férias:** Adicionar 8.33% (1/12) ao valor final para garantir que o usuário continue recebendo enquanto descansa.

## 🎮 Integração com Gamificação (Nexus OS Style)
- **High Performance:** Se o `Valor_Hora` for atingido em um projeto, conceder `+50 XP`.
- **Underpriced Alert:** Se o usuário tentar fechar um job com valor abaixo da hora técnica calculada, exibir aviso: "Cuidado: Este job vai consumir seu lucro. Deseja prosseguir?"

## 📋 Atributos do Objeto de Dados (JSON Structure)
{
  "metas": {
    "salario_alvo": number,
    "horas_dia": number,
    "dias_semana": number,
    "semanas_ferias": number
  },
  "custos_fixos": [
    { "descricao": string, "valor": number }
  ],
  "calculado": {
    "hora_tecnica": number,
    "custo_mensal_total": number,
    "capacidade_mensal": number
  }
}

## 💡 Sugestões de Respostas para o Usuário
- "Sua hora técnica atual é R$ XX,XX. Para atingir sua meta de R$ 5k livre, você precisa faturar pelo menos [X] horas este mês."
- "Seus custos fixos representam [X]% do seu faturamento pretendido. Considere reduzir custos ou aumentar sua tarifa."