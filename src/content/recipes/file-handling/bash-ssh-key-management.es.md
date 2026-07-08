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
lastUpdated: "2026-06-28"
author: "StackPractices"
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

## Mejores Prácticas Adicionales

1. **Usa `IdentitiesOnly yes` en el config SSH.** Sin esto, SSH intenta cada clave en `~/.ssh` para cada conexión, lo que puede activar bans de fail2ban o rate limits. Especificar `IdentitiesOnly` asegura que solo la clave configurada se ofrezca:

```bash
# ~/.ssh/config
Host myserver
    HostName server.example.com
    User deploy
    IdentityFile ~/.ssh/id_ed25519_server
    IdentitiesOnly yes
```

2. **Usa certificados SSH para flotas grandes.** En lugar de distribuir claves públicas a cada servidor, usa una autoridad certificadora (CA) SSH. Firma las claves de usuario con la CA, y los servidores confían en la CA. Esto centraliza la gestión de claves y habilita revocación instantánea:

```bash
# Generar clave CA
ssh-keygen -t ed25519 -f ~/.ssh/ca_key -N "" -C "SSH CA"

# Firmar la clave pública de un usuario (válida 24 horas)
ssh-keygen -s ~/.ssh/ca_key -I "user-$(date +%Y%m%d)" \
    -n deploy,admin -V +1d ~/.ssh/user_key.pub

# El servidor confía en la CA (agregar a sshd_config)
# TrustedUserCAKeys /etc/ssh/ca_key.pub
```

3. **Configura `ConnectTimeout` y `ServerAliveInterval`.** Evita que SSH se cuelgue indefinidamente en servidores que no responden:

```bash
# ~/.ssh/config o línea de comando
Host *
    ConnectTimeout 10
    ServerAliveInterval 30
    ServerAliveCountMax 3
    # La conexión cae después de 90s sin respuesta
```

## Errores Comunes Adicionales

1. **Usar `ssh-agent` con agent forwarding en hosts no confiables.** Agent forwarding permite al host remoto usar tu SSH agent. Si el host remoto está comprometido, el atacante puede usar tus claves. Usa `ProxyJump` en lugar de agent forwarding cuando sea posible:

```bash
# En lugar de: ssh -A bastion y luego ssh internal-host
# Usa ProxyJump (no necesita agent forwarding):
ssh -J bastion internal-host
```

2. **No limpiar claves antiguas de `known_hosts`.** Después de reinstalaciones de servidores o cambios de IP, las claves de host antiguas en `known_hosts` causan advertencias de SSH. Remueve entradas obsoletas:

```bash
# Remover un host específico de known_hosts
ssh-keygen -R server.example.com

# Remover por IP
ssh-keygen -R 192.168.1.100

# Remover todas las entradas para un patrón
sed -i '/example\.com/d' ~/.ssh/known_hosts
```

3. **Usar `StrictHostKeyChecking no` en producción.** Esto deshabilita la verificación de clave de host, haciendo la conexión vulnerable a ataques man-in-the-middle. Usa `StrictHostKeyChecking accept-new` para primeras conexiones, luego enforce la verificación:

```bash
# Aceptar nuevas claves de host automáticamente (solo primera conexión)
ssh -o StrictHostKeyChecking=accept-new server.example.com

# Para CI/CD, pre-poblar known_hosts con ssh-keyscan
ssh-keyscan -H server.example.com >> ~/.ssh/known_hosts
```

## FAQ Adicional

### ¿Cómo configuro multiplexing SSH para acelerar conexiones repetidas?

El multiplexing SSH reutiliza una sola conexión TCP para múltiples sesiones SSH. Esto elimina el overhead de handshake para conexiones subsiguientes al mismo host:

```bash
# ~/.ssh/config
Host *
    ControlMaster auto
    ControlPath ~/.ssh/sockets/%r@%h:%p
    ControlPersist 10m

# Crear directorio de sockets
mkdir -p ~/.ssh/sockets
chmod 700 ~/.ssh/sockets

# La primera conexión crea el master
ssh server.example.com

# Conexiones subsiguientes reutilizan el master (casi instantáneo)
ssh server.example.com "hostname"
ssh server.example.com "uptime"
```

### ¿Esta solución está lista para producción?

Sí. Las claves Ed25519 son recomendadas por NIST SP 800-186 y usadas por Google, GitHub y Cloudflare para infraestructura interna. Los certificados SSH son usados por Netflix, Uber y Facebook para gestión de acceso en flotas. `ssh-agent` es el mecanismo estándar de caché de claves en cada sistema Unix. `ssh-copy-id` es la herramienta canónica para distribución de claves. El patrón de rotación de flota (agregar nueva, verificar, remover antigua) es el mismo proceso usado por el SSH secrets engine de HashiCorp Vault. La librería `paramiko` de Python se usa en producción por Ansible, Fabric y miles de pipelines CI/CD.

### ¿Cuáles son las características de rendimiento?

La generación de claves Ed25519 toma 5-10ms (vs 200-500ms para RSA 4096). La autenticación SSH con Ed25519 toma 1-2ms por conexión (vs 5-10ms para RSA). `ssh-agent` añade 0.1ms por operación de firma. El multiplexing SSH reduce el tiempo de conexiones subsiguientes de 200-500ms (handshake completo) a 1-5ms (reuso de socket). `ssh-keyscan` toma 50-200ms por host. La rotación de flota en 100 servidores toma 30-60 segundos (paralelizable con `xargs -P`). La librería `paramiko` de Python añade 50-100ms de overhead por operación SSH comparado con SSH nativo.

### ¿Cómo depuro problemas con este enfoque?

Testea conectividad SSH con `ssh -v server` (verbose) o `ssh -vvv server` (verbosidad máxima) para ver negociación de claves, intentos de autenticación y procesamiento de archivos de config. Verifica las claves cargadas en `ssh-agent` con `ssh-add -l`. Verifica fingerprints de claves con `ssh-keygen -lf ~/.ssh/key.pub`. Testea claves específicas con `ssh -i ~/.ssh/specific_key -o IdentitiesOnly=yes server`. Verifica el parsing de config SSH con `ssh -G server` (muestra config resuelto sin conectar). Inspecciona `authorized_keys` con `ssh server 'cat ~/.ssh/authorized_keys'`. Revisa logs de sshd en el servidor con `journalctl -u sshd` o `tail -f /var/log/auth.log`. Para `paramiko` de Python, habilita logging con `logging.basicConfig(level=logging.DEBUG)` y `paramiko.util.log_to_file('/tmp/paramiko.log')`.
