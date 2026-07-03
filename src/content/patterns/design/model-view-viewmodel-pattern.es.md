---
contentType: patterns
slug: model-view-viewmodel-pattern
title: "Patrón Model-View-ViewModel (MVVM)"
description: "Vincula componentes UI declarativamente a un ViewModel que expone datos y comandos, habilitando sincronización automática entre view y estado."
metaDescription: "Aprende el Patrón MVVM para arquitectura UI reactiva. Ejemplos en Python, Java y JavaScript con data binding bidireccional entre view y ViewModel."
difficulty: intermediate
topics:
  - design
tags:
  - model-view-viewmodel
  - pattern
  - design-pattern
  - structural
  - mvvm
  - ui
  - data-binding
  - reactive
relatedResources:
  - /patterns/design/model-view-presenter-pattern
  - /patterns/design/front-controller-pattern
  - /patterns/design/page-controller-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Aprende el Patrón MVVM para arquitectura UI reactiva. Ejemplos en Python, Java y JavaScript con data binding bidireccional entre view y ViewModel."
  keywords:
    - model view viewmodel
    - mvvm pattern
    - design pattern
    - data binding
    - reactive ui
---

# Patrón Model-View-ViewModel (MVVM)

## Descripción General

El Patrón Model-View-ViewModel (MVVM) separa una aplicación en tres capas: el **Model** (datos y lógica de negocio), la **View** (layout y estructura de UI) y el **ViewModel** (estado y comportamiento expuesto a la View). La View se vincula al ViewModel declarativamente, y los cambios en el ViewModel se reflejan automáticamente en la View.

MVVM es el patrón dominante para frameworks de UI reactiva. WPF, Vue, Angular y Jetpack Compose usan variaciones de MVVM. La ventaja clave es que la View es una capa declarativa delgada mientras que el ViewModel contiene toda la lógica de presentación testeable.

## Cuándo Usar

Usa el Patrón MVVM cuando:
- Estás construyendo una UI reactiva donde los cambios de estado necesitan propagarse automáticamente
- La tecnología de view soporta data binding (XAML, templates de Vue, templates de Angular)
- Quieres que la View sea un mapeo declarativo puro del estado del ViewModel
- Múltiples views necesitan mostrar los mismos datos del ViewModel de forma diferente

## Cuándo Evitar

- UIs simples sin mucha interactividad o estado
- Entornos sin un framework de data binding (MVVM sin binding es doloroso)
- El ViewModel se vuelve demasiado complejo intentando servir múltiples views no relacionadas
- UIs críticas de performance donde el overhead de binding es inaceptable

## Solución

### Python

```python
from dataclasses import dataclass, field
from typing import List, Callable

@dataclass
class TodoItem:
    id: int
    text: str
    done: bool = False

# Model
class TodoRepository:
    def __init__(self):
        self._items = []
        self._next_id = 1

    def add(self, text: str) -> TodoItem:
        item = TodoItem(id=self._next_id, text=text)
        self._items.append(item)
        self._next_id += 1
        return item

    def toggle(self, item_id: int):
        for item in self._items:
            if item.id == item_id:
                item.done = not item.done

    def all(self) -> List[TodoItem]:
        return list(self._items)


# ViewModel
class TodoViewModel:
    def __init__(self, repository: TodoRepository):
        self._repo = repository
        self._listeners: List[Callable] = []

    def add_todo(self, text: str):
        self._repo.add(text)
        self._notify()

    def toggle(self, item_id: int):
        self._repo.toggle(item_id)
        self._notify()

    @property
    def items(self) -> List[TodoItem]:
        return self._repo.all()

    @property
    def completed_count(self) -> int:
        return sum(1 for item in self.items if item.done)

    def subscribe(self, listener: Callable):
        self._listeners.append(listener)

    def _notify(self):
        for listener in self._listeners:
            listener()


# View (Console)
class TodoConsoleView:
    def __init__(self, view_model: TodoViewModel):
        self.view_model = view_model
        self.view_model.subscribe(self.render)

    def render(self):
        print("\n--- Todo List ---")
        for item in self.view_model.items:
            status = "[x]" if item.done else "[ ]"
            print(f"{status} {item.text}")
        print(f"Completed: {self.view_model.completed_count}")

    def on_add(self, text: str):
        self.view_model.add_todo(text)

    def on_toggle(self, item_id: int):
        self.view_model.toggle(item_id)


# Uso
repo = TodoRepository()
vm = TodoViewModel(repo)
view = TodoConsoleView(vm)

view.on_add("Buy groceries")
view.on_add("Walk the dog")
view.on_toggle(1)
```

