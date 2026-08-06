// ==========================
// 画面切り替えの仕組み
// ==========================

function showScreen(screenId) {
    // すべての画面をいったん隠す
    document.querySelectorAll(".screen").forEach(screen => {
        screen.style.display = "none";
    });
    // 指定された画面だけ表示する
    document.getElementById(screenId).style.display = "flex";
}

// 「中級単語」を押したら、クイズ画面を表示して問題をスタート
function startQuiz() {
    showScreen("screen-quiz");
    showQuestion();
}

// ==========================
// クイズの処理（今までと同じ）
// ==========================

let currentQuestion;

function speakWord(word) {
    const utterance = new SpeechSynthesisUtterance(word);
    utterance.lang = "en-GB";
    utterance.rate = 1;
    speechSynthesis.speak(utterance);
}

function pickRandomQuestion(){
    const correctIndex = Math.floor(Math.random() * wordList.length);
    const correctItem = wordList[correctIndex];

    const wrongChoices = [];
    while (wrongChoices.length < 2) {
        const randomIndex = Math.floor(Math.random() * wordList.length);
        if (randomIndex !== correctIndex && !wrongChoices.includes(randomIndex)) {
            wrongChoices.push(randomIndex);
        }
    }

    let choices = [
        correctItem.meaning,
        wordList[wrongChoices[0]].meaning,
        wordList[wrongChoices[1]].meaning
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

function showQuestion(){
    currentQuestion = pickRandomQuestion();

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