---


contentType: recipes
slug: bash-ssh-key-manager
title: "SSH Key Management in Bash"
description: "Generate, rotate, and distribute SSH keys with bash scripts"
metaDescription: "Manage SSH keys in bash. Generate ed25519 keys, rotate compromised keys, distribute to multiple servers, and enforce key-based authentication."
difficulty: intermediate
topics:
  - security
tags:
  - bash
  - ssh
  - keys
  - security
  - authentication
  - automation
relatedResources:
  - /recipes/bash-ssh-key-management
  - /docs/ssl-certificate-management-template
  - /docs/api-security-review-template
  - /guides/api-security-checklist-guide
  - /guides/security-best-practices-guide
  - /recipes/bash-iptables-firewall
lastUpdated: "2026-07-01"
author: "StackPractices"
seo:
  metaDescription: "Manage SSH keys in bash. Generate ed25519 keys, rotate compromised keys, distribute to multiple servers, and enforce key-based authentication."
  keywords:
    - bash
    - ssh
    - keys
    - security
    - authentication
    - automation


---
## Overview

SSH keys are the standard way to authenticate to remote servers. Managing them manually across multiple machines is error-prone. This approach handles generating ed25519 keys, distributing them to servers, rotating compromised keys, and disabling password authentication.

## When to Use

- You need to generate SSH keys for new team members
- You want to distribute your public key to multiple servers at once
- You need to rotate keys after a security incident
- You are hardening server security by disabling password auth

## Solution

### Generate an ed25519 key

```bash
#!/bin/bash

KEY_NAME="${1:-default}"
KEY_PATH="$HOME/.ssh/${KEY_NAME}"

if [ -f "$KEY_PATH" ]; then
    echo "Key already exists: $KEY_PATH"
    exit 1
fi

ssh-keygen -t ed25519 -C "$(whoami)@$(hostname)-${KEY_NAME}" -f "$KEY_PATH" -N ""

echo "Generated: $KEY_PATH"
echo "Public key: ${KEY_PATH}.pub"
```

### Distribute public key to multiple servers

```bash
#!/bin/bash

PUBLIC_KEY="$HOME/.ssh/id_ed25519.pub"
SERVERS=(
    "user@server1.example.com"
    "user@server2.example.com"
    "user@server3.example.com"
)

for server in "${SERVERS[@]}"; do
    echo "Distributing key to $server..."
    ssh-copy-id -i "$PUBLIC_KEY" "$server"
done

echo "Key distributed to ${#SERVERS[@]} servers"
```

### Distribute key without ssh-copy-id

```bash
#!/bin/bash

PUBLIC_KEY=$(cat "$HOME/.ssh/id_ed25519.pub")
SERVERS_FILE="servers.txt"

while IFS= read -r server; do
    [ -z "$server" ] && continue
    echo "Adding key to $server..."
    ssh "$server" "mkdir -p ~/.ssh && chmod 700 ~/.ssh && echo '$PUBLIC_KEY' >> ~/.ssh/authorized_keys && chmod 600 ~/.ssh/authorized_keys"
done < "$SERVERS_FILE"
```

### Rotate compromised keys

```bash
#!/bin/bash

OLD_KEY="$1"
SERVERS_FILE="servers.txt"

if [ -z "$OLD_KEY" ]; then
    echo "Usage: $0 <old-public-key-string>"
    exit 1
fi

# Remove old key from all servers
while IFS= read -r server; do
    [ -z "$server" ] && continue
    echo "Removing old key from $server..."
    ssh "$server" "sed -i '/${OLD_KEY}/d' ~/.ssh/authorized_keys"
done < "$SERVERS_FILE"

# Generate new key
ssh-keygen -t ed25519 -C "$(whoami)@$(hostname)-rotated" -f "$HOME/.ssh/id_ed25519_rotated" -N ""

echo "Old key removed. New key: $HOME/.ssh/id_ed25519_rotated"
echo "Distribute the new key with the distribute script."
```

### Disable password authentication

```bash
#!/bin/bash

SSHD_CONFIG="/etc/ssh/sshd_config"

# Backup original config
cp "$SSHD_CONFIG" "${SSHD_CONFIG}.bak"

# Disable password auth
sed -i 's/^#*PasswordAuthentication.*/PasswordAuthentication no/' "$SSHD_CONFIG"
sed -i 's/^#*ChallengeResponseAuthentication.*/ChallengeResponseAuthentication no/' "$SSHD_CONFIG"
sed -i 's/^#*PubkeyAuthentication.*/PubkeyAuthentication yes/' "$SSHD_CONFIG"

# Restart SSH
systemctl restart sshd

echo "Password authentication disabled. Key-based auth only."
```

### Audit SSH keys on a server

