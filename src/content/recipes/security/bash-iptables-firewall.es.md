---
contentType: recipes
slug: bash-iptables-firewall
title: "Configurar Reglas de Firewall iptables con Bash"
description: "Configura reglas básicas de firewall con iptables y scripts bash."
metaDescription: "Configura reglas de firewall iptables en bash. Bloquea puertos, permite SSH y HTTP, configura NAT y persiste reglas tras reinicios en Linux."
difficulty: intermediate
topics:
  - security
tags:
  - bash
  - iptables
  - firewall
  - security
  - networking
  - linux
relatedResources:
  - /recipes/bash-iptables-firewall-rules
  - /recipes/bash-ssh-key-manager
  - /docs/network-segmentation-policy-template
  - /docs/ssl-certificate-management-template
  - /docs/third-party-vendor-assessment-template
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Configura reglas de firewall iptables en bash. Bloquea puertos, permite SSH y HTTP, configura NAT y persiste reglas tras reinicios en Linux."
  keywords:
    - bash iptables firewall
    - configurar firewall linux
    - reglas iptables bash
    - NAT iptables
    - persistir iptables
---
## Visión General

iptables es el framework de firewall por defecto en Linux. Filtra tráfico de red a nivel kernel usando cadenas de reglas. Esta recipe cubre configurar un firewall básico: permitir SSH y HTTP, bloquear todo lo demás, configurar NAT y persistir reglas tras reinicios.

## Cuándo Usar

- Estás configurando un servidor Linux nuevo y necesitas protección básica de firewall
- Quieres restringir tráfico entrante a puertos específicos
- Necesitas configurar NAT o port forwarding
- Estás endureciendo un servidor antes de deployar a producción

## Solución

### Configuración básica de firewall

```bash
#!/bin/bash

# Flush existing rules
iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

# Set default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT
iptables -A OUTPUT -o lo -j ACCEPT

# Allow established connections
iptables -A INPUT -m state --state ESTABLISHED,RELATED -j ACCEPT

# Allow SSH (port 22)
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP and HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Allow DNS queries
iptables -A INPUT -p udp --dport 53 -j ACCEPT
iptables -A INPUT -p tcp --dport 53 -j ACCEPT

# Log dropped packets (optional, rate-limited)
iptables -A INPUT -m limit --limit 5/min -j LOG --log-prefix "iptables-dropped: " --log-level 4

echo "Firewall configured. SSH, HTTP, HTTPS, DNS allowed."
```

### Rate limiting de conexiones SSH

```bash
#!/bin/bash

# Allow only 3 SSH connections per minute, drop the rest
iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set --name SSH
iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 --name SSH -j DROP

# Allow established SSH
iptables -A INPUT -p tcp --dport 22 -m state --state ESTABLISHED,RELATED -j ACCEPT

echo "SSH rate limiting configured: max 3 new connections per minute"
```

### Port forwarding con NAT

```bash
#!/bin/bash

# Enable IP forwarding
echo 1 > /proc/sys/net/ipv4/ip_forward

# Forward port 8080 to port 80 on 192.168.1.100
iptables -t nat -A PREROUTING -p tcp --dport 8080 -j DNAT --to-destination 192.168.1.100:80
iptables -t nat -A POSTROUTING -p tcp -d 192.168.1.100 --dport 80 -j MASQUERADE

# Allow forwarding
iptables -A FORWARD -p tcp -d 192.168.1.100 --dport 80 -j ACCEPT

echo "Port forwarding: 8080 -> 192.168.1.100:80"
```

### Bloquear IPs específicas

```bash
#!/bin/bash

BLOCKED_IPS=(
    "203.0.113.50"
    "198.51.100.23"
    "192.0.2.100"
)

for ip in "${BLOCKED_IPS[@]}"; do
    iptables -A INPUT -s "$ip" -j DROP
    echo "Blocked: $ip"
done
```

### Permitir tráfico solo de un subnet específico

```bash
#!/bin/bash

# Only allow SSH from 10.0.0.0/24
iptables -A INPUT -p tcp --dport 22 -s 10.0.0.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -j DROP

echo "SSH restricted to 10.0.0.0/24"
```

### Persistir reglas tras reinicios

```bash
#!/bin/bash

# Save rules
iptables-save > /etc/iptables/rules.v4
ip6tables-save > /etc/iptables/rules.v6

# Install persistence package (Debian/Ubuntu)
apt-get install -y iptables-persistent

# Or restore manually on boot via systemd
cat > /etc/systemd/system/iptables-restore.service << 'EOF'
[Unit]
Description=Restore iptables rules
Before=network-pre.target

[Service]
Type=oneshot
ExecStart=/sbin/iptables-restore /etc/iptables/rules.v4

[Install]
WantedBy=multi-user.target
EOF

systemctl enable iptables-restore.service

echo "Rules persisted to /etc/iptables/rules.v4"
```

