---


contentType: docs
slug: endpoint-security-checklist-template
title: "Plantilla de Checklist de Seguridad de Endpoints"
description: "Una plantilla de checklist para endurecer laptops, estaciones de trabajo y dispositivos moviles que acceden a datos y sistemas corporativos."
metaDescription: "Endurece endpoints con esta plantilla de checklist. Cubre cifrado, MFA, parches, EDR, copias de seguridad y politicas de borrado remoto."
difficulty: beginner
topics:
  - security
  - infrastructure
tags:
  - endpoint-security
  - device-hardening
  - mdm
  - edr
  - compliance
relatedResources:
  - /docs/container-security-baseline-template
  - /docs/network-segmentation-policy-template
  - /docs/secret-rotation-schedule-template
lastUpdated: "2026-06-27"
author: "StackPractices"
seo:
  metaDescription: "Endurece endpoints con esta plantilla de checklist. Cubre cifrado, MFA, parches, EDR, copias de seguridad y politicas de borrado remoto."
  keywords:
    - checklist de seguridad de endpoints
    - endurecimiento de dispositivos
    - gestion de dispositivos moviles
    - endpoint detection and response
    - seguridad BYOD


---

## Descripcion General

La seguridad de endpoints es la practica de proteger dispositivos que se conectan a la red de una organizacion, incluyendo laptops, computadoras de escritorio, telefonos moviles y tablets. Esta plantilla de checklist cubre los controles minimos necesarios para reducir el riesgo de malware, perdida de datos, robo de credenciales y acceso no autorizado desde dispositivos de empleados.

## Cuando Usar


- For alternatives, see [Data Retention Policy Template](/es/docs/data-retention-policy-template/).

- Dar de alta a un nuevo empleado o contratista.
- Entregar una laptop o dispositivo movil corporativo.
- Configurar una politica de bring-your-own-device (BYOD).
- Prepararse para una auditoria de cumplimiento o revision de seguridad.
- Investigar un compromiso de endpoint o un dispositivo perdido.

## Prerequisitos

- Una lista de tipos de dispositivos y sistemas operativos soportados.
- Una herramienta de gestion de dispositivos moviles (MDM) o gestion de endpoints.
- Inventario de software y hardware aprobado.
- Una solucion de endpoint detection and response (EDR).
- Un proceso para reportar dispositivos perdidos, robados o comprometidos.

## Solucion

### Checklist

#### 1. Configuracion del Dispositivo

- [ ] El sistema operativo es soportado y recibe actualizaciones de seguridad.
- [ ] Las actualizaciones automaticas del sistema operativo estan habilitadas.
- [ ] La pantalla se bloquea despues de un corto periodo de inactividad.
- [ ] Se requiere una contraseña fuerte, PIN o autenticacion biometrica.
- [ ] El cifrado de disco completo esta habilitado.
- [ ] El firewall integrado esta habilitado.
- [ ] Las cuentas de invitado o no utilizadas estan deshabilitadas.
- [ ] La capacidad de borrado remoto esta configurada.
- [ ] El dispositivo esta registrado en la consola de MDM o gestion de endpoints.
- [ ] Los servicios de ubicacion estan deshabilitados o restringidos a necesidades empresariales.

#### 2. Identidad y Acceso

- [ ] La autenticacion multifactor esta habilitada para todas las cuentas corporativas.
- [ ] Se utiliza single sign-on (SSO) cuando es posible.
- [ ] Los privilegios de administrador local estan restringidos.
- [ ] Las credenciales corporativas no se comparten con cuentas personales.
- [ ] El gestor de contraseñas esta instalado y configurado.
- [ ] Se requiere VPN o cliente de zero-trust para acceso remoto.

#### 3. Software y Aplicaciones

- [ ] Solo se instala software aprobado.
- [ ] El listado de aplicaciones permitidas o las restricciones de tienda estan aplicadas.
- [ ] El agente antivirus o EDR esta instalado y activo.
- [ ] El navegador web esta actualizado con extensiones de seguridad habilitadas.
- [ ] Las aplicaciones no utilizadas o predeterminadas se eliminan.
- [ ] Las actualizaciones automaticas estan habilitadas para todas las aplicaciones de negocio.

