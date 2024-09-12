const principalAmountInput = document.getElementById("mamount")
const interestRateInput = document.getElementById("mrate");
const termInYearsInput = document.getElementById("mterm");
const repaymentInput = document.getElementById("repayment");
const interestOnlyInput = document.getElementById("interestonly");
const span = document.querySelectorAll(".input span")
const calculateButton = document.querySelector(".submit")
const resultSpan = document.querySelector(".amt div");


function reset() {
  principalAmountInput.value = ""
  termInYearsInput.value = ""
  interestRateInput.value = ""
  repaymentInput.checked = false
  interestOnlyInput.checked = false
  // Reset styles and visibility of error indicators
  const spans = document.querySelectorAll(".input span")
  spans.forEach((span) => {
    span.style.backgroundColor = "hsl(202, 86%, 94%)"
    span.style.color = "hsl(200, 24%, 40%)"
  })

  const indicators = document.querySelectorAll(".requerd")
  indicators.forEach((indicator) => {
    indicator.style.visibility = "hidden"
  })

  // Reset radio button indicator
  const radioButtonIndicator = document.querySelectorAll(".requerd")[3]
  radioButtonIndicator.style.visibility = "hidden"

  //reset result screen
  const result = document.querySelector(".active")
  if (result.classList.contains("results")) {
    result.classList.replace("results", "cover")
    const elements = result.childNodes
    Array.from(elements).forEach(e => {
      e.remove()
    });
    result.innerHTML = ` <img src="assets/illustration-empty.svg" alt="">
      <h2>Results shown here</h2>
      <p>Complete the form and click “calculate repayments” to see what your monthly repayments would be.</p>`
  }
}


