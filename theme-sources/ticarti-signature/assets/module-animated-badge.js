export function startBadge(obj) {
    const item = new Badge(obj);
}
class Badge{
  constructor(obj) {
    this.obj = obj;
    this.initialized = false;
    this.observer = null;
    this.resizeObserver = null;
    this.initObserver();
  }
  initObserver() {
    this.observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting && !this.initialized) {
          this.init();
        }
      });
    }, { threshold: 0.1 });
    this.observer.observe(this.obj);
  }
  get string() {
    let string = this.obj.getAttribute("data-string");
    return string || "";
  }
  init() {
    if (this.initialized) return;
    this.initialized = true;

    const canUseTrig = CSS.supports("(top: calc(sin(1) * 1px))");
    const OPTIONS = {
      TEXT: this.string,
      SPACING: 1.4
    };
    
    const heading = document.createElement("div");
    const chars = OPTIONS.TEXT.split("");
    
    this.obj.style.setProperty("--char-count", chars.length);

    for (let i = 0; i < chars.length; i++) {
      heading.innerHTML += `<span aria-hidden="true" class="split-char" style="--char-index: ${i};">${chars[i]}</span>`;
    }

    heading.innerHTML += `<span class="char-text">${OPTIONS.TEXT}</span>`;
    heading.classList.add("split-chars");

    this.obj.style.setProperty("--character-width", OPTIONS.SPACING);

    if (canUseTrig) {
      this.obj.style.setProperty("--radius", "calc((var(--character-width) / sin(var(--inner-angle))) * -1ch)");
    } else {
      const angle = 360 / chars.length / (180 / Math.PI);
      this.obj.style.setProperty("--radius", `calc((${OPTIONS.SPACING} / ${Math.sin(angle)}) * -1ch)`);
    }

    this.obj.appendChild(heading);

    requestAnimationFrame(() => {
      this.calculateCircleSize();
      this.initResizeObserver();
    });
  }

  initResizeObserver() {
    this.resizeObserver = new ResizeObserver(() => {
      this.calculateCircleSize();
    });
    this.resizeObserver.observe(this.obj);
  }

  calculateCircleSize() {
    const chars = this.obj.querySelectorAll('.split-char');
    if (chars.length === 0) return;
    const rect = this.obj.getBoundingClientRect();
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    let centerX = 0, centerY = 0;

    chars.forEach(char => {
      const charRect = char.getBoundingClientRect();
      const charCenterX = charRect.left + charRect.width / 2 - rect.left;
      const charCenterY = charRect.top + charRect.height / 2 - rect.top;
      
      minX = Math.min(minX, charCenterX - charRect.width / 2);
      minY = Math.min(minY, charCenterY - charRect.height / 2);
      maxX = Math.max(maxX, charCenterX + charRect.width / 2);
      maxY = Math.max(maxY, charCenterY + charRect.height / 2);
      
      centerX += charCenterX;
      centerY += charCenterY;
    });

    centerX /= chars.length;
    centerY /= chars.length;

    let innerRadius = Infinity;
    chars.forEach(char => {
      const charRect = char.getBoundingClientRect();
      const charCenterX = charRect.left + charRect.width / 2 - rect.left;
      const charCenterY = charRect.top + charRect.height / 2 - rect.top;
      const distance = Math.sqrt(Math.pow(charCenterX - centerX, 2) + Math.pow(charCenterY - centerY, 2));
      const charInnerRadius = distance - (Math.max(charRect.width, charRect.height) / 2);
      innerRadius = Math.min(innerRadius, charInnerRadius);
    });

    const diameter = Math.max(maxX - minX, maxY - minY) + 6;
    this.circleSize = diameter;
    
    this.createBackgroundCircle(diameter);
    const innerDiameter = Math.max(innerRadius * 2 - 5, 10);
    this.createInnerBackgroundCircle(innerDiameter);
  }
  createBackgroundCircle(diameter) {
    const oldCircle = this.obj.querySelector('.animated-badge-background');
    if (oldCircle) oldCircle.remove();
    
    const circle = document.createElement('div');
    circle.classList.add('animated-badge-background');
    circle.style.width = `${diameter}px`;
    circle.style.height = `${diameter}px`;
    this.obj.appendChild(circle);
  }
  createInnerBackgroundCircle(diameter) {
    const oldInnerCircle = this.obj.querySelector('.animated-badge-inner-background');
    if (oldInnerCircle) oldInnerCircle.remove();
    
    const innerCircle = document.createElement('div');
    innerCircle.classList.add('animated-badge-inner-background');
    innerCircle.style.width = `${diameter}px`;
    innerCircle.style.height = `${diameter}px`;
    this.obj.appendChild(innerCircle);
  }
  reinit() {
    this.initialized = false;
    this.obj.innerHTML = '';
    this.init();
  }
}