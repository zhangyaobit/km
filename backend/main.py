from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from services.llm_service import llm_service


def calculate_total_learning_time(node: dict) -> float:
    """
    Calculate total learning time for a node including all its children.
    
    Args:
        node: A node in the knowledge tree
        
    Returns:
        Total learning time in minutes (self + all descendants)
    """
    # Get self learning time (default to 10 if not provided)
    self_time = node.get('selfLearningTime', 10)
    
    # Start with self time
    total_time = self_time
    
    # Add learning time from all children recursively
    children = node.get('children', [])
    for child in children:
        child_total = calculate_total_learning_time(child)
        total_time += child_total
    
    # Add totalLearningTime to the node
    node['totalLearningTime'] = round(total_time, 1)
    
    # Determine if node is atomic (leaf) or composite (has children)
    node['isAtomic'] = len(children) == 0
    
    return total_time


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


class ExplainRequest(BaseModel):
    concept_name: str
    original_query: str
    knowledge_tree: dict


class ChatRequest(BaseModel):
    concept_name: str
    original_query: str
    knowledge_tree: dict
    explanation: str
    chat_history: list
    user_message: str


@app.post("/api/knowledge-map")
async def generate_knowledge_map(request: ConceptRequest):
    """
    Generate a knowledge dependency tree for a given concept.
    Returns a hierarchical tree structure showing what needs to be learned.
    """
    knowledge_tree = await llm_service.generate_knowledge_tree(request.concept)
    
    # Calculate total learning time for all nodes (including marking atomic vs composite)
    calculate_total_learning_time(knowledge_tree)
    
    return knowledge_tree


@app.post("/api/explain-concept")
async def explain_concept(request: ExplainRequest):
    """
    Generate a detailed explanation for a specific concept within the context
    of the original query and the full knowledge tree.
    """
    explanation = await llm_service.explain_concept(
        request.concept_name,
        request.original_query,
        request.knowledge_tree
    )
    return {"explanation": explanation}


@app.post("/api/chat-about-explanation")
async def chat_about_explanation(request: ChatRequest):
    """
    Handle chat messages about the explanation with full context.
    Maintains conversation history for the current explanation session.
    """
    response = await llm_service.chat_about_explanation(
        request.concept_name,
        request.original_query,
        request.knowledge_tree,
        request.explanation,
        request.chat_history,
        request.user_message
    )
    return {"response": response} 