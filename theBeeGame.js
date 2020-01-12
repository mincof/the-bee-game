"use strict";

(function() {
  const characterTypes = {
    qb: () => ({
      type: "qb",
      typeName: "Queen bee",
      hp: 100,
      df: 50,
      ak: 50,
      luck: getRandomLuck(),
      backgroundColor: "#f1c40e",
      emoji: "🐝",
      isBoss: true,
      isAttacker: true,
      family: "bees"
    }),
    gb: () => ({
      type: "gb",
      typeName: "Guardian bee",
      hp: 100,
      df: 30,
      ak: 30,
      luck: getRandomLuck(),
      backgroundColor: "#f1c40e",
      emoji: "🐝",
      isBoss: false,
      isAttacker: true,
      family: "bees"
    }),
    qw: () => ({
      type: "qw",
      typeName: "Queen wasp",
      hp: 100,
      df: 50,
      ak: 50,
      luck: getRandomLuck(),
      backgroundColor: "#e74c3c",
      emoji: "🐝",
      isBoss: true,
      isAttacker: false,
      family: "wasps"
    }),
    gw: () => ({
      type: "qw",
      typeName: "Guardian wasp",
      hp: 100,
      df: 30,
      ak: 30,
      luck: getRandomLuck(),
      backgroundColor: "#e74c3c",
      emoji: "🐝",
      isBoss: false,
      isAttacker: false,
      family: "wasps"
    })
  };

  const stageSize = 5;

  const characters = [
    characterTypes.qb(),
    characterTypes.gb(),
    characterTypes.gb(),
    characterTypes.gb(),
    characterTypes.qw(),
    characterTypes.gw(),
    characterTypes.gw(),
    characterTypes.gw()
  ];

  // Set default character positions on the stage
  characters.forEach(character => {
    character.stageSquareIndex = getRandomStageSquareIndex();
  });

  const state = {
    selectedCharacterElem: null,
    computerSelectedCharacterElem: null,
    autoAttackQueuedEvents: []
  };

  const fragment = document.createDocumentFragment();
  const rootElem = document.getElementById("root");

  // ============
  // Create stage
  // ============

  const stageElem = document.createElement("div");
  stageElem.classList.add("stage");

  const stageSquareElems = [];
  for (let i = 0; i < stageSize * stageSize; i++) {
    const stageSquareElem = document.createElement("div");
    stageSquareElem.classList.add("stage-square");

    stageElem.appendChild(stageSquareElem);
    stageSquareElems.push(stageSquareElem);

    if ((i + 1) % stageSize === 0) {
      const stageBreakElem = document.createElement("div");
      stageBreakElem.classList.add("stage-break");
      stageElem.appendChild(stageBreakElem);
    }
  }

  fragment.appendChild(stageElem);

  // ==============
  // Create console
  // ==============

  const consoleElem = document.createElement("textarea");
  consoleElem.classList.add("console");
  consoleElem.readOnly = true;

  fragment.appendChild(consoleElem);

  // Render stage and console
  rootElem.appendChild(fragment);

  // =================
  // Create characters
  // =================

  const characterElems = [];
  characters.forEach(character => {
    const characterElem = document.createElement("div");
    characterElem.classList.add("stage-character");
    characterElem.character = character;
    renderCharacterElemStats(characterElem);
    setCharacterTranslateXY(characterElem);

    fragment.appendChild(characterElem);
    characterElems.push(characterElem);
  });

  // Render characters
  stageSquareElems[0].appendChild(fragment);

  // ===============
  // Event listeners
  // ===============

  stageElem.addEventListener("click", handleStageClick);
  stageElem.addEventListener("selectCharacter", handleSelectCharacter);
  stageElem.addEventListener("moveCharacter", handleMoveCharacter);
  stageElem.addEventListener("attackCharacter", handleAttackCharacter);
  stageElem.addEventListener("computerAttackCharacter", handleComputerAttackCharacter);
  stageElem.addEventListener("characterDied", handleCharacterDied);

  // ========
  // Handlers
  // ========

  function handleStageClick(e) {
    const elem = e.target;

    if (characterElems.includes(elem) && elem.character.isAttacker) {
      stageElem.dispatchEvent(
        new CustomEvent("selectCharacter", {
          detail: { elem }
        })
      );

      return;
    }

    if (state.selectedCharacterElem !== null && stageSquareElems.includes(elem)) {
      // ->
      // This is not really necessary but it prevents a bug caused by mousedown and drag (up) event.
      // @TODO Must be inspected.
      const occupiedStageSquareIndexes = characterElems
        .filter(characterElem => characterElem.character.hp > 0)
        .map(characterElem => characterElem.character.stageSquareIndex);

      if (occupiedStageSquareIndexes.includes(stageSquareElems.indexOf(elem))) return;
      // <-

      stageElem.dispatchEvent(
        new CustomEvent("moveCharacter", {
          detail: { elem }
        })
      );

      return;
    }

    if (state.selectedCharacterElem !== null && characterElems.includes(elem)) {
      stageElem.dispatchEvent(
        new CustomEvent("attackCharacter", {
          detail: { elem }
        })
      );

      return;
    }
  }

  function handleSelectCharacter(e) {
    const characterElem = e.detail.elem;
    const character = characterElem.character;
    const stageSquareElem = stageSquareElems[character.stageSquareIndex];

    if (state.selectedCharacterElem !== null) {
      const selectedCharacterElem = state.selectedCharacterElem;
      const selectedCharacter = selectedCharacterElem.character;
      const selectedStageSquareElem = stageSquareElems[selectedCharacter.stageSquareIndex];

      state.selectedCharacterElem = null;
      selectedStageSquareElem.classList.remove("selected");

      if (selectedCharacter.stageSquareIndex === character.stageSquareIndex) return;
    }

    state.selectedCharacterElem = characterElem;
    stageSquareElem.classList.add("selected");
  }

  function handleMoveCharacter(e) {
    const stageSquareElem = e.detail.elem;

    const selectedCharacterElem = state.selectedCharacterElem;
    const selectedCharacter = selectedCharacterElem.character;
    const selectedStageSquareElem = stageSquareElems[selectedCharacter.stageSquareIndex];

    state.selectedCharacterElem = null;
    selectedStageSquareElem.classList.remove("selected");

    selectedCharacter.stageSquareIndex = stageSquareElems.indexOf(stageSquareElem);
    selectedCharacterElem.dataset.isMoving = "";
    selectedCharacterElem.addEventListener("transitionend", e => delete e.target.dataset.isMoving, {
      once: true
    });
    setCharacterTranslateXY(selectedCharacterElem);
  }

  function handleAttackCharacter(e) {
    const attackerCharacterElem = state.selectedCharacterElem;
    const attackedCharacterElem = e.detail.elem;

    attackCharacter(attackerCharacterElem, attackedCharacterElem);
  }

  function handleComputerAttackCharacter(e) {
    const attackerCharacterElem = state.computerSelectedCharacterElem;
    const attackedCharacterElem = e.detail.elem;

    attackCharacter(attackerCharacterElem, attackedCharacterElem, true);
  }

  function handleCharacterDied(e) {
    const characterElem = e.detail.elem;
    const character = characterElem.character;
    const selectedCharacterElem = state.selectedCharacterElem;

    characterElem.dataset.isDead = "";

    if (characterElem === selectedCharacterElem) {
      stageElem.dispatchEvent(
        new CustomEvent("selectCharacter", {
          detail: { elem: characterElem }
        })
      );
    }

    if (character.isBoss) {
      window.alert(`The ${character.family} have lost!`);
      window.location.reload();
    }
  }

  // ==============
  // Messages
  // ==============

  const stageSquareIndexTypeErrorMessage = "You must provide a valid stage square index!";

  // =======
  // Helpers
  // =======

  // https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Math/random#Getting_a_random_integer_between_two_values_inclusive
  function getRandomIntInclusive(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);

    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  function getRandomStageSquareIndex() {
    const stageSquareIndex = getRandomIntInclusive(0, stageSize * stageSize - 1);

    if (characters.some(character => character.stageSquareIndex === stageSquareIndex))
      return getRandomStageSquareIndex();

    return stageSquareIndex;
  }

  function getRandomLuck() {
    return getRandomIntInclusive(0, 100);
  }

  function getXY(stageSquareIndex) {
    if (typeof stageSquareIndex !== "number") throw new TypeError(stageSquareIndexTypeErrorMessage);

    const p = stageSquareIndex + 1;

    let x = p % stageSize;
    if (x === 0) x = stageSize;
    x = x - 1;
    const y = Math.ceil(p / stageSize) - 1;

    return [x, y];
  }

  function setCharacterTranslateXY(characterElem) {
    window.requestAnimationFrame(() => {
      const [x, y] = getXY(characterElem.character.stageSquareIndex);
      characterElem.style.transform = `translate(${x * 100}%, ${y * 100}%)`;
    });
  }

  function getSurroundingCharacterElems(stageSquareIndex) {
    if (typeof stageSquareIndex !== "number") throw new TypeError(stageSquareIndexTypeErrorMessage);

    const c = stageSquareIndex;
    const l = c - 1;
    const r = c + 1;
    const t = c - stageSize;
    const b = c + stageSize;
    const tl = t - 1;
    const tr = t + 1;
    const bl = b - 1;
    const br = b + 1;

    const [x, y] = getXY(c);
    const [minX, minY] = [x - 1, y - 1];
    const [maxX, maxY] = [x + 1, y + 1];

    const stageSquareIndexes = [l, r, t, b, tl, tr, bl, br]
      .map(stageSquareIndex => getXY(stageSquareIndex))
      .filter(([x, y]) => x >= minX && y >= minY && x <= maxX && y <= maxY)
      .map(xy => xy.join());

    return characterElems.filter(
      characterElem =>
        characterElem.character.hp > 0 &&
        stageSquareIndexes.includes(getXY(characterElem.character.stageSquareIndex).join())
    );
  }

  function attackCharacter(attackerCharacterElem, attackedCharacterElem, isAuto = false) {
    const attackerCharacter = attackerCharacterElem.character;
    const attackerSurroundingCharacterElems = getSurroundingCharacterElems(
      attackerCharacter.stageSquareIndex
    );

    const attackedCharacter = attackedCharacterElem.character;

    if (!attackerSurroundingCharacterElems.includes(attackedCharacterElem)) {
      window.alert("To attack a character you must go closer!");
      return;
    }

    consoleLogCharacterAttack(attackerCharacter, attackedCharacter, isAuto);

    const damage =
      attackerCharacter.ak * (attackerCharacter.luck / 100) -
      attackedCharacter.df * (attackedCharacter.luck / 100);

    if (damage > 0) {
      attackedCharacter.hp = Math.round(attackedCharacter.hp - damage);
      attackedCharacter.ak = Math.round(attackedCharacter.ak - damage - (25 / 100) * damage);
    }

    if (attackedCharacter.hp > 0) {
      renderCharacterElemStats(attackedCharacterElem);

      if (!isAuto) {
        state.autoAttackQueuedEvents.push({
          attackerCharacterElem: attackedCharacterElem,
          attackedCharacterElem: attackerCharacterElem
        });
      }
    } else {
      stageElem.dispatchEvent(
        new CustomEvent("characterDied", {
          detail: { elem: attackedCharacterElem }
        })
      );
    }

    if (attackedCharacter.isBoss) {
      attackerSurroundingCharacterElems
        .filter(
          characterElem =>
            characterElem !== attackedCharacterElem &&
            characterElem.character.family === attackedCharacter.family
        )
        .forEach(characterElem => {
          state.autoAttackQueuedEvents.push({
            attackerCharacterElem: characterElem,
            attackedCharacterElem: attackerCharacterElem
          });
        });
    }

    dispatchAutoAttackQueuedEvents();
  }

  function dispatchAutoAttackQueuedEvents() {
    if (state.autoAttackQueuedEvents.length === 0) return;

    const { attackerCharacterElem, attackedCharacterElem } = state.autoAttackQueuedEvents[0];

    state.autoAttackQueuedEvents = state.autoAttackQueuedEvents.slice(1);

    const attackerCharacter = attackerCharacterElem.character;
    const attackedCharacter = attackedCharacterElem.character;

    if (attackerCharacter.hp > 0 && attackedCharacter.hp > 0) {
      state.computerSelectedCharacterElem = attackerCharacterElem;
      stageElem.dispatchEvent(
        new CustomEvent("computerAttackCharacter", {
          detail: { elem: attackedCharacterElem }
        })
      );
      return;
    }

    dispatchAutoAttackQueuedEvents();
  }

  function renderCharacterElemStats(characterElem) {
    const character = characterElem.character;

    characterElem.innerHTML = `
      <div class="character">
        <div class="character-health" style="background-color: ${
          character.backgroundColor
        }; opacity: ${character.hp / 100}"></div>
        <div class="character-emoji">${character.emoji}</div>
        <div class="character-labels">
          ${character.isBoss ? `<span class="character-label">👑</span>` : ``}
          ${character.isAttacker ? `<span class="character-label">🗡</span>` : ``}
        </div>
        <div class="character-stats">
          ${character.hp} ❤️<br>
          ${character.df} 🛡 ${character.ak < 0 ? 0 : character.ak} ⚔️ ${character.luck} 🍀
        </div>
      </div>
    `;
  }

  function consoleLogCharacterAttack(attackerCharacter, attackedCharacter, isAuto = false) {
    const [attackerX, attackerY] = getXY(attackerCharacter.stageSquareIndex);
    const [attackedX, attackedY] = getXY(attackedCharacter.stageSquareIndex);

    let message = `${isAuto ? "Computer" : "User"} attack: \n`;
    message += `(${attackerX + 1}, ${attackerY + 1}) -> (${attackedX + 1}, ${attackedY + 1})`;

    consoleElem.value += message + "\n\n";
    consoleElem.scrollTop = consoleElem.scrollHeight;
  }
})();
