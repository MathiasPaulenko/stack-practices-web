---
contentType: patterns
slug: facade-pattern
title: "Facade Pattern"
description: "Provide a simplified interface to a complex subsystem. A structural pattern that hides implementation details behind a clean API."
metaDescription: "Learn the Facade Pattern to simplify complex subsystems. Examples in Python, Java, and JavaScript for cleaner APIs and reduced coupling."
difficulty: beginner
topics:
  - design
tags:
  - facade
  - pattern
  - design-pattern
  - structural
  - api
  - abstraction
relatedResources:
  - /patterns/design/adapter-pattern
  - /patterns/design/proxy-pattern
  - /patterns/design/mediator-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the Facade Pattern to simplify complex subsystems. Examples in Python, Java, and JavaScript for cleaner APIs and reduced coupling."
  keywords:
    - facade pattern
    - design pattern
    - structural pattern
    - api simplification
    - subsystem
---

# Facade Pattern

## Overview

The Facade Pattern provides a simplified, unified interface to a complex subsystem. Instead of forcing clients to interact with dozens of interdependent classes, a facade exposes only the operations they need. This reduces coupling, improves readability, and makes the subsystem easier to evolve.

Consider a video conversion library. Without a facade, clients must manually configure codecs, bit rate calculators, file splitters, and audio mixers. With a facade, they call `convert("movie.mp4", "output.avi")` and the facade orchestrates everything internally.

## When to Use

Use the Facade Pattern when:
- A subsystem is complex and has many interdependent components
- You want to provide a simple entry point for common operations
- You need to decouple client code from subsystem implementation details
- Multiple subsystems must be coordinated for a single task
- You want to layer your architecture (e.g., service layer over repositories)

## When to Avoid

- The subsystem is already simple; adding a facade is unnecessary indirection
- Every client needs low-level control; a facade would hide too much
- You are trying to fix a badly designed subsystem instead of refactoring it

## Solution

### Python

```python
class VideoDecoder:
    def decode(self, file):
        return f"Decoded {file}"

class VideoEncoder:
    def encode(self, stream, format):
        return f"Encoded to {format}"

class BitRateCalculator:
    def calculate(self, source):
        return 1024

class AudioMixer:
    def mix(self, stream):
        return f"Mixed audio for {stream}"


class VideoConverter:
    """Facade that hides the complexity of video conversion."""

    def __init__(self):
        self._decoder = VideoDecoder()
        self._encoder = VideoEncoder()
        self._bitrate = BitRateCalculator()
        self._audio = AudioMixer()

    def convert(self, source_file, destination_format):
        decoded = self._decoder.decode(source_file)
        bitrate = self._bitrate.calculate(decoded)
        mixed = self._audio.mix(decoded)
        return self._encoder.encode(mixed, destination_format)


# Client code
converter = VideoConverter()
result = converter.convert("movie.mp4", "avi")
print(result)
```

### Java

```java
class VideoDecoder {
    String decode(String file) { return "Decoded " + file; }
}

class VideoEncoder {
    String encode(String stream, String format) {
        return "Encoded to " + format;
    }
}

class BitRateCalculator {
    int calculate(String source) { return 1024; }
}

class AudioMixer {
    String mix(String stream) { return "Mixed " + stream; }
}

class VideoConverter {
    private final VideoDecoder decoder = new VideoDecoder();
    private final VideoEncoder encoder = new VideoEncoder();
    private final BitRateCalculator bitrate = new BitRateCalculator();
    private final AudioMixer audio = new AudioMixer();

    public String convert(String sourceFile, String destinationFormat) {
        String decoded = decoder.decode(sourceFile);
        int rate = bitrate.calculate(decoded);
        String mixed = audio.mix(decoded);
        return encoder.encode(mixed, destinationFormat);
    }
}

// Client code
VideoConverter converter = new VideoConverter();
System.out.println(converter.convert("movie.mp4", "avi"));
```

### JavaScript

```javascript
class VideoDecoder {
  decode(file) { return `Decoded ${file}`; }
}

class VideoEncoder {
  encode(stream, format) { return `Encoded to ${format}`; }
}

class BitRateCalculator {
  calculate(source) { return 1024; }
}

class AudioMixer {
  mix(stream) { return `Mixed ${stream}`; }
}

class VideoConverter {
  constructor() {
    this.decoder = new VideoDecoder();
    this.encoder = new VideoEncoder();
    this.bitrate = new BitRateCalculator();
    this.audio = new AudioMixer();
  }

  convert(sourceFile, destinationFormat) {
    const decoded = this.decoder.decode(sourceFile);
    const rate = this.bitrate.calculate(decoded);
    const mixed = this.audio.mix(decoded);
    return this.encoder.encode(mixed, destinationFormat);
  }
}

// Client code
const converter = new VideoConverter();
console.log(converter.convert('movie.mp4', 'avi'));
```

## Explanation

The Facade Pattern has three participants:

- **Facade** (`VideoConverter`): The simplified interface clients interact with
- **Subsystem classes** (`VideoDecoder`, `VideoEncoder`, etc.): The complex components the facade coordinates
- **Client**: Code that uses the facade instead of subsystem classes directly

The facade does not add new functionality; it composes existing subsystem operations into higher-level workflows.

## Variants

| Variant | Use Case |
|---------|----------|
| **Class Facade** | Static methods for stateless operations |
| **Service Facade** | Injected dependency that wraps repositories and external APIs |
| **API Gateway** | HTTP-level facade that aggregates multiple microservices |
| **Module Facade** | Public module API that hides internal file structure |

## What Works

- **Keep the facade thin.** It should orchestrate, not implement. Business logic belongs in the subsystem or a separate service layer.
- **Allow direct subsystem access.** Advanced clients should still be able to bypass the facade for fine-grained control.
- **Use dependency injection.** Inject subsystem components into the facade for testability instead of hardcoding constructors.
- **Document what the facade hides.** A facade that silently retries failed HTTP requests should document this behavior to avoid surprising clients.
- **One facade per subsystem.** Do not create a single mega-facade for unrelated systems; it becomes a [God Object](https://en.wikipedia.org/wiki/God_object).

## Common Mistakes

- **Putting business logic in the facade** turns it into an unmaintainable middle layer. Facades delegate; they do not decide.
- **Hiding too much** forces every client to request facade changes for specialized needs. Expose a second "advanced" interface if needed.
- **Creating a facade for a trivial subsystem** adds indirection without value. A facade over three simple classes is unnecessary.
- **Not updating the facade** when the subsystem changes causes the facade to become a broken abstraction.
- **Multiple facades with overlapping responsibilities** confuse clients about which to use. Consolidate or clearly separate concerns.

## Real-World Examples

### ORM Session

SQLAlchemy's `Session` is a facade over connection pools, transaction management, and unit-of-work tracking. Developers call `session.commit()` without managing individual inserts and updates.

### Framework Router

Express.js `app.get('/users', handler)` is a facade over HTTP parsing, middleware chains, request routing, and response serialization.

### Cloud SDK

AWS S3 `upload_file(bucket, key, path)` hides multipart uploads, retry logic, checksum validation, and credential refresh behind one method call.

## Frequently Asked Questions

**Q: What is the difference between Facade and Adapter?**
A: [Adapter](/patterns/design/adapter-pattern) changes an interface to match what a client expects. Facade simplifies a complex interface without changing its contracts.

**Q: Can a facade expose subsystem methods directly?**
A: Yes, this is called an "optional facade." Clients can use the simple facade methods or access subsystem classes for advanced use cases.

**Q: Is a REST API Gateway a Facade?**
A: Yes. An API Gateway is a facade at the network layer, aggregating calls to multiple microservices into a single client-facing endpoint.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
