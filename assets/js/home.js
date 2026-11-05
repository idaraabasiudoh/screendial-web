// The demo pointer starts on the input bar picture and moves to the Mac download button. Once
// the visitor's mouse moves, it becomes their cursor: the system one is hidden over the page.
(() => {
  const cursor = document.querySelector(".demo-cursor");
  const bar = document.querySelector(".demo-send");
  const target = document.getElementById("download-mac");
  if (!cursor || !bar || !target) return;

  /** The arrow's tip inside its image, which has to sit exactly on the mouse position. */
  const TIP = 4;
  /** Room the name tag needs; closer to the right edge, it moves to the pointer's left. */
  const TAG_ROOM = 120;

  const hero = cursor.parentElement;
  let following = false;

  const moveTo = (x, y) => {
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    cursor.classList.toggle("tag-left", x > hero.clientWidth - TAG_ROOM);
  };
  const place = (element, xShare, yShare) => {
    const box = element.getBoundingClientRect();
    const origin = hero.getBoundingClientRect();
    moveTo(box.left - origin.left + box.width * xShare, box.top - origin.top + box.height * yShare);
  };
  const atTarget = () => place(target, 0.62, 0.72);

  place(bar, 0.5, 0.7);
  cursor.classList.add("ready");
  const intro = setTimeout(() => {
    cursor.classList.add("moving");
    atTarget();
    setTimeout(() => cursor.classList.remove("moving"), 1600);
  }, 1100);

  addEventListener("pointermove", (event) => {
    if (event.pointerType !== "mouse") return;
    if (!following) {
      following = true;
      clearTimeout(intro);
      cursor.classList.remove("moving");
      cursor.classList.add("following");
      hero.classList.add("own-cursor");
    }
    cursor.classList.remove("away");
    const origin = hero.getBoundingClientRect();
    moveTo(event.clientX - origin.left - TIP, event.clientY - origin.top - TIP);
  });

  // Nothing is left behind on the page when the mouse goes to another window.
  document.documentElement.addEventListener("mouseleave", () => {
    if (following) cursor.classList.add("away");
  });

  // The layout changes with the window, so the pointer stays on the button until then.
  addEventListener("resize", () => {
    if (!following) atTarget();
  });
})();
