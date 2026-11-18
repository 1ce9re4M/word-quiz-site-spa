// ==========================
// 状態を覚えとく変数
// ==========================
let currentWordList;    // 今使ってる1000語のリスト全体
let currentListTitle;   // 選んだリストの表示名
let currentMode;        // "random" or "sequential"
let chunkStart;         // 順番モードのとき、開始位置(0, 100, 200...)
let chunkEnd;           // 範囲の終わり
let sequentialIndex;    // 順番モードで、今何問目か
let chunkSelectMode;    // 範囲選択後に random か sequential か覚える
let askedIndices;       // 出題済みの単語のインデックスを覚える
let correctCount;       // 正解数を覚える
let wrongAnswers;       // 間違えた問題を記録する
let currentFormat = "quiz";  // "quiz" or "card"
let currentCard;             // 単語帳で今表示中のカード
let cardRevealed = false;    // 意味を表示済みか

// 音声設定オブジェクト
let appSettings = {
    muted: false,
    volume: 1.0,
    rate: 1.0
};

// ==========================
// 設定モーダルの制御
// ==========================
function openSettingsModal() {
    const modal = document.getElementById("settings-modal");
    if (modal) modal.style.display = "flex";
}

function closeSettingsModal() {
    const modal = document.getElementById("settings-modal");
    if (modal) modal.style.display = "none";
}

function updateSettings() {
    const muteElem = document.getElementById("setting-mute");
    const volElem = document.getElementById("setting-volume");
    const rateElem = document.getElementById("setting-rate");

    if (muteElem) appSettings.muted = muteElem.checked;
    if (volElem) appSettings.volume = parseFloat(volElem.value);
    if (rateElem) appSettings.rate = parseFloat(rateElem.value);

    const volVal = document.getElementById("volume-val");
    const rateVal = document.getElementById("rate-val");
    if (volVal) volVal.textContent = appSettings.volume.toFixed(1);
    if (rateVal) rateVal.textContent = appSettings.rate.toFixed(1);
}

// ==========================
// 画面切り替え
// ==========================
function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(s => s.style.display = "none");
    const target = document.getElementById(screenId);
    if (target) target.style.display = "flex";

    const quizContainer = document.getElementById("quiz-container");
    const quizComplete = document.getElementById("quiz-complete");
    if (quizContainer) quizContainer.style.display = "block";
    if (quizComplete) quizComplete.style.display = "none";
}

// ==========================
// 画面1：言語選択を自動生成
// ==========================
function renderLanguageMenu() {
    showScreen("screen-language");
    const container = document.getElementById("list-language");
    if (!container) return;
    container.innerHTML = "";

    for (const langKey in siteContent) {
        const lang = siteContent[langKey];
        const card = document.createElement("div");
        card.className = "quiz-card";
        if (lang.lists.length === 0) {
            card.classList.add("disabled");
            card.innerHTML = `<span class="quiz-title">${lang.title}</span><span class="quiz-desc">準備中</span>`;
        } else {
            card.innerHTML = `<span class="quiz-title">${lang.title}</span>`;
            card.onclick = () => renderListMenu(langKey);
        }
        container.appendChild(card);
    }
}

// ==========================
// 画面2：リスト選択を自動生成
// ==========================
function renderListMenu(langKey) {
    showScreen("screen-list");
    const lang = siteContent[langKey];
    
    const titleElem = document.getElementById("list-title");
    const subtitleElem = document.getElementById("list-subtitle");
    if (titleElem) titleElem.textContent = "レベルを選択";
    if (subtitleElem) {
        subtitleElem.textContent = "この単語リストは、言語学者Paul Nation氏が英語コーパス(BNC/COCA)をもとに作成した頻度別単語リストを、頻出度に応じて1000語ごとに区切ったものです。";
    }

    const container = document.getElementById("list-lists");
    if (!container) return;
    container.innerHTML = "";

    lang.lists.forEach(list => {
        const card = document.createElement("div");
        card.className = "quiz-card";
        card.innerHTML = `<span class="quiz-title">${list.title}</span>`;
        card.onclick = () => {
            currentWordList = list.wordList;
            currentListTitle = list.title;
            const modeTitle = document.getElementById("mode-title");
            if (modeTitle) modeTitle.textContent = list.title;
            showScreen("screen-format");
        };
        container.appendChild(card);
    });
}

