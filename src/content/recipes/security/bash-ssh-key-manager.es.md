---
contentType: recipes
slug: bash-ssh-key-manager
title: "Gestión de Llaves SSH en Bash"
description: "Genera, rota y distribuye llaves SSH con scripts bash."
metaDescription: "Gestiona llaves SSH en bash. Genera llaves ed25519, rota llaves comprometidas, distribuye a múltiples servidores y fuerza autenticación por llave."
difficulty: intermediate
topics:
  - security
tags:
  - bash
  - ssh
  - keys
  - security
  - authentication
  - automation
relatedResources:
  - /recipes/bash-ssh-key-management
  - /docs/ssl-certificate-management-template
  - /docs/api-security-review-template
  - /guides/api-security-checklist-guide
  - /guides/security-best-practices-guide
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Gestiona llaves SSH en bash. Genera llaves ed25519, rota llaves comprometidas, distribuye a múltiples servidores y fuerza autenticación por llave."
  keywords:
    - bash ssh keys
    - generar llave ed25519
    - rotar llaves ssh
    - distribuir llaves ssh
    - deshabilitar password ssh
---
## Visión General

Las llaves SSH son la forma estándar de autenticarse a servidores remotos. Gestionarlas manualmente entre múltiples máquinas es propenso a errores. Esta recipe cubre generar llaves ed25519, distribuirlas a servidores, rotar llaves comprometidas y deshabilitar la autenticación por password.

## Cuándo Usar

- Necesitas generar llaves SSH para nuevos miembros del equipo
- Quieres distribuir tu llave pública a múltiples servidores a la vez
- Necesitas rotar llaves después de un incidente de seguridad
- Estás endureciendo la seguridad del servidor deshabilitando auth por password

## Solución

### Generar una llave ed25519

```bash
#!/bin/bash

KEY_NAME="${1:-default}"
KEY_PATH="$HOME/.ssh/${KEY_NAME}"

if [ -f "$KEY_PATH" ]; then
    echo "Key already exists: $KEY_PATH"
    exit 1
fi

ssh-keygen -t ed25519 -C "$(whoami)@$(hostname)-${KEY_NAME}" -f "$KEY_PATH" -N ""

echo "Generated: $KEY_PATH"
echo "Public key: ${KEY_PATH}.pub"
```

### Distribuir llave pública a múltiples servidores

```bash
#!/bin/bash

PUBLIC_KEY="$HOME/.ssh/id_ed25519.pub"
SERVERS=(
    "user@server1.example.com"
    "user@server2.example.com"
    "user@server3.example.com"
)

for server in "${SERVERS[@]}"; do
    echo "Distributing key to $server..."
    ssh-copy-id -i "$PUBLIC_KEY" "$server"
done

echo "Key distributed to ${#SERVERS[@]} servers"
```

### Distribuir llave sin ssh-copy-id

```bash
#!/bin/bash

PUBLIC_KEY=$(cat "$HOME/.ssh/id_ed25519.pub")
SERVERS_FILE="servers.txt"

while IFS= read -r server; do
    [ -z "$server" ] && continue
    echo "Adding key to $server..."
    ssh "$server" "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$PUBLIC_KEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
done < "$SERVERS_FILE"
```

### Rotar llaves comprometidas

```bash
#!/bin/bash

OLD_KEY="$1"
SERVERS_FILE="servers.txt"

if [ -z "$OLD_KEY" ]; then
    echo "Usage: $0 <old-public-key-string>"
    exit 1
fi

# Remover llave vieja de todos los servidores
while IFS= read -r server; do
    [ -z "$server" ] && continue
    echo "Removing old key from $server..."
    ssh "$server" "sed -i '/${OLD_KEY}/d' ~/.ssh/authorized_keys"
done < "$SERVERS_FILE"

# Generar nueva llave
ssh-keygen -t ed25519 -C "$(whoami)@$(hostname)-rotated" -f "$HOME/.ssh/id_ed25519_rotated" -N ""

echo "Old key removed. New key: $HOME/.ssh/id_ed25519_rotated"
echo "Distribute the new key with the distribute script."
```

