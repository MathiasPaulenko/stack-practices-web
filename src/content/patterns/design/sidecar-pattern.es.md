---
contentType: patterns
slug: sidecar-pattern
title: "Patrón Sidecar"
description: "Despliega componentes auxiliares junto a la aplicación principal como contenedores o procesos separados. Un patrón de microservicios para extender funcionalidad sin modificar la app principal."
metaDescription: "Aprende el Patrón Sidecar en Python, Java y JavaScript. Patrón de microservicios para extender funcionalidad de aplicaciones con servicios auxiliares."
difficulty: intermediate
topics:
  - design
tags:
  - sidecar
  - patron
  - patron-de-diseno
  - microservicios
  - contenedores
  - servicios-auxiliares
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/ambassador-pattern
  - /patterns/design/proxy-pattern
  - /patterns/design/observer-pattern
lastUpdated: "2026-06-12"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende el Patrón Sidecar en Python, Java y JavaScript. Patrón de microservicios para extender funcionalidad de aplicaciones con servicios auxiliares."
  keywords:
    - patron sidecar
    - patron de diseno
    - patron microservicios
    - contenedor auxiliar
    - kubernetes sidecar
    - python sidecar
    - java sidecar
    - javascript sidecar
---

# Patrón Sidecar

## Resumen

El Patrón Sidecar despliega componentes auxiliares junto a la aplicación principal como contenedores o procesos separados. Estos sidecars extienden o mejoran la aplicación principal con preocupaciones transversales como logging, monitoreo, configuración o networking — sin modificar el código de la aplicación principal.

## Cuándo usarlo

Usa el Patrón Sidecar cuando:
- Necesites agregar preocupaciones transversales (logging, métricas, recarga de config) sin cambiar la app principal
- La aplicación principal sea un servicio de terceros que no puedes modificar
- Los componentes necesiten compartir ciclo de vida pero ser desplegables y escalables independientemente
- Quieras aislar dominios de falla — un crash del sidecar no debería caer la app principal
- Ejemplos: proxy Istio, shipper de logs Fluent Bit, agente Vault para secretos, NGINX junto a servidor de app

## Solución

### Python

```python
import threading
import time

class MainApp:
    def __init__(self):
        self.running = True
        self.log_buffer = []

    def do_work(self):
        while self.running:
            self.log_buffer.append(f"Procesado en {time.time()}")
            time.sleep(1)

    def get_logs(self):
        return self.log_buffer

# Sidecar: shipper de logs
class LogShipperSidecar:
    def __init__(self, app: MainApp, interval: int = 5):
        self.app = app
        self.interval = interval
        self.thread = None

    def start(self):
        self.thread = threading.Thread(target=self._ship, daemon=True)
        self.thread.start()

    def _ship(self):
        while self.app.running:
            time.sleep(self.interval)
            logs = self.app.get_logs()
            if logs:
                print(f"[Sidecar] Enviando {len(logs)} logs a servicio externo")
                logs.clear()

# Uso
app = MainApp()
shipper = LogShipperSidecar(app)
shipper.start()

# Simula trabajo de app principal
for _ in range(12):
    app.do_work()
```

### JavaScript

```javascript
class MainApp {
  constructor() {
    this.running = true;
    this.logBuffer = [];
  }

  doWork() {
    this.logBuffer.push(`Procesado en ${Date.now()}`);
  }

  getLogs() {
    return this.logBuffer;
  }
}

// Sidecar: recolector de métricas
class MetricsSidecar {
  constructor(app, intervalMs = 5000) {
    this.app = app;
    this.interval = intervalMs;
  }

  start() {
    this.timer = setInterval(() => {
      if (!this.app.running) return;
      const logs = this.app.getLogs();
      console.log(`[Sidecar] Recolectados ${logs.length} eventos para métricas`);
    }, this.interval);
  }

  stop() {
    clearInterval(this.timer);
  }
}

// Uso
const app = new MainApp();
const metrics = new MetricsSidecar(app);
metrics.start();

// Simula trabajo
const work = setInterval(() => app.doWork(), 1000);
setTimeout(() => {
  clearInterval(work);
  metrics.stop();
}, 12000);
```

