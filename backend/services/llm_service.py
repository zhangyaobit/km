import os
import asyncio
import argparse
import json
import re
from typing import Optional, List, Dict
from dotenv import load_dotenv
load_dotenv()
from langchain_google_genai import ChatGoogleGenerativeAI
import google.generativeai as genai
from google import genai as google_genai
from services.wiki import WikiImageRetrieval

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
        self.genai_client = google_genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
        self.wiki_tool = WikiImageRetrieval()
    
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
    
    async def _find_wikipedia_images(self, concept_name: str, max_images: int = 3) -> Optional[List[Dict]]:
        """
        Find and extract relevant Wikipedia images for a concept.
        Returns None if no images found.
        """
        try:
            # Find Wikipedia page title
            page_title = concept_name.replace(' ', '_')
            
            # Extract images
            results = await asyncio.to_thread(self.wiki_tool.extract_images_detailed, page_title)
            images = results.get('images', [])
            
            if not images:
                return None
            
            # Select best images using batch analysis
            selected = await self._select_relevant_images(images, concept_name, max_images)
            return selected if selected else None
            
        except Exception as e:
            print(f"Error extracting Wikipedia images: {e}")
            return None
    
    async def _select_relevant_images(self, images: List[Dict], concept_name: str, max_images: int) -> Optional[List[Dict]]:
        """
        Select the most relevant images for explaining a concept using batch LLM analysis.
        """
        try:
            # Prepare image data for batch analysis
            images_data = []
            for i, img in enumerate(images[:20]):  # Limit to first 20 to avoid token limits
                images_data.append({
                    'index': i,
                    'caption': img['caption'][:200] if img['caption'] else 'No caption',
                    'section_text': img.get('section_text', '')[:200] if img.get('section_text') else 'No context'
                })
            
            prompt = f"""You are selecting images to help explain the concept "{concept_name}".

Available images:
{json.dumps(images_data, indent=2)}

Select FEWER THAN {max_images} images that would be MOST helpful for understanding "{concept_name}". 
Choose only essential images that directly illustrate the concept.

Respond in JSON format:
{{
  "selected_images": [
    {{
      "index": 0,
      "reason": "Brief reason why this image helps explain the concept"
    }}
  ]
}}

Return ONLY valid JSON, no extra text."""
            
            response = await asyncio.to_thread(
                self.genai_client.models.generate_content,
                model='models/gemma-3-27b-it',
                contents=prompt
            )
            
            # Parse response
            response_text = response.text.strip()
            response_text = re.sub(r'^```(?:json)?\n', '', response_text)
            response_text = re.sub(r'\n```$', '', response_text)
            
            result = json.loads(response_text)
            
            # Extract selected images
            selected_images = []
            for selection in result.get('selected_images', []):
                idx = selection['index']
                if 0 <= idx < len(images):
                    img = images[idx].copy()
                    img['reason'] = selection.get('reason', '')
                    selected_images.append(img)
            
            return selected_images if selected_images else None
            
        except Exception as e:
            print(f"Error selecting images: {e}")
            return None
    
    async def explain_concept(self, concept_name: str, original_query: str, knowledge_tree: dict, use_images: bool = True, max_images: int = 3) -> str:
        """
        Generate a detailed explanation for a specific concept, optionally with Wikipedia images.
        
        Args:
            concept_name: The concept to explain
            original_query: The original learning goal
            knowledge_tree: The full knowledge tree context
            use_images: Whether to try to include Wikipedia images (default: True)
            max_images: Maximum number of images to include (default: 3)
        """
        # Try to find relevant Wikipedia images if requested
        selected_images = None
        if use_images:
            try:
                selected_images = await self._find_wikipedia_images(concept_name, max_images)
            except Exception as e:
                print(f"Could not load images for {concept_name}: {e}")
                selected_images = None
        
        # Build the prompt
        prompt = f"""You are an expert educator explaining concepts in a clear, detailed manner.

Original Learning Goal: "{original_query}"

Full Knowledge Map Context:
{json.dumps(knowledge_tree, indent=2)}

Now, provide a detailed explanation specifically for this concept: "{concept_name}"
"""
        
        # Add image information if available
        if selected_images:
            prompt += f"""
Available illustrations from Wikipedia (use these strategically in your explanation):
"""
            for i, img in enumerate(selected_images):
                prompt += f"""
Image {i}:
- Caption: {img['caption'][:150]}
- Why relevant: {img.get('reason', 'Illustrates the concept')}
"""
            prompt += """
**ABSOLUTELY CRITICAL - IMAGE REFERENCE FORMAT:**

CORRECT way to show images:
✓ "The visual proof [IMG:0] demonstrates this concept."
✓ "Consider the animation below:\n\n[IMG:1]\n\nThis shows..."

WRONG - DO NOT DO THIS:
✗ ![caption](URL)
✗ (https://upload.wikimedia.org/...)
✗ ![Image](IMAGE_0)
✗ Any URL or markdown syntax

YOU MUST ONLY USE: [IMG:0], [IMG:1], [IMG:2]
Do not write ANY URLs. Do not write ANY markdown image syntax.
ONLY write [IMG:X] where X is the image number.
"""
        
        prompt += f"""
Your explanation should:
1. Focus ONLY on explaining "{concept_name}" in detail
2. Be aware of the context (the original goal was "{original_query}")
3. Explain what {concept_name} is, why it matters in the context of learning {original_query}
4. Provide 2-3 concrete examples or applications
5. If relevant, briefly mention how it connects to the broader learning path
6. Keep the explanation clear, educational, and accessible
7. Use markdown formatting for better readability
"""
        
        if selected_images:
            prompt += f"""8. **Include the provided images** where they help illustrate your explanation using [IMG:0], [IMG:1], etc.
9. **IMPORTANT: For any mathematical formulas or equations, use LaTeX notation:**
   - For inline math, use single dollar signs: $x^2 + y^2 = z^2$
   - For display math (centered equations), use double dollar signs: $$E = mc^2$$
   - Example: "The quadratic formula is $x = \\frac{{-b \\pm \\sqrt{{b^2 - 4ac}}}}{{2a}}$"
10. Aim for 3-5 paragraphs with images integrated naturally
"""
        else:
            prompt += f"""8. **IMPORTANT: For any mathematical formulas or equations, use LaTeX notation:**
   - For inline math, use single dollar signs: $x^2 + y^2 = z^2$
   - For display math (centered equations), use double dollar signs: $$E = mc^2$$
   - Example: "The quadratic formula is $x = \\frac{{-b \\pm \\sqrt{{b^2 - 4ac}}}}{{2a}}$"
9. Aim for 3-5 paragraphs
"""
        
        prompt += f"\nProvide a focused, comprehensive explanation of: {concept_name}"

        try:
            # Use asyncio.wait_for to enforce a hard timeout
            response = await asyncio.wait_for(
                asyncio.to_thread(self.llm.invoke, prompt),
                timeout=30.0  # Hard timeout of 30 seconds for explanation
            )
            explanation = response.content if hasattr(response, 'content') else str(response)
            explanation = explanation.strip()
            
            # Convert [IMG:X] references to markdown image syntax with correct URLs
            if selected_images:
                # Remove any lines containing Wikipedia URLs (LLM sometimes ignores instructions)
                lines = explanation.split('\n')
                cleaned_lines = []
                for line in lines:
                    if 'upload.wikimedia.org' not in line.lower():
                        cleaned_lines.append(line)
                explanation = '\n'.join(cleaned_lines)
                
                # Convert [IMG:X] references to proper markdown
                for i, img in enumerate(selected_images):
                    reference = f'[IMG:{i}]'
                    caption = img['caption'][:100] if img['caption'] else f"Image {i}"
                    url = img['url']
                    markdown_image = f"\n\n![{caption}]({url})\n\n"
                    explanation = explanation.replace(reference, markdown_image)
                
                # Clean up extra whitespace
                explanation = re.sub(r'\n{3,}', '\n\n', explanation)
            
            return explanation
            
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
        response = test_service.llm.invoke("Hello, how are you?")
        response_text = response.content if hasattr(response, 'content') else str(response)
        print(f"\nResponse: {response_text}")
    else:
        parser.print_help()