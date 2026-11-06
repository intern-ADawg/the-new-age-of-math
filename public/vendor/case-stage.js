/* ============================================================
   CASE STAGE — the stick-figure story player. Part of the shared
   experience layer (see templates/case_experience.js for the rules
   every file in it follows), loaded first so the other parts can
   use window.MB.stage.

   It turns a case's own story paragraphs into a short animated
   "video": a stick figure acts out each scene (thinking, on the
   phone, at a laptop, pointing at a board...) in a setting picked
   from the words, with the case's own sentences as subtitles and
   a recorded neural voice-over (see the voice-over section below). Nothing is invented: every subtitle is the case's own
   text, word for word, and the original paragraphs stay on the page
   behind a "Read it instead" switch.

   Used for the Overview (and the Twist once revealed) here, and by
   case_notebook.js for the "your numbers" story.
   ============================================================ */
(function () {
  var MB = window.MB = window.MB || {};
  var reduce = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  // ---------------------------------------------------------------- the voice-over
  // Realistic narration, recorded ahead of time: scripts/build_narration.py
  // reads each case's story scenes and records them with Kokoro, an open-source
  // neural voice, into published/narration/ (narration.json maps each scene's
  // exact text to its clip). The page just plays those files -- no key, no
  // account, no live AI call. A line with no clip (the student's own numbers in
  // the your-numbers replay, or a page opened from disk) is read by the most
  // natural voice this device has.
  var manifestP = null, clips = {};
  function narrationBase() {
    return window.MB_NARRATION_BASE || 'narration/';
  }
  function manifest() {
    if (!manifestP) manifestP = fetch(narrationBase() + 'narration.json', { cache: 'no-cache' })
      .then(function (r) { return r.ok ? r.json() : {}; })
      .then(function (m) { return (m && m.lines) || {}; })
      .catch(function () { return {}; });
    return manifestP;
  }
  function clip(text) {
    var t = text.replace(/\s+/g, ' ').trim();
    if (!(t in clips)) clips[t] = manifest().then(function (m) {
      if (!m[t]) return null;
      var a = new Audio(narrationBase() + m[t]);
      a.preload = 'auto';
      return a;
    });
    return clips[t];
  }
  var hasSpeech = 'speechSynthesis' in window && typeof SpeechSynthesisUtterance !== 'undefined';
  var bestVoice = null;
  function pickVoice() {
    if (!hasSpeech) return;
    var best = null, bestScore = -1e3;
    window.speechSynthesis.getVoices().forEach(function (v) {
      if (!/^en([-_]|$)/i.test(v.lang)) return;
      var n = v.name, sc = 0;
      if (/natural|neural|premium|enhanced/i.test(n)) sc += 50;
      if (/google (us|uk) english/i.test(n)) sc += 30;
      if (/\b(ava|zoe|samantha|allison|evan|aria|jenny|guy|emma|libby|ryan|sonia|nathan|noelle)\b/i.test(n)) sc += 20;
      if (/en[-_]us/i.test(v.lang)) sc += 8;
      if (v.localService === false) sc += 4;
      if (/compact|eloquence|novelty|whisper|zarvox|bells|bubbles|albert|cellos|fred|jester|organ|superstar|trinoids|wobble|boing|junior|ralph|kathy|grand|rocko|shelley|\bflo\b|reed|sandy|bad news|good news/i.test(n)) sc -= 60;
      if (sc > bestScore) { bestScore = sc; best = v; }
    });
    bestVoice = best;
  }
  if (hasSpeech) {
    pickVoice();
    if (window.speechSynthesis.addEventListener) window.speechSynthesis.addEventListener('voiceschanged', pickVoice);
  }
  function speakDevice(text, onDone) {
    if (!hasSpeech) return false;
    try { window.speechSynthesis.cancel(); } catch (e) {}
    var u = new SpeechSynthesisUtterance(speakable(text));
    if (bestVoice) { u.voice = bestVoice; u.lang = bestVoice.lang; }
    u.rate = 0.98; u.pitch = 1;
    u.onend = onDone; u.onerror = onDone;
    window.speechSynthesis.speak(u);
    return true;
  }
  function speakable(text) {
    return text.replace(/\s*[\u2014\u2013]\s*/g, ', ').replace(/&/g, ' and ').replace(/\u2026/g, '...').replace(/\s+/g, ' ').trim();
  }

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }
  MB.esc = esc;

  // Per-case progress summary, read back by the student dashboard on the same
  // origin: {skill, notebook, decision, reason, read, total, title, updated}.
  MB.caseKey = (typeof CASE_ID !== 'undefined' && CASE_ID) ? CASE_ID : location.pathname;
  var PKEY = 'mb-progress:' + MB.caseKey;
  MB.prog = function () {
    try { return JSON.parse(localStorage.getItem(PKEY) || '{}') || {}; } catch (e) { return {}; }
  };
  MB.saveProg = function (patch) {
    var p = MB.prog();
    for (var k in patch) p[k] = patch[k];
    var h = document.querySelector('header h1');
    p.title = p.title || (h ? h.textContent.trim() : document.title);
    p.updated = new Date().toISOString();
    try { localStorage.setItem(PKEY, JSON.stringify(p)); } catch (e) {}
    return p;
  };

  // ---------------------------------------------------------------- reading the words
  var SETS = [
    ['night', /\b(night|midnight|dark|stars|evening|moon|3 ?a\.?m)\b/],
    ['water', /\b(ocean|sea|boat|ship|lake|river|harbou?r|port|island|beach|caribbean|fishing|dock|coast)s?\b/],
    ['lab', /\b(hospital|clinic|lab|patient|doctor|nurse|surgery|surgeon|cardiac|cardiology|medical|medicine|vaccine|reactor|bioreactor|pharma|scan)s?\b/],
    ['field', /\b(field|stadium|court|game|season|coach|player|match|park|farm|camp|trail|garden|playoff|baseball|football|soccer|archery|track|range|orchard|ranch)s?\b/],
    ['city', /\b(street|plaza|city|downtown|outside|outdoor|road|traffic|airport|runway|site|sidewalk|bridge|town)s?\b/],
    ['office', /\b(office|desk|conference|room|meeting|laptop|spreadsheet|kitchen|store|shop|cafe|café|classroom)s?\b/]
  ];
  var POSES = [
    ['phone', /\b(phone|calls?|called|calling|texts?|texted|buzz\w*|rings?|voicemail)\b/],
    ['type', /\b(laptop|spreadsheets?|computer|screen|typ\w+|emails?|portal|keyboard|inbox|tablet)\b/],
    ['cheer', /\b(win|wins|won|celebrat\w*|cheer\w*|thrill\w*|excit\w*|success\w*|hooray|proud)\b/],
    ['worried', /\b(worr\w*|nervous|panic\w*|afraid|stress\w*|deadline|closes|late|risk\w*|lose|lost|problem|fail\w*|can.t|isn.t sure|scared|urgent|test)\b/],
    ['walk', /\b(walk\w*|pac(e|es|ing)|heads?|arriv\w*|drives?|drove|runs?|ran|steps?|hurr\w*|rush\w*)\b/],
    ['point', /\b(whiteboard|board|plans?|maps?|charts?|graphs?|diagrams?|shows?|points?|taped|pinned)\b/],
    ['talk', /(\bsaid\b|\bsays\b|\basks?\b|\btold\b|\btells?\b|“|")/],
    ['think', /\b(think\w*|thought|wonder\w*|decid\w*|decision|choos\w*|choice|consider\w*|weigh\w*|question|alone|stares?|look\w*|figure)\b/]
  ];
  var PROPS = [
    ['coins', /(\$|\bmoney\b|\bcosts?\b|\bprices?\b|\bbudget|\bbids?\b|\bdollars?\b|\bpay|\bcash\b|\bprofit|\brevenue|\bfund|\bsalar|\bfee)/],
    ['clock', /\b(clock|deadline|minutes?|hours?|closes|o.clock|at (one|two|three|four|five|six|seven|eight|nine|ten|eleven|noon|midnight)|tonight|tomorrow|seconds?)\b/],
    ['chart', /\b(data|numbers?|survey\w*|stat\w*|percent\w*|graph\w*|rates?|scores?|results?)\b/],
    ['box', /\b(box\w*|orders?|shipment\w*|deliver\w*|crates?|inventory|suppl\w*|trucks?|cargo|warehouse|packages?)\b/]
  ];
  var OTHER = /\b(boss|coach|manager|owner|partner|client|customer|friend|mom|dad|mother|father|sister|brother|teammate|colleague|rival|doctor|nurse|team|commission|committee|parent|neighbou?r|teacher|someone|chef|captain|director|investor|ceo|founder|pilot|officer)\b|“/;

  function pick(list, text, fallback) {
    for (var i = 0; i < list.length; i++) if (list[i][1].test(text)) return list[i][0];
    return fallback;
  }
  function baseSet(text) {
    var best = 'office', bestN = 0;
    SETS.forEach(function (s) {
      var re = new RegExp(s[1].source, 'g');
      var n = (text.match(re) || []).length;
      if (n > bestN) { best = s[0]; bestN = n; }
    });
    return best;
  }

  // Sentences, grouped into scenes of readable length. Splits on . ! ? and
  // keeps closing quotes with their sentence.
  function sentences(text) {
    var t = text.replace(/\s+/g, ' ').trim();
    if (!t) return [];
    var out = t.match(/[^.!?…]+(?:[.!?…]+[”"’')\]]*|$)/g) || [t];
    return out.map(function (s) { return s.trim(); }).filter(Boolean);
  }
  function words(s) { return s.split(/\s+/).filter(Boolean).length; }

  MB.scenesFromParagraphs = function (paras) {
    var all = paras.join(' ');
    var base = baseSet(all.toLowerCase());
    var scenes = [];
    paras.forEach(function (p) {
      var buf = '';
      sentences(p).forEach(function (s) {
        if (buf && words(buf + ' ' + s) > 34) { scenes.push(buf); buf = s; }
        else buf = buf ? buf + ' ' + s : s;
      });
      if (buf) scenes.push(buf);
    });
    return scenes.map(function (text, i) {
      var low = text.toLowerCase();
      var pose = pick(POSES, low, i === 0 ? 'think' : 'idle');
      var props = [];
      if (pose === 'type') props.push('laptop');
      if (pose === 'point') props.push('board');
      PROPS.forEach(function (p) { if (props.length < 2 && p[1].test(low)) props.push(p[0]); });
      var set = pick(SETS, low, base);
      if (set === 'office' && base !== 'office' && !SETS[5][1].test(low)) set = base;
      var other = OTHER.test(low) && pose !== 'type';
      return {
        text: text, pose: pose, props: props, set: set, other: other,
        bubble: /[“"]/.test(text) ? (other ? 'other' : 'main') : null
      };
    });
  };

  // ---------------------------------------------------------------- drawing
  // A figure is nested <g>s: each joint is a translated <g> holding a
  // CSS-rotated <g>, so a pose is nothing but a class on the figure.
  function limb(cls, len, foreLen, hand) {
    return '<g class="mb-' + cls + '"><line x1="0" y1="0" x2="0" y2="' + len + '"/>' +
      '<g transform="translate(0,' + len + ')"><g class="mb-' + cls + '-2"><line x1="0" y1="0" x2="0" y2="' + foreLen + '"/>' +
      (hand || '') + '</g></g></g>';
  }
  function figure(id, look) {
    var hair = {
      tuft: '<path class="mb-hair" d="M-14,108 Q-6,92 4,100 Q10,92 15,106"/>',
      cap: '<path class="mb-cap" d="M-16,112 Q0,90 16,112 Z"/><line class="mb-cap" x1="10" y1="111" x2="27" y2="111"/>',
      bun: '<circle class="mb-hairfill" cx="-2" cy="98" r="7"/><path class="mb-hair" d="M-15,112 Q0,96 15,112"/>',
      pony: '<path class="mb-hair" d="M-15,112 Q0,96 15,112 Q22,118 20,132"/>',
      glasses: '<circle class="mb-glass" cx="-6" cy="117" r="5"/><circle class="mb-glass" cx="8" cy="117" r="5"/><line class="mb-glass" x1="-1" y1="117" x2="3" y2="117"/>'
    }[look] || '';
    var phone = '<rect class="mb-phone" x="-4" y="16" width="8" height="13" rx="2"/>';
    return '<g class="mb-fig" id="' + id + '"><g class="mb-bob">' +
      '<g transform="translate(0,190)">' + limb('ll', 30, 28, '<line class="mb-foot" x1="0" y1="28" x2="7" y2="28"/>') + '</g>' +
      '<g transform="translate(0,190)">' + limb('lr', 30, 28, '<line class="mb-foot" x1="0" y1="28" x2="7" y2="28"/>') + '</g>' +
      '<line class="mb-torso" x1="0" y1="134" x2="0" y2="190"/>' +
      '<g transform="translate(0,146)">' + limb('al', 24, 22, '<circle class="mb-hand" cx="0" cy="22" r="3.2"/>') + '</g>' +
      '<g transform="translate(0,146)">' + limb('ar', 24, 22, '<circle class="mb-hand" cx="0" cy="22" r="3.2"/>' + phone) + '</g>' +
      '<circle class="mb-head" cx="0" cy="118" r="16"/>' + hair +
      '<g class="mb-face"><circle class="mb-eye" cx="-5" cy="116" r="1.8"/><circle class="mb-eye" cx="6" cy="116" r="1.8"/>' +
      '<path class="mb-mouth mb-smile" d="M-5,124 Q1,129 7,124"/><path class="mb-mouth mb-frown" d="M-5,127 Q1,122 7,127"/>' +
      '<path class="mb-mouth mb-o" d="M0,124 m-2.5,0 a2.5,2.5 0 1,0 5,0 a2.5,2.5 0 1,0 -5,0"/></g>' +
      '</g></g>';
  }
  function setting() {
    var bldg = '<g class="mb-skyline"><rect x="20" y="130" width="60" height="120"/><rect x="88" y="100" width="44" height="150"/>' +
      '<rect x="470" y="120" width="54" height="130"/><rect x="530" y="90" width="40" height="160"/><rect x="578" y="140" width="50" height="110"/></g>';
    var wins = '<g class="mb-lit"><rect x="30" y="145" width="8" height="10"/><rect x="58" y="175" width="8" height="10"/><rect x="98" y="120" width="8" height="10"/>' +
      '<rect x="114" y="160" width="8" height="10"/><rect x="482" y="140" width="8" height="10"/><rect x="540" y="110" width="8" height="10"/><rect x="590" y="160" width="8" height="10"/></g>';
    return '' +
      '<g class="mb-set mb-set-office"><rect class="mb-wall" x="0" y="0" width="640" height="250"/>' +
        '<rect class="mb-window" x="60" y="40" width="120" height="90" rx="6"/><line class="mb-pane" x1="120" y1="40" x2="120" y2="130"/>' +
        '<line class="mb-pane" x1="60" y1="85" x2="180" y2="85"/><rect class="mb-floor" x="0" y="250" width="640" height="50"/></g>' +
      '<g class="mb-set mb-set-city"><rect class="mb-sky" x="0" y="0" width="640" height="250"/><circle class="mb-sun" cx="560" cy="58" r="26"/>' +
        '<g class="mb-cloud"><ellipse cx="150" cy="60" rx="38" ry="13"/><ellipse cx="176" cy="52" rx="24" ry="12"/></g>' + bldg +
        '<rect class="mb-street" x="0" y="250" width="640" height="50"/></g>' +
      '<g class="mb-set mb-set-field"><rect class="mb-sky" x="0" y="0" width="640" height="250"/><circle class="mb-sun" cx="90" cy="60" r="24"/>' +
        '<g class="mb-cloud"><ellipse cx="420" cy="54" rx="40" ry="13"/><ellipse cx="448" cy="46" rx="24" ry="12"/></g>' +
        '<g class="mb-tree"><rect x="540" y="180" width="10" height="70"/><circle cx="545" cy="168" r="30"/></g>' +
        '<g class="mb-tree"><rect x="40" y="196" width="8" height="54"/><circle cx="44" cy="186" r="22"/></g>' +
        '<rect class="mb-grass" x="0" y="250" width="640" height="50"/></g>' +
      '<g class="mb-set mb-set-night"><rect class="mb-nightsky" x="0" y="0" width="640" height="250"/><circle class="mb-moon" cx="540" cy="56" r="20"/>' +
        '<g class="mb-stars"><circle cx="80" cy="40" r="1.6"/><circle cx="200" cy="70" r="1.3"/><circle cx="320" cy="30" r="1.8"/><circle cx="420" cy="80" r="1.2"/><circle cx="610" cy="110" r="1.5"/></g>' +
        bldg + wins + '<rect class="mb-street" x="0" y="250" width="640" height="50"/></g>' +
      '<g class="mb-set mb-set-water"><rect class="mb-sky" x="0" y="0" width="640" height="220"/><circle class="mb-sun" cx="520" cy="60" r="24"/>' +
        '<rect class="mb-sea" x="0" y="200" width="640" height="100"/><path class="mb-wave" d="M0,214 q20,-8 40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0 t40,0"/>' +
        '<g class="mb-boat"><path d="M470,206 L590,206 L572,228 L488,228 Z"/><line x1="530" y1="206" x2="530" y2="150"/><path d="M532,152 L532,200 L568,200 Z"/></g>' +
        '<rect class="mb-dock" x="0" y="250" width="640" height="50"/></g>' +
      '<g class="mb-set mb-set-lab"><rect class="mb-wall mb-wall-lab" x="0" y="0" width="640" height="250"/>' +
        '<g class="mb-cross"><rect x="80" y="50" width="56" height="56" rx="10"/><rect x="102" y="60" width="12" height="36"/><rect x="90" y="72" width="36" height="12"/></g>' +
        '<g class="mb-shelf"><rect x="470" y="70" width="140" height="8"/><rect x="480" y="44" width="14" height="26" rx="3"/><rect x="504" y="50" width="12" height="20" rx="3"/><rect x="540" y="40" width="16" height="30" rx="3"/></g>' +
        '<rect class="mb-floor" x="0" y="250" width="640" height="50"/></g>';
  }
  function props() {
    return '<g class="mb-prop mb-prop-board"><rect class="mb-boardface" x="404" y="58" width="196" height="128" rx="6"/>' +
        '<line class="mb-boardleg" x1="436" y1="186" x2="426" y2="250"/><line class="mb-boardleg" x1="568" y1="186" x2="578" y2="250"/>' +
        '<g class="mb-scribble"><path d="M424,86 h120"/><path d="M424,108 h150"/><path d="M424,130 h96"/><path d="M424,152 h132"/></g>' +
        '<text class="mb-boardtext" x="420" y="84"></text></g>' +
      '<g class="mb-prop mb-prop-laptop"><rect class="mb-desk" x="266" y="200" width="160" height="10" rx="3"/><line class="mb-deskleg" x1="278" y1="210" x2="278" y2="250"/>' +
        '<line class="mb-deskleg" x1="414" y1="210" x2="414" y2="250"/><path class="mb-laptopscreen" d="M300,200 L314,160 L374,160 L362,200 Z"/>' +
        '<rect class="mb-laptopbase" x="288" y="197" width="84" height="5" rx="2"/><g class="mb-cells"><path d="M318,170 h46 M316,178 h46 M314,186 h46"/></g></g>' +
      '<g class="mb-prop mb-prop-coins"><g class="mb-coinstack"><ellipse cx="520" cy="244" rx="18" ry="6"/><ellipse cx="520" cy="236" rx="18" ry="6"/><ellipse cx="520" cy="228" rx="18" ry="6"/>' +
        '<ellipse cx="556" cy="244" rx="18" ry="6"/><ellipse cx="556" cy="236" rx="18" ry="6"/></g><text class="mb-dollar" x="513" y="210">$</text></g>' +
      '<g class="mb-prop mb-prop-clock"><circle class="mb-clockface" cx="330" cy="62" r="24"/><line class="mb-hourhand" x1="330" y1="62" x2="330" y2="48"/>' +
        '<line class="mb-minhand" x1="330" y1="62" x2="344" y2="62"/></g>' +
      '<g class="mb-prop mb-prop-chart"><rect class="mb-chartbg" x="470" y="120" width="120" height="90" rx="6"/><rect class="mb-bar mb-bar1" x="488" y="170" width="16" height="30"/>' +
        '<rect class="mb-bar mb-bar2" x="514" y="150" width="16" height="50"/><rect class="mb-bar mb-bar3" x="540" y="135" width="16" height="65"/><rect class="mb-bar mb-bar4" x="566" y="160" width="12" height="40"/>' +
        '<line class="mb-boardleg" x1="530" y1="210" x2="530" y2="250"/></g>' +
      '<g class="mb-prop mb-prop-box"><rect class="mb-crate" x="470" y="206" width="44" height="44"/><rect class="mb-crate" x="518" y="206" width="44" height="44"/>' +
        '<rect class="mb-crate" x="494" y="162" width="44" height="44"/><path class="mb-crateline" d="M470,228 h44 M518,228 h44 M494,184 h44"/></g>';
  }

  var BUBBLE = '<path d="M0,0 h96 a12,12 0 0 1 12,12 v20 a12,12 0 0 1 -12,12 h-62 l-14,14 l2,-14 h-22 a12,12 0 0 1 -12,-12 v-20 a12,12 0 0 1 12,-12 Z"/><text x="48" y="28">\u2026</text>';
  var LOOKS = ['tuft', 'cap', 'bun', 'pony', 'glasses'];
  function hash(s) { var h = 0; for (var i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0; return Math.abs(h); }

  // ---------------------------------------------------------------- the player
  MB.stage = function (host, scenes, opts) {
    opts = opts || {};
    var seed = hash(opts.seed || location.pathname);
    var look = LOOKS[seed % LOOKS.length], otherLook = LOOKS[(seed + 2) % LOOKS.length];
    var el = document.createElement('div');
    el.className = 'mb-video';
    el.innerHTML =
      '<div class="mb-screen">' +
        '<svg class="mb-svg" viewBox="0 0 640 300" role="img" aria-label="' + esc(opts.label || 'Story animation') + '">' +
          setting() + props() +
          '<g class="mb-actor mb-actor-main" transform="translate(250,2)">' + figure('', look) + '</g>' +
          '<g class="mb-actor mb-actor-other" transform="translate(110,2)">' + figure('', otherLook) + '</g>' +
          '<g class="mb-bubble mb-bubble-main" transform="translate(262,40)">' + BUBBLE + '</g>' +
          '<g class="mb-bubble mb-bubble-other" transform="translate(124,40)">' + BUBBLE + '</g>' +
        '</svg>' +
        '<div class="mb-caption" aria-live="polite"></div>' +
        '<button type="button" class="mb-bigplay"><span class="mb-bigplay-icon">▶</span><span class="mb-bigplay-label"></span></button>' +
      '</div>' +
      '<div class="mb-controls">' +
        '<button type="button" class="mb-ctl mb-play" aria-label="Play">▶</button>' +
        '<button type="button" class="mb-ctl mb-prev" aria-label="Previous scene">⏮</button>' +
        '<button type="button" class="mb-ctl mb-nextscene" aria-label="Next scene">⏭</button>' +
        '<div class="mb-scrub" role="progressbar" aria-label="Story progress"><div class="mb-scrub-fill"></div></div>' +
        '<span class="mb-count"></span>' +
        '<button type="button" class="mb-ctl mb-voice" aria-pressed="true" title="Voice-over on (click to mute)">🔊</button>' +
        '<span class="mb-voicestatus" aria-live="polite"></span>' +
        (opts.textToggle ? '<button type="button" class="mb-ctl mb-textbtn">Read it instead</button>' : '') +
      '</div>';
    host.appendChild(el);

    var svg = el.querySelector('svg');
    var cap = el.querySelector('.mb-caption');
    var fill = el.querySelector('.mb-scrub-fill');
    var count = el.querySelector('.mb-count');
    var playBtn = el.querySelector('.mb-play');
    var big = el.querySelector('.mb-bigplay');
    var voiceBtn = el.querySelector('.mb-voice');
    var voiceStatus = el.querySelector('.mb-voicestatus');
    var current = null;
    var board = svg.querySelector('.mb-boardtext');
    el.querySelector('.mb-bigplay-label').textContent = opts.playLabel || 'Watch the story';
    var i = 0, playing = false, timer = null, voice = true, token = 0;

    function show(n) {
      i = Math.max(0, Math.min(scenes.length - 1, n));
      var s = scenes[i];
      svg.setAttribute('class', 'mb-svg set-' + s.set + ' pose-' + s.pose + (s.other ? ' has-other' : '') +
        (s.bubble ? ' bubble-' + s.bubble : '') + (s.props || []).map(function (p) { return ' prop-' + p; }).join('') +
        (s.board && s.board.length ? ' has-board-text' : ''));
      // restart the scene's entrance animation
      svg.classList.remove('mb-enter'); void svg.getBoundingClientRect(); svg.classList.add('mb-enter');
      while (board.firstChild) board.removeChild(board.firstChild);
      (s.board || []).slice(0, 5).forEach(function (line, k) {
        var t = document.createElementNS('http://www.w3.org/2000/svg', 'tspan');
        t.setAttribute('x', '420'); t.setAttribute('dy', k ? '22' : '0');
        t.textContent = line.length > 26 ? line.slice(0, 25) + '…' : line;
        board.appendChild(t);
      });
      cap.innerHTML = (s.kicker ? '<span class="mb-cap-kicker">' + esc(s.kicker) + '</span>' : '') +
        s.text.split(/\s+/).map(function (w, k) {
          return '<span style="animation-delay:' + (reduce ? 0 : Math.min(k * 45, 1800)) + 'ms">' + esc(w) + '</span>';
        }).join(' ');
      fill.style.width = ((i + 1) / scenes.length * 1e2) + '%';
      count.textContent = (i + 1) + ' / ' + scenes.length;
      if (playing) schedule();
    }
    function duration(s) { return Math.max(3400, words(s.text) * 330 + 1500); }
    function hush() {
      if (current) { try { current.pause(); } catch (e) {} current = null; }
      if (hasSpeech) { try { window.speechSynthesis.cancel(); } catch (e) {} }
    }
    function status(t) { voiceStatus.textContent = t || ''; }
    function schedule() {
      clearTimeout(timer);
      hush();
      var my = ++token, at = i;
      if (!voice) { status(''); timer = setTimeout(advance, duration(scenes[at])); return; }
      function next() { if (my === token && playing) { current = null; timer = setTimeout(advance, 420); } }
      function device() {
        if (my !== token || !playing) return;
        if (!speakDevice(scenes[at].text, next)) timer = setTimeout(advance, duration(scenes[at]));
        // a voice that never reports back must not freeze the story
        else timer = setTimeout(function () { if (my === token && playing) advance(); }, duration(scenes[at]) + 8000);
      }
      clip(scenes[at].text).then(function (audio) {
        if (my !== token || !playing) return;
        if (!audio) return device();
        current = audio;
        audio.addEventListener('ended', next, { once: true });
        audio.addEventListener('error', function () { if (current === audio) { current = null; device(); } }, { once: true });
        var pr = audio.play();
        if (pr && pr.catch) pr.catch(function () { if (current === audio) { current = null; device(); } });
        if (scenes[at + 1]) clip(scenes[at + 1].text);
      });
    }
    function advance() {
      if (i < scenes.length - 1) show(i + 1);
      else { stop(); el.classList.add('mb-ended'); if (opts.onEnd) opts.onEnd(); }
    }
    function play() {
      if (el.classList.contains('mb-ended')) { el.classList.remove('mb-ended'); i = 0; }
      playing = true; el.classList.add('mb-playing'); el.classList.add('mb-started');
      playBtn.textContent = '⏸'; playBtn.setAttribute('aria-label', 'Pause');
      show(i);
    }
    function stop() {
      playing = false; clearTimeout(timer); token++;
      hush(); status('');
      el.classList.remove('mb-playing');
      playBtn.textContent = '▶'; playBtn.setAttribute('aria-label', 'Play');
    }
    big.addEventListener('click', play);
    playBtn.addEventListener('click', function () { playing ? stop() : play(); });
    el.querySelector('.mb-prev').addEventListener('click', function () { el.classList.add('mb-started'); el.classList.remove('mb-ended'); show(i - 1); });
    el.querySelector('.mb-nextscene').addEventListener('click', function () { el.classList.add('mb-started'); el.classList.remove('mb-ended'); show(i + 1); });
    el.querySelector('.mb-scrub').addEventListener('click', function (e) {
      var r = this.getBoundingClientRect();
      el.classList.add('mb-started');
      show(Math.floor((e.clientX - r.left) / r.width * scenes.length));
    });
    voiceBtn.addEventListener('click', function () {
      voice = !voice;
      voiceBtn.setAttribute('aria-pressed', voice ? 'true' : 'false');
      voiceBtn.title = voice ? 'Voice-over on (click to mute)' : 'Voice-over off (click to turn on)';
      voiceBtn.textContent = voice ? '🔊' : '🔇';
      if (playing) schedule(); else { hush(); status(''); }
    });
    var tb = el.querySelector('.mb-textbtn');
    if (tb && opts.textToggle) tb.addEventListener('click', function () {
      var on = opts.textToggle();
      tb.textContent = on ? 'Hide the text' : 'Read it instead';
    });
    // Pause when scrolled away, so narration never talks over the rest of the page.
    if ('IntersectionObserver' in window) {
      new IntersectionObserver(function (en) {
        en.forEach(function (x) {
          if (!x.isIntersecting && playing) stop();
          if (x.isIntersecting) { manifest(); clip(scenes[0].text); }
        });
      }).observe(el);
    }
    show(0);
    return { el: el, play: play, stop: stop, show: show };
  };

  // ---------------------------------------------------------------- the case's own stories
  function videoize(container, paras, opts) {
    var texts = paras.map(function (p) { return p.textContent.replace(/\s+/g, ' ').trim(); }).filter(Boolean);
    if (!texts.length) return null;
    var wrap = document.createElement('div');
    wrap.className = 'mb-story';
    paras[0].parentNode.insertBefore(wrap, paras[0]);
    paras.forEach(function (p) { p.classList.add('mb-story-text'); });
    container.classList.add('mb-text-hidden');
    var player = MB.stage(wrap, MB.scenesFromParagraphs(texts), {
      seed: (typeof CASE_ID !== 'undefined' ? CASE_ID : location.pathname),
      label: opts.label, playLabel: opts.playLabel,
      textToggle: function () { return !container.classList.toggle('mb-text-hidden'); }
    });
    return player;
  }

  MB.storyVideos = function () {
    var ov = document.getElementById('overview');
    if (ov) {
      var paras = [].slice.call(ov.querySelectorAll(':scope > p'));
      videoize(ov, paras, { label: 'The story, acted out by stick figures', playLabel: 'Watch the story' });
    }
    var tw = document.getElementById('twistNarrative');
    if (tw) {
      var tparas = [].slice.call(tw.querySelectorAll(':scope > p'));
      videoize(tw, tparas, { label: 'The twist, acted out by stick figures', playLabel: 'Watch the twist' });
    }
  };
})();
