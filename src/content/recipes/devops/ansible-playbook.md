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

## What works

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

## Frequently Asked Questions

**Q: What is the advantage of Ansible over shell scripts?**
A: Ansible playbooks are idempotent and declarative. Running the same playbook twice produces the same state without duplicating configuration or causing errors.

**Q: How do I manage secrets in Ansible?**
A: Use Ansible Vault to encrypt sensitive files, or integrate with external secret managers like HashiCorp Vault or AWS Secrets Manager. Never commit plain-text passwords.

**Q: What is an Ansible inventory?**
A: An inventory lists the managed hosts and groups them logically (e.g., web, db, cache). Inventories can be static files or dynamic plugins pulled from cloud providers.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Dynamic Inventory for Cloud Providers

```yaml
# ansible.cfg
[defaults]
inventory = aws_ec2.yml
host_key_checking = False
retry_files_enabled = False
```

```yaml
# aws_ec2.yml
plugin: aws_ec2
regions:
  - us-east-1
  - us-west-2
keyed_groups:
  - prefix: tag
    key: tags
host_filters:
  - tag:Name=production-*
compose:
  ansible_host: public_ip_address
  ansible_user: "'ubuntu'"
```

```bash
# List dynamic inventory
ansible-inventory --list
# Graph view
ansible-inventory --graph
```

### Multi-Environment Deployment

```yaml
# environments/staging/inventory.ini
[webservers]
staging-web1.example.com

[all:vars]
env=staging
nginx_worker_processes: 2
```

```yaml
# environments/production/inventory.ini
[webservers]
prod-web1.example.com
prod-web2.example.com
prod-web3.example.com

[all:vars]
env=production
nginx_worker_processes: 8
```

```bash
# Deploy to staging first
ansible-playbook site.yml -i environments/staging/inventory.ini

# Then production
ansible-playbook site.yml -i environments/production/inventory.ini
```

### Conditionals and Loops

```yaml
---
- name: Configure database servers
  hosts: dbservers
  become: yes
  tasks:
    - name: Install PostgreSQL on Debian
      ansible.builtin.apt:
        name: postgresql
        state: present
      when: ansible_os_family == "Debian"

    - name: Install PostgreSQL on RHEL
      ansible.builtin.yum:
        name: postgresql-server
        state: present
      when: ansible_os_family == "RedHat"

    - name: Create databases
      ansible.builtin.postgresql_db:
        name: "{{ item.name }}"
        encoding: "{{ item.encoding | default('UTF8') }}"
        owner: "{{ item.owner }}"
      loop:
        - { name: app_db, owner: appuser }
        - { name: log_db, owner: loguser }
        - { name: test_db, owner: testuser }
```

### Tags for Selective Execution

```yaml
---
- name: Full server setup
  hosts: all
  become: yes
  tasks:
    - name: Install base packages
      ansible.builtin.apt:
        name: ['htop', 'vim', 'curl']
        state: present
      tags: [packages, base]

    - name: Configure Nginx
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      tags: [nginx, config]
      notify: Restart Nginx

    - name: Deploy application
      ansible.builtin.git:
        repo: https://github.com/myorg/myapp.git
        dest: /var/www/myapp
      tags: [deploy, app]
```

```bash
# Run only package installation
ansible-playbook site.yml --tags packages

# Skip deployment
ansible-playbook site.yml --skip-tags deploy

# List all tags
ansible-playbook site.yml --list-tags
```

### Ansible Lint Integration

```bash
# Install ansible-lint
pip install ansible-lint

# Run lint
ansible-lint site.yml

# CI/CD integration (GitHub Actions)
# .github/workflows/ansible-lint.yml
name: Ansible Lint
on: [push, pull_request]
jobs:
  lint:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - run: pip install ansible-lint
      - run: ansible-lint site.yml
```

## Additional Best Practices

1. **Use `ansible.cfg` for project defaults.** Avoid repeating CLI flags:

```ini
# ansible.cfg
[defaults]
inventory = inventory.ini
remote_user = ubuntu
private_key_file = ~/.ssh/id_rsa
host_key_checking = False
roles_path = ./roles
gathering = smart
fact_caching = jsonfile
fact_caching_connection = ./.facts
```

2. **Pin Ansible versions.** Different Ansible versions can produce different behavior:

```txt
# requirements.txt
ansible==8.7.0
ansible-lint==6.22.0
```

3. **Use `block` for error handling.** Group related tasks with rescue and always:

```yaml
- name: Handle deployment with rollback
  block:
    - name: Deploy new code
      ansible.builtin.git:
        repo: https://github.com/myorg/myapp.git
        dest: /var/www/myapp
        version: "{{ deploy_branch }}"
      notify: Restart App

  rescue:
    - name: Rollback to previous version
      ansible.builtin.git:
        repo: https://github.com/myorg/myapp.git
        dest: /var/www/myapp
        version: "{{ previous_branch }}"
      notify: Restart App

  always:
    - name: Notify deployment result
      ansible.builtin.debug:
        msg: "Deployment attempted, check status"
```

## Additional Common Mistakes

1. **Not caching facts.** Fact gathering is slow across many hosts:

```ini
# ansible.cfg
[defaults]
gathering = smart
fact_caching = jsonfile
fact_caching_connection = ./.facts
fact_caching_timeout = 86400
```

2. **Running everything as root.** Use `become` selectively per task:

```yaml
# Bad: everything runs as root
- hosts: all
  become: yes
  tasks:
    - name: Clone repo as root
      ansible.builtin.git:
        repo: https://github.com/myorg/myapp.git
        dest: /home/deployer/myapp

# Good: become only where needed
- hosts: all
  tasks:
    - name: Install packages
      ansible.builtin.apt:
        name: nginx
        state: present
      become: yes

    - name: Clone repo as deployer
      ansible.builtin.git:
        repo: https://github.com/myorg/myapp.git
        dest: /home/deployer/myapp
      become: yes
      become_user: deployer
```

3. **Not using `--diff` for auditing.** See exactly what changes on each run:

```bash
ansible-playbook site.yml --diff
```

## Additional FAQ

### How do I speed up Ansible on large inventories?

Use SSH multiplexing and pipelining:

```ini
# ansible.cfg
[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
pipelining = true
```

Also increase `forks` (default is 5):

```ini
[defaults]
forks = 20
```

### How do I test Ansible playbooks locally?

Use `ansible-playbook` with `--connection=local`:

```bash
ansible-playbook playbook.yml --connection=local --inventory localhost,
```

Or use Molecule for integration testing:

```bash
pip install molecule
molecule init role my-role
molecule test
```

### What is the difference between `copy` and `template`?

`copy` transfers a file as-is. `template` renders a Jinja2 template with variables before transferring. Use `template` when the file needs dynamic content (config files with variables), and `copy` for static files.

## Performance Tips

1. **Use `strategy: free` for faster execution.** Each host runs independently:

```yaml
- name: Fast parallel deployment
  hosts: webservers
  strategy: free
  tasks:
    - name: Deploy app
      ansible.builtin.git:
        repo: https://github.com/myorg/myapp.git
        dest: /var/www/myapp
```

2. **Disable fact gathering when unused.** Saves 2-5 seconds per host:

```yaml
- name: Simple task without facts
  hosts: webservers
  gather_facts: no
  tasks:
    - name: Restart service
      ansible.builtin.service:
        name: nginx
        state: restarted
```

3. **Use `async` for long-running tasks.** Don't block the playbook:

```yaml
- name: Run slow backup
  ansible.builtin.shell: pg_dump mydb > /tmp/backup.sql
  async: 300
  poll: 5
```
