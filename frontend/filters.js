window.currentCategoryFilter = [];
window.currentDateFilter = { startDate: null, endDate: null };

async function applyCombinedFilters() {
    const res = await fetch("http://127.0.0.1:5000/api/articles/filterCombined", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            categories: window.currentCategoryFilter,
            startDate: window.currentDateFilter.startDate,
            endDate: window.currentDateFilter.endDate
        })
    });

    if (!res.ok) {
        alert("Failed to fetch articles");
        return;
    }

    const filteredArticles = await res.json();
    console.log(filteredArticles);
    loadArticles(filteredArticles);
}