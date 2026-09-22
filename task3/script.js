let tasks = [];
let nextId = 1;
let currentFilter = 'all';

const form = document.getElementById('task-form');
const input = document.getElementById('task-input');
const warning = document.getElementById('warning');
const list = document.getElementById('task-list');
const counter = document.getElementById('counter');
const filterButtons = document.querySelectorAll('.filter-btn');

form.addEventListener('submit', (e) => {
  e.preventDefault();
  addTask();
});

filterButtons.forEach((btn) => {
  btn.addEventListener('click', () => {
    currentFilter = btn.dataset.filter;
    filterButtons.forEach((b) => b.classList.remove('active'));
    btn.classList.add('active');
    render();
  });
});

function addTask() {
  const text = input.value.trim();

  if (text === '') {
    warning.textContent = 'Введите текст задачи';
    return;
  }

  warning.textContent = '';
  tasks.push({ id: nextId++, text, completed: false });
  input.value = '';
  render();
}

function toggleTask(id) {
  tasks = tasks.map((task) =>
    task.id === id ? { ...task, completed: !task.completed } : task
  );
  render();
}

function deleteTask(id) {
  tasks = tasks.filter((task) => task.id !== id);
  render();
}

function getFilteredTasks() {
  if (currentFilter === 'active') {
    return tasks.filter((task) => !task.completed);
  }
  if (currentFilter === 'completed') {
    return tasks.filter((task) => task.completed);
  }
  return tasks;
}

function render() {
  list.innerHTML = '';

  tasks.forEach((task) => {
    const visible = getFilteredTasks().includes(task);

    const li = document.createElement('li');
    li.className = 'task-item';
    li.style.display = visible ? 'flex' : 'none';

    const checkbox = document.createElement('input');
    checkbox.type = 'checkbox';
    checkbox.checked = task.completed;
    checkbox.addEventListener('change', () => toggleTask(task.id));

    const span = document.createElement('span');
    span.textContent = task.text;
    if (task.completed) {
      span.classList.add('completed');
    }

    const deleteBtn = document.createElement('button');
    deleteBtn.textContent = 'Удалить';
    deleteBtn.className = 'delete-btn';
    deleteBtn.addEventListener('click', () => deleteTask(task.id));

    li.append(checkbox, span, deleteBtn);
    list.appendChild(li);
  });

  const activeCount = tasks.filter((task) => !task.completed).length;
  const completedCount = tasks.filter((task) => task.completed).length;
  counter.textContent = `Осталось: ${activeCount}, Выполнено: ${completedCount}`;
}

render();