### Java

```java
import java.util.*;
import java.util.concurrent.*;

class MainApp {
    volatile boolean running = true;
    List<String> logBuffer = Collections.synchronizedList(new ArrayList<>());

    void doWork() {
        logBuffer.add("Procesado en " + System.currentTimeMillis());
    }

    List<String> getLogs() {
        return new ArrayList<>(logBuffer);
    }
}

// Sidecar: reporte de salud
class HealthSidecar {
    private final MainApp app;
    private final ScheduledExecutorService scheduler = Executors.newSingleThreadScheduledExecutor();

    HealthSidecar(MainApp app, int intervalSec) {
        this.app = app;
        scheduler.scheduleAtFixedRate(() -> {
            if (!app.running) return;
            System.out.println("[Sidecar] Reportando salud: " + app.getLogs().size() + " eventos procesados");
        }, intervalSec, intervalSec, TimeUnit.SECONDS);
    }

    void stop() {
        scheduler.shutdown();
    }
}

// Uso
MainApp app = new MainApp();
HealthSidecar sidecar = new HealthSidecar(app, 5);

for (int i = 0; i < 12; i++) {
    app.doWork();
    Thread.sleep(1000);
}

sidecar.stop();
```

## Explicación

El Patrón Sidecar separa preocupaciones en procesos co-ubicados pero independientes:

- **Contenedor Principal**: La aplicación core enfocada en lógica de negocio
- **Contenedor Sidecar**: Un proceso auxiliar que comparte el pod/vm/host pero corre independientemente
- **Recursos Compartidos**: Filesystem, namespace de red, localhost — permitiendo comunicación sin networking externo
- **Ciclo de Vida Independiente**: Los sidecars pueden actualizarse, escalar o reiniciarse independientemente de la app principal

## Variantes

| Variante | Descripción | Caso de uso |
|----------|-------------|-------------|
| **Sidecar Ambassador** | Proxy para comunicación con servicios externos | Descubrimiento de servicios, terminación TLS |
| **Sidecar Adapter** | Normaliza salida de la app principal | Formatos de log, scraping de métricas |
| **Sidecar Config** | Recarga configuración dinámicamente | Watchers de Consul, etcd |
| **Sidecar Security** | Proxy de autenticación/autorización | OAuth, mTLS, Vault |

## Mejores prácticas

- **Mantén los sidecars ligeros** — deberían usar mínimo CPU/memoria
- **Comparte una interfaz localhost** para comunicación entre procesos en lugar de networking externo
- **Monitorea la salud del sidecar independientemente** — usa health checks separados
- **Versiona sidecars independientemente** de la aplicación principal
- **Documenta los requerimientos de recursos del sidecar** para planificación de capacidad
- **Usa init containers de Kubernetes** para sidecars de configuración one-time

## Errores comunes

- Hacer sidecars demasiado pesados, consumiendo recursos que la app principal necesita
- Acoplamiento fuerte entre sidecar y app principal, derrotando el propósito de separación
- No manejar fallas del sidecar gracefulmente — la app principal debería degradarse, no caer
- Agregar demasiados sidecars por pod, creando complejidad operativa
- Usar sidecars cuando un middleware in-process simple sería suficiente

## Preguntas frecuentes

**P: ¿Cuál es la diferencia entre Sidecar y Ambassador?**
R: Ambassador es un tipo específico de sidecar que hace proxy de comunicación con servicios externos. Sidecar es el patrón general — cualquier contenedor auxiliar cuenta (logging, config, monitoreo, proxy).

**P: ¿Debería usar un sidecar o agregar la funcionalidad in-process?**
R: Usa un sidecar cuando la funcionalidad sea agnóstica de lenguaje, necesite despliegue independiente, o cuando no puedas modificar la app principal. Usa in-process cuando la latencia sea crítica y la lógica sea simple.
