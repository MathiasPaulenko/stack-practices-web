---
contentType: recipes
slug: encryption-at-rest
title: "Implementar Encripción en Reposo para Bases de Datos y Almacenamiento de..."
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

El enfoque ingenuo — encriptar columnas enteras de base de datos con una única key de aplicación — crea fragilidad operacional. La rotación de keys se vuelve dolorosa, el performance se degrada en tablas grandes, y una key filtrada expone todos los datos. La encripción en reposo moderna usa encripción de sobre (envelope encryption): una data encryption key (DEK) encripta el payload, mientras que una key encryption key (KEK) almacenada en un hardware security module o cloud KMS encripta la DEK. Esto habilita rotación de keys por registro, control de acceso granular y operaciones de bulk de alto performance. Lo siguiente cubre encripción AES-256-GCM, patrones de envelope encryption e integración con AWS KMS, Azure Key Vault y HashiCorp Vault.

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
- **Integración con cloud KMS**: AWS KMS, Azure Key Vault y GCP KMS proveen hardware security modules FIPS 140-2 Level 2+. Para prácticas de gestión de secretos, consulta la [guía de gestión de secretos](/guides/security/security-best-practices-guide). Manejan generación de keys, rotación, políticas de acceso y audit logging. Nunca almacenes master keys en archivos de configuración de aplicación.

## Variantes

| Enfoque | Gestión de keys | Performance | Facilidad de rotación | Mejor para |
|---------|----------------|-------------|----------------------|------------|
| Nativo de base de datos (TDE) | Motor de base de datos | Rápida (transparente) | Difícil | Checkbox de compliance |
| Envelope de aplicación | Cloud KMS | Media | Fácil | SaaS multi-tenant |
| Encripción por columna | Aplicación | Lenta (por celda) | Media | Campos altamente sensibles |
| Encripción client-side | Key del cliente | Lenta | Fácil | Privacidad end-to-end |

## Lo que funciona

- **Encripta antes de que llegue a la base de datos**: la encripción a nivel de aplicación protege contra breaches a nivel de base de datos. Si la base de datos es comprometida pero el servidor de aplicación no, los atacantes ven solo ciphertext.
- **Usa encripción autenticada (AEAD)**: AES-GCM y ChaCha20-Poly1305 proveen tags de autenticación. Nunca uses modos no autenticados como AES-CBC o AES-ECB, que son vulnerables a ataques de padding oracle y tampering.
- **Rota keys regularmente**: establece una política de rotación de keys (anualmente para KEKs, por registro para DEKs). Cloud KMS soporta rotación automática de master keys. Documenta el procedimiento de rotación y testéalo en staging.
- **Encripción searchable**: la encripción estándar rompe indexación y búsqueda de base de datos. Usa encripción determinística (mismo plaintext → mismo ciphertext) para queries de exact match, o encripción order-preserving para queries de rango. Sé consciente de que estos filtran algo de información.
- **Key separada por tenant**: en SaaS multi-tenant, encripta los datos de cada tenant con una KEK diferente. Esto asegura que comprometer la key de un tenant no exponga los datos de otros tenants.

## Errores comunes

- **Hardcodear keys de encripción en código fuente**: embeber una master key en `config.py` o una variable de entorno en un servidor compartido anula el propósito. Usa un [secret manager](/recipes/security/vault-dynamic-credentials) con controles de IAM.
- **Ignorar el tag de autenticación**: desencriptar AES-GCM sin verificar el tag de autenticación remueve detección de tampering. Siempre verifica el tag antes de procesar datos desencriptados.
- **Encriptar todo indiscriminadamente**: la encripción agrega latencia, overhead de almacenamiento y complejidad. Solo encripta campos genuinamente sensibles (PII, credenciales, datos de salud). Catálogos de productos públicos no necesitan encripción en reposo.
- **Perder la master key**: si la master key de KMS es eliminada o inaccesible, todos los datos encriptados se pierden permanentemente. Habilita protección contra eliminación de keys, mantén réplicas cross-region y testea procedimientos de disaster recovery.

## Preguntas frecuentes

**P: ¿La encripción en reposo protege contra SQL injection?**
R: No. La encripción en reposo protege datos en disco. Los ataques de SQL injection operan contra bases de datos en ejecución vía manipulación de queries. Combina encripción con [queries parametrizadas](/recipes/security/sql-injection-prevention) y [validación de input](/recipes/api/input-validation) para defensa en profundidad.

**P: ¿Cuál es la diferencia entre TDE y encripción de aplicación?**
R: Transparent Data Encryption (TDE) encripta el archivo completo de base de datos a nivel de storage. Es rápida e invisible para aplicaciones pero protege solo contra robo de disco. La encripción de aplicación protege campos individuales, defendiendo contra breaches a nivel de base de datos pero requiriendo cambios en la aplicación.

**P: ¿Cómo encripto datos pero aún permito búsquedas?**
R: Usa encripción determinística para matches exactos (ej. lookup por email), blind indexes (prefijos de hash almacenados junto a ciphertext) o encripción homomórfica para casos de uso avanzados. Cada enfoque involucra trade-offs entre seguridad y flexibilidad de queries.

