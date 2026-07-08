---
contentType: recipes
slug: bash-iptables-firewall-rules
title: "Configurar Reglas de Firewall con iptables"
description: "Configura reglas de firewall básicas usando iptables en Bash para filtrar tráfico, bloquear puertos y proteger servidores Linux."
metaDescription: "Configura reglas de firewall en Linux con iptables usando Bash. Filtra tráfico, permite puertos confiables, bloquea IPs no deseadas y protege servidores de amenazas."
difficulty: advanced
topics:
  - file-handling
tags:
  - bash
  - iptables
  - firewall
  - security
  - linux
relatedResources:
  - /recipes/bash-backup-rotation-script
  - /recipes/bash-monitoring-disk-usage
  - /recipes/bash-ssh-key-management
  - /recipes/bash-scripting-automation
  - /recipes/bash-log-rotation-compression
lastUpdated: "2026-06-28"
author: "StackPractices"
seo:
  metaDescription: "Configura reglas de firewall en Linux con iptables usando Bash. Filtra tráfico, permite puertos confiables, bloquea IPs no deseadas y protege servidores de amenazas."
  keywords:
    - bash
    - iptables
    - firewall
    - seguridad
    - linux
---
## Visión General

iptables es el framework clásico de firewall de Linux. Te permite definir reglas que filtran paquetes entrantes, salientes y reenviados basándose en direcciones IP, puertos, protocolos y estado de conexión. Un script de Bash bien estructurado hace las reglas de iptables legibles, repetibles y fáciles de restablecer, lo cual es esencial cuando endureces un servidor o resuelves problemas de conectividad.

## Cuándo Usar

Usa este recurso cuando:
- Necesites filtrar tráfico en un servidor Linux sin un security group cloud.
- Quieras permitir solo puertos específicos (SSH, HTTP, HTTPS) y descartar el resto.
- Estés construyendo un bastion host o una imagen mínima de servidor.
- Necesites bloquear una dirección IP o rango temporalmente.

## Solución

### Script básico de firewall con iptables

```bash
#!/usr/bin/env bash
set -euo pipefail

# Restablecer reglas
iptables -F
iptables -X
iptables -Z

# Políticas por defecto
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Permitir loopback
iptables -A INPUT -i lo -j ACCEPT

# Permitir conexiones establecidas y relacionadas
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Permitir SSH (rate-limited)
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Permitir HTTP y HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Guardar reglas
iptables-save > /etc/iptables/rules.v4

echo "Reglas de firewall aplicadas"
```

## Explicación

El script comienza eliminando reglas existentes y reiniciando contadores. Establece una política de denegación por defecto para tráfico entrante y reenviado, permitiendo el tráfico saliente. El tráfico de loopback siempre se acepta porque los servicios locales dependen de él. El módulo de connection tracking permite respuestas a solicitudes salientes. SSH se acepta con rate limiting para ralentizar intentos de fuerza bruta. HTTP y HTTPS están abiertos para servicios web. Finalmente, las reglas se guardan para que persistan tras el reinicio.

## Variantes

| Tipo de regla | Ejemplo | Propósito |
|---------------|---------|-----------|
| Permitir puerto | `--dport 443` | Abrir HTTPS |
| Bloquear IP | `-s 10.0.0.0/8 -j DROP` | Denegar una subnet |
| Rate limit | `-m recent` | Ralentizar fuerza bruta |
| Log y drop | `-j LOG --log-prefix` | Auditar tráfico bloqueado |

## Lo que funciona

1. **Denegación por defecto, permitir explícitamente.** Una política de drop por defecto es más segura que una de allow.
2. **Guarda reglas antes del reinicio.** Usa `iptables-save` y un servicio systemd o el paquete netfilter-persistent.
3. **Usa connection tracking.** Permitir conexiones establecidas y relacionadas evita romper conexiones salientes.
4. **Limita SSH.** La fuerza bruta es común; limita nuevas conexiones por minuto.
5. **Prueba antes de guardar.** Aplica reglas, verifica conectividad, luego guarda. Una mala regla puede dejarte fuera del servidor.