function startSession() {
    if (currentFormat === "card") {
        const cardInfo = document.getElementById("card-info");
        const quizInfo = document.getElementById("quiz-info");
        if (cardInfo && quizInfo) cardInfo.textContent = quizInfo.textContent;
        showScreen("screen-card");
        showCard();
    } else {
        showScreen("screen-quiz");
        showQuestion();
    }
}

// ==========================
// 画面3：ランダムモードを選んだとき
// ==========================
function chooseRandomMode() {
    currentMode = "random";
    askedIndices = [];
    correctCount = 0;
    wrongAnswers = [];

    const quizInfo = document.getElementById("quiz-info");
    if (quizInfo) quizInfo.textContent = currentListTitle;

    startSession();
}

// ==========================
// 画面4：100問ブロック選択を自動生成
// ==========================
function renderChunkMenu() {
    const container = document.getElementById("list-chunks");
    if (!container) return;
    container.innerHTML = "";

    const totalChunks = Math.ceil(currentWordList.length / 100);

    for (let i = 0; i < totalChunks; i++) {
        const start = i * 100;
        const end = Math.min(start + 100, currentWordList.length);
        const card = document.createElement("div");
        card.className = "quiz-card";
        card.innerHTML = `<span class="quiz-title">${start + 1}〜${end}問目</span>`;
        card.onclick = () => {
            chunkStart = start;
            chunkEnd = end;
            askedIndices = [];
            correctCount = 0;
            wrongAnswers = [];

            if (chunkSelectMode === "sequential") {
                currentMode = "sequential";
                sequentialIndex = start;
            } else {
                currentMode = "randomChunk";
            }

            const quizInfo = document.getElementById("quiz-info");
            if (quizInfo) {
                quizInfo.textContent = `${currentListTitle} ${start + 1}~${end}問目`;
            }

            startSession();
        };
        container.appendChild(card);
    }
}

// ==========================
// 問題を選ぶ処理
// ==========================
function pickRandomQuestion(){
    const remainingIndices = [];
    for (let i = 0; i < currentWordList.length; i++) {
        if (!askedIndices.includes(i)) {
            remainingIndices.push(i);
        }
    }

    if (remainingIndices.length === 0) return null;

    const pickIndexInRemaining = Math.floor(Math.random() * remainingIndices.length);
    const correctIndex = remainingIndices[pickIndexInRemaining];
    const correctItem = currentWordList[correctIndex];
    askedIndices.push(correctIndex);

    const wrongChoices = [];
    while (wrongChoices.length < 2) {
        const randomIndex = Math.floor(Math.random() * currentWordList.length);
        if (randomIndex !== correctIndex && !wrongChoices.includes(randomIndex)) {
            wrongChoices.push(randomIndex);
        }
    }

    return buildQuestion(correctItem, wrongChoices);
}

function pickRandomChunkQuestion(){
    const remainingIndices = [];
    for (let i = chunkStart; i < chunkEnd; i++) {
        if (!askedIndices.includes(i)) {
            remainingIndices.push(i);
        }
    }
    
    if (remainingIndices.length === 0) return null;

    const pickIndexInRemaining = Math.floor(Math.random() * remainingIndices.length);
    const correctIndex = remainingIndices[pickIndexInRemaining];
    const correctItem = currentWordList[correctIndex];
    askedIndices.push(correctIndex);

    const rangeSize = chunkEnd - chunkStart;
    const wrongChoices = [];
    while (wrongChoices.length < 2) {
        const randomOffset = Math.floor(Math.random() * rangeSize);
        const randomIndex = chunkStart + randomOffset;
        if (randomIndex !== correctIndex && !wrongChoices.includes(randomIndex)){
            wrongChoices.push(randomIndex);
        }
    }
    return buildQuestion(correctItem, wrongChoices);
}

