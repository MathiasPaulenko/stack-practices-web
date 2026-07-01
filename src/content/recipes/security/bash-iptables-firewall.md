---
contentType: recipes
slug: bash-iptables-firewall
title: "Configure iptables Firewall Rules with Bash"
description: "Set up basic firewall rules with iptables and bash scripts"
metaDescription: "Configure iptables firewall rules in bash. Block ports, allow SSH and HTTP, set up NAT, and persist rules across reboots on Linux."
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
  metaDescription: "Configure iptables firewall rules in bash. Block ports, allow SSH and HTTP, set up NAT, and persist rules across reboots on Linux."
  keywords:
    - bash
    - iptables
    - firewall
    - security
    - networking
    - linux
---
## Overview

iptables is the default firewall framework on Linux. It filters network traffic at the kernel level using chains of rules. This recipe covers setting up a basic firewall: allowing SSH and HTTP, blocking everything else, setting up NAT, and persisting rules across reboots.

## When to Use

- You are setting up a new Linux server and need basic firewall protection
- You want to restrict incoming traffic to specific ports
- You need to configure NAT or port forwarding
- You are hardening a server before deploying to production

## Solution

### Basic firewall setup

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

### Rate limiting SSH connections

```bash
#!/bin/bash

# Allow only 3 SSH connections per minute, drop the rest
iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --set --name SSH
iptables -A INPUT -p tcp --dport 22 -m state --state NEW -m recent --update --seconds 60 --hitcount 4 --name SSH -j DROP

# Allow established SSH
iptables -A INPUT -p tcp --dport 22 -m state --state ESTABLISHED,RELATED -j ACCEPT

echo "SSH rate limiting configured: max 3 new connections per minute"
```

### Port forwarding with NAT

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

### Block specific IP addresses

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

### Allow traffic from specific subnet only

```bash
#!/bin/bash

# Only allow SSH from 10.0.0.0/24
iptables -A INPUT -p tcp --dport 22 -s 10.0.0.0/24 -j ACCEPT
iptables -A INPUT -p tcp --dport 22 -j DROP

echo "SSH restricted to 10.0.0.0/24"
```

### Persist rules across reboots

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

### Firewall reset script

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

### List and verify rules

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

## Explanation

iptables processes rules in order, top to bottom. The first matching rule wins. Default policies (`-P`) apply when no rule matches.

Key concepts:

- **Chains**: `INPUT` (incoming), `OUTPUT` (outgoing), `FORWARD` (routed).
- **Tables**: `filter` (default), `nat` (address translation), `mangle` (packet modification).
- **Targets**: `ACCEPT`, `DROP`, `REJECT`, `LOG`, `MASQUERADE`.
- **State matching**: `ESTABLISHED,RELATED` allows return traffic for connections initiated from the server.

The `-m recent` module tracks source IPs and enables rate limiting. It stores connection attempts in `/proc/net/xt_recent/`.

## Variants

| Approach | Tool | Complexity | Use When |
|----------|------|-----------|----------|
| iptables | iptables | Medium | Standard Linux servers |
| nftables | nft | Medium | Modern Linux (replaces iptables) |
| UFW | ufw | Low | Ubuntu/Debian quick setup |
| firewalld | firewall-cmd | Low | RHEL/CentOS/Fedora |

## Guidelines

- Always allow SSH before setting `DROP` as default policy. You can lock yourself out.
- Test rules in a separate SSH session before closing the current one.
- Use `iptables -L -n -v` to verify rules are applied correctly.
- Persist rules with `iptables-persistent` or a systemd service. Rules are lost on reboot.
- Log dropped packets with rate limiting to avoid filling the log.
- Use `REJECT` instead of `DROP` for internal networks. `REJECT` sends a response; `DROP` silently discards.

## Common Mistakes

- Setting `DROP` policy before allowing SSH. You lose access immediately.
- Not persisting rules. They disappear on reboot and the server is unprotected or unreachable.
- Allowing all established connections before checking source. A spoofed packet can bypass rules.
- Forgetting IPv6. `ip6tables` is separate. An open IPv6 port bypasses IPv4 iptables rules.
- Using `DROP` everywhere. `DROP` makes troubleshooting harder. Use `REJECT` for internal traffic.

## Frequently Asked Questions

### What is the difference between iptables and nftables?

nftables is the successor to iptables, introduced in Linux kernel 3.13. It uses a unified syntax, supports both IPv4 and IPv6 in one table, and has better performance. iptables rules can be translated to nftables with `iptables-translate`.

### How do I allow a range of ports?

```bash
iptables -A INPUT -p tcp --dport 8000:8100 -j ACCEPT
```

This allows TCP traffic on ports 8000 through 8100.

### How do I block all traffic from a country?

Use `ipset` with a country IP range list:

```bash
ipset create blocklist hash:net
# Add IP ranges (from a geoip database)
ipset add blocklist 203.0.113.0/24
iptables -A INPUT -m set --match-set blocklist src -j DROP
```

### How do I debug why a packet is being dropped?

Add a `LOG` rule before the `DROP` rule:

```bash
iptables -A INPUT -p tcp --dport 22 -j LOG --log-prefix "SSH-DROP: "
iptables -A INPUT -p tcp --dport 22 -j DROP
```

Check `/var/log/syslog` or `/var/log/messages` for the log entries. Remove the `LOG` rule after debugging.
