/**
 * Utilitários para tratamento seguro de datas no sistema GVitor.
 * Evita desvios de fuso horário (ex: UTC vs UTC-3 / Brasil)
 * onde datas no formato YYYY-MM-DD podem recuar para o dia/mês anterior.
 */

/**
 * Retorna a data local atual (ou informada) no formato ISO de data simples: YYYY-MM-DD.
 */
export const getLocalDateString = (date: Date = new Date()): string => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Extrai ano, mês (0-11) e dia de qualquer string de data de forma imune a fusos horários.
 */
export const getDateParts = (dateStr?: string | null): { year: number; month: number; day: number } => {
  if (!dateStr) {
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth(), day: now.getDate() };
  }

  const clean = dateStr.includes('T') ? dateStr.split('T')[0] : dateStr.trim();
  const parts = clean.split('-');

  if (parts.length >= 3) {
    const year = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10) - 1; // 0-indexed (0 = Jan, 11 = Dez)
    const day = parseInt(parts[2], 10);
    if (!isNaN(year) && !isNaN(month) && !isNaN(day)) {
      return { year, month, day };
    }
  }

  const fallback = new Date(dateStr);
  return {
    year: fallback.getFullYear(),
    month: fallback.getMonth(),
    day: fallback.getDate()
  };
};

/**
 * Formata qualquer string de data para o padrão brasileiro DD/MM/YYYY.
 */
export const formatDateBR = (dateStr?: string | null): string => {
  if (!dateStr) return '';
  const { year, month, day } = getDateParts(dateStr);
  const dStr = String(day).padStart(2, '0');
  const mStr = String(month + 1).padStart(2, '0');
  return `${dStr}/${mStr}/${year}`;
};

/**
 * Verifica se uma string de data pertence ao mesmo mês e ano de uma data de referência.
 */
export const isSameMonthAndYear = (dateStr: string | undefined | null, targetDate: Date): boolean => {
  if (!dateStr) return false;
  const { year, month } = getDateParts(dateStr);
  return month === targetDate.getMonth() && year === targetDate.getFullYear();
};

/**
 * Verifica se uma string de data pertence ao mesmo dia, mês e ano de uma data de referência.
 */
export const isSameDay = (dateStr: string | undefined | null, targetDate: Date): boolean => {
  if (!dateStr) return false;
  const { year, month, day } = getDateParts(dateStr);
  return day === targetDate.getDate() && month === targetDate.getMonth() && year === targetDate.getFullYear();
};
