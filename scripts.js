document.addEventListener("DOMContentLoaded", () => {
  loadTasks();
  toggleDownloadButton();
  initSortable();
});

const LOCAL_STORAGE_KEY = "tasks";

function loadTasks() {
  let tasks = [];
  try {
    tasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
  } catch (error) {
    console.error("Error reading from LocalStorage", error);
  }

  const sortOrder = document.getElementById("sort-order").value;

  switch (sortOrder) {
    case "start_date":
      tasks.sort((a, b) => new Date(a.start_datetime) - new Date(b.start_datetime));
      break;
    case "end_date":
      tasks.sort((a, b) => new Date(a.end_datetime) - new Date(b.end_datetime));
      break;
    default:
      tasks.sort((a, b) => a.order - b.order);
      break;
  }

  const taskList = document.getElementById("task-list");
  taskList.innerHTML = "";

  if (tasks.length === 0) {
    const placeholderRow = document.createElement("tr");
    placeholderRow.id = "placeholder-row";
    placeholderRow.innerHTML = `
      <td colspan="4" class="text-center">Brak zadań do wyświetlenia</td>
    `;
    taskList.appendChild(placeholderRow);
  } else {
    tasks.forEach((task, index) => {
      const row = document.createElement("tr");
      const startDatetime = task.start_datetime.replace('T', ' ');
      const endDatetime = task.end_datetime.replace('T', ' ');
      row.innerHTML = `
        <td><span class="drag-handle">&#9776;</span></td>
        <td>${task.task}</td>
        <td>${startDatetime}</td>
        <td>${endDatetime}</td>
        <td>
          <button class="btn btn-success btn-sm" onclick="completeTask(${index})">Zakończ</button>
          <button class="btn btn-danger btn-sm ml-2" onclick="removeTask(${index})">Usuń</button>
          <button class="btn btn-warning btn-sm ml-2" onclick="editTask(${index})">Edytuj</button>
        </td>
      `;
      taskList.appendChild(row);
    });
  }
}

function initSortable() {
  const sortOrder = document.getElementById("sort-order").value;
  const taskListElement = document.getElementById("task-list");
  if (sortOrder === "order") {
    new Sortable(taskListElement, {
      handle: ".drag-handle",
      animation: 150,
      onEnd: function (evt) {
        saveNewOrder();
      },
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
  const startDatetime = document.getElementById('start-datetime');
  const endDatetime = document.getElementById('end-datetime');
  const errorMessage = document.getElementById('error-message');
  errorMessage.style.display = 'none';

  if (taskInput.value === '' || startDatetime.value === '' || endDatetime.value === '') {
    showNotification('Błąd: Wszystkie pola są wymagane.', 'error');
    return;
  }

  const taskText = taskInput.value;
  const start_datetime = startDatetime.value;
  const end_datetime = endDatetime.value;

  let tasks = [];
  try {
    tasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
  } catch (error) {
    console.error('Error reading from LocalStorage', error);
  }

  const order = tasks.length > 0 ? Math.max(...tasks.map(task => task.order)) + 1 : 0;

  tasks.push({ task: taskText, start_datetime: start_datetime, end_datetime: end_datetime, completed: false, order: order });
  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
  taskInput.value = '';
  startDatetime.value = '';
  endDatetime.value = '';
  loadTasks();
  toggleDownloadButton();
  showNotification('Zadanie dodane pomyślnie!', 'success');

  document.getElementById('add-task-btn').style.display = 'block';
  document.getElementById('save-edit-btn').style.display = 'none';
}

function completeTask(index) {
  let tasks = [];
  try {
    tasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
  } catch (error) {
    console.error("Error reading from LocalStorage", error);
  }

  if (tasks[index]) {
    tasks[index].completed = true;
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    loadTasks();
    toggleDownloadButton();
    showNotification("Zadanie zakończone pomyślnie!", "success");
  }
}

function removeTask(index) {
  let tasks = [];
  try {
    tasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
  } catch (error) {
    console.error("Error reading from LocalStorage", error);
  }

  if (tasks[index]) {
    tasks.splice(index, 1);
    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    loadTasks();
    toggleDownloadButton();
    showNotification("Zadanie usunięte pomyślnie!", "success");
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
        if (Array.isArray(tasks) && tasks.every(task => 
          typeof task.task === 'string' &&
          typeof task.start_datetime === 'string' &&
          typeof task.end_datetime === 'string' &&
          typeof task.completed === 'boolean' &&
          typeof task.order === 'number')) {
          
          let finalTasks;
          if (uploadOption === 'add') {
            let existingTasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
            tasks.forEach(task => {
              task.order = existingTasks.length > 0 ? Math.max(...existingTasks.map(t => t.order)) + 1 : existingTasks.length;
              existingTasks.push(task);
            });
            finalTasks = existingTasks;
          } else {
            finalTasks = tasks;
          }

          localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(finalTasks));
          loadTasks();
          $('#uploadModal').modal('hide');
          showNotification('Lista załadowana pomyślnie!', 'success');
          toggleDownloadButton();
        } else {
          throw new Error('Invalid structure');
        }
      } catch (error) {
        showNotification('Błąd: Struktura pliku jest nieprawidłowa.', 'error');
        $('#uploadModal').modal('hide');
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
    console.error("Error reading from LocalStorage", error);
  }

  if (tasks.length === 0) {
    return;
  }

  const blob = new Blob([JSON.stringify(tasks, null, 2)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tasks.txt";
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

function toggleDownloadButton() {
  const tasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
  const downloadButton = document.getElementById("download-tasks-btn");
  downloadButton.disabled = tasks.length === 0;
}

function showNotification(message, type) {
  const alert = document.createElement("div");
  alert.className = `alert alert-${
    type === "success" ? "success" : "danger"
  } alert-dismissible fade show`;
  alert.innerHTML = `
        ${message}
        <button type="button" class="close" data-dismiss="alert" aria-label="Close">
            <span aria-hidden="true">&times;</span>
        </button>
    `;

  document.body.appendChild(alert);
  setTimeout(() => {
    $(alert).alert("close");
  }, 2000);
}

function saveNewOrder() {
  const taskList = document.getElementById("task-list");
  const taskItems = taskList.querySelectorAll("tr");
  let tasks = [];

  taskItems.forEach((item, index) => {
    const task = {
      task: item.querySelector("td:nth-child(2)").textContent.trim().slice(1),
      start_datetime: item.querySelector("td:nth-child(3)").textContent,
      end_datetime: item.querySelector("td:nth-child(4)").textContent,
      end_time: item.querySelector("td:nth-child(5)").textContent,
      completed: false, //todo fix
      order: index,
    };
    tasks.push(task);
  });

  localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
}

function initSortable() {
  const sortOrder = document.getElementById("sort-order").value;
  const taskListElement = document.getElementById("task-list");
  if (sortOrder === "order") {
    new Sortable(taskListElement, {
      handle: ".drag-handle",
      animation: 150,
      onEnd: function (evt) {
        saveNewOrder();
      },
    });
  } else {
    // Jeśli sortowanie jest ustawione na datę, wyłącz drag & drop
    if (taskListElement._sortable) {
      taskListElement._sortable.destroy();
    }
  }
}

function editTask(index) {
  const taskInput = document.getElementById('new-task');
  const startDatetime = document.getElementById('start-datetime');
  const endDatetime = document.getElementById('end-datetime');
  const errorMessage = document.getElementById('error-message');
  const taskForm = document.getElementById('task-form');
  errorMessage.style.display = 'none';

  let tasks = [];
  try {
    tasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
  } catch (error) {
    console.error('Error reading from LocalStorage', error);
  }

  if (tasks[index]) {
    const task = tasks[index];
    taskInput.value = task.task;
    startDatetime.value = task.start_datetime;
    endDatetime.value = task.end_datetime;

    document.getElementById('add-task-btn').style.display = 'none';
    document.getElementById('save-edit-btn').style.display = 'block';
    document.getElementById('save-edit-btn').onclick = function () {
      saveEditedTask(index);
    };

    changeHeader('Edytuj zadanie');

    if (!taskForm.classList.contains('show')) {
      $('#task-form').collapse('show');
    }
  }
}

function saveEditedTask(index) {
  const taskInput = document.getElementById("new-task");
  const startDatetime = document.getElementById("start-datetime");
  const endDatetime = document.getElementById("end-datetime");
  const errorMessage = document.getElementById("error-message");
  errorMessage.style.display = "none";

  if (
    taskInput.value === "" ||
    startDatetime.value === "" ||
    endDatetime.value === ""
  ) {
    showNotification("Błąd: Wszystkie pola są wymagane.", "error");
    return;
  }

  let tasks = [];
  try {
    tasks = JSON.parse(localStorage.getItem(LOCAL_STORAGE_KEY)) || [];
  } catch (error) {
    console.error("Error reading from LocalStorage", error);
  }

  if (tasks[index]) {
    tasks[index].task = taskInput.value;
    tasks[index].start_datetime = startDatetime.value;
    tasks[index].end_datetime = endDatetime.value;

    localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(tasks));
    loadTasks();
    toggleDownloadButton();
    showNotification("Zadanie zaktualizowane pomyślnie!", "success");
  }

  document.getElementById("save-edit-btn").style.display = "none";
  document.getElementById("add-task-btn").style.display = "block";
  taskInput.value = "";
  startDatetime.value = "";
  endDatetime.value = "";
}

function changeHeader(text){
    const formHeader = document.getElementById('form-header');
    formHeader.textContent = text;
}