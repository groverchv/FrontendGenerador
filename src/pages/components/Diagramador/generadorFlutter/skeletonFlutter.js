// src/pages/components/Diagramador/generadorFlutter/skeletonFlutter.js
// Genera la estructura base de un proyecto Flutter

const toSnakeCase = (s) =>
  (s || "app").trim().toLowerCase().replace(/[^\w]+/g, "_");

const toPascalCase = (s) =>
  (s || "App")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join("");

const toCamelCase = (s) => {
  const pascal = toPascalCase(s);
  return pascal.charAt(0).toLowerCase() + pascal.slice(1);
};

/**
 * Genera los archivos base del proyecto Flutter
 * @param {string} projectName - Nombre del proyecto
 * @param {string} backendUrl - URL del backend (default: http://localhost:8080)
 * @returns {Object} Mapa de archivos { ruta: contenido }
 */
export function makeFlutterSkeleton(projectName, backendUrl = "http://localhost:8080") {
  const packageName = toSnakeCase(projectName);
  const appClass = toPascalCase(projectName);

  // ============================================================================
  // ARCHIVOS DE CONFIGURACION Y SETUP
  // ============================================================================

  // setup.bat - Script de configuración para Windows
  const setupBat = "@echo off\n" +
    "echo ========================================\n" +
    "echo   Configuracion de " + projectName + "\n" +
    "echo ========================================\n" +
    "echo.\n" +
    "echo [1/3] Verificando Flutter...\n" +
    "flutter --version\n" +
    "if errorlevel 1 (\n" +
    "  echo.\n" +
    "  echo ERROR: Flutter no esta instalado.\n" +
    "  echo Descargalo desde: https://docs.flutter.dev/get-started/install\n" +
    "  pause\n" +
    "  exit /b 1\n" +
    ")\n" +
    "echo.\n" +
    "echo [2/3] Instalando dependencias...\n" +
    "flutter pub get\n" +
    "if errorlevel 1 (\n" +
    "  echo.\n" +
    "  echo ERROR: No se pudieron instalar las dependencias.\n" +
    "  pause\n" +
    "  exit /b 1\n" +
    ")\n" +
    "echo.\n" +
    "echo [3/3] Verificando configuracion...\n" +
    "flutter doctor\n" +
    "echo.\n" +
    "echo ========================================\n" +
    "echo   Configuracion completada!\n" +
    "echo ========================================\n" +
    "echo.\n" +
    "echo Ahora puedes ejecutar la app con:\n" +
    "echo   flutter run\n" +
    "echo.\n" +
    "echo Backend configurado en: " + backendUrl + "\n" +
    "echo.\n" +
    "pause\n";

  // setup.sh - Script de configuración para Linux/macOS
  const setupSh = "#!/bin/bash\n" +
    "\n" +
    "echo \"========================================\"\n" +
    "echo \"   Configuracion de " + projectName + "\"\n" +
    "echo \"========================================\"\n" +
    "echo \"\"\n" +
    "\n" +
    "echo \"[1/3] Verificando Flutter...\"\n" +
    "if ! command -v flutter &> /dev/null; then\n" +
    "  echo \"\"\n" +
    "  echo \"ERROR: Flutter no esta instalado.\"\n" +
    "  echo \"Descargalo desde: https://docs.flutter.dev/get-started/install\"\n" +
    "  exit 1\n" +
    "fi\n" +
    "flutter --version\n" +
    "echo \"\"\n" +
    "\n" +
    "echo \"[2/3] Instalando dependencias...\"\n" +
    "flutter pub get\n" +
    "if [ $? -ne 0 ]; then\n" +
    "  echo \"\"\n" +
    "  echo \"ERROR: No se pudieron instalar las dependencias.\"\n" +
    "  exit 1\n" +
    "fi\n" +
    "echo \"\"\n" +
    "\n" +
    "echo \"[3/3] Verificando configuracion...\"\n" +
    "flutter doctor\n" +
    "echo \"\"\n" +
    "\n" +
    "echo \"========================================\"\n" +
    "echo \"   Configuracion completada!\"\n" +
    "echo \"========================================\"\n" +
    "echo \"\"\n" +
    "echo \"Ahora puedes ejecutar la app con:\"\n" +
    "echo \"   flutter run\"\n" +
    "echo \"\"\n" +
    "echo \"Backend configurado en: " + backendUrl + "\"\n" +
    "echo \"\"\n";

  // LEEME.txt - Instrucciones rápidas en español
  const leeme = "╔════════════════════════════════════════════════════════╗\n" +
    "║                                                        ║\n" +
    "║   INSTRUCCIONES DE INSTALACION - " + projectName.padEnd(20) + " ║\n" +
    "║                                                        ║\n" +
    "╚════════════════════════════════════════════════════════╝\n" +
    "\n" +
    "⚠️  IMPORTANTE: ANTES DE EJECUTAR LA APP\n" +
    "\n" +
    "Este proyecto Flutter necesita descargar dependencias.\n" +
    "Sin este paso, veras ~250 errores de compilacion.\n" +
    "\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "\n" +
    "🚀 INICIO RAPIDO:\n" +
    "\n" +
    "  OPCION A) Script automatico (recomendado):\n" +
    "\n" +
    "    Windows:      Doble clic en setup.bat\n" +
    "    Linux/macOS:  ./setup.sh\n" +
    "\n" +
    "  OPCION B) Manual:\n" +
    "\n" +
    "    1. Abre una terminal en esta carpeta\n" +
    "    2. Ejecuta: flutter pub get\n" +
    "    3. Ejecuta: flutter run\n" +
    "\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "\n" +
    "📋 REQUISITOS:\n" +
    "\n" +
    "  ✓ Flutter SDK 3.0.0 o superior\n" +
    "  ✓ Un dispositivo/emulador Android o iOS\n" +
    "  ✓ Backend corriendo en: " + backendUrl + "\n" +
    "\n" +
    "  Para verificar que tienes Flutter:\n" +
    "    flutter --version\n" +
    "\n" +
    "  Si no tienes Flutter instalado:\n" +
    "    https://docs.flutter.dev/get-started/install\n" +
    "\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "\n" +
    "🔧 COMANDOS UTILES:\n" +
    "\n" +
    "  flutter pub get       Instalar dependencias (OBLIGATORIO)\n" +
    "  flutter run           Ejecutar la app\n" +
    "  flutter devices       Ver dispositivos disponibles\n" +
    "  flutter doctor        Verificar instalacion\n" +
    "  flutter clean         Limpiar cache\n" +
    "\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "\n" +
    "❓ SOLUCION DE PROBLEMAS:\n" +
    "\n" +
    "  Error: \"Target of URI doesn't exist: 'package:flutter/material.dart'\"\n" +
    "  Solucion: Ejecuta \"flutter pub get\"\n" +
    "\n" +
    "  Error: \"No devices found\"\n" +
    "  Solucion: Conecta un dispositivo o crea un emulador:\n" +
    "    flutter emulators\n" +
    "\n" +
    "  Error de conexion al backend:\n" +
    "  Solucion: Verifica que el backend este en " + backendUrl + "\n" +
    "    O edita lib/data/api/api_client.dart para cambiar la URL\n" +
    "\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n" +
    "\n" +
    "📖 Mas informacion: Ver README.md\n" +
    "\n" +
    "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n";

  // ============================================================================
  // ARCHIVOS DEL PROYECTO FLUTTER
  // ============================================================================

  // pubspec.yaml
  const pubspec = `name: ${packageName}
description: Aplicación Flutter generada desde diagrama UML
publish_to: 'none'
version: 1.0.0+1

environment:
  sdk: '>=3.0.0 <4.0.0'

dependencies:
  flutter:
    sdk: flutter
  get: ^4.6.6
  http: ^1.1.0
  cupertino_icons: ^1.0.2

dev_dependencies:
  flutter_test:
    sdk: flutter
  flutter_lints: ^3.0.0

flutter:
  uses-material-design: true
`;

  // main.dart
  const mainDart = `import 'package:flutter/material.dart';
import 'package:get/get.dart';
import 'routes/app_pages.dart';
import 'routes/app_routes.dart';

void main() {
  runApp(const ${appClass}App());
}

class ${appClass}App extends StatelessWidget {
  const ${appClass}App({super.key});

  @override
  Widget build(BuildContext context) {
    return GetMaterialApp(
      title: '${projectName}',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        primarySwatch: Colors.blue,
        useMaterial3: true,
        appBarTheme: const AppBarTheme(
          centerTitle: true,
          elevation: 2,
        ),
      ),
      initialRoute: AppRoutes.HOME,
      getPages: AppPages.pages,
    );
  }
}
`;

  // api_client.dart - Usar concatenación para evitar confusión con template literals
  const apiClient = "import 'package:http/http.dart' as http;\n" +
"import 'dart:convert';\n" +
"\n" +
"class ApiClient {\n" +
"  static const String baseUrl = '" + backendUrl + "/api';\n" +
"\n" +
"  /// GET request\n" +
"  Future<dynamic> get(String endpoint) async {\n" +
"    try {\n" +
"      final response = await http.get(\n" +
"        Uri.parse('$baseUrl$endpoint'),\n" +
"        headers: {'Content-Type': 'application/json'},\n" +
"      );\n" +
"      \n" +
"      if (response.statusCode >= 200 && response.statusCode < 300) {\n" +
"        if (response.body.isEmpty) return null;\n" +
"        return json.decode(response.body);\n" +
"      } else {\n" +
"        throw Exception('Error ${response.statusCode}: ${response.body}');\n" +
"      }\n" +
"    } catch (e) {\n" +
"      throw Exception('Error de conexión: $e');\n" +
"    }\n" +
"  }\n" +
"\n" +
"  /// POST request\n" +
"  Future<dynamic> post(String endpoint, Map<String, dynamic> data) async {\n" +
"    try {\n" +
"      final response = await http.post(\n" +
"        Uri.parse('$baseUrl$endpoint'),\n" +
"        headers: {'Content-Type': 'application/json'},\n" +
"        body: json.encode(data),\n" +
"      );\n" +
"      \n" +
"      if (response.statusCode >= 200 && response.statusCode < 300) {\n" +
"        if (response.body.isEmpty) return null;\n" +
"        return json.decode(response.body);\n" +
"      } else {\n" +
"        throw Exception('Error ${response.statusCode}: ${response.body}');\n" +
"      }\n" +
"    } catch (e) {\n" +
"      throw Exception('Error de conexión: $e');\n" +
"    }\n" +
"  }\n" +
"\n" +
"  /// PUT request\n" +
"  Future<dynamic> put(String endpoint, int id, Map<String, dynamic> data) async {\n" +
"    try {\n" +
"      final response = await http.put(\n" +
"        Uri.parse('$baseUrl$endpoint/$id'),\n" +
"        headers: {'Content-Type': 'application/json'},\n" +
"        body: json.encode(data),\n" +
"      );\n" +
"      \n" +
"      if (response.statusCode >= 200 && response.statusCode < 300) {\n" +
"        if (response.body.isEmpty) return null;\n" +
"        return json.decode(response.body);\n" +
"      } else {\n" +
"        throw Exception('Error ${response.statusCode}: ${response.body}');\n" +
"      }\n" +
"    } catch (e) {\n" +
"      throw Exception('Error de conexión: $e');\n" +
"    }\n" +
"  }\n" +
"\n" +
"  /// DELETE request\n" +
"  Future<void> delete(String endpoint, int id) async {\n" +
"    try {\n" +
"      final response = await http.delete(\n" +
"        Uri.parse('$baseUrl$endpoint/$id'),\n" +
"        headers: {'Content-Type': 'application/json'},\n" +
"      );\n" +
"      \n" +
"      if (response.statusCode < 200 || response.statusCode >= 300) {\n" +
"        throw Exception('Error ${response.statusCode}: ${response.body}');\n" +
"      }\n" +
"    } catch (e) {\n" +
"      throw Exception('Error de conexión: $e');\n" +
"    }\n" +
"  }\n" +
"}\n";

  // home_page.dart
  const homePage = `import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../widgets/global/main_sidebar.dart';

class HomePage extends StatelessWidget {
  const HomePage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('${projectName}'),
      ),
      drawer: const MainSidebar(),
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(
              Icons.dashboard,
              size: 100,
              color: Theme.of(context).primaryColor,
            ),
            const SizedBox(height: 20),
            const Text(
              'Bienvenido a ${projectName}',
              style: TextStyle(
                fontSize: 24,
                fontWeight: FontWeight.bold,
              ),
              textAlign: TextAlign.center,
            ),
            const SizedBox(height: 10),
            Text(
              'Selecciona una opción del menú',
              style: TextStyle(
                fontSize: 16,
                color: Colors.grey[600],
              ),
            ),
          ],
        ),
      ),
    );
  }
}
`;

  // main_sidebar.dart (se completará con las entidades generadas)
  const mainSidebar = `import 'package:flutter/material.dart';
import 'package:get/get.dart';
import '../../../routes/app_routes.dart';

class MainSidebar extends StatelessWidget {
  const MainSidebar({super.key});

  @override
  Widget build(BuildContext context) {
    return Drawer(
      child: ListView(
        padding: EdgeInsets.zero,
        children: [
          DrawerHeader(
            decoration: BoxDecoration(
              color: Theme.of(context).primaryColor,
            ),
            child: const Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisAlignment: MainAxisAlignment.end,
              children: [
                Icon(
                  Icons.apps,
                  size: 48,
                  color: Colors.white,
                ),
                SizedBox(height: 10),
                Text(
                  '${projectName}',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 24,
                    fontWeight: FontWeight.bold,
                  ),
                ),
              ],
            ),
          ),
          ListTile(
            leading: const Icon(Icons.home),
            title: const Text('Inicio'),
            onTap: () {
              Get.back();
              Get.toNamed(AppRoutes.HOME);
            },
          ),
          const Divider(),
          // Aquí se agregarán las entidades generadas
        ],
      ),
    );
  }
}
`;

  // app_routes.dart
  const appRoutes = `abstract class AppRoutes {
  static const HOME = '/';
  // Aquí se agregarán las rutas de las entidades
}
`;

  // app_pages.dart
  const appPages = `import 'package:get/get.dart';
import '../ui/pages/home_page.dart';
import 'app_routes.dart';

class AppPages {
  static final pages = [
    GetPage(
      name: AppRoutes.HOME,
      page: () => const HomePage(),
    ),
    // Aquí se agregarán las páginas de las entidades
  ];
}
`;

  // README.md mejorado con instrucciones claras
  const readme = `# ${projectName}

Aplicación Flutter generada automáticamente desde diagrama UML.

## 🚀 Inicio rápido

### 1️⃣ Requisitos previos

Antes de comenzar, asegúrate de tener instalado:

- **Flutter SDK 3.0.0 o superior**
  \`\`\`bash
  flutter --version
  \`\`\`

- **Dart 3.0.0 o superior** (incluido con Flutter)

Si no tienes Flutter instalado:
- Windows/macOS/Linux: https://docs.flutter.dev/get-started/install

### 2️⃣ Instalación (IMPORTANTE - PASO OBLIGATORIO)

**⚠️ DEBES ejecutar este comando antes de ejecutar la app:**

\`\`\`bash
flutter pub get
\`\`\`

Este comando descarga todas las dependencias necesarias (GetX, HTTP, etc.).

**Sin este comando, verás ~250 errores de compilación.**

### 3️⃣ Configurar el backend

Esta aplicación se conecta al backend en: **${backendUrl}**

**Opciones:**

**A) Si tienes un backend corriendo:**
- Asegúrate de que esté en \`${backendUrl}/api\`
- Debe tener endpoints: \`/api/<entidad>\` para cada entidad del diagrama

**B) Si quieres cambiar la URL del backend:**
- Edita el archivo: \`lib/data/api/api_client.dart\`
- Cambia la línea: \`static const String baseUrl = '${backendUrl}/api';\`

**C) Si NO tienes backend:**
- La app compilará pero mostrará errores de conexión al intentar cargar datos
- Puedes generar el backend Spring Boot desde el mismo diagrama UML

### 4️⃣ Ejecutar la aplicación

**Conectar un dispositivo o emulador:**

\`\`\`bash
# Ver dispositivos disponibles
flutter devices

# Si no hay dispositivos, crear un emulador Android:
flutter emulators
flutter emulators --launch <emulator_id>
\`\`\`

**Ejecutar en modo desarrollo:**

\`\`\`bash
flutter run
\`\`\`

**Ejecutar en modo release (más rápido):**

\`\`\`bash
flutter run --release
\`\`\`

### 5️⃣ Compilar para producción

**Android (APK):**
\`\`\`bash
flutter build apk --release
# El APK estará en: build/app/outputs/flutter-apk/app-release.apk
\`\`\`

**iOS (requiere macOS):**
\`\`\`bash
flutter build ios --release
\`\`\`

**Web:**
\`\`\`bash
flutter build web
\`\`\`

---

## 📁 Estructura del proyecto

\`\`\`
lib/
├── main.dart              # ✅ Punto de entrada
├── data/                  # ✅ Capa de datos
│   ├── api/
│   │   └── api_client.dart       # Cliente HTTP
│   ├── models/            # Modelos de datos
│   └── services/          # Servicios API (CRUD)
├── ui/                    # ✅ Capa de presentación
│   ├── controllers/       # Controladores GetX
│   ├── pages/             # Pantallas
│   └── widgets/
│       ├── global/        # Widgets globales
│       └── local/         # Widgets específicos
└── routes/                # ✅ Navegación
    ├── app_pages.dart
    └── app_routes.dart
\`\`\`

---

## ✨ Características incluidas

- ✅ Arquitectura GetX (MVC)
- ✅ CRUD completo para cada entidad del diagrama
- ✅ Navegación con rutas nombradas
- ✅ Integración con backend REST API
- ✅ UI Material Design 3
- ✅ Sidebar de navegación
- ✅ Formularios de creación/edición
- ✅ Listas con acciones (editar/eliminar)

---

## 🐛 Solución de problemas

### Error: "Target of URI doesn't exist: 'package:flutter/material.dart'"

**Causa:** No se ejecutó \`flutter pub get\`

**Solución:**
\`\`\`bash
flutter pub get
\`\`\`

### Error: "Waiting for another flutter command to release the startup lock"

**Solución:**
\`\`\`bash
# Eliminar el archivo de bloqueo
rm ~/.flutter_tool_state/lockfile  # Linux/macOS
del %USERPROFILE%\\.flutter_tool_state\\lockfile  # Windows
\`\`\`

### Error: "No devices found"

**Solución:**
\`\`\`bash
# Android: Crear un emulador
flutter emulators --launch <nombre>

# O conectar un dispositivo físico con USB debugging habilitado
\`\`\`

### Error de conexión al backend

**Causa:** El backend no está corriendo o la URL es incorrecta

**Solución:**
1. Verifica que el backend esté en \`${backendUrl}\`
2. O edita \`lib/data/api/api_client.dart\` con la URL correcta

### La app se cierra al abrirla

**Causa posible:** Error en tiempo de ejecución (backend no disponible)

**Solución:**
\`\`\`bash
# Ver logs completos
flutter run --verbose
\`\`\`

---

## 🔧 Comandos útiles

| Comando | Descripción |
|---------|-------------|
| \`flutter pub get\` | Instalar dependencias (OBLIGATORIO) |
| \`flutter run\` | Ejecutar en desarrollo |
| \`flutter run --release\` | Ejecutar optimizado |
| \`flutter clean\` | Limpiar build cache |
| \`flutter doctor\` | Verificar instalación de Flutter |
| \`flutter devices\` | Ver dispositivos disponibles |
| \`flutter build apk\` | Generar APK Android |
| \`flutter analyze\` | Analizar código |

---

## 📱 Uso de la aplicación

### Pantalla de inicio
Al abrir la app verás:
- **"Bienvenido a ${projectName}"**
- Icono de dashboard
- Menú lateral (drawer) con todas las entidades

### Navegación
1. Toca el **ícono de menú** (☰) en la parte superior
2. Selecciona una entidad de la lista
3. Verás la lista de items de esa entidad

### Crear nuevo item
1. En la lista de una entidad, toca el **botón flotante (+)**
2. Completa el formulario
3. Toca **"Guardar"**

### Editar item
1. En la lista, toca el **ícono de editar (✏️)**
2. Modifica los campos
3. Toca **"Guardar"**

### Eliminar item
1. En la lista, toca el **ícono de eliminar (🗑️)**
2. Confirma la eliminación

---

## 🌐 Backend

Esta app espera un backend REST API con estos endpoints:

Para cada entidad (ejemplo: \`producto\`):
- \`GET /api/producto\` - Listar todos
- \`GET /api/producto/{id}\` - Obtener por ID
- \`POST /api/producto\` - Crear nuevo
- \`PUT /api/producto/{id}\` - Actualizar
- \`DELETE /api/producto/{id}\` - Eliminar

**Formato JSON esperado:** Según los modelos en \`lib/data/models/\`

---

## 📦 Dependencias

Este proyecto usa:

- **flutter** - Framework de UI
- **get (^4.6.6)** - State management, navegación, DI
- **http (^1.1.0)** - Cliente HTTP para API REST

Todas se instalan automáticamente con \`flutter pub get\`

---

## ⚙️ Configuración avanzada

### Cambiar puerto del backend

Edita: \`lib/data/api/api_client.dart\`

\`\`\`dart
static const String baseUrl = 'http://localhost:PUERTO/api';
\`\`\`

### Agregar autenticación

Modifica \`api_client.dart\` para incluir headers de autorización:

\`\`\`dart
headers: {
  'Content-Type': 'application/json',
  'Authorization': 'Bearer $token',
}
\`\`\`

---

## 📄 Licencia

Proyecto generado automáticamente desde diagrama UML.

---

## 🆘 ¿Necesitas ayuda?

1. **Verifica Flutter:** \`flutter doctor\`
2. **Limpia el proyecto:** \`flutter clean && flutter pub get\`
3. **Revisa los logs:** \`flutter run --verbose\`
4. **Verifica el backend:** Debe estar corriendo en \`${backendUrl}\`

---

**Generado automáticamente** por el Generador de Flutter desde diagrama UML
Fecha: ${new Date().toLocaleDateString()}
`;

  // .gitignore
  const gitignore = `# Miscellaneous
*.class
*.log
*.pyc
*.swp
.DS_Store
.atom/
.buildlog/
.history
.svn/
migrate_working_dir/

# IntelliJ related
*.iml
*.ipr
*.iws
.idea/

# The .vscode folder contains launch configuration and tasks you configure in
# VS Code which you may wish to be included in version control, so this line
# is commented out by default.
#.vscode/

# Flutter/Dart/Pub related
**/doc/api/
**/ios/Flutter/.last_build_id
.dart_tool/
.flutter-plugins
.flutter-plugins-dependencies
.packages
.pub-cache/
.pub/
/build/

# Symbolication related
app.*.symbols

# Obfuscation related
app.*.map.json

# Android Studio will place build artifacts here
/android/app/debug
/android/app/profile
/android/app/release
`;

  return {
    // Archivos de configuración y setup
    "setup.bat": setupBat,
    "setup.sh": setupSh,
    "LEEME.txt": leeme,
    // Archivos del proyecto
    "pubspec.yaml": pubspec,
    "lib/main.dart": mainDart,
    "lib/data/api/api_client.dart": apiClient,
    "lib/ui/pages/home_page.dart": homePage,
    "lib/ui/widgets/global/main_sidebar.dart": mainSidebar,
    "lib/routes/app_routes.dart": appRoutes,
    "lib/routes/app_pages.dart": appPages,
    "README.md": readme,
    ".gitignore": gitignore,
  };
}

/** Exportar helpers para uso externo */
export const _flutterHelpers = { toSnakeCase, toPascalCase, toCamelCase };

export default makeFlutterSkeleton;