```bash
#!/bin/bash

echo "=== SSH Key Audit ==="
echo "Date: $(date)"
echo ""

for user_home in /home/* /root; do
    user=$(basename "$user_home")
    auth_file="${user_home}/.ssh/authorized_keys"

    if [ -f "$auth_file" ]; then
        key_count=$(wc -l < "$auth_file")
        echo "User: $user ($key_count keys)"
        while IFS= read -r key; do
            [ -z "$key" ] && continue
            key_type=$(echo "$key" | awk '{print $1}')
            key_comment=$(echo "$key" | awk '{print $3}')
            key_fingerprint=$(echo "$key" | ssh-keygen -lf - 2>/dev/null | awk '{print $1}')
            echo "  - $key_type | $key_fingerprint | $key_comment"
        done < "$auth_file"
        echo ""
    fi
done
```

### List all SSH keys on local machine

```bash
#!/bin/bash

echo "=== Local SSH Keys ==="
for key in ~/.ssh/id_* ~/.ssh/*.pub; do
    [ -f "$key" ] || continue
    if [[ "$key" == *.pub ]]; then
        fingerprint=$(ssh-keygen -lf "$key" 2>/dev/null)
        echo "Public:  $key"
        echo "  $fingerprint"
    fi
done
```

## Explanation

Ed25519 keys are smaller, faster, and more secure than RSA. A 256-bit ed25519 key provides equivalent security to a 3072-bit RSA key. Always prefer ed25519 for new keys.

`ssh-copy-id` appends your public key to `~/.ssh/authorized_keys` on the remote server. It handles permission setup (700 for `~/.ssh`, 600 for `authorized_keys`). If `ssh-copy-id` is not available, you can do the same with a manual `ssh` command.

Key rotation removes the old public key from `authorized_keys` files across all servers. The `sed -i` command deletes any line containing the old key string. After removal, generate a new key and distribute it.

Disabling password authentication is the single most effective SSH hardening step. It eliminates brute-force password attacks entirely.

## Variants

| Approach | Key Type | Use When |
|----------|----------|----------|
| ed25519 | Ed25519 | New keys, modern servers |
| RSA 4096 | RSA | Legacy servers without ed25519 support |
| ECDSA | ECDSA | Specific compliance requirements |
| Hardware key (FIDO2) | Ed25519-SK | High-security environments with YubiKey |

## Guidelines

- Use ed25519 for all new keys. It is faster and more secure than RSA.
- Set a passphrase on private keys. Use `ssh-agent` to avoid typing it repeatedly.
- Use `~/.ssh/config` to manage multiple keys and server aliases.
- Rotate keys after team member departures or suspected compromises.
- Audit `authorized_keys` files quarterly. Remove keys for users who no longer need access.

## Common Mistakes

- Using RSA keys shorter than 3072 bits. RSA 2048 is no longer recommended for long-term use.
- Leaving private keys without a passphrase. Anyone with file access can use the key.
- Not removing old keys from `authorized_keys` after rotation. The compromised key remains valid.
- Disabling password auth before verifying key-based login works. You lock yourself out.
- Sharing private keys between users. Each user should have their own key pair.

## Frequently Asked Questions

### How do I use a specific key for a specific server?

Use `~/.ssh/config`:

```ssh-config
Host server1.example.com
    IdentityFile ~/.ssh/id_ed25519_server1
    User deploy

Host *.internal
    IdentityFile ~/.ssh/id_ed25519_internal
    User admin
```

### How do I set up SSH agent forwarding safely?

Add the way to the agent:

```bash
eval "$(ssh-agent -s)"
ssh-add ~/.ssh/id_ed25519
```

Then connect with `-A` to forward the agent. Only use agent forwarding with trusted servers. A compromised server can use your forwarded agent to connect to other servers as you.

### How do I enforce key-based auth without locking myself out?

Test key login in a second terminal before disabling passwords:

```bash
# Terminal 1: keep this open
ssh user@server

# Terminal 2: test key login
ssh -o PasswordAuthentication=no user@server

# If that works, disable passwords in Terminal 1
```

### What is the difference between authorized_keys and known_hosts?

`authorized_keys` lists public keys that can log into this machine. `known_hosts` lists servers this machine has connected to. They serve opposite purposes: one controls inbound access, the other validates outbound connections.

## Advanced Solutions

### SSH config with jump host (bastion)

Connect to internal servers through a bastion host without exposing them to the internet. The `ProxyJump` directive chains SSH connections:

```ssh-config
# Bastion host (reachable from internet)
Host bastion
    HostName bastion.example.com
    User deploy
    IdentityFile ~/.ssh/id_ed25519_bastion
    Port 2222

# Internal servers (only reachable via bastion)
Host *.internal.example.com
    User deploy
    IdentityFile ~/.ssh/id_ed25519_internal
    ProxyJump bastion
    # Disable agent forwarding to bastion for security
    ForwardAgent no

# Database server (two-hop: bastion -> jump -> db)
Host db-prod.internal.example.com
    User dbadmin
    IdentityFile ~/.ssh/id_ed25519_db
    ProxyJump jump-vm.internal.example.com
```

### FIDO2 hardware-backed SSH keys (YubiKey)

Generate SSH keys that require physical hardware presence. The private key never leaves the YubiKey:

