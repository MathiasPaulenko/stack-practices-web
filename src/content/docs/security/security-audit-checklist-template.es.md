---
contentType: docs
slug: security-audit-checklist-template
title: "Checklist de Auditoría de Seguridad"
description: "Un checklist exhaustivo para realizar auditorías de seguridad de aplicaciones e infraestructura."
metaDescription: "Usa este checklist de auditoría de seguridad para revisar autenticación, autorización, protección de datos, seguridad de infraestructura y brechas de cumplimiento."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - audit
  - checklist
  - compliance
  - infrastructure
relatedResources:
  - /docs/data-retention-policy-template
  - /recipes/encryption-at-rest
  - /docs/dependency-audit-template
  - /docs/penetration-test-template
  - /docs/security-incident-response-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Usa este checklist de auditoría de seguridad para revisar autenticación, autorización, protección de datos, seguridad de infraestructura y brechas de cumplimiento."
  keywords:
    - seguridad
    - auditoría
    - checklist
    - cumplimiento
    - infraestructura
---

## Visión General

Las auditorías de seguridad identifican vulnerabilidades antes que los atacantes. Un checklist repetible asegura que ninguna área crítica sea omitida, desde autenticación y autorización hasta endurecimiento de infraestructura y cumplimiento. Esta plantilla cubre verificaciones de seguridad a nivel de aplicación e infraestructura.

## Cuándo Usar

Usa este recurso cuando:
- Realizas una revisión de seguridad trimestral o anual
- Integras una nueva aplicación o servicio a producción
- Respondes a un incidente de seguridad con una revisión posterior

## Solución

```markdown
# Checklist de Auditoría de Seguridad

## 1. Autenticación y Autorización

- [ ] Todos los endpoints orientados al usuario requieren autenticación
- [ ] Las contraseñas se hashean con bcrypt, Argon2 o PBKDF2 (no MD5/SHA1)
- [ ] La autenticación multifactor es obligatoria para roles admin / privilegiados
- [ ] Los tokens de sesión usan generación aleatoria criptográficamente segura
- [ ] La expiración de sesión y rotación de refresh tokens están configuradas
- [ ] El control de acceso basado en roles (RBAC) está implementado y forzado server-side
- [ ] Las API keys se almacenan en un gestor de secretos, no en código o logs
- [ ] Los flujos OAuth / OIDC usan PKCE para clientes públicos
- [ ] El rate limiting se aplica a endpoints de login, reset de contraseña y registro

## 2. Protección de Datos

- [ ] Los datos sensibles están encriptados en reposo (base de datos, archivos, backups)
- [ ] TLS 1.2+ es forzado para todas las comunicaciones de red
- [ ] El PII se minimiza, se anonimiza donde sea posible y está sujeto a políticas de retención
- [ ] Las columnas de base de datos que almacenan contraseñas o tokens usan encriptación apropiada
- [ ] Los backups están encriptados y el acceso está restringido a roles autorizados
- [ ] Los flujos de eliminación de datos cumplen con el "derecho al olvido" del GDPR / CCPA

## 3. Validación de Entradas y Codificación de Salidas

- [ ] Todas las entradas de usuario se validan del lado del servidor (no solo del cliente)
- [ ] Se usan consultas parametrizadas u ORMs para todo acceso a base de datos
- [ ] La salida HTML está codificada para prevenir ataques XSS
- [ ] Las cargas de archivos están restringidas por tipo, tamaño y escaneadas por malware
- [ ] Los headers de Content Security Policy (CSP) están configurados y forzados
- [ ] Los tokens CSRF protegen operaciones que modifican estado

## 4. Infraestructura y Red

- [ ] Los recursos en la nube usan roles y políticas IAM de mínimo privilegio
- [ ] Los security groups / reglas de firewall permiten solo puertos y fuentes requeridos
- [ ] Los servicios públicos corren detrás de un WAF o proxy inverso
- [ ] Las imágenes de contenedor se escanean por CVEs antes del despliegue
- [ ] Los secretos (contraseñas DB, API keys) se inyectan en runtime, no se hornean en imágenes
- [ ] La agregación de logs es centralizada y a prueba de manipulación
- [ ] La protección DDoS está habilitada en el borde (Cloudflare, AWS Shield)

## 5. Logging y Monitoreo

- [ ] Los fallos de autenticación, denegaciones de acceso y escalaciones de privilegios se registran
- [ ] Los logs no contienen contraseñas, tokens o números de tarjeta de crédito
- [ ] Existen alertas para patrones sospechosos: fuerza bruta, acceso inusual a datos, hits de rate limit
- [ ] Los logs de auditoría se retienen por al menos 90 días y son inmutables

## 6. Dependencias y Cadena de Suministro

- [ ] Las herramientas de escaneo de dependencias (Snyk, Dependabot, OWASP DC) están activas
- [ ] No hay CVEs altos o críticos en dependencias directas sin plan de mitigación
- [ ] Las imágenes base de contenedor provienen de fuentes confiables y se actualizan regularmente
- [ ] Se genera un Software Bill of Materials (SBOM) para cada release

## 7. Cumplimiento y Documentación

- [ ] Las políticas de seguridad están documentadas y revisadas anualmente
- [ ] El runbook de respuesta a incidentes existe y se prueba con ejercicios de simulacro
- [ ] Las etiquetas de clasificación de datos (Público, Interno, Confidencial, Restringido) están aplicadas
- [ ] Los proveedores terceros con acceso a datos han firmado acuerdos DPA / BAA
- [ ] Las pruebas de penetración se realizan anualmente por empresas externas
```

