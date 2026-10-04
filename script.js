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
let correctCount;       //正解数を覚える
let wrongAnswers;       //間違えた問題を記録する
let currentFormat = "quiz";  // "quiz" or "card"
let currentCard;             // 単語帳で今表示中のカード
let cardRevealed = false;    // 意味を表示済みか

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
            showScreen("screen-format");
        };
        container.appendChild(card);
    });
}

function startSession() {
    if (currentFormat === "card") {
        document.getElementById("card-info").textContent =
            document.getElementById("quiz-info").textContent;
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

    document.getElementById("quiz-info").textContent = currentListTitle;

    startSession();
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
            correctCount = 0;
            wrongAnswers = [];

            if (chunkSelectMode === "sequential") {
                currentMode = "sequential";
                sequentialIndex = start;
            } else {
                currentMode = "randomChunk"; //範囲内ランダム
            }

            document.getElementById("quiz-info").textContent =
                `${currentListTitle} ${start + 1}~${end}問目`

            startSession();
        };
        container.appendChild(card);
    }
}

// 画面3→画面4に移動するとき、ブロック一覧を作ってから表示する
// document.getElementById("screen-chunk") // 要素取得は残すが、実際の生成はshowScreen呼び出し前に必要
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
    askedIndices.push(correctIndex);

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
        `正答率 ${correctCount}/${total}問` ;

    //間違えた問題一覧
    const wrongListContainer = document.getElementById("wrong-answers-list");
    wrongListContainer.innerHTML = "";

    if (wrongAnswers.length === 0) {
        wrongListContainer.innerHTML = `<p style="color: #333;">全問正解です！</p>`;
    } else {
        const heading = document.createElement("h3");
        heading.textContent = "間違えた単語";
        heading.className = "wrong-answers-heading"
        wrongListContainer.appendChild(heading);
        wrongAnswers.forEach(item => {
            const row = document.createElement("div");
            row.className = "wrong-answer-item";
            row.innerHTML = `
                <span class="wrong-word">${item.word}</span>
                <span class="wrong-meaning">${item.meaning}</span>
            `;
            wrongListContainer.appendChild(row);
        })
    }
}

const buttons = document.querySelectorAll(".choice-btn");

buttons.forEach((btn, i) => {
    btn.addEventListener("click", () => {
        //すでに答え終わっていたらそれ以上何もしない
        if (document.getElementById("next-btn").classList.contains("active")) {
            return;
        }
        
        if (i === currentQuestion.answer){
            btn.classList.add("correct");
            correctCount++;
        } else {
            btn.classList.add("incorrect");
            buttons[currentQuestion.answer].classList.add("correct");
            //間違えた単語と正解の意味を記録
            wrongAnswers.push({
                word: currentQuestion.word,
                meaning: currentQuestion.choices[currentQuestion.answer]
            });
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

function retryQuiz() {
    askedIndices = [];
    correctCount = 0;
    wrongAnswers = [];

    if (currentMode === "sequential") {
        sequentialIndex = chunkStart; //順番モードのときは、範囲の先頭に戻す
    }
    
    if (currentMode === "random") {
        document.getElementById("quiz-info").textContent = currentListTitle;
    } else {
        document.getElementById("quiz-info").textContent = 
            `${currentListTitle} ${chunkStart + 1}~${chunkEnd}問目`
    }
    startSession();
}

// ==========================
// 単語帳モード
// ==========================
function showCard() {
    document.getElementById("card-area").style.display = "block";
    document.getElementById("card-complete").style.display = "none";

    // 既存の出題ロジックを流用(正解の意味は choices[answer] で取れる)
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

    document.getElementById("card-word").textContent = currentCard.word;
    const meaningEl = document.getElementById("card-meaning");
    meaningEl.textContent = currentCard.meaning;
    meaningEl.style.visibility = "hidden";

    const total = currentMode === "random"
        ? currentWordList.length
        : chunkEnd - chunkStart;
    document.getElementById("card-progress").textContent =
        `${askedIndices.length} / ${total}`;

    speakWord(currentCard.word);
}

function finishCards() {
    document.getElementById("card-area").style.display = "none";
    document.getElementById("card-complete").style.display = "block";
}

// スワイプ後の処理：1回目は意味を表示、2回目は次の単語へ
function onCardSwiped(dir) {
    const card = document.getElementById("flashcard");
    // 画面外へ飛ばす
    card.style.transition = "transform 0.2s ease, opacity 0.2s ease";
    card.style.transform = `translateX(${dir * 400}px) rotate(${dir * 20}deg)`;
    card.style.opacity = "0";

    setTimeout(() => {
        // 一瞬で元の位置に戻す(アニメーションなし)
        card.style.transition = "none";
        card.style.transform = "";
        card.style.opacity = "1";

        if (!cardRevealed) {
            cardRevealed = true;
            document.getElementById("card-meaning").style.visibility = "visible";
        } else {
            showCard();
        }
    }, 200);
}

// ---- スワイプ検出(マウス・タッチ共通) ----
(function setupSwipe() {
    const card = document.getElementById("flashcard");
    let startX = null;
    let dragX = 0;

    card.addEventListener("pointerdown", e => {
        if (e.target.closest("button")) return;  // 🔊ボタンは除外
        startX = e.clientX;
        dragX = 0;
        card.setPointerCapture(e.pointerId);
        card.style.transition = "none";
    });

    card.addEventListener("pointermove", e => {
        if (startX === null) return;
        dragX = e.clientX - startX;
        card.style.transform = `translateX(${dragX}px) rotate(${dragX / 20}deg)`;
    });

    function endDrag() {
        if (startX === null) return;
        startX = null;
        if (Math.abs(dragX) > 60) {
            onCardSwiped(dragX > 0 ? 1 : -1);
        } else {
            // スワイプが足りなければ元に戻す
            card.style.transition = "transform 0.2s ease";
            card.style.transform = "";
        }
    }
    card.addEventListener("pointerup", endDrag);
    card.addEventListener("pointercancel", endDrag);
})();

// PC用：矢印キーでも操作できるように
document.addEventListener("keydown", e => {
    if (document.getElementById("screen-card").style.display === "none") return;
    if (document.getElementById("card-area").style.display === "none") return;
    if (e.key === "ArrowRight") onCardSwiped(1);
    if (e.key === "ArrowLeft") onCardSwiped(-1);
});

document.getElementById("card-speak").addEventListener("click", () => {
    if (currentCard) speakWord(currentCard.word);
});


// ==========================
// 初期表示
// ==========================
renderLanguageMenu();