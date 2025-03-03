// В функции loadSettings() изменяем промпт:
prompt: localStorage.getItem('med-analyzer-prompt') || 
`Это результаты анализа крови пациента. Требуется:
1. Определить дату анализа (если есть)
2. Определить название теста/анализа
3. Для каждого параметра определить:
   - название параметра
   - числовое значение
   - единицы измерения
4. Вернуть ответ в формате JSON:
{
    "data": "дд.мм.гггг",
    "test": "название теста",
    "params": [
        {"param": "название параметра", "value": числовое_значение, "unit": "единицы измерения"},
        ...
    ]
}
Если дата не указана, использовать текущую. Не включай дополнительные объяснения, только валидный JSON.` 


let format= `
{
  "type": "array",
  "description": "это структурированный вывод со скана результатов анализа крови пациента.  на бланке может быть несколько тестов.  соответственно для каждого из них определи название теста, дату проведения теста и соответствующий список параметров анализа. вывод информации надо делать на русском языке.",
  "items": {
    "type": "object",
    "properties": {
      "test": {
        "type": "string",
        "description": "полное название текущего теста анализа крови"
      },
      "date": {
        "type": "string",
        "description": "заданное время проведения текущего теста крови.  Формат вывода  дд.мм.гггг"
      },
      "parameters": {
        "type": "array",
        "description": "список всех найденных параметров из предоставленного анализа крови.",
        "items": {
          "type": "object",
          "properties": {
            "param": {
              "type": "string",
              "description": "наименование соответствующего параметра."
            },
            "value": {
              "type": [
                "number",
                "integer",
                "string"
              ],
              "description": "числовое представления результата теста соответствующего параметра."
            },
            "unit": {
              "type": "string",
              "description": "единица измерения для соответствующего параметра на русском языке. если не найден то взять из базы знаний. вывод в нижнем регистре"
            }
          },
          "required": [
            "param",
            "value",
            "unit"
          ]
        }
      },
      "recommendations": {
        "type": "string",
        "description": "Сюда можно заносить краткую информацию по результатам Краткие рекомендации по результатам теста. Выводить на русском языке"
      }
    },
    "required": [
      "test",
      "date",
      "parameters",
      "recommendations"
    ]
  }
}

`;



let tableData = []; // Теперь это массив тестов

// Функция для инициализации таблицы
function buildTable() {
    let table = new Tabulator("#table-container", {
        data: tableData,
        layout: "fitData",
        columns: [
            { 
                title: "Дата", 
                field: "date", 
                editor: dateEditor,
                cellEdited: function(cell) {
                    if(!cell.getValue().match(/^\d{2}\.\d{2}\.\d{4}$/)) {
                        cell.getRow().update({date: cell.getOldValue()});
                        alert("Неверный формат даты! Используйте дд.мм.гггг");
                    }
                }
            },
            { title: "Название теста", field: "test", editor: "input" },
            { 
                title: "", 
                formatter: "buttonCross", 
                width: 40, 
                headerSort: false,
                cellClick: function(e, cell) {
                    const rowData = cell.getRow().getData();
                    const index = tableData.indexOf(rowData);
                    if (index !== -1) {
                        tableData.splice(index, 1);
                        buildTable();
                    }
                }
            }
        ],
        rowFormatter: function(row) {
            let rowData = row.getData();
            let subTable = document.createElement("div");
            subTable.className = "sub-table";
            row.getElement().appendChild(subTable);
            
            let subTabulator = new Tabulator(subTable, {
                data: rowData.params || [],
                layout: "fitData",
                columns: [
                    { title: "Параметр", field: "param", editor: "input" },
                    { title: "Значение", field: "value", editor: "input" },
                    { title: "Ед. изм.", field: "unit", editor: "input" },
                    { 
                        title: "",
                        formatter: "buttonCross", 
                        width: 40, 
                        headerSort: false,
                        cellClick: function(e, cell) {
                            const row = cell.getRow();
                            const paramData = row.getData();
                            const paramIndex = rowData.params.indexOf(paramData);
                            if (paramIndex !== -1) {
                                rowData.params.splice(paramIndex, 1);
                                row.delete();
                            }
                        }
                    }
                ]
            });
            
            let addParamBtn = document.createElement("button");
            addParamBtn.innerText = "Добавить параметр";
            addParamBtn.className = "add-param-btn";
            addParamBtn.onclick = function() {
                if (!rowData.params) rowData.params = [];
                rowData.params.push({ param: "", value: "", unit: "" });
                subTabulator.replaceData(rowData.params);
            };
            row.getElement().appendChild(addParamBtn);
        }
    });
}

// Кастомный редактор даты
const dateEditor = (cell, onRendered, success, cancel) => {
    const input = document.createElement("input");
    input.className = "flatpickr-input";
    input.placeholder = "дд.мм.гггг";
    input.value = cell.getValue();
    
    const fp = flatpickr(input, {
        dateFormat: "d.m.Y",
        allowInput: true,
        onClose: (selectedDates, dateStr) => {
            input.value = dateStr;
            success(dateStr);
        }
    });
    
    onRendered(() => input.focus());
    
    input.addEventListener("blur", () => {
        if(input.value.match(/^\d{2}\.\d{2}\.\d{4}$/)) {
            success(input.value);
        } else {
            cancel();
        }
    });

    return input;
};

// Функция добавления нового теста
function addTest() {
    tableData.push({
        data: new Date().toLocaleDateString('ru-RU'),
        test: "",
        params: []
    });
    buildTable();
}

// Функция экспорта данных
function exportData() {
    let dataStr = "data:text/json;charset=utf-8," + 
                 encodeURIComponent(JSON.stringify(tableData, null, 2));
    let downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "medical_tests.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    document.body.removeChild(downloadAnchor);
}

// Модифицируем функцию renderTable
function renderTable() {
    buildTable();
}

// Модифицируем функцию switchTab
function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeTab = document.getElementById(tabId);
    activeTab.classList.add('active');
    activeTab.style.display = 'block';
    document.querySelector(`button[onclick="switchTab('${tabId}')"]`).classList.add('active');

    if(tabId === 'editTab') {
        buildTable();
    }
} 


let currentMode = 'ocr+llm';

let currentTool = 'brush';
let isDrawing = false;
let lastX = 0;
let lastY = 0;
let lastXOrigin = 0;
let lastYOrigin = 0;
let history = [];
let historyStep = -1;
let canvas, ctx, ctxPreview, imgCanvas;
let zoomEnabled = false;

let previewCanvasWidth = 0;

let originalCanvas = document.createElement('canvas');
let originalCtx = originalCanvas.getContext('2d');

let cropPoints = [];
let isCropMode = false;
let isDraggingPoint = false;
let draggedPointIndex = -1;
let cropPreview = null;

let cropLines = [];
let isCropActive = false;

let scaleX, scaleY;

// Значения по умолчанию для настроек
const DEFAULT_SETTINGS = {
    apiKey: '',
    endpoint: 'https://api.deepseek.com',
    model: 'deepseek-chat',
    temp: 0.2,
    prompt: `Это результаты анализа крови пациента. Требуется:
1. Идентифицировать все параметры
2. Извлечь числовые значения
3. Определить единицы измерения
4. Вернуть ответ в формате JSON:
{
  [
   {
    "data": "дд.мм.гггг",
    "test": "название теста",
    "params": [
        {"param": "название параметра", "value": числовое_значение, "unit": "единицы измерения"}
    ],
    "recommendations": "рекомендации которые можно сделать на основании анализа"
   } 
 ]
}
Если дата не указана, использовать текущую. Не включай дополнительные объяснения, только валидный JSON.`,
    ocrServerUrl: 'http://localhost:8000',
    ocrEngine: 'tesseract.js',
    manualOcrInput: false,
    availableOcrEngines: ['tesseract.js']
};

