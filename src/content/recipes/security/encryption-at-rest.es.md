---



contentType: recipes
slug: encryption-at-rest
title: "Encripción en Reposo para Bases de Datos y Almacenamiento"
description: "Cómo encriptar datos sensibles antes de almacenarlos en bases de datos, object storage y backups usando AES-256-GCM, encripción de sobre y servicios de gestión de keys."
metaDescription: "Aprende encripción en reposo para bases de datos y storage. Encripta datos sensibles usando AES-256-GCM, encripción de sobre y servicios de gestión de keys."
difficulty: intermediate
topics:
  - security
tags:
  - security
  - compliance
  - vulnerabilities
  - encryption
  - owasp
relatedResources:
  - /recipes/secret-management
  - /recipes/api-security-headers
  - /recipes/password-hashing
  - /recipes/csrf-protection
  - /recipes/data-privacy-gdpr
  - /recipes/request-signing-hmac
lastUpdated: "2026-08-22"
publishedAt: "2026-06-14"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende encripción en reposo para bases de datos y storage. Encripta datos sensibles usando AES-256-GCM, encripción de sobre y servicios de gestión de keys."
  keywords:
    - encripcion en reposo
    - encripcion aes 256
    - encripcion base de datos
    - gestion de keys kms
    - encripcion de sobre



---

## Visión General

La encripción en reposo protege los datos mientras están en disco, en un backup o en object storage. Aunque
alguien consiga un disco, una cinta de backup o un bucket de cloud, los datos seguirán ilegibles sin la key
de decripción correcta. Por eso GDPR, HIPAA, PCI-DSS y SOC 2 la exigen.

El enfoque ingenuo es encriptar columnas enteras con una única key de aplicación. Eso se vuelve doloroso: la
rotación es lenta, las tablas grandes se degradan y una sola key filtrada expone todo. La mejor opción es la
encripción de sobre (envelope encryption): una data encryption key (DEK) encripta el payload, y una key
encryption key (KEK), guardada en un hardware security module o cloud KMS, encripta la DEK. Eso permite
rotar keys por registro, controlar el acceso con más granularidad y correr operaciones bulk sin matar el
performance. Esta receta recorre AES-256-GCM, patrones de envelope encryption y cómo integrar con AWS KMS,
Azure Key Vault y HashiCorp Vault.

## Cuándo Usarlo

Usá esta receta cuando almacenás información de identificación personal (PII), registros de salud o datos
financieros. También aplica para aplicaciones SaaS multi-tenant donde cada tenant necesita encripción aislada,
y para cumplir con GDPR Artículo 32, HIPAA Security Rule o PCI-DSS requisito 3.4. Otras ocasiones comunes son
encriptar backups antes de moverlos a cold storage, y proteger API keys, credenciales y archivos de
configuración en object storage.

## Cuándo NO Usarlo

No le agregues encripción en reposo a datos que ya son públicos o no sensibles, como catálogos de productos,
assets de marketing o análisis anónimos. La latencia, gestión de keys y overhead operacional no valen la pena
para información que no representa riesgo si se expone.

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

La **encripción de sobre** significa que cada registro se encripta con una data encryption key (DEK) única.
La DEK misma se encripta con una key encryption key (KEK) gestionada en un KMS. Gracias a esa separación,
podés rotar la KEK sin re-encriptar todo el dataset y revocar el acceso a un solo registro eliminando su DEK.

**AES-256-GCM** es el estándar para encripción autenticada. El modo GCM da confidencialidad e integridad en
una sola operación a través de un tag de autenticación. Siempre verificá ese tag antes de desencriptar, o
perdés la detección de manipulaciones.

La **derivación de keys** es una alternativa a guardar DEKs. Usando HKDF, podés derivar una DEK de forma
determinística a partir de una master key y un record ID. Eso evita almacenar cada DEK, pero dificulta la
rotación: cambiar la master key implica re-encriptar todos los registros.

La **integración con cloud KMS** — ya sea AWS KMS, Azure Key Vault o GCP KMS — te da hardware security
modules FIPS 140-2 Level 2+ y se encarga de generación de keys, rotación, políticas de acceso y audit logging.
Nunca guardes master keys en archivos de configuración de la aplicación.

## Variantes

