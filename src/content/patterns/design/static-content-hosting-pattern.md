---
contentType: patterns
slug: static-content-hosting-pattern
title: "Static Content Hosting Pattern"
description: "Deploy static files to a dedicated content delivery network or object storage to offload origin servers, reduce latency, and improve availability for assets like images, CSS, and JavaScript."
metaDescription: "Learn the Static Content Hosting Pattern for serving assets from object storage. Examples in Python, Java, and JavaScript with S3, CloudFront, and CDN configuration."
difficulty: beginner
topics:
  - design
  - architecture
  - frontend
tags:
  - static-content-hosting
  - pattern
  - design-pattern
  - cdn
  - s3
  - cloudfront
  - object-storage
  - frontend
relatedResources:
  - /patterns/design/content-delivery-network-pattern
  - /patterns/design/sharding-pattern
lastUpdated: "2026-06-26"
author: "StackPractices"
seo:
  metaDescription: "Learn the Static Content Hosting Pattern for serving assets from object storage. Examples in Python, Java, and JavaScript with S3, CloudFront, and CDN configuration."
  keywords:
    - static content hosting
    - design pattern
    - cdn
    - s3
    - cloudfront
    - object storage
    - frontend
---

# Static Content Hosting Pattern

## Overview

The Static Content Hosting Pattern deploys static files — images, CSS, JavaScript, fonts, videos, PDFs — to dedicated storage and serves them through a Content Delivery Network (CDN) rather than from the application origin server. This offloads origin servers from serving large, cacheable files and reduces latency by placing content geographically closer to users.

Static assets do not change per request and require no server-side processing. By separating them from dynamic application logic, the origin server can focus on business logic while the CDN handles high-volume, cache-friendly content delivery.

## When to Use

- Serving images, videos, documents, or other large binary files
- Static website hosting (marketing sites, documentation, blogs)
- JavaScript and CSS bundles for SPAs
- File uploads that users need to download (exports, reports, invoices)
- Reducing origin server bandwidth and compute costs
- Improving page load times by caching assets at edge locations

## When to Avoid

- Files that change on every request and cannot be cached
- Content requiring authentication or authorization checks on every access
- Small applications where origin server overhead is negligible
- Dynamic HTML that must be rendered per user
- Environments where CDN costs exceed origin bandwidth savings

## Solution

### Python (Upload to S3 with Boto3)

```python
import boto3
import mimetypes
from botocore.exceptions import ClientError
import hashlib

class StaticAssetManager:
    """Manage static asset uploads to S3 with CDN integration"""

    def __init__(self, bucket_name, cdn_domain=None, region='us-east-1'):
        self.s3 = boto3.client('s3', region_name=region)
        self.bucket = bucket_name
        self.cdn_domain = cdn_domain or f"{bucket_name}.s3.amazonaws.com"

    def upload_asset(self, local_path: str, s3_key: str,
                     metadata: dict = None) -> str:
        """Upload a file to S3 and return the CDN URL"""
        content_type, _ = mimetypes.guess_type(local_path)
        content_type = content_type or 'application/octet-stream'

        extra_args = {
            'ContentType': content_type,
            'CacheControl': 'public, max-age=31536000, immutable',
            'ACL': 'public-read'
        }

        if metadata:
            extra_args['Metadata'] = metadata

        # Calculate ETag for cache validation
        with open(local_path, 'rb') as f:
            etag = hashlib.md5(f.read()).hexdigest()
            f.seek(0)
            self.s3.upload_fileobj(f, self.bucket, s3_key, ExtraArgs=extra_args)

        return f"https://{self.cdn_domain}/{s3_key}"

    def upload_with_versioning(self, local_path: str, base_key: str) -> str:
        """Upload with content hash in filename for cache busting"""
        with open(local_path, 'rb') as f:
            file_hash = hashlib.md5(f.read()).hexdigest()[:8]

        # app.abc12345.js — immutable, cache forever
        versioned_key = f"{base_key}.{file_hash}.js"
        return self.upload_asset(local_path, versioned_key)

    def invalidate_cache(self, path: str):
        """Invalidate CDN cache for a specific path"""
        if not self.cdn_domain:
            return

        cloudfront = boto3.client('cloudfront')
        # Requires distribution ID configuration
        # cloudfront.create_invalidation(...)
        pass

    def generate_presigned_url(self, s3_key: str, expiration=3600) -> str:
        """Generate temporary access URL for private content"""
        return self.s3.generate_presigned_url(
            'get_object',
            Params={'Bucket': self.bucket, 'Key': s3_key},
            ExpiresIn=expiration
        )

# Usage
manager = StaticAssetManager(
    bucket_name='myapp-assets',
    cdn_domain='cdn.myapp.com'
)

# Upload with far-future caching
url = manager.upload_asset('dist/app.js', 'js/app.js')
# Returns: https://cdn.myapp.com/js/app.js

# Upload versioned bundle
versioned_url = manager.upload_with_versioning('dist/app.js', 'js/app')
# Returns: https://cdn.myapp.com/js/app.abc12345.js
```