// Инициализация
function initialize() {
    setupDragAndDrop();
    setupImageHandlers();
    loadSettingsToUI();
    
    // Устанавливаем начальный режим
    setMode('ocr+llm');
    
    // Инициализация модального окна ручного ввода текста
    const manualTextModal = document.getElementById('manualTextModal');
    if (manualTextModal) {
        // Закрытие модального окна при клике вне его содержимого
        manualTextModal.addEventListener('click', (e) => {
            if (e.target === manualTextModal) {
                manualTextModal.style.display = 'none';
            }
        });
        
        // Обработка нажатия Escape
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && manualTextModal.style.display === 'flex') {
                manualTextModal.style.display = 'none';
                // Вызываем событие отмены
                document.getElementById('cancelManualText').click();
            }
        });
    }
    
    // Добавляем обработчики для кнопок импорта/экспорта настроек
    document.getElementById('exportSettings').addEventListener('click', exportSettingsToFile);
    
    document.getElementById('importSettings').addEventListener('click', () => {
        document.getElementById('settingsFile').click();
    });
    
    document.getElementById('settingsFile').addEventListener('change', (e) => {
        if (e.target.files.length > 0) {
            importSettingsFromFile(e.target.files[0]);
        }
    });
    
    // Добавляем обработчик для обновления списка моделей
    document.getElementById('refreshModels').addEventListener('click', fetchModels);
    
    // Добавляем обработчик для обновления списка OCR движков
    document.getElementById('refreshOcrEngines').addEventListener('click', fetchOcrEngines);
    
    // Загружаем список моделей при открытии настроек
    document.getElementById('apiEndpoint').addEventListener('change', fetchModels);
    
    // Проверяем доступность OCR движков при запуске
    setTimeout(fetchOcrEngines, 1000);
    
    // Загружаем список моделей при запуске
    setTimeout(fetchModels, 1000);
}

document.addEventListener('DOMContentLoaded', initialize);

// Настройка drag and drop
function setupDragAndDrop() {
    const dropZone = document.getElementById('dropZone');
    const fileInput = document.getElementById('imageInput');

    dropZone.addEventListener('click', () => fileInput.click());
    
    fileInput.addEventListener('change', 
        (e) => handleFile(e.target.files[0])
    );
    
    ['dragover', 'dragleave', 'drop'].forEach(event => {
        dropZone.addEventListener(event, (e) => {
            e.preventDefault();
            dropZone.classList.toggle('dragover', event === 'dragover');
            if(event === 'drop') handleFile(e.dataTransfer.files[0]);
        });
    });
}

// Обработка файла
function handleFile(file) {
    if(!file) return;
    
    const reader = new FileReader();
    reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
            initCanvas(img);
            document.getElementById('dropZone').classList.add('hidden');
            document.querySelector('.preview-container').classList.add('active');
        };
        img.src = e.target.result;
    };
    reader.readAsDataURL(file);
}

// Сброс канваса
function resetCanvas() {
    document.getElementById('dropZone').classList.remove('hidden');
    document.querySelector('.preview-container').classList.remove('active');
    canvas.width = 0;
    canvas.height = 0;
    originalCanvas.width = 0;
    originalCanvas.height = 0;
    
    history = [];
    historyStep = -1;
    cropPoints = [];
}

// Добавляем обработчик изменения размера окна
window.addEventListener('resize', function() {
    if (currentTool === 'crop' && cropPoints.length > 0) {
        // Обновляем позиции точек и линий
        createCropControls();
    }
});

// Функция для инициализации Canvas
function initCanvas(image) {
    canvas = document.getElementById('previewCanvas');
    ctx = canvas.getContext('2d');
    
    // Оригинальный канвас (скрытый)
    originalCanvas.width = image.width;
    originalCanvas.height = image.height;
    originalCtx.drawImage(image, 0, 0, image.width, image.height);
    
    const maxWidth = 800;
    const maxHeight = 500;
    const ratio = Math.min(maxWidth/image.width, maxHeight/image.height);
    canvas.width = image.width * ratio;
    canvas.height = image.height * ratio;
    previewCanvasWidth = canvas.width;
    
    // Обновляем коэффициенты масштабирования
    scaleX = originalCanvas.width / canvas.width;
    scaleY = originalCanvas.height / canvas.height;
    
    // Первичная отрисовка
    redrawScaledCanvas();
    saveState();
    
    console.log("Canvas инициализирован. Размеры:", {
        original: { width: originalCanvas.width, height: originalCanvas.height },
        preview: { width: canvas.width, height: canvas.height },
        scale: { x: scaleX, y: scaleY }
    });
}

// Функция перерисовки масштабированной версии
function redrawScaledCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(
        originalCanvas,
        0, 0, originalCanvas.width, originalCanvas.height,
        0, 0, canvas.width, canvas.height
    );
}


function saveState() {

    history = history.slice(0, historyStep + 1);
    // Сохраняем состояние оригинального канваса
    history.push(originalCtx.getImageData(0, 0, originalCanvas.width, originalCanvas.height));
    historyStep++;

}