| Enfoque | Gestión de keys | Performance | Facilidad de rotación | Mejor para |
| --- | --- | --- | --- | --- |
| Nativo de base de datos (TDE) | Motor de base de datos | Rápida (transparente) | Difícil | Checkbox de compliance |
| Envelope de aplicación | Cloud KMS | Media | Fácil | SaaS multi-tenant |
| Encripción por columna | Aplicación | Lenta (por celda) | Media | Campos altamente sensibles |
| Encripción client-side | Key del cliente | Lenta | Fácil | Privacidad end-to-end |

## Buenas Prácticas

- Encriptá los datos antes de que lleguen a la base de datos. La encripción a nivel de aplicación evita que un
  atacante lea campos sensibles incluso si la base de datos está comprometida.
- Usá encripción autenticada (AEAD). AES-GCM y ChaCha20-Poly1305 agregan tags de autenticación. Evitá modos
  no autenticados como AES-CBC o AES-ECB, que son vulnerables a padding oracle y tampering.
- Rotá las keys regularmente. Planeá rotar KEKs al menos una vez al año y DEKs por registro cuando sea
  necesario. Cloud KMS puede automatizar la rotación de master keys, pero documentá y probá el procedimiento
  en staging.
- Pensá en la búsqueda antes de encriptar. La encripción estándar rompe indexación y búsqueda, así que usá
  encripción determinística para matches exactos, blind indexes o encripción order-preserving para rangos.
  Recordá que cada una filtra algo de información.
- Dá una key separada por tenant en SaaS multi-tenant. Si se compromete una KEK, solo expone los datos de
  ese tenant.

## Errores Comunes

- Hardcodear keys de encripción en código fuente. Embeber una master key en `config.py` o en una variable de
  entorno en un servidor compartido anula el propósito. Usá un [secret manager](/recipes/vault-dynamic-credentials/)
  dedicado con controles de IAM.
- Ignorar el tag de autenticación. Desencriptar AES-GCM sin verificar el tag elimina la detección de
  manipulaciones. Siempre verificá el tag antes de procesar datos desencriptados.
- Encriptar todo indiscriminadamente. La encripción agrega latencia, overhead de almacenamiento y complejidad.
  Solo encriptá campos genuinamente sensibles como PII, credenciales y datos de salud. Los catálogos de
  productos públicos no necesitan encripción en reposo.
- Perder la master key. Si la master key de KMS se elimina o es inaccesible, los datos encriptados se pierden
  para siempre. Activá protección contra eliminación, mantené réplicas cross-region y probá los procedimientos
  de disaster recovery.

## Preguntas Frecuentes

### ¿La encripción en reposo protege contra SQL injection?

No. La encripción en reposo solo protege datos en disco. Los ataques de SQL injection golpean bases de datos en
ejecución a través de la manipulación de queries, así que también necesitás [queries parametrizadas](/recipes/sql-injection-prevention/)
y [validación de input](/recipes/input-validation/) para defensa en profundidad.

### ¿Cuál es la diferencia entre TDE y encripción de aplicación?

Transparent Data Encryption (TDE) encripta el archivo completo de base de datos a nivel de storage. Es rápida e
invisible para la aplicación, pero solo protege contra robo de disco. La encripción de aplicación protege
campos individuales y ayuda contra breaches a nivel de base de datos, aunque requiere cambios en la
aplicación.

### ¿Cómo encripto datos pero sigo permitiendo búsquedas?

Usá encripción determinística para matches exactos, blind indexes basados en prefijos de hash, o encripción
homomórfica para casos avanzados. Cada opción intercambia algo de seguridad por flexibilidad de queries.

### ¿Debería encriptar los backups separadamente?

Sí. Los backups deberían encriptarse con una key distinta de la key de producción, y esa key de backup debería
estar en un [vault separado](/recipes/vault-dynamic-credentials/). Testeá la desencripción de backups al menos
trimestralmente como parte del plan de disaster recovery.

### ¿Esta solución está lista para producción?

Los ejemplos de arriba son puntos de partida probados. Adaptá el manejo de errores, el logging y la
configuración a tu entorno antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende del volumen de datos y la infraestructura. Los ejemplos priorizan claridad. Para alto
throughput, agregá caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empezá con el ejemplo más chico. Agregá logging en cada paso, probá con entradas pequeñas y luego escalá. Usá
el debugger de tu lenguaje para recorrer los edge cases.

## Variantes Avanzadas

### Encripción de sobre multi-tenant (Python)

Cada tenant obtiene su propia key de KMS, asegurando aislamiento criptográfico entre tenants:

```python
import boto3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
import base64
import os
from typing import Optional

class MultiTenantEncryption:
    """Encripción de sobre por tenant con KEKs gestionadas por KMS."""

    def __init__(self, region: str = 'us-east-1'):
        self.kms = boto3.client('kms', region_name=region)
        self._dek_cache: dict[str, tuple[bytes, bytes]] = {}

    def _get_tenant_kek_id(self, tenant_id: str) -> str:
        """Mapear tenant ID a su ARN de key KMS."""
        return f'arn:aws:kms:us-east-1:123456789012:key/tenant-{tenant_id}'

    def encrypt(
        self,
        tenant_id: str,
        plaintext: str,
        context: Optional[dict] = None,
    ) -> dict:
        """Encriptar datos para un tenant específico."""
        kek_id = self._get_tenant_kek_id(tenant_id)

        # Generar DEK localmente
        dek = AESGCM.generate_key(bit_length=256)
        aesgcm = AESGCM(dek)
        nonce = os.urandom(12)

        # Associated data opcional para binding de contexto adicional
        aad = tenant_id.encode() if context is None else str(context).encode()

        ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), aad)

        # Encriptar DEK con KEK específica del tenant
        dek_response = self.kms.encrypt(
            KeyId=kek_id,
            Plaintext=dek,
            EncryptionContext={'tenant': tenant_id},
        )

        return {
            'ciphertext': base64.b64encode(ciphertext).decode(),
            'nonce': base64.b64encode(nonce).decode(),
            'encrypted_dek': base64.b64encode(dek_response['CiphertextBlob']).decode(),
            'tenant_id': tenant_id,
            'algorithm': 'AES256-GCM',
        }

    def decrypt(self, encrypted_package: dict) -> str:
        """Desencriptar datos usando la key KMS del tenant."""
        encrypted_dek = base64.b64decode(encrypted_package['encrypted_dek'])
        tenant_id = encrypted_package['tenant_id']

        # KMS selecciona automáticamente la key correcta basada en CiphertextBlob
        dek_response = self.kms.decrypt(
            CiphertextBlob=encrypted_dek,
            EncryptionContext={'tenant': tenant_id},
        )
        dek = dek_response['Plaintext']

        aesgcm = AESGCM(dek)
        ciphertext = base64.b64decode(encrypted_package['ciphertext'])
        nonce = base64.b64decode(encrypted_package['nonce'])
        aad = tenant_id.encode()

        plaintext = aesgcm.decrypt(nonce, ciphertext, aad)
        return plaintext.decode()

# Uso
enc = MultiTenantEncryption()
encrypted = enc.encrypt('tenant-001', 'sensitive-data')
# Solo la key KMS de tenant-001 puede desencriptar este payload
decrypted = enc.decrypt(encrypted)
```

### Go AES-256-GCM con binding de contexto

```go
package main

import (
    "crypto/aes"
    "crypto/cipher"
    "crypto/rand"
    "encoding/base64"
    "fmt"
    "io"
)

type EncryptedData struct {
    Ciphertext string `json:"ciphertext"`
    Nonce      string `json:"nonce"`
}

func encryptAESGCM(key []byte, plaintext, aad []byte) (*EncryptedData, error) {
    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, fmt.Errorf("create cipher: %w", err)
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, fmt.Errorf("create GCM: %w", err)
    }

    nonce := make([]byte, gcm.NonceSize())
    if _, err := io.ReadFull(rand.Reader, nonce); err != nil {
        return nil, fmt.Errorf("generate nonce: %w", err)
    }

    ciphertext := gcm.Seal(nil, nonce, plaintext, aad)

    return &EncryptedData{
        Ciphertext: base64.StdEncoding.EncodeToString(ciphertext),
        Nonce:      base64.StdEncoding.EncodeToString(nonce),
    }, nil
}

func decryptAESGCM(key []byte, data *EncryptedData, aad []byte) ([]byte, error) {
    ciphertext, err := base64.StdEncoding.DecodeString(data.Ciphertext)
    if err != nil {
        return nil, fmt.Errorf("decode ciphertext: %w", err)
    }

    nonce, err := base64.StdEncoding.DecodeString(data.Nonce)
    if err != nil {
        return nil, fmt.Errorf("decode nonce: %w", err)
    }

    block, err := aes.NewCipher(key)
    if err != nil {
        return nil, fmt.Errorf("create cipher: %w", err)
    }

    gcm, err := cipher.NewGCM(block)
    if err != nil {
        return nil, fmt.Errorf("create GCM: %w", err)
    }

    plaintext, err := gcm.Open(nil, nonce, ciphertext, aad)
    if err != nil {
        return nil, fmt.Errorf("decrypt: %w (posible tampering detectado)", err)
    }

    return plaintext, nil
}
```