#### 4. Red y Proteccion de Datos

- [ ] El acceso a Wi-Fi publico requiere VPN.
- [ ] El Bluetooth esta deshabilitado cuando no se usa.
- [ ] El uso de USB y medios removibles esta restringido o monitoreado.
- [ ] Los datos sensibles se almacenan en ubicaciones cloud aprobadas, no localmente.
- [ ] Los servicios de sincronizacion en la nube estan restringidos a herramientas corporativas aprobadas.
- [ ] Las copias de seguridad estan configuradas y cifradas.

#### 5. Monitoreo y Respuesta a Incidentes

- [ ] El agente EDR esta reportando al equipo de seguridad.
- [ ] El estado de cumplimiento del dispositivo es visible en la consola de gestion.
- [ ] Las alertas por dispositivos perdidos o robados estan configuradas.
- [ ] Los usuarios saben como reportar un dispositivo perdido o un posible compromiso.
- [ ] El proceso de baja revoca el acceso y borra los datos corporativos.

## Explicacion

Los endpoints son el primer objetivo de phishing, malware y robo de credenciales. Un dispositivo endurecido reduce la probabilidad de compromiso, mientras que el cifrado y el borrado remoto protegen los datos si el dispositivo se pierde. Combinar controles tecnicos con capacitacion de usuarios crea una solida primera linea de defensa.

## Variantes

- Checklist para trabajadores remotos: Agrega VPN, seguridad del router de casa y precauciones de privacidad de camaras.
- Checklist BYOD: Se enfoca en la contenedorizacion y separacion de datos personales vs. corporativos.
- Checklist para dispositivos ejecutivos: Agrega capas de seguridad adicionales, precauciones de viaje y soporte dedicado.
- Checklist para endpoints de desarrolladores: Agrega firma de codigo segura, seguridad del runtime de contenedores y gestion de secretos.
- Checklist solo para moviles: Controles simplificados para telefonos y tablets con restricciones a nivel de aplicacion.

## Lo que funciona

- Aplica el checklist antes de que el dispositivo se use para trabajo.
- Automatiza las verificaciones de cumplimiento a traves de politicas de MDM o EDR.
- Revisa y actualiza el checklist trimestralmente.
- Capacita a los usuarios para reconocer phishing y reportar actividad sospechosa.
- Requiere cifrado para todos los dispositivos que acceden a datos sensibles.
- Manten un inventario de activos vinculado a usuarios y niveles de riesgo.
- Documenta las excepciones con aceptacion de riesgo y fechas de vencimiento.

## Errores Comunes

- Permitir privilegios de administrador local en todos los dispositivos.
- Omitir el cifrado en dispositivos que almacenan datos de clientes.
- No actualizar el checklist para nuevas versiones del sistema operativo.
- Confiar solo en antivirus sin monitoreo conductual de EDR.
- Ignorar dispositivos personales que acceden al correo corporativo.
- No probar los procedimientos de borrado remoto antes de un incidente.
- No revocar el acceso durante la baja de un empleado.

## FAQs

### Que cuenta como un endpoint?

Cualquier dispositivo que se conecta a recursos corporativos: laptops, computadoras de escritorio, telefonos inteligentes, tablets, escritorios virtuales e incluso dispositivos IoT con acceso a la red.

### Debemos cifrar dispositivos BYOD?

Si, si almacenan o acceden a datos corporativos. Utiliza soluciones de mobile application management (MAM) o contenedores para separar datos corporativos y personales, y requiere cifrado para el perfil corporativo.

### Como hacemos cumplir el checklist sin ralentizar a los usuarios?

Utiliza perfiles de MDM, group policy o gestion de configuracion para automatizar tantos controles como sea posible. Proporciona instrucciones claras y opciones de autoservicio para reducir la friccion.

