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

Immutable infrastructure treats servers and deployments as disposable artifacts that are never modified after creation. Instead of patching running machines, you build new images from versioned definitions and replace old instances entirely. This eliminates configuration drift, makes rollbacks trivial, and ensures every environment — from development to production — runs identical software stacks. See [deployment strategies](/guides/deployment-strategies-guide) for rollback patterns and [blue-green deployment](/recipes/blue-green-deployment) for zero-downtime swaps.

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

| Technology | Use Case | Notable Features |
|------------|----------|------------------|
| Packer | Multi-cloud images | One config → AWS, GCP, Azure, VMware |
| Docker | Container images | Layer caching; registries |
| NixOS | Reproducible OS | Declarative system config; rollbacks |
| Flatcar | Container-optimized OS | Automatic updates; read-only /usr |
| Bottlerocket | AWS container OS | Minimal attack surface; API-driven |

## Best Practices

- **Store images in registries**: ECR, GCR, ACR, or Docker Hub with immutable tags
- **Scan images before deploy**: Trivy, Clair, or Snyk in [CI pipeline](/guides/cicd-pipeline-guide). For a dedicated guide, see [container security scanning](/recipes/container-security).
- **Tag images with git SHA**: `myapp:abc1234` links artifacts to source code
- **Use read-only root filesystems**: Containers that can't write can't be easily compromised
- **Separate data from code**: Attach EBS volumes or use S3 for state; never store state in the image

## Common Mistakes

1. **Mutable containers**: Running `apt-get install` inside a running container defeats immutability
2. **Latest tags**: `:latest` is mutable and non-deterministic; always pin digests or SHAs
3. **Storing secrets in images**: Bake credentials into AMIs and containers create permanent exposure. Follow [secrets management best practices](/guides/secrets-management-guide).
4. **Forgetting data volumes**: Read-only rootfs means logs and uploads need external storage
5. **No image lifecycle policy**: Old images accumulate storage costs and become security liabilities

## Frequently Asked Questions

**Q: Is immutable infrastructure more expensive?**
A: Slightly higher storage for images, but lower operational cost due to eliminated drift-related incidents.

**Q: How do I handle emergency patches?**
A: Build a new image with the patch, deploy it, and decommission old instances. The process is identical to normal deployments.

**Q: Can I use immutable infrastructure with databases?**
A: For stateless app servers, yes. For databases, use immutable configuration + persistent data volumes, not immutable data. Learn more in [database design](/guides/database-design-guide).
