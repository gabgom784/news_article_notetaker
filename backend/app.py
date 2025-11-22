
from flask import Flask, request, jsonify
from flask_cors import CORS
import traceback;

#from click.core import ParameterSource
from newspaper import Article
from urllib.parse import urlparse

#These are the imports for the database 
import sqlite3
from datetime import datetime

#This is from my summarizer
from summarizer import generate_summary

"""
For now, we are using SQLite as our database. In the future, I may switch to PostgreSQL.
"""



app = Flask(__name__)
CORS(app)  #This part is needed to connect to the frontend apparently.

@app.route("/")
def home():
    return "Welcome to the Flask API!"



#Now, we want to be able to see all the articles that are in the database
@app.route("/api/articles", methods = ["GET"])
def list_all_articles():
    conn = sqlite3.connect("articles_notes.db")
    conn.row_factory = sqlite3.Row #I have this so that when the rows are given, I also have access to the names of the columns
    c = conn.cursor()

    try:
        c.execute('''SELECT * FROM articles ORDER BY date_added DESC LIMIT 10''')
        rows = c.fetchall()
        #print(rows)
        conn.close()
    except Exception as e:
        return jsonify({"error": "Failed to fetch the articles", "details": str(e)}), 500
    
    articles = []
    for row in rows:
        articles.append({"id": row["id"], "url": row["url"], "title": row["title"], "source": row["source"], "date_added": row["date_added"], "image_url": row["image_url"]})

    return jsonify(articles)


#This is the method to add an article to the articles table
@app.route("/api/articles", methods = ["POST"])
def add_article():
    data = request.get_json()
    url = data.get("url")  #We get this from the article
    
    article = Article(url) #We need to make this an Article object to parse the title, text, and other relevant information

    try:
        article.download()
        article.parse()
    except Exception as e:
        return jsonify({"error": "Failed to fetch article", "details": str(e)}), 500
    

    title = article.title
    source = urlparse(url).netloc
    date_added =  datetime.now().date().isoformat()
    image_url = article.top_image

    if(image_url is None):
        image_url = article.images[0]

    #We now have the fields. Let's insert into the database

    #1. First thing is connecting to database
    conn = sqlite3.connect("articles_notes.db")
    c = conn.cursor()

    #2. Before we insert the url into the articles database, I want to check if it already exists. If so give an error
    c.execute("SELECT * FROM articles WHERE url LIKE ?", (url, ))
    existing = c.fetchall()
    if(len(existing) > 0):
        conn.close()
        return jsonify({"message": "Article already exists", "title": existing[0][2]}), 409

    #3. Now we can insert the values
    try:
        c.execute(
            '''
            INSERT INTO articles (url, title, source, date_added, image_url)
            VALUES (?, ?, ?, ?, ?)
            ''',
            (url, title, source, date_added, image_url)
        )
        article_id = c.lastrowid
        conn.commit()
        conn.close()
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "Failed to add article to database", "details": str(e)}), 500

    #4. I return this in order to just see the response and make sure everything is alright
    return jsonify({
        "status": "saved",
        "article_id": article_id,
        "title": title,
        "source": source,
        "date": date_added,
        "image_url": image_url
    })


#This is the method to add a note to the database
@app.route("/api/notes", methods = ["POST"])
def add_note():
    data = request.get_json()
    article_id = data.get("article_id")
    content = data.get("content")
    parent_note_id = data.get("parent_note_id")

    conn = sqlite3.connect("articles_notes.db")
    c = conn.cursor()

    try:
        c.execute('''INSERT INTO notes (article_id, parent_note_id, content) VALUES (?, ?, ?)''', (article_id, parent_note_id, content))
        conn.commit()
        conn.close()
    except Exception as e:
        return jsonify({"error": "Failed to add note to database", "details": str(e)}), 500
    
    return jsonify({
        "status": "saved the note",
        "article_id": article_id,
        "parent_note_id": parent_note_id,
        "content": content
    })


