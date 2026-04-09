export function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

/**
 * @param {string} line
 * @param {"2 Spaces"|"4 Spaces"|"Tab"} indentOption
 */
export function highlightJSONLine(line, indentOption = "4 Spaces") {
  if (!line.trim()) {
    return '<div class="json-hl-line json-hl-line--empty"><span class="json-hl-line__core"></span></div>';
  }
  const indentMatch = line.match(/^(\s*)/);
  const indent = indentMatch ? indentMatch[1] : "";
  let indentLevel = 0;
  if (indentOption === "Tab") {
    indentLevel = (indent.match(/\t/g) || []).length;
  } else {
    const indentSize = indentOption === "2 Spaces" ? 2 : 4;
    indentLevel = Math.floor(indent.length / indentSize);
  }
  const indentPx = indentLevel * (indentOption === "Tab" ? 64 : indentOption === "2 Spaces" ? 8 : 32);
  const content = line.substring(indent.length);
  let escaped = escapeHtml(content);
  escaped = escaped.replace(/([{}[\]])/g, '<span class="json-hl__brace">$1</span>');
  escaped = escaped.replace(/("([^"\\]|\\.)*")\s*:/g, '<span class="json-hl__key">$1</span><span class="json-hl__punct">:</span>');
  escaped = escaped.replace(/:\s*("([^"\\]|\\.)*")/g, '<span class="json-hl__punct">:</span> <span class="json-hl__str">$1</span>');
  escaped = escaped.replace(/:\s*(\d+\.?\d*)(?![^<]*>)/g, '<span class="json-hl__punct">:</span> <span class="json-hl__num">$1</span>');
  escaped = escaped.replace(/:\s*(true|false|null)(?![^<]*>)/g, '<span class="json-hl__punct">:</span> <span class="json-hl__kw">$1</span>');
  escaped = escaped.replace(/(,)(?![^<]*>)/g, '<span class="json-hl__punct">$1</span>');
  return `<div class="json-hl-line"><span class="json-hl-line__core" style="padding-left:${indentPx}px">${escaped}</span></div>`;
}

/**
 * @param {string} formatted
 * @param {"2 Spaces"|"4 Spaces"|"Tab"} indentOption
 */
export function highlightFormattedJSON(formatted, indentOption) {
  return formatted.split("\n").map((line) => highlightJSONLine(line, indentOption)).join("");
}
