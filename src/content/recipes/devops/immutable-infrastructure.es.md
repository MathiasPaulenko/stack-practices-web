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

### Configuración Packer HCL (Moderna)

```hcl
# packer.pkr.hcl
source "amazon-ebs" "webapp" {
  region          = "us-east-1"
  source_ami      = "ami-0c7217cdde317cfec"  # Ubuntu 22.04 LTS
  instance_type   = "t3.micro"
  ssh_username    = "ubuntu"
  ami_name        = "webapp-{{timestamp}}"
  ami_description = "WebApp v2.1.0 built with Packer"

  tags = {
    Name    = "webapp-ami"
    Version = "2.1.0"
    BuiltBy = "packer"
  }
}

build {
  sources = ["source.amazon-ebs.webapp"]

  provisioner "shell" {
    script = "setup.sh"
  }

  provisioner "file" {
    source      = "app.tar.gz"
    destination = "/tmp/app.tar.gz"
  }

  provisioner "shell" {
    inline = [
      "cd /tmp && tar xzf app.tar.gz -C /opt/app",
      "systemctl enable webapp",
      "rm -f /tmp/app.tar.gz",
    ]
  }

  post-processor "manifest" {
    output = "manifest.json"
  }
}
```

### Pipeline CI/CD para Builds de Imágenes Inmutables

```yaml
# .github/workflows/build-ami.yml
name: Build AMI
on:
  push:
    tags: ["v*"]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS Credentials
        uses: aws-actions/configure-aws-credentials@v4
        with:
          aws-access-key-id: ${{ secrets.AWS_ACCESS_KEY_ID }}
          aws-secret-access-key: ${{ secrets.AWS_SECRET_ACCESS_KEY }}
          aws-region: us-east-1

      - name: Install Packer
        run: |
          curl -fsSL https://apt.releases.hashicorp.com/gpg | sudo gpg --dearmor -o /usr/share/keyrings/hashicorp-archive-keyring.gpg
          echo "deb [signed-by=/usr/share/keyrings/hashicorp-archive-keyring.gpg] https://apt.releases.hashicorp.com $(lsb_release -cs) main" | sudo tee /etc/apt/sources.list.d/hashicorp.list
          sudo apt-get update && sudo apt-get install packer

      - name: Initialize Packer
        run: packer init .

      - name: Validate Template
        run: packer validate -syntax-only packer.pkr.hcl

      - name: Build AMI
        run: packer build -var "git_sha=${{ github.sha }}" packer.pkr.hcl

      - name: Output AMI ID
        run: |
          AMI_ID=$(jq -r '.builds[-1].artifact_id' manifest.json | cut -d: -f2)
          echo "AMI_ID=$AMI_ID" >> $GITHUB_ENV
          echo "Built AMI: $AMI_ID"
```

### Infraestructura Inmutable con Kubernetes

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api-server
spec:
  replicas: 3
  strategy:
    type: RollingUpdate
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
      - name: api
        # Fijar por digest, no por tag — verdaderamente inmutable
        image: myregistry.com/api@sha256:abc123def456...
        securityContext:
          readOnlyRootFilesystem: true  # Rootfs inmutable
          runAsNonRoot: true
          runAsUser: 1000
        volumeMounts:
        - name: tmp
          mountPath: /tmp
        - name: cache
          mountPath: /app/cache
      volumes:
      - name: tmp
        emptyDir: {}
      - name: cache
        emptyDir: {}
```

### Rollback Cambiando AMI IDs

```bash
# Deployment actual usa AMI v2.1.0
$ aws autoscaling update-auto-scaling-group \
    --auto-scaling-group-name api-asg \
    --launch-template LaunchTemplateName=api-template,Version=2

# Rollback: cambiar a AMI anterior v2.0.0
$ aws autoscaling update-auto-scaling-group \
    --auto-scaling-group-name api-asg \
    --launch-template LaunchTemplateName=api-template,Version=1

# Trigger instance refresh para reemplazar todas las instancias
$ aws autoscaling start-instance-refresh \
    --auto-scaling-group-name api-asg \
    --strategy Rolling
```

### Escaneo de Imágenes en Pipeline CI

```yaml
# Escaneo de imagen Docker con Trivy
- name: Build Docker Image
  run: docker build -t myapp:${{ github.sha }} .

