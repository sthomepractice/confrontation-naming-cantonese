// Configuration: Replace with your values
const SHEET_ID = "1f51ZHJJWnBjO3tlEM0k49J-5FMfLJIpjiLp0TXSuppI"; // Your Google Sheet ID
const API_KEY = "AIzaSyBS4jcyS4yYiCF_tNfWvmZQf0kHQczvMME"; // Your working API key

// Global variables for practice flow
let allWords = [];
let selectedWords = [];
let currentIndex = 0;
let round = 1;
let answerClicked = false;

// HTML elements
const categorySelect = document.getElementById("categories");
const categorySelectDiv = document.getElementById("category-select");
const practiceDiv = document.getElementById("practice");
const completedDiv = document.getElementById("completed");
const wordImage = document.getElementById("word-image");
const wordText = document.getElementById("word-text");
const answerBtn = document.getElementById("answer-btn");
const nextBtn = document.getElementById("next-btn");
const restartBtn = document.getElementById("restart-btn");

// Verify elements exist
console.log("Category select element:", categorySelect);
console.log("Category select div:", categorySelectDiv);
console.log("Practice div:", practiceDiv);
console.log("Completed div:", completedDiv);
console.log("Word image:", wordImage);
console.log("Restart button:", restartBtn);

// Load all tabs as categories on page load
window.onload = function() {
    console.log("Page loaded, initializing...");
    loadCategories();
};

async function loadCategories() {
    try {
        console.log("Loading categories...");
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}?key=${API_KEY}`;
        console.log("Fetching sheet metadata from:", url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`無法獲取表格：${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Sheet data:", JSON.stringify(data, null, 2));

        // Log all sheet titles
        const sheetTitles = data.sheets ? data.sheets.map(sheet => sheet.properties.title) : [];
        console.log("Available sheet titles:", sheetTitles);

        // Clear existing options
        categorySelect.innerHTML = '<option value="" disabled selected>請選擇類別</option>';
        console.log("Cleared dropdown options");

        // Check if sheets exist
        if (!data.sheets || data.sheets.length === 0) {
            console.warn("No sheets found in the Google Sheet");
            alert("表格中沒有工作表！請在 Google Sheet 中添加至少一個工作表。");
            return;
        }

        // Add all tabs as options
        let addedCategories = 0;
        data.sheets.forEach(sheet => {
            const title = sheet.properties.title;
            console.log("Adding category:", title);
            const option = document.createElement("option");
            option.value = title;
            option.textContent = title;
            categorySelect.appendChild(option);
            addedCategories++;
        });
        console.log("Added", addedCategories, "categories");
        console.log("Categories loaded:", Array.from(categorySelect.options).map(opt => opt.value));

        // Ensure onchange handler
        categorySelect.onchange = startPractice;
    } catch (error) {
        console.error("Error loading categories:", error.message);
        alert("無法加載類別！請檢查控制台錯誤，並確保表格設為「任何人可查看」。");
    }
}

async function startPractice(event) {
    const category = event.target.value;
    console.log("startPractice called with category:", category);
    if (!category) {
        console.warn("No category selected, exiting startPractice");
        return;
    }

    try {
        console.log("Hiding category-select, showing practice area...");
        categorySelectDiv.classList.add("hidden");
        practiceDiv.classList.remove("hidden");

        console.log("Fetching words for category:", category);
        const url = `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${category}!A2:C?key=${API_KEY}`;
        console.log("Fetching words from:", url);
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`無法獲取單詞：${response.status} ${response.statusText}`);
        }
        const data = await response.json();
        console.log("Words data:", data);

        if (!data.values || data.values.length === 0) {
            throw new Error(`類別「${category}」中沒有單詞。`);
        }

        allWords = data.values.map(row => ({
            english: row[0] || "",
            chinese: row[1] ? row[1].trim() : "",
            image: row[2] ? row[2].trim() : ""
        }));
        console.log("Raw words:", allWords);

        allWords = allWords.filter(word => word.chinese && word.image);
        console.log("Filtered words:", allWords);

        // Adjust number of words per round here
        if (allWords.length < 4) {
            throw new Error(`類別「${category}」單詞不足（需要至少4個）。`);
        }

        selectedWords = shuffleArray(allWords.slice()).slice(0, 4); // Change 4 to desired number (e.g., 3, 6)
        console.log("Selected words:", selectedWords);
        currentIndex = 0;
        loadWord();
    } catch (error) {
        console.error("Error starting practice:", error.message);
        alert(`無法開始練習：${error.message} 請檢查表格數據或網絡。`);
        categorySelectDiv.classList.remove("hidden");
        practiceDiv.classList.add("hidden");
    }
}

