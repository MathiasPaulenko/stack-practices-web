---
contentType: patterns
slug: abstract-factory-cross-platform
title: "Abstract Factory para Familias de Componentes UI Cross-Platform"
description: "Crea familias de objetos relacionados sin especificar clases concretas, habilitando implementaciones especificas de plataforma que comparten una interfaz comun"
metaDescription: "Abstract Factory pattern para familias UI. Crea objetos relacionados sin especificar clases concretas para familias de componentes cross-platform y theme-specific."
difficulty: intermediate
topics:
  - design
  - frontend
tags:
  - abstract-factory
  - creational-patterns
  - typescript
  - design-pattern
  - design-patterns
relatedResources:
  - /patterns/design/bridge-pattern-ui-themes
  - /patterns/design/abstract-factory-pattern
lastUpdated: "2026-06-18"
author: "Mathias Paulenko"
seo:
  metaDescription: "Abstract Factory pattern para familias UI. Crea objetos relacionados sin especificar clases concretas para familias de componentes cross-platform y theme-specific."
  keywords:
    - abstract factory
    - family of objects
    - cross platform ui
    - creational patterns
    - platform abstraction
---

# Abstract Factory para Familias de Componentes UI Cross-Platform

El Abstract Factory pattern provee una interfaz para crear familias de objetos relacionados sin especificar sus clases concretas. Cuando un sistema debe ser independiente de como sus productos son creados, compuestos y representados — especialmente a traves de plataformas o temas — Abstract Factory asegura consistencia dentro de cada familia mientras permite implementaciones intercambiables.

## Cuando Usar Esto

- Un sistema debe soportar multiples plataformas o temas con familias de componentes cohesionadas
- Necesitas garantizar que productos de la misma factory sean compatibles
- El proceso de creacion deberia estar oculto del codigo cliente

## Problema

Un toolkit de UI necesita renderizar botones nativos, checkboxes y dialogs en Web, iOS y Android. Usar Factory Method para cada widget independientemente riesga mezclar componentes nativos y web en la misma vista.

## Solucion

```typescript
// factory/UIFactory.ts
interface Button {
  render(): string;
  onClick(handler: () => void): void;
}

interface Checkbox {
  render(): string;
  toggle(): void;
  isChecked(): boolean;
}

interface Dialog {
  show(): void;
  hide(): void;
  setTitle(title: string): void;
}

interface UIFactory {
  createButton(label: string): Button;
  createCheckbox(label: string): Checkbox;
  createDialog(): Dialog;
}

// Familia Web
class WebButton implements Button {
  constructor(private label: string) {}
  render(): string { return `<button>${this.label}</button>`; }
  onClick(handler: () => void): void { /* attach DOM listener */ }
}

class WebCheckbox implements Checkbox {
  private checked = false;
  constructor(private label: string) {}
  render(): string { return `<label><input type="checkbox"> ${this.label}</label>`; }
  toggle(): void { this.checked = !this.checked; }
  isChecked(): boolean { return this.checked; }
}

class WebDialog implements Dialog {
  private title = '';
  show(): void { console.log('Show web dialog:', this.title); }
  hide(): void { console.log('Hide web dialog'); }
  setTitle(title: string): void { this.title = title; }
}

class WebFactory implements UIFactory {
  createButton(label: string): Button { return new WebButton(label); }
  createCheckbox(label: string): Checkbox { return new WebCheckbox(label); }
  createDialog(): Dialog { return new WebDialog(); }
}

// Familia Mobile
class MobileButton implements Button {
  constructor(private label: string) {}
  render(): string { return `[Mobile Button: ${this.label}]`; }
  onClick(): void { /* native tap handler */ }
}

class MobileCheckbox implements Checkbox {
  private checked = false;
  constructor(private label: string) {}
  render(): string { return `[Mobile Switch: ${this.label}]`; }
  toggle(): void { this.checked = !this.checked; }
  isChecked(): boolean { return this.checked; }
}

class MobileDialog implements Dialog {
  private title = '';
  show(): void { console.log('Show mobile modal:', this.title); }
  hide(): void { console.log('Dismiss mobile modal'); }
  setTitle(title: string): void { this.title = title; }
}

class MobileFactory implements UIFactory {
  createButton(label: string): Button { return new MobileButton(label); }
  createCheckbox(label: string): Checkbox { return new MobileCheckbox(label); }
  createDialog(): Dialog { return new MobileDialog(); }
}

// Cliente usa cualquier factory uniformemente
class SettingsScreen {
  private button: Button;
  private checkbox: Checkbox;
  private dialog: Dialog;

  constructor(factory: UIFactory) {
    this.button = factory.createButton('Save');
    this.checkbox = factory.createCheckbox('Dark Mode');
    this.dialog = factory.createDialog();
    this.dialog.setTitle('Confirm');
  }

  render(): string {
    return `${this.button.render()} ${this.checkbox.render()}`;
  }
}

// Uso
const webScreen = new SettingsScreen(new WebFactory());
const mobileScreen = new SettingsScreen(new MobileFactory());
```

