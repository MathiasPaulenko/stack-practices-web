---




contentType: recipes
slug: ansible-playbook
title: "Playbook de Ansible para Configuración de Servidores"
description: "Cómo escribir y ejecutar playbooks de Ansible para provisionar, configurar y gestionar servidores con tareas idempotentes, roles y archivos de inventario."
metaDescription: "Escribe y ejecuta playbooks de Ansible para provisionar y configurar servidores con tareas idempotentes, roles e inventarios."
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
  - /recipes/bash-backup-rotation
  - /recipes/bash-log-rotation
  - /recipes/setup-ssl-certificates
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Escribe y ejecuta playbooks de Ansible para provisionar y configurar servidores con tareas idempotentes, roles e inventarios."
  keywords:
    - ansible
    - playbook
    - infrastructure-as-code
    - provisioning
    - automation
    - devops
    - recipe




---

## Descripción General

Ansible es una herramienta de automatización sin agentes que utiliza playbooks YAML para configurar servidores, desplegar aplicaciones y orquestar infraestructura. A diferencia de herramientas que requieren un daemon en cada host objetivo, Ansible se conecta por SSH y ejecuta tareas remotamente, siendo ligero y fácil de adoptar.

Antes de las herramientas de configuration management, los sysadmins se conectaban manualmente a cada servidor para instalar paquetes, editar archivos de configuración y reiniciar servicios. Esto era lento, propenso a errores e imposible de auditar. Ansible reemplaza esto con playbooks declarativos e idempotentes que pueden configurar cientos de servidores en minutos y versionarse como código de aplicación.

## Cuándo Usar

Usa esta receta cuando:

- Provisionas nuevos servidores con una línea base consistente (paquetes, usuarios, claves SSH).
- Despliegas actualizaciones de aplicación a través de múltiples servidores web en paralelo.
- Aseguras que todos los nodos de producción comparten la misma configuración (Nginx, PostgreSQL, Redis).
- Ejecutas comandos ad-hoc en toda una flota (ej., reiniciar todos los servicios después de un parche de seguridad).
- Manejas secrets con Ansible Vault en lugar de hardcodear contraseñas en playbooks.

## Implementación Paso a Paso

### Instalar Ansible

```bash
# macOS
brew install ansible

# Ubuntu/Debian
sudo apt update && sudo apt install -y ansible

# Verificar
ansible --version
```

### Playbook Básico (Servidor Web)

```yaml
# playbook.yml
---
- name: Configurar servidor web
  hosts: webservers
  become: yes
  tasks:
    - name: Instalar Nginx
      ansible.builtin.apt:
        name: nginx
        state: present
        update_cache: yes

    - name: Iniciar y habilitar Nginx
      ansible.builtin.service:
        name: nginx
        state: started
        enabled: yes

    - name: Desplegar página de índice personalizada
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

### Archivo de Inventario

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

### Ejecutar el Playbook

```bash
# Verificación de sintaxis
ansible-playbook playbook.yml --syntax-check

# Dry run (modo check)
ansible-playbook playbook.yml -i inventory.ini --check

# Ejecutar
ansible-playbook playbook.yml -i inventory.ini

# Limitar a un solo host
ansible-playbook playbook.yml -i inventory.ini --limit web1.example.com
```

### Roles (Configuración Reutilizable)

```bash
# Crear estructura de role
ansible-galaxy init roles/common
```

```yaml
# roles/common/tasks/main.yml
---
- name: Instalar paquetes comunes
  ansible.builtin.apt:
    name:
      - htop
      - vim
      - curl
      - ufw
    state: present

- name: Habilitar firewall UFW
  ansible.builtin.ufw:
    state: enabled
    policy: deny

- name: Permitir SSH a través del firewall
  ansible.builtin.ufw:
    rule: allow
    port: 22
    proto: tcp
```

```yaml
# site.yml usando roles
---
- name: Aplicar configuración común
  hosts: all
  become: yes
  roles:
    - common

- name: Configurar servidores web
  hosts: webservers
  become: yes
  roles:
    - nginx
    - certbot