function requerd() {
  const requiredFields = [principalAmountInput, termInYearsInput, interestRateInput];
  const requiredFieldIndicators = document.querySelectorAll(".requerd");
  const spans = document.querySelectorAll(".input span");

  let allFieldsFilled = true;

  requiredFields.forEach((field, index) => {
    const span = spans[index];
    const indicator = requiredFieldIndicators[index];
    if (field.value === "") {
      allFieldsFilled = false;
      span.style.backgroundColor = "hsl(4, 69%, 50%)";
      span.style.color = "white";
      indicator.style.visibility = "visible";
    } else {
      span.style.backgroundColor = "hsl(202, 86%, 94%)";
      span.style.color = "hsl(200, 24%, 40%)";
      indicator.style.visibility = "hidden";
    }
  });

  calculateButton.addEventListener("click", () => {

    if (repaymentInput.checked && allFieldsFilled) {
      const result = document.querySelector(".active")
      if (result.classList.contains("cover")) {
        result.classList.replace("cover", "results")
        const elements = result.childNodes
        Array.from(elements).forEach(e => {
          e.remove()
        });
        result.innerHTML = `<h2>Your results</h2>
            <p> Your results are shown below based on the information you provided. To adjust the results, edit the form and
            click “calculate repayments” again.</p>
            <div class="amt">
            <div class="cfirst">
            <span>Your monthly repayments</span>
            <div> ₹ ${calculateEMI()}</div>
            </div>
            <div class="csecond">
            <span>  Total you'll repay over the term</span>
            <div>₹ ${(calculateEMI() * termInYearsInput.value * 12).toFixed(2)}</div>
            </div>
            </div>`
      } else {
        const elements = result.childNodes
        Array.from(elements).forEach(e => {
          e.remove()
        });
        result.innerHTML = `<h2>Your results</h2>
            <p> Your results are shown below based on the information you provided. To adjust the results, edit the form and
            click “calculate repayments” again.</p>
            <div class="amt">
            <div class="cfirst">
            <span>Your monthly repayments</span>
            <div> ₹ ${calculateEMI()}</div>
            </div>
            <div class="csecond">
            <span>  Total you'll repay over the term</span>
            <div>₹ ${(calculateEMI() * termInYearsInput.value * 12).toFixed(2)}</div>
            </div>
            </div>`
      }
    } else if (interestOnlyInput.checked && allFieldsFilled) {
      const result = document.querySelector(".active")
      if (result.classList.contains("cover")) {
        result.classList.replace("cover", "results")
        const elements = result.childNodes
        Array.from(elements).forEach(e => {
          e.remove()
        });
        result.innerHTML = `<h2>Your results</h2>
            <p> Your results are shown below based on the information you provided. To adjust the results, edit the form and
            click “calculate Interest” again.</p>
            <div class="amt">
            <div class="cfirst">
            <span>Your monthly Interest</span>
            <div> ₹ ${(((calculateEMI() * termInYearsInput.value * 12) - principalAmountInput.value) / (termInYearsInput.value * 12)).toFixed(2)}</div>
            </div>
            <div class="csecond">
            <span>  Total you'll repay over the term</span>
            <div>₹ ${(calculateEMI() * termInYearsInput.value * 12 - principalAmountInput.value).toFixed(2)}</div>
            </div>
            </div>`
      } else {
        const elements = result.childNodes
        Array.from(elements).forEach(e => {
          e.remove()
        });
        result.innerHTML = `<h2>Your results</h2>
            <p> Your results are shown below based on the information you provided. To adjust the results, edit the form and
            click “calculate repayments” again.</p>
            <div class="amt">
            <div class="cfirst">
            <span>Your monthly repayments</span>
            <div> ₹ ${(((calculateEMI() * termInYearsInput.value * 12) - principalAmountInput.value) / (termInYearsInput.value * 12)).toFixed(2)}</div>
            </div>
            <div class="csecond">
            <span>  Total you'll repay over the term</span>
            <div>₹ ${(calculateEMI() * termInYearsInput.value * 12 - principalAmountInput.value).toFixed(2)}</div>
            </div>
            </div>`
      }
    } else if (interestOnlyInput.checked == false && repaymentInput.checked == false) {
      const radioButtonIndicator = document.querySelectorAll(".requerd")[3];
      radioButtonIndicator.style.visibility = "visible";
    }
  })
}
principalAmountInput.addEventListener("input", () => {
  if (principalAmountInput.value !== "") {
    const span = document.querySelector(".input span");
    const inputs = document.querySelectorAll(".input");
    const input = inputs[0]
    input.style.border = "1px solid hsl(61, 70%, 52%)";
    span.style.backgroundColor = "hsl(61, 70%, 52%)";
    span.style.color = "hsl(200, 24%, 40%)";
    const indicator = document.querySelector(".requerd");
    indicator.style.visibility = "hidden";
  }
});
principalAmountInput.addEventListener("focus", () => {
  const spans = document.querySelectorAll(".input span");
  const inputs = document.querySelectorAll(".input");
  const input = inputs[0]
  input.style.border = "1px solid hsl(61, 70%, 52%)";
  const span = spans[0];
  span.style.backgroundColor = "hsl(61, 70%, 52%)";
  span.style.color = "hsl(200, 24%, 40%)";
});
principalAmountInput.addEventListener("blur", () => {
  const spans = document.querySelectorAll(".input span");
  const inputs = document.querySelectorAll(".input");
  const input = inputs[0]
  input.style.border = "1px solid hsl(200, 24%, 40%)";
  const span = spans[0];
  span.style.backgroundColor = "hsl(202, 86%, 94%)";
  span.style.color = "hsl(200, 24%, 40%)";
});


termInYearsInput.addEventListener("input", () => {
  if (termInYearsInput.value !== "") {
    const spans = document.querySelectorAll(".input span");
    const span = spans[1];
    span.style.backgroundColor = "hsl(61, 70%, 52%)";
    span.style.color = "hsl(200, 24%, 40%)";
    const indicators = document.querySelectorAll(".requerd");
    const indicator = indicators[1];
    indicator.style.visibility = "hidden";
  }
});
termInYearsInput.addEventListener("focus", () => {
  const spans = document.querySelectorAll(".input span");
  const span = spans[1];
  const inputs = document.querySelectorAll(".input");
  const input = inputs[1]
  input.style.border = "1px solid hsl(61, 70%, 52%)";
  span.style.backgroundColor = "hsl(61, 70%, 52%)";
  span.style.color = "hsl(200, 24%, 40%)";
});
termInYearsInput.addEventListener("blur", () => {
  const spans = document.querySelectorAll(".input span");
  const span = spans[1];
  const inputs = document.querySelectorAll(".input");
  const input = inputs[1]
  input.style.border = "1px solid hsl(200, 24%, 40%)";
  span.style.backgroundColor = "hsl(202, 86%, 94%)";
  span.style.color = "hsl(200, 24%, 40%)";
});


