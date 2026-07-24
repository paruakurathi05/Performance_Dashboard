import { format, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns';

export const parseAsUTC = (dateString) => {
  if (!dateString) return null;
  if (dateString instanceof Date) return dateString;
  
  let s = String(dateString).trim();
  
  // If it's a numeric timestamp
  if (/^\d+$/.test(s)) {
    return new Date(Number(s));
  }
  
  // If it has timezone offset/designator (Z, +xx:xx, etc.)
  if (s.endsWith('Z') || /[+-]\d{2}:?\d{2}$/.test(s)) {
    return new Date(s);
  }
  
  // If it's a datetime string without timezone (e.g. "2026-06-24 11:24:38" or "2026-06-24T11:24:38")
  if (/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}:\d{2}/.test(s)) {
    s = s.replace(' ', 'T');
    if (!s.endsWith('Z')) {
      s += 'Z';
    }
  }
  
  return new Date(s);
};

/**
 * Returns the calendar day of a timestamp as "YYYY-MM-DD", i.e. the exact shape
 * an <input type="date"> holds, so the two can be compared as plain strings.
 *
 * Values that carry an offset ("...Z", "...+05:30") are converted to IST.
 * Values without one ("2026-07-24 19:45:00", "2026-07-24") are ambiguous, so the
 * date part is taken literally instead of being re-interpreted as UTC — that
 * re-interpretation adds 5h30m and pushes any evening record onto the next day.
 */
export const toIstDateKey = (value) => {
  if (value === null || value === undefined || value === '') return null;

  if (!(value instanceof Date)) {
    const naive = String(value).trim().match(/^(\d{4}-\d{2}-\d{2})(?:[ T][\d:.]*)?$/);
    if (naive) return naive[1];
  }

  const parsed = parseAsUTC(value);
  if (!parsed || isNaN(parsed.getTime())) return null;

  return parsed.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
};

/** Today's date in IST as "YYYY-MM-DD". */
export const getIstTodayKey = () =>
  new Date().toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });

/**
 * Shifts a "YYYY-MM-DD" key by whole days/months/years and returns a key.
 * Uses UTC internally so it never trips over the browser's own timezone or DST.
 */
export const shiftDateKey = (dateKey, { days = 0, months = 0, years = 0 } = {}) => {
  if (!dateKey) return null;
  const [year, month, day] = dateKey.split('-').map(Number);
  const dt = new Date(Date.UTC(year, month - 1, day));

  if (years) dt.setUTCFullYear(dt.getUTCFullYear() + years);
  if (months) dt.setUTCMonth(dt.getUTCMonth() + months);
  if (days) dt.setUTCDate(dt.getUTCDate() + days);

  return dt.toISOString().slice(0, 10);
};

/**
 * Resolves a record's date key by trying `fields` in priority order, so a caller
 * can say "use the BPO action date, fall back to created" in one place.
 */
export const resolveDateKey = (item, fields = []) => {
  if (!item) return null;
  for (const field of fields) {
    const key = toIstDateKey(item[field]);
    if (key) return key;
  }
  return null;
};

/**
 * Renders a timestamp for display, using the same naive-vs-offset rule as
 * toIstDateKey so what a user reads always matches what the filters matched.
 * Returns { date: "DD/MM/YYYY", time: "HH:MM" | null } or null.
 */
export const toIstDisplayParts = (value) => {
  if (value === null || value === undefined || value === '') return null;

  if (!(value instanceof Date)) {
    const naive = String(value).trim()
      .match(/^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?[\d:.]*$/);
    if (naive) {
      const [, year, month, day, hour, minute] = naive;
      return { date: `${day}/${month}/${year}`, time: hour ? `${hour}:${minute}` : null };
    }
  }

  const parsed = parseAsUTC(value);
  if (!parsed || isNaN(parsed.getTime())) return null;

  const key = parsed.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
  const [year, month, day] = key.split('-');
  return {
    date: `${day}/${month}/${year}`,
    time: parsed.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Asia/Kolkata'
    })
  };
};

export const formatDate = (date, formatStr = 'dd-MMM-yyyy') => {
  const parsed = parseAsUTC(date);
  return parsed ? format(parsed, formatStr) : 'N/A';
};

export const calculateBalance = (target, achieved) => {
  return Math.max(0, target - achieved);
};

export const getWeekRange = (date = new Date()) => {
  return {
    start: format(startOfWeek(date), 'dd MMM'),
    end: format(endOfWeek(date), 'dd MMM yyyy')
  };
};

export const getMonthRange = (date = new Date()) => {
  return {
    start: format(startOfMonth(date), 'dd MMM'),
    end: format(endOfMonth(date), 'dd MMM yyyy')
  };
};

export const aggregateData = (dailyData, period) => {
  if (period === 'daily') return dailyData;
  
  const aggregated = {
    assignedTarget: 0,
    achievedOrders: 0,
    shopsVisited: 0,
    location: 'Multiple'
  };
  
  dailyData.forEach(entry => {
    aggregated.assignedTarget += entry.assignedTarget;
    aggregated.achievedOrders += entry.achievedOrders;
    aggregated.shopsVisited += entry.shopsVisited;
  });
  
  aggregated.balanceToAchieve = calculateBalance(
    aggregated.assignedTarget,
    aggregated.achievedOrders
  );
  
  return aggregated;
};