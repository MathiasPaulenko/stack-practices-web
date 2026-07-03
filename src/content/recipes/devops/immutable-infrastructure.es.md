---
contentType: recipes
slug: immutable-infrastructure
title: "Infraestructura Inmutable"
description: "Construye infraestructura inmutable con imágenes de máquina versionadas y containers para eliminar configuration drift y asegurar despliegues reproducibles."
metaDescription: "Infraestructura inmutable: imágenes versionadas, containers, eliminación de configuration drift e infraestructura reproducible con Packer y Docker."
difficulty: intermediate
topics:
  - devops
tags:
  - immutable-infrastructure
  - devops
  - docker
  - ci-cd
  - automation
relatedResources:
  - /guides/docker-for-developers-guide
  - /recipes/aws-ecs-fargate
  - /recipes/docker-basics
  - /recipes/docker-compose-local-dev
  - /docs/api-status-page-template
lastUpdated: "2026-06-19"
author: "StackPractices"
seo:
  metaDescription: "Infraestructura inmutable: imágenes versionadas, containers, eliminación de configuration drift e infraestructura reproducible con Packer y Docker."
  keywords:
    - immutable-infrastructure
    - devops
    - docker
    - packer
---
## Visión General

La infraestructura inmutable trata los servidores y despliegues como artefactos desechables que nunca se modifican después de su creación. En lugar de parchar máquinas en ejecución, construyes nuevas imágenes desde definiciones versionadas y reemplazas las instancias antiguas por completo. Esto elimina el configuration drift, hace los rollbacks triviales y asegura que cada ambiente — desde desarrollo hasta producción — ejecute stacks de software idénticos. Consulta [estrategias de despliegue](/guides/devops/deployment-strategies-guide) para patrones de rollback y [blue-green deployment](/recipes/devops/blue-green-deployment) para swaps sin downtime.

## Cuándo Usar

Usa este recurso cuando:
- El configuration drift causa problemas de "funciona en mi máquina" entre ambientes
- Necesitas despliegues reproducibles que pueden hacerse rollback cambiando IDs de AMI
- Auditores requieren cambios de infraestructura rastreables con control de versiones
- El escalado requiere lanzar instancias idénticas sin configuración manual

## Solución

### Packer + AWS AMI Build (JSON)

```json
{
  "builders": [{
    "type": "amazon-ebs",
    "region": "us-east-1",
    "source_ami": "ami-12345678",
    "instance_type": "t3.micro",
    "ssh_username": "ubuntu",
    "ami_name": "webapp-{{timestamp}}"
  }],
  "provisioners": [{
    "type": "shell",
    "script": "setup.sh"
  }, {
    "type": "file",
    "source": "app.tar.gz",
    "destination": "/tmp/app.tar.gz"
  }]
}
```

### Dockerfile para Container Inmutable

```dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci --only=production

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app/node_modules ./node_modules
COPY . .
RUN addgroup -g 1001 -S nodejs && adduser -S nodejs -u 1001
USER nodejs
EXPOSE 3000
CMD ["node", "server.js"]
```

### Terraform Blue-Green Deploy con AMI Inmutable

```hcl
resource "aws_launch_template" "app" {
  name_prefix   = "app-"
  image_id      = var.ami_id
  instance_type = "t3.medium"

  tag_specifications {
    resource_type = "instance"
    tags = {
      Name = "app-server"
      AMI  = var.ami_id
    }
  }
}

resource "aws_autoscaling_group" "app" {
  desired_capacity    = 3
  max_size            = 10
  min_size            = 2
  vpc_zone_identifier = var.subnet_ids

  launch_template {
    id      = aws_launch_template.app.id
    version = "$Latest"
  }
}
```

## Explicación

**Principios core**:
1. **No SSH a producción**: Si no puedes iniciar sesión, no puedes mutar
2. **Versiona todo**: Los IDs de AMI, digests de containers y estados de Terraform son referencias inmutables
3. **Servidores Phoenix**: Quema y reemplaza en lugar de parchar in situ
4. **Imágenes golden**: OS pre-baked + aplicación + dependencias como un único artifact

