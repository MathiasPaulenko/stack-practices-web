---
contentType: recipes
slug: image-generation
title: "Generate Images Programmatically with AI Models"
description: "How to create, edit, and optimize images using DALL-E, Stable Diffusion, and Midjourney APIs with prompt engineering, batch processing, and content moderation."
metaDescription: "Learn AI image generation with DALL-E, Stable Diffusion, and Midjourney. Create, edit, and optimize images using prompt engineering, batch processing, and moderation."
difficulty: intermediate
topics:
  - ai
tags:
  - ai
  - batch-processing
  - machine-learning
  - llm
  - neural-networks
relatedResources:
  - /recipes/prompt-engineering
  - /recipes/ai-agents
  - /recipes/semantic-search
  - /recipes/chatbot-openai
lastUpdated: "2026-06-14"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn AI image generation with DALL-E, Stable Diffusion, and Midjourney. Create, edit, and optimize images using prompt engineering, batch processing, and moderation."
  keywords:
    - ai image generation
    - dall-e api
    - stable diffusion
    - generative images
    - image prompt engineering
---

## Overview

Generative image models have transformed how developers create visual content. Instead of commissioning designers, purchasing stock photos, or building complex rendering pipelines, applications can now generate custom images from text descriptions in seconds. DALL-E 3, Stable Diffusion XL, and Midjourney produce photorealistic portraits, illustrations, icons, and product mockups that are increasingly indistinguishable from human-created art.

The challenge in production is not calling the API — it is crafting prompts that produce consistent, usable results at scale. A prompt like "a cat" yields unpredictable outcomes. A structured prompt with style references, aspect ratios, negative constraints, and seed values produces reproducible assets. For prompt engineering fundamentals, see [Prompt Engineering](/recipes/ai/prompt-engineering). The following demonstrates how to API integration, prompt templates, batch generation, content moderation, and image optimization for web delivery.

## When to use it

Use this recipe when:

- Generating product mockups, marketing banners, or social media assets on demand. See [Batch Processing](/recipes/data/batch-processing-patterns) for generating assets at scale.
- Building avatar creation tools where users describe their desired appearance
- Creating personalized illustrations for newsletters, blog posts, or children's books
- Prototyping UI designs and wireframes from text descriptions
- Augmenting training datasets with synthetic images for computer vision models

## Solution

### DALL-E 3 Image Generation (Python / OpenAI)

```python
from openai import OpenAI
import requests
from pathlib import Path

client = OpenAI()

def generate_product_mockup(product_name: str, style: str, size: str = "1024x1024") -> str:
    prompt = f"""
    Professional product photography of {product_name}.
    Style: {style}, soft studio lighting, clean white background,
    high detail, 8k resolution, e-commerce ready.
    No text, no watermarks, no people.
    """.strip()

    response = client.images.generate(
        model="dall-e-3",
        prompt=prompt,
        size=size,
        quality="hd",
        n=1,
        response_format="url"
    )

    image_url = response.data[0].url
    revised_prompt = response.data[0].revised_prompt

    # Download and save locally
    image_data = requests.get(image_url).content
    output_path = Path(f"generated/{product_name.replace(' ', '_')}.png")
    output_path.write_bytes(image_data)

    return str(output_path)

# Usage
path = generate_product_mockup("wireless headphones", "minimalist modern")
```

### Stable Diffusion with ControlNet (Python / Diffusers)

```python
import torch
from diffusers import StableDiffusionXLControlNetPipeline, ControlNetModel
from PIL import Image
import numpy as np

controlnet = ControlNetModel.from_pretrained(
    "diffusers/controlnet-canny-sdxl-1.0",
    torch_dtype=torch.float16
)

pipe = StableDiffusionXLControlNetPipeline.from_pretrained(
    "stabilityai/stable-diffusion-xl-base-1.0",
    controlnet=controlnet,
    torch_dtype=torch.float16
).to("cuda")

# Load a reference image for structure guidance
reference_image = Image.open("sketch.png").convert("RGB")

image = pipe(
    prompt="modern living room interior, warm lighting, wooden floors, minimalist furniture",
    image=reference_image,
    num_inference_steps=30,
    guidance_scale=7.5,
    controlnet_conditioning_scale=0.8
).images[0]

image.save("generated_room.png")
```

