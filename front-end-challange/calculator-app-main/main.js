const display = document.getElementById("display")
const zero = document.getElementById("0")
const one = document.getElementById("1")
const two = document.getElementById("2")
const three = document.getElementById("3")
const four = document.getElementById("4")
const five = document.getElementById("5")
const six = document.getElementById("6")
const seven = document.getElementById("7")
const eight = document.getElementById("8")
const nine = document.getElementById("9")
const point = document.getElementById("point")
const multiply = document.getElementById("multiply")
const divide = document.getElementById("divide")
const minus = document.getElementById("minus")
const add = document.getElementById("add")
const del = document.getElementById("del")
const reset = document.getElementById("reset")
const equal = document.getElementById("equal")
const operators = ['+', '-', '*', '/', '.'];
document.body.style.userSelect = "none"
display.disabled = true;
function handleButtonClick(value) {
    setTimeout(() => {
        this.style.transform = "scale(1)";
    }, 100);
    this.style.transform = "scale(0.9)";
    display.value += value;
}

zero.addEventListener("click", () => handleButtonClick.call(zero, "0"));
one.addEventListener("click", () => handleButtonClick.call(one, "1"));
two.addEventListener("click", () => handleButtonClick.call(two, "2"))
three.addEventListener("click", () => handleButtonClick.call(three, "3"))
four.addEventListener("click", () => handleButtonClick.call(four, "4"))
five.addEventListener("click", () => handleButtonClick.call(five, "5"))
six.addEventListener("click", () => handleButtonClick.call(six, "6"))
seven.addEventListener("click", () => handleButtonClick.call(seven, "7"))
eight.addEventListener("click", () => handleButtonClick.call(eight, "8"))
nine.addEventListener("click", () => handleButtonClick.call(nine, "9"))
point.addEventListener("click", () => {
    // Check if the last input was an operator
    if (operators.includes(display.value.slice(-1)) && operators.includes(display.value)) {
        console.log("Cannot enter two operators in a row.");
        return; // Prevent adding the operator
    }
    setTimeout(() => {
        point.style.scale = "none"
    }, 100)
    point.style.scale = "0.9"
    display.value += "."
})
add.addEventListener("click", () => {
    // Check if the last input was an operator
    if (operators.includes(display.value.slice(-1)) && operators.includes(display.value)) {
        console.log("Cannot enter two operators in a row.");
        return; // Prevent adding the operator
    }
    setTimeout(() => {
        add.style.scale = "none"
    }, 100)
    add.style.scale = "0.9"
    display.value += "+"
})
minus.addEventListener("click", () => {
    // Check if the last input was an operator
    if (operators.includes(display.value.slice(-1)) && operators.includes(display.value)) {
        console.log("Cannot enter two operators in a row.");
        return; // Prevent adding the operator
    }
    setTimeout(() => {
        minus.style.scale = "none"
    }, 100)
    minus.style.scale = "0.9"
    display.value += "-"
})
divide.addEventListener("click", () => {
    // Check if the last input was an operator
    if (operators.includes(display.value.slice(-1)) && operators.includes(display.value)) {
        console.log("Cannot enter two operators in a row.");
        return; // Prevent adding the operator
    }
    setTimeout(() => {
        divide.style.scale = "none"
    }, 100)
    divide.style.scale = "0.9"
    display.value += "/"
})
multiply.addEventListener("click", () => {
    // Check if the last input was an operator
    if (operators.includes(display.value.slice(-1)) && operators.includes(display.value)) {
        console.log("Cannot enter two operators in a row.");
        return; // Prevent adding the operator
    }
    setTimeout(() => {
        multiply.style.scale = "none"
    }, 100)
    multiply.style.scale = "0.9"
    display.value += "x"
})
del.addEventListener("click", () => {
    setTimeout(() => {
        del.style.scale = "none"
    }, 100)
    del.style.scale = "0.9"
    display.value = display.value.slice(0, -1)
})
reset.addEventListener("click", () => {
    setTimeout(() => {
        reset.style.scale = "none"
    }, 100)
    reset.style.scale = "0.9"
    display.value = ""
})
equal.addEventListener("click", () => {
    let equation = display.value.replace("x", "*")

    if (display.value != "") {
        let ans = eval(equation)
        setTimeout(() => {
            equal.style.scale = "none"
        }, 100)
        equal.style.scale = "0.9"
        display.value = ans
    }
})
document.addEventListener("keyup", (e) => {
    if (e.key == "Enter") {
        let equation = display.value.replaceAll("x", "*")

        let ans = eval(equation)
        if (Number(ans)) {
            display.value = ans
        } else {
            console.log(typeof ans);
            display.value = ""
        }

        setTimeout(() => {
            equal.style.scale = "none"
        }, 100)
        equal.style.scale = "0.9"
    }

    if (e.key == ".") {
        // Check if the last input was an operator
        if (operators.includes(display.value.slice(-1)) && operators.includes(display.value)) {
            console.log("Cannot enter two operators in a row.");
            return; // Prevent adding the operator
        }
        setTimeout(() => {
            point.style.scale = "none"
        }, 100)
        point.style.scale = ".9"
        display.value += "."
    }
    if (e.key == "0") {
        setTimeout(() => {
            zero.style.scale = "none"
        }, 100)
        zero.style.scale = ".9"
        if (display.value == "") {
            console.log("0 not allowed");
        } else {
            display.value += "0"
        }
    }
    if (e.key == "1") {
        setTimeout(() => {
            one.style.scale = "none"
        }, 100)
        one.style.scale = "0.9"
        display.value += "1"
    }
    if (e.key == "2") {
        setTimeout(() => {
            two.style.scale = "none"
        }, 100)
        two.style.scale = "0.9"
        display.value += "2"
    }
    if (e.key == "3") {
        setTimeout(() => {
            three.style.scale = "none"
        }, 100)
        three.style.scale = "0.9"
        display.value += "3"
    }
    if (e.key == "4") {
        setTimeout(() => {
            four.style.scale = "none"
        }, 100)
        four.style.scale = "0.9"
        display.value += "4"
    }
    if (e.key == "5") {
        setTimeout(() => {
            five.style.scale = "none"
        }, 100)
        five.style.scale = "0.9"
        display.value += "5"
    }
    if (e.key == "6") {
        setTimeout(() => {
            six.style.scale = "none"
        }, 100)
        six.style.scale = "0.9"
        display.value += "6"
    }
    if (e.key == "7") {
        setTimeout(() => {
            seven.style.scale = "none"
        }, 100)
        seven.style.scale = "0.9"
        display.value += "7"
    }
    if (e.key == "8") {
        setTimeout(() => {
            eight.style.scale = "none"
        }, 100)
        eight.style.scale = "0.9"
        display.value += "8"
    }
    if (e.key == "9") {
        setTimeout(() => {
            nine.style.scale = "none"
        }, 100)
        nine.style.scale = "0.9"
        display.value += "9"
    }
    if (e.key == "+") {
        // Check if the last input was an operator
        if (operators.includes(display.value.slice(-1)) && operators.includes(display.value)) {
            console.log("Cannot enter two operators in a row.");
            return; // Prevent adding the operator
        }
        setTimeout(() => {
            add.style.scale = "none"
        }, 100)
        add.style.scale = "0.9"
        display.value += "+"
    }
    if (e.key == "-") {
        // Check if the last input was an operator
        if (operators.includes(display.value.slice(-1)) && operators.includes(display.value)) {
            console.log("Cannot enter two operators in a row.");
            return; // Prevent adding the operator
        }
        setTimeout(() => {
            minus.style.scale = "none"
        }, 100)
        minus.style.scale = "0.9"
        display.value += "-"
    }
    if (e.key == "*") {
        // Check if the last input was an operator
        if (operators.includes(display.value.slice(-1).replace("x", "*")) && operators.includes(display.value.replaceAll("x", "*"))) {
            console.log("Cannot enter two operators in a row.");
            return; // Prevent adding the operator
        }
        setTimeout(() => {
            multiply.style.scale = "none"
        }, 100)
        multiply.style.scale = "0.9"
        display.value += "x"
    }
    if (e.key == "/") {
        // Check if the last input was an operator
        if (operators.includes(display.value.slice(-1)) && operators.includes(display.value)) {
            console.log("Cannot enter two operators in a row.");
            return; // Prevent adding the operator
        }
        setTimeout(() => {
            divide.style.scale = "none"
        }, 100)
        divide.style.scale = "0.9"
        display.value += "/"
    }
    if (e.key == "Backspace") {
        if (display.value != "") {
            setTimeout(() => {
                del.style.scale = "none"
            }, 100)
            del.style.scale = "0.9"
        }
    }
    if (e.key == "Delete") {
        if (display.value != "") {
            setTimeout(() => {
                reset.style.scale = "none"
            }, 100)
            reset.style.scale = "0.9"
            display.value = ""
        }
    }
    if (e.key == "Escape") {
        if (display.value != "") {
            setTimeout(() => {
                reset.style.scale = "none"
            }, 100)
            reset.style.scale = "0.9"
            display.value = ""
        }
    }



})
document.addEventListener("keydown", (e) => {
    if (e.key == "Backspace") {
        display.value = display.value.slice(0, -1)
    }
})
// theme part
let theme2 = document.getElementById("theme2");
let theme3 = document.getElementById("theme3");
function themChanger(primarycolor, textcolor, buttoncolor, equalcolor) {
    document.getElementById("container").classList.replace("bg-slate-600", primarycolor)

}
// themChanger("bg-gray-200","fkuhs","jf","duh")   
