---
contentType: docs
slug: zero-downtime-deployment-checklist
title: "Checklist de Despliegue sin Tiempo de Inactividad"
description: "Un checklist para garantizar que los despliegues en produccion se completen sin interrumpir el servicio usando patrones de rollout seguros."
metaDescription: "Despliega cambios en produccion sin downtime con este checklist. Cubre health checks, despliegues canary, migraciones de base de datos y procedimientos de rollback."
difficulty: intermediate
topics:
  - devops
  - infrastructure
tags:
  - deployment
  - zero-downtime
  - canary
  - rollback
  - production
relatedResources:
  - /docs/devops/deployment-checklist-template
  - /docs/runbook-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Despliega cambios en produccion sin downtime con este checklist. Cubre health checks, despliegues canary, migraciones de base de datos y procedimientos de rollback."
  keywords:
    - checklist de despliegue sin downtime
    - checklist de despliegue canary
    - checklist de despliegue en produccion
    - despliegue blue green
    - checklist de rollback
---

## Descripcion General

Los despliegues sin tiempo de inactividad actualizan servicios de produccion sin interrumpir a los usuarios. Este checklist ayuda a los equipos a verificar que los health checks, el enrutamiento de trafico, las migraciones de base de datos y los planes de rollback esten en su lugar antes y durante un release.

## Cuando Usar

- Liberar una nueva version de un servicio orientado al usuario.
- Desplegar migraciones de esquema o datos que afecten multiples instancias.
- Cambiar infraestructura que pueda impactar la disponibilidad.
- Introducir una nueva estrategia de rollout como canary o blue-green.
- Prepararse para un evento de alto trafico donde la estabilidad es prioritaria.

## Prerequisitos

- Un pipeline de despliegue con etapas automaticas de build, test y publish.
- Endpoints de health check que representen la verdadera disponibilidad de la aplicacion.
- Load balancer, ingress o controlador de trafico que soporte rollout gradual.
- Estrategia de migracion de base de datos compatible hacia atras.
- Plan de rollback con artefacto y estado de datos conocidos como buenos.
- Monitoreo y alertas para tasa de error, latencia y metricas de negocio.
- Plan de comunicacion para stakeholders y clientes.

## Solucion

### Checklist

#### 1. Preparacion Pre-Despliegue

- [ ] El cambio de despliegue esta aprobado y documentado.
- [ ] El codigo esta mergeado y el artefacto esta construido y taggeado.
- [ ] Las pruebas unitarias, de integracion y de contrato pasan automaticamente.
- [ ] Las migraciones de base de datos se revisaron para compatibilidad hacia atras.
- [ ] Los feature flags estan configurados para habilitacion segura.
- [ ] La capacidad y limites de escalado son suficientes para el trafico esperado.
- [ ] Los dashboards y alertas de monitoreo estan activos.
- [ ] La rotacion de guardia conoce la ventana de despliegue.
- [ ] Los pasos de rollback estan documentados y probados en un entorno no productivo.
- [ ] La comunicacion orientada al cliente esta preparada si es necesario.

#### 2. Configuracion de Health Checks

| Check | Endpoint | Criterio de Exito | Accion ante Falla |
|-------|----------|-------------------|-------------------|
| Liveness | `/health/live` | HTTP 200 | Reiniciar contenedor |
| Readiness | `/health/ready` | HTTP 200 y dependencias arriba | Detener enrutamiento de trafico |
| Startup | `/health/startup` | HTTP 200 | Retrasar despliegue |
| Dependency | `/health/deps` | Base de datos, cache, cola alcanzables | Alertar y detener |
| Business | `/health/business` | Flujo critico devuelve valor esperado | Paginar al guardia |

#### 3. Seleccion de Estrategia de Rollout

| Estrategia | Caso de Uso | Nivel de Riesgo | Velocidad de Rollback |
|------------|-------------|-----------------|-----------------------|
| Rolling update | Servicios sin estado, bajo riesgo | Bajo | Media (terminar nuevos pods) |
| Blue-green | Sesiones stateful, releases predecibles | Medio | Rapida (cambiar trafico de vuelta) |
| Canary | Alto riesgo, metricas medibles | Medio | Rapida (drenar canary) |
| Feature flag | Exposicion gradual de usuarios | Bajo | Instantanea (apagar toggle) |
| A/B deployment | Validar comportamiento de usuarios | Medio | Rapida (re-rutear trafico) |

#### 4. Pasos de Ejecucion del Despliegue

| Paso | Accion | Verificacion |
|------|--------|--------------|
| 1 | Desplegar en staging y ejecutar pruebas de humo | Pruebas de staging pasan |
| 2 | Desplegar canary o subconjunto pequeno | Health checks pasan, tasa de error estable |
| 3 | Monitorear metricas clave durante la duracion del canary | Latencia, tasa de error, metricas de negocio dentro de la linea base |
| 4 | Incrementar porcentaje de trafico gradualmente | Cada etapa pasa health checks y verificaciones de metricas |
| 5 | Completar rollout al 100% | Todas las instancias saludables y sirviendo trafico |
| 6 | Validar endpoints de produccion | Pruebas de humo y flujos criticos de usuario pasan |
| 7 | Mantener version anterior disponible para rollback | Retener durante la ventana de rollback definida |
| 8 | Confirmar que la ventana de rollback ha pasado | Eliminar version anterior o actualizar la linea base del artefacto |

