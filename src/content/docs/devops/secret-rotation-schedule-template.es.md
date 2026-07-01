---
contentType: docs
slug: secret-rotation-schedule-template
title: "Plantilla de Cronograma de Rotacion de Secretos"
description: "Una plantilla para rastrear y programar la rotacion de claves API, contrasenas, certificados y otros secretos en multiples sistemas."
metaDescription: "Rastrea y programa la rotacion de secretos con esta plantilla. Cubre claves API, contrasenas, certificados, duenos, frecuencia y pasos de verificacion."
difficulty: intermediate
topics:
  - security
  - devops
tags:
  - secret-rotation
  - secrets-management
  - certificates
  - api-keys
  - compliance
relatedResources:
  - /docs/devops/rbac-policy-template
  - /docs/devops/access-control-review-template
  - /docs/devops/encryption-key-lifecycle-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Rastrea y programa la rotacion de secretos con esta plantilla. Cubre claves API, contrasenas, certificados, duenos, frecuencia y pasos de verificacion."
  keywords:
    - rotacion de secretos
    - rotacion de credenciales
    - rotacion de certificados
    - rotacion de api keys
    - gestion de secretos
---

## Descripcion General

Una Plantilla de Cronograma de Rotacion de Secretos te ayuda a rastrear todos los secretos de tu organizacion, su frecuencia de rotacion, duenos y estado actual. Los secretos incluyen claves API, contrasenas, certificados TLS, tokens de firma, llaves de cifrado y credenciales de cuentas de servicio. Un cronograma claro reduce el riesgo de exposicion prolongada de secretos y facilita la respuesta a incidentes.

## Cuando Usar

- Para construir un inventario de todos los secretos de la organizacion.
- Cuando se planifica una rotacion regular de credenciales.
- Despues de un incidente de seguridad o sospecha de filtracion.
- Al preparar auditorias de cumplimiento como SOC 2 o PCI-DSS.
- Antes de renovar certificados o migrar a un vault de secretos.

## Prerequisitos

- Un inventario de sistemas que almacenan o usan secretos.
- Un vault de secretos o almacen seguro de credenciales.
- Duenos identificados por sistema o aplicacion.
- Procesos de despliegue que permitan actualizar secretos sin downtime.

## Solucion

### Plantilla

#### 1. Resumen del Inventario de Secretos

| Secret | Tipo | Sistema | Dueno | Frecuencia de Rotacion | Ultima Rotacion | Proxima Rotacion | Estado |
|--------|------|---------|-------|------------------------|-----------------|------------------|--------|
| prod-db-password | Contrasena | PostgreSQL | Equipo backend | 90 dias | 2026-05-01 | 2026-07-30 | A tiempo |
| api-gateway-key | API key | Kong | Equipo platform | 180 dias | 2026-01-15 | 2026-07-14 | A tiempo |
| tls-wildcard | Certificado | CDN | DevOps | 365 dias | 2025-09-01 | 2026-08-30 | A tiempo |
| signing-jwt | Token | Auth service | Equipo seguridad | 90 dias | 2026-06-01 | 2026-08-30 | A tiempo |
| backup-encryption | Llave de cifrado | S3 | DevOps | 365 dias | 2025-12-01 | 2026-12-01 | A tiempo |

#### 2. Plantilla de Registro de Rotacion

| Campo | Descripcion | Ejemplo |
|-------|-------------|---------|
| ID de rotacion | Referencia unica | ROT-2026-042 |
| Secret | Nombre del secret rotado | api-gateway-key |
| Fecha de inicio | Cuando comenzo la rotacion | 2026-07-14 |
| Fecha de finalizacion | Cuando se completo la rotacion | 2026-07-15 |
| Responsable | Persona que lidero la rotacion | Carlos Lopez |
| Pasos ejecutados | Lista de sistemas actualizados | Vault, CI/CD, App configs |
| Verificacion | Como se confirmo el funcionamiento | Health checks OK |
| Rollback plan | Como revertir si falla | Restore version anterior en vault |
| Incidentes asociados | IDs de incidentes si aplica | INC-2026-008 |

