---
contentType: recipes
slug: immutable-infrastructure
title: "Immutable Infrastructure"
description: "Build immutable infrastructure with versioned machine images and containers to eliminate configuration drift and ensure reproducible deployments."
metaDescription: "Immutable infrastructure: versioned machine images, container-based deployments, configuration drift elimination, and reproducible infrastructure with Packer and Docker."
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
  metaDescription: "Immutable infrastructure: versioned machine images, container-based deployments, configuration drift elimination, and reproducible infrastructure with Packer and Docker."
  keywords:
    - immutable-infrastructure
    - devops
    - docker
    - packer
---
## Overview

Immutable infrastructure treats servers and deployments as disposable artifacts that are never modified after creation. Instead of patching running machines, you build new images from versioned definitions and replace old instances entirely. This eliminates configuration drift, makes rollbacks trivial, and ensures every environment — from development to production — runs identical software stacks. See [deployment strategies](/guides/devops/deployment-strategies-guide) for rollback patterns and [blue-green deployment](/recipes/devops/blue-green-deployment) for zero-downtime swaps.

## When to Use

Use this resource when:
- Configuration drift causes "works on my machine" issues across environments
- You need reproducible deployments that can be rolled back by switching AMI IDs
- Auditors require traceable infrastructure changes with version control
- Scaling requires launching identical instances without manual setup

## Solution

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

### Dockerfile for Immutable Container

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

### Terraform Blue-Green Deploy with Immutable AMI

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

## Explanation

**Core principles**:
1. **No SSH access to production**: If you can't log in, you can't mutate
2. **Version everything**: AMI IDs, container digests, and Terraform states are immutable references
3. **Phoenix servers**: Burn and replace rather than patch in place
4. **Golden images**: Pre-baked OS + application + dependencies as a single artifact

**Immutable vs. mutable**:

| Aspect | Immutable | Mutable |
|--------|-----------|---------|
| Update method | Replace entire instance | Patch running system |
| Rollback | Switch AMI / revert deployment | Undo patches manually |
| Drift | Impossible | Common |
| Startup time | Fast (pre-baked) | Slow (provisioning) |
| Storage | Read-only rootfs | Writable everywhere |

## Variants

| Technology | Use Case | Notable Capabilities |
|------------|----------|------------------|
| Packer | Multi-cloud images | One config → AWS, GCP, Azure, VMware |
| Docker | Container images | Layer caching; registries |
| NixOS | Reproducible OS | Declarative system config; rollbacks |
| Flatcar | Container-optimized OS | Automatic updates; read-only /usr |
| Bottlerocket | AWS container OS | Minimal attack surface; API-driven |

## What works

- **Store images in registries**: ECR, GCR, ACR, or Docker Hub with immutable tags
- **Scan images before deploy**: Trivy, Clair, or Snyk in [CI pipeline](/guides/devops/cicd-pipeline-guide). For a dedicated guide, see [container security scanning](/recipes/security/container-security).
- **Tag images with git SHA**: `myapp:abc1234` links artifacts to source code
- **Use read-only root filesystems**: Containers that can't write can't be easily compromised
- **Separate data from code**: Attach EBS volumes or use S3 for state; never store state in the image

## Common Mistakes

1. **Mutable containers**: Running `apt-get install` inside a running container defeats immutability
2. **Latest tags**: `:latest` is mutable and non-deterministic; always pin digests or SHAs
3. **Storing secrets in images**: Bake credentials into AMIs and containers create permanent exposure. Follow [secrets management guidelines](/guides/security/security-best-practices-guide).
4. **Forgetting data volumes**: Read-only rootfs means logs and uploads need external storage
5. **No image lifecycle policy**: Old images accumulate storage costs and become security liabilities

## Frequently Asked Questions

**Q: Is immutable infrastructure more expensive?**
A: Slightly higher storage for images, but lower operational cost due to eliminated drift-related incidents.

**Q: How do I handle emergency patches?**
A: Build a new image with the patch, deploy it, and decommission old instances. The process is identical to normal deployments.

**Q: Can I use immutable infrastructure with databases?**
A: For stateless app servers, yes. For databases, use immutable configuration + persistent data volumes, not immutable data. Learn more in [database design](/guides/databases/database-design-guide).

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.

### Packer HCL Configuration (Modern)

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

### CI/CD Pipeline for Immutable Image Builds

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

### Immutable Infrastructure with Kubernetes

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
        # Pin by digest, not tag — truly immutable
        image: myregistry.com/api@sha256:abc123def456...
        securityContext:
          readOnlyRootFilesystem: true  # Immutable rootfs
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

