# Full-Stack Web Application Template

This repository provides a predefined template for a full-stack web application built with React and Node.js. It contains everything you need to create a fully functional application with both server and UI components. The template is designed to be easily hosted on platforms like Vercel and Netlify, with both frontend and backend services running seamlessly on the same domain.


## Setup Guide

### Frontend (FE)
The `FE` directory contains the frontend code for the application. 
- **Default Stack:** Built with React and Vite. However, you can swap this out for any frontend framework.
- **Build Requirement:** Ensure that your final static build files (HTML, CSS, JS, and public assets) are generated inside a `dist` folder.
- **Configuration:** Deployment configurations are defined in `netlify.toml` and `vercel.json` and can be updated as needed.

### Backend (BE)
The `BE` directory contains the backend code.
- **Default Stack:** Built with Node.js and Express. Like the frontend, this can be adapted to other frameworks.

The backend consists of three primary files:
- `index.js`: The main entry point for serverless functions. It wraps `app.js` using `serverless-http` to handle API calls configured in `netlify.toml` or `vercel.json`. *(Do not modify unless necessary)*
- `server.js`: Used for local development. It imports the app from `app.js` and listens on a specified local port. *(Do not modify unless necessary)*
- `app.js`: The core of your backend application. All API endpoints, middleware, and server configurations should be added here.

## Routing & API
As defined in the `netlify.toml` and `vercel.json` configuration files:
- Any request starting with `/api/*` is automatically proxied to the backend serverless functions.
- All other requests (`/*`) are routed to the frontend's `index.html` to fully support client-side routing.

## Local Development
To run this project locally, you will need to start both the frontend and backend servers:

1. **Backend:**
   - Navigate to the `BE` directory: `cd BE`
   - Install dependencies: `npm install`
   - Start the local server: `node server.js` (or use `npm run dev` / `nodemon` if configured).
2. **Frontend:**
   - Navigate to the `FE` directory: `cd FE`
   - Install dependencies: `npm install`
   - Start the local development server (e.g., `npm run dev` for Vite).

## Deployment
To deploy the application, simply push your code to GitHub and connect the repository to your preferred service provider (Netlify or Vercel). The application will be deployed and ready to use immediately!