### Deshabilitar autenticación por password

```bash
#!/bin/bash

SSHD_CONFIG="/etc/ssh/sshd_config"

# Backup de la config original
cp "$SSHD_CONFIG" "${SSHD_CONFIG}.bak"

# Deshabilitar auth por password
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
sed -i 's/^#*ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' "$SSHD_CONFIG"
sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' "$SSHD_CONFIG"

# Reiniciar SSH
systemctl restart sshd

echo "Password authentication disabled. Key-based auth only."
```

### Auditar llaves SSH en un servidor

```bash
#!/bin/bash

echo "=== SSH Key Audit ==="
echo "Date: $(date)"
echo ""

for user_home in /home/* /root; do
    user=$(basename "$user_home")
    auth_file="${user_home}/.ssh/authorized_keys"

    if [ -f "$auth_file" ]; then
        key_count=$(wc -l < "$auth_file")
        echo "User: $user ($key_count keys)"
        while IFS= read -r key; do
            [ -z "$key" ] && continue
            key_type=$(echo "$key" | awk '{print $1}')
            key_comment=$(echo "$key" | awk '{print $3}')
            key_fingerprint=$(echo "$key" | ssh-keygen -lf - 2>/dev/null | awk '{print $1}')
            echo "  - $key_type | $key_fingerprint | $key_comment"
        done < "$auth_file"
        echo ""
    fi
done
```

### Listar todas las llaves SSH en la máquina local

```bash
#!/bin/bash

echo "=== Local SSH Keys ==="
for key in ~/.ssh/id_* ~/.ssh/*.pub; do
    [ -f "$key" ] || continue
    if [[ "$key" == *.pub ]]; then
        fingerprint=$(ssh-keygen -lf "$key" 2>/dev/null)
        echo "Public:  $key"
        echo "  $fingerprint"
    fi
done
```

## Explicación

Las llaves ed25519 son más pequeñas, rápidas y seguras que RSA. Una llave ed25519 de 256 bits provee seguridad equivalente a una llave RSA de 3072 bits. Siempre prefiere ed25519 para llaves nuevas.

`ssh-copy-id` agrega tu llave pública a `~/.ssh/authorized_keys` en el servidor remoto. Maneja la configuración de permisos (700 para `~/.ssh`, 600 para `authorized_keys`). Si `ssh-copy-id` no está disponible, puedes hacer lo mismo con un comando `ssh` manual.

La rotación de llaves remueve la llave pública vieja de los archivos `authorized_keys` en todos los servidores. El comando `sed -i` borra cualquier línea que contenga el string de la llave vieja. Después de remover, genera una llave nueva y distribúyela.

Deshabilitar la autenticación por password es el paso más efectivo de hardening SSH. Elimina los ataques de brute-force por password completamente.

## Variantes

| Enfoque | Tipo de Llave | Usar Cuando |
|---------|--------------|-------------|
| ed25519 | Ed25519 | Llaves nuevas, servidores modernos |
| RSA 4096 | RSA | Servidores legacy sin soporte ed25519 |
| ECDSA | ECDSA | Requisitos de compliance específicos |
| Llave hardware (FIDO2) | Ed25519-SK | Entornos de alta seguridad con YubiKey |

## Pautas

- Usa ed25519 para todas las llaves nuevas. Es más rápida y segura que RSA.
- Setea una passphrase en llaves privadas. Usa `ssh-agent` para no tipearla repetidamente.
- Usa `~/.ssh/config` para gestionar múltiples llaves y alias de servidores.
- Rota llaves después de salidas de miembros del equipo o compromisos sospechados.
- Audita archivos `authorized_keys` trimestralmente. Remueve llaves de usuarios que ya no necesitan acceso.

## Errores Comunes

