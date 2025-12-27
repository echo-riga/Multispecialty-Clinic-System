function sanitizeString(input, maxLen = 300) {
  if (input == null) return '';
  const s = String(input).trim();
  return s.slice(0, maxLen);
}

function sanitizeStringArray(input, maxItemLen = 120, maxItems = 50) {
  if (input == null) return [];
  let arr;
  if (Array.isArray(input)) {
    arr = input;
  } else {
    arr = String(input).split(/[\n,]/);
  }
  const cleaned = [];
  for (const v of arr) {
    const s = sanitizeString(v, maxItemLen);
    if (s) cleaned.push(s);
    if (cleaned.length >= maxItems) break;
  }
  return cleaned;
}

module.exports = {
  sanitizeString,
  sanitizeStringArray
};