## Como Funciona

1. **Abstract Factory** declara metodos de creacion para cada tipo de producto
2. **Concrete Factory** implementa creacion para una familia especifica
3. **Abstract Products** declaran interfaces para tipos de producto
4. **Concrete Products** implementan una variante para una familia
5. **Client** usa solo interfaces abstractas; la factory concreta determina la familia

## Consideraciones de Produccion

- Usa frameworks de inyeccion de dependencias para seleccionar la factory en runtime
- Abstract Factory funciona bien con [Bridge](/patterns/design/bridge-pattern) cuando las familias tambien necesitan renderizado especifico de plataforma
- Considera [registros de factory](/patterns/design/factory-pattern) para arquitecturas basadas en plugins

## Errores Comunes

- Agregar nuevos tipos de producto requiere cambiar todas las factories concretas
- Usar Abstract Factory cuando un simple Factory Method bastaria
- Crear familias demasiado amplias que comparten poco en comun

## Técnicas Avanzadas

### Composición de factory con inyección de dependencias

Combina Abstract Factory con contenedores DI para selección de factory en runtime:

```typescript
// factory/FactoryRegistry.ts
interface FactoryRegistry {
  register(key: string, factory: UIFactory): void;
  get(key: string): UIFactory;
}

class UIFactoryRegistry implements FactoryRegistry {
  private factories = new Map<string, UIFactory>();

  register(key: string, factory: UIFactory): void {
    this.factories.set(key, factory);
  }

  get(key: string): UIFactory {
    const factory = this.factories.get(key);
    if (!factory) throw new Error(`Factory not found: ${key}`);
    return factory;
  }
}

// Uso con DI
const registry = new UIFactoryRegistry();
registry.register('web', new WebFactory());
registry.register('mobile', new MobileFactory());

// Selección en runtime basada en ambiente
const platform = detectPlatform(); // 'web' | 'mobile'
const factory = registry.get(platform);
const screen = new SettingsScreen(factory);
```

### Carga dinámica de factories con plugins

Carga factories dinámicamente basadas en configuración o plugins:

```typescript
// factory/DynamicFactoryLoader.ts
interface FactoryConfig {
  type: string;
  module: string;
  className: string;
}

async function loadFactory(config: FactoryConfig): Promise<UIFactory> {
  const module = await import(config.module);
  const FactoryClass = module[config.className];
  return new FactoryClass();
}

// Selección de factory basada en config
const config: FactoryConfig = {
  type: 'ios',
  module: './factories/iOS',
  className: 'IOSFactory'
};

const factory = await loadFactory(config);
```

### Factory con creación de productos parametrizada

Pasa configuración a factories para instanciación flexible de productos:

```typescript
interface UIFactoryConfig {
  theme: 'light' | 'dark';
  locale: string;
  accessibility: boolean;
}

interface ConfigurableUIFactory extends UIFactory {
  setConfig(config: UIFactoryConfig): void;
}

class WebFactory implements ConfigurableUIFactory {
  private config: UIFactoryConfig = {
    theme: 'light',
    locale: 'en',
    accessibility: false
  };

  setConfig(config: UIFactoryConfig): void {
    this.config = { ...this.config, ...config };
  }

  createButton(label: string): Button {
    return new WebButton(label, this.config);
  }
}

class WebButton implements Button {
  constructor(
    private label: string,
    private config: UIFactoryConfig
  ) {}

  render(): string {
    const themeClass = this.config.theme === 'dark' ? 'dark-mode' : 'light-mode';
    return `<button class="${themeClass}">${this.label}</button>`;
  }

  onClick(handler: () => void): void { /* attach DOM listener */ }
}
```

### Encadenamiento de métodos de factory para ensamblaje complejo de productos

Encadena métodos de factory para construir productos complejos desde múltiples componentes:

```typescript
interface ComplexUIFactory extends UIFactory {
  createForm(): Form;
  createFormField(type: 'text' | 'number' | 'email'): FormField;
  createValidator(type: 'required' | 'email' | 'minLength'): Validator;
}

class WebFormFactory implements ComplexUIFactory {
  createButton(label: string): Button { /* ... */ }
  createCheckbox(label: string): Checkbox { /* ... */ }
  createDialog(): Dialog { /* ... */ }

  createForm(): Form {
    return new WebForm();
  }

  createFormField(type: string): FormField {
    return new WebFormField(type);
  }

  createValidator(type: string): Validator {
    return new WebValidator(type);
  }
}

// Cliente construye formulario complejo usando cadena de factory
const factory = new WebFormFactory();
const form = factory.createForm();
form.addField(factory.createFormField('text'));
form.addField(factory.createFormField('email'));
form.addValidator(factory.createValidator('required'));
```

