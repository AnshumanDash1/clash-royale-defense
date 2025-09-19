import { CARD_DEFS } from '../config/cards.js';

const CARD_LOOKUP = new Map(CARD_DEFS.map((card) => [card.id, card]));
const SLOT_LABELS = ['Left Click', 'Right Click'];

function getCard(cardId) {
  const card = CARD_LOOKUP.get(cardId);
  if (!card) {
    throw new Error(`Unknown card id: ${cardId}`);
  }
  return card;
}

function buildActiveCardElement(card, slotIndex, onSlotSelect) {
  const el = document.createElement('div');
  el.className = 'card card-active-slot';
  el.dataset.cardId = card.id;
  el.dataset.slotIndex = `${slotIndex}`;
  el.innerHTML = `
    <div class="card-label">${SLOT_LABELS[slotIndex] || ''}</div>
    <div class="card-main">
      <div class="card-name">${card.name}</div>
      <div class="card-desc">${card.description}</div>
    </div>
    <div class="card-cost">${card.cost}⚡</div>
  `;
  el.addEventListener('click', () => onSlotSelect(slotIndex));
  return el;
}

function buildPreviewCardElement(card) {
  const el = document.createElement('div');
  el.className = 'card-preview';
  el.dataset.cardId = card.id;
  el.innerHTML = `
    <div class="card-name">${card.name}</div>
    <div class="card-cost">${card.cost}⚡</div>
  `;
  return el;
}

export function initUI(onSlotSelect) {
  const uiLayer = document.getElementById('ui-layer');
  const elixirFill = document.getElementById('elixir-fill');
  const elixirText = document.getElementById('elixir-text');
  const cardBar = document.getElementById('card-bar');

  cardBar.innerHTML = '';

  const queueContainer = document.createElement('div');
  queueContainer.id = 'card-queue';
  queueContainer.className = 'card-queue';
  cardBar.appendChild(queueContainer);

  const activeContainer = document.createElement('div');
  activeContainer.id = 'card-active';
  activeContainer.className = 'card-active';
  cardBar.appendChild(activeContainer);

  const existingOverlay = document.getElementById('wave-overlay');
  if (existingOverlay) {
    existingOverlay.remove();
  }

  const waveOverlay = document.createElement('div');
  waveOverlay.id = 'wave-overlay';
  waveOverlay.className = 'wave-overlay hidden';
  waveOverlay.innerHTML = `
    <div class="wave-panel">
      <h2 class="wave-title">Wave Cleared</h2>
      <p class="wave-message">Brace yourself for the next assault?</p>
      <div class="wave-actions">
        <button type="button" data-action="continue">Continue</button>
        <button type="button" data-action="change">Change Cards</button>
      </div>
    </div>
  `;
  document.body.appendChild(waveOverlay);

  const waveTitle = waveOverlay.querySelector('.wave-title');
  const waveMessage = waveOverlay.querySelector('.wave-message');
  const continueButton = waveOverlay.querySelector('[data-action="continue"]');
  const changeButton = waveOverlay.querySelector('[data-action="change"]');

  let slotRefs = [];
  let overlayHandlers = { onContinue: null, onChange: null };

  continueButton.addEventListener('click', () => {
    waveOverlay.classList.add('hidden');
    if (typeof overlayHandlers.onContinue === 'function') {
      overlayHandlers.onContinue();
    }
  });

  changeButton.addEventListener('click', () => {
    window.alert("Sorry, you haven't unlocked this yet!");
    if (typeof overlayHandlers.onChange === 'function') {
      overlayHandlers.onChange();
    }
  });

  function renderActiveSlots(activeIds) {
    activeContainer.innerHTML = '';
    slotRefs = activeIds.map((cardId, index) => {
      const card = getCard(cardId);
      const element = buildActiveCardElement(card, index, onSlotSelect);
      activeContainer.appendChild(element);
      return { card, element };
    });
  }

  function renderQueue(queueIds) {
    queueContainer.innerHTML = '';
    queueIds.forEach((cardId) => {
      const card = getCard(cardId);
      const element = buildPreviewCardElement(card);
      queueContainer.appendChild(element);
    });
  }

  function updateElixir(current, max) {
    const ratio = Math.max(0, Math.min(1, current / max));
    elixirFill.style.width = `${ratio * 100}%`;
    elixirText.textContent = `${Math.floor(current)} / ${max}`;
  }

  function updateCardAvailability(elixir) {
    slotRefs.forEach(({ card, element }) => {
      if (elixir >= card.cost) {
        element.classList.remove('unavailable');
      } else {
        element.classList.add('unavailable');
      }
    });
  }

  function setCardState({ active, queue }) {
    renderActiveSlots(active);
    renderQueue(queue);
  }

  function pulseSlot(slotIndex) {
    const slot = slotRefs[slotIndex];
    if (!slot) {
      return;
    }
    const { element } = slot;
    element.style.transform = 'translateY(-6px) scale(1.05)';
    element.style.borderColor = 'rgba(255, 215, 128, 0.85)';
    window.setTimeout(() => {
      element.style.transform = '';
      element.style.borderColor = '';
    }, 160);
  }

  function showWaveOptions(waveNumber, handlers = {}) {
    overlayHandlers = handlers;
    waveTitle.textContent = `Wave ${waveNumber} Cleared`;
    waveMessage.textContent = 'Take a breather or push forward?';
    waveOverlay.classList.remove('hidden');
  }

  function hideWaveOptions() {
    waveOverlay.classList.add('hidden');
    overlayHandlers = { onContinue: null, onChange: null };
  }

  return {
    updateElixir,
    updateCardAvailability,
    setCardState,
    pulseSlot,
    showWaveOptions,
    hideWaveOptions,
  };
}
