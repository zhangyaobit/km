# Knowledge Map Frontend

An interactive web application for visualizing learning paths and knowledge dependencies. Built with React and D3.js, it creates beautiful, explorable tree visualizations of any concept you want to learn.

## Features

- **Beautiful Visualizations**: Interactive tree diagrams powered by D3.js
- **Modern UI**: Gradient backgrounds, smooth animations, and responsive design
- **Interactive Exploration**: 
  - Hover over nodes to see detailed descriptions
  - Zoom and pan functionality for large knowledge trees
  - Animated transitions and smooth rendering
- **User-Friendly**: Simple input interface with real-time feedback

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

1. Enter any concept you want to learn (e.g., "Machine Learning", "React", "Quantum Physics")
2. Click "Generate Map"
3. Explore the interactive knowledge tree:
   - Each node represents a concept or prerequisite
   - Hover over nodes to see detailed descriptions
   - Use mouse wheel to zoom in/out
   - Click and drag to pan around the tree
   - Nodes are color-coded by depth level

## Backend Connection

The frontend expects the backend server to be running on `http://localhost:8000`. Make sure the backend server is running before generating knowledge maps.

## Technologies

- **React**: Component-based UI framework
- **D3.js**: Data-driven visualization library
- **Modern CSS**: Gradients, animations, and responsive design 