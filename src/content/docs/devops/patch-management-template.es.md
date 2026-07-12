---



contentType: docs
slug: patch-management-template
title: "Plantilla de Gestión de Parches"
description: "Una plantilla para programar, probar y desplegar parches de seguridad en todos los entornos."
metaDescription: "Plantilla de gestión de parches: programa actualizaciones de seguridad, rastrea pruebas, ventanas de mantenimiento y despliegues con mínimo downtime."
difficulty: intermediate
topics:
  - devops
tags:
  - devops
  - patch
  - management
  - security
  - operations
  - template
relatedResources:
  - /docs/bug-triage-template
  - /docs/change-management-template
  - /docs/escalation-policy-template
  - /docs/ssl-certificate-renewal-template
  - /docs/runbook-template
  - /docs/on-call-runbook-template
  - /docs/performance-regression-template
lastUpdated: "2026-06-21"
author: "StackPractices"
seo:
  metaDescription: "Plantilla de gestión de parches: programa actualizaciones de seguridad, rastrea pruebas, ventanas de mantenimiento y despliegues con mínimo downtime."
  keywords:
    - devops
    - parche
    - gestión
    - seguridad
    - operaciones
    - plantilla



---
## Visión General

Los parches de seguridad son invisibles cuando funcionan y catastróficos cuando se olvidan. Equipos de alta madurez tratan la gestión de parches como un proceso de gestión de cambios con cronograma, testing y rollback. Equipos de baja madurez instalan parches de forma reactiva cuando aparece una brecha en las noticias. Esta plantilla convierte la gestión de parches en un proceso repetible: inventario, clasificación, testing, despliegue y verificación. Reduce el riesgo de vulnerabilidades de día cero mientras mantiene la estabilidad del sistema.

## Cuándo Usar


- For alternatives, see [Bug Triage Template](/es/docs/bug-triage-template/).

Usa este recurso cuando:
- Tu política de seguridad requiere aplicación de parches dentro de un SLA definido
- Un parche reciente rompió staging o producción debido a que faltaba testing
- Necesitas auditar el estado de parches para un marco de cumplimiento

## Solución

```markdown
# Plan de Gestión de Parches: `<Entorno / Servicio>`

## 1. Inventario de Parches

| ID de Parche | Sistema / Paquete | Versión Actual | Versión Parcheada | Severidad | CVE | Fuente |
|--------------|-------------------|----------------|-------------------|-----------|-----|--------|
| | | | | Crítica / Alta / Media / Baja | | Distro / Vendor / Upstream |

## 2. Clasificación

| Severidad | SLA de Aplicación | Ventana de Mantenimiento | Requiere Revisión de Cambio |
|-----------|-------------------|--------------------------|-----------------------------|
| Crítica (CVE 9.0–10.0) | 24 horas | Fuera de horario pico, tan pronto como sea posible | Sí, acelerada |
| Alta (CVE 7.0–8.9) | 7 días | Siguiente ventana de mantenimiento estándar | Sí |
| Media (CVE 4.0–6.9) | 30 días | Siguiente ciclo de parches mensual | Sí |
| Baja (CVE 0.1–3.9) | 90 días | Siguiente ciclo de parches trimestral | No (autorizado previamente) |

## 3. Lista de Verificación de Testing

### 3.1. Pre-Despliegue

- [ ] Leído el changelog y notas de release del vendor
- [ ] Revisado dependencias de librería / actualizaciones requeridas del sistema operativo
- [ ] Construido y probado en entorno de desarrollo local
- [ ] Ejecutado suite de tests automatizados (unidad + integración)
- [ ] Probado impacto de rendimiento con benchmarks de carga (si aplica)
- [ ] Revisado errores conocidos o breaking changes documentados

### 3.2. En Staging

- [ ] Desplegado en ambiente de staging idéntico a producción
- [ ] Ejecutado smoke tests end-to-end
- [ ] Verificado health checks y métricas clave durante 24 horas
- [ ] Probado flujos críticos de negocio (checkout, login, API core)
- [ ] Validado logs de error — sin nuevos errores en staging

### 3.3. En Producción

- [ ] Ventana de mantenimiento aprobada y comunicada
- [ ] Snapshot / backup tomado antes del parche
- [ ] Despliegue en canary o subconjunto primero
- [ ] Monitoreo de métricas críticas por 1–4 horas después del despliegue
- [ ] Verificación de aplicación del parche (ej. `dpkg -l | grep <pkg>`)

## 4. Cronograma de Despliegue

| Fecha | Entorno | Actividad | Responsable | Estado |
|-------|---------|-----------|-------------|--------|
| `AAAA-MM-DD` | Dev | Parche aplicado; tests ejecutados | `@nombre` | |
| `AAAA-MM-DD` | Staging | Parche desplegado; observación | `@nombre` | |
| `AAAA-MM-DD` | Producción (canary) | Parche a 10% de tráfico | `@nombre` | |
| `AAAA-MM-DD` | Producción (completo) | Parche a 100% si canary saludable | `@nombre` | |
| `AAAA-MM-DD` | Verificación post-parche | Escaneo de vulnerabilidad de confirmación | `@nombre` | |

## 5. Verificación Post-Despliegue

- [ ] Escaneo de vulnerabilidad confirma que el CVE está mitigado
- [ ] Sin nuevas alertas de monitorización en 24 horas
- [ ] APM muestra latencia y tasa de error dentro de la línea base
- [ ] No hay tickets de soporte nuevos relacionados con el parche
- [ ] Documentación actualizada (notas de release, runbooks)

## 6. Log de Excepciones

| CVE / Parche | Razón de No Aplicar | Riesgo Aceptado | Aprobado Por | Fecha de Revisión |
|--------------|---------------------|-----------------|--------------|-------------------|
| | | | | |
```

