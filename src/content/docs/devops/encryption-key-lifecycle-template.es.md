---
contentType: docs
slug: encryption-key-lifecycle-template
title: "Plantilla de Ciclo de Vida de Claves de Cifrado"
description: "Una plantilla para gestionar la creacion, distribucion, rotacion y destruccion de claves de cifrado en aplicaciones y servicios."
metaDescription: "Gestiona claves de cifrado con esta plantilla de ciclo de vida. Cubre generacion, almacenamiento, rotacion, control de acceso y procedimientos de destruccion."
difficulty: intermediate
topics:
  - security
  - infrastructure
tags:
  - encryption
  - key-management
  - kms
  - cryptography
  - compliance
relatedResources:
  - /docs/devops/secret-rotation-schedule-template
  - /docs/devops/ci-cd-pipeline-security-template
  - /docs/devops/data-breach-response-playbook
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Gestiona claves de cifrado con esta plantilla de ciclo de vida. Cubre generacion, almacenamiento, rotacion, control de acceso y procedimientos de destruccion."
  keywords:
    - ciclo de vida de claves de cifrado
    - gestion de claves
    - KMS
    - rotacion de claves
    - politica de criptografia
---

## Descripcion General

La gestion del ciclo de vida de claves de cifrado define como se crean, almacenan, usan, rotan y retiran las claves. Una mala gestion de claves puede socavar completamente el cifrado al exponerlas, mantenerlas por demasiado tiempo o no revocarlas cuando ya no se necesitan. Esta plantilla proporciona politicas, procedimientos y roles para gestionar claves simetricas y asimetricas en aplicaciones, bases de datos, copias de seguridad y servicios cloud.

## Cuando Usar

- Disenar una estrategia de gestion de claves para una nueva aplicacion o plataforma.
- Seleccionar o configurar un servicio de gestion de claves (KMS) o modulo de seguridad de hardware (HSM).
- Establecer una politica de rotacion de claves para cumplimiento o reduccion de riesgo.
- Responder a un compromiso de clave o acceso no autorizado sospechado.
- Dar de baja un sistema o retirar un servicio que contiene datos cifrados.

## Prerequisitos

- Un servicio de gestion de claves como AWS KMS, Azure Key Vault, Google Cloud KMS, HashiCorp Vault o HSM.
- Una clasificacion de datos que requieren cifrado en reposo, en transito o en uso.
- Una lista de sistemas y servicios que generan o usan claves de cifrado.
- Roles definidos para custodios de claves, usuarios y auditores.

## Solucion

### Plantilla

#### 1. Clasificacion de Claves

| Tipo de Clave | Proposito | Ejemplo | Nivel de Proteccion |
|---------------|-----------|---------|---------------------|
| Clave de cifrado de datos (DEK) | Cifra datos en reposo | Clave AES-256 de base de datos | Alta |
| Clave de cifrado de claves (KEK) | Cifra DEKs | Clave RSA en KMS | Critica |
| Clave de transporte | Cifra datos en transito | Clave privada TLS | Alta |
| Clave de firma | Firma codigo o artefactos | Clave ECDSA de firma de codigo | Critica |
| Clave API | Autentica llamadas API | Secreto HMAC | Media |
| Clave de backup | Cifra copias de seguridad | Clave AES-256 de backup | Alta |

#### 2. Etapas del Ciclo de Vida de Claves

| Etapa | Actividades | Dueno | Artefactos |
|-------|-------------|-------|------------|
| Generacion | Crear clave con algoritmo y longitud aprobados | Equipo de plataforma | Metadatos de clave, algoritmo |
| Distribucion | Entregar clave de forma segura a sistemas autorizados | Equipo de seguridad | Log de acceso, alias de clave |
| Almacenamiento | Almacenar en KMS, HSM o vault | Equipo de plataforma | Ubicacion de clave, politica |
| Uso | Aplicar minimo privilegio y auditar todas las operaciones | Equipo de aplicacion | Politica de acceso, logs de auditoria |
| Rotacion | Reemplazar clave periodicamente o tras incidente | Equipo de seguridad | Cronograma de rotacion, nueva clave |
| Compromiso | Revocar, rotar y evaluar impacto | Equipo de seguridad | Reporte de incidente, nueva clave |
| Destruccion | Eliminar clave de forma segura cuando ya no se necesita | Equipo de plataforma | Certificado de destruccion |
| Archivo | Conservar metadatos de cumplimiento sin material de clave | Equipo de cumplimiento | Registro de retencion |

