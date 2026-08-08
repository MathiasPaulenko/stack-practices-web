---



contentType: recipes
slug: bash-ssh-key-management
title: "Gestión de Claves SSH"
description: "Genera, rota y distribuye claves SSH de forma segura con scripts de Bash para equipos y acceso a servidores."
metaDescription: "Gestiona claves SSH con Bash: genera pares Ed25519, rota credenciales bajo programación y distribuye claves públicas de forma segura a servidores y miembros del equipo."
difficulty: intermediate
topics:
  - file-handling
tags:
  - bash
  - ssh
  - security
  - keys
  - automation
relatedResources:
  - /recipes/bash-scripting-automation
  - /recipes/bash-backup-rotation-script
  - /recipes/bash-log-rotation-compression
  - /recipes/bash-loop-over-files
  - /recipes/bash-parallel-execution
  - /recipes/python-zip-file-extraction
  - /recipes/bash-aws-cli-automation
  - /recipes/bash-iptables-firewall-rules
lastUpdated: "2026-06-28"
publishedAt: "2026-06-28"
author: Mathias Paulenko
seo:
  metaDescription: "Gestiona claves SSH con Bash: genera pares Ed25519, rota credenciales bajo programación y distribuye claves públicas de forma segura a servidores y miembros del equipo."
  keywords:
    - bash
    - ssh
    - seguridad
    - claves
    - automatización



---
## Visión General

Las claves SSH son la forma estándar de autenticarse en servidores Linux, repositorios Git e instancias cloud. Gestionarlas bien significa generar claves robustas, rotarlas antes de que envejezcan y distribuir claves públicas a servidores autorizados sin exponer claves privadas. Un script de Bash puede automatizar este ciclo de vida, reduciendo el riesgo de claves obsoletas y errores de copiar y pegar manual.

## Cuándo Usar

Usa este recurso cuando:
- Gestiones muchos servidores o cuentas de usuario y necesites despliegue consistente de claves SSH.
- Rotes claves periódicamente por cumplimiento o después de que un miembro del equipo se vaya.
- Quieras deshabilitar la autenticación por contraseña y confiar en acceso basado en claves.
- Necesites recopilar y auditar claves públicas en toda la flota.

## Solución

### Script de gestión de claves SSH

```bash
#!/usr/bin/env bash
set -euo pipefail

USER="${1:-$USER}"
KEY_DIR="$HOME/.ssh"

# Generar una nueva clave Ed25519 si no existe
if [[ ! -f "$KEY_DIR/id_ed25519" ]]; then
    mkdir -p "$KEY_DIR"
    chmod 700 "$KEY_DIR"
    ssh-keygen -t ed25519 -a 100 -f "$KEY_DIR/id_ed25519" -N "" -C "$USER@$(hostname)-$(date +%Y-%m-%d)"
fi

# Mostrar clave pública
cat "$KEY_DIR/id_ed25519.pub"

# Rotar una clave antigua renombrándola y generando una nueva
rotate_key() {
    local key_file="$1"
    if [[ -f "$key_file" ]]; then
        local backup="${key_file}.old.$(date +%Y%m%d)"
        mv "$key_file" "$backup"
        mv "${key_file}.pub" "${backup}.pub"
    fi
    ssh-keygen -t ed25519 -a 100 -f "$key_file" -N "" -C "rotated-$(date +%Y-%m-%d)"
}

rotate_key "$KEY_DIR/id_ed25519"

# Distribuir clave pública a un servidor
distribute_key() {
    local server="$1"
    ssh-copy-id -i "$KEY_DIR/id_ed25519.pub" "$server"
}

# distribute_key user@server.example.com
```

## Explicación

El script primero asegura que el directorio `~/.ssh` exista con los permisos correctos. Luego genera una clave Ed25519, que es más corta y segura que RSA para longitudes de clave equivalentes. La función `rotate_key` renombra el par de claves existente con un sufijo de fecha y crea uno nuevo. La función `distribute_key` usa `ssh-copy-id` para agregar la clave pública al archivo `~/.ssh/authorized_keys` del servidor remoto. Esto es más seguro que editar archivos manualmente porque preserva permisos correctos y evita errores de pegado.

## Variantes

| Operación | Comando | Notas |
|-----------|---------|-------|
| Generar | `ssh-keygen -t ed25519` | Default moderno, seguridad de 256 bits |
| Rotar | renombrar + regenerar | Conserva la clave vieja hasta confirmar que la nueva funciona |
| Distribuir | `ssh-copy-id` | Agrega a authorized_keys de forma segura |
| Auditar | `ssh-keygen -lf key.pub` | Muestra fingerprint y comentario |

## Lo que funciona

