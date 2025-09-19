import { CARD_DEFS } from '../config/cards.js';

function buildCardElement(card, onSelect) {
  const el = document.createElement('div');
  el.className = 'card';
  el.dataset.cardId = card.id;
  el.innerHTML = `
    <div class="card-name">${card.name}</div>
    <div class="card-desc">${card.description}</div>
    <div class="card-cost">${card.cost}⚡</div>
  `;

  const hotkey = document.createElement('div');
  hotkey.className = 'card-hotkey';
  hotkey.textContent = card.hotkey;
  el.appendChild(hotkey);

  el.addEventListener('click', () => onSelect(card.id));
  return el;
}

export function initUI(onCardSelect) {
  const elixirFill = document.getElementById('elixir-fill');
  const elixirText = document.getElementById('elixir-text');
  const cardBar = document.getElementById('card-bar');

  const cardElements = new Map();
  cardBar.innerHTML = '';

  CARD_DEFS.forEach((card) => {
    const element = buildCardElement(card, onCardSelect);
    cardBar.appendChild(element);
    cardElements.set(card.id, element);
  });

  function updateElixir(current, max) {
    const ratio = Math.max(0, Math.min(1, current / max));
    elixirFill.style.width = `${ratio * 100}%`;
    elixirText.textContent = `${Math.floor(current)} / ${max}`;
  }

  function updateCardAvailability(elixir) {
    cardElements.forEach((element, cardId) => {
      const card = CARD_DEFS.find((def) => def.id === cardId);
      if (!card) {
        return;
      }
      if (elixir >= card.cost) {
        element.classList.remove('unavailable');
      } else {
        element.classList.add('unavailable');
      }
    });
  }

  function pulseCard(cardId) {
    const element = cardElements.get(cardId);
    if (!element) {
      return;
    }
    element.style.transform = 'translateY(-6px) scale(1.05)';
    element.style.borderColor = 'rgba(255, 215, 128, 0.85)';
    window.setTimeout(() => {
      element.style.transform = '';
      element.style.borderColor = '';
    }, 160);
  }

  return {
    updateElixir,
    updateCardAvailability,
    pulseCard,
  };
}