#### 3. Politica de Rotacion de Claves

| Tipo de Clave | Frecuencia de Rotacion | Disparador | Automatica |
|---------------|------------------------|------------|------------|
| Clave KEK / KMS | 2 años | Programada | Si |
| Clave de certificado TLS | 1 año | Vencimiento de certificado | Si |
| DEK de base de datos | 1 año | Programada | No, mantenimiento planificado |
| Clave de firma | 1 año | Programada o compromiso sospechado | Semi-automatica |
| Secreto API HMAC | 90 dias | Programada o filtracion de credencial | Si |
| Clave de backup | 1 año | Programada | No |

#### 4. Matriz de Control de Acceso

| Rol | Generar | Usar | Rotar | Destruir | Auditar |
|-----|---------|------|-------|----------|---------|
| Servicio de aplicacion | No | Si | No | No | No |
| Ingeniero de plataforma | Si | No | Si | No | Si |
| Ingeniero de seguridad | No | No | Si | No | Si |
| Custodio de claves | Si | No | Si | No | Si |
| Auditor | No | No | No | No | Si |
| Oficial de cumplimiento | No | No | No | Si con aprobacion | Si |

#### 5. Procedimiento de Respuesta a Compromiso

| Paso | Accion | Dueno | Plazo |
|------|--------|-------|-------|
| 1 | Revocar o deshabilitar la clave comprometida | Equipo de seguridad | Dentro de 1 hora |
| 2 | Identificar todos los sistemas y datos protegidos por la clave | Equipo de seguridad | Dentro de 4 horas |
| 3 | Rotar a una nueva clave y recifrar datos | Equipo de plataforma | Dentro de 24 horas |
| 4 | Notificar a interesados y clientes si es requerido | Comandante de incidente | Dentro de 24 horas |
| 5 | Preservar logs de auditoria y evidencia | Equipo de seguridad | Inmediato |
| 6 | Actualizar reporte de incidente y lecciones aprendidas | Equipo de seguridad | Dentro de 1 semana |

#### 6. Checklist de Destruccion

- [ ] La clave ya no es usada por ninguna aplicacion o servicio.
- [ ] Los datos cifrados se descifraron con la nueva clave o se eliminaron de forma segura.
- [ ] Se identificaron todas las copias de seguridad y replicas que contienen la clave.
- [ ] El material de clave se elimino del KMS, HSM o vault.
- [ ] La destruccion se registro y firmo por el custodio de claves y el oficial de cumplimiento.
- [ ] El periodo de retencion de metadatos se documento y aplica.

## Explicacion

El cifrado es tan fuerte como las claves que lo protegen. La plantilla de ciclo de vida asegura que las claves se generen con algoritmos robustos, se almacenen en servicios aprobados, se accedan con minimo privilegio, se roten regularmente y se destruyan de forma segura cuando ya no se necesiten. Separar responsabilidades entre custodios, usuarios y auditores evita que una sola persona controle todo el ciclo de vida.

## Politica de Rotacion de Claves en AWS KMS

```yaml
# Clave AWS KMS con rotacion automatica
Resources:
  EncryptionKey:
    Type: AWS::KMS::Key
    Properties:
      Description: Clave de cifrado de datos de aplicacion
      EnableKeyRotation: true
      KeyPolicy:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:role/app-role'
            Action:
              - kms:Encrypt
              - kms:Decrypt
              - kms:ReEncrypt*
              - kms:GenerateDataKey*
              - kms:DescribeKey
            Resource: '*'
          - Effect: Allow
            Principal:
              AWS: !Sub 'arn:aws:iam::${AWS::AccountId}:root'
            Action:
              - kms:CreateAlias
              - kms:DeleteAlias
              - kms:UpdateAlias
              - kms:ScheduleKeyDeletion
              - kms:EnableKeyRotation
            Resource: '*'
      PendingWindowInDays: 30
```

## Script de Automatizacion de Rotacion de Claves