1. **Prefiere Ed25519 sobre RSA.** Ed25519 es más rápido, más corto y evita debilidades de parámetros de RSA.
2. **Protege claves privadas con passphrase para uso interactivo.** Usa `ssh-agent` para evitar escribirla repetidamente.
3. **Rota claves bajo programación o eventos.** Activa la rotación cuando un empleado se va o una clave se sospecha comprometida.
4. **Mantén authorized_keys bajo control de versiones.** Rastrea cambios de claves de servidor con una herramienta de gestión de configuración.
5. **Deshabilita autenticación por contraseña.** Una vez desplegadas las claves, configura `PasswordAuthentication no` en sshd_config.

## Errores Comunes

1. **Compartir claves privadas entre usuarios.** Cada persona y cada proceso automatizado debe tener su propio par de claves.
2. **Almacenar claves sin passphrase en laptops.** Un laptop robado da acceso inmediato a cada servidor.
3. **Ignorar permisos de archivo.** `~/.ssh` debe ser 700 y las claves privadas 600; permisos demasiado abiertos hacen que SSH rechace la clave.
4. **Dejar claves antiguas en servidores después de rotar.** Una rotación no está completa hasta que la clave pública antigua se elimina de authorized_keys.
5. **Usar claves RSA cortas.** Las claves RSA por debajo de 4096 bits ya no se recomiendan para producción.

## Preguntas Frecuentes

**P: ¿Cómo agrego una passphrase a una clave existente?**
R: Usa `ssh-keygen -p -f ~/.ssh/id_ed25519`. También puedes usar ssh-agent para cachear la passphrase durante la sesión.

**P: ¿Puedo usar la misma clave para múltiples servidores?**
R: Sí, pero es más seguro usar claves diferentes para distintas zonas de seguridad o proyectos. Esto limita el alcance si una clave se compromete.

**P: ¿Cómo revoco una clave comprometida?**
R: Elimina la clave pública correspondiente de cada archivo `~/.ssh/authorized_keys` y rota la clave. Audita tu herramienta de gestión de infraestructura para asegurar que la clave no se reagregue.

### Gestión de config SSH para múltiples perfiles

```bash
#!/usr/bin/env bash
set -euo pipefail

SSH_CONFIG="$HOME/.ssh/config"

# Generar config SSH con alias de host para diferentes entornos
generate_ssh_config() {
    cat > "$SSH_CONFIG" << 'EOF'
# Servidores de producción
Host prod-*
    HostName %h.example.com
    User deploy
    IdentityFile ~/.ssh/id_ed25519_prod
    IdentitiesOnly yes
    ForwardAgent no

# Servidores de staging
Host staging-*
    HostName %h.staging.example.com
    User deploy
    IdentityFile ~/.ssh/id_ed25519_staging
    IdentitiesOnly yes

# Bastion host (jump server)
Host bastion
    HostName bastion.example.com
    User admin
    IdentityFile ~/.ssh/id_ed25519_admin
    IdentitiesOnly yes

# Saltar a través de bastion a hosts internos
Host internal-*
    ProxyJump bastion
    User deploy
    IdentityFile ~/.ssh/id_ed25519_prod

# Git hosting
Host github.com
    User git
    IdentityFile ~/.ssh/id_ed25519_github
    IdentitiesOnly yes

Host gitlab.com
    User git
    IdentityFile ~/.ssh/id_ed25519_gitlab
    IdentitiesOnly yes
EOF
    chmod 600 "$SSH_CONFIG"
    echo "Config SSH generado en $SSH_CONFIG"
}

generate_ssh_config

# Testear conexión a un host
# ssh -o BatchMode=yes -o ConnectTimeout=5 prod-web-01 "echo 'Conexión OK'"
```

### Auditoría de authorized_keys en toda la flota

```bash
#!/usr/bin/env bash
set -euo pipefail

# Auditar archivos authorized_keys en múltiples servidores
# Uso: ./audit-keys.sh server1 server2 server3

SERVERS=("$@")
REPORT_FILE="ssh-key-audit-$(date +%Y%m%d).csv"

echo "server,user,key_type,fingerprint,comment" > "$REPORT_FILE"

for server in "${SERVERS[@]}"; do
    echo "Auditando $server..."

    # Obtener todos los archivos authorized_keys y sus contenidos
    ssh -o BatchMode=yes -o ConnectTimeout=10 "$server" \
        'for user_dir in /home/* /root; do
             user=$(basename "$user_dir")
             auth_keys="$user_dir/.ssh/authorized_keys"
             [ -f "$auth_keys" ] || continue
             while IFS= read -r line; do
                 [ -z "$line" ] || [[ "$line" == \#* ]] && continue
                 key_type=$(echo "$line" | awk "{print \$1}")
                 fingerprint=$(echo "$line" | ssh-keygen -lf - 2>/dev/null | awk "{print \$1, \$2}")
                 comment=$(echo "$line" | awk "{print \$3}")
                 echo "'"$server"',$user,$key_type,$fingerprint,$comment"
             done < "$auth_keys"
         done' >> "$REPORT_FILE" 2>/dev/null || echo "WARN: No se pudo auditar $server"
done

echo "=== Reporte de Auditoría ==="
column -t -s',' "$REPORT_FILE" | less

# Marcar claves débiles (RSA < 4096, DSA, ECDSA)
echo ""
echo "=== Alertas de Claves Débiles ==="
awk -F',' 'NR>1 && ($3=="ssh-dss" || $3=="ssh-rsa" && $4+0 < 4096) {print "DÉBIL: "$1" "$2" "$3" "$4}' "$REPORT_FILE"
```

