(() => {
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  let catalog = { meta: {}, games: [] };
  let selectedIndex = -1;
  let searchQuery = '';
  let saveTimer = 0;
  let imageLibrary = [];
  let imageSearchQuery = '';
  const previewUrls = new Map();

  const platformAliasKey = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  const canonicalPlatformName = value => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const key = platformAliasKey(raw);
    if (['opendingux', 'od', 'gcwzero', 'gcw0', 'rg350'].includes(key)) return 'OpenDingux';
    if (['dos', 'msdos', 'microsoftdos'].includes(key)) return 'MS-DOS';
    return raw;
  };
  const canonicalPlatformArray = value => {
    const raw = Array.isArray(value) ? value : String(value || '').split(',');
    const seen = new Set();
    return raw
      .map(canonicalPlatformName)
      .filter(Boolean)
      .filter(item => {
        const key = platformAliasKey(item);
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
  };

  const basePlatforms = [
    'OpenDingux',
    'Arcade', 'Windows', 'MS-DOS', 'Linux', 'Macintosh', 'Amiga', 'Atari ST', 'Atari Falcon',
    'Commodore 64', 'Amstrad CPC', 'ZX Spectrum', 'Sinclair QL', 'Oric', 'Exidy Sorcerer',
    'Elektronika BK', 'Excalibur 64', 'PMD-85', 'Lviv PK-01',
    'NEC PC-FX', 'PC Engine', 'PC Engine CD', 'TurboGrafx-16', 'SuperGrafx',
    'NEC PC-6001mkII', 'NEC PC-6601', 'NEC PC-8801', 'PC-98', 'PC-9821',
    'Casio Loopy', 'V.Smile', 'Sega 32X', 'Sega CD', 'Mega Drive', 'Dreamcast', 'Sega NAOMI',
    'Game Gear', 'Master System', 'SG-1000', 'SC-3000', 'Saturn',
    'Nintendo 64', 'GameCube', 'Wii', 'Wii U', 'Nintendo DS', 'Nintendo 3DS',
    'Famicom', 'NES', 'Super Famicom', 'Game Boy Advance', 'Game Boy Color', 'Game Boy',
    'PlayStation 2', 'PlayStation', 'Original Xbox',
    'Atari 2600', 'Atari 5200', 'Pokémon Mini', '3DO', 'MSX', 'ColecoVision',
    'Wonderswan', 'Wonderswan Color', 'Virtual Boy'
  ];

  const baseGenres = [
    'Action', 'Adventure', 'Arcade', 'Endless runner', 'FPS', 'Platformer', 'Puzzle',
    'Racing', 'RPG', 'Shoot’em up', 'Strategy', 'Visual novel'
  ];

  const genreIcons = new Map([
    ['action', '⚔'], ['adventure', '◇'], ['arcade', '▣'], ['endless runner', '→'],
    ['fps', '⌖'], ['platformer', '↥'], ['puzzle', '◆'], ['racing', '⚑'],
    ['rpg', '✦'], ['shoot’em up', '✹'], ['shoot em up', '✹'], ['strategy', '♜'],
    ['visual novel', '▤']
  ]);

  const platformIconRules = [
    [/open\s*dingux|gcw\s*zero|rg[- ]?350/i, 'img/rg350.png'],
    [/arcade/i, 'img/platforms/arcade.png'],
    [/windows|win32|win64|\bwin\b/i, 'img/platforms/win.png'],
    [/ms[- ]?dos|\bdos\b/i, 'img/platforms/dos.png'],
    [/macintosh|\bmac\b|mac\s*os/i, 'img/platforms/mac.png'],
    [/amiga/i, 'img/platforms/amiga.png'],
    [/atari\s*falcon/i, 'img/platforms/atarifalcon.png'],
    [/atari\s*st/i, 'img/platforms/atarist.png'],
    [/commodore\s*64|\bc64\b/i, 'img/platforms/c64.png'],
    [/amstrad\s*cpc|\bcpc\b/i, 'img/platforms/cpc.png'],
    [/zx\s*spectrum|zxspectrum|spectrum/i, 'img/platforms/zxspectrum.png'],
    [/sinclair\s*ql/i, 'img/platforms/sinclairql.png'],
    [/oric/i, 'img/platforms/oric.png'],
    [/exidy\s*sorcerer|exidy/i, 'img/platforms/exidy.png'],
    [/elektronika\s*bk|\bbk[- ]?001[01]?\b|\bbk\b/i, 'img/platforms/bk.png'],
    [/excalibur\s*64/i, 'img/platforms/excalibur64.png'],
    [/\bpc[- ]?fx\b/i, 'img/platforms/pcfx.png'],
    [/super\s*grafx/i, 'img/platforms/supergrafx.png'],
    [/pc\s*engine\s*cd|pce\s*cd|turbo\s*grafx\s*cd/i, 'img/platforms/pcecd.png'],
    [/turbo\s*grafx[- ]?16|turbografx[- ]?16|tg[- ]?16/i, 'img/platforms/turbografx16.png'],
    [/pc\s*engine|\bpce\b/i, 'img/platforms/pce.png'],
    [/pc[- ]?6001\s*(?:mk|mkii|mark\s*ii|Ⅱ|ii)?/i, 'img/platforms/pc6001mkii.png'],
    [/pc[- ]?6601/i, 'img/platforms/pc6601.png'],
    [/pc[- ]?8801|pc[- ]?88/i, 'img/platforms/pc8801.png'],
    [/pc[- ]?9821/i, 'img/platforms/pc9821.png'],
    [/pc[- ]?98/i, 'img/platforms/pc9801.png'],
    [/casio\s+loopy|\bloopy\b/i, 'img/platforms/casloopy.png'],
    [/v[.\s-]*smile/i, 'img/platforms/vsmile.png'],
    [/32x/i, 'img/platforms/32x.png'],
    [/dreamcast|sega\s*naomi|\bnaomi\b/i, 'img/platforms/dc.png'],
    [/nintendo\s*64|\bn64\b/i, 'img/platforms/n64.png'],
    [/game\s*boy\s*advance|\bgba\b/i, 'img/platforms/gba.png'],
    [/game\s*boy\s*color|\bgbc\b/i, 'img/platforms/gbc.png'],
    [/game\s*boy|\bgb\b/i, 'img/platforms/gb.png'],
    [/playstation\s*2|\bps2\b/i, 'img/platforms/ps2.png'],
    [/playstation\s*1|playstation|\bps1\b|\bpsx\b/i, 'img/platforms/ps1.png'],
    [/game\s*cube|\bgc\b/i, 'img/platforms/gc.png'],
    [/original\s*xbox|og\s*xbox|\bxbox\b/i, 'img/platforms/xbox.png'],
    [/atari\s*5200|\ba5200\b/i, 'img/platforms/a5200.png'],
    [/atari\s*2600|\ba2600\b/i, 'img/platforms/a2600.png'],
    [/pok[eé]mon\s*mini|poke\s*mini/i, 'img/platforms/pokemini.png'],
    [/\b3do\b/i, 'img/platforms/3do.png'],
    [/mega\s*drive|megadrive|genesis/i, 'img/platforms/md.png'],
    [/sega\s*cd|mega\s*cd|\bmcd\b/i, 'img/platforms/mcd.png'],
    [/game\s*gear|\bgg\b/i, 'img/platforms/gg.png'],
    [/master\s*system|\bsms\b/i, 'img/platforms/sms.png'],
    [/sg[- ]?1000/i, 'img/platforms/sg1000.png'],
    [/sc[- ]?3000/i, 'img/platforms/sc3000.png'],
    [/msx/i, 'img/platforms/msx.png'],
    [/coleco/i, 'img/platforms/coleco.png'],
    [/saturn/i, 'img/platforms/segasaturn.png'],
    [/famicom/i, 'img/platforms/famicom.png'],
    [/super\s*famicom|\bsfc\b|snes/i, 'img/platforms/sfc.png'],
    [/\bnes\b/i, 'img/platforms/nes.png'],
    [/wonderswan\s*color/i, 'img/platforms/wonderswancolor.png'],
    [/wonderswan/i, 'img/platforms/wonderswan.png'],
    [/virtual\s*boy/i, 'img/platforms/vb.png'],
    [/3ds/i, 'img/platforms/3ds.png'],
    [/nds|nintendo\s*ds/i, 'img/platforms/nds.png'],
    [/wii\s*u/i, 'img/platforms/WiiU.png'],
    [/\bwii\b/i, 'img/platforms/wii.png']
  ];
  const getPlatformIcon = platform => {
    const match = platformIconRules.find(([pattern]) => pattern.test(String(platform || '')));
    return match ? match[1] : '';
  };

  const emptyGame = () => ({
    id: `new-game-${Date.now()}`,
    slug: '',
    title: 'New game',
    originalTitle: '',
    collection: 'retro',
    category: 'Original',
    genre: '',
    language: 'English',
    languages: ['English'],
    platforms: [],
    summary: '',
    icon: '',
    hero: '',
    screenshots: [],
    videos: [],
    links: [],
    kind: 'original',
    kindLabel: 'Original game',
    collectionLabel: 'Games',
    section: '',
    portType: '',
    releaseDate: '',
    mature: false,
    contentWarning: ''
  });

  const escapeHTML = value => String(value ?? '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  const normalize = value => String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const slugify = value => normalize(value)
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'game';

  const splitList = value => String(value || '')
    .split(/[,\n]/)
    .map(item => item.trim())
    .filter(Boolean);

  const joinList = value => Array.isArray(value) ? value.join(', ') : String(value || '');

  const uniqueSorted = values => [...new Set(values.map(String).map(item => item.trim()).filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const uniqueId = base => {
    const ids = new Set(catalog.games.map(game => game.id));
    const cleanBase = base || `game-${Date.now()}`;
    let candidate = cleanBase;
    let i = 2;
    while (ids.has(candidate)) candidate = `${cleanBase}-${i++}`;
    return candidate;
  };

  const uniqueIdExcept = (base, exceptIndex) => {
    const ids = new Set(catalog.games.map((game, index) => index === exceptIndex ? '' : game.id).filter(Boolean));
    const cleanBase = base || `game-${Date.now()}`;
    let candidate = cleanBase;
    let i = 2;
    while (ids.has(candidate)) candidate = `${cleanBase}-${i++}`;
    return candidate;
  };

  const syncNewGameIdentity = () => {
    const form = getForm();
    if (!form || selectedIndex < 0 || form.dataset.autoIdentity !== 'true') return;
    const title = form.elements.title?.value || '';
    const base = slugify(title || 'new-game');
    const nextId = uniqueIdExcept(base, selectedIndex);
    if (form.dataset.manualId !== 'true' && form.elements.id) form.elements.id.value = nextId;
    if (form.dataset.manualSlug !== 'true' && form.elements.slug) form.elements.slug.value = nextId;
  };

  const setStatus = (message, state = '') => {
    const status = $('[data-editor-status]');
    if (!status) return;
    status.textContent = message;
    status.classList.toggle('is-ok', state === 'ok');
    status.classList.toggle('is-error', state === 'error');
  };

  const getProjectType = game => {
    if (game.kind === 'original') return 'original';
    if (game.collection === 'opendingux' || game.portType === 'opendingux') return 'opendingux';
    return 'homebrew';
  };

  const projectTypeLabel = type => ({
    original: 'Original',
    homebrew: 'Homebrew port',
    opendingux: 'OpenDingux'
  }[type] || 'Project');

  const normalizeVideos = value => {
    const raw = value || [];
    const array = Array.isArray(raw) ? raw : (typeof raw === 'string' && raw.trim() ? [raw] : (raw && typeof raw === 'object' && raw.url ? [raw] : []));
    return array.map(item => {
      if (typeof item === 'string') return { url: item.trim(), title: '' };
      return {
        title: String(item?.title || '').trim(),
        url: String(item?.url || '').trim()
      };
    }).filter(item => item.url);
  };

  const validateCatalog = payload => {
    if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
      throw new Error('Root JSON must be an object.');
    }
    if (!Array.isArray(payload.games)) {
      throw new Error('Root object must contain a games array.');
    }
    const ids = new Set();
    payload.games.forEach((game, index) => {
      if (!game || typeof game !== 'object' || Array.isArray(game)) {
        throw new Error(`games[${index}] must be an object.`);
      }
      if (!game.id) throw new Error(`games[${index}] is missing an id.`);
      if (ids.has(game.id)) throw new Error(`Duplicate id: ${game.id}`);
      ids.add(game.id);
      if (!game.title) throw new Error(`${game.id} is missing a title.`);
      if (!Array.isArray(game.platforms)) throw new Error(`${game.id} must have a platforms array.`);
      if (!Array.isArray(game.links)) throw new Error(`${game.id} must have a links array.`);
      game.links.forEach((link, linkIndex) => {
        if (!link || typeof link !== 'object' || Array.isArray(link)) {
          throw new Error(`${game.id} link ${linkIndex + 1} must be an object.`);
        }
        if (!link.url) throw new Error(`${game.id} link ${linkIndex + 1} is missing a URL.`);
      });
    });
    return payload;
  };

  const sanitizeGame = game => {
    const next = { ...game };
    next.id = String(next.id || '').trim();
    next.slug = String(next.slug || slugify(next.title || next.id)).trim();
    next.title = String(next.title || '').trim();
    next.originalTitle = String(next.originalTitle || '').trim();
    next.collection = String(next.collection || 'retro').trim();
    next.kind = next.kind === 'original' ? 'original' : 'port';
    next.portType = next.kind === 'original' ? '' : String(next.portType || (next.collection === 'opendingux' ? 'opendingux' : 'homebrew')).trim();
    next.category = next.kind === 'original' ? 'Original' : 'Port';
    next.kindLabel = next.kind === 'original' ? 'Original game' : 'Port';
    next.collectionLabel = next.collection === 'opendingux' ? 'OpenDingux' : 'Games';
    next.section = next.portType === 'opendingux' ? 'OpenDingux' : next.kind === 'port' ? 'Homebrew ports' : 'Original games';
    next.genre = String(next.genre || '').trim();
    next.releaseDate = String(next.releaseDate || '').trim();
    next.languages = Array.isArray(next.languages) ? next.languages.map(String).map(item => item.trim()).filter(Boolean) : splitList(next.languages || next.language);
    if (!next.languages.length) next.languages = ['English'];
    next.language = next.languages[0] || 'English';
    next.platforms = canonicalPlatformArray(next.platforms);
    next.summary = String(next.summary || '').trim();
    next.icon = String(next.icon || '').trim();
    next.hero = String(next.hero || '').trim();
    next.screenshots = Array.isArray(next.screenshots) ? next.screenshots.map(String).map(item => item.trim()).filter(Boolean) : splitList(next.screenshots);
    next.videos = normalizeVideos(next.videos || next.video || next.youtube);
    next.links = Array.isArray(next.links) ? next.links.map(link => {
      const platform = canonicalPlatformName(link.platform);
      const rawLabel = String(link.label || '').trim();
      const canonicalLabel = canonicalPlatformName(rawLabel);
      return {
        label: canonicalLabel !== rawLabel ? canonicalLabel : rawLabel,
        url: String(link.url || '').trim(),
        type: String(link.type || 'download').trim(),
        platform,
        format: String(link.format || '').trim()
      };
    }).filter(link => link.url) : [];
    next.mature = Boolean(next.mature);
    next.contentWarning = String(next.contentWarning || '').trim();

    delete next.tags;
    delete next.video;
    delete next.youtube;
    if (!next.hero) delete next.hero;
    if (!next.videos.length) delete next.videos;
    if (!next.mature) delete next.mature;
    if (!next.contentWarning) delete next.contentWarning;
    return next;
  };

  const ensureMeta = () => {
    if (!catalog.meta || typeof catalog.meta !== 'object' || Array.isArray(catalog.meta)) catalog.meta = {};
    if (!Array.isArray(catalog.meta.homePicks)) catalog.meta.homePicks = [];
    if (!catalog.meta.homePicksLabel) catalog.meta.homePicksLabel = "Gameblabla's picks";
    return catalog.meta;
  };

  const getHomePicks = () => ensureMeta().homePicks;

  const setHomePick = (previousId, nextId, enabled) => {
    const meta = ensureMeta();
    const ids = new Set((meta.homePicks || []).filter(Boolean));
    if (previousId && previousId !== nextId) ids.delete(previousId);
    if (enabled && nextId) ids.add(nextId);
    else if (nextId) ids.delete(nextId);
    meta.homePicks = catalog.games.map(game => game.id).filter(id => ids.has(id));
    if (enabled && nextId && !meta.homePicks.includes(nextId)) meta.homePicks.push(nextId);
  };

  const renderCounts = () => {
    const node = $('[data-editor-counts]');
    if (!node) return;
    const games = catalog.games || [];
    const original = games.filter(game => getProjectType(game) === 'original').length;
    const homebrew = games.filter(game => getProjectType(game) === 'homebrew').length;
    const opendingux = games.filter(game => getProjectType(game) === 'opendingux').length;
    const platforms = new Set(games.flatMap(game => canonicalPlatformArray(game.platforms)));
    const picks = getHomePicks().length;
    node.textContent = `${games.length} entries · ${original} original · ${homebrew} homebrew ports · ${opendingux} OpenDingux · ${platforms.size} platforms · ${picks} picks`;
  };

  const filteredGames = () => {
    const q = normalize(searchQuery);
    return catalog.games
      .map((game, index) => ({ game, index }))
      .filter(({ game }) => {
        if (!q) return true;
        return normalize([
          game.title,
          game.originalTitle,
          game.id,
          game.slug,
          game.genre,
          game.releaseDate,
          game.hero,
          ...canonicalPlatformArray(game.platforms),
          ...(Array.isArray(game.languages) ? game.languages : []),
          ...normalizeVideos(game.videos).flatMap(video => [video.title, video.url])
        ].join(' ')).includes(q);
      });
  };

  const renderGameList = () => {
    const list = $('[data-game-list]');
    if (!list) return;
    const rows = filteredGames();
    list.innerHTML = rows.map(({ game, index }) => {
      const type = getProjectType(game);
      const selected = index === selectedIndex ? ' is-selected' : '';
      return `<button class="game-list-item${selected}" type="button" data-select-index="${index}">
        <span><strong>${escapeHTML(game.title || 'Untitled')}${getHomePicks().includes(game.id) ? ' ★' : ''}</strong><small>${escapeHTML(game.id || 'missing-id')}</small></span>
        <em class="mini-type ${escapeHTML(type)}">${escapeHTML(projectTypeLabel(type))}</em>
      </button>`;
    }).join('') || '<p class="small muted-block">No matching games.</p>';
    renderCounts();
  };

  const allPlatformOptions = () => uniqueSorted([
    ...basePlatforms,
    ...getSelectedPlatforms(),
    ...catalog.games.flatMap(game => canonicalPlatformArray(game.platforms)),
    ...catalog.games.flatMap(game => Array.isArray(game.links) ? game.links.map(link => canonicalPlatformName(link.platform || link.label || '')) : [])
  ]);

  const allGenreOptions = () => uniqueSorted([
    ...baseGenres,
    ...catalog.games.map(game => game.genre || '').filter(Boolean)
  ]);

  const choiceIconMarkup = (icon, label, fallbackClass = '') => icon
    ? `<img src="${escapeHTML(icon)}" alt="" aria-hidden="true">`
    : `<span class="choice-glyph ${escapeHTML(fallbackClass)}" aria-hidden="true">${escapeHTML(label.slice(0, 1).toUpperCase() || '•')}</span>`;

  const renderPlatformPicker = selectedPlatforms => {
    const picker = $('[data-platform-picker]');
    const hidden = $('[data-platforms-value]');
    if (!picker || !hidden) return;
    const selected = new Set(canonicalPlatformArray(selectedPlatforms));
    const options = uniqueSorted([...allPlatformOptions(), ...selected]);
    hidden.value = [...selected].join(', ');
    picker.innerHTML = options.map(platform => {
      const checked = selected.has(platform);
      const icon = getPlatformIcon(platform);
      return `<label class="choice-tile platform-choice${checked ? ' is-selected' : ''}">
        <input type="checkbox" value="${escapeHTML(platform)}" ${checked ? 'checked' : ''}>
        ${choiceIconMarkup(icon, platform)}
        <span>${escapeHTML(platform)}</span>
      </label>`;
    }).join('');
  };

  const getSelectedPlatforms = () => canonicalPlatformArray($$('[data-platform-picker] input:checked').map(input => input.value));

  const updatePlatformHidden = () => {
    const hidden = $('[data-platforms-value]');
    if (hidden) hidden.value = getSelectedPlatforms().join(', ');
  };

  const renderGenrePicker = selectedGenre => {
    const picker = $('[data-genre-picker]');
    const hidden = $('[data-genre-value]');
    if (!picker || !hidden) return;
    const selected = String(selectedGenre || '').trim();
    const options = uniqueSorted([...allGenreOptions(), selected].filter(Boolean));
    hidden.value = selected;
    picker.innerHTML = options.map(genre => {
      const checked = normalize(genre) === normalize(selected);
      const icon = genreIcons.get(normalize(genre)) || '•';
      return `<label class="choice-tile genre-choice${checked ? ' is-selected' : ''}">
        <input type="radio" name="genre-choice" value="${escapeHTML(genre)}" ${checked ? 'checked' : ''}>
        <span class="choice-glyph" aria-hidden="true">${escapeHTML(icon)}</span>
        <span>${escapeHTML(genre)}</span>
      </label>`;
    }).join('');
  };

  const updateGenreHidden = () => {
    const hidden = $('[data-genre-value]');
    const checked = $('[data-genre-picker] input:checked');
    if (hidden) hidden.value = checked ? checked.value : '';
  };

  const addCustomPlatform = () => {
    const input = $('[data-custom-platform]');
    const value = canonicalPlatformName(input?.value.trim());
    if (!value) return;
    const selected = new Set(getSelectedPlatforms());
    selected.add(value);
    if (input) input.value = '';
    renderPlatformPicker([...selected]);
    updateDraftPreview();
  };

  const addCustomGenre = () => {
    const input = $('[data-custom-genre]');
    const value = input?.value.trim();
    if (!value) return;
    if (input) input.value = '';
    renderGenrePicker(value);
    updateDraftPreview();
  };

  const guessFormat = url => {
    const clean = String(url || '').split(/[?#]/)[0].toLowerCase();
    if (/\.tar\.gz$|\.tgz$/.test(clean)) return 'TGZ';
    if (/\.tar\.bz2$/.test(clean)) return 'TBZ2';
    const ext = (clean.match(/\.([a-z0-9]+)$/) || [])[1] || '';
    const map = {
      zip: 'ZIP', '7z': '7Z', rar: 'RAR', opk: 'OPK', bin: 'BIN', cue: 'CUE', iso: 'ISO',
      chd: 'CHD', cdi: 'CDI', elf: 'ELF', dol: 'DOL', apk: 'APK', gba: 'GBA', gb: 'GB',
      gbc: 'GBC', nes: 'NES', sfc: 'SFC', smc: 'SMC', n64: 'N64', z64: 'Z64', v64: 'V64',
      pce: 'PCE', pbp: 'PBP', exe: 'EXE', dmg: 'DMG'
    };
    return map[ext] || '';
  };

  const platformSelectOptions = selected => {
    const canonicalSelected = canonicalPlatformName(selected);
    return [
      '<option value="">No platform / source only</option>',
      ...allPlatformOptions().map(platform => `<option value="${escapeHTML(platform)}"${platform === canonicalSelected ? ' selected' : ''}>${escapeHTML(platform)}</option>`)
    ].join('');
  };

  const linkRowTemplate = (link = {}, index = 0) => {
    const selectedPlatform = canonicalPlatformName(link.platform || (link.type === 'source' ? '' : link.label || ''));
    const previewIcon = selectedPlatform ? getPlatformIcon(selectedPlatform) : '';
    return `<div class="link-row simplified-link-row" data-link-row>
      <label>Platform / target
        <span class="link-platform-select">
          ${previewIcon ? `<img src="${escapeHTML(previewIcon)}" alt="" aria-hidden="true">` : '<span class="choice-glyph small" aria-hidden="true">⌁</span>'}
          <select class="editor-input" name="link-platform" data-link-platform>
            ${platformSelectOptions(selectedPlatform)}
          </select>
        </span>
      </label>
      <label>URL<input class="editor-input" name="link-url" value="${escapeHTML(link.url || '')}" placeholder="https://…"></label>
      <label>Type<select class="editor-input" name="link-type">
        <option value="download"${(link.type || 'download') === 'download' ? ' selected' : ''}>Download</option>
        <option value="source"${link.type === 'source' ? ' selected' : ''}>Source</option>
        <option value="page"${link.type === 'page' ? ' selected' : ''}>Page</option>
      </select></label>
      <label>Display name<input class="editor-input" name="link-label" value="${escapeHTML(link.label || '')}" placeholder="Auto-filled from platform"></label>
      <button class="button icon-button danger-button" type="button" data-remove-link="${index}" aria-label="Remove link">×</button>
    </div>`;
  };

  const renderLinks = links => {
    const editor = $('[data-link-editor]');
    if (!editor) return;
    const rows = Array.isArray(links) ? links : [];
    editor.innerHTML = rows.length
      ? rows.map((link, index) => linkRowTemplate({
        label: String(link?.label || '').trim(),
        url: String(link?.url || '').trim(),
        type: String(link?.type || 'download').trim() || 'download',
        platform: canonicalPlatformName(link?.platform || ''),
        format: String(link?.format || '').trim()
      }, index)).join('')
      : '<p class="muted-block">No downloads or source links yet.</p>';
    $$('[data-link-row]', editor).forEach(row => {
      refreshLinkPlatformPreview(row);
      autofillLinkRow(row);
    });
  };

  const refreshLinkPlatformPreview = row => {
    const select = $('[name="link-platform"]', row);
    const wrap = $('.link-platform-select', row);
    if (!select || !wrap) return;
    const icon = getPlatformIcon(select.value);
    const existing = wrap.querySelector('img, .choice-glyph');
    if (!existing) return;
    if (icon) {
      const img = document.createElement('img');
      img.src = icon;
      img.alt = '';
      img.setAttribute('aria-hidden', 'true');
      existing.replaceWith(img);
    } else {
      const glyph = document.createElement('span');
      glyph.className = 'choice-glyph small';
      glyph.setAttribute('aria-hidden', 'true');
      glyph.textContent = '⌁';
      existing.replaceWith(glyph);
    }
  };

  const autofillLinkRow = (row, reason = '') => {
    const label = $('[name="link-label"]', row);
    const platform = $('[name="link-platform"]', row);
    const type = $('[name="link-type"]', row);
    if (!label || !platform || !type) return;
    const current = label.value.trim();
    const generic = ['', 'Download', 'Source', 'Source code', 'Page'];
    const platformNames = allPlatformOptions();
    const canReplace = !current || generic.includes(current) || platformNames.includes(current) || reason === 'platform';
    if (type.value === 'source' && !platform.value) {
      if (!current || generic.includes(current)) label.value = 'Source code';
    } else if (platform.value && canReplace) {
      label.value = platform.value;
    } else if (!platform.value && type.value === 'download' && !current) {
      label.value = 'Download';
    }
    refreshLinkPlatformPreview(row);
  };

  const previewFor = path => previewUrls.get(path) || path || '';

  const setHeroPreview = () => {
    const input = $('[data-hero-input]');
    const preview = $('[data-hero-preview]');
    if (!input || !preview) return;
    const path = input.value.trim();
    const source = previewFor(path);
    preview.hidden = !source;
    if (source) preview.src = source;
  };

  const screenshotRowTemplate = (path = '', index = 0) => {
    const preview = previewFor(path);
    return `<div class="media-row" data-screenshot-row>
      <div class="media-thumb">${preview ? `<img src="${escapeHTML(preview)}" alt="Screenshot preview">` : '<span>No image</span>'}</div>
      <label>Path<input class="editor-input" name="screenshot-path" value="${escapeHTML(path)}" placeholder="img/screenshot.png"></label>
      <div class="media-row-actions">
        <button class="button" type="button" data-set-main-shot="${index}">Set main</button>
        <button class="button" type="button" data-move-shot="up" data-shot-index="${index}" aria-label="Move screenshot up">↑</button>
        <button class="button" type="button" data-move-shot="down" data-shot-index="${index}" aria-label="Move screenshot down">↓</button>
        <button class="button danger-button" type="button" data-remove-shot="${index}" aria-label="Remove screenshot">×</button>
      </div>
    </div>`;
  };

  const readScreenshotsFromForm = () => $$('[data-screenshot-row]').map(row => $('[name="screenshot-path"]', row)?.value.trim() || '').filter(Boolean);

  const renderScreenshots = screenshots => {
    const editor = $('[data-screenshot-editor]');
    if (!editor) return;
    editor.innerHTML = (screenshots || []).map(screenshotRowTemplate).join('') || '<p class="muted-block">No screenshots yet.</p>';
    setHeroPreview();
  };

  const renderImageLibrary = () => {
    const grid = $('[data-image-library]');
    const count = $('[data-image-library-count]');
    if (!grid) return;
    const q = normalize(imageSearchQuery);
    const images = imageLibrary
      .filter(item => !q || normalize(`${item.name || ''} ${item.path || ''}`).includes(q))
      .slice(0, 180);
    if (count) {
      const visible = images.length;
      const total = imageLibrary.length;
      count.textContent = total ? `${visible} of ${total} shown` : 'No img/ index found';
    }
    grid.innerHTML = images.map(item => `<article class="image-library-item">
      <button class="image-library-thumb" type="button" data-library-action="shot" data-library-path="${escapeHTML(item.path)}" title="Add screenshot">
        <img src="${escapeHTML(item.path)}" alt="${escapeHTML(item.name || item.path)}" loading="lazy">
      </button>
      <div class="image-library-meta">
        <strong title="${escapeHTML(item.path)}">${escapeHTML(item.name || item.path)}</strong>
        <div class="image-library-actions">
          <button class="button" type="button" data-library-action="main" data-library-path="${escapeHTML(item.path)}">Main</button>
          <button class="button" type="button" data-library-action="shot" data-library-path="${escapeHTML(item.path)}">Shot</button>
        </div>
      </div>
    </article>`).join('') || '<p class="muted-block">No images match that search.</p>';
  };

  const addLibraryImage = (path, mode = 'shot') => {
    if (!path) return;
    const screenshots = readScreenshotsFromForm();
    if (!screenshots.includes(path)) screenshots.push(path);
    const hero = $('[data-hero-input]');
    if (mode === 'main' && hero) hero.value = path;
    if (hero && !hero.value.trim()) hero.value = path;
    renderScreenshots(screenshots);
    updateDraftPreview();
    setStatus(mode === 'main' ? `Main screenshot set to ${path}.` : `Added screenshot ${path}.`, 'ok');
  };

  const videoRowTemplate = (video = {}, index = 0) => `<div class="video-row" data-video-row>
    <label>Title<input class="editor-input" name="video-title" value="${escapeHTML(video.title || '')}" placeholder="Trailer, gameplay, longplay…"></label>
    <label>URL<input class="editor-input" name="video-url" value="${escapeHTML(video.url || '')}" placeholder="https://www.youtube.com/watch?v=…"></label>
    <button class="button danger-button icon-button" type="button" data-remove-video="${index}" aria-label="Remove video">×</button>
  </div>`;

  const normalizeVideoRowsForEditor = videos => {
    const raw = Array.isArray(videos) ? videos : normalizeVideos(videos);
    return raw.map(item => {
      if (typeof item === 'string') return { title: '', url: item.trim() };
      return {
        title: String(item?.title || '').trim(),
        url: String(item?.url || '').trim()
      };
    });
  };

  const renderVideos = videos => {
    const editor = $('[data-video-editor]');
    if (!editor) return;
    const rows = normalizeVideoRowsForEditor(videos);
    editor.innerHTML = rows.length
      ? rows.map(videoRowTemplate).join('')
      : '<p class="muted-block">No videos yet. Add YouTube, Vimeo, or direct video links.</p>';
  };

  const readVideoRowsFromForm = () => $$('[data-video-row]').map(row => ({
    title: $('[name="video-title"]', row)?.value.trim() || '',
    url: $('[name="video-url"]', row)?.value.trim() || ''
  }));

  const readVideosFromForm = () => readVideoRowsFromForm()
    .filter(video => video.url)
    .map(video => video.title ? video : { url: video.url });

  const getForm = () => $('[data-game-form]');

  const fillForm = index => {
    selectedIndex = index;
    const game = catalog.games[selectedIndex];
    const form = getForm();
    if (!form || !game) return;

    form.elements.title.value = game.title || '';
    form.elements.originalTitle.value = game.originalTitle || '';
    form.elements.id.value = game.id || '';
    form.elements.slug.value = game.slug || '';
    form.elements.kind.value = game.kind === 'original' ? 'original' : 'port';
    form.elements.portType.value = game.kind === 'original' ? '' : (game.portType || (game.collection === 'opendingux' ? 'opendingux' : 'homebrew'));
    form.elements.collection.value = game.collection || 'retro';
    form.elements.genre.value = game.genre || '';
    renderGenrePicker(game.genre || '');
    form.elements.releaseDate.value = game.releaseDate || '';
    form.elements.languages.value = joinList(game.languages || game.language);
    form.elements.platforms.value = joinList(game.platforms);
    renderPlatformPicker(game.platforms || []);
    form.elements.icon.value = game.icon || '';
    form.elements.hero.value = game.hero || '';
    form.elements.summary.value = game.summary || '';
    form.elements.mature.checked = Boolean(game.mature || game.contentWarning);
    form.elements.contentWarning.value = game.contentWarning || '';
    if (form.elements.homePick) form.elements.homePick.checked = getHomePicks().includes(game.id);
    form.dataset.autoIdentity = /^new-game(?:-|$)/.test(String(game.id || '')) || !game.id ? 'true' : 'false';
    form.dataset.manualId = 'false';
    form.dataset.manualSlug = 'false';
    renderScreenshots(game.screenshots || []);
    renderVideos(game.videos || game.video || game.youtube || []);
    renderLinks(game.links || []);

    const title = $('[data-current-title]');
    if (title) title.textContent = game.title || 'Untitled game';
    renderGameList();
    updateRawPreview();
    setStatus('Entry loaded. Edit fields, then save or export.', 'ok');
  };

  const readLinkRowsFromForm = () => $$('[data-link-row]').map(row => {
    autofillLinkRow(row);
    const url = $('[name="link-url"]', row)?.value.trim() || '';
    const type = $('[name="link-type"]', row)?.value || 'download';
    const platform = canonicalPlatformName($('[name="link-platform"]', row)?.value.trim() || '');
    const rawLabel = $('[name="link-label"]', row)?.value.trim() || platform || (type === 'source' ? 'Source code' : 'Download');
    const canonicalLabel = canonicalPlatformName(rawLabel);
    const label = canonicalLabel !== rawLabel ? canonicalLabel : rawLabel;
    return {
      label,
      url,
      type,
      platform,
      format: type === 'source' ? '' : guessFormat(url)
    };
  });

  const readLinksFromForm = () => readLinkRowsFromForm().filter(link => link.url);

  const readFormGame = () => {
    const form = getForm();
    if (!form || selectedIndex < 0) return null;
    const previous = catalog.games[selectedIndex] || emptyGame();
    const next = {
      ...previous,
      title: form.elements.title.value,
      originalTitle: form.elements.originalTitle.value,
      id: form.elements.id.value,
      slug: form.elements.slug.value || slugify(form.elements.title.value || form.elements.id.value),
      kind: form.elements.kind.value,
      portType: form.elements.portType.value,
      collection: form.elements.collection.value,
      genre: form.elements.genre.value,
      releaseDate: form.elements.releaseDate.value,
      languages: splitList(form.elements.languages.value).length ? splitList(form.elements.languages.value) : ['English'],
      platforms: getSelectedPlatforms(),
      icon: form.elements.icon.value,
      hero: form.elements.hero.value,
      summary: form.elements.summary.value,
      screenshots: readScreenshotsFromForm(),
      videos: readVideosFromForm(),
      mature: form.elements.mature.checked,
      contentWarning: form.elements.contentWarning.value,
      links: readLinksFromForm()
    };
    return sanitizeGame(next);
  };

  const updateRawPreview = () => {
    const raw = $('[data-raw-json]');
    if (raw) raw.value = `${JSON.stringify(catalog, null, 2)}\n`;
  };

  const updateDraftPreview = () => {
    clearTimeout(saveTimer);
    saveTimer = setTimeout(() => {
      const game = readFormGame();
      if (game && selectedIndex >= 0) {
        const preview = JSON.parse(JSON.stringify(catalog));
        preview.games[selectedIndex] = game;
        const raw = $('[data-raw-json]');
        if (raw) raw.value = `${JSON.stringify(preview, null, 2)}\n`;
        setStatus('Unsaved changes in the current entry.', '');
      }
    }, 120);
  };

  const saveCurrent = ({ silent = false } = {}) => {
    if (selectedIndex < 0) return true;
    const next = readFormGame();
    if (!next) return true;
    const duplicate = catalog.games.find((game, index) => index !== selectedIndex && game.id === next.id);
    if (duplicate) {
      setStatus(`Duplicate id: ${next.id}`, 'error');
      return false;
    }
    if (!next.title || !next.id) {
      setStatus('Title and ID are required.', 'error');
      return false;
    }
    const previousId = catalog.games[selectedIndex]?.id || '';
    catalog.games[selectedIndex] = next;
    setHomePick(previousId, next.id, Boolean(getForm()?.elements.homePick?.checked));
    try {
      validateCatalog(catalog);
    } catch (error) {
      setStatus(error.message, 'error');
      return false;
    }
    if (!silent) setStatus(`Saved ${next.title}.`, 'ok');
    renderGameList();
    updateRawPreview();
    const title = $('[data-current-title]');
    if (title) title.textContent = next.title;
    return true;
  };

  const exportJson = () => {
    if (!saveCurrent({ silent: true })) return;
    try {
      catalog.games = catalog.games.map(sanitizeGame);
      validateCatalog(catalog);
      const blob = new Blob([`${JSON.stringify(catalog, null, 2)}\n`], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = 'games.json';
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(url);
      setStatus('Exported games.json.', 'ok');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  };

  const copyJson = async () => {
    if (!saveCurrent({ silent: true })) return;
    try {
      await navigator.clipboard.writeText(`${JSON.stringify(catalog, null, 2)}\n`);
      setStatus('Copied JSON to clipboard.', 'ok');
    } catch (error) {
      setStatus(error.message || 'Clipboard API is not available.', 'error');
    }
  };

  const addNewGame = () => {
    if (!saveCurrent({ silent: true })) return;
    const game = emptyGame();
    game.id = uniqueId('new-game');
    game.slug = game.id;
    catalog.games.push(game);
    fillForm(catalog.games.length - 1);
    setStatus('Added a blank game. Fill the fields and save.', 'ok');
  };

  const duplicateGame = () => {
    if (selectedIndex < 0) return;
    if (!saveCurrent({ silent: true })) return;
    const source = JSON.parse(JSON.stringify(catalog.games[selectedIndex]));
    source.id = uniqueId(`${source.id}-copy`);
    source.slug = uniqueId(`${source.slug || slugify(source.title)}-copy`);
    source.title = `${source.title} copy`;
    catalog.games.splice(selectedIndex + 1, 0, source);
    fillForm(selectedIndex + 1);
    setStatus('Duplicated entry.', 'ok');
  };

  const deleteGame = () => {
    if (selectedIndex < 0) return;
    const game = catalog.games[selectedIndex];
    if (!window.confirm(`Delete ${game.title || game.id}? This only affects the in-browser catalog until you export JSON.`)) return;
    catalog.games.splice(selectedIndex, 1);
    selectedIndex = Math.min(selectedIndex, catalog.games.length - 1);
    if (selectedIndex >= 0) fillForm(selectedIndex);
    else {
      renderGameList();
      updateRawPreview();
      const currentTitle = $('[data-current-title]');
      if (currentTitle) currentTitle.textContent = 'No game selected';
      getForm()?.reset();
      renderScreenshots([]);
      renderVideos([]);
      renderLinks([]);
    }
    setStatus('Entry deleted. Export JSON to keep the change.', 'ok');
  };

  const addLink = () => {
    if (selectedIndex < 0) return;
    const links = readLinkRowsFromForm();
    links.push({ label: '', url: '', type: 'download', platform: '', format: '' });
    renderLinks(links);
    updateDraftPreview();
    setStatus('Added link row.', 'ok');
  };

  const removeLink = index => {
    const links = readLinkRowsFromForm();
    links.splice(index, 1);
    renderLinks(links);
    updateDraftPreview();
    setStatus('Removed link row.', 'ok');
  };

  const addVideo = () => {
    const videos = readVideoRowsFromForm();
    videos.push({ title: '', url: '' });
    renderVideos(videos);
    updateDraftPreview();
    setStatus('Added video row.', 'ok');
  };

  const removeVideo = index => {
    const videos = readVideoRowsFromForm();
    videos.splice(index, 1);
    renderVideos(videos);
    updateDraftPreview();
  };

  const addScreenshotPath = (path = '') => {
    const screenshots = readScreenshotsFromForm();
    screenshots.push(path);
    renderScreenshots(screenshots);
    updateDraftPreview();
  };

  const removeScreenshot = index => {
    const screenshots = readScreenshotsFromForm();
    const [removed] = screenshots.splice(index, 1);
    const hero = $('[data-hero-input]');
    if (hero && hero.value.trim() === removed) hero.value = screenshots[0] || '';
    renderScreenshots(screenshots);
    updateDraftPreview();
  };

  const moveScreenshot = (index, direction) => {
    const screenshots = readScreenshotsFromForm();
    const nextIndex = direction === 'up' ? index - 1 : index + 1;
    if (nextIndex < 0 || nextIndex >= screenshots.length) return;
    [screenshots[index], screenshots[nextIndex]] = [screenshots[nextIndex], screenshots[index]];
    renderScreenshots(screenshots);
    updateDraftPreview();
  };

  const setMainScreenshot = index => {
    const screenshots = readScreenshotsFromForm();
    const path = screenshots[index];
    if (!path) return;
    const hero = $('[data-hero-input]');
    if (hero) hero.value = path;
    setHeroPreview();
    updateDraftPreview();
  };

  const useFirstScreenshot = () => {
    const screenshots = readScreenshotsFromForm();
    if (!screenshots.length) return;
    const hero = $('[data-hero-input]');
    if (hero) hero.value = screenshots[0];
    setHeroPreview();
    updateDraftPreview();
  };

  const pathForImageFile = file => {
    const safeName = String(file.name || 'screenshot.png').replace(/[^A-Za-z0-9._-]+/g, '-');
    return `img/${safeName}`;
  };

  const registerImageFiles = files => Array.from(files || [])
    .filter(file => /^image\//.test(file.type || '') || /\.(png|jpe?g|gif|webp|avif|bmp)$/i.test(file.name || ''))
    .map(file => {
      const path = pathForImageFile(file);
      if (!previewUrls.has(path)) previewUrls.set(path, URL.createObjectURL(file));
      return path;
    });

  const setMainFromFiles = files => {
    const [path] = registerImageFiles(files);
    if (!path) return;
    const hero = $('[data-hero-input]');
    if (hero) hero.value = path;
    const screenshots = readScreenshotsFromForm();
    if (!screenshots.includes(path)) screenshots.unshift(path);
    renderScreenshots(screenshots);
    updateDraftPreview();
    setStatus(`Main screenshot set to ${path}. Add the image file under img/ before publishing.`, 'ok');
  };

  const addScreenshotsFromFiles = files => {
    const paths = registerImageFiles(files);
    if (!paths.length) return;
    const screenshots = readScreenshotsFromForm();
    paths.forEach(path => {
      if (!screenshots.includes(path)) screenshots.push(path);
    });
    const hero = $('[data-hero-input]');
    if (hero && !hero.value.trim()) hero.value = screenshots[0] || '';
    renderScreenshots(screenshots);
    updateDraftPreview();
    setStatus(`Added ${paths.length} screenshot path${paths.length === 1 ? '' : 's'}. Commit the image file${paths.length === 1 ? '' : 's'} under img/ before publishing.`, 'ok');
  };

  const applyRawJson = () => {
    const raw = $('[data-raw-json]');
    if (!raw) return;
    try {
      const payload = validateCatalog(JSON.parse(raw.value));
      catalog = { ...payload, games: payload.games.map(sanitizeGame) };
      selectedIndex = catalog.games.length ? 0 : -1;
      renderGameList();
      renderCounts();
      if (selectedIndex >= 0) fillForm(selectedIndex);
      updateRawPreview();
      setStatus('Applied raw JSON to the graphical editor.', 'ok');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  };

  const importJson = () => $('[data-file-input]')?.click();

  const loadFile = file => {
    const reader = new FileReader();
    reader.addEventListener('load', () => {
      try {
        const payload = validateCatalog(JSON.parse(String(reader.result || '')));
        catalog = { ...payload, games: payload.games.map(sanitizeGame) };
        selectedIndex = catalog.games.length ? 0 : -1;
        renderGameList();
        renderCounts();
        updateRawPreview();
        if (selectedIndex >= 0) fillForm(selectedIndex);
        setStatus(`Imported ${file.name}.`, 'ok');
      } catch (error) {
        setStatus(error.message, 'error');
      }
    });
    reader.readAsText(file);
  };

  const initNav = () => {
    const toggle = $('[data-nav-toggle]');
    const links = $('[data-nav-links]');
    if (!links) return;
    if (toggle) {
      toggle.addEventListener('click', () => {
        const open = links.classList.toggle('is-open');
        toggle.setAttribute('aria-expanded', String(open));
        document.body.classList.toggle('no-scroll', open);
      });
    }
    const current = location.pathname.split('/').pop() || 'index.html';
    $$('a[href]', links).forEach(link => {
      if (link.getAttribute('href') === current) link.setAttribute('aria-current', 'page');
    });
  };

  const bindDropZone = (node, handler) => {
    if (!node) return;
    ['dragenter', 'dragover'].forEach(type => {
      node.addEventListener(type, event => {
        event.preventDefault();
        node.classList.add('is-dragging');
      });
    });
    ['dragleave', 'drop'].forEach(type => {
      node.addEventListener(type, event => {
        event.preventDefault();
        node.classList.remove('is-dragging');
      });
    });
    node.addEventListener('drop', event => handler(event.dataTransfer?.files || []));
  };

  const bindEvents = () => {
    $('[data-game-list]')?.addEventListener('click', event => {
      const button = event.target.closest('[data-select-index]');
      if (!button) return;
      if (!saveCurrent({ silent: true })) return;
      fillForm(Number(button.dataset.selectIndex));
    });

    $('[data-game-search]')?.addEventListener('input', event => {
      searchQuery = event.target.value;
      renderGameList();
    });

    getForm()?.addEventListener('submit', event => {
      event.preventDefault();
      saveCurrent();
    });

    getForm()?.addEventListener('input', event => {
      if (event.target.matches('[name="id"]')) getForm().dataset.manualId = 'true';
      if (event.target.matches('[name="slug"]')) getForm().dataset.manualSlug = 'true';
      if (event.target.matches('[name="title"]')) syncNewGameIdentity();
      if (event.target.matches('[data-hero-input]')) setHeroPreview();
      updateDraftPreview();
    });

    $('[data-platform-picker]')?.addEventListener('change', () => {
      updatePlatformHidden();
      $$('.platform-choice', $('[data-platform-picker]')).forEach(tile => {
        const input = $('input', tile);
        tile.classList.toggle('is-selected', Boolean(input?.checked));
      });
      updateDraftPreview();
    });

    $('[data-genre-picker]')?.addEventListener('change', () => {
      updateGenreHidden();
      $$('.genre-choice', $('[data-genre-picker]')).forEach(tile => {
        const input = $('input', tile);
        tile.classList.toggle('is-selected', Boolean(input?.checked));
      });
      updateDraftPreview();
    });

    $('[data-image-library-search]')?.addEventListener('input', event => {
      imageSearchQuery = event.target.value;
      renderImageLibrary();
    });

    $('[data-refresh-image-library]')?.addEventListener('click', () => loadImageLibrary({ forceLive: true }));

    $('[data-image-library]')?.addEventListener('click', event => {
      const button = event.target.closest('[data-library-action]');
      if (!button) return;
      addLibraryImage(button.dataset.libraryPath, button.dataset.libraryAction);
    });

    $('[data-link-editor]')?.addEventListener('change', event => {
      const row = event.target.closest('[data-link-row]');
      if (!row) return;
      if (event.target.matches('[name="link-platform"]')) autofillLinkRow(row, 'platform');
      else autofillLinkRow(row);
      updateDraftPreview();
    });

    $('[data-link-editor]')?.addEventListener('input', event => {
      const row = event.target.closest('[data-link-row]');
      if (row && event.target.matches('[name="link-url"]')) autofillLinkRow(row);
    });

    $('[data-link-editor]')?.addEventListener('click', event => {
      const button = event.target.closest('[data-remove-link]');
      if (!button) return;
      removeLink(Number(button.dataset.removeLink));
    });

    $('[data-screenshot-editor]')?.addEventListener('click', event => {
      const remove = event.target.closest('[data-remove-shot]');
      const main = event.target.closest('[data-set-main-shot]');
      const move = event.target.closest('[data-move-shot]');
      if (remove) removeScreenshot(Number(remove.dataset.removeShot));
      if (main) setMainScreenshot(Number(main.dataset.setMainShot));
      if (move) moveScreenshot(Number(move.dataset.shotIndex), move.dataset.moveShot);
    });

    $('[data-video-editor]')?.addEventListener('click', event => {
      const button = event.target.closest('[data-remove-video]');
      if (button) removeVideo(Number(button.dataset.removeVideo));
    });

    $('[data-add-link]')?.addEventListener('click', addLink);
    $('[data-add-custom-platform]')?.addEventListener('click', addCustomPlatform);
    $('[data-add-custom-genre]')?.addEventListener('click', addCustomGenre);
    $('[data-custom-platform]')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addCustomPlatform(); } });
    $('[data-custom-genre]')?.addEventListener('keydown', event => { if (event.key === 'Enter') { event.preventDefault(); addCustomGenre(); } });
    $('[data-add-video]')?.addEventListener('click', addVideo);
    $('[data-add-screenshot]')?.addEventListener('click', () => addScreenshotPath(''));
    $('[data-use-first-screenshot]')?.addEventListener('click', useFirstScreenshot);
    $('[data-pick-main-image]')?.addEventListener('click', () => $('[data-main-image-input]')?.click());
    $('[data-main-drop]')?.addEventListener('click', () => $('[data-main-image-input]')?.click());
    $('[data-screenshot-drop]')?.addEventListener('click', () => $('[data-screenshot-file-input]')?.click());
    $('[data-new-game]')?.addEventListener('click', addNewGame);
    $('[data-duplicate-game]')?.addEventListener('click', duplicateGame);
    $('[data-delete-game]')?.addEventListener('click', deleteGame);
    $('[data-export-json]')?.addEventListener('click', exportJson);
    $('[data-import-json]')?.addEventListener('click', importJson);
    $('[data-copy-json]')?.addEventListener('click', copyJson);
    $('[data-apply-raw]')?.addEventListener('click', applyRawJson);

    $('[data-file-input]')?.addEventListener('change', event => {
      const [file] = event.target.files || [];
      if (file) loadFile(file);
      event.target.value = '';
    });
    $('[data-main-image-input]')?.addEventListener('change', event => {
      setMainFromFiles(event.target.files || []);
      event.target.value = '';
    });
    $('[data-screenshot-file-input]')?.addEventListener('change', event => {
      addScreenshotsFromFiles(event.target.files || []);
      event.target.value = '';
    });

    bindDropZone($('[data-main-drop]'), setMainFromFiles);
    bindDropZone($('[data-screenshot-drop]'), addScreenshotsFromFiles);
  };

  const imageFilePattern = /\.(?:png|jpe?g|gif|webp|avif|bmp|svg)$/i;

  const mergeImageLibraries = (...lists) => {
    const seen = new Set();
    return lists.flat().filter(item => {
      const path = typeof item === 'string' ? item : item?.path;
      if (!path || seen.has(path)) return false;
      seen.add(path);
      return true;
    }).map(item => typeof item === 'string' ? { path: item, name: item.split('/').pop() } : item);
  };

  const pathFromDirectoryUrl = url => {
    const decoded = decodeURIComponent(url.pathname);
    const marker = '/img/';
    const index = decoded.lastIndexOf(marker);
    if (index >= 0) return `img/${decoded.slice(index + marker.length)}`;
    const parts = decoded.split('/').filter(Boolean);
    const imgIndex = parts.lastIndexOf('img');
    return imgIndex >= 0 ? parts.slice(imgIndex).join('/') : '';
  };

  const scanImageDirectory = async (path = 'img/', depth = 0) => {
    if (depth > 3) return [];
    const response = await fetch(path, { cache: 'no-store' });
    if (!response.ok) throw new Error(`Directory listing unavailable for ${path}`);
    const html = await response.text();
    const doc = new DOMParser().parseFromString(html, 'text/html');
    const anchors = Array.from(doc.querySelectorAll('a[href]'));
    const found = [];
    for (const anchor of anchors) {
      const href = anchor.getAttribute('href') || '';
      if (!href || href.startsWith('?') || href.startsWith('#') || href === '../' || href === '/') continue;
      const url = new URL(href, response.url);
      if (url.origin !== location.origin) continue;
      const rel = pathFromDirectoryUrl(url);
      if (!rel || rel === 'img/' || rel.includes('/../')) continue;
      if (url.pathname.endsWith('/')) {
        found.push(...await scanImageDirectory(rel, depth + 1));
      } else if (imageFilePattern.test(rel)) {
        found.push({ path: rel, name: rel.split('/').pop() });
      }
    }
    return found;
  };

  const loadStaticImageIndex = async () => {
    try {
      const response = await fetch('data/images.json', { cache: 'no-store' });
      if (!response.ok) throw new Error('No image index');
      const payload = await response.json();
      const list = Array.isArray(payload.images) ? payload.images : [];
      return list.map(item => typeof item === 'string' ? { path: item, name: item.split('/').pop() } : item).filter(item => item && item.path);
    } catch (error) {
      return [];
    }
  };

  const loadImageLibrary = async ({ forceLive = false } = {}) => {
    const status = $('[data-image-library-count]');
    if (status) status.textContent = forceLive ? 'Scanning img/…' : 'Loading images…';
    const staticImages = await loadStaticImageIndex();
    let liveImages = [];
    try {
      liveImages = await scanImageDirectory('img/');
    } catch (error) {
      if (forceLive) setStatus(`${error.message}. Falling back to data/images.json.`, 'error');
    }
    imageLibrary = mergeImageLibraries(liveImages, staticImages);
    renderImageLibrary();
    if (forceLive && liveImages.length) setStatus(`Refreshed img/ scan: ${liveImages.length} live image${liveImages.length === 1 ? '' : 's'} found.`, 'ok');
  };

  const init = async () => {
    initNav();
    bindEvents();
    loadImageLibrary();
    try {
      const response = await fetch('data/games.json', { cache: 'no-store' });
      if (!response.ok) throw new Error(`Could not load data/games.json: ${response.status}`);
      const payload = validateCatalog(await response.json());
      catalog = { ...payload, games: payload.games.map(sanitizeGame) };
      selectedIndex = catalog.games.length ? 0 : -1;
      renderGameList();
      renderCounts();
      updateRawPreview();
      if (selectedIndex >= 0) fillForm(selectedIndex);
      setStatus('Catalog loaded.', 'ok');
    } catch (error) {
      setStatus(error.message, 'error');
    }
  };

  window.addEventListener('focus', () => {
    if (document.visibilityState === 'visible') loadImageLibrary({ forceLive: false });
  });

  document.addEventListener('DOMContentLoaded', init);
})();