### Script de reset de firewall

```bash
#!/bin/bash

iptables -F
iptables -X
iptables -t nat -F
iptables -t nat -X
iptables -t mangle -F
iptables -t mangle -X

iptables -P INPUT ACCEPT
iptables -P FORWARD ACCEPT
iptables -P OUTPUT ACCEPT

echo "All iptables rules cleared. Default: ACCEPT all."
```

### Listar y verificar reglas

```bash
#!/bin/bash

echo "=== Filter table ==="
iptables -L -n -v --line-numbers

echo ""
echo "=== NAT table ==="
iptables -t nat -L -n -v --line-numbers

echo ""
echo "=== Mangle table ==="
iptables -t mangle -L -n -v --line-numbers
```

## Explicación

iptables procesa reglas en orden, de arriba hacia abajo. La primera regla que coincide gana. Las políticas por defecto (`-P`) aplican cuando ninguna regla coincide.

Conceptos clave:

- **Chains**: `INPUT` (entrante), `OUTPUT` (saliente), `FORWARD` (ruteado).
- **Tables**: `filter` (por defecto), `nat` (traducción de direcciones), `mangle` (modificación de paquetes).
- **Targets**: `ACCEPT`, `DROP`, `REJECT`, `LOG`, `MASQUERADE`.
- **State matching**: `ESTABLISHED,RELATED` permite tráfico de retorno para conexiones iniciadas desde el servidor.

El módulo `-m recent` trackea IPs de origen y habilita rate limiting. Guarda intentos de conexión en `/proc/net/xt_recent/`.

## Variantes

| Enfoque | Herramienta | Complejidad | Usar Cuando |
|---------|------------|------------|-------------|
| iptables | iptables | Media | Servidores Linux estándar |
| nftables | nft | Media | Linux moderno (reemplaza iptables) |
| UFW | ufw | Baja | Setup rápido Ubuntu/Debian |
| firewalld | firewall-cmd | Baja | RHEL/CentOS/Fedora |

## Pautas

- Siempre permite SSH antes de setear `DROP` como política por defecto. Puedes bloquearte fuera.
- Testea reglas en una sesión SSH separada antes de cerrar la actual.
- Usa `iptables -L -n -v` para verificar que las reglas se aplicaron correctamente.
- Persiste reglas con `iptables-persistent` o un servicio systemd. Las reglas se pierden al reiniciar.
- Loguea paquetes dropeados con rate limiting para evitar llenar el log.
- Usa `REJECT` en vez de `DROP` para redes internas. `REJECT` envía respuesta; `DROP` descarta silenciosamente.

## Errores Comunes

- Setear política `DROP` antes de permitir SSH. Pierdes acceso inmediatamente.
- No persistir reglas. Desaparecen al reiniciar y el servidor queda desprotegido o inalcanzable.
- Permitir todas las conexiones establecidas antes de verificar el origen. Un paquete spoofed puede bypassar reglas.
- Olvidar IPv6. `ip6tables` es separado. Un puerto IPv6 abierto bypassa las reglas IPv4 de iptables.
- Usar `DROP` en todos lados. `DROP` hace el troubleshooting más difícil. Usa `REJECT` para tráfico interno.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre iptables y nftables?

nftables es el sucesor de iptables, introducido en Linux kernel 3.13. Usa una sintaxis unificada, soporta IPv4 e IPv6 en una sola tabla y tiene mejor performance. Las reglas de iptables se pueden traducir a nftables con `iptables-translate`.

### ¿Cómo permito un rango de puertos?

```bash
iptables -A INPUT -p tcp --dport 8000:8100 -j ACCEPT
```

Esto permite tráfico TCP en los puertos 8000 a 8100.

### ¿Cómo bloqueo todo el tráfico de un país?

Usa `ipset` con una lista de rangos IP del país:

```bash
ipset create blocklist hash:net
# Add IP ranges (from a geoip database)
ipset add blocklist 203.0.113.0/24
iptables -A INPUT -m set --match-set blocklist src -j DROP
```

### ¿Cómo depuro por qué un paquete está siendo dropeado?

Agrega una regla `LOG` antes de la regla `DROP`:

```bash
iptables -A INPUT -p tcp --dport 22 -j LOG --log-prefix "SSH-DROP: "
iptables -A INPUT -p tcp --dport 22 -j DROP
```

Revisa `/var/log/syslog` o `/var/log/messages` para las entradas de log. Remueve la regla `LOG` después de debuggear.