function setupImageHandlers() {
    canvas = document.getElementById('previewCanvas');
    
    canvas.addEventListener('mousedown', (e) => {
        isDrawing = true;
        const rect = canvas.getBoundingClientRect();
        const scaleX = originalCanvas.width / canvas.width;
        const scaleY = originalCanvas.height / canvas.height;
        lastX = (e.clientX - rect.left) * (canvas.width / rect.width);
        lastY = (e.clientY - rect.top) * (canvas.height / rect.height);
        lastXOrigin = (e.clientX - rect.left) * scaleX;
        lastYOrigin = (e.clientY - rect.top) * scaleY;
        if(currentTool === 'rect') saveState();
        redrawScaledCanvas();
        console.log('---',lastX, lastY);
        console.log('---',lastXOrigin, lastYOrigin);

    });

    canvas.addEventListener('mousemove', handleDrawing);
    canvas.addEventListener('mouseup', () => isDrawing = false);
    canvas.addEventListener('mouseout', () => isDrawing = false);

    // Инициализация инструментов
    // document.querySelectorAll('.tool-btn').forEach(btn => {
    //     btn.addEventListener('click', () => {
    //         const tool = btn.dataset.tool;
    //         if(tool === 'magnifier') {
    //             zoomEnabled = !zoomEnabled;
    //             btn.classList.toggle('active', zoomEnabled);
    //         } else {
    //             currentTool = tool;
    //             document.querySelectorAll('.tool-btn').forEach(b => {
    //                 if(b.dataset.tool !== 'magnifier') {
    //                     b.classList.remove('active');
    //                 }
    //             });
    //             btn.classList.add('active');
    //         }
    //     });
    // });

    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const tool = btn.dataset.tool;
            if(tool === 'magnifier') {
                zoomEnabled = !zoomEnabled;
                btn.classList.toggle('active', zoomEnabled);
            } else if(tool === 'crop') {
                currentTool = tool;
                initCropTool();
                document.querySelectorAll('.tool-btn').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // Показываем отладочную панель
                const debugPanel = document.getElementById('cropDebugInfo');
                if (debugPanel) debugPanel.style.display = 'block';
            } else {
                currentTool = tool;
                document.querySelectorAll('.tool-btn').forEach(b => {
                    if(b.dataset.tool !== 'magnifier') {
                        b.classList.remove('active');
                    }
                });
                btn.classList.add('active');
                
                // Скрываем отладочную панель
                const debugPanel = document.getElementById('cropDebugInfo');
                if (debugPanel) debugPanel.style.display = 'none';
            }
        });
    });



    // Блокировка клика на превью
    canvas.addEventListener('click', (e) => {
        e.stopPropagation();
    });

    // Инициализация лупы
    setupImageZoom();

    // Добавим отладочную информацию о координатах мыши
    canvas.addEventListener('mousemove', function(e) {
        if (currentTool !== 'crop') return;
        
        const rect = canvas.getBoundingClientRect();
        
        // Получаем координаты мыши относительно canvas в пикселях DOM
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;
        
        // Преобразуем в координаты canvas с учетом масштабирования
        const canvasX = mouseX * (canvas.width / rect.width);
        const canvasY = mouseY * (canvas.height / rect.height);
        
        // Преобразуем в original-координаты
        const originalX = toOriginalX(canvasX);
        const originalY = toOriginalY(canvasY);
        
        // Обновляем отладочную информацию
        const debugPanel = document.getElementById('cropDebugInfo');
        if (debugPanel) {
            const mouseInfo = document.getElementById('mouseCoordinates');
            if (mouseInfo) {
                mouseInfo.textContent = `Мышь: DOM(${Math.round(mouseX)}, ${Math.round(mouseY)}) ` +
                                       `Canvas(${Math.round(canvasX)}, ${Math.round(canvasY)}) ` +
                                       `Orig(${Math.round(originalX)}, ${Math.round(originalY)})`;
            }
        }
    });
}


function initCropTool() {
    // Проверяем, что canvas существует
    if (!canvas) {
        console.error("Canvas не инициализирован");
        return;
    }
    
    // Очистим предыдущие точки и линии
    document.querySelectorAll('.crop-point, .crop-preview-line, .crop-point-label').forEach(el => el.remove());
    
    // Получаем точные размеры canvas в DOM
    const canvasRect = canvas.getBoundingClientRect();
    
    console.log("Инициализация инструмента обрезки. Размеры canvas:", canvas.width, canvas.height);
    console.log("Размеры canvas в DOM:", canvasRect.width, canvasRect.height);
    console.log("Размеры оригинального изображения:", originalCanvas.width, originalCanvas.height);
    
    // Устанавливаем точки по углам видимого canvas
    // Сначала в координатах canvas
    const canvasPoints = [
        { x: 0, y: 0 }, // Верхний левый угол (0)
        { x: canvas.width, y: 0 }, // Верхний правый угол (1)
        { x: canvas.width, y: canvas.height }, // Нижний правый угол (2)
        { x: 0, y: canvas.height } // Нижний левый угол (3)
    ];
    
    // Преобразуем в координаты оригинального изображения
    cropPoints = canvasPoints.map(point => ({
        x: toOriginalX(point.x),
        y: toOriginalY(point.y)
    }));
    
    console.log("Точки обрезки инициализированы:", cropPoints);
    
    // Создаем элементы управления
    createCropControls();
    
    // Показываем кнопку подтверждения
    const confirmCropBtn = document.getElementById('confirmCrop');
    if (confirmCropBtn) {
        confirmCropBtn.classList.remove('hidden');
    }
    
    // Важно: добавляем обработчики только один раз
    document.removeEventListener('mousemove', dragPoint);
    document.removeEventListener('mouseup', stopDragging);
    document.addEventListener('mousemove', dragPoint);
    document.addEventListener('mouseup', stopDragging);
    
    // Обновляем отладочную информацию
    updateCropDebugInfo();
}

function stopDragging() {
    if (isDraggingPoint) {
        isDraggingPoint = false;
        draggedPointIndex = -1;
    }
}

// Логика перетаскивания точек
function startDragging(e) {
    e.preventDefault();
    e.stopPropagation();
    isDraggingPoint = true;
    draggedPointIndex = parseInt(e.target.dataset.pointIndex);
    console.log("Начало перетаскивания точки:", draggedPointIndex);
}

function createCropControls() {
    // Проверяем, что canvas существует
    if (!canvas) {
        console.error("Canvas не инициализирован");
        return;
    }
    
    // Удаляем все существующие точки и линии
    document.querySelectorAll('.crop-point, .crop-preview-line, .crop-point-label').forEach(el => el.remove());
    
    const container = document.querySelector('.preview-container');
    if (!container) {
        console.error("Контейнер превью не найден");
        return;
    }
    
    // Получаем точное положение canvas внутри контейнера
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Смещение canvas относительно контейнера
    const offsetX = canvasRect.left - containerRect.left;
    const offsetY = canvasRect.top - containerRect.top;
    
    console.log("Смещение canvas:", offsetX, offsetY);
    console.log("Размеры canvas rect:", canvasRect.width, canvasRect.height);
    console.log("Размеры canvas:", canvas.width, canvas.height);
    
    cropPoints.forEach((point, index) => {
        // Создаем точку
        const dot = document.createElement('div');
        dot.className = 'crop-point';
        
        // Преобразуем координаты из original в canvas
        const canvasX = toPreviewX(point.x);
        const canvasY = toPreviewY(point.y);
        
        console.log(`Точка ${index}: оригинал (${point.x}, ${point.y}), canvas (${canvasX}, ${canvasY})`);
        
        // Преобразуем координаты canvas в пиксели DOM с учетом масштабирования
        const pixelX = canvasX * (canvasRect.width / canvas.width) + offsetX;
        const pixelY = canvasY * (canvasRect.height / canvas.height) + offsetY;
        
        console.log(`Точка ${index}: пиксели DOM (${pixelX}, ${pixelY})`);
        
        // Устанавливаем позицию точки
        dot.style.left = `${pixelX}px`;
        dot.style.top = `${pixelY}px`;
        dot.dataset.pointIndex = index;
        
        // Добавляем номер угла
        const label = document.createElement('div');
        label.className = 'crop-point-label';
        label.textContent = index;
        dot.appendChild(label);
        
        // Удаляем предыдущие обработчики, если они есть
        const oldDot = document.querySelector(`.crop-point[data-point-index="${index}"]`);
        if (oldDot) {
            oldDot.removeEventListener('mousedown', startDragging);
            container.removeChild(oldDot);
        }
        
        dot.addEventListener('mousedown', startDragging);
        container.appendChild(dot);
    });
    
    updateCropLines();
}