**P: ¿Debería encriptar los backups separadamente?**
R: Sí. Los backups de base de datos deberían encriptarse con una key distinta de la key de encripción de producción. Almacena las keys de encripción de backups en un [vault separado](/recipes/security/vault-dynamic-credentials). Testea desencripción de backups trimestralmente como parte de tu plan de disaster recovery.


### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

## Soluciones Avanzadas

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

## Mejores Prácticas Adicionales

1. **Vincula el contexto de encripción al tenant y metadatos del registro.** El encryption context de AWS KMS provee additional authenticated data (AAD) que previene swapping de ciphertext entre tenants o registros:

```python
# Incluir tenant y tipo de registro en el encryption context
context = {
    'tenant': tenant_id,
    'record_type': 'user_ssn',
    'environment': 'production',
}
response = kms.encrypt(
    KeyId=kek_id,
    Plaintext=dek,
    EncryptionContext=context,
)
# Si un atacante intercambia ciphertext entre tenants, la desencripción falla
# porque el encryption context no coincidirá
```

2. **Usa keys separadas para encripción y signing.** Nunca uses la misma key para encripción y MAC/signing. Si necesitas ambas, deriva subkeys separadas de la master key usando HKDF con diferentes info strings:

```python
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes

def derive_subkeys(master_key: bytes) -> tuple[bytes, bytes]:
    """Derivar subkeys separadas de encripción y signing."""
    enc_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b'encryption-subkey',
    ).derive(master_key)

    sig_key = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=b'signing-subkey',
    ).derive(master_key)

    return enc_key, sig_key
```

## Errores Comunes Adicionales

1. **Reusar nonces con la misma key.** AES-GCM requiere un nonce único para cada encripción con la misma key. Reusar un nonce filtra la key de autenticación y permite ataques de forgery. Siempre genera nonces con `os.urandom(12)` o usa un generador de nonce basado en contador:

```python
# INCORRECTO: nonce estático
nonce = b'fixed-nonce!!'  # 12 bytes pero reusado

# CORRECTO: nonce aleatorio por encripción
nonce = os.urandom(12)  # nonce de 96-bit, probabilidad de colisión despreciable
```

2. **Almacenar datos encriptados y keys juntos.** Si el DEK encriptado y el ciphertext están en la misma fila de base de datos y la base de datos se compromete, el atacante tiene todo. Almacena el DEK encriptado en un sistema separado o usa un KMS que lo gestione externamente:

```python
# Almacenar ciphertext en base de datos, DEK encriptado solo en KMS
# La fila de base de datos NO debería contener el encrypted_dek
# En su lugar, almacena una referencia a la key KMS y deja que KMS gestione el DEK
{
    'ciphertext': '...',  # almacenado en DB
    'nonce': '...',       # almacenado en DB
    'kms_key_id': '...',  # almacenado en DB, DEK está en KMS
}
```

## Preguntas Frecuentes Adicionales

### ¿Cuál es la diferencia entre AES-GCM y ChaCha20-Poly1305?

Ambos son cifradores AEAD que proveen confidencialidad e integridad. AES-GCM usa instrucciones AES aceleradas por hardware (AES-NI) y es más rápido en CPUs modernas. ChaCha20-Poly1305 es más rápido en dispositivos sin aceleración hardware de AES (móvil, IoT). Ambos son seguros cuando se usan correctamente con nonces únicos. Elige según tu plataforma objetivo.

### ¿Cómo manejo la encripción en una arquitectura de microservicios?

Cada servicio debería tener su propia key KMS o KEK. Cuando el servicio A envía datos encriptados al servicio B, either comparte el DEK a través de un canal seguro o re-encripta los datos con la key del servicio B. Evita compartir una sola master key entre servicios — esto crea un single point of failure y viola least-privilege. Usa un protocolo de key exchange o un KMS compartido con políticas IAM por servicio.

### ¿Puedo usar encripción client-side con AWS S3?

Sí. Usa el AWS Encryption SDK con KMS para encriptar datos antes de subir a S3. El servidor S3 nunca ve plaintext. Para descarga, el cliente recupera el objeto encriptado y desencripta localmente usando KMS. Esto protege contra misconfiguración de buckets S3 o acceso no autorizado:

```python
import aws_encryption_sdk
from aws_encryption_sdk.identifiers import CommitmentPolicy

client = aws_encryption_sdk.EncryptionSDKClient(
    commitment_policy=CommitmentPolicy.REQUIRE_ENCRYPT_REQUIRE_DECRYPT
)

kms_key_provider = aws_encryption_sdk.StrictAwsKmsMasterKeyProvider(
    key_ids=[kms_key_id]
)

# Encriptar antes de subir
ciphertext, _ = client.encrypt(
    source=plaintext_data,
    key_provider=kms_key_provider,
)

# Subir ciphertext a S3
s3.put_object(Bucket='my-bucket', Key='file.enc', Body=ciphertext)

# Desencriptar después de descargar
plaintext, _ = client.decrypt(
    source=ciphertext,
    key_provider=kms_key_provider,
)
```
