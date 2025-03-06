# Парсер медицинских сканов результатов анализа крови

Веб-приложение для анализа изображений анализов крови с использованием OCR и LLM технологий.

### Видео-демонстрация
[![Демонстрация работы приложения](https://img.youtube.com/vi/UR6hrt70veQ/0.jpg)](https://youtu.be/UR6hrt70veQ)

## Основные возможности

### Обработка изображений
- Загрузка изображений через drag-and-drop или выбор файла
- Инструменты редактирования:
  - Карандаш для рисования пометок
  - Ластик для удаления пометок
  - Прямоугольник для выделения областей
  - Лупа для детального просмотра
  - Обрезка изображения с помощью 4 точек (перспективная коррекция)
- Регулировка размера кисти
- Отмена/возврат действий
- Экспорт обработанного изображения

### Режимы работы
1. OCR + LLM
   - Распознавание текста с изображения
   - Анализ распознанного текста с помощью LLM
2. Только LLM
   - Прямой анализ изображения с помощью LLM
   - Возможность ручного ввода текста

### Работа с результатами
- Табличное представление результатов
- Редактирование данных в таблице
- Добавление новых тестов
- Экспорт данных в JSON формат

### Настройки
- Конфигурация API ключей
- Выбор модели LLM
- Настройка температуры генерации (0.0 - 1.0)
- Настройка промпта для анализа
- Выбор OCR движка
- Импорт/экспорт настроек

## Интеграция с сервисами

Приложение использует endpoints следующих сервисов:

- OCR Сервер: [@multi-ocr-server](https://github.com/UlianaDzhumok/multi-ocr-server)
  - Поддержка множественных OCR движков
  - Высокая точность распознавания текста
  - Оптимизация для медицинских документов

- LLM Сервер: [@Ollama-server](https://github.com/dronzhin/Ollama-server)
  - Поддержка различных LLM моделей
  - Эффективная обработка текста и изображений
  - Гибкая настройка параметров генерации

## Технические требования

### Браузер
- Chrome/Firefox/Safari последних версий
- Поддержка HTML5 Canvas
- Поддержка JavaScript ES6+

### Серверная часть
- Работающий OCR сервер
- Работающий LLM сервер
- Доступ к API серверов

## Установка и запуск

1. Клонируйте репозиторий
2. Настройте параметры подключения к серверам OCR и LLM в настройках приложения
3. Откройте `index.html` в браузере

## Рекомендации по использованию

1. Перед началом работы проверьте подключение к серверам OCR и LLM
2. Настройте промпт под ваши задачи анализа
3. При работе с изображениями:
   - Используйте инструмент обрезки для фокусировки на нужной области
   - Применяйте лупу для проверки мелких деталей
   - Используйте карандаш для выделения важных участков

## Лицензия

MIT License


## Структура файлов

```
├── index.html          # Основной HTML файл
├── app.js             # JavaScript логика приложения
├── styles.css         # CSS стили
└── README.md          # Документация
```



