export function changeSvgId() {
    document.querySelectorAll('svg.placeholder-svg').forEach((svgElement, index) => {
        const uniqueSuffix = `_${index}`;
        svgElement.querySelectorAll('[id]').forEach(elWithId => {
            const oldId = elWithId.id;
            const newId = oldId + uniqueSuffix;
            elWithId.id = newId;
            svgElement.innerHTML = svgElement.innerHTML.replace(new RegExp(`url\\(#${oldId}\\)`, 'g'), `url(#${newId})`);
            svgElement.innerHTML = svgElement.innerHTML.replace(new RegExp(`xlink:href="#${oldId}"`, 'g'), `xlink:href="#${newId}"`);
        });
    });
}