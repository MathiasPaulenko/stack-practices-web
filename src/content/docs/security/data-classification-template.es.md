---
contentType: docs
slug: data-classification-template
title: "Plantilla de Clasificación de Datos"
description: "Plantilla para clasificar datos como públicos, internos, confidenciales o restringidos con reglas de manejo."
metaDescription: "Plantilla de clasificación de datos: define niveles públicos, internos, confidenciales y restringidos, con ejemplos, dueños y controles."
difficulty: beginner
topics:
  - security
tags:
  - security
  - data
  - classification
  - compliance
  - privacy
  - governance
  - template
relatedResources:
  - /docs/incident-response-playbook-template
  - /docs/vendor-risk-assessment-template
  - /docs/data-retention-policy-template
  - /docs/api-security-review-template
  - /docs/security-audit-checklist-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Plantilla de clasificación de datos: define niveles públicos, internos, confidenciales y restringidos, con ejemplos, dueños y controles."
  keywords:
    - security
    - data
    - classification
    - compliance
    - privacy
    - governance
    - template
---
## Visión General

No todos los datos son iguales. Un post de blog de marketing público y el número de tarjeta de crédito de un cliente no merecen la misma protección, pero los equipos a menudo aplican cifrado y controles de acceso uniformes porque nadie definió la diferencia. La clasificación de datos crea un vocabulario compartido para el riesgo: los datos públicos pueden ser abiertos, los datos internos necesitan control de acceso, los datos confidenciales necesitan cifrado y los datos restringidos necesitan ambos: cifrado y acceso estricto de necesidad de saber. Sin clasificación, los ingenieros por defecto o sobreprotegen todo (desperdicio) o subprotegen todo (riesgo de brecha).

## Cuándo Usar

Usa este recurso cuando:
- Estás diseñando una política de almacenamiento o control de acceso de datos y necesitas etiquetas consistentes
- El cumplimiento (SOC 2, GDPR, HIPAA) requiere manejo documentado de datos
- Ocurrió una brecha o filtración y te das cuenta de que nadie acordó qué significaba "sensible"

## Solución

```markdown
# Clasificación de Datos: `<Sistema / Dataset>`

## 1. Definiciones de Clasificación

| Nivel | Descripción | Ejemplos | Requisitos de Manejo |
|-------|-------------|----------|----------------------|
| **Público** | Aprobado para divulgación pública | Sitio de marketing, repos open-source, ofertas de empleo | Sin control de acceso; backups estándar |
| **Interno** | Solo para empleados y contratistas | Wikis internas, roadmaps, métricas no sensibles | Acceso basado en roles; cifrado en reposo; MFA para acceso remoto |
| **Confidencial** | Sensible; la divulgación no autorizada daña a la empresa | PII de clientes (nombres, emails), datos financieros, código fuente | Cifrado en reposo y tránsito; acceso de mínimo privilegio; auditoría de logs; compartir solo aprobado |
| **Restringido** | Altamente sensible; la divulgación no autorizada causa daño severo | Tarjetas de crédito, SSNs, registros médicos, contraseñas, claves de cifrado | Cifrado en reposo y tránsito; acceso de necesidad de saber; aprobación multi-parte para acceso; trazabilidad estricta; sin compartir externo |

## 2. Inventario de Datasets

| Dataset | Clasificación | Ubicación de Almacenamiento | Cifrado | Control de Acceso | Retención | Responsable |
|---------|---------------|------------------------------|---------|-------------------|-----------|-------------|
| `user_profiles` | Confidencial | PostgreSQL RDS | AES-256 | RBAC: ingeniería, soporte | 7 años post-eliminación | @data-owner |
| `payment_tokens` | Restringido | Vault / HSM | AES-256-GCM | Necesidad de saber: solo equipo de pagos | 90 días | @security-owner |
| `public_docs` | Público | Bucket S3 (público) | Ninguno | Ninguno | Indefinido | @content-owner |

## 3. Reglas de Manejo por Nivel

### Acceso

| Nivel | Autenticación | Autorización | MFA | Acceso Remoto |
|-------|---------------|--------------|-----|---------------|
| Público | Ninguna | Ninguna | N/A | Abierto |
| Interno | SSO | Basado en roles | Requerido | VPN + MFA |
| Confidencial | SSO | Basado en roles + aprobación | Requerido | VPN + MFA + justificación |
| Restringido | SSO + token hardware | Necesidad de saber + aprobación multi-parte | Requerido | Air-gapped o VPN dedicada + justificación |

### Transmisión

| Nivel | Red Interna | Red Externa | Email / Chat |
|-------|-------------|-------------|--------------|
| Público | Sin cifrado | Sin cifrado | Permitido |
| Interno | TLS 1.2+ | TLS 1.2+ | Permitido con cuidado |
| Confidencial | TLS 1.2+ | TLS 1.2+ + escaneo DLP | Solo canales aprobados |
| Restringido | TLS 1.2+ + mTLS | Prohibido (usar transferencia de archivos segura) | Prohibido (usar intercambio seguro aprobado) |

### Almacenamiento

| Nivel | Cifrado en Reposo | Gestión de Claves | Cifrado de Backup | Geolocalización |
|-------|-------------------|-------------------|-------------------|-----------------|
| Público | Opcional | Estándar | Estándar | Cualquier región |
| Interno | AES-256 | Estándar | AES-256 | Regiones aprobadas |
| Confidencial | AES-256 | HSM o KMS | AES-256 | Regiones aprobadas + reglas de residencia |
| Restringido | AES-256-GCM | HSM | AES-256 + backup air-gapped | Regiones aprobadas + sin traspaso de fronteras |

## 4. Log de Excepciones

| Dataset | Clasificación Menor Solicitada | Justificación | Riesgo Aceptado Por | Fecha | Fecha de Revisión |
|---------|------------------------------|---------------|---------------------|-------|-------------------|
| | | | | | |
```

