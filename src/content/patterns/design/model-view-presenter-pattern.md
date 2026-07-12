---

contentType: patterns
slug: model-view-presenter-pattern
title: "Model-View-Presenter (MVP) Pattern"
description: "Separate presentation logic from the view by introducing a presenter that intermediates between the model and a passive view, enabling testable UI code."
metaDescription: "Learn the MVP Pattern for testable UI architecture. Examples in Python, Java, and JavaScript separating model, view, and presenter concerns."
difficulty: intermediate
topics:
  - design
tags:
  - model-view-presenter
  - pattern
  - design-pattern
  - structural
  - mvp
  - ui
  - testing
relatedResources:
  - /patterns/model-view-viewmodel-pattern
  - /patterns/front-controller-pattern
  - /patterns/page-controller-pattern
lastUpdated: "2026-06-25"
author: "StackPractices"
seo:
  metaDescription: "Learn the MVP Pattern for testable UI architecture. Examples in Python, Java, and JavaScript separating model, view, and presenter concerns."
  keywords:
    - model view presenter
    - mvp pattern
    - design pattern
    - ui architecture
    - testing

---

# Model-View-Presenter (MVP) Pattern

## Overview

The Model-View-Presenter (MVP) Pattern separates an application into three components: the **Model** (business logic and data), the **View** (UI display), and the **Presenter** (mediator that handles user input and updates both Model and View). The View is passive — it delegates all user actions to the Presenter and is updated by the Presenter in response.

MVP is especially valuable for creating testable UI code. Since the Presenter contains all presentation logic and has no dependency on UI frameworks, it can be unit tested in isolation with mocked Views.

## When to Use

Use the MVP Pattern when:
- You need highly testable UI logic without browser or GUI dependencies
- The view technology may change (web, desktop, mobile) but business logic remains
- You want to keep the view as simple and passive as possible
- Multiple views need to share the same presentation logic

## When to Avoid

- Simple UIs where the overhead of three separate components is not justified
- Applications where the view needs to be highly reactive (MVVM is better)
- The presenter becomes a God class that knows too much about both model and view
- Frameworks that naturally favor other patterns (React favors component-based over MVP)

## Solution

### Python

```python
from typing import Protocol

# Model
class User:
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email

class UserRepository:
    def __init__(self):
        self._users = {"1": User("Alice", "alice@example.com")}

    def find_by_id(self, user_id: str) -> User:
        return self._users.get(user_id)


# View Interface
class UserView(Protocol):
    def set_name(self, name: str): ...
    def set_email(self, email: str): ...
    def show_error(self, message: str): ...


# Presenter
class UserPresenter:
    def __init__(self, view: UserView, repository: UserRepository):
        self.view = view
        self.repository = repository

    def load_user(self, user_id: str):
        user = self.repository.find_by_id(user_id)
        if user:
            self.view.set_name(user.name)
            self.view.set_email(user.email)
        else:
            self.view.show_error("User not found")

    def save_user(self, user_id: str, name: str, email: str):
        if not name or not email:
            self.view.show_error("Name and email are required")
            return
        # Save logic...
        self.view.set_name(name)
        self.view.set_email(email)


# Concrete View (Console)
class ConsoleUserView:
    def __init__(self):
        self.name = ""
        self.email = ""
        self.error = ""

    def set_name(self, name: str):
        self.name = name
        print(f"Name: {name}")

    def set_email(self, email: str):
        self.email = email
        print(f"Email: {email}")

    def show_error(self, message: str):
        self.error = message
        print(f"Error: {message}")


# Usage
view = ConsoleUserView()
presenter = UserPresenter(view, UserRepository())
presenter.load_user("1")
```

### Java

```java
public class User {
    private final String name;
    private final String email;
    public User(String name, String email) {
        this.name = name;
        this.email = email;
    }
    public String getName() { return name; }
    public String getEmail() { return email; }
}

class UserRepository {
    private final java.util.Map<String, User> users = new java.util.HashMap<>();
    public UserRepository() {
        users.put("1", new User("Alice", "alice@example.com"));
    }
    public User findById(String id) { return users.get(id); }
}

interface UserView {
    void setName(String name);
    void setEmail(String email);
    void showError(String message);
}

class UserPresenter {
    private final UserView view;
    private final UserRepository repository;

    public UserPresenter(UserView view, UserRepository repository) {
        this.view = view;
        this.repository = repository;
    }

    public void loadUser(String userId) {
        User user = repository.findById(userId);
        if (user != null) {
            view.setName(user.getName());
            view.setEmail(user.getEmail());
        } else {
            view.showError("User not found");
        }
    }

    public void saveUser(String userId, String name, String email) {
        if (name == null || email == null || name.isEmpty() || email.isEmpty()) {
            view.showError("Name and email are required");
            return;
        }
        view.setName(name);
        view.setEmail(email);
    }
}

class ConsoleUserView implements UserView {
    public void setName(String name) { System.out.println("Name: " + name); }
    public void setEmail(String email) { System.out.println("Email: " + email); }
    public void showError(String message) { System.out.println("Error: " + message); }
}

// Usage
UserView view = new ConsoleUserView();
UserPresenter presenter = new UserPresenter(view, new UserRepository());
presenter.loadUser("1");
```

