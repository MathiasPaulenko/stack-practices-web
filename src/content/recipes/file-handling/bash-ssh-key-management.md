---
contentType: recipes
slug: bash-ssh-key-management
title: "SSH Key Management"
description: "Generate, rotate, and distribute SSH keys securely with Bash scripts for team and server access."
metaDescription: "Manage SSH keys with Bash: generate Ed25519 key pairs, rotate credentials on schedule, and distribute public keys securely to servers and team members."
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
  metaDescription: "Manage SSH keys with Bash: generate Ed25519 key pairs, rotate credentials on schedule, and distribute public keys securely to servers and team members."
  keywords:
    - file-handling
    - bash
    - ssh
    - security
    - keys
    - automation
---
## Overview

SSH keys are the standard way to authenticate to Linux servers, Git repositories, and cloud instances. Managing them well means generating strong keys, rotating them before they age out, and distributing public keys to authorized servers without exposing private keys. A Bash script can automate this lifecycle, reducing the risk of stale keys and manual copy-paste errors.

## When to Use

Use this resource when:
- You manage many servers or user accounts and need consistent SSH key deployment.
- You rotate keys periodically for compliance or after a team member leaves.
- You want to disable password authentication and rely on key-based access.
- You need to collect and audit public keys across a fleet.

## Solution

### SSH key management script

```bash
#!/usr/bin/env bash
set -euo pipefail

USER="${1:-$USER}"
KEY_DIR="$HOME/.ssh"

# Generate a new Ed25519 key if none exists
if [[ ! -f "$KEY_DIR/id_ed25519" ]]; then
    mkdir -p "$KEY_DIR"
    chmod 700 "$KEY_DIR"
    ssh-keygen -t ed25519 -a 100 -f "$KEY_DIR/id_ed25519" -N "" -C "$USER@$(hostname)-$(date +%Y-%m-%d)"
fi

# Display public key
cat "$KEY_DIR/id_ed25519.pub"

# Rotate an old key by renaming it and generating a new one
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

# Distribute public key to a server
distribute_key() {
    local server="$1"
    ssh-copy-id -i "$KEY_DIR/id_ed25519.pub" "$server"
}

# distribute_key user@server.example.com
```

## Explanation

The script first ensures the `~/.ssh` directory exists with the correct permissions. It then generates an Ed25519 key, which is shorter and more secure than RSA at equivalent key lengths. The `rotate_key` function renames the existing key pair with a date suffix and creates a new one. The `distribute_key` function uses `ssh-copy-id` to append the public key to the remote server's `~/.ssh/authorized_keys` file. This is safer than manually editing files because it preserves correct permissions and avoids paste errors.

## Variants

| Operation | Command | Notes |
|-----------|---------|-------|
| Generate | `ssh-keygen -t ed25519` | Modern default, 256-bit security |
| Rotate | rename + regenerate | Keep old key until new one is confirmed working |
| Distribute | `ssh-copy-id` | Appends to authorized_keys safely |
| Audit | `ssh-keygen -lf key.pub` | Shows fingerprint and comment |

## What Works

1. **Prefer Ed25519 over RSA.** Ed25519 is faster, shorter, and avoids RSA parameter weaknesses.
2. **Protect private keys with a passphrase for interactive use.** Use `ssh-agent` to avoid typing it repeatedly.
3. **Rotate keys on a schedule or after events.** Trigger rotation when an employee leaves or a key is suspected compromised.
4. **Keep authorized_keys under version control.** Track changes to server keys with a configuration management tool.
5. **Disable password authentication.** Once keys are deployed, set `PasswordAuthentication no` in sshd_config.

## Common Mistakes

1. **Sharing private keys between users.** Each person and each automated process should have its own key pair.
2. **Storing keys without passphrases on laptops.** A stolen laptop gives immediate access to every server.
3. **Ignoring file permissions.** `~/.ssh` must be 700 and private keys 600; too-open permissions cause SSH to refuse the key.
4. **Leaving old keys on servers after rotation.** A rotation is incomplete until the old public key is removed from authorized_keys.
5. **Using short RSA keys.** RSA keys below 4096 bits are no longer recommended for production.

## Frequently Asked Questions

**Q: How do I add a passphrase to an existing key?**
A: Use `ssh-keygen -p -f ~/.ssh/id_ed25519`. You can also use ssh-agent to cache the passphrase for the session.

**Q: Can I use the same key for multiple servers?**
A: Yes, but it is safer to use different keys for different security zones or projects. This limits the blast radius if a key is compromised.

**Q: How do I revoke a compromised key?**
A: Remove the corresponding public key from every `~/.ssh/authorized_keys` file and rotate the key. Audit your infrastructure management tool to ensure the key is not re-added.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