## Errores Comunes

1. **Olvidar permitir conexiones establecidas.** Sin conntrack, las respuestas a solicitudes salientes se bloquean.
2. **Dejarte fuera de SSH.** Siempre permite tu puerto de gestión antes de cambiar la política por defecto.
3. **Eliminar reglas sin un plan de recuperación.** Si pierdes acceso, puedes necesitar acceso a consola para recuperarte.
4. **Ignorar IPv6.** `ip6tables` necesita su propio conjunto de reglas; muchos servidores son dual-stack.
5. **Depender solo de iptables.** Usa security groups cloud y network ACLs como capas adicionales.

## Preguntas Frecuentes

**P: ¿Cuál es la diferencia entre iptables y nftables?**
R: iptables es el framework legacy. nftables es el reemplazo moderno con sintaxis más simple y mejor rendimiento. Muchas distribuciones ahora usan nftables como backend.

**P: ¿Cómo persisto las reglas de iptables?**
R: Usa `iptables-save > /etc/iptables/rules.v4` y restáuralas en el boot con un servicio systemd o el paquete `iptables-persistent`.

**P: ¿Cómo bloqueo una dirección IP específica?**
R: Agrega `iptables -A INPUT -s 198.51.100.1 -j DROP` para descartar todo el tráfico de esa IP. Coloca la regla antes de las reglas de aceptación final.

### Reglas de firewall IPv6 con ip6tables

```bash
#!/usr/bin/env bash
set -euo pipefail

# Restablecer reglas IPv6
ip6tables -F
ip6tables -X
ip6tables -Z

# Políticas por defecto
ip6tables -P INPUT DROP
ip6tables -P FORWARD DROP
ip6tables -P OUTPUT ACCEPT

# Permitir loopback
ip6tables -A INPUT -i lo -j ACCEPT

# Permitir conexiones establecidas y relacionadas
ip6tables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Permitir ICMPv6 (requerido para que IPv6 funcione — neighbor discovery, MLD, etc.)
ip6tables -A INPUT -p icmpv6 -j ACCEPT

# Permitir SSH (rate-limited)
ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set
ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT

# Permitir HTTP y HTTPS
ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# Guardar reglas IPv6
ip6tables-save > /etc/iptables/rules.v6

echo "Reglas de firewall IPv6 aplicadas"
```

### Mitigación de DDoS con límites de conexión

```bash
#!/usr/bin/env bash
set -euo pipefail

# Limitar conexiones por IP origen para prevenir SYN floods
iptables -A INPUT -p tcp -m connlimit --connlimit-above 50 --connlimit-mask 32 -j DROP

# Limitar nuevas conexiones por segundo (protección contra port scans y floods)
iptables -A INPUT -p tcp -m conntrack --ctstate NEW -m limit --limit 20/s --limit-burst 40 -j ACCEPT
iptables -A INPUT -p tcp -m conntrack --ctstate NEW -j DROP

# Descartar paquetes inválidos (spoofed, malformados)
iptables -A INPUT -m conntrack --ctstate INVALID -j DROP

# Protección SYN flood con SYNPROXY (kernel 3.12+)
iptables -t raw -A PREROUTING -p tcp -m tcp --syn -j CT --notrack
iptables -A INPUT -p tcp -m tcp --syn -m conntrack --ctstate UNTRACKED,INVALID -j SYNPROXY --sack-perm --timestamp --wscale 7 --mss 1460
iptables -A INPUT -p tcp -m tcp --syn -m conntrack --ctstate UNTRACKED,INVALID -j DROP

# Limitar ICMP (protección contra ping flood)
iptables -A INPUT -p icmp -m limit --limit 1/s --limit-burst 3 -j ACCEPT
iptables -A INPUT -p icmp -j DROP

echo "Reglas de mitigación de DDoS aplicadas"
```

### Logging de paquetes descartados para auditoría