### Rotación de claves en flota con bucle estilo Ansible

```bash
#!/usr/bin/env bash
set -euo pipefail

# Rotar claves SSH en una flota de servidores
# La clave antigua se usa para autenticar durante la rotación; la nueva se agrega antes de remover la antigua

OLD_KEY="$HOME/.ssh/id_ed25519"
NEW_KEY="$HOME/.ssh/id_ed25519_new"
SERVERS_FILE="${1:-servers.txt}"

# Paso 1: Generar nueva clave
ssh-keygen -t ed25519 -a 100 -f "$NEW_KEY" -N "" -C "rotated-$(date +%Y-%m-%d)"

# Paso 2: Distribuir nueva clave a todos los servidores usando la clave antigua
while IFS= read -r server; do
    [[ -z "$server" || "$server" == \#* ]] && continue
    echo "Agregando nueva clave a $server..."
    ssh -i "$OLD_KEY" -o BatchMode=yes -o ConnectTimeout=10 "$server" \
        "mkdir -p ~/.ssh && chmod 700 ~/.ssh && cat >> ~/.ssh/authorized_keys" \
        < "${NEW_KEY}.pub" \
        && echo "  OK: nueva clave agregada" \
        || echo "  FAIL: no se pudo agregar la nueva clave"
done < "$SERVERS_FILE"

# Paso 3: Verificar que la nueva clave funciona en todos los servidores
echo ""
echo "=== Verificando nueva clave ==="
ALL_OK=true
while IFS= read -r server; do
    [[ -z "$server" || "$server" == \#* ]] && continue
    if ssh -i "$NEW_KEY" -o BatchMode=yes -o ConnectTimeout=10 "$server" "true" 2>/dev/null; then
        echo "  OK: $server acepta la nueva clave"
    else
        echo "  FAIL: $server rechaza la nueva clave"
        ALL_OK=false
    fi
done < "$SERVERS_FILE"

# Paso 4: Solo si todos los servidores aceptan la nueva clave, remover la antigua
if $ALL_OK; then
    echo ""
    echo "=== Removiendo clave antigua de los servidores ==="
    while IFS= read -r server; do
        [[ -z "$server" || "$server" == \#* ]] && continue
        OLD_FP=$(ssh-keygen -lf "${OLD_KEY}.pub" | awk '{print $2}')
        ssh -i "$NEW_KEY" -o BatchMode=yes "$server" \
            "sed -i '/${OLD_FP//\//\\/}/d' ~/.ssh/authorized_keys" \
            && echo "  OK: clave antigua removida de $server" \
            || echo "  FAIL: no se pudo remover la clave antigua de $server"
    done < "$SERVERS_FILE"

    # Reemplazar clave antigua con nueva localmente
    mv "$NEW_KEY" "$OLD_KEY"
    mv "${NEW_KEY}.pub" "${OLD_KEY}.pub"
    echo "Rotación completa. Clave antigua reemplazada."
else
    echo "ABORT: No todos los servidores aceptan la nueva clave. La clave antigua permanece."
    rm -f "$NEW_KEY" "${NEW_KEY}.pub"
    exit 1
fi
```

### Automatización de ssh-agent para CI/CD

