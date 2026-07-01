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