```bash
#!/usr/bin/env bash
set -euo pipefail

# Log de paquetes descartados con prefijo (rate-limited para evitar flooding de logs)
iptables -A INPUT -m limit --limit 5/min --limit-burst 10 -j LOG \
    --log-prefix "iptables-DROP: " \
    --log-level 4 \
    --log-ip-options \
    --log-tcp-options \
    --log-uid

# Descartar todo lo demás
iptables -A INPUT -j DROP

# Ver paquetes descartados en el log del sistema
# journalctl -k | grep "iptables-DROP"
# o: dmesg | grep "iptables-DROP"

# Log a un archivo personalizado vía rsyslog
cat > /etc/rsyslog.d/10-iptables.conf << 'EOF'
:msg, contains, "iptables-DROP" /var/log/iptables.log
& stop
EOF
systemctl restart rsyslog
```

### Integración de fail2ban con iptables

```bash
#!/usr/bin/env bash
set -euo pipefail

# Instalar fail2ban
# apt install fail2ban  O  yum install fail2ban

# Crear configuración local
cat > /etc/fail2ban/jail.local << 'EOF'
[DEFAULT]
bantime = 3600
findtime = 600
maxretry = 3
banaction = iptables-multiport

[sshd]
enabled = true
port = ssh
logpath = %(sshd_log)s
backend = systemd

[nginx-http-auth]
enabled = true
port = http,https
logpath = /var/log/nginx/error.log

[recidive]
enabled = true
logpath = /var/log/fail2ban.log
bantime = 86400
findtime = 86400
maxretry = 5
EOF

# Iniciar y habilitar fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Verificar IPs baneadas
fail2ban-client status sshd

# Banear/desbanear una IP manualmente
fail2ban-client set sshd banip 198.51.100.1
fail2ban-client set sshd unbanip 198.51.100.1

# fail2ban crea reglas de iptables automáticamente:
# Chain f2b-sshd (referencias en la cadena INPUT)
# iptables -L f2b-sshd -n --line-numbers
```

### Migración a nftables (reemplazo moderno)

```bash
#!/usr/bin/env bash
set -euo pipefail

# nftables es el reemplazo moderno de iptables (kernel 3.13+)
# Muchas distribuciones (Debian 10+, Ubuntu 20.04+, RHEL 8+) usan backend nftables

# Convertir reglas existentes de iptables a nftables
iptables-restore-translate -f /etc/iptables/rules.v4 > /etc/nftables.conf

# O escribir reglas nftables directamente
cat > /etc/nftables.conf << 'EOF'
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        # Permitir loopback
        iif "lo" accept

        # Permitir establecidas y relacionadas
        ct state established,related accept

        # Descartar inválidas
        ct state invalid drop

        # Permitir ICMP (rate-limited)
        icmp type echo-request limit rate 1/second accept
        icmpv6 type echo-request limit rate 1/second accept

        # Permitir SSH con rate limiting
        tcp dport 22 ct state new limit rate 4/minute accept

        # Permitir HTTP y HTTPS
        tcp dport { 80, 443 } accept

        # Log y descartar todo lo demás
        limit rate 5/minute log prefix "nft-DROP: " level warn
        drop
    }

    chain forward {
        type filter hook forward priority 0; policy drop;
    }

    chain output {
        type filter hook output priority 0; policy accept;
    }
}
EOF

# Aplicar reglas nftables
nft -f /etc/nftables.conf

# Habilitar nftables en el boot
systemctl enable nftables
systemctl start nftables

# Listar reglas
nft list ruleset
```

### Port knocking para servicios ocultos

