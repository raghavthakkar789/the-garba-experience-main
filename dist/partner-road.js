/* The market stays fixed. Scroll only advances the friends along one winding road. */
(() => {
  'use strict';
  const road = document.querySelector('#partner-road');
  if (!road) return;
  const world = road.querySelector('.road-world');
  const friends = road.querySelector('.road-friends');
  const points = [[5,23],[92,23],[95,26],[95,45],[92,48],[8,48],[5,51],[5,70],[8,73],[92,73],[95,76],[95,95],[92,98],[5,98]];
  const dialog = document.querySelector('#partner-dialog');
  const dialogLogo = dialog.querySelector('img');
  const shops = [...road.querySelectorAll('.partner-shop')];
  const autoCard = road.querySelector('.partner-auto-card');
  let nearbyShop = null;
  let lastProgress = 0;
  let opener;
  const ease = value => { const t = Math.max(0, Math.min(1, value)); return t * t * (3 - 2 * t); };
  function matchCard(shop, card) {
    card.classList.toggle("featured-partner", shop.classList.contains("featured-partner"));
    const colours = getComputedStyle(shop);
    for (const property of ['--card-bg', '--card-accent'])
      card.style.setProperty(property, colours.getPropertyValue(property));
  }
  function closeAutoCard() {
    autoCard.hidden = true;
    delete road.dataset.nearbyShop;
    nearbyShop = null;
  }
  function updateAutoCard(x, y, worldBounds, facing) {
    if (!document.documentElement.classList.contains('cinematic') ||
        !road.classList.contains('is-active') || dialog.open || document.hidden) {
      closeAutoCard();
      return;
    }
    const footX = worldBounds.left + x * worldBounds.width / 100;
    const footY = worldBounds.top + y * worldBounds.height / 100;
    const nearby = shops.find(shop => {
      const bounds = shop.getBoundingClientRect();
      // Only the shop frontage counts; gaps and turns have no open card.
      return bounds.width > 0 && footX >= bounds.left + bounds.width * .15 &&
        footX <= bounds.right - bounds.width * .15 && footY >= bounds.bottom - 2 &&
        footY <= bounds.bottom + worldBounds.height * .09;
    });
    if (!nearby) { closeAutoCard(); return; }
    const bounds = nearby.getBoundingClientRect();
    const across = (footX - bounds.left - bounds.width * .15) / (bounds.width * .7);
    const passed = facing < 0 ? 1 - across : across;
    const enter = ease(passed / .2);
    const leave = ease((passed - .65) / .35);
    autoCard.style.setProperty('--partner-card-y', `${((1 - enter) * 34 + leave * Math.min(innerHeight * .38, 320)).toFixed(2)}px`);
    autoCard.style.setProperty('--partner-card-opacity', (enter * (1 - leave)).toFixed(4));
    if (nearby === nearbyShop) return;
    nearbyShop = nearby;
    matchCard(nearby, autoCard);
    autoCard.querySelector('.partner-auto-name').textContent = nearby.querySelector('.shop-name').textContent;
    autoCard.querySelector('.partner-auto-role').textContent = nearby.querySelector('.shop-role').textContent;
    const logo = nearby.querySelector('.shop-logo');
    const cardLogo = autoCard.querySelector('img');
    cardLogo.hidden = !logo;
    if (logo) cardLogo.src = logo.getAttribute('src');
    else cardLogo.removeAttribute('src');
    road.dataset.nearbyShop = String(shops.indexOf(nearby));
    autoCard.hidden = false;
  }
  road.querySelectorAll('.shop-open').forEach(button => {
    button.disabled = false;
    button.addEventListener('click', () => {
      const shop = button.closest('.partner-shop');
      closeAutoCard();
      opener = button;
      dialog.classList.remove('brand-details');
      delete dialog.dataset.brand;
      matchCard(shop, dialog);
      dialog.querySelector('#partner-dialog-name').textContent = shop.querySelector('.shop-name').textContent;
      dialog.querySelector('#partner-dialog-role').textContent = shop.querySelector('.shop-role').textContent;
      const logo = shop.querySelector('.shop-logo');
      dialogLogo.hidden = !logo;
      if (logo) dialogLogo.src = logo.getAttribute('src');
      else dialogLogo.removeAttribute('src');
      dialog.showModal();
    });
  });
  document.querySelectorAll('[data-brand-name]').forEach(button => {
    button.addEventListener('click', event => {
      event.preventDefault();
      closeAutoCard();
      opener = button;
      dialog.classList.remove('featured-partner');
      dialog.classList.add('brand-details');
      dialog.dataset.brand = button.classList.contains('brand-ethereum') ? 'ethereum' :
        button.classList.contains('brand-tge') ? 'tge' : 'partner';
      dialog.style.removeProperty('--card-bg');
      dialog.style.removeProperty('--card-accent');
      dialog.querySelector('#partner-dialog-name').textContent = button.dataset.brandName;
      dialog.querySelector('#partner-dialog-role').textContent = button.dataset.brandRole;
      dialogLogo.src = button.querySelector('img').getAttribute('src');
      dialogLogo.hidden = false;
      dialog.showModal();
    });
  });
  dialog.addEventListener('close', () => {
    if (opener && !opener.closest('[inert]')) opener.focus({ preventScroll:true });
  });
  dialog.addEventListener('keydown', event => {
    // Escape belongs to the open board, even while the story music is playing.
    if (event.key === 'Escape') event.stopPropagation();
  });
  function render(progress) {
    lastProgress = progress;
    const width = world.clientWidth || innerWidth;
    const height = world.clientHeight || innerHeight;
    const lengths = points.slice(1).map((point,index) => Math.hypot((point[0]-points[index][0])*width,(point[1]-points[index][1])*height));
    const total = lengths.reduce((sum,length) => sum+length,0);
    let remaining = Math.max(0,Math.min(1,(progress-.02)/.96))*total;
    let segment = 0;
    while (segment < lengths.length-1 && remaining > lengths[segment]) remaining -= lengths[segment++];
    const fraction = remaining/lengths[segment];
    const from = points[segment], to = points[segment+1];
    const x = from[0]+(to[0]-from[0])*fraction;
    const y = from[1]+(to[1]-from[1])*fraction;
    friends.style.left = `${x}%`;
    friends.style.top = `${y}%`;
    friends.style.setProperty('--walk-facing', to[0] < from[0] ? -1 : to[0] > from[0] ? 1 : segment < 5 ? 1 : segment < 8 ? -1 : 1);
    friends.style.setProperty('--walk-bob', `${Math.sin(progress*240)*1.6}px`);
    friends.style.setProperty('--walk-sway', `${Math.sin(progress*120)*1.1}deg`);
    updateAutoCard(x, y, world.getBoundingClientRect(), to[0] - from[0]);
  }
  road.addEventListener('story-progress', event => render(event.detail));
  const resetInactive = () => {
    if (!document.documentElement.classList.contains('cinematic')) friends.removeAttribute('style');
    if (!document.documentElement.classList.contains('cinematic') || !road.classList.contains('is-active')) closeAutoCard();
  };
  const stateObserver = new MutationObserver(resetInactive);
  stateObserver.observe(document.documentElement,{attributes:true,attributeFilter:['class']});
  stateObserver.observe(road,{attributes:true,attributeFilter:['class']});
  addEventListener('pagehide', closeAutoCard);
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) closeAutoCard();
    else if (road.classList.contains('is-active') && document.documentElement.classList.contains('cinematic')) render(lastProgress);
  });
})();
