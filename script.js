const toast = document.getElementById('toast');
let toastTimer;

function showToast(message) {
  toast.textContent = message;
  toast.classList.add('visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('visible'), 2400);
}

const menuButton = document.querySelector('.menu-toggle');
const mainNav = document.getElementById('main-nav');

menuButton.addEventListener('click', () => {
  const isOpen = mainNav.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(isOpen));
  menuButton.setAttribute('aria-label', isOpen ? 'Закрыть меню' : 'Открыть меню');
});

mainNav.querySelectorAll('a').forEach(link => {
  link.addEventListener('click', () => {
    mainNav.classList.remove('open');
    menuButton.setAttribute('aria-expanded', 'false');
    menuButton.setAttribute('aria-label', 'Открыть меню');
  });
});

const lessonCards = [...document.querySelectorAll('.lesson-card')];
const progressFill = document.getElementById('progress-fill');
const progressBar = document.querySelector('.progress-track');
let completedLessons = [];

try {
  const savedProgress = JSON.parse(localStorage.getItem('arduinoCourseProgress') || '[]');
  if (Array.isArray(savedProgress)) {
    completedLessons = savedProgress.filter(number => Number.isInteger(number) && number >= 1 && number <= 8);
  }
} catch (error) {
  completedLessons = [];
}

function updateProgress() {
  const count = completedLessons.length;
  const percent = Math.round(count / lessonCards.length * 100);
  document.getElementById('progress-percent').textContent = `${percent}%`;
  document.getElementById('progress-caption').textContent = `${count} из ${lessonCards.length} уроков завершено`;
  progressFill.style.width = `${percent}%`;
  progressBar.setAttribute('aria-valuenow', String(percent));

  lessonCards.forEach(card => {
    const number = Number(card.dataset.lesson);
    const completed = completedLessons.includes(number);
    card.classList.toggle('completed', completed);
    const button = card.querySelector('.complete-button');
    button.setAttribute('aria-pressed', String(completed));
    button.querySelector('span:last-child').textContent = completed ? 'Урок пройден' : 'Отметить пройденным';
    document.querySelector(`.lesson-nav a[href="#lesson-${number}"]`).classList.toggle('completed', completed);
  });

  try {
    localStorage.setItem('arduinoCourseProgress', JSON.stringify(completedLessons));
  } catch (error) {
    // Progress remains available for the current page when storage is blocked.
  }
}

document.querySelectorAll('[data-complete]').forEach(button => {
  button.addEventListener('click', () => {
    const number = Number(button.dataset.complete);
    if (completedLessons.includes(number)) {
      completedLessons = completedLessons.filter(item => item !== number);
      showToast('Отметка о прохождении снята');
    } else {
      completedLessons.push(number);
      completedLessons.sort((a, b) => a - b);
      showToast(number === 8 ? 'Поздравляем, курс пройден!' : `Урок ${number} отмечен как пройденный`);
    }
    updateProgress();
  });
});

updateProgress();

if ('IntersectionObserver' in window) {
  const lessonObserver = new IntersectionObserver(entries => {
    const visible = entries.filter(entry => entry.isIntersecting).sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0];
    if (!visible) return;
    document.querySelectorAll('.lesson-nav a').forEach(link => {
      link.classList.toggle('active', link.getAttribute('href') === `#${visible.target.id}`);
    });
  }, { rootMargin: '-15% 0px -55% 0px', threshold: [0, .1, .3] });
  lessonCards.forEach(card => lessonObserver.observe(card));
}

document.querySelectorAll('.copy-button').forEach(button => {
  button.addEventListener('click', async () => {
    const code = document.getElementById(button.dataset.copy).innerText;
    try {
      await navigator.clipboard.writeText(code);
      button.textContent = 'Скопировано ✓';
      showToast('Код скопирован в буфер обмена');
    } catch (error) {
      const textArea = document.createElement('textarea');
      textArea.value = code;
      textArea.style.position = 'fixed';
      textArea.style.opacity = '0';
      document.body.appendChild(textArea);
      textArea.select();
      const copied = document.execCommand('copy');
      textArea.remove();
      button.textContent = copied ? 'Скопировано ✓' : 'Выделите код вручную';
      if (copied) showToast('Код скопирован в буфер обмена');
    }
    setTimeout(() => { button.textContent = 'Копировать код'; }, 2200);
  });
});

const simRun = document.getElementById('sim-run');
const simReset = document.getElementById('sim-reset');
const simLed = document.getElementById('sim-led');
const simLedGlow = document.querySelector('.sim-led-glow');
const simLedLabel = document.getElementById('sim-led-label');
const simStateLabel = document.getElementById('sim-state-label');
const simConsole = document.getElementById('sim-console');
const intervalRange = document.getElementById('interval-range');
const brightnessRange = document.getElementById('brightness-range');
let simulatorRunning = false;
let simulatorLedOn = false;
let simulatorTimer = null;
let simulatorCycles = 0;

function simulatorLog(message) {
  if (simConsole.dataset.empty === 'true') {
    simConsole.textContent = '';
    simConsole.dataset.empty = 'false';
  }
  const time = (simulatorCycles * Number(intervalRange.value) / 1000).toFixed(1);
  simConsole.textContent += `[${time.padStart(5, ' ')} с] ${message}\n`;
  simConsole.scrollTop = simConsole.scrollHeight;
}

function renderSimulatorLed() {
  const brightness = Number(brightnessRange.value) / 100;
  simLed.setAttribute('fill', simulatorLedOn ? '#ffd451' : '#776e56');
  simLed.style.opacity = simulatorLedOn ? String(.35 + brightness * .65) : '1';
  simLedGlow.setAttribute('opacity', simulatorLedOn ? String(brightness * .65) : '0');
  simLedLabel.textContent = simulatorLedOn ? 'LED: ВКЛ' : 'LED: ВЫКЛ';
  simLedLabel.classList.toggle('on', simulatorLedOn);
}

