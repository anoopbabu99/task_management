# Secure Task Management System

## 🛠 Setup & Installation

### **Prerequisites**
Ensure you have the following installed on your machine:
* **Node.js** (v18 or higher)
* **NPM** or **Yarn**
* **Git**


## Console used: BASH

### **Installation**

Clone the repository and install dependencies:
```bash
git clone https://github.com/anoopbabu99/task_management.git
cd task_management
npm install
```

### **Running the Application**
You can start both the Backend API and Frontend Dashboard simultaneously with a single command:
### npx nx run-many --target=serve --projects=api,dashboard

Once the servers are running:

##### Frontend Dashboard: http://localhost:4200

##### Backend API: http://localhost:3000/api

Some data is already seeded into: database.sqlite so you can see sample entries!

sample users:
1. (owner)
username: elon
password: password123

2. (admin)
username: gwynne
password: password123

3. (viewer)
username: tom
password: password123

### Signup to add new org, users etc!

## Architecture Overview

### **Environment Configuration (.env)**
The application uses environment variables for database connection and JWT security.
Create a file named .env in the root directory of the project and populate it with the following:
### Security (JWT) .env folder:
##### JWT_SECRET=super_secret_secure_key_123!
##### DATABASE_NAME=database.sqlite
##### CLAUDE_API_KEY=

### Database (SQLite)
DATABASE_NAME=database.sqlite
For the purpose of this assessment, the application includes fallback defaults for development ease. The database.sqlite file will be automatically created in the root directory upon the first launch.

This project is architected as an **Nx Monorepo**, ensuring strictly typed contracts between the Frontend and Backend while maximizing code reuse and modularity.

### **1. Monorepo Layout & Rationale**
The workspace is structured into **Applications** (deployable units) and **Libraries** (shared logic).

| Directory | Type | Stack | Responsibility |
| :--- | :--- | :--- | :--- |
| **`apps/api`** | Backend | NestJS + TypeORM | Secure REST API handling business logic, database transactions, and RBAC enforcement. |
| **`apps/dashboard`** | Frontend | Angular + Tailwind | Reactive Single Page Application (SPA) managing UI state and user interactions. |
| **`libs/`** | Shared | TypeScript | Reusable modules consumed by both apps to prevent code duplication. |

**Rationale for Monorepo:**
* **Type Safety across Boundaries:** By sharing interfaces, a change in the Backend data model instantly triggers compile-time errors in the Frontend, preventing runtime integration bugs.
* **Atomic Commits:** Features spanning both stack ends (e.g., "Add Task Priority") are committed together, simplifying version control.
* **DRY Principle:** Core logic is written once in `libs` and imported wherever needed.

---

### **2. Shared Libraries & Modules**
To meet the requirement for modularity, core logic was extracted into dedicated libraries:

#### **`libs/data` (The Contract)**
This library serves as the **Single Source of Truth** for the entire system.
* **Contents:** Shared TypeScript Interfaces (`ITask`, `IUser`), DTOs (`CreateTaskDto`), and Enums (`UserRole`, `TaskStatus`).
* **Usage:**
    * **Backend:** Entities implement these interfaces to ensure database schemas match the contract.
    * **Frontend:** Services use these types for strict HTTP response typing.

#### **🛡️ `libs/auth` (The Security Layer)**
This library contains reusable **Role-Based Access Control (RBAC)** logic.
* **Contents:**
    * `@Roles(...)` Decorator: A custom metadata stamp for protecting routes.
    * `RolesGuard`: The interceptor that verifies permissions against the JWT payload.
* **Usage:** Imported by the API to secure endpoints (e.g., `DELETE /tasks/:id`) without cluttering business logic.

## 🗄️ Data Model & Schema

The database schema is managed using **TypeORM** in a "Code-First" approach. We define high-level TypeScript entities, and the ORM automatically compiles them into SQL tables (`CREATE TABLE...`) with proper Foreign Key constraints.

### **1. Entity Relationship Diagram (ERD)**



```mermaid
erDiagram
    ORGANIZATION ||--o{ ORGANIZATION : "has parent"
    ORGANIZATION ||--|{ USER : "employs"
    USER ||--o{ TASK : "owns"
    USER ||--o{ AUDIT_LOG : "generates"

    ORGANIZATION {
        string id PK
        string name
        string parentId FK "Self-referencing for Hierarchy"
    }
    USER {
        string id PK
        string username
        string password "Hashed"
        enum role "OWNER, ADMIN, VIEWER"
        string organizationId FK
    }
    TASK {
        string id PK
        string title
        enum status "OPEN, IN_PROGRESS, DONE"
        string userId FK
    }
    AUDIT_LOG {
        string id PK
        string action "DELETE, UPDATE"
        string resourceId
        timestamp createdAt
        string userId FK
    }
``` 
### 2. Schema Description

#### Organization (Recursive Hierarchy)
* **Purpose:** Handles the "2-level hierarchy" requirement (Parent Corp vs. Departments).
* **Key Field:** `parentId` (Foreign Key).
* **Logic:** A **Self-Referencing Relationship**.
    * *Parent Organization:* `parentId` is NULL (e.g., "SpaceX").
    * *Sub-Organization:* `parentId` points to the Parent (e.g., "Engineering" points to "SpaceX").
    * *Why?* This allows for efficient recursive queries (e.g., "Find all departments under SpaceX") using a simple self-join, rather than creating a separate table for departments.

#### User
* **Purpose:** Identity management and Role-Based Access Control (RBAC).
* **Relationships:**
    * Belongs to one `Organization` (`organizationId` FK).
    * Has many `Tasks`.
* **Security:** Passwords are salted and hashed using `bcrypt` before storage.

