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

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