interestRateInput.addEventListener("input", () => {
  if (interestRateInput.value !== "") {
    const spans = document.querySelectorAll(".input span");
    const span = spans[2];
    const inputs = document.querySelectorAll(".input");
    const input = inputs[2]
    span.style.backgroundColor = "hsl(61, 70%, 52%)";
    span.style.color = "hsl(200, 24%, 40%)";
    const indicators = document.querySelectorAll(".requerd");
    const indicator = indicators[2];
    indicator.style.visibility = "hidden";
  }
});
interestRateInput.addEventListener("focus", () => {
  const spans = document.querySelectorAll(".input span");
  const span = spans[2];
  const inputs = document.querySelectorAll(".input");
  const input = inputs[2]
  input.style.border = "1px solid hsl(61, 70%, 52%)";
  span.style.backgroundColor = "hsl(61, 70%, 52%)";
  span.style.color = "hsl(200, 24%, 40%)";
});
interestRateInput.addEventListener("blur", () => {
  const spans = document.querySelectorAll(".input span");
  const span = spans[2];
  const inputs = document.querySelectorAll(".input");
  const input = inputs[2]
  input.style.border = "1px solid hsl(200, 24%, 40%)";
  span.style.backgroundColor = "hsl(202, 86%, 94%)";
  span.style.color = "hsl(200, 24%, 40%)";
});
repaymentInput.addEventListener("focus", () => {
  const radios = document.querySelectorAll(".third .input");
  radios[0].style.backgroundColor = "rgba(255, 255, 0, 0.4)";
  const inputs = document.querySelectorAll(".input");
  const input =inputs[3]
  input.style.border = "1px solid hsl(61, 70%, 52%)";
});
repaymentInput.addEventListener("blur", () => {
  const radios = document.querySelectorAll(".third .input");
  radios[0].style.backgroundColor = "white";
  const inputs = document.querySelectorAll(".input");
  const input =inputs[3]
  input.style.border = "1px solid hsl(200, 24%, 40%)";
});
interestOnlyInput.addEventListener("focus", () => {
  const radios = document.querySelectorAll(".third .input");
  radios[1].style.backgroundColor = "rgba(255, 255, 0, 0.4)";
  const inputs = document.querySelectorAll(".input");
  const input =inputs[4]
  input.style.border = "1px solid hsl(61, 70%, 52%)";
});
interestOnlyInput.addEventListener("blur", () => {
  const radios = document.querySelectorAll(".third .input");
  radios[1].style.backgroundColor = "white";
  const inputs = document.querySelectorAll(".input");
  const input =inputs[4]
  input.style.border = "1px solid hsl(200, 24%, 40%)";
});


// Add event listeners to the radio buttons
const radioButtons = document.querySelectorAll('input[name="MortgageType"]');
radioButtons.forEach((radioButton) => {
  radioButton.addEventListener("change", () => {
    if (radioButton.checked) {
      const radioButtonIndicator = document.querySelectorAll(".requerd")[3];
      radioButtonIndicator.style.visibility = "hidden";
    }
  });
});




const MONTHS_IN_YEAR = 12;
const PERCENTAGE_TO_DECIMAL = 100;
function calculateEMI(principalAmount, termInYears, interestRate) {
  principalAmount = parseFloat(principalAmountInput.value);
  termInYears = parseFloat(termInYearsInput.value);
  interestRate = parseFloat(interestRateInput.value);
  const monthlyInterestRate = interestRate / (PERCENTAGE_TO_DECIMAL * MONTHS_IN_YEAR);
  const numberOfMonths = termInYears * MONTHS_IN_YEAR;
  const emi = (principalAmount * monthlyInterestRate * (1 + monthlyInterestRate) ** numberOfMonths) / ((1 + monthlyInterestRate) ** numberOfMonths - 1);
  return emi.toFixed(2);
}

// Calculation Formula: EMI = [P x Ix (1+I) ^T]/ [((1+I) ^T)-1)]
// where –

// P is the principal amount
// I is the rate of interest / (100×12)
// T is the number of years x 12
// Total interest = monthly EMI x T – P

// Total amount = monthly EMI x T