#### Task
* **Purpose:** The core operational resource.
* **Key Design:** Uses a `userId` Foreign Key to enforce **Strict Ownership**.
* **Why strict ownership?** Instead of just linking tasks to an organization, linking them to a specific user allows for **Row-Level Security**.
    * *Viewer Query:* `SELECT * FROM task WHERE userId = :currentUserId` (Can only see their own rows).
    * *Admin Query:* `SELECT * FROM task WHERE organizationId = :orgId` (Can see all rows in the department).

#### Audit Log
* **Purpose:** Security, Accountability, and Compliance.
* **Why a separate table?** We separated `AuditLog` from `Task` for three reasons:
    1. **Immutability:** Operational data (Tasks) is mutable and can be overwritten. The Audit Log is append-only, preserving the history of *who* did *what* and *when*.
    2. **Forensics:** If a "fishy" actor deletes a task, the row is removed from the `Task` table. However, the `AuditLog` table retains the `DELETE` action, the `userId` of the perpetrator, and the timestamp.
    3. **Performance:** Decouples heavy historical data from the fast, real-time `Task` table.

### 3. Design Decisions

* **ORM (TypeORM):** Used to prevent SQL Injection and manage schema evolution. TypeScript classes (`@Entity`) are the single source of truth, converting strictly typed code into raw SQL `CREATE` statements at runtime.
* **Foreign Keys (Referential Integrity):**
    * `ON DELETE CASCADE` is used for Users and Tasks. If a User is deleted, their Tasks are automatically cleaned up by the database engine, preventing "orphan records."

    ## 🔐 Access Control & Security Strategy

The core of this application is a "Zero-Trust" security model. We assume that even authenticated users should only have access to the absolute minimum data required to do their job (**Least Privilege Principle**).

### **1. Role Hierarchy & Permissions**

The system enforces a strict 3-tier hierarchy based on the Organization structure.

* **OWNER (Global Scope)**
    * **Context:** The head of the main Organization (e.g., Elon at SpaceX).
    * **Permissions:** Can Create, Read, Update, and **Delete** any task in the entire hierarchy (including all sub-organizations). Can view all Audit Logs.

* **ADMIN (Department Scope)**
    * **Context:** The manager of a Sub-Organization (e.g., Head of Engineering).
    * **Permissions:** Can manage all tasks *within their specific department*. Can delete tasks to maintain board hygiene.

* **VIEWER (Personal Scope)**
    * **Context:** An individual contributor or external auditor.
    * **Permissions:** **Strictly Limited**. Can only View, Create, and Edit tasks assigned specifically to *them*.
    * **Restrictions:** Cannot Delete tasks. Cannot view Audit Logs. Cannot see tasks belonging to other colleagues in the same department.

### **3. JWT Integration with Access Control**

We do not query the database to check permissions on every request. Instead, we use **Stateless Authentication** via JWTs.

1.  **Token Generation:** When a user logs in, the backend signs a JWT containing their `role`, `userId`, and `organizationId`.
2.  **The Guard (`RolesGuard`):** A custom NestJS Guard intercepts every request before it reaches the controller.
    * It extracts the JWT from the `Authorization` header.
    * It reads the `@Roles('ADMIN')` decorator on the route.
    * It compares the token's role against the required role.
3.  **The outcome:**
    * If a **Viewer** tries to `DELETE /tasks/:id`, the Guard sees they lack the `ADMIN` role and throws `403 Forbidden` instantly. The database is never even touched.

##  API Documentation

The API follows strict **RESTful** principles. All endpoints (except `/auth/login`) require a valid **Bearer Token** in the Authorization header.

### **1. Authentication**

#### **POST /auth/login**
Authenticates a user and returns a JWT.

**Request Body:**
```json
{
  "username": "elon",
  "password": "password123"
}
```

**Response (201 Created):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

---

### **2. Tasks Management**

#### **GET /tasks**
Retrieves a list of tasks.
* **Scope:**
    * **Admins/Owners:** Returns all tasks in the Organization/Department.
    * **Viewers:** Returns **only** tasks assigned to the current user.

**Response (200 OK):**
```json
[
  {
    "id": "task-uuid-1",
    "title": "Launch Starship",
    "description": "Prepare booster for static fire",
    "status": "IN_PROGRESS",
    "userId": "user-uuid-elon"
  },
  {
    "id": "task-uuid-2",
    "title": "Buy Twitter",
    "description": "Negotiate deal",
    "status": "DONE",
    "userId": "user-uuid-elon"
  }
]
```

#### **POST /tasks**
Creates a new task.

**Request Body:**
```json
{
  "title": "Refuel Booster",
  "description": "Load LOX and Methane",
  "status": "OPEN"
}
```

**Response (201 Created):**
```json
{
  "id": "task-uuid-3",
  "title": "Refuel Booster",
  "description": "Load LOX and Methane",
  "status": "OPEN",
  "userId": "user-uuid-current"
}
```

#### **DELETE /tasks/:id**
Deletes a task by ID.

* **Response (200 OK):** Task successfully deleted.
* **Response (403 Forbidden):** Returned if a **Viewer** attempts to delete a task (Strict RBAC enforcement).

---

### **3. Organization Hierarchy**

#### **GET /organizations/:id**
Retrieves organization details and its sub-departments.

**Response (200 OK):**
```json
{
  "id": "org-spacex",
  "name": "SpaceX",
  "children": [
    {
      "id": "dept-engineering",
      "name": "Engineering",
      "parentId": "org-spacex"
    },
    {
      "id": "dept-sales",
      "name": "Sales",
      "parentId": "org-spacex"
    }
  ]
}
```


## Testing the application: 

### Backend: npx nx test api
### Frontend: npx nx test dashboard