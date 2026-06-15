---
contentType: guides
slug: clean-code-principles-guide
title: "Principios de Código Limpio — Escribir Software Mantenible"
description: "Una guía práctica de código limpio: nombres significativos, funciones cortas, DRY, fundamentos SOLID y hábitos que hacen las bases de código más fáciles de leer y mantener."
metaDescription: "Guía de código limpio: nombres significativos, funciones cortas, DRY, comentarios, manejo de errores. Escribe software mantenible."
difficulty: beginner
topics:
  - design
tags:
  - clean-code
  - mantenibilidad
  - legibilidad
  - refactoring
  - mejores-practicas
  - guia
relatedResources:
  - /guides/design/solid-principles-guide
  - /guides/design/code-review-best-practices-guide
  - /guides/testing/testing-strategy-guide
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Guía de código limpio: nombres significativos, funciones cortas, DRY, comentarios, manejo de errores. Escribe software mantenible."
  keywords:
    - principios de codigo limpio
    - escribir software mantenible
    - legibilidad de codigo
    - nombres de variables significativos
    - funciones cortas
    - principio dry
---

# Principios de Código Limpio

## Introducción

El código limpio es código que es fácil de entender, fácil de cambiar y fácil de probar. No se trata de ser inteligente, se trata de ser claro. Esta guía cubre los hábitos fundamentales que hacen una base de código sostenible.

## Nombres Significativos

Los nombres son la forma más importante de documentación en el código.

### Usa Nombres que Revelen Intención

```python
# Malo
x = 10  # que es x?

# Bueno
dias_hasta_expiracion = 10
```

```python
# Malo
def calc(a, b):
    return a * b

# Bueno
def calcular_precio_total(cantidad, precio_unitario):
    return cantidad * precio_unitario
```

### Evita la Desinformación

```python
# Malo
lista_cuentas = {}  # es un dict, no una lista

# Bueno
cuentas_por_id = {}
```

### Usa Nombres Pronunciables

```python
# Malo
gen_ymdhms = datetime.now()

# Bueno
timestamp_generacion = datetime.now()
```

### Elige Una Palabra Por Concepto

| Concepto | Elige Una | Evita Mezclar |
|----------|-----------|---------------|
| Obtener datos | `get`, `fetch` | No uses ambos |
| Crear objeto | `create`, `make`, `build` | Elige uno |
| Insertar datos | `insert`, `add`, `append` | Elige uno |

## Funciones Cortas

Las funciones deben hacer una cosa, hacerla bien, y solo eso.

### La Regla de Responsabilidad Única

```python
# Malo: una función hace validación, cálculo y persistencia
def procesar_orden(orden):
    if not orden.items:
        raise ValueError("Orden vacía")
    total = sum(item.precio * item.cant for item in orden.items)
    if orden.cliente.is_vip:
        total *= 0.9
    db.execute("INSERT INTO orders ...", total)
    enviar_email(orden.cliente.email, f"Orden {total} confirmada")

# Bueno: componer funciones pequeñas
def validar_orden(orden):
    if not orden.items:
        raise ValueError("Orden vacía")

def calcular_total(orden):
    total = sum(item.precio * item.cant for item in orden.items)
    return aplicar_descuento_vip(total, orden.cliente)

def aplicar_descuento_vip(total, cliente):
    return total * 0.9 if cliente.is_vip else total

def guardar_orden(orden, total):
    db.execute("INSERT INTO orders ...", total)

def confirmar_orden(orden, total):
    validar_orden(orden)
    total = calcular_total(orden)
    guardar_orden(orden, total)
    enviar_email(orden.cliente.email, f"Orden {total} confirmada")
```

### Mantén las Funciones Cortas

Apunta a **20 líneas o menos**. Si una función excede esto, probablemente hace más de una cosa.

### Minimiza los Parámetros

| Numero de Args | Legibilidad |
|---------------|-------------|
| 0-1 | Ideal |
| 2 | Razonable |
| 3 | Sospechoso |
| >3 | Requiere justificación (usa struct/objeto) |

## DRY — Don't Repeat Yourself

La duplicación es la raíz del dolor de mantenimiento. Cuando la lógica se repite, una corrección de bug en un lugar suele faltar en otros.

```python
# Malo: lógica de validación repetida
def crear_usuario(email, password):
    if "@" not in email:
        raise ValueError("Email inválido")
    ...

def actualizar_email_usuario(user_id, email):
    if "@" not in email:
        raise ValueError("Email inválido")
    ...

# Bueno: extraer lógica compartida
def validar_email(email):
    if "@" not in email:
        raise ValueError("Email inválido")

def crear_usuario(email, password):
    validar_email(email)
    ...

def actualizar_email_usuario(user_id, email):
    validar_email(email)
    ...
```

