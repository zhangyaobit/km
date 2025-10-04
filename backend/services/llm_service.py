import os
import asyncio
import argparse
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
            request_timeout=10
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

