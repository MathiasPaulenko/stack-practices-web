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
  'src/content/recipes/architecture/dependency-injection.es.md': `## Visión General

La Inyección de Dependencias (DI) es un patrón de diseño donde los objetos reciben sus dependencias desde fuentes externas en lugar de crearlas internamente. Desacopla componentes, hace el código testeable sin mocks y permite composición flexible de servicios.

## Cuándo Usar

Usa este recurso cuando:
- Escribas tests unitarios que requieren sustituir servicios reales por dobles de prueba
- Construyas aplicaciones modulares donde los componentes no deberían conocer implementaciones concretas
- Manejes grafos de objetos complejos con dependencias transitivas
- Implementes arquitecturas de plugins o patrones de estrategia

## Solución

### Inyección por Constructor (TypeScript)

\`\`\`typescript
interface EmailService {
  send(to: string, subject: string, body: string): Promise<void>;
}

class UserService {
  constructor(
    private emailService: EmailService,
    private userRepository: UserRepository
  ) {}

  async register(email: string, password: string) {
    const user = await this.userRepository.create({ email, password });
    await this.emailService.send(email, 'Bienvenido', '¡Gracias por registrarte!');
    return user;
  }
}

// Cableado en producción
const userService = new UserService(
  new SendGridEmailService(),
  new PostgresUserRepository()
);

// Cableado en tests
const userServiceTest = new UserService(
  new FakeEmailService(),
  new InMemoryUserRepository()
);
\`\`\`

### Inyección por Propiedad (Python)

\`\`\`python
from typing import Protocol

class Logger(Protocol):
    def log(self, message: str) -> None: ...

class ConsoleLogger:
    def log(self, message: str) -> None:
        print(f"[LOG] {message}")

class OrderProcessor:
    logger: Logger = ConsoleLogger()  # Default

    def process(self, order: dict) -> None:
        self.logger.log(f"Procesando orden {order['id']}")
\`\`\`

### Contenedor de DI (Java con Spring)

\`\`\`java
@Service
public class PaymentService {
    private final PaymentGateway gateway;
    private final FraudChecker fraudChecker;

    public PaymentService(PaymentGateway gateway, FraudChecker fraudChecker) {
        this.gateway = gateway;
        this.fraudChecker = fraudChecker;
    }
}
\`\`\`

## Explicación

La DI invierte el control: en lugar de que los componentes encuentren o creen sus dependencias, el contenedor o el llamador las provee. Esto permite:

1. **Testeabilidad**: Intercambia servicios reales por fakes sin modificar código
2. **Flexibilidad**: Cambia implementaciones sin tocar consumidores
3. **Gestión de ciclo de vida**: Los contenedores pueden manejar singletons, instancias scoped y disposal
4. **Soporte AOP**: Decoradores e interceptores pueden inyectarse transparentemente

## Variantes

| Enfoque | Caso de Uso | Compromiso |
|---------|-------------|------------|
| Constructor | Dependencias obligatorias | Más explícito; mejor para testing |
| Propiedad/Setter | Dependencias opcionales | Puede crear objetos parcialmente inicializados |
| Método | Dependencias por llamada | Verboso; usado para inyección de estrategia |
| Service Locator | Código legacy | Oculta dependencias; más difícil de testear |

## Mejores Prácticas

- **Prefiere inyección por constructor**: Hace las dependencias explícitas e inmutables
- **Evita service locators**: Ocultan dependencias y dificultan los tests
- **Usa interfaces/protocolos**: Depende de abstracciones, no de tipos concretos
- **Mantén roots de composición superficiales**: Cablea dependencias en el punto de entrada de la aplicación

## Errores Comunes

1. **Explosión de constructores**: Más de 5 parámetros señala una abstracción faltante
2. **Fugas del contenedor**: Pasar el contenedor de DI a los servicios anula el propósito
3. **Acoplamiento al framework**: Usa anotaciones estándar (@Inject) cuando sea posible
4. **Ignorar ciclo de vida**: Servicios scoped resueltos como singletons causan fugas de memoria
5. **Dependencias circulares**: Refactoriza en eventos o un mediador si A depende de B y B de A

## Preguntas Frecuentes

**P: ¿La DI solo es para lenguajes orientados a objetos?**
R: No. Los lenguajes funcionales logran el mismo desacoplamiento mediante funciones de orden superior y aplicación parcial.

**P: ¿Cuándo usar un contenedor de DI vs. cableado manual?**
R: Cableado manual para apps simples (<50 servicios). Contenedores para grafos complejos, gestión de ciclo de vida o AOP.

**P: ¿La DI afecta la performance?**
R: Sobrecarga insignificante en runtime. Resuelve dependencias al inicio (root de composición), no por request.
`,

  'src/content/recipes/api/rest-api-design.es.md': `## Visión General

REST es el estilo arquitectónico dominante para diseñar APIs de red. Una API REST bien diseñada usa la semántica HTTP de manera consistente, provee URLs predecibles y devuelve códigos de estado significativos. Un diseño deficiente conduce a consumidores confundidos, clientes rotos e integraciones frágiles.

## Cuándo Usar

Usa este recurso cuando:
- Diseñes una API pública o interna desde cero
- Refactorices una API estilo RPC legacy a REST
- Documentes una API con OpenAPI/Swagger
- Elijas entre REST, GraphQL o gRPC para un nuevo servicio

## Solución

### Nomenclatura de Recursos

\`\`\`
GET    /users                # Listar usuarios
GET    /users/:id            # Obtener un usuario
POST   /users                # Crear un usuario
PUT    /users/:id            # Actualización completa
PATCH  /users/:id            # Actualización parcial
DELETE /users/:id            # Eliminar un usuario
GET    /users/:id/orders     # Recurso anidado
\`\`\`

### Códigos de Estado

\`\`\`javascript
// Respuestas exitosas
200 OK              // GET, PUT, DELETE exitoso
201 Created         // POST exitoso
204 No Content      // DELETE exitoso (opcional)

// Errores del cliente
400 Bad Request     // Fallo de validación
401 Unauthorized    // Token de auth faltante
403 Forbidden       // Permisos insuficientes
404 Not Found       // El recurso no existe
409 Conflict        // Duplicado o conflicto de estado
422 Unprocessable   // Error de validación semántica

// Errores del servidor
500 Internal Error  // Fallo inesperado del servidor
502 Bad Gateway     // Fallo upstream
503 Service Unavail // Rate limiting o mantenimiento
\`\`\`

### Paginación con Cursor

\`\`\`json
{
  "data": [...],
  "pagination": {
    "next_cursor": "eyJpZCI6MTAwfQ==",
    "prev_cursor": null,
    "has_more": true
  }
}
\`\`\`

## Explicación

REST aprovecha HTTP como protocolo de aplicación, no solo como transporte:

- **Idempotencia**: GET, PUT, DELETE deben ser seguros de reintentar. POST no es idempotente.
- **Sin estado**: Cada request contiene toda la información necesaria; sin sesión del lado del servidor.
- **Cacheabilidad**: Usa Cache-Control, ETag y Last-Modified agresivamente.
- **HATEOAS**: Incluye links a recursos relacionados (opcional pero mejora descubribilidad).

## Variantes

| Estilo | Caso de Uso | Notas |
|--------|-------------|-------|
| REST | CRUD, orientado a recursos | Ecosistema maduro; caching HTTP |
| GraphQL | Queries flexibles; mobile | Un solo endpoint; client-driven |
| gRPC | Microservicios internos | Binario; streaming; schema-first |
| JSON-RPC | RPC simple | Liviano; menos nativo HTTP |

## Mejores Prácticas

- **Usa sustantivos plurales**: /orders, no /order ni /getOrder
- **Versiona en la URL**: /v1/users (más explícito que headers)
- **Devuelve estructura consistente**: { data, error, meta }
- **Soporta filtrado**: GET /users?role=admin&active=true
- **Rate limit desde el inicio**: Devuelve 429 con header Retry-After

## Errores Comunes

1. **Usar verbos en URLs**: /createUser, /getOrders — usa sustantivos y métodos HTTP
2. **Ignorar códigos HTTP**: Devolver 200 con cuerpo de error rompe middleware
3. **No versionar**: Cambios breaking sin versionado abandonan clientes existentes
4. **Over-fetching**: Devolver objetos anidados enormes cuando el cliente necesita un subset
5. **Faltar negociación de contenido**: No respetar Accept y Content-Type headers

## Preguntas Frecuentes

**P: ¿Debería usar PUT o PATCH para actualizaciones?**
R: PUT para reemplazo completo (todos los campos requeridos). PATCH para actualizaciones parciales (solo campos cambiados).

**P: ¿Cómo manejo uploads de archivos en REST?**
R: Usa multipart/form-data para uploads simples. Para archivos grandes, usa signed URLs (S3, GCS) o uploads resumibles.

**P: ¿Vale la pena implementar HATEOAS?**
R: Para APIs públicas consumidas por diversos clientes, sí. Para APIs internas con clientes generados, opcional.
`,

  'src/content/recipes/frontend/websockets-realtime.es.md': `## Visión General

WebSockets proveen comunicación full-duplex persistente entre navegadores y servidores sobre una sola conexión TCP. A diferencia del polling HTTP, los WebSockets habilitan flujo de datos en tiempo real con latencia mínima, haciéndolos ideales para chat, dashboards en vivo, juegos multijugador y edición colaborativa.

## Cuándo Usar

Usa este recurso cuando:
- Construyas aplicaciones de chat o sistemas de comentarios en vivo
- Streamings de datos en tiempo real a dashboards (acciones, métricas, IoT)
- Implementes sincronización de estado de juegos multijugador
- Crees herramientas de edición colaborativa (como Google Docs)

## Solución

### Servidor con ws (Node.js)

\`\`\`javascript
const WebSocket = require('ws');
const wss = new WebSocket.Server({ port: 8080 });

const clients = new Set();

wss.on('connection', (ws, req) => {
  clients.add(ws);

  ws.on('message', (data) => {
    const message = JSON.parse(data);
    clients.forEach(client => {
      if (client.readyState === WebSocket.OPEN) {
        client.send(JSON.stringify({
          type: 'chat',
          from: message.user,
          text: message.text,
          timestamp: Date.now()
        }));
      }
    });
  });

  ws.on('close', () => clients.delete(ws));
});
\`\`\`

### Lógica de Reconexión del Cliente

\`\`\`javascript
class ReconnectingWebSocket {
  constructor(url) {
    this.url = url;
    this.ws = null;
    this.reconnectInterval = 3000;
    this.maxReconnectInterval = 30000;
    this.connect();
  }

  connect() {
    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectInterval = 3000;
    };

    this.ws.onclose = () => {
      setTimeout(() => this.connect(), this.reconnectInterval);
      this.reconnectInterval = Math.min(
        this.reconnectInterval * 2,
        this.maxReconnectInterval
      );
    };
  }

  send(data) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }
}
\`\`\`

## Explicación

El handshake de WebSocket actualiza una conexión HTTP:

1. **El cliente envía un request de upgrade** con headers Connection: Upgrade y Upgrade: websocket
2. **El servidor responde 101 Switching Protocols** para confirmar
3. **Frames bidireccionales** se intercambian sobre el socket TCP persistente
4. **Handshake de cierre** termina la conexión limpiamente

**Diferencias clave con SSE**:
- WebSockets son bidireccionales; SSE es solo servidor-a-cliente
- WebSockets usan frames binarios; SSE usa text/event-stream
- WebSockets necesitan heartbeat/ping propio; SSE usa HTTP keep-alive

## Variantes

| Tecnología | Dirección | Ideal Para |
|------------|-----------|------------|
| WebSockets | Bidireccional | Chat, juegos, colaboración |
| SSE | Servidor-a-cliente | Feeds en vivo, notificaciones |
| Long Polling | Servidor-a-cliente | Soporte de navegadores legacy |
| MQTT sobre WebSocket | Pub/sub | IoT, telemetría |

## Mejores Prácticas

- **Implementa heartbeat/ping**: Detecta conexiones muertas con frames ping/pong periódicos
- **Autentica durante el handshake**: Pasa JWT en query string o subprotocolo
- **Usa rooms/canales**: No transmitas todo a todos los clientes
- **Maneja backpressure**: Descarta o encola mensajes si los clientes son lentos
- **Fallback a SSE**: Para clientes detrás de proxies estrictos que bloquean WebSockets

## Errores Comunes

1. **Sin lógica de reconexión**: Problemas de red desconectan permanentemente a los usuarios
2. **Broadcasting a todos**: No escala; usa pub/sub o salas de canal
3. **Ignorar fugas de memoria**: Conexiones cerradas no removidas del set de clientes causan OOM
4. **Enviar binario sin framing**: Siempre serializa datos estructurados (JSON, Protobuf)
5. **No manejar timeouts de proxy**: Proxies corporativos pueden matar conexiones inactivas después de 30s

## Preguntas Frecuentes

**P: ¿Cuántas conexiones WebSocket concurrentes puede manejar un servidor?**
R: Node.js maneja ~10k-50k conexiones por core. Usa Redis pub/sub o un message bus para escalar horizontalmente.

**P: ¿Funcionan WebSockets sobre HTTPS?**
R: Sí — usa wss:// (WebSocket Secure). Los navegadores bloquean ws:// mixto en páginas HTTPS.

**P: ¿Cuál es el mejor fallback si WebSockets están bloqueados?**
R: Server-Sent Events para servidor-a-cliente; HTTP long polling para necesidades bidireccionales.
`
};

for (const [filePath, body] of Object.entries(articles)) {
  fillBody(filePath, body);
}

console.log('ES part 1 done for batch 13.');