- Usar llaves RSA más cortas que 3072 bits. RSA 2048 ya no se recomienda para uso a largo plazo.
- Dejar llaves privadas sin passphrase. Cualquiera con acceso al archivo puede usar la llave.
- No remover llaves viejas de `authorized_keys` después de rotar. La llave comprometida sigue siendo válida.
- Deshabilitar auth por password antes de verificar que el login por llave funciona. Te bloqueas fuera.
- Compartir llaves privadas entre usuarios. Cada usuario debe tener su propio par de llaves.

## Preguntas Frecuentes

### ¿Cómo uso una llave específica para un servidor específico?

Usa `~/.ssh/config`:

```ssh-config
Host server1.example.com
    IdentityFile ~/.ssh/id_ed25519_server1
    User deploy

Host *.internal
    IdentityFile ~/.ssh/id_ed25519_internal
    User admin
```

### ¿Cómo configuro SSH agent forwarding de forma segura?

Agrega la llave al agent:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

Luego conecta con `-A` para forwardear el agent. Solo usa agent forwarding con servidores confiables. Un servidor comprometido puede usar tu agent forwardeado para conectarse a otros servidores como tú.

### ¿Cómo fuerza auth por llave sin bloquearme fuera?

Testea el login por llave en una segunda terminal antes de deshabilitar passwords:

```bash
# Terminal 1: mantén esta abierta
ssh user@server

# Terminal 2: testea login por llave
ssh -o PasswordAuthentication=no user@server

# Si funciona, deshabilita passwords en Terminal 1
```

### ¿Cuál es la diferencia entre authorized_keys y known_hosts?

`authorized_keys` lista llaves públicas que pueden loguearse a esta máquina. `known_hosts` lista servidores a los que esta máquina se ha conectado. Sirven propósitos opuestos: uno controla acceso inbound, el otro valida conexiones outbound.

## Soluciones Avanzadas

### Configuración SSH con jump host (bastion)

Conéctate a servidores internos a través de un bastion host sin exponerlos a internet. La directiva `ProxyJump` encadena conexiones SSH:

```ssh-config
# Bastion host (alcanzable desde internet)
Host bastion
    HostName bastion.example.com
    User deploy
    IdentityFile ~/.ssh/id_ed25519_bastion
    Port 2222

# Servidores internos (solo alcanzables vía bastion)
Host *.internal.example.com
    User deploy
    IdentityFile ~/.ssh/id_ed25519_internal
    ProxyJump bastion
    # Deshabilitar agent forwarding al bastion por seguridad
    ForwardAgent no

# Servidor de base de datos (dos saltos: bastion -> jump -> db)
Host db-prod.internal.example.com
    User dbadmin
    IdentityFile ~/.ssh/id_ed25519_db
    ProxyJump jump-vm.internal.example.com
```

### Llaves SSH respaldadas por hardware FIDO2 (YubiKey)

Genera llaves SSH que requieren presencia física de hardware. La llave privada nunca sale del YubiKey:

```bash
#!/bin/bash

# Generar una llave ed25519 respaldada por FIDO2
# Requiere OpenSSH 8.2+ y un dispositivo compatible con FIDO2 (YubiKey 5 Series)
ssh-keygen -t ed25519-sk -C "$(whoami)@$(hostname)-fido2" -f "$HOME/.ssh/id_ed25519_sk"

# Con passphrase y requiriendo touch en cada uso
ssh-keygen -t ed25519-sk -O resident -O verify-required \
    -C "$(whoami)@$(hostname)-fido2-strict" \
    -f "$HOME/.ssh/id_ed25519_sk_strict"

echo "FIDO2 key generated. Touch YubiKey when prompted during use."

# Resident key puede recuperarse en una máquina nueva
# ssh-keygen -K  # descarga resident keys del dispositivo FIDO2
```

### Autoridad Certificadora SSH (CA) para firma de llaves

En lugar de distribuir llaves públicas a cada servidor, configura una CA SSH. Los servidores confían en la CA, y los usuarios obtienen certificados firmados con expiración:

