(function(){
  const MAX_SELECT = 20;
  const svg = document.getElementById('mapSvg');
  const tooltip = document.getElementById('tooltip');
  const mapFrame = document.getElementById('mapFrame');
  const countNum = document.getElementById('countNum');
  const selectedList = document.getElementById('selectedList');
  const emptyState = document.getElementById('emptyState');
  const limitMsg = document.getElementById('limitMsg');
  const clearBtn = document.getElementById('clearBtn');
  const generateBtn = document.getElementById('generateBtn');

  const NS = 'http://www.w3.org/2000/svg';

  // ---- Layers ----
  const NEUTRAL_FILL = '#c9b98c';
  const LAYERS = [
    { id: 'provinces', label: 'Provinces', type: 'neutral' },
    { id: 'economic',  label: 'Economic Output', type: 'data' },
    { id: 'climate',   label: 'Climate', type: 'climate' },
    { id: 'terrain',   label: 'Terrain', type: 'placeholder' }
  ];
  let activeLayer = LAYERS[0];

  // hatch pattern def for placeholder layers
  const defs = document.createElementNS(NS, 'defs');
  const pattern = document.createElementNS(NS, 'pattern');
  pattern.setAttribute('id', 'noDataHatch');
  pattern.setAttribute('width', '6');
  pattern.setAttribute('height', '6');
  pattern.setAttribute('patternTransform', 'rotate(45)');
  pattern.setAttribute('patternUnits', 'userSpaceOnUse');
  const hatchBg = document.createElementNS(NS, 'rect');
  hatchBg.setAttribute('width','6'); hatchBg.setAttribute('height','6');
  hatchBg.setAttribute('fill', '#cabf9e');
  const hatchLine = document.createElementNS(NS, 'line');
  hatchLine.setAttribute('x1','0'); hatchLine.setAttribute('y1','0');
  hatchLine.setAttribute('x2','0'); hatchLine.setAttribute('y2','6');
  hatchLine.setAttribute('stroke', '#a99a6d');
  hatchLine.setAttribute('stroke-width', '2');
  pattern.appendChild(hatchBg);
  pattern.appendChild(hatchLine);
  defs.appendChild(pattern);
  svg.appendChild(defs);

  const g = document.createElementNS(NS, 'g');
  g.setAttribute('transform', NORTH_TRANSFORM);
  svg.appendChild(g);

  const gSouth = document.createElementNS(NS, 'g');
  if(SOUTH_TRANSFORM){ gSouth.setAttribute('transform', SOUTH_TRANSFORM); }
  svg.appendChild(gSouth);

  function groupFor(p){ return p.continent === 'south' ? gSouth : g; }

  // Extra non-clickable, greyed islands (from raster, not in vector province data)
  const gExtra = document.createElementNS(NS, 'g');
  svg.appendChild(gExtra);
  EXTRA_ISLANDS.forEach(function(isl){
    const el = document.createElementNS(NS, 'path');
    el.setAttribute('d', isl.d);
    el.setAttribute('class', 'extra-island');
    gExtra.appendChild(el);
  });

  // selection order: array of province ids, in click order
  let selected = [];

  // Render provinces (interactive)
  const provinceEls = {};
  PROVINCES.forEach(function(p){
    const el = document.createElementNS(NS, 'path');
    el.setAttribute('d', p.d);
    el.setAttribute('class', 'province');
    el.setAttribute('fill', p.fill);
    el.dataset.id = p.id;
    el.addEventListener('click', function(){ toggleProvince(p.id); });
    el.addEventListener('mousemove', function(e){ showTooltip(e, p); });
    el.addEventListener('mouseleave', hideTooltip);
    groupFor(p).appendChild(el);
    provinceEls[p.id] = el;
  });

  const byId = {};
  PROVINCES.forEach(function(p){ byId[p.id] = p; });

  // ---- Layer tab bar ----
  const layerTabs = document.getElementById('layerTabs');
  const noDataBanner = document.getElementById('noDataBanner');
  LAYERS.forEach(function(layer){
    const btn = document.createElement('button');
    btn.className = 'layer-tab' + (layer.id === activeLayer.id ? ' active' : '');
    btn.textContent = layer.label;
    btn.addEventListener('click', function(){ setLayer(layer); });
    layerTabs.appendChild(btn);
  });

  function setLayer(layer){
    activeLayer = layer;
    Array.from(layerTabs.children).forEach(function(btn, i){
      btn.classList.toggle('active', LAYERS[i].id === layer.id);
    });
    PROVINCES.forEach(function(p){
      const el = provinceEls[p.id];
      let fill;
      if(layer.type === 'data'){ fill = p.fill; }
      else if(layer.type === 'neutral'){ fill = NEUTRAL_FILL; }
      else if(layer.type === 'climate'){
        fill = p.climate ? CLIMATE_COLOR[p.climate.dominant] : '#cabf9e';
      }
      else { fill = 'url(#noDataHatch)'; }
      el.setAttribute('fill', fill);
    });
    noDataBanner.classList.toggle('show', layer.type === 'placeholder');
    if(layer.type === 'placeholder'){
      noDataBanner.textContent = 'No ' + layer.label.toLowerCase() + ' data yet \u2014 this layer is a placeholder. Provinces are still selectable.';
    }
    legend.classList.toggle('show', layer.type === 'data' || layer.type === 'climate');
    legend.innerHTML = '';
    const activeLegendData = layer.type === 'climate' ? CLIMATE_LEGEND : (layer.type === 'data' ? ECON_LEGEND : null);
    if(activeLegendData){ buildLegend(activeLegendData, layer.type); }
    gExtra.style.display = (layer.id === 'provinces') ? '' : 'none';
  }

  // ---- Legends ----
  const legend = document.getElementById('legend');
  const CLIMATE_COLOR = {};
  CLIMATE_LEGEND.forEach(function(item){ CLIMATE_COLOR[item.climate] = item.color; });

  function buildLegend(items, type){
    items.forEach(function(item){
      const key = type === 'climate' ? item.climate : item.econ;
      const row = document.createElement('div');
      row.className = 'legend-row';
      const present = type === 'climate'
        ? PROVINCES.some(function(p){ return p.climate && p.climate.dominant === key; })
        : PROVINCES.some(function(p){ return p.econ === key; });
      row.innerHTML =
        '<span class="legend-swatch" style="background:'+item.color+'"></span>' +
        '<span class="legend-label">'+key+'</span>' +
        (present ? '' : '<span class="legend-none">none yet</span>');
      legend.appendChild(row);
    });
  }

  function showTooltip(e, p){
    const rect = mapFrame.getBoundingClientRect();
    let sub;
    if(activeLayer.id === 'economic'){
      sub = p.econ;
    } else if(activeLayer.id === 'climate'){
      if(p.climate){
        const parts = Object.entries(p.climate.breakdown)
          .sort(function(a,b){ return b[1]-a[1]; })
          .map(function(kv){ return kv[0]+' '+kv[1]+'%'; });
        sub = parts.join(', ');
      } else {
        sub = 'No climate data';
      }
    } else {
      sub = selected.indexOf(p.id) !== -1 ? 'Claimed \u2014 click to release' : 'Click to claim';
    }
    tooltip.innerHTML = p.label + '<div class="sub">' + sub + '</div>';
    tooltip.style.left = (e.clientX - rect.left) + 'px';
    tooltip.style.top = (e.clientY - rect.top) + 'px';
    tooltip.classList.add('show');
  }
  function hideTooltip(){ tooltip.classList.remove('show'); }

  function flashLimit(){
    limitMsg.classList.add('show');
    setTimeout(function(){ limitMsg.classList.remove('show'); }, 1600);
  }

  function toggleProvince(id){
    const idx = selected.indexOf(id);
    if(idx !== -1){
      selected.splice(idx, 1);
    } else {
      if(selected.length >= MAX_SELECT){
        flashLimit();
        return;
      }
      selected.push(id);
    }
    render();
  }

  function removeProvince(id){
    const idx = selected.indexOf(id);
    if(idx !== -1){ selected.splice(idx,1); render(); }
  }

  function render(){
    // update map highlighting
    Object.keys(provinceEls).forEach(function(id){
      provinceEls[id].classList.toggle('selected', selected.indexOf(id) !== -1);
    });

    // seals (order badges) - remove old, redraw
    Array.from(g.querySelectorAll('.seal')).forEach(function(n){ n.remove(); });
    Array.from(gSouth.querySelectorAll('.seal')).forEach(function(n){ n.remove(); });
    selected.forEach(function(id, i){
      const p = byId[id];
      const c = centroid(p.d);
      if(!c) return;
      const seal = document.createElementNS(NS, 'g');
      seal.setAttribute('class', 'seal');
      const r = 5.2;
      const circle = document.createElementNS(NS, 'circle');
      circle.setAttribute('cx', c.x); circle.setAttribute('cy', c.y); circle.setAttribute('r', r);
      const text = document.createElementNS(NS, 'text');
      text.setAttribute('x', c.x); text.setAttribute('y', c.y);
      text.setAttribute('font-size', '6.5');
      text.textContent = (i+1);
      seal.appendChild(circle);
      seal.appendChild(text);
      groupFor(p).appendChild(seal);
    });

    // counter
    countNum.textContent = selected.length;

    // list
    selectedList.innerHTML = '';
    if(selected.length === 0){
      selectedList.appendChild(emptyState);
    } else {
      selected.forEach(function(id, i){
        const p = byId[id];
        const item = document.createElement('div');
        item.className = 'item';
        item.innerHTML =
          '<div class="order">'+(i+1)+'</div>' +
          '<div class="swatch" style="background:'+p.fill+'"></div>' +
          '<div class="name">'+p.label+'</div>' +
          '<button class="remove" title="Release province">\u2715</button>';
        item.querySelector('.remove').addEventListener('click', function(){ removeProvince(id); });
        selectedList.appendChild(item);
      });
    }

    generateBtn.disabled = selected.length === 0;
  }

  clearBtn.addEventListener('click', function(){
    selected = [];
    render();
  });

  generateBtn.addEventListener('click', function(){
    // The actual bio-writing logic lives in landbio.js so it can be edited
    // independently of the map. It receives the full province objects
    // (with id, label, econ, climate, fill, etc.) for everything claimed,
    // in the order they were claimed.
    const claimedProvinces = selected.map(function(id){ return byId[id]; });
    const bioText = window.generateLandBio(claimedProvinces);
    showBioResult(bioText);
  });

  function showBioResult(text){
    // Simple default presentation; swap this out for a nicer modal/panel
    // whenever you like — it just needs the final bio string.
    alert(text);
  }

  // crude centroid approximation from path 'd' — averages all coordinate points
  function centroid(d){
    const nums = d.match(/-?\d*\.?\d+(?:e-?\d+)?/g);
    if(!nums) return null;
    // walk tokens the same way the path is drawn is overkill for a label point;
    // instead take a simple average of all M/L absolute-ish coordinates by
    // reconstructing positions with a lightweight state machine.
    const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e-?\d+)?/g);
    let i=0, cmd=null, cx=0, cy=0, sx=0, sy=0;
    const pts = [];
    function num(){ return parseFloat(tokens[i++]); }
    while(i < tokens.length){
      const t = tokens[i];
      if(/[MmLlHhVvCcSsQqTtAaZz]/.test(t)){ cmd = t; i++; }
      switch(cmd){
        case 'M': cx=num(); cy=num(); sx=cx; sy=cy; pts.push([cx,cy]); cmd='L'; break;
        case 'm': cx+=num(); cy+=num(); sx=cx; sy=cy; pts.push([cx,cy]); cmd='l'; break;
        case 'L': cx=num(); cy=num(); pts.push([cx,cy]); break;
        case 'l': cx+=num(); cy+=num(); pts.push([cx,cy]); break;
        case 'H': cx=num(); pts.push([cx,cy]); break;
        case 'h': cx+=num(); pts.push([cx,cy]); break;
        case 'V': cy=num(); pts.push([cx,cy]); break;
        case 'v': cy+=num(); pts.push([cx,cy]); break;
        case 'C': num();num();num();num(); cx=num(); cy=num(); pts.push([cx,cy]); break;
        case 'c': num();num();num();num(); cx+=num(); cy+=num(); pts.push([cx,cy]); break;
        case 'S': num();num(); cx=num(); cy=num(); pts.push([cx,cy]); break;
        case 's': num();num(); cx+=num(); cy+=num(); pts.push([cx,cy]); break;
        case 'Q': num();num(); cx=num(); cy=num(); pts.push([cx,cy]); break;
        case 'q': num();num(); cx+=num(); cy+=num(); pts.push([cx,cy]); break;
        case 'T': cx=num(); cy=num(); pts.push([cx,cy]); break;
        case 't': cx+=num(); cy+=num(); pts.push([cx,cy]); break;
        case 'A': num();num();num();num();num(); cx=num(); cy=num(); pts.push([cx,cy]); break;
        case 'a': num();num();num();num();num(); cx+=num(); cy+=num(); pts.push([cx,cy]); break;
        case 'Z': case 'z': cx=sx; cy=sy; break;
        default: i++;
      }
    }
    if(pts.length===0) return null;
    let sxs=0, sys=0;
    pts.forEach(function(pt){ sxs+=pt[0]; sys+=pt[1]; });
    return { x: sxs/pts.length, y: sys/pts.length };
  }

  render();
  setLayer(activeLayer);

  // ---- Zoom & Pan ----
  const BASE_VB = VIEWBOX.split(' ').map(Number); // [x, y, w, h]
  let vb = BASE_VB.slice();
  const MIN_SCALE = 0.35; // how far in (smaller w/h = more zoomed in)
  const MAX_SCALE = 6;    // how far out relative to base

  function applyViewBox(){
    svg.setAttribute('viewBox', vb.join(' '));
  }

  function clampViewBox(){
    // clamp width/height to scale bounds
    const minW = BASE_VB[2] / MAX_SCALE;
    const maxW = BASE_VB[2] * MIN_SCALE_INV();
    vb[2] = Math.max(minW, Math.min(vb[2], BASE_VB[2] * (1/MIN_SCALE)));
    vb[3] = Math.max(BASE_VB[3] / MAX_SCALE, Math.min(vb[3], BASE_VB[3] * (1/MIN_SCALE)));
  }
  function MIN_SCALE_INV(){ return 1/MIN_SCALE; }

  function zoomAt(clientX, clientY, factor){
    const rect = mapFrame.getBoundingClientRect();
    const px = (clientX - rect.left) / rect.width;
    const py = (clientY - rect.top) / rect.height;
    const mx = vb[0] + px * vb[2];
    const my = vb[1] + py * vb[3];

    let newW = vb[2] * factor;
    let newH = vb[3] * factor;
    const maxW = BASE_VB[2] / MIN_SCALE;
    const minW = BASE_VB[2] / MAX_SCALE;
    newW = Math.max(minW, Math.min(newW, maxW));
    newH = Math.max(BASE_VB[3] / MAX_SCALE, Math.min(newH, BASE_VB[3] / MIN_SCALE));

    vb[0] = mx - px * newW;
    vb[1] = my - py * newH;
    vb[2] = newW;
    vb[3] = newH;
    applyViewBox();
    updateZoomCursor();
  }

  function resetView(){
    vb = BASE_VB.slice();
    applyViewBox();
    updateZoomCursor();
  }

  function updateZoomCursor(){
    const zoomedIn = vb[2] < BASE_VB[2] - 0.01;
    svg.classList.toggle('pannable', zoomedIn);
  }

  // wheel zoom, centered on cursor
  mapFrame.addEventListener('wheel', function(e){
    e.preventDefault();
    const factor = e.deltaY > 0 ? 1.15 : 1/1.15;
    zoomAt(e.clientX, e.clientY, factor);
  }, { passive: false });

  // drag to pan
  let dragging = false;
  let dragMoved = false;
  let lastX = 0, lastY = 0;

  svg.addEventListener('mousedown', function(e){
    dragging = true;
    dragMoved = false;
    lastX = e.clientX;
    lastY = e.clientY;
    svg.classList.add('panning');
  });
  window.addEventListener('mousemove', function(e){
    if(!dragging) return;
    const dx = e.clientX - lastX;
    const dy = e.clientY - lastY;
    if(Math.abs(dx) > 2 || Math.abs(dy) > 2) dragMoved = true;
    if(!dragMoved) return;
    const rect = mapFrame.getBoundingClientRect();
    vb[0] -= dx * (vb[2] / rect.width);
    vb[1] -= dy * (vb[3] / rect.height);
    lastX = e.clientX;
    lastY = e.clientY;
    applyViewBox();
    hideTooltip();
  });
  window.addEventListener('mouseup', function(){
    dragging = false;
    svg.classList.remove('panning');
  });

  // suppress click-to-select if the mousedown/up was actually a drag
  svg.addEventListener('click', function(e){
    if(dragMoved){
      e.stopPropagation();
      e.preventDefault();
    }
  }, true);

  // double-click to zoom in on a spot
  svg.addEventListener('dblclick', function(e){
    zoomAt(e.clientX, e.clientY, 0.6);
  });

  document.getElementById('zoomIn').addEventListener('click', function(){
    const rect = mapFrame.getBoundingClientRect();
    zoomAt(rect.left + rect.width/2, rect.top + rect.height/2, 0.75);
  });
  document.getElementById('zoomOut').addEventListener('click', function(){
    const rect = mapFrame.getBoundingClientRect();
    zoomAt(rect.left + rect.width/2, rect.top + rect.height/2, 1/0.75);
  });
  document.getElementById('zoomReset').addEventListener('click', resetView);

  applyViewBox();
})();