```bash
#!/usr/bin/env bash
set -euo pipefail

# Iniciar ssh-agent y agregar claves para pipelines CI/CD
# Funciona en GitLab CI, GitHub Actions, Jenkins

# Iniciar agent si no está corriendo
if ! ssh-add -l > /dev/null 2>&1; then
    eval "$(ssh-agent -s)"
fi

# Agregar claves (usar variable de entorno SSH_KEY para clave base64 en CI)
if [[ -n "${SSH_KEY:-}" ]]; then
    # Entorno CI: clave almacenada como secreto base64
    echo "$SSH_KEY" | base64 -d | ssh-add -
else
    # Local: agregar todas las claves en ~/.ssh
    for key in "$HOME"/.ssh/id_ed25519*; do
        [[ -f "$key" && "$key" != *.pub ]] && ssh-add "$key" 2>/dev/null || true
    done
fi

# Listar claves cargadas
echo "=== Claves SSH cargadas ==="
ssh-add -l

# Configurar known_hosts para evitar prompts interactivos
mkdir -p "$HOME/.ssh"
touch "$HOME/.ssh/known_hosts"
chmod 644 "$HOME/.ssh/known_hosts"

# Agregar claves de host de servidores (usar ssh-keyscan para CI)
for host in "${SSH_HOSTS:-github.com gitlab.com}"; do
    ssh-keyscan -H "$host" >> "$HOME/.ssh/known_hosts" 2>/dev/null
done

# Deshabilitar strict host checking para CI (menos seguro pero no interactivo)
export GIT_SSH_COMMAND="ssh -o StrictHostKeyChecking=no -o UserKnownHostsFile=/dev/null"
```

### Gestión de claves SSH en Python con paramiko

```python
import os
import subprocess
from pathlib import Path
from datetime import datetime
from dataclasses import dataclass
from typing import Optional

@dataclass
class SSHKeyInfo:
    key_type: str
    bits: int
    fingerprint: str
    comment: str
    file_path: str

class SSHKeyManager:
    """Gestiona generación, rotación y distribución de claves SSH."""

    def __init__(self, key_dir: str = "~/.ssh"):
        self.key_dir = Path(key_dir).expanduser()
        self.key_dir.mkdir(parents=True, exist_ok=True)
        self.key_dir.chmod(0o700)

    def generate_key(self, name: str, key_type: str = "ed25519",
                     passphrase: str = "", comment: Optional[str] = None) -> Path:
        key_path = self.key_dir / name
        if key_path.exists():
            raise FileExistsError(f"La clave ya existe: {key_path}")

        if comment is None:
            comment = f"{os.getenv('USER', 'user')}@{os.uname().nodename}-{datetime.now().strftime('%Y-%m-%d')}"

        cmd = [
            "ssh-keygen", "-t", key_type,
            "-f", str(key_path),
            "-N", passphrase,
            "-C", comment,
        ]
        if key_type == "ed25519":
            cmd.extend(["-a", "100"])

        subprocess.run(cmd, check=True, capture_output=True)
        key_path.chmod(0o600)
        (key_path.with_suffix(".pub")).chmod(0o644)
        return key_path

    def get_key_info(self, pub_key_path: Path) -> SSHKeyInfo:
        result = subprocess.run(
            ["ssh-keygen", "-lf", str(pub_key_path)],
            capture_output=True, text=True, check=True
        )
        parts = result.stdout.strip().split()
        bits = int(parts[0])
        fingerprint = parts[1]
        key_type = parts[3].strip("()")
        comment = " ".join(parts[4:])
        return SSHKeyInfo(
            key_type=key_type, bits=bits,
            fingerprint=fingerprint, comment=comment,
            file_path=str(pub_key_path)
        )

    def rotate_key(self, name: str) -> tuple[Path, Path]:
        key_path = self.key_dir / name
        if not key_path.exists():
            raise FileNotFoundError(f"Clave no encontrada: {key_path}")

        timestamp = datetime.now().strftime("%Y%m%d")
        backup_path = key_path.with_suffix(f".old.{timestamp}")
        backup_pub = key_path.with_suffix(f".pub.old.{timestamp}")

        key_path.rename(backup_path)
        key_path.with_suffix(".pub").rename(backup_pub)

        new_path = self.generate_key(name)
        return new_path, backup_path

    def list_all_keys(self) -> list[SSHKeyInfo]:
        keys = []
        for pub_file in self.key_dir.glob("*.pub"):
            try:
                info = self.get_key_info(pub_file)
                keys.append(info)
            except subprocess.CalledProcessError:
                continue
        return keys

    def audit_weak_keys(self) -> list[SSHKeyInfo]:
        weak = []
        for key in self.list_all_keys():
            if key.key_type == "ssh-dss":
                weak.append(key)
            elif key.key_type == "ssh-rsa" and key.bits < 4096:
                weak.append(key)
            elif key.key_type == "ecdsa":
                weak.append(key)
        return weak

# Uso
manager = SSHKeyManager()
keys = manager.list_all_keys()
for k in keys:
    print(f"{k.file_path}: {k.key_type} {k.bits} {k.fingerprint} ({k.comment})")

weak = manager.audit_weak_keys()
if weak:
    print(f"\nCLAVES DÉBILES ENCONTRADAS: {len(weak)}")
    for k in weak:
        print(f"  {k.file_path}: {k.key_type} {k.bits}")
```