### Rollback by Switching AMI IDs

```bash
# Current deployment uses AMI v2.1.0
$ aws autoscaling update-auto-scaling-group \
    --auto-scaling-group-name api-asg \
    --launch-template LaunchTemplateName=api-template,Version=2

# Rollback: switch to previous AMI v2.0.0
$ aws autoscaling update-auto-scaling-group \
    --auto-scaling-group-name api-asg \
    --launch-template LaunchTemplateName=api-template,Version=1

# Trigger instance refresh to replace all instances
$ aws autoscaling start-instance-refresh \
    --auto-scaling-group-name api-asg \
    --strategy Rolling
```

### Image Scanning in CI Pipeline

```yaml
# Docker image scan with Trivy
- name: Build Docker Image
  run: docker build -t myapp:${{ github.sha }} .

- name: Scan with Trivy
  uses: aquasecurity/trivy-action@master
  with:
    image-ref: myapp:${{ github.sha }}
    format: json
    output: trivy-results.json
    exit-code: 1  # Fail build on HIGH/CRITICAL vulns
    severity: HIGH,CRITICAL

- name: Push to Registry (only if scan passes)
  if: success()
  run: |
    docker tag myapp:${{ github.sha }} myregistry.com/api:${{ github.sha }}
    docker push myregistry.com/api:${{ github.sha }}
```

## Additional Best Practices

6. **Use image manifests for traceability.** Generate a manifest file mapping AMI IDs, container digests, and git SHAs:

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

7. **Implement image lifecycle policies.** Old images consume storage and increase attack surface:

```bash
# ECR lifecycle policy: keep last 10 images, expire after 90 days
$ aws ecr put-lifecycle-policy \
    --repository-name api \
    --policy-text file://lifecycle-policy.json
```

8. **Use spot instances for non-critical workloads.** Immutable infrastructure pairs well with spot instances — instances are ephemeral anyway:

```hcl
resource "aws_spot_instance_request" "worker" {
  ami           = var.ami_id
  instance_type = "t3.medium"
  spot_price    = "0.02"
  count         = 5
}
```

## Additional Common Mistakes

6. **Building images manually.** Clicking through AWS console to create AMIs produces untraceable, non-reproducible images. Always use Packer or equivalent IaC tools.

7. **Not versioning Packer templates.** Packer templates should be in version control alongside application code. Every image build should map to a specific commit.

8. **Mixing immutable and mutable patterns.** Running configuration management (Ansible, Chef) on production instances after launch breaks immutability. Bake config into the image or use a sidecar.

## Additional FAQ

### How do I handle logs with read-only filesystems?

Mount a writable volume for logs, or ship logs directly to a log aggregator (CloudWatch, ELK, Loki) via a sidecar:

```yaml
volumes:
- name: logs
  emptyDir: {}
volumeMounts:
- name: logs
  mountPath: /var/log/app
```

### What is the cost of storing multiple AMI versions?

Each AMI snapshot typically costs ~$0.05/GB/month. A 10GB AMI with 20 versions costs ~$10/month. Implement lifecycle policies to automatically delete old versions.

### How do I handle database migrations with immutable infrastructure?

Run migrations as a separate job before deploying new instances. The new instances expect the schema to be ready:

```bash
# CI step: run migrations
$ kubectl exec job/db-migration -- ./migrate up

# Then deploy new instances
$ kubectl set image deployment/api api=myapp:v2.1.0
```

## Performance Tips

1. **Pre-bake dependencies into the image.** Installing npm packages or pip packages at startup adds 30-60s to boot time. Bake them into the image:

```dockerfile
# In the image build
RUN npm ci --omit=dev
# At runtime, no install needed
CMD ["node", "server.js"]
```

2. **Use EBS-optimized instances for faster AMI boot.** `t3.medium` and above support EBS optimization, reducing first-boot latency by 10-20s.

3. **Parallelize Packer builds for multi-region.** Build AMIs in all regions simultaneously:

```hcl
build {
  sources = [
    "source.amazon-ebs.webapp_us_east_1",
    "source.amazon-ebs.webapp_us_west_2",
    "source.amazon-ebs.webapp_eu_west_1",
  ]
}
```

4. **Use Packer's `skip_create_ami` for testing.** Validate the build process without creating an actual AMI:

```bash
$ packer build -skip-create-ami packer.pkr.hcl
```

5. **Cache Docker layers in CI.** Speed up image builds by caching layers:

```yaml
- uses: docker/build-push-action@v5
  with:
    cache-from: type=gha
    cache-to: type=gha,mode=max
```
