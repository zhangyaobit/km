from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.llm_service import llm_service


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # React default port
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class ConceptRequest(BaseModel):
    concept: str


@app.post("/api/knowledge-map")
async def generate_knowledge_map(request: ConceptRequest):
    """
    Generate a knowledge dependency tree for a given concept.
    Returns a hierarchical tree structure showing what needs to be learned.
    """
    knowledge_tree = await llm_service.generate_knowledge_tree(request.concept)
    return knowledge_tree 