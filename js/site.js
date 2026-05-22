(() => {
  const params = new URLSearchParams(window.location.search);
  const validTypes = ['original', 'homebrew', 'opendingux'];
  const linkRegistry = new Map();
  let linkRegistryId = 0;

  const parseTypes = value => {
    const raw = String(value || 'all').trim();
    if (!raw || raw === 'all') return [...validTypes];
    if (raw === 'none') return [];
    return raw.split(',').map(item => item.trim()).filter(item => validTypes.includes(item));
  };

  const legacyKind = params.get('kind');
  const initialType = params.get('type') || (legacyKind === 'original' ? 'original' : legacyKind === 'port' ? 'homebrew,opendingux' : 'all');

  const platformAliasKey = value => String(value || '').trim().toLowerCase().replace(/[^a-z0-9]+/g, '');
  const canonicalPlatformName = value => {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const key = platformAliasKey(raw);
    if (['opendingux', 'od', 'gcwzero', 'gcw0', 'rg350'].includes(key)) return 'OpenDingux';
    if (['dos', 'msdos', 'microsoftdos'].includes(key)) return 'MS-DOS';
    return raw;
  };
  const toCanonicalPlatformArray = value => {
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
  const platformSearchAliases = platform => {
    const canonical = canonicalPlatformName(platform);
    if (canonical === 'OpenDingux') return ['OD', 'GCW Zero', 'GCW0', 'RG350', 'RG-350'];
    if (canonical === 'MS-DOS') return ['DOS', 'PC DOS'];
    return [];
  };

  const state = {
    games: [],
    meta: {},
    query: params.get('q') || '',
    genre: params.get('genre') || 'all',
    platform: canonicalPlatformName(params.get('platform') || 'all'),
    types: parseTypes(initialType),
    language: params.get('language') || 'all',
    sort: params.get('sort') || 'title'
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  const normalize = value => String(value || '')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();

  const toArray = value => {
    if (Array.isArray(value)) return value.map(String).map(item => item.trim()).filter(Boolean);
    return String(value || '').split(',').map(item => item.trim()).filter(Boolean);
  };

  const uniqueSorted = values => [...new Set(values.filter(Boolean))]
    .sort((a, b) => a.localeCompare(b, undefined, { sensitivity: 'base' }));

  const escapeHTML = value => String(value || '').replace(/[&<>'"]/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));

  const languageFlags = {
    english: '🇬🇧',
    french: '🇫🇷'
  };

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

  const getProjectType = game => {
    if (game.kind === 'original') return 'original';
    if (game.collection === 'opendingux' || game.portType === 'opendingux') return 'opendingux';
    return 'homebrew';
  };

  const typeLabel = type => ({
    original: 'Original',
    opendingux: 'OpenDingux',
    homebrew: 'Homebrew port'
  }[type] || 'Project');

  const isMatureGame = game => Boolean(game.mature || game.nsfw || game.contentWarning || /18\+|NSFW/i.test(game.title || ''));

  const defaultWarning = 'This game is intended for adults and may include offensive content. Continue only if you want to view or download it.';

  const stripMaturePrefix = title => String(title || '')
    .replace(/^\s*(?:[[(]?\s*(?:18\+|NSFW)\s*(?:\/\s*(?:18\+|NSFW)\s*)*[\])]?[\s:–—-]*)+/i, '')
    .trim();

  const getDisplayTitle = game => stripMaturePrefix(game.title) || String(game.title || 'Untitled project');

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
      const href = link.getAttribute('href');
      if ((current === 'index.html' && (href === '/' || href === 'index.html')) || href === current) {
        link.setAttribute('aria-current', 'page');
      }
    });
  };

  const fetchGames = async () => {
    const response = await fetch('data/games.json', { cache: 'no-store' });
    if (!response.ok) throw new Error(`Could not load game catalog: ${response.status}`);
    const payload = await response.json();
    state.meta = payload.meta || {};
    state.games = (payload.games || []).map(game => ({
      ...game,
      platforms: toCanonicalPlatformArray(game.platforms),
      languages: toArray(game.languages || game.language).length ? toArray(game.languages || game.language) : ['English'],
      releaseDate: game.releaseDate || game.released || game.year || '',
      links: Array.isArray(game.links) ? game.links.map(link => {
        const platform = canonicalPlatformName(link.platform);
        const rawLabel = String(link.label || '').trim();
        const label = canonicalPlatformName(rawLabel);
        return {
          ...link,
          platform,
          label: label !== rawLabel ? label : rawLabel
        };
      }) : []
    }));
    return state.games;
  };

  const setOptions = (select, options, defaultLabel, selectedValue = 'all') => {
    if (!select) return;
    select.innerHTML = [
      `<option value="all">${escapeHTML(defaultLabel)}</option>`,
      ...options.map(option => `<option value="${escapeHTML(option)}">${escapeHTML(option)}</option>`)
    ].join('');
    if ([...select.options].some(option => option.value === selectedValue)) {
      select.value = selectedValue;
    }
  };

  const getScopedGames = view => {
    const collection = view.dataset.collection;
    if (!collection || collection === 'all') return state.games;
    return state.games.filter(game => game.collection === collection);
  };

  const buildSearchText = game => normalize([
    game.title,
    game.originalTitle,
    game.summary,
    game.genre,
    game.releaseDate,
    game.kind,
    game.kindLabel,
    game.language,
    game.category,
    game.section,
    game.collection,
    game.collectionLabel,
    typeLabel(getProjectType(game)),
    ...toCanonicalPlatformArray(game.platforms).flatMap(platform => [platform, ...platformSearchAliases(platform)]),
    ...toArray(game.languages),
    ...getVideos(game).flatMap(video => [video.title, video.url]),
    ...(game.links || []).flatMap(link => [link.label, link.platform, link.format])
  ].join(' '));

  const filterGames = games => {
    const q = normalize(state.query.trim());
    return games.filter(game => {
      const platforms = toCanonicalPlatformArray(game.platforms);
      const languages = toArray(game.languages);
      const matchesQuery = !q || buildSearchText(game).includes(q);
      const matchesGenre = state.genre === 'all' || game.genre === state.genre;
      const matchesPlatform = state.platform === 'all' || platforms.includes(state.platform);
      const matchesType = state.types.includes(getProjectType(game));
      const matchesLanguage = state.language === 'all' || languages.includes(state.language);
      return matchesQuery && matchesGenre && matchesPlatform && matchesType && matchesLanguage;
    }).sort((a, b) => {
      if (state.sort === 'genre') return (a.genre || '').localeCompare(b.genre || '') || a.title.localeCompare(b.title);
      if (state.sort === 'platform') return toCanonicalPlatformArray(a.platforms).join(' ').localeCompare(toCanonicalPlatformArray(b.platforms).join(' ')) || a.title.localeCompare(b.title);
      if (state.sort === 'type') return typeLabel(getProjectType(a)).localeCompare(typeLabel(getProjectType(b))) || a.title.localeCompare(b.title);
      if (state.sort === 'release') return String(b.releaseDate || '').localeCompare(String(a.releaseDate || '')) || a.title.localeCompare(b.title);
      return a.title.localeCompare(b.title);
    });
  };

  const updateUrlQuery = () => {
    const params = new URLSearchParams();
    if (state.query.trim()) params.set('q', state.query.trim());
    if (state.types.length === 0) params.set('type', 'none');
    else if (state.types.length !== validTypes.length) params.set('type', state.types.join(','));
    if (state.genre !== 'all') params.set('genre', state.genre);
    if (state.platform !== 'all') params.set('platform', state.platform);
    if (state.language !== 'all') params.set('language', state.language);
    if (state.sort !== 'title') params.set('sort', state.sort);
    const next = `${window.location.pathname}${params.toString() ? `?${params.toString()}` : ''}`;
    history.replaceState(null, '', next);
  };

  const renderLanguageInline = game => {
    const languages = toArray(game.languages);
    if (!languages.length) return '—';
    return languages.map(language => {
      const flag = languageFlags[normalize(language)] || '';
      return `<span class="language-mini">${flag ? `<span aria-hidden="true">${flag}</span>` : ''}${escapeHTML(language)}</span>`;
    }).join(' ');
  };

  const renderPlatformChips = game => {
    const platforms = toCanonicalPlatformArray(game.platforms);
    if (!platforms.length) return '';
    return `<div class="platform-row balanced-grid" data-count="${platforms.length}" aria-label="Platforms">${platforms.map(platform => {
      const icon = getPlatformIcon(platform);
      const isActive = state.platform === platform;
      return `<button class="platform-chip${isActive ? ' is-active' : ''}" type="button" data-platform-filter-action="${escapeHTML(platform)}" title="Show only ${escapeHTML(platform)} games" aria-label="Show only ${escapeHTML(platform)} games">${icon ? `<img src="${escapeHTML(icon)}" alt="" aria-hidden="true">` : ''}<span>${escapeHTML(platform)}</span></button>`;
    }).join('')}</div>`;
  };

  const renderTitle = game => {
    const title = getDisplayTitle(game);
    return `
      <h3 class="game-title">
        <strong>${escapeHTML(title)}</strong>
        ${game.originalTitle ? `<small>${escapeHTML(game.originalTitle)}</small>` : ''}
      </h3>`;
  };

  const renderFacts = game => {
    const rows = [
      ['Genre', game.genre || '—'],
      ['Released', game.releaseDate || '—'],
      ['Language', renderLanguageInline(game), true]
    ];
    return `<dl class="game-facts">${rows.map(([label, value, isHtml]) => `
      <div class="fact-row">
        <dt>${escapeHTML(label)}</dt>
        <dd>${isHtml ? value : escapeHTML(value)}</dd>
      </div>`).join('')}</dl>`;
  };

  const cleanDownloadLabel = (game, link, forcePlatform = false) => {
    if (link.type === 'source') return 'Source';
    if (forcePlatform && link.platform) return link.platform;
    const label = link.label || link.platform || 'Download';
    return label
      .replace(/\s*OPK\b/ig, '')
      .replace(/\s*Download\b/ig, '')
      .replace(/\s*\((?:zip|7z|bin|opk)\)\s*$/i, '')
      .trim() || (game.collection === 'opendingux' ? 'OpenDingux' : 'Download');
  };

  const getReleaseIcon = (game, link) => {
    if (link.icon) return link.icon;
    const candidates = [link.platform, link.label, link.url].filter(Boolean);
    const matched = candidates.map(getPlatformIcon).find(Boolean);
    if (matched) return matched;
    if (link.type !== 'source' && game.icon) return game.icon;
    return '';
  };

  const getVariantLabel = (link, platform) => {
    const raw = cleanDownloadLabel({}, link, false);
    const withoutPlatform = raw
      .replace(new RegExp(String(platform || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'ig'), '')
      .replace(/sega\s*cd|mega\s*cd/ig, '')
      .replace(/download/ig, '')
      .replace(/[-–—_()]+/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return withoutPlatform || raw || platform || 'Download';
  };

  const registerAction = action => {
    const id = `action-${++linkRegistryId}`;
    linkRegistry.set(id, action);
    return id;
  };

  const renderDirectAction = (game, link, group = null) => {
    const isSource = link.type === 'source';
    const label = group ? group.label : cleanDownloadLabel(game, link);
    const icon = getReleaseIcon(game, link);
    const action = {
      kind: 'direct',
      gameId: game.id,
      gameTitle: getDisplayTitle(game),
      warning: !isSource && isMatureGame(game),
      warningText: game.contentWarning || defaultWarning,
      url: link.url,
      label,
      platform: link.platform || label
    };
    const actionId = registerAction(action);
    return `<a class="release-link${isSource ? ' source-link' : ''}${action.warning ? ' mature-link' : ''}" href="${escapeHTML(link.url)}" target="_blank" rel="noopener" data-action-id="${escapeHTML(actionId)}" aria-label="${escapeHTML(`${isSource ? 'Open source for' : 'Open download for'} ${game.title}: ${label}`)}" title="${escapeHTML(label)}">
      <span class="release-icon">${icon ? `<img src="${escapeHTML(icon)}" alt="" aria-hidden="true">` : `<span aria-hidden="true">${isSource ? '&lt;/&gt;' : '↗'}</span>`}</span>
      <span class="release-copy"><strong>${escapeHTML(label)}</strong></span>
    </a>`;
  };

  const renderVariantAction = (game, platform, links) => {
    const first = links[0];
    const label = platform || cleanDownloadLabel(game, first, false);
    const icon = getReleaseIcon(game, { ...first, platform: platform || first.platform });
    const action = {
      kind: 'variants',
      gameId: game.id,
      gameTitle: getDisplayTitle(game),
      warning: isMatureGame(game),
      warningText: game.contentWarning || defaultWarning,
      platform: label,
      variants: links.map(link => ({
        label: getVariantLabel(link, label),
        url: link.url,
        platform: link.platform || label
      }))
    };
    const actionId = registerAction(action);
    return `<button class="release-link variant-link${action.warning ? ' mature-link' : ''}" type="button" data-action-id="${escapeHTML(actionId)}" aria-label="Choose version for ${escapeHTML(game.title)}: ${escapeHTML(label)}" title="${escapeHTML(`Choose ${label} version`)}">
      <span class="release-icon">${icon ? `<img src="${escapeHTML(icon)}" alt="" aria-hidden="true">` : '<span aria-hidden="true">↗</span>'}</span>
      <span class="release-copy"><strong>${escapeHTML(label)}</strong><em>Choose version</em></span>
    </button>`;
  };

  const renderLinks = game => {
    const links = game.links || [];
    if (!links.length) return '';
    const downloads = links.filter(link => link.type !== 'source');
    const sources = links.filter(link => link.type === 'source');
    const groups = new Map();
    downloads.forEach(link => {
      const key = normalize(link.platform || link.label || link.url);
      if (!groups.has(key)) groups.set(key, { platform: link.platform || link.label || 'Download', links: [] });
      groups.get(key).links.push(link);
    });

    const releaseItems = [...groups.values()].map(group => {
      if (group.links.length > 1) return renderVariantAction(game, group.platform, group.links);
      return renderDirectAction(game, group.links[0]);
    });
    const sourceItems = sources.map(link => renderDirectAction(game, link));
    const items = [...releaseItems, ...sourceItems];
    const layoutClass = (items.length === 2 && releaseItems.length === 1 && sourceItems.length === 1) ? ' source-stack' : '';
    const layoutAttr = layoutClass ? ' data-layout="download-source-stack"' : '';
    return `<div class="release-stack balanced-grid${layoutClass}" data-count="${items.length}"${layoutAttr} aria-label="Downloads and source links">${items.join('')}</div>`;
  };

  const renderDetailsButton = (game, existingActionId = '') => {
    const actionId = existingActionId || registerAction({ kind: 'details', gameId: game.id, game });
    const linkCount = (game.links || []).length;
    const label = linkCount ? 'More details and downloads' : 'More details';
    return `<div class="details-stack">
      <button class="details-button" type="button" data-action-id="${escapeHTML(actionId)}" aria-label="Open full details for ${escapeHTML(getDisplayTitle(game))}">
        <span>${escapeHTML(label)}</span>
        <small>screenshots · platforms · notes</small>
      </button>
    </div>`;
  };

  const renderGameCard = game => {
    const image = (game.screenshots && game.screenshots[0]) || game.icon || 'img/avatar.png';
    const displayTitle = getDisplayTitle(game);
    const icon = game.icon ? `<span class="game-icon"><img src="${escapeHTML(game.icon)}" alt="${escapeHTML(displayTitle)} icon"></span>` : '';
    const type = getProjectType(game);
    const matureBadge = isMatureGame(game) ? '<span class="mature-badge">18+ / NSFW</span>' : '';
    const detailsActionId = registerAction({ kind: 'details', gameId: game.id, game });
    return `
      <article class="game-card" data-game-id="${escapeHTML(game.id)}" data-project-type="${escapeHTML(type)}">
        <button class="game-media game-media-button" type="button" data-action-id="${escapeHTML(detailsActionId)}" aria-label="Open details for ${escapeHTML(displayTitle)}">
          <img src="${escapeHTML(image)}" alt="Screenshot from ${escapeHTML(displayTitle)}" loading="lazy">
          ${icon}
          ${matureBadge}
          <span class="kind-badge ${escapeHTML(type)}">${escapeHTML(typeLabel(type))}</span>
        </button>
        <div class="card-body">
          <div class="title-wrap${game.originalTitle ? ' has-subtitle' : ''}">${renderTitle(game)}</div>
          ${renderFacts(game)}
          ${renderPlatformChips(game)}
          <p class="card-summary">${escapeHTML(game.summary)}</p>
          ${renderDetailsButton(game, detailsActionId)}
        </div>
      </article>`;
  };

  const resetRowSizing = view => {
    $$('.game-card', view).forEach(card => {
      ['.title-wrap', '.game-facts', '.platform-row', '.card-summary', '.details-stack'].forEach(selector => {
        const node = $(selector, card);
        if (node) node.style.minHeight = '';
      });
    });
  };

  const equalizeGameRows = view => {
    if (!view) return;
    const cards = $$('.game-card', view);
    resetRowSizing(view);
    if (cards.length < 2) return;

    const rows = [];
    cards.forEach(card => {
      const top = Math.round(card.offsetTop);
      let row = rows.find(item => Math.abs(item.top - top) < 6);
      if (!row) {
        row = { top, cards: [] };
        rows.push(row);
      }
      row.cards.push(card);
    });

    const titleSelector = '.title-wrap';
    const fixedSelectors = ['.game-facts', '.platform-row', '.card-summary', '.details-stack'];
    rows.forEach(row => {
      if (row.cards.length < 2) return;

      const titleHeights = row.cards.map(card => {
        const node = $(titleSelector, card);
        return node ? Math.ceil(node.scrollHeight) : 0;
      });
      const maxTitle = Math.max(...titleHeights);
      const minTitle = Math.min(...titleHeights.filter(Boolean));
      const titleNeedsAlignment = maxTitle > 44 && (maxTitle - minTitle) > 6;
      if (titleNeedsAlignment) {
        row.cards.forEach(card => {
          const node = $(titleSelector, card);
          if (node) node.style.minHeight = `${maxTitle}px`;
        });
      }

      fixedSelectors.forEach(selector => {
        const max = Math.max(...row.cards.map(card => {
          const node = $(selector, card);
          return node ? Math.ceil(node.scrollHeight) : 0;
        }));
        if (!max) return;
        row.cards.forEach(card => {
          const node = $(selector, card);
          if (node) node.style.minHeight = `${max}px`;
        });
      });
    });
  };

  let activeGamesView = null;
  let equalizeFrame = 0;
  const scheduleRowEqualize = view => {
    if (!view) return;
    activeGamesView = view;
    cancelAnimationFrame(equalizeFrame);
    equalizeFrame = requestAnimationFrame(() => equalizeGameRows(view));
  };

  window.addEventListener('resize', () => scheduleRowEqualize(activeGamesView));

  const syncTypeCheckboxes = () => {
    $$('[data-type-checkbox]').forEach(checkbox => {
      checkbox.checked = state.types.includes(checkbox.value);
    });
  };

  const renderLibrary = view => {
    const games = getScopedGames(view);
    const filtered = filterGames(games);
    linkRegistry.clear();
    linkRegistryId = 0;
    view.innerHTML = filtered.map(renderGameCard).join('');
    scheduleRowEqualize(view);
    $$('img', view).forEach(image => {
      if (!image.complete) image.addEventListener('load', () => scheduleRowEqualize(view), { once: true });
    });

    const count = $('[data-result-count]');
    if (count) {
      const original = games.filter(game => getProjectType(game) === 'original').length;
      const homebrew = games.filter(game => getProjectType(game) === 'homebrew').length;
      const opendingux = games.filter(game => getProjectType(game) === 'opendingux').length;
      count.textContent = `${filtered.length} of ${games.length} projects · ${original} original · ${homebrew} homebrew ports · ${opendingux} OpenDingux ports`;
    }

    const empty = $('[data-empty]');
    if (empty) empty.classList.toggle('is-visible', filtered.length === 0);
    syncTypeCheckboxes();
  };

  const ensureModal = () => {
    let modal = $('[data-modal]');
    if (modal) return modal;
    modal = document.createElement('div');
    modal.className = 'modal-backdrop';
    modal.hidden = true;
    modal.dataset.modal = '';
    modal.innerHTML = `
      <section class="modal-card" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <button class="modal-close" type="button" data-modal-close aria-label="Close dialog">×</button>
        <h2 id="modal-title" data-modal-title></h2>
        <div class="modal-body" data-modal-body></div>
        <div class="modal-actions" data-modal-actions></div>
      </section>`;
    document.body.appendChild(modal);
    modal.addEventListener('click', event => {
      if (event.target === modal || event.target.matches('[data-modal-close]')) closeModal();
    });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && !modal.hidden && !isGalleryOpen()) closeModal();
    });
    return modal;
  };

  const stopModalMedia = modal => {
    if (!modal) return;
    $$('video', modal).forEach(video => {
      try {
        video.pause();
        video.currentTime = 0;
      } catch (error) {
        // Ignore browsers that block programmatic media control.
      }
    });
    $$('iframe', modal).forEach(frame => {
      frame.src = 'about:blank';
    });
  };

  const closeModal = () => {
    const modal = $('[data-modal]');
    if (!modal) return;
    stopModalMedia(modal);
    modal.hidden = true;
    $('[data-modal-title]', modal).textContent = '';
    $('[data-modal-body]', modal).innerHTML = '';
    $('[data-modal-actions]', modal).innerHTML = '';
    document.body.classList.remove('modal-open');
  };

  const showModal = ({ title, body, actions = '', wide = false }) => {
    const modal = ensureModal();
    stopModalMedia(modal);
    const card = $('.modal-card', modal);
    if (card) card.classList.toggle('is-wide', Boolean(wide));
    $('[data-modal-title]', modal).textContent = title;
    $('[data-modal-body]', modal).innerHTML = body;
    $('[data-modal-actions]', modal).innerHTML = actions;
    modal.hidden = false;
    document.body.classList.add('modal-open');
    const first = $('button, a', modal);
    if (first) first.focus();
  };

  const getMainMedia = game => (game.hero || (game.screenshots && game.screenshots[0]) || game.icon || 'img/avatar.png');

  const getScreenshots = game => [...new Set([getMainMedia(game), ...toArray(game.screenshots)].filter(Boolean))];

  let galleryState = { images: [], index: 0, title: '', lastFocus: null, startX: 0, startY: 0 };

  const isGalleryOpen = () => {
    const gallery = $('[data-fullscreen-gallery]');
    return Boolean(gallery && !gallery.hidden);
  };

  const ensureFullscreenGallery = () => {
    let gallery = $('[data-fullscreen-gallery]');
    if (gallery) return gallery;
    gallery = document.createElement('div');
    gallery.className = 'fullscreen-gallery';
    gallery.hidden = true;
    gallery.dataset.fullscreenGallery = '';
    gallery.innerHTML = `
      <button class="gallery-close" type="button" data-gallery-close aria-label="Close image gallery">×</button>
      <button class="gallery-nav gallery-prev" type="button" data-gallery-prev aria-label="Previous screenshot">‹</button>
      <figure class="gallery-stage" data-gallery-stage>
        <img src="" alt="" data-gallery-image>
        <figcaption data-gallery-caption></figcaption>
      </figure>
      <button class="gallery-nav gallery-next" type="button" data-gallery-next aria-label="Next screenshot">›</button>`;
    document.body.appendChild(gallery);
    gallery.addEventListener('click', event => {
      if (event.target === gallery || event.target.matches('[data-gallery-close]')) closeFullscreenGallery();
      if (event.target.matches('[data-gallery-prev]')) showGalleryOffset(-1);
      if (event.target.matches('[data-gallery-next]')) showGalleryOffset(1);
    });
    gallery.addEventListener('touchstart', event => {
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) return;
      galleryState.startX = touch.clientX;
      galleryState.startY = touch.clientY;
    }, { passive: true });
    gallery.addEventListener('touchend', event => {
      const touch = event.changedTouches && event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - galleryState.startX;
      const dy = touch.clientY - galleryState.startY;
      if (Math.abs(dx) > 42 && Math.abs(dx) > Math.abs(dy) * 1.25) showGalleryOffset(dx < 0 ? 1 : -1);
    }, { passive: true });
    document.addEventListener('keydown', event => {
      if (!isGalleryOpen()) return;
      if (event.key === 'Escape') closeFullscreenGallery();
      if (event.key === 'ArrowLeft') showGalleryOffset(-1);
      if (event.key === 'ArrowRight') showGalleryOffset(1);
    });
    return gallery;
  };

  const renderFullscreenGallery = () => {
    const gallery = ensureFullscreenGallery();
    const image = $('[data-gallery-image]', gallery);
    const caption = $('[data-gallery-caption]', gallery);
    const current = galleryState.images[galleryState.index] || '';
    if (image) {
      image.src = current;
      image.alt = `${galleryState.title || 'Screenshot'} — image ${galleryState.index + 1} of ${galleryState.images.length}`;
    }
    if (caption) caption.textContent = `${galleryState.title || 'Screenshot'} · ${galleryState.index + 1} / ${galleryState.images.length}`;
    gallery.classList.toggle('is-single', galleryState.images.length < 2);
  };

  const showGalleryOffset = offset => {
    if (!galleryState.images.length) return;
    galleryState.index = (galleryState.index + offset + galleryState.images.length) % galleryState.images.length;
    renderFullscreenGallery();
  };

  const showFullscreenGallery = ({ images, index = 0, title = '' }) => {
    const safeImages = toArray(images).filter(Boolean);
    if (!safeImages.length) return;
    galleryState = {
      ...galleryState,
      images: safeImages,
      index: Math.max(0, Math.min(index, safeImages.length - 1)),
      title,
      lastFocus: document.activeElement
    };
    const gallery = ensureFullscreenGallery();
    renderFullscreenGallery();
    gallery.hidden = false;
    document.body.classList.add('modal-open');
    const close = $('[data-gallery-close]', gallery);
    if (close) close.focus();
  };

  const closeFullscreenGallery = () => {
    const gallery = $('[data-fullscreen-gallery]');
    if (!gallery || gallery.hidden) return;
    gallery.hidden = true;
    const modal = $('[data-modal]');
    if (!modal || modal.hidden) document.body.classList.remove('modal-open');
    if (galleryState.lastFocus && typeof galleryState.lastFocus.focus === 'function') galleryState.lastFocus.focus();
  };

  const getVideos = game => {
    const raw = game.videos || game.video || game.youtube || [];
    if (Array.isArray(raw)) {
      return raw
        .map(item => typeof item === 'string' ? { url: item } : item)
        .filter(item => item && item.url);
    }
    if (typeof raw === 'string' && raw.trim()) return [{ url: raw.trim() }];
    if (raw && typeof raw === 'object' && raw.url) return [raw];
    return [];
  };

  const getYouTubeId = url => {
    try {
      const parsed = new URL(String(url));
      const host = parsed.hostname.replace(/^www\./, '').replace(/^m\./, '');
      if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0] || '';
      if (!host.endsWith('youtube.com') && !host.endsWith('youtube-nocookie.com')) return '';
      if (parsed.searchParams.get('v')) return parsed.searchParams.get('v');
      const parts = parsed.pathname.split('/').filter(Boolean);
      const marker = ['embed', 'shorts', 'live', 'v'].find(item => parts.includes(item));
      if (marker) return parts[parts.indexOf(marker) + 1] || '';
      return '';
    } catch (error) {
      const match = String(url).match(/(?:youtu\.be\/|youtube(?:-nocookie)?\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/|v\/))([A-Za-z0-9_-]{6,})/i);
      return match ? match[1] : '';
    }
  };

  const getVideoEmbed = video => {
    const url = String(video.url || '');
    const title = escapeHTML(video.title || 'Gameplay video');
    const youtubeId = getYouTubeId(url);
    const vimeo = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
    if (youtubeId) return `<iframe class="detail-video" src="https://www.youtube-nocookie.com/embed/${escapeHTML(youtubeId)}" title="${title}" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`;
    if (vimeo) return `<iframe class="detail-video" src="https://player.vimeo.com/video/${escapeHTML(vimeo[1])}" title="${title}" loading="lazy" allow="autoplay; fullscreen; picture-in-picture" allowfullscreen></iframe>`;
    return `<video class="detail-video" controls preload="metadata" src="${escapeHTML(url)}"></video>`;
  };

  const renderDetailMedia = game => {
    const screenshots = getScreenshots(game);
    const videos = getVideos(game);
    const title = getDisplayTitle(game);
    const galleryAction = index => registerAction({ kind: 'gallery', images: screenshots, index, title });
    const matureBadge = isMatureGame(game) ? '<span class="mature-badge detail-media-badge">18+ / NSFW</span>' : '';
    const hero = videos.length
      ? getVideoEmbed(videos[0])
      : `<button class="detail-image-button" type="button" data-action-id="${escapeHTML(galleryAction(0))}" aria-label="Open screenshot gallery for ${escapeHTML(title)}">
          <img src="${escapeHTML(getMainMedia(game))}" alt="Main graphic for ${escapeHTML(title)}">
        </button>`;
    const extraVideos = videos.slice(1);
    const showScreenshotGallery = videos.length ? screenshots.length : screenshots.length > 1;
    return `<div class="detail-media-panel">
      <figure class="detail-hero-image${videos.length ? ' has-video' : ''}">
        ${hero}
        ${matureBadge}
      </figure>
      ${showScreenshotGallery ? `<div class="detail-gallery" aria-label="Screenshots">${screenshots.map((src, index) => `
        <button class="detail-gallery-thumb" type="button" data-action-id="${escapeHTML(galleryAction(index))}" aria-label="Open screenshot ${index + 1} of ${escapeHTML(title)}"><img src="${escapeHTML(src)}" alt="Screenshot ${index + 1} from ${escapeHTML(title)}" loading="lazy"></button>`).join('')}</div>` : ''}
      ${extraVideos.length ? `<div class="detail-videos">${extraVideos.map(getVideoEmbed).join('')}</div>` : ''}
    </div>`;
  };

  const renderDetailModal = game => {
    const type = getProjectType(game);
    const warning = isMatureGame(game)
      ? `<div class="detail-warning"><strong>18+ / NSFW</strong><span>${escapeHTML(game.contentWarning || defaultWarning)}</span></div>`
      : '';
    const downloads = renderLinks(game) || '<p class="detail-muted">No public download link is listed for this entry.</p>';
    return `<div class="detail-layout">
      ${renderDetailMedia(game)}
      <section class="detail-info">
        <div class="detail-head">
          <span class="kind-badge ${escapeHTML(type)}">${escapeHTML(typeLabel(type))}</span>
        </div>
        ${renderTitle(game)}
        ${warning}
        ${renderFacts(game)}
        ${renderPlatformChips(game)}
        <p class="detail-summary">${escapeHTML(game.summary || '')}</p>
        <h3 class="detail-section-title">Downloads and source</h3>
        ${downloads}
      </section>
    </div>`;
  };

  const showDetailsModal = game => {
    showModal({
      title: getDisplayTitle(game),
      body: renderDetailModal(game),
      actions: '<button class="button" type="button" data-modal-close>Close</button>',
      wide: true
    });
  };

  const showVariantModal = action => {
    showModal({
      title: 'Choose version',
      body: `
        <p class="modal-kicker">${escapeHTML(action.gameTitle)}</p>
        <p>Select the ${escapeHTML(action.platform)} release you want.</p>
        <div class="variant-list">${action.variants.map(variant => `
          <a class="modal-choice" href="${escapeHTML(variant.url)}" target="_blank" rel="noopener" data-modal-choice>
            <span>${escapeHTML(variant.label)}</span>
            <small>${escapeHTML(variant.platform || action.platform)}</small>
          </a>`).join('')}</div>`,
      actions: '<button class="button" type="button" data-modal-close>Cancel</button>'
    });
  };

  const runAction = action => {
    if (!action) return;
    if (action.kind === 'details') {
      showDetailsModal(action.game);
      return;
    }
    if (action.kind === 'gallery') {
      showFullscreenGallery(action);
      return;
    }
    if (action.warning) {
      showWarningModal(action);
      return;
    }
    if (action.kind === 'variants') {
      showVariantModal(action);
      return;
    }
    window.open(action.url, '_blank', 'noopener');
  };

  const showWarningModal = action => {
    const safeAction = { ...action, warning: false };
    const continueId = registerAction(safeAction);
    showModal({
      title: 'Offensive content warning',
      body: `
        <p class="modal-kicker">${escapeHTML(action.gameTitle)}</p>
        <p>${escapeHTML(action.warningText || defaultWarning)}</p>`,
      actions: `
        <button class="button" type="button" data-modal-close>Cancel</button>
        <button class="button primary" type="button" data-action-id="${escapeHTML(continueId)}" data-modal-continue>Continue</button>`
    });
  };

  const applyPlatformFilter = platformName => {
    const requestedPlatform = canonicalPlatformName(platformName || 'all');
    const nextPlatform = requestedPlatform === state.platform ? 'all' : requestedPlatform;
    state.platform = nextPlatform;
    updateUrlQuery();
    const select = $('[data-platform-filter]');
    if (select) select.value = nextPlatform;
    const view = $('[data-games-view]');
    if (view) {
      renderLibrary(view);
      window.requestAnimationFrame(() => {
        const toolbar = $('.catalog-toolbar') || view;
        if (toolbar && typeof toolbar.scrollIntoView === 'function') {
          toolbar.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }
      });
    }
  };

  const initActionDelegation = () => {
    document.addEventListener('click', event => {
      const modalChoice = event.target.closest('[data-modal-choice]');
      if (modalChoice) {
        closeModal();
        return;
      }

      const platformTrigger = event.target.closest('[data-platform-filter-action]');
      if (platformTrigger) {
        event.preventDefault();
        event.stopPropagation();
        applyPlatformFilter(platformTrigger.dataset.platformFilterAction);
        closeModal();
        return;
      }

      const trigger = event.target.closest('[data-action-id]');
      if (!trigger) return;
      const action = linkRegistry.get(trigger.dataset.actionId);
      if (!action) return;
      event.preventDefault();

      if (trigger.matches('[data-modal-continue]')) {
        closeModal();
        runAction(action);
        return;
      }

      runAction(action);
    });
  };

  const initLibrary = () => {
    const view = $('[data-games-view]');
    if (!view) return;

    const scopedGames = getScopedGames(view);
    const search = $('[data-search-input]');
    const genre = $('[data-genre-filter]');
    const platform = $('[data-platform-filter]');
    const language = $('[data-language-filter]');
    const sort = $('[data-sort]');

    setOptions(genre, uniqueSorted(scopedGames.map(game => game.genre)), 'All genres', state.genre);
    setOptions(platform, uniqueSorted(scopedGames.flatMap(game => toCanonicalPlatformArray(game.platforms))), 'All platforms', state.platform);
    setOptions(language, uniqueSorted(scopedGames.flatMap(game => toArray(game.languages))), 'All languages', state.language);
    if (sort && [...sort.options].some(option => option.value === state.sort)) sort.value = state.sort;

    if (search) {
      search.value = state.query;
      search.addEventListener('input', event => {
        state.query = event.target.value;
        updateUrlQuery();
        renderLibrary(view);
      });
    }
    if (genre) genre.addEventListener('change', event => { state.genre = event.target.value; updateUrlQuery(); renderLibrary(view); });
    if (platform) platform.addEventListener('change', event => { state.platform = canonicalPlatformName(event.target.value); updateUrlQuery(); renderLibrary(view); });
    if (language) language.addEventListener('change', event => { state.language = event.target.value; updateUrlQuery(); renderLibrary(view); });
    if (sort) sort.addEventListener('change', event => { state.sort = event.target.value; updateUrlQuery(); renderLibrary(view); });

    $$('[data-type-checkbox]').forEach(checkbox => {
      checkbox.addEventListener('change', () => {
        state.types = $$('[data-type-checkbox]')
          .filter(input => input.checked)
          .map(input => input.value)
          .filter(value => validTypes.includes(value));
        updateUrlQuery();
        renderLibrary(view);
      });
    });

    renderLibrary(view);
  };

  const initHome = () => {
    const stats = $('[data-home-stats]');
    if (stats) {
      const homebrew = state.games.filter(game => getProjectType(game) === 'homebrew').length;
      const opendingux = state.games.filter(game => getProjectType(game) === 'opendingux').length;
      const original = state.games.filter(game => getProjectType(game) === 'original').length;
      const platforms = uniqueSorted(state.games.flatMap(game => toCanonicalPlatformArray(game.platforms))).length;
      stats.innerHTML = [
        ['Projects catalogued', state.games.length],
        ['Original games', original],
        ['Homebrew ports', homebrew],
        ['OpenDingux ports', opendingux],
        ['Platforms covered', platforms]
      ].map(([label, value]) => `<div class="stat-card"><strong>${value}</strong><p>${label}</p></div>`).join('');
    }

    const highlights = $('[data-home-highlights]');
    if (highlights) {
      const configuredPicks = Array.isArray(state.meta.homePicks) ? state.meta.homePicks : [];
      const fallbackPicks = ['opendingux-overheated', 'retro-sinvasion', 'retro-crafti', 'retro-crazybird'];
      const pickIds = configuredPicks.length ? configuredPicks : fallbackPicks;
      const selected = pickIds
        .map(id => state.games.find(game => game.id === id))
        .filter(Boolean);
      linkRegistry.clear();
      linkRegistryId = 0;
      highlights.innerHTML = selected.map(renderGameCard).join('');
      scheduleRowEqualize(highlights);
      $$('img', highlights).forEach(image => {
        if (!image.complete) image.addEventListener('load', () => scheduleRowEqualize(highlights), { once: true });
      });
    }
  };

  document.addEventListener('DOMContentLoaded', async () => {
    initNav();
    initActionDelegation();
    try {
      await fetchGames();
      initHome();
      initLibrary();
    } catch (error) {
      console.error(error);
      const view = $('[data-games-view]');
      if (view) view.innerHTML = `<div class="info-card"><h3>Catalog failed to load</h3><p>${escapeHTML(error.message)}</p></div>`;
    }
  });
})();
