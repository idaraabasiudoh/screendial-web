// The demo pointer starts on the input bar picture and moves to the Mac download button. Once
// the visitor's mouse moves, it follows just below and to the right of their cursor instead.
(() => {
  const cursor = document.querySelector(".demo-cursor");
  const bar = document.querySelector(".demo-send");
  const target = document.getElementById("download-mac");
  if (!cursor || !bar || !target) return;

  const OFFSET = { x: 14, y: 16 };
  /** Room the name tag needs; closer to the right edge, it moves to the pointer's left. */
  const TAG_ROOM = 120;
  const FOLLOW_SPEED = 0.16;
  const POINTER_SIZE = 30;

  const hero = cursor.parentElement;
  const reducedMotion = matchMedia("(prefers-reduced-motion: reduce)").matches;
  let following = false;
  let frame = 0;
  const now = { x: 0, y: 0 };
  const goal = { x: 0, y: 0 };

  const draw = () => {
    // Kept on the page, so the pointer never slips past an edge.
    const x = Math.min(now.x, hero.clientWidth - POINTER_SIZE);
    const y = Math.min(now.y, hero.clientHeight - POINTER_SIZE);
    cursor.style.transform = `translate(${x}px, ${y}px)`;
    cursor.classList.toggle("tag-left", now.x > hero.clientWidth - TAG_ROOM);
  };
  const place = (element, xShare, yShare) => {
    const box = element.getBoundingClientRect();
    const origin = hero.getBoundingClientRect();
    now.x = box.left - origin.left + box.width * xShare;
    now.y = box.top - origin.top + box.height * yShare;
    draw();
  };
  const atTarget = () => place(target, 0.62, 0.72);

  const follow = () => {
    const speed = reducedMotion ? 1 : FOLLOW_SPEED;
    now.x += (goal.x - now.x) * speed;
    now.y += (goal.y - now.y) * speed;
    draw();
    const settled = Math.abs(goal.x - now.x) < 0.1 && Math.abs(goal.y - now.y) < 0.1;
    frame = settled ? 0 : requestAnimationFrame(follow);
  };

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
      // Start from where the pointer visibly is, in case the intro is mid-move.
      const box = cursor.getBoundingClientRect();
      const origin = hero.getBoundingClientRect();
      now.x = box.left - origin.left;
      now.y = box.top - origin.top;
      cursor.classList.remove("moving");
    }
    const origin = hero.getBoundingClientRect();
    goal.x = event.clientX - origin.left + OFFSET.x;
    goal.y = event.clientY - origin.top + OFFSET.y;
    if (!frame) frame = requestAnimationFrame(follow);
  });

  // The layout changes with the window, so the pointer stays on the button until it follows.
  addEventListener("resize", () => {
    if (!following) atTarget();
  });
})();
