---
contentType: recipes
slug: encryption-at-rest
title: "Implementar Encripción en Reposo para Bases de Datos y Almacenamiento de Archivos"
description: "Cómo encriptar datos sensibles antes de almacenarlos en bases de datos, object storage y backups usando AES-256-GCM, encripción de sobre y servicios de gestión de keys."
metaDescription: "Aprende encripción en reposo para bases de datos y storage. Encripta datos sensibles usando AES-256-GCM, encripción de sobre y servicios de gestión de keys."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - compliance
  - database-encryption
relatedResources:
  - /recipes/secret-management
  - /recipes/api-security-headers
  - /recipes/password-hashing
  - /recipes/csrf-protection
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Aprende encripción en reposo para bases de datos y storage. Encripta datos sensibles usando AES-256-GCM, encripción de sobre y servicios de gestión de keys."
  keywords:
    - encripcion en reposo
    - encripcion aes 256
    - encripcion base de datos
    - gestion de keys kms
    - encripcion de sobre
---

## Visión general

La encripción en reposo protege datos cuando están almacenados en disco, en backups o en object storage. Incluso si un atacante obtiene acceso físico a un disco duro, roba un backup de base de datos o compromete un bucket de cloud storage, los datos encriptados permanecen ilegibles sin la key de decripción correspondiente. Este es un requisito fundamental para frameworks de compliance como GDPR, HIPAA, PCI-DSS y SOC 2.

El enfoque ingenuo — encriptar columnas enteras de base de datos con una única key de aplicación — crea fragilidad operacional. La rotación de keys se vuelve dolorosa, el performance se degrada en tablas grandes, y una key filtrada expone todos los datos. La encripción en reposo moderna usa encripción de sobre (envelope encryption): una data encryption key (DEK) encripta el payload, mientras que una key encryption key (KEK) almacenada en un hardware security module o cloud KMS encripta la DEK. Esto habilita rotación de keys por registro, control de acceso granular y operaciones de bulk de alto performance. Esta receta cubre encripción AES-256-GCM, patrones de envelope encryption e integración con AWS KMS, Azure Key Vault y HashiCorp Vault.

## Cuándo usarlo

Usa esta receta cuando:

- Almacenando información de identificación personal (PII), registros de salud o datos financieros
- Construyendo aplicaciones SaaS multi-tenant donde cada tenant requiere encripción aislada
- Cumpliendo con GDPR Artículo 32, HIPAA Security Rule o PCI-DSS requisito 3.4
- Encriptando backups de base de datos antes de transferirlos a cold storage
- Protegiendo API keys, credenciales y archivos de configuración en object storage

## Solución

### Encripción de Sobre con AWS KMS (Python / Boto3)

```python
import boto3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64
import os

kms = boto3.client('kms')

def encrypt_field(plaintext: str, kms_key_id: str) -> dict:
    dek = AESGCM.generate_key(bit_length=256)
    aesgcm = AESGCM(dek)

    nonce = os.urandom(12)
    ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)

    dek_response = kms.encrypt(
        KeyId=kms_key_id,
        Plaintext=dek
    )
    encrypted_dek = base64.b64encode(dek_response['CiphertextBlob']).decode()

    return {
        "ciphertext": base64.b64encode(ciphertext).decode(),
        "nonce": base64.b64encode(nonce).decode(),
        "encrypted_dek": encrypted_dek,
        "algorithm": "AES256-GCM",
    }

def decrypt_field(encrypted_package: dict, kms_key_id: str) -> str:
    encrypted_dek = base64.b64decode(encrypted_package['encrypted_dek'])
    dek_response = kms.decrypt(CiphertextBlob=encrypted_dek)
    dek = dek_response['Plaintext']

    aesgcm = AESGCM(dek)
    ciphertext = base64.b64decode(encrypted_package['ciphertext'])
    nonce = base64.b64decode(encrypted_package['nonce'])

    plaintext = aesgcm.decrypt(nonce, ciphertext, None)
    return plaintext.decode()
```

### Encripción a Nivel de Base de Datos (PostgreSQL pgcrypto)

```sql
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO users (email, ssn)
VALUES (
    'user@example.com',
    pgp_sym_encrypt('123-45-6789', current_setting('app.encryption_key'))
);

SELECT email,
       pgp_sym_decrypt(ssn, current_setting('app.encryption_key')) as ssn
FROM users
WHERE id = 1;
```

### Encripción a Nivel de Aplicación con Derivación de Key (Node.js)

```javascript
const crypto = require('crypto');

class FieldEncryption {
  constructor(masterKey) {
    this.masterKey = Buffer.from(masterKey, 'hex');
  }

  deriveKey(recordId) {
    return crypto.hkdfSync('sha256', this.masterKey, Buffer.from(recordId), 'field-encryption', 32);
  }

  encrypt(plaintext, recordId) {
    const key = this.deriveKey(recordId);
    const iv = crypto.randomBytes(12);
    const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);

    const ciphertext = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
    const authTag = cipher.getAuthTag();

    return {
      ciphertext: ciphertext.toString('base64'),
      iv: iv.toString('base64'),
      authTag: authTag.toString('base64'),
    };
  }

  decrypt(encrypted, recordId) {
    const key = this.deriveKey(recordId);
    const iv = Buffer.from(encrypted.iv, 'base64');
    const authTag = Buffer.from(encrypted.authTag, 'base64');
    const ciphertext = Buffer.from(encrypted.ciphertext, 'base64');

    const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
    decipher.setAuthTag(authTag);

    return Buffer.concat([decipher.update(ciphertext), decipher.final()]).toString('utf8');
  }
}
```