#This is the method to get notes for a particular article
@app.route("/api/articles/<int:article_id>/notes", methods=["GET"])
def get_notes(article_id):
    conn = sqlite3.connect("articles_notes.db")
    c = conn.cursor()
    c.execute('''
        SELECT id, article_id, parent_note_id, content
        FROM notes
        WHERE article_id = ?
    ''', (article_id,))
    
    rows = c.fetchall()
    conn.close()

    notes = []
    for row in rows:
        notes.append({
            "id": row[0],
            "article_id": row[1],
            "parent_note_id": row[2],
            "content": row[3]
        })

    return jsonify(notes)


#This is for the summaries
@app.route("/api/articles/<int:article_id>/summarize", methods = ["GET"])
def summarize_article(article_id):
    conn = sqlite3.connect("articles_notes.db")
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    c.execute('''SELECT url FROM articles WHERE id = ? ''', (article_id,))
    rows = c.fetchall()
    conn.close()

    url = rows[0]["url"]
    article = Article(url)
    article.download()
    article.parse()

    article_text = article.text
    summary = generate_summary(article_text, num_sentences_in_summary=6)

    return jsonify({"summary": summary})


###########################################
#### THIS IS FOR ALL CATEGORY STUFF #######
###########################################

#This is to get all the available categories    
@app.route("/api/categories/fetch_all_categories", methods=["GET"])
def get_all_categories():
    conn = sqlite3.connect("articles_notes.db")
    conn.row_factory = sqlite3.Row
    c = conn.cursor()

    rows = c.execute("SELECT category FROM available_categories").fetchall()
    categories = [row["category"] for row in rows]
    conn.close()
    return jsonify(categories)

#This is to add a category to the available categories that you can choose from
@app.route("/api/categories/add_category", methods=["POST"])
def add_global_category():
    data = request.get_json()
    new_category = data.get("name")

    if not new_category:
        return jsonify({"error": "Missing category name"}), 400

    conn = sqlite3.connect("articles_notes.db")
    try:
        conn.execute("INSERT INTO available_categories (category) VALUES (?)", (new_category,))
        conn.commit()
    except sqlite3.IntegrityError:
        conn.close()
        return jsonify({"error": "Category already exists"}), 400

    conn.close()
    return jsonify({"success": True})


@app.route("/api/articles/<int:article_id>/add_category", methods = ["POST"])
def add_category(article_id):
    data = request.get_json()

    conn = sqlite3.connect("articles_notes.db")
    c = conn.cursor()

    category = data.get("category")
    c.execute('''INSERT INTO categories (article_id, category) VALUES (?, ?)''', (article_id, category))

    conn.commit()
    conn.close()

    return jsonify({
        "status": "saved",
        "article_id": article_id,
        "category": category
    })

@app.route("/api/articles/<int:article_id>/categories", methods=["GET"])
def get_categories(article_id):
    conn = sqlite3.connect("articles_notes.db")
    c = conn.cursor()

    c.execute("SELECT category FROM categories WHERE article_id = ?", (article_id,))
    rows = c.fetchall()

    conn.close()

    categories = [row[0] for row in rows]
    return jsonify({"categories": categories})

@app.route("/api/articles/filterByCategories", methods=["POST", "OPTIONS"])
def filterByCategories():
    if request.method == "OPTIONS":
        return "", 200   # respond to preflight

    data = request.get_json()
    categories = data.get("categories", [])

    #If no categories were selected
    if not categories:
        return jsonify({"error": "No categories provided"}), 400
    
    # placeholder = ""
    # for category in categories:
    #     placeholder = placeholder + '?,'

    # placeholder = placeholder[:-1] #Remove the last comma

    placeholder = ",".join("?" for _ in categories)

    query = f'''SELECT DISTINCT a.id, a.url, a.title, a.source, a.date_added, a.image_url FROM articles a JOIN categories c ON a.id = c.article_id
    WHERE c.category IN ({placeholder})'''


    conn = sqlite3.connect("articles_notes.db")
    conn.row_factory = sqlite3.Row #This is to access each row like a dictionaryy
    c = conn.cursor()

    c.execute(query, categories)
    rows = c.fetchall()
    conn.close()

    articles = [dict(row) for row in rows]
    return jsonify(articles)
    
