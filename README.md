# MindTrail 🧭

An AI-powered learning platform that visualizes the landscape of human understanding. MindTrail creates dynamic "learning trails" that guide you through the exact concepts you need to reach any destination, from quantum physics to machine learning.

## About MindTrail

MindTrail is an applied research lab reimagining how humans learn and explore science. We believe understanding science should feel less like scaling a cliff and more like following a well-marked trail through a national park.

MindTrail helps learners discover the prerequisites and dependencies needed to master any subject. Simply enter a concept, and our AI will generate a personalized learning trail showing:
- Foundational knowledge required
- Progressive learning paths
- Relationships between concepts
- Detailed explanations and interactive chat for each concept

## Features

### Backend
- 🤖 **AI-Powered Analysis**: Uses Google's Gemini LLM to generate learning trails
- 📊 **Structured Data**: Returns hierarchical JSON trees
- 💬 **Interactive Chat**: Ask questions about any concept with context-aware responses
- 🔧 **Robust Parsing**: Handles various response formats with fallback mechanisms
- ⚡ **FastAPI**: High-performance async API

### Frontend
- 🎨 **Clean, Modern UI**: ChatGPT-inspired interface with smooth animations
- 🌳 **Interactive Learning Trails**: Powered by D3.js with zoom and pan
- 💡 **Deep Exploration**: Click any concept for detailed explanations
- 💬 **AI Chat**: Ask questions about each concept
- 📱 **Responsive**: Works on different screen sizes
- 🎯 **Intuitive**: Simple, user-friendly interface

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

1. **Enter a Concept**: Type what you want to learn (e.g., "Machine Learning", "React", "General Relativity")
2. **Generate Learning Trail**: Click the button and let AI map your path
3. **Explore**: 
   - Click on any node to get detailed explanations
   - Chat with AI to ask questions about each concept
   - Zoom in/out with mouse wheel
   - Pan by clicking and dragging
   - Follow your trail from fundamentals to advanced topics

## Example Concepts to Try

- Programming: "React", "Python", "Design Patterns"
- Mathematics: "Linear Algebra", "Calculus", "Statistics"
- Science: "Quantum Mechanics", "General Relativity", "Genetics", "Thermodynamics"
- Business: "Financial Modeling", "Marketing Strategy", "Supply Chain Management"

## Technology Stack

### Backend
- **FastAPI**: Modern Python web framework
- **LangChain**: LLM integration framework
- **Google Gemini**: AI language model
- **Uvicorn**: ASGI server

### Frontend
- **React**: UI component library with React Router for navigation
- **D3.js**: Data visualization library for interactive learning trails
- **Modern Design**: Clean, ChatGPT-inspired interface

## API Documentation

Once the backend is running, visit [http://localhost:8000/docs](http://localhost:8000/docs) for interactive API documentation.

## Contributing

Feel free to enhance the project! Some ideas:
- Add trail sharing and collaboration features
- Implement more visualization types (radial, force-directed)
- Add export functionality (PNG, JSON)
- Include curated learning resources for each node
- Multi-language support
- Community-contributed trails