#### 5. Seguridad de Migraciones de Base de Datos

- [ ] Las migraciones son aditivas y compatibles hacia atras con la version anterior.
- [ ] El codigo viejo puede leer el nuevo esquema sin errores.
- [ ] El codigo nuevo puede leer el esquema viejo si se requiere rollback.
- [ ] Los indices se crean concurrentemente donde se soporta.
- [ ] Las migraciones grandes se dividen en lotes mas pequenos.
- [ ] Los jobs de relleno de datos o migracion son idempotentes.
- [ ] El script de rollback o operacion compensatoria esta disponible.
- [ ] Los cambios de base de datos se prueban en staging con datos similares a produccion.

#### 6. Disparadores de Rollback

| Disparador | Umbral | Accion |
|------------|--------|--------|
| Pico de tasa de error | > 0.5% durante 2 minutos | Pausar despliegue e investigar |
| Aumento de latencia | p99 > linea base + 30% durante 5 minutos | Revertir trafico |
| Caida de metrica de negocio | Tasa de conversion cae > 5% | Rollback inmediato |
| Falla de health check | > 10% fallando | Rollback inmediato |
| Alerta critica | Cualquier incidente P1 | Rollback y paginar al guardia |
| Timeout de canary | La etapa canary excede la duracion sin aprobar | Rollback del canary |

#### 7. Validacion Post-Despliegue

- [ ] Los logs de aplicacion no muestran errores inesperados.
- [ ] La tasa de error y latencia estan dentro de la linea base.
- [ ] Las metricas de negocio son estables o mejoran.
- [ ] Todos los feature flags estan en el estado deseado.
- [ ] Los recursos antiguos se limpian despues de la ventana de rollback.
- [ ] El resumen del despliegue se comparte con el equipo.
- [ ] Cualquier problema se registra en el issue tracker con duenos.

## Explicacion

Los despliegues sin tiempo de inactividad dependen de tres cosas: mecanismos de rollout seguros, senales de salud confiables y rollback rapido. Un checklist asegura que cada release considere el enrutamiento de trafico, la compatibilidad de datos y la observabilidad antes de que cualquier usuario sea expuesto. Combinar esta disciplina con la automatizacion reduce el riesgo de incidentes en produccion y mejora la confianza en los releases.

## Configuracion de Rolling Update en Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-gateway
spec:
  replicas: 10
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 3
      maxUnavailable: 0
  template:
    spec:
      containers:
        - name: api
          image: registry.example.com/api:v2.3.1
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 8080
            initialDelaySeconds: 5
            periodSeconds: 5
            failureThreshold: 3
          livenessProbe:
            httpGet:
              path: /health/live
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 10
            failureThreshold: 3
          lifecycle:
            preStop:
              exec:
                command: ["sh", "-c", "sleep 15 && kill -SIGTERM 1"]
      terminationGracePeriodSeconds: 60
```

## Configuracion de Canary con Argo Rollouts

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Rollout
metadata:
  name: api-gateway
spec:
  replicas: 10
  strategy:
    canary:
      steps:
        - setWeight: 10
        - pause: { duration: 5m }
        - analysis:
            templates:
              - templateName: success-rate
            args:
              - name: service-name
                value: api-gateway
        - setWeight: 30
        - pause: { duration: 5m }
        - analysis:
            templates:
              - templateName: success-rate
            args:
              - name: service-name
                value: api-gateway
        - setWeight: 50
        - pause: { duration: 10m }
        - setWeight: 100
  selector:
    matchLabels:
      app: api-gateway
  template:
    metadata:
      labels:
        app: api-gateway
    spec:
      containers:
        - name: api
          image: registry.example.com/api:v2.3.1
          ports:
            - containerPort: 8080
```


## Variantes

- Checklist de rolling update en Kubernetes: Enfoque en readiness probes, max surge, max unavailable y pod disruption budgets.
- Checklist de despliegue blue-green: Enfoque en el switch de trafico, compatibilidad de base de datos y retencion de versiones.
- Checklist de despliegue canary: Enfoque en umbrales de metricas, pesos de trafico progresivos y puertas de rollback automatico.
- Checklist de despliegue serverless: Enfoque en versionado de funciones, enrutamiento de alias y gestion de etapas de API Gateway.
- Checklist de despliegue con mucha base de datos: Enfoque en compatibilidad de esquema, orden de migraciones y scripts de rollback.
- Checklist de despliegue movil o cliente: Enfoque en rollout escalonado, manejo de actualizaciones forzadas y compatibilidad de API.

## Lo que funciona

