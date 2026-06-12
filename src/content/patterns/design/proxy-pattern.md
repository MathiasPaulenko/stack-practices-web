---
contentType: patterns
slug: proxy-pattern
title: "Proxy Pattern"
description: "Provide a surrogate or placeholder for another object to control access to it. A structural design pattern for access control, lazy loading, and logging."
metaDescription: "Learn the Proxy Pattern with practical examples in Python, Java, and JavaScript. Structural design pattern for access control, caching, and lazy loading."
difficulty: intermediate
topics:
  - design
tags:
  - proxy
  - pattern
  - design-pattern
  - structural
  - access-control
  - caching
  - python
  - javascript
  - java
relatedResources:
  - /patterns/design/decorator-pattern
  - /patterns/design/adapter-pattern
  - /patterns/design/factory-pattern
lastUpdated: "2026-06-12"
author: "StackPractices"
seo:
  metaDescription: "Learn the Proxy Pattern with practical examples in Python, Java, and JavaScript. Structural design pattern for access control, caching, and lazy loading."
  keywords:
    - proxy pattern
    - design pattern
    - structural pattern
    - access control
    - lazy loading
    - caching proxy
    - python proxy
    - java proxy
    - javascript proxy
---

# Proxy Pattern

## Overview

The Proxy Pattern is a structural design pattern that provides a surrogate or placeholder for another object. The proxy controls access to the real subject, adding a layer of indirection that can be used for lazy loading, access control, caching, logging, or monitoring — without changing the subject's code.

## When to Use

Use the Proxy Pattern when:
- You need lazy initialization for expensive objects (create on first use)
- You want to control access rights to an object (authentication, authorization)
- You need to cache results of expensive operations
- You want to log or monitor calls to an object transparently
- The real object is remote and you need a local representative

## Solution

### Python

```python
from abc import ABC, abstractmethod

class Image(ABC):
    @abstractmethod
    def display(self):
        pass

class RealImage(Image):
    def __init__(self, filename: str):
        self.filename = filename
        self._load_from_disk()

    def _load_from_disk(self):
        print(f"Loading image: {self.filename}")

    def display(self):
        print(f"Displaying image: {self.filename}")

class ImageProxy(Image):
    def __init__(self, filename: str):
        self.filename = filename
        self._real_image = None

    def display(self):
        if self._real_image is None:
            self._real_image = RealImage(self.filename)
        self._real_image.display()

# Usage: expensive object is not loaded until needed
proxy = ImageProxy("photo.jpg")  # No loading yet
proxy.display()                   # Loads and displays
proxy.display()                   # Uses cached RealImage
```

### JavaScript

```javascript
class RealImage {
  constructor(filename) {
    this.filename = filename;
    this.loadFromDisk();
  }

  loadFromDisk() {
    console.log(`Loading image: ${this.filename}`);
  }

  display() {
    console.log(`Displaying image: ${this.filename}`);
  }
}

class ImageProxy {
  constructor(filename) {
    this.filename = filename;
    this.realImage = null;
  }

  display() {
    if (!this.realImage) {
      this.realImage = new RealImage(this.filename);
    }
    this.realImage.display();
  }
}

// Usage
const proxy = new ImageProxy("photo.jpg");
proxy.display(); // Lazy loads
proxy.display(); // Uses cached instance
```

### Java

```java
public interface Image {
    void display();
}

public class RealImage implements Image {
    private final String filename;

    public RealImage(String filename) {
        this.filename = filename;
        loadFromDisk();
    }

    private void loadFromDisk() {
        System.out.println("Loading image: " + filename);
    }

    @Override
    public void display() {
        System.out.println("Displaying image: " + filename);
    }
}

public class ImageProxy implements Image {
    private final String filename;
    private RealImage realImage;

    public ImageProxy(String filename) {
        this.filename = filename;
    }

    @Override
    public void display() {
        if (realImage == null) {
            realImage = new RealImage(filename);
        }
        realImage.display();
    }
}

// Usage
Image proxy = new ImageProxy("photo.jpg");
proxy.display(); // Lazy loads
proxy.display(); // Reuses cached RealImage
```

## Explanation

The Proxy Pattern involves three roles:

- **Subject Interface** (`Image`): The common interface shared by both the real object and the proxy
- **Real Subject** (`RealImage`): The actual object that performs the real work
- **Proxy** (`ImageProxy`): Controls access to the real subject, adding behavior before or after forwarding requests

The proxy can intercept operations to add caching, logging, access control, or lazy initialization transparently.

## Variants

| Variant | Purpose | Example |
|---------|---------|---------|
| **Virtual Proxy** | Lazy initialization | Loading large images on demand |
| **Protection Proxy** | Access control | Checking permissions before method execution |
| **Caching Proxy** | Memoization | Caching API responses or computed results |
| **Remote Proxy** | Network transparency | Local stub for a remote service |
| **Smart Reference** | Reference counting | Tracking object usage for cleanup |

## Best Practices

- **Keep the proxy interface identical to the real subject** — clients should not know they are using a proxy
- **Use lazy initialization only when the real object is expensive** — otherwise, the proxy adds unnecessary complexity
- **Handle thread safety** in caching proxies when multiple clients may access shared cached data
- **Implement reference counting** in smart proxies to manage lifecycle of expensive resources
- **Document proxy behavior** (e.g., "this proxy caches results for 5 minutes") so callers understand performance characteristics

## Common Mistakes

- Exposing the proxy's internal state or letting clients bypass it to reach the real subject directly
- Using a proxy when a simple decorator or direct reference would suffice, adding unnecessary indirection
- Forgetting to handle exceptions in the proxy, letting failures silently bypass logging or cleanup logic
- Implementing caching proxies without cache invalidation, leading to stale data
- Not synchronizing access in multi-threaded environments, causing race conditions in lazy initialization

## Frequently Asked Questions

**Q: What is the difference between Proxy and Decorator?**
A: Both wrap objects and add behavior. Proxy controls access to the wrapped object (often for structural reasons like lazy loading or remote access). Decorator adds responsibilities dynamically, usually for functional enhancement. The intent differs even if the structure looks similar.

**Q: Can a proxy wrap another proxy?**
A: Yes. You can stack proxies — for example, a caching proxy wrapping a remote proxy. Each layer adds its own behavior. Keep the stack shallow to avoid confusing stack traces and performance overhead.

**Q: When should I use a Proxy instead of a Factory?**
A: Use a Factory when you want to control which class is instantiated. Use a Proxy when you want to control access to an already-instantiated object or delay its creation.