```bash
#!/bin/bash
# Verificar y reportar estado de rotacion de claves en AWS KMS
set -euo pipefail

REGION="us-east-1"
ALERT_DAYS=7

for key_id in $(aws kms list-keys --region $REGION --query 'Keys[*].KeyId' --output text); do
  rotation_status=$(aws kms get-key-rotation-status --key-id $key_id --region $REGION --query 'KeyRotationEnabled' --output text 2>/dev/null || echo "N/A")
  key_desc=$(aws kms describe-key --key-id $key_id --region $REGION --query 'KeyMetadata.Description' --output text 2>/dev/null || echo "N/A")
  creation_date=$(aws kms describe-key --key-id $key_id --region $REGION --query 'KeyMetadata.CreationDate' --output text 2>/dev/null || echo "N/A")

  echo "Clave: $key_id | Descripcion: $key_desc | Rotacion: $rotation_status | Creada: $creation_date"

  if [ "$rotation_status" = "False" ]; then
    echo "ADVERTENCIA: La clave $key_id no tiene rotacion automatica habilitada"
  fi
done
```

## Runbook de Respuesta a Compromiso de Clave

```text
=== Respuesta a Compromiso de Clave ===

1. CONTENER (inmediato, 0-15 min)
   - Deshabilitar la clave comprometida en KMS/HSM
   - Revocar todas las politicas de acceso para la clave
   - Identificar todos los datos cifrados con la clave comprometida

2. EVALUAR (15-60 min)
   - Determinar alcance: que servicios, bases de datos, backups afectados
   - Revisar logs de acceso por uso no autorizado de la clave
   - Notificar al equipo de seguridad y al custodio de la clave

3. REEMPLAZAR (1-4 horas)
   - Crear nueva clave con la misma politica
   - Re-cifrar todos los datos afectados con la nueva clave
   - Actualizar configuraciones de aplicacion para usar nuevo ARN/ID de clave
   - Desplegar configuraciones actualizadas

4. DESTRUIR (despues de verificacion)
   - Programar eliminacion de la clave comprometida
   - Verificar que todos los datos usan la nueva clave
   - Documentar incidente y actualizar inventario de claves

5. POST-INCIDENTE (dentro de 1 semana)
   - Revisar causa raiz del compromiso
   - Actualizar politicas de acceso y monitoreo
   - Conducir auditoria completa de inventario de claves
   - Actualizar documentacion del ciclo de vida de claves
```


## Variantes

- **Ciclo de vida de claves en KMS cloud**: Utiliza AWS KMS, Azure Key Vault o Google Cloud KMS con rotacion automatica y politicas IAM.
- **Ciclo de vida respaldado por HSM**: Agrega proteccion fisica o HSM cloud para claves de alta seguridad.
- **Ciclo de vida de claves a nivel de aplicacion**: Se enfoca en claves generadas y gestionadas dentro de una sola aplicacion o servicio.
- **Ciclo de vida de claves de cifrado de base de datos**: Cubre cifrado transparente de datos (TDE) y claves a nivel de columna.
- **Ciclo de vida de claves de backup**: Asegura que las claves de largo plazo puedan recuperarse para retencion de archivos mientras permanecen seguras.

## Lo que funciona

- Utiliza un KMS o HSM centralizado en lugar de almacenar claves en el codigo de aplicacion.
- Separa las claves de cifrado de datos de las claves de cifrado de claves.
- Rota claves automaticamente cuando el servicio lo soporta.
- Registra cada uso de clave y accion administrativa.
- Limita la exportacion de claves a claves no extraibles salvo que sea requerido.
- Prueba los procedimientos de rotacion y destruccion antes de un incidente.
- Manten un inventario de todas las claves, duenos y fechas de rotacion.
- Requiere aprobacion de multiples personas para acciones de alto impacto como la destruccion.

## Errores Comunes

- Codificar claves en el codigo fuente o archivos de configuracion.
- Nunca rotar claves a pesar de requisitos de cumplimiento.
- Compartir claves entre multiples aplicaciones o ambientes.
- Permitir la exportacion de claves sin aprobacion o auditoria.
- No respaldar metadatos o KEKs antes de la destruccion.
- Ignorar procedimientos de respuesta a compromiso de claves.
- Mantener claves viejas indefinidamente despues de la rotacion.

## FAQs

### Cual es la diferencia entre una DEK y una KEK?

Una clave de cifrado de datos (DEK) cifra los datos reales. Una clave de cifrado de claves (KEK) cifra la DEK, permitiendo que la DEK se almacene de forma segura mientras la KEK permanece en un KMS o HSM seguro.

### Debemos rotar claves incluso sin un compromiso?

Si. La rotacion programada limita la ventana de exposicion si una clave se compromete sin ser detectada y satisface muchos requisitos de cumplimiento.

### Como rotamos una clave que protege una base de datos grande?

Utiliza una rotacion de dos claves: agrega la nueva clave, recifra los datos gradualmente o de forma perezosa, luego retira la clave vieja cuando todos los datos esten protegidos por la nueva clave.