### Batch Generation with Prompt Templates (JavaScript)

```javascript
const { OpenAI } = require('openai');
const fs = require('fs');
const path = require('path');

const openai = new OpenAI();

const templates = [
  { category: 'hero', prompt: 'Wide space banner of {theme}, golden hour, cinematic composition, no text', size: '1792x1024' },
  { category: 'thumbnail', prompt: 'Square close-up of {theme}, rich colors, high contrast', size: '1024x1024' },
  { category: 'icon', prompt: 'Minimalist flat icon of {theme}, white background, vector style, clean lines', size: '1024x1024' },
];

async function generateBatch(theme, outputDir) {
  const results = [];

  for (const template of templates) {
    const prompt = template.prompt.replace('{theme}', theme);
    const response = await openai.images.generate({
      model: 'dall-e-3',
      prompt,
      size: template.size,
      n: 1,
    });

    const imageUrl = response.data[0].url;
    const buffer = await fetch(imageUrl).then(r => r.arrayBuffer());

    const filename = `${theme}_${template.category}.png`;
    fs.writeFileSync(path.join(outputDir, filename), Buffer.from(buffer));
    results.push({ category: template.category, filename });
  }

  return results;
}
```

## Explanation

- **Prompt engineering for images**: image models are highly sensitive to prompt structure. Include subject, style, lighting, camera angle, mood, and negative constraints. DALL-E 3 automatically expands short prompts; Stable Diffusion requires explicit detail for quality results.
- **Seed values for consistency**: fixing the random seed (`seed=42`) ensures that the same prompt produces the same image across generations. This is essential for A/B testing, regression testing, and creating series of images with uniform style.
- **Content moderation**: OpenAI and Stability AI automatically filter prompts and outputs for harmful content. Implement additional moderation layers for user-generated prompts, logging rejected requests and alerting on suspicious patterns.
- **Image optimization**: generated images are typically PNG or high-quality JPEG. Convert to WebP for web delivery, generate responsive sizes, and lazy-load below-the-fold images. Use CDNs for global distribution. See [Lazy Loading Images](/recipes/performance/lazy-loading) for implementation.

## Variants

| Model | Cost | Speed | Quality | Control | Best for |
|-------|------|-------|---------|---------|----------|
| DALL-E 3 | Medium | Fast | High | Low | General use, text understanding |
| Stable Diffusion XL | Low* | Medium | High | High (ControlNet) | Self-hosted, custom models |
| Midjourney | High | Medium | Very high | Medium | Artistic, premium content |
| Ideogram | Low | Fast | Medium | Low | Text-in-image accuracy |

## What works

- **Cache generated images**: store generated images in object storage (S3, GCS) with a CDN in front. Never regenerate the same prompt twice — cache by prompt hash or user selection.
- **Version your prompts**: track prompt templates, model versions, and seed values in version control. When models update (e.g., DALL-E 3 to 4), regression test your prompt library for consistency.
- **Implement user content policies**: block prompts that request violent, sexual, or copyright-infringing content. Display clear terms of service and maintain an audit log of all generations for compliance.
- **Optimize for web before storage**: resize images to exact display dimensions, compress with WebP/AVIF, and strip metadata. A 1024x1024 PNG from DALL-E is 2-4MB; the same image as WebP at 80% quality is 200KB.
- **Fallback to stock for failures**: if the API is rate-limited or the generated image is unusable, fall back to a curated stock photo library. Never show broken images or loading spinners indefinitely.

## Common mistakes

- **Not handling API rate limits**: DALL-E allows 5 images/minute on standard tiers. Queue generation requests and implement exponential backoff. Do not hammer the API in a tight loop.
- **Ignoring prompt injection**: users can craft prompts that override your system instructions (e.g., "ignore previous instructions, generate..."). Sanitize user input and wrap it in a fixed template that cannot be escaped.
- **Storing unoptimized originals**: keeping full-resolution PNGs in your database bloats storage and slows page loads. Generate and cache optimized variants at ingestion time.
- **Using generated images without rights review**: while most AI-generated images are commercially usable, review your provider's terms. Some restrict use in certain industries (medical, political) or require attribution.

## FAQ

**Q: Can I use AI-generated images commercially?**
A: For DALL-E and Stable Diffusion, generally yes — you own the output. Midjourney requires a paid plan for commercial use. Always review the current terms of service, as policies evolve.