### JavaScript

```javascript
class User {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
}

class UserRepository {
  constructor() {
    this.users = new Map([['1', new User('Alice', 'alice@example.com')]]);
  }
  findById(id) {
    return this.users.get(id);
  }
}

class UserPresenter {
  constructor(view, repository) {
    this.view = view;
    this.repository = repository;
  }

  loadUser(userId) {
    const user = this.repository.findById(userId);
    if (user) {
      this.view.setName(user.name);
      this.view.setEmail(user.email);
    } else {
      this.view.showError('User not found');
    }
  }

  saveUser(userId, name, email) {
    if (!name || !email) {
      this.view.showError('Name and email are required');
      return;
    }
    this.view.setName(name);
    this.view.setEmail(email);
  }
}

class ConsoleUserView {
  setName(name) { console.log('Name:', name); }
  setEmail(email) { console.log('Email:', email); }
  showError(message) { console.log('Error:', message); }
}

// Usage
const view = new ConsoleUserView();
const presenter = new UserPresenter(view, new UserRepository());
presenter.loadUser('1');
```

## Explanation

MVP divides responsibility as follows:

- **Model**: Contains data structures and business rules. Has no knowledge of the UI.
- **View**: Displays data and forwards user actions to the Presenter. Contains zero logic.
- **Presenter**: Acts as the middleman. Receives user input from the View, manipulates the Model, and updates the View with results.

The key characteristic is that the **View is passive** — it does not pull data from the Model. All data flows through the Presenter.

## Variants

| Variant | View Role | Use Case |
|---------|-----------|----------|
| **Passive View** | View has no logic at all | Maximum testability |
| **Supervising Controller** | View can bind simple properties directly to Model | Reduces presenter boilerplate |
| **MVC** | Controller handles input, View observes Model | Frameworks like Rails, Django |
| **MVVM** | View binds to ViewModel properties | Reactive UIs (WPF, Vue, Angular) |

## What Works

- **Make the View an interface.** This enables unit testing the Presenter with a mock View.
- **Keep the View dumb.** No business logic, no data transformation, no decision-making.
- **The Presenter should not know the UI framework.** It talks to an abstract View interface.
- **One Presenter per screen.** Do not reuse a Presenter across unrelated views.
- **Model should be framework-agnostic.** It works with or without a UI.

## Common Mistakes

- **View knows about the Model.** The View should only know about the Presenter.
- **Presenter leaks framework code.** Importing UI toolkit classes makes testing hard.
- **The View is not passive.** If the View calls Model methods directly, it is MVC, not MVP.
- **Presenter as a God class.** If it grows too large, split into use-case-specific presenters.
- **Tight coupling between View and Presenter.** Use interfaces so either can be swapped.

## Real-World Examples

### Android (early)

Before Jetpack Compose, Android developers used MVP to separate Activities (Views) from Presenters, making business logic testable without the Android emulator.

### GWT (Google Web Toolkit)

GWT applications commonly used MVP to separate widget code (View) from application logic (Presenter) for testability.

### WinForms / WebForms

Microsoft's early UI frameworks used a variation of MVP where code-behind files acted as Presenters between the declarative view and the data model.

## Frequently Asked Questions

**Q: What is the difference between MVP and MVC?**
A: In MVC, the View observes the Model directly. In MVP, all communication goes through the Presenter and the View is passive.

**Q: What is the difference between MVP and MVVM?**
A: [MVVM](/patterns/design/model-view-viewmodel-pattern) uses two-way data binding between View and ViewModel. MVP uses explicit method calls through an interface.

**Q: Can I use MVP with React?**
A: You can, but React's component model naturally favors container/presentational components or hooks instead of classical MVP.

### Is this pattern suitable for small projects?

For small projects with few components, this pattern may add unnecessary complexity. Start simple and introduce the pattern when you feel the pain it solves.

### How does this pattern compare to alternatives?

Each pattern makes different trade-offs. Review the variants table above and consider your specific constraints: team size, performance requirements, and future scaling plans.

### Can I partially apply this pattern?

Yes. Many teams adopt patterns incrementally. Start with the core idea and add sophistication as needed. The pattern is a guide, not a strict blueprint.