function dragPoint(e) {
    if (!isDraggingPoint || draggedPointIndex === -1) return;
    
    // Проверяем, что canvas существует
    if (!canvas) {
        console.error("Canvas не инициализирован");
        return;
    }
    
    // Получаем точное положение canvas внутри контейнера
    const canvasRect = canvas.getBoundingClientRect();
    const container = document.querySelector('.preview-container');
    if (!container) {
        console.error("Контейнер превью не найден");
        return;
    }
    const containerRect = container.getBoundingClientRect();
    
    // Смещение canvas относительно контейнера
    const offsetX = canvasRect.left - containerRect.left;
    const offsetY = canvasRect.top - containerRect.top;
    
    // Получаем координаты мыши относительно canvas в пикселях DOM
    const mouseX = e.clientX - canvasRect.left;
    const mouseY = e.clientY - canvasRect.top;
    
    // Проверяем, что координаты в пределах canvas
    if (mouseX < 0 || mouseX > canvasRect.width || mouseY < 0 || mouseY > canvasRect.height) {
        return;
    }
    
    // Преобразуем в координаты canvas с учетом масштабирования
    const canvasX = mouseX * (canvas.width / canvasRect.width);
    const canvasY = mouseY * (canvas.height / canvasRect.height);
    
    // Преобразуем в original-координаты
    const originalX = Math.max(0, Math.min(toOriginalX(canvasX), originalCanvas.width));
    const originalY = Math.max(0, Math.min(toOriginalY(canvasY), originalCanvas.height));
    
    // Обновляем точку в original-координатах
    cropPoints[draggedPointIndex] = { x: originalX, y: originalY };
    
    // Обновляем позицию точки в DOM (в пикселях относительно контейнера)
    const dot = document.querySelector(`.crop-point[data-point-index="${draggedPointIndex}"]`);
    if (dot) {
        dot.style.left = `${mouseX + offsetX}px`;
        dot.style.top = `${mouseY + offsetY}px`;
    }
    
    // Обновляем линии
    updateCropLines();
    
    // Обновляем отладочную информацию
    updateCropDebugInfo();
    
    console.log("Перетаскивание точки:", draggedPointIndex, "в позицию:", originalX, originalY);
}

function updateCropLines() {
    // Проверяем, что canvas существует
    if (!canvas) {
        console.error("Canvas не инициализирован");
        return;
    }
    
    // Удаляем все существующие линии
    document.querySelectorAll('.crop-preview-line').forEach(el => el.remove());
    
    const container = document.querySelector('.preview-container');
    if (!container) {
        console.error("Контейнер превью не найден");
        return;
    }
    
    // Получаем точное положение canvas внутри контейнера
    const canvasRect = canvas.getBoundingClientRect();
    const containerRect = container.getBoundingClientRect();
    
    // Смещение canvas относительно контейнера
    const offsetX = canvasRect.left - containerRect.left;
    const offsetY = canvasRect.top - containerRect.top;
    
    for (let i = 0; i < cropPoints.length; i++) {
        const nextIdx = (i + 1) % cropPoints.length;
        const line = document.createElement('div');
        line.className = 'crop-preview-line';
        
        // Преобразование координат из original в canvas
        const startCanvasX = toPreviewX(cropPoints[i].x);
        const startCanvasY = toPreviewY(cropPoints[i].y);
        const endCanvasX = toPreviewX(cropPoints[nextIdx].x);
        const endCanvasY = toPreviewY(cropPoints[nextIdx].y);
        
        // Преобразование координат canvas в пиксели DOM с учетом масштабирования и смещения
        const startX = startCanvasX * (canvasRect.width / canvas.width) + offsetX;
        const startY = startCanvasY * (canvasRect.height / canvas.height) + offsetY;
        const endX = endCanvasX * (canvasRect.width / canvas.width) + offsetX;
        const endY = endCanvasY * (canvasRect.height / canvas.height) + offsetY;
        
        // Расчёт параметров линии
        const dx = endX - startX;
        const dy = endY - startY;
        const length = Math.sqrt(dx**2 + dy**2);
        const angle = Math.atan2(dy, dx) * 180/Math.PI;
        
        // Позиционирование линии
        line.style.left = `${startX}px`;
        line.style.top = `${startY}px`;
        line.style.width = `${length}px`;
        line.style.transform = `rotate(${angle}deg)`;
        line.style.transformOrigin = '0 0';
        
        container.appendChild(line);
    }
}

function applyHomography() {
    const src = cropPoints.map(p => [p.x, p.y]);
    const dst = [
        [0, 0],
        [originalCanvas.width, 0],
        [originalCanvas.width, originalCanvas.height],
        [0, originalCanvas.height]
    ];

    // Нормализация координат
    const normalize = (points, size) => {
        const avg = points.reduce((acc, p) => [acc[0]+p[0], acc[1]+p[1]], [0,0])
            .map(v => v/points.length);
        const scale = Math.sqrt(points.reduce((acc, p) => 
            acc + Math.pow(p[0]-avg[0],2) + Math.pow(p[1]-avg[1],2), 0)/(2*points.length));
        return {
            points: points.map(p => [(p[0]-avg[0])/scale, (p[1]-avg[1])/scale]),
            T: [[1/scale, 0, -avg[0]/scale],
                [0, 1/scale, -avg[1]/scale],
                [0, 0, 1]]
        };
    };

    const normSrc = normalize(src);
    const normDst = normalize(dst);

    // Формирование матрицы A
    const A = [];
    for(let i = 0; i < 4; i++) {
        const x = normSrc.points[i][0];
        const y = normSrc.points[i][1];
        const u = normDst.points[i][0];
        const v = normDst.points[i][1];
        
        A.push(
            [-x, -y, -1, 0, 0, 0, x*u, y*u, u],
            [0, 0, 0, -x, -y, -1, x*v, y*v, v]
        );
    }

    // Решение методом SVD
    const U = numeric.svd(A).V;
    const H = U[U.length-1];
    
    // Денормализация
    const Hn = [[H[0], H[1], H[2]],
               [H[3], H[4], H[5]],
               [H[6], H[7], H[8]]];
    
    const Tinv = numeric.inv(normSrc.T);
    const Hfinal = numeric.dot(numeric.dot(normDst.T, Hn), Tinv);

    // Применение трансформации
    const tempCanvas = document.createElement('canvas');
    tempCanvas.width = originalCanvas.width;
    tempCanvas.height = originalCanvas.height;
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCtx.transform(
        Hfinal[0][0], Hfinal[1][0], Hfinal[0][1],
        Hfinal[1][1], Hfinal[0][2], Hfinal[1][2]
    );
    
    tempCtx.drawImage(originalCanvas, 0, 0);
    
    originalCanvas.width = tempCanvas.width;
    originalCanvas.height = tempCanvas.height;
    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    originalCtx.drawImage(tempCanvas, 0, 0);
    redrawScaledCanvas();
}


// Кнопка подтверждения
const confirmCropBtn = document.getElementById('confirmCrop');
if (confirmCropBtn) {
    confirmCropBtn.addEventListener('click', () => {
        saveState();
        applyCropAlternative();
        resetCropTool();
    });
}