## Soluciones Avanzadas

### Endurecimiento de macOS con Jamf Pro

Automatiza el endurecimiento de endpoints para flotas macOS usando perfiles de configuracion de Jamf Pro:

```bash
#!/bin/bash
set -euo pipefail

# Jamf Pro API authentication
JAMF_URL="https://yourorg.jamfcloud.com"
API_TOKEN=$(curl -s -X POST "$JAMF_URL/api/v1/auth/token" \
  -H "Content-Type: application/json" \
  -d '{"username":"api-user","password":"api-pass"}' | jq -r '.token')

# Apply FileVault encryption policy to all managed Macs
curl -s -X POST "$JAMF_URL/api/v1/mobile-device-command-files" \
  -H "Authorization: Bearer $API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "commandName": "EnableFileVault",
    "mobileDeviceIds": [1, 2, 3, 4, 5]
  }'

# Verify FileVault status across fleet
curl -s -X GET "$JAMF_URL/api/v1/computers-inventory" \
  -H "Authorization: Bearer $API_TOKEN" | \
  jq -r '.results[] | {
    name: .name,
    filevault: .diskEncryptionFileVaultEnabled,
    os_version: .osVersion
  }'

# Enforce Gatekeeper and SIP via configuration profile
cat > gatekeeper-profile.xml << 'EOF'
<?xml version="1.0" encoding="UTF-8"?>
<plist version="1.0">
<dict>
  <key>PayloadContent</key>
  <dict>
    <key>spare-config-data</key>
    <dict>
      <key>Gatekeeper</key>
      <dict>
        <key>DeveloperIdentified</key>
        <true/>
      </dict>
    </dict>
  </dict>
  <key>PayloadDisplayName</key>
  <string>Gatekeeper Enforcement</string>
  <key>PayloadIdentifier</key>
  <string>com.company.gatekeeper</string>
  <key>PayloadType</key>
  <string>com.apple.ManagedClient.preferences</string>
  <key>PayloadVersion</key>
  <integer>1</integer>
</dict>
</plist>
EOF
```

### Endurecimiento de endpoints Windows con Intune

Despliega baselines de seguridad a endpoints Windows 11 via Microsoft Intune:

```powershell
# Connect to Microsoft Graph
Connect-MgGraph -Scopes "DeviceManagementConfiguration.ReadWrite.All"

# Apply Windows 11 Security Baseline
$baseline = Get-MgDeviceManagementConfigurationPolicy |
  Where-Object { $_.Name -like "*Windows 11 Security*" }

# Verify compliance status across enrolled devices
$devices = Get-MgDeviceManagementManagedDevice
foreach ($device in $devices) {
    $compliance = Get-MgDeviceManagementManagedDeviceCompliancePolicyState `
      -ManagedDeviceId $device.Id

    Write-Output "$($device.DeviceName): $($compliance.State)"
}

# Check BitLocker encryption status
$bitlockerReport = Get-MgDeviceManagementManagedDevice |
  Select-Object DeviceName, @{
    Name="BitLockerStatus";
    Expression={ $_.EncryptionState -eq 1 ? "Encrypted" : "Not Encrypted" }
  }
$bitlockerReport | Format-Table
```

### Escaneo automatizado de cumplimiento de endpoints con osquery

Ejecuta osquery para auditar la postura de seguridad de endpoints en tu flota:

```sql
-- Check disk encryption status
SELECT
  de.encrypted,
  de.encrypted,
  hos.hostname,
  hos.os_version
FROM disk_encryption de
JOIN os_version hos
WHERE de.encrypted = 0;

-- Find devices with disabled firewall
SELECT
  pf.global_state,
  hos.hostname
FROM process_firewall pf
JOIN os_version hos
WHERE pf.global_state = 0;

-- Detect missing EDR agent
SELECT
  hos.hostname,
  p.name AS process_name
FROM processes p
JOIN os_version hos
WHERE p.name LIKE "%CrowdStrike%"
  OR p.name LIKE "%SentinelOne%"
  OR p.name LIKE "%Defender%"
