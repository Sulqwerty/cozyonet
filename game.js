(() => {
  'use strict';

  const symbols = ['🍎', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍒', '🍑', '🍍', '🥝', '🥥', '🥑', '🍆', '🥕', '🌽', '🥔', '🧅', '🧄', '🥦', '🍅', '🌶️', '🍄', '🍞', '🧀', '🥨', '🍪', '🍩', '🍰', '🧁', '🍿', '🥜', '🍯', '🍦', '🍭'];
  const levelNames = ['Still board', 'Move up', 'Move down', 'Move left', 'Move right', 'Clear the middle, move outward', 'Clear the sides, move inward', 'Move from all sides'];
  const boardPresets = [
    { id: 'very-easy', label: 'VERY EASY', columns: 8, rows: 6 },
    { id: 'easy', label: 'EASY', columns: 12, rows: 6 },
    { id: 'medium', label: 'MEDIUM', columns: 12, rows: 8 },
    { id: 'hard', label: 'HARD', columns: 15, rows: 8 },
    { id: 'very-hard', label: 'VERY HARD', columns: 16, rows: 9 }
  ];
  const timeBonusByBoardSize = {
    'very-easy': 4000,
    easy: 5500,
    medium: 7000,
    hard: 8500,
    'very-hard': 10000
  };
  const levelCompletionBonusByBoardSize = {
    'very-easy': 200,
    easy: 400,
    medium: 600,
    hard: 800,
    'very-hard': 1000
  };
  const orientationQuery = window.matchMedia('(orientation: portrait)');
  const mobileLayoutQuery = window.matchMedia('(max-width: 700px)');
  const initialBoardSizeId = mobileLayoutQuery.matches ? 'easy' : 'very-hard';
  const initialBoardPreset = boardPresets.find(item => item.id === initialBoardSizeId);
  let portraitBoardLayout = orientationQuery.matches;
  let rows = portraitBoardLayout ? initialBoardPreset.columns : initialBoardPreset.rows;
  let columns = portraitBoardLayout ? initialBoardPreset.rows : initialBoardPreset.columns;
  const boardEl = document.querySelector('#board');
  const boardWrap = document.querySelector('.board-wrap');
  const boardDarknessControl = document.querySelector('#board-darkness');
  const boardDarknessValue = document.querySelector('#board-darkness-value');
  const boardTileStyleControl = document.querySelector('#board-tile-style');
  const rainToggle = document.querySelector('#rain-toggle');
  const rainToggleLabel = document.querySelector('#rain-toggle-label');
  const rainVolumeControl = document.querySelector('#rain-volume');
  const gameCard = document.querySelector('.game-card');
  const placeholder = document.querySelector('#placeholder');
  const pathLayer = document.querySelector('#path-layer');
  const startButton = document.querySelector('#start-button');
  const aboutButton = document.querySelector('#about-button');
  const aboutDialog = document.querySelector('#about-dialog');
  const aboutCloseButton = document.querySelector('#about-close');
  const hintButton = document.querySelector('#hint-button');
  const shuffleButton = document.querySelector('#shuffle-button');
  const message = document.querySelector('#message');
  const toast = document.querySelector('#result-toast');
  const pairsEl = document.querySelector('#pairs-count');
  const timerEl = document.querySelector('#timer');
  const titleEl = document.querySelector('#board-title');
  const soundToggle = document.querySelector('#sound-toggle');
  const soundIcon = document.querySelector('#sound-icon');
  const themeOptions = [...document.querySelectorAll('[data-theme-option]')];
  const themeSelect = document.querySelector('#theme-select');
  const levelButtons = document.querySelector('#level-buttons');
  const boardSizeControl = document.querySelector('#board-size');
  const volumeControl = document.querySelector('#music-volume');
  const levelCelebration = document.querySelector('#level-celebration');
  const celebrationConfetti = document.querySelector('#celebration-confetti');
  const celebrationTitle = document.querySelector('#celebration-title');
  const celebrationDetail = document.querySelector('#celebration-detail');
  const finalScoreEl = document.querySelector('#final-score');
  const finishTimeEl = document.querySelector('#finish-time');
  const nextLevelButton = document.querySelector('#next-level-button');
  const leaderboardEntry = document.querySelector('#leaderboard-entry');
  const playerNameInput = document.querySelector('#player-name');
  const leaderboardEntryStatus = document.querySelector('#leaderboard-entry-status');
  const leaderboardButton = document.querySelector('#leaderboard-button');
  const leaderboardDialog = document.querySelector('#leaderboard-dialog');
  const leaderboardCloseButton = document.querySelector('#leaderboard-close');
  const leaderboardList = document.querySelector('#leaderboard-list');
  const leaderboardEmpty = document.querySelector('#leaderboard-empty');

  let grid = [];
  let selected = null;
  let score = 0;
  let seconds = 0;
  let clockId = null;
  let toastId = null;
  let busy = false;
  let selectedLevel = 1;
  let boardSizeId = initialBoardSizeId;
  let boardTileStyle = 'theme-color';
  let boardSizeLocked = false;
  let roundFinished = false;
  let orientationRetryId = null;
  let levelEntryScore = 0;
  let campaignEligible = true;
  let campaignNextExpected = 1;
  let campaignTimes = Array(8).fill(null);
  let fullCampaignComplete = false;
  let leaderboardScoreSubmitted = false;
  let completedCampaignTime = 0;
  let recentlySavedEntryId = null;
  let hintTimeout = null;
  let matchTimeout = null;
  let movementTimeout = null;
  let nextTileId = 1;
  const assistedHintPairs = new Set();

  syncPlaceholderDimensions();

  function makeDeck() {
    const deck = [];
    const imageCount = rows * columns / 4;
    for (let i = 0; i < imageCount; i++) {
      const symbol = symbols[i % symbols.length];
      for (let copy = 0; copy < 4; copy++) deck.push({ id: nextTileId++, symbol });
    }
    for (let i = deck.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [deck[i], deck[j]] = [deck[j], deck[i]];
    }
    return deck;
  }

  function setDeck(deck, animate = false) {
    grid = Array.from({ length: rows }, (_, r) => deck.slice(r * columns, (r + 1) * columns));
    selected = null;
    if (animate && boardEl.children.length) arrangeBoard(true);
    else renderBoard();
    updateStats();
  }

  function renderBoard() {
    boardEl.replaceChildren();
    boardEl.style.setProperty('--columns', columns);
    boardEl.style.maxWidth = `${columns * 64}px`;
    boardEl.setAttribute('aria-rowcount', rows);
    boardEl.setAttribute('aria-colcount', columns);
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const tileData = grid[r][c];
        if (!tileData) {
          const empty = document.createElement('span');
          empty.className = 'tile tile-empty';
          empty.setAttribute('aria-hidden', 'true');
          empty.style.visibility = 'hidden';
          boardEl.append(empty);
          continue;
        }
        boardEl.append(createTileElement(tileData, r, c));
      }
    }
    updateMobileTileIconSize();
  }

  function updateMobileTileIconSize() {
    if (!window.matchMedia('(max-width: 700px)').matches || boardEl.hidden) {
      boardEl.style.removeProperty('--tile-icon-size');
      return;
    }
    const firstTile = boardEl.querySelector('.tile:not(.tile-empty)');
    const tileSize = firstTile?.getBoundingClientRect().width || 0;
    if (!tileSize) return;
    const imageCount = rows * columns / 4;
    const difficultyScale = Math.sqrt(36 / imageCount);
    const iconSize = Math.min(tileSize * 0.64, tileSize * 0.54 * difficultyScale);
    boardEl.style.setProperty('--tile-icon-size', `${iconSize}px`);
  }

  function createTileElement(tileData, r, c) {
    const tile = document.createElement('button');
    tile.className = 'tile';
    tile.type = 'button';
    tile.textContent = tileData.symbol;
    tile.addEventListener('click', () => chooseTile(Number(tile.dataset.row), Number(tile.dataset.column)));
    updateTileElement(tile, tileData, r, c);
    return tile;
  }

  function updateTileElement(tile, tileData, r, c) {
    tile.textContent = tileData.symbol;
    tile.setAttribute('role', 'gridcell');
    tile.setAttribute('aria-label', `Row ${r + 1}, column ${c + 1}, ${tileData.symbol}`);
    tile.dataset.row = r;
    tile.dataset.column = c;
    tile.dataset.tileId = tileData.id;
    tile.dataset.symbol = tileData.symbol;
    tile.classList.remove('selected', 'removing', 'hint');
    if (selected && selected.r === r && selected.c === c) tile.classList.add('selected');
  }

  function captureTilePositions() {
    return new Map([...boardEl.querySelectorAll('.tile:not(.tile-empty)')].map(tile => [
      Number(tile.dataset.tileId), { element: tile, rect: tile.getBoundingClientRect() }
    ]));
  }

  function arrangeBoard(animate = false, previousPositions = null) {
    const motionAxes = selectedLevel === 2 || selectedLevel === 3
      ? { horizontal: false, vertical: true }
      : selectedLevel >= 4 && selectedLevel <= 7
        ? { horizontal: true, vertical: false }
        : { horizontal: true, vertical: true };
    const previous = previousPositions || captureTilePositions();
    const ordered = [];
    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < columns; c++) {
        const tileData = grid[r][c];
        if (!tileData) {
          const empty = document.createElement('span');
          empty.className = 'tile tile-empty';
          empty.setAttribute('aria-hidden', 'true');
          empty.style.visibility = 'hidden';
          ordered.push(empty);
          continue;
        }
        const old = previous.get(tileData.id);
        const tile = old?.element || createTileElement(tileData, r, c);
        updateTileElement(tile, tileData, r, c);
        ordered.push(tile);
      }
    }

    boardEl.replaceChildren(...ordered);
    if (!animate) return 0;

    let longestDuration = 0;
    for (const tile of boardEl.querySelectorAll('.tile:not(.tile-empty)')) {
      const old = previous.get(Number(tile.dataset.tileId));
      if (!old) continue;
      const current = tile.getBoundingClientRect();
      const dx = motionAxes.horizontal ? old.rect.left - current.left : 0;
      const dy = motionAxes.vertical ? old.rect.top - current.top : 0;
      if (Math.abs(dx) < 1 && Math.abs(dy) < 1) continue;
      const cellSize = Math.max(1, Math.min(current.width, current.height));
      const travelCells = Math.hypot(dx, dy) / cellSize;
      const duration = Math.round(Math.min(680, Math.max(280, 210 + travelCells * 85)));
      longestDuration = Math.max(longestDuration, duration);
      if (typeof tile.getAnimations === 'function') tile.getAnimations().forEach(animation => animation.cancel());
      tile.classList.add('moving');
      if (typeof tile.animate === 'function') {
        const animation = tile.animate(
          [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'translate(0, 0)' }],
          { duration, easing: 'cubic-bezier(.22,.72,.22,1)' }
        );
        animation.onfinish = () => tile.classList.remove('moving');
      } else {
        tile.style.transition = 'none';
        tile.style.transform = `translate(${dx}px, ${dy}px)`;
        tile.getBoundingClientRect();
        requestAnimationFrame(() => requestAnimationFrame(() => {
          tile.style.transition = `transform ${duration}ms cubic-bezier(.22,.72,.22,1)`;
          tile.style.transform = '';
          window.setTimeout(() => {
            tile.style.transition = '';
            tile.classList.remove('moving');
          }, duration + 20);
        }));
      }
    }
    return longestDuration;
  }

  function tileCount() { return grid.reduce((sum, row) => sum + row.filter(Boolean).length, 0); }
  function formatTime(totalSeconds) {
    return `${String(Math.floor(totalSeconds / 60)).padStart(2, '0')}:${String(totalSeconds % 60).padStart(2, '0')}`;
  }

  function updateStats() {
    pairsEl.textContent = String(tileCount() / 2);
    timerEl.textContent = formatTime(seconds);
  }

  function dimensionsFor(preset, isPortrait = portraitBoardLayout) {
    return isPortrait
      ? { columns: preset.rows, rows: preset.columns }
      : { columns: preset.columns, rows: preset.rows };
  }

  function syncPlaceholderDimensions() {
    placeholder.style.setProperty('--columns', columns);
    placeholder.style.setProperty('--rows', rows);
    placeholder.style.maxWidth = `${columns * 64 + 16}px`;
  }

  function updateBoardSizeLabels() {
    for (const option of boardSizeControl.options) {
      const preset = boardPresets.find(item => item.id === option.value);
      if (!preset) continue;
      const dimensions = dimensionsFor(preset);
      option.textContent = `${preset.label} · ${dimensions.columns} × ${dimensions.rows}`;
    }
    boardSizeControl.value = boardSizeId;
  }

  function syncBoardOrientation() {
    if (orientationQuery.matches === portraitBoardLayout) return;
    if (busy) {
      if (orientationRetryId !== null) window.clearTimeout(orientationRetryId);
      orientationRetryId = window.setTimeout(() => {
        orientationRetryId = null;
        syncBoardOrientation();
      }, 80);
      return;
    }

    const wasPortrait = portraitBoardLayout;
    portraitBoardLayout = orientationQuery.matches;
    updateBoardSizeLabels();
    const preset = boardPresets.find(item => item.id === boardSizeId);
    if (!preset) return;
    const dimensions = dimensionsFor(preset);

    if (boardEl.hidden || roundFinished) {
      columns = dimensions.columns;
      rows = dimensions.rows;
      syncPlaceholderDimensions();
      return;
    }

    const oldGrid = grid;
    const oldRows = rows;
    const oldColumns = columns;
    const wasTransposed = wasPortrait !== portraitBoardLayout;
    if (!wasTransposed || oldRows !== dimensions.columns || oldColumns !== dimensions.rows) {
      columns = dimensions.columns;
      rows = dimensions.rows;
      return;
    }

    grid = Array.from({ length: oldColumns }, (_, r) =>
      Array.from({ length: oldRows }, (_, c) => oldGrid[c][r])
    );
    columns = dimensions.columns;
    rows = dimensions.rows;
    syncPlaceholderDimensions();
    if (selected) selected = { r: selected.c, c: selected.r };
    clearHint();
    renderBoard();
    updateStats();
  }

  function changeBoardSize(sizeId) {
    if (boardSizeLocked) return;
    const preset = boardPresets.find(item => item.id === sizeId);
    if (!preset) return;
    boardSizeId = preset.id;
    const dimensions = dimensionsFor(preset);
    columns = dimensions.columns;
    rows = dimensions.rows;
    syncPlaceholderDimensions();
    boardSizeControl.value = boardSizeId;
    if (!boardEl.hidden) startGame(levelEntryScore, { replay: true });
  }

  function startGame(entryScore = levelEntryScore, { replay = false } = {}) {
    window.clearInterval(clockId);
    window.clearTimeout(toastId);
    window.clearTimeout(matchTimeout);
    window.clearTimeout(movementTimeout);
    const preset = boardPresets.find(item => item.id === boardSizeId);
    if (preset) {
      const dimensions = dimensionsFor(preset);
      columns = dimensions.columns;
      rows = dimensions.rows;
      syncPlaceholderDimensions();
    }
    applyTileAppearance();
    clearHint();
    levelCelebration.hidden = true;
    levelCelebration.classList.remove('is-grand-finale');
    celebrationConfetti.replaceChildren();
    seconds = 0;
    score = entryScore;
    levelEntryScore = entryScore;
    fullCampaignComplete = false;
    leaderboardScoreSubmitted = false;
    completedCampaignTime = 0;
    leaderboardEntry.hidden = true;
    leaderboardEntry.reset();
    leaderboardEntryStatus.textContent = '';
    nextLevelButton.hidden = true;
    if (replay && campaignEligible) campaignTimes.fill(null, selectedLevel - 1);
    assistedHintPairs.clear();
    busy = false;
    roundFinished = false;
    toast.classList.remove('visible');
    pathLayer.replaceChildren();
    setPathVisible(false);
    placeholder.hidden = true;
    boardEl.hidden = false;
    hintButton.disabled = false;
    shuffleButton.disabled = false;
    startButton.innerHTML = `<span aria-hidden="true">↻</span> Restart level ${selectedLevel}`;
    titleEl.textContent = `Level ${selectedLevel} · ${levelNames[selectedLevel - 1]}`;
    message.textContent = 'Match pairs through a clear path with no more than two turns.';
    setDeck(makeDeck());
    clockId = window.setInterval(() => { seconds++; updateStats(); }, 1000);
    void music.start({ automatic: true });
  }

  function chooseTile(r, c) {
    if (busy || !grid[r][c]) return;
    clearHint();
    playEffect('click');
    if (!selected) {
      selected = { r, c };
      renderBoard();
      return;
    }
    if (selected.r === r && selected.c === c) {
      selected = null;
      renderBoard();
      return;
    }
    const first = selected;
    if (grid[first.r][first.c].symbol === grid[r][c].symbol) {
      const path = findPath(first, { r, c });
      if (path) {
        clearPair(first, { r, c }, path);
        return;
      }
      selected = null;
      renderBoard();
      playEffect('wrong');
      return;
    }
    selected = null;
    renderBoard();
    playEffect('wrong');
  }

  function findPath(start, end) {
    const height = rows + 2;
    const width = columns + 2;
    const queue = [{ r: start.r + 1, c: start.c + 1, dir: -1, turns: 0, path: [{ r: start.r + 1, c: start.c + 1 }] }];
    const visited = new Set();
    const directions = [[-1, 0], [1, 0], [0, -1], [0, 1]];
    while (queue.length) {
      const state = queue.shift();
      for (let dir = 0; dir < directions.length; dir++) {
        const turns = state.turns + (state.dir !== -1 && state.dir !== dir ? 1 : 0);
        if (turns > 2) continue;
        const nr = state.r + directions[dir][0];
        const nc = state.c + directions[dir][1];
        if (nr < 0 || nr >= height || nc < 0 || nc >= width) continue;
        const inside = nr > 0 && nr <= rows && nc > 0 && nc <= columns;
        if (inside) {
          const br = nr - 1;
          const bc = nc - 1;
          const isDestination = br === end.r && bc === end.c;
          if (!isDestination && grid[br][bc]) continue;
        }
        const key = `${nr},${nc},${dir},${turns}`;
        if (visited.has(key)) continue;
        visited.add(key);
        const path = [...state.path, { r: nr, c: nc }];
        if (nr === end.r + 1 && nc === end.c + 1) return simplifyPath(path);
        queue.push({ r: nr, c: nc, dir, turns, path });
      }
    }
    return null;
  }

  function getPairKey(a, b) {
    return [grid[a.r][a.c].id, grid[b.r][b.c].id].sort((x, y) => x - y).join(':');
  }

  function simplifyPath(path) {
    if (path.length < 3) return path;
    const out = [path[0]];
    for (let i = 1; i < path.length - 1; i++) {
      const a = path[i - 1], b = path[i], c = path[i + 1];
      if ((b.r - a.r) * (c.c - b.c) !== (b.c - a.c) * (c.r - b.r)) out.push(b);
    }
    out.push(path[path.length - 1]);
    return out;
  }

  function drawPath(path, isHint = false, isMatch = false) {
    setPathVisible(true);
    const svgRect = pathLayer.getBoundingClientRect();
    const cells = [...boardEl.children];
    const first = cells[0].getBoundingClientRect();
    const nextColumn = cells[1].getBoundingClientRect();
    const nextRow = cells[columns].getBoundingClientRect();
    const firstCenterX = first.left - svgRect.left + first.width / 2;
    const firstCenterY = first.top - svgRect.top + first.height / 2;
    const stepX = nextColumn.left + nextColumn.width / 2 - (first.left + first.width / 2);
    const stepY = nextRow.top + nextRow.height / 2 - (first.top + first.height / 2);
    const points = path.map(p => {
      return {
        x: firstCenterX + (p.c - 1) * stepX,
        y: firstCenterY + (p.r - 1) * stepY
      };
    });
    const d = points.map((p, i) => `${i ? 'L' : 'M'} ${p.x} ${p.y}`).join(' ');
    const tone = isHint ? 'hint' : isMatch ? 'match' : 'hint';
    const createPath = className => {
      const element = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      element.setAttribute('d', d);
      element.setAttribute('class', className);
      return element;
    };
    const glow = createPath(`path-glow ${tone}-glow`);
    const line = createPath(`path-line ${tone}-line`);
    const spark = createPath(`path-spark ${tone}-spark`);
    const endpoints = points.length ? [points[0], points[points.length - 1]].map(point => {
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', point.x);
      circle.setAttribute('cy', point.y);
      circle.setAttribute('r', '7');
      circle.setAttribute('class', `path-endpoint ${tone}-endpoint`);
      return circle;
    }) : [];
    const pathLength = line.getTotalLength();
    const sparkLength = pathLength > 0 ? Math.min(26, pathLength * .08) : 0;
    if (pathLength > 0) {
      spark.style.strokeDasharray = `${sparkLength}px ${pathLength}px`;
      spark.style.strokeDashoffset = `${pathLength}px`;
    }
    pathLayer.replaceChildren(glow, line, spark, ...endpoints);
    setPathVisible(true);
    if (pathLength > 0 && typeof spark.animate === 'function' && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
      spark.animate(
        [{ strokeDashoffset: `${pathLength}px` }, { strokeDashoffset: `${-sparkLength}px` }],
        { duration: Math.max(300, Math.min(480, pathLength * .55)), easing: 'linear', iterations: 1, fill: 'forwards' }
      );
    } else {
      spark.style.strokeDashoffset = '0px';
    }
  }

  function clearPair(a, b, path) {
    const pairKey = getPairKey(a, b);
    const usedHint = assistedHintPairs.delete(pairKey);
    busy = true;
    selected = null;
    drawPath(path, false, true);
    const cellA = boardEl.querySelector(`[data-row="${a.r}"][data-column="${a.c}"]`);
    const cellB = boardEl.querySelector(`[data-row="${b.r}"][data-column="${b.c}"]`);
    cellA?.classList.add('matched');
    cellB?.classList.add('matched');
    matchTimeout = window.setTimeout(() => {
      matchTimeout = null;
      cellA?.classList.add('removing');
      cellB?.classList.add('removing');
      matchTimeout = window.setTimeout(() => {
        matchTimeout = null;
        const previousPositions = captureTilePositions();
        grid[a.r][a.c] = null;
        grid[b.r][b.c] = null;
        if (!usedHint) score += 20;
        playEffect('correct');
        pathLayer.replaceChildren();
        setPathVisible(false);
        applyLevelMovement();
        cellA?.remove();
        cellB?.remove();
        const movementDuration = arrangeBoard(selectedLevel !== 1, previousPositions);
        updateStats();
        message.textContent = 'Lovely. Keep going, one pair at a time.';
        movementTimeout = window.setTimeout(() => {
          movementTimeout = null;
          busy = false;
          if (tileCount() === 0) finishGame();
          else if (!findAnyMove()) {
            reshuffle();
          }
        }, selectedLevel === 1 ? 0 : movementDuration + 60);
      }, 160);
    }, 400);
  }

  function packLine(line, towardEnd = false) {
    const filled = line.filter(Boolean);
    return towardEnd ? Array(line.length - filled.length).fill(null).concat(filled) : filled.concat(Array(line.length - filled.length).fill(null));
  }

  function applyLevelMovement() {
    if (selectedLevel === 1) return;
    if (selectedLevel === 2 || selectedLevel === 3) {
      for (let c = 0; c < columns; c++) {
        const packed = packLine(grid.map(row => row[c]), selectedLevel === 3);
        for (let r = 0; r < rows; r++) grid[r][c] = packed[r];
      }
      return;
    }
    if (selectedLevel === 4 || selectedLevel === 5) {
      grid = grid.map(row => packLine(row, selectedLevel === 5));
      return;
    }
    if (selectedLevel === 6) {
      const middle = columns / 2;
      grid = grid.map(row => {
        const left = row.slice(0, middle).filter(Boolean);
        const right = row.slice(middle).filter(Boolean);
        return left.concat(Array(middle - left.length + middle - right.length).fill(null), right);
      });
      return;
    }
    if (selectedLevel === 7) {
      grid = grid.map(row => {
        const filled = row.filter(Boolean);
        const start = Math.floor((columns - filled.length) / 2);
        return Array(start).fill(null).concat(filled, Array(columns - start - filled.length).fill(null));
      });
      return;
    }
    if (selectedLevel === 8) {
      const halfRows = Math.floor(rows / 2), halfColumns = columns / 2;
      const quadrants = [
        { r0: 0, r1: halfRows, c0: 0, c1: halfColumns, rStep: 1, cStep: 1 },
        { r0: 0, r1: halfRows, c0: halfColumns, c1: columns, rStep: 1, cStep: -1 },
        { r0: halfRows, r1: rows, c0: 0, c1: halfColumns, rStep: -1, cStep: 1 },
        { r0: halfRows, r1: rows, c0: halfColumns, c1: columns, rStep: -1, cStep: -1 }
      ];
      for (const q of quadrants) {
        const coords = [];
        for (let r = q.rStep === 1 ? q.r0 : q.r1 - 1; q.rStep === 1 ? r < q.r1 : r >= q.r0; r += q.rStep) {
          for (let c = q.cStep === 1 ? q.c0 : q.c1 - 1; q.cStep === 1 ? c < q.c1 : c >= q.c0; c += q.cStep) coords.push([r, c]);
        }
        const values = coords.map(([r, c]) => grid[r][c]).filter(Boolean);
        coords.forEach(([r, c], index) => { grid[r][c] = values[index] || null; });
      }
    }
  }

  function findAnyMove() {
    const positions = [];
    for (let r = 0; r < rows; r++) for (let c = 0; c < columns; c++) if (grid[r][c]) positions.push({ r, c });
    for (let i = 0; i < positions.length; i++) {
      for (let j = i + 1; j < positions.length; j++) {
        const a = positions[i], b = positions[j];
        if (grid[a.r][a.c].symbol === grid[b.r][b.c].symbol && findPath(a, b)) return [a, b];
      }
    }
    return null;
  }

  function reshuffle() {
    const tiles = grid.flat().filter(Boolean);
    const symbolsToShuffle = tiles.map(tile => tile.symbol);
    score -= 10;
    assistedHintPairs.clear();
    dismissToast();
    clearHint();
    do {
      for (let i = symbolsToShuffle.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [symbolsToShuffle[i], symbolsToShuffle[j]] = [symbolsToShuffle[j], symbolsToShuffle[i]];
      }
      let symbolIndex = 0;
      grid = grid.map(row => row.map(tile => tile
        ? { id: tile.id, symbol: symbolsToShuffle[symbolIndex++] }
        : null));
    } while (!findAnyMove());
    selected = null;
    arrangeBoard(false);
    updateStats();
    playEffect('shuffle');
  }

  function showHint() {
    if (busy) return;
    const pair = findAnyMove();
    if (!pair) return;
    assistedHintPairs.add(getPairKey(pair[0], pair[1]));
    dismissToast();
    renderBoard();
    const a = boardEl.querySelector(`[data-row="${pair[0].r}"][data-column="${pair[0].c}"]`);
    const b = boardEl.querySelector(`[data-row="${pair[1].r}"][data-column="${pair[1].c}"]`);
    a?.classList.add('hint');
    b?.classList.add('hint');
    drawPath(findPath(pair[0], pair[1]), true);
    window.clearTimeout(hintTimeout);
    hintTimeout = window.setTimeout(clearHint, 1800);
  }

  function clearHint() {
    window.clearTimeout(hintTimeout);
    boardEl.querySelectorAll('.tile.hint').forEach(tile => tile.classList.remove('hint'));
    pathLayer.replaceChildren();
    setPathVisible(false);
  }

  function showToast(text) {
    toast.textContent = text;
    toast.classList.add('visible');
    window.clearTimeout(toastId);
    toastId = window.setTimeout(() => toast.classList.remove('visible'), 1900);
  }

  function dismissToast() {
    window.clearTimeout(toastId);
    toastId = null;
    toast.classList.remove('visible');
  }

  function readLeaderboard() {
    try {
      const stored = JSON.parse(localStorage.getItem('cozy-onet-leaderboard') || '[]');
      return Array.isArray(stored) ? stored.filter(entry =>
        entry && typeof entry.name === 'string' && Number.isFinite(entry.score) && Number.isFinite(entry.time)
      ) : [];
    } catch (error) {
      console.warn('Leaderboard could not be loaded:', error);
      return [];
    }
  }

  function renderLeaderboard() {
    const entries = readLeaderboard()
      .sort((a, b) => b.score - a.score || a.time - b.time);
    leaderboardList.replaceChildren(...entries.map((entry, index) => {
      const item = document.createElement('li');
      item.className = 'leaderboard-row';
      if (entry.id && entry.id === recentlySavedEntryId) item.classList.add('is-new-score');
      const rank = document.createElement('span');
      rank.className = 'leaderboard-rank';
      rank.textContent = String(index + 1).padStart(2, '0');
      const name = document.createElement('strong');
      name.className = 'leaderboard-player';
      name.textContent = entry.name;
      const scoreValue = document.createElement('strong');
      scoreValue.className = 'leaderboard-score';
      scoreValue.textContent = entry.score.toLocaleString();
      const time = document.createElement('span');
      time.className = 'leaderboard-time';
      time.textContent = formatTime(entry.time);
      const boardSize = document.createElement('span');
      boardSize.className = 'leaderboard-board-size';
      boardSize.textContent = entry.board || '—';
      item.append(rank, name, scoreValue, time, boardSize);
      return item;
    }));
    leaderboardEmpty.hidden = entries.length > 0;
    leaderboardList.hidden = entries.length === 0;
  }

  function submitLeaderboardScore(event) {
    event.preventDefault();
    const name = playerNameInput.value.trim();
    if (!fullCampaignComplete || leaderboardScoreSubmitted || !name) return;
    const entries = readLeaderboard();
    recentlySavedEntryId = `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    entries.push({
      id: recentlySavedEntryId,
      name: name.slice(0, 24),
      score,
      time: completedCampaignTime,
      board: `${columns} × ${rows}`
    });
    entries.sort((a, b) => b.score - a.score || a.time - b.time);
    try {
      localStorage.setItem('cozy-onet-leaderboard', JSON.stringify(entries));
      leaderboardScoreSubmitted = true;
      leaderboardEntry.hidden = true;
      leaderboardEntryStatus.textContent = 'Your full-campaign score has been saved!';
      renderLeaderboard();
      if (!leaderboardDialog.open) leaderboardDialog.showModal();
    } catch (error) {
      leaderboardEntryStatus.textContent = 'Your score could not be saved in this browser.';
      console.warn('Leaderboard score could not be saved:', error);
    }
  }

  function goToNextLevel() {
    if (selectedLevel >= 8) return;
    const completedLevel = selectedLevel;
    if (campaignEligible && campaignNextExpected === completedLevel) {
      campaignNextExpected = completedLevel + 1;
    } else {
      campaignEligible = false;
    }
    selectedLevel++;
    levelEntryScore = score;
    boardSizeLocked = true;
    boardSizeControl.disabled = true;
    levelButtons.querySelectorAll('.level-button').forEach(button => {
      const active = Number(button.dataset.level) === selectedLevel;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    startGame(levelEntryScore);
  }

  function finishGame() {
    window.clearInterval(clockId);
    roundFinished = true;
    score = Math.max(0, score + timeBonusByBoardSize[boardSizeId] - seconds * 10)
      + levelCompletionBonusByBoardSize[boardSizeId];
    if (campaignEligible && campaignNextExpected === selectedLevel) campaignTimes[selectedLevel - 1] = seconds;
    fullCampaignComplete = selectedLevel === 8 && campaignEligible && campaignNextExpected === 8
      && campaignTimes.slice(0, 7).every(Number.isFinite);
    if (fullCampaignComplete) {
      campaignTimes[7] = seconds;
      completedCampaignTime = campaignTimes.reduce((total, levelTime) => total + levelTime, 0);
    }
    updateStats();
    titleEl.textContent = fullCampaignComplete ? 'Cozy Onet complete!' : `Level ${selectedLevel} complete!`;
    message.textContent = fullCampaignComplete
      ? `All 8 levels complete in ${formatTime(completedCampaignTime)}. Your campaign score is ready.`
      : `All clear in ${timerEl.textContent}. Choose another level or play again.`;
    hintButton.disabled = true;
    shuffleButton.disabled = true;
    startButton.innerHTML = `<span aria-hidden="true">↻</span> Play level ${selectedLevel} again`;
    celebrationTitle.textContent = fullCampaignComplete ? 'All 8 levels complete!' : `Level ${selectedLevel} complete!`;
    finalScoreEl.textContent = String(score);
    finishTimeEl.textContent = fullCampaignComplete ? formatTime(completedCampaignTime) : timerEl.textContent;
    celebrationDetail.textContent = fullCampaignComplete
      ? 'An amazing full-campaign run! Add your name to the leaderboard.'
      : selectedLevel === 8
        ? 'Leaderboard entries require completing levels 1–8 in order with Next Level.'
        : 'Time bonus is included in your score.';
    nextLevelButton.hidden = selectedLevel >= 8;
    leaderboardEntry.hidden = !fullCampaignComplete;
    leaderboardEntryStatus.textContent = '';
    levelCelebration.classList.toggle('is-grand-finale', fullCampaignComplete);
    playEffect('levelComplete');
    const confettiCount = fullCampaignComplete ? 88 : 24;
    const confetti = Array.from({ length: confettiCount }, (_, index) => {
      const piece = document.createElement('i');
      const angle = (Math.PI * 2 * index) / confettiCount;
      const distance = fullCampaignComplete ? 105 + (index % 6) * 34 : 95 + (index % 4) * 25;
      piece.textContent = fullCampaignComplete && index % 4 === 0 ? '✹' : index % 3 === 0 ? '✦' : '✧';
      piece.style.setProperty('--dx', `${Math.cos(angle) * distance}px`);
      piece.style.setProperty('--dy', `${Math.sin(angle) * distance}px`);
      piece.style.setProperty('--hue', String((index * 47 + 35) % 360));
      piece.style.setProperty('--delay', `${(index % (fullCampaignComplete ? 12 : 6)) * (fullCampaignComplete ? 35 : 25)}ms`);
      return piece;
    });
    celebrationConfetti.replaceChildren(...confetti);
    levelCelebration.hidden = false;
    dismissToast();
  }

  class BackgroundMusic {
    constructor() {
      this.enabled = false;
      this.userMuted = false;
      this.audio = new Audio(new URL('./assets/onet.mp3', document.baseURI));
      this.audio.loop = true;
      this.audio.preload = 'auto';
      this.audio.volume = .48;
    }
    async start({ automatic = false } = {}) {
      if (automatic && this.userMuted) return;
      if (this.enabled && !this.audio.paused) return;
      try {
        await this.audio.play();
        this.enabled = true;
        updateSoundControl();
      } catch (error) {
        this.enabled = false;
        updateSoundControl();
        showToast('Could not play assets/onet.mp3. Check the game assets folder.');
        console.warn('Background music could not start:', error);
      }
    }
    async toggle() {
      if (this.enabled) {
        this.audio.pause();
        this.audio.currentTime = 0;
        this.enabled = false;
        this.userMuted = true;
        updateSoundControl();
        return;
      }
      this.userMuted = false;
      await this.start();
    }
  }

  class RainAmbience {
    constructor() {
      this.enabled = false;
      this.theme = document.documentElement.dataset.resolvedTheme || 'light';
      const source = this.sourceForTheme(this.theme);
      this.audio = new Audio(source);
      this.nextAudio = new Audio(source);
      this.audio.loop = false;
      this.nextAudio.loop = false;
      this.audio.preload = 'auto';
      this.nextAudio.preload = 'auto';
      this.activeAudio = this.audio;
      this.spareAudio = this.nextAudio;
      this.volume = .35;
      this.audio.volume = this.volume;
      this.nextAudio.volume = this.volume;
      this.fadeInterval = null;
      this.crossfadeInterval = null;
      this.crossfadePending = false;
      this.crossfadeDuration = 8;
      this.crossfadeProgress = 0;
      this.transitionId = 0;
      this.onTimeUpdate = () => this.checkLoopBoundary();
      this.audio.addEventListener('timeupdate', this.onTimeUpdate);
      this.nextAudio.addEventListener('timeupdate', this.onTimeUpdate);
    }
    sourceForTheme(theme) {
      return new URL(theme === 'dark' ? './assets/rain.mp3' : './assets/forest.mp3', document.baseURI);
    }
    setTheme(theme) {
      if (!['light', 'dark'].includes(theme) || theme === this.theme) return;
      this.theme = theme;
      const source = this.sourceForTheme(theme);
      if (this.crossfadeInterval !== null) window.clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
      this.crossfadePending = false;
      this.transitionId++;
      for (const audio of [this.activeAudio, this.spareAudio]) {
        audio.pause();
        audio.src = source.href;
        audio.load();
        audio.currentTime = 0;
        audio.volume = this.volume;
      }
      this.crossfadeProgress = 0;
      if (this.enabled) {
        this.activeAudio.volume = 0;
        this.activeAudio.play().then(() => this.fadeIn()).catch(error => {
          this.enabled = false;
          updateRainControl();
          console.warn('Ambience sound could not switch themes:', error);
        });
      }
    }
    setVolume(volume) {
      this.volume = volume;
      if (this.crossfadePending) {
        const phase = this.crossfadeProgress * Math.PI / 2;
        this.activeAudio.volume = volume * Math.cos(phase);
        this.spareAudio.volume = volume * Math.sin(phase);
      } else if (this.fadeInterval === null) {
        this.activeAudio.volume = volume;
        this.spareAudio.volume = volume;
      }
    }
    fadeIn() {
      if (this.fadeInterval !== null) window.clearInterval(this.fadeInterval);
      const fadeDuration = 2200;
      const fadeStarted = performance.now();
      this.activeAudio.volume = 0;
      this.fadeInterval = window.setInterval(() => {
        const progress = Math.min(1, (performance.now() - fadeStarted) / fadeDuration);
        this.activeAudio.volume = this.volume * Math.sin(progress * Math.PI / 2);
        if (progress === 1) {
          window.clearInterval(this.fadeInterval);
          this.fadeInterval = null;
          this.activeAudio.volume = this.volume;
        }
      }, 25);
    }
    checkLoopBoundary() {
      if (!this.enabled || this.crossfadePending) return;
      const remaining = this.activeAudio.duration - this.activeAudio.currentTime;
      if (Number.isFinite(remaining) && remaining <= this.crossfadeDuration) this.startLoopCrossfade();
    }
    startLoopCrossfade() {
      this.crossfadePending = true;
      this.crossfadeProgress = 0;
      const maxStartTime = Math.max(0, this.spareAudio.duration - this.crossfadeDuration - 12);
      const minStartTime = Math.min(12, maxStartTime);
      this.spareAudio.currentTime = minStartTime + Math.random() * (maxStartTime - minStartTime);
      this.spareAudio.volume = 0;
      this.activeAudio.volume = this.volume;
      const transitionId = ++this.transitionId;
      this.spareAudio.play().then(() => {
        if (!this.enabled || transitionId !== this.transitionId) {
          this.spareAudio.pause();
          return;
        }
        const crossfadeStarted = performance.now();
        this.crossfadeInterval = window.setInterval(() => {
          if (transitionId !== this.transitionId) return;
          this.crossfadeProgress = Math.min(1, (performance.now() - crossfadeStarted) / (this.crossfadeDuration * 1000));
          const phase = this.crossfadeProgress * Math.PI / 2;
          this.activeAudio.volume = this.volume * Math.cos(phase);
          this.spareAudio.volume = this.volume * Math.sin(phase);
          if (this.crossfadeProgress >= 1) this.finishLoopCrossfade();
        }, 25);
      }).catch(error => {
        if (transitionId !== this.transitionId) return;
        this.crossfadePending = false;
        this.crossfadeProgress = 0;
        this.spareAudio.volume = this.volume;
        console.warn('Rain loop crossfade could not start:', error);
      });
    }
    finishLoopCrossfade() {
      if (this.crossfadeInterval !== null) window.clearInterval(this.crossfadeInterval);
      this.crossfadeInterval = null;
      const outgoing = this.activeAudio;
      this.activeAudio = this.spareAudio;
      this.spareAudio = outgoing;
      this.audio = this.activeAudio;
      this.spareAudio.pause();
      this.spareAudio.currentTime = 0;
      this.spareAudio.volume = this.volume;
      this.activeAudio.volume = this.volume;
      this.crossfadeProgress = 0;
      this.crossfadePending = false;
    }
    resume() {
      if (this.enabled) this.activeAudio.play().catch(() => {});
      if (this.enabled && this.crossfadePending) this.spareAudio.play().catch(() => {});
    }
    async toggle() {
      if (this.enabled) {
        if (this.fadeInterval !== null) window.clearInterval(this.fadeInterval);
        this.fadeInterval = null;
        if (this.crossfadeInterval !== null) window.clearInterval(this.crossfadeInterval);
        this.crossfadeInterval = null;
        this.crossfadePending = false;
        this.transitionId++;
        for (const audio of [this.activeAudio, this.spareAudio]) {
          audio.pause();
          audio.currentTime = 0;
          audio.volume = this.volume;
        }
        this.crossfadeProgress = 0;
        this.enabled = false;
        updateRainControl();
        return;
      }
      try {
        this.activeAudio.currentTime = 0;
        this.activeAudio.volume = 0;
        await this.activeAudio.play();
        this.enabled = true;
        this.fadeIn();
      } catch (error) {
        this.enabled = false;
        this.activeAudio.volume = this.volume;
        const file = this.theme === 'dark' ? 'rain.mp3' : 'forest.mp3';
        showToast(`Could not play assets/${file}. Check the game assets folder.`);
        console.warn('Ambience sound could not start:', error);
      }
      updateRainControl();
    }
  }

  let effectsContext = null;
  const wrongMatchAudio = new Audio(new URL('./assets/ooo.mp3', document.baseURI));
  wrongMatchAudio.preload = 'auto';
  wrongMatchAudio.volume = .75;

  function playEffect(kind) {
    if (kind === 'wrong') {
      wrongMatchAudio.currentTime = 0;
      void wrongMatchAudio.play().catch(error => {
        console.warn('Wrong-match sound could not play:', error);
      });
      return;
    }

    try {
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return;
      if (!effectsContext || effectsContext.state === 'closed') effectsContext = new AudioContextClass();
      if (effectsContext.state === 'suspended') effectsContext.resume().catch(() => {});
      const patterns = {
        click: [{ frequency: 660, delay: 0, duration: .045, type: 'sine' }],
        wrong: [{ frequency: 230, delay: 0, duration: .11, type: 'triangle' }, { frequency: 185, delay: .075, duration: .13, type: 'triangle' }],
        correct: [{ frequency: 523.25, delay: 0, duration: .13, type: 'sine' }, { frequency: 659.25, delay: .065, duration: .15, type: 'sine' }, { frequency: 783.99, delay: .13, duration: .2, type: 'sine' }],
        shuffle: [{ frequency: 392, delay: 0, duration: .09, type: 'triangle' }, { frequency: 523.25, delay: .08, duration: .12, type: 'triangle' }],
        levelComplete: [{ frequency: 659.25, delay: 0, duration: .2, type: 'sine' }, { frequency: 783.99, delay: .16, duration: .24, type: 'sine' }, { frequency: 987.77, delay: .34, duration: .42, type: 'sine' }]
      };
      const now = effectsContext.currentTime;
      for (const note of patterns[kind]) {
        const oscillator = effectsContext.createOscillator();
        const gain = effectsContext.createGain();
        const start = now + note.delay;
        oscillator.type = note.type;
        oscillator.frequency.setValueAtTime(note.frequency, start);
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(kind === 'click' ? .055 : .09, start + .012);
        gain.gain.exponentialRampToValueAtTime(.0001, start + note.duration);
        oscillator.connect(gain);
        gain.connect(effectsContext.destination);
        oscillator.start(start);
        oscillator.stop(start + note.duration + .01);
        oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
      }
    } catch (error) {
      console.warn('Sound effect could not play:', error);
    }
  }

  const music = new BackgroundMusic();
  const rainAmbience = new RainAmbience();
  function setPathVisible(visible) {
    if (visible) pathLayer.removeAttribute('hidden');
    else pathLayer.setAttribute('hidden', '');
  }

  function updateSoundControl() {
    soundToggle.classList.toggle('is-on', music.enabled);
    soundToggle.setAttribute('aria-label', music.enabled ? 'Turn music off (M)' : 'Turn music on (M)');
    soundToggle.title = music.enabled ? 'Music is on · M' : 'Music is off · M';
    soundIcon.textContent = music.enabled ? '♫' : '♪';
  }

  function updateRainControl() {
    rainToggle.classList.toggle('is-on', rainAmbience.enabled);
    rainToggle.setAttribute('aria-pressed', String(rainAmbience.enabled));
    rainToggle.setAttribute('aria-label', rainAmbience.enabled ? 'Turn ambience sound off' : 'Enable ambience sound');
    rainToggleLabel.textContent = rainAmbience.enabled ? 'AMBIENCE SOUND: ON' : 'AMBIENCE SOUND: OFF';
  }

  function applyTileAppearance() {
    for (const property of ['--surface-tile-start', '--surface-tile-end', '--tile-border']) {
      boardEl.style.removeProperty(property);
    }
    const isDark = document.documentElement.dataset.resolvedTheme === 'dark';
    if (boardTileStyle === 'theme-color') return;
    if (boardTileStyle === 'transparent') {
      // Keep the other stop inherited from the active theme so its tile gradient remains visible.
      boardEl.style.setProperty(isDark ? '--surface-tile-start' : '--surface-tile-end', 'transparent');
      return;
    }

    const colorsByLevel = [
      { light: '#91cda1', lightBorder: '#5a9a6b', dark: '#568263', darkBorder: '#85b392' },
      { light: '#83b8e2', lightBorder: '#528ebd', dark: '#4d779c', darkBorder: '#79a8cd' },
      { light: '#f0a773', lightBorder: '#c97845', dark: '#9d603c', darkBorder: '#d08b64' },
      { light: '#b59be0', lightBorder: '#8d6cb7', dark: '#775c9a', darkBorder: '#a78ac7' },
      { light: '#ead05b', lightBorder: '#b69a2e', dark: '#927c31', darkBorder: '#c2ad58' },
      { light: '#e58fa7', lightBorder: '#bf607d', dark: '#984e63', darkBorder: '#c1798e' },
      { light: '#66c8bd', lightBorder: '#399b91', dark: '#3d817b', darkBorder: '#6db3ac' },
      { light: '#8fa4ec', lightBorder: '#6378c4', dark: '#596fae', darkBorder: '#879ce0' }
    ];
    const colors = colorsByLevel[(selectedLevel - 1) % colorsByLevel.length];
    boardEl.style.setProperty(isDark ? '--surface-tile-start' : '--surface-tile-end', isDark ? colors.dark : colors.light);
    boardEl.style.setProperty('--tile-border', isDark ? colors.darkBorder : colors.lightBorder);
  }

  function applyTheme(theme) {
    const root = document.documentElement;
    root.dataset.theme = theme;
    root.dataset.resolvedTheme = theme === 'auto'
      ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
      : theme;
    applyTileAppearance();
    rainAmbience.setTheme(root.dataset.resolvedTheme);
    themeOptions.forEach(button => {
      const active = button.dataset.themeOption === theme;
      button.classList.toggle('active', active);
      button.setAttribute('aria-pressed', String(active));
    });
    themeSelect.value = theme;
  }

  let themePreference = 'auto';
  try {
    const savedBoardTileStyle = localStorage.getItem('cozy-onet-tile-style');
    if (['theme-color', 'autocolor', 'transparent'].includes(savedBoardTileStyle)) boardTileStyle = savedBoardTileStyle;
  } catch (error) {
    console.warn('Tile style preference could not be loaded:', error);
  }
  boardTileStyleControl.value = boardTileStyle;
  try {
    const savedTheme = localStorage.getItem('cozy-onet-theme');
    if (['auto', 'light', 'dark'].includes(savedTheme)) themePreference = savedTheme;
  } catch (error) {
    console.warn('Theme preference could not be loaded:', error);
  }
  applyTheme(themePreference);
  window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => {
    if (themePreference === 'auto') applyTheme('auto');
  });
  themeOptions.forEach(button => button.addEventListener('click', () => {
    themePreference = button.dataset.themeOption;
    applyTheme(themePreference);
    try {
      localStorage.setItem('cozy-onet-theme', themePreference);
    } catch (error) {
      console.warn('Theme preference could not be saved:', error);
    }
  }));
  themeSelect.addEventListener('change', () => {
    themePreference = themeSelect.value;
    applyTheme(themePreference);
    try {
      localStorage.setItem('cozy-onet-theme', themePreference);
    } catch (error) {
      console.warn('Theme preference could not be saved:', error);
    }
  });

  updateBoardSizeLabels();
  if (typeof orientationQuery.addEventListener === 'function') {
    orientationQuery.addEventListener('change', syncBoardOrientation);
  } else {
    orientationQuery.addListener(syncBoardOrientation);
  }

  startButton.addEventListener('click', () => startGame(levelEntryScore, { replay: true }));
  nextLevelButton.addEventListener('click', goToNextLevel);
  boardSizeControl.addEventListener('change', () => changeBoardSize(boardSizeControl.value));
  function sizeAboutDialog() {
    if (window.matchMedia('(min-width: 701px)').matches) {
      aboutDialog.style.width = `${gameCard.getBoundingClientRect().width * .9}px`;
    } else {
      aboutDialog.style.removeProperty('width');
    }
  }
  aboutButton.addEventListener('click', () => {
    sizeAboutDialog();
    aboutDialog.showModal();
  });
  window.addEventListener('resize', () => {
    syncBoardOrientation();
    updateMobileTileIconSize();
    if (aboutDialog.open) sizeAboutDialog();
  });
  aboutCloseButton.addEventListener('click', () => aboutDialog.close());
  leaderboardButton.addEventListener('click', () => {
    renderLeaderboard();
    leaderboardDialog.showModal();
  });
  leaderboardCloseButton.addEventListener('click', () => leaderboardDialog.close());
  leaderboardEntry.addEventListener('submit', submitLeaderboardScore);
  aboutDialog.addEventListener('click', event => {
    const rect = aboutDialog.getBoundingClientRect();
    if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) {
      aboutDialog.close();
    }
  });
  hintButton.addEventListener('click', showHint);
  shuffleButton.addEventListener('click', () => { if (!busy && !boardEl.hidden) reshuffle(); });
  soundToggle.addEventListener('click', () => music.toggle());
  volumeControl.addEventListener('input', () => {
    const percent = Number(volumeControl.value);
    music.audio.volume = percent / 100;
    volumeControl.setAttribute('aria-valuetext', `${percent} percent`);
  });
  rainToggle.addEventListener('click', () => { void rainAmbience.toggle(); });
  rainVolumeControl.addEventListener('input', () => {
    const percent = Number(rainVolumeControl.value);
    rainAmbience.setVolume(percent / 100);
    rainVolumeControl.setAttribute('aria-valuetext', `${percent} percent`);
  });
  boardDarknessControl.addEventListener('input', () => {
    const percent = Number(boardDarknessControl.value);
    boardWrap.style.setProperty('--board-overlay-opacity', String(percent / 100));
    boardDarknessValue.value = `${percent}%`;
    boardDarknessControl.setAttribute('aria-valuetext', `${percent} percent`);
  });
  boardTileStyleControl.addEventListener('change', () => {
    boardTileStyle = boardTileStyleControl.value;
    applyTileAppearance();
    try {
      localStorage.setItem('cozy-onet-tile-style', boardTileStyle);
    } catch (error) {
      console.warn('Tile style preference could not be saved:', error);
    }
  });
  levelButtons.addEventListener('click', event => {
    const button = event.target.closest('[data-level]');
    if (!button) return;
    selectedLevel = Number(button.dataset.level);
    applyTileAppearance();
    levelButtons.querySelectorAll('.level-button').forEach(item => {
      const active = item === button;
      item.classList.toggle('active', active);
      item.setAttribute('aria-pressed', String(active));
    });
    startButton.innerHTML = `<span aria-hidden="true">▶</span> Start level ${selectedLevel}`;
    levelEntryScore = 0;
    campaignEligible = selectedLevel === 1;
    campaignNextExpected = campaignEligible ? 1 : 0;
    campaignTimes = Array(8).fill(null);
    boardSizeLocked = false;
    boardSizeControl.disabled = false;
    if (!boardEl.hidden) startGame(0);
    else titleEl.textContent = `Level ${selectedLevel} · ${levelNames[selectedLevel - 1]}`;
  });
  document.addEventListener('click', event => {
    const clickedTile = event.target instanceof Element && event.target.closest('.tile:not(.tile-empty)');
    if (!selected || clickedTile) return;
    selected = null;
    boardEl.querySelector('.tile.selected')?.classList.remove('selected');
    if (document.activeElement instanceof HTMLElement && document.activeElement.matches('.tile')) {
      document.activeElement.blur();
    }
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && music.enabled) music.audio.play().catch(() => {});
    if (!document.hidden) rainAmbience.resume();
  });
  document.addEventListener('keydown', event => {
    if (event.altKey || event.ctrlKey || event.metaKey || event.repeat) return;
    if (event.target instanceof Element && event.target.closest('input, textarea, select, [contenteditable="true"]')) return;
    const key = event.key.toLowerCase();
    if (key === 'h' && !hintButton.disabled) showHint();
    else if (key === 'm') {
      event.preventDefault();
      void music.toggle();
    } else if (key === 's' && !shuffleButton.disabled && !busy && !boardEl.hidden) {
      event.preventDefault();
      reshuffle();
    }
  });
  updateSoundControl();
})();
