# MindTrail Frontend

An AI-powered learning platform that visualizes the landscape of human understanding. Built with React and D3.js, MindTrail creates dynamic "learning trails" that guide you through any concept you want to master.

## Features

- **Interactive Learning Trails**: Dynamic tree visualizations powered by D3.js that map out the path to understanding
- **Clean, Modern UI**: ChatGPT-inspired interface with smooth animations and intuitive design
- **Deep Exploration**: 
  - Click on any concept to get detailed explanations
  - Interactive chat to ask questions about each concept
  - Zoom and pan through large knowledge landscapes
- **AI-Powered**: Real-time generation of personalized learning paths

## Prerequisites

- Node.js (v14 or higher)
- npm (comes with Node.js)

```bash
sudo apt install nodejs npm
```

## Setup

1. Install dependencies (includes React and D3.js):
```bash
npm install
```

## Running the Application

To start the development server:
```bash
npm start
```

The application will start and be available at [http://localhost:3000](http://localhost:3000).

## Usage

1. Enter any concept you want to learn (e.g., "Machine Learning", "React", "General Relativity")
2. Click "Generate Learning Trail"
3. Explore your interactive learning trail:
   - Each node represents a concept or prerequisite
   - Click on any node to get a detailed explanation
   - Chat with AI to ask questions about each concept
   - Use mouse wheel to zoom in/out
   - Click and drag to pan around the trail
   - Nodes are color-coded by depth level

## Backend Connection

The frontend expects the backend server to be running on `http://localhost:8000`. Make sure the backend server is running before generating learning trails.

## Technologies

- **React**: Component-based UI framework with React Router for navigation
- **D3.js**: Data-driven visualization library for interactive learning trails
- **Modern Design**: Clean, ChatGPT-inspired interface with subtle animations 