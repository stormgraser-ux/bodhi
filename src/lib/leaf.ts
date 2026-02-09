/** Spawn a single falling leaf from an element's position */
export function spawnLeaf(anchorEl: HTMLElement): void {
  const rect = anchorEl.getBoundingClientRect();
  const x0 = rect.left + rect.width * 0.5;
  const y0 = rect.top + rect.height * 0.5;

  const particle = document.createElement("div");
  particle.className = "leaf-particle";
  particle.style.setProperty("--x0", `${x0}px`);
  particle.style.setProperty("--y0", `${y0}px`);

  const dx = Math.random() * 100 - 50;
  const dy = 200 + Math.random() * 120;
  const r0 = Math.random() * 30 - 15;
  const dr = (180 + Math.random() * 120) * (Math.random() < 0.5 ? -1 : 1);
  const s = 0.9 + Math.random() * 0.25;

  particle.style.setProperty("--dx", `${dx}px`);
  particle.style.setProperty("--dy", `${dy}px`);
  particle.style.setProperty("--r0", `${r0}deg`);
  particle.style.setProperty("--dr", `${dr}deg`);
  particle.style.setProperty("--s", `${s}`);

  particle.innerHTML = `
    <svg class="leaf" viewBox="0 0 64 64" aria-hidden="true">
      <path class="leaf-fill" d="M52 10c-9 1-16 5-21 10C22 28 19 37 18 45c0 6 3 9 9 9 8-1 17-4 25-13 5-5 9-12 10-21 1-4 1-7 0-10-3-1-6-1-10 0Z"/>
      <path class="leaf-vein" d="M49 14C38 18 27 28 22 40c-2 5-3 10-3 14" />
      <path class="leaf-vein" d="M34 24c-3 3-6 7-8 12" />
    </svg>
  `;

  document.body.appendChild(particle);

  const dur = 1200 + Math.random() * 400;
  particle.style.animation = `leafFall ${dur}ms ease-in-out forwards`;

  particle.addEventListener("animationend", () => particle.remove(), { once: true });
}
