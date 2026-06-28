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

## Mejores Prácticas

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