### Encripción searchable con blind index

Encripta el valor sensible pero almacena un blind index basado en HMAC separado para lookups:

```python
import hmac
import hashlib
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import os

class SearchableEncryption:
    """Encriptar datos permitiendo queries de exact match vía blind index."""

    def __init__(self, encryption_key: bytes, index_key: bytes):
        self.encryption_key = encryption_key
        self.index_key = index_key

    def _blind_index(self, value: str) -> str:
        """Generar un blind index determinístico para búsqueda de exact match."""
        return hmac.new(
            self.index_key, value.encode(), hashlib.sha256
        ).hexdigest()

    def encrypt(self, plaintext: str) -> dict:
        aesgcm = AESGCM(self.encryption_key)
        nonce = os.urandom(12)
        ciphertext = aesgcm.encrypt(nonce, plaintext.encode(), None)

        return {
            'ciphertext': ciphertext.hex(),
            'nonce': nonce.hex(),
            'blind_index': self._blind_index(plaintext),
        }

    def decrypt(self, encrypted: dict) -> str:
        aesgcm = AESGCM(self.encryption_key)
        nonce = bytes.fromhex(encrypted['nonce'])
        ciphertext = bytes.fromhex(encrypted['ciphertext'])
        return aesgcm.decrypt(nonce, ciphertext, None).decode()

# Uso: almacenar blind_index en una columna indexada separada
# Query: WHERE blind_index = generate_blind_index('user@example.com')
# Esto habilita lookups sin desencriptar cada fila
```

```sql
-- Schema para encripción searchable
CREATE TABLE users (
    id UUID PRIMARY KEY,
    email_encrypted TEXT NOT NULL,      -- ciphertext AES-256-GCM
    email_nonce TEXT NOT NULL,          -- Nonce para desencripción
    email_blind_index VARCHAR(64) NOT NULL  -- HMAC para queries de exact match
);

-- Crear índice en blind index para lookups rápidos
CREATE INDEX idx_users_email_blind ON users(email_blind_index);

-- Query por email sin desencriptar todas las filas
SELECT * FROM users
WHERE email_blind_index = 'a1b2c3d4e5f6...';
```

### Rotación de keys con re-encripción (Python)

Rota la master key y re-encripta datos en batches sin downtime:

```python
import boto3
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
import base64
import os
from typing import Callable

class KeyRotation:
    """Rotar master keys de KMS con re-encripción sin downtime."""

    def __init__(self, old_key_id: str, new_key_id: str):
        self.kms = boto3.client('kms')
        self.old_key_id = old_key_id
        self.new_key_id = new_key_id

    def re_encrypt_record(self, encrypted_package: dict) -> dict:
        """Re-encriptar el DEK de un solo registro con la nueva KEK."""
        encrypted_dek = base64.b64decode(encrypted_package['encrypted_dek'])

        # Desencriptar DEK con key vieja, re-encriptar con key nueva
        response = self.kms.re_encrypt(
            CiphertextBlob=encrypted_dek,
            DestinationKeyId=self.new_key_id,
        )

        encrypted_package['encrypted_dek'] = base64.b64encode(
            response['CiphertextBlob']
        ).decode()
        return encrypted_package

    def batch_re_encrypt(
        self,
        fetch_fn: Callable[[int], list[dict]],
        save_fn: Callable[[dict], None],
        batch_size: int = 100,
    ):
        """Re-encriptar todos los registros en batches."""
        offset = 0
        while True:
            records = fetch_fn(batch_size)
            if not records:
                break

            for record in records:
                re_encrypted = self.re_encrypt_record(record)
                save_fn(re_encrypted)

            offset += len(records)
            print(f'Re-encriptados {offset} registros')

# Uso: ejecutar como background job
rotation = KeyRotation(
    old_key_id='arn:aws:kms:us-east-1:123:key/old-key',
    new_key_id='arn:aws:kms:us-east-1:123:key/new-key',
)
# rotation.batch_re_encrypt(fetch_records, update_record, batch_size=500)
```
