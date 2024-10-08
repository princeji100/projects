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
    let year = document.getElementById("yearr")
    let yearold = currentDate.getFullYear() - birthDate.getFullYear();
    let month = document.getElementById("monthr")
    let monthold = currentDate.getMonth() - birthDate.getMonth();
    let day = document.getElementById("dayr")
    let dayold = currentDate.getDate() - birthDate.getDate();
    year.innerText = yearold
    month.innerText = monthold
    day.innerText = dayold
  }
}

function checkvalue() {
  let valid = true;
  if (dayinput.value == "") {
    let span = spans[0]
    const red = document.querySelectorAll(".red")
    dayinput.style.borderColor = "red"
    span.style.color = "red"
    red[0].style.visibility = "visible"
    valid = false;
  } else if (dayinput.value < 1 || dayinput.value > 31) {
    let span = spans[0]
    const red = document.querySelectorAll(".red")
    dayinput.style.borderColor = "red"
    span.style.color = "red"
    red[0].style.visibility = "visible"
    red[0].innerHTML = "Must be a valid day"
    valid = false;
  }
  if (monthinput.value == "") {
    let span = spans[2]
    const red = document.querySelectorAll(".red")
    monthinput.style.borderColor = "red"
    span.style.color = "red"
    red[1].style.visibility = "visible"
    valid = false;
  } else if (monthinput.value < 1 || monthinput.value > 12) {
    let span = spans[2]
    const red = document.querySelectorAll(".red")
    monthinput.style.borderColor = "red"
    span.style.color = "red"
    red[1].style.visibility = "visible"
    red[1].innerHTML = "Must be a valid month"
    valid = false;
  }
  if (yearinput.value == "") {
    let span = spans[4]
    const red = document.querySelectorAll(".red")
    yearinput.style.borderColor = "red"
    span.style.color = "red"
    red[2].style.visibility = "visible"
    valid = false;
  } else if (yearinput.value < 1 || yearinput.value > currentDate.getFullYear()) {
    let span = spans[4]
    const red = document.querySelectorAll(".red")
    yearinput.style.borderColor = "red"
    span.style.color = "red"
    red[2].style.visibility = "visible"
    red[2].innerHTML = "Must be in the past"
    valid = false;
  }
  return valid
}
button.addEventListener("click", checkvalue)
button.addEventListener("click",calculateAge)

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
