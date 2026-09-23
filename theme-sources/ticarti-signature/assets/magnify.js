function createOverlay(image) {
  const overlayImage = document.createElement('img');
  overlayImage.setAttribute('src', `${image.src}`);
  overlay = document.createElement('div');
  prepareOverlay(overlay, overlayImage);
  overlayImage.onload = () => {
    image.parentElement.insertBefore(overlay, image);
    image.parentElement.parentElement.querySelector('.zoom-icon').classList.add('zoom-icon-minus');
  };

  return overlay;
}
function prepareOverlay(container, image) {
  container.setAttribute('class', 'image-magnify-full-size');
  container.setAttribute('aria-hidden', 'true');
  container.style.backgroundImage = `url('${image.src}')`;
  container.style.backgroundColor = 'var(--gradient-background)';
}
function moveWithHover(image, event, zoomRatio) {
  const ratio = image.height / image.width;
  const container = event.target.getBoundingClientRect();
  const xPosition = event.clientX - container.left;
  const yPosition = event.clientY - container.top;
  const xPercent = `${xPosition / (image.clientWidth / 100)}%`;
  const yPercent = `${yPosition / ((image.clientWidth * ratio) / 100)}%`;
  overlay.style.backgroundPosition = `${xPercent} ${yPercent}`;
  overlay.style.backgroundSize = `${image.width * zoomRatio}px`;
}
function magnify(image, zoomRatio) {
  const overlay = createOverlay(image);
  overlay.onclick = () => {
    overlay.remove();
    image.parentElement.parentElement.querySelector('.zoom-icon').classList.remove('zoom-icon-minus');
  }
  overlay.onmousemove = (event) => moveWithHover(image, event, zoomRatio);
  overlay.onmouseleave = () => {
    overlay.remove();
    image.parentElement.parentElement.querySelector('.zoom-icon').classList.remove('zoom-icon-minus');
  }
}
function enableZoomOnHover(zoomRatio) {
  const images = document.querySelectorAll('.image-magnify-hover');
  images.forEach((image) => {
    image.onclick = (event) => {
      magnify(image, zoomRatio);
      moveWithHover(image, event, zoomRatio);
    };
  });
}
enableZoomOnHover(2);