```bash
#!/bin/bash

# === En el host CA ===
# Generar par de llaves CA (hacer esto una vez, mantener la llave privada segura)
ssh-keygen -t ed25519 -f /etc/ssh/ca_key -N "" -C "SSH CA"

# === En cada servidor (confiar en la CA) ===
# Agregar llave pública de la CA como trusted user CA
echo "TrustedUserCAKeys /etc/ssh/ca_key.pub" >> /etc/ssh/sshd_config
systemctl restart sshd

# === Firmar la llave pública de un usuario (en host CA) ===
# Firmar con período de validez y restricciones de principal
ssh-keygen -s /etc/ssh/ca_key \
    -I "user-$(date +%Y%m%d)" \
    -n deploy,admin \
    -V +1d \
    ~/.ssh/id_ed25519.pub

# Esto genera ~/.ssh/id_ed25519-cert.pub
# El usuario se conecta con su llave + certificado:
# ssh -i ~/.ssh/id_ed25519 user@server

# El certificado es válido por 1 día y solo para principals 'deploy' y 'admin'
```

### Rotación masiva de llaves en un fleet de servidores

Rota llaves en cientos de servidores usando una herramienta SSH paralela y un manifiesto de rotación:

```bash
#!/bin/bash

# rotation-manifest.txt format: server old_key_fingerprint new_key_path
MANIFEST="rotation-manifest.txt"
KEYS_DIR="$HOME/.ssh"

while IFS=$'\t' read -r server old_fp new_key; do
    [ -z "$server" ] && continue
    echo "Rotating key on $server..."

    # Remover llave vieja por fingerprint
    ssh "$server" "ssh-keygen -R -f ~/.ssh/authorized_keys -F '$old_fp'" 2>/dev/null

    # Agregar llave nueva
    NEW_PUB=$(cat "${KEYS_DIR}/${new_key}.pub")
    ssh "$server" "echo '$NEW_PUB' >> ~/.ssh/authorized_keys"

    echo "  Done: $server"
done < "$MANIFEST"

echo "Rotation complete for $(wc -l < "$MANIFEST") servers"
```

## Mejores Prácticas Adicionales

1. **Usa `IdentitiesOnly yes` en la config SSH.** Sin esto, SSH prueba todas las llaves en `~/.ssh/` para cada conexión. Esto puede disparar el máximo de intentos de auth en servidores con muchas llaves:

```ssh-config
Host *
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

2. **Setea `MaxAuthTries` en servidores.** Limita el número de intentos fallidos de autenticación para reducir la exposición a brute-force:

```bash
# En /etc/ssh/sshd_config
MaxAuthTries 3
LoginGraceTime 30
PermitRootLogin no
AllowUsers deploy admin
```

## Errores Comunes Adicionales

1. **Usar `ForwardAgent yes` globalmente.** Agent forwarding permite que un servidor comprometido use tu SSH agent. Solo habilítalo por-host para servidores confiables:

```ssh-config
# Mal: agent forwarding global
Host *
    ForwardAgent yes

# Bien: por-host solo para bastion confiable
Host bastion.example.com
    ForwardAgent yes
```

2. **No setear permisos de archivo en llaves SSH.** SSH se rehúsa a usar llaves con permisos demasiado abiertos, pero los fallos silenciosos pueden confundir. Siempre verifica:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/config
```

## Preguntas Frecuentes Adicionales

### ¿Cómo uso llaves SSH con GitHub/GitLab?

Agrega tu llave pública a los settings de SSH keys de la plataforma. Usa `~/.ssh/config` para especificar qué llave usar:

```ssh-config
Host github.com
    IdentityFile ~/.ssh/id_ed25519_github
    User git
```

Testea con `ssh -T git@github.com`.

### ¿Qué es la rotación de llaves SSH y con qué frecuencia debería hacerla?

La rotación de llaves significa reemplazar las llaves SSH existentes por nuevas y remover las llaves viejas de todos los servidores. Rota llaves cuando:
- Un miembro del equipo se va
- Una llave puede haber sido expuesta (robo de laptop, compromiso de backup)
- Anualmente como medida de seguridad rutinaria
- Después de cualquier incidente de seguridad que involucre acceso a servidores
