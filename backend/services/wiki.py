import requests
from bs4 import BeautifulSoup
from typing import List, Dict, Optional
from urllib.parse import urljoin, urlparse, unquote
import re


class WikiImageRetrieval:
    """
    A tool to retrieve images from Wikipedia pages along with their captions 
    and the innermost section/subsection text they appear in.
    """
    
    BASE_URL = "https://en.wikipedia.org"
    
    def __init__(self):
        self.session = requests.Session()
        self.session.headers.update({
            'User-Agent': 'WikiImageRetrieval/1.0 (Educational Project)'
        })
    
    def _normalize_page_input(self, page_input: str) -> str:
        """
        Convert various input formats to a Wikipedia page title.
        Handles URLs and page titles.
        """
        # If it's a URL, extract the page title
        if page_input.startswith('http'):
            parsed = urlparse(page_input)
            # Extract page title from URL path like /wiki/Page_Title
            match = re.search(r'/wiki/([^#?]+)', parsed.path)
            if match:
                return unquote(match.group(1))
            return page_input
        return page_input
    
    def _get_page_html(self, page_title: str) -> Optional[BeautifulSoup]:
        """
        Fetch the HTML content of a Wikipedia page.
        """
        page_url = f"{self.BASE_URL}/wiki/{page_title}"
        
        try:
            response = self.session.get(page_url, timeout=10)
            response.raise_for_status()
            return BeautifulSoup(response.text, 'html.parser')
        except requests.RequestException as e:
            print(f"Error fetching Wikipedia page: {e}")
            return None
    
    def _find_innermost_section(self, element) -> str:
        """
        Find the innermost section/subsection text that contains this element.
        Returns the full text content of the section (not just the heading).
        """
        if not element:
            return ""
        
        # Find the nearest heading before this element
        heading_element = None
        heading_level = None
        
        try:
            for prev in element.find_all_previous():
                if hasattr(prev, 'name') and prev.name in ['h2', 'h3', 'h4', 'h5', 'h6']:
                    heading_element = prev
                    heading_level = int(prev.name[1])  # Extract number from h2, h3, etc.
                    break
        except AttributeError:
            pass
        
        if not heading_element:
            return ""
        
        # Collect all paragraph and list text after the heading until the next heading
        section_texts = []
        
        # Use find_all_next to find all elements after the heading
        for next_elem in heading_element.find_all_next():
            # Stop if we hit another heading of same or higher level
            if next_elem.name in ['h2', 'h3', 'h4', 'h5', 'h6']:
                next_level = int(next_elem.name[1])
                if next_level <= heading_level:
                    break
            
            # Only collect text from paragraph and list elements
            if next_elem.name in ['p', 'li', 'dd', 'dt']:
                text = next_elem.get_text(strip=True)
                # Filter out [edit] links, empty strings, and reference markers
                if text and '[edit]' not in text and text != '':
                    # Remove reference markers like [1], [2], etc.
                    text = re.sub(r'\[\d+\]', '', text)
                    section_texts.append(text)
            
            # Stop if we've found the image element itself (don't go past it)
            if next_elem == element or element in next_elem.descendants:
                break
        
        # Join all collected text
        full_text = ' '.join(section_texts)
        
        # Clean up extra whitespace
        full_text = re.sub(r'\s+', ' ', full_text).strip()
        
        return full_text
    
    def _extract_image_caption(self, img_element) -> str:
        """
        Extract the caption for an image.
        Wikipedia images are often in figure elements or have captions in nearby elements.
        """
        # Try to find the parent figure element
        figure = img_element.find_parent('figure')
        if figure:
            figcaption = figure.find('figcaption')
            if figcaption:
                return figcaption.get_text(strip=True)
        
        # Try to find caption in a div with class "thumbcaption"
        thumb_div = img_element.find_parent('div', class_='thumb')
        if thumb_div:
            caption = thumb_div.find('div', class_='thumbcaption')
            if caption:
                # Remove the magnify icon link
                magnify = caption.find('div', class_='magnify')
                if magnify:
                    magnify.decompose()
                return caption.get_text(strip=True)
        
        # Try alt text as fallback
        alt_text = img_element.get('alt', '')
        if alt_text:
            return alt_text
        
        return ""
    
    def _is_valid_content_image(self, img_element) -> bool:
        """
        Filter out UI icons, logos, LaTeX formulas, and other non-content images.
        """
        src = img_element.get('src', '')
        
        # Skip LaTeX/math formula images
        if '/media/math/render/svg/' in src:
            return False
        
        # Skip tiny images (icons, bullets, etc.)
        width = img_element.get('width')
        if width and int(width) < 50:
            return False
        
        # Skip common icon/UI image patterns
        skip_patterns = [
            'Icon_',
            'Edit_icon',
            'Information_icon',
            'Question_book',
            'Ambox',
            'Crystal_',
            'Magnify-clip',
            '/static/',
            'Wikipedia-logo',
            'Wikimedia-logo',
        ]
        
        for pattern in skip_patterns:
            if pattern in src:
                return False
        
        # Skip if it's in the navigation or sidebar
        parent_classes = []
        current = img_element.parent
        while current:
            if hasattr(current, 'get'):
                classes = current.get('class', [])
                parent_classes.extend(classes)
            current = current.parent
        
        skip_classes = ['navbox', 'navigation', 'sidebar', 'infobox', 'metadata', 'mbox']
        if any(skip_class in parent_classes for skip_class in skip_classes):
            return False
        
        return True
    
    def extract_images(self, page_input: str) -> List[Dict[str, str]]:
        """
        Extract all images from a Wikipedia page along with their captions 
        and innermost section text.
        
        Args:
            page_input: Wikipedia page title or URL
            
        Returns:
            List of dictionaries containing:
            - url: Full URL to the image
            - caption: Image caption text
            - section_text: Full text content of the innermost section/subsection where the image appears
            - filename: Image filename
        """
        page_title = self._normalize_page_input(page_input)
        soup = self._get_page_html(page_title)
        
        if not soup:
            return []
        
        # Find the main content area (avoid header, footer, navigation)
        content = soup.find('div', {'id': 'mw-content-text'})
        if not content:
            content = soup
        
        images = []
        
        # Find all img tags in the content
        for img in content.find_all('img'):
            # Filter out non-content images
            if not self._is_valid_content_image(img):
                continue
            
            src = img.get('src', '')
            if not src:
                continue
            
            # Convert relative URLs to absolute
            if src.startswith('//'):
                src = 'https:' + src
            elif src.startswith('/'):
                src = urljoin(self.BASE_URL, src)
            
            # Extract caption
            caption = self._extract_image_caption(img)
            
            # Find the innermost section text
            section_text = self._find_innermost_section(img)
            
            # Extract filename from URL
            filename = src.split('/')[-1]
            
            image_data = {
                'url': src,
                'caption': caption,
                'section_text': section_text,
                'filename': filename
            }
            
            images.append(image_data)
        
        return images
    
    def extract_images_detailed(self, page_input: str) -> Dict:
        """
        Extract images with additional metadata.
        
        Returns:
            Dictionary containing:
            - page_title: The Wikipedia page title
            - page_url: Full URL to the Wikipedia page
            - image_count: Total number of images found
            - images: List of image data dictionaries
        """
        page_title = self._normalize_page_input(page_input)
        images = self.extract_images(page_input)
        
        return {
            'page_title': page_title,
            'page_url': f"{self.BASE_URL}/wiki/{page_title}",
            'image_count': len(images),
            'images': images
        }


