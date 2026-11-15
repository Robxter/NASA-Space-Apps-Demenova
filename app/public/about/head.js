// The kit's two head lines (assets/starter.html, moments/_demo), moved into a file for the site CSP (script-src 'self').
// m-enter: the hero's words wait for motion.js (700 ms fallback). mo-js: moments may hide what they animate (2.5 s fallback).
document.documentElement.classList.add('m-enter');
setTimeout(() => document.documentElement.classList.add('m-enter-done'), 700);
document.documentElement.classList.add('mo-js');
setTimeout(() => document.documentElement.classList.add('mo-safe'), 2500);