```bash
#!/bin/bash

# Generate a FIDO2-backed ed25519 key
# Requires OpenSSH 8.2+ and a FIDO2-compatible device (YubiKey 5 Series)
ssh-keygen -t ed25519-sk -C "$(whoami)@$(hostname)-fido2" -f "$HOME/.ssh/id_ed25519_sk"

# With a passphrase and requiring touch for every use
ssh-keygen -t ed25519-sk -O resident -O verify-required \
    -C "$(whoami)@$(hostname)-fido2-strict" \
    -f "$HOME/.ssh/id_ed25519_sk_strict"

echo "FIDO2 key generated. Touch YubiKey when prompted during use."

# Resident key can be recovered on a new machine
# ssh-keygen -K  # downloads resident keys from FIDO2 device
```

### SSH Certificate Authority (CA) for key signing

Instead of distributing public keys to every server, set up an SSH CA. Servers trust the CA, and users get signed certificates with expiration:

```bash
#!/bin/bash

# === On the CA host ===
# Generate CA key pair (do this once, keep the private key secure)
ssh-keygen -t ed25519 -f /etc/ssh/ca_key -N "" -C "SSH CA"

# === On each server (trust the CA) ===
# Add CA public key to trusted user CA
echo "TrustedUserCAKeys /etc/ssh/ca_key.pub" >> /etc/ssh/sshd_config
systemctl restart sshd

# === Sign a user's public key (on CA host) ===
# Sign with validity period and principal restrictions
ssh-keygen -s /etc/ssh/ca_key \
    -I "user-$(date +%Y%m%d)" \
    -n deploy,admin \
    -V +1d \
    ~/.ssh/id_ed25519.pub

# This generates ~/.ssh/id_ed25519-cert.pub
# The user connects with their key + certificate:
# ssh -i ~/.ssh/id_ed25519 user@server

# The certificate is valid for 1 day and only for principals 'deploy' and 'admin'
```

### Bulk key rotation across server fleet

Rotate keys across hundreds of servers using a parallel SSH tool and a rotation manifest:

```bash
#!/bin/bash

# rotation-manifest.txt format: server old_key_fingerprint new_key_path
MANIFEST="rotation-manifest.txt"
KEYS_DIR="$HOME/.ssh"

while IFS=$'\t' read -r server old_fp new_key; do
    [ -z "$server" ] && continue
    echo "Rotating key on $server..."

    # Remove old key by fingerprint
    ssh "$server" "ssh-keygen -R -f ~/.ssh/authorized_keys -F '$old_fp'" 2>/dev/null

    # Add new key
    NEW_PUB=$(cat "${KEYS_DIR}/${new_key}.pub")
    ssh "$server" "echo '$NEW_PUB' >> ~/.ssh/authorized_keys"

    echo "  Done: $server"
done < "$MANIFEST"

echo "Rotation complete for $(wc -l < "$MANIFEST") servers"
```

## Additional Best Practices


- For a deeper guide, see [Complete Guide to GraphQL Security](/guides/complete-guide-graphql-security/).

1. **Use `IdentitiesOnly yes` in SSH config.** Without this, SSH tries all keys in `~/.ssh/` for every connection. This can trigger max auth attempts on servers with many keys:

```ssh-config
Host *
    IdentitiesOnly yes
    ServerAliveInterval 60
    ServerAliveCountMax 3
```

2. **Set `MaxAuthTries` on servers.** Limit the number of failed authentication attempts to reduce brute-force exposure:

```bash
# In /etc/ssh/sshd_config
MaxAuthTries 3
LoginGraceTime 30
PermitRootLogin no
AllowUsers deploy admin
```

## Additional Common Mistakes

1. **Using `ForwardAgent yes` globally.** Agent forwarding allows a compromised server to use your SSH agent. Only enable it per-host for trusted servers:

```ssh-config
# Bad: global agent forwarding
Host *
    ForwardAgent yes

# Good: per-host for trusted bastion only
Host bastion.example.com
    ForwardAgent yes
```

2. **Not setting file permissions on SSH keys.** SSH refuses to use keys with overly permissive permissions, but silent failures can confuse. Always verify:

```bash
chmod 700 ~/.ssh
chmod 600 ~/.ssh/id_ed25519
chmod 644 ~/.ssh/id_ed25519.pub
chmod 600 ~/.ssh/config
```

## Additional Frequently Asked Questions

### How do I use SSH keys with GitHub/GitLab?

Add your public key to the platform's SSH keys settings. Use `~/.ssh/config` to specify which key to use:

```ssh-config
Host github.com
    IdentityFile ~/.ssh/id_ed25519_github
    User git
```

Test with `ssh -T git@github.com`.

### What is SSH key rotation and how often should I do it?

Key rotation means replacing existing SSH keys with new ones and removing the old keys from all servers. Rotate keys when:
- A team member leaves
- A key may have been exposed (laptop theft, backup compromise)
- Annually as a routine security measure
- After any security incident involving server access
