/** 收集可折叠节点 path（与 JsonTreeNode 路径规则一致） */
export function collectContainerPaths(val, p = "$") {
  const acc = [];
  function walk(v, path) {
    if (v === null || typeof v !== "object") return;
    acc.push(path);
    if (Array.isArray(v)) {
      v.forEach((item, i) => walk(item, `${path}[${i}]`));
    } else {
      Object.keys(v).forEach((k) => walk(v[k], `${path}.${k}`));
    }
  }
  walk(val, p);
  return acc;
}
