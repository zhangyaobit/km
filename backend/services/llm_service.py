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

DEFAULT_MODEL = "models/gemma-3-1b-it"
DEFAULT_MODEL = "models/gemini-2.0-flash-exp"

class LLMService:
    def __init__(self, model: str = DEFAULT_MODEL):  
        self.llm = ChatGoogleGenerativeAI(
            model=model,
            temperature=0.7,
            convert_system_message_to_human=True,
            google_api_key=os.getenv("GOOGLE_API_KEY"),
            max_retries=1,
            request_timeout=30
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

Please structure your response as a JSON object with the following format:
{{
  "name": "Main Concept",
  "description": "Brief description of the concept",
  "children": [
    {{
      "name": "Prerequisite 1",
      "description": "Brief description",
      "children": [
        {{
          "name": "Sub-prerequisite 1.1",
          "description": "Brief description",
          "children": []
        }}
      ]
    }},
    {{
      "name": "Prerequisite 2",
      "description": "Brief description",
      "children": []
    }}
  ]
}}

Rules:
1. The root should be the main concept: "{concept}"
2. Children should be prerequisites or foundational knowledge needed to understand the parent
3. Each node should have "name", "description", and "children" fields
4. CRITICAL: Each node must be an ATOMIC concept that can be learned in ~10 minutes
5. DO NOT use broad field or subject names like "Linear Algebra", "Calculus", "Special Relativity"
6. INSTEAD use specific atomic concepts like "Matrix Multiplication", "Limit of a Function", "Time Dilation Formula"
7. Break down broad subjects into their smallest constituent concepts
8. Focus on the logical learning path from fundamentals to advanced
9. Break down the tree as deeply as needed to ensure each concept is truly atomic and digestible
10. IMPORTANT: Return ONLY valid JSON, no markdown formatting, no extra text

Generate the knowledge dependency tree for: {concept}"""

        try:
            response = await asyncio.to_thread(self.llm.invoke, prompt)
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
            
        except json.JSONDecodeError as e:
            print(f"JSON Parse Error: {e}")
            print(f"Response was: {response_text[:500]}")
            
            # Return a fallback structure
            return {
                "name": concept,
                "description": f"A knowledge map for {concept}",
                "children": [
                    {
                        "name": "Foundation",
                        "description": "Basic foundational knowledge",
                        "children": []
                    },
                    {
                        "name": "Core Concepts",
                        "description": "Main concepts to learn",
                        "children": []
                    },
                    {
                        "name": "Advanced Topics",
                        "description": "Advanced understanding",
                        "children": []
                    }
                ]
            }
        except Exception as e:
            print(f"Error generating knowledge tree: {e}")
            return {
                "name": concept,
                "description": f"Error generating map: {str(e)}",
                "children": []
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
            response = await asyncio.to_thread(self.llm.invoke, prompt)
            explanation = response.content if hasattr(response, 'content') else str(response)
            return explanation.strip()
        except Exception as e:
            print(f"Error generating explanation: {e}")
            return f"Error generating explanation for {concept_name}: {str(e)}"
    
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

