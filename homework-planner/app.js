// Homework Planner – saves everything in the browser (localStorage).

const STORAGE_KEY = "homework-planner-tasks";
const MONTHS = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

let tasks = load();
let viewYear = new Date().getFullYear();
let viewMonth = new Date().getMonth();
let selectedDate = toDateKey(new Date());
let filter = "upcoming";
let editingId = null;
let formSteps = [];

const $ = (id) => document.getElementById(id);

// ---------- Saving and loading ----------
function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
  } catch {
    toast("Could not save. Your browser may be blocking storage.");
  }
}

// ---------- Date helpers ----------
function toDateKey(d) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

function dueTime(task) {
  return new Date(`${task.date}T${task.time || "23:59"}`);
}

function niceDate(task) {
  const d = dueTime(task);
  return d.toLocaleDateString(undefined, { weekday: "short", month: "short", day: "numeric" }) +
    " · " + d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" });
}

function dueLabel(task) {
  if (task.done) return "";
  const hours = (dueTime(task) - new Date()) / 36e5;
  if (hours < 0) return `<span class="late">Overdue</span>`;
  if (hours < 24) return `<span class="soon">Due soon</span>`;
  return "";
}

function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) =>
    ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

// ---------- Calendar ----------
function renderCalendar() {
  $("monthLabel").textContent = `${MONTHS[viewMonth]} ${viewYear}`;
  const grid = $("calGrid");
  grid.innerHTML = "";

  const first = new Date(viewYear, viewMonth, 1);
  const start = new Date(first);
  start.setDate(1 - first.getDay()); // back up to Sunday
  const todayKey = toDateKey(new Date());

  for (let i = 0; i < 42; i++) {
    const d = new Date(start);
    d.setDate(start.getDate() + i);
    const key = toDateKey(d);
    const dayTasks = tasks.filter((t) => t.date === key).sort((a, b) => dueTime(a) - dueTime(b));

    const cell = document.createElement("button");
    cell.className = "day";
    if (d.getMonth() !== viewMonth) cell.classList.add("other");
    if (key === todayKey) cell.classList.add("today");
    if (key === selectedDate) cell.classList.add("selected");
    if (dayTasks.length) cell.classList.add("has-tasks");
    cell.setAttribute("aria-label", `${d.toDateString()}, ${dayTasks.length} items`);

    let html = `<span class="num">${d.getDate()}</span>`;
    dayTasks.slice(0, 2).forEach((t) => {
      html += `<span class="pill ${t.priority} ${t.done ? "done" : ""}">${escapeHtml(t.title)}</span>`;
    });
    if (dayTasks.length > 2) html += `<span class="more">+${dayTasks.length - 2} more</span>`;
    cell.innerHTML = html;

    cell.addEventListener("click", () => {
      selectedDate = key;
      setFilter("day");
    });
    cell.addEventListener("dblclick", () => openForm(null, key));
    grid.appendChild(cell);
  }
}

// ---------- Task list ----------
function visibleTasks() {
  const now = new Date();
  let list = tasks;
  if (filter === "day") list = tasks.filter((t) => t.date === selectedDate);
  if (filter === "upcoming") list = tasks.filter((t) => !t.done && dueTime(t) >= now);
  if (filter === "overdue") list = tasks.filter((t) => !t.done && dueTime(t) < now);
  if (filter === "done") list = tasks.filter((t) => t.done);
  return [...list].sort((a, b) => dueTime(a) - dueTime(b));
}

