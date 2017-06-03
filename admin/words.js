systemDictionary = {
    "OpenZWave adapter settings": {
        "en": "OpenZWave adapter settings",
        "de": "OpenZWave Adapter-Einstellungen",
        "ru": "Настройки драйвера OpenZWave"
    },
    "Force objects re-init:": {
        "en": "Synchronize objects (once):",
        "de": "Synchronisiere Geräte neu (einmalig):",
        "ru": "Синхронизировать объекты (один раз):"
    },
    "USB name:": {
        "en": "USB name:",
        "de": "USB Device Name:",
        "ru": "Название USB устройства:"
    },
    "Logging:": {
        "en": "Logging:",
        "de": "Logdatei schreiben:",
        "ru": "Протоколировать:"
    },
    "Console Output:": {
        "en": "Console Output:",
        "de": "Ausgabe in iobroker.log:",
        "ru": "Вывод в iobroker.log:"
    },
    "Save Config:": {
        "en": "Save Config:",
        "de": "Konfiguration speichern:",
        "ru": "Сохранить конфигурацию:"
    },
    "Driver Attempts:": {
        "en": "Driver Attempts:",
        "de": "Anzahl Versuche:",
        "ru": "Количество попыток:"
    },
    "Poll Interval:": {
        "en": "Poll Interval:",
        "de": "Intervall der Abfragen:",
        "ru": "Интервал опроса:"
    },
    "Suppress Refresh:": {
        "en": "Suppress Refresh:",
        "de": "Neuladen verhindern:",
        "ru": "Не обновлять:"
    },
    "Options":          {"en": "Options",               "de": "Einstellungen",      "ru": "Настройки"},
    "Devices":          {"en": "Devices",               "de": "Geräte",             "ru": "Устройства"},
    "Add node":         {"en": "Add node",              "de": "Gerät hinzufügen",   "ru": "Добавить устройство"},
    "Remove node":      {"en": "Remove node",           "de": "Gerät löschen",      "ru": "Удалить устройство"},
    "Heal network":     {"en": "Heal network",          "de": "Netzwerk heilen",    "ru": "Вылечить сеть"},
    "Get neighbors":    {"en": "Get neighbors",         "de": "Finde Nachbarn",     "ru": "Найти соседние"},
    "Soft reset":       {"en": "Soft reset",            "de": "Soft-Reset",         "ru": "Soft reset"},
    "Hard reset":       {"en": "Hard reset",            "de": "Hard-Reset",         "ru": "Hard reset"},
    "ID":               {"en": "ID",                    "de": "ID",                 "ru": "ID"},
    "Manufacturer":     {"en": "Manufacturer",          "de": "Manufacturer",       "ru": "Производитель"},
    "Product":          {"en": "Product",               "de": "Produkt",            "ru": "Продукт"},
    "Type":             {"en": "Type",                  "de": "Typ",                "ru": "Тип"},
    "Last":             {"en": "Last",                  "de": "Letzte",             "ru": "Last"},
    "Status":           {"en": "Status",                "de": "Zustand",            "ru": "Состояние"},
    "ready":            {"en": "ready",                 "de": "Bereit",             "ru": "готов к использованию"},
    "alive":            {"en": "alive",                 "de": "Aktiv/Alive",        "ru": "живой"},
    "sleep":            {"en": "sleep",                 "de": "Schläft",            "ru": "спит"},
    "Select port":      {"en": "Select port",           "de": "Auswählen",          "ru": "выбрать порт"},
    "First save settings": {
        "en": "First save settings",
        "de": "Die Einstellungen müssen gespeichert werden",
        "ru": "Сначала сохраните настройки"
    },
    "Ok":                   {"en": "Ok",                    "de": "Ok",                 "ru": "Ok"},
    "replaceFailedNode":    {"en": "Reaplace failed",       "de": "Reaplace failed",    "ru": "Reaplace failed"},
    "Select operation":     {"en": "Select operation",      "de": "Auswählen",          "ru": "выберите"},
    "refreshNodeInfo":      {"en": "Refresh info",          "de": "Update Info",        "ru": "Обновить инфо"},
    "removeFailedNode":     {"en": "Remove failed",         "de": "Löschen fehlgeschlagen",     "ru": "Удалить не удалось"},
    "requestNodeNeighborUpdate":  {"en": "Neighbor update", "de": "Nachbar-Update",     "ru": "Обновление соединений"},
    "assignReturnRoute":    {"en": "Assign return route",   "de": "Rückgabeweg zuweisen",       "ru": "Назначить обратный маршрут"},
    "deleteAllReturnRoutes": {"en": "Delete all routes",    "de": "Löschen aller Routierungen", "ru": "Удалить все маршруты"},
    "requestNetworkUpdate": {"en": "Network update",        "de": "Netzwerkaktualisierung",     "ru": "Сетевое обновление"},
    "replicationSend":      {"en": "Replication",           "de": "Replikation",        "ru": "Копирование"},
    "setName":              {"en": "Set name",              "de": "Namen festlegen",    "ru": "Задать имя"},
    "setLocation":          {"en": "Set location",          "de": "Ort festlegen",      "ru": "Задать локацию"},
    "createButton":         {"en": "Create button",         "de": "Taste erstellen",    "ru": "Создать кнопку"},
    "deleteButton":         {"en": "Delete button",         "de": "Taste löschen",      "ru": "Удалить кнопку"},
    "buttonID":             {
        "en": "Please enter button ID:",
        "de": "Bitte Button ID eingeben:",
        "ru": "Введите пожалуйста ID кнопки"
    },
    "name":             {
        "en": "Please enter node name:",
        "de": "Bitte Gerätename eingeben:",
        "ru": "Введите пожалуйста имя устройства:"
    },
    "location":             {
        "en": "Please enter node location:",
        "de": "Bitte Raum eingeben:",
        "ru": "Введите пожалуйста комнату для устройства:"
    }
};

var ctrlState = [
    /*0: */ {'en': 'No command in progress',    'de': 'Kein Befehl in Bearbeitung',     'ru': 'Нет команды в процессе'},
    /*1: */ {'en': 'The command is starting',   'de': 'Der Befehl wird gestartet',    'ru': 'Команда запускается'},
    /*2: */ {'en': 'The command was cancelled', 'de': 'Der Befehl wurde abgebrochen',  'ru': 'Команда была отменена'},
    /*3: */ {'en': 'Command invocation had error(s) and was aborted',
        'de': 'Befehl hatte Fehler und wurde abgebrochen',
        'ru': 'Команда вызова содержит ошибку и была прервана'
    },
    /*4: */ {'en': 'Controller is waiting for a user action',
        'de': 'Controller wartet auf eine Benutzeraktion',
        'ru': 'Контроллер ожидает действий пользователя'
    },
    /*5: */ {'en': 'Controller command is on a sleep queue wait for device',
        'de': 'Controller-Befehl befindet sich in der Warteschlange und wartet auf Gerät',
        'ru': 'Команда контроллера находится в очереди'
    },
    /*6: */ {'en': 'The controller is communicating with the other device to carry out the command',
        'de': 'Der Controller kommuniziert mit dem anderen Gerät um den Befehl auszuführen',
        'ru': 'Контроллер обменивается данными с другим устройством, чтобы выполнить команду'
    },
    /*7: */ {'en': 'The command has completed successfully',
        'de': 'Der Befehl wurde erfolgreich abgeschlossen',
        'ru': 'Команда успешно завершена'
    },
    /*8: */ {'en': 'The command has failed',    'de': 'The command has failed', 'ru': 'The command has failed'},
    /*9: */ {'en': 'The controller thinks the node is OK',
        'de': 'Der Controller denkt das der Knoten OK ist',
        'ru': 'Контроллер считает, что узел в норме'
    },
    /*10:*/ {'en': 'The controller thinks the node has failed',
        'de': 'Der Controller denkt das der Knoten ausgefallen ist',
        'ru': 'Контроллер считает, что узел упал'
    },
    {}, // 11
    {}, // 12
    {}, // 13
    {}, // 14
    {   'en': 'Continue to remove devices',
        'de': 'weitere Geräte löschen',
        'ru': 'Удаление можно продолжить'}
    , // 15
    {   'en': 'Continue to add devices',
        'de': 'weitere Geräte hinzufügen',
        'ru': 'Добавление можно продолжить'}
];

var ctrlError = [
    /*0:*/  {'en': 'No error',         'de': 'Kein Fehler',         'ru': 'Без ошибок'},
    /*1*/   {'en': 'ButtonNotFound',   'de': 'Tasternichtgefunden', 'ru': 'Кнопка не найдена'},
    /*2:*/  {'en': 'NodeNotFound',     'de': 'Knotennichtgefunden', 'ru': 'Узел не найден'},
    /*3:*/  {'en': 'NotBridge',        'de': 'KeineBrücke',         'ru': 'Нет моста'},
    /*4:*/  {'en': 'NotSUC',           'de': 'KeinSUC',             'ru': 'Нет SUC'},
    /*5:*/  {'en': 'NotSecondary',     'de': 'NichtSekundär',       'ru': 'Нет второстепенного узла'},
    /*6:*/  {'en': 'NotPrimary',       'de': 'NichtPrimär',         'ru': 'Нет главного узла'},
    /*7:*/  {'en': 'IsPrimary',        'de': 'IstPrimärr',          'ru': 'Главный'},
    /*8:*/  {'en': 'NotFound',         'de': 'Nichtgefunden',       'ru': 'Не найден'},
    /*9:*/  {'en': 'Busy',             'de': 'Beschäftigt',         'ru': 'Занят'},
    /*10:*/ {'en': 'Failed',           'de': 'Gescheitert',         'ru': 'Неудачный'},
    /*11:*/ {'en': 'Disabled',         'de': 'deaktiviert',         'ru': 'Отключен'},
    /*12:*/ {'en': 'Overflow',         'de': 'Überlauf',            'ru': 'Переполнение'}
];
var commands = {
    'removeFailedNode':  {
        'en': 'Remove a specific failed node from the controller\'s memory.',
        'de': 'Entfernen Sie einen bestimmten ausgefallenen Knoten aus dem Speicher des Controllers.',
        'ru': 'Удалить конкретный сбойный узел из памяти контроллера.'
    },
    'hasNodeFailed': {
        'en': 'Check whether a node is in the controller\'s failed nodes list.',
        'de': 'Prüfen Sie ob sich ein Knoten in der Controller-Fehlerliste befindet.',
        'ru': 'Проверьте правильность узлов в контролере, вышел из строя список узлов.'
    },
    'requestNodeNeighborUpdate': {
        'en': 'Get a node to rebuild its neighbour list.',
        'de': 'Holen Sie sich einen Knoten um die Nachbarliste neu zu erstellen.',
        'ru': 'Опросить узлы, чтобы восстановить свой список.'
    },
    'assignReturnRoute': {
        'en': 'Assign a network return routes to a device.',
        'de': 'Weisen Sie einen Netwerk Rückgabeweg zum Gerät zu.',
        'ru': 'Назначьте сеть маршрутов к устройству.'
    },
    'deleteAllReturnRoutes': {
        'en': 'Delete all return routes from a device.',
        'de': 'Löschen Sie alle Rückgabewege von einem Gerät.',
        'ru': 'Удалить все маршруты к устройству.'
    },
    'sendNodeInformation': {
        'en': 'Send a NIF (node information frame).',
        'de': 'Senden eines NIF (Knoteninformationsrahmen)).',
        'ru': 'Отправить NIF (кадр информации изла).'
    },
    'requestNetworkUpdate': {
        'en': 'Request network information from the SUC/SIS.',
        'de': 'Anfordern von Netzwerkinformationen aus dem SUC / SIS.',
        'ru': 'Запрос информации от сети SUC/SIS.'
    },
    'replicationSend': {
        'en': 'Send information from primary to secondary.',
        'de': 'Senden der Informationen von primär nach sekundär.',
        'ru': 'Отправить информацию от главного второстепенному.'
    },
    'createButton': {
        'en': 'Create an id that tracks handheld button presses.',
        'de': 'Erstellen einer ID die Handheld-Taste drücken verfolgt.',
        'ru': 'Создать идентификатор отслеживания ручного нажатия кнопки.'
    },
    'deleteButton': {
        'en': 'Delete id that tracks handheld button presses.',
        'de': 'Löschen einer ID die Handheld-Taste drücken verfolgt.',
        'ru': 'Удалить идентификатор отслеживания ручного нажатия кнопки.'
    },
    'replaceFailedNode': {
        'en': 'Replace a non-responding node with another. The node must be in the controller\'s list of failed nodes for this command to succeed.',
        'de': 'Ersetzen Sie einen nicht antwortenden Knoten durch einen anderen. Der Knoten muss sich in der Controller-Liste der ausgefallenen Knoten befinden, damit dieser Befehl erfolgreich ausgeführt werden kann.',
        'ru': 'Заменить зависший узел на другой. Узел должен находиться в списке ошибочных узлов контроллера чтобы успешно отработать.'
    },
    'setName': {
        'en': 'Set node name.',
        'de': 'Knotennamen festlegen.',
        'ru': 'Назначить имя узла.'
    },
    'setLocation': {
        'en': 'Set node location.',
        'de': 'Ort des Knotens festlegen.',
        'ru': 'Задать локацию узла.'
    },
    'healNetworkNode': {
        'en': 'Attempt to heal the network if nodes become unresponsive.',
        'de': 'Versuche das Netzwerk zu heilen wenn ein knoten nicht mehr reagiert.',
        'ru': 'Попытка исправить сеть узлов не отвечающих на запросы.'
    },
    'refreshNodeInfo': {
        'en': 'Refresh node information.',
        'de': 'Aktualisieren von Knoteninformationen.',
        'ru': 'Обновить информацию состояния узлов.'
    }
};