- name: Scan with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:${{ github.sha }}
    format: json
    output: trivy-results.json
    exit-code: 1  # Fallar build en vulns HIGH/CRITICAL
    severity: HIGH,CRITICAL

- name: Push to Registry (solo si el escaneo pasa)
  if: success()
  run: |
    docker tag myapp:${{ github.sha }} myregistry.com/api:${{ github.sha }}
    docker push myregistry.com/api:${{ github.sha }}
```

## Mejores Prácticas Adicionales

6. **Usa manifiestos de imagen para trazabilidad.** Genera un archivo manifiesto que mapee AMI IDs, container digests y git SHAs:

```json
{
  "version": "2.1.0",
  "git_sha": "abc1234",
  "built_at": "2024-06-20T10:00:00Z",
  "artifacts": {
    "ami_id": "ami-0123456789abcdef0",
    "container_digest": "sha256:abc123...",
    "terraform_state": "s3://tf-state/prod/2.1.0"
  }
}
```

7. **Implementa políticas de lifecycle de imágenes.** Las imágenes viejas consumen storage y aumentan la superficie de ataque:

```bash
# Política de lifecycle ECR: mantener últimas 10 imágenes, expirar después de 90 días
$ aws ecr put-lifecycle-policy \
    --repository-name api \
    --policy-text file://lifecycle-policy.json
```

8. **Usa spot instances para workloads no críticos.** La infraestructura inmutable se combina bien con spot instances — las instancias son efímeras de todos modos:

```hcl
resource "aws_spot_instance_request" "worker" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  spot_price    = "0.02"
  count         = 5
}
```

## Errores Comunes Adicionales

6. **Construir imágenes manualmente.** Clickear por la consola de AWS para crear AMIs produce imágenes no trazables y no reproducibles. Siempre usa Packer o herramientas IaC equivalentes.

7. **No versionar templates de Packer.** Los templates de Packer deberían estar en version control junto con el código de la aplicación. Cada build de imagen debería mapear a un commit específico.

8. **Mezclar patrones inmutables y mutables.** Ejecutar configuration management (Ansible, Chef) en instancias de producción después del lanzamiento rompe la inmutabilidad. Bakea la config en la imagen o usa un sidecar.

## FAQ Adicional

### ¿Cómo manejo logs con filesystems de solo lectura?

Monta un volumen escribible para logs, o envía logs directamente a un agregador de logs (CloudWatch, ELK, Loki) vía un sidecar:

```yaml
volumes:
- name: logs
  emptyDir: {}
volumeMounts:
- name: logs
  mountPath: /var/log/app
```

### ¿Cuál es el costo de almacenar múltiples versiones de AMI?

Cada snapshot de AMI típicamente cuesta ~$0.05/GB/mes. Un AMI de 10GB con 20 versiones cuesta ~$10/mes. Implementa políticas de lifecycle para eliminar automáticamente versiones viejas.

### ¿Cómo manejo migraciones de base de datos con infraestructura inmutable?

Ejecuta migraciones como un job separado antes de desplegar nuevas instancias. Las nuevas instancias esperan que el schema esté listo:

```bash
# Step de CI: ejecutar migraciones
$ kubectl exec job/db-migration -- ./migrate up

# Luego desplegar nuevas instancias
$ kubectl set image deployment/api api=myapp:v2.1.0
```

## Tips de Rendimiento

1. **Pre-bakea dependencias en la imagen.** Instalar paquetes npm o pip en startup añade 30-60s al tiempo de boot. Bakearlos en la imagen:

```dockerfile
# En el build de la imagen
RUN npm ci --omit=dev
# En runtime, no se necesita instalación
CMD ["node", "server.js"]
```

2. **Usa instancias EBS-optimized para boot de AMI más rápido.** `t3.medium` y superior soportan EBS optimization, reduciendo latencia de first-boot en 10-20s.

3. **Paraleliza builds de Packer para multi-región.** Construye AMIs en todas las regiones simultáneamente:

```hcl
build {
  sources = [
    "source.amazon-ebs.webapp_us_east_1",
    "source.amazon-ebs.webapp_us_west_2",
    "source.amazon-ebs.webapp_eu_west_1",
  ]
}
```

4. **Usa `skip_create_ami` de Packer para testing.** Valida el proceso de build sin crear un AMI real:

```bash
$ packer build -skip-create-ami packer.pkr.hcl
```

5. **Cachea capas de Docker en CI.** Acelera builds de imágenes cacheando capas:

```yaml
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```