def main():
    """
    Example usage of the WikiImageRetrieval tool.
    """
    import json
    import argparse
    
    # Set up argument parser
    parser = argparse.ArgumentParser(
        description='Extract images from Wikipedia pages with captions and section information.'
    )
    parser.add_argument(
        '-u', '--url',
        type=str,
        help='Wikipedia page URL or title (e.g., "Python_(programming_language)" or full URL)'
    )
    parser.add_argument(
        '-o', '--output',
        type=str,
        default='wiki_images_output.json',
        help='Output JSON file path (default: wiki_images_output.json)'
    )
    
    args = parser.parse_args()
    
    # Create an instance
    wiki_tool = WikiImageRetrieval()
    
    # Use provided URL or default example
    if args.url:
        page = args.url
    else:
        page = "Python_(programming_language)"
        print("No URL provided, using example: Python_(programming_language)")
        print("Use -u or --url flag to specify a different page\n")
    
    print(f"Extracting images from Wikipedia page: {page}\n")
    print("=" * 80)
    
    # Get detailed results
    results = wiki_tool.extract_images_detailed(page)
    
    print(f"Page: {results['page_title']}")
    print(f"URL: {results['page_url']}")
    print(f"Total images found: {results['image_count']}\n")
    
    # Display each image with its metadata
    for i, img in enumerate(results['images'], 1):
        print(f"\n--- Image {i} ---")
        print(f"Section Text: {img['section_text']}")
        print(f"Caption: {img['caption']}")
        print(f"Filename: {img['filename']}")
        print(f"URL: {img['url']}")
    
    # Save to JSON file
    with open(args.output, 'w', encoding='utf-8') as f:
        json.dump(results, f, indent=2, ensure_ascii=False)
    
    print(f"\n\nResults saved to {args.output}")


if __name__ == "__main__":
    main()

