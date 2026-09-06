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

  // ---- Step 1: build the specialization option pool for this economy type ----
  // snapshot.economyType is scraped verbatim from the bio page's "Economy
  // Type" field, which includes a "(NN% combined)" suffix for blended
  // economies - strip that before looking the name up in the map below,
  // whose keys are the bare classification names.
  const economyTypeBase = (snapshot.economyType || '').replace(/\s*\([^)]*\)\s*$/, '').trim();
  const poolNames = SPECIALIZATION_ECONOMY_MAP[economyTypeBase] || SPECIALIZATION_ECONOMY_MAP['Diversified Economy'];
  const specOptionsEl = document.getElementById('specOptions');
  const chosenSpecs = new Set();

  poolNames.forEach(function(poolName){
    const groupLabel = document.createElement('div');
    groupLabel.className = 'spec-group-label';
    groupLabel.textContent = poolName;
    specOptionsEl.appendChild(groupLabel);

    (SPECIALIZATION_POOLS[poolName] || []).forEach(function(name){
      const id = 'spec_' + name.replace(/[^a-z0-9]+/gi, '_');
      const label = document.createElement('label');
      label.className = 'spec-option';
      label.setAttribute('for', id);
      label.innerHTML = '<input type="checkbox" id="' + id + '" value="' + name.replace(/"/g,'&quot;') + '"> ' + name;
      specOptionsEl.appendChild(label);
    });
  });

  const specCountEl = document.getElementById('specCount');
  specOptionsEl.addEventListener('change', function(e){
    if(e.target.type !== 'checkbox') return;
    // Explicit guard, not just relying on disabling other checkboxes once
    // at the limit (which only blocks a real mouse/keyboard click, not
    // programmatic checking) - if this toggle would push past 5, undo it.
    if(e.target.checked && chosenSpecs.size >= SPECIALIZATION_COUNT){
      e.target.checked = false;
      return;
    }
    if(e.target.checked) chosenSpecs.add(e.target.value);
    else chosenSpecs.delete(e.target.value);

    // Cap at 5 - once 5 are chosen, grey out (but don't uncheck) the rest.
    const atLimit = chosenSpecs.size >= SPECIALIZATION_COUNT;
    specOptionsEl.querySelectorAll('input[type="checkbox"]').forEach(function(cb){
      if(!cb.checked) cb.disabled = atLimit;
      cb.closest('.spec-option').classList.toggle('disabled', !cb.checked && atLimit);
    });

    specCountEl.textContent = chosenSpecs.size;
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
    if(chosenSpecs.size === 0){ el.textContent = ''; return; }
    el.textContent = 'Your chosen specializations: ' + Array.from(chosenSpecs).join(', ');
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
    if(currentStep === 1) enabled = chosenSpecs.size === SPECIALIZATION_COUNT;
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
    document.getElementById('summarySpecs').textContent = Array.from(chosenSpecs).join(', ') || '\u2014';
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