function pickSequentialQuestion(){
    if (sequentialIndex >= chunkEnd) return null;

    const correctItem = currentWordList[sequentialIndex];
    const correctIndex = sequentialIndex;
    askedIndices.push(correctIndex);

    const wrongChoices = [];
    while (wrongChoices.length < 2) {
        const randomIndex = Math.floor(Math.random() * currentWordList.length);
        if (randomIndex !== correctIndex && !wrongChoices.includes(randomIndex)) {
            wrongChoices.push(randomIndex);
        }
    }

    sequentialIndex++;
    return buildQuestion(correctItem, wrongChoices);
}

function buildQuestion(correctItem, wrongChoices) {
    let choices = [
        correctItem.meaning,
        currentWordList[wrongChoices[0]].meaning,
        currentWordList[wrongChoices[1]].meaning
    ];
    choices = shuffle(choices);
    const answerIndex = choices.indexOf(correctItem.meaning);

    return {
        word: correctItem.word,
        choices: choices,
        answer: answerIndex
    };
}

function shuffle(array) {
    const newArray = [...array];
    for (let i = newArray.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [newArray[i], newArray[j]] = [newArray[j], newArray[i]];
    }
    return newArray;
}

// ==========================
// 音声読み上げ
// ==========================
function speakWord(word) {
    if (appSettings.muted) return;
    if (!('speechSynthesis' in window)) return;

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-GB";
    utterance.rate = appSettings.rate;
    utterance.volume = appSettings.volume;
    speechSynthesis.speak(utterance);
}

// ==========================
// クイズの出題・表示処理
// ==========================
let currentQuestion;

function showQuestion(){
    if (currentMode === "random") {
        currentQuestion = pickRandomQuestion();
    } else if (currentMode === "randomChunk"){
        currentQuestion = pickRandomChunkQuestion();
    } else {
        currentQuestion = pickSequentialQuestion();
    }

    if (currentQuestion === null) {
        finishQuiz();
        return;
    }

    const questionText = document.getElementById("question-text");
    if (questionText) questionText.textContent = currentQuestion.word;
    speakWord(currentQuestion.word);

    const buttons = document.querySelectorAll(".choice-btn");
    buttons.forEach((btn, i) => {
        const textSpan = btn.querySelector(".choice-text");
        if (textSpan) textSpan.textContent = currentQuestion.choices[i];
        btn.classList.remove("correct", "incorrect");
    });

    const nextBtn = document.getElementById("next-btn");
    if (nextBtn) {
        nextBtn.classList.remove("active");
        nextBtn.classList.add("disabled");
    }
}

function finishQuiz() {
    const quizContainer = document.getElementById("quiz-container");
    const quizComplete = document.getElementById("quiz-complete");
    if (quizContainer) quizContainer.style.display = "none";
    if (quizComplete) quizComplete.style.display = "block";

    const total = askedIndices.length;
    const completeMsg = document.getElementById("complete-message");
    if (completeMsg) completeMsg.textContent = `正答率 ${correctCount}/${total}問`;

    const wrongListContainer = document.getElementById("wrong-answers-list");
    if (!wrongListContainer) return;
    wrongListContainer.innerHTML = "";

    if (wrongAnswers.length === 0) {
        wrongListContainer.innerHTML = `<p style="color: #333; padding: 20px; text-align: center;">全問正解です！お見事！</p>`;
    } else {
        const heading = document.createElement("div");
        heading.textContent = "間違えた単語一覧";
        heading.className = "wrong-answers-heading";
        wrongListContainer.appendChild(heading);

        wrongAnswers.forEach(item => {
            const row = document.createElement("div");
            row.className = "wrong-answer-item";
            row.innerHTML = `
                <span class="wrong-word">${item.word}</span>
                <span class="wrong-meaning">${item.meaning}</span>
            `;
            wrongListContainer.appendChild(row);
        });
    }
}

