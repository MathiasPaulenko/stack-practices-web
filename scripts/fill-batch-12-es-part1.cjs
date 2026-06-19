const fs = require('fs');

function fillBody(filePath, newBody) {
  const content = fs.readFileSync(filePath, 'utf8');
  const parts = content.split('---');
  if (parts.length < 3) { console.error('Invalid frontmatter in', filePath); return; }
  const frontmatter = '---' + parts[1] + '---';
  fs.writeFileSync(filePath, frontmatter + '\n' + newBody.trim() + '\n', 'utf8');
  console.log('Updated:', filePath);
}

const articles = {
  'src/content/recipes/frontend/javascript-event-loop.es.md': `## Visión General

El event loop de JavaScript es el corazón de la programación asíncrona en navegadores y Node.js. Orquesta la ejecución del código, recopila y procesa eventos, y ejecuta subtareas en cola. Comprender cómo interactúan el call stack, la cola de tareas y la cola de microtareas es esencial para escribir aplicaciones performantes y no bloqueantes.

## Cuándo Usar

Usa este recurso cuando:
- Depuras errores asíncronos misteriosos o condiciones de carrera
- Optimizas la responsividad de la UI en aplicaciones frontend
- Eliges entre setTimeout, Promise y queueMicrotask
- Entiendes por qué el orden del código no siempre coincide con el orden de ejecución

## Solución

### Visualizando el Event Loop

\`\`\`javascript
console.log('1. Inicio del script');

setTimeout(() => {
  console.log('2. setTimeout (macrotarea)');
}, 0);

Promise.resolve().then(() => {
  console.log('3. Promise (microtarea)');
});

queueMicrotask(() => {
  console.log('4. queueMicrotask');
});

console.log('5. Fin del script');

// Orden de salida:
// 1. Inicio del script
// 5. Fin del script
// 3. Promise (microtarea)
// 4. queueMicrotask
// 2. setTimeout (macrotarea)
\`\`\`

### Manejando Tareas de Larga Duración

\`\`\`javascript
function procesarArrayGrande(arr, chunkSize = 1000) {
  let index = 0;

  function procesarChunk() {
    const chunk = arr.slice(index, index + chunkSize);
    chunk.forEach(item => computacionPesada(item));
    index += chunkSize;

    if (index < arr.length) {
      setTimeout(procesarChunk, 0); // Ceder control al event loop
    }
  }

  procesarChunk();
}
\`\`\`

## Explicación

El event loop opera en fases:

1. **Call Stack**: Ejecuta código síncrono. Cuando está vacío, el event loop revisa las colas.
2. **Cola de Microtareas**: Procesa callbacks de Promise, queueMicrotask y MutationObserver. Se vacía completamente antes de la siguiente macrotarea.
3. **Cola de Macrotareas**: Procesa setTimeout, setInterval, setImmediate (Node.js) y eventos de I/O.
4. **Fase de Renderizado**: Los navegadores pueden actualizar el DOM y repintar si hay tiempo.

**Regla crítica**: Todas las microtareas se ejecutan antes de la siguiente macrotarea. Esto puede bloquear la cola de macrotareas si las microtareas encolan más microtareas recursivamente.

## Variantes

| Runtime | API Macrotarea | API Microtarea | Notas |
|---------|---------------|----------------|-------|
| Navegador | setTimeout, requestAnimationFrame | Promise, queueMicrotask | rAF corre antes del paint |
| Node.js | setTimeout, setImmediate | Promise, process.nextTick | nextTick corre antes que Promises |
| Deno | setTimeout | Promise, queueMicrotask | Se alinea con comportamiento de navegador |

## Mejores Prácticas

- **Divide trabajo pesado en chunks**: Usa setTimeout o requestIdleCallback para ceder control
- **Prefiere microtareas para actualizaciones DOM**: queueMicrotask asegura que las lecturas DOM se agrupen
- **Evita encolar microtareas recursivamente**: Puede congelar el event loop indefinidamente
- **Usa requestAnimationFrame para actualizaciones visuales**: Se sincroniza con el ciclo de renderizado del navegador
- **Perfila con la pestaña Performance**: Chrome DevTools visualiza el timing de microtareas y macrotareas

## Errores Comunes

1. **Asumir que setTimeout(0) es inmediato**: Siempre es más lento que las microtareas
2. **Bloquear el hilo principal**: Bucles síncronos >50ms causan jank y frames perdidos
3. **Olvidar nextTick en Node.js**: process.nextTick corre antes que Promises, no después
4. **Recursión de microtareas**: Promise.resolve().then(() => Promise.resolve().then(...)) puede bloquear
5. **Ignorar la fase de renderizado**: Colas pesadas de microtareas impiden el pintado del navegador

## Preguntas Frecuentes

**P: ¿Por qué Promise.then() corre antes que setTimeout(0)?**
R: Los callbacks de Promise entran en la cola de microtareas, que tiene mayor prioridad que la cola de macrotareas donde viven los callbacks de setTimeout.

**P: ¿Cuál es la diferencia entre queueMicrotask y Promise.resolve().then()?**
R: Funcionalmente idénticos en la mayoría de casos, pero queueMicrotask es más explícito y ligeramente más eficiente.

**P: ¿Cómo evito que el event loop se congele?**
R: Divide el trabajo en chunks pequeños usando setTimeout, requestIdleCallback o Web Workers para tareas intensivas en CPU.
`,

  'src/content/recipes/ai/ai-agents-tool-use.es.md': `## Visión General

Los agentes de IA son sistemas autónomos que utilizan modelos de lenguaje para razonar, planificar y ejecutar tareas llamando herramientas externas. A diferencia de simples chatbots, los agentes pueden buscar en la web, consultar bases de datos, ejecutar código e interactuar con APIs para cumplir objetivos complejos de múltiples pasos.

## Cuándo Usar

Usa este recurso cuando:
- Construyes asistentes autónomos que necesitan datos en tiempo real
- Creas flujos de trabajo que requieren múltiples llamadas a APIs encadenadas
- Implementas razonamiento sobre fuentes de conocimiento externas
- Diseñas sistemas autocorrectivos que pueden reintentar operaciones fallidas

## Solución

### Agente con Patrón ReAct (Python)

\`\`\`python
import openai
import json
from typing import Callable

def agente_react(query: str, tools: dict[str, Callable]) -> str:
    messages = [
        {"role": "system", "content": "Eres un asistente útil. Usa herramientas cuando sea necesario."},
        {"role": "user", "content": query}
    ]

    for _ in range(5):  # Máximo de iteraciones
        response = openai.chat.completions.create(
            model="gpt-4",
            messages=messages,
            tools=[
                {"type": "function", "function": {"name": n, "parameters": {}}}
                for n in tools.keys()
            ]
        )

        msg = response.choices[0].message
        if not msg.tool_calls:
            return msg.content

        messages.append(msg)
        for call in msg.tool_calls:
            result = tools[call.function.name](**json.loads(call.function.arguments))
            messages.append({
                "role": "tool",
                "tool_call_id": call.id,
                "content": str(result)
            })

    return "Máximo de iteraciones alcanzado"
\`\`\`

### Ejemplo de Definición de Herramienta

\`\`\`python
def buscar_wikipedia(query: str) -> str:
    """Buscar en Wikipedia por un tema."""
    # Implementación omitida
    return f"Resultados para {query}"

tools = {"buscar_wikipedia": buscar_wikipedia}
resultado = agente_react("¿Quién ganó el Mundial de FIFA 2022?", tools)
\`\`\`

## Explicación

El patrón ReAct (Razonamiento + Acción) alterna entre:

1. **Pensamiento**: El LLM razona sobre qué hacer a continuación
2. **Acción**: El LLM llama una herramienta con argumentos estructurados
3. **Observación**: El resultado de la herramienta se devuelve como contexto
4. **Repetir**: Hasta que la tarea esté completa

Decisiones clave de diseño:
- **Esquemas de herramientas**: Usa el formato de function calling de OpenAI para seguridad de tipos
- **Límites de iteración**: Previene bucles infinitos con un conteo máximo de pasos
- **Manejo de errores**: Las herramientas deben devolver errores gracefully, no crashear
- **Ventana de contexto**: Resume salidas largas de herramientas para ajustarse a los límites de tokens

## Variantes

| Framework | Patrón | Ideal Para |
|-----------|--------|------------|
| LangChain | ReAct, Plan-and-Execute | Prototipado rápido |
| AutoGen | Conversación multi-agente | Tareas colaborativas |
| CrewAI | Agentes basados en roles | Flujos de trabajo de negocio |
| Custom | ReAct con registro de herramientas | Sistemas de producción |

## Mejores Prácticas

- **Define interfaces claras de herramientas**: Cada herramienta necesita nombre, descripción y esquema JSON
- **Limita la cantidad de herramientas**: 3-5 herramientas bien diseñadas superan a 20 vagas
- **Agrega validación**: Verifica argumentos de herramientas antes de ejecutar
- **Registra todos los pasos**: El razonamiento del agente es opaco; el logging ayuda a depurar
- **Implementa timeouts**: Las herramientas externas pueden colgarse; establece timeouts generosos

## Errores Comunes

1. **Dar demasiadas herramientas a un agente**: Aumenta confusión y tasa de errores
2. **Faltar manejo de errores**: Una llamada a herramienta fallida sin recuperación crashea el loop
3. **Ignorar límites de tokens**: Historiales largos de observaciones agotan la ventana de contexto
4. **No validar salidas**: Los agentes pueden alucinar argumentos de herramientas
5. **Omitir revisión humana**: Los agentes autónomos deben tener interruptores de emergencia

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre RAG y un agente?**
R: RAG recupera documentos y responde una vez. Los agentes pueden tomar múltiples acciones, usar herramientas e iterar hasta cumplir una meta.

**P: ¿Cuántas herramientas debería tener un agente?**
R: Comienza con 2-3. La investigación muestra que la precisión cae significativamente más allá de 5-7 herramientas.

**P: ¿Los agentes pueden funcionar sin OpenAI?**
R: Sí. Modelos locales (Llama, Mistral) soportan llamado de herramientas vía formatos de salida estructurada como JSON mode.
`,

  'src/content/recipes/security/password-hashing-production.es.md': `## Visión General

Almacenar contraseñas de forma segura es una de las responsabilidades más críticas de cualquier aplicación. Los algoritmos modernos de hashing como bcrypt, scrypt y Argon2 están diseñados para ser lentos e intensivos en memoria, haciendo que los ataques de fuerza bruta sean computacionalmente inviables incluso si la base de datos es comprometida.

## Cuándo Usar

Usa este recurso cuando:
- Implementas autenticación de usuarios desde cero
- Migras de hashing legacy (MD5, SHA-1) a algoritmos modernos
- Eliges parámetros para bcrypt, scrypt o Argon2
- Auditas un sistema de autenticación existente

## Solución

### bcrypt (Node.js)

\`\`\`javascript
const bcrypt = require('bcrypt');

async function hashPassword(password) {
  const saltRounds = 12; // Ajusta según hardware (10-14 típico)
  const hash = await bcrypt.hash(password, saltRounds);
  return hash;
}

async function verifyPassword(password, hash) {
  return await bcrypt.compare(password, hash);
}
\`\`\`

### Argon2 (Python)

\`\`\`python
import argon2

ph = argon2.PasswordHasher(
    time_cost=3,      # Iteraciones
    memory_cost=65536, # 64 MB en KiB
    parallelism=4     # Hilos
)

def hash_password(password: str) -> str:
    return ph.hash(password)

def verify_password(password: str, hash: str) -> bool:
    try:
        ph.verify(hash, password)
        return True
    except argon2.exceptions.VerifyMismatchError:
        return False
\`\`\`

### scrypt (Go)

\`\`\`go
package main

import (
    "golang.org/x/crypto/scrypt"
    "crypto/rand"
    "encoding/base64"
)

func hashPassword(password string) (string, error) {
    salt := make([]byte, 16)
    rand.Read(salt)
    hash, err := scrypt.Key([]byte(password), salt, 32768, 8, 1, 32)
    if err != nil { return "", err }
    return base64.StdEncoding.EncodeToString(salt) + "$" + base64.StdEncoding.EncodeToString(hash), nil
}
\`\`\`

## Explicación

| Algoritmo | Intensivo en Memoria | Configurable | Recomendado Para |
|-----------|---------------------|--------------|------------------|
| bcrypt | No | Solo factor de costo | Uso general, amplio soporte de librerías |
| scrypt | Sí | Costo + memoria + paralelismo | Embebido, proyectos Go |
| Argon2 | Sí (ganador de PHC) | Tiempo + memoria + paralelismo | Nuevos proyectos, máxima seguridad |

**Reglas críticas**:
- Nunca inventes tu propia criptografía. Usa librerías bien validadas.
- El salt debe ser único por contraseña y almacenado junto al hash.
- El pepper (secreto del lado del servidor) agrega defensa en profundidad pero no sustituye el hashing.
- Re-hashear en login si los parámetros de costo aumentan.

## Variantes

| Lenguaje | Librería | Algoritmo | Notas |
|----------|----------|-----------|-------|
| Node.js | bcrypt | bcrypt | Más popular; bindings nativos |
| Python | argon2-cffi | Argon2 | Ganador del Password Hashing Competition |
| Go | golang.org/x/crypto | scrypt, bcrypt, Argon2 | Extensiones de librería estándar |
| Java | spring-security-crypto | bcrypt, Argon2 | Abstracción de Spring |
| Rust | argon2 | Argon2 | Soporte zeroize para limpieza de memoria |

## Mejores Prácticas

- **Usa Argon2id para proyectos nuevos**: Ganó el Password Hashing Competition (PHC)
- **Apunta a 250ms de tiempo de verificación**: Ajusta factores de costo a tu hardware
- **Almacena salts con hashes**: El salt no es secreto; prepéndelo al hash
- **Agrega un pepper**: Un secreto del lado del servidor agregado a la contraseña antes de hashear
- **Re-hashea en login**: Actualiza hashes legacy transparentemente cuando los usuarios inician sesión

## Errores Comunes

1. **Usar SHA-256 o MD5 para contraseñas**: Algoritmos rápidos son triviales de atacar con GPUs
2. **Codificar salts en duro**: Cada contraseña necesita un salt aleatorio único
3. **Ignorar ataques de timing**: Usa comparación en tiempo constante (incluido en librerías modernas)
4. **Olvidar actualizar factores de costo**: El hardware mejora; reajusta anualmente
5. **Almacenar contraseñas en texto plano**: Incluso "temporalmente" es un riesgo catastrófico

## Preguntas Frecuentes

**P: ¿Qué algoritmo debería elegir en 2025?**
R: Argon2id es la elección recomendada para sistemas nuevos. bcrypt es aceptable si las librerías de Argon2 no están disponibles.

**P: ¿Cómo migro usuarios de MD5 a Argon2?**
R: Re-hashea en el próximo login: verifica con MD5, luego hashea con Argon2 y reemplaza. Marca la migración en la base de datos.

**P: ¿Debería hashear del lado del cliente antes de enviar?**
R: No. El hashing del lado del cliente no ofrece beneficio de seguridad sobre HTTPS y elimina protección del lado del servidor.
`
};

for (const [filePath, body] of Object.entries(articles)) {
  fillBody(filePath, body);
}

console.log('ES part 1 done.');