## Explicación

El checklist está organizado por **dominio de seguridad** para que los equipos puedan dividir el trabajo entre especialidades: ingenieros backend manejan auth y validación de entradas, DevOps asegura la infraestructura, y los equipos de cumplimiento validan documentación. Cada ítem es binario aprobado/reprobado para mantener auditorías objetivas. La plantilla puede copiarse a un sistema de tickets o ejecutarse como un escaneo de cumplimiento automatizado.

## Guia de Ejecucion de Auditoria de Seguridad

```text
=== Preparacion Pre-Auditoria (1 semana antes) ===

[ ] Definir alcance de auditoria (que servicios, entornos, equipos)
[ ] Notificar a los equipos las fechas de auditoria y evidencia requerida
[ ] Recopilar documentacion de seguridad existente (politicas, procedimientos)
[ ] Revisar hallazgos de auditorias previas y estado de remediacion
[ ] Preparar acceso a sistemas, repos, e infraestructura para el auditor
[ ] Programar entrevistas con lideres de equipo y duenos de seguridad

=== Durante la Auditoria ===

[ ] Recorrer cada seccion del checklist con el equipo responsable
[ ] Capturar evidencia: capturas, archivos de config, links a politicas, output de herramientas
[ ] Documentar hallazgos: pasa, falla, parcial, no aplica
[ ] Asignar severidad a cada hallazgo: Critico, Alto, Medio, Bajo
[ ] Notar pasos de remediacion para cada hallazgo
[ ] Identificar quick wins (arreglables en 1 semana)
[ ] Identificar items a largo plazo (requieren planificacion o presupuesto)

=== Post-Auditoria (1 semana despues) ===

[ ] Compilar reporte de auditoria con hallazgos y evidencia
[ ] Compartir reporte con liderazgo de ingenieria y equipo de seguridad
[ ] Crear tickets para cada hallazgo con severidad y fecha limite
[ ] Programar revision de remediacion a 30/60/90 dias
[ ] Actualizar politicas de seguridad basado en aprendizajes de auditoria
[ ] Planificar proxima fecha de auditoria (trimestral para servicios criticos)
```

## Plantillas de Evidencia de Auditoria

```text
=== Evidencia: Revision de Autenticacion ===

Servicio: [NOMBRE_SERVICIO]
Fecha: [FECHA]
Revisor: [NOMBRE]

Metodo de autenticacion: [OAuth2 / SAML / JWT / Sesion]
MFA aplicado: [Si / No]
Politica de contrasenas: [Min longitud, complejidad, rotacion]
Timeout de sesion: [Duracion]
Bloqueo por login fallido: [Umbral y duracion]
Evidencia: [Captura de config de auth / link a politica]

Hallazgo: [Pasa / Falla / Parcial]
Notas: [OBSERVACIONES]
```


## Variantes

| Contexto | Enfoque | Notas |
|----------|---------|-------|
| Startup | Subconjunto ligero | Enfocarse primero en auth, validación de entradas y escaneo de dependencias |
| Enterprise | Checklist completo + evidencia | Requerir capturas, enlaces a políticas y firmas por ítem |
| Cloud-native | Agregar ítems específicos de contenedores | Incluir pod security policies, RBAC y network policies |

## Lo que funciona

1. Ejecutar este checklist antes de cada lanzamiento a producción, no solo anualmente
2. Asignar cada sección al equipo que posee los sistemas relevantes
3. Rastrear hallazgos en una herramienta de gestión de vulnerabilidades con severidad y fechas límite
4. Re-probar ítems después de cambios importantes de infraestructura o aplicación
5. Compartir resultados con liderazgo para justificar inversión en seguridad

## Errores Comunes

1. Tratar auditorías de seguridad como un ejercicio de casillas sin corregir hallazgos
2. Omitir verificaciones de infraestructura porque "el proveedor de nube lo maneja"
3. Confiar solo en escáners automatizados y omitir revisión manual
4. No actualizar el checklist a medida que el escenario de amenazas evoluciona
5. Mantener resultados de auditoría en un silo en lugar de compartirlos con equipos de ingeniería

