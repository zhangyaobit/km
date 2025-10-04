# Knowledge Map 🗺️

An AI-powered application that generates interactive visual knowledge dependency trees for any concept you want to learn. Uses Large Language Models to analyze learning paths and D3.js to create beautiful, explorable visualizations.

## Overview

Knowledge Map helps learners understand the prerequisites and dependencies needed to master any subject. Simply enter a concept, and the AI will generate a comprehensive tree showing:
- Foundational knowledge required
- Progressive learning paths
- Relationships between concepts
- Detailed descriptions for each node

## Features

### Backend
- 🤖 **AI-Powered Analysis**: Uses Google's Gemini LLM to generate knowledge trees
- 📊 **Structured Data**: Returns hierarchical JSON trees
- 🔧 **Robust Parsing**: Handles various response formats with fallback mechanisms
- ⚡ **FastAPI**: High-performance async API

### Frontend
- 🎨 **Beautiful UI**: Modern gradient design with smooth animations
- 🌳 **Interactive Trees**: Powered by D3.js with zoom and pan
- 💡 **Tooltips**: Hover for detailed descriptions
- 📱 **Responsive**: Works on different screen sizes
- 🎯 **User-Friendly**: Simple, intuitive interface

## Project Structure

```
km/
├── backend/          # FastAPI backend service
│   ├── main.py      # API endpoints
│   ├── services/
│   │   └── llm_service.py  # LLM integration
│   └── requirements.txt
├── frontend/         # React frontend application
│   ├── src/
│   │   ├── App.js   # Main component with D3 visualization
│   │   └── index.js
│   └── package.json
└── README.md        # This file
```

## Quick Start

### Prerequisites
- Python 3.8+
- Node.js 14+
- Docker (for backend)
- Google API Key for Gemini

### Setup Backend

1. Navigate to backend directory:
```bash
cd backend
```

2. Create `.env` file:
```bash
GOOGLE_API_KEY=your_google_api_key_here
```

3. Build and run with Docker:
```bash
docker build -t km-backend .
docker run -d --name yao -p 8000:8000 -v ~/s/km:/km -w /km/backend km-backend sleep infinity
```

4. Start the service:
```bash
uvicorn main:app --host 0.0.0.0 --port 8000
```

### Setup Frontend

1. Navigate to frontend directory:
```bash
cd frontend
```

2. Install dependencies:
```bash
npm install
```

3. Start the development server:
```bash
npm start
```

4. Open [http://localhost:3000](http://localhost:3000) in your browser

## Usage

1. **Enter a Concept**: Type what you want to learn (e.g., "Machine Learning", "React", "Calculus")
2. **Generate Map**: Click the button and wait for the AI to analyze
3. **Explore**: 
   - Hover over nodes to see descriptions
   - Zoom in/out with mouse wheel
   - Pan by clicking and dragging
   - Follow the tree from fundamentals to advanced topics

## Example Concepts to Try

- Programming: "React", "Python", "Design Patterns"
- Mathematics: "Linear Algebra", "Calculus", "Statistics"
- Science: "Quantum Mechanics", "Genetics", "Thermodynamics"
- Business: "Financial Modeling", "Marketing Strategy", "Supply Chain Management"

## Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **LangChain**: LLM integration framework
- **Google Gemini**: AI language model
- **Uvicorn**: ASGI server

### Frontend
- **React**: UI component library
- **D3.js**: Data visualization library
- **Modern CSS**: Animations and gradients

## API Documentation

Once the backend is running, visit [http://localhost:8000/docs](http://localhost:8000/docs) for interactive API documentation.

## Contributing

Feel free to enhance the project! Some ideas:
- Add more visualization types (radial, force-directed)
- Implement node expansion/collapse
- Add export functionality (PNG, JSON)
- Include learning resources for each node
- Multi-language support

## License

MIT License - feel free to use and modify!

## Acknowledgments

- Built with Google's Gemini LLM
- Visualization powered by D3.js
- Icons and inspiration from the knowledge mapping community