function simulatorStep() {
  if (!simulatorRunning) return;
  simulatorLedOn = !simulatorLedOn;
  simulatorCycles += 1;
  renderSimulatorLed();
  simulatorLog(simulatorLedOn ? 'D13 → HIGH · светодиод включён' : 'D13 → LOW · светодиод выключен');
  simulatorTimer = setTimeout(simulatorStep, Number(intervalRange.value));
}

function updateSimulatorButton() {
  simRun.classList.toggle('running', simulatorRunning);
  simRun.setAttribute('aria-pressed', String(simulatorRunning));
  simRun.innerHTML = simulatorRunning ? '<span aria-hidden="true">■</span> Остановить симулятор' : '<span aria-hidden="true">▶</span> Запустить симулятор';
  simStateLabel.textContent = simulatorRunning ? 'Программа выполняется' : 'Симулятор остановлен';
}

simRun.addEventListener('click', () => {
  simulatorRunning = !simulatorRunning;
  clearTimeout(simulatorTimer);
  if (simulatorRunning) {
    simConsole.dataset.empty = 'true';
    simulatorLog('Программа запущена');
    simulatorStep();
  }
  updateSimulatorButton();
});

simReset.addEventListener('click', () => {
  simulatorRunning = false;
  simulatorLedOn = false;
  simulatorCycles = 0;
  clearTimeout(simulatorTimer);
  intervalRange.value = '1000';
  brightnessRange.value = '100';
  intervalRange.dispatchEvent(new Event('input'));
  brightnessRange.dispatchEvent(new Event('input'));
  simConsole.textContent = 'Нажмите «Запустить», чтобы начать…';
  simConsole.dataset.empty = 'true';
  updateSimulatorButton();
  renderSimulatorLed();
  showToast('Симулятор сброшен');
});

intervalRange.addEventListener('input', () => {
  const value = Number(intervalRange.value);
  document.getElementById('interval-output').textContent = `${value} мс`;
  document.getElementById('code-delay-on').textContent = String(value);
  document.getElementById('code-delay-off').textContent = String(value);
  if (simulatorRunning) {
    clearTimeout(simulatorTimer);
    simulatorTimer = setTimeout(simulatorStep, value);
  }
});

brightnessRange.addEventListener('input', () => {
  document.getElementById('brightness-output').textContent = `${brightnessRange.value}%`;
  renderSimulatorLed();
});

document.getElementById('clear-console').addEventListener('click', () => {
  simConsole.textContent = simulatorRunning ? 'Монитор очищен. Ожидание событий…\n' : 'Нажмите «Запустить», чтобы начать…';
  simConsole.dataset.empty = 'false';
});

simConsole.dataset.empty = 'true';
renderSimulatorLed();

const quizQuestions = [
  {
    question: 'Какая функция выполняется один раз после включения Arduino?',
    options: ['loop()', 'setup()', 'digitalWrite()', 'delay()'],
    correct: 1,
    explanation: 'setup() выполняется один раз при включении или сбросе платы. Затем Arduino бесконечно повторяет loop().'
  },
  {
    question: 'Зачем резистор подключают последовательно со светодиодом?',
    options: ['Для увеличения напряжения', 'Для хранения заряда', 'Для ограничения тока', 'Для связи с компьютером'],
    correct: 2,
    explanation: 'Резистор ограничивает ток через светодиод и защищает как сам светодиод, так и вывод микроконтроллера.'
  },
  {
    question: 'Какое значение вернёт digitalRead() для нажатой кнопки с INPUT_PULLUP, соединённой с GND?',
    options: ['HIGH', 'LOW', '1023', 'Случайное число'],
    correct: 1,
    explanation: 'При нажатии вход соединяется с GND, поэтому читается LOW. В отпущенном состоянии внутренняя подтяжка держит HIGH.'
  },
  {
    question: 'Какой диапазон значений возвращает analogRead() на Arduino Uno?',
    options: ['0–100', '0–255', '0–512', '0–1023'],
    correct: 3,
    explanation: 'Аналого-цифровой преобразователь Uno имеет разрешение 10 бит: 2¹⁰ = 1024 возможных значения, от 0 до 1023.'
  },
  {
    question: 'Что нужно сделать, если Монитор порта показывает непонятные символы?',
    options: ['Заменить светодиод', 'Сравнить скорость порта в IDE и скетче', 'Увеличить delay()', 'Отключить GND'],
    correct: 1,
    explanation: 'Скорость в Мониторе порта должна совпадать со значением Serial.begin(). Например, 9600 бод в обоих местах.'
  }
];

let currentQuestion = 0;
let quizScore = 0;
let quizAnswers = [];
const quizOptions = document.getElementById('quiz-options');
const quizNext = document.getElementById('quiz-next');
const quizFeedback = document.getElementById('quiz-feedback');

function renderQuizDots() {
  document.getElementById('quiz-dots').innerHTML = quizQuestions.map((_, index) => {
    let className = '';
    if (quizAnswers[index] !== undefined) className = quizAnswers[index] ? 'correct' : 'wrong';
    if (index === currentQuestion && quizAnswers[index] === undefined) className = 'current';
    return `<span class="${className}"></span>`;
  }).join('');
}

function renderQuestion() {
  const item = quizQuestions[currentQuestion];
  document.getElementById('quiz-counter').textContent = `Вопрос ${currentQuestion + 1} из ${quizQuestions.length}`;
  document.getElementById('quiz-question').textContent = item.question;
  quizOptions.innerHTML = '';
  item.options.forEach((option, index) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'quiz-option';
    button.innerHTML = `<span class="option-letter">${String.fromCharCode(65 + index)}</span><span>${option}</span>`;
    button.addEventListener('click', () => answerQuestion(index));
    quizOptions.appendChild(button);
  });
  quizFeedback.hidden = true;
  quizFeedback.innerHTML = '';
  quizNext.hidden = true;
  renderQuizDots();
}

