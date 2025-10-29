// Reglas y utilidades para relaciones/multiplicidades UML

/** Tipos UML del combo de multiplicidades */
export const SIDE_TYPES = ["0..1", "1", "0..*", "1..*", "*"];

/** Conjunto para MANY */
const MANY_SET = new Set(["0..*", "1..*", "*"]);
export const isMany = (t) => MANY_SET.has(t);

export const classify = (t) => {
  if (t === "1") return "ONE";
  if (t === "0..1") return "ZERO_ONE";
  if (isMany(t)) return "MANY";
  // Legacy por si llega algo viejo
  if (t === "N") return "MANY";
  if (t === "0..N") return "MANY";
  return "ONE";
};

/** Normaliza valores legacy guardados en edges a las nuevas opciones */
export const normalizeLegacy = (v) =>
  v === "N" ? "*" : v === "0..N" ? "0..*" : v || "1";

/** Decide si es N–M o mapea a clave de relación simple compatible (para Asociación) */
export function decideTipo(left, right) {
  if (!left || !right) return { error: "Selecciona ambos tipos." };

  const L = classify(left);
  const R = classify(right);

  if (L === "MANY" && R === "MANY") return { mode: "NM" };

  // Mapeo a claves conocidas
  let key = null;
  if (L === "ONE" && R === "ONE") key = "1-1";
  else if (L === "ONE" && R === "MANY") key = "1-N";
  else if (L === "MANY" && R === "ONE") key = "N-1";
  else if (L === "ZERO_ONE" && R === "ONE") key = "0-1";
  else if (L === "ONE" && R === "ZERO_ONE") key = "1-0";
  else if (L === "ZERO_ONE" && R === "MANY") key = "0-N";
  else if (L === "MANY" && R === "ZERO_ONE") key = "N-0";

  if (!key) {
    return {
      error:
        "Combinación no soportada. Para N–M usa 0..*, 1..* o * en ambos lados.",
    };
  }
  return { mode: "SIMPLE", tipo: key };
}

/** Sugerencia de nombre de tabla intermedia: entidades en orden alfabético, snake_case */
export function suggestJoinName(aName, bName) {
  const clean = (s) =>
    (s || "")
      .normalize("NFKD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^\w\s]/g, "")
      .trim()
      .replace(/\s+/g, "_")
      .toLowerCase();
  const [x, y] = [clean(aName), clean(bName)].sort();
  return `${x}_${y}`;
}

/** Tipos de relación UML soportados */
export const REL_KINDS = [
  { code: "ASSOCIATION",  label: "Asociación",  supportsMultiplicity: true,  supportsVerb: true,  supportsJoin: true,  needsOwner: false, note: "Relación básica; puede ser N–M con tabla intermedia." },
  { code: "AGGREGATION",  label: "Agregación",  supportsMultiplicity: true,  supportsVerb: true,  supportsJoin: false, needsOwner: true,  note: "Rombo vacío en el dueño." },
  { code: "COMPOSITION",  label: "Composición", supportsMultiplicity: true,  supportsVerb: true,  supportsJoin: false, needsOwner: true,  note: "Rombo lleno en el dueño." },
  { code: "INHERITANCE",  label: "Herencia",    supportsMultiplicity: false, supportsVerb: false, supportsJoin: false, needsOwner: false, note: "Triángulo en el padre; sin multiplicidades." },
  { code: "DEPENDENCY",   label: "Dependencia", supportsMultiplicity: false, supportsVerb: true,  supportsJoin: false, needsOwner: false, note: "Línea punteada; punta simple." },
];

export const REL_KIND_LABEL = Object.fromEntries(REL_KINDS.map(k => [k.code, k.label]));
export function getRelKindMeta(code) {
  return REL_KINDS.find(k => k.code === code) || REL_KINDS[0];
}
export const kindSupportsMultiplicity = (k) => getRelKindMeta(k).supportsMultiplicity;
export const kindSupportsVerb = (k) => getRelKindMeta(k).supportsVerb;
export const kindSupportsJoin = (k) => getRelKindMeta(k).supportsJoin;
export const kindNeedsOwner = (k) => getRelKindMeta(k).needsOwner;