function renderList() {
  const titles = {
    day: new Date(selectedDate + "T00:00").toLocaleDateString(undefined,
      { weekday: "long", month: "long", day: "numeric" }),
    upcoming: "Upcoming", overdue: "Overdue", done: "Done", all: "All assignments",
  };
  $("listTitle").textContent = titles[filter];

  const open = tasks.filter((t) => !t.done).length;
  const late = tasks.filter((t) => !t.done && dueTime(t) < new Date()).length;
  $("stats").textContent = `${open} to do · ${late} overdue · ${tasks.length - open} done`;

  const list = visibleTasks();
  const ul = $("taskList");
  ul.innerHTML = "";
  $("empty").hidden = list.length > 0;

  list.forEach((t) => {
    const li = document.createElement("li");
    li.className = `task ${t.priority} ${t.done ? "done" : ""}`;

    const doneSteps = t.steps.filter((s) => s.done).length;
    const pct = t.steps.length ? Math.round((doneSteps / t.steps.length) * 100) : 0;

    li.innerHTML = `
      <div class="task-top">
        <input type="checkbox" ${t.done ? "checked" : ""} aria-label="Mark done">
        <div class="task-main">
          <div class="task-title">${escapeHtml(t.title)}</div>
          <div class="meta">
            ${t.course ? `<span class="tag">${escapeHtml(t.course)}</span>` : ""}
            <span>${escapeHtml(t.type)}</span>
            <span>${niceDate(t)}</span>
            ${t.remind !== "" ? "<span>🔔</span>" : ""}
            ${dueLabel(t)}
          </div>
        </div>
        <button class="edit">Edit</button>
      </div>
      ${t.notes ? `<p class="notes">${escapeHtml(t.notes)}</p>` : ""}
      ${t.steps.length ? `
        <ul class="steps">
          ${t.steps.map((s, i) => `
            <li class="${s.done ? "checked" : ""}">
              <input type="checkbox" data-step="${i}" ${s.done ? "checked" : ""}>
              <span>${escapeHtml(s.text)}</span>
            </li>`).join("")}
        </ul>
        <div class="progress" title="${doneSteps}/${t.steps.length} steps"><div style="width:${pct}%"></div></div>
      ` : ""}
    `;

    li.querySelector(".task-top input").addEventListener("change", (e) => {
      t.done = e.target.checked;
      save(); render();
    });
    li.querySelectorAll("[data-step]").forEach((box) => {
      box.addEventListener("change", (e) => {
        t.steps[e.target.dataset.step].done = e.target.checked;
        // Finishing every step finishes the assignment.
        t.done = t.steps.every((s) => s.done);
        save(); render();
      });
    });
    li.querySelector(".edit").addEventListener("click", () => openForm(t));
    ul.appendChild(li);
  });
}

function setFilter(name) {
  filter = name;
  document.querySelectorAll("#filters .chip").forEach((c) =>
    c.classList.toggle("active", c.dataset.filter === name));
  render();
}

function render() {
  renderCalendar();
  renderList();
  const courses = [...new Set(tasks.map((t) => t.course).filter(Boolean))];
  $("courseList").innerHTML = courses.map((c) => `<option value="${escapeHtml(c)}">`).join("");
}

// ---------- Add / edit form ----------
const dialog = $("taskDialog");
const form = $("taskForm");

function openForm(task, date) {
  form.reset();
  editingId = task ? task.id : null;
  $("formTitle").textContent = task ? "Edit assignment" : "New assignment";
  $("deleteBtn").hidden = !task;

  const f = form.elements;
  f.title.value = task?.title || "";
  f.course.value = task?.course || "";
  f.type.value = task?.type || "Homework";
  f.date.value = task?.date || date || selectedDate;
  f.time.value = task?.time || "23:59";
  f.priority.value = task?.priority || "medium";
  f.remind.value = task?.remind ?? "";
  f.notes.value = task?.notes || "";
  formSteps = task ? task.steps.map((s) => ({ ...s })) : [];
  renderFormSteps();

  dialog.showModal();
  f.title.focus();
}

function renderFormSteps() {
  $("formChecklist").innerHTML = formSteps.map((s, i) =>
    `<li><span>${escapeHtml(s.text)}</span><button type="button" data-remove="${i}" aria-label="Remove step">✕</button></li>`
  ).join("");
  $("formChecklist").querySelectorAll("[data-remove]").forEach((b) =>
    b.addEventListener("click", () => {
      formSteps.splice(b.dataset.remove, 1);
      renderFormSteps();
    }));
}

function addStep() {
  const text = $("stepInput").value.trim();
  if (!text) return;
  formSteps.push({ text, done: false });
  $("stepInput").value = "";
  renderFormSteps();
}

