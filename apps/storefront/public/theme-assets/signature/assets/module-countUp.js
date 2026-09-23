import { CountUp } from '@theme/countUp';
export function initCountUp(obj) {
    observeOnceVisible(obj, handleElementVisible, 1.0, '-20% 0px -20% 0px');
}
function observeOnceVisible(obj, callbackFunction, threshold = 1.0, middleScreenMargin = '-25% 0px -25% 0px') {
    if (!obj) {
        return;
    }
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting && entry.intersectionRatio >= threshold) {
                callbackFunction(obj);
                observer.unobserve(obj);
            }
        });
    },
    {
        rootMargin: middleScreenMargin,
        threshold: threshold
    });
    observer.observe(obj);
}
function handleElementVisible(obj) {
    const options = {
      startVal: obj.getAttribute("data-counterstart"),
      decimalPlaces: Number(obj.getAttribute("data-decimal_places")),
      separator: obj.getAttribute("data-separator"),
      decimal: obj.getAttribute("data-decimal"),
      prefix: obj.getAttribute("data-prefix"),
      suffix: obj.getAttribute("data-suffix"),
      useGrouping: Boolean(obj.getAttribute("data-grouping")=="false"?false:true)
    };
    let item = new CountUp(obj, obj.getAttribute("data-counterend"), options);
    if (!item.error) {
      item.start();
    } else {
      console.error(item.error);
    }
}