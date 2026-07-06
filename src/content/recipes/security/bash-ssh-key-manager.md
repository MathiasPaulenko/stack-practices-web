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

Add the key to the agent:

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
