// sticky Navigation menu 

let nav = document.querySelector("nav");
let scrollBtn = document.querySelector(".scroll-button a");

let value;

window.onscroll = function(){
    if(document.documentElement.scrollTop > 20){
        nav.classList.add('sticky');
        scrollBtn.style.display = "block";
    }else{
        nav.classList.remove('sticky');
        scrollBtn.style.display = "none";
    }
}
// side Navigation menu
let body = document.querySelector('body');
let navbar = document.querySelector('.navbar');
let menuBtn = document.querySelector('.menu-btn');
let cancelBtn = document.querySelector('.cancel-btn');

menuBtn.onclick = function(){
    navbar.classList.add('active');
    menuBtn.style.opacity = '0';
    menuBtn.style.pointerEvents = 'none';
    body.style.overflowX = 'hidden';
    scrollBtn.style.pointerEvents = 'none' ;
}
cancelBtn.onclick = function(){
    navbar.classList.remove('active');
    menuBtn.style.opacity = '1';
    menuBtn.style.pointerEvents = 'auto';
    body.style.overflowX = 'auto';
    scrollBtn.style.pointerEvents = 'auto' ;
}
// side navigation bar close on click on link
let navLinks = document.querySelectorAll('.menu li a');
for(var i = 0;i < navLinks.length;i++){
    navLinks[i].addEventListener("click",function(){
        navbar.classList.remove('active');
        menuBtn.style.opacity = '1';
        menuBtn.style.pointerEvents = 'auto';
    });
}
