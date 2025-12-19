#!/usr/bin/env python3
"""
Extract quiz content from HTML and fill quiz.json
"""

import json
import re
from pathlib import Path
from bs4 import BeautifulSoup

def load_json(file_path):
    with open(file_path, 'r', encoding='utf-8') as f:
        return json.load(f)

def save_json(file_path, data):
    with open(file_path, 'w', encoding='utf-8') as f:
        json.dump(data, f, ensure_ascii=False, indent=2)

def extract_quiz_data_from_html(html_file):
    """Extract quiz questions and answers from HTML"""
    with open(html_file, 'r', encoding='utf-8') as f:
        content = f.read()
    
    soup = BeautifulSoup(content, 'html.parser')
    
    quiz_data = {
        'modules': {
            'm1': {'questions': {}},
            'm2': {'questions': {}},
            'm3': {'questions': {}}
        }
    }
    
    # Find all quiz modules
    for module_num in ['1', '2', '3']:
        module_div = soup.find('div', {'data-module': module_num, 'class': 'quiz-module'})
        if not module_div:
            continue
        
        module_key = f'm{module_num}'
        
        # Find all quiz blocks in this module
        quiz_blocks = module_div.find_all('div', class_='quiz-block')
        
        for idx, block in enumerate(quiz_blocks, 1):
            question_key = f'q{idx}'
            
            # Extract question text
            question_elem = block.find('p', class_='question')
            if question_elem:
                question_text = str(question_elem.decode_contents()).strip()
                
                # Extract options
                options = {}
                option_buttons = block.find_all('button', class_='quiz-option')
                for opt_btn in option_buttons:
                    # Get the data-i18n attribute to determine option key
                    i18n_attr = opt_btn.get('data-i18n', '')
                    if '.options.' in i18n_attr:
                        opt_key = i18n_attr.split('.options.')[-1]
                        options[opt_key] = opt_btn.get_text().strip()
                
                # Extract feedback
                feedback_elem = block.find('div', class_='feedback')
                feedback_text = ''
                if feedback_elem:
                    feedback_text = str(feedback_elem.decode_contents()).strip()
                
                # Store in structure
                quiz_data['modules'][module_key]['questions'][question_key] = {
                    'text': question_text,
                    'options': options,
                    'feedback': feedback_text
                }
    
    return quiz_data

def main():
    base_dir = Path('/home/eduarda-tessari-pereira/Documents/zaffari')
    html_file = base_dir / 'paginas' / 'pt' / 'extras' / 'questionarios.html'
    json_file = base_dir / 'locales' / 'pt' / 'extras' / 'quiz.json'
    
    print("="*80)
    print("📝 EXTRACTING QUIZ DATA FROM HTML")
    print("="*80)
    print()
    
    # Extract from HTML
    print("📖 Reading questionarios.html...")
    quiz_data = extract_quiz_data_from_html(html_file)
    
    # Load existing JSON
    print("📖 Loading existing quiz.json...")
    existing_data = load_json(json_file)
    
    # Merge data
    print("🔧 Merging quiz questions...")
    filled_count = 0
    
    for module_key, module_data in quiz_data['modules'].items():
        if module_key not in existing_data.get('modules', {}):
            existing_data.setdefault('modules', {})[module_key] = {}
        
        if 'questions' not in existing_data['modules'][module_key]:
            existing_data['modules'][module_key]['questions'] = {}
        
        for q_key, q_data in module_data['questions'].items():
            if q_key not in existing_data['modules'][module_key]['questions']:
                existing_data['modules'][module_key]['questions'][q_key] = {}
            
            # Fill text
            if q_data['text']:
                existing_data['modules'][module_key]['questions'][q_key]['text'] = q_data['text']
                filled_count += 1
            
            # Fill options
            if q_data['options']:
                existing_data['modules'][module_key]['questions'][q_key]['options'] = q_data['options']
                filled_count += len(q_data['options'])
            
            # Fill feedback
            if q_data['feedback']:
                existing_data['modules'][module_key]['questions'][q_key]['feedback'] = q_data['feedback']
                filled_count += 1
    
    # Save
    print("💾 Saving quiz.json...")
    save_json(json_file, existing_data)
    
    print()
    print("="*80)
    print("✅ QUIZ DATA EXTRACTED SUCCESSFULLY")
    print("="*80)
    print(f"Total fields filled: {filled_count}")
    print()

if __name__ == '__main__':
    # Check if beautifulsoup4 is available
    try:
        from bs4 import BeautifulSoup
        main()
    except ImportError:
        print("❌ BeautifulSoup4 not available")
        print("Installing via system package...")
        import subprocess
        subprocess.run(['sudo', 'apt-get', 'install', '-y', 'python3-bs4'], check=False)
        print("\n🔄 Please run the script again")