#########################################################
"""This is all the filtering by date stuff """
#########################################################
@app.route("/api/articles/filterByDate", methods=["POST"])
def filterByDate():
    data = request.get_json()
    start_date = data.get("startDate")
    end_date = data.get("endDate")

    query = '''SELECT DISTINCT a.id, a.url, a.title, a.source, a.date_added, a.image_url FROM articles a WHERE a.date_added >= (?) 
    AND a.date_added <= (?)'''

    conn = sqlite3.connect("articles_notes.db")
    conn.row_factory = sqlite3.Row #This is to access each row like a dictionaryy
    c = conn.cursor()

    c.execute(query, (start_date, end_date))
    rows = c.fetchall()
    conn.close()

    articles = [dict(row) for row in rows]
    return jsonify(articles)

@app.route("/api/articles/filterCombined", methods=["POST"])
def filter_combined():
    data = request.get_json()
    categories = data.get("categories", [])
    start_date = data.get("startDate")
    end_date = data.get("endDate")

    query = "SELECT DISTINCT a.id, a.url, a.title, a.source, a.date_added, a.image_url FROM articles a"
    joins = []
    filters = []
    params = []

    # Join categories table if filtering by categories
    if categories:
        joins.append("JOIN categories c ON a.id = c.article_id")
        filters.append("c.category IN ({})".format(",".join("?"*len(categories))))
        params.extend(categories)

    # Add date filtering
    if start_date:
        filters.append("a.date_added >= ?")
        params.append(start_date)
    if end_date:
        filters.append("a.date_added <= ?")
        params.append(end_date)

    if joins:
        query += " " + " ".join(joins)
    if filters:
        query += " WHERE " + " AND ".join(filters)

    conn = sqlite3.connect("articles_notes.db")
    conn.row_factory = sqlite3.Row
    c = conn.cursor()
    c.execute(query, params)
    rows = c.fetchall()
    conn.close()

    articles = [dict(row) for row in rows]
    return jsonify(articles)



#Here I initialize the articles and notes database
def init_db():
    conn = sqlite3.connect('articles_notes.db')
    c = conn.cursor()

    #c.execute('''DROP TABLE IF EXISTS notes''')
    
    #Creating the articles list
    c.execute('''
              CREATE TABLE IF NOT EXISTS articles (
               id INTEGER PRIMARY KEY,
               url TEXT,
               title TEXT,
               source TEXT,
               date_added TEXT,
               image_url TEXT
              )''')
    #Creating the notes list
    c.execute('''
              CREATE TABLE IF NOT EXISTS notes (
              id INTEGER PRIMARY KEY,
              article_id INTEGER,
              parent_note_id INTEGER,
              content TEXT,
              FOREIGN KEY(article_id) REFERENCES articles(id),
              FOREIGN KEY(parent_note_id) REFERENCES notes(id)
              )''')

    c.execute('''
              CREATE TABLE IF NOT EXISTS categories (
              id INTEGER PRIMARY KEY,
              article_id INTEGER,
              category TEXT,
              FOREIGN KEY(article_id) REFERENCES articles(id))''')
    
    c.execute('''
              CREATE TABLE IF NOT EXISTS available_categories (
              id INTEGER PRIMARY KEY,
              category TEXT UNIQUE)''')
    

    conn.commit()
    conn.close()





def add_image_column():
    conn = sqlite3.connect("articles_notes.db")
    c = conn.cursor()
    c.execute("ALTER TABLE articles ADD COLUMN image_url TEXT")
    conn.commit()
    conn.close()

if __name__ == "__main__":
    #add_image_column()   (I did this to alter my database and add the image column. I only had ot execute this function once)
    init_db()
    app.run(debug=True)

