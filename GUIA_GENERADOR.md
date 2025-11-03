# 📋 Guía de Uso del Generador de Diagramas UML

## 🎯 Capacidades del Generador

El generador es un asistente inteligente que puede crear desde **tareas simples de CRUD** hasta **sistemas completos**, según lo que le solicites.

---

## 📝 Ejemplos de Uso

### 1️⃣ **CRUD Básico - Una sola entidad**

Para crear una entidad simple con sus atributos:

```
Crear entidad Usuario(id Integer, nombre String, email String)
```

Resultado:
- ✅ Crea solo la entidad `Usuario` con los atributos especificados
- ✅ Genera automáticamente el CRUD completo en Spring Boot
- ❌ NO crea otras entidades ni relaciones

### 2️⃣ **Varias entidades sin relaciones**

```
Crear entidad Producto(id Integer, nombre String, precio BigDecimal)
Crear entidad Categoria(id Integer, nombre String)
```

Resultado:
- ✅ Crea ambas entidades por separado
- ❌ NO crea relaciones entre ellas automáticamente

### 3️⃣ **Entidades con relaciones específicas**

```
Crear entidad Cliente(id Integer, nombre String, email String)
Crear entidad Pedido(id Integer, fecha Date, total BigDecimal)
Relación Cliente 1 - * Pedido (verbo: realiza)
```

Resultado:
- ✅ Crea ambas entidades
- ✅ Crea la relación 1 a muchos entre Cliente y Pedido
- ❌ NO crea otras entidades ni relaciones adicionales

### 4️⃣ **Sistema completo predefinido**

Para generar un sistema completo con múltiples entidades y relaciones:

```
Crear sistema de ventas
```

O:

```
Generar sistema completo de biblioteca
```

Resultado:
- ✅ Genera todas las entidades del sistema (Usuario, Cliente, Producto, Venta, etc.)
- ✅ Genera todas las relaciones entre entidades
- ✅ Aplica auto-layout para organizar el diagrama

**Sistemas disponibles:**
- `sistema de ventas` / `punto de venta`
- `sistema de biblioteca`
- `sistema de hospital` / `sistema de clínica`
- `sistema de ecommerce` / `tienda online` / `comercio electrónico`
- `sistema de escuela` / `sistema educativo`
- `sistema de restaurante`

---

## 🔧 Operaciones CRUD Avanzadas

### **Agregar atributos a una entidad existente**

```
Agrega atributo telefono String a Usuario
```

### **Eliminar atributos**

```
Quita atributo telefono de Usuario
```

### **Eliminar entidades**

```
Elimina entidad Usuario
```

O:

```
Borra la entidad Cliente
```

### **Renombrar atributo**

```
Renombrar atributo telefono de Usuario a celular
```

### **Cambiar tipo de atributo**

```
Cambia tipo de atributo telefono de Usuario a Integer
```

### **Eliminar todos los atributos**

```
Elimina los atributos de Usuario
```

O dejar solo el ID:

```
Deja solo id en Usuario
```

---

## 🔗 Tipos de Relaciones

### **Asociación simple**

```
Relación Usuario 1..* - 1 Perfil (verbo: tiene)
```

### **Relación N a M (muchos a muchos)**

```
N-M Usuario y Rol join Usuario_Rol
```

### **Asociación asociativa**

```
Asociativa Usuario y Producto join Usuario_Producto
```

### **Herencia**

```
Empleado extiende Persona
```

O:

```
Herencia Estudiante -> Persona
```

### **Dependencia**

```
Clase1 depende de Clase2
```

O:

```
Dependencia A -> B
```

### **Agregación y Composición**

```
Agregación Departamento 1 - * Empleado [lado A]
```

```
### **Composición**

```
Composición Casa 1 - * Habitacion [lado A]
```

---

## 🗑️ Eliminar Relaciones

```
Eliminar relación entre Usuario y Rol
```

O:

```
Quitar la relación Usuario y Perfil
```

---
```

---

## ✅ Reglas Importantes

1. **Sé específico**: El generador solo creará lo que le pidas explícitamente
2. **Para sistemas completos**: Usa las palabras clave "sistema de X" o "crear sistema X"
3. **Para CRUD simple**: Solo menciona la entidad que necesitas
4. **Puedes combinar**: Crear varias entidades y luego agregar relaciones

---

## 💡 Ejemplos Completos

### Ejemplo 1: E-commerce básico

```
Crear entidad Producto(id Integer, nombre String, precio BigDecimal, stock Integer)
Crear entidad Categoria(id Integer, nombre String)
Relación Producto * - 1 Categoria (verbo: pertenece a)
```

### Ejemplo 2: Sistema de tareas

```
Crear entidad Usuario(id Integer, username String, email String)
Crear entidad Tarea(id Integer, titulo String, descripcion String, estado String, fechaCreacion Date)
N-M Usuario y Tarea join Usuario_Tarea
```

### Ejemplo 3: Solo una entidad

```
Crear entidad Comentario(id Integer, texto String, fecha Date, autor String)
```

---

## 🚫 Errores Comunes

❌ **Incorrecto**: "Crear usuario"  
✅ **Correcto**: "Crear entidad Usuario(id Integer, nombre String)"

❌ **Incorrecto**: "Quiero algo de ventas"  
✅ **Correcto**: "Crear sistema de ventas" (para sistema completo) o "Crear entidad Venta(...)" (para solo una entidad)

❌ **Incorrecto**: Esperar que cree relaciones automáticamente  
✅ **Correcto**: Especificar las relaciones explícitamente

---

## 🎤 Uso con Dictado por Voz

El generador soporta entrada por voz. Habla claramente:

```
"Crear entidad Producto con id Integer, nombre String y precio BigDecimal"
```

---

## 📊 Auto-Layout

Cuando crees **2 o más entidades nuevas** en una sola instrucción, el generador aplicará automáticamente el auto-layout para organizar el diagrama de forma profesional.

---

¿Necesitas ayuda? El generador está diseñado para ser flexible: desde lo más simple hasta lo más complejo. ¡Solo pide lo que necesites! 🚀
