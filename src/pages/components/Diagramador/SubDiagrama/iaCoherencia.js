// Normalizadores + catálogo semántico para sugerir atributos realistas.

const RM_DIAC = (s="") => s.normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const TRIM = (s="") => String(s||"").trim();
const NORM = (s="") => RM_DIAC(TRIM(s)).toLowerCase();

export const ALLOWED_TYPES = new Set([
  "String","Boolean","Byte","Short","Integer","Long","Float","Double",
  "BigDecimal","LocalDate","LocalDateTime","Instant","OffsetDateTime",
  "UUID","byte[]","Text"
]);

const TYPE_SYNONYMS = {
  entero:"Integer", numero:"Integer",
  cadena:"String", texto:"Text",
  booleano:"Boolean",
  fecha:"LocalDate", fechahora:"LocalDateTime", datetime:"LocalDateTime",
  decimal:"BigDecimal", doble:"Double",
  uuid:"UUID", binario:"byte[]"
};

export function normalizeMultiplicity(m) {
  const v = TRIM(String(m||"1")).replace(/\s/g,"");
  if (!v) return "1";
  if (v==="N"||v==="n") return "*";
  if (v==="0..N") return "0..*";
  if (v==="1.*") return "1..*";
  if (v==="0.*") return "0..*";
  return ["1","0..1","1..*","0..*","*"].includes(v) ? v : "1";
}
const MANY = new Set(["*","1..*","0..*"]);
export const isMany = (m) => MANY.has(normalizeMultiplicity(m));

export function normalizeEntityName(name="") {
  const base = RM_DIAC(TRIM(name)).replace(/[^\w\s]/g," ");
  return base.split(/\s+|_/).filter(Boolean)
    .map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join("");
}

export function normalizeAttrName(name="") {
  const base = RM_DIAC(TRIM(name)).replace(/[^\w\s]/g," ");
  const parts = base.split(/\s+|_/).filter(Boolean);
  if (!parts.length) return "campo";
  const [h, ...t] = parts;
  return h.toLowerCase() + t.map(w => w[0]?.toUpperCase() + w.slice(1).toLowerCase()).join("");
}

export function normalizeType(t="String") {
  const raw = TRIM(String(t));
  if (!raw) return "String";
  if (ALLOWED_TYPES.has(raw)) return raw;
  const key = NORM(raw).replace(/\s/g,"");
  const mapped = TYPE_SYNONYMS[key];
  if (mapped && ALLOWED_TYPES.has(mapped)) return mapped;
  const simple = raw[0]?.toUpperCase() + raw.slice(1).toLowerCase();
  return ALLOWED_TYPES.has(simple) ? simple : "String";
}

export function ensureCoherentAttrs(attrs=[]) {
  const map = new Map();
  for (const a of (attrs||[])) {
    if (!a || !a.name) continue;
    const name = normalizeAttrName(a.name);
    const type = normalizeType(a.type || "String");
    map.set(NORM(name), { name, type });
  }
  const id = map.get("id") || { name:"id", type:"Integer" };
  map.delete("id");
  return [id, ...Array.from(map.values())];
}

export function joinNameFor(aName="", bName="") {
  const clean = (s) => RM_DIAC(TRIM(s)).replace(/[^\w\s]/g,"").trim().replace(/\s+/g,"_").toLowerCase();
  const [x,y] = [clean(aName), clean(bName)].sort();
  return `${x}_${y}`;
}

export function cohereRelation({
  aName, bName, relKind="ASSOC", mA="1", mB="1", verb="", owning, direction
}) {
  const A = normalizeEntityName(aName);
  const B = normalizeEntityName(bName);
  const out = {
    aName:A, bName:B, relKind,
    mA: normalizeMultiplicity(mA),
    mB: normalizeMultiplicity(mB),
    verb: TRIM(verb),
  };
  switch (relKind) {
    case "INHERIT":
      out.mA = undefined; out.mB = undefined; out.direction="A->B"; break;
    case "DEPEND":
      out.mA = undefined; out.mB = undefined; out.direction=direction||"A->B"; break;
    case "AGGR":
    case "COMP":
      out.owning = (owning==="B") ? "B" : "A";
      if (!mA && !mB) {
        out.mA = (out.owning==="A") ? "1" : "1..*";
        out.mB = (out.owning==="A") ? "1..*" : "1";
      }
      break;
    default: break;
  }
  return out;
}

