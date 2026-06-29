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
