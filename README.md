# Task & Link Manager - Backend Server

A lightweight and efficient Node.js and Express server that acts as a persistence layer for the Task & Link Manager. It features a built-in web portal and a specialized API for bi-directional synchronization.

## 🚀 Key Features

-   **Node.js & Express Architecture**: Built on a solid and fast backend foundation.
-   **SQLite Database**: A serverless, file-based database that requires zero configuration.
-   **Sync Engine**: Intelligent synchronization API that handles task merging and soft-deletes using `updated_at` timestamps.
-   **Web Portal**: A fully functional, responsive web interface accessible through your browser. 
-   **RESTful API**: Clean endpoints for managing tasks and their associated links.
-   **CORS Support**: Pre-configured to communicate securely with Chrome extensions.

## 💾 Database Schema

The SQLite database consists of two main tables with a one-to-many relationship:
-   **Tasks**: Stores the title, description, priority, and metadata.
-   **Links**: Stores URLs and their relationship to specific tasks.

## 🛠️ API Overview

-   `GET /api/tasks`: Retrieves all active tasks with their nested links.
-   `POST /api/tasks`: Creates a new task or updates an existing one if a newer version is provided.
-   `PUT /api/tasks/:id`: Updates task details.
-   `DELETE /api/tasks/:id`: Marks a task as deleted (soft delete).
-   `POST /api/tasks/:id/links`: Adds or updates a link for a specific task.
-   `DELETE /api/tasks/:taskId/links/:linkId`: Marks a link as deleted.

## ⚙️ Getting Started

### Prerequisites

-   [Node.js](https://nodejs.org/) (v14 or higher)
-   `npm` (comes with Node.js)

### Installation & Run

1.  Navigate to the `task-link-manager-backend` directory.
2.  Install the required dependencies:
    ```bash
    npm install
    ```
3.  Start the server:
    ```bash
    node server.js
    ```
4.  The server should now be running at `http://localhost:3000`.
5.  Visit `http://localhost:3000` in your browser to access the **Web Portal**.

## 🌐 Web Portal

The backend includes a **companion web application** located in the `public/` directory. This allows you to manage your task list from any browser without needing the Chrome extension installed.

## 📄 License

This project is licensed under the ISC License.
