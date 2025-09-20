import { CARD_DEFS } from '../config/cards.js';

const CARD_LOOKUP = new Map(CARD_DEFS.map((card) => [card.id, card]));
const SLOT_LABELS = ['Left Click', 'Right Click'];
const CATEGORY_LABELS = {
  offense: 'Offense',
  defense: 'Defense / Utility',
  summon: 'Summon & Companion',
};

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
  if (typeof onSlotSelect === 'function') {
    el.addEventListener('click', () => onSlotSelect(slotIndex));
  }
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

export function initUI({ onSlotSelect, onPauseToggle, onRestart }) {
  const uiLayer = document.getElementById('ui-layer');
  const elixirFill = document.getElementById('elixir-fill');
  const elixirText = document.getElementById('elixir-text');
  const cardBar = document.getElementById('card-bar');
  const pauseButton = document.getElementById('pause-button');
  const restartButton = document.getElementById('restart-button');

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
  const wavePanel = waveOverlay.querySelector('.wave-panel');

  let slotRefs = [];
  let overlayHandlers = { onContinue: null, onChange: null };
  let pausedState = false;

  function normalizeLoadout(loadout) {
    const next = loadout.slice(0, 4);
    while (next.length < 4) {
      next.push(null);
    }
    const seen = new Set();
    return next.map((id) => {
      if (!id || !CARD_LOOKUP.has(id) || seen.has(id)) {
        return null;
      }
      seen.add(id);
      return id;
    });
  }

  function createCardElement(card, context, slotIndex) {
    const element = document.createElement('div');
    element.className = 'card card-builder-item';
    element.draggable = true;
    element.dataset.cardId = card.id;
    element.innerHTML = `
      <div class="card-name">${card.name}</div>
      <div class="card-cost">${card.cost}⚡</div>
      <div class="card-desc">${card.description}</div>
    `;
    element.addEventListener('dragstart', (event) => {
      event.dataTransfer.setData(DRAG_DATA_KEY, card.id);
      event.dataTransfer.setData(DRAG_SOURCE_KEY, context);
      if (Number.isInteger(slotIndex)) {
        event.dataTransfer.setData(DRAG_SLOT_KEY, `${slotIndex}`);
      }
      event.dataTransfer.setData('text/plain', card.name);
      event.dataTransfer.effectAllowed = 'move';
    });
    return element;
  }

  function renderLoadoutSlots() {
    slotElements.forEach((slot, index) => {
      slot.innerHTML = '';
      const cardId = builderState.loadout[index];
      if (cardId && CARD_LOOKUP.has(cardId)) {
        slot.classList.add('filled');
        const card = CARD_LOOKUP.get(cardId);
        slot.appendChild(createCardElement(card, 'slot', index));
      } else {
        slot.classList.remove('filled');
        const placeholder = document.createElement('span');
        placeholder.className = 'loadout-slot__placeholder';
        placeholder.textContent = 'Drop card here';
        slot.appendChild(placeholder);
      }
    });
  }

  function renderLibrary() {
    libraryContainer.innerHTML = '';
    const groups = new Map();
    CARD_DEFS.forEach((card) => {
      if (builderState.loadout.includes(card.id)) {
        return;
      }
      if (!groups.has(card.category)) {
        groups.set(card.category, []);
      }
      groups.get(card.category).push(card);
    });

    ['offense', 'defense', 'summon'].forEach((category) => {
      const cards = groups.get(category);
      if (!cards || cards.length === 0) {
        return;
      }
      cards.sort((a, b) => a.name.localeCompare(b.name));
      const section = document.createElement('section');
      section.className = 'card-library__section';
      const heading = document.createElement('h4');
      heading.className = 'card-library__heading';
      heading.textContent = CATEGORY_LABELS[category] || category;
      section.appendChild(heading);

      const grid = document.createElement('div');
      grid.className = 'card-library__grid';
      cards.forEach((card) => {
        const cardElement = createCardElement(card, 'library');
        cardElement.classList.add('card-library__card');
        cardElement.addEventListener('dblclick', () => {
          const emptyIndex = builderState.loadout.findIndex((id) => !id);
          const targetIndex = emptyIndex !== -1 ? emptyIndex : 0;
          const nextLoadout = [...builderState.loadout];
          nextLoadout[targetIndex] = card.id;
          builderState = { loadout: normalizeLoadout(nextLoadout) };
          refreshBuilder();
        });
        grid.appendChild(cardElement);
      });
      section.appendChild(grid);
      libraryContainer.appendChild(section);
    });
  }

  function updateSaveButtonState() {
    const incomplete = builderState.loadout.some((id) => !id);
    saveButton.disabled = incomplete;
  }

  function refreshBuilder() {
    renderLoadoutSlots();
    renderLibrary();
    updateSaveButtonState();
  }

  function showLoadoutBuilder({ loadout, onConfirm, onCancel }) {
    builderState = { loadout: normalizeLoadout(loadout || []) };
    builderHandlers = { onConfirm, onCancel };
    refreshBuilder();
    waveOverlay.scrollTop = 0;
    wavePanel.classList.add('hidden');
    builder.classList.remove('hidden');
    waveOverlay.classList.remove('hidden');
  }

  function hideLoadoutBuilder() {
    builder.classList.add('hidden');
    wavePanel.classList.remove('hidden');
    waveOverlay.scrollTop = 0;
  }

  continueButton.addEventListener('click', () => {
    waveOverlay.classList.add('hidden');
    if (typeof overlayHandlers.onContinue === 'function') {
      overlayHandlers.onContinue();
    }
  });

  changeButton.addEventListener('click', () => {
    if (typeof overlayHandlers.onChange === 'function') {
      overlayHandlers.onChange();
    }
  });

  const builder = document.createElement('div');
  builder.id = 'card-builder';
  builder.className = 'card-builder hidden';
  waveOverlay.appendChild(builder);

  const builderPanel = document.createElement('div');
  builderPanel.className = 'card-builder__panel';
  builder.appendChild(builderPanel);

  const builderTitle = document.createElement('h3');
  builderTitle.className = 'card-builder__title';
  builderTitle.textContent = 'Customize Loadout';
  builderPanel.appendChild(builderTitle);

  const builderSubtitle = document.createElement('p');
  builderSubtitle.className = 'card-builder__subtitle';
  builderSubtitle.textContent = 'Drag cards into the four-slot rotation to adjust your abilities between waves.';
  builderPanel.appendChild(builderSubtitle);

  const slotsWrapper = document.createElement('div');
  slotsWrapper.className = 'loadout-slots';
  builderPanel.appendChild(slotsWrapper);

  const slotElements = [];
  for (let i = 0; i < 4; i += 1) {
    const slot = document.createElement('div');
    slot.className = 'loadout-slot';
    slot.dataset.slot = `${i}`;
    slot.addEventListener('dragover', handleSlotDragOver);
    slot.addEventListener('drop', handleSlotDrop);
    slot.addEventListener('dragenter', () => slot.classList.add('drag-over'));
    slot.addEventListener('dragleave', () => slot.classList.remove('drag-over'));
    slotsWrapper.appendChild(slot);
    slotElements.push(slot);
  }

  const libraryContainer = document.createElement('div');
  libraryContainer.className = 'card-library';
  libraryContainer.addEventListener('dragover', handleLibraryDragOver);
  libraryContainer.addEventListener('drop', handleLibraryDrop);
  builderPanel.appendChild(libraryContainer);

  const builderButtons = document.createElement('div');
  builderButtons.className = 'card-builder__actions';
  builderPanel.appendChild(builderButtons);

  const saveButton = document.createElement('button');
  saveButton.type = 'button';
  saveButton.textContent = 'Save Loadout';
  saveButton.className = 'card-builder__save';
  builderButtons.appendChild(saveButton);

  const cancelButton = document.createElement('button');
  cancelButton.type = 'button';
  cancelButton.textContent = 'Cancel';
  cancelButton.className = 'card-builder__cancel';
  builderButtons.appendChild(cancelButton);

  let builderState = {
    loadout: normalizeLoadout(['fireball', 'shield', 'summon', 'heal']),
  };
  let builderHandlers = { onConfirm: null, onCancel: null };

  saveButton.addEventListener('click', () => {
    if (saveButton.disabled) {
      return;
    }
    hideLoadoutBuilder();
    if (typeof builderHandlers.onConfirm === 'function') {
      builderHandlers.onConfirm([...builderState.loadout]);
    }
  });

  cancelButton.addEventListener('click', () => {
    hideLoadoutBuilder();
    if (typeof builderHandlers.onCancel === 'function') {
      builderHandlers.onCancel();
    }
  });

  const DRAG_DATA_KEY = 'application/x-card-id';
  const DRAG_SOURCE_KEY = 'application/x-card-source';
  const DRAG_SLOT_KEY = 'application/x-card-slot';

  function handleSlotDragOver(event) {
    if (event.dataTransfer && event.dataTransfer.types.includes(DRAG_DATA_KEY)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function handleSlotDrop(event) {
    event.preventDefault();
    const slot = event.currentTarget;
    slot.classList.remove('drag-over');
    const cardId = event.dataTransfer.getData(DRAG_DATA_KEY);
    if (!cardId) {
      return;
    }
    const source = event.dataTransfer.getData(DRAG_SOURCE_KEY);
    const fromSlotIndex = parseInt(event.dataTransfer.getData(DRAG_SLOT_KEY) || '-1', 10);
    const targetIndex = Number(slot.dataset.slot);

    if (source === 'slot' && fromSlotIndex === targetIndex) {
      return;
    }

    const nextLoadout = [...builderState.loadout];

    if (source === 'slot' && fromSlotIndex >= 0) {
      const movingCard = nextLoadout[fromSlotIndex];
      const displaced = nextLoadout[targetIndex];
      nextLoadout[targetIndex] = movingCard;
      nextLoadout[fromSlotIndex] = displaced || null;
    } else {
      nextLoadout[targetIndex] = cardId;
    }

    builderState = { loadout: normalizeLoadout(nextLoadout) };
    refreshBuilder();
  }

  function handleLibraryDragOver(event) {
    if (event.dataTransfer && event.dataTransfer.types.includes(DRAG_DATA_KEY)) {
      event.preventDefault();
      event.dataTransfer.dropEffect = 'move';
    }
  }

  function handleLibraryDrop(event) {
    event.preventDefault();
    const source = event.dataTransfer.getData(DRAG_SOURCE_KEY);
    if (source !== 'slot') {
      return;
    }
    const fromSlotIndex = parseInt(event.dataTransfer.getData(DRAG_SLOT_KEY) || '-1', 10);
    if (Number.isNaN(fromSlotIndex) || fromSlotIndex < 0) {
      return;
    }
    const nextLoadout = [...builderState.loadout];
    nextLoadout[fromSlotIndex] = null;
    builderState = { loadout: normalizeLoadout(nextLoadout) };
    refreshBuilder();
  }

  if (pauseButton) {
    pauseButton.onclick = () => {
      if (typeof onPauseToggle === 'function') {
        onPauseToggle();
      }
    };
  }

  if (restartButton) {
    restartButton.onclick = () => {
      if (typeof onRestart === 'function') {
        onRestart();
      }
    };
  }

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
    hideLoadoutBuilder();
    waveOverlay.classList.remove('hidden');
  }

  function hideWaveOptions() {
    waveOverlay.classList.add('hidden');
    overlayHandlers = { onContinue: null, onChange: null };
  }

  function setPauseState(paused) {
    pausedState = !!paused;
    if (pauseButton) {
      pauseButton.textContent = pausedState ? 'Resume' : 'Pause';
      pauseButton.dataset.state = pausedState ? 'paused' : 'running';
    }
    if (uiLayer) {
      uiLayer.classList.toggle('paused', pausedState);
    }
  }

  return {
    updateElixir,
    updateCardAvailability,
    setCardState,
    pulseSlot,
    showWaveOptions,
    hideWaveOptions,
    showLoadoutBuilder,
    hideLoadoutBuilder,
    setPauseState,
  };
}
