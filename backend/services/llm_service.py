import os
import asyncio
import argparse
import json
import re
from dotenv import load_dotenv
load_dotenv()
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain.memory import ConversationBufferMemory
from langchain.chains import ConversationChain
import google.generativeai as genai

# DEFAULT_MODEL = "models/gemma-3-1b-it"
DEFAULT_MODEL = "models/gemma-3-27b-it"
# DEFAULT_MODEL = "models/gemini-2.0-flash-exp"

class LLMService:
    def __init__(self, model: str = DEFAULT_MODEL):  
        self.llm = ChatGoogleGenerativeAI(
            model=model,
            temperature=0.7,
            convert_system_message_to_human=True,
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            max_retries=0,  # Don't retry on failures
            request_timeout=10  # Reduced timeout to fail faster
        )
        self.memory = ConversationBufferMemory()
        self.conversation = ConversationChain(
            llm=self.llm,
            memory=self.memory,
            verbose=True
        )
    
    async def get_response(self, message: str) -> str:
        response = self.conversation.predict(input=message)
        return response
    
    async def generate_knowledge_tree(self, concept: str) -> dict:
        """
        Generate a hierarchical knowledge dependency tree for a given concept.
        Returns a structured JSON tree showing prerequisites and dependencies.
        """
        prompt = f"""You are a knowledge mapping expert. Create a comprehensive learning dependency tree for the concept: "{concept}"

IMPORTANT CONCEPTS:
- **Atomic Concept**: A fundamental, indivisible concept that can be learned in 5-15 minutes (leaf nodes with no children)
- **Composite Concept**: A higher-level concept that requires understanding multiple atomic concepts (non-leaf nodes with children)

Please structure your response as a JSON object with the following format:
{{
  "name": "Main Concept",
  "description": "Brief description of the concept",
  "selfLearningTime": 10,
  "children": [
    {{
      "name": "Prerequisite 1 (Composite)",
      "description": "Brief description",
      "selfLearningTime": 8,
      "children": [
        {{
          "name": "Sub-prerequisite 1.1 (Atomic)",
          "description": "Brief description",
          "selfLearningTime": 12,
          "children": []
        }}
      ]
    }},
    {{
      "name": "Prerequisite 2 (Atomic)",
      "description": "Brief description",
      "selfLearningTime": 7,
      "children": []
    }}
  ]
}}

Rules:
1. The root should be the main concept: "{concept}"
2. Children should be prerequisites or foundational knowledge needed to understand the parent
3. Each node MUST have: "name", "description", "selfLearningTime" (in minutes), and "children" fields
4. **ATOMIC CONCEPTS (Leaf nodes):**
   - Must have NO children (empty children array)
   - Must be truly indivisible, basic concepts
   - selfLearningTime should be between 5-15 minutes
   - Examples: "Number", "Addition", "Subtraction"
5. **COMPOSITE CONCEPTS (Non-leaf nodes):**
   - Must have at least one child
   - Represent concepts that combine multiple atomic concepts
   - selfLearningTime is the time to understand the concept itself (5-15 min), not including children
   - Examples broken down: "Vector Addition" → ["Vector", "Addition"]
6. DO NOT use broad field or subjectnames such as "Linear Algebra" or "Calculus" as composite or atomic concepts
7. Expand composite concepts deeply - ensure leaf nodes are truly atomic and basic
8. If a concept seems too complex for 5-15 minutes, it's composite - break it down further
9. Focus on the logical learning path from fundamentals to advanced
10. Estimate selfLearningTime realistically based on concept complexity (always 5-15 minutes)
11. IMPORTANT: Return ONLY valid JSON, no markdown formatting, no extra text

Generate the knowledge dependency tree for: {concept}"""

        try:
            # Use asyncio.wait_for to enforce a hard timeout
            response = await asyncio.wait_for(
                asyncio.to_thread(self.llm.invoke, prompt),
                timeout=45.0  # Hard timeout of 45 seconds for tree generation
            )
            response_text = response.content if hasattr(response, 'content') else str(response)
            
            # Try to extract JSON from response
            response_text = response_text.strip()
            
            # Remove markdown code blocks if present
            if response_text.startswith("```"):
                response_text = re.sub(r'^```(?:json)?\n', '', response_text)
                response_text = re.sub(r'\n```$', '', response_text)
            
            # Parse the JSON
            tree_data = json.loads(response_text)
            
            return tree_data
        
        except asyncio.TimeoutError:
            print("Knowledge tree generation timed out")
            return {
                "name": concept,
                "description": "⚠️ Request timed out. This might be due to API rate limits. Please try again in a moment.",
                "selfLearningTime": 0,
                "children": [],
                "error": "timeout"
            }
            
        except json.JSONDecodeError as e:
            print(f"JSON Parse Error: {e}")
            print(f"Response was: {response_text[:500]}")
            
            # Return a fallback structure
            return {
                "name": concept,
                "description": f"A knowledge map for {concept}",
                "selfLearningTime": 10,
                "children": [
                    {
                        "name": "Foundation",
                        "description": "Basic foundational knowledge",
                        "selfLearningTime": 8,
                        "children": []
                    },
                    {
                        "name": "Core Concepts",
                        "description": "Main concepts to learn",
                        "selfLearningTime": 10,
                        "children": []
                    },
                    {
                        "name": "Advanced Topics",
                        "description": "Advanced understanding",
                        "selfLearningTime": 12,
                        "children": []
                    }
                ]
            }
        except Exception as e:
            error_str = str(e)
            print(f"Error generating knowledge tree: {e}")
            
            # Check if it's a quota error - return immediately
            if "quota" in error_str.lower() or "429" in error_str or "ResourceExhausted" in error_str or "Quota exceeded" in error_str:
                return {
                    "name": "⚠️ Quota Exceeded",
                    "description": "API quota limit reached. Please try again later or check your API plan and billing details.",
                    "selfLearningTime": 0,
                    "children": [],
                    "error": "quota_exceeded"
                }
            
            # Check for rate limit errors
            if "rate limit" in error_str.lower() or "too many requests" in error_str.lower():
                return {
                    "name": "⚠️ Rate Limit",
                    "description": "Too many requests. Please wait a moment and try again.",
                    "selfLearningTime": 0,
                    "children": [],
                    "error": "rate_limit"
                }
            
            return {
                "name": concept,
                "description": f"Error generating map: {str(e)}",
                "selfLearningTime": 10,
                "children": [],
                "error": "generation_failed"
            }
    
    async def explain_concept(self, concept_name: str, original_query: str, knowledge_tree: dict) -> str:
        """
        Generate a detailed explanation for a specific concept, given the context of
        the original query and the full knowledge tree.
        """
        prompt = f"""You are an expert educator explaining concepts in a clear, detailed manner.

Original Learning Goal: "{original_query}"

Full Knowledge Map Context:
{json.dumps(knowledge_tree, indent=2)}

Now, provide a detailed explanation specifically for this concept: "{concept_name}"

Your explanation should:
1. Focus ONLY on explaining "{concept_name}" in detail
2. Be aware of the context (the original goal was "{original_query}")
3. Explain what {concept_name} is, why it matters in the context of learning {original_query}
4. Provide 2-3 concrete examples or applications
5. If relevant, briefly mention how it connects to the broader learning path
6. Keep the explanation clear, educational, and accessible
7. Use markdown formatting for better readability
8. **IMPORTANT: For any mathematical formulas or equations, use LaTeX notation:**
   - For inline math, use single dollar signs: $x^2 + y^2 = z^2$
   - For display math (centered equations), use double dollar signs: $$E = mc^2$$
   - Example: "The quadratic formula is $x = \\frac{{-b \\pm \\sqrt{{b^2 - 4ac}}}}{{2a}}$"
9. Aim for 3-5 paragraphs

Provide a focused, comprehensive explanation of: {concept_name}"""

        try:
            # Use asyncio.wait_for to enforce a hard timeout
            response = await asyncio.wait_for(
                asyncio.to_thread(self.llm.invoke, prompt),
                timeout=30.0  # Hard timeout of 30 seconds for explanation
            )
            explanation = response.content if hasattr(response, 'content') else str(response)
            return explanation.strip()
        except asyncio.TimeoutError:
            print("Explanation request timed out")
            return "⚠️ **Request Timed Out**\n\nThe request took too long. This might be due to API rate limits. Please try again in a moment."
        except Exception as e:
            error_str = str(e)
            print(f"Error generating explanation: {e}")
            
            # Check if it's a quota error - return immediately
            if "quota" in error_str.lower() or "429" in error_str or "ResourceExhausted" in error_str or "Quota exceeded" in error_str:
                return "⚠️ **API Quota Exceeded**\n\nThe API quota limit has been reached. Please try again later or check your API plan and billing details.\n\nFor more information, visit: https://ai.google.dev/gemini-api/docs/rate-limits"
            
            return f"Error generating explanation for {concept_name}: {str(e)}"
    
    async def chat_about_explanation(
        self, 
        concept_name: str, 
        original_query: str, 
        knowledge_tree: dict, 
        explanation: str,
        chat_history: list,
        user_message: str
    ) -> str:
        """
        Handle chat messages about a concept explanation with full context.
        Maintains the conversation history for follow-up questions.
        
        Args:
            concept_name: The concept being discussed
            original_query: The user's original learning goal
            knowledge_tree: The full knowledge map
            explanation: The initial explanation provided
            chat_history: Previous chat messages [{"role": "user"/"assistant", "content": "..."}]
            user_message: The current user question
            
        Returns:
            AI response to the user's question
        """
        # Build context-aware prompt
        context = f"""You are an expert tutor helping a student understand concepts.

CONTEXT:
- Original Learning Goal: "{original_query}"
- Current Concept Being Discussed: "{concept_name}"
- Knowledge Map Context: {json.dumps(knowledge_tree, indent=2)}

INITIAL EXPLANATION PROVIDED:
{explanation}

"""
        
        # Add chat history
        if chat_history:
            context += "CONVERSATION HISTORY:\n"
            for msg in chat_history:
                role = "Student" if msg["role"] == "user" else "Tutor"
                context += f"{role}: {msg['content']}\n"
            context += "\n"
        
        # Add current question
        context += f"""CURRENT STUDENT QUESTION:
{user_message}

INSTRUCTIONS:
- Answer the student's question clearly and concisely
- Reference the explanation and context when relevant
- Use markdown formatting for better readability
- For any mathematical formulas, use LaTeX notation ($...$ for inline, $$...$$ for display)
- Be encouraging and educational
- If the question is off-topic, gently redirect to the current concept
- Keep responses focused and not too long

Provide your response:"""

        try:
            # Use asyncio.wait_for to enforce a hard timeout
            response = await asyncio.wait_for(
                asyncio.to_thread(self.llm.invoke, context),
                timeout=15.0  # Hard timeout of 15 seconds
            )
            answer = response.content if hasattr(response, 'content') else str(response)
            return answer.strip()
        except asyncio.TimeoutError:
            print("Chat request timed out")
            return "⚠️ **Request Timed Out**\n\nThe request took too long. This might be due to API rate limits. Please try again in a moment."
        except Exception as e:
            error_str = str(e)
            print(f"Error in chat about explanation: {e}")
            
            # Check if it's a quota error - return immediately
            if "quota" in error_str.lower() or "429" in error_str or "ResourceExhausted" in error_str or "Quota exceeded" in error_str:
                return "⚠️ **API Quota Exceeded**\n\nThe API quota limit has been reached. Please try again later or check your API plan.\n\nFor more information, visit: https://ai.google.dev/gemini-api/docs/rate-limits"
            
            # Check for rate limit errors
            if "rate limit" in error_str.lower() or "too many requests" in error_str.lower():
                return "⚠️ **Rate Limit Exceeded**\n\nToo many requests. Please wait a moment and try again."
            
            return f"I apologize, but I encountered an error processing your question. Please try again."
    
    def clear_history(self):
        self.memory.clear()
    
    def list_models(self):
        """List all available models and their supported methods."""
        try:
            for model in genai.list_models():
                print(f"\nModel: {model.name}")
                print(f"Display name: {model.display_name}")
                print(f"Description: {model.description}")
                print(f"Generation methods: {model.supported_generation_methods}")
                print("-" * 50)
        except Exception as e:
            print(f"Error listing models: {str(e)}")


# Create a singleton instance (will be overridden if model is specified)
llm_service = LLMService()


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="LLM Service CLI")
    parser.add_argument(
        "-l", "--list-models",
        action="store_true",
        help="List all available Gemini models"
    )
    parser.add_argument(
        "-t", "--test",
        action="store_true",
        help="Send a test hello prompt to the LLM"
    )
    parser.add_argument(
        "-m", "--model",
        type=str,
        default="models/gemma-3-1b-it",
        help="Specify the model to use (e.g., models/gemini-2.0-flash, models/gemma-3-1b-it)"
    )
    
    args = parser.parse_args()
    
    if args.list_models:
        # Use a temporary service instance for listing models
        temp_service = LLMService(model=args.model)
        temp_service.list_models()
    elif args.test:
        # Create service with specified model
        test_service = LLMService(model=args.model)
        print(f"Using model: {args.model}")
        response = asyncio.run(test_service.get_response("Hello, how are you?"))
        print(f"\nResponse: {response}")
    else:
        parser.print_help()

