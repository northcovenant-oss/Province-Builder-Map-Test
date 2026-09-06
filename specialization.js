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

  // ---- Step 2: military specialization (single choice) ----
  const militaryOptionsEl = document.getElementById('militaryOptions');
  let chosenMilitary = null;
  MILITARY_SPECIALIZATIONS.forEach(function(name){
    const id = 'mil_' + name.replace(/[^a-z0-9]+/gi, '_');
    const label = document.createElement('label');
    label.className = 'spec-option';
    label.setAttribute('for', id);
    label.innerHTML = '<input type="radio" name="militaryChoice" id="' + id + '" value="' + name.replace(/"/g,'&quot;') + '"> ' + name;
    militaryOptionsEl.appendChild(label);
  });
  militaryOptionsEl.addEventListener('change', function(e){
    if(e.target.name !== 'militaryChoice') return;
    chosenMilitary = e.target.value;
    updateNextButtonState();
  });

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
    if(currentStep === 2) enabled = !!chosenMilitary;
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
    document.getElementById('summaryMilitary').textContent = chosenMilitary || '\u2014';
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
