import os
import re
import time
import requests
import xml.etree.ElementTree as ET
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

# Constants
FEED_URL = "https://docs.cloud.google.com/feeds/bigquery-release-notes.xml"
CACHE_DURATION = 300  # Cache for 5 minutes

# In-memory cache
cache = {
    "data": None,
    "last_fetched": 0
}

def clean_html_content(html):
    """Clean and structure release note HTML."""
    if not html:
        return ""
    # Remove leading/trailing linebreaks
    html = html.strip()
    return html

def parse_feed_content(xml_content):
    """Parse Atom XML and split daily entries into individual updates by H3 tags."""
    root = ET.fromstring(xml_content)
    ns = {'atom': 'http://www.w3.org/2005/Atom'}
    
    parsed_updates = []
    
    for entry in root.findall('atom:entry', ns):
        # Entry date (usually formatted like "June 17, 2026")
        date_str = entry.find('atom:title', ns).text.strip()
        
        # Timestamp for sorting
        updated_str = entry.find('atom:updated', ns).text.strip()
        
        # Read documentation link
        link_elem = entry.find('atom:link[@rel="alternate"]', ns)
        if link_elem is None:
            link_elem = entry.find('atom:link', ns)
        link_url = link_elem.attrib.get('href', '') if link_elem is not None else ''
        
        content_elem = entry.find('atom:content', ns)
        content_html = content_elem.text if content_elem is not None else ""
        
        # We need to split the HTML by <h3>...</h3> tags since one date entry
        # can contain multiple updates (e.g. Feature, Issue, Announcement, etc.)
        parts = re.split(r'<h3[^>]*>(.*?)</h3>', content_html)
        
        if len(parts) > 1:
            # The HTML splits into:
            # parts[0]: text before first <h3> (usually empty or formatting)
            # parts[1]: header text (e.g., "Feature")
            # parts[2]: content HTML following the header
            # and so on...
            for idx in range(1, len(parts), 2):
                update_type = parts[idx].strip()
                update_body = parts[idx+1].strip() if idx+1 < len(parts) else ""
                
                # Make a unique ID for this specific sub-update
                update_id = f"{date_str}-{update_type}-{idx}".lower().replace(" ", "-").replace(",", "")
                update_id = re.sub(r'[^a-z0-9\-]', '', update_id)
                
                # Strip HTML for a plain text snippet (ideal for tweets/search)
                plain_text = re.sub(r'<[^>]+>', ' ', update_body)
                plain_text = ' '.join(plain_text.split())
                
                parsed_updates.append({
                    'id': update_id,
                    'date': date_str,
                    'updated': updated_str,
                    'link': link_url,
                    'type': update_type,
                    'content_html': clean_html_content(update_body),
                    'plain_text': plain_text
                })
        else:
            # Fallback if no <h3> tags are found in the content
            update_id = f"{date_str}-general-0".lower().replace(" ", "-").replace(",", "")
            update_id = re.sub(r'[^a-z0-9\-]', '', update_id)
            
            plain_text = re.sub(r'<[^>]+>', ' ', content_html)
            plain_text = ' '.join(plain_text.split())
            
            parsed_updates.append({
                'id': update_id,
                'date': date_str,
                'updated': updated_str,
                'link': link_url,
                'type': 'General',
                'content_html': clean_html_content(content_html),
                'plain_text': plain_text
            })
            
    return parsed_updates

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/releases')
def get_releases():
    force_refresh = request.args.get('refresh', 'false').lower() == 'true'
    now = time.time()
    
    if force_refresh or cache["data"] is None or (now - cache["last_fetched"]) > CACHE_DURATION:
        try:
            response = requests.get(FEED_URL, timeout=15)
            response.raise_for_status()
            
            updates = parse_feed_content(response.content)
            cache["data"] = updates
            cache["last_fetched"] = now
        except Exception as e:
            # Return cached data if available on error, otherwise raise/return error
            if cache["data"] is not None:
                return jsonify({
                    "status": "warning",
                    "message": f"Failed to fetch live feed. Serving cached version. Error: {str(e)}",
                    "last_fetched": cache["last_fetched"],
                    "releases": cache["data"]
                })
            return jsonify({
                "status": "error",
                "message": f"Error fetching release notes: {str(e)}"
            }), 500
            
    return jsonify({
        "status": "success",
        "last_fetched": cache["last_fetched"],
        "releases": cache["data"]
    })

if __name__ == '__main__':
    # Listen on port 5000
    app.run(host='127.0.0.1', port=5000, debug=True)
