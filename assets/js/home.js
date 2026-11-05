// On load, the app's pointer moves from the input bar picture to the Mac download button. The
// visitor's own cursor (site.css) looks the same, so it steps aside once their mouse moves.
(() => {
  const cursor = document.querySelector(".demo-cursor");
  const bar = document.querySelector(".demo-send");
  const target = document.getElementById("download-mac");
  if (!cursor || !bar || !target) return;

  const hero = cursor.parentElement;
  const place = (element, xShare, yShare) => {
    const box = element.getBoundingClientRect();
    const origin = hero.getBoundingClientRect();
    const x = box.left - origin.left + box.width * xShare;
    const y = box.top - origin.top + box.height * yShare;
    cursor.style.transform = `translate(${x}px, ${y}px)`;
  };
  const atTarget = () => place(target, 0.62, 0.72);

  place(bar, 0.5, 0.7);
  cursor.classList.add("ready");
  const intro = setTimeout(() => {
    cursor.classList.add("moving");
    atTarget();
  }, 1100);

  addEventListener("resize", atTarget);
  addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    clearTimeout(intro);
    cursor.remove();
    removeEventListener("resize", atTarget);
  });
})();
