// ==========================
// 状態を覚えとく変数
// ==========================
let currentWordList;    // 今使ってる1000語のリスト全体
let currentListTitle;   //選んだリストの表示名
let currentMode;        // "random" or "sequential"
let chunkStart;         // 順番モードのとき、開始位置(0, 100, 200...)
let chunkEnd;           // 範囲の終わり
let sequentialIndex;    // 順番モードで、今何問目か
let chunkSelectMode;    // 範囲選択後に random か sequential か覚える
let askedIndices;       //出題済みの単語のインデックスを覚える

// ==========================
// 画面切り替え
// ==========================
function showScreen(screenId) {
    document.querySelectorAll(".screen").forEach(s => s.style.display = "none");
    document.getElementById(screenId).style.display = "flex";

    //画面を切り替えるたびクイズの表示画面をリセット
    document.getElementById("quiz-container").style.display = "block";
    document.getElementById("quiz-complete").style.display = "none";
}

// ==========================
// 画面1：言語選択を自動生成
// ==========================
function renderLanguageMenu() {
    showScreen("screen-language");
    const container = document.getElementById("list-language");
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
    document.getElementById("list-title").textContent = "レベルを選択";
    document.getElementById("list-subtitle").textContent = "この単語リストは、言語学者Paul Nation氏が英語コーパス(BNC/COCA)をもとに作成した頻度別単語リストを、頻出度に応じて1000語ごとに区切ったものです。"

    const container = document.getElementById("list-lists");
    container.innerHTML = "";

    lang.lists.forEach(list => {
        const card = document.createElement("div");
        card.className = "quiz-card";
        card.innerHTML = `<span class="quiz-title">${list.title}</span>`;
        card.onclick = () => {
            currentWordList = list.wordList; // 選んだリストを覚えとく
            currentListTitle = list.title;
            document.getElementById("mode-title").textContent = list.title; //画面３の見出しをここで更新
            showScreen("screen-mode");
        };
        container.appendChild(card);
    });
}

// ==========================
// 画面3：ランダムモードを選んだとき
// ==========================
function chooseRandomMode() {
    currentMode = "random";
    askedIndices = [];
    showScreen("screen-quiz");
    showQuestion();
}

// ==========================
// 画面4：100問ブロック選択を自動生成
// ==========================
function renderChunkMenu() {
    const container = document.getElementById("list-chunks");
    container.innerHTML = "";

    const totalChunks = Math.ceil(currentWordList.length / 100); // 1000語なら10ブロック

    for (let i = 0; i < totalChunks; i++) {
        const start = i * 100;
        const end =  Math.min(start + 100, currentWordList.length);
        const card = document.createElement("div");
        card.className = "quiz-card";
        card.innerHTML = `<span class="quiz-title">${start + 1}〜${end}問目</span>`;
        card.onclick = () => {
            chunkStart = start;
            chunkEnd = end;
            askedIndices = [];

            if (chunkSelectMode === "sequential") {
                currentMode = "sequential";
                sequentialIndex = start;
            } else {
                currentMode = "randomChunk"; //範囲内ランダム
            }

            showScreen("screen-quiz");
            showQuestion();
        };
        container.appendChild(card);
    }
}

// 画面3→画面4に移動するとき、ブロック一覧を作ってから表示する
document.getElementById("screen-chunk") // 要素取得は残すが、実際の生成はshowScreen呼び出し前に必要
// ↑ 画面3の「順番に出題」ボタンのonclickを少し変更する(下記参照)

// ==========================
// 問題を選ぶ処理
// ==========================

