---
contentType: recipes
slug: ansible-playbook
title: "Ansible Playbook for Server Configuration"
description: "How to write and run Ansible playbooks for provisioning, configuring, and managing servers with idempotent tasks, roles, and inventory files."
metaDescription: "Write and run Ansible playbooks for provisioning and configuring servers with idempotent tasks, roles, and inventory files."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - ansible
  - infrastructure-as-code
  - provisioning
  - automation
  - recipe
relatedResources:
  - /recipes/terraform-aws-vpc
  - /recipes/docker-basics
  - /recipes/secret-management
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Write and run Ansible playbooks for provisioning and configuring servers with idempotent tasks, roles, and inventory files."
  keywords:
    - ansible
    - playbook
    - infrastructure-as-code
    - provisioning
    - automation
    - devops
    - recipe
---

## Overview

Ansible is an agentless automation tool that uses YAML playbooks to configure servers, deploy applications, and orchestrate infrastructure. Unlike tools that require a daemon on every target host, Ansible connects over SSH and executes tasks remotely, making it lightweight and easy to adopt.

Before configuration management tools, sysadmins logged into each server manually to install packages, edit config files, and restart services. This was slow, error-prone, and impossible to audit. Ansible replaces this with declarative, idempotent playbooks that can configure hundreds of servers in minutes and be version-controlled like application code.

## When to Use

Use this recipe when:

- Provisioning new servers with a consistent baseline (packages, users, SSH keys).
- Deploying application updates across multiple web servers in parallel.
- Ensuring all production nodes share the same configuration (Nginx, PostgreSQL, Redis).
- Running ad-hoc commands across an entire fleet (e.g., restart all services after a security patch).
- Managing secrets with Ansible Vault instead of hardcoding passwords in playbooks.

## Step-by-Step Implementation

### Install Ansible

```bash
# macOS
brew install ansible

# Ubuntu/Debian
sudo apt update && sudo apt install -y ansible

# Verify
ansible --version
```

### Basic Playbook (Web Server)

```yaml
# playbook.yml
---
- name: Configure web server
  hosts: webservers
  become: yes
  tasks:
    - name: Install Nginx
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: yes

    - name: Start and enable Nginx
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: yes

    - name: Deploy custom index page
      ansible.builtin.template:
        src: templates/index.html.j2
        dest: /var/www/html/index.html
        owner: www-data
        group: www-data
        mode: '0644'
      notify: Restart Nginx

  handlers:
    - name: Restart Nginx
      ansible.builtin.service:
        name: nginx
        state: restarted
```

### Inventory File

```ini
# inventory.ini
[webservers]
web1.example.com ansible_user=ubuntu
web2.example.com ansible_user=ubuntu

[dbservers]
db1.example.com ansible_user=ubuntu

[all:vars]
ansible_python_interpreter=/usr/bin/python3
ansible_ssh_private_key_file=~/.ssh/id_rsa
```

### Run the Playbook

```bash
# Syntax check
ansible-playbook playbook.yml --syntax-check

# Dry run (check mode)
ansible-playbook playbook.yml -i inventory.ini --check

# Execute
ansible-playbook playbook.yml -i inventory.ini

# Limit to a single host
ansible-playbook playbook.yml -i inventory.ini --limit web1.example.com
```

### Roles (Reusable Configuration)

```bash
# Create role scaffold
ansible-galaxy init roles/common
```

```yaml
# roles/common/tasks/main.yml
---
- name: Install common packages
  ansible.builtin.apt:
    name:
      - htop
      - vim
      - curl
      - ufw
    state: present

- name: Enable UFW firewall
  ansible.builtin.ufw:
    state: enabled
    policy: deny

- name: Allow SSH through firewall
  ansible.builtin.ufw:
    rule: allow
    port: 22
    proto: tcp
```

```yaml
# site.yml using roles
---
- name: Apply common configuration
  hosts: all
  become: yes
  roles:
    - common

- name: Configure web servers
  hosts: webservers
  become: yes
  roles:
    - nginx
    - certbot
```

### Variables and Vault

```yaml
# group_vars/webservers.yml
nginx_worker_processes: auto
nginx_worker_connections: 1024
deploy_user: deployer
```

```bash
# Encrypt sensitive variables
ansible-vault create group_vars/all/secrets.yml
# Enter vault password, then add:
# db_password: super_secret_123
```

```bash
# Run with vault password file
ansible-playbook site.yml --vault-password-file .vault_pass
```

## Best Practices

- **Make tasks idempotent.** Running a playbook twice should not change anything on the second run. Use `state: present` instead of shell commands that blindly install packages.
- **Use roles for reusability.** Extract common tasks into roles that can be shared across projects and teams via Ansible Galaxy or a private Git repository.
- **Version control everything.** Playbooks, inventories, and variables should live in git so changes are peer-reviewed and reversible.
- **Use `ansible-lint`** to enforce style and catch common errors before running playbooks in production.
- **Encrypt secrets with Ansible Vault** instead of storing passwords in plaintext. Never commit unencrypted credentials.

## Common Mistakes

- **Running playbooks without `--check` first** on production infrastructure. Check mode reveals what would change without actually changing it.
- **Using `shell` or `command` tasks** when a dedicated module exists. Modules are idempotent and handle error cases better than raw shell commands.
- **Forgetting `become: yes`** when tasks require root privileges, causing cryptic permission errors.
- **Hardcoding IP addresses** in inventory files. Use DNS names or dynamic inventory scripts (AWS, GCP) that stay current as infrastructure scales.
- **Not using `handlers` for service restarts.** A playbook that restarts Nginx on every task is unnecessary; handlers only trigger once at the end when notified.

## Related Resources

- [Terraform AWS VPC](/recipes/terraform-aws-vpc)
- [Docker Basics](/recipes/docker-basics)
- [Secret Management](/recipes/secret-management)
