// src/views/proyectos/Diagramador/generador/promt.js
// Prompt ESTRICTO: genera Model/Repository/Service/Controller/Config a partir del MODELO del diagrama UML.
// Paquetes: <packageBase>.Model / Repository / Service / Controller / Config

export function buildPrompt(model, skipPaths = []) {
  const hint = JSON.stringify(model, null, 2);

  const skipNote = skipPaths.length
    ? `- NO generes también estas rutas (ya existen y debes omitirlas):
${skipPaths.map((p) => "  - " + p).join("\n")}
`
    : "";

  return `
Eres un generador de código Spring Boot 3 (Java 21) a partir de un MODELO construido desde un diagrama UML.
Debes devolver ARCHIVOS JAVA COMPLETOS según el MODELO, con esta estructura de paquetes y rutas Maven exacta.
IMPORTANTE:
- NO incluyas markdown, ni comentarios fuera del JSON, ni bloques \`\`\`.
- Devuelve saltos de línea reales en los archivos (no dejes \\n literales).

- package "<packageBase>.Model"        -> JPA Entities (<Nombre>Entity) con atributos y relaciones
- package "<packageBase>.Repository"   -> interface <Nombre>Repository extends JpaRepository<<Nombre>Entity, <IdType>> con @Repository
- package "<packageBase>.Service"      -> clase @Service <Nombre>Service (usa @Autowired field injection)
- package "<packageBase>.Controller"   -> clase @RestController <Nombre>Controller (usa @Autowired field injection)
- package "<packageBase>.Config"       -> clase @Configuration CorsConfig (CORS global, abierto para "/api/**")

La salida DEBE ser un JSON PLANO con la clave "files" y paths relativos Maven (sin texto extra ni markdown).

${skipNote}

────────────────────────────────────────────────────────────────────────
CONVENCIONES DE NOMBRES (OBLIGATORIO)
────────────────────────────────────────────────────────────────────────
- <pkgPath> = <packageBase> reemplazando '.' por '/'.
- <snake_case> para tablas y endpoints: minúsculas + guión bajo (plural cuando aplique).
- Clase entidad: <Nombre>Entity (PascalCase).
- Endpoints base "/api" + "/<snake>".

────────────────────────────────────────────────────────────────────────
CHECKLIST DE IMPORTS (OBLIGATORIO, SIN COMODINES)
────────────────────────────────────────────────────────────────────────
REGLA GENERAL:
- IMPORTA TODO lo que se use (sin comodines, sin duplicados).
- Usa **jakarta.persistence** (Spring Boot 3) y Lombok (@Data, @NoArgsConstructor, @AllArgsConstructor, @ToString).

[MODEL]:
- Siempre: Entity, Table, Id, GeneratedValue, GenerationType.
- Relaciones por multiplicidad:
  - N–1 (1..* vs 1): @ManyToOne con @JoinColumn en el lado N; @OneToMany(mappedBy="...") en el lado 1.
  - 1–1: @OneToOne; el dueño lleva @JoinColumn.
  - N–M: **SIEMPRE** entidad intermedia (prohibido @ManyToMany):
    * <JoinEntity> con @Entity @Table(name="<a>_<b>") e id Long @GeneratedValue(IDENTITY)
    * Campos: @ManyToOne @JoinColumn(name="<a>_id") hacia <A>Entity y lo mismo con B
    * En A y B: @OneToMany(mappedBy="<campoEnJoin>") List<<JoinEntity>>
- Colecciones: java.util.List; inicializarlas con new ArrayList<>().
- Evita recursión en @ToString con @ToString.Exclude en colecciones.

[REPOSITORY] (package <packageBase>.Repository):
- org.springframework.data.jpa.repository.JpaRepository
- org.springframework.stereotype.Repository

[SERVICE] (package <packageBase>.Service):
- org.springframework.stereotype.Service
- org.springframework.beans.factory.annotation.Autowired
- Importa Repository y Entity.
- Métodos CRUD en español:
  List<<Nombre>Entity> listar<NombrePlural>();
  <Nombre>Entity guardarDatos(<Nombre>Entity x);
  <Nombre>Entity buscar<Nombre>PorId(<IdType> id);
  void eliminar<Nombre>(<IdType> id);

[CONTROLLER] (package <packageBase>.Controller):
- org.springframework.web.bind.annotation.RestController
- org.springframework.web.bind.annotation.RequestMapping
- org.springframework.beans.factory.annotation.Autowired
- org.springframework.web.bind.annotation.GetMapping, PostMapping, PutMapping, DeleteMapping
- org.springframework.web.bind.annotation.PathVariable, RequestBody
- java.util.List
- Rutas REST:
  GET    /<snake>           -> obtener<NombrePlural>()
  POST   /<snake>           -> agregar<Nombre>()
  GET    /<snake>/{id}      -> buscarPorId()
  PUT    /<snake>/{id}      -> modificar<Nombre>()
  DELETE /<snake>/{id}      -> delete<Nombre>()

[CONFIG] (package <packageBase>.Config):
- org.springframework.context.annotation.Configuration
- org.springframework.web.servlet.config.annotation.WebMvcConfigurer
- org.springframework.web.servlet.config.annotation.CorsRegistry
- Clase CorsConfig con addCorsMappings() y configuración abierta para "/api/**".

────────────────────────────────────────────────────────────────────────
RELACIONES AVANZADAS (OBLIGATORIO)
────────────────────────────────────────────────────────────────────────
El campo "relations" del modelo puede traer "kind":
- "ASSOC": asociación normal, respeta mA/mB.
- "NM_JOIN": relación muchos-a-muchos con **entidad intermedia** listada en "joins".
- "INHERIT": herencia. El B es la clase base; el A extiende a B.
  - Anotar la clase base con @Inheritance(strategy = <inheritStrategy>) donde inheritStrategy ∈ {"JOINED","SINGLE_TABLE","TABLE_PER_CLASS"}.
- "AGGR": agregación. Implementar como asociación con dueño en "owning" ("A" o "B").
  - Recomendado: cascade {PERSIST, MERGE}; orphanRemoval=false.
- "COMP": composición. Igual que AGGR pero **cascade = ALL** y **orphanRemoval = true** en el lado dueño.
- "DEPEND": dependencia (uso). Genera relación unidireccional ligera:
  - Por defecto, un @ManyToOne opcional desde A hacia B sin recíproco.

Si viene "verb" es documental; no afecta el mapeo, sólo comentarios Javadoc.
Si vienen "cascade"/"orphanRemoval", respétalos.

────────────────────────────────────────────────────────────────────────
REGLAS PARA LAS ENTIDADES
────────────────────────────────────────────────────────────────────────
1) package: <packageBase>.Model
2) Anotaciones en orden:
   @Entity
   @Data
   @NoArgsConstructor
   @AllArgsConstructor
   @ToString
   @Table(name = "<snake_case>")
3) Campo id:
   @Id @GeneratedValue(strategy = GenerationType.IDENTITY) <IdType> id;
   Si no está definido el tipo, usar Long.
4) Las clases deben compilar sin referencias faltantes.

────────────────────────────────────────────────────────────────────────
MODELO (derivado del diagrama UML):
────────────────────────────────────────────────────────────────────────
${hint}
`;
}