- Manten los despliegues pequenos y frecuentes para reducir el riesgo.
- Haz que los cambios de base de datos sean compatibles hacia atras con el codigo viejo y nuevo.
- Usa health checks que verifiquen dependencias reales, no solo la vida del proceso.
- Automatiza el rollback basado en metricas, no solo en puertas de decision manual.
- Monitorea metricas de negocio, no solo metricas tecnicas.
- Manten un artefacto baseline conocido como bueno para rollback rapido.
- Practica rollbacks en staging o durante game days.
- Documenta las decisiones y resultados del despliegue para futuras revisiones.

## Errores Comunes

- Omitir health checks o usar verificaciones HTTP 200 triviales.
- Desplegar cambios de base de datos que no son compatibles hacia atras.
- Enrutar el 100% del trafico antes de validar metricas.
- No tener un plan de rollback antes de iniciar el despliegue.
- Ignorar el aumento de latencia a favor solo de la tasa de error.
- Limpiar versiones antiguas demasiado pronto.
- Desplegar durante picos de trafico sin planificacion de capacidad.

## FAQs

### Cual es la diferencia entre despliegue rolling y canary?

Un rolling update reemplaza instancias viejas una a la vez a lo largo de todo el fleet. Un canary despliega primero un subconjunto pequeno, valida metricas y luego aumenta gradualmente el trafico a la nueva version.

### Como hacemos que los cambios de base de datos sean seguros para cero downtime?

Usa cambios aditivos primero (agregar columnas, tablas, indices), despliega codigo que lee tanto el esquema viejo como el nuevo, y luego elimina el esquema viejo en un release posterior. Esto se conoce como patron expand-contract.

### Cuando debemos hacer rollback inmediatamente?

Haz rollback cuando los health checks fallan ampliamente, la tasa de error se dispara, caen metricas criticas de negocio o se dispara una alerta P1. Un rollback mas rapido preserva la confianza del usuario y los ingresos.


### Como manejamos conexiones de larga duracion durante el despliegue?

Las conexiones de larga duracion (WebSockets, SSE, gRPC streams) requieren manejo especial. Usa un preStop hook para dar tiempo a las conexiones para drenar naturalmente. Configura el load balancer con connection draining (AWS: deregistration delay, GCP: connection draining timeout). Establece terminationGracePeriodSeconds lo suficientemente alto para la conexion mas larga esperada. Para WebSockets, envia un close frame del lado del servidor antes de terminar. Monitorea el conteo de conexiones activas durante el rollout y espera a que llegue a cero antes de forzar el kill de pods.

### Cual es el patron expand-contract para migraciones de base de datos?

Expand-contract es un patron de tres fases para cambios de esquema sin downtime. Fase 1 (Expand): agrega nuevas columnas, tablas o indices sin remover las viejas. Tanto codigo viejo como nuevo pueden ejecutarse. Fase 2 (Migrate): despliega codigo que escribe a ambos esquemas viejo y nuevo, backfill de datos existentes, y lee del nuevo esquema. Fase 3 (Contract): despliega codigo que solo usa el nuevo esquema, luego elimina columnas viejas en un despliegue posterior. Cada fase es un despliegue separado con su propio periodo de validacion.

### Como probamos despliegues sin downtime antes de produccion?

Prueba en staging con carga realista: usa un generador de carga que simule patrones de trafico de produccion. Despliega mientras la carga esta corriendo y mide: tasa de error durante el rollout, percentiles de latencia (p50, p95, p99), tasa de conexiones dropeadas, y tasa de exito de requests. Verifica que el rollout complete dentro del tiempo esperado. Prueba rollback bajo carga tambien. Ejecuta estas pruebas en CI para cada release mayor. Documenta el comportamiento esperado y alerta si los rollouts de produccion se desvian de los resultados de staging.

### Como manejamos toggles de feature flags durante el despliegue?

Despliega con el feature flag deshabilitado. Verifica que el despliegue es estable. Luego habilita el flag para un pequeno porcentaje de usuarios (1-5%). Monitorea metricas por 10-15 minutos. Incrementa gradualmente el porcentaje (10%, 25%, 50%, 100%) con monitoreo en cada paso. Si aparecen problemas, deshabilita el flag instantaneamente sin rollback. Mantén el flag en el codigo por al menos un ciclo de release despues de la habilitacion completa antes de removerlo. Documenta el ciclo de vida del flag: creado, habilitado, verificado, removido.

### Que monitoreo necesitamos durante despliegues sin downtime?

Monitorea: tasa de error (alerta si > 0.5% por 2 min), latencia p99 (alerta si > baseline + 30%), tasa de exito de health checks (alerta si < 95%), progreso del despliegue (alerta si estancado), conteo de reinicios de pod (alerta si > 2 en 5 min), y metricas de negocio (alerta si conversion cae > 5%). Usa un dashboard de despliegue que superponga eventos de despliegue con metricas de aplicacion. Configura triggers de rollback automatizados basados en estas metricas. Revisa metricas de despliegue en la validacion post-despliegue.




Revisa y actualiza esta checklist despues de cada incidente de despliegue. Elimina pasos que no agregan valor, agrega pasos que habrian detectado el problema, y refina los gates de automatizacion.


Fin del documento. Revisar trimestralmente.


End of document. Review and update quarterly.