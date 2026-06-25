---
contentType: patterns
slug: model-view-viewmodel-pattern
title: "Model-View-ViewModel (MVVM) Pattern"
description: "Bind UI components declaratively to a ViewModel that exposes data and commands, enabling automatic synchronization between view and state."
metaDescription: "Learn the MVVM Pattern for reactive UI architecture. Examples in Python, Java, and JavaScript with two-way data binding between view and ViewModel."
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
  metaDescription: "Learn the MVVM Pattern for reactive UI architecture. Examples in Python, Java, and JavaScript with two-way data binding between view and ViewModel."
  keywords:
    - model view viewmodel
    - mvvm pattern
    - design pattern
    - data binding
    - reactive ui
---

# Model-View-ViewModel (MVVM) Pattern

## Overview

The Model-View-ViewModel (MVVM) Pattern separates an application into three layers: the **Model** (data and business logic), the **View** (UI layout and structure), and the **ViewModel** (state and behavior exposed to the View). The View binds to the ViewModel declaratively, and changes in the ViewModel automatically reflect in the View.

MVVM is the dominant pattern for reactive UI frameworks. WPF, Vue, Angular, and Jetpack Compose all use variations of MVVM. The key advantage is that the View is a thin declarative layer while the ViewModel holds all testable presentation logic.

## When to Use

Use the MVVM Pattern when:
- You are building a reactive UI where state changes need to propagate automatically
- The view technology supports data binding (XAML, Vue templates, Angular templates)
- You want the View to be a pure declarative mapping of ViewModel state
- Multiple views need to display the same ViewModel data differently

## When to Avoid

- Simple UIs without much interactivity or state
- Environments without a data binding framework (MVVM without binding is painful)
- The ViewModel becomes too complex trying to serve multiple unrelated views
- Performance-critical UIs where binding overhead is unacceptable

## Solution

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


# Usage
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

// Usage
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

// Usage
const repo = new TodoRepository();
const vm = new TodoViewModel(repo);
const view = new TodoConsoleView(vm);

view.onAdd('Buy groceries');
view.onAdd('Walk the dog');
view.onToggle(1);
```

## Explanation

MVVM works through **data binding**:

- **Model**: Holds data and business rules. Unaware of the UI.
- **ViewModel**: Exposes observable properties and commands. It transforms Model data into View-friendly formats.
- **View**: Declaratively binds to ViewModel properties. When the ViewModel changes, the View updates automatically.

In frameworks like Vue or WPF, the binding is automatic. In our examples above, we use manual subscription to demonstrate the concept.

## Variants

| Variant | Binding Direction | Use Case |
|---------|-------------------|----------|
| **One-way** | ViewModel → View | Read-only displays, reactive streams |
| **Two-way** | ViewModel ↔ View | Forms, input fields, editable grids |
| **Command** | View → ViewModel | Buttons, actions that trigger logic |
| **Computed** | Derived from other properties | Aggregations, filtered lists |

## Best Practices

- **Keep the ViewModel framework-agnostic.** It should not import UI toolkit classes.
- **Use observable properties.** The ViewModel must notify the View when state changes.
- **Avoid business logic in the ViewModel.** Delegate to the Model or service layer.
- **One ViewModel per View.** Do not share a ViewModel across unrelated screens.
- **Expose commands, not callbacks.** The View calls `viewModel.submit()` rather than passing a function.

## Common Mistakes

- **Putting view logic in the ViewModel.** Colors, fonts, and layout decisions belong in the View.
- **Forgetting to notify.** If the ViewModel changes but does not notify, the View stays stale.
- **ViewModel directly manipulating the View.** The ViewModel should expose state; the View binds to it.
- **Two-way binding loops.** A change in the View updates the ViewModel, which updates the View, which updates the ViewModel...
- **Monster ViewModels.** A ViewModel with 50 properties is hard to maintain. Split by feature or screen.

## Real-World Examples

### WPF / .NET

WPF's XAML uses `{Binding Path=UserName}` to declaratively bind UI controls to ViewModel properties. `INotifyPropertyChanged` triggers updates.

### Vue.js

Vue templates bind to reactive data: `<input v-model="message">`. The `data()` function acts as the ViewModel, and the template is the View.

### Android Jetpack

`ViewModel` + `LiveData` + `Data Binding` form Android's MVVM stack. The ViewModel survives configuration changes like screen rotation.

## Frequently Asked Questions

**Q: What is the difference between MVVM and MVP?**
A: [MVP](/patterns/design/model-view-presenter-pattern) uses explicit method calls through an interface. MVVM uses declarative data binding where the ViewModel exposes properties that the View observes.

**Q: Does MVVM require a binding framework?**
A: Strictly speaking yes. Without binding, you are doing MVP. However, simple manual subscription can approximate binding.

**Q: Can I use MVVM with React?**
A: React's hooks (`useState`, `useReducer`) and context API implement MVVM concepts. Custom hooks often serve as ViewModels.
