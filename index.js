// Session Management
const WEBHOOK_URL = "https://propal.keegant.dev/webhook/033400de-aace-4432-8096-63dce19044a4";
let sessionId;

function setSessionId() {
    sessionId = Date.now().toString();
    localStorage.setItem("propalSessionId", sessionId);
}

function getSessionId() {
    sessionId = localStorage.getItem("propalSessionId");
    if (!sessionId) setSessionId();
}

getSessionId();

function saveTasksToStorage() {
    const tasks = [...document.querySelectorAll(".task-input")].map(input => input.value);
    localStorage.setItem("propalTasks", JSON.stringify(tasks));
}

function loadTasksFromStorage() {
    const saved = localStorage.getItem("propalTasks");
    if (!saved) return;

    JSON.parse(saved).forEach(taskText => addTask(taskText));
}

function saveMemoriesToStorage() {
    localStorage.setItem("propalMemories", coreMemories.value);
}

function loadMemoriesFromStorage() {
    const saved = localStorage.getItem("propalMemories");
    if (saved) coreMemories.value = saved;
}

function saveChatToStorage() {
    const messages = [...document.querySelectorAll(".message")].map(m => ({
        html: m.innerHTML,
        isUser: m.classList.contains("user-message")
    }));

    localStorage.setItem("propalChat", JSON.stringify(messages));
}

function loadChatFromStorage() {
    const saved = localStorage.getItem("propalChat");
    if (!saved) {
        addMessage(
            "Hello! I’m ProPal, your productivity assistant.<br><br>" +
            "On the left, you can add your current tasks.<br>" +
            "On the right, you can add anything important you want me to remember.<br>" +
            "In the bottom-right is a timer used for task scheduling.<br>" +
            "You can click the Productivity Guide anytime for information about techniques.<br><br>" +
            "How can I help you today?"
        )
        return;
    }

    JSON.parse(saved).forEach(msg => {
        addMessage(msg.html, msg.isUser);
    });
}

// Elements

const chatMessages = document.getElementsByClassName("messages")[0];
const messageInput = document.getElementById("message-input");
const sendButton = document.getElementById("send-button");
const productivityGuide = document.getElementById("productivity-guide");
const clearSession = document.getElementById("clear-session");

const newTaskInput = document.getElementById("new-task-input");
const addTaskButton = document.getElementById("add-task-button");
const taskList = document.getElementById("task-list");

const coreMemories = document.getElementById("core-memories");
coreMemories.addEventListener("input", saveMemoriesToStorage);

// Functions

function addMessage(text, isUser = false) {
    const div = document.createElement("div");
    div.classList.add("message", isUser ? "user-message" : "bot-message");
    div.innerHTML = text;

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    saveChatToStorage();
}

function showThinking() {
    const div = document.createElement("div");
    div.classList.add("thinking");
    div.innerHTML = `
        <div class="typing-indicator">
            <span></span><span></span><span></span>
        </div>
    `;

    chatMessages.appendChild(div);
    chatMessages.scrollTop = chatMessages.scrollHeight;

    return div;
}

