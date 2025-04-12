// Configuration: Replace with your values
const API_KEY = "AIzaSyCrW2moiA2PDNyEEQTSrRjyYQjiwC1-X70"; // Your new key
const SHEET_ID = "1f51ZHJJWnBjO3tlEM0k49J-5FMfLJIpjiLp0TXSuppI";
const categories = [
    { name: "肉類", gid: "849873260", range: "肉類!A2:C" },
    { name: "水果", gid: "1685859622", range: "水果!A2:C" },
    { name: "蔬菜", gid: "1047678657", range: "蔬菜!A2:C" }
];

let vocabulary = [];
const categorySelect = document.getElementById("category-select");
const itemContainer = document.getElementById("item-container");
const imageElement = document.getElementById("item-image");
const answerElement = document.getElementById("item-answer");
const loadingText = document.getElementById("loading-text");
const audioElement = document.createElement("audio"); // For Text-to-Speech

function populateCategories() {
    console.log("Populating categories:", categories);
    if (!categorySelect) {
        console.error("Dropdown element not found");
        return;
    }
    categories.forEach(category => {
        const option = document.createElement("option");
        option.value = category.gid;
        option.textContent = category.name;
        categorySelect.appendChild(option);
    });
}

async function fetchVocabulary(gid, range) {
    const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${range}?key=${API_KEY}`;
    console.log("Fetching from URL:", url);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`HTTP error! Status: ${response.status}`);
        }
        const data = await response.json();
        console.log("Raw API data:", data);

        vocabulary = data.values.map(row => ({
            english: row[0] || "",
            picture: row[1] || "",
            chinese: row[2] || ""
        }));
        console.log("Parsed vocabulary:", vocabulary);
        if (vocabulary.length === 0) {
            console.warn("No items parsed from API data.");
        }
    } catch (error) {
        console.error("Error fetching vocabulary:", error);
        vocabulary = [];
        loadingText.textContent = "Failed to load vocabulary.";
    }
}

async function generateSpeech(text) {
    const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;
    const body = {
        input: { text: text },
        voice: { languageCode: "cmn-CN", name: "cmn-CN-Wavenet-A" }, // Mandarin female
        audioConfig: { audioEncoding: "MP3" }
    };
    try {
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            throw new Error(`Text-to-Speech error! Status: ${response.status}`);
        }
        const data = await response.json();
        audioElement.src = `data:audio/mp3;base64,${data.audioContent}`;
        audioElement.play();
    } catch (error) {
        console.error("Error generating speech:", error);
    }
}

async function loadRandomItem() {
    console.log("loadRandomItem started");
    const selectedGid = categorySelect.value;
    if (!selectedGid) {
        itemContainer.style.display = "none";
        loadingText.textContent = "Select a category to start.";
        console.log("No category selected");
        return;
    }

    const category = categories.find(cat => cat.gid === selectedGid);
    loadingText.textContent = "Loading item...";
    itemContainer.style.display = "block";

    if (vocabulary.length === 0) {
        console.log("Fetching vocabulary...");
        await fetchVocabulary(selectedGid, category.range);
    }
    if (vocabulary.length === 0) {
        loadingText.textContent = "No items found in this category.";
        console.log("Vocabulary empty after fetch");
        return;
    }

    const randomIndex = Math.floor(Math.random() * vocabulary.length);
    const item = vocabulary[randomIndex];
    console.log("Selected item:", item);

    imageElement.src = "";
    imageElement.style.display = "none";
    answerElement.textContent = item.chinese;
    answerElement.classList.add("hidden");

    const imageUrl = item.picture.trim();
    console.log("Setting image URL:", imageUrl);

    imageElement.src = imageUrl;
    imageElement.onerror = () => {
        console.error("Image failed to load:", imageUrl);
        imageElement.src = "https://via.placeholder.com/300?text=Image+Not+Found";
    };
    loadingText.style.display = "none";
    imageElement.style.display = "block";

    // Play Chinese word audio (optional)
    await generateSpeech(item.chinese);
}

function revealAnswer() {
    answerElement.classList.remove("hidden");
    audioElement.play(); // Replay audio when revealing
}

function init() {
    console.log("Initializing...");
    populateCategories();
    itemContainer.style.display = "none";
}

init();