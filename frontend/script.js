const form = document.getElementById("article-form");
const articlesList = document.getElementById("articles-list");
const notesContent = document.getElementById("notes-content");

const summarizeArticleButton = document.getElementById("summarizeButton");
const summarizeTextbox = document.getElementById("summary-content")

let currentArticleId = null;

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const url = document.getElementById("url").value;

  const res = await fetch("http://127.0.0.1:5000/api/articles", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ url })
  });

  const data = await res.json();

  if(res.status == 409){
    alert("Article has already been created");
  } else if (res.status == 200){
    alert("Article added!");
    showCategoryPopup(data.article_id);
  } else {
    alert("Error adding article");
    console.log(res);
  }
  document.getElementById("url").value = "";
  
  loadAllArticles();
});

//This is to load all the articles
async function loadAllArticles() {
    const res = await fetch("http://127.0.0.1:5000/api/articles");
    const articles = await res.json();
    loadArticles(articles);
}

async function loadArticles(articles) {

  articlesList.innerHTML = "";
  articles.forEach(async (article) => {
    const li = document.createElement("li");
    li.classList.add("article-card");
    console.log(li.className)
    li.innerHTML = `
        <img src = "${article.image_url}" alt = "Article Image" class = "article-image">
        <div class = "article-content">
            <strong>${article.title}</strong> 
            <div class = "article-details">
                <span>${article.source}</span>
                <span>${article.date_added}</span>
            </div>
            <div class = "categories">
            </div>
            <div class = "article-buttons">
                <button onclick="window.open('${article.url}', '_blank')"> Open Article </button>
                <button onclick="showNoteSection('${article.title}', ${article.id})">View Notes </button>
                <button onclick="showCategoryPopup('${article.id}')">Change Categories</button>
            </div>
        </div>`;

    //When clicked, the card loads two buttons: one to open notes for it, and the other to open the website itself
    li.addEventListener("click", () => {
        document.querySelectorAll(".article-card").forEach((item) => item.classList.remove("clicked")); //We do this to reset all the cards to unclicked so that they all don't show buttons

        li.classList.add("clicked");
        //Set the currentArticleId to the ID of the article clicked
        currentArticleId = article.id;
    })

    const categoriesDiv = li.querySelector(".categories");
    const data = await fetchCategories(article.id);
    console.log(data.categories);
    categoriesDiv.innerHTML = data.categories.map(cat => `<span class="category-tag">${cat}</span>`).join("");

    articlesList.appendChild(li);
  });
}

function showNoteSection(article_title, article_id) {
    const notesTitle = document.getElementById("current-notes-title");
    notesTitle.textContent = `Notes for Article: ${article_title}`;
    //const notesContent = document.getElementById("notes-content");

    //Load in the notes for the respective article
    loadNotes(article_id);
}

async function loadNotes(article_id){
    const res = await fetch(`http://127.0.0.1:5000/api/articles/${article_id}/notes`);
    const notes = await res.json();
    console.log(notes);
    console.log(currentArticleId);
    
    notesContent.value = "";  //This line is basically so when I click on a different article card the notes from the previously clicked article don't show up
    summarizeTextbox.value = ""; //Clear out the summary section as well 
    // notes.forEach((note) => {
    //     const bulletNote = `• ${note.content}\n`;
    //     notesContent.value += bulletNote;
    // });
    const tree = buildNoteTree(notes);
    notesContent.value = showNotes(tree);
}

//This is to add notes to the article


notesContent.addEventListener("keydown", async (e) => {
    if(e.key === "Enter" && e.shiftKey == false){
        e.preventDefault();

        const start = notesContent.selectionStart; //This is the current position of the cursor within the text box
        const everythingInTextbox = notesContent.value;

        const everythingBefore = everythingInTextbox.slice(0, start);
        const currentLineMatch = everythingBefore.match(/(^|\n)([ \t]*)•[^\n]*$/);
        
        let indent = "";
        if(currentLineMatch){
            indent = currentLineMatch[2];
            if(indent.length >= 4){
                indent = indent.slice(0, -4); //Moving a tab back
            } else {
                indent = "";
            }
        } else {
            indent = "";
        }

        const bullet = `${indent}• `;
        const newValue = everythingInTextbox.slice(0, start) + "\n" + bullet + everythingInTextbox.slice(start);

        notesContent.value = newValue;

        const newCursorPosition = start + bullet.length + 1;
        notesContent.setSelectionRange(newCursorPosition, newCursorPosition);
    }
})

notesContent.addEventListener("keydown", (e) => {
    if (e.key === "Tab") {
        e.preventDefault();

        const start = notesContent.selectionStart;
        const value = notesContent.value;

        // Find the start of the current line
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const lineEnd = value.indexOf("\n", start);
        const end = lineEnd === -1 ? value.length : lineEnd;

        // Insert 4 spaces at the start of the current line
        const beforeLine = value.slice(0, lineStart);
        const line = value.slice(lineStart, end);
        const afterLine = value.slice(end);

        const newLine = "    " + line;

        notesContent.value = beforeLine + newLine + afterLine;

        // Move the cursor forward 4 spaces (but only if it's in or after the line)
        const cursorOffset = (start >= lineStart) ? 4 : 0;
        const newCursorPosition = start + cursorOffset;
        notesContent.setSelectionRange(newCursorPosition, newCursorPosition);
    }
});