#### 3. Matriz de Frecuencia Recomendada

| Tipo de Secret | Rotacion | Condicion Adicional |
|----------------|----------|---------------------|
| Credenciales de usuario | 90 dias | O inmediatamente tras sospecha de compromiso |
| API keys de produccion | 90-180 dias | O cuando un desarrollador con acceso se va |
| Tokens de integracion | 180 dias | O cuando cambia el alcance de la integracion |
| Certificados TLS | Antes de vencimiento | 30 dias antes de expiracion |
| Llaves de cifrado | 1-3 anos | O inmediatamente tras rotacion de personal con acceso |
| Cuentas de servicio | 90 dias | O cuando cambia la carga de trabajo |

#### 4. Checklist de Ejecucion de Rotacion

- [ ] Generar un nuevo valor del secret en el vault seguro.
- [ ] Actualizar el secret en todos los servicios o consumidores.
- [ ] Reiniciar o recargar los servicios que dependen del secret.
- [ ] Ejecutar pruebas de smoke en cada servicio afectado.
- [ ] Confirmar que los servicios antiguos ya no usan el valor anterior.
- [ ] Revocar el valor anterior del secret en el vault.
- [ ] Registrar la rotacion en el cronograma.
- [ ] Notificar al equipo de seguridad y duenos del sistema.

## Explicacion

La rotacion de secretos es un control preventivo, no solo correctivo. El cronograma hace visible la exposicion acumulada de cada secret y crea una trazabilidad para auditorias. Separar el inventario del registro de rotacion permite planificar por anticipado y documentar cada cambio realizado.

## Variantes

- **Cronograma de certificados**: Solo certificados SSL/TLS con fechas de vencimiento y emisor.
- **Plan de respuesta a filtracion**: Enfocado en rotacion de emergencia tras una brecha sospechada.
- **Cronograma de credenciales de terceros**: Rastrea API keys de proveedores como cloud, payment gateways o SaaS.
- **Registro de rotacion de llaves de cifrado**: Documenta llaves KMS, GPG y llaves de cifrado en reposo.

## Lo que funciona

- Automatiza la rotacion siempre que sea posible usando un vault o secret manager.
- Nunca almacenes secretos en repositorios, logs o configuraciones locales.
- Notifica a los duenos del sistema con anticipacion sobre la proxima rotacion.
- Prueba el rollback de un secret antes de rotar en produccion.
- Usa nombres consistentes para que el inventario sea buscable.
- Sincroniza la rotacion con eventos de baja de personal o cambio de rol.
- Documenta como verificar que un servicio esta usando el nuevo secret.

## Errores Comunes

- Rotar solo el secret en un sistema y olvidar otro consumidor.
- No verificar que el servicio antiguo dejo de usar el valor anterior.
- Guardar el valor nuevo y el viejo en el mismo lugar.
- No programar rotacion de certificados y descubrir el vencimiento en produccion.
- Perder la trazabilidad de quien aprobo o ejecuto una rotacion.

## FAQs

### Cada cuanto se deben rotar los secretos?

Depende del tipo y del riesgo. Las credenciales de alta sensibilidad pueden rotar cada 90 dias, mientras que certificados TLS se rotan al menos 30 dias antes de vencer. Tras un incidente o filtracion, se debe rotar inmediatamente.

### Debe la rotacion ser manual?

No idealmente. Usa un secret manager o vault con rotacion automatica. Cuando la rotacion automatica no es posible, un cronograma con recordatorios y checklist reduce la probabilidad de errores.

### Que pasa si olvidamos un consumidor del secret?

El servicio olvidado fallara cuando se revoque el valor anterior. Manten un inventario de todos los consumidores y ejecuta pruebas de integracion despues de la rotacion para detectar dependencias perdidas.