## Explicación

La plantilla reemplaza términos vagos como "sensible" con cuatro niveles concretos. Cada nivel tiene reglas explícitas de manejo para acceso, transmisión y almacenamiento. El inventario de datasets te obliga a catalogar lo que tienes antes de poder protegerlo. El log de excepciones reconoce que las necesidades de negocio a veces requieren flexibilidad, pero solo con aceptación de riesgo documentada.

## Arbol de Decision de Clasificacion de Datos

```text
=== Arbol de Decision: Clasificar un Nuevo Dataset ===

P1: El dataset contiene informacion personal identificable (PII)?
  SI -> P2
  NO -> P3

P2: La PII es sensible (salud, financiera, biometrica, ID gubernamental)?
  SI -> Clasificacion: RESTRINGIDO
  NO -> P2a

P2a: El dataset contiene datos cubiertos por GDPR, CCPA, o HIPAA?
  SI -> Clasificacion: RESTRINGIDO
  NO -> Clasificacion: CONFIDENCIAL

P3: El dataset contiene informacion critica para el negocio?
  (secretos comerciales, codigo fuente, metricas internas, datos de ingresos)
  SI -> Clasificacion: CONFIDENCIAL
  NO -> P4

P4: El dataset es para consumo publico?
  (materiales de marketing, docs publicos, datos abiertos)
  SI -> Clasificacion: PUBLICO
  NO -> P5

P5: El dataset es solo interno pero no critico para el negocio?
  (datos de test, notas internas, configs no sensibles)
  SI -> Clasificacion: INTERNO
  NO -> Por defecto CONFIDENCIAL (en duda, clasificar mas alto)
```

## Requisitos de Manejo por Clasificacion

```text
=== Matriz de Manejo ===

Clasificacion     | Encripcion  | Acceso       | Logging    | Retencion
-----------------|-------------|--------------|------------|------------------
PUBLICO          | No requerido| Cualquiera   | Opcional   | Sin restriccion
INTERNO          | En reposo   | Empleados    | Requerido  | Segun politica
CONFIDENCIAL     | Reposo +    | Need-to-know | Requerido +| Segun politica +
                 | transito    | solo         | audit trail| retencion legal
RESTRINGIDO      | Reposo +    | Individuos   | Requerido +| Segun politica +
                 | transito +  | nombrados    | logs a     | retencion legal +
                 | key vault   | solo         | prueba de  | derecho al olvido
                 |             |              | manipulacion|
```


## Variantes

| Contexto | Niveles Extra | Diferencia Clave |
|----------|-------------|------------------|
| Salud (HIPAA) | Agregar etiquetas PHI / ePHI | Datos de pacientes siempre son Restringidos; BAAs requeridos |
| Finanzas (PCI DSS) | Agregar CDE (Cardholder Data Environment) | Datos de tarjetas son Restringidos; segmentación de red obligatoria |
| Gobierno | Agregar No Clasificado, Secreto, Ultra Secreto | Acceso basado en autorización; air-gapping común |
| Startup SaaS | Frecuentemente fusionan Interno + Confidencial | Simplicidad sobre completitud cuando el equipo es pequeño |
| Operaciones UE | Agregar bandera "Datos Personales UE" | Residencia GDPR y acuerdos de procesamiento requeridos |

## Lo que funciona

1. Etiqueta datos en la creación, no en el almacenamiento; la clasificación retroactiva es costosa y propensa a errores
2. Automatiza la clasificación donde sea posible; las herramientas DLP pueden etiquetar datos basados en patrones (tarjetas de crédito, SSNs)
3. Revisa clasificaciones trimestralmente; un dataset "público" que se vuelve crítico para ingresos puede necesitar actualización
4. Entrena a ingenieros en la diferencia entre Confidencial y Restringido; la brecha es donde ocurren las filtraciones
5. Registra cada excepción; los patrones de excepciones indican desalineación de política o brechas de entrenamiento

## Errores Comunes

1. Clasificar todo como Confidencial para estar "seguro"; esto diluye la protección y ralentiza a la ingeniería
2. No etiquetar datos de prueba/staging; los desarrolladores frecuentemente clonan producción y olvidan que los datos siguen siendo sensibles
3. Ignorar metadata; un archivo de log conteniendo IDs de usuario es Confidencial incluso si no contiene nombres
4. No incluir proveedores terceros en las reglas de clasificación; una herramienta SaaS con SSO sigue siendo externa
5. Tratar la clasificación como una auditoría única; los datos cambian, los servicios evolucionan y las clasificaciones se degradan

