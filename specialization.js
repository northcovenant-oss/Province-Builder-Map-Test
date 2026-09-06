(function(){
  'use strict';

  const SNAPSHOT_KEY = 'landClaimSpecializationSnapshot';

  // ---- load the snapshot handed off from the bio page ----
  let snapshot = null;
  try {
    const raw = localStorage.getItem(SNAPSHOT_KEY);
    if(raw) snapshot = JSON.parse(raw);
  } catch(e){ snapshot = null; }

  const noSnapshotCard = document.getElementById('noSnapshotCard');
  const specApp = document.getElementById('specApp');

  if(!snapshot){
    noSnapshotCard.hidden = false;
    specApp.hidden = true;
    return;
  }
  noSnapshotCard.hidden = true;
  specApp.hidden = false;

  // ---- populate the read-only snapshot header ----
  document.getElementById('snapNation').textContent = snapshot.nation || 'Unnamed Nation';
  document.getElementById('snapEconomy').textContent = snapshot.economyType || '\u2014';
  document.getElementById('snapPopulation').textContent = snapshot.population || '\u2014';
  document.getElementById('snapGDP').textContent = snapshot.gdp || '\u2014';
  document.getElementById('snapEnergy').textContent = snapshot.energyProduction || '\u2014';
  document.getElementById('snapFood').textContent = snapshot.foodProduction || '\u2014';
  document.getElementById('step1EconomyType').textContent = snapshot.economyType || '\u2014';
  document.getElementById('adjEnergyValue').textContent = snapshot.energyProduction || '\u2014';
  document.getElementById('adjFoodValue').textContent = snapshot.foodProduction || '\u2014';

  // ---- Step 1: one slot per World Exports rank, tied to that rank's sector ----
  // snapshot.worldExports is the bio's actual 1st-5th ranked export labels
  // (e.g. "Services", "Raw Materials", "Services or Raw Materials", "Any").
  // Each slot only offers specializations from the pool(s) that label maps
  // to - see poolsForExportLabel in specialization-data.js. Falls back to
  // "Any" (every pool) for all 5 ranks if the snapshot is missing this
  // data (e.g. a snapshot saved before this feature existed) - shown as a
  // visible warning rather than silently substituting different options
  // than the player would expect from their actual bio.
  const RANK_LABELS = ['1st', '2nd', '3rd', '4th', '5th'];
  const hasWorldExports = !!(snapshot.worldExports && snapshot.worldExports.length === 5);
  const worldExports = hasWorldExports ? snapshot.worldExports : ['Any', 'Any', 'Any', 'Any', 'Any'];
  const specSlotsEl = document.getElementById('specSlots');
  const chosenSpecs = new Array(5).fill(null); // one choice per rank, in order

  if(!hasWorldExports){
    const warning = document.createElement('div');
    warning.className = 'spec-warning';
    warning.textContent = 'This claim\u2019s land bio doesn\u2019t have World Exports data attached (it may have been ' +
      'generated before this feature existed, or the snapshot didn\u2019t capture it). Every slot below is showing ' +
      'every specialization rather than the ranking your bio actually generated - go back and re-generate your ' +
      'bio, then continue here again, if you want the real ranking.';
    specSlotsEl.parentNode.insertBefore(warning, specSlotsEl);
  }

  function specId(rank, name){ return 'spec_' + rank + '_' + name.replace(/[^a-z0-9]+/gi, '_'); }

  function buildSlot(rank){
    const label = worldExports[rank];
    const poolNames = poolsForExportLabel(label);

    const slotDiv = document.createElement('div');
    slotDiv.className = 'spec-slot';
    slotDiv.setAttribute('data-rank', rank);

    const heading = document.createElement('div');
    heading.className = 'spec-slot-heading';
    heading.appendChild(document.createTextNode(RANK_LABELS[rank] + ' Export: '));
    const sectorSpan = document.createElement('span');
    sectorSpan.className = 'rank-sector';
    sectorSpan.textContent = label;
    heading.appendChild(sectorSpan);
    slotDiv.appendChild(heading);

    const status = document.createElement('div');
    status.className = 'spec-slot-status';
    status.textContent = 'Not yet chosen';
    slotDiv.appendChild(status);

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'spec-options';
    poolNames.forEach(function(poolName){
      const groupLabel = document.createElement('div');
      groupLabel.className = 'spec-group-label';
      groupLabel.textContent = poolName;
      optionsDiv.appendChild(groupLabel);

      (SPECIALIZATION_POOLS[poolName] || []).forEach(function(name){
        const id = specId(rank, name);
        const optLabel = document.createElement('label');
        optLabel.className = 'spec-option';
        optLabel.setAttribute('for', id);
        const input = document.createElement('input');
        input.type = 'radio';
        input.name = 'specRank' + rank;
        input.id = id;
        input.value = name;
        optLabel.appendChild(input);
        optLabel.appendChild(document.createTextNode(' ' + name));
        optionsDiv.appendChild(optLabel);
      });
    });
    slotDiv.appendChild(optionsDiv);
    return slotDiv;
  }

  for(let rank = 0; rank < 5; rank++){ specSlotsEl.appendChild(buildSlot(rank)); }

  // Once a specialization is picked for one rank, it's disabled in every
  // other rank's list - the same specialty shouldn't be both your 1st and
  // 3rd export, for example.
  function refreshDuplicateState(){
    const chosenSet = new Set(chosenSpecs.filter(Boolean));
    specSlotsEl.querySelectorAll('input[type="radio"]').forEach(function(radio){
      const isChosenElsewhere = !radio.checked && chosenSet.has(radio.value);
      radio.disabled = isChosenElsewhere;
      radio.closest('.spec-option').classList.toggle('disabled', isChosenElsewhere);
    });
  }

  specSlotsEl.addEventListener('change', function(e){
    if(e.target.type !== 'radio') return;
    const rank = parseInt(e.target.name.replace('specRank', ''), 10);
    chosenSpecs[rank] = e.target.value;
    const slotDiv = e.target.closest('.spec-slot');
    const status = slotDiv.querySelector('.spec-slot-status');
    status.textContent = 'Chosen: ' + e.target.value;
    status.classList.add('filled');
    refreshDuplicateState();
    updateNextButtonState();
  });

  // ---- Step 2: Military Doctrine (Priority + Stance) ----
  document.getElementById('militaryPriorityIntro').textContent = MILITARY_PRIORITY_INTRO;
  document.getElementById('militaryStanceIntro').textContent = MILITARY_STANCE_INTRO;

  let chosenPriority = null;
  let chosenStance = null;

  function buildDoctrineOptions(containerId, options, groupName, onChosen){
    const container = document.getElementById(containerId);
    options.forEach(function(opt){
      const id = groupName + '_' + opt.id.replace(/[^a-z0-9]+/gi, '_');
      const optLabel = document.createElement('label');
      optLabel.className = 'spec-option doctrine-option';
      optLabel.setAttribute('for', id);
      const input = document.createElement('input');
      input.type = 'radio';
      input.name = groupName;
      input.id = id;
      input.value = opt.id;
      optLabel.appendChild(input);
      const textWrap = document.createElement('span');
      const nameSpan = document.createElement('strong');
      nameSpan.textContent = opt.id;
      textWrap.appendChild(nameSpan);
      textWrap.appendChild(document.createTextNode(' \u2014 ' + opt.description));
      optLabel.appendChild(textWrap);
      container.appendChild(optLabel);
    });
    container.addEventListener('change', function(e){
      if(e.target.name !== groupName) return;
      onChosen(e.target.value);
      renderFocusBranches();
      updateNextButtonState();
    });
  }

  buildDoctrineOptions('militaryPriorityOptions', MILITARY_PRIORITY_OPTIONS, 'militaryPriority', function(v){ chosenPriority = v; });
  buildDoctrineOptions('militaryStanceOptions', MILITARY_STANCE_OPTIONS, 'militaryStance', function(v){ chosenStance = v; });

  // ---- Step 2: Military Focus (point allocation across 5 branches) ----
  document.getElementById('militaryFocusIntro').textContent =
    'Distribute your points between the different armed forces to rank their importance to your nation.';
  const focusBranchesEl = document.getElementById('militaryFocusBranches');
  const focusValues = {}; // branch id -> points currently allocated
  MILITARY_BRANCHES.forEach(function(b){ focusValues[b.id] = 0; });

  function branchCap(branch){
    if(!chosenStance) return branch.requiresUnlock ? 0 : branch.standardCap;
    const raised = branch.raiseCapIf && branch.raiseCapIf(chosenPriority, chosenStance);
    if(branch.requiresUnlock) return raised ? militaryFocusBudget(chosenStance) : 0;
    return raised ? militaryFocusBudget(chosenStance) : branch.standardCap;
  }

  function pointsSpent(){
    return MILITARY_BRANCHES.reduce(function(sum, b){ return sum + (focusValues[b.id] || 0); }, 0);
  }

  function renderFocusBranches(){
    const budget = chosenStance ? militaryFocusBudget(chosenStance) : MILITARY_FOCUS_BASE_POINTS;
    const isPacifist = chosenStance === 'Pacifist';
    focusBranchesEl.innerHTML = '';

    MILITARY_BRANCHES.forEach(function(branch){
      const cap = Math.min(branchCap(branch), budget);
      // Clamp any already-entered value down if a doctrine change lowered this branch's cap.
      if(focusValues[branch.id] > cap) focusValues[branch.id] = cap;

      const row = document.createElement('div');
      row.className = 'focus-branch' + (cap === 0 ? ' locked' : '');

      const label = document.createElement('label');
      label.textContent = branch.id;
      if(branch.requiresUnlock && cap === 0){
        const note = document.createElement('span');
        note.className = 'focus-cap-note';
        note.textContent = ' (locked - requires Projecting or Aggressive stance)';
        label.appendChild(note);
      } else {
        const note = document.createElement('span');
        note.className = 'focus-cap-note';
        note.textContent = ' (max ' + cap + ')';
        label.appendChild(note);
      }
      row.appendChild(label);

      const input = document.createElement('input');
      input.type = 'number';
      input.min = '0';
      input.max = String(cap);
      input.value = String(focusValues[branch.id]);
      input.disabled = isPacifist || cap === 0;
      input.setAttribute('data-branch', branch.id);
      row.appendChild(input);

      if(branch.levelsPerPoint){
        const levelsNote = document.createElement('span');
        levelsNote.className = 'focus-levels-note';
        const perPoint = branch.levelsPerPoint(chosenPriority);
        levelsNote.textContent = '= ' + (focusValues[branch.id] * perPoint) + ' levels (' + perPoint + ' per point)';
        row.appendChild(levelsNote);
      }

      focusBranchesEl.appendChild(row);
    });

    document.getElementById('focusPointsTotal').textContent = isPacifist ? '0 (Pacifist - no military)' : budget;
    updateRemainingPoints();
  }

  function updateRemainingPoints(){
    const budget = chosenStance ? militaryFocusBudget(chosenStance) : MILITARY_FOCUS_BASE_POINTS;
    const remaining = budget - pointsSpent();
    document.getElementById('focusPointsRemaining').textContent = remaining;
  }

  focusBranchesEl.addEventListener('input', function(e){
    if(e.target.tagName !== 'INPUT') return;
    const branchId = e.target.getAttribute('data-branch');
    const branch = MILITARY_BRANCHES.filter(function(b){ return b.id === branchId; })[0];
    if(!branch) return;
    let val = parseInt(e.target.value, 10);
    if(isNaN(val) || val < 0) val = 0;
    const cap = Math.min(branchCap(branch), chosenStance ? militaryFocusBudget(chosenStance) : MILITARY_FOCUS_BASE_POINTS);
    if(val > cap) val = cap;
    // Also can't exceed remaining budget across all branches combined.
    const otherSpent = pointsSpent() - (focusValues[branchId] || 0);
    const budget = chosenStance ? militaryFocusBudget(chosenStance) : MILITARY_FOCUS_BASE_POINTS;
    if(otherSpent + val > budget) val = Math.max(0, budget - otherSpent);
    focusValues[branchId] = val;
    e.target.value = String(val);
    if(branch.levelsPerPoint){
      const row = e.target.closest('.focus-branch');
      const levelsNote = row.querySelector('.focus-levels-note');
      const perPoint = branch.levelsPerPoint(chosenPriority);
      levelsNote.textContent = '= ' + (val * perPoint) + ' levels (' + perPoint + ' per point)';
    }
    updateRemainingPoints();
    updateNextButtonState();
  });

  renderFocusBranches();

  // ---- Step 3: show chosen specializations for reference ----
  function renderChosenSummary(){
    const el = document.getElementById('chosenSummary');
    const filled = chosenSpecs.filter(Boolean);
    if(filled.length === 0){ el.textContent = ''; return; }
    el.textContent = 'Your chosen specializations: ' + filled.join(', ');
  }

  // ---- Step navigation ----
  const TOTAL_STEPS = 4;
  let currentStep = 1;
  const backBtn = document.getElementById('backBtn');
  const nextBtn = document.getElementById('nextBtn');
  const stepIndicator = document.getElementById('stepIndicator');

  function panelFor(step){
    return step === 'summary' ? document.getElementById('stepSummary') : document.getElementById('step' + step);
  }

  function updateNextButtonState(){
    let enabled = true;
    if(currentStep === 1) enabled = chosenSpecs.every(Boolean);
    if(currentStep === 2){
      // Doctrine (both Priority and Stance) always required. Focus points
      // must be fully allocated too, UNLESS Pacifist (budget is 0, so
      // there's nothing to allocate - Focus is effectively skipped).
      const doctrineChosen = !!chosenPriority && !!chosenStance;
      const budget = chosenStance ? militaryFocusBudget(chosenStance) : MILITARY_FOCUS_BASE_POINTS;
      const focusComplete = chosenStance === 'Pacifist' || pointsSpent() === budget;
      enabled = doctrineChosen && focusComplete;
    }
    nextBtn.disabled = !enabled;
  }

  function showStep(step){
    // hide all panels
    [1,2,3,4,'summary'].forEach(function(s){ panelFor(s).hidden = true; });
    panelFor(step).hidden = false;

    backBtn.hidden = (step === 1);
    nextBtn.textContent = (step === 4) ? 'Finish \u2192' : 'Next \u2192';
    if(step === 'summary'){
      nextBtn.hidden = true;
    } else {
      nextBtn.hidden = false;
    }

    // update step-indicator dots
    stepIndicator.querySelectorAll('.step-dot').forEach(function(dot){
      const dotStep = parseInt(dot.getAttribute('data-step'), 10);
      dot.classList.toggle('active', step !== 'summary' && dotStep === step);
      dot.classList.toggle('done', step === 'summary' || dotStep < step);
    });

    if(step === 3) renderChosenSummary();
    if(step === 'summary') renderFinalSummary();
    updateNextButtonState();
  }

  function renderFinalSummary(){
    document.getElementById('summarySpecs').textContent = chosenSpecs.filter(Boolean).join(', ') || '\u2014';
    const militarySummary = chosenStance === 'Pacifist'
      ? 'Pacifist - no military'
      : (chosenPriority || '\u2014') + ' priority, ' + (chosenStance || '\u2014') + ' stance \u2014 ' +
        MILITARY_BRANCHES.map(function(b){ return b.id + ': ' + (focusValues[b.id] || 0); }).join(', ');
    document.getElementById('summaryMilitary').textContent = militarySummary;
    const popSelect = document.getElementById('specPopAdjust');
    const pct = parseInt(popSelect.value, 10);
    document.getElementById('summaryPopLevel').textContent = (pct >= 0 ? '+' : '') + pct + '%' + (pct === 0 ? ' (Stable)' : '');
  }

  backBtn.addEventListener('click', function(){
    if(currentStep > 1){ currentStep -= 1; showStep(currentStep); }
  });
  nextBtn.addEventListener('click', function(){
    if(currentStep < TOTAL_STEPS){
      currentStep += 1;
      showStep(currentStep);
    } else {
      showStep('summary');
    }
  });

  showStep(currentStep);
})();