function answerQuestion(selectedIndex) {
  const item = quizQuestions[currentQuestion];
  const isCorrect = selectedIndex === item.correct;
  quizAnswers[currentQuestion] = isCorrect;
  if (isCorrect) quizScore += 1;

  [...quizOptions.children].forEach((button, index) => {
    button.disabled = true;
    if (index === item.correct) button.classList.add('correct');
    if (index === selectedIndex && !isCorrect) button.classList.add('wrong');
  });

  quizFeedback.innerHTML = `<strong>${isCorrect ? 'Верно!' : 'Почти! Правильный ответ выделен зелёным.'}</strong>${item.explanation}`;
  quizFeedback.hidden = false;
  quizNext.hidden = false;
  quizNext.innerHTML = currentQuestion === quizQuestions.length - 1 ? 'Показать результат <span>→</span>' : 'Следующий вопрос <span>→</span>';
  quizNext.focus();
  renderQuizDots();
}

function showQuizResult() {
  document.getElementById('quiz-content').hidden = true;
  document.getElementById('quiz-result').hidden = false;
  document.getElementById('quiz-score').textContent = `${quizScore}/${quizQuestions.length}`;
  document.getElementById('quiz-counter').textContent = 'Проверка завершена';
  const title = quizScore === 5 ? 'Отлично! Основы усвоены' : quizScore >= 3 ? 'Хороший результат!' : 'Хорошее начало!';
  const text = quizScore === 5
    ? 'Вы уверенно разбираетесь в базовых понятиях. Теперь закрепите знания на практике и соберите собственный проект.'
    : 'Загляните ещё раз в уроки по темам, где были ошибки, и попробуйте пройти тест снова. Практика поможет всё запомнить.';
  document.getElementById('result-title').textContent = title;
  document.getElementById('result-text').textContent = text;
  try {
    const previousBest = Number(localStorage.getItem('arduinoQuizBest') || 0);
    if (quizScore > previousBest) localStorage.setItem('arduinoQuizBest', String(quizScore));
  } catch (error) {
    // The result is still shown if persistent storage is unavailable.
  }
  document.getElementById('quiz-restart').focus();
}

quizNext.addEventListener('click', () => {
  if (currentQuestion < quizQuestions.length - 1) {
    currentQuestion += 1;
    renderQuestion();
  } else {
    showQuizResult();
  }
});

document.getElementById('quiz-restart').addEventListener('click', () => {
  currentQuestion = 0;
  quizScore = 0;
  quizAnswers = [];
  document.getElementById('quiz-result').hidden = true;
  document.getElementById('quiz-content').hidden = false;
  renderQuestion();
});

renderQuestion();

const projects = {
  traffic: {
    title: 'Умный светофор',
    intro: 'Соберите модель светофора на трёх светодиодах. Базовая версия переключает цвета по таймеру, расширенная реагирует на пешеходную кнопку.',
    parts: ['Arduino Uno', 'Красный, жёлтый и зелёный светодиоды', 'Три резистора 220 Ом', 'Тактовая кнопка', 'Макетная плата и провода'],
    steps: ['Подключите аноды светодиодов через отдельные резисторы к D8, D9 и D10, катоды — к GND.', 'Соедините кнопку между D2 и GND. В setup() выберите INPUT_PULLUP.', 'Создайте функции setRed(), setYellow() и setGreen(), каждая должна включать нужный выход и выключать остальные.', 'Сначала используйте delay(): зелёный — 5 секунд, жёлтый — 1 секунда, красный — 4 секунды.', 'Затем замените длительные delay() таймером на millis(), чтобы плата могла одновременно проверять кнопку.'],
    upgrade: 'Добавьте мигающий зелёный перед переключением и отдельный двухцветный светофор для пешеходов.',
    warning: 'У каждого светодиода должен быть собственный резистор. Не используйте один общий резистор на несколько светодиодов.'
  },
  weather: {
    title: 'Домашняя метеостанция',
    intro: 'Считывайте температуру и влажность с DHT22 и выводите данные на OLED-дисплей 0,96″ с контроллером SSD1306. Для начала можно обойтись Монитором порта.',
    parts: ['Arduino Uno', 'Датчик DHT22', 'OLED SSD1306 I²C 128×64 (по желанию)', 'Резистор 10 кОм для некоторых модулей DHT22', 'Макетная плата и провода'],
    steps: ['Установите через Менеджер библиотек Arduino IDE библиотеку «DHT sensor library» от Adafruit и её зависимости. Для дисплея — «Adafruit SSD1306» и «Adafruit GFX Library».', 'Подключите DHT22 согласно документации вашего модуля: VCC к 5V, GND к GND, DATA к D2. Голый датчик обычно требует подтяжку DATA к VCC резистором 10 кОм.', 'Создайте объект DHT dht(2, DHT22); вызовите dht.begin() в setup().', 'Опрашивайте датчик не чаще одного раза в 2 секунды. Проверяйте показания функцией isnan(), чтобы отловить ошибку чтения.', 'Для OLED подключите SDA к A4, SCL к A5, питание — согласно характеристикам модуля. Выведите температуру и влажность.'],
    upgrade: 'Сохраняйте время и показания на microSD или добавьте пороговую сигнализацию при высокой температуре.',
    warning: 'Перед подключением сверяйте распиновку конкретного модуля с его документацией: порядок выводов у готовых модулей может отличаться.'
  },
  plant: {
    title: 'Контроль полива',
    intro: 'Начните с индикатора влажности почвы: он безопаснее и проще автоматического насоса. Когда измерения станут стабильными, добавьте управление насосом через драйвер.',
    parts: ['Arduino Uno', 'Ёмкостный датчик влажности почвы', 'Светодиод и резистор 220 Ом', 'Для автополива: насос, подходящий MOSFET/драйвер, защитный диод и отдельный источник питания', 'Макетная плата и провода'],
    steps: ['Подключите питание датчика согласно его документации, сигнальный выход — к A0. Не превышайте допустимое напряжение входа.', 'Выведите analogRead(A0) в Монитор порта. Запишите значение на сухом воздухе и значение датчика в воде без погружения электроники.', 'Переведите диапазон в проценты через map() и constrain(). У большинства датчиков влажной почве соответствует меньшее число.', 'Подключите светодиод к D9 через резистор. Включайте его, когда расчётная влажность ниже выбранного порога.', 'Для насоса используйте драйвер и отдельное питание подходящего напряжения и тока. Объедините GND источника и Arduino.'],
    upgrade: 'Добавьте гистерезис, ограничение максимального времени работы насоса и защиту от полива при неисправном датчике.',
    warning: 'Не питайте насос от контакта Arduino или вывода 5V. Не погружайте плату и электронику в воду. Для долгой работы выбирайте ёмкостный датчик: резистивный быстрее корродирует.'
  }
};