function loadWord() {
    if (currentIndex >= selectedWords.length) {
        // Adjust number of rounds here
        if (round < 3) { // Change 3 to desired number (e.g., 2, 5)
            round++;
            currentIndex = 0;
            selectedWords = shuffleArray(selectedWords.slice());
            console.log("New round:", round, "Selected words:", selectedWords);
        } else {
            console.log("Practice complete");
            endPractice();
            return;
        }
    }

    const word = selectedWords[currentIndex];
    console.log("Loading word:", word.chinese, "Image URL:", JSON.stringify(word.image));
    if (!word.image || word.image.trim() === "" || !word.image.match(/\.(jpg|jpeg|png|gif)$/i)) {
        console.warn("Image URL is empty or invalid for word:", word.chinese, "URL:", word.image);
        wordImage.src = "https://placehold.co/200x200?text=Image+Not+Found";
    } else {
        wordImage.src = word.image;
    }
    wordImage.alt = word.chinese || "Image";
    wordText.textContent = word.chinese;
    answerClicked = false;
    nextBtn.disabled = true;

    wordImage.onerror = () => {
        console.error("Failed to load image:", word.image);
        wordImage.src = "https://placehold.co/200x200?text=Image+Not+Found";
    };
}

answerBtn.addEventListener("click", async () => {
    try {
        const text = selectedWords[currentIndex].chinese;
        console.log("Attempting to play pronunciation for:", JSON.stringify(text));
        if (!text || typeof text !== "string" || text.trim() === "") {
            throw new Error("無效的單詞文本，請檢查表格中的中文欄");
        }
        await playPronunciation(text);
        answerClicked = true;
        nextBtn.disabled = false;
    } catch (error) {
        console.error("Pronunciation error details:", error.message);
        alert("無法播放發音！請檢查單詞或網絡。詳細錯誤已記錄至控制台。");
    }
});

nextBtn.addEventListener("click", () => {
    if (answerClicked) {
        currentIndex++;
        console.log("Next word, index:", currentIndex);
        loadWord();
    }
});

restartBtn.addEventListener("click", () => {
    console.log("Restarting practice...");
    window.location.reload();
});

function endPractice() {
    console.log("Ending practice");
    practiceDiv.classList.add("hidden");
    completedDiv.classList.remove("hidden");
}

async function playPronunciation(text) {
    try {
        console.log("Sending TTS request for:", JSON.stringify(text));
        const url = `https://texttospeech.googleapis.com/v1/text:synthesize?key=${API_KEY}`;
        const payload = {
            input: { text: text },
            voice: { languageCode: "yue-Hant-HK" },
            audioConfig: { audioEncoding: "MP3" }
        };
        console.log("Request payload:", JSON.stringify(payload));
        const response = await fetch(url, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload)
        });
        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            const errorMessage = errorData.error?.message || response.statusText;
            throw new Error(`TTS API error: ${response.status} ${errorMessage}`);
        }
        const data = await response.json();
        console.log("TTS response:", data);
        if (!data.audioContent) {
            throw new Error("No audio content returned from TTS API");
        }
        const audio = new Audio(`data:audio/mp3;base64,${data.audioContent}`);
        audio.play().catch(e => {
            console.error("Audio playback error:", e);
            throw new Error("無法播放音頻，可能受瀏覽器限制");
        });
    } catch (error) {
        console.error("Full TTS error:", error.message);
        throw error;
    }
}

function shuffleArray(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}