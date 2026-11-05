// Moves the demo pointer from the input bar picture to the Mac download button.
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
  setTimeout(() => {
    cursor.classList.add("moving");
    atTarget();
    setTimeout(() => cursor.classList.remove("moving"), 1600);
  }, 1100);
  // The layout changes with the window, so the pointer follows the button.
  addEventListener("resize", atTarget);
})();
