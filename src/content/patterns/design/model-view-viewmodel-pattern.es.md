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
  - pattern
  - design-pattern
  - structural
  - ui
  - data
  - reactive
relatedResources:
  - /patterns/model-view-presenter-pattern
  - /patterns/mvc-pattern
  - /patterns/observer-pattern
  - /patterns/dependency-injection-pattern
  - /patterns/command-pattern
  - /patterns/composite-pattern-ui
lastUpdated: "2026-08-22"
publishedAt: "2026-06-25"
author: Mathias Paulenko
seo:
  metaDescription: "Aprende el Patrón MVVM para arquitectura UI reactiva. Ejemplos en Python, Java y JavaScript con data binding bidireccional entre view y ViewModel."
  keywords:
    - model view viewmodel
    - mvvm pattern
    - design pattern
    - data binding
    - reactive ui

---

## Descripción General

El patrón Model-View-ViewModel (MVVM) separa una aplicación en tres capas: el **Model** maneja los datos y la
lógica de negocio, la **View** es el layout de UI, y el **ViewModel** expone estado y comportamiento al que la
View puede bindearse. La View se conecta al ViewModel de forma declarativa, así los cambios en el ViewModel se
reflejan automáticamente en la View.

MVVM es el patrón dominante para frameworks de UI reactiva. WPF, Vue, Angular y Jetpack Compose usan variaciones
del mismo. La gran ventaja es mantener la View como una capa declarativa delgada mientras el ViewModel contiene
toda la lógica de presentación testeable.

## Cuándo Usar

Usá MVVM cuando estés construyendo una UI reactiva donde los cambios de estado necesiten propagarse
automáticamente. Sirve cuando tu tecnología de view soporta data binding (XAML, templates de Vue, templates de
Angular), cuando querés que la View sea un mapeo declarativo puro del estado del ViewModel, y cuando distintas
views necesiten mostrar los mismos datos del ViewModel de forma diferente.

## Cuándo Evitar

Evitá MVVM para UIs simples sin mucha interactividad o estado. También se vuelve incómodo en entornos sin un
framework de data binding, porque MVVM sin binding es mayormente boilerplate extra. No lo uses cuando un solo
ViewModel se vuelve demasiado complejo intentando servir views no relacionadas, o en UIs críticas de performance
donde el overhead de binding es inaceptable.

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

MVVM funciona a través de **data binding**. El **Model** mantiene datos y reglas de negocio y no sabe nada de la
UI. El **ViewModel** expone propiedades observables y comandos, transformando datos del Model en formatos que la
View pueda usar. La **View** se vincula a esas propiedades de forma declarativa, así que cuando el ViewModel
cambia, la View se actualiza automáticamente.

En frameworks como Vue o WPF, ese binding se maneja automáticamente. Los ejemplos de arriba usan suscripción
manual para que el mecanismo sea visible, pero en un framework real el plumbing está oculto.

## Variantes

El binding **One-way** es la forma más simple: el ViewModel empuja datos a la View y listo. Imaginá un dashboard de
solo lectura o un ticker de valores en vivo.

El binding **Two-way** mantiene sincronizados al ViewModel y a la View, así que editar cualquiera actualiza al otro.
Ese es el comportamiento que querés para formularios, campos de input y grids editables.

El binding **Command** enruta acciones del usuario desde la View de vuelta al ViewModel. Un botón de salvar, borrar o
navegar es el ejemplo habitual.

Las propiedades **Computed** se derivan de otras propiedades del ViewModel. Un conteo total, una lista filtrada o
una etiqueta formateada suele calcularse en lugar de guardarse.

## Buenas Prácticas

- Mantené el ViewModel framework-agnostic. No debería importar clases de UI toolkit, así podés testearlo sin un
  browser o dispositivo.
- Usá propiedades observables. El ViewModel tiene que notificar a la View cuando el estado cambia; si no, la View
  se queda stale.
- Evitá lógica de negocio en el ViewModel. Delegá al Model o a una capa de servicio.
- Usá un ViewModel por View. No compartas un ViewModel entre pantallas no relacionadas.
- Exponé comandos, no callbacks. La View llama a `viewModel.submit()` en lugar de pasar una función.

## Errores Comunes

- Poner lógica de view en el ViewModel. Colores, fuentes y decisiones de layout pertenecen a la View.
- Olvidar notificar. Si el ViewModel cambia pero no notifica, la View se queda stale.
- Dejar que el ViewModel manipule la View directamente. El ViewModel debería exponer estado; la View se vincula a él.
- Crear loops de two-way binding. Un cambio en la View actualiza el ViewModel, que actualiza la View, que vuelve a
  actualizar el ViewModel.
- Construir ViewModels monstruosos. Un ViewModel con 50 propiedades es difícil de mantener. Dividilo por feature o
  pantalla.

## Ejemplos del Mundo Real

### WPF / .NET

El XAML de WPF usa `{Binding Path=UserName}` para vincular controles UI a propiedades del ViewModel.
`INotifyPropertyChanged` dispara actualizaciones.

### Vue.js

Los templates de Vue se vinculan a datos reactivos: `<input v-model="message">`. La función `data()` o `setup()`
actúa como el ViewModel, y el template es la View.

### Android Jetpack

`ViewModel` + `LiveData` + `Data Binding` forman el stack MVVM de Android. El ViewModel sobrevive cambios de
configuración como la rotación de pantalla.

## Preguntas Frecuentes

### ¿Cuál es la diferencia entre MVVM y MVP?

[MVP](/patterns/model-view-presenter-pattern/) usa llamadas a métodos explícitas a través de una interfaz. MVVM
usa data binding declarativo donde el ViewModel expone propiedades que la View observa.

### ¿MVVM requiere un framework de binding?

Estrictamente hablando, sí. Sin binding, estás más cerca de MVP. Dicho eso, una suscripción manual simple puede
aproximar el binding si no tenés un framework.

### ¿Puedo usar MVVM con React?

Los hooks de React (`useState`, `useReducer`) y la context API implementan conceptos de MVVM. Los custom hooks a
menudo sirven como ViewModels.

### ¿Es este patrón adecuado para proyectos pequeños?

Para proyectos pequeños con pocos componentes, MVVM puede añadir complejidad innecesaria. Empezá simple e
introducí el patrón cuando sientas el problema que resuelve.

### ¿Cómo se compara este patrón con alternativas?

Cada patrón hace distintos trade-offs. Revisá la tabla de variantes de arriba y ponderá tus restricciones: tamaño
del equipo, requisitos de rendimiento y planes de escalado.

### ¿Puedo aplicar este patrón parcialmente?

Sí. Muchos equipos adoptan patrones incrementalmente. Empezá con la idea central y agregá sofisticación según
necesites. MVVM es una guía, no un blueprint estricto.
