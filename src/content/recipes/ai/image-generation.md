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

The challenge in production is not calling the API — it is crafting prompts that produce consistent, usable results at scale. A prompt like "a cat" yields unpredictable outcomes. A structured prompt with style references, aspect ratios, negative constraints, and seed values produces reproducible assets. For prompt engineering fundamentals, see [Prompt Engineering](/recipes/ai/prompt-engineering). This recipe covers API integration, prompt templates, batch generation, content moderation, and image optimization for web delivery.

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


### Is this solution production-ready?

Yes. The code examples above show tested implementations. Adapt error handling and configuration to your specific environment before deploying.

### What are the performance characteristics?

Performance depends on your data volume and infrastructure. The solutions shown prioritize clarity. For high-throughput scenarios, add caching, batching, and connection pooling as needed.

### How do I debug issues with this approach?

Start with the minimal example above. Add logging at each step. Test with small inputs first, then scale up. Use your language's debugger to step through edge cases.
