// Set the launch date
let launchDate = new Date(2026, 0, 1, 0, 0, 0, 0);
// let launchDate = new Date(2024, 8, 28, 1, 30, 0, 0); for test
// Create a countdown timer
function countdown() {
    // Update the time difference
    timeDifference = launchDate.getTime() - new Date().getTime();

    // Convert the time difference to days, hours, minutes, and seconds
    days = Math.floor(timeDifference / (1000 * 60 * 60 * 24));
    hours = Math.floor((timeDifference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    minutes = Math.floor((timeDifference % (1000 * 60 * 60)) / (1000 * 60));
    seconds = Math.floor((timeDifference % (1000 * 60)) / 1000);

    // Display the countdown timer
    days = days< 10 ? "0"+ days:days
    hours = hours< 10 ? "0"+ hours:hours
    minutes = minutes< 10 ? "0"+ minutes:minutes
    document.getElementById("days").innerText = days
    document.getElementById("hours").innerText = hours
    document.getElementById("minutes").innerText = minutes
    document.getElementById("seconds").innerText = seconds.toString().padStart(2,"0");

    // for animation
    document.getElementById("daysanimation").innerText = days
    document.getElementById("hoursanimation").innerText = hours
    document.getElementById("minutesanimation").innerText = minutes
    document.getElementById("secondsanimation").innerText = seconds.toString().padStart(2,"0");



    // Check if the countdown has reached zero
    if (timeDifference <= 0) {
        clearInterval(countdownInterval);
        document.getElementById("countdown").innerText = "Happy new Year";
    }
}

// Start the countdown timer
let countdownInterval = setInterval(countdown, 1000);
// let animationIntervel = setInterval(()=>{
//     const box = document.getElementById("secondsanimation") ;
//     if(box.classList.contains("flip")){
//         box.classList.remove("flip")
//     }else{
//         box.classList.add("flip")
//     }
//     // box.classList.remove("flip")
// },1000)

// Display the initial countdown timer
countdown();