### Java (Spring with S3 and CloudFront)

```java
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.core.sync.RequestBody;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.nio.file.Paths;
import java.util.Map;

@Service
public class StaticContentService {

    private final S3Client s3Client;
    private final String bucketName;
    private final String cdnDomain;

    public StaticContentService(S3Client s3Client, String bucketName, String cdnDomain) {
        this.s3Client = s3Client;
        this.bucketName = bucketName;
        this.cdnDomain = cdnDomain;
    }

    public String uploadAsset(MultipartFile file, String path) throws IOException {
        String contentType = file.getContentType();
        String key = "assets/" + path;

        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .contentType(contentType)
            .cacheControl("public, max-age=31536000, immutable")
            .acl(ObjectCannedACL.PUBLIC_READ)
            .build();

        s3Client.putObject(request, RequestBody.fromBytes(file.getBytes()));
        return "https://" + cdnDomain + "/" + key;
    }

    public String uploadVersionedBundle(byte[] content, String filename) {
        // Add content hash for cache busting
        String hash = computeHash(content);
        String versionedName = filename.replace(".", "_" + hash + ".");
        String key = "js/" + versionedName;

        PutObjectRequest request = PutObjectRequest.builder()
            .bucket(bucketName)
            .key(key)
            .contentType("application/javascript")
            .cacheControl("public, max-age=31536000, immutable")
            .build();

        s3Client.putObject(request, RequestBody.fromBytes(content));
        return "https://" + cdnDomain + "/" + key;
    }

    private String computeHash(byte[] content) {
        // Simplified — use a proper hash in production
        return Integer.toHexString(content.length);
    }
}
```

### JavaScript (Upload to Cloud Storage with Signed URLs)

```javascript
const { Storage } = require('@google-cloud/storage');
const crypto = require('crypto');

class StaticContentManager {
    constructor(config) {
        this.storage = new Storage({ projectId: config.projectId });
        this.bucket = this.storage.bucket(config.bucketName);
        this.cdnBase = config.cdnBaseUrl || `https://storage.googleapis.com/${config.bucketName}`;
    }

    async uploadFile(localPath, destinationPath, options = {}) {
        const contentType = options.contentType || 'application/octet-stream';
        const cacheControl = options.cacheControl || 'public, max-age=31536000';

        await this.bucket.upload(localPath, {
            destination: destinationPath,
            contentType,
            cacheControl,
            metadata: {
                cacheControl,
            },
        });

        // Make publicly accessible
        if (options.public !== false) {
            await this.bucket.file(destinationPath).makePublic();
        }

        return `${this.cdnBase}/${destinationPath}`;
    }

    async uploadVersionedAsset(content, basePath) {
        // Content-addressable storage: hash determines filename
        const hash = crypto.createHash('sha256')
            .update(content)
            .digest('hex')
            .substring(0, 12);

        const ext = basePath.split('.').pop();
        const versionedPath = basePath.replace(`.${ext}`, `.${hash}.${ext}`);

        const file = this.bucket.file(versionedPath);
        await file.save(content, {
            contentType: this.getContentType(ext),
            cacheControl: 'public, max-age=31536000, immutable',
        });

        await file.makePublic();
        return `${this.cdnBase}/${versionedPath}`;
    }

    async generateSignedUrl(filePath, expirationMinutes = 60) {
        const [url] = await this.bucket.file(filePath).getSignedUrl({
            action: 'read',
            expires: Date.now() + expirationMinutes * 60 * 1000,
        });
        return url;
    }

    getContentType(ext) {
        const types = {
            js: 'application/javascript',
            css: 'text/css',
            png: 'image/png',
            jpg: 'image/jpeg',
            svg: 'image/svg+xml',
            pdf: 'application/pdf',
        };
        return types[ext] || 'application/octet-stream';
    }
}

