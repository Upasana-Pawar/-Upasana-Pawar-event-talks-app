from flask import Flask, jsonify, render_template, request
import urllib.request
import xml.etree.ElementTree as ET
from bs4 import BeautifulSoup
import re
import hashlib
import os

app = Flask(__name__)

# BigQuery Release Notes Atom Feed URL
FEED_URL = 'https://docs.cloud.google.com/feeds/bigquery-release-notes.xml'

def fetch_and_parse_feed():
    # Fetch feed
    req = urllib.request.Request(FEED_URL, headers={'User-Agent': 'Mozilla/5.0'})
    xml_data = urllib.request.urlopen(req).read()
    
    # Parse XML
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    root = ET.fromstring(xml_data)
    
    entries = root.findall('atom:entry', ns)
    all_updates = []
    
    for entry in entries:
        date_str = entry.find('atom:title', ns).text
        link_elem = entry.find('atom:link[@rel="alternate"]', ns)
        link = link_elem.attrib.get('href') if link_elem is not None else 'https://cloud.google.com/bigquery/docs/release-notes'
        content_elem = entry.find('atom:content', ns)
        
        if content_elem is None or content_elem.text is None:
            continue
            
        html_content = content_elem.text
        soup = BeautifulSoup(html_content, 'html.parser')
        
        current_type = "General"
        current_elements = []
        
        # Helper function to compile and add an update
        def add_update(update_type, elements):
            if not elements:
                return
            update_html = "".join([str(x) for x in elements]).strip()
            
            # Load back into BS4 to sanitize and clean
            sub_soup = BeautifulSoup(update_html, 'html.parser')
            
            # Make sure all anchor links open in a new tab
            for a in sub_soup.find_all('a'):
                a['target'] = '_blank'
                a['rel'] = 'noopener noreferrer'
                
            clean_html = str(sub_soup)
            
            # Extract plain text representation for searching and tweeting
            update_text = sub_soup.get_text(separator=' ').strip()
            update_text = re.sub(r'\s+', ' ', update_text)
            
            if not update_text:
                return
                
            # Create a unique ID using md5 hash of date, type and a snippet of content
            uid_src = f"{date_str}-{update_type}-{update_text[:50]}"
            uid = hashlib.md5(uid_src.encode('utf-8')).hexdigest()
            
            all_updates.append({
                'id': uid,
                'date': date_str,
                'type': update_type,
                'content_html': clean_html,
                'content_text': update_text,
                'link': link
            })

        # Traverse elements inside the feed entry description to split by h3 headings
        for child in soup.contents:
            if child.name == 'h3':
                add_update(current_type, current_elements)
                current_type = child.get_text().strip()
                current_elements = []
            else:
                if str(child).strip():
                    current_elements.append(child)
                    
        # Add the final trailing update for this entry
        add_update(current_type, current_elements)
        
    return all_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    try:
        updates = fetch_and_parse_feed()
        return jsonify({'status': 'success', 'data': updates})
    except Exception as e:
        return jsonify({'status': 'error', 'message': str(e)}), 500

if __name__ == '__main__':
    # Defaulting to port 5000
    app.run(debug=True, port=5000)