// Альтернативная функция обрезки
function applyCropAlternative() {
    if (cropPoints.length !== 4) {
        console.error("Необходимо 4 точки для обрезки");
        return;
    }
    
    console.log("Применение альтернативной обрезки с точками:", cropPoints);
    
    // Находим минимальные и максимальные координаты для определения границ
    const minX = Math.min(...cropPoints.map(p => p.x));
    const minY = Math.min(...cropPoints.map(p => p.y));
    const maxX = Math.max(...cropPoints.map(p => p.x));
    const maxY = Math.max(...cropPoints.map(p => p.y));
    
    // Вычисляем размеры обрезанного изображения
    const width = maxX - minX;
    const height = maxY - minY;
    
    if (width <= 0 || height <= 0) {
        console.error("Некорректные размеры области обрезки:", width, height);
        return;
    }
    
    console.log("Размеры области обрезки:", width, height);
    
    // Создаем временный канвас для результата
    const resultCanvas = document.createElement('canvas');
    const resultCtx = resultCanvas.getContext('2d');
    resultCanvas.width = width;
    resultCanvas.height = height;
    
    // Рисуем только выбранную область
    resultCtx.drawImage(
        originalCanvas,
        minX, minY, width, height,
        0, 0, width, height
    );
    
    // Обновляем оригинальный канвас
    originalCanvas.width = width;
    originalCanvas.height = height;
    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    originalCtx.drawImage(resultCanvas, 0, 0);
    
    // Обновляем масштабирование
    scaleX = originalCanvas.width / canvas.width;
    scaleY = originalCanvas.height / canvas.height;
    
    // Перерисовываем превью
    redrawScaledCanvas();
    
    console.log("Альтернативная обрезка применена");
}

function resetCropTool() {
    const confirmCropBtn = document.getElementById('confirmCrop');
    if (confirmCropBtn) {
        confirmCropBtn.classList.add('hidden');
    }
    document.querySelectorAll('.crop-point, .crop-preview-line').forEach(el => el.remove());
    cropPoints = [];
    currentTool = 'brush'; // Возвращаемся к инструменту по умолчанию
    
    // Удаляем обработчики событий
    document.removeEventListener('mousemove', dragPoint);
    document.removeEventListener('mouseup', stopDragging);
    
    // Активируем кнопку кисти
    document.querySelectorAll('.tool-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.tool === 'brush');
    });
}

// Обработчики инструментов
function handleDrawing(e) {
    if(!isDrawing) return;
    
    const rect = canvas.getBoundingClientRect();
    const scaleX = originalCanvas.width / canvas.width;
    const scaleY = originalCanvas.height / canvas.height;

    const x = (e.clientX - rect.left) * scaleX;
    const y = (e.clientY - rect.top) * scaleY;

    if(currentTool === 'crop') {
        if(cropPoints.length < 4) {
            cropPoints.push({x, y});
            drawCropPreview();
        }
        
        if(cropPoints.length === 4) {
            applyCrop();
        }
    } else 
    
    if(currentTool === 'rect') {
        // Восстанавливаем предыдущее состояние для очистки предыдущего прямоугольника
        if(historyStep >= 0) {
            originalCtx.putImageData(history[historyStep], 0, 0);
        }
       
        originalCtx.beginPath();
        originalCtx.fillStyle = '#000000';
        originalCtx.fillRect(
            Math.min(lastXOrigin, x),
            Math.min(lastYOrigin, y),
            Math.abs(x - lastXOrigin),
            Math.abs(y - lastYOrigin)
        );

    } else {
        originalCtx.beginPath();
        originalCtx.lineWidth = document.getElementById('brushSize').value;
        originalCtx.lineCap = 'round';
        
        if(currentTool === 'brush') {
            originalCtx.globalCompositeOperation = 'source-over';
            originalCtx.strokeStyle = '#000000';
        } else if(currentTool === 'eraser') {
            originalCtx.globalCompositeOperation = 'destination-out';
        }
        
        originalCtx.moveTo(lastXOrigin, lastYOrigin);
        originalCtx.lineTo(x, y);
        originalCtx.stroke();

        [lastXOrigin, lastYOrigin] = [x, y];

    }
       // Синхронизируем изменения
       redrawScaledCanvas();

}

document.getElementById('brushSize').addEventListener('input', function() {
    ctx.lineWidth = this.value;
});

// Undo/Redo
document.querySelector('[data-tool="undo"]').addEventListener('click', () => {
    if(historyStep > 0) {
        historyStep--;
        //ctx.putImageData(history[historyStep], 0, 0);
        originalCtx.putImageData(history[historyStep], 0, 0);
        redrawScaledCanvas();
    }
});

document.querySelector('[data-tool="redo"]').addEventListener('click', () => {
    if(historyStep < history.length - 1) {
        historyStep++;
//        ctx.putImageData(history[historyStep], 0, 0);
        originalCtx.putImageData(history[historyStep], 0, 0);
        redrawScaledCanvas();

    }
});


// Новая функция для предпросмотра
function drawCropPreview() {
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    tempCanvas.width = originalCanvas.width;
    tempCanvas.height = originalCanvas.height;
    
    // Копируем оригинальное изображение
    tempCtx.drawImage(originalCanvas, 0, 0);
    
    // Рисуем линии выбора
    tempCtx.strokeStyle = '#ff0000';
    tempCtx.lineWidth = 2;
    
    if(cropPoints.length > 1) {
        tempCtx.beginPath();
        tempCtx.moveTo(cropPoints[0].x, cropPoints[0].y);
        for(let i = 1; i < cropPoints.length; i++) {
            tempCtx.lineTo(cropPoints[i].x, cropPoints[i].y);
        }
        tempCtx.closePath();
        tempCtx.stroke();
    }
    
    // Рисуем точки
    cropPoints.forEach(point => {
        tempCtx.beginPath();
        tempCtx.arc(point.x, point.y, 5, 0, Math.PI * 2);
        tempCtx.fillStyle = '#ff0000';
        tempCtx.fill();
    });

    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    originalCtx.drawImage(tempCanvas, 0, 0);
    redrawScaledCanvas();
}

// Функция применения обрезки
function applyCrop() {
    if (cropPoints.length !== 4) {
        console.error("Необходимо 4 точки для обрезки");
        return;
    }
    
    console.log("Применение обрезки с точками:", cropPoints);
    
    // Находим минимальные и максимальные координаты для определения границ
    const minX = Math.min(...cropPoints.map(p => p.x));
    const minY = Math.min(...cropPoints.map(p => p.y));
    const maxX = Math.max(...cropPoints.map(p => p.x));
    const maxY = Math.max(...cropPoints.map(p => p.y));
    
    // Создаем временный канвас для обрезанного изображения
    const tempCanvas = document.createElement('canvas');
    const tempCtx = tempCanvas.getContext('2d');
    
    // Устанавливаем размеры временного канваса
    tempCanvas.width = originalCanvas.width;
    tempCanvas.height = originalCanvas.height;
    
    // Рисуем оригинальное изображение
    tempCtx.drawImage(originalCanvas, 0, 0);
    
    // Создаем путь для обрезки
    tempCtx.beginPath();
    tempCtx.moveTo(cropPoints[0].x, cropPoints[0].y);
    for (let i = 1; i < cropPoints.length; i++) {
        tempCtx.lineTo(cropPoints[i].x, cropPoints[i].y);
    }
    tempCtx.closePath();
    
    // Создаем второй временный канвас для результата
    const resultCanvas = document.createElement('canvas');
    const resultCtx = resultCanvas.getContext('2d');
    resultCanvas.width = originalCanvas.width;
    resultCanvas.height = originalCanvas.height;
    
    // Применяем обрезку
    resultCtx.save();
    resultCtx.beginPath();
    resultCtx.moveTo(cropPoints[0].x, cropPoints[0].y);
    for (let i = 1; i < cropPoints.length; i++) {
        resultCtx.lineTo(cropPoints[i].x, cropPoints[i].y);
    }
    resultCtx.closePath();
    resultCtx.clip();
    resultCtx.drawImage(tempCanvas, 0, 0);
    resultCtx.restore();
    
    // Обновляем оригинальный канвас
    originalCtx.clearRect(0, 0, originalCanvas.width, originalCanvas.height);
    originalCtx.drawImage(resultCanvas, 0, 0);
    
    // Перерисовываем превью
    redrawScaledCanvas();
    
    console.log("Обрезка применена");
}


