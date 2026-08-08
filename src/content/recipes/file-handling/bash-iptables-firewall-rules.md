---



contentType: recipes
slug: bash-iptables-firewall-rules
title: "Configure Firewall Rules with iptables"
description: "Set up basic firewall rules using iptables in Bash to filter traffic, block ports, and protect Linux servers."
metaDescription: "Configure Linux firewall rules with iptables using Bash. Filter traffic, allow trusted ports, block unwanted IPs, and secure servers from network threats."
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
  - /recipes/python-zip-file-extraction
  - /recipes/bash-iptables-firewall
  - /recipes/bash-aws-cli-automation
lastUpdated: "2026-06-28"
publishedAt: "2026-06-28"
author: Mathias Paulenko
seo:
  metaDescription: "Configure Linux firewall rules with iptables using Bash. Filter traffic, allow trusted ports, block unwanted IPs, and secure servers from network threats."
  keywords:
    - file-handling
    - bash
    - iptables
    - firewall
    - security
    - linux



---
## Overview

iptables is the classic Linux firewall framework. It lets you define rules that filter incoming, outgoing, and forwarded packets based on IP addresses, ports, protocols, and connection state. A well-structured Bash script makes iptables rules readable, repeatable, and easy to reset, which is essential when you are hardening a server or troubleshooting connectivity.

## When to Use

Use this resource when:
- You need to filter traffic on a Linux server without a cloud security group.
- You want to allow only specific ports (SSH, HTTP, HTTPS) and drop the rest.
- You are building a bastion host or a minimal server image.
- You need to block a specific IP address or range temporarily.

## Solution

### Basic iptables firewall script

```bash
#!/usr/bin/env bash
set -euo pipefail

# Reset rules
iptables -F
iptables -X
iptables -Z

# Default policies
iptables -P INPUT DROP
iptables -P FORWARD DROP
iptables -P OUTPUT ACCEPT

# Allow loopback
iptables -A INPUT -i lo -j ACCEPT

# Allow established and related connections
iptables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow SSH (rate-limited)
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set
iptables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
iptables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP and HTTPS
iptables -A INPUT -p tcp --dport 80 -j ACCEPT
iptables -A INPUT -p tcp --dport 443 -j ACCEPT

# Save rules
iptables-save > /etc/iptables/rules.v4

echo "Firewall rules applied"
```

## Explanation

The script starts by flushing existing rules and resetting counters. It sets a default deny policy for incoming and forwarded traffic while allowing outbound traffic. Loopback traffic is always accepted because local services depend on it. The connection tracking module allows responses to outgoing requests. SSH is accepted with rate limiting to slow brute-force attempts. HTTP and HTTPS are open for web services. Finally, the rules are saved so they persist after reboot.

## Variants

| Rule type | Example | Purpose |
|-----------|---------|---------|
| Allow port | `--dport 443` | Open HTTPS |
| Block IP | `-s 10.0.0.0/8 -j DROP` | Deny a subnet |
| Rate limit | `-m recent` | Slow brute force |
| Log and drop | `-j LOG --log-prefix` | Audit blocked traffic |

## What Works

1. **Default deny, allow explicitly.** A default drop policy is safer than a default allow policy.
2. **Save rules before reboot.** Use `iptables-save` and a systemd service or a netfilter-persistent package.
3. **Use connection tracking.** Allowing established and related traffic prevents breaking outgoing connections.
4. **Rate-limit SSH.** Brute force is common; limit new connections per minute.
5. **Test before saving.** Apply rules, verify connectivity, then save. A bad rule can lock you out of the server.

## Common Mistakes

1. **Forgetting to allow established connections.** Without conntrack, responses to outgoing requests are blocked.
2. **Locking yourself out of SSH.** Always allow your management port before changing the default policy.
3. **Flushing rules without a reset plan.** If you lose access, you may need console access to recover.
4. **Ignoring IPv6.** `ip6tables` needs its own rule set; many servers are dual-stack.
5. **Relying only on iptables.** Use cloud security groups and network ACLs as additional layers.

## FAQ

**Q: What is the difference between iptables and nftables?**
A: iptables is the legacy framework. nftables is the modern replacement with a simpler syntax and better performance. Many distros now use nftables as the backend.

**Q: How do I persist iptables rules?**
A: Use `iptables-save > /etc/iptables/rules.v4` and restore them at boot with a systemd service or the `iptables-persistent` package.

**Q: How do I block a specific IP address?**
A: Add `iptables -A INPUT -s 198.51.100.1 -j DROP` to drop all traffic from that IP. Place the rule before the final accept rules.

### IPv6 firewall rules with ip6tables

```bash
#!/usr/bin/env bash
set -euo pipefail

# Reset IPv6 rules
ip6tables -F
ip6tables -X
ip6tables -Z

# Default policies
ip6tables -P INPUT DROP
ip6tables -P FORWARD DROP
ip6tables -P OUTPUT ACCEPT

# Allow loopback
ip6tables -A INPUT -i lo -j ACCEPT

# Allow established and related connections
ip6tables -A INPUT -m conntrack --ctstate ESTABLISHED,RELATED -j ACCEPT

# Allow ICMPv6 (required for IPv6 to function — neighbor discovery, MLD, etc.)
ip6tables -A INPUT -p icmpv6 -j ACCEPT

# Allow SSH (rate-limited)
ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --set
ip6tables -A INPUT -p tcp --dport 22 -m conntrack --ctstate NEW -m recent --update --seconds 60 --hitcount 4 -j DROP
ip6tables -A INPUT -p tcp --dport 22 -j ACCEPT

# Allow HTTP and HTTPS
ip6tables -A INPUT -p tcp --dport 80 -j ACCEPT
ip6tables -A INPUT -p tcp --dport 443 -j ACCEPT

# Save IPv6 rules
ip6tables-save > /etc/iptables/rules.v6

echo "IPv6 firewall rules applied"
```

