---
contentType: patterns
slug: mvc-pattern
title: "MVC Pattern"
description: "Separate application into Model, View, and Controller components. An architectural design pattern for organized, maintainable code."
metaDescription: "Learn the MVC Pattern with practical examples in Python, Java, and JavaScript. Architectural design pattern for organized application structure."
difficulty: intermediate
topics:
  - architecture
tags:
  - architectural
  - architecture
  - design-pattern
  - java
  - javascript
  - mvc
  - pattern
  - python
  - separation-of-concerns
relatedResources:
  - /patterns/design/repository-pattern
  - /patterns/design/observer-pattern
  - /guides/api/rest-api-design-guide
lastUpdated: "2026-06-10"
author: "Mathias Paulenko"
seo:
  metaDescription: "Learn the MVC Pattern with practical examples in Python, Java, and JavaScript. Architectural design pattern for organized application structure."
  keywords:
    - mvc pattern
    - design pattern
    - architectural pattern
    - model view controller
    - separation of concerns
    - python mvc
    - java mvc
    - javascript mvc
---

# MVC Pattern

## Overview

The [Model-View-Controller](/patterns/design/mvc-pattern-frontend) (MVC) Pattern is an architectural design pattern that separates an application into three interconnected components: Model (data and business logic), View (presentation), and Controller (input handling and coordination).

It is the foundation of many web frameworks (Django, Ruby on Rails, ASP.NET MVC) and desktop application architectures.

## When to Use

Use the MVC Pattern when:
- You want a clean separation between data, UI, and user interaction logic
- Multiple views need to display the same data (e.g., web and mobile)
- The UI changes frequently but the underlying data model stays stable
- You need to support different input mechanisms (web, CLI, API)
- Multiple developers work on different layers simultaneously

## Solution

### Python

```python
class UserModel:
    def __init__(self, name: str, email: str):
        self.name = name
        self.email = email

class UserView:
    def display(self, user: UserModel):
        print(f"User: {user.name} ({user.email})")

class UserController:
    def __init__(self, model: UserModel, view: UserView):
        self.model = model
        self.view = view

    def update_name(self, name: str):
        self.model.name = name
        self.view.display(self.model)

# Usage
controller = UserController(UserModel("Alice", "alice@example.com"), UserView())
controller.update_name("Alicia")
```

### JavaScript

```javascript
class UserModel {
  constructor(name, email) {
    this.name = name;
    this.email = email;
  }
}

class UserView {
  display(user) {
    console.log(`User: ${user.name} (${user.email})`);
  }
}

class UserController {
  constructor(model, view) {
    this.model = model;
    this.view = view;
  }

  updateName(name) {
    this.model.name = name;
    this.view.display(this.model);
  }
}

// Usage
const controller = new UserController(
  new UserModel("Alice", "alice@example.com"),
  new UserView()
);
controller.updateName("Alicia");
```

### Java

```java
class UserModel {
    String name;
    String email;
    UserModel(String name, String email) {
        this.name = name;
        this.email = email;
    }
}

class UserView {
    void display(UserModel user) {
        System.out.println("User: " + user.name + " (" + user.email + ")");
    }
}

class UserController {
    private UserModel model;
    private UserView view;
    UserController(UserModel model, UserView view) {
        this.model = model;
        this.view = view;
    }
    void updateName(String name) {
        model.name = name;
        view.display(model);
    }
}

// Usage
UserController controller = new UserController(
    new UserModel("Alice", "alice@example.com"),
    new UserView()
);
controller.updateName("Alicia");
```

## Explanation

MVC divides responsibility into three layers:

- **Model**: Manages data and business rules. Notifies views when data changes.
- **View**: Renders the model's data. In modern apps, this is often a template or component.
- **Controller**: Accepts user input, processes it, and updates the model or view accordingly.

In modern web frameworks, the Controller often maps HTTP routes to Model operations, while the View is rendered server-side or as a single-page application.

## Variants

| Variant | Use Case | Trade-off |
|---------|----------|-----------|
| **Classic MVC** | Desktop apps (Smalltalk-style) | Tight view-model coupling |
| **MVP** | Testable UI layers | Presenter becomes a "god class" |
| **MVVM** | Frontend frameworks (Vue, Angular) | Two-way binding adds complexity |

## What Works

- **Keep Models ignorant of Views**: Models should not know how they are displayed
- **Make Views read-only from the Model**: Views observe models, but do not modify them directly
- **Keep Controllers thin**: Business logic belongs in the Model, not the Controller
- **Use the [Observer Pattern](/patterns/design/observer-pattern)** for Model-to-View updates to reduce coupling
- **Avoid direct Model access from Views**: Always go through the Controller or a ViewModel

## Common Mistakes

- **Fat controllers**: Putting business logic in controllers instead of models
- **View-driven models**: Changing the model structure to match a specific view's needs
- **Tight coupling**: Views directly calling model methods instead of using events
- **Over-engineering**: Using full MVC for a simple script where separation adds no value
- **Ignoring data flow**: Allowing views to modify models directly, bypassing the controller

## Frequently Asked Questions

**Q: Is MVC still relevant with modern frontend frameworks?**
A: Yes, though often in evolved forms. React uses a unidirectional data flow that separates concerns similarly. Angular implements MVVM, which is a direct descendant.

**Q: What is the difference between MVC and MVVM?**
A: [MVVM](/patterns/design/mvc-pattern-frontend) replaces the Controller with a ViewModel that binds directly to the View via two-way data binding. It is more common in frontend frameworks.

**Q: Can I use MVC in a serverless architecture?**
A: Yes, though the "Controller" may be an API Gateway or Lambda function, the "Model" is your data layer, and the "View" is the JSON response or rendered template.
