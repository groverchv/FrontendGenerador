# 🧪 Pruebas del Generador - Lista de Verificación

## ✅ Pruebas para CRUD Simple

### Prueba 1: Crear una sola entidad
**Entrada:**
```
Crear entidad Usuario(id Integer, nombre String, email String)
```

**Resultado esperado:**
- ✅ Se crea solo la entidad `Usuario`
- ✅ Con los atributos: id, nombre, email
- ❌ NO se crean otras entidades
- ❌ NO se crean relaciones

---

### Prueba 2: Crear entidad sin especificar atributos
**Entrada:**
```
Crear entidad Producto
```

**Resultado esperado:**
- ✅ Se crea la entidad `Producto`
- ✅ Con atributo por defecto: id (Integer)
- ✅ Gemini puede agregar createdAt y updatedAt si usa la API
- ❌ NO se crean otras entidades

---

### Prueba 3: Agregar atributo a entidad existente
**Pre-requisito:** Tener la entidad `Usuario` creada

**Entrada:**
```
Agrega atributo telefono String a Usuario
```

**Resultado esperado:**
- ✅ Se agrega el atributo `telefono` a `Usuario`
- ✅ Los atributos anteriores se mantienen
- ❌ NO se crean nuevas entidades

---

### Prueba 4: Eliminar atributo
**Pre-requisito:** Tener la entidad `Usuario` con atributo `email`

**Entrada:**
```
Quita atributo email de Usuario
```

**Resultado esperado:**
- ✅ Se elimina el atributo `email`
- ✅ Los demás atributos se mantienen

---

## ✅ Pruebas para Múltiples Entidades

### Prueba 5: Crear dos entidades sin relaciones
**Entrada:**
```
Crear entidad Producto(id Integer, nombre String, precio BigDecimal)
Crear entidad Categoria(id Integer, nombre String)
```

**Resultado esperado:**
- ✅ Se crean ambas entidades
- ✅ Con los atributos especificados
- ❌ NO se crean relaciones automáticamente
- ❌ NO se crean otras entidades

---

### Prueba 6: Crear entidades con relaciones explícitas
**Entrada:**
```
Crear entidad Cliente(id Integer, nombre String, email String)
Crear entidad Pedido(id Integer, fecha Date, total BigDecimal)
Relación Cliente 1 - * Pedido (verbo: realiza)
```

**Resultado esperado:**
- ✅ Se crean ambas entidades
- ✅ Se crea la relación 1 a muchos
- ❌ NO se crean otras entidades
- ❌ NO se crean otras relaciones

---

## ✅ Pruebas para Sistemas Completos

### Prueba 7: Generar sistema de ventas
**Entrada:**
```
Crear sistema de ventas
```

**Resultado esperado:**
- ✅ Se crean TODAS las entidades del sistema:
  - Usuario, Cliente, Categoria, Producto, Venta, DetalleVenta
- ✅ Se crean TODAS las relaciones entre entidades
- ✅ Se aplica auto-layout automáticamente

---

### Prueba 8: Generar sistema de biblioteca
**Entrada:**
```
Generar sistema completo de biblioteca
```

**Resultado esperado:**
- ✅ Se crean TODAS las entidades del sistema:
  - Usuario, Autor, Editorial, Libro, Prestamo
- ✅ Se crean TODAS las relaciones
- ✅ Se aplica auto-layout

---

### Prueba 9: Generar sistema de hospital
**Entrada:**
```
Crear sistema de hospital
```

**Resultado esperado:**
- ✅ Se crean TODAS las entidades:
  - Paciente, Doctor, Cita, HistorialMedico
- ✅ Se crean TODAS las relaciones
- ✅ Se aplica auto-layout

---

## ❌ Pruebas Negativas (NO debe pasar)

### Prueba 10: Mencionar "ventas" sin pedir sistema
**Entrada:**
```
Crear entidad Venta(id Integer, fecha Date, total BigDecimal)
```

**Resultado esperado:**
- ✅ Se crea SOLO la entidad `Venta`
- ❌ NO se genera el sistema completo de ventas
- ❌ NO se crean Cliente, Producto, Usuario, etc.

---

### Prueba 11: Mencionar "biblioteca" sin pedir sistema
**Entrada:**
```
Crear entidad Libro(id Integer, titulo String, isbn String)
```

**Resultado esperado:**
- ✅ Se crea SOLO la entidad `Libro`
- ❌ NO se genera el sistema completo de biblioteca
- ❌ NO se crean Autor, Editorial, Prestamo, etc.

---

## 🔧 Cómo Ejecutar las Pruebas

1. **Abrir el proyecto** en el navegador
2. **Ir a un diagrama** (crear o abrir uno existente)
3. **Hacer clic en "Hacer con IA"** o el botón del asistente
4. **Copiar y pegar** cada entrada de prueba
5. **Verificar** que el resultado coincida con lo esperado

---

## 📊 Registro de Pruebas

| # | Prueba | Fecha | Estado | Notas |
|---|--------|-------|--------|-------|
| 1 | Crear una entidad | | ⏳ Pendiente | |
| 2 | Crear sin atributos | | ⏳ Pendiente | |
| 3 | Agregar atributo | | ⏳ Pendiente | |
| 4 | Eliminar atributo | | ⏳ Pendiente | |
| 5 | Dos entidades sin relaciones | | ⏳ Pendiente | |
| 6 | Entidades con relaciones | | ⏳ Pendiente | |
| 7 | Sistema de ventas | | ⏳ Pendiente | |
| 8 | Sistema de biblioteca | | ⏳ Pendiente | |
| 9 | Sistema de hospital | | ⏳ Pendiente | |
| 10 | Venta sin sistema | | ⏳ Pendiente | |
| 11 | Libro sin sistema | | ⏳ Pendiente | |

**Estados:**
- ⏳ Pendiente
- ✅ Pasó
- ❌ Falló
- ⚠️ Parcial

---

## 🐛 Reporte de Bugs

Si encuentras algún problema durante las pruebas, documéntalo aquí:

### Bug #1
- **Prueba afectada:**
- **Comportamiento esperado:**
- **Comportamiento actual:**
- **Pasos para reproducir:**

---

**Última actualización:** 3 de noviembre de 2025
