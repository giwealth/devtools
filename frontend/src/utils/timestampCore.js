function detectLang() {
  const lang = navigator.language || navigator.userLanguage || "";
  return lang.startsWith("zh") ? "zh" : "en";
}

export function getAllTimezones(lang = null) {
  const L = lang || detectLang();
  const timezones = [];
  const timezoneNames = {
    zh: {
      "-12": "国际日期变更线西",
      "-11": "萨摩亚",
      "-10": "夏威夷",
      "-9": "阿拉斯加",
      "-8": "太平洋时间",
      "-7": "美国山地时间",
      "-6": "美国中部时间",
      "-5": "美国东部时间",
      "-4": "圣地亚哥",
      "-3": "布宜诺斯艾利斯",
      "-2": "大西洋中部",
      "-1": "佛得角群岛",
      0: "格林威治标准时间",
      1: "中非时间",
      2: "东欧时间",
      3: "莫斯科",
      4: "阿联酋",
      5: "巴基斯坦",
      5.5: "印度",
      6: "孟加拉",
      7: "泰国",
      8: "北京时间",
      9: "日本",
      10: "墨尔本",
      11: "所罗门群岛",
      12: "新西兰",
      13: "汤加",
      14: "莱恩群岛",
    },
    en: {
      "-12": "International Date Line West",
      "-11": "Samoa",
      "-10": "Hawaii",
      "-9": "Alaska",
      "-8": "Pacific Time",
      "-7": "Mountain Time (US)",
      "-6": "Central Time (US)",
      "-5": "Eastern Time (US)",
      "-4": "Santiago",
      "-3": "Buenos Aires",
      "-2": "Mid-Atlantic",
      "-1": "Cape Verde",
      0: "Greenwich Mean Time",
      1: "Central European Time",
      2: "Eastern European Time",
      3: "Moscow",
      4: "UAE",
      5: "Pakistan",
      5.5: "India",
      6: "Bangladesh",
      7: "Thailand",
      8: "Beijing Time",
      9: "Japan",
      10: "Melbourne",
      11: "Solomon Islands",
      12: "New Zealand",
      13: "Tonga",
      14: "Line Islands",
    },
  };
  const names = timezoneNames[L] || timezoneNames.zh;
  for (let i = -12; i <= 14; i++) {
    const sign = i >= 0 ? "+" : "";
    const offset = `${sign}${i}`;
    const name = names[offset] || names[String(i)] || "";
    const label = name ? `UTC${offset} (${name})` : `UTC${offset}`;
    timezones.push({ value: `UTC${offset}`, label, offset: i });
  }
  const half =
    L === "en"
      ? [
          { offset: 5.5, name: "India" },
          { offset: 9.5, name: "Central Australia" },
          { offset: 10.5, name: "Central Australia (DST)" },
          { offset: 12.75, name: "Chatham Islands" },
        ]
      : [
          { offset: 5.5, name: "印度" },
          { offset: 9.5, name: "澳大利亚中部" },
          { offset: 10.5, name: "澳大利亚中部（夏令时）" },
          { offset: 12.75, name: "查塔姆群岛" },
        ];
  half.forEach((tz) => {
    const offset = tz.offset >= 0 ? `+${tz.offset}` : String(tz.offset);
    timezones.push({ value: `UTC${offset}`, label: `UTC${offset} (${tz.name})`, offset: tz.offset });
  });
  return timezones.sort((a, b) => a.offset - b.offset);
}

/** @param {Date} date @param {string} timezone e.g. UTC+8 */
export function formatTimeByTimezone(date, timezone = "UTC+8") {
  const offsetMatch = timezone.match(/UTC([+-]?)(\d+(?:\.\d+)?)/);
  if (!offsetMatch) {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");
    const h = String(date.getHours()).padStart(2, "0");
    const min = String(date.getMinutes()).padStart(2, "0");
    const s = String(date.getSeconds()).padStart(2, "0");
    return `${y}-${m}-${d} ${h}:${min}:${s}`;
  }
  const sign = offsetMatch[1] === "-" ? -1 : 1;
  const offsetHours = parseFloat(offsetMatch[2]);
  const offsetMinutes = sign * offsetHours * 60;
  const targetTime = new Date(date.getTime() + offsetMinutes * 60 * 1000);
  const year = targetTime.getUTCFullYear();
  const month = String(targetTime.getUTCMonth() + 1).padStart(2, "0");
  const day = String(targetTime.getUTCDate()).padStart(2, "0");
  const hours = String(targetTime.getUTCHours()).padStart(2, "0");
  const minutes = String(targetTime.getUTCMinutes()).padStart(2, "0");
  const seconds = String(targetTime.getUTCSeconds()).padStart(2, "0");
  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
}

/**
 * @param {string} dateStr
 * @param {string} timezone UTC+8
 * @param {"seconds"|"milliseconds"} unit
 */
export function dateStringToUnix(dateStr, timezone, unit) {
  const trimmed = dateStr.trim();
  if (!trimmed) return { ok: true, value: "" };

  const offsetMatch = timezone.match(/UTC([+-]?)(\d+(?:\.\d+)?)/);
  if (!offsetMatch) return { ok: false, value: "Invalid timezone" };
  const sign = offsetMatch[1] === "-" ? -1 : 1;
  const offsetHours = parseFloat(offsetMatch[2]);
  const offsetMinutes = sign * offsetHours * 60;

  let date;
  if (/^\d{10}$/.test(trimmed)) {
    date = new Date(parseInt(trimmed, 10) * 1000);
  } else if (/^\d{13}$/.test(trimmed)) {
    date = new Date(parseInt(trimmed, 10));
  } else {
    const normalized = trimmed.replace(/\//g, "-");
    const parts = normalized.match(/(\d{4})-(\d{2})-(\d{2})(?:\s+(\d{2}):(\d{2}):(\d{2}))?/);
    if (parts) {
      const year = parseInt(parts[1], 10);
      const month = parseInt(parts[2], 10) - 1;
      const day = parseInt(parts[3], 10);
      const hours = parts[4] ? parseInt(parts[4], 10) : 0;
      const minutes = parts[5] ? parseInt(parts[5], 10) : 0;
      const seconds = parts[6] ? parseInt(parts[6], 10) : 0;
      const utcDate = new Date(Date.UTC(year, month, day, hours, minutes, seconds));
      date = new Date(utcDate.getTime() - offsetMinutes * 60 * 1000);
    } else {
      const tempDate = new Date(normalized);
      if (!isNaN(tempDate.getTime())) {
        const localOffsetMinutes = tempDate.getTimezoneOffset();
        const utcTime = tempDate.getTime() + localOffsetMinutes * 60 * 1000;
        date = new Date(utcTime - offsetMinutes * 60 * 1000);
      }
    }
  }

  if (!date || isNaN(date.getTime())) return { ok: false, value: "Invalid date" };
  const out = unit === "milliseconds" ? String(date.getTime()) : String(Math.floor(date.getTime() / 1000));
  return { ok: true, value: out };
}

/**
 * @param {string} tsInput
 * @param {"seconds"|"milliseconds"} unit
 * @param {string} timezone
 */
export function unixToFormatted(tsInput, unit, timezone) {
  const trimmed = tsInput.trim();
  if (!trimmed) return { ok: true, value: "" };
  let n = parseFloat(trimmed);
  if (isNaN(n)) return { ok: false, value: "Invalid timestamp" };
  if (unit === "seconds") n *= 1000;
  const d = new Date(n);
  if (isNaN(d.getTime())) return { ok: false, value: "Invalid timestamp" };
  return { ok: true, value: formatTimeByTimezone(d, timezone) };
}
