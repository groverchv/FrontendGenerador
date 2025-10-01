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
Debes devolver ARCHIVOS JAVA COMPLETOS según el MODELO, con esta estructura:

- package "<packageBase>.Model"        -> JPA Entities (<Nombre>Entity) con atributos y relaciones
- package "<packageBase>.Repository"   -> interface <Nombre>Repository extends JpaRepository<<Nombre>Entity, <IdType>>
- package "<packageBase>.Service"      -> clase @Service <Nombre>Service (usa @Autowired field injection)
- package "<packageBase>.Controller"   -> clase @RestController <Nombre>Controller (usa @Autowired field injection)
- package "<packageBase>.Config"       -> clase @Configuration CorsConfig (CORS global)

La salida DEBE ser un JSON PLANO con la clave "files" y paths relativos Maven:

{
  "files": {
    "src/main/java/<pkgPath>/Model/<Nombre>Entity.java": "CONTENIDO",
    "src/main/java/<pkgPath>/Repository/<Nombre>Repository.java": "CONTENIDO",
    "src/main/java/<pkgPath>/Service/<Nombre>Service.java": "CONTENIDO",
    "src/main/java/<pkgPath>/Controller/<Nombre>Controller.java": "CONTENIDO",
    "src/main/java/<pkgPath>/Config/CorsConfig.java": "CONTENIDO"
  }
}

NO uses bloques Markdown, ni texto adicional. SOLO el JSON.

${skipNote}

────────────────────────────────────────────────────────────────────────
CHECKLIST DE IMPORTS (OBLIGATORIO, SIN COMODINES)
────────────────────────────────────────────────────────────────────────
REGLA GENERAL:
- IMPORTA TODO lo que se use (ni más ni menos). Sin duplicados. Sin comodines.

[MODEL] (package <packageBase>.Model):
- Siempre: Entity, Table, Id, GeneratedValue, GenerationType, Lombok (@Data, @NoArgsConstructor, @AllArgsConstructor, @ToString).
- Relaciones según el diagrama (multiplicidades mA/mB):
  - N–1: @ManyToOne con @JoinColumn en el lado N; @OneToMany(mappedBy="...") en el lado 1.
  - 1–1: @OneToOne, con JoinColumn en el dueño.
  - N–M: si existe joinTable detectada en el diagrama, genera la entidad intermedia; si no, usa @ManyToMany + @JoinTable.
- Colecciones: import java.util.List; import java.util.ArrayList;
- Tipos: LocalDate, LocalDateTime, BigDecimal, UUID, según atributos.
- Si hay relaciones bidireccionales: importa lombok.ToString.Exclude en la colección.

[REPOSITORY]:
- JpaRepository y opcionalmente @Repository.

[SERVICE] — estilo del usuario:
- import org.springframework.stereotype.Service;
- import org.springframework.beans.factory.annotation.Autowired;
- Importa Repository y Entity.
- Métodos CRUD en español, devolviendo entidades directamente (sin DTOs):
  List<<Nombre>Entity> listar<NombrePlural>();
  <Nombre>Entity guardarDatos(<Nombre>Entity x);
  <Nombre>Entity buscar<Nombre>PorId(<IdType> id); // debe retornar entidad o null
  void eliminar<Nombre>(<IdType> id);

[CONTROLLER] — estilo del usuario:
- @RestController @RequestMapping("/api")
- import org.springframework.beans.factory.annotation.Autowired;
- Importa Service, Entity, java.util.List.
- Endpoints REST en snake_case, sin DTOs:
  GET    /<snake>           -> obtener<NombrePlural>()
  POST   /<snake>           -> agregar<Nombre>()
  GET    /<snake>/{id}      -> buscarPorId()
  PUT    /<snake>/{id}      -> modificar<Nombre>() // carga por id, copia campos del body (excepto id), guarda y devuelve
  DELETE /<snake>/{id}      -> delete<Nombre>()

[CONFIG]:
- CorsConfig en package <packageBase>.Config
- @Configuration + implementa WebMvcConfigurer
- addCorsMappings(): permite orígenes *, todos los métodos, headers *, expone "Location", maxAge=3600, allowCredentials(false).

────────────────────────────────────────────────────────────────────────
REGLAS PARA LAS ENTIDADES (basadas en el diagrama)
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
   (usar Integer o Long por defecto si el tipo no está definido en el diagrama)
5) Atributos: según nodos/attrs del diagrama (tipos: String, Integer, Long, Double, BigDecimal, Boolean, LocalDate, LocalDateTime, UUID).
6) Relaciones: deducidas de los edges del diagrama (usa mA/mB y relType para definir @OneToMany, @ManyToOne, etc).
7) Si el diagrama detecta join entity (dos *_id), genera esa entidad como tabla intermedia.

────────────────────────────────────────────────────────────────────────
NORMAS GENERALES
────────────────────────────────────────────────────────────────────────
- El código debe seguir el estilo del usuario (sin DTOs, field injection con @Autowired).
- Todos los nombres coherentes con el diagrama.
- No generes POM, Application ni properties (ya existen).
- Prohibido imports comodín. Sin duplicados. Sin imports no usados.

────────────────────────────────────────────────────────────────────────
MODELO (derivado del diagrama UML):
────────────────────────────────────────────────────────────────────────
${hint}
`;
}
