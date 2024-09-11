const btnhamburger = document.querySelector("#btnHamburger") ;
const body = document.querySelector('body');
const header = document.querySelector('.header');
const overlay = document.querySelector('.overlay');
const fadeElements = document.querySelectorAll('.has-fade');
btnhamburger.addEventListener('click',function(){
    console.log("prince")
    if(header.classList.contains('open')) 
    { //close hamburger menu
        body.classList.remove('noScroll');
        header.classList.remove('open');
        fadeElements.forEach(function(element){
            element.classList.remove('fade-in');
            element.classList.add('fade-out');
        })
      
    }else{ //open hamburger menu
        body.classList.add('noScroll');
        header.classList.add('open');
        fadeElements.forEach(function(element){
            element.classList.remove('fade-out');
            element.classList.add('fade-in');
        })
       
    }
})