//Press Shift + Enter to tab backwards on the same line
notesContent.addEventListener("keydown", async(e) => {
    if(e.key === "Enter" && e.shiftKey){
        e.preventDefault();
        console.log("I like chicken");

        const start = notesContent.selectionStart;
        const value = notesContent.value;

        // Find the start of the current line
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const lineEnd = value.indexOf("\n", start);
        const end = lineEnd === -1 ? value.length : lineEnd;

        // Insert 4 spaces at the start of the current line
        const beforeLine = value.slice(0, lineStart);
        const line = value.slice(lineStart, end); //This is the actual value of the note
        const afterLine = value.slice(end);

        const newLine = line.slice(4); //We want to remove the tab from the note.

        notesContent.value = beforeLine + newLine + afterLine;

        // Move the cursor forward 4 spaces (but only if it's in or after the line)
        const cursorOffset = (start - 4 >= lineStart) ? - 4 : 0;
        const newCursorPosition = start + cursorOffset;
        notesContent.setSelectionRange(newCursorPosition, newCursorPosition);
    }
})

function buildNoteTree(notes){
    const NoteMap = {};
    const rootNotes = []; //These store the outermost notes in the section

    notes.forEach((note) => {
        NoteMap[note.id] = note;
        note.children = [];
    })

    notes.forEach((note) => {
        if(note.parent_note_id){
            const parent_note = NoteMap[note.parent_note_id];
            if(parent_note){
                parent_note.children.push(note);
            }
        } else {
            rootNotes.push(note);
        }
    });
    return rootNotes;
}

function showNotes(notes, indentAmount = 0){
    let result = "";
    notes.forEach(note => {
        const indent = "    ".repeat(indentAmount); // 4 spaces per indent level
        result += `${indent}• ${note.content}\n`;
        if (note.children.length > 0) {
            result += showNotes(note.children, indentAmount + 1);
        }
    });
    return result;
}
////////////////////////////////////////////
// All of this is for saving the notes /////
//////////////////////////////////////////// 
const saveNotesButton = document.getElementById("saveNotesButton");
saveNotesButton.addEventListener("click", async ()=> {
    saveNotes(currentArticleId);
})


async function saveNotes(article_id){
    const savedNotes = await getNotesForArticle(article_id);

    let savedNotesContent = [];

    savedNotes.forEach((savedNote) => {
        savedNotesContent.push(savedNote.content.trim());
    })

    const textNotes = parseBulletNotes(notesContent.value);


    let currentNote = null;
    let currentNoteContent = null;
    let currentNoteIndentation = null;
    let parentNote = null;

    for(let i = 0; i < textNotes.length; i++){
        currentNote = textNotes[i];
        currentNoteContent = currentNote.content.trim();
        currentNoteIndentation = currentNote.indentLevel;
        let parentNodeId = null;

        if(savedNotesContent.includes(currentNoteContent)){
            continue;
        } else {
            if(currentNoteIndentation > 0){ //This means it is a child note of another note
                parentNote = textNotes[i-1]
                let parentNoteContent = parentNote.content;
                parentNoteId = getNoteIdByContent(savedNotes, parentNoteContent);
            } else { //If there is no ident, then it is the outermost note
                parentNote = null;
            }
            const res = await fetch("http://127.0.0.1:5000/api/notes", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                  content: currentNoteContent,
                  article_id: currentArticleId,
                  parent_note_id: parentNote == null ? null : parentNoteId
                })
        })
     }
    }
}

//This is to find the note with a particular id using the content
function getNoteIdByContent(savedNotes, content) {
    const note = savedNotes.find((n) => n.content.trim() === content.trim());
    return note ? note.id : null;
  }
  

//This is the function to get all the notes for a particular article
async function getNotesForArticle(article_id){
    const res = await fetch(`http://127.0.0.1:5000/api/articles/${article_id}/notes`);
    if(res.ok == false){
        console.log("Couldn't fetch notes for article");
        return;
    } 
    const notes = await res.json();
    return notes;
}

//Here we save the indentation of each note as well as the notes content itself. This is so when we save, we can get the parent of each note as well.
function parseBulletNotes(text){
    const lines = text.split("\n"); //Here we will get all the notes

    const notes = [];
    let currentNote = null; //This will be the currentNote

    lines.forEach((line) => {
        const match = line.match(/^(\s*)•\s*(.*)$/); //The indent amount is match[1] and the content is match[2];

        if(match){
            if(currentNote){
                notes.push(currentNote);
            }
            
            const indentLevel = match[1].length / 4; 
            const content = match[2];

            currentNote = {"indentLevel": indentLevel, "content": content};
        } else if (currentNote) {
            currentNote.content = currentNote.content + line.trim(); //This part is if the note goes longer than a line
        }
    })

    //Now here I push the final note
    if(currentNote){
        notes.push(currentNote);
    }

    return notes;
}

