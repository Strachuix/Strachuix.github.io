document.addEventListener('DOMContentLoaded', () => {
    loadTasks();
    toggleDownloadButton();
    initSortable();
});

const LOCAL_STORAGE_KEY = 'tasks';

function loadTasks() {
    let tasks = [];
    try {
        tasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
    } catch (error) {
        console.error('Error reading from LocalStorage', error);
    }

    const sortOrder = document.getElementById('sort-order').value;

    switch (sortOrder) {
        case 'start_date':
            tasks.sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
            break;
        case 'end_date':
            tasks.sort((a, b) => new Date(a.end_date) - new Date(b.end_date));
            break;
        default:
            tasks.sort((a, b) => a.order - b.order);
            break;
    }

    const taskList = document.getElementById('task-list');
    taskList.innerHTML = '';

    if (tasks.length === 0) {
        const placeholderRow = document.createElement('tr');
        placeholderRow.id = 'placeholder-row';
        placeholderRow.innerHTML = `
            <td colspan="6" class="text-center">Brak zadań do wyświetlenia</td>
        `;
        taskList.appendChild(placeholderRow);
    } else {
        tasks.forEach((task, index) => {
            const row = document.createElement('tr');
            row.innerHTML = `
                <td><span class="drag-handle">&#9776;</span>${task.task}</td>
                <td>${task.start_date}</td>
                <td>${task.start_time}</td>
                <td>${task.end_date}</td>
                <td>${task.end_time}</td>
                <td>
                    <button class="btn btn-success btn-sm" onclick="completeTask(${index})">Zakończ</button>
                    <button class="btn btn-danger btn-sm ml-2" onclick="removeTask(${index})">Usuń</button>
                </td>
            `;
            taskList.appendChild(row);
        });
    }
}

function initSortable() {
    const sortOrder = document.getElementById('sort-order').value;
    const taskListElement = document.getElementById('task-list');
    if (sortOrder === 'order') {
        new Sortable(taskListElement, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: function (evt) {
                saveNewOrder();
            }
        });
    } else {
        if (taskListElement._sortable) {
            taskListElement._sortable.destroy();
        }
    }
}

function changeSortOrder() {
    loadTasks();
    initSortable();
}

function addTask() {
    const taskInput = document.getElementById('new-task');
    const startDate = document.getElementById('start-date');
    const startTime = document.getElementById('start-time');
    const endDate = document.getElementById('end-date');
    const endTime = document.getElementById('end-time');
    const errorMessage = document.getElementById('error-message');
    errorMessage.style.display = 'none';

    if (taskInput.value === '' || startDate.value === '' || startTime.value === '' || endDate.value === '' || endTime.value === '') {
        showNotification('Błąd: Wszystkie pola są wymagane.', 'error');
        return;
    }

    const taskText = taskInput.value;
    const start_date = startDate.value;
    const start_time = startTime.value;
    const end_date = endDate.value;
    const end_time = endTime.value;

    let tasks = [];
    try {
        tasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
    } catch (error) {
        console.error('Error reading from LocalStorage', error);
    }

    const order = tasks.length > 0 ? Math.max(...tasks.map(task => task.order)) + 1 : 0;
    
    tasks.push({ task: taskText, start_date: start_date, start_time: start_time, end_date: end_date, end_time: end_time, completed: false, order: order });
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    taskInput.value = '';
    startDate.value = '';
    startTime.value = '';
    endDate.value = '';
    endTime.value = '';
    loadTasks();
    toggleDownloadButton();
    showNotification('Zadanie dodane pomyślnie!', 'success');
}

function completeTask(index) {
    let tasks = [];
    try {
        tasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
    } catch (error) {
        console.error('Error reading from LocalStorage', error);
    }

    if (tasks[index]) {
        tasks[index].completed = true;
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
        loadTasks();
        toggleDownloadButton();
        showNotification('Zadanie zakończone pomyślnie!', 'success');
    }
}

function removeTask(index) {
    let tasks = [];
    try {
        tasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
    } catch (error) {
        console.error('Error reading from LocalStorage', error);
    }

    if (tasks[index]) {
        tasks.splice(index, 1);
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
        loadTasks();
        toggleDownloadButton();
        showNotification('Zadanie usunięte pomyślnie!', 'success');
    }
}

function processFile() {
    const fileInput = document.getElementById('file-input');
    const file = fileInput.files[0];
    const uploadOption = document.querySelector('input[name="uploadOption"]:checked').value;

    if (file) {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const tasks = JSON.parse(e.target.result);
                if (Array.isArray(tasks) && tasks.every(task => task.task && task.start_date && task.start_time && task.end_date && task.end_time && task.completed !== undefined)) {
                    if (uploadOption === 'add') {
                        let existingTasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
                        tasks.forEach(task => {
                            task.order = existingTasks.length > 0 ? Math.max(...existingTasks.map(t => t.order)) + 1 : 0;
                            existingTasks.push(task);
                        });
                        tasks = existingTasks;
                    }
                    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
                    loadTasks();
                    $('#uploadModal').modal('hide');
                    showNotification('Lista załadowana pomyślnie!', 'success');
                    toggleDownloadButton();
                } else {
                    throw new Error('Invalid structure');
                }
            } catch (error) {
                showNotification('Błąd: Struktura pliku jest nieprawidłowa.', 'error');
                $('#uploadModal').modal('hide'); // zamknij modal w przypadku błędu
            }
        };
        reader.readAsText(file);
    }
}

function downloadTasks() {
    let tasks = [];
    try {
        tasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
    } catch (error) {
        console.error('Error reading from LocalStorage', error);
    }

    if (tasks.length === 0) {
        return;
    }

    const blob = new Blob([JSON.stringify(tasks, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'tasks.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
}

function toggleDownloadButton() {
    const tasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
    const downloadButton = document.getElementById('download-tasks-btn');
    downloadButton.disabled = tasks.length === 0;
}

function showNotification(message, type) {
    const alert = document.createElement('div');
    alert.className = `alert alert-${type === 'success' ? 'success' : 'danger'} alert-dismissible fade show`;
    alert.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;

    document.body.appendChild(alert);
    setTimeout(() => {
        $(alert).alert('close');
    }, 2000);
}

function saveNewOrder() {
    const taskList = document.getElementById('task-list');
    const taskItems = taskList.querySelectorAll('tr');
    let tasks = [];

    taskItems.forEach((item, index) => {
        const task = {
            task: item.querySelector('td:nth-child(1)').textContent.trim().slice(1), // Usuwamy symbol drag-handle
            start_date: item.querySelector('td:nth-child(2)').textContent,
            start_time: item.querySelector('td:nth-child(3)').textContent,
            end_date: item.querySelector('td:nth-child(4)').textContent,
            end_time: item.querySelector('td:nth-child(5)').textContent,
            completed: false,
            order: index
        };
        tasks.push(task);
    });

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
}

function changeSortOrder() {
    loadTasks();
    initSortable();
}

function initSortable() {
    const sortOrder = document.getElementById('sort-order').value;
    const taskListElement = document.getElementById('task-list');
    if (sortOrder === 'order') {
        new Sortable(taskListElement, {
            handle: '.drag-handle',
            animation: 150,
            onEnd: function (evt) {
                saveNewOrder();
            }
        });
    } else {
        // Jeśli sortowanie jest ustawione na datę, wyłącz drag & drop
        if (taskListElement._sortable) {
            taskListElement._sortable.destroy();
        }
    }
}