### DDoS mitigation with connection limits

```bash
#!/usr/bin/env bash
set -euo pipefail

# Limit connections per source IP to prevent SYN floods
iptables -A INPUT -p tcp -m connlimit --connlimit-above 50 --connlimit-mask 32 -j DROP

# Limit new connections per second (protect against port scans and floods)
iptables -A INPUT -p tcp -m conntrack --ctstate NEW -m limit --limit 20/s --limit-burst 40 -j ACCEPT
iptables -A INPUT -p tcp -m conntrack --ctstate NEW -j DROP

# Drop invalid packets (spoofed, malformed)
iptables -A INPUT -m conntrack --ctstate INVALID -j DROP

# SYN flood protection with SYNPROXY (kernel 3.12+)
iptables -t raw -A PREROUTING -p tcp -m tcp --syn -j CT --notrack
iptables -A INPUT -p tcp -m tcp --syn -m conntrack --ctstate UNTRACKED,INVALID -j SYNPROXY --sack-perm --timestamp --wscale 7 --mss 1460
iptables -A INPUT -p tcp -m tcp --syn -m conntrack --ctstate UNTRACKED,INVALID -j DROP

# Limit ICMP (ping flood protection)
iptables -A INPUT -p icmp -m limit --limit 1/s --limit-burst 3 -j ACCEPT
iptables -A INPUT -p icmp -j DROP

echo "DDoS mitigation rules applied"
```

### Logging dropped packets for audit

```bash
#!/usr/bin/env bash
set -euo pipefail

# Log dropped packets with a prefix (rate-limited to avoid log flooding)
iptables -A INPUT -m limit --limit 5/min --limit-burst 10 -j LOG \
    --log-prefix "iptables-DROP: " \
    --log-level 4 \
    --log-ip-options \
    --log-tcp-options \
    --log-uid

# Drop everything else
iptables -A INPUT -j DROP

# View dropped packets in system log
# journalctl -k | grep "iptables-DROP"
# or: dmesg | grep "iptables-DROP"

# Log to a custom file via rsyslog
cat > /etc/rsyslog.d/10-iptables.conf << 'EOF'
:msg, contains, "iptables-DROP" /var/log/iptables.log
& stop
EOF
systemctl restart rsyslog
```

### fail2ban integration with iptables

```bash
#!/usr/bin/env bash
set -euo pipefail

# Install fail2ban
# apt install fail2ban  OR  yum install fail2ban

# Create local configuration
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

# Start and enable fail2ban
systemctl enable fail2ban
systemctl start fail2ban

# Check banned IPs
fail2ban-client status sshd

# Manually ban/unban an IP
fail2ban-client set sshd banip 198.51.100.1
fail2ban-client set sshd unbanip 198.51.100.1

# fail2ban creates iptables rules automatically:
# Chain f2b-sshd (references in INPUT chain)
# iptables -L f2b-sshd -n --line-numbers
```

### nftables migration (modern replacement)

```bash
#!/usr/bin/env bash
set -euo pipefail

# nftables is the modern replacement for iptables (kernel 3.13+)
# Many distros (Debian 10+, Ubuntu 20.04+, RHEL 8+) use nftables backend

# Convert existing iptables rules to nftables
iptables-restore-translate -f /etc/iptables/rules.v4 > /etc/nftables.conf

# Or write nftables rules directly
cat > /etc/nftables.conf << 'EOF'
#!/usr/sbin/nft -f

flush ruleset

table inet filter {
    chain input {
        type filter hook input priority 0; policy drop;

        # Allow loopback
        iif "lo" accept

        # Allow established and related
        ct state established,related accept

        # Drop invalid
        ct state invalid drop

        # Allow ICMP (rate-limited)
        icmp type echo-request limit rate 1/second accept
        icmpv6 type echo-request limit rate 1/second accept

        # Allow SSH with rate limiting
        tcp dport 22 ct state new limit rate 4/minute accept

        # Allow HTTP and HTTPS
        tcp dport { 80, 443 } accept

        # Log and drop everything else
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

# Apply nftables rules
nft -f /etc/nftables.conf

# Enable nftables at boot
systemctl enable nftables
systemctl start nftables

# List rules
nft list ruleset
```

### Port knocking for hidden services

```bash
#!/usr/bin/env bash
set -euo pipefail

# Port knocking: SSH only opens after a specific sequence of port "knocks"
# Requires knockd: apt install knockd

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

# Start knockd
systemctl enable knockd
systemctl start knockd

# Client: knock before connecting
# knock -v server-ip 7000 8000 9000
# ssh user@server-ip
# knock -v server-ip 9000 8000 7000  # Close after
```