```bash
#!/usr/bin/env bash
set -euo pipefail

# Port knocking: SSH solo se abre después de una secuencia específica de "golpes" de puertos
# Requiere knockd: apt install knockd

cat > /etc/knockd.conf << 'EOF'
[openSSH]
    sequence    = 7000,8000,9000
    seq_timeout = 15
    tcpflags    = syn
    command     = iptables -A INPUT -s %IP% -p tcp --dport 22 -j ACCEPT
    stop_timeout = 30

[closeSSH]
    sequence    = 9000,8000,7000
    seq_timeout = 15
    tcpflags    = syn
    command     = iptables -D INPUT -s %IP% -p tcp --dport 22 -j ACCEPT
EOF

# Iniciar knockd
systemctl enable knockd
systemctl start knockd

# Cliente: golpear antes de conectar
# knock -v server-ip 7000 8000 9000
# ssh user@server-ip
# knock -v server-ip 9000 8000 7000  # Cerrar después
```

## Mejores Prácticas Adicionales

1. **Usa chains personalizadas para organización.** Agrupa reglas relacionadas en chains personalizadas para mantener la chain INPUT principal legible y mantenible:

```bash
# Crear chains personalizadas
iptables -N SSH_PROTECT
iptables -N WEB_TRAFFIC
iptables -N BLOCKED_IPS

# Saltar a chains personalizadas desde INPUT
iptables -A INPUT -p tcp --dport 22 -j SSH_PROTECT
iptables -A INPUT -p tcp -m multiport --dports 80,443 -j WEB_TRAFFIC
iptables -A INPUT -j BLOCKED_IPS

# Agregar reglas a chains personalizadas
iptables -A SSH_PROTECT -m recent --set
iptables -A SSH_PROTECT -m recent --update --seconds 60 --hitcount 4 -j DROP
iptables -A SSH_PROTECT -j ACCEPT

iptables -A BLOCKED_IPS -s 198.51.100.0/24 -j DROP
iptables -A BLOCKED_IPS -j RETURN  # Retornar a chain INPUT si no hay match
```

2. **Testea reglas con timeout para evitar lockout.** Aplica reglas temporalmente y auto-revierte después de un tiempo establecido. Esto es crítico cuando trabajas en servidores remotos:

```bash
# Aplicar reglas, auto-revertir después de 5 minutos
iptables-restore < /etc/iptables/rules.v4
echo "Reglas aplicadas. Revirtiendo en 5 minutos..."
sleep 300
iptables -F
iptables -P INPUT ACCEPT
iptables -P OUTPUT ACCEPT
echo "Reglas revertidas a allow por defecto"
```

3. **Usa `iptables-restore` para carga atómica de reglas.** Cargar reglas desde un archivo con `iptables-restore` es atómico — o todas las reglas se aplican o ninguna. Esto previene conjuntos de reglas parciales que dejan el firewall en estado inconsistente:

```bash
# Guardar reglas actuales
iptables-save > /etc/iptables/rules.v4

# Aplicar desde archivo (atómico)
iptables-restore < /etc/iptables/rules.v4

# Testear sintaxis sin aplicar
iptables-restore --test < /etc/iptables/rules.v4
```

## Errores Comunes Adicionales

1. **No ordenar reglas correctamente.** iptables procesa reglas de arriba a abajo. Una regla ACCEPT amplia antes de una regla DROP específica hace que el DROP sea inalcanzable. Siempre coloca reglas específicas (DROP por IP) antes de reglas generales (ACCEPT por puerto):

```bash
# Incorrecto: el DROP nunca se alcanza
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -s 198.51.100.1 -j DROP

# Correcto: DROP específico primero
iptables -A INPUT -s 198.51.100.1 -j DROP
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
```

2. **Usar `-A` (append) cuando necesitas `-I` (insert).** `-A` añade al final de la chain. `-I` inserta en una posición específica. Al banear una IP, la necesitas antes de las reglas ACCEPT:

```bash
# Insertar en posición 1 (inicio de la chain)
iptables -I INPUT 1 -s 198.51.100.1 -j DROP

# Insertar en posición 3
iptables -I INPUT 3 -s 10.0.0.5 -j DROP
```

3. **Olvidar limpiar chains personalizadas.** `iptables -F` solo limpia las chains integradas. Las chains personalizadas persisten a menos que se limpien o eliminen explícitamente:

```bash
# Reset completo: limpiar todas las chains, eliminar chains personalizadas, resetear contadores
iptables -F
iptables -t nat -F
iptables -t mangle -F
iptables -X  # Eliminar todas las chains personalizadas
iptables -Z  # Resetear todos los contadores
```

## FAQ Adicional

### ¿Cómo hago whitelist de una IP dinámica (DDNS) en iptables?

Usa un cron job o systemd timer para resolver el hostname DDNS y actualizar la regla de iptables:

```bash
#!/usr/bin/env bash
set -euo pipefail

DDNS_HOST="admin.example.com"
CHAIN="INPUT"

# Resolver IP actual
CURRENT_IP=$(dig +short "$DDNS_HOST" | head -1)

# Obtener IP almacenada previamente
IP_FILE="/var/lib/ddns-firewall/ip.txt"
OLD_IP=$(cat "$IP_FILE" 2>/dev/null || echo "")

if [ "$CURRENT_IP" != "$OLD_IP" ]; then
    # Eliminar regla antigua si existe
    [ -n "$OLD_IP" ] && iptables -D "$CHAIN" -s "$OLD_IP" -j ACCEPT 2>/dev/null || true
    # Agregar nueva regla
    iptables -I "$CHAIN" 1 -s "$CURRENT_IP" -j ACCEPT
    # Almacenar nueva IP
    mkdir -p "$(dirname "$IP_FILE")"
    echo "$CURRENT_IP" > "$IP_FILE"
    echo "Firewall actualizado: $OLD_IP -> $CURRENT_IP"
fi
```

### ¿Esta solución está lista para producción?

Sí. iptables es el framework de firewall por defecto en Linux y se usa en producción por todos los proveedores cloud principales. Los patrones de rate limiting, connection tracking y SYNPROXY mostrados aquí son técnicas de hardening estándar recomendadas por CIS Benchmarks y NIST. fail2ban se usa en millones de servidores en todo el mundo para protección contra fuerza bruta SSH. nftables es el backend por defecto en Debian 10+, Ubuntu 20.04+ y RHEL 8+. Port knocking se usa en entornos de alta seguridad para ocultar interfaces de gestión. Todos los ejemplos de código usan herramientas de networking estándar de Linux disponibles desde kernel 3.12+.

### ¿Cuáles son las características de rendimiento?

iptables procesa reglas a velocidad de kernel con overhead despreciable para conjuntos de reglas bajo 100 reglas. Cada regla añade 0.001-0.01ms de latencia por paquete. Connection tracking (conntrack) usa ~1KB de memoria por conexión rastreada — 100K conexiones usan ~100MB. El módulo `recent` usa ~50 bytes por IP origen. SYNPROXY añade 0.05ms por paquete SYN pero previene agotamiento por SYN flood. Para tráfico de 10Gbps, considera nftables que usa 20-30% menos CPU que iptables debido a estructuras de datos mejoradas. fail2ban añade 1-5ms por línea de log escaneada. Port knocking añade cero overhead cuando knockd no está procesando una secuencia de golpes.

### ¿Cómo depuro problemas con este enfoque?

Verifica las reglas actuales con `iptables -L -n -v --line-numbers` para ver contadores de paquetes y bytes por regla. Usa `iptables -L INPUT -n -v` para verificar qué reglas están matcheando tráfico. Testea conectividad con `tcpdump -i eth0 port 22` para ver si los paquetes llegan a la interfaz. Verifica la tabla conntrack con `cat /proc/net/nf_conntrack | wc -l` y `sysctl net.netfilter.nf_conntrack_max`. Verifica logging con `dmesg | grep iptables-DROP`. Para nftables, usa `nft list ruleset` y `nft monitor trace`. Para fail2ban, verifica `fail2ban-client status` y `fail2ban-regex /var/log/auth.log /etc/fail2ban/filter.d/sshd.conf`. Testea port knocking con `knock -v server 7000 8000 9000` y verifica `journalctl -u knockd`.