async function fetchBotResponse(userMessage) {
    const thinking = showThinking();
    const currentTasks = localStorage.getItem("propalTasks");
    const coreMemories = localStorage.getItem("propalMemories");

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: "POST",
            headers: {"Content-Type": "application/json"},
            body: JSON.stringify({
                sessionId,
                action: "sendMessage",
                currentTasks: currentTasks,
                coreMemories: coreMemories,
                chatInput: userMessage,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP Error - Status: ${response.status}`);
        }

        const data = await response.json();
        const message = marked.parse(data.output);

        addMessage(message, false);
        // addMessage("Lorem ipsum dolor sit amet, consectetur adipiscing elit. In vehicula scelerisque interdum. Nam aliquet accumsan justo ac efficitur. Nulla placerat pretium purus eget interdum. Nunc et porttitor urna, eget iaculis ante.", false);
    } catch (error) {
        console.error("Error fetching response:", error);
        addMessage("Sorry, I had trouble connecting to the servers. Check the console for details.", false);
    } finally {
        thinking.remove();
    }
}

function sendMessage() {
    const text = messageInput.value.trim();
    if (!text) return;

    addMessage(text, true);
    messageInput.value = "";

    fetchBotResponse(text);
}

function sendGuideMessage() {
    const message = `
        <p>I am here to guide your productivity through the use of three main techniques:</p>
        <ul>
            <li>Pomodoro Technique: Structure your work into 25-minute periods, separated by 5-minute breaks.</li>
            <li>Eat The Frog: Identify your most important task, and prioritize completing it first.</li>
            <li>Feynman Technique: Explain any confusing ideas back to me, to identify gaps in understanding.</li>
        </ul>
    `;
    addMessage(message, false);
}

function addTask(text) {
    const li = document.createElement("li");
    li.className = "task-item";

    const input = document.createElement("input");
    input.addEventListener("input", saveTasksToStorage);
    input.type = "text";
    input.className = "task-input";
    input.value = text;

    const del = document.createElement("button");
    del.className = "delete-task";
    del.textContent = "✔";

    del.addEventListener("click", () => {
        li.remove();
        saveTasksToStorage();
    });

    li.appendChild(input);
    li.appendChild(del);

    taskList.appendChild(li);
}

function clearTasks() {
    taskList.innerHTML = "";
}

function clearSessionData() {
    clearTasks();
    coreMemories.value = "";
    chatMessages.innerHTML = "";

    localStorage.removeItem("propalTasks");
    localStorage.removeItem("propalMemories");
    localStorage.removeItem("propalChat");
    localStorage.removeItem("propalSessionId");

    setSessionId();
    location.reload();
}

// Event Listeners

sendButton.addEventListener("click", sendMessage);

messageInput.addEventListener("keydown", (e) => {
    if (e.key === "Enter") {
        e.preventDefault();
        sendMessage();
    }
});

addTaskButton.addEventListener("click", () => {
    const text = newTaskInput.value.trim();
    if (!text) return;

    addTask(text);
    newTaskInput.value = "";

    saveTasksToStorage();
});

productivityGuide.addEventListener("click", sendGuideMessage);

clearSession.addEventListener("click", clearSessionData);

addTaskButton.addEventListener("click", () => {
    const text = newTaskInput.value.trim();
    if (!text) return;

    addTask(text);
    newTaskInput.value = "";
});


document.addEventListener("DOMContentLoaded", () => {
    loadChatFromStorage();
    loadTasksFromStorage();
    loadMemoriesFromStorage();

    document.querySelectorAll(".collapse-sidebar").forEach(button => {
        button.addEventListener("click", function () {
            const side = this.getAttribute("data-side");
            const sidebar = document.querySelector(`.${side}-sidebar .sidebar-content`);

            sidebar.classList.toggle("collapsed");
            this.textContent = sidebar.classList.contains("collapsed") ? "▼" : "▲";
        });
    });
});

// Timer

let timer;
let isRunning = false;
let timeLeft = 25 * 60;
let currentMode = "pomodoro";

const timerDisplay = document.getElementById("timer-display");
const startPauseBtn = document.getElementById("start-pause");
const resetBtn = document.getElementById("reset-timer");
const presetButtons = document.querySelectorAll("#preset-buttons button");

const timerSound = new Audio("sounds/timer_complete.mp3");
timerSound.volume = 0.4; // subtle volume


function formatTime(seconds) {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

function updateDisplay() {
    timerDisplay.textContent = formatTime(timeLeft);
}

function toggleTimer() {
    if (timeLeft <= 0) {
        return;
    }
    if (isRunning) {
        clearInterval(timer);
        startPauseBtn.textContent = "▶";
    } else {
        timer = setInterval(() => {
            timeLeft--;
            updateDisplay();

            if (timeLeft <= 0) {
                clearInterval(timer);
                isRunning = false;
                startPauseBtn.textContent = "▶";

                timerSound.currentTime = 0;
                timerSound.play();

                if (currentMode === "pomodoro") {
                    addMessage("Time’s up! You just finished a full Pomodoro, nice work! Take a moment to breathe, stretch, and let your mind reset before the next session.");
                    currentMode = "break";
                    timeLeft = 5 * 60;
                } else {
                    addMessage("Time’s up! Your break come to an end. When you’re ready, let’s dive back in and keep the momentum going.")
                    currentMode = "pomodoro";
                    timeLeft = 25 * 60;
                }
            }
        }, 1000);
        startPauseBtn.textContent = "⏸";
    }
    isRunning = !isRunning;
}

function resetTimer() {
    clearInterval(timer);
    isRunning = false;
    startPauseBtn.textContent = "▶";

    switch (currentMode) {
        case "pomodoro":
            timeLeft = 25 * 60;
            break;
        case "break":
            timeLeft = 5 * 60;
            break;
    }
    updateDisplay();
}

function setTimer(minutes) {
    clearInterval(timer);
    isRunning = false;
    startPauseBtn.textContent = "▶";
    timeLeft = minutes * 60;

    if (minutes === 25) {
        currentMode = "pomodoro";
    } else if (minutes === 5) {
        currentMode = "break";
    }

    updateDisplay();
}

startPauseBtn.addEventListener("click", toggleTimer);
resetBtn.addEventListener("click", resetTimer);

presetButtons.forEach(button => {
    button.addEventListener("click", () => {
        const minutes = parseInt(button.getAttribute("data-min"));
        setTimer(minutes);
    });
});

timerDisplay.addEventListener("blur", function () {
    const timeString = this.textContent;
    const [mins, secs] = timeString.split(":").map(Number);

    if (!isNaN(mins) && !isNaN(secs) && mins >= 0 && secs >= 0 && secs < 60) {
        timeLeft = mins * 60 + secs;
        updateDisplay();
    } else {
        updateDisplay();
    }
});

updateDisplay();