## Comentarios

Los comentarios deben explicar **por qué**, no **qué**. El código mismo debe explicar el qué.

```python
# Malo: el comentario repite lo obvio
count = count + 1  # incrementar count

# Malo: comentario explica lo que el código hace
# Verifica si el usuario está activo y tiene permiso
if usuario.is_active and usuario.has_permission("read"):
    ...

# Bueno: comentario explica por qué
# Saltar usuarios inactivos porque pueden tener permisos obsoletos
# después de un retraso de baja (ver política RH-2024-03)
if usuario.is_active and usuario.has_permission("read"):
    ...
```

### Prefiere Código Auto-Documentado

```python
# Malo
# retorna 1 si el usuario puede acceder al recurso
if check(u, r) == 1:
    ...

# Bueno
if usuario.can_access(recurso):
    ...
```

## Manejo de Errores

Los errores son parte del dominio, no una ocurrencia tardía.

### Usa Excepciones, No Códigos de Retorno

```python
# Malo
def leer_archivo(path):
    if not os.path.exists(path):
        return None  # el llamador debe verificar None
    return open(path).read()

resultado = leer_archivo("config.txt")
if resultado is None:
    ...  # manejo de errores disperso

# Bueno
def leer_archivo(path):
    if not os.path.exists(path):
        raise FileNotFoundError(f"{path} no encontrado")
    return open(path).read()

try:
    contenido = leer_archivo("config.txt")
except FileNotFoundError as e:
    logger.error(e)
    ...
```

### No Tragues Excepciones

```python
# Malo
try:
    operacion_riesgosa()
except Exception:
    pass  # fallo silencioso

# Bueno
try:
    operacion_riesgosa()
except NetworkError as e:
    logger.warning("Problema de red, se reintentará", exc_info=e)
    reintentar()
```

## Formato

La consistencia importa más que el estilo específico. Elige un estándar, automatízalo y sigue adelante.

- **Usa un linter/formatter** (Prettier, Black, gofmt)
- **Mantén el código relacionado verticalmente cercano** — declaración y uso deben estar cerca
- **Limita la longitud de línea** — 80-100 caracteres es un rango legible
- **Usa líneas en blanco para separar grupos lógicos**

## Objetos y Estructuras de Datos

### Dile, No Preguntes

```python
# Malo: preguntar sobre el estado, luego decidir
if cuenta.estado == "sobregirada":
    cuenta.bloquear()

# Bueno: dile al objeto qué hacer
cuenta.verificar_sobregiro_y_bloquear()
```

### La Ley de Demeter

Un método solo debe llamar:
1. Métodos sobre sí mismo
2. Métodos sobre parámetros
3. Métodos sobre objetos que crea
4. Métodos sobre componentes directos (campos)

```python
# Malo: navegando profundo en un grafo de objetos
cliente.ordenes[-1].items[0].precio

# Bueno: encapsular la navegación
cliente.precio_primer_item_ultima_orden()
```

## Mejores Prácticas

- **Deja el código más limpio de lo que lo encontraste** (Regla del Boy Scout)
- **Elimina código muerto** — código comentado, funciones no usadas, ramas inaccesibles
- **Escribe tests primero** — obligan a escribir código testable (y por tanto limpio)
- **El código se lee 10 veces más de lo que se escribe** — optimiza para el lector
- **Programación en pareja** — dos ojos detectan complejidad antes de que se acumule

## Errores Comunes

- Optimizar por brevedad en lugar de claridad
- Usar abreviaturas que solo el autor entiende
- Funciones con efectos secundarios que sorprenden al llamador
- Números y strings mágicos dispersos por el código
- Comentarios que se desfasan del código que describen
- Anidación profunda ("código flecha") que oscurece el camino feliz

## Preguntas Frecuentes

**P: ¿Debería refactorizar código legacy que no está roto?**
R: Sigue la Regla del Boy Scout: limpia las partes que tocas. No emprendas reescrituras grandes sin justificación de negocio y cobertura de tests.

**P: ¿Cómo convenzo a mi equipo de adoptar prácticas de código limpio?**
R: Comienza con formateo automático (cero debate), luego introduce checklists de code review. Muestra ejemplos concretos de bugs causados por código poco claro.

**P: ¿Es más lento escribir código limpio?**
R: Ligeramente más lento de escribir, significativamente más rápido de leer, depurar y cambiar. La inversión se recupera en la primera modificación.
