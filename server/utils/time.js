function normalizeTimeStr(input) {
  return String(input).trim().replace('T', ' ').slice(0, 16);
}

function toDateFromStr(input) {
  const s = normalizeTimeStr(input);
  const [datePart, timePart] = s.split(' ');
  const [y, m, d] = (datePart || '').split('-').map(Number);
  const [hh, mm] = (timePart || '').split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0, 0, 0);
}

module.exports = {
  normalizeTimeStr,
  toDateFromStr
};


