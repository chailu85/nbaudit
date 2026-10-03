export const BUSINESS_TIME_ZONE = 'Asia/Shanghai';

const dateParts = (date: Date, timeZone = BUSINESS_TIME_ZONE) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const value = (type: Intl.DateTimeFormatPartTypes) => parts.find(part => part.type === type)?.value ?? '';
  return { year: value('year'), month: value('month'), day: value('day') };
};

/** Returns a calendar date in the product's declared business time zone. */
export const businessDate = (date = new Date(), timeZone = BUSINESS_TIME_ZONE) => {
  const { year, month, day } = dateParts(date, timeZone);
  return `${year}-${month}-${day}`;
};

/** Validates a calendar date without applying the browser's local time zone. */
export const isBusinessDate = (value: string) => {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  const parsed = new Date(Date.UTC(year, month - 1, day));
  return parsed.getUTCFullYear() === year && parsed.getUTCMonth() === month - 1 && parsed.getUTCDate() === day;
};
