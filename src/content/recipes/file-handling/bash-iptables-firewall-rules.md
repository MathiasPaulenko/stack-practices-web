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
    - /recipes/bash-backup-rotation-script
    - /recipes/bash-monitoring-disk-usage
    - /recipes/bash-ssh-key-management
    - /recipes/bash-scripting-automation
    - /recipes/bash-log-rotation-compression
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

## Best Practices

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
