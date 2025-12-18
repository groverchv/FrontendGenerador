// src/pages/components/Diagramador/generadorFlutter/promptFlutter.js
// Prompt para generar código Flutter con arquitectura MVC/GetX

export function buildFlutterPrompt(model, projectName, backendUrl = "http://localhost:8080") {
  const hint = JSON.stringify(model, null, 2);

  return `
Eres un generador de código Flutter a partir de un MODELO construido desde un diagrama UML.
Debes devolver ARCHIVOS DART COMPLETOS según el MODELO, con la arquitectura GetX y esta estructura exacta:

IMPORTANTE - REGLAS OBLIGATORIAS PARA CÓDIGO SIN ERRORES:
- NO incluyas markdown, ni comentarios fuera del JSON, ni bloques \`\`\`.
- Devuelve saltos de línea reales en los archivos (no dejes \\n literales).
- Usa GetX para navegación, gestión de estado y dependencias.
- Conecta con el backend en: ${backendUrl}/api
- Implementa CRUD completo para cada entidad.
- USA 'const' en constructores de widgets cuando sea posible.
- Usa 'super.key' en constructores: const MyWidget({super.key});
- IMPORTA todos los archivos necesarios al inicio de cada archivo.
- El código debe compilar SIN ERRORES con: flutter pub get && flutter run

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
  * Scaffold con:
    - backgroundColor: Colors.grey[50]
    - AppBar profesional con:
      * backgroundColor: Colors.transparent
      * elevation: 0
      * iconTheme: IconThemeData(color: Theme.of(context).primaryColor)
      * title: Text("${projectName}", style: TextStyle(color: Colors.black87, fontWeight: FontWeight.w600))
      * centerTitle: true
    - Drawer con MainSidebar (ancho: 280)
    - Body con SafeArea y:
      * Padding(all: 24)
      * Column con mainAxisAlignment.center y crossAxisAlignment.center:
        - Container decorado con:
          * decoration: BoxDecoration(
              color: Theme.of(context).primaryColor.withOpacity(0.1),
              shape: BoxShape.circle)
          * padding: EdgeInsets.all(32)
          * child: Icon(Icons.dashboard_rounded, size: 80, color: Theme.of(context).primaryColor)
        - SizedBox(height: 32)
        - Text("Bienvenido a ${projectName}", style: TextStyle(
            fontSize: 28, fontWeight: FontWeight.bold, color: Colors.black87))
        - SizedBox(height: 12)
        - Text("Gestiona tus datos de manera eficiente", style: TextStyle(
            fontSize: 16, color: Colors.grey[600]))
        - SizedBox(height: 48)
        - Wrap con spacing: 16 y runSpacing: 16 con Card de estadísticas:
          * _buildStatCard("Total Registros", "0", Icons.storage_rounded, Colors.blue)
          * _buildStatCard("Entidades", "X", Icons.category_rounded, Colors.green)
          * _buildStatCard("Última Actualización", "Ahora", Icons.access_time_rounded, Colors.orange)
  * Widget _buildStatCard(String title, String value, IconData icon, Color color):
    - Card con:
      * elevation: 0
      * shape: RoundedRectangleBorder(borderRadius: 16)
      * color: color.withOpacity(0.1)
      * child: Padding(all: 20) con Column:
        - Icon(icon, size: 40, color: color)
        - SizedBox(height: 12)
        - Text(value, style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold, color: color))
        - Text(title, style: TextStyle(fontSize: 14, color: Colors.grey[600]))

[7] lib/ui/pages/<entity>_list_page.dart (POR CADA ENTIDAD):
CRÍTICO: Genera una página de lista para CADA entidad, incluyendo tablas intermedias.
Cada entidad debe tener su propia vista de lista con CRUD completo y UI/UX PROFESIONAL.

- import 'package:flutter/material.dart';
- import 'package:get/get.dart';
- import '../controllers/<entity>_controller.dart';
- import '../widgets/local/<entity>_form.dart';
- class <Entity>ListPage extends StatelessWidget:
  * Scaffold con:
    - AppBar moderno con:
      * título estilizado con Text style (fontWeight: FontWeight.w600, fontSize: 20)
      * centerTitle: true
      * elevation: 0
      * backgroundColor: Theme.of(context).primaryColor
      * actions: IconButton(Icons.refresh) para recargar datos
    - Body con:
      * Padding general de 16
      * Column con:
        - Row con título y contador de registros
        - SizedBox(height: 16)
        - TextField de búsqueda con decoration:
          * prefixIcon: Icons.search
          * hintText: "Buscar..."
          * border: OutlineInputBorder con borderRadius: 12
          * filled: true, fillColor: Colors.grey[100]
        - SizedBox(height: 16)
        - Expanded con Obx:
          * Si isLoading: Center(CircularProgressIndicator())
          * Si items.isEmpty: EmptyState widget con icono y texto
          * Si hay datos: ListView.builder con separatorBuilder
    - FloatingActionButton.extended:
      * onPressed: showCreateDialog
      * icon: Icons.add
      * label: Text("Nuevo")
      * backgroundColor: Theme.of(context).primaryColor
  * Card profesional por cada item:
    - margin: EdgeInsets.symmetric(vertical: 8)
    - elevation: 2
    - shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))
    - child: Padding con:
      * ListTile con:
        - leading: CircleAvatar con inicial del nombre o icono
        - title: texto principal con fontWeight.w600
        - subtitle: datos secundarios en gris
        - trailing: Row con:
          * IconButton(Icons.edit_outlined, color: Colors.blue)
          * IconButton(Icons.delete_outline, color: Colors.red)
  * Diálogos modales para crear/editar con:
    - AlertDialog con shape: RoundedRectangleBorder(borderRadius: 16)
    - title con icono y texto
    - content: SingleChildScrollView con formulario
    - actions: TextButton "Cancelar" y ElevatedButton "Guardar"
  * Confirmación para eliminar con:
    - showDialog con AlertDialog de confirmación
    - Icono de advertencia
    - Texto descriptivo
    - Botones "Cancelar" y "Eliminar" con colores apropiados

[8] lib/ui/widgets/global/main_sidebar.dart:
CRÍTICO: El menú lateral debe incluir TODAS las entidades del modelo.
Si hay 6 entidades en el diagrama, debe haber 6 opciones en el menú.
El diseño debe ser PROFESIONAL y MODERNO.

- import 'package:flutter/material.dart';
- import 'package:get/get.dart';
- import '../../../routes/app_routes.dart';
- class MainSidebar extends StatelessWidget:
  * @override build(BuildContext context):
    - Container con:
      * width: 280
      * color: Colors.white
      * child: SafeArea con:
        - Column con children:
          * Container con DrawerHeader profesional:
            - decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Theme.of(context).primaryColor, Theme.of(context).primaryColor.withOpacity(0.8)],
                  begin: Alignment.topLeft, end: Alignment.bottomRight))
            - child: Column con crossAxisAlignment.start:
              * CircleAvatar(radius: 30, backgroundColor: Colors.white, 
                  child: Icon(Icons.apps_rounded, size: 30, color: Theme.of(context).primaryColor))
              * SizedBox(height: 12)
              * Text("${projectName}", style: TextStyle(
                  color: Colors.white, fontSize: 20, fontWeight: FontWeight.bold))
              * Text("Panel de Administración", style: TextStyle(
                  color: Colors.white70, fontSize: 14))
          * Expanded con SingleChildScrollView y Column:
            - _buildMenuItem(context, Icons.home_rounded, "Inicio", AppRoutes.HOME, isSelected: Get.currentRoute == AppRoutes.HOME)
            - Padding(horizontal: 16, vertical: 8, child: Text("ENTIDADES", 
                style: TextStyle(color: Colors.grey[600], fontSize: 12, fontWeight: FontWeight.w600, letterSpacing: 1)))
            - ListTile por cada entidad con _buildMenuItem:
              * leading: Container con decoración circular y icono apropiado
              * title: nombre de la entidad
              * trailing: Icon(Icons.chevron_right)
              * onTap: Get.toNamed(AppRoutes.<ENTITY>_LIST)
              * tileColor según si está seleccionado
            - INCLUIR tablas intermedias (Producto_Catalogo, etc.)
          * Divider()
          * Padding con _buildMenuItem para "Cerrar Sesión" con Icons.logout_rounded
  * Widget _buildMenuItem(context, IconData icon, String title, String route, {bool isSelected = false}):
    - Padding(horizontal: 8, vertical: 2) con:
      * InkWell con borderRadius: 12 y onTap: () => Get.toNamed(route):
        - Container con:
          * padding: EdgeInsets.symmetric(horizontal: 16, vertical: 12)
          * decoration: BoxDecoration(
              color: isSelected ? Theme.of(context).primaryColor.withOpacity(0.1) : null,
              borderRadius: BorderRadius.circular(12))
          * child: Row con:
            - Icon(icon, color: isSelected ? Theme.of(context).primaryColor : Colors.grey[700], size: 22)
            - SizedBox(width: 16)
            - Text(title, style: TextStyle(
                color: isSelected ? Theme.of(context).primaryColor : Colors.grey[800],
                fontWeight: isSelected ? FontWeight.w600 : FontWeight.w500,
                fontSize: 15))

[9] lib/ui/widgets/local/<entity>_form.dart (POR CADA ENTIDAD):
CRÍTICO: Genera un formulario para CADA entidad, incluyendo tablas intermedias.
Las tablas intermedias necesitan formularios para gestionar las relaciones.
El formulario debe tener UI/UX PROFESIONAL Y MODERNO.

- import 'package:flutter/material.dart';
- import 'package:get/get.dart';
- import '../../controllers/<entity>_controller.dart';
- import '../../../data/models/<entity>_model.dart';
- class <Entity>Form extends StatefulWidget:
  * @override createState() => _<Entity>FormState()
- class _<Entity>FormState extends State<<Entity>Form>:
  * GlobalKey<FormState> _formKey = GlobalKey<FormState>();
  * TextEditingController por cada atributo editable
  * bool _isLoading = false;
  * @override initState() inicializa controllers con valores existentes si edita
  * @override dispose() limpia todos los controllers
  * @override build(BuildContext context):
    - Form con key y autovalidateMode.onUserInteraction
    - Column con mainAxisSize.min y children:
      * Por cada campo:
        - Padding(vertical: 8)
        - TextFormField con:
          * controller: correspondiente
          * decoration: InputDecoration con:
            - labelText: nombre del campo
            - hintText: "Ingrese el valor"
            - prefixIcon: Icon apropiado según tipo de dato
              (Icons.person para nombres, Icons.numbers para números, etc.)
            - border: OutlineInputBorder(borderRadius: 12)
            - focusedBorder: OutlineInputBorder con color primario
            - filled: true, fillColor: Colors.grey[50]
            - contentPadding: EdgeInsets.symmetric(horizontal: 16, vertical: 16)
          * keyboardType: apropiado (text, number, email, etc.)
          * validator: validación requerida
          * textInputAction: TextInputAction.next (último: done)
      * SizedBox(height: 24)
      * Row con mainAxisAlignment.end y children:
        - TextButton con:
          * style: TextButton.styleFrom(padding: EdgeInsets.symmetric(h: 24, v: 12))
          * child: Text("Cancelar")
          * onPressed: Navigator.pop(context)
        - SizedBox(width: 12)
        - ElevatedButton con:
          * style: ElevatedButton.styleFrom(
              padding: EdgeInsets.symmetric(h: 32, v: 12),
              shape: RoundedRectangleBorder(borderRadius: 8))
          * child: _isLoading 
              ? SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white))
              : Text("Guardar")
          * onPressed: _isLoading ? null : _submitForm
  * Future<void> _submitForm():
    - if (!_formKey.currentState!.validate()) return;
    - setState(() => _isLoading = true);
    - Crear modelo con valores de controllers
    - Llamar controller.createItem o updateItem según corresponda
    - Navigator.pop(context) al completar
    - Manejo de errores con ScaffoldMessenger.showSnackBar

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

────────────────────────────────────────────────────────────────────────
UI/UX DESIGN GUIDELINES (OBLIGATORIO)
────────────────────────────────────────────────────────────────────────
El código Flutter generado debe seguir estas pautas de diseño profesional:

COLORES Y TEMA:
- Usar ThemeData consistente en toda la app
- primarySwatch: Colors.blue o color personalizado
- Fondos claros: Colors.grey[50] o Colors.white
- Acentos sutiles para estados activos/seleccionados
- Gradientes suaves para headers y elementos destacados

TIPOGRAFÍA:
- Títulos principales: fontSize 24-28, fontWeight.bold
- Subtítulos: fontSize 18-20, fontWeight.w600
- Texto normal: fontSize 14-16, fontWeight.normal
- Labels/captions: fontSize 12-14, Colors.grey[600]

ESPACIADO:
- Padding consistente de 16-24 para contenedores principales
- SizedBox(height: 8-16) entre elementos relacionados
- SizedBox(height: 24-32) entre secciones

CARDS Y CONTENEDORES:
- BorderRadius.circular(12-16) para esquinas redondeadas
- Elevation 0-2 para sombras sutiles
- Usar Container con BoxDecoration para bordes personalizados
- Separar visualmente grupos de información

FORMULARIOS:
- InputDecoration con bordes OutlineInputBorder
- filled: true con fillColor: Colors.grey[50]
- prefixIcon relevantes para cada tipo de campo
- Validación en tiempo real con autovalidateMode
- Mensajes de error claros y descriptivos

LISTAS:
- ListView.separated con Divider() o SizedBox
- Card por cada item con información estructurada
- CircleAvatar o Container circular para iconos/iniciales
- trailing con Row de acciones (editar, eliminar)

ESTADOS:
- isLoading: CircularProgressIndicator centrado
- isEmpty: Ilustración o icono grande con texto descriptivo
- error: SnackBar con mensaje y color apropiado
- success: SnackBar verde con confirmación

INTERACCIONES:
- Feedback visual en hover/tap con InkWell
- Confirmación para acciones destructivas
- Loading states en botones durante operaciones
- Transiciones suaves con GetX animations

RESPONSIVE:
- Usar MediaQuery para adaptaciones
- LayoutBuilder para grids responsivos
- Drawer para navegación en móvil
`;
}