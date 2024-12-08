const dayinput = document.getElementById("day");
const monthinput = document.getElementById("month");
const yearinput = document.getElementById("year");
const spans = document.querySelectorAll(".input span")
const currentDate = new Date();
const button = document.getElementById("button");
function calculateAge() {
  const dayValue = parseInt(dayinput.value);
  const monthValue = parseInt(monthinput.value);
  const yearValue = parseInt(yearinput.value);

  const birthDate = new Date(yearValue, monthValue - 1, dayValue);
  if (checkvalue()) {
    let year = document.getElementById("yearr");
    let month = document.getElementById("monthr");
    let day = document.getElementById("dayr");

    let yearold = currentDate.getFullYear() - birthDate.getFullYear();
    let monthold = currentDate.getMonth() - birthDate.getMonth();
    let dayold = currentDate.getDate() - birthDate.getDate();

    // Adjust year and month if the current date is before the birth date
    if (monthold < 0 || (monthold === 0 && dayold < 0)) {
      yearold--;
      monthold += 12; // Adjust monthold to be positive
    }

    // Adjust dayold if it's negative
    if (dayold < 0) {
      const lastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);
      dayold += lastMonth.getDate(); // Add days from the last month
      monthold--; // Decrement monthold since we're borrowing days from the previous month
      if (monthold < 0) {
        monthold += 12; // Adjust monthold to be positive
        yearold--; // Decrement yearold since we borrowed from the previous year
      }
    }

    year.innerText = yearold;
    month.innerText = monthold;
    day.innerText = dayold;
  }
}
function checkvalue() {
  let valid = true;
  const dayValue = parseInt(dayinput.value);
  const monthValue = parseInt(monthinput.value);
  const yearValue = parseInt(yearinput.value);

  // Check for day input
  if (dayinput.value == "") {
    let span = spans[0];
    const red = document.querySelectorAll(".red");
    dayinput.style.borderColor = "red";
    span.style.color = "red";
    red[0].style.visibility = "visible";
    valid = false;
  } else if (dayValue < 1 || dayValue > 31) {
    let span = spans[0];
    const red = document.querySelectorAll(".red");
    dayinput.style.borderColor = "red";
    span.style.color = "red";
    red[0].style.visibility = "visible";
    red[0].innerHTML = "Must be a valid day";
    valid = false;
  } else if (monthValue === 2) { // February
    const isLeapYear = (yearValue % 4 === 0 && (yearValue % 100 !== 0 || yearValue % 400 === 0));
    if (dayValue > (isLeapYear ? 29 : 28)) {
      let span = spans[0];
      const red = document.querySelectorAll(".red");
      dayinput.style.borderColor = "red";
      span.style.color = "red";
      red[0].style.visibility = "visible";
      red[0].innerHTML = isLeapYear ? "February has only 29 days" : "February has only 28 days";
      valid = false;
    }
  } else if (monthValue === 4 && dayValue > 30) { // April has 30 days
    let span = spans[0];
    const red = document.querySelectorAll(".red");
    dayinput.style.borderColor = "red";
    span.style.color = "red";
    red[0].style.visibility = "visible";
    red[0].innerHTML = "April has only 30 days";
    valid = false;
  } else if (monthValue === 6 && dayValue > 30) { // June has 30 days
    let span = spans[0];
    const red = document.querySelectorAll(".red");
    dayinput.style.borderColor = "red";
    span.style.color = "red";
    red[0].style.visibility = "visible";
    red[0].innerHTML = "June has only 30 days";
    valid = false;
  } else if (monthValue === 9 && dayValue > 30) { // September has 30 days
    let span = spans[0];
    const red = document.querySelectorAll(".red");
    dayinput.style.borderColor = "red";
    span.style.color = "red";
    red[0].style.visibility = "visible";
    red[0].innerHTML = "September has only 30 days";
    valid = false;
  } else if (monthValue === 11 && dayValue > 30) { // November has 30 days
    let span = spans[0];
    const red = document.querySelectorAll(".red");
    dayinput.style.borderColor = "red";
    span.style.color = "red";
    red[0].style.visibility = "visible";
    red[0].innerHTML = "November has only 30 days";
    valid = false;
  }

  // Check for month input
  if (monthinput.value == "") {
    let span = spans[2];
    const red = document.querySelectorAll(".red");
    monthinput.style.borderColor = "red";
    span.style.color = "red";
    red[1].style.visibility = "visible";
    valid = false;
  } else if (monthValue < 1 || monthValue > 12) {
    let span = spans[2];
    const red = document.querySelectorAll(".red");
    monthinput.style.borderColor = "red";
    span.style.color = "red";
    red[1].style.visibility = "visible";
    red[1].innerHTML = "Must be a valid month";
    valid = false;
  }

  // Check for year input
  if (yearinput.value == "") {
    let span = spans[4];
    const red = document.querySelectorAll(".red");
    yearinput.style.borderColor = "red";
    span.style.color = "red";
    red[2].style.visibility = "visible";
    valid = false;
  } else if (yearValue < 1 || yearValue > currentDate.getFullYear()) {
    let span = spans[4];
    const red = document.querySelectorAll(".red");
    yearinput.style.borderColor = "red";
    span.style.color = "red";
    red[2].style.visibility = "visible";
    red[2].innerHTML = "Must be in the past";
    valid = false;
  }

  return valid;
}
button.addEventListener("click", checkvalue)
button.addEventListener("click", calculateAge)
document.addEventListener("keyup", (e) => {
  if (e.key == "Enter") {
    checkvalue();
    calculateAge();
  }
})

dayinput.addEventListener("input", () => {
  spans[0].style.color = "";
  document.querySelectorAll(".red")[0].style.visibility = "hidden";
})
dayinput.addEventListener("blur", () => {
  dayinput.style.borderColor = "hsl(0, 0%, 86%)";
})
monthinput.addEventListener("input", () => {
  spans[2].style.color = "";
  document.querySelectorAll(".red")[1].style.visibility = "hidden";
})
monthinput.addEventListener("blur", () => {
  monthinput.style.borderColor = "hsl(0, 0%, 86%)";
})
yearinput.addEventListener("input", () => {
  spans[4].style.color = "";
  document.querySelectorAll(".red")[2].style.visibility = "hidden";
})
yearinput.addEventListener("blur", () => {
  yearinput.style.borderColor = "hsl(0, 0%, 86%)";
})