GROUP BY hos.hostname
HAVING COUNT(*) = 0;

-- Find devices with USB storage enabled
SELECT
  hos.hostname,
  de.device,
  de.media_name
FROM disk_events de
JOIN os_version hos
WHERE de.action = "added"
  AND de.device LIKE "/dev/sd%";
```

## Mejores Practicas Adicionales

1. **Implementa acceso de red zero-trust (ZTNA) para endpoints.** Reemplaza la VPN tradicional con ZTNA para verificar la postura del dispositivo antes de otorgar acceso. Los dispositivos que no pasan las verificaciones de cumplimiento se bloquean automaticamente:

```yaml
# ZTNA policy: Block non-compliant devices
access_policy:
  name: "Endpoint compliance gate"
  conditions:
    - device.compliance_status == "compliant"
    - device.encryption_enabled == true
    - device.edr_reporting == true
  action: "allow"
  fallback_action: "block"
  fallback_message: "Device not compliant. Contact IT."
```

2. **Usa llaves de seguridad hardware para usuarios privilegiados.** Las llaves de seguridad FIDO2 (YubiKey, Titan) proporcionan MFA resistente a phishing. Exigelas para administradores y desarrolladores con acceso a produccion:

```bash
# Enforce security key requirement via Okta API
curl -X POST "https://yourorg.okta.com/api/v1/policies" \
  -H "Authorization: SSWS $OKTA_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "type": "MFA_ENROLL",
    "name": "Security Key Required for Admins",
    "status": "ACTIVE",
    "priority": 1,
    "conditions": {
      "people": {
        "groups": {"include": ["admin-group-id"]}
      }
    },
    "settings": {
      "factors": [{"factorType": "security_key"}]
    }
  }'
```

## Errores Comunes Adicionales

1. **No asegurar las estaciones de trabajo de desarrolladores con el mismo rigor que las laptops de oficina.** Las maquinas de desarrolladores suelen tener llaves SSH, credenciales cloud y acceso a produccion. Aplica los mismos requisitos de EDR, cifrado y MFA:

```bash
# Scan developer machines for exposed credentials
# Check for SSH keys without passphrase
find ~/.ssh -name "id_*" -not -name "*.pub" -exec ssh-keygen -y -f {} \; 2>&1 | \
  grep -q "Enter passphrase" || echo "WARNING: Key without passphrase: {}"

# Check for AWS credentials in plaintext
find ~/.aws -name "credentials" -exec chmod 600 {} \;
```

2. **Ignorar dispositivos IoT y smart devices en la red corporativa.** Smart TVs, dispositivos de salas de conferencias e impresoras de red suelen ejecutar firmware sin parchear. Segmentalos en una VLAN dedicada con acceso restringido:

```bash
# Example: VLAN segmentation for IoT devices
# Switch configuration snippet
interface vlan 50
  description "IoT Devices - Restricted"
  ip access-group IoT_RESTRICTED in
!
ip access-list extended IoT_RESTRICTED
  permit tcp any any eq 443
  permit tcp any any eq 80
  deny ip any 10.0.0.0 0.255.255.255
  permit ip any any
```

## Preguntas Frecuentes Adicionales

### Con que frecuencia debo auditar el cumplimiento de endpoints?

Ejecuta verificaciones automatizadas de cumplimiento semanalmente via MDM o EDR. Realiza una auditoria manual completa trimestralmente. Despues de cualquier incidente de seguridad, re-audita todos los dispositivos que puedan haber estado expuestos.

### Cual es la diferencia entre MDM y EDR?

MDM (Mobile Device Management) gestiona la configuracion del dispositivo, politicas y ciclo de vida (alta, actualizaciones, borrado remoto). EDR (Endpoint Detection and Response) monitorea amenazas, recolecta telemetria y permite investigacion de incidentes. Necesitas ambos: MDM para prevencion, EDR para deteccion y respuesta.