### Java

```java
import java.util.*;

class TodoItem {
    private final int id;
    private final String text;
    private boolean done;

    public TodoItem(int id, String text) {
        this.id = id;
        this.text = text;
    }

    public int getId() { return id; }
    public String getText() { return text; }
    public boolean isDone() { return done; }
    public void setDone(boolean done) { this.done = done; }
}

class TodoRepository {
    private final List<TodoItem> items = new ArrayList<>();
    private int nextId = 1;

    public TodoItem add(String text) {
        TodoItem item = new TodoItem(nextId++, text);
        items.add(item);
        return item;
    }

    public void toggle(int id) {
        items.stream().filter(i -> i.getId() == id).findFirst().ifPresent(i -> i.setDone(!i.isDone()));
    }

    public List<TodoItem> all() { return new ArrayList<>(items); }
}

class TodoViewModel {
    private final TodoRepository repository;
    private final List<Runnable> listeners = new ArrayList<>();

    public TodoViewModel(TodoRepository repository) {
        this.repository = repository;
    }

    public void addTodo(String text) {
        repository.add(text);
        notifyListeners();
    }

    public void toggle(int id) {
        repository.toggle(id);
        notifyListeners();
    }

    public List<TodoItem> getItems() { return repository.all(); }

    public int getCompletedCount() {
        return (int) repository.all().stream().filter(TodoItem::isDone).count();
    }

    public void subscribe(Runnable listener) { listeners.add(listener); }

    private void notifyListeners() { listeners.forEach(Runnable::run); }
}

class TodoConsoleView {
    private final TodoViewModel viewModel;

    public TodoConsoleView(TodoViewModel viewModel) {
        this.viewModel = viewModel;
        this.viewModel.subscribe(this::render);
    }

    public void render() {
        System.out.println("\n--- Todo List ---");
        for (TodoItem item : viewModel.getItems()) {
            System.out.println((item.isDone() ? "[x] " : "[ ] ") + item.getText());
        }
        System.out.println("Completed: " + viewModel.getCompletedCount());
    }

    public void onAdd(String text) { viewModel.addTodo(text); }
    public void onToggle(int id) { viewModel.toggle(id); }
}

// Uso
TodoRepository repo = new TodoRepository();
TodoViewModel vm = new TodoViewModel(repo);
TodoConsoleView view = new TodoConsoleView(vm);
view.onAdd("Buy groceries");
view.onAdd("Walk the dog");
view.onToggle(1);
```

### JavaScript

```javascript
class TodoItem {
  constructor(id, text) {
    this.id = id;
    this.text = text;
    this.done = false;
  }
}

class TodoRepository {
  constructor() {
    this.items = [];
    this.nextId = 1;
  }

  add(text) {
    const item = new TodoItem(this.nextId++, text);
    this.items.push(item);
    return item;
  }

  toggle(id) {
    const item = this.items.find(i => i.id === id);
    if (item) item.done = !item.done;
  }

  all() {
    return this.items;
  }
}

class TodoViewModel {
  constructor(repository) {
    this.repository = repository;
    this.listeners = [];
  }

  addTodo(text) {
    this.repository.add(text);
    this.notify();
  }

  toggle(id) {
    this.repository.toggle(id);
    this.notify();
  }

  get items() {
    return this.repository.all();
  }

  get completedCount() {
    return this.items.filter(i => i.done).length;
  }

  subscribe(listener) {
    this.listeners.push(listener);
  }

  notify() {
    this.listeners.forEach(l => l());
  }
}

class TodoConsoleView {
  constructor(viewModel) {
    this.viewModel = viewModel;
    this.viewModel.subscribe(() => this.render());
  }

  render() {
    console.log('\n--- Todo List ---');
    for (const item of this.viewModel.items) {
      console.log(`${item.done ? '[x]' : '[ ]'} ${item.text}`);
    }
    console.log(`Completed: ${this.viewModel.completedCount}`);
  }

  onAdd(text) {
    this.viewModel.addTodo(text);
  }

  onToggle(id) {
    this.viewModel.toggle(id);
  }
}

// Uso
const repo = new TodoRepository();
const vm = new TodoViewModel(repo);
const view = new TodoConsoleView(vm);

view.onAdd('Buy groceries');
view.onAdd('Walk the dog');
view.onToggle(1);
```

## Explicación

MVVM funciona a través de **data binding**:

- **Model**: Mantiene datos y reglas de negocio. No conoce la UI.
- **ViewModel**: Expone propiedades observables y comandos. Transforma datos del Model en formatos amigables para la View.
- **View**: Se vincula declarativamente a propiedades del ViewModel. Cuando el ViewModel cambia, la View se actualiza automáticamente.

En frameworks como Vue o WPF, el binding es automático. En nuestros ejemplos usamos suscripción manual para demostrar el concepto.

## Variantes

| Variante | Dirección de Binding | Caso de Uso |
|----------|----------------------|-------------|
| **One-way** | ViewModel → View | Displays de solo lectura, streams reactivos |
| **Two-way** | ViewModel ↔ View | Formularios, campos de input, grids editables |
| **Command** | View → ViewModel | Botones, acciones que disparan lógica |
| **Computed** | Derivado de otras propiedades | Agregaciones, listas filtradas |

## Lo que funciona

- **Mantén el ViewModel framework-agnostic.** No debería importar clases de UI toolkit.
- **Usa propiedades observables.** El ViewModel debe notificar a la View cuando el estado cambia.
- **Evita lógica de negocio en el ViewModel.** Delega al Model o capa de servicio.
- **Un ViewModel por View.** No compartas un ViewModel a través de pantallas no relacionadas.
- **Expón comandos, no callbacks.** La View llama `viewModel.submit()` en lugar de pasar una función.

## Errores Comunes

- **Poner lógica de view en el ViewModel.** Colores, fuentes y decisiones de layout pertenecen a la View.
- **Olvidar notificar.** Si el ViewModel cambia pero no notifica, la View permanece stale.
- **ViewModel manipulando la View directamente.** El ViewModel debería exponer estado; la View se vincula a él.
- **Loops de two-way binding.** Un cambio en la View actualiza el ViewModel, que actualiza la View, que actualiza el ViewModel...
- **ViewModels monstruosos.** Un ViewModel con 50 propiedades es difícil de mantener. Divide por feature o pantalla.

## Ejemplos del Mundo Real

### WPF / .NET

El XAML de WPF usa `{Binding Path=UserName}` para vincular controles UI a propiedades del ViewModel declarativamente. `INotifyPropertyChanged` dispara actualizaciones.

### Vue.js

Los templates de Vue se vinculan a datos reactivos: `<input v-model="message">`. La función `data()` actúa como el ViewModel, y el template es la View.

### Android Jetpack

`ViewModel` + `LiveData` + `Data Binding` forman el stack MVVM de Android. El ViewModel sobrevive cambios de configuración como rotación de pantalla.

## Preguntas Frecuentes

**Q: Cuál es la diferencia entre MVVM y MVP?**
A: [MVP](/patterns/design/model-view-presenter-pattern) usa llamadas a métodos explícitas a través de una interfaz. MVVM usa data binding declarativo donde el ViewModel expone propiedades que la View observa.

**Q: MVVM requiere un framework de binding?**
A: Estrictamente hablando sí. Sin binding, estás haciendo MVP. Sin embargo, una suscripción manual simple puede aproximar el binding.

**Q: Puedo usar MVVM con React?**
A: Los hooks de React (`useState`, `useReducer`) y la context API implementan conceptos de MVVM. Los custom hooks a menudo sirven como ViewModels.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, este patrón puede añadir complejidad innecesaria. Empieza simple e introduce el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace diferentes trade-offs. Revisa la tabla de variantes arriba y considera tus restricciones específicas: tamaño del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empieza con la idea central y añade sofisticación según sea necesario. El patrón es una guía, no un blueprint estricto.