///////////////////////////////////////////////////////////
//// The Section for Summarizing the article's content ////
///////////////////////////////////////////////////////////
summarizeArticleButton.addEventListener("click", async() => {
    loadSummary(currentArticleId);
})

async function loadSummary(article_id){
    const res = await fetch(`http://127.0.0.1:5000/api/articles/${article_id}/summarize`);
    const summaryData = await res.json();
    summarizeTextbox.value = summaryData.summary;
}


/////////////////////////////////////////////////////////////////
//// The Section for The Category Bubble when Adding Article ////
/////////////////////////////////////////////////////////////////
let categories = []
const popup = document.getElementById("categoryPopup");
const bubbleContainer = document.getElementById("categoryBubbles");
const saveBtn = document.getElementById("saveCategories");

//This function is to load the categories in from the database
async function loadCategories(){
    const res = await fetch("http://127.0.0.1:5000/api/categories/fetch_all_categories");
    data = await res.json();
    console.log(data);
    categories = data;
}

//This is the function to actually show the available categories to choose from
async function showCategoryPopup(articleId){
    await loadCategories();
    bubbleContainer.innerHTML = ''; //Im clearing here so when adding another article, the previous article's categories don't show up

    categories.forEach(category => {
        const categoryBubble = document.createElement("div");
        categoryBubble.className = "bubble";
        categoryBubble.innerText = category;
        categoryBubble.addEventListener("click", () => {
            categoryBubble.classList.add("selected");
        });
        bubbleContainer.appendChild(categoryBubble);
    });

    popup.classList.remove("hidden");

    saveBtn.addEventListener("click", async () => {
        const selectedCategories = [...document.querySelectorAll(".bubble.selected")]
        for (const selectedCategory of selectedCategories) {
            const category = selectedCategory.innerText;
            await addCategoryToTable(articleId, category); // Use articleId here, not article_id
        }
        popup.classList.add("hidden");
    })
   
}

//Here we basically add the category and the article to our table within our database in order to keep track of which categories an article falls under
async function addCategoryToTable(article_id, category){
    await fetch(`http://127.0.0.1:5000/api/articles/${article_id}/add_category`, {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ category })
    });
}

///////////////////////////////////////////////////////
///// This is for querying articles by category///////////////////
///////////////////////////////////////////////////////
const filterCategoriesButton = document.querySelector("#FilterCategoriesButton");
const categoryDropdown = document.querySelector("#categoryDropdown");

filterCategoriesButton.addEventListener("click", async () => {
    showCategoriesFilterPopup();
    categoryDropdown.innerHTML += `
        <button id="submitCategoriesButton">Submit</button>
        <button id="addCategoriesButton">Add custom category</button>
    `;

    categoryDropdown.classList.add("clicked");
});

async function showCategoriesFilterPopup(){
    bubbleContainer.innerHTML = ''; //Im clearing here so when adding another article, the previous article's categories don't show up
    await loadCategories();
    categories.forEach(category => {
        const categoryBubble = document.createElement("div");
        categoryBubble.className = "bubble";
        categoryBubble.innerText = category;
        categoryBubble.addEventListener("click", () => {
            categoryBubble.classList.add("selected");
        });
        bubbleContainer.appendChild(categoryBubble);
    });

    popup.classList.remove("hidden");

    saveBtn.addEventListener("click", async () => {
        const selected = [...document.querySelectorAll(".bubble.selected")];
        window.currentCategoryFilter = selected.map(b => b.innerText);

        applyCombinedFilters();
        popup.classList.add("hidden");
    })
}

///////////////////////////////////////////////////////
/// This is to fetch the categories for an article ////
///////////////////////////////////////////////////////
async function fetchCategories(article_id){
    const response = await fetch (`http://127.0.0.1:5000/api/articles/${article_id}/categories`);
    const categories = await response.json();
    //console.log(categories);
    return categories;
}




//This is the logic to basically add the custom category to our list of categories
const customPopup = document.getElementById("customCategoryPopup");
const newCategoryInput = document.getElementById("newCategoryInput");
const saveNewCategory = document.getElementById("saveNewCategory");
const closeCustomCategoryPopup = document.getElementById("closeCustomCategoryPopup");

saveNewCategory.addEventListener("click", async () => {
    const newCategory = newCategoryInput.value.trim();

    if (newCategory === "") return;

    // Add category to the list
    const res = await fetch("http://127.0.0.1:5000/api/categories/add_category", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: newCategory })
    });

    console.log(categories);

    if (!res.ok) {
        alert("Category already exists or failed to save.");
        return;
    }

    await loadCategories();
    console.log(categories);
    // Close popup
    customPopup.classList.add("hidden");
    newCategoryInput.value = "";

    // Refresh dropdown
    filterCategoriesButton.click();
});

// Close popup without saving
closeCustomCategoryPopup.addEventListener("click", () => {
    customPopup.classList.add("hidden");
    newCategoryInput.value = "";
});