## Explicación

- **Encripción de sobre**: cada registro se encripta con una data encryption key (DEK) única. La DEK misma se encripta por una key encryption key (KEK) gestionada en un KMS. Esto significa que puedes rotar la KEK sin re-encriptar todos los datos, y puedes revocar acceso a un solo registro eliminando su DEK.
- **AES-256-GCM**: el estándar de la industria para encripción autenticada. El modo GCM provee confidencialidad (encripción) e integridad (tag de autenticación) en una sola operación. Siempre verifica el tag de autenticación antes de desencriptar para detectar tampering.
- **Derivación de keys**: en lugar de almacenar DEKs separadamente, derívalas determinísticamente de una master key y un record ID usando HKDF. Esto elimina almacenamiento de DEK pero hace la rotación de keys más compleja — cambiar la master key requiere re-encriptar todos los registros.
- **Integración con cloud KMS**: AWS KMS, Azure Key Vault y GCP KMS proveen hardware security modules FIPS 140-2 Level 2+. Manejan generación de keys, rotación, políticas de acceso y audit logging. Nunca almacenes master keys en archivos de configuración de aplicación.

## Variantes

| Enfoque | Gestión de keys | Performance | Facilidad de rotación | Mejor para |
|---------|----------------|-------------|----------------------|------------|
| Nativo de base de datos (TDE) | Motor de base de datos | Rápida (transparente) | Difícil | Checkbox de compliance |
| Envelope de aplicación | Cloud KMS | Media | Fácil | SaaS multi-tenant |
| Encripción por columna | Aplicación | Lenta (por celda) | Media | Campos altamente sensibles |
| Encripción client-side | Key del cliente | Lenta | Fácil | Privacidad end-to-end |

## Mejores prácticas

- **Encripta antes de que llegue a la base de datos**: la encripción a nivel de aplicación protege contra breaches a nivel de base de datos. Si la base de datos es comprometida pero el servidor de aplicación no, los atacantes ven solo ciphertext.
- **Usa encripción autenticada (AEAD)**: AES-GCM y ChaCha20-Poly1305 proveen tags de autenticación. Nunca uses modos no autenticados como AES-CBC o AES-ECB, que son vulnerables a ataques de padding oracle y tampering.
- **Rota keys regularmente**: establece una política de rotación de keys (anualmente para KEKs, por registro para DEKs). Cloud KMS soporta rotación automática de master keys. Documenta el procedimiento de rotación y testéalo en staging.
- **Encripción searchable**: la encripción estándar rompe indexación y búsqueda de base de datos. Usa encripción determinística (mismo plaintext → mismo ciphertext) para queries de exact match, o encripción order-preserving para queries de rango. Sé consciente de que estos filtran algo de información.
- **Key separada por tenant**: en SaaS multi-tenant, encripta los datos de cada tenant con una KEK diferente. Esto asegura que comprometer la key de un tenant no exponga los datos de otros tenants.

## Errores comunes

- **Hardcodear keys de encripción en código fuente**: embeber una master key en `config.py` o una variable de entorno en un servidor compartido anula el propósito. Usa un secret manager con controles de IAM.
- **Ignorar el tag de autenticación**: desencriptar AES-GCM sin verificar el tag de autenticación remueve detección de tampering. Siempre verifica el tag antes de procesar datos desencriptados.
- **Encriptar todo indiscriminadamente**: la encripción agrega latencia, overhead de almacenamiento y complejidad. Solo encripta campos genuinamente sensibles (PII, credenciales, datos de salud). Catálogos de productos públicos no necesitan encripción en reposo.
- **Perder la master key**: si la master key de KMS es eliminada o inaccesible, todos los datos encriptados se pierden permanentemente. Habilita protección contra eliminación de keys, mantén réplicas cross-region y testea procedimientos de disaster recovery.

## Preguntas frecuentes

**P: ¿La encripción en reposo protege contra SQL injection?**
R: No. La encripción en reposo protege datos en disco. Los ataques de SQL injection operan contra bases de datos en ejecución vía manipulación de queries. Combina encripción con queries parametrizadas y validación de input para defensa en profundidad.

**P: ¿Cuál es la diferencia entre TDE y encripción de aplicación?**
R: Transparent Data Encryption (TDE) encripta el archivo completo de base de datos a nivel de storage. Es rápida e invisible para aplicaciones pero protege solo contra robo de disco. La encripción de aplicación protege campos individuales, defendiendo contra breaches a nivel de base de datos pero requiriendo cambios en la aplicación.

**P: ¿Cómo encripto datos pero aún permito búsquedas?**
R: Usa encripción determinística para matches exactos (ej. lookup por email), blind indexes (prefijos de hash almacenados junto a ciphertext) o encripción homomórfica para casos de uso avanzados. Cada enfoque involucra trade-offs entre seguridad y flexibilidad de queries.

**P: ¿Debería encriptar los backups separadamente?**
R: Sí. Los backups de base de datos deberían encriptarse con una key distinta de la key de encripción de producción. Almacena las keys de encripción de backups en un vault separado. Testea desencripción de backups trimestralmente como parte de tu plan de disaster recovery.

