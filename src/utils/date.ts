export type DateInput = string | number | Date | null | undefined;

const MONTHS_SHORT_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

const parseYyyyMmDd = (value: string): { year: number; month: number; day: number } | null => {
  const m = value.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!m) return null;
  const year = Number(m[1]);
  const month = Number(m[2]);
  const day = Number(m[3]);
  if (!year || month < 1 || month > 12 || day < 1 || day > 31) return null;
  return { year, month, day };
};

const getDateParts = (input: DateInput): { year: number; month: number; day: number } | null => {
  if (input == null) return null;
  if (input instanceof Date) {
    if (isNaN(input.getTime())) return null;
    return { year: input.getFullYear(), month: input.getMonth() + 1, day: input.getDate() };
  }
  if (typeof input === 'number') {
    const d = new Date(input);
    if (isNaN(d.getTime())) return null;
    return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
  }
  const raw = String(input).trim();
  if (!raw) return null;
  const datePrefix = raw.length >= 10 ? raw.slice(0, 10) : raw;
  const partsFromDashed = parseYyyyMmDd(datePrefix);
  if (partsFromDashed) return partsFromDashed;
  const d = new Date(raw);
  if (isNaN(d.getTime())) return null;
  return { year: d.getFullYear(), month: d.getMonth() + 1, day: d.getDate() };
};

export const formatUSDate = (input: DateInput): string => {
  const parts = getDateParts(input);
  if (!parts) return '';
  const monthName = MONTHS_SHORT_EN[parts.month - 1] || '';
  if (!monthName) return '';
  return `${monthName} ${parts.day}, ${parts.year}`;
};

export const formatUSTime = (input: DateInput): string => {
  if (input == null) return '';
  const d = input instanceof Date ? input : new Date(input as any);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true });
};

export const formatUSDateTime = (input: DateInput): string => {
  const date = formatUSDate(input);
  const time = formatUSTime(input);
  if (!date) return '';
  if (!time) return date;
  return `${date} ${time}`;
};
