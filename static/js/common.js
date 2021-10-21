
function loadScript(src, onload) {
    var e = document.createElement('script');
    e.src = src;
    e.onload = onload;
    document.head.append(e);
}