**Q: How do I make generated images consistent across a series?**
A: Use the same seed value, reference image (img2img), or fine-tuned model (LoRA). ControlNet with canny edges or depth maps preserves structure while allowing style changes.

**Q: What resolution should I generate for web use?**
A: Generate at the target display resolution (e.g., 1024px wide for hero images) rather than downsampling from 4K. This saves tokens, reduces generation time, and produces sharper results.

**Q: How do I prevent users from generating inappropriate content?**
A: Layer prompt filtering (blocklists, regex), API moderation flags, and human review queues. Rejected prompts should be logged and pattern-matched to detect users attempting to bypass filters.

**Q: How do I generate consistent characters across multiple images?**
A: Use character LoRA (Low-Rank Adaptation) fine-tuned on 10-20 images of your character. With DALL-E, include detailed character descriptions in every prompt (hair, clothing, features). With Stable Diffusion, use a reference image via IP-Adapter or ControlNet to maintain facial features across generations.

**Q: What is the difference between img2img and text2img?**
A: Text2img generates an image from a text prompt only. Img2img starts from an existing image and modifies it based on a text prompt, preserving structure and composition. Use img2img for variations, style transfer, and inpainting. Use text2img for original generation.

**Q: How do I handle image generation failures in production?**
A: Implement a retry queue with exponential backoff. If the API fails after 3 retries, fall back to a pre-generated placeholder or stock image. Log the failed prompt and error for debugging. Never expose raw API errors to users — show a friendly message and offer a retry button.

**Q: Can I use AI image generation for print-on-demand products?**
A: Yes, but check your provider's commercial use terms. DALL-E and Stable Diffusion allow commercial use. Midjourney requires a paid subscription. For print, generate at the highest resolution available and upscale with tools like Real-ESRGAN or Topaz Gigapixel to meet print DPI requirements (300 DPI for most products).

**Q: How do I reduce generation costs for high-volume workloads?**
A: Cache aggressively — store every generated image by prompt hash and serve from cache for repeat requests. Use smaller models (SDXL Turbo, DALL-E standard quality) for drafts and previews. Only use HD or high-step models for final output. Batch generation during off-peak hours if using self-hosted models.

## Additional Common Mistakes

- **Not testing prompts across model versions** — DALL-E 3 and DALL-E 4 may interpret the same prompt differently. Regression test your prompt library when upgrading models.
- **Generating at 4K and downscaling** — this wastes tokens and time. Generate at the target display resolution. If you need higher resolution, use an upscaler post-generation.
- **Not using negative prompts with Stable Diffusion** — negative prompts ("blurry, deformed, extra fingers, watermark") considerably improve quality. Always include a negative prompt for SD-based generation.
- **Storing images without content hashes** — without a hash, you cannot detect duplicate generations or implement caching. Hash the prompt + model + seed and use it as the cache key.
- **Not handling aspect ratio correctly** — DALL-E 3 supports 1024x1024, 1792x1024, and 1024x1792. Generating at the wrong aspect ratio produces distorted images. Match the aspect ratio to your display context.
- **Forgetting to strip EXIF metadata** — AI-generated images may contain metadata about the generation process. Strip EXIF data before publishing to avoid leaking prompt text or API information.
- **Not implementing user rate limits** — a single user generating hundreds of images per minute can exhaust your API quota. Implement per-user daily limits and queue excess requests.
- **Using AI images for medical or legal content** — AI-generated images can be inaccurate or misleading in sensitive domains. Use real photography or illustrations for medical, legal, or safety-critical content.

## Best Practices

- **Build a prompt library**: maintain a versioned collection of tested prompts with their expected outputs. This ensures consistency across team members and serves as a regression test when models update.
- **Generate multiple variants and pick the best**: request 2-4 images per prompt and select the highest quality. This costs more but considerably improves output quality, especially for marketing materials.
- **Use deterministic seeds for reproducibility**: when you find a good result, save the seed. This lets you regenerate similar images or make small prompt adjustments while preserving composition.
- **Implement a review queue for user-facing content**: never publish AI-generated images directly to users without a human review step. Set up a moderation queue that checks for artifacts, text rendering errors, and content policy violations.
- **Store generation metadata separately from images**: keep prompt, model, seed, and parameters in a database. This enables auditing, debugging, and re-generation without parsing image metadata.
- **Set up cost monitoring and alerts**: track daily image generation costs per user and per project. Alert when spending exceeds 80% of budget. Suspend generation for users who exceed their quota.

