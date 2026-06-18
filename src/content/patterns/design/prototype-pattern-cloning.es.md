---
contentType: patterns
slug: prototype-pattern-cloning
title: "Prototype Pattern para Clonacion de Objetos y Plantillas de Configuracion"
description: "Crea nuevos objetos copiando existentes, permitiendo plantillas pre-configuradas y evitando explosion de subclases cuando la creacion de objetos es costosa"
metaDescription: "Prototype pattern para clonacion de objetos. Crea objetos copiando existentes con plantillas pre-configuradas para evitar inicializacion costosa y explosion de subclases."
difficulty: intermediate
topics:
  - design
tags:
  - prototype
  - creational-patterns
  - typescript
  - design-pattern
relatedResources:
  - /patterns/design/factory-method-injection
  - /patterns/design/builder-pattern
  - /guides/clean-code-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Prototype pattern para clonacion de objetos. Crea objetos copiando existentes con plantillas pre-configuradas para evitar inicializacion costosa y explosion de subclases."
  keywords:
    - prototype pattern
    - object cloning
    - configuration templates
    - creational patterns
    - deep copy
---

# Prototype Pattern para Clonacion de Objetos y Plantillas de Configuracion

El Prototype pattern crea nuevos objetos copiando existentes. En lugar de construir objetos desde cero con constructores, clonas un prototipo y opcionalmente lo customizas. Esto es poderoso cuando la inicializacion de objetos es costosa, cuando existen muchas configuraciones similares, o cuando el tipo concreto de objeto no se conoce hasta runtime.

## Cuando Usar Esto

- La creacion de objetos es costosa (conexiones a base de datos, configuraciones parseadas)
- Existen muchas variantes de objetos similares que difieren solo ligeramente
- La clase concreta a instanciar se determina en runtime

## Problema

Un juego spawnea cientos de unidades enemigas con las mismas stats base pero variaciones leves. Crear cada unidad desde cero requiere recargar assets y parsear configuraciones repetidamente.

## Solucion

```typescript
// prototype/Cloneable.ts
interface Cloneable<T> {
  clone(): T;
}

class EnemyUnit implements Cloneable<EnemyUnit> {
  private health: number;
  private speed: number;
  private weapon: string;
  private abilities: string[];

  constructor(
    health: number,
    speed: number,
    weapon: string,
    abilities: string[]
  ) {
    this.health = health;
    this.speed = speed;
    this.weapon = weapon;
    // Deep copy para prevenir estado mutable compartido
    this.abilities = [...abilities];
  }

  clone(): EnemyUnit {
    return new EnemyUnit(
      this.health,
      this.speed,
      this.weapon,
      [...this.abilities]
    );
  }

  setHealth(health: number): EnemyUnit {
    this.health = health;
    return this;
  }

  addAbility(ability: string): EnemyUnit {
    this.abilities.push(ability);
    return this;
  }

  describe(): string {
    return `${this.health}HP, ${this.speed}SPD, ${this.weapon}, [${this.abilities.join(', ')}]`;
  }
}

// Prototipos pre-configurados
const goblinPrototype = new EnemyUnit(30, 8, 'dagger', ['sneak']);
const orcPrototype = new EnemyUnit(80, 4, 'axe', ['rage', 'charge']);

// Clona y customiza
const goblinScout = goblinPrototype.clone().setHealth(25).addAbility('scout');
const goblinBoss = goblinPrototype.clone().setHealth(60).addAbility('command');
const orcBerserker = orcPrototype.clone().setHealth(100);

console.log(goblinScout.describe());
console.log(goblinBoss.describe());
console.log(orcBerserker.describe());
```

## Variacion: Registro de Plantillas de Configuracion

```typescript
// prototype/TemplateRegistry.ts
class DocumentTemplate implements Cloneable<DocumentTemplate> {
  private content = '';
  private styles: Record<string, string> = {};
  private metadata: Record<string, unknown> = {};

  constructor() {}

  setContent(content: string): DocumentTemplate {
    this.content = content;
    return this;
  }

  setStyles(styles: Record<string, string>): DocumentTemplate {
    this.styles = { ...styles };
    return this;
  }

  setMetadata(metadata: Record<string, unknown>): DocumentTemplate {
    this.metadata = { ...metadata };
    return this;
  }

  clone(): DocumentTemplate {
    return new DocumentTemplate()
      .setContent(this.content)
      .setStyles({ ...this.styles })
      .setMetadata({ ...this.metadata });
  }
}

class TemplateRegistry {
  private templates = new Map<string, DocumentTemplate>();

  register(name: string, template: DocumentTemplate): void {
    this.templates.set(name, template);
  }

  create(name: string): DocumentTemplate {
    const template = this.templates.get(name);
    if (!template) throw new Error(`Unknown template: ${name}`);
    return template.clone();
  }
}

// Uso
const registry = new TemplateRegistry();
registry.register('report', new DocumentTemplate()
  .setContent('## Report\n\nDate: {{date}}')
  .setStyles({ font: 'Arial', size: '12pt' }));

registry.register('invoice', new DocumentTemplate()
  .setContent('## Invoice #{{id}}\n\nTotal: {{total}}')
  .setStyles({ font: 'Times', size: '10pt' }));

const report = registry.create('report');
```

## Como Funciona

1. **Prototype** declara un metodo `clone`
2. **Concrete Prototype** implementa deep cloning para evitar estado mutable compartido
3. **Client** clona prototipos y opcionalmente customiza la copia
4. **Registry** (opcional) mantiene prototipos nombrados para acceso conveniente

## Consideraciones de Produccion

- Siempre deep-clona objetos anidados y arrays para prevenir comparticion accidental
- Usa `structuredClone` en JavaScript moderno para deep copies de objetos plain
- Para referencias circulares, implementa logica de clonado custom

## Errores Comunes

- Shallow cloning de estado mutable anidado, causando side effects entre instancias
- No implementar `clone` en subclases, rompiendo la cadena del pattern
- Usar Prototype cuando un simple constructor o Factory Method es mas limpio

## FAQ

**P: En que se diferencia de Factory Method?**
R: Factory Method crea objetos a traves de una clase factory. Prototype crea objetos copiando una instancia existente, preservando su estado.

**P: Puedo usar esto con JSON?**
R: Si. `JSON.parse(JSON.stringify(obj))` es un clone prototype crude para objetos plain, pero `structuredClone` es preferido para runtimes modernos.
