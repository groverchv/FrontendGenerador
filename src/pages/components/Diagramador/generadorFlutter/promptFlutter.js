// src/pages/components/Diagramador/generadorFlutter/promptFlutter.js
// Prompt para generar código Flutter con arquitectura MVC/GetX

export function buildFlutterPrompt(model, projectName, backendUrl = "http://localhost:8080") {
  const hint = JSON.stringify(model, null, 2);

  return `
Eres un generador de código Flutter a partir de un MODELO construido desde un diagrama UML.
Debes devolver ARCHIVOS DART COMPLETOS según el MODELO, con la arquitectura GetX y esta estructura exacta:

IMPORTANTE:
- NO incluyas markdown, ni comentarios fuera del JSON, ni bloques \`\`\`.
- Devuelve saltos de línea reales en los archivos (no dejes \\n literales).
- Usa GetX para navegación, gestión de estado y dependencias.
- Conecta con el backend en: ${backendUrl}/api
- Implementa CRUD completo para cada entidad.

────────────────────────────────────────────────────────────────────────
ESTRUCTURA DE CARPETAS (OBLIGATORIO)
────────────────────────────────────────────────────────────────────────
lib/
├── main.dart                    # Punto de inicio con GetMaterialApp
│
├── data/                        # Todo lo relacionado con datos
│   ├── api/
│   │   └── api_client.dart      # Configuración HTTP (dio/http)
│   ├── models/                  # Modelos de datos (*.dart)
│   └── services/                # Servicios API (CRUD)
│
├── ui/                          # Todo lo visual
│   ├── controllers/             # Controladores GetX
│   ├── pages/                   # Pantallas completas
│   └── widgets/                 # Componentes reutilizables
│       ├── global/              # Widgets globales (sidebar, navbar)
│       └── local/               # Widgets específicos de página
│
└── routes/                      # Navegación
    ├── app_pages.dart           # Rutas y bindings
    └── app_routes.dart          # Nombres de rutas constantes

────────────────────────────────────────────────────────────────────────
CONVENCIONES DE NOMBRES (OBLIGATORIO)
────────────────────────────────────────────────────────────────────────
- Archivos: snake_case.dart
- Clases: PascalCase
- Variables/funciones: camelCase
- Constantes: UPPER_SNAKE_CASE
- Rutas API: Nombre de la entidad en MINÚSCULA (sin espacios, sin guiones)

────────────────────────────────────────────────────────────────────────
ARCHIVOS A GENERAR (OBLIGATORIO)
────────────────────────────────────────────────────────────────────────

IMPORTANTE: Debes generar archivos para TODAS las entidades del modelo, incluyendo:
- Entidades principales
- Tablas intermedias (join tables) de relaciones N-M
- Total: Generar exactamente tantas vistas como entidades existan en el modelo

[1] lib/main.dart:
- import 'package:flutter/material.dart';
- import 'package:get/get.dart';
- import 'routes/app_pages.dart';
- import 'routes/app_routes.dart';
- void main() => runApp(MyApp());
- GetMaterialApp con:
  * title: "${projectName}"
  * initialRoute: AppRoutes.HOME
  * getPages: AppPages.pages
  * theme: ThemeData con primarySwatch: Colors.blue

[2] lib/data/api/api_client.dart:
- import 'package:http/http.dart' as http;
- import 'dart:convert';
- class ApiClient:
  * static const String baseUrl = "${backendUrl}/api";
  * Future<dynamic> get(String endpoint)
  * Future<dynamic> post(String endpoint, Map<String, dynamic> data)
  * Future<dynamic> put(String endpoint, int id, Map<String, dynamic> data)
  * Future<void> delete(String endpoint, int id)
  * Manejo de errores y parseo JSON

[3] lib/data/models/<entity>_model.dart (POR CADA ENTIDAD):
CRÍTICO: Genera un modelo para CADA entidad del diagrama, incluyendo:
- Entidades principales (Usuario, Producto, Categoria, etc.)
- Tablas intermedias de relaciones N-M (Producto_Catalogo, Usuario_Rol, etc.)

- class <Entity>Model con:
  * Atributos según el diagrama UML
  * Constructor con named parameters
  * factory <Entity>Model.fromJson(Map<String, dynamic> json)
  * Map<String, dynamic> toJson()
  * Relaciones como listas o referencias

[4] lib/data/services/<entity>_service.dart (POR CADA ENTIDAD):
CRÍTICO: Genera un servicio para CADA entidad del diagrama, incluyendo tablas intermedias.
Las tablas intermedias también necesitan CRUD completo.

- import '../api/api_client.dart';
- import '../models/<entity>_model.dart';
- class <Entity>Service:
  * final ApiClient _apiClient = ApiClient();
  * Future<List<<Entity>Model>> getAll()      # GET /<entity_lowercase>
  * Future<<Entity>Model> getById(int id)      # GET /<entity_lowercase>/{id}
  * Future<<Entity>Model> create(<Entity>Model entity) # POST /<entity_lowercase>
  * Future<<Entity>Model> update(int id, <Entity>Model entity) # PUT /<entity_lowercase>/{id}
  * Future<void> delete(int id)                # DELETE /<entity_lowercase>/{id}
  
CRÍTICO - RUTAS API (SIEMPRE EN MINÚSCULA):
- Toma el nombre de la entidad del diagrama y conviértelo a minúscula
- NO pluralices, solo minúscula
- Elimina espacios y guiones
- Ejemplo: "Producto" → ruta "producto"
- Ejemplo: "Usuario" → ruta "usuario"
- Ejemplo: "DetalleVenta" → ruta "detalleventa"
- Ejemplo: "Detalle Venta" → ruta "detalleventa"

[5] lib/ui/controllers/<entity>_controller.dart (POR CADA ENTIDAD):
CRÍTICO: Genera un controlador para CADA entidad, incluyendo tablas intermedias.

- import 'package:get/get.dart';
- import '../../data/models/<entity>_model.dart';
- import '../../data/services/<entity>_service.dart';
- class <Entity>Controller extends GetxController:
  * final <Entity>Service _service = <Entity>Service();
  * RxList<<Entity>Model> items = <List<<Entity>Model>>[].obs;
  * RxBool isLoading = false.obs;
  * Rx<<Entity>Model?> selectedItem = Rx<<Entity>Model?>(null);
  * @override void onInit() { super.onInit(); loadItems(); }
  * Future<void> loadItems()
  * Future<void> createItem(<Entity>Model item)
  * Future<void> updateItem(int id, <Entity>Model item)
  * Future<void> deleteItem(int id)
  * void selectItem(<Entity>Model item)

[6] lib/ui/pages/home_page.dart:
- import 'package:flutter/material.dart';
- import 'package:get/get.dart';
- import '../widgets/global/main_sidebar.dart';
- class HomePage extends StatelessWidget:
  * AppBar con título "${projectName}"
  * Drawer con MainSidebar
  * Body con:
    - Center con Column:
      * Icon(Icons.dashboard, size: 100, color: Colors.blue)
      * SizedBox(height: 20)
      * Text("Bienvenido a ${projectName}", style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold))
      * SizedBox(height: 10)
      * Text("Selecciona una opción del menú", style: TextStyle(fontSize: 16, color: Colors.grey))

[7] lib/ui/pages/<entity>_list_page.dart (POR CADA ENTIDAD):
CRÍTICO: Genera una página de lista para CADA entidad, incluyendo tablas intermedias.
Cada entidad debe tener su propia vista de lista con CRUD completo.

- import 'package:flutter/material.dart';
- import 'package:get/get.dart';
- import '../controllers/<entity>_controller.dart';
- import '../widgets/local/<entity>_form.dart';
- class <Entity>ListPage extends StatelessWidget:
  * AppBar con título "<Entity> List"
  * FloatingActionButton para crear nuevo
  * Obx con ListView.builder mostrando items
  * Card por cada item con:
    - Datos principales
    - IconButton para editar
    - IconButton para eliminar

[8] lib/ui/widgets/global/main_sidebar.dart:
CRÍTICO: El menú lateral debe incluir TODAS las entidades del modelo.
Si hay 6 entidades en el diagrama, debe haber 6 opciones en el menú.

- import 'package:flutter/material.dart';
- import 'package:get/get.dart';
- import '../../../routes/app_routes.dart';
- class MainSidebar extends StatelessWidget:
  * DrawerHeader con título "${projectName}"
  * ListTile para Home
  * Divider
  * ListTile por cada entidad navegando a su página de lista
  * INCLUIR tablas intermedias (Producto_Catalogo, etc.)

[9] lib/ui/widgets/local/<entity>_form.dart (POR CADA ENTIDAD):
CRÍTICO: Genera un formulario para CADA entidad, incluyendo tablas intermedias.
Las tablas intermedias necesitan formularios para gestionar las relaciones.

- import 'package:flutter/material.dart';
- import 'package:get/get.dart';
- import '../../controllers/<entity>_controller.dart';
- import '../../../data/models/<entity>_model.dart';
- class <Entity>Form extends StatefulWidget:
  * Formulario con TextFormField por cada atributo
  * GlobalKey<FormState> para validación
  * Botones para Guardar y Cancelar
  * Llamadas al controller para create/update

[10] lib/routes/app_routes.dart:
CRÍTICO: Define una ruta para CADA entidad.
Si hay 6 entidades, debe haber al menos 7 rutas (HOME + 6 entidades).

- abstract class AppRoutes:
  * static const HOME = '/';
  * static const <ENTITY>_LIST = '/<entity-kebab-case>-list';
  * Una constante por cada entidad (incluyendo tablas intermedias)

[11] lib/routes/app_pages.dart:
CRÍTICO: Define una página GetX para CADA entidad con su binding.
Si hay 6 entidades, debe haber 7 páginas (HomePage + 6 páginas de entidades).

- import 'package:get/get.dart';
- import '../ui/pages/home_page.dart';
- import '../ui/pages/<entity>_list_page.dart';
- import '../ui/controllers/<entity>_controller.dart';
- import 'app_routes.dart';
- class AppPages:
  * static final pages = [
      GetPage(name: AppRoutes.HOME, page: () => HomePage()),
      GetPage(
        name: AppRoutes.<ENTITY>_LIST,
        page: () => <Entity>ListPage(),
        binding: BindingsBuilder(() {
          Get.lazyPut(() => <Entity>Controller());
        }),
      ),
      ... para cada entidad (incluyendo tablas intermedias)
    ];

[12] pubspec.yaml:
name: ${projectName.toLowerCase().replace(/\s+/g, '_')}
description: Aplicación Flutter generada desde diagrama UML
version: 1.0.0+1
environment:
  sdk: '>=3.0.0 <4.0.0'
dependencies:
  flutter:
    sdk: flutter
  get: ^4.6.6
  http: ^1.1.0
dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0
flutter:
  uses-material-design: true

────────────────────────────────────────────────────────────────────────
REGLAS PARA LOS MODELOS
────────────────────────────────────────────────────────────────────────
CRÍTICO: Por cada clase del diagrama UML (incluyendo tablas intermedias), crear un <Entity>Model

1) Por cada clase del diagrama UML, crear un <Entity>Model
2) INCLUIR tablas intermedias de relaciones N-M como entidades completas
3) Atributos según el diagrama con tipos Dart apropiados:
   - String, int, double, bool, DateTime
3) Constructor con named parameters opcionales
4) fromJson y toJson para serialización
5) Para relaciones:
   - 1-1 o N-1: campo del tipo <OtherEntity>Model?
   - 1-N o N-M: List<<OtherEntity>Model>
6) Usar json['campo'] ?? defaultValue para valores seguros

────────────────────────────────────────────────────────────────────────
REGLAS PARA RELACIONES
────────────────────────────────────────────────────────────────────────
- ASSOC (1-1, 1-N, N-1): campo directo en el modelo
- NM_JOIN: entidad intermedia con dos relaciones N-1
- INHERIT: usar 'extends' en Dart (evitar si no es necesario)
- AGGR/COMP: tratar como asociación normal
- DEPEND: relación opcional unidireccional

────────────────────────────────────────────────────────────────────────
SALIDA (OBLIGATORIO)
────────────────────────────────────────────────────────────────────────
Devuelve un JSON PLANO con la clave "files" y rutas relativas desde lib/
Ejemplo:
{
  "files": {
    "lib/main.dart": "contenido aquí...",
    "lib/data/api/api_client.dart": "contenido...",
    "lib/data/models/user_model.dart": "contenido...",
    ...
    "pubspec.yaml": "contenido..."
  }
}

────────────────────────────────────────────────────────────────────────
MODELO (derivado del diagrama UML):
────────────────────────────────────────────────────────────────────────
${hint}

RECUERDA:
- TODOS los archivos deben estar completos y funcionales
- El código debe compilar sin errores
- La app debe mostrar "Bienvenido a ${projectName}" al iniciar
- CRUD completo para CADA entidad (incluyendo tablas intermedias)
- Navegación funcional con GetX
- Integración con backend en ${backendUrl}/api
- **CRÍTICO**: Si hay 6 entidades en el modelo, genera 6 vistas completas
- **CRÍTICO**: Las tablas intermedias también necesitan vistas de gestión
- **CRÍTICO**: Rutas API SIEMPRE en minúscula
  
EJEMPLOS DE RUTAS CORRECTAS EN SERVICES:

Entidad "Producto":
✅ CORRECTO: await _apiClient.get('producto');
✅ CORRECTO: await _apiClient.post('producto', data);
✅ CORRECTO: await _apiClient.put('producto', id, data);
✅ CORRECTO: await _apiClient.delete('producto', id);

Entidad "Usuario":
✅ CORRECTO: await _apiClient.get('usuario');
✅ CORRECTO: await _apiClient.post('usuario', data);

Entidad "DetalleVenta":
✅ CORRECTO: await _apiClient.get('detalleventa');
✅ CORRECTO: await _apiClient.post('detalleventa', data);

Entidad "ProductoCategoria":
✅ CORRECTO: await _apiClient.get('productocategoria');

ERRORES COMUNES A EVITAR:
❌ EVITAR: await _apiClient.get('Producto');      // NO mayúscula
❌ EVITAR: await _apiClient.get('productos');     // NO plural
❌ EVITAR: await _apiClient.get('detalle_venta'); // NO snake_case
❌ EVITAR: await _apiClient.get('DetalleVenta');  // NO PascalCase

REGLA SIMPLE: nombreEntidad.toLowerCase().replace(/[^a-z0-9]/g, '')
`;



}
