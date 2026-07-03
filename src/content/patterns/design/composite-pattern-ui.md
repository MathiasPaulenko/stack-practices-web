---
contentType: patterns
slug: composite-pattern-ui
title: "Composite Pattern for UI Component Trees in React"
description: "Use the Composite pattern to compose objects into tree structures, letting clients treat individual objects and compositions uniformly in UI component hierarchies"
metaDescription: "Composite pattern for UI trees in React. Compose objects into tree structures to treat individual elements and compositions uniformly in component hierarchies."
difficulty: intermediate
topics:
  - design
  - frontend
tags:
  - composite
  - structural-patterns
  - react
  - design-pattern
  - design-patterns
relatedResources:
  - /patterns/design/decorator-pattern-pipeline
  - /patterns/design/adapter-pattern-api
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Composite pattern for UI trees in React. Compose objects into tree structures to treat individual elements and compositions uniformly in component hierarchies."
  keywords:
    - composite pattern
    - tree structure
    - react components
    - structural patterns
    - ui hierarchy
---

# Composite Pattern for UI Component Trees in React

The Composite pattern composes objects into tree structures to represent part-whole hierarchies. It lets clients treat individual objects and compositions of objects uniformly. In React, this pattern appears naturally when rendering nested component trees where a container holds both leaf elements and other containers. See the general [Composite Pattern](/patterns/design/composite-pattern) for language-agnostic examples.

## When to Use This

- You have a tree structure of objects with parent-child relationships
- Clients should ignore the difference between compositions and individual objects
- You need to perform operations recursively across a hierarchy

## Problem

A form builder needs to render nested groups, fields, and sections. The rendering logic branches for every type instead of treating everything as a renderable node.

## Solution

```typescript
// components/Composite.tsx
interface ComponentNode {
  id: string;
  type: string;
  render(): React.ReactNode;
}

// Leaf
class FieldNode implements ComponentNode {
  constructor(
    public id: string,
    public label: string,
    public value: string
  ) {}

  render(): React.ReactNode {
    return (
      <div key={this.id} className="field">
        <label>{this.label}</label>
        <input type="text" defaultValue={this.value} />
      </div>
    );
  }
}

// Composite
class GroupNode implements ComponentNode {
  public children: ComponentNode[] = [];

  constructor(
    public id: string,
    public title: string
  ) {}

  add(child: ComponentNode): void {
    this.children.push(child);
  }

  remove(childId: string): void {
    this.children = this.children.filter(c => c.id !== childId);
  }

  render(): React.ReactNode {
    return (
      <fieldset key={this.id} className="group">
        <legend>{this.title}</legend>
        {this.children.map(child => child.render())}
      </fieldset>
    );
  }

  getTotalFields(): number {
    return this.children.reduce((count, child) => {
      if (child instanceof GroupNode) {
        return count + child.getTotalFields();
      }
      return count + 1;
    }, 0);
  }
}

// Usage
const formRoot = new GroupNode('root', 'User Profile');

const personalInfo = new GroupNode('personal', 'Personal Information');
personalInfo.add(new FieldNode('firstName', 'First Name', 'John'));
personalInfo.add(new FieldNode('lastName', 'Last Name', 'Doe'));

const address = new GroupNode('address', 'Address');
address.add(new FieldNode('street', 'Street', '123 Main St'));
address.add(new FieldNode('city', 'City', 'Springfield'));

formRoot.add(personalInfo);
formRoot.add(address);

// In a React component
function FormBuilder({ root }: { root: GroupNode }) {
  return (
    <form>
      {root.render()}
      <p>Total fields: {root.getTotalFields()}</p>
    </form>
  );
}
```

## How It Works

1. **Component** defines the common interface for all objects in the tree
2. **Leaf** represents individual objects with no children
3. **Composite** stores child components and implements child-related operations
4. **Client** works with any Component uniformly via the common interface

## Real-World Example: File System

```typescript
// File system nodes
interface FileSystemNode {
  name: string;
  getSize(): number;
  print(indent?: string): void;
}

class File implements FileSystemNode {
  constructor(
    public name: string,
    private size: number
  ) {}

  getSize(): number {
    return this.size;
  }

  print(indent = ''): void {
    console.log(`${indent}📄 ${this.name} (${this.size} bytes)`);
  }
}

class Directory implements FileSystemNode {
  public children: FileSystemNode[] = [];

  constructor(public name: string) {}

  add(node: FileSystemNode): void {
    this.children.push(node);
  }

  getSize(): number {
    return this.children.reduce((sum, child) => sum + child.getSize(), 0);
  }

  print(indent = ''): void {
    console.log(`${indent}📁 ${this.name}/`);
    this.children.forEach(child => child.print(indent + '  '));
  }
}

const root = new Directory('src');
const components = new Directory('components');
components.add(new File('Button.tsx', 1200));
components.add(new File('Card.tsx', 800));
root.add(components);
root.add(new File('index.ts', 150));

root.print();
console.log(`Total size: ${root.getSize()} bytes`);
```

## Production Considerations

- Use TypeScript discriminated unions instead of classes for simpler React props
- Consider immutable tree updates with structural sharing for large hierarchies
- Add `parent` references for upward traversal, but avoid circular JSON serialization

## Common Mistakes

- Putting child management methods in the base Component interface, forcing Leaf to implement them
- Not handling deeply nested recursion that could exceed stack limits
- Mutating the tree structure during iteration

## FAQ

**Q: How is this different from Decorator?**
A: Composite builds tree structures with container semantics. [Decorator](/patterns/design/decorator-pattern) adds responsibilities to a single object without tree semantics.

**Q: When should I avoid Composite?**
A: When the hierarchy is flat (only one level) or when child operations make no sense for leaf nodes. For flat structures, consider [Decorator](/patterns/design/decorator-pattern) instead.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