### Inicialización lazy de factories con proxies

Usa proxies para diferir la instanciación de factory hasta el primer uso:

```typescript
class LazyUIFactory implements UIFactory {
  private factory: UIFactory | null = null;
  private factoryFactory: () => UIFactory;

  constructor(factoryFactory: () => UIFactory) {
    this.factoryFactory = factoryFactory;
  }

  private getFactory(): UIFactory {
    if (!this.factory) {
      this.factory = this.factoryFactory();
    }
    return this.factory;
  }

  createButton(label: string): Button {
    return this.getFactory().createButton(label);
  }

  createCheckbox(label: string): Checkbox {
    return this.getFactory().createCheckbox(label);
  }

  createDialog(): Dialog {
    return this.getFactory().createDialog();
  }
}

// Inicialización lazy
const lazyFactory = new LazyUIFactory(() => {
  console.log('Initializing WebFactory...');
  return new WebFactory();
});

// Factory no inicializada hasta primera llamada de método
const button = lazyFactory.createButton('Click me');
```

## Mejores Prácticas

1. **Mantén interfaces de factory enfocadas.** Cada factory debe crear una familia coherente de productos relacionados. Evita mezclar tipos de productos no relacionados en la misma factory.
2. **Usa composición sobre herencia.** Prefiere componer factories juntas en lugar de crear jerarquías de herencia profundas de clases de factory.
3. **Documenta compatibilidad de productos.** Documenta claramente qué productos de la misma familia son compatibles y cuáles son intercambiables.
4. **Considera el ciclo de vida de factory.** Decide si las factories son singletons, con scope a request, o creadas por caso de uso según las necesidades de tu aplicación.
5. **Proporciona defaults sensatos.** Cuando uses factories basadas en configuración, asegúrate que las configuraciones por defecto sean seguras y funcionen para la mayoría de casos comunes.
6. **Prueba la lógica de selección de factory.** Escribe unit tests para mecanismos de selección de factory para asegurar que la factory correcta sea elegida para cada plataforma o escenario.
7. **Evita sobre-abstractización.** No crees abstract factories para casos simples donde la instanciación directa sería más clara y mantenible.
8. **Monitorea el rendimiento de factory.** Perfila la creación de factory y la instanciación de productos para asegurar que la abstracción no introduzca overhead inaceptable.

## FAQ

**P: En que se diferencia de Factory Method?**
R: [Factory Method](/patterns/design/factory-pattern) crea un producto a traves de herencia. Abstract Factory crea familias de productos relacionados a traves de composicion.

**P: Cuando deberia evitar Abstract Factory?**
R: Cuando la familia de productos es pequena (2-3 productos) o cuando los productos no necesitan ser compatibles entre si.

**P: Puedo usar Abstract Factory con frameworks de inyeccion de dependencias?**
R: Sí. Los frameworks DI pueden inyectar la factory apropiada basada en configuración o ambiente, haciendo la selección de factory en runtime directa.

**P: Como manejo agregar un nuevo tipo de producto a una familia de factory existente?**
R: Agregar un nuevo tipo de producto requiere modificar la interfaz de abstract factory y todas las implementaciones de factory concreto. Esta es una limitación del patrón. Considera usar registros de factory o arquitecturas de plugins si necesitas adiciones frecuentes de tipos de producto.

**P: Puede Abstract Factory trabajar con codigo legacy existente?**
R: Sí. Puedes introducir Abstract Factory gradualmente creando adapter factories que envuelven lógica de instanciación legacy, luego migrar código cliente para usar las nuevas factories con el tiempo.

**P: Como se compara Abstract Factory con el patrón Builder?**
R: Abstract Factory se enfoca en crear familias de objetos relacionados con una interfaz común. Builder se enfoca en construir objetos complejos paso a paso. Pueden usarse juntos: Abstract Factory crea el builder, y el builder construye el producto.

**P: Deberia usar Abstract Factory para cambio de tema simple?**
R: Para cambio de tema simple (colores, fuentes), variables CSS u objetos de tema pueden ser más simples. Usa Abstract Factory cuando los temas requieren diferentes implementaciones de componentes, no solo diferencias de estilo.

**P: Puedo usar Abstract Factory para capas de acceso a datos?**
R: Sí. Abstract Factory se usa comúnmente para crear objetos de acceso a datos (DAOs) o implementaciones de repository específicas de base de datos, permitiendo que la aplicación cambie entre bases de datos SQL, NoSQL o stores en memoria.

**P: Como pruebo código que usa Abstract Factory?**
R: Usa factories mock en tests para crear test doubles de productos. Esto permite probar lógica cliente sin depender de implementaciones de producto reales o dependencias externas.

**P: ¿Es este patrón adecuado para proyectos pequeños?**
R: Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

**P: ¿Cómo se compara este patrón con alternativas?**
R: Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

**P: ¿Puedo aplicar este patrón parcialmente?**
R: Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
