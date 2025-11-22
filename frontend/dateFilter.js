///////////////////////////////////////////////////////
///// This is for querying articles by timestamp///////////////////
///////////////////////////////////////////////////////
const dateFilterButton = document.getElementById("dateFilterButton");
const datePopup = document.getElementById("datePopup");
const closeDatePopup = document.getElementById("closeDatePopup");
const applyDateFilter = document.getElementById("applyDateFilter");
const fromDateInput = document.getElementById("fromDate");
const toDateInput = document.getElementById("toDate");

//When we click on the button, it should show the date filtering section
dateFilterButton.addEventListener("click", (e)=> {
    datePopup.classList.remove("hidden");
})

closeDatePopup.addEventListener("click", (e) => {
    datePopup.classList.add("hidden");
})

applyDateFilter.addEventListener("click", async () => {
    const startDate = fromDateInput.value;
    const endDate = toDateInput.value;

    //If we don't provide an end date, then we default it to today
    if (!endDate) {
        const today = new Date();
        endDate = today.toISOString().split('T')[0]; 
    }

    window.currentDateFilter = { startDate, endDate };
    applyCombinedFilters();
    datePopup.classList.add("hidden");
})


loadAllArticles();

