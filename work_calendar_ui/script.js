const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const calendarBody = document.getElementById("calendarBody");
const halfDayToggle = document.getElementById("halfDayToggle");

function renderTable(isHalfDay) {
  calendarBody.innerHTML = "";
  days.forEach(day => {
    let row = document.createElement("tr");
    row.innerHTML = `
      <td class="border px-2 py-2 text-left">${day}</td>
      ${[...Array(6)].map(() => `
        <td class="border px-2 py-2">
          <input type="checkbox" class="dayCheck hiddenInput" />
          ${isHalfDay ? `
            <select class="ml-2 border rounded px-2 py-1 text-sm">
              <option>Full Day</option>
              <option>1st Half</option>
              <option>2nd Half</option>
            </select>` : ""}
        </td>`).join("")}
    `;
    calendarBody.appendChild(row);
  });
}

// Initial render (without half day dropdowns)
renderTable(false);

// Toggle rendering on checkbox change
halfDayToggle.addEventListener("change", (e) => {
  renderTable(e.target.checked);
});