const projectModal = document.getElementById('project-modal');
const modalContent = document.getElementById('modal-content');

document.querySelectorAll('.project-open').forEach(button => {
  button.addEventListener('click', () => {
    const project = projects[button.dataset.project];
    modalContent.innerHTML = `
      <span class="lesson-tag">Практический проект</span>
      <h3 id="modal-title">${project.title}</h3>
      <p>${project.intro}</p>
      <h4>Что понадобится</h4>
      <ul>${project.parts.map(part => `<li>${part}</li>`).join('')}</ul>
      <h4>Порядок работы</h4>
      <ol>${project.steps.map(step => `<li>${step}</li>`).join('')}</ol>
      <h4>Как развить идею</h4>
      <p>${project.upgrade}</p>
      <p class="modal-warning"><strong>Безопасность:</strong> ${project.warning}</p>`;
    projectModal.showModal();
    document.body.classList.add('modal-open');
  });
});

function closeProjectModal() {
  projectModal.close();
  document.body.classList.remove('modal-open');
}

document.querySelector('.modal-close').addEventListener('click', closeProjectModal);
projectModal.addEventListener('click', event => {
  if (event.target === projectModal) {
    const rect = projectModal.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeProjectModal();
  }
});
projectModal.addEventListener('close', () => document.body.classList.remove('modal-open'));

const exampleTabs = [...document.querySelectorAll('.example-tab')];
const examplePanels = [...document.querySelectorAll('.example-panel')];

function activateExample(name, focusTab = false) {
  exampleTabs.forEach(tab => {
    const active = tab.dataset.example === name;
    tab.classList.toggle('active', active);
    tab.setAttribute('aria-selected', String(active));
    tab.tabIndex = active ? 0 : -1;
    if (active && focusTab) tab.focus();
  });
  examplePanels.forEach(panel => { panel.hidden = panel.dataset.panel !== name; });
}

exampleTabs.forEach((tab, index) => {
  tab.addEventListener('click', () => activateExample(tab.dataset.example));
  tab.addEventListener('keydown', event => {
    if (!['ArrowLeft', 'ArrowRight', 'Home', 'End'].includes(event.key)) return;
    event.preventDefault();
    let nextIndex = index;
    if (event.key === 'ArrowRight') nextIndex = (index + 1) % exampleTabs.length;
    if (event.key === 'ArrowLeft') nextIndex = (index - 1 + exampleTabs.length) % exampleTabs.length;
    if (event.key === 'Home') nextIndex = 0;
    if (event.key === 'End') nextIndex = exampleTabs.length - 1;
    activateExample(exampleTabs[nextIndex].dataset.example, true);
  });
});

const virtualToggle = document.getElementById('virtual-toggle');
const toggleDemoLed = document.getElementById('toggle-demo-led');
let toggleDemoOn = false;
let toggleDemoCount = 0;

virtualToggle.addEventListener('click', () => {
  virtualToggle.disabled = true;
  virtualToggle.classList.add('pressed');
  document.getElementById('toggle-demo-log').textContent = 'Вход D2: LOW\nПроверяем стабильность 30 мс…';
  setTimeout(() => {
    toggleDemoOn = !toggleDemoOn;
    toggleDemoCount += 1;
    toggleDemoLed.classList.toggle('on', toggleDemoOn);
    document.getElementById('toggle-demo-state').textContent = toggleDemoOn ? 'Светодиод включён' : 'Светодиод выключен';
    document.getElementById('toggle-demo-log').textContent = `Нажатие ${toggleDemoCount} подтверждено\nD13: ${toggleDemoOn ? 'HIGH' : 'LOW'}`;
  }, 30);
  setTimeout(() => {
    virtualToggle.disabled = false;
    virtualToggle.classList.remove('pressed');
  }, 140);
});

const fastDemoLed = document.getElementById('fast-demo-led');
const slowDemoLed = document.getElementById('slow-demo-led');
const millisDemoRun = document.getElementById('millis-demo-run');
let millisDemoRunning = false;
let fastDemoTimer = null;
let slowDemoTimer = null;

function stopMillisDemo() {
  millisDemoRunning = false;
  clearInterval(fastDemoTimer);
  clearInterval(slowDemoTimer);
  fastDemoLed.classList.remove('on');
  slowDemoLed.classList.remove('on');
  millisDemoRun.classList.remove('running');
  millisDemoRun.textContent = '▶ Запустить таймеры';
  document.getElementById('millis-demo-log').textContent = 'Оба процесса остановлены';
}

millisDemoRun.addEventListener('click', () => {
  if (millisDemoRunning) {
    stopMillisDemo();
    return;
  }
  millisDemoRunning = true;
  fastDemoTimer = setInterval(() => fastDemoLed.classList.toggle('on'), 300);
  slowDemoTimer = setInterval(() => slowDemoLed.classList.toggle('on'), 1000);
  millisDemoRun.classList.add('running');
  millisDemoRun.textContent = '■ Остановить таймеры';
  document.getElementById('millis-demo-log').textContent = 'D12: период 300 мс\nD13: период 1000 мс\nОпрос кнопок остаётся доступным';
});

const rgbChannels = ['red', 'green', 'blue'];