function setupImageZoom() {
    const preview = document.getElementById('previewCanvas');
    const lens = document.querySelector('.zoom-lens');
    const result = document.querySelector('.zoom-result');
    
    // Создаем canvas для увеличенного изображения
    const zoomCanvas = document.createElement('canvas');
    const zoomCtx = zoomCanvas.getContext('2d');
    
    // Устанавливаем размеры для увеличенного canvas
    const zoomLevel = 4;
    const lensSize = 100;
    const resultSize = lensSize * 4;
    
    zoomCanvas.width = resultSize;
    zoomCanvas.height = resultSize;
    
    result.style.width = `${resultSize}px`;
    result.style.height = `${resultSize}px`;
    
    preview.addEventListener('mousemove', (e) => {
        if(!zoomEnabled /*|| !imgCanvas*/) return;

        const rect = preview.getBoundingClientRect();
        const scaleX = preview.width / rect.width;
        const scaleY = preview.height / rect.height;

        const scaleXToOrigin = originalCanvas.width / canvas.width;
        const scaleYToOrigin = originalCanvas.height / canvas.height;
    
        const x = (e.clientX - rect.left) * scaleX;
        const y = (e.clientY - rect.top) * scaleY;
            
        const xOrigin = (e.clientX - rect.left) * scaleXToOrigin;
        const yOrigin = (e.clientY - rect.top) * scaleYToOrigin;
    

        // Получаем координаты мыши относительно canvas
        const mouseX = (e.clientX - rect.left) * scaleX;
        const mouseY = (e.clientY - rect.top) * scaleY;

        const mouseXOrigin = (e.clientX - rect.left) * scaleXToOrigin;
        const mouseYOrigin = (e.clientY - rect.top) * scaleYToOrigin;
        


        // Позиционируем линзу
        const lensLeft = e.clientX - rect.left - lensSize/2;
        const lensTop = e.clientY - rect.top + lensSize/2;
        
        lens.style.left = `${Math.max(0, Math.min(lensLeft, rect.width ))}px`;
        lens.style.top = `${Math.max(0, Math.min(lensTop, rect.height ))}px`;
        lens.style.width = `${lensSize}px`;
        lens.style.height = `${lensSize}px`;
        lens.style.display = 'block';
        
        // Позиционируем результат увеличения справа от canvas
        const previewRect = preview.getBoundingClientRect();
        result.style.left = `${/*previewRect.left +*/ preview.width + 20}px`;
        result.style.top =  `${previewRect.top}px`;
        result.style.display = 'block';
        
        // Очищаем zoom canvas
        zoomCtx.clearRect(0, 0, resultSize, resultSize);
        
        // Вычисляем область для увеличения
        const sourceX = Math.max(0, Math.min(mouseX - lensSize/2 * scaleX, preview.width - lensSize * scaleX));
        const sourceY = Math.max(0, Math.min(mouseY - lensSize/2 * scaleY, preview.height - lensSize * scaleY));
        const sourceXOrigin = (e.clientX - rect.left) * scaleXToOrigin;
        const sourceYOrigin = (e.clientY - rect.top) * scaleYToOrigin;

        const sourceWidth = lensSize * scaleXToOrigin;
        const sourceHeight = lensSize * scaleYToOrigin;
        
        // Рисуем увеличенное изображение
        zoomCtx.drawImage(
            originalCanvas,
            sourceXOrigin, sourceYOrigin,
            sourceWidth, sourceHeight,
            0, 0,
            resultSize, resultSize
        );
        
        // Обновляем содержимое result div
        result.style.backgroundImage = `url(${zoomCanvas.toDataURL()})`;
    });

    preview.addEventListener('mouseleave', () => {
        lens.style.display = 'none';
        result.style.display = 'none';
    });
}

function loadSettingsToUI() {
    const settings = loadSettings();
    
    document.getElementById('apiKey').value = settings.apiKey;
    document.getElementById('apiEndpoint').value = settings.endpoint;
    document.getElementById('apiModel').value = settings.model;
    document.getElementById('apiTemp').value = settings.temp;
    document.getElementById('apiPrompt').value = settings.prompt;
    document.getElementById('ocrServerUrl').value = settings.ocrServerUrl;
    document.getElementById('ocrEngine').value = settings.ocrEngine;
    document.getElementById('manualOcrInput').checked = settings.manualOcrInput;
}

function loadSettings() {
    const settings = {};
    
    // Загружаем все настройки с дефолтными значениями
    Object.entries(DEFAULT_SETTINGS).forEach(([key, defaultValue]) => {
        const storedValue = localStorage.getItem(`med-analyzer-${key}`);
        if (storedValue === null) {
            settings[key] = defaultValue;
        } else {
            try {
                // Пробуем распарсить как JSON
                settings[key] = JSON.parse(storedValue);
            } catch {
                // Если не получилось, используем как строку
                settings[key] = storedValue;
            }
        }
    });
    
    return settings;
}

function toggleSettings() {
    const modal = document.getElementById('settingsModal');
    const settings = loadSettings();
    
    document.getElementById('apiKey').value = settings.apiKey;
    document.getElementById('apiEndpoint').value = settings.endpoint;
    document.getElementById('apiModel').value = settings.model;
    document.getElementById('apiTemp').value = settings.temp;
    document.getElementById('apiPrompt').value = settings.prompt;
    
    // Заполняем новые поля настроек OCR
    document.getElementById('ocrServerUrl').value = settings.ocrServerUrl;
    
    // Очищаем и заполняем список движков OCR
    const ocrEngineSelect = document.getElementById('ocrEngine');
    ocrEngineSelect.innerHTML = '<option value="tesseract.js">tesseract.js (локальный)</option>';
    
    // Добавляем доступные движки из настроек
    settings.availableOcrEngines.forEach(engine => {
        if (engine !== 'tesseract.js') {
            const option = document.createElement('option');
            option.value = engine;
            option.textContent = engine;
            ocrEngineSelect.appendChild(option);
        }
    });
    
    // Устанавливаем выбранный движок
    ocrEngineSelect.value = settings.ocrEngine;
    
    // Устанавливаем флажок ручного ввода
    document.getElementById('manualOcrInput').checked = settings.manualOcrInput;
    
    modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
    
    // Добавляем обработчик для кнопки обновления списка движков
    document.getElementById('refreshOcrEngines').addEventListener('click', fetchOcrEngines);
}

function saveSettings() {
    localStorage.setItem('med-analyzer-apiKey', document.getElementById('apiKey').value);
    localStorage.setItem('med-analyzer-endpoint', document.getElementById('apiEndpoint').value);
    localStorage.setItem('med-analyzer-model', document.getElementById('apiModel').value);
    localStorage.setItem('med-analyzer-temp', document.getElementById('apiTemp').value);
    localStorage.setItem('med-analyzer-prompt', document.getElementById('apiPrompt').value);
    localStorage.setItem('med-analyzer-ocrServerUrl', document.getElementById('ocrServerUrl').value);
    localStorage.setItem('med-analyzer-ocrEngine', document.getElementById('ocrEngine').value);
    localStorage.setItem('med-analyzer-manualOcrInput', document.getElementById('manualOcrInput').checked);
    
    toggleSettings();
}