```

### Variables y Vault

```yaml
# group_vars/webservers.yml
nginx_worker_processes: auto
nginx_worker_connections: 1024
deploy_user: deployer
```

```bash
# Encriptar variables sensibles
ansible-vault create group_vars/all/secrets.yml
# Ingresar password del vault, luego agregar:
# db_password: super_secret_123
```

```bash
# Ejecutar con archivo de password del vault
ansible-playbook site.yml --vault-password-file .vault_pass
```

## Lo que funciona

- **Haz las tareas idempotentes.** Ejecutar un playbook dos veces no debería cambiar nada en la segunda ejecución. Usa `state: present` en lugar de comandos shell que instalan paquetes ciegamente.
- **Usa roles para reutilización.** Extrae tareas comunes en roles que pueden compartirse entre proyectos y equipos vía Ansible Galaxy o un repositorio Git privado.
- **Versiona todo.** Playbooks, inventarios y variables deben vivir en git para que los cambios sean peer-reviewed y reversibles.
- **Usa `ansible-lint`** para forzar estilo y detectar errores comunes antes de ejecutar playbooks en producción.
- **Encripta secrets con Ansible Vault** en lugar de almacenar contraseñas en texto plano. Nunca commitees credenciales sin encriptar.

## Errores Comunes

- **Ejecutar playbooks sin `--check` primero** en infraestructura de producción. El modo check revela qué cambiaría sin realizar los cambios.
- **Usar tareas `shell` o `command`** cuando existe un módulo dedicado. Los módulos son idempotentes y manejan mejor los casos de error que comandos shell crudos.
- **Olvidar `become: yes`** cuando las tareas requieren privilegios de root, causando errores de permisos crípticos.
- **Hardcodear direcciones IP** en archivos de inventario. Usa nombres DNS o scripts de inventario dinámico (AWS, GCP) que se mantengan actualizados a medida que la infraestructura escala.
- **No usar `handlers` para reinicios de servicios.** Un playbook que reinicia Nginx en cada tarea es innecesario; los handlers solo se disparan una vez al final cuando son notificados.

## Preguntas Frecuentes

**Q: ¿Cuál es la ventaja de Ansible sobre scripts de shell?**
A: Los playbooks de Ansible son idempotentes y declarativos. Ejecutar el mismo playbook dos veces produce el mismo estado sin duplicar configuración ni causar errores.

**Q: ¿Cómo manejo secretos en Ansible?**
A: Usa Ansible Vault para cifrar archivos sensibles, o intégralo con gestores de secretos externos como HashiCorp Vault o AWS Secrets Manager. Nunca commitees contraseñas en texto plano.

**Q: ¿Qué es un inventario de Ansible?**
A: Un inventario lista los hosts gestionados y los agrupa lógicamente (por ejemplo, web, db, cache). Los inventarios pueden ser archivos estáticos o plugins dinámicos obtenidos de proveedores cloud.

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.

### Inventario Dinámico para Proveedores Cloud

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
# Listar inventario dinámico
ansible-inventory --list
# Vista de grafo
ansible-inventory --graph
```

### Despliegue Multi-Entorno

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
# Desplegar a staging primero
ansible-playbook site.yml -i environments/staging/inventory.ini

# Luego producción
ansible-playbook site.yml -i environments/production/inventory.ini
```

### Condicionales y Loops

```yaml
---
- name: Configurar servidores de base de datos
  hosts: dbservers
  become: yes
  tasks:
    - name: Instalar PostgreSQL en Debian
      ansible.builtin.apt:
        name: postgresql
        state: present
      when: ansible_os_family == "Debian"

    - name: Instalar PostgreSQL en RHEL
      ansible.builtin.yum:
        name: postgresql-server
        state: present
      when: ansible_os_family == "RedHat"

    - name: Crear bases de datos
      ansible.builtin.postgresql_db:
        name: "{{ item.name }}"
        encoding: "{{ item.encoding | default('UTF8') }}"
        owner: "{{ item.owner }}"
      loop:
        - { name: app_db, owner: appuser }
        - { name: log_db, owner: loguser }
        - { name: test_db, owner: testuser }
```

### Tags para Ejecución Selectiva

```yaml
---
- name: Setup completo de servidor
  hosts: all
  become: yes
  tasks:
    - name: Instalar paquetes base
      ansible.builtin.apt:
        name: ['htop', 'vim', 'curl']
        state: present
      tags: [packages, base]

    - name: Configurar Nginx
      ansible.builtin.template:
        src: nginx.conf.j2
        dest: /etc/nginx/nginx.conf
      tags: [nginx, config]
      notify: Restart Nginx

    - name: Desplegar aplicación
      ansible.builtin.git:
        repo: https://github.com/myorg/myapp.git
        dest: /var/www/myapp
      tags: [deploy, app]
```

```bash
# Ejecutar solo instalación de paquetes
ansible-playbook site.yml --tags packages

# Saltar despliegue
ansible-playbook site.yml --skip-tags deploy