function updateRgbDemo() {
  const values = rgbChannels.map(channel => Number(document.getElementById(`${channel}-range`).value));
  values.forEach((value, index) => {
    document.getElementById(`${rgbChannels[index]}-output`).textContent = String(value);
  });
  const hex = `#${values.map(value => value.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
  document.getElementById('rgb-preview').style.background = hex;
  document.getElementById('rgb-hex').textContent = hex;
}

rgbChannels.forEach(channel => document.getElementById(`${channel}-range`).addEventListener('input', updateRgbDemo));
document.getElementById('rgb-random').addEventListener('click', () => {
  rgbChannels.forEach(channel => {
    document.getElementById(`${channel}-range`).value = String(Math.floor(Math.random() * 256));
  });
  updateRgbDemo();
});
updateRgbDemo();

const distanceRange = document.getElementById('distance-range');

function updateDistanceDemo() {
  const distance = Number(distanceRange.value);
  document.getElementById('distance-value').textContent = `${distance} см`;
  const zone = distance < 20 ? 'red' : distance <= 50 ? 'yellow' : 'green';
  ['red', 'yellow', 'green'].forEach(color => {
    document.getElementById(`distance-${color}`).classList.toggle('active', color === zone);
  });
  const messages = {
    red: 'Близко! Красный индикатор и частый звуковой сигнал.',
    yellow: 'Препятствие приближается. Жёлтый индикатор включён.',
    green: 'Безопасное расстояние. Зелёный индикатор включён.'
  };
  document.getElementById('distance-console').textContent = messages[zone];
  document.querySelector('.distance-wave').style.opacity = distance < 20 ? '.35' : '1';
}

distanceRange.addEventListener('input', updateDistanceDemo);
updateDistanceDemo();

const reactionStart = document.getElementById('reaction-start');
const reactionHit = document.getElementById('reaction-hit');
const reactionStage = document.getElementById('reaction-stage');
const reactionLed = document.getElementById('reaction-led');
const reactionMessage = document.getElementById('reaction-message');
const reactionResult = document.getElementById('reaction-result');
let reactionState = 'idle';
let reactionTimer = null;
let reactionSignalTime = 0;
let reactionBest = 0;

try {
  reactionBest = Number(localStorage.getItem('arduinoReactionBest') || 0);
} catch (error) {
  reactionBest = 0;
}
if (reactionBest > 0) reactionResult.textContent = `Лучший результат: ${reactionBest} мс`;

function resetReactionStage() {
  reactionStage.className = 'reaction-stage';
  reactionLed.classList.remove('on');
  reactionStart.disabled = false;
  reactionStart.textContent = 'Сыграть ещё раз';
  reactionHit.disabled = true;
}

reactionStart.addEventListener('click', () => {
  clearTimeout(reactionTimer);
  reactionState = 'waiting';
  reactionStage.className = 'reaction-stage ready';
  reactionLed.classList.remove('on');
  reactionMessage.textContent = 'Ждите зелёный сигнал…';
  reactionResult.textContent = reactionBest > 0 ? `Лучший результат: ${reactionBest} мс` : 'Не нажимайте раньше времени';
  reactionStart.disabled = true;
  reactionHit.disabled = false;
  const delay = Math.floor(Math.random() * 3001) + 1000;
  reactionTimer = setTimeout(() => {
    reactionState = 'signal';
    reactionSignalTime = performance.now();
    reactionStage.className = 'reaction-stage signal';
    reactionLed.classList.add('on');
    reactionMessage.textContent = 'Нажимайте!';
  }, delay);
});

reactionHit.addEventListener('click', () => {
  if (reactionState === 'waiting') {
    clearTimeout(reactionTimer);
    reactionState = 'early';
    reactionStage.className = 'reaction-stage early';
    reactionMessage.textContent = 'Фальстарт! Вы нажали раньше сигнала.';
    reactionResult.textContent = 'Попробуйте ещё раз и дождитесь зелёного цвета.';
    resetReactionStage();
    reactionStage.className = 'reaction-stage early';
    return;
  }
  if (reactionState !== 'signal') return;
  const elapsed = Math.round(performance.now() - reactionSignalTime);
  reactionState = 'result';
  if (!reactionBest || elapsed < reactionBest) {
    reactionBest = elapsed;
    try {
      localStorage.setItem('arduinoReactionBest', String(reactionBest));
    } catch (error) {
      reactionBest = elapsed;
    }
  }
  resetReactionStage();
  reactionMessage.textContent = `Ваша реакция: ${elapsed} мс`;
  reactionResult.textContent = `Лучший результат: ${reactionBest} мс`;
});

const componentSearch = document.getElementById('component-search-input');
const componentCards = [...document.querySelectorAll('.component-card')];
const componentFilterButtons = [...document.querySelectorAll('[data-component-filter]')];
let currentComponentFilter = 'all';

function componentWord(count) {
  const lastTwo = count % 100;
  const last = count % 10;
  if (lastTwo >= 11 && lastTwo <= 14) return 'компонентов';
  if (last === 1) return 'компонент';
  if (last >= 2 && last <= 4) return 'компонента';
  return 'компонентов';
}

function filterComponents() {
  const query = componentSearch.value.trim().toLocaleLowerCase('ru');
  let visibleCount = 0;
  componentCards.forEach(card => {
    const categories = card.dataset.category.split(' ');
    const matchesCategory = currentComponentFilter === 'all' || categories.includes(currentComponentFilter);
    const searchText = `${card.dataset.name} ${card.textContent}`.toLocaleLowerCase('ru');
    const matchesSearch = !query || searchText.includes(query);
    card.hidden = !(matchesCategory && matchesSearch);
    if (!card.hidden) visibleCount += 1;
  });
  document.getElementById('component-count').textContent = `Показано ${visibleCount} ${componentWord(visibleCount)}`;
  document.getElementById('component-empty').hidden = visibleCount !== 0;
}

componentSearch.addEventListener('input', filterComponents);
componentFilterButtons.forEach(button => {
  button.addEventListener('click', () => {
    currentComponentFilter = button.dataset.componentFilter;
    componentFilterButtons.forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    filterComponents();
  });
});

document.getElementById('component-reset').addEventListener('click', () => {
  currentComponentFilter = 'all';
  componentSearch.value = '';
  componentFilterButtons.forEach(button => {
    const active = button.dataset.componentFilter === 'all';
    button.classList.toggle('active', active);
    button.setAttribute('aria-pressed', String(active));
  });
  filterComponents();
  componentSearch.focus();
});

filterComponents();

const wiringDiagrams = [
  {
    key: 'uno', device: 'Компьютер / USB', description: 'USB соединяет Uno с компьютером: кабель одновременно питает плату и переносит скетч.', pins: [['USB', 'USB компьютера', 'blue']], note: 'Для первых схем используйте USB и небольшие модули 5 В. Не подавайте внешнее напряжение на цифровые входы.'
  },
  {
    key: 'breadboard', device: 'Макетная плата', description: 'Выведите питание Uno на боковые дорожки макетки, чтобы удобно подключать детали.', pins: [['5V', 'Красная дорожка +', 'red'], ['GND', 'Синяя дорожка −', 'dark']], note: 'На длинной макетке дорожки могут быть разорваны посередине. При необходимости соедините половины перемычками.'
  },
  {
    key: 'usb', device: 'Компьютер', description: 'Подключите разъём платы к USB-порту компьютера кабелем с линиями данных.', pins: [['USB-B / USB-C', 'USB-A / USB-C', 'blue']], note: 'Разъём зависит от модели платы. Если Uno получает питание, но не видна в Arduino IDE, проверьте другой кабель передачи данных.'
  },
  {
    key: 'jumpers', device: 'Модуль / датчик', description: 'Перемычки соединяют одинаковые по назначению точки: сигнал к входу, питание к питанию, минус к минусу.', pins: [['D2', 'Сигнал / IN', 'yellow'], ['5V', 'VCC', 'red'], ['GND', 'GND', 'dark']], note: 'Цвет провода выбираете вы. Схема работает от электрического соединения, а не от цвета изоляции.'
  },
  {
    key: 'resistor', device: 'LED + резистор', description: 'Резистор стоит последовательно со светодиодом и ограничивает ток всей цепи.', pins: [['D13', 'Резистор 220 Ω → анод', 'red'], ['GND', 'Катод светодиода', 'dark']], note: 'Резистор можно поставить до или после светодиода. Полярности у обычного резистора нет, а у светодиода есть.'
  },
  {
    key: 'led', device: 'Светодиод', description: 'Выход D13 питает светодиод через резистор, а GND замыкает цепь.', pins: [['D13', '220 Ω → анод (+)', 'red'], ['GND', 'Катод (−)', 'dark']], note: 'Анод обычно имеет длинную ножку. Для плавной яркости используйте D9 или другой контакт со значком ~.'
  },
  {
    key: 'button', device: 'Тактовая кнопка', description: 'Кнопка соединяет вход D2 с GND только во время нажатия. Внешний резистор не нужен.', pins: [['D2', 'Контакт 1', 'yellow'], ['GND', 'Контакт 2', 'dark']], note: 'В коде выберите pinMode(2, INPUT_PULLUP). Используйте ножки по диагонали или по разные стороны корпуса.'
  },
  {
    key: 'potentiometer', device: 'Потенциометр', description: 'Крайние выводы получают 5 В и GND, а средний вывод передаёт изменяющееся напряжение на A0.', pins: [['5V', 'Крайний вывод 1', 'red'], ['A0', 'Средний вывод', 'yellow'], ['GND', 'Крайний вывод 2', 'dark']], note: 'Если вращение меняет значения в обратную сторону, поменяйте местами крайние выводы питания.'
  },
  {
    key: 'photoresistor', device: 'Делитель света', description: 'Фоторезистор и постоянный резистор образуют делитель. Общая точка подключается к A0.', pins: [['5V', 'Фоторезистор → A0', 'red'], ['A0', 'Общая точка деталей', 'yellow'], ['GND', 'Резистор 10 кОм → A0', 'dark']], note: 'Физически A0 — это точка соединения второго вывода фоторезистора и первого вывода резистора 10 кОм.'
  },
  {
    key: 'rgb', device: 'RGB · общий катод', description: 'Каждый цветовой канал получает отдельный резистор и отдельный ШИМ-выход.', pins: [['D9 ~', '220 Ω → R', 'red'], ['D10 ~', '220 Ω → G', 'green'], ['D11 ~', '220 Ω → B', 'blue'], ['GND', 'Общий катод', 'dark']], note: 'Схема показана для RGB с общим катодом. Для модели с общим анодом подключение и логика управления отличаются.'
  },
  {
    key: 'piezo', device: 'Пьезодинамик', description: 'Пассивный пьезодинамик подключается к цифровому выходу и GND.', pins: [['D9', 'Сигнал / +', 'yellow'], ['GND', 'GND / −', 'dark']], note: 'Используйте tone(9, частота) для звука и noTone(9) для тишины. Мощный динамик требует усилитель.'
  },
  {
    key: 'dht22', device: 'DHT22', description: 'DHT22 получает питание и передаёт цифровые измерения по линии DATA.', pins: [['5V', 'VCC', 'red'], ['D2', 'DATA', 'yellow'], ['GND', 'GND', 'dark']], note: 'Для датчика без модуля добавьте резистор 10 кОм между DATA и VCC. Порядок ножек проверьте по документации.'
  },
  {
    key: 'oled', device: 'OLED SSD1306', description: 'OLED подключается по I²C: две линии данных и два провода питания.', pins: [['5V*', 'VCC*', 'red'], ['GND', 'GND', 'dark'], ['A4', 'SDA', 'blue'], ['A5', 'SCL', 'yellow']], note: 'На Uno SDA = A4, SCL = A5. Звёздочка напоминает: напряжение VCC должно соответствовать конкретному модулю.'
  },
  {
    key: 'hcsr04', device: 'HC-SR04', description: 'TRIG запускает импульс, ECHO возвращает длительность эха.', pins: [['5V', 'VCC', 'red'], ['GND', 'GND', 'dark'], ['D7', 'TRIG', 'yellow'], ['D8', 'ECHO', 'blue']], note: 'Схема предназначена для 5-вольтовой Uno. Для платы 3,3 В понизьте уровень ECHO делителем или преобразователем.'
  },
  {
    key: 'pir', device: 'PIR-датчик', description: 'Сигнальный выход PIR сообщает цифровому входу об обнаруженном движении.', pins: [['5V', 'VCC', 'red'], ['D2', 'OUT', 'yellow'], ['GND', 'GND', 'dark']], note: 'После включения дайте модулю стабилизироваться 30–60 секунд. Расположение выводов отличается у разных производителей.'
  },
  {
    key: 'soil', device: 'Датчик почвы', description: 'Аналоговый выход датчика передаёт на A0 значение для последующей калибровки.', pins: [['5V*', 'VCC*', 'red'], ['GND', 'GND', 'dark'], ['A0', 'AO / сигнал', 'yellow']], note: 'Проверьте допустимое питание модуля. Не погружайте электронную плату датчика в воду и не используйте чужой порог без калибровки.'
  },
  {
    key: 'motor', device: 'Драйвер + мотор', description: 'Arduino управляет только входом драйвера. Мотор получает энергию от отдельного источника.', pins: [['D9 ~', 'IN / PWM драйвера', 'yellow'], ['GND', 'Общий GND', 'dark'], ['БП подходящего U', 'Силовой VCC драйвера', 'red']], note: 'Вывод мотора → мотору. Не подключайте мотор к D9 или 5V Uno. Источник должен выдерживать пусковой ток.'
  },
  {
    key: 'diode', device: 'MOSFET + мотор', description: 'Защитный диод подключается параллельно мотору в обратном направлении.', pins: [['D9', 'MOSFET / вход', 'yellow'], ['GND', 'Общий GND', 'dark'], ['Плюс БП', 'Катод диода + мотор', 'red']], note: 'Анод диода соединяется со стороной транзистора и вторым выводом мотора. Многие готовые драйверы уже имеют защиту.'
  },
  {
    key: 'power', device: 'Драйвер / нагрузка', description: 'Отдельный блок питания питает силовую часть, а общий GND связывает её с управлением.', pins: [['GND', 'Общий GND', 'dark'], ['Не соединять 5V', 'V+ отдельного БП', 'red']], note: 'Не объединяйте плюсы разных источников. Напряжение и ток источника выбираются под нагрузку и драйвер.'
  },
  {
    key: 'relay', device: 'Релейный модуль', description: 'Цифровой выход управляет входом релейного модуля, а модуль получает отдельные VCC и GND.', pins: [['5V*', 'VCC*', 'red'], ['D7', 'IN', 'yellow'], ['GND', 'GND', 'dark']], note: 'Показана только низковольтная управляющая часть. Не подключайте 220 В в учебной схеме на макетной плате.'
  }
];

const lessonWiringDiagrams = [
  {
    lessonId: 'lesson-1', device: 'Компьютер', description: 'Первый урок не требует радиодеталей: USB-кабель соединяет плату с компьютером и одновременно питает её.', pins: [['USB', 'USB-порт компьютера', 'blue']], note: 'Больше ничего подключать не нужно. Отдельный блок питания на этом этапе не требуется.'
  },
  {
    lessonId: 'lesson-2', device: 'Макетная плата + LED', description: 'Питание Uno выведено на боковые дорожки макетной платы, а светодиод подключён к D13 через резистор.', pins: [['5V', 'Красная дорожка +', 'red'], ['GND', 'Синяя дорожка −', 'dark'], ['D13', 'Резистор 220 Ω → анод LED', 'red'], ['GND', 'Катод LED', 'dark']], note: 'Дорожки питания на макетке работают как удобные «розетки»: от них короткими перемычками питаются все детали схемы. Следите, чтобы 5V и GND никогда не соединялись напрямую.'
  },
  {
    lessonId: 'lesson-3', device: 'Компьютер', description: 'Для загрузки скетча плату подключают кабелем, в котором есть линии данных, а не только провода питания.', pins: [['USB-B', 'USB-порт компьютера', 'blue']], note: 'Если плата светится, но не видна в Arduino IDE, замените кабель: некоторые USB-кабели передают только питание.'
  },
  {
    lessonId: 'lesson-4', device: 'Светодиод + резистор', description: 'Классическая первая схема: выход D13 управляет светодиодом, резистор 220 Ом ограничивает ток.', pins: [['D13', 'Резистор 220 Ω → анод (+)', 'red'], ['GND', 'Катод (−)', 'dark']], note: 'Длинная ножка светодиода — анод, она идёт к резистору и D13. Если перепутать полярность, светодиод просто не загорится. Перед сборкой отключите питание.'
  },
  {
    lessonId: 'lesson-5', device: 'Кнопка + LED', description: 'Кнопка соединяет вход D2 с GND только во время нажатия, а светодиод на D13 показывает результат.', pins: [['D2', 'Контакт кнопки 1', 'yellow'], ['GND', 'Контакт кнопки 2', 'dark'], ['D13', 'Резистор 220 Ω → анод LED', 'red'], ['GND', 'Катод LED', 'dark']], note: 'В коде выбран INPUT_PULLUP: отпущенная кнопка читается как HIGH, нажатая — как LOW. Внешний резистор для кнопки не нужен.'
  },
  {
    lessonId: 'lesson-6', device: 'Потенциометр + LED', description: 'Потенциометр на A0 задаёт яркость, а выход D9 со значком ~ плавно управляет светодиодом.', pins: [['5V', 'Крайний вывод 1', 'red'], ['A0', 'Средний вывод', 'yellow'], ['GND', 'Крайний вывод 2', 'dark'], ['D9 ~', 'Резистор 220 Ω → анод LED', 'red'], ['GND', 'Катод LED', 'dark']], note: 'Плавная яркость работает только на контактах со значком ~ (ШИМ). Обычный digitalWrite() умеет только включать и выключать.'
  },
  {
    lessonId: 'lesson-7', device: 'Потенциометр + USB', description: 'Потенциометр подключён к A0, а измеренные значения уходят по USB-кабелю в Монитор порта на компьютере.', pins: [['5V', 'Крайний вывод 1', 'red'], ['A0', 'Средний вывод', 'yellow'], ['GND', 'Крайний вывод 2', 'dark'], ['USB', 'Монитор порта в Arduino IDE', 'blue']], note: 'Сообщения Serial.println() идут по тому же USB-кабелю, через который загружался скетч. Скорость в Мониторе порта должна совпадать со значением Serial.begin().'
  },
  {
    lessonId: 'lesson-8', device: 'Фоторезистор + LED', description: 'Фоторезистор и резистор 10 кОм образуют делитель напряжения на A0, а выход D9 управляет яркостью ночника.', pins: [['5V', 'Фоторезистор → точка A0', 'red'], ['A0', 'Общая точка деталей', 'yellow'], ['GND', 'Резистор 10 кОм → точка A0', 'dark'], ['D9 ~', 'Резистор 220 Ω → анод LED', 'red'], ['GND', 'Катод LED', 'dark']], note: 'Порог срабатывания настройте по Монитору порта: запишите значения «светло» и «темно» и выберите число между ними. Перед изменением схемы отключайте питание.'
  }
];

const wiringModal = document.getElementById('wiring-modal');
const wiringColors = { red: '#df6855', dark: '#334b54', yellow: '#dfab48', blue: '#4e94bd', green: '#4eaa7e' };

function renderWiringDiagram(diagram) {
  const pinCount = diagram.pins.length;
  const boardStart = pinCount > 3 ? 112 : 145;
  const boardGap = pinCount > 3 ? 45 : 72;
  const deviceStart = pinCount > 3 ? 130 : 165;
  const deviceGap = pinCount > 3 ? 43 : 70;
  const wires = diagram.pins.map((pin, index) => {
    const y1 = boardStart + index * boardGap;
    const y2 = deviceStart + index * deviceGap;
    const color = wiringColors[pin[2]];
    if (/БП|Не соединять/.test(pin[0])) {
      return `<rect x="310" y="315" width="120" height="66" rx="9" fill="#fff3d9" stroke="#dfa652"/><text x="370" y="335" text-anchor="middle" fill="#8a6330" font-size="9" font-weight="700" font-family="Arial">ОТДЕЛЬНЫЙ БП</text><text x="370" y="352" text-anchor="middle" fill="#8a6330" font-size="8" font-family="Arial">${pin[0]}</text><path d="M430 347 C452 347, 452 ${y2}, 475 ${y2}" fill="none" stroke="${color}" stroke-width="5"/><circle cx="475" cy="${y2}" r="7" fill="${color}"/><text x="494" y="${y2 + 4}" fill="#45615e" font-size="12" font-family="Arial">${pin[1]}</text>`;
    }
    return `<path d="M275 ${y1} C365 ${y1}, 385 ${y2}, 475 ${y2}" fill="none" stroke="${color}" stroke-width="5" stroke-linecap="round"/><circle cx="275" cy="${y1}" r="7" fill="${color}"/><circle cx="475" cy="${y2}" r="7" fill="${color}"/><text x="258" y="${y1 + 4}" text-anchor="end" fill="#d9efea" font-size="13" font-family="monospace">${pin[0]}</text><text x="494" y="${y2 + 4}" fill="#45615e" font-size="12" font-family="Arial">${pin[1]}</text>`;
  }).join('');
  return `<svg viewBox="0 0 760 400" role="img" aria-label="Схема: ${diagram.description}"><rect x="30" y="48" width="245" height="296" rx="17" fill="#147c80"/><rect x="51" y="74" width="74" height="43" rx="5" fill="#c6d4d3"/><rect x="80" y="225" width="119" height="49" rx="5" fill="#19373d"/><circle cx="54" cy="319" r="7" fill="#d1e2db"/><text x="152" y="200" text-anchor="middle" fill="#c7e9df" font-size="18" font-weight="700" font-family="Arial">ARDUINO UNO</text><text x="152" y="222" text-anchor="middle" fill="#8ec4b8" font-size="10" font-family="monospace">УПРАВЛЕНИЕ</text><rect x="475" y="86" width="240" height="230" rx="15" fill="#f1f5ef" stroke="#b8ccc3" stroke-width="2"/><text x="595" y="112" text-anchor="middle" fill="#176f6b" font-size="15" font-weight="700" font-family="Arial">${diagram.device}</text><text x="595" y="341" text-anchor="middle" fill="#8b9d97" font-size="10" font-family="Arial">КОМПОНЕНТ / МОДУЛЬ</text>${wires}</svg>`;
}

componentCards.forEach((card, index) => {
  const diagram = wiringDiagrams[index];
  if (!diagram) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'wiring-open';
  button.dataset.wiring = diagram.key;
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h10M12 7v10"/></svg> Схема подключения';
  card.appendChild(button);
  button.addEventListener('click', () => {
    document.getElementById('wiring-title').textContent = card.querySelector('h3').textContent;
    document.getElementById('wiring-description').textContent = diagram.description;
    document.getElementById('wiring-note').textContent = diagram.note;
    document.getElementById('wiring-diagram').innerHTML = renderWiringDiagram(diagram);
    wiringModal.showModal();
    document.body.classList.add('modal-open');
  });
});

lessonWiringDiagrams.forEach(diagram => {
  const lesson = document.getElementById(diagram.lessonId);
  if (!lesson) return;
  const button = document.createElement('button');
  button.type = 'button';
  button.className = 'wiring-open lesson-wiring-open';
  button.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="2"/><circle cx="19" cy="12" r="2"/><path d="M7 12h10M12 7v10"/></svg> Схема урока';
  lesson.appendChild(button);
  button.addEventListener('click', () => {
    document.getElementById('wiring-title').textContent = lesson.querySelector('h3').textContent;
    document.getElementById('wiring-description').textContent = diagram.description;
    document.getElementById('wiring-note').textContent = diagram.note;
    document.getElementById('wiring-diagram').innerHTML = renderWiringDiagram(diagram);
    wiringModal.showModal();
    document.body.classList.add('modal-open');
  });
});

function closeWiringModal() {
  wiringModal.close();
  document.body.classList.remove('modal-open');
}

document.getElementById('wiring-close').addEventListener('click', closeWiringModal);
wiringModal.addEventListener('click', event => {
  if (event.target !== wiringModal) return;
  const rect = wiringModal.getBoundingClientRect();
  if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) closeWiringModal();
});
wiringModal.addEventListener('close', () => document.body.classList.remove('modal-open'));