## Preguntas Frecuentes

### ¿Quién decide la clasificación de un nuevo dataset?

El dueño de los datos (generalmente el líder de producto o ingeniería que crea el dataset) propone una clasificación. El equipo de seguridad revisa y aprueba. Para datos Restringidos, un arquitecto de seguridad debe firmar. En caso de duda, clasifica más alto; es más fácil bajar de nivel que subir después de una filtración.

### ¿Qué pasa si un dataset contiene clasificaciones mixtas?

Clasifica al nivel más alto presente. Una hoja de cálculo con copia de marketing pública y tarjetas de crédito de clientes Restringidas es Restringida. Si es posible, separa el dataset para reducir la sobrecarga. Los datasets de clasificación mixta son la fuente más común de oversharing accidental porque las partes "seguras" crean una falsa sensación de seguridad.

### ¿Cómo clasifico datos en logs y herramientas de observabilidad?

Los logs son frecuentemente la clase de datos más olvidada. Cualquier log que contenga IDs de usuario, emails o payloads de petición con PII es al menos Confidencial. Usa redacción de logs o tokenización para eliminar PII antes de enviar a logging centralizado. Si debes retener logs completos para depuración, almacénalos en un bucket de acceso Restringido con periodos de retención cortos.


### Como automatizamos la clasificacion de datos?

Usa herramientas DLP (Data Loss Prevention) para detectar y etiquetar datos automaticamente basado en patrones: numeros de tarjetas de credito (regex), SSNs, emails, telefonos, y patrones personalizados. Integra el escaneo DLP en tu pipeline de datos — cuando los datos llegan a un warehouse o lake, son escaneados y etiquetados automaticamente. Usa herramientas del proveedor cloud (AWS Macie, GCP DLP API, Azure Purview) para escaneo gestionado. Para bases de datos, usa clasificacion a nivel de esquema — etiqueta columnas que contienen PII a nivel de esquema. Para logs, usa pipelines de redaccion que detectan y enmascaran PII antes de la centralizacion. La automatizacion reduce error humano pero no reemplaza la revision humana para casos extremos.

### Que es la clasificacion de datos en la practica para una aplicacion SaaS?

Para una aplicacion SaaS: perfiles de usuario (nombre, email, telefono) son Confidenciales. Datos de pago (numeros de tarjetas de credito, direcciones de facturacion) son Restringidos. Analiticas de uso (vistas de pagina, uso de features) son Internas. Contenido de marketing es Publico. API keys y secrets son Restringidos. Archivos de log que contienen IDs de usuario son Confidenciales. Backups de base de datos que contienen datos de usuario son Restringidos. La clasificacion determina encripcion, controles de acceso, retencion, y politicas de comparticion. Cada nueva feature deberia incluir una revision de clasificacion de datos como parte del checklist de seguridad.

### Como manejamos la clasificacion de datos para integraciones de terceros?

Al enviar datos a un tercero: clasifica los datos que se envian. Asegura que la postura de seguridad del vendor coincida con la clasificacion (ej., datos Restringidos requieren un vendor con SOC 2 Type II). Documenta el flujo de datos en tu inventario de datos. Incluye la clasificacion en el DPA (Data Processing Agreement). Para datos Restringidos, requiere encripcion en transito y reposo por el vendor. Revisa la seguridad del vendor anualmente. Si un vendor degrada su postura de seguridad, reevalua si continuar enviando datos clasificados. Nunca envies datos Restringidos a un vendor sin un DPA firmado y revision de seguridad.

### Con que frecuencia debemos revisar las clasificaciones de datos?

Revisa clasificaciones: trimestralmente para datasets Restringidos, semestralmente para Confidenciales, anualmente para Internos y Publicos. Dispara revisiones fuera de ciclo cuando: el proposito de un dataset cambia, nuevas regulaciones aplican, ocurre una brecha de datos, o un dataset se fusiona con otro. Rastrea fechas de revision en el inventario de datos. Asigna un dueno de datos responsable de la clasificacion de cada dataset. Documenta hallazgos de revision y cualquier cambio de clasificacion. Una clasificacion que no ha sido revisada en mas de un ano se considera obsoleta y debe ser marcada.

### Cuales son las consecuencias de una clasificacion incorrecta?

Sobre-clasificacion (clasificar todo como Restringido): ralentiza la ingenieria, aumenta costos (encripcion, gestion de acceso, auditoria), y entrena a los ingenieros a ignorar las etiquetas de clasificacion. Sub-clasificacion (clasificar datos Restringidos como Publicos): lleva a brechas de datos, multas regulatorias (GDPR: hasta 4% de ingresos anuales), perdida de confianza del cliente, y responsabilidad legal. El objetivo es clasificacion precisa — no clasificacion maxima. Revisiones regulares y escaneo automatizado ayudan a mantener precision. Documenta la justificacion de cada decision de clasificacion para propositos de auditoria.

















































































End of document. Review and update quarterly.