## Explicación

La plantilla separa **urgencia** de **rigor**. Los parches críticos se aplican rápido, pero no se aplican sin observar la línea base primero. El testing en staging idéntico a producción detecta dependencias rotas antes de que afecten usuarios. La lista de verificación de verificación post-despliegue cierra el bucle: un parche no está completo hasta que el escaneo de vulnerabilidad confirma que el CVE desapareció.

## Variantes

| Tipo de Infraestructura | Herramienta de Parche | Enfoque |
|-------------------------|----------------------|---------|
| Servidores Linux (sysadmin) | Unattended-upgrades, dnf-automatic | Automatizado para parches de seguridad; manual para kernels |
| Kubernetes | Kured, node patching via CI | Parche de nodo durante ventanas de drenaje |
| Contenedores | Rebuild de imagen, rescan, redeploy | El parche está en la imagen base, no en el host |
| Bases de datos | Minor version upgrade, pg_upgrade | Respaldo obligatorio; testing en réplica primero |
| Dependencias de aplicación | Dependabot, Snyk, Renovate | PR automatizados con CI; merge semanal |
| Sistemas heredados | Parche manual con ventana de mantenimiento | Cambio de control riguroso; plan de rollback detallado |

## Lo que funciona

1. Automatiza parches de seguridad de bajo riesgo; los humanos se cansan de tareas repetitivas
2. Mantén un entorno de staging que refleje producción; testing inútil en entornos que difieren
3. Nunca parche sin rollback probado; si el parche rompe, no quieres depurar el rollback bajo presión
4. Programa parches durante las ventanas de menor tráfico, no solo "por la noche"
5. Documenta las excepciones; un CVE no aplicado es una decisión de riesgo que debe ser aprobada

## Errores Comunes

1. Aplicar parches en producción sin staging cuando la severidad lo permite
2. No verificar que el parche realmente mitigó el CVE (la versión más nueva no siempre lo hace)
3. Olvidar parchear dependencias de aplicación; solo actualizar el SO no es suficiente
4. No comunicar ventanas de mantenimiento a los equipos orientados al cliente
5. Tratar parches como tareas de baja prioridad; se acumulan y se vuelven difíciles de aplicar en masa

## Preguntas Frecuentes

### ¿Debería automatizar todos los parches?

No. Automatiza parches de seguridad de severidad baja y media que tienen un historial estable en tu entorno. Mantén control manual para parches de kernel, actualizaciones de base de datos y cualquier parche que requiera cambios de configuración. La automatización debe incluir smoke tests automatizados; nunca confíes ciegamente en el upstream.

### ¿Cómo manejo un parche que requiere reinicio?

Planifica reinicios durante ventanas de mantenimiento aprobadas. Para sistemas con alta disponibilidad, parche nodos uno a la vez (rolling restart). Para sistemas single-node, programa un downtime y notifica a los clientes con 48 horas de anticipación. Documenta el tiempo de reinicio en el plan de cambio.

### ¿Qué hago si un parche rompe mi aplicación?

Ejecuta el rollback documentado (snapshot, reverir versión, restaurar configuración). Luego reproduce el fallo en staging para entender la interacción. A veces la causa es una dependencia no documentada o un breaking change no reportado. Documenta la incompatibilidad y programa un parche alternativo o un workaround. Nunca dejes un sistema sin parchear indefinidamente; acepta el riesgo documentado o encuentra una solución alternativa.

## Soluciones Avanzadas

### Parcheo automatizado de SO con Ansible

Automatiza parches de seguridad en servidores Linux usando Ansible con actualizaciones rolling:

```yaml
---
- name: Apply security patches to Linux servers
  hosts: production_servers
  become: yes
  serial: 1    # Rolling: un servidor a la vez
  max_fail_percentage: 0

  pre_tasks:
    - name: Create rollback snapshot
      community.general.snap:
        name: "pre-patch-{{ ansible_date_time.iso8601 }}"
        state: present

  tasks:
    - name: Update apt cache and install security updates (Debian/Ubuntu)
      apt:
        update_cache: yes
        upgrade: dist
        only_upgrade: yes
      when: ansible_os_family == "Debian"
      register: apt_result

    - name: Install security updates (RHEL/CentOS)
      yum:
        name: "*"
        state: latest
        security: yes
      when: ansible_os_family == "RedHat"
      register: yum_result

    - name: Check if reboot is required (Debian/Ubuntu)
      stat:
        path: /var/run/reboot-required
      register: reboot_required
      when: ansible_os_family == "Debian"

    - name: Reboot server if required
      reboot:
        reboot_timeout: 300
      when: reboot_required.stat.exists | default(false)

    - name: Wait for server to recover
      wait_for_connection:
        delay: 10
        timeout: 300

  post_tasks:
    - name: Verify critical services are running
      service:
        name: "{{ item }}"
        state: started
      loop:
        - nginx
        - postgresql
        - redis

    - name: Run health check endpoint
      uri:
        url: "http://{{ inventory_hostname }}:8080/health"
        status_code: 200
        timeout: 10
      retries: 3
      delay: 5
```

### Pipeline de parcheo de imagenes de contenedor

Automatiza el parcheo de imagenes base Docker con un pipeline CI/CD:

```bash
#!/bin/bash
set -euo pipefail

IMAGE_NAME="myapp"
REGISTRY="registry.example.com"
NEW_BASE="node:20-slim"

# Pull latest base image
docker pull "$NEW_BASE"

# Build patched image
docker build \
  --build-arg BASE_IMAGE="$NEW_BASE" \
  -t "$REGISTRY/$IMAGE_NAME:patched-$(date +%Y%m%d)" \
  -t "$REGISTRY/$IMAGE_NAME:latest" \
  .

# Scan the new image for vulnerabilities
trivy image --exit-code 1 --severity HIGH,CRITICAL \
  "$REGISTRY/$IMAGE_NAME:patched-$(date +%Y%m%d)"

# Push patched image
docker push "$REGISTRY/$IMAGE_NAME:patched-$(date +%Y%m%d)"
docker push "$REGISTRY/$IMAGE_NAME:latest"

# Trigger rolling deployment in Kubernetes
kubectl set image deployment/myapp \
  "app=$REGISTRY/$IMAGE_NAME:patched-$(date +%Y%m%d)" \
  -n production

kubectl rollout status deployment/myapp -n production
```

### Live patching de kernel con kpatch

Aplica parches criticos de kernel sin reiniciar usando kpatch en RHEL/CentOS:

```bash
#!/bin/bash
set -euo pipefail

# Install kpatch utilities
yum install -y kpatch

# Check available live patches
kpatch list

# Load a specific kernel patch module
kpatch load "kpatch-$(uname -r)-CVE-2024-12345.ko"

# Verify patch is active
kpatch info "kpatch-$(uname -r)-CVE-2024-12345.ko"

# Enable patch to persist across reboots
systemctl enable kpatch.service

echo "Kernel patch applied without reboot. Verify with: kpatch list"
```

## Mejores Practicas Adicionales

1. **Usa despliegues canary para parches de SO.** En vez de parchear todos los servidores a la vez, parchea primero el 5% de tu flota. Monitorea tasas de error, latencia y uso de recursos por 24 horas antes de continuar:

```bash
# Patch canary instances only
ansible-playbook patch-security-updates.yml \
  --limit "production_canary_group" \
  --extra-vars "canary_mode=true"
```

2. **Rastrea la proveniencia de parches para auditorias.** Registra que parches se aplicaron, cuando, por quien y con que aprobacion. Esto crea evidencia para auditorias SOC 2 e ISO 27001:

```bash
# Generate patch audit report
ansible-playbook patch-security-updates.yml \
  --extra-vars "audit_log=/var/log/patch-audit/$(date +%Y%m%d).json"
```

## Errores Comunes Adicionales

1. **No testear parches de kernel en staging con hardware identico.** Los parches de kernel pueden causar fallos de drivers en hardware especifico. Testea en un servidor de staging con el mismo perfil de hardware antes de produccion:

```bash
# Verify kernel module compatibility after patch
lsmod | grep -E "(driver_name|module_name)"
dmesg | grep -i "error\|fail\|warning" | tail -20
```

2. **Olvidar parchear componentes de orquestacion de contenedores.** Los componentes de Kubernetes (kubelet, etcd, kube-proxy) tambien necesitan parcheo. Usa kubeadm para actualizar el cluster:

```bash
# Upgrade Kubernetes cluster components
kubeadm upgrade plan
kubeadm upgrade apply v1.30.0
kubectl drain node-1 --ignore-daemonsets
kubeadm upgrade node
kubectl uncordon node-1
```

## Preguntas Frecuentes Adicionales

### Como parcheo sistemas air-gapped?

Transfiere archivos de parche via medios removibles o un bastion host dedicado. Verifica la integridad de archivos con checksums SHA-256 antes de aplicar. Documenta cada parche en un inventario offline. Programa escaneos periodicos de vulnerabilidades usando un escaner offline como Nessus u OpenSCAP.

### Que es live patching y cuando debo usarlo?

Live patching aplica correcciones de seguridad del kernel sin reiniciar. Usalo para CVEs Criticos en sistemas de produccion donde los reinicios no son posibles inmediatamente (bases de datos single-instance, aplicaciones legacy). Live patching no es sustituto de mantenimiento programado: planifica un reinicio durante la proxima ventana para asegurar consistencia completa del kernel.