module.exports = { StaticContentManager };
```

## Explanation

The pattern separates **dynamic** and **static** content paths:

- **Dynamic requests:** User-specific HTML, API calls, business logic — served from the origin application server.
- **Static requests:** Images, CSS, JS, fonts, documents — served from object storage via a CDN.

CDN edge servers cache static content geographically close to users. The first request for a file fetches it from the origin (S3, GCS, Azure Blob) and caches it. Subsequent requests from nearby users are served directly from the edge cache, often in under 50ms.

## Variants

| Variant | Hosting | Best For |
|---------|---------|----------|
| **S3 + CloudFront** | AWS object storage + CDN | AWS-native applications |
| **GCS + Cloud CDN** | Google Cloud Storage + CDN | GCP-native applications |
| **Azure Blob + CDN** | Azure Storage + Azure CDN | Azure-native applications |
| **GitHub Pages** | Static site from Git repo | Documentation, open source sites |
| **Vercel/Netlify** | Jamstack hosting | SPAs, static marketing sites |

## Best Practices

- **Use far-future cache headers.** `Cache-Control: public, max-age=31536000, immutable` tells browsers and CDNs to cache forever. Combine with versioned filenames for cache busting.
- **Version static assets.** Append a content hash to filenames (`app.abc123.js`). When content changes, the URL changes, avoiding stale cache issues.
- **Compress assets.** Enable Gzip/Brotli compression on the CDN. Pre-compress text assets (CSS, JS, SVG) before upload.
- **Use a custom domain.** `cdn.myapp.com` looks more professional than `d1234.cloudfront.net` and allows DNS-level control.
- **Enable HTTPS.** All modern CDNs provide free TLS certificates. Never serve static assets over HTTP.

## Common Mistakes

- **No cache headers.** Without `Cache-Control`, browsers re-request assets on every page load, defeating the purpose.
- **Mutating assets in-place.** Updating `app.js` without changing its filename causes stale caches across the globe. Always version assets.
- **Serving large videos through the CDN without optimization.** Use adaptive bitrate streaming (HLS/DASH) for video content rather than serving raw MP4 files.
- **Ignoring CORS headers.** Web fonts and certain API calls require proper `Access-Control-Allow-Origin` headers.
- **Forgetting to invalidate on errors.** If a corrupted file is cached with a long TTL, users see it until it expires or is manually invalidated.

## Real-World Examples

### Netflix

Netflix serves its entire UI (HTML, CSS, JS) and billions of video streams through CDNs. Video files are encoded into multiple quality levels and distributed to edge servers worldwide. The origin servers only handle authentication and recommendation APIs.

### Shopify

Shopify merchants' product images, theme assets, and storefront files are automatically uploaded to Shopify's CDN. Each image is optimized, resized into multiple variants, and cached at edge locations to ensure fast storefront loading globally.

### GitHub

GitHub serves raw file content, release assets, and repository archives through its CDN. When you download a release ZIP or view a raw file, it is served from edge caches rather than GitHub's application servers.

## Frequently Asked Questions

**Q: Should I put my entire SPA on a CDN?**
A: Yes — the HTML, CSS, JS, and static assets should be CDN-hosted. API calls go to your origin server. This is the standard architecture for modern SPAs.

**Q: How do I handle private/static content that requires authentication?**
A: Use signed URLs or cookies. The CDN validates the signature before serving the file. Alternatively, serve private files from the origin server and only public files from the CDN.

**Q: What is the difference between a CDN and object storage?**
A: Object storage (S3, GCS) is the source of truth for files. A CDN caches copies of those files at edge locations worldwide. You need both: storage for persistence, CDN for fast delivery.

**Q: How much does using a CDN cost?**
A: Most CDNs charge per GB transferred. For typical web applications, CDN costs are negligible compared to origin bandwidth savings. Many providers offer generous free tiers.

**Q: Can I use a CDN for dynamic content?**
A: Limited — CDNs cache based on URL. Dynamic content that changes per user should not be cached unless using edge functions (Cloudflare Workers, Lambda@Edge) for personalization.
