/**
 * FileFix Tabular Data Operations Module
 * CSV, TSV, and JSON bidirectional conversion.
 */

/**
 * Robust CSV/TSV parser supporting quotes and escaped characters.
 */
export function parseCSV(text, delimiter = null) {
  if (!text || typeof text !== 'string') return { headers: [], rows: [] };

  // Auto-detect delimiter if not specified
  if (!delimiter) {
    const firstLine = text.split(/\r?\n/)[0] || '';
    const commas = (firstLine.match(/,/g) || []).length;
    const tabs = (firstLine.match(/\t/g) || []).length;
    const semicolons = (firstLine.match(/;/g) || []).length;

    if (tabs > commas && tabs > semicolons) delimiter = '\t';
    else if (semicolons > commas && semicolons > tabs) delimiter = ';';
    else delimiter = ',';
  }

  const rows = [];
  let currentRow = [];
  let currentField = '';
  let insideQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (char === '"') {
      if (insideQuotes && nextChar === '"') {
        currentField += '"';
        i++; // skip escaped quote
      } else {
        insideQuotes = !insideQuotes;
      }
    } else if (char === delimiter && !insideQuotes) {
      currentRow.push(currentField.trim());
      currentField = '';
    } else if ((char === '\r' || char === '\n') && !insideQuotes) {
      if (char === '\r' && nextChar === '\n') i++;
      currentRow.push(currentField.trim());
      currentField = '';
      if (currentRow.length > 0 && currentRow.some(c => c !== '')) {
        rows.push(currentRow);
      }
      currentRow = [];
    } else {
      currentField += char;
    }
  }

  if (currentField !== '' || currentRow.length > 0) {
    currentRow.push(currentField.trim());
    if (currentRow.length > 0 && currentRow.some(c => c !== '')) {
      rows.push(currentRow);
    }
  }

  if (rows.length === 0) return { headers: [], rows: [] };

  const headers = rows[0];
  const dataRows = rows.slice(1);

  return { headers, rows: dataRows, delimiter };
}

/**
 * Converts CSV/TSV text to JSON array of objects.
 */
export function csvToJson(csvText, delimiter = null) {
  const { headers, rows } = parseCSV(csvText, delimiter);
  if (!headers || headers.length === 0) return [];

  return rows.map(row => {
    const obj = {};
    headers.forEach((header, idx) => {
      let val = row[idx] !== undefined ? row[idx] : '';
      // Try to parse numbers or booleans
      if (val.toLowerCase() === 'true') val = true;
      else if (val.toLowerCase() === 'false') val = false;
      else if (!isNaN(val) && val !== '') val = Number(val);
      obj[header] = val;
    });
    return obj;
  });
}

/**
 * Converts JSON array of objects to CSV/TSV text.
 */
export function jsonToCsv(jsonArray, delimiter = ',') {
  if (!Array.isArray(jsonArray) || jsonArray.length === 0) return '';

  // Collect all unique keys from objects
  const keys = Array.from(new Set(jsonArray.flatMap(obj => Object.keys(obj || {}))));

  const escapeCell = (val) => {
    if (val === null || val === undefined) return '';
    const str = typeof val === 'object' ? JSON.stringify(val) : String(val);
    if (str.includes(delimiter) || str.includes('"') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  };

  const headerRow = keys.map(escapeCell).join(delimiter);
  const dataRows = jsonArray.map(obj => {
    return keys.map(k => escapeCell(obj[k])).join(delimiter);
  });

  return [headerRow, ...dataRows].join('\n');
}
