// generador/promt.js
// Prompt ESTRICTO: genera Model/Repository/Service/Controller/Config a partir del MODELO del diagrama UML.
// Paquetes: <packageBase>.Model / Repository / Service / Controller / Config
export function buildPrompt(model, skipPaths = []) {
  const hint = JSON.stringify(model, null, 2);

  const skipNote = skipPaths.length
    ? `- NO generes también estas rutas (ya existen y debes omitirlas):
${skipPaths.map(p => "  - " + p).join("\n")}
`
    : "";

  return `
Eres un generador de código Spring Boot 3 (Java 21) a partir de un MODELO construido desde un diagrama UML.
Debes devolver ARCHIVOS JAVA COMPLETOS según el MODELO, con esta estructura de paquetes y rutas Maven exacta:

- package "<packageBase>.Model"        -> JPA Entities (<Nombre>Entity) con atributos y relaciones
- package "<packageBase>.Repository"   -> interface <Nombre>Repository extends JpaRepository<<Nombre>Entity, <IdType>> con @Repository
- package "<packageBase>.Service"      -> clase @Service <Nombre>Service (usa @Autowired field injection)
- package "<packageBase>.Controller"   -> clase @RestController <Nombre>Controller (usa @Autowired field injection)
- package "<packageBase>.Config"       -> clase @Configuration CorsConfig (CORS global)

La salida DEBE ser un JSON PLANO con la clave "files" y paths relativos Maven (sin texto extra ni markdown):

{
  "files": {
    "src/main/java/<pkgPath>/Model/<Nombre>Entity.java": "CONTENIDO",
    "src/main/java/<pkgPath>/Repository/<Nombre>Repository.java": "CONTENIDO",
    "src/main/java/<pkgPath>/Service/<Nombre>Service.java": "CONTENIDO",
    "src/main/java/<pkgPath>/Controller/<Nombre>Controller.java": "CONTENIDO",
    "src/main/java/<pkgPath>/Config/CorsConfig.java": "CONTENIDO"
  }
}

${skipNote}

────────────────────────────────────────────────────────────────────────
CONVENCIONES DE NOMBRES (OBLIGATORIO)
────────────────────────────────────────────────────────────────────────
- <pkgPath> = <packageBase> reemplazando '.' por '/'.
- <snake_case> para tablas y endpoints: pasar el nombre de la entidad a minúsculas y snake_case; pluralizar agregando 's' (o usando el plural indicado en el modelo si existe).
  Ej.: Usuario -> "usuario" (tabla "usuario", endpoint "/usuario"); RolUsuario -> "rol_usuario".
- Nombre de clase entidad: <Nombre>Entity (PascalCase).
- Endpoints del controlador: base "/api" y recursos en "/<snake>" (plural recomendado si el modelo lo indica).

────────────────────────────────────────────────────────────────────────
CHECKLIST DE IMPORTS (OBLIGATORIO, SIN COMODINES)
────────────────────────────────────────────────────────────────────────
REGLA GENERAL:
- IMPORTA TODO lo que se use (ni más ni menos). Sin duplicados. Sin comodines.
- Usa **jakarta.persistence** (Spring Boot 3).

[MODEL] (package <packageBase>.Model):
- Siempre: jakarta.persistence.Entity, Table, Id, GeneratedValue, GenerationType.
- Lombok: lombok.Data, lombok.NoArgsConstructor, lombok.AllArgsConstructor, lombok.ToString.
- Relaciones (según multiplicidades mA/mB):
  - N–1 (1..* vs 1): @ManyToOne con @JoinColumn en el lado N; @OneToMany(mappedBy="...") en el lado 1.
  - 1–1: @OneToOne; el dueño lleva @JoinColumn.
  - N–M: **SIEMPRE** generar ENTIDAD INTERMEDIA. Prohibido @ManyToMany.
    * Crear <JoinEntity>:
      - @Entity @Table(name="<a>_<b>")
      - id Long con @Id @GeneratedValue(strategy = GenerationType.IDENTITY)
      - @ManyToOne @JoinColumn(name="<a>_id") hacia <A>Entity
      - @ManyToOne @JoinColumn(name="<b>_id") hacia <B>Entity
      - Añadir atributos extra si vienen en el modelo/meta (p.ej., cantidad, precio_unitario).
    * En <A>Entity y <B>Entity: @OneToMany(mappedBy="<campoEnJoin>") List<<JoinEntity>> ...
- Colecciones: java.util.List; inicializa con new ArrayList<>() si procede.
- Tipos de atributos admitidos: String, Integer, Long, Double, BigDecimal, Boolean, LocalDate, LocalDateTime, UUID.
- Si hay relaciones bidireccionales: usa @ToString.Exclude en las colecciones para evitar recursion.

[REPOSITORY] (package <packageBase>.Repository):
- org.springframework.data.jpa.repository.JpaRepository
- org.springframework.stereotype.Repository

[SERVICE] — estilo del usuario (package <packageBase>.Service):
- org.springframework.stereotype.Service
- org.springframework.beans.factory.annotation.Autowired
- Importa Repository y Entity.
- Métodos CRUD en español, devolviendo entidades:
  List<<Nombre>Entity> listar<NombrePlural>();
  <Nombre>Entity guardarDatos(<Nombre>Entity x);
  <Nombre>Entity buscar<Nombre>PorId(<IdType> id); // retorna entidad o null
  void eliminar<Nombre>(<IdType> id);

[CONTROLLER] — estilo del usuario (package <packageBase>.Controller):
- org.springframework.web.bind.annotation.RestController
- org.springframework.web.bind.annotation.RequestMapping
- org.springframework.beans.factory.annotation.Autowired
- org.springframework.web.bind.annotation.GetMapping, PostMapping, PutMapping, DeleteMapping
- org.springframework.web.bind.annotation.PathVariable, RequestBody
- java.util.List
- Rutas REST (snake_case, sin DTOs):
  GET    /<snake>           -> obtener<NombrePlural>()
  POST   /<snake>           -> agregar<Nombre>()
  GET    /<snake>/{id}      -> buscarPorId()
  PUT    /<snake>/{id}      -> modificar<Nombre>() // cargar por id, copiar campos del body (excepto id), guardar y devolver
  DELETE /<snake>/{id}      -> delete<Nombre>()

[CONFIG] (package <packageBase>.Config):
- org.springframework.context.annotation.Configuration
- org.springframework.web.servlet.config.annotation.WebMvcConfigurer
- org.springframework.web.servlet.config.annotation.CorsRegistry
- Clase CorsConfig implementa WebMvcConfigurer y en addCorsMappings() debe:
  - registry.addMapping("/api/**")
  - allowedOrigins("*")
  - allowedMethods("GET","POST","PUT","DELETE","PATCH","OPTIONS")
  - allowedHeaders("*")
  - exposedHeaders("Location")
  - maxAge(3600)
  - allowCredentials(false)

────────────────────────────────────────────────────────────────────────
REGLAS PARA LAS ENTIDADES (derivadas del diagrama)
────────────────────────────────────────────────────────────────────────
1) package: <packageBase>.Model
2) Anotaciones en este orden:
   @Entity
   @Data
   @NoArgsConstructor
   @AllArgsConstructor
   @ToString
   @Table(name = "<snake_case>")
3) Clase: <Nombre>Entity
4) Campo id:
   @Id
   @GeneratedValue(strategy = GenerationType.IDENTITY)
   <IdType> id;
   - Si el tipo del id no está definido: usar Long.
5) Atributos: según el diagrama (tipos de la lista soportada).
6) Relaciones:
   - 1–N / N–1 y 1–1 según las reglas anteriores.
   - N–M: genera SIEMPRE la entidad intermedia (<JoinEntity>), NUNCA @ManyToMany.
     * Nombre por defecto: concatenación PascalCase de las dos entidades (p.ej., PedidoProducto).
     * Tabla por defecto: snake_case combinando ambas (p.ej., "pedido_producto").
     * Campos en la join: referencias ManyToOne hacia cada lado (p.ej., 'pedido', 'producto').
7) Inicializa colecciones con new ArrayList<>() cuando corresponda.
8) Por cada entidad (incluida la intermedia) genera Repository, Service y Controller.

────────────────────────────────────────────────────────────────────────
NORMAS GENERALES
────────────────────────────────────────────────────────────────────────
- Sin DTOs, field injection con @Autowired.
- Nombres coherentes con el diagrama (clases en PascalCase; tablas y endpoints en snake_case).
- No generes POM, Application ni application.properties.
- Prohibidos imports comodín. Sin duplicados. Sin imports no usados.
- Los archivos deben compilar sin depender de clases no definidas.
- Si un archivo ya fue indicado en "skipPaths", NO lo generes.

────────────────────────────────────────────────────────────────────────
MODELO (derivado del diagrama UML):
────────────────────────────────────────────────────────────────────────
${hint}
`;
}