## Preguntas Frecuentes

### ¿Cuánto tiempo debería tomar una auditoría de seguridad?

Una auditoría ligera para una sola aplicación toma 2-4 horas. Una auditoría empresarial exhaustiva a través de infraestructura, aplicaciones y cumplimiento puede tomar 1-2 semanas.

### ¿Se deben usar auditores externos?

Sí, al menos anualmente. Los equipos internos conocen demasiado bien el sistema para encontrar puntos ciegos obvios. Los auditores externos aportan perspectiva fresca y benchmarks de la industria.

### ¿Qué pasa si un ítem falla pero la corrección es costosa?

Documenta el riesgo, crea un plan de mitigación (workarounds, monitoreo, seguro) y asigna una fecha objetivo. Algunos riesgos se aceptan con firma ejecutiva, pero deben revisitarse regularmente.


### Como priorizamos hallazgos de auditoria de seguridad?

Prioriza por severidad y explotabilidad: hallazgos Criticos (ejecucion remota de codigo, bypass de autenticacion, exposicion de datos) deben arreglarse inmediatamente — en 24-48 horas. Hallazgos Altos (escalada de privilegios, SQL injection) en 1 semana. Hallazgos Medios (falta de encripcion, politica de contrasenas debil) en 30 dias. Hallazgos Bajos (divulgacion de informacion, headers faltantes) en 90 dias. Usa el score CVSS como baseline pero ajusta segun contexto de negocio — un hallazgo Critico en un servicio publico es mas urgente que en una herramienta interna. Rastrea todos los hallazgos en una herramienta de gestion de vulnerabilidades con fechas limite y duenos.

### Que herramientas debemos usar durante una auditoria de seguridad?

Usa una combinacion de herramientas automatizadas y manuales: SAST (SonarQube, Semgrep, CodeQL) para analisis de codigo fuente. DAST (OWASP ZAP, Burp Suite) para testing en runtime. Escaneo de dependencias (Snyk, Dependabot, OWASP Dependency-Check) para librerias vulnerables. Escaneo de infraestructura (tfsec, CIS benchmarks, cloud security posture management). Escaneo de secrets (GitLeaks, TruffleHog) para secrets hardcoded. Revision manual — revision de codigo, revision de arquitectura, y threat modeling. Ninguna herramienta individual encuentra todos los problemas — usa multiples herramientas y revision manual.

### Como conducimos una auditoria de seguridad para arquitectura de microservicios?

Para microservicios: audita cada servicio individualmente pero tambien audita la comunicacion entre servicios. Por servicio: autenticacion, autorizacion, validacion de entradas, escaneo de dependencias, y gestion de secrets. Entre servicios: mTLS, network policies, seguridad del API gateway, y configuracion del service mesh. Verifica broken access control entre servicios — un servicio con acceso a todas las bases de datos es un riesgo. Revisa el API gateway para rate limiting, autenticacion, y validacion de requests. Audita el pipeline de CI/CD de cada servicio — un pipeline comprometido puede inyectar codigo malicioso. Documenta el grafo de dependencias de servicios e identifica caminos de ataque.

### Cual es la diferencia entre auditoria de seguridad y penetration test?

Una auditoria de seguridad es una revision exhaustiva de controles, politicas, y configuraciones de seguridad — responde "son nuestras medidas de seguridad adecuadas?" Un penetration test es un ataque simulado — responde "alguien puede realmente entrar?" Las auditorias son mas amplias (politicas, procedimientos, configuraciones) mientras que los pentests son mas profundos (explotando vulnerabilidades especificas). Las auditorias son tipicamente internas o por un asesor externo; los pentests son por firmas de seguridad especializadas. Ambos son necesarios: una auditoria identifica brechas en controles, un pentest valida que los controles funcionan bajo ataque. Programa auditorias trimestralmente y pentests anualmente o antes de releases mayores.

### Como rastreamos la remediacion de hallazgos de auditoria?

Usa una herramienta de gestion de vulnerabilidades (Jira, GitHub Issues, DefectDojo) para rastrear cada hallazgo. Crea un ticket con: descripcion del hallazgo, severidad, evidencia, pasos de remediacion, dueno, y fecha limite. Revisa hallazgos abiertos semanalmente en el standup de seguridad. Escala hallazgos Criticos y Altos vencidos a liderazgo de ingenieria. Cierra hallazgos solo despues de verificacion — re-prueba el fix y documenta la evidencia. Genera reportes mensuales del estado de hallazgos (abiertos, en progreso, cerrados) para liderazgo. Conduce una revision de remediacion a 30, 60, y 90 dias post-auditoria para asegurar que los fixes se sostienen.










































































End of document. Review and update quarterly.