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
  metaDescription: "Learn the MVVM Pattern for reactive UI architecture. Examples in Python, Java, and JavaScript with two-way data binding between view and ViewModel."
  keywords:
    - model view viewmodel
    - mvvm pattern
    - design pattern
    - data binding
    - reactive ui

---

## Overview

The Model-View-ViewModel (MVVM) pattern splits an application into three layers: the **Model** handles data and
business logic, the **View** is the UI layout, and the **ViewModel** is the middle layer that exposes state and
behavior the View can bind to. The View connects to the ViewModel declaratively, so changes in the ViewModel flow
back into the View automatically.

Most reactive UI frameworks are built around some form of MVVM. WPF, Vue, Angular, and Jetpack Compose all give it
their own twist. The big win is keeping the View as a thin declarative layer while the ViewModel holds all the
testable presentation logic.

## When to Use

MVVM is worth it when your UI has to react automatically to state changes. It fits nicely when the view layer
supports data binding (XAML, Vue templates, Angular templates), when you want the View to be a pure declarative
mapping of the ViewModel, and when several views need to show the same ViewModel data in different ways.

## When to Avoid

For simple UIs with little interactivity or state, MVVM is usually overkill. It also gets awkward without a
data-binding framework, because without binding you're mostly adding boilerplate. Watch out when a single ViewModel
is getting too complex trying to serve unrelated views, or when you're in a performance-critical UI where binding
overhead isn't acceptable.

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

At the heart of MVVM is **data binding**. The **Model** keeps data and business rules and knows nothing about the
UI. The **ViewModel** exposes observable properties and commands, transforming Model data into formats the View can
use. The **View** then binds to those properties declaratively, so when the ViewModel changes, the View updates
automatically.

In frameworks like Vue or WPF, that binding is handled for you. The examples above use manual subscription so the
mechanic is visible, but in a real framework the plumbing is hidden.

## Variants

**One-way** binding is the simplest form: the ViewModel pushes data to the View and that's it. Picture a read-only
dashboard or a live stock ticker.

**Two-way** binding keeps the ViewModel and the View in sync, so editing either side updates the other. That kind
of sync is what you want for forms, input fields, and editable grids.

**Command** binding routes user actions from the View back to the ViewModel. A button that saves, deletes, or
navigates is the usual example.

**Computed** properties are calculated from other ViewModel properties. A total count, a filtered list, or a
formatted label usually falls into this bucket.

## Best Practices

- Keep the ViewModel framework-agnostic. It shouldn't import UI toolkit classes, so you can unit test it without a
  browser or device.
- Use observable properties. The ViewModel has to notify the View whenever state changes, otherwise the View
  stays stale.
- Avoid business logic in the ViewModel. Delegate to the Model or a service layer.
- Pair one ViewModel with one View. Sharing one across unrelated screens usually couples them.
- Expose commands, not callbacks. Have the View call `viewModel.submit()` instead of passing a function around.

## Common Mistakes

- Putting view logic in the ViewModel. Colors, fonts, and layout decisions belong in the View.
- Forgetting to notify. If the ViewModel changes and nobody is notified, the View stays stale.
- Letting the ViewModel directly manipulate the View. The ViewModel should only expose state; the View binds to it.
- Creating two-way binding loops. A change in the View updates the ViewModel, which updates the View, which updates
  the ViewModel again.
- Building monster ViewModels. Once a ViewModel has a huge list of properties, it becomes a maintenance headache.
  Break it apart by feature or screen.

## Real-World Examples

### WPF / .NET

WPF's XAML uses `{Binding Path=UserName}` to wire a UI control directly to a ViewModel property.
`INotifyPropertyChanged` then triggers the update.

### Vue.js

In Vue, templates bind to reactive data: `<input v-model="message">`. The `data()` or `setup()` function acts as
the ViewModel, and the template is the View.

### Android Jetpack

`ViewModel` + `LiveData` + `Data Binding` form Android's MVVM stack. The ViewModel survives configuration changes
like screen rotation.

## FAQ

### What is the difference between MVVM and MVP?

In [MVP](/patterns/model-view-presenter-pattern/) the View calls explicit methods through an interface. MVVM uses
declarative data binding where the ViewModel exposes properties that the View observes.

### Does MVVM require a binding framework?

Strictly speaking, yes. Without binding, you're closer to MVP. That said, a simple manual subscription can
approximate binding if you don't have a framework.

### Can I use MVVM with React?

React's hooks (`useState`, `useReducer`) and context API implement MVVM concepts. Custom hooks often serve as
ViewModels.

### Is this pattern suitable for small projects?

With only a few components, MVVM is usually overkill. Start simple and let the pattern appear once the code is
actually asking for it.

### How does this pattern compare to alternatives?

Look at the variants table above and think about what actually constrains you: team size, performance needs, and
how far the UI might grow.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication only where it
matters. MVVM is a guide, not a strict blueprint.
