---
contentType: recipes
slug: data-privacy-gdpr
title: "Privacidad de Datos y Cumplimiento GDPR"
description: "Implementa controles de privacidad de datos, gestión de consentimientos, anonimización y manejo GDPR-compliant en aplicaciones web."
metaDescription: "Cumplimiento GDPR y privacidad de datos: gestión de consentimientos, anonimización de datos, derecho al olvido, portabilidad de datos y patrones de privacy-by-design."
difficulty: intermediate
topics:
  - security
tags:
  - gdpr
  - privacy
  - compliance
relatedResources:
  - /docs/data-retention-policy-template
  - /recipes/encryption-at-rest
  - /docs/dependency-audit-template
  - /docs/penetration-test-template
  - /docs/security-incident-response-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Cumplimiento GDPR y privacidad de datos: gestión de consentimientos, anonimización de datos, derecho al olvido, portabilidad de datos y patrones de privacy-by-design."
  keywords:
    - gdpr
    - privacy
    - compliance
    - data-protection
---
## Visión General

El Reglamento General de Protección de Datos (GDPR) establece reglas estrictas para el manejo de datos personales de ciudadanos de la UE. Más allá del cumplimiento legal, el privacy-by-design construye confianza del usuario y reduce el impacto de brechas. Este recurso cubre controles técnicos prácticos: gestión de consentimientos, minimización de datos, anonimización, derecho al olvido y portabilidad de datos.

## Cuándo Usar

Usa este recurso cuando:
- Procesas datos personales de residentes de la UE (clientes, empleados, leads)
- Construyes flujos de consentimiento para marketing, analytics o sharing con terceros
- Implementas políticas de retención de datos y eliminación automática
- Te preparas para data subject access requests (DSARs)

## Solución

### Esquema de Gestión de Consentimientos (PostgreSQL)

```sql
CREATE TABLE user_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    purpose VARCHAR(50) NOT NULL,  -- 'marketing', 'analytics', 'third_party'
    granted BOOLEAN NOT NULL DEFAULT false,
    granted_at TIMESTAMPTZ,
    withdrawn_at TIMESTAMPTZ,
    ip_address INET,
    user_agent TEXT
);

-- Índice para búsquedas DSAR rápidas
CREATE INDEX idx_consents_user ON user_consents(user_id);
```

### Pipeline de Anonimización (Python)

```python
import hashlib
import hmac
from datetime import datetime

SECRET_KEY = b"rotation-secret-2024"

def pseudonymize(user_id: str) -> str:
    """Reemplaza PII con hash irreversible para analytics."""
    return hmac.new(SECRET_KEY, user_id.encode(), hashlib.sha256).hexdigest()[:16]

def anonymize_age(birth_date: datetime) -> str:
    """Agrupa edad en rangos para uso estadístico."""
    age = (datetime.now() - birth_date).days // 365
    if age < 18: return "<18"
    if age < 25: return "18-24"
    if age < 35: return "25-34"
    return "35+"
```

### Derecho al Olvido (Node.js)

```javascript
async function eraseUserData(userId) {
  // 1. Eliminar o anonimizar registro de usuario
  await db.users.update(userId, {
    email: null,
    name: 'Usuario Eliminado',
    deleted_at: new Date()
  });
  
  // 2. Eliminar datos relacionados en cascada
  await db.orders.anonymize({ user_id: userId });
  await db.sessions.delete({ user_id: userId });
  await db.activity_logs.delete({ user_id: userId });
  
  // 3. Notificar a terceros
  await webhookService.notify('user.deleted', { userId });
  
  // 4. Loggear la eliminación para auditoría
  await auditLog.create({ action: 'erasure', user_id: userId, timestamp: new Date() });
}
```

## Explicación

**Seis principios del GDPR con implementación técnica**:

1. **Legalidad**: Almacena registros de consentimiento con timestamp, IP y propósito
2. **Limitación de propósito**: Etiqueta datos con propósitos permitidos; rechaza uso no autorizado
3. **Minimización de datos**: Recolecta solo lo necesario; usa validación de formularios
4. **Exactitud**: Permite a usuarios actualizar perfiles; valida inputs
5. **Limitación de almacenamiento**: TTL en datos personales; auto-eliminación después del período de retención
6. **Integridad/confidencialidad**: Encripta en reposo; hashea para analytics; controles de acceso

**Derechos del Sujeto de Datos (DSRs)**:
- **Acceso**: Exportar todos los datos personales en formato legible por máquina (JSON)
- **Rectificación**: Actualizar datos incorrectos vía portal self-service
- **Olvido**: Eliminar o anonimizar dentro de 30 días (con audit trail)
- **Portabilidad**: Exportar datos en formato estándar (JSON, CSV)
- **Objeción**: Detener procesamiento para marketing o profiling

## Variantes

| Control | Implementación | Esfuerzo |
|---------|----------------|----------|
| Banners de consentimiento | Cookie consent SDK | Bajo |
| Data mapping | Auditoría manual + tags de schema | Medio |
| Auto-eliminación | Cron jobs con reglas de retención | Medio |
| Pseudonimización | Hashing + rotación de claves | Medio |
| Dashboard DPO | Herramienta admin custom | Alto |

## Mejores Prácticas

- **Privacy by default**: Nuevas features opt-out por defecto; requiere opt-in explícito
- **Encripta PII en reposo**: Usa AES-256 para bases de datos, S3 y backups
- **Loguea acceso a datos personales**: Audita quién accedió qué y cuándo
- **Separa datos de analytics**: Pseudonimiza antes de enviar a herramientas BI
- **Documenta tu base legal**: Contrato, consentimiento o interés legítimo por tipo de dato

## Errores Comunes

1. **Consentimiento implícito**: Checkboxes pre-marcadas o términos escondidos no cuentan bajo GDPR
2. **Sin límites de retención**: Mantener datos de usuario para siempre viola limitación de almacenamiento
3. **Filtración a terceros**: Analytics, ads y CDNs reciben PII sin conocimiento del usuario
4. **Ignorar eliminación de backups**: Los datos de usuario borrados persisten en snapshots antiguos de base de datos
5. **Consentimiento único para todo**: Las cookies de marketing y funcionales necesitan consentimiento separado

## Preguntas Frecuentes

**P: ¿Aplica el GDPR si mi empresa está fuera de la UE?**
R: Sí, si procesas datos de residentes de la UE. El reglamento tiene alcance extraterritorial.

**P: ¿Cuál es la diferencia entre anonimización y pseudonimización?**
R: La anonimización es irreversible (los datos nunca pueden identificar a la persona). La pseudonimización usa una clave que puede re-identificar si es necesario (sigue siendo datos personales bajo GDPR).

**P: ¿Cómo manejo solicitudes de olvido con foreign key constraints?**
R: Usa soft deletes (anonimiza en lugar de eliminar), o eliminación en cascada con audit logging. Nunca dejes registros huérfanos.
