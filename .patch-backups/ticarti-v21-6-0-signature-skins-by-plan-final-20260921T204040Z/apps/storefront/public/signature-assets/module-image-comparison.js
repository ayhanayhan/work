export function startComparison(obj) {
    const square = new ImageComparisonItem(obj);
}
if (typeof Motion === 'undefined') {
    window.Motion = {
        inView: (element, callback) => {
            const observer = new IntersectionObserver((entries) => {
                entries.forEach(entry => {
                    if (entry.isIntersecting) {
                        callback();
                        observer.unobserve(element);
                    }
                });
            }, {
                rootMargin: '0% 0px -20% 0px',
                threshold: 0
            });
            observer.observe(element);
        }
    };
}
class ImageComparisonItem {
    constructor(obj) {
        this.obj = obj;
        Motion.inView(obj, async () => {
            this.init();
        });
    }

    #button;
    #active = false;
    #boundingClientRect;

    get button() {
        if (!this.#button) {
            this.#button = this.obj.querySelector("[data-comparison-button]") || this.obj.querySelector("button");
        }
        return this.#button;
    }

    get #isHorizontal() {
        return this.obj.dataset.layout === "horizontal";
    }

    get media() {
        if (!this._media) {
            this._media = Array.from(this.obj.querySelectorAll("img, svg"));
        }
        return this._media;
    }

    init() {
        this.startHandler = this.startHandler.bind(this);
        this.endHandler = this.endHandler.bind(this);
        this.onHandler = this.onHandler.bind(this);

        this.button.addEventListener("touchstart", this.startHandler, { passive: false });
        document.body.addEventListener("touchend", this.endHandler, { passive: true });
        document.body.addEventListener("touchmove", this.onHandler, { passive: true });

        this.button.addEventListener("mousedown", this.startHandler);
        document.body.addEventListener("mouseup", this.endHandler);
        document.body.addEventListener("mousemove", this.onHandler);

        requestAnimationFrame(() => this.animate());
    }

    animate() {
        this.obj.setAttribute("animate", "");
        this.obj.classList.add("animating");
        setTimeout(this.#handleAnimationEnd.bind(this), 1800);
    }

    #handleAnimationEnd() {
        this.obj.classList.remove("animating");
    }

    startHandler(event) {
        event.preventDefault();
        this.#active = true;
        this.obj.classList.add("scrolling");
        if (event.type === 'mousedown' && event.pointerId !== undefined) {
            this.button.setPointerCapture(event.pointerId);
        }
    }

    endHandler(event) {
        this.#active = false;
        this.obj.classList.remove("scrolling");
        if (event.type === 'mouseup' && event.pointerId !== undefined) {
            this.button.releasePointerCapture(event.pointerId);
        }
    }

    onHandler(e) {
        if (!this.#active) return;

        requestAnimationFrame(() => {
            const event = e.touches && e.touches[0] || e;

            if (!this.#boundingClientRect) {
                this.#boundingClientRect = this.obj.getBoundingClientRect();
            }
            const { left, top } = this.#boundingClientRect;

            let position;
            if (this.#isHorizontal) {
                position = event.pageX - (left + window.scrollX);
            } else {
                position = event.pageY - (top + window.scrollY);
            }
            this.#scrollIt(position);
        });
    }
    #scrollIt(position) {
        const dimension = this.#isHorizontal ? this.obj.clientWidth : this.obj.clientHeight;
        const MIN_OFFSET = 45;
        const MAX_OFFSET = dimension - MIN_OFFSET;

        const constrainedPosition = Math.max(MIN_OFFSET, Math.min(position, MAX_OFFSET));
        const percent = (constrainedPosition * 100) / dimension;
        this.obj.style.setProperty("--percent", `${percent}%`);
    }
}