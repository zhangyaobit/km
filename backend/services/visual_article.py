import os
import json
import re
import argparse
from typing import List, Dict, Optional
from dotenv import load_dotenv
from google import genai
from wiki import WikiImageRetrieval

load_dotenv()

# MODEL = 'models/gemini-2.0-flash-exp'
MODEL = 'models/gemma-3-27b-it'


class VisualArticleGenerator:
    """
    Generate illustrated educational articles by:
    1. Finding relevant Wikipedia page for a term
    2. Extracting images from the page
    3. Analyzing images based on captions and context (text-based)
    4. Generating article with strategically placed images
    """
    
    def __init__(self, model: str = MODEL):
        self.model = model
        self.client = genai.Client(api_key=os.getenv("GOOGLE_API_KEY"))
        self.wiki_tool = WikiImageRetrieval()
    
    def find_wikipedia_page(self, term: str) -> Optional[str]:
        """
        Use LLM to find the most relevant Wikipedia page URL for a term.
        Returns the Wikipedia page title (not full URL).
        """
        prompt = f"""Given the term "{term}", provide the exact Wikipedia page title that would be most relevant.

Return ONLY the page title as it appears in the Wikipedia URL (with underscores for spaces).
For example:
- "Pythagorean theorem" -> "Pythagorean_theorem"
- "Machine learning" -> "Machine_learning"
- "Albert Einstein" -> "Albert_Einstein"

Do not include the full URL, just the page title part.

Term: {term}
Wikipedia page title:"""
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt
            )
            page_title = response.text.strip()
            # Clean up any markdown or extra formatting
            page_title = page_title.replace('`', '').replace('"', '').replace("'", '').strip()
            # Remove any URL prefix if present
            if 'wiki/' in page_title:
                page_title = page_title.split('wiki/')[-1]
            
            print(f"Found Wikipedia page: {page_title}")
            return page_title
        except Exception as e:
            print(f"Error finding Wikipedia page: {e}")
            # Fallback: try to create a title from the term
            return term.replace(' ', '_')
    
    def select_best_images(self, images: List[Dict], term: str, max_images: int = 5) -> List[Dict]:
        """
        Analyze ALL images in a single LLM call and select the most relevant ones.
        Much faster than analyzing each image individually.
        """
        print(f"\nAnalyzing all {len(images)} images in a single batch call...")
        
        # Prepare image data for batch analysis
        images_data = []
        for i, img in enumerate(images):
            images_data.append({
                'index': i,
                'caption': img['caption'][:200] if img['caption'] else 'No caption',
                'section_text': img.get('section_text', '')[:200] if img.get('section_text') else 'No context'
            })
        
        prompt = f"""You are selecting the MOST RELEVANT images for an educational article about "{term}".

Here are ALL available images with their captions and context:

{json.dumps(images_data, indent=2)}

Your task:
1. Analyze ALL images based on their captions and context
2. Select the TOP {max_images} images that would best help explain "{term}"
3. Choose images that directly illustrate the concept, show important examples, proofs, or applications

Selection criteria (in order of importance):
- Directly illustrates the main concept "{term}"
- Shows fundamental examples, proofs, or demonstrations
- Contains clear diagrams or visualizations
- Depicts historical context or key figures
- Aids understanding of core principles

Avoid images that:
- Are too vague or generic
- Show tangential or advanced applications
- Are about minor edge cases

Respond in JSON format with the selected image indices and brief reasoning:
{{
  "selected_images": [
    {{
      "index": 0,
      "relevance_score": 9.5,
      "reason": "Shows the fundamental theorem proof"
    }},
    ...
  ]
}}

Return ONLY the top {max_images} most relevant images. Return ONLY valid JSON, no extra text."""
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt
            )
            
            # Parse JSON response
            response_text = response.text.strip()
            # Remove markdown code blocks if present
            response_text = re.sub(r'^```(?:json)?\n', '', response_text)
            response_text = re.sub(r'\n```$', '', response_text)
            
            result = json.loads(response_text)
            
            # Extract selected images
            selected_images = []
            for selection in result.get('selected_images', []):
                idx = selection['index']
                if 0 <= idx < len(images):
                    img = images[idx].copy()
                    img['analysis'] = {
                        'relevant': True,
                        'description': selection.get('reason', img['caption']),
                        'relevance_score': selection.get('relevance_score', 8.0)
                    }
                    selected_images.append(img)
            
            print(f"\n✓ Selected {len(selected_images)} most relevant images")
            return selected_images
            
        except Exception as e:
            print(f"Error in batch image selection: {e}")
            print("Falling back to simple selection based on caption length...")
            # Fallback: select images with substantial captions
            fallback = []
            for img in images:
                if img['caption'] and len(img['caption']) > 20:
                    img['analysis'] = {
                        'relevant': True,
                        'description': img['caption'],
                        'relevance_score': 5.0
                    }
                    fallback.append(img)
            return fallback[:max_images]
    
    def generate_illustrated_article(self, term: str, images: List[Dict], section_texts: Dict[str, str]) -> str:
        """
        Generate an educational article with strategically placed images.
        """
        # Prepare image information for the LLM
        image_info = []
        for i, img in enumerate(images):
            image_info.append({
                'id': i,
                'caption': img['caption'],
                'description': img['analysis']['description'],
                'section_text': img['section_text'][:200] + '...' if len(img['section_text']) > 200 else img['section_text']
            })
        
        prompt = f"""You are an expert educator writing an illustrated article about "{term}".

You have access to these images:
{json.dumps(image_info, indent=2)}

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

Please write a comprehensive, educational article about "{term}" that:
1. Explains the concept clearly and thoroughly
2. Uses the provided images strategically throughout the article
3. Places each image where it's most relevant to the content
4. Provides context for each image

Format your response as Markdown with the following structure:
- Use # for the main title
- Use ## for major sections
- Use ### for subsections
- Place images using: [IMG:0], [IMG:1], [IMG:2], etc.
- Add a brief sentence before or after each image explaining what it shows

Example format:
# {term}

## Introduction
[Introduction text...]

[IMG:0]
*This diagram illustrates...*

## Main Section
[More content...]

Write a well-structured, informative article (aim for 500-800 words) with images placed strategically throughout."""
        
        try:
            response = self.client.models.generate_content(
                model=self.model,
                contents=prompt
            )
            
            article = response.text.strip()
            
            # Convert [IMG:X] references to markdown image syntax with correct URLs
            # Remove any lines containing Wikipedia URLs (LLM sometimes ignores instructions)
            lines = article.split('\n')
            cleaned_lines = []
            for line in lines:
                if 'upload.wikimedia.org' not in line.lower():
                    cleaned_lines.append(line)
            article = '\n'.join(cleaned_lines)
            
            # Convert [IMG:X] references to proper markdown
            for i, img in enumerate(images):
                reference = f'[IMG:{i}]'
                caption = img['caption'][:100] if img['caption'] else f"Image {i}"
                url = img['url']
                markdown_image = f"\n\n![{caption}]({url})\n\n"
                article = article.replace(reference, markdown_image)
            
            # Clean up extra whitespace
            article = re.sub(r'\n{3,}', '\n\n', article)
            
            return article
        except Exception as e:
            print(f"Error generating article: {e}")
            return f"# {term}\n\nError generating article: {str(e)}"
    
    def generate_visual_article(self, term: str, output_file: Optional[str] = None, max_images: int = 5) -> str:
        """
        Complete pipeline: Find Wikipedia page, extract images, generate illustrated article.
        """
        print(f"=== Generating Visual Article for: {term} ===\n")
        
        # Step 1: Find Wikipedia page
        print("Step 1: Finding Wikipedia page...")
        wiki_page = self.find_wikipedia_page(term)
        if not wiki_page:
            return f"Could not find Wikipedia page for {term}"
        
        wiki_url = f"https://en.wikipedia.org/wiki/{wiki_page}"
        print(f"Found: {wiki_url}\n")
        
        # Step 2: Extract images
        print("Step 2: Extracting images from Wikipedia...")
        results = self.wiki_tool.extract_images_detailed(wiki_page)
        images = results['images']
        print(f"Extracted {len(images)} images\n")
        
        if not images:
            print("No images found. Generating article without images...")
            article = f"# {term}\n\n*No images available from Wikipedia.*\n\n"
            article += f"Source: [{wiki_url}]({wiki_url})"
            return article
        
        # Step 3: Select best images
        print("Step 3: Analyzing and selecting best images...")
        selected_images = self.select_best_images(images, term, max_images)
        
        if not selected_images:
            print("No relevant images found. Generating article without images...")
            article = f"# {term}\n\n*No relevant images found.*\n\n"
            article += f"Source: [{wiki_url}]({wiki_url})"
            return article
        
        # Step 4: Generate article
        print("\nStep 4: Generating illustrated article...")
        section_texts = {img['filename']: img['section_text'] for img in selected_images}
        article = self.generate_illustrated_article(term, selected_images, section_texts)
        
        # Add source attribution
        article += f"\n\n---\n*Source: Wikipedia - [{wiki_url}]({wiki_url})*\n"
        
        # Step 5: Save to file
        if not output_file:
            # Generate filename from term
            safe_term = re.sub(r'[^\w\s-]', '', term).strip().replace(' ', '_')
            output_file = f"{safe_term}_article.md"
        
        with open(output_file, 'w', encoding='utf-8') as f:
            f.write(article)
        
        print(f"\n✓ Article saved to: {output_file}")
        print(f"✓ Open it in a browser or markdown viewer to see the images!")
        
        return article


def main():
    """
    CLI interface for generating visual articles.
    """
    parser = argparse.ArgumentParser(
        description='Generate illustrated educational articles from Wikipedia.'
    )
    parser.add_argument(
        'term',
        type=str,
        help='The term or concept to create an article about (e.g., "Pythagorean theorem")'
    )
    parser.add_argument(
        '-o', '--output',
        type=str,
        help='Output markdown file path (default: auto-generated from term)'
    )
    parser.add_argument(
        '-n', '--num-images',
        type=int,
        default=5,
        help='Maximum number of images to include (default: 5)'
    )
    parser.add_argument(
        '-m', '--model',
        type=str,
        default=MODEL,
        help=f'Model to use (default: {MODEL})'
    )
    
    args = parser.parse_args()
    
    # Create generator
    generator = VisualArticleGenerator(model=args.model)
    
    # Generate article
    article = generator.generate_visual_article(
        term=args.term,
        output_file=args.output,
        max_images=args.num_images
    )
    
    # Print preview
    print("\n" + "=" * 80)
    print("ARTICLE PREVIEW (first 500 characters):")
    print("=" * 80)
    print(article[:500] + "...\n")


if __name__ == "__main__":
    main()
