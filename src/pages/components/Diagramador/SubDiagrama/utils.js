// src/views/proyectos/Diagramador/SubDiagrama/utils.js

/* ---------- Helpers de tiempo ---------- */
export function throttle(fn, wait = 60) {
  let last = 0;
  let t = null;
  let lastArgs = null;
  return (...args) => {
    const now = Date.now();
    if (now - last >= wait) {
      last = now;
      fn(...args);
    } else {
      lastArgs = args;
      clearTimeout(t);
      t = setTimeout(() => {
        last = Date.now();
        fn(...lastArgs);
      }, wait - (now - last));
    }
  };
}

export function debounce(fn, wait = 250) {
  let t = null;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), wait);
  };
}

/* ---------- IO / archivos ---------- */
export function downloadText(filename, text) {
  const blob = new Blob([text], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---------- Strings/posiciones ---------- */
export const toSnake = (s = "") =>
  (s || "")
    .normalize("NFKD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^\w\s]/g, "")
    .trim().replace(/\s+/g, "_")
    .toLowerCase();

export const inferIdType = (node) => {
  const idAttr = (node?.data?.attrs || []).find(a => a.name?.toLowerCase() === "id");
  return idAttr?.type || "Integer";
};

export const midpoint = (a, b) => ({
  x: ((a?.position?.x ?? 100) + (b?.position?.x ?? 100)) / 2,
  y: ((a?.position?.y ?? 100) + (b?.position?.y ?? 100)) / 2,
});

/* ---------- Multiplicidades/relaciones ---------- */
export const normalizeMult = (m) => {
  if (m == null) return "1";
  const v = String(m).trim().replace(/\s/g, "");
  if (!v) return "1";
  if (v === "N" || v === "*" || v === "n") return "*";
  if (v === "1..*" || v === "1.*") return "1..*";
  if (v === "0..*" || v === "0.*") return "0..*";
  if (v === "0..1" || v === "0.1") return "0..1";
  if (v === "1") return "1";
  if (/^\d+\.\.\*$/.test(v)) return "1..*";
  return v;
};

export const decideRelType = (mA, mB) => {
  const A = normalizeMult(mA), B = normalizeMult(mB);
  const isMany = (x) => x === "1..*" || x === "0..*" || x === "*";
  if (!isMany(A) && !isMany(B)) return "1-1";
  if (!isMany(A) && isMany(B)) return "1-N";
  if (isMany(A) && !isMany(B)) return "N-1";
  if (A === "0..1" && !isMany(B)) return "0-1";
  if (!isMany(A) && A === "1" && B === "0..1") return "1-0";
  if (A === "0..1" && isMany(B)) return "0-N";
  if (isMany(A) && B === "0..1") return "N-0";
  return "NM";
};
