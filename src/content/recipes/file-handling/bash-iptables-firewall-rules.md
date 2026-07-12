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
lastUpdated: "2026-06-28"
author: "StackPractices"
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

## Frequently Asked Questions

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

## Additional Best Practices


- For a deeper guide, see [Backup Rotation Script](/recipes/bash-backup-rotation-script/).

1. **Use custom chains for organization.** Group related rules into custom chains to keep the main INPUT chain readable and maintainable:

```bash
# Create custom chains
iptables -N SSH_PROTECT
iptables -N WEB_TRAFFIC
iptables -N BLOCKED_IPS

# Jump to custom chains from INPUT
iptables -A INPUT -p tcp --dport 22 -j SSH_PROTECT
iptables -A INPUT -p tcp -m multiport --dports 80,443 -j WEB_TRAFFIC
iptables -A INPUT -j BLOCKED_IPS

# Add rules to custom chains
iptables -A SSH_PROTECT -m recent --set
iptables -A SSH_PROTECT -m recent --update --seconds 60 --hitcount 4 -j DROP
iptables -A SSH_PROTECT -j ACCEPT

iptables -A BLOCKED_IPS -s 198.51.100.0/24 -j DROP
iptables -A BLOCKED_IPS -j RETURN  # Return to INPUT chain if no match
```

2. **Test rules with a timeout to avoid lockout.** Apply rules temporarily and auto-revert after a set time. This is critical when working on remote servers:

```bash
# Apply rules, auto-revert after 5 minutes
iptables-restore < /etc/iptables/rules.v4
echo "Rules applied. Reverting in 5 minutes..."
sleep 300
iptables -F
iptables -P INPUT ACCEPT
iptables -P OUTPUT ACCEPT
echo "Rules reverted to default allow"
```

3. **Use `iptables-restore` for atomic rule loading.** Loading rules from a file with `iptables-restore` is atomic — either all rules apply or none do. This prevents partial rule sets that leave the firewall in an inconsistent state:

```bash
# Save current rules
iptables-save > /etc/iptables/rules.v4

# Apply from file (atomic)
iptables-restore < /etc/iptables/rules.v4

# Test syntax without applying
iptables-restore --test < /etc/iptables/rules.v4
```

## Additional Common Mistakes

1. **Not ordering rules correctly.** iptables processes rules top-to-bottom. A broad ACCEPT rule before a specific DROP rule makes the DROP unreachable. Always place specific rules (DROP by IP) before general rules (ACCEPT by port):

```bash
# Wrong: the DROP is never reached
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
iptables -A INPUT -s 198.51.100.1 -j DROP

# Correct: specific DROP first
iptables -A INPUT -s 198.51.100.1 -j DROP
iptables -A INPUT -p tcp --dport 22 -j ACCEPT
```

2. **Using `-A` (append) when you need `-I` (insert).** `-A` adds to the end of the chain. `-I` inserts at a specific position. When blocking an IP, you need it before the ACCEPT rules:

```bash
# Insert at position 1 (top of chain)
iptables -I INPUT 1 -s 198.51.100.1 -j DROP

# Insert at position 3
iptables -I INPUT 3 -s 10.0.0.5 -j DROP
```

3. **Forgetting to flush custom chains.** `iptables -F` only flushes the built-in chains. Custom chains persist unless explicitly flushed or deleted:

```bash
# Complete reset: flush all chains, delete custom chains, zero counters
iptables -F
iptables -t nat -F
iptables -t mangle -F
iptables -X  # Delete all custom chains
iptables -Z  # Zero all counters
```

## Additional FAQ

### How do I whitelist a dynamic IP (DDNS) in iptables?

Use a cron job or systemd timer to resolve the DDNS hostname and update the iptables rule:

```bash
#!/usr/bin/env bash
set -euo pipefail

DDNS_HOST="admin.example.com"
CHAIN="INPUT"

# Resolve current IP
CURRENT_IP=$(dig +short "$DDNS_HOST" | head -1)

# Get previously stored IP
IP_FILE="/var/lib/ddns-firewall/ip.txt"
OLD_IP=$(cat "$IP_FILE" 2>/dev/null || echo "")

if [ "$CURRENT_IP" != "$OLD_IP" ]; then
    # Remove old rule if exists
    [ -n "$OLD_IP" ] && iptables -D "$CHAIN" -s "$OLD_IP" -j ACCEPT 2>/dev/null || true
    # Add new rule
    iptables -I "$CHAIN" 1 -s "$CURRENT_IP" -j ACCEPT
    # Store new IP
    mkdir -p "$(dirname "$IP_FILE")"
    echo "$CURRENT_IP" > "$IP_FILE"
    echo "Updated firewall: $OLD_IP -> $CURRENT_IP"
fi
```

### Is this solution production-ready?

Yes. iptables is the default firewall framework on Linux and is used in production by every major cloud provider. The rate limiting, connection tracking, and SYNPROXY patterns shown here are standard hardening techniques recommended by CIS Benchmarks and NIST. fail2ban is used on millions of servers worldwide for SSH brute-force protection. nftables is the default backend on Debian 10+, Ubuntu 20.04+, and RHEL 8+. Port knocking is used in high-security environments to hide management interfaces. All code examples use standard Linux networking tools available since kernel 3.12+.

### What are the performance characteristics?

iptables processes rules at kernel speed with negligible overhead for rule sets under 100 rules. Each rule adds 0.001-0.01ms latency per packet. Connection tracking (conntrack) uses ~1KB memory per tracked connection — 100K connections use ~100MB. The `recent` module uses ~50 bytes per source IP. SYNPROXY adds 0.05ms per SYN packet but prevents SYN flood exhaustion. For 10Gbps traffic, consider nftables which uses 20-30% less CPU than iptables due to improved data structures. fail2ban adds 1-5ms per log line scan. Port knocking adds zero overhead when knockd is not processing a knock sequence.

### How do I debug issues with this approach?

Check current rules with `iptables -L -n -v --line-numbers` to see packet and byte counters per rule. Use `iptables -L INPUT -n -v` to verify which rules are matching traffic. Test connectivity with `tcpdump -i eth0 port 22` to see if packets reach the interface. Check conntrack table with `cat /proc/net/nf_conntrack | wc -l` and `sysctl net.netfilter.nf_conntrack_max`. Verify logging with `dmesg | grep iptables-DROP`. For nftables, use `nft list ruleset` and `nft monitor trace`. For fail2ban, check `fail2ban-client status` and `fail2ban-regex /var/log/auth.log /etc/fail2ban/filter.d/sshd.conf`. Test port knocking with `knock -v server 7000 8000 9000` and check `journalctl -u knockd`.