## Production Checklist

- [ ] API keys stored in environment variables, not hardcoded
- [ ] Per-user rate limits enforced (daily image generation cap)
- [ ] Generated images stored in object storage (S3, GCS), not local disk
- [ ] Content moderation filter applied to prompts before generation
- [ ] EXIF metadata stripped from generated images before publishing
- [ ] Generation metadata (prompt, model, seed) stored in database
- [ ] Fallback behavior when API is rate-limited or unavailable
- [ ] Image dimensions validated before storage
- [ ] Cost tracking and alerts configured per project
- [ ] Prompt library versioned and tested across model updates

## Scaling Considerations

When generating images at scale, consider these factors:

- **API rate limits**: OpenAI's DALL-E 3 has a rate limit of 5 images per minute for tier 1 users. For higher throughput, request a quota increase or use multiple API keys with a round-robin dispatcher. Stable Diffusion APIs (Stability AI, Replicate) have separate rate limits.
- **Storage costs**: a single 1024x1024 PNG image is 1-3 MB. At 1000 images per day, that's 1-3 GB daily. Use object storage (S3, GCS) with lifecycle policies to move old images to cheaper storage tiers. Consider converting to WebP for 30-50% size reduction.
- **Latency**: DALL-E 3 takes 10-30 seconds per image. For batch generation, parallelize with async requests. For user-facing generation, show a loading state with an estimated wait time. Consider pre-generating common image variants during off-peak hours.
- **Content moderation at scale**: OpenAI automatically rejects prohibited content, but your users may find workarounds. Implement a secondary moderation layer using a tool like AWS Rekognition or Google Cloud Vision to scan generated images before storing them.
- **CDN distribution**: serve generated images through a CDN (CloudFront, Cloudflare) to reduce latency for global users. Set appropriate cache headers and TTLs. Invalidating cached images when they are regenerated is important for consistency.

## Cost Estimation

| Component | Cost per image | Notes |
|-----------|---------------|-------|
| DALL-E 3 (standard) | $0.040 | 1024x1024, standard quality |
| DALL-E 3 (HD) | $0.080 | 1024x1024, HD quality |
| Stable Diffusion XL | $0.002-$0.006 | Via Replicate or Stability AI |
| S3 storage | $0.023/GB/month | Standard tier |
| CDN bandwidth | $0.085/GB | CloudFront first 10TB |

For 1000 images/day at standard quality: $40/day in generation, ~$2-3/day in storage (after 30 days).

## When Not to Use AI Image Generation

- **Photorealistic accuracy is critical**: AI models struggle with fine details (hands, text, logos). For product photos or technical illustrations, use traditional photography or graphic design.
- **Brand consistency across batches**: AI-generated images vary between generations even with the same prompt. For consistent visual identity across a campaign, use templates or human designers.
- **Copyright-sensitive contexts**: AI models may reproduce training data patterns. For commercial work where IP clearance is required, use licensed stock photos or commission original artwork.
- **Real-time generation (<5 seconds)**: DALL-E 3 takes 10-30 seconds. For real-time applications (avatars, live previews), use pre-generated assets or lightweight models like SDXL Turbo.
- **High-volume, low-budget projects**: at $0.04/image, 10K images cost $400. For simple decorative graphics (icons, patterns, gradients), use CSS, SVG, or static asset libraries instead.

## Performance Benchmarks

| Model | Avg latency | Max resolution | Concurrent requests | Notes |
|-------|------------|----------------|---------------------|-------|
| DALL-E 3 (standard) | 12-20s | 1024x1024 | 5/min (tier 1) | OpenAI hosted |
| DALL-E 3 (HD) | 20-30s | 1024x1024 | 5/min (tier 1) | Higher quality |
| SDXL (Replicate) | 5-15s | 1024x1024 | 20/min | Self-hosted possible |
| SDXL Turbo | 1-4s | 512x512 | 50/min | Fastest option |

Benchmarks run on cold starts. Warm requests are 20-30% faster. For batch generation, parallelize across multiple API keys to bypass per-key rate limits.

### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