export function isSameEdge(a,b){
  if(!a||!b) return false;
  const sameDir = a.source===b.source && a.target===b.target;
  const sameBack= a.source===b.target && a.target===b.source;
  const sameKind=(a.data?.relKind||"")===(b.data?.relKind||"");
  const sameVerb=(a.data?.verb||"")===(b.data?.verb||"");
  const sameMult=
    normalizeMultiplicity(a.data?.mA)===normalizeMultiplicity(b.data?.mA) &&
    normalizeMultiplicity(a.data?.mB)===normalizeMultiplicity(b.data?.mB);
  return (sameKind && sameVerb && (sameDir||sameBack) && sameMult);
}

/* ================= Catálogo semántico ================= */
const TPL = {
  Venta: [
    ["numero","String"],["fecha","LocalDate"],["clienteId","Integer"],["clienteNombre","String"],
    ["vendedorId","Integer"],["moneda","String"],["subtotal","BigDecimal"],["descuento","BigDecimal"],
    ["impuesto","BigDecimal"],["total","BigDecimal"],["metodoPago","String"],["estado","String"],
    ["observaciones","Text"],["sucursalId","Integer"],["createdAt","LocalDateTime"],["updatedAt","LocalDateTime"]
  ],
  Producto: [
    ["codigo","String"],["nombre","String"],["descripcion","Text"],["precio","BigDecimal"],
    ["stock","Integer"],["unidad","String"],["marca","String"],["categoriaId","Integer"],
    ["activo","Boolean"],["createdAt","LocalDateTime"],["updatedAt","LocalDateTime"]
  ],
  Cliente: [
    ["nombre","String"],["apellido","String"],["documento","String"],["email","String"],
    ["telefono","String"],["direccion","Text"],["ciudad","String"],["pais","String"],
    ["activo","Boolean"],["createdAt","LocalDateTime"],["updatedAt","LocalDateTime"]
  ],
  Usuario: [
    ["username","String"],["email","String"],["hash","String"],["rol","String"],
    ["ultimoAcceso","LocalDateTime"],["activo","Boolean"],["createdAt","LocalDateTime"],["updatedAt","LocalDateTime"]
  ],
  Pedido: [
    ["numero","String"],["fecha","LocalDate"],["clienteId","Integer"],["estado","String"],
    ["subtotal","BigDecimal"],["impuesto","BigDecimal"],["total","BigDecimal"],["observaciones","Text"]
  ],
  Factura: [
    ["numero","String"],["fecha","LocalDate"],["monto","BigDecimal"],["moneda","String"],
    ["nit","String"],["razonSocial","String"],["autorizacion","String"],["control","String"]
  ],
  Pago: [
    ["fecha","LocalDate"],["monto","BigDecimal"],["moneda","String"],["metodo","String"],
    ["transaccion","String"],["estado","String"]
  ],
  Envio: [
    ["empresa","String"],["tracking","String"],["fechaEnvio","LocalDate"],["fechaEntrega","LocalDate"],
    ["estado","String"],["costo","BigDecimal"],["direccion","Text"]
  ],
  Inventario: [
    ["productoId","Integer"],["cantidad","Integer"],["ubicacion","String"],["lote","String"],
    ["fechaIngreso","LocalDate"],["fechaVencimiento","LocalDate"]
  ],
  Proveedor: [
    ["nombre","String"],["email","String"],["telefono","String"],["direccion","Text"],
    ["ciudad","String"],["pais","String"],["contacto","String"]
  ],
  Categoria: [
    ["nombre","String"],["descripcion","Text"],["padreId","Integer"],["activo","Boolean"]
  ]
};

const FALLBACK = [
  ["codigo","String"],["nombre","String"],["descripcion","Text"],["estado","String"],
  ["activo","Boolean"],["fechaCreacion","LocalDateTime"],["fechaActualizacion","LocalDateTime"],
  ["observaciones","Text"]
];

export function smartSuggestAttrs(entityName, count) {
  const key = normalizeEntityName(entityName);
  const base = TPL[key] || FALLBACK;
  const out = [];
  for (let i=0; i<base.length && out.length<count; i++) {
    out.push({ name: base[i][0], type: base[i][1] });
  }
  // si el usuario pide más de los definidos, extender con extras plausibles
  const extras = [
    ["comentarios","Text"],["etiqueta","String"],["prioridad","Integer"],
    ["createdBy","String"],["updatedBy","String"],["version","Integer"]
  ];
  for (let i=0; out.length<count && i<extras.length; i++) {
    out.push({ name: extras[i][0], type: extras[i][1] });
  }
  // aún faltan: generar razonables sin ser "atributo1"
  let k = 1;
  while (out.length < count) {
    out.push({ name: `campoExtra${k++}`, type: "String" });
  }
  return out;
}
