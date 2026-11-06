
(function () {
var sections = document.querySelectorAll('.video-section__inner');
var reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
sections.forEach(function (wrapper) {
var video = wrapper.querySelector('.video-section__video');
var toggle = wrapper.querySelector('.video-section__toggle');
if (!video) return;
var userPaused = false;
function play() {
var p = video.play();
if (p && p.catch) p.catch(function () {});
}
video.addEventListener('play', function () { wrapper.classList.add('is-playing'); });
video.addEventListener('pause', function () { wrapper.classList.remove('is-playing'); });
if (toggle) {
toggle.addEventListener('click', function () {
if (video.paused) { userPaused = false; play(); }
else { userPaused = true; video.pause(); }
toggle.setAttribute('aria-label', video.paused ? 'Reproducir vídeo' : 'Pausar vídeo');
});
}
if ('IntersectionObserver' in window && !reduceMotion) {
var io = new IntersectionObserver(function (entries) {
entries.forEach(function (entry) {
if (entry.isIntersecting) {
if (!userPaused) play();
} else {
video.pause();
}
});
}, { threshold: 0.35 });
io.observe(wrapper);
}
});
})();