$("stepAdd").addEventListener("click", addStep);
$("stepInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") { e.preventDefault(); addStep(); }
});

form.addEventListener("submit", (e) => {
  e.preventDefault();
  addStep(); // keep a step that was typed but not added yet
  const f = form.elements;
  const data = {
    title: f.title.value.trim(),
    course: f.course.value.trim(),
    type: f.type.value,
    date: f.date.value,
    time: f.time.value || "23:59",
    priority: f.priority.value,
    remind: f.remind.value,
    notes: f.notes.value.trim(),
    steps: formSteps,
  };

  if (editingId) {
    const t = tasks.find((x) => x.id === editingId);
    const timeChanged = t.date !== data.date || t.time !== data.time || t.remind !== data.remind;
    Object.assign(t, data);
    if (timeChanged) t.reminded = false;
  } else {
    tasks.push({ id: crypto.randomUUID(), done: false, reminded: false, ...data });
  }

  save();
  dialog.close();
  selectedDate = data.date;
  const d = new Date(data.date + "T00:00");
  viewYear = d.getFullYear();
  viewMonth = d.getMonth();
  render();
  toast(editingId ? "Saved changes" : "Assignment added");
});

$("cancelBtn").addEventListener("click", () => dialog.close());
$("deleteBtn").addEventListener("click", () => {
  if (!confirm("Delete this assignment?")) return;
  tasks = tasks.filter((t) => t.id !== editingId);
  save();
  dialog.close();
  render();
  toast("Deleted");
});

// ---------- Reminders ----------
function updateNotifyButton() {
  const btn = $("notifyBtn");
  if (!("Notification" in window)) { btn.hidden = true; return; }
  if (Notification.permission === "granted") btn.textContent = "🔔 Reminders on";
  if (Notification.permission === "denied") btn.textContent = "🔕 Reminders blocked";
}

$("notifyBtn").addEventListener("click", async () => {
  if (!("Notification" in window)) return;
  if (Notification.permission === "denied") {
    toast("Reminders are blocked. Allow notifications for this site in your browser settings.");
    return;
  }
  await Notification.requestPermission();
  updateNotifyButton();
  if (Notification.permission === "granted") toast("Reminders are on. Keep this tab open to get them.");
});

function checkReminders() {
  const now = new Date();
  let changed = false;
  tasks.forEach((t) => {
    if (t.done || t.reminded || t.remind === "") return;
    const remindAt = dueTime(t).getTime() - Number(t.remind) * 60000;
    if (now.getTime() >= remindAt) {
      const msg = `${t.title}${t.course ? ` (${t.course})` : ""} is due ${niceDate(t)}`;
      toast("⏰ " + msg, 8000);
      if ("Notification" in window && Notification.permission === "granted") {
        new Notification("Homework reminder", { body: msg });
      }
      t.reminded = true;
      changed = true;
    }
  });
  if (changed) { save(); renderList(); }
}

function toast(text, ms = 3000) {
  const el = document.createElement("div");
  el.className = "toast";
  el.textContent = text;
  $("toasts").appendChild(el);
  setTimeout(() => el.remove(), ms);
}

// ---------- Buttons ----------
$("addBtn").addEventListener("click", () => openForm(null));
$("prevMonth").addEventListener("click", () => {
  viewMonth--;
  if (viewMonth < 0) { viewMonth = 11; viewYear--; }
  renderCalendar();
});
$("nextMonth").addEventListener("click", () => {
  viewMonth++;
  if (viewMonth > 11) { viewMonth = 0; viewYear++; }
  renderCalendar();
});
$("todayBtn").addEventListener("click", () => {
  const now = new Date();
  viewYear = now.getFullYear();
  viewMonth = now.getMonth();
  selectedDate = toDateKey(now);
  setFilter("day");
});
document.querySelectorAll("#filters .chip").forEach((c) =>
  c.addEventListener("click", () => setFilter(c.dataset.filter)));

// ---------- Start ----------
updateNotifyButton();
render();
checkReminders();
setInterval(checkReminders, 30000);
setInterval(renderList, 60000); // refresh "due soon" / "overdue" labels