// Функция для получения списка доступных OCR движков с сервера
async function fetchOcrEngines() {
    const settings = loadSettings();
    const ocrServerUrl = document.getElementById('ocrServerUrl').value || settings.ocrServerUrl;
    
    if (!ocrServerUrl) {
        alert('Укажите URL сервера OCR');
        return;
    }
    
    try {
        const response = await fetch(`${ocrServerUrl}/GetOcrList`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const data = await response.json();
        console.log('Получен список OCR движков:', data);
        
        if (data.available_engines && Array.isArray(data.available_engines)) {
            // Сохраняем список движков в localStorage
            const engines = ['tesseract.js', ...data.available_engines];
            localStorage.setItem('med-analyzer-availableOcrEngines', JSON.stringify(engines));
            
            // Обновляем выпадающий список
            const ocrEngineSelect = document.getElementById('ocrEngine');
            ocrEngineSelect.innerHTML = '<option value="tesseract.js">tesseract.js (локальный)</option>';
            
            data.available_engines.forEach(engine => {
                const option = document.createElement('option');
                option.value = engine;
                option.textContent = engine;
                ocrEngineSelect.appendChild(option);
            });
            
            console.log(`Список OCR движков обновлен. Доступно: ${engines.join(', ')}`);
        } else {
            throw new Error('Неверный формат ответа от сервера');
        }
    } catch (error) {
        console.error('Ошибка при получении списка OCR движков:', error);
        alert(`Не удалось получить список OCR движков: ${error.message}. Будет использован только tesseract.js`);
    }
}

// Функция для показа модального окна ручного ввода текста
function showManualTextInput() {
    return new Promise((resolve, reject) => {
        const modal = document.getElementById('manualTextModal');
        const textInput = document.getElementById('manualTextInput');
        
        // Очищаем поле ввода
        textInput.value = '';
        
        // Показываем модальное окно
        modal.style.display = 'flex';
        
        // Устанавливаем фокус на поле ввода
        textInput.focus();
        
        // Обработчики кнопок
        const confirmBtn = document.getElementById('confirmManualText');
        const cancelBtn = document.getElementById('cancelManualText');
        
        const confirmHandler = () => {
            const text = textInput.value.trim();
            if (text) {
                modal.style.display = 'none';
                cleanup();
                resolve(text);
            } else {
                alert('Введите текст для анализа');
            }
        };
        
        const cancelHandler = () => {
            modal.style.display = 'none';
            cleanup();
            reject(new Error('Ввод текста отменен'));
        };
        
        const cleanup = () => {
            confirmBtn.removeEventListener('click', confirmHandler);
            cancelBtn.removeEventListener('click', cancelHandler);
        };
        
        confirmBtn.addEventListener('click', confirmHandler);
        cancelBtn.addEventListener('click', cancelHandler);
    });
}

// Модифицированная функция для выполнения OCR
async function performOCR() {
    if (!canvas) throw new Error('Изображение не загружено');
    
    const settings = loadSettings();
    const selectedEngine = settings.ocrEngine;
    
    try {
        // Получаем отредактированное изображение с canvas
        const imageData = originalCanvas.toDataURL('image/jpeg', 0.8);
        
        // Если выбран локальный tesseract.js
        if (selectedEngine === 'tesseract.js') {
            console.log('Используется локальный tesseract.js для OCR');
            
            const worker = await Tesseract.createWorker({
                logger: progress => {
                    console.log('OCR Progress:', progress);
                }
            });
            
            await worker.load();
            await worker.loadLanguage('rus+eng');
            await worker.initialize('rus+eng');
            await worker.setParameters({
                tessedit_char_whitelist: '0123456789.,абвгдеёжзийклмнопрстуфхцчшщъыьэюяАБВГДЕЁЖЗИЙКЛМНОПРСТУФХЦЧШЩЪЫЬЭЮЯabcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ/% '
            });
            
            const { data: { text } } = await worker.recognize(imageData);
            await worker.terminate();
            
            console.log('Распознанный текст (tesseract.js):', text);
            return text;
        } 
        // Если выбран серверный OCR движок
        else {
            console.log(`Используется серверный OCR движок: ${selectedEngine}`);
            
            // Извлекаем base64 данные из Data URL
            const base64Image = imageData.split(',')[1];
            
            const response = await fetch(`${settings.ocrServerUrl}/GetOcr`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Accept': 'application/json'
                },
                body: JSON.stringify({
                    file: base64Image,
                    engine: selectedEngine
                })
            });
            
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            
            const data = await response.json();
            console.log('Результат серверного OCR:', data);
            
            if (data.result && data.result.text) {
                return data.result.text;
            } else {
                throw new Error('Неверный формат ответа от OCR сервера');
            }
        }
    } catch (error) {
        console.error('OCR error:', error);
        throw new Error('Ошибка распознавания текста: ' + error.message);
    }
}

// Функция для обработки изображения в режиме LLM
async function processImageForLLM() {
    if (!canvas) {
        throw new Error('Изображение не загружено');
    }
    
    try {
        // Получаем base64 изображения с originalCanvas
        const imageData = originalCanvas.toDataURL('image/jpeg', 0.8);
        console.log('Изображение подготовлено для LLM');
        return imageData;
    } catch (error) {
        console.error('Ошибка при подготовке изображения:', error);
        throw new Error('Не удалось подготовить изображение для обработки');
    }
}

// Модифицированная функция для запуска обработки
async function startProcessing() {
    const loader = document.getElementById('loader');
    loader.style.display = 'block';
    
    try {
        let result;
        const settings = loadSettings();
        
        if (currentMode === 'ocr+llm') {
            // Режим OCR + LLM
            const ocrText = await performOCR();
            result = await processWithLLM(ocrText);
        } else {
            // Режим только LLM
            if (settings.manualOcrInput) {
                // Если включен ручной ввод текста
                try {
                    const manualText = await showManualTextInput();
                    result = await processWithLLM(manualText, true);
                } catch (error) {
                    console.log('Ручной ввод текста отменен');
                    loader.style.display = 'none';
                    return; // Прерываем обработку
                }
            } else {
                // Стандартный режим с изображением
                const processedImage = await processImageForLLM();
                result = await processWithLLM(processedImage);
            }
        }
        
        tableData = result;
        switchTab('editTab');
        renderTable();
    } catch (error) {
        alert(`Ошибка обработки: ${error.message}`);
    } finally {
        loader.style.display = 'none';
    }
}

// Функция для обработки с помощью LLM
async function processWithLLM(input, isManualText = false) {
    const settings = loadSettings();
    if(!settings.apiKey) throw new Error('API key не настроен!');

    const formData = new FormData();
    formData.append('model', settings.model);
    formData.append('temp', settings.temp.toString());
    formData.append('content', settings.prompt);

    if (currentMode === 'llm-only' && !isManualText) {
        // Режим только LLM с изображением
        // Убираем префикс data:image/jpeg;base64, из строки
        const base64Image = input.replace(/^data:image\/[a-z]+;base64,/, '');
        formData.append('image', base64Image);
    } else {
        // Режим OCR+LLM или ручной ввод текста
        formData.append('content', `${settings.prompt}\n\nРаспознанный текст: ${input}`);
    }

    try {
        const response = await fetch(`${settings.endpoint}/process`, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${settings.apiKey}`
            },
            body: formData
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        console.log('LLM Response:', data);

        // Получаем текущую дату
        const currentDate = new Date().toISOString().split('T')[0];

        // Преобразуем ответ в формат таблицы
        return [{
            date: currentDate,
            test: "Результат анализа крови",
            params: data.indicators.map(indicator => ({
                param: indicator.Название,
                value: indicator.Значение,
                unit: indicator["Ед. Измерения"]
            })),
            recommendations: ""
        }];
    } catch (error) {
        console.error('Error in processWithLLM:', error);
        throw error;
    }
}

function renderTable2() {
    const tbody = document.querySelector('#dataTable tbody');
    tbody.innerHTML = '';

    tableData.forEach((item, index) => {
        const row = document.createElement('tr');
        
        ['param', 'value', 'unit'].forEach(field => {
            const cell = document.createElement('td');
            const input = document.createElement('input');
            input.value = item[field];
            input.addEventListener('input', e => {
                tableData[index][field] = e.target.value;
            });
            cell.appendChild(input);
            row.appendChild(cell);
        });

        const actionCell = document.createElement('td');
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'Удалить';
        deleteBtn.onclick = () => deleteRow(index);
        actionCell.appendChild(deleteBtn);
        row.appendChild(actionCell);

        tbody.appendChild(row);
    });
}

function addRow() {
    tableData.push({param: '', value: '', unit: ''});
    renderTable();
}

function deleteRow(index) {
    tableData.splice(index, 1);
    renderTable();
}

function switchTab(tabId) {
    document.querySelectorAll('.tab-content').forEach(tab => {
        tab.classList.remove('active');
        tab.style.display = 'none';
    });
    
    document.querySelectorAll('.tab-button').forEach(btn => {
        btn.classList.remove('active');
    });

    const activeTab = document.getElementById(tabId);
    activeTab.classList.add('active');
    activeTab.style.display = 'block';
    document.querySelector(`button[onclick="switchTab('${tabId}')"]`).classList.add('active');

    if(tabId === 'uploadTab') {
        document.getElementById('previewCanvas').src = '#';
        document.getElementById('imageInput').value = '';
    } else {
        zoomEnabled = false;
    }
}

function exportData() {
    const json = JSON.stringify(tableData, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'medical-data.json';
    a.click();
    URL.revokeObjectURL(url);
}

function exportImage() {

        const link = document.createElement('a');
        const timestamp = new Date().toISOString().slice(0,19);
        
        // // Диалог выбора формата
        // const format1 = confirm('Использовать JPG (меньше качество - меньше размер)?') 
        //     ? 'jpeg' 
        //     : 'png';
        
        const format = 'jpeg';

        // Настройки экспорта
        link.download = `medical_report_${timestamp}.${format}`;
        link.href = originalCanvas.toDataURL(
            `image/${format}`, 
            format === 'jpeg' ? 0.9 : 1.0
        );
        
        link.click();

}


// Перевод координат previewCanvas -> originalCanvas
function toOriginalX(x) {
    return x * (originalCanvas.width / canvas.width);
}

function toOriginalY(y) {
    return y * (originalCanvas.height / canvas.height);
}

// Перевод координат originalCanvas -> previewCanvas
function toPreviewX(x) {
    return x / (originalCanvas.width / canvas.width);
}

function toPreviewY(y) {
    return y / (originalCanvas.height / canvas.height);
}

// Функция для обновления отладочной информации
function updateCropDebugInfo() {
    const debugPanel = document.getElementById('cropDebugInfo');
    const pointsInfo = document.getElementById('cropPointsInfo');
    
    if (!debugPanel || !pointsInfo) return;
    
    if (currentTool === 'crop' && cropPoints.length > 0) {
        debugPanel.style.display = 'block';
        
        let infoText = '';
        cropPoints.forEach((point, index) => {
            const previewX = toPreviewX(point.x).toFixed(1);
            const previewY = toPreviewY(point.y).toFixed(1);
            infoText += `Точка ${index}: orig(${point.x.toFixed(1)}, ${point.y.toFixed(1)}) ` +
                        `prev(${previewX}, ${previewY})\n`;
        });
        
        // Добавляем информацию о текущем положении мыши
        const mouseInfo = document.getElementById('mouseCoordinates');
        if (mouseInfo) {
            const mouseText = mouseInfo.textContent;
            infoText = mouseText + '\n\n' + infoText;
        }
        
        pointsInfo.textContent = infoText;
    } else {
        debugPanel.style.display = 'none';
    }
}

// Функция для переключения режима обработки
function setMode(mode) {
    currentMode = mode;
    
    // Обновляем активную кнопку
    document.querySelectorAll('.toggle-option').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.mode === mode);
    });
    
    console.log(`Режим обработки изменен на: ${mode}`);
    
    // Проверяем, нужно ли показать предупреждение о ручном вводе
    const settings = loadSettings();
    if (mode === 'llm-only' && settings.manualOcrInput) {
        console.log('Включен режим ручного ввода текста для LLM');
    }
}

// Функция для загрузки списка доступных моделей через агента
async function fetchModels() {
    const settings = loadSettings();
    const endpoint = document.getElementById('apiEndpoint').value || settings.endpoint;
    
    if (!endpoint) {
        alert('Укажите endpoint API');
        return;
    }
    
    try {
        const response = await fetch(`${endpoint}/models`);
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const models = await response.json();
        console.log('Получен список моделей:', models);
        
        // Обновляем выпадающий список
        const modelSelect = document.getElementById('apiModel');
        modelSelect.innerHTML = '';
        
        models.forEach(model => {
            const option = document.createElement('option');
            option.value = model;
            option.textContent = model;
            modelSelect.appendChild(option);
        });
        
        // Восстанавливаем выбранную модель из настроек
        if (settings.model) {
            modelSelect.value = settings.model;
        }
        
    } catch (error) {
        console.error('Ошибка при получении списка моделей:', error);
        alert(`Не удалось получить список моделей: ${error.message}`);
    }
}

// Функция для экспорта настроек в файл
function exportSettingsToFile() {
    const settings = loadSettings();
    const settingsJson = JSON.stringify(settings, null, 2);
    const blob = new Blob([settingsJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement('a');
    a.href = url;
    a.download = 'med-analyzer-settings.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

// Функция для импорта настроек из файла
function importSettingsFromFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            const importedSettings = JSON.parse(e.target.result);
            
            // Объединяем импортированные настройки с дефолтными
            const mergedSettings = { ...DEFAULT_SETTINGS, ...importedSettings };
            
            // Сохраняем все настройки
            Object.entries(mergedSettings).forEach(([key, value]) => {
                localStorage.setItem(`med-analyzer-${key}`, typeof value === 'string' ? value : JSON.stringify(value));
            });
            
            // Обновляем интерфейс
            loadSettingsToUI();
            alert('Настройки успешно импортированы');
            
        } catch (error) {
            console.error('Ошибка при импорте настроек:', error);
            alert('Ошибка при импорте настроек. Проверьте формат файла.');
        }
    };
    
    reader.readAsText(file);
}

// Функция для работы с агентом
async function callAgent(endpoint, action, data = null) {
    try {
        const response = await fetch(`${endpoint}/agent`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Accept': 'application/json'
            },
            body: JSON.stringify({
                action: action,
                data: data
            })
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('Ошибка при вызове агента:', error);
        throw error;
    }
}
