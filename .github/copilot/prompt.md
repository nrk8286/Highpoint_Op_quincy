
Welcome to HighPoint Solutions! This document provides a guide for using the Copilot coding agent within this repository.

## About the Project

HighPoint Solutions is an all-in-one solution designed to streamline housekeeping, maintenance, and compliance for modern facilities. It's built with Next.js for the frontend, uses Genkit for its AI features, and is deployed on Cloudflare Pages.

## Getting Started

To get the project running locally, follow these steps:

1.  **Install dependencies:**

    ```bash
    npm install
    ```

2.  **Run the development servers:**

    This project requires two development servers to be running simultaneously:

    *   **Next.js development server:**

        ```bash
        npm run dev
        ```

    *   **Genkit development server:**

        ```bash
        npm run genkit:dev
        ```

## Deployment

This project is configured for continuous deployment with Cloudflare Pages. Any changes pushed to the `main` branch will automatically be deployed.

To manually deploy the project, you can use the following command:

```bash
npm run deploy
```