# Listar todos los tags
ansible-playbook site.yml --list-tags
```

### Integración con Ansible Lint

```bash
# Instalar ansible-lint
pip install ansible-lint

# Ejecutar lint
ansible-lint site.yml

# Integración CI/CD (GitHub Actions)
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

## Mejores Prácticas Adicionales


- For a deeper guide, see [Share Workflow Logic with GitHub Actions Reusable Workflows](/es/recipes/github-actions-reusable-workflows/).

1. **Usa `ansible.cfg` para defaults del proyecto.** Evita repetir flags CLI:

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

2. **Fija versiones de Ansible.** Diferentes versiones pueden producir comportamiento diferente:

```txt
# requirements.txt
ansible==8.7.0
ansible-lint==6.22.0
```

3. **Usa `block` para manejo de errores.** Agrupa tareas relacionadas con rescue y always:

```yaml
- name: Manejar despliegue con rollback
  block:
    - name: Desplegar código nuevo
      ansible.builtin.git:
        repo: https://github.com/myorg/myapp.git
        dest: /var/www/myapp
        version: "{{ deploy_branch }}"
      notify: Restart App

  rescue:
    - name: Rollback a versión anterior
      ansible.builtin.git:
        repo: https://github.com/myorg/myapp.git
        dest: /var/www/myapp
        version: "{{ previous_branch }}"
      notify: Restart App

  always:
    - name: Notificar resultado de despliegue
      ansible.builtin.debug:
        msg: "Despliegue intentado, revisar status"
```

## Errores Comunes Adicionales

1. **No cachear facts.** La recolección de facts es lenta en muchos hosts:

```ini
# ansible.cfg
[defaults]
gathering = smart
fact_caching = jsonfile
fact_caching_connection = ./.facts
fact_caching_timeout = 86400
```

2. **Ejecutar todo como root.** Usa `become` selectivamente por tarea:

```yaml
# Mal: todo corre como root
- hosts: all
  become: yes
  tasks:
    - name: Clonar repo como root
      ansible.builtin.git:
        repo: https://github.com/myorg/myapp.git
        dest: /home/deployer/myapp

# Bien: become solo donde es necesario
- hosts: all
  tasks:
    - name: Instalar paquetes
      ansible.builtin.apt:
        name: nginx
        state: present
      become: yes

    - name: Clonar repo como deployer
      ansible.builtin.git:
        repo: https://github.com/myorg/myapp.git
        dest: /home/deployer/myapp
      become: yes
      become_user: deployer
```

3. **No usar `--diff` para auditoría.** Ve exactamente qué cambia en cada ejecución:

```bash
ansible-playbook site.yml --diff
```

## FAQ Adicional

### Como acelero Ansible en inventarios grandes?

Usa multiplexing SSH y pipelining:

```ini
# ansible.cfg
[ssh_connection]
ssh_args = -o ControlMaster=auto -o ControlPersist=60s
pipelining = true
```

También aumenta `forks` (default es 5):

```ini
[defaults]
forks = 20
```

### Como testeo playbooks de Ansible localmente?

Usa `ansible-playbook` con `--connection=local`:

```bash
ansible-playbook playbook.yml --connection=local --inventory localhost,
```

O usa Molecule para testing de integración:

```bash
pip install molecule
molecule init role my-role
molecule test
```

### Cuál es la diferencia entre `copy` y `template`?

`copy` transfiere un archivo tal cual. `template` renderiza un template Jinja2 con variables antes de transferirlo. Usa `template` cuando el archivo necesita contenido dinámico (archivos de config con variables), y `copy` para archivos estáticos.

## Tips de Rendimiento

1. **Usa `strategy: free` para ejecución más rápida.** Cada host corre independientemente:

```yaml
- name: Despliegue paralelo rápido
  hosts: webservers
  strategy: free
  tasks:
    - name: Desplegar app
      ansible.builtin.git:
        repo: https://github.com/myorg/myapp.git
        dest: /var/www/myapp
```

2. **Deshabilita la recolección de facts cuando no se usa.** Ahorra 2-5 segundos por host:

```yaml
- name: Tarea simple sin facts
  hosts: webservers
  gather_facts: no
  tasks:
    - name: Reiniciar servicio
      ansible.builtin.service:
        name: nginx
        state: restarted
```

3. **Usa `async` para tareas long-running.** No bloquees el playbook:

```yaml
- name: Ejecutar backup lento
  ansible.builtin.shell: pg_dump mydb > /tmp/backup.sql
  async: 300
  poll: 5
```