const buttons = document.querySelectorAll(".choice-btn");
buttons.forEach((btn, i) => {
    btn.addEventListener("click", () => {
        const nextBtn = document.getElementById("next-btn");
        if (nextBtn && nextBtn.classList.contains("active")) {
            return;
        }
        
        if (currentQuestion && i === currentQuestion.answer){
            btn.classList.add("correct");
            correctCount++;
        } else if (currentQuestion) {
            btn.classList.add("incorrect");
            buttons[currentQuestion.answer].classList.add("correct");
            wrongAnswers.push({
                word: currentQuestion.word,
                meaning: currentQuestion.choices[currentQuestion.answer]
            });
        }
        if (nextBtn) {
            nextBtn.classList.remove("disabled");
            nextBtn.classList.add("active");
        }
    });
});

const nextBtnElem = document.getElementById("next-btn");
if (nextBtnElem) {
    nextBtnElem.addEventListener("click", () => {
        showQuestion();
    });
}

const speakBtnElem = document.getElementById("speak-btn");
if (speakBtnElem) {
    speakBtnElem.addEventListener("click", () => {
        if (currentQuestion) speakWord(currentQuestion.word);
    });
}

function retryQuiz() {
    askedIndices = [];
    correctCount = 0;
    wrongAnswers = [];

    if (currentMode === "sequential") {
        sequentialIndex = chunkStart;
    }
    
    const quizInfo = document.getElementById("quiz-info");
    if (quizInfo) {
        if (currentMode === "random") {
            quizInfo.textContent = currentListTitle;
        } else {
            quizInfo.textContent = `${currentListTitle} ${chunkStart + 1}~${chunkEnd}問目`;
        }
    }
    startSession();
}

// ==========================
// 単語帳モード（タップ形式）
// ==========================
function showCard() {
    const cardArea = document.getElementById("card-area");
    const cardComplete = document.getElementById("card-complete");
    if (cardArea) cardArea.style.display = "block";
    if (cardComplete) cardComplete.style.display = "none";

    let q;
    if (currentMode === "random") q = pickRandomQuestion();
    else if (currentMode === "randomChunk") q = pickRandomChunkQuestion();
    else q = pickSequentialQuestion();

    if (q === null) {
        finishCards();
        return;
    }

    currentCard = { word: q.word, meaning: q.choices[q.answer] };
    cardRevealed = false;

    const cardWord = document.getElementById("card-word");
    const meaningEl = document.getElementById("card-meaning");
    const hintEl = document.getElementById("card-hint");
    const progressEl = document.getElementById("card-progress");

    if (cardWord) cardWord.textContent = currentCard.word;
    if (meaningEl) {
        meaningEl.textContent = currentCard.meaning;
        meaningEl.style.visibility = "hidden"; // 最初は意味を隠す
    }
    if (hintEl) hintEl.textContent = "👆 タップして意味を表示";

    const total = currentMode === "random"
        ? currentWordList.length
        : chunkEnd - chunkStart;
    if (progressEl) {
        progressEl.textContent = `${askedIndices.length} / ${total}`;
    }

    speakWord(currentCard.word);
}

// カードがタップされたときの処理
function onCardClicked() {
    const meaningEl = document.getElementById("card-meaning");
    const hintEl = document.getElementById("card-hint");

    if (!cardRevealed) {
        cardRevealed = true;
        if (meaningEl) meaningEl.style.visibility = "visible";
        if (hintEl) hintEl.textContent = "👆 もう一度タップして次の単語へ";
    } else {
        showCard();
    }
}

function finishCards() {
    const cardArea = document.getElementById("card-area");
    const cardComplete = document.getElementById("card-complete");
    if (cardArea) cardArea.style.display = "none";
    if (cardComplete) cardComplete.style.display = "block";
}

// クイズ・単語帳プレイ中の「戻る」ボタン
function handleQuizBack() {
    if (currentMode === "random") {
        showScreen('screen-mode');
    } else {
        showScreen('screen-chunk');
    }
}

// ==========================
// 初期表示
// ==========================
renderLanguageMenu();