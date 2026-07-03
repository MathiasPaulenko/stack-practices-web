---
contentType: patterns
slug: flyweight-pattern-text
title: "Flyweight Pattern para Comparticion Eficiente de Objetos a Gran Escala"
description: "Usa el Flyweight pattern para minimizar uso de memoria compartiendo la mayor cantidad de datos posible entre objetos similares, esencial para renderizar datasets grandes"
metaDescription: "Flyweight pattern para eficiencia de memoria. Comparte estado entre objetos similares para minimizar uso de memoria al renderizar datasets grandes."
difficulty: intermediate
topics:
  - design
  - performance
tags:
  - flyweight
  - structural-patterns
  - typescript
  - design-pattern
  - design-patterns
relatedResources:
  - /recipes/cache-invalidation
  - /guides/performance-optimization-guide
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Flyweight pattern para eficiencia de memoria. Comparte estado entre objetos similares para minimizar uso de memoria al renderizar datasets grandes."
  keywords:
    - flyweight pattern
    - object sharing
    - memory optimization
    - structural patterns
    - large datasets
---

# Flyweight Pattern para Comparticion Eficiente de Objetos a Gran Escala

El [Flyweight](/patterns/design/flyweight-pattern) pattern minimiza el uso de memoria compartiendo la mayor cantidad de datos posible entre objetos similares. Cuando una aplicacion necesita crear miles de objetos que comparten la mayor parte de su estado, Flyweight extrae el estado compartido (intrinseco) en un objeto compartido separado, dejando solo el estado unico (extrinseco) en cada instancia.

## Cuando Usar Esto

- Una aplicacion usa una gran cantidad de objetos con estado compartido. Consulta [Singleton Pattern](/patterns/design/singleton-pattern) para gestionar instancias únicas.
- El costo de memoria es alto por la cantidad de objetos. Consulta [Caching Strategies](/recipes/performance/caching-strategies) para reducir almacenamiento redundante.
- La mayor parte del estado del objeto puede hacerse extrinseco y computarse on the fly. Consulta [Object Pool](/patterns/design/abstract-factory-pattern) para patrones de instancias reutilizables.

## Problema

Un editor de documentos con 100,000 caracteres crea 100,000 objetos Character. Cada uno almacena fuente, tamano, color y datos de glifo — incluso cuando solo existen 200 estilos de caracter unicos en el documento.

## Solucion

```typescript
// flyweight/CharacterStyle.ts
interface CharacterStyle {
  font: string;
  size: number;
  color: string;
  bold: boolean;
}

class StyleFactory {
  private styles = new Map<string, CharacterStyle>();

  getStyle(font: string, size: number, color: string, bold: boolean): CharacterStyle {
    const key = `${font}-${size}-${color}-${bold}`;

    if (!this.styles.has(key)) {
      this.styles.set(key, { font, size, color, bold });
    }

    return this.styles.get(key)!;
  }

  getStyleCount(): number {
    return this.styles.size;
  }
}

// Flyweight character con posicion extrinseca
class Character {
  constructor(
    private char: string,
    private style: CharacterStyle  // Shared intrinsic state
  ) {}

  render(position: number): string {
    // Estado extrinseco: posicion pasada en tiempo de renderizado
    return `<span style="font: ${this.style.size}px ${this.style.font}; color: ${this.style.color}; ${this.style.bold ? 'font-weight: bold;' : ''}" data-position="${position}">${this.char}</span>`;
  }
}

// Documento usa flyweights
class Document {
  private characters: { char: Character; position: number }[] = [];
  private styleFactory = new StyleFactory();

  insert(char: string, position: number, font: string, size: number, color: string, bold: boolean): void {
    const style = this.styleFactory.getStyle(font, size, color, bold);
    const character = new Character(char, style);
    this.characters.push({ char: character, position });
  }

  render(): string {
    return this.characters
      .map(c => c.char.render(c.position))
      .join('');
  }

  getMemoryStats(): { characters: number; uniqueStyles: number } {
    return {
      characters: this.characters.length,
      uniqueStyles: this.styleFactory.getStyleCount(),
    };
  }
}

// Uso
const doc = new Document();

// Insertar 10,000 caracteres usando solo 3 estilos unicos
doc.insert('H', 0, 'Arial', 12, '#000', true);
doc.insert('e', 1, 'Arial', 12, '#000', true);

for (let i = 2; i < 10000; i++) {
  doc.insert('x', i, 'Arial', 12, '#000', false);
}

console.log(doc.getMemoryStats());
// { characters: 10000, uniqueStyles: 2 }
```

## Variacion: Pool de Objetos de Juego

```typescript
// flyweight/Tree.ts
interface TreeType {
  mesh: string;
  barkTexture: string;
  leafTexture: string;
}

class TreeTypeFactory {
  private types = new Map<string, TreeType>();

  getTreeType(mesh: string, bark: string, leaf: string): TreeType {
    const key = `${mesh}-${bark}-${leaf}`;
    if (!this.types.has(key)) {
      this.types.set(key, { mesh, barkTexture: bark, leafTexture: leaf });
    }
    return this.types.get(key)!;
  }
}

// Instancia de Tree solo almacena posicion y referencia de tipo
class Tree {
  constructor(
    private x: number,
    private y: number,
    private type: TreeType  // Shared flyweight
  ) {}

  render(): void {
    console.log(`Render ${this.type.mesh} at (${this.x}, ${this.y})`);
  }
}

// Bosque con miles de arboles usando pocos tipos
class Forest {
  private trees: Tree[] = [];
  private typeFactory = new TreeTypeFactory();

  plantTree(x: number, y: number, mesh: string, bark: string, leaf: string): void {
    const type = this.typeFactory.getTreeType(mesh, bark, leaf);
    this.trees.push(new Tree(x, y, type));
  }
}
```

## Como Funciona

1. **Flyweight** almacena el estado intrinseco (compartido) que pertenece a muchos objetos
2. **Context** almacena el estado extrinseco (unico) y referencia un Flyweight
3. **Flyweight Factory** crea y maneja instancias de flyweight compartidas
4. **Client** computa estado extrinseco y lo pasa a los metodos del flyweight

## Consideraciones de Produccion

- Los flyweights deben ser inmutables; nunca modifiques estado compartido despues de la creacion
- La seguridad de threads es requerida cuando la factory se accede concurrentemente
- Considera usar WeakMap para garbage collection automatico de flyweights no usados

## Errores Comunes

- Poner estado extrinseco dentro de la clase Flyweight, derrotando el proposito
- No usar una factory, permitiendo instancias duplicadas de flyweight
- Modificar estado de flyweight compartido, corrompiendo todos los contexts que lo usan

## FAQ

**P: En que se diferencia de un cache?**
R: Flyweight es una decision a nivel de diseno sobre estructura de objetos. Un [cache](/patterns/design/cache-aside-pattern) es una optimizacion para datos arbitrarios. Los flyweights son parte del modelo de dominio.

**P: Cuando NO deberia usar Flyweight?**
R: Cuando el numero de estados compartidos se aproxima al numero de instancias, o cuando computar estado extrinseco es mas costoso que almacenarlo directamente.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