### Que es envelope encryption y por que deberiamos usarlo?

Envelope encryption usa un KEK (Key Encryption Key) para cifrar DEKs (Data Encryption Keys). El DEK cifra los datos reales, y el KEK cifra el DEK. Esto permite que el DEK se almacene junto con los datos cifrados mientras el KEK permanece en un KMS seguro. Beneficios: el KMS solo ve el DEK (no los datos), reduciendo latencia; el KEK puede rotarse sin re-cifrar todos los datos; y el control de acceso se centraliza a nivel de KEK.

### Como gestionamos claves entre multiples proveedores de nube?

Usa un KMS agnostico de nube como HashiCorp Vault Transit engine, o manten KMS separados por nube con un inventario centralizado de claves. Para workloads multi-cloud, considera claves multi-region de AWS KMS o un formato de clave portable. Documenta que claves protegen que datos en cada nube. Nunca copies material de clave entre proveedores a menos que uses un proceso BYOK (Bring Your Own Key) con claves respaldadas por HSM.

### Que es BYOK y cuando deberiamos usarlo?

BYOK (Bring Your Own Key) permite generar y poseer el material de clave en tu propio HSM, luego importarlo a un KMS de nube. Usalo cuando el cumplimiento requiera que el material de clave permanezca bajo tu control, o cuando necesites la misma clave entre multiples proveedores de nube. Asegura que el proceso de importacion use una clave de wrapping segura y que el KMS de nube soporte eliminacion de clave con verificacion.

### Como auditamos el uso de claves?

Habilita el logging de acceso a KMS (AWS CloudTrail eventos KMS, Azure Key Vault diagnostics, GCP Cloud Audit Logs para KMS). Registra cada Encrypt, Decrypt, GenerateDataKey y accion administrativa. Envia logs a un SIEM para alertas en tiempo real sobre patrones inusuales (ej. decrypt desde una IP nueva, eliminacion de clave sin aprobacion). Revisa reportes de uso de claves mensualmente y compara contra patrones esperados de aplicacion.

### Que es crypto-shredding?

Crypto-shredding es el proceso de destruir datos cifrados eliminando la clave de cifrado. Cuando la clave se elimina, los datos se vuelven permanentemente irrecuperables. Esto es util para cumplimiento con solicitudes de eliminacion de datos (GDPR derecho al olvido). Usa claves por tenant o por cliente para que eliminar una sola clave destruya solo los datos de ese cliente. Documenta el mapeo clave-a-datos y el proceso de destrucion.


### Como manejamos la rotacion de claves para certificados TLS?

La rotacion de claves TLS la maneja tu sistema de gestion de certificados. Para ACM, la rotacion es automatica. Para certificados auto-gestionados, genera un nuevo par de claves, crea un CSR, obtén el nuevo certificado, despliegalo junto al antiguo, luego elimina el antiguo despues de verificar. Usa un despliegue de certificado dual durante la transicion para evitar downtime. Automatiza este proceso con cert-manager en Kubernetes o Certbot para servidores tradicionales.

### Que es un custodio de claves y cuales son sus responsabilidades?

Un custodio de claves es una persona designada responsable de la gestion del ciclo de vida de las claves de cifrado. Sus deberes incluyen: aprobar creacion y rotacion de claves, monitorear logs de uso de claves, coordinar destruccion de claves con cumplimiento, mantener el inventario de claves, y responder a incidentes de compromiso de claves. El custodio no debe ser la misma persona que usa las claves en aplicaciones (separacion de deberes).

### Que es HSM y cuando lo necesitamos?

Un HSM (Hardware Security Module) es un dispositivo fisico que genera, almacena y gestiona claves criptograficas en hardware resistente a manipulacion. Usa HSMs cuando el cumplimiento requiera FIPS 140-2 Nivel 3 o superior (PCI DSS, gobierno, salud), cuando las claves nunca deban salir de memoria protegida por hardware, o para operaciones criptograficas de alto throughput. Opciones de HSM en nube: AWS CloudHSM, Azure Dedicated HSM, Google Cloud HSM.

Documenta el procedimiento de failover del HSM y pruebalo trimestralmente. La disponibilidad del HSM es critica para cualquier servicio que dependa de claves almacenadas en el HSM.

Prueba los procedimientos de recuperacion de claves anualmente. Una clave que no puede recuperarse cuando se necesita puede causar perdida de datos tan severa como una brecha de seguridad.


End of document. Review and update quarterly.