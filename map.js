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
  function getNeutralFill(){
    // Reads the current theme's neutral land color live, so switching
    // themes updates the map immediately without map.js needing to know
    // anything about themes itself. Read off <body> since that's where
    // theme.js applies the theme-* class.
    return getComputedStyle(document.body).getPropertyValue('--neutral-fill').trim() || '#c9b98c';
  }
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

  const byLabel = {};
  PROVINCES.forEach(function(p){ byLabel[p.label.toUpperCase()] = p; });

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
      else if(layer.type === 'neutral'){ fill = getNeutralFill(); }
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

  // ---- Load a Claim Code ----
  // Lets someone paste a previously-copied list of province labels
  // (e.g. "S9, S12, N4") and instantly restore that selection.
  const claimCodeInput = document.getElementById('claimCodeInput');
  const claimCodeMsg = document.getElementById('claimCodeMsg');
  const loadClaimBtn = document.getElementById('loadClaimBtn');

  function loadClaimCode(raw){
    const tokens = raw.split(/[,\s]+/).map(function(t){ return t.trim().toUpperCase(); }).filter(Boolean);
    if(tokens.length === 0){
      setClaimMsg('Paste a claim code first.', true);
      return;
    }
    const found = [];
    const unknown = [];
    const seen = {};
    tokens.forEach(function(tok){
      const p = byLabel[tok];
      if(!p){ unknown.push(tok); return; }
      if(seen[p.id]) return; // skip duplicates
      seen[p.id] = true;
      found.push(p.id);
    });

    const truncated = found.length > MAX_SELECT;
    selected = found.slice(0, MAX_SELECT);
    render();

    const parts = [];
    parts.push(selected.length + ' province' + (selected.length === 1 ? '' : 's') + ' loaded.');
    if(truncated) parts.push('Only the first ' + MAX_SELECT + ' were used.');
    if(unknown.length) parts.push('Not found: ' + unknown.join(', ') + '.');
    setClaimMsg(parts.join(' '), unknown.length > 0);
  }

  function setClaimMsg(text, isWarning){
    claimCodeMsg.textContent = text;
    claimCodeMsg.classList.toggle('warning', !!isWarning);
    claimCodeMsg.classList.add('show');
  }

  loadClaimBtn.addEventListener('click', function(){
    loadClaimCode(claimCodeInput.value);
  });
  claimCodeInput.addEventListener('keydown', function(e){
    if(e.key === 'Enter'){ loadClaimCode(claimCodeInput.value); }
  });

  // Wraps buildClaimSnapshotSVG into the HTML block placed near the top of
  // the bio page — one snapshot per continent the claim touches, side by
  // side if it spans both.
  function buildClaimMapHtml(provinces){
    if(!provinces.length) return '';
    const byContinent = { north: [], south: [] };
    provinces.forEach(function(p){
      (byContinent[p.continent] || byContinent.north).push(p.id);
    });

    const shots = [];
    ['north','south'].forEach(function(continentName){
      const ids = byContinent[continentName];
      if(!ids || !ids.length) return;
      const svg = buildClaimSnapshotSVG(continentName, ids);
      if(!svg) return;
      const label = continentName === 'north' ? 'Northern Continent' : 'Southern Continent';
      shots.push('<div class="map-shot">' + svg + '<div class="map-shot-label">' + label + '</div></div>');
    });

    if(!shots.length) return '';
    return '    <div class="claim-map"><div class="map-row">' + shots.join('') + '</div></div>\n';
  }

  generateBtn.addEventListener('click', function(){
    // The actual bio-writing logic lives in landbio.js so it can be edited
    // independently of the map. It receives the full province objects
    // (with id, label, econ, climate, fill, etc.) for everything claimed,
    // in the order they were claimed.
    const claimedProvinces = selected.map(function(id){ return byId[id]; });

    // Open the tab synchronously, in direct response to the click, so
    // browsers don't treat it as a popup and block it. We fill it in
    // once the bio text is ready (works whether generateLandBio returns
    // a plain string or a Promise<string>).
    const bioWindow = window.open('', '_blank');
    if (bioWindow) {
      writeBioPage(bioWindow, claimedProvinces, null, true);
    }

    Promise.resolve(window.generateLandBio(claimedProvinces)).then(function(result){
      if (bioWindow && !bioWindow.closed) {
        writeBioPage(bioWindow, claimedProvinces, result, false);
      } else {
        // Pop-up was blocked or the tab got closed before generation finished.
        alert('Your browser blocked the new tab. Here\'s the bio instead:\n\n' + result.text);
      }
    }).catch(function(err){
      if (bioWindow && !bioWindow.closed) {
        writeBioPage(bioWindow, claimedProvinces, { text: 'Something went wrong generating this bio: ' + err.message, bbcCode: '' }, false);
      }
    });
  });

  function escapeHtml(str){
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function writeBioPage(targetWindow, provinces, result, loading){
    const themeClass = Array.from(document.body.classList).find(function(c){ return c.indexOf('theme-') === 0; }) || '';
    const provinceList = provinces.map(function(p){ return p.label; }).join(', ');
    const claimCode = provinces.map(function(p){ return p.label; }).join(', ');
    const bbcCode = (result && result.bbcCode) || '';
    const bodyHtml = loading
      ? '<p class="bio-loading">Writing your land bio&hellip;</p>'
      : result.text.split(/\n\n+/).map(function(para){
          return '<p>' + escapeHtml(para).replace(/\n/g, '<br>') + '</p>';
        }).join('\n');

    const mapHtml = loading ? '' : buildClaimMapHtml(provinces);

    const html = '<!DOCTYPE html>\n<html>\n<head>\n<meta charset="UTF-8">\n' +
      '<title>Land Bio' + (provinces.length ? ' \u2014 ' + escapeHtml(provinces[0].label) + (provinces.length > 1 ? ' +' + (provinces.length - 1) : '') : '') + '</title>\n' +
      '<link rel="stylesheet" href="style.css">\n' +
      '<style>\n' +
      '  body.bio-page{ overflow:auto; padding:48px 24px; box-sizing:border-box; background: var(--parchment); }\n' +
      '  .bio-card{ max-width:680px; margin:0 auto; background: var(--panel-bg); border:1px solid var(--line); border-radius:6px; padding:36px 40px; box-shadow:0 8px 28px rgba(0,0,0,0.2); }\n' +
      '  .bio-card h1{ font-family:var(--font-display); color:var(--ink); margin:0 0 4px; font-size:24px; }\n' +
      '  .bio-card .meta{ font-family:var(--font-body); font-size:12.5px; font-style:italic; color:var(--ink-soft); margin-bottom:22px; padding-bottom:16px; border-bottom:1px solid var(--line); }\n' +
      '  .bio-card p{ font-family:var(--font-body); font-size:16px; line-height:1.7; color:var(--ink); margin:0 0 14px; }\n' +
      '  .bio-loading{ font-style:italic; color:var(--ink-soft); }\n' +
      '  .claim-map{ margin-bottom:22px; }\n' +
      '  .claim-map .map-row{ display:flex; gap:12px; flex-wrap:wrap; }\n' +
      '  .claim-map .map-shot{ flex:1 1 260px; min-width:0; background: var(--parchment); border:1px solid var(--line); border-radius:5px; padding:8px; }\n' +
      '  .claim-map .map-shot svg{ width:100%; height:auto; display:block; }\n' +
      '  .claim-map .map-shot-label{ font-family:var(--font-display); font-size:11px; letter-spacing:0.4px; color:var(--ink-soft); text-align:center; margin-top:6px; }\n' +
      '  .bio-actions{ margin-top:24px; display:flex; gap:10px; flex-wrap:wrap; align-items:center; }\n' +
      '  .bio-actions button{ font-family:var(--font-display); font-size:13px; letter-spacing:0.4px; padding:10px 16px; border-radius:4px; border:1px solid var(--ink); cursor:pointer; background:linear-gradient(180deg, var(--gold-bright), var(--gold)); color:var(--ink); }\n' +
      '  .bio-actions button.copied{ background:var(--gold); }\n' +
      '  .claim-code-block{ margin-top:28px; padding-top:18px; border-top:1px solid var(--line); }\n' +
      '  .claim-code-block .cc-title{ font-family:var(--font-display); font-size:12.5px; letter-spacing:0.5px; color:var(--ink-soft); margin-bottom:8px; }\n' +
      '  .claim-code-value{ font-family:var(--font-body); font-size:14px; color:var(--ink); background:rgba(0,0,0,0.04); border:1px solid var(--line); border-radius:4px; padding:10px 12px; word-break:break-word; }\n' +
      '  .copy-btn{ font-family:var(--font-display); font-size:12.5px; letter-spacing:0.4px; padding:8px 14px; border-radius:4px; border:1px solid var(--ink); cursor:pointer; background:var(--panel-bg); color:var(--ink); margin-top:9px; }\n' +
      '  .copy-btn.copied{ background:var(--gold); }\n' +
      '  #bbcSource{ position:absolute; left:-9999px; top:-9999px; }\n' +
      '</style>\n</head>\n' +
      '<body class="bio-page ' + themeClass + '">\n' +
      '  <div class="bio-card">\n' +
      '    <h1>Land Bio</h1>\n' +
      '    <div class="meta">' + escapeHtml(provinceList) + ' &middot; generated ' + escapeHtml(new Date().toLocaleString()) + '</div>\n' +
      mapHtml +
      '    <div class="bio-body">' + bodyHtml + '</div>\n' +
      (loading ? '' : '    <div class="bio-actions"><button id="copyBbcBtn">Copy BBC Code</button></div>\n' +
                       '    <textarea id="bbcSource" readonly>' + escapeHtml(bbcCode) + '</textarea>\n') +
      '    <div class="claim-code-block">\n' +
      '      <div class="cc-title">Claim Code &mdash; paste this into "Load a Claim Code" on the map to recreate this exact selection</div>\n' +
      '      <div class="claim-code-value" id="claimCodeValue">' + escapeHtml(claimCode) + '</div>\n' +
      '      <button class="copy-btn" id="copyClaimBtn">Copy Claim Code</button>\n' +
      '    </div>\n' +
      '  </div>\n' +
      '  <script>\n' +
      '    function bindCopyButton(btnId, getText, label){\n' +
      '      var btn = document.getElementById(btnId);\n' +
      '      if(!btn) return;\n' +
      '      btn.addEventListener("click", function(){\n' +
      '        var text = getText();\n' +
      '        function done(ok){\n' +
      '          btn.textContent = ok ? "Copied!" : "Copy failed \u2014 select the text manually";\n' +
      '          btn.classList.toggle("copied", ok);\n' +
      '          setTimeout(function(){ btn.textContent = label; btn.classList.remove("copied"); }, 1800);\n' +
      '        }\n' +
      '        if(navigator.clipboard && navigator.clipboard.writeText){\n' +
      '          navigator.clipboard.writeText(text).then(function(){ done(true); }, function(){ done(false); });\n' +
      '        } else {\n' +
      '          try {\n' +
      '            var ta = document.createElement("textarea");\n' +
      '            ta.value = text; document.body.appendChild(ta); ta.select();\n' +
      '            document.execCommand("copy"); document.body.removeChild(ta);\n' +
      '            done(true);\n' +
      '          } catch(e){ done(false); }\n' +
      '        }\n' +
      '      });\n' +
      '    }\n' +
      '    bindCopyButton("copyClaimBtn", function(){ return document.getElementById("claimCodeValue").textContent; }, "Copy Claim Code");\n' +
      '    bindCopyButton("copyBbcBtn", function(){ return document.getElementById("bbcSource").value; }, "Copy BBC Code");\n' +
      '  <\/script>\n' +
      '</body>\n</html>';

    targetWindow.document.open();
    targetWindow.document.write(html);
    targetWindow.document.close();
  }

  // crude centroid approximation from path 'd' — averages all coordinate points
  // Shared low-level path-data walker: turns an SVG path 'd' string into
  // a flat list of [x,y] points it passes through. Used both for the
  // claim-seal centroid placement and for computing bounding boxes when
  // building the claim snapshot image on the bio page.
  function getPathPoints(d){
    const tokens = d.match(/[MmLlHhVvCcSsQqTtAaZz]|-?\d*\.?\d+(?:e-?\d+)?/g);
    if(!tokens) return [];
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
    return pts;
  }

  function centroid(d){
    const pts = getPathPoints(d);
    if(pts.length===0) return null;
    let sxs=0, sys=0;
    pts.forEach(function(pt){ sxs+=pt[0]; sys+=pt[1]; });
    return { x: sxs/pts.length, y: sys/pts.length };
  }

  function pathBBox(d){
    const pts = getPathPoints(d);
    if(pts.length===0) return null;
    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    pts.forEach(function(pt){
      if(pt[0]<minX) minX=pt[0];
      if(pt[0]>maxX) maxX=pt[0];
      if(pt[1]<minY) minY=pt[1];
      if(pt[1]>maxY) maxY=pt[1];
    });
    return { minX, minY, maxX, maxY };
  }

  // Bounding box (in shared page coordinates, i.e. after applying that
  // continent's transform) of every province belonging to one continent.
  // Computed once per continent and cached, since it only depends on the
  // static province geometry.
  const continentBBoxCache = {};
  function getContinentBBox(continentName){
    if(continentBBoxCache[continentName]) return continentBBoxCache[continentName];
    const tfStr = continentName === 'south' ? SOUTH_TRANSFORM : NORTH_TRANSFORM;
    const m = tfStr && tfStr.match(/translate\(([-\d.]+),([-\d.]+)\)/);
    const tx = m ? parseFloat(m[1]) : 0;
    const ty = m ? parseFloat(m[2]) : 0;

    let minX=Infinity, minY=Infinity, maxX=-Infinity, maxY=-Infinity;
    PROVINCES.forEach(function(p){
      if(p.continent !== continentName) return;
      const bb = pathBBox(p.d);
      if(!bb) return;
      minX = Math.min(minX, bb.minX+tx);
      minY = Math.min(minY, bb.minY+ty);
      maxX = Math.max(maxX, bb.maxX+tx);
      maxY = Math.max(maxY, bb.maxY+ty);
    });
    const result = { minX, minY, maxX, maxY, tx, ty };
    continentBBoxCache[continentName] = result;
    return result;
  }

  // Builds a small self-contained inline SVG showing one continent, with
  // its claimed provinces highlighted the same way they are on the main
  // map (gold outline). Used to embed a "map of your claim" image on the
  // generated bio page.
  function buildClaimSnapshotSVG(continentName, claimedIds){
    const bb = getContinentBBox(continentName);
    if(!isFinite(bb.minX)) return '';
    const pad = (bb.maxX-bb.minX) * 0.06;
    const x = bb.minX-pad, y = bb.minY-pad;
    const w = (bb.maxX-bb.minX)+pad*2, h = (bb.maxY-bb.minY)+pad*2;

    const claimedSet = {};
    claimedIds.forEach(function(id){ claimedSet[id]=true; });

    let paths = '';
    PROVINCES.forEach(function(p){
      if(p.continent !== continentName) return;
      const isClaimed = !!claimedSet[p.id];
      const fill = isClaimed ? p.fill : '#c9b98c';
      const strokeCls = isClaimed
        ? 'stroke="#e0a83e" stroke-width="1.6"'
        : 'stroke="#2c2417" stroke-width="0.5"';
      paths += `<path d="${p.d}" fill="${fill}" ${strokeCls}/>`;
    });

    return `<svg viewBox="${bb.minX-pad} ${bb.minY-pad} ${w} ${h}" xmlns="http://www.w3.org/2000/svg">` +
      `<g transform="translate(${bb.tx},${bb.ty})">${paths}</g></svg>`;
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

  // Called by theme.js after switching themes, so the currently-visible
  // layer (most importantly the neutral "Provinces" fill) repaints with
  // the new theme's colors right away.
  window.refreshMapTheme = function(){
    setLayer(activeLayer);
  };
})();