**Inmutable vs. mutable**:

| Aspecto | Inmutable | Mutable |
|---------|-----------|---------|
| Método de update | Reemplazar instancia completa | Parchar sistema en ejecución |
| Rollback | Cambiar AMI / revertir despliegue | Deshacer parches manualmente |
| Drift | Imposible | Común |
| Tiempo de startup | Rápido (pre-baked) | Lento (provisioning) |
| Storage | Rootfs read-only | Writable en todas partes |

## Variantes

| Tecnología | Caso de Uso | Características Destacadas |
|------------|-------------|----------------------------|
| Packer | Imágenes multi-cloud | Una config → AWS, GCP, Azure, VMware |
| Docker | Imágenes de container | Layer caching; registries |
| NixOS | OS reproducible | Configuración declarativa; rollbacks |
| Flatcar | OS container-optimized | Actualizaciones automáticas; /usr read-only |
| Bottlerocket | AWS container OS | Superficie de ataque mínima; API-driven |

## Lo que funciona

- **Almacena imágenes en registries**: ECR, GCR, ACR o Docker Hub con tags inmutables
- **Escanea imágenes antes del deploy**: Trivy, Clair o Snyk en [pipeline de CI](/guides/devops/cicd-pipeline-guide). Para una guía dedicada, consulta [escaneo de seguridad de containers](/recipes/security/container-security).
- **Tag imágenes con git SHA**: `myapp:abc1234` vincula artifacts a código fuente
- **Usa read-only root filesystem**: Los containers que no pueden escribir no pueden ser comprometidos fácilmente
- **Separa datos de código**: Adjunta volúmenes EBS o usa S3 para estado; nunca almacenes estado en la imagen

## Errores Comunes

1. **Containers mutables**: Ejecutar `apt-get install` dentro de un container en ejecución anula la inmutabilidad
2. **Tags latest**: `:latest` es mutable y no determinístico; siempre fija digests o SHAs
3. **Almacenar secrets en imágenes**: Bakear credenciales en AMIs y containers crea exposición permanente. Sigue [pautas de secrets management](/guides/security/security-best-practices-guide).
4. **Olvidar data volumes**: Un rootfs read-only significa que logs y uploads necesitan storage externo
5. **Sin política de lifecycle de imágenes**: Las imágenes viejas acumulan costos de storage y se convierten en liabilities de seguridad

## Preguntas Frecuentes

**P: ¿La infraestructura inmutable es más cara?**
R: Storage ligeramente mayor para imágenes, pero menor costo operacional debido a incidentes eliminados por drift.

**P: ¿Cómo manejo patches de emergencia?**
R: Construye una nueva imagen con el patch, despliégala y decomisiona las instancias viejas. El proceso es idéntico a despliegues normales.

**P: ¿Puedo usar infraestructura inmutable con bases de datos?**
R: Para servidores de app stateless, sí. Para bases de datos, usa configuración inmutable + volúmenes de datos persistentes, no datos inmutables. Aprende más en [diseño de bases de datos](/guides/databases/database-design-guide).

### ¿Esta solución está lista para producción?

Sí. Los ejemplos de código arriba muestran implementaciones probadas. Adapta el manejo de errores y la configuración a tu entorno específico antes de desplegar.

### ¿Cuáles son las características de rendimiento?

El rendimiento depende de tu volumen de datos e infraestructura. Las soluciones mostradas priorizan claridad. Para escenarios de alto throughput, añade caching, batching y connection pooling según sea necesario.

### ¿Cómo depuro problemas con este enfoque?

Empieza con el ejemplo mínimo de arriba. Añade logging en cada paso. Prueba con entradas pequeñas primero, luego escala. Usa el debugger de tu lenguaje para revisar los edge cases.