// ランダムモード用(今までと同じ)
function pickRandomQuestion(){
    // 出題済み以外を集める
    const remainingIndices = [];
    for (let i = 0; i < currentWordList.length; i++) {
        if (!askedIndices.includes(i)) {
            remainingIndices.push(i);
        }
    }

    //候補がなくなれば終了
    if (remainingIndices.length === 0) {
        return null;
    }

    //残ったものの中からランダムに選ぶ
    const pickIndexInRemaining = Math.floor(Math.random() * remainingIndices.length);
    const correctIndex = remainingIndices[pickIndexInRemaining];
    const correctItem = currentWordList[correctIndex];
    askedIndices.push(correctIndex);    //出題済みとして記録

    const wrongChoices = [];
    while (wrongChoices.length < 2) {
        const randomIndex = Math.floor(Math.random() * currentWordList.length);
        if (randomIndex !== correctIndex && !wrongChoices.includes(randomIndex)) {
            wrongChoices.push(randomIndex);
        }
    }

    return buildQuestion(correctItem, wrongChoices);
}

//範囲(chunkStart-End)の中からランダムに1問選ぶ
function pickRandomChunkQuestion(){
    //範囲内でまだ出してない番号だけ集める
    const remainingIndices = [];
    for (let i = chunkStart; i < chunkEnd; i++) {
        if (!askedIndices.includes(i)) {
            remainingIndices.push(i);
        }
    }
    
    if (remainingIndices.length === 0) {
        return null; //範囲内を出し切った
    }

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

// 順番モード用(1問ずつ順番に進める)
function pickSequentialQuestion(){
    if (sequentialIndex >= chunkEnd) {
        return null;
    }

    const correctItem = currentWordList[sequentialIndex];
    const correctIndex = sequentialIndex;

    const wrongChoices = [];
    while (wrongChoices.length < 2) {
        const randomIndex = Math.floor(Math.random() * currentWordList.length);
        if (randomIndex !== correctIndex && !wrongChoices.includes(randomIndex)) {
            wrongChoices.push(randomIndex);
        }
    }

    sequentialIndex++; // 次に呼ばれたときは次の単語に進む

    return buildQuestion(correctItem, wrongChoices);
}

// 正解＋ダミー2つから、選択肢オブジェクトを組み立てる共通処理
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
// 出題・表示処理
// ==========================
let currentQuestion;

function speakWord(word) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-GB";
    utterance.rate = 1;
    speechSynthesis.speak(utterance);
}

function showQuestion(){
    // モードによって問題の選び方を切り替える
    if (currentMode === "random") {
        currentQuestion = pickRandomQuestion();
    } else if (currentMode === "randomChunk"){
        currentQuestion = pickRandomChunkQuestion();
    } else {
        currentQuestion = pickSequentialQuestion();
    }

    //出題する問題がなければ終了画面を表示
    if (currentQuestion === null) {
        finishQuiz();
        return;
    }

    document.getElementById("question-text").textContent = currentQuestion.word;
    speakWord(currentQuestion.word);

    const buttons = document.querySelectorAll(".choice-btn");
    buttons.forEach((btn, i) => {
        btn.querySelector(".choice-text").textContent = currentQuestion.choices[i];
        btn.classList.remove("correct", "incorrect");
    });

    const nextBtn = document.getElementById("next-btn");
    nextBtn.classList.remove("active");
    nextBtn.classList.add("disabled");
}

//終了画面を表示
function finishQuiz() {
    document.getElementById("quiz-container").style.display = "none";
    document.getElementById("quiz-complete").style.display = "block";

    const total = askedIndices.length;
    document.getElementById("complete-message").textContent =
        `${total}問完了！` ;
}

const buttons = document.querySelectorAll(".choice-btn");

buttons.forEach((btn, i) => {
    btn.addEventListener("click", () => {
        if (i === currentQuestion.answer){
            btn.classList.add("correct");
        } else {
            btn.classList.add("incorrect");
            buttons[currentQuestion.answer].classList.add("correct");
        }
        const nextBtn = document.getElementById("next-btn");
        nextBtn.classList.remove("disabled");
        nextBtn.classList.add("active");
    });
});

document.getElementById("next-btn").addEventListener("click", () => {
    showQuestion();
});

document.getElementById("speak-btn").addEventListener("click", () => {
    speakWord(currentQuestion.word);
});

// ==========================
// 初期表示
// ==========================
renderLanguageMenu();