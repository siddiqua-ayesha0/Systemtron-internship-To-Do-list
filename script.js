document.addEventListener('DOMContentLoaded', () => {
    const newTaskInput = document.getElementById('new-task');
    const taskDueDateInput = document.getElementById('task-due-date');
    const taskPriorityInput = document.getElementById('task-priority-input');
    const addTaskButton = document.getElementById('add-task');
    const todayTasksList = document.getElementById('today-tasks');
    const tomorrowTasksList = document.getElementById('tomorrow-tasks');
    const upcomingTasksList = document.getElementById('upcoming-tasks');
    const completedTasksList = document.getElementById('completed-tasks');
    const clearCompletedButton = document.getElementById('clear-completed-btn');
    const container = document.querySelector('.container');

    const filterPrioritySelect = document.getElementById('filter-priority');
    const sortDueDateButton = document.getElementById('sort-due-date');
    let currentPriorityFilter = '';
    let isSortedByDueDate = false;

    const todayHeading = document.getElementById('today-heading');
    const tomorrowHeading = document.getElementById('tomorrow-heading');
    const upcomingHeading = document.getElementById('upcoming-heading');
    const completedHeading = document.getElementById('completed-heading');

    const confirmationModal = document.getElementById('confirmation-modal');
    const modalMessage = document.getElementById('modal-message');
    const modalConfirmBtn = document.getElementById('modal-confirm-btn');
    const modalCancelBtn = document.getElementById('modal-cancel-btn');

    const focusTaskDisplay = document.getElementById('focus-task-display');
    const timerDisplay = document.getElementById('timer-display');
    const startTimerBtn = document.getElementById('start-timer');
    const pauseTimerBtn = document.getElementById('pause-timer');
    const resetTimerBtn = document.getElementById('reset-timer');
    const statusMessage = document.getElementById('status-message');

    const WORK_TIME = 25 * 60;
    const SHORT_BREAK_TIME = 5 * 60;
    const LONG_BREAK_TIME = 15 * 60;
    let timeLeft = WORK_TIME;
    let timerInterval;
    let isPaused = true;
    let currentPhase = 'work';
    let pomodoroCount = 0;
    let focusedTaskId = null;

    taskDueDateInput.value = getTodayDateString();

    let tasks = loadTasks();
    renderTasks();

    addTaskButton.addEventListener('click', addTask);
    newTaskInput.addEventListener('keypress', (event) => {
        if (event.key === 'Enter') {
            addTask();
        }
    });

    clearCompletedButton.addEventListener('click', () => {
        showConfirmationModal("Are you sure you want to clear all completed tasks?", () => {
            tasks = tasks.filter(task => !task.completed);
            saveTasks();
            renderTasks();
        });
    });

    filterPrioritySelect.addEventListener('change', (e) => {
        currentPriorityFilter = e.target.value;
        renderTasks();
    });

    sortDueDateButton.addEventListener('click', () => {
        isSortedByDueDate = !isSortedByDueDate;
        renderTasks();
    });

    startTimerBtn.addEventListener('click', startTimer);
    pauseTimerBtn.addEventListener('click', pauseTimer);
    resetTimerBtn.addEventListener('click', resetTimer);

    function getTodayDateString() {
        const today = new Date();
        return today.toISOString().split('T')[0];
    }

    function getTomorrowDateString() {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        return tomorrow.toISOString().split('T')[0];
    }

    function isSameDay(dateString1, dateString2) {
        return dateString1 === dateString2;
    }

    function formatDateDisplay(dateString) {
        const date = new Date(dateString + 'T00:00:00');
        const options = { weekday: 'short', month: 'short', day: 'numeric' };
        return date.toLocaleDateString('en-US', options);
    }

    function loadTasks() {
        const storedTasks = localStorage.getItem('chronoscribeTasks');
        return storedTasks ? JSON.parse(storedTasks) : [];
    }

    function saveTasks() {
        localStorage.setItem('chronoscribeTasks', JSON.stringify(tasks));
    }

    function renderTasks() {
        todayTasksList.innerHTML = '';
        tomorrowTasksList.innerHTML = '';
        upcomingTasksList.innerHTML = '';
        completedTasksList.innerHTML = '';

        const todayStr = getTodayDateString();
        const tomorrowStr = getTomorrowDateString();

        const filteredTasks = tasks.filter(task => !currentPriorityFilter || task.priority === currentPriorityFilter);

        const todayTasks = [];
        const tomorrowTasks = [];
        const upcomingTasks = [];
        const completedTasks = [];

        filteredTasks.forEach(task => {
            if (task.completed) {
                completedTasks.push(task);
            } else if (isSameDay(task.dueDate, todayStr)) {
                todayTasks.push(task);
            } else if (isSameDay(task.dueDate, tomorrowStr)) {
                tomorrowTasks.push(task);
            } else {
                upcomingTasks.push(task);
            }
        });

        const sortPendingByPriority = (a, b) => {
            const priorityOrder = { 'high': 1, 'medium': 2, 'low': 3 };
            return priorityOrder[a.priority] - priorityOrder[b.priority];
        };

        const sortPendingByDueDate = (a, b) => new Date(a.dueDate) - new Date(b.dueDate);

        todayTasks.sort(sortPendingByPriority);
        tomorrowTasks.sort(sortPendingByPriority);
        upcomingTasks.sort(sortPendingByPriority);

        if (isSortedByDueDate) {
            todayTasks.sort(sortPendingByDueDate);
            tomorrowTasks.sort(sortPendingByDueDate);
            upcomingTasks.sort(sortPendingByDueDate);
        }

        completedTasks.sort((a, b) => b.id - a.id);

        appendTasksToList(todayTasks, todayTasksList, "No tasks for today!");
        todayHeading.querySelector('.task-count').textContent = '${todayTasks.length}';

        appendTasksToList(tomorrowTasks, tomorrowTasksList, "Nothing planned for tomorrow yet!");
        tomorrowHeading.querySelector('.task-count').textContent = '${tomorrowTasks.length}';

        appendTasksToList(upcomingTasks, upcomingTasksList, "No upcoming tasks in sight!");
        upcomingHeading.querySelector('.task-count').textContent = '${upcomingTasks.length}';

        appendTasksToList(completedTasks, completedTasksList, "No tasks completed yet. Let's get started!");
        completedHeading.querySelector('.task-count').textContent ='${completedTasks.length}';

        clearCompletedButton.style.display = completedTasks.length > 0 ? 'block' : 'none';

        addDragAndDropListeners(todayTasksList);
        addDragAndDropListeners(tomorrowTasksList);
        addDragAndDropListeners(upcomingTasksList);
        addDragAndDropListeners(completedTasksList);
    }

    function appendTasksToList(tasksToRender, listElement, emptyMessage) {
        if (tasksToRender.length === 0) {
            const messageItem = document.createElement('li');
            messageItem.className = 'empty-list-message';
            messageItem.textContent = emptyMessage;
            listElement.appendChild(messageItem);
            return;
        }

        tasksToRender.forEach(task => {
            const listItem = document.createElement('li');
            listItem.dataset.id = task.id;
            listItem.draggable = true;

            let priorityClass = '';
            if (task.priority === 'high') priorityClass = 'priority-high';
            else if (task.priority === 'medium') priorityClass = 'priority-medium';
            else priorityClass = 'priority-low';

            const showDueDate = !task.completed && !isSameDay(task.dueDate, getTodayDateString());
            const dueDateDisplay = showDueDate ? <div class="task-due-date-display">Due: ${formatDateDisplay(task.dueDate)}</div> : '';

            listItem.innerHTML = `
                <div class="task-content">
                    <div class="task-main-info">
                        <span class="priority-indicator ${priorityClass}"></span>
                        <span class="task-text ${task.completed ? 'completed' : ''}" contenteditable="false">${task.text}</span>
                    </div>
                    ${dueDateDisplay}
                </div>
                <div class="task-actions">
                    ${task.completed ? '' : '<button class="complete-btn" aria-label="Mark as complete">✓</button>'}
                    ${task.completed ? '' : '<button class="edit-btn" aria-label="Edit task">✎</button>'}
                    ${task.completed ? '' : '<button class="focus-btn" aria-label="Focus on this task">▶</button>'}
                    <button class="delete-btn" aria-label="Delete task">×</button>
                </div>
            `;

            const completeButton = listItem.querySelector('.complete-btn');
            const editButton = listItem.querySelector('.edit-btn');
            const focusButton = listItem.querySelector('.focus-btn');
            const deleteButton = listItem.querySelector('.delete-btn');
            const taskTextSpan = listItem.querySelector('.task-text');

            if (completeButton) {
                completeButton.addEventListener('click', () => toggleComplete(task));
            }

            if (editButton) {
                editButton.addEventListener('click', () => editTask(task, listItem, taskTextSpan, editButton));
            }

            if (focusButton) {
                focusButton.addEventListener('click', () => selectTaskForFocus(task));
            }

            deleteButton.addEventListener('click', () => {
                showConfirmationModal('Are you sure you want to delete ${task.text}?', () => deleteTask(task));
            });

            listElement.appendChild(listItem);
        });
    }


    function addTask() {
        const taskText = newTaskInput.value.trim();
        const dueDate = taskDueDateInput.value;
        const priority = taskPriorityInput.value;

        if (taskText !== '') {
            const newTask = {
                id: Date.now(),
                text: taskText,
                completed: false,
                dueDate: dueDate,
                priority: priority
            };
            tasks.push(newTask);
            saveTasks();
            renderTasks();
            newTaskInput.value = '';
            taskDueDateInput.value = getTodayDateString();
            taskPriorityInput.value = 'medium';
        }
    }

    function toggleComplete(taskToUpdate) {
        const listItem = document.querySelector('[data-id="${taskToUpdate.id}"]');
        if (listItem) {
            if (!taskToUpdate.completed) {
                createConfetti(listItem.getBoundingClientRect());
            }

            tasks = tasks.map(task => {
                if (task.id === taskToUpdate.id) {
                    return { ...task, completed: !task.completed };
                }
                return task;
            });
            saveTasks();

            listItem.classList.add('task-removing');
            listItem.addEventListener('animationend', () => {
                renderTasks();
            }, { once: true });
        }
    }

    function deleteTask(taskToDelete) {
        const listItem = document.querySelector('[data-id="${taskToDelete.id}"]');
        if (listItem) {
            listItem.classList.add('task-removing');
            listItem.addEventListener('animationend', () => {
                tasks = tasks.filter(task => task.id !== taskToDelete.id);
                saveTasks();
                renderTasks();
            }, { once: true });
        }
    }

    function editTask(taskToEdit, listItem, taskTextSpan, editButton) {
        const originalText = taskTextSpan.textContent;
        const originalDueDate = taskToEdit.dueDate;
        const originalPriority = taskToEdit.priority;

        taskTextSpan.contentEditable = true;
        taskTextSpan.classList.add('editing');
        taskTextSpan.focus();

        const saveButton = document.createElement('button');
        saveButton.className = 'save-btn';
        saveButton.innerHTML = '✔';
        saveButton.setAttribute('aria-label', 'Save task changes');
        editButton.replaceWith(saveButton);

        const tempDueDateInput = document.createElement('input');
        tempDueDateInput.type = 'date';
        tempDueDateInput.value = originalDueDate;
        tempDueDateInput.className = 'task-due-date-display';
        tempDueDateInput.style.marginLeft = '18px';

        const tempPrioritySelect = document.createElement('select');
        tempPrioritySelect.innerHTML = `
            <option value="low">Low</option>
            <option value="medium">Medium</option>
            <option value="high">High</option>
        `;
        tempPrioritySelect.value = originalPriority;
        tempPrioritySelect.className = 'task-priority-display';
        tempPrioritySelect.style.marginLeft = '10px';

        const taskContentDiv = listItem.querySelector('.task-content');
        const existingDueDateDisplay = listItem.querySelector('.task-due-date-display');

        if (existingDueDateDisplay) {
            existingDueDateDisplay.replaceWith(tempDueDateInput);
        } else {
            taskContentDiv.appendChild(tempDueDateInput);
        }
        taskContentDiv.appendChild(tempPrioritySelect);


        saveButton.addEventListener('click', () => {
            const newText = taskTextSpan.textContent.trim();
            const newDueDate = tempDueDateInput.value;
            const newPriority = tempPrioritySelect.value;

            if (newText !== '') {
                tasks = tasks.map(task => {
                    if (task.id === taskToEdit.id) {
                        return { ...task, text: newText, dueDate: newDueDate, priority: newPriority };
                    }
                    return task;
                });
                saveTasks();
                renderTasks();
            } else {
                taskTextSpan.textContent = originalText;
                renderTasks();
            }
        });

        taskTextSpan.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                saveButton.click();
            }
        });

        taskTextSpan.addEventListener('blur', () => {
            if (listItem.contains(saveButton)) {
                saveButton.click();
            }
        });
    }

    let confirmCallback = null;

    function showConfirmationModal(message, callback) {
        modalMessage.textContent = message;
        confirmCallback = callback;
        confirmationModal.classList.add('active');
    }

    function hideConfirmationModal() {
        confirmationModal.classList.remove('active');
        confirmconfirmCallback = null;
    }

    modalConfirmBtn.addEventListener('click', () => {
        if (confirmCallback) {
            confirmCallback();
        }
        hideConfirmationModal();
    });

    modalCancelBtn.addEventListener('click', () => {
        hideConfirmationModal();
    });


    function createConfetti(rect) {
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        container.appendChild(confettiContainer);

        for (let i = 0; i < 100; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            const startX = rect.left + Math.random() * rect.width;
            const startY = rect.top + Math.random() * rect.height / 2;
            const xOffset = (Math.random() - 0.5) * 200;
            const yOffset = Math.random() * 150 + 100;
            const rotation = Math.random() * 720;
            const delay = Math.random() * 0.5;

            confetti.style.setProperty('--x', '${startX + xOffset}px');
            confetti.style.setProperty('--y', '${startY + yOffset}px');
            confetti.style.setProperty('--rot', '${rotation}deg');
            confetti.style.animationDelay = '${delay}s';
            confetti.style.left = '${startX}px';
            confetti.style.top = '${startY}px';

            confettiContainer.appendChild(confetti);
        }

        setTimeout(() => {
            confettiContainer.remove();
        }, 3000);
    }

    let draggedItem = null;

    function addDragAndDropListeners(list) {
        list.addEventListener('dragstart', (e) => {
            draggedItem = e.target;
            e.target.classList.add('dragging');
        });

        list.addEventListener('dragend', () => {
            if (draggedItem) {
                draggedItem.classList.remove('dragging');
                draggedItem = null;
                saveTasks();
                renderTasks(); // Re-render to update lists
            }
        });

        list.addEventListener('dragover', (e) => {
            e.preventDefault();
            if (draggedItem && e.target.nodeName === 'LI' && e.target !== draggedItem && !e.target.classList.contains('dragging')) {
                // Determine if dragging down or up
                const rect = e.target.getBoundingClientRect();
                const mouseY = e.clientY;
                if (mouseY > rect.top + rect.height / 2) {
                    list.insertBefore(draggedItem, e.target.nextSibling);
                } else {
                    list.insertBefore(draggedItem, e.target);
                }
            }
        });
    }

    function getTaskById(id) {
        return tasks.find(task => task.id.toString() === id);
    }

    function updateTaskOrder() {
        document.querySelectorAll('.task-list').forEach(list => {
            const listId = list.id;
            const listItems = list.querySelectorAll('li[data-id]');
            listItems.forEach((item, index) => {
                const taskId = parseInt(item.dataset.id);
                const task = getTaskById(taskId);
                if (task) {
                    let newDueDate;
                    if (listId === 'today-tasks') {
                        newDueDate = getTodayDateString();
                    } else if (listId === 'tomorrow-tasks') {
                        newDueDate = getTomorrowDateString();
                    }
                    // For upcoming and completed, keep the existing due date

                    if (newDueDate && task.dueDate !== newDueDate) {
                        task.dueDate = newDueDate;
                    }
                    if ((listId === 'completed-tasks') !== task.completed) {
                        task.completed = (listId === 'completed-tasks');
                    }
                }
            });
        });
        saveTasks();
        renderTasks();
    }

    document.querySelectorAll('.task-list').forEach(list => {
        list.addEventListener('drop', updateTaskOrder);
    });

    // Pomodoro Timer Functions
    function startTimer() {
        if (isPaused) {
            isPaused = false;
            timerInterval = setInterval(updateTimer, 1000);
            statusMessage.textContent = currentPhase === 'work' ? 'Focusing...' : (currentPhase.includes('break') ? 'Taking a break...' : 'Ready!');
        }
    }

    function pauseTimer() {
        isPaused = true;
        clearInterval(timerInterval);
        statusMessage.textContent = 'Paused';
    }

    function resetTimer() {
        isPaused = true;
        clearInterval(timerInterval);
        timeLeft = WORK_TIME;
        currentPhase = 'work';
        updateDisplay();
        statusMessage.textContent = 'Ready!';
        focusTaskDisplay.textContent = focusedTaskId ? getTaskById(focusedTaskId)?.text || 'Task no longer exists' : 'No task selected.';
    }

    function updateTimer() {
        if (!isPaused) {
            timeLeft--;
            updateDisplay();
            if (timeLeft <= 0) {
                clearInterval(timerInterval);
                timerComplete();
            }
        }
    }

    function updateDisplay() {
        const minutes = Math.floor(timeLeft / 60).toString().padStart(2, '0');
        const seconds = (timeLeft % 60).toString().padStart(2, '0');
        timerDisplay.textContent = '${minutes}:${seconds}';
    }

    function timerComplete() {
        if (currentPhase === 'work') {
            pomodoroCount++;
            statusMessage.textContent = 'Work session complete!';
            if (pomodoroCount % 4 === 0) {
                startBreak(LONG_BREAK_TIME, 'long-break');
            } else {
                startBreak(SHORT_BREAK_TIME, 'short-break');
            }
        } else if (currentPhase.includes('break')) {
            statusMessage.textContent = 'Break over! Back to work.';
            startWork();
        }
    }

    function startWork() {
        currentPhase = 'work';
        timeLeft = WORK_TIME;
        updateDisplay();
        startTimer();
        statusMessage.textContent = 'Focusing...';
    }

    function startBreak(duration, phase) {
        currentPhase = phase;
        timeLeft = duration;
        updateDisplay();
        startTimer();
        statusMessage.textContent = 'Taking a break...';
    }

    function selectTaskForFocus(task) {
        focusedTaskId = task.id;
        focusTaskDisplay.textContent = task.text;
    }
});