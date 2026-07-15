'use strict';

const FINAL = new Set(['FT', 'AET', 'PEN']);
const LIVE = new Set(['1H', 'HT', '2H', 'ET', 'P', 'BT', 'LIVE']);
const state = {
  data: null,
  previous: new Map(),
  view: 'matches',
  filter: 'all',
  favourites: new Set(JSON.parse(localStorage.getItem('wc-favourites') || '[]')),
  countdownTimer: null,
  pollingTimer: null,
  toastTimer: null
};

const el = (id) => document.getElementById(id);
const escapeHtml = (value = '') => String(value).replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
function isLive(fixture) { return LIVE.has(fixture.status.short); }
function isFinal(fixture) { return FINAL.has(fixture.status.short); }
function isUpcoming(fixture) { return !isLive(fixture) && !isFinal(fixture); }
function formatDate(iso, options = {}) { return new Intl.DateTimeFormat('en-GB', { timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone, ...options }).format(new Date(iso)); }
function dayLabel(iso) {
  const date = new Date(iso), today = new Date(), tomorrow = new Date(); tomorrow.setDate(today.getDate() + 1);
  const key = (d) => formatDate(d, { year: 'numeric', month: '2-digit', day: '2-digit' });
  if (key(date) === key(today)) return 'Today';
  if (key(date) === key(tomorrow)) return 'Tomorrow';
  return formatDate(date, { weekday: 'long', day: 'numeric', month: 'long' });
}
function crest(team, size = 'mini') {
  if (team.logo) return `<span class="${size === 'large' ? 'team-crest' : 'mini-crest'}"><img src="${escapeHtml(team.logo)}" alt="" loading="lazy"></span>`;
  return `<span class="${size === 'large' ? 'team-crest' : 'mini-crest'}" aria-hidden="true">${escapeHtml(team.flag || '⚽')}</span>`;
}
function scoreText(f) { return `${f.goals.home ?? '–'}–${f.goals.away ?? '–'}`; }
function statusText(f) {
  if (isLive(f)) { if (f.status.short === 'HT') return 'Half-time'; return `${f.status.elapsed ?? ''}${f.status.extra ? `+${f.status.extra}` : ''}' LIVE`; }
  if (isFinal(f)) { if (f.status.short === 'PEN' && f.score?.penalty?.home != null) return `Pens ${f.score.penalty.home}–${f.score.penalty.away}`; return f.status.short; }
  return formatDate(f.date, { hour: '2-digit', minute: '2-digit' });
}
function featuredFixture() {
  const fixtures = state.data?.fixtures || [];
  return fixtures.find(isLive) || fixtures.find((f) => isUpcoming(f) && new Date(f.date) > new Date()) || [...fixtures].reverse().find(isFinal) || fixtures[0];
}
function renderHero() {
  const f = featuredFixture(); if (!f) return;
  const live = isLive(f), final = isFinal(f), date = new Date(f.date);
  let centre = `<strong>${scoreText(f)}</strong><span>${statusText(f)}</span>`;
  if (!live && !final && date > new Date()) centre = `<strong class="countdown" id="countdown">--:--:--</strong><span>${formatDate(f.date, { weekday: 'short', hour: '2-digit', minute: '2-digit' })}</span>`;
  el('hero').classList.remove('skeleton');
  el('hero').innerHTML = `<div class="hero-top"><span class="status-pill ${live ? 'live' : ''}">${live ? 'Live now' : final ? 'Latest result' : 'Next match'}</span><span>${escapeHtml(f.round)} · ${escapeHtml(f.city || f.venue)}</span></div><div class="hero-match"><div class="hero-team">${crest(f.home, 'large')}<span class="team-name">${escapeHtml(f.home.name)}</span></div><div class="hero-score">${centre}</div><div class="hero-team">${crest(f.away, 'large')}<span class="team-name">${escapeHtml(f.away.name)}</span></div></div>`;
  clearInterval(state.countdownTimer);
  if (!live && !final && date > new Date()) {
    const tick = () => { const node = el('countdown'); if (!node) return; const diff = Math.max(0, date - Date.now()), days = Math.floor(diff/86400000), hours = Math.floor((diff%86400000)/3600000), mins = Math.floor((diff%3600000)/60000), secs = Math.floor((diff%60000)/1000); node.textContent = days > 0 ? `${days}d ${String(hours).padStart(2,'0')}h` : `${String(hours).padStart(2,'0')}:${String(mins).padStart(2,'0')}:${String(secs).padStart(2,'0')}`; };
    tick(); state.countdownTimer = setInterval(tick, 1000);
  }
}
function favouriteButton(f) { const active = state.favourites.has(f.home.id) || state.favourites.has(f.away.id); return `<button class="star-button ${active ? 'active' : ''}" data-favourite-match="${f.id}" type="button" aria-label="Add teams to favourites">★</button>`; }
function matchCard(f) { return `<article class="match-card ${state.data.justFinished?.includes(f.id) ? 'just-finished' : ''}" data-match-id="${f.id}">${favouriteButton(f)}<div class="card-team">${crest(f.home)}<div class="card-team-name">${escapeHtml(f.home.name)}</div></div><div class="card-score"><strong>${scoreText(f)}</strong><span class="${isLive(f) ? 'live-text' : ''}">${escapeHtml(statusText(f))}</span></div><div class="card-team">${crest(f.away)}<div class="card-team-name">${escapeHtml(f.away.name)}</div></div><div class="match-meta">${escapeHtml(f.round)} · ${escapeHtml(f.venue)}</div></article>`; }
function filteredFixtures() {
  const fixtures = state.data?.fixtures || [];
  if (state.filter === 'live') return fixtures.filter(isLive);
  if (state.filter === 'finished') return fixtures.filter(isFinal).slice(-20).reverse();
  if (state.filter === 'upcoming') return fixtures.filter(isUpcoming).filter((f) => new Date(f.date) >= new Date(Date.now()-3600000)).slice(0,24);
  return [...new Map([...fixtures.filter(isFinal).slice(-8), ...fixtures.filter(isLive), ...fixtures.filter(isUpcoming).filter((f) => new Date(f.date) >= new Date(Date.now()-3600000)).slice(0,12)].map((f) => [f.id,f])).values()].sort((a,b) => new Date(a.date)-new Date(b.date));
}
function renderMatches() {
  const fixtures = filteredFixtures();
  if (!fixtures.length) { el('matchesList').innerHTML = '<div class="empty-state"><strong>No matches here yet</strong>Try another filter.</div>'; return; }
  const groups = new Map(); for (const f of fixtures) { const key = dayLabel(f.date); if (!groups.has(key)) groups.set(key,[]); groups.get(key).push(f); }
  el('matchesList').innerHTML = [...groups.entries()].map(([label,games]) => `<div class="date-group"><div class="date-label">${escapeHtml(label)}</div>${games.map(matchCard).join('')}</div>`).join('');
}
function roundRank(round) { const v = round.toLowerCase(); if(v.includes('round of 32'))return 1;if(v.includes('round of 16'))return 2;if(v.includes('quarter'))return 3;if(v.includes('semi'))return 4;if(v.includes('3rd')||v.includes('third'))return 5;if(v==='final'||v.endsWith(' final'))return 6;return 0; }
function renderBracket() {
  const knockout=(state.data?.fixtures||[]).filter((f)=>roundRank(f.round)>0).sort((a,b)=>roundRank(a.round)-roundRank(b.round)||new Date(a.date)-new Date(b.date)), rounds=new Map();
  for(const f of knockout){if(!rounds.has(f.round))rounds.set(f.round,[]);rounds.get(f.round).push(f);}
  el('bracketList').innerHTML=[...rounds.entries()].map(([round,games])=>`<section class="bracket-round"><h3>${escapeHtml(round)}</h3>${games.map((f)=>`<div class="bracket-match"><div class="bracket-line ${f.home.winner?'winner':''}"><span>${escapeHtml(f.home.flag||'⚽')}</span><span>${escapeHtml(f.home.name)}</span><b>${f.goals.home??'–'}</b></div><div class="bracket-line ${f.away.winner?'winner':''}"><span>${escapeHtml(f.away.flag||'⚽')}</span><span>${escapeHtml(f.away.name)}</span><b>${f.goals.away??'–'}</b></div><div class="bracket-time">${escapeHtml(statusText(f))} · ${formatDate(f.date,{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'})}</div></div>`).join('')}</section>`).join('')||'<div class="empty-state"><strong>Bracket unavailable</strong>It appears when knockout fixtures are loaded.</div>';
}
function renderStandings() {
  const groups=state.data?.standings||[];
  el('standingsList').innerHTML=groups.map((g)=>`<section class="group-card"><h3>${escapeHtml(g.group)}</h3><table class="standings-table"><thead><tr><th>#</th><th>Team</th><th>P</th><th>W</th><th>D</th><th>L</th><th>GD</th><th>Pts</th></tr></thead><tbody>${g.rows.map((r)=>`<tr><td>${r.rank}</td><td class="team-cell"><span class="table-team">${r.team.logo?`<img src="${escapeHtml(r.team.logo)}" alt="">`:''}${escapeHtml(r.team.name)}</span></td><td>${r.played}</td><td>${r.win}</td><td>${r.draw}</td><td>${r.lose}</td><td>${r.goalsDiff}</td><td><strong>${r.points}</strong></td></tr>`).join('')}</tbody></table></section>`).join('')||'<div class="empty-state"><strong>Standings need live data</strong>Add your API key to load all 12 groups.</div>';
}
function renderFavourites(){const fixtures=(state.data?.fixtures||[]).filter((f)=>state.favourites.has(f.home.id)||state.favourites.has(f.away.id));el('favouritesList').innerHTML=fixtures.length?fixtures.map(matchCard).join(''):'<div class="empty-state"><strong>No favourite teams yet</strong>Tap the star on any match to follow both teams.</div>';}
function updateConnection(){const dot=el('connectionDot'),date=state.data?.lastUpdated?formatDate(state.data.lastUpdated,{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'';dot.className=`connection-dot ${state.data?.connected?'online':state.data?.mode==='demo'?'':'offline'}`;el('connectionText').textContent=state.data?.mode==='demo'?`Demo mode · updated ${date}`:state.data?.connected?`Live · updated ${date}`:`Reconnecting · ${state.data?.providerMessage||''}`;}
function renderAll(){if(!state.data)return;updateConnection();renderHero();renderMatches();renderBracket();renderStandings();renderFavourites();}
function showToast(message){const toast=el('toast');toast.textContent=message;toast.classList.add('show');clearTimeout(state.toastTimer);state.toastTimer=setTimeout(()=>toast.classList.remove('show'),4500);}
function notifyFinal(f){const message=`${f.home.name} ${f.goals.home}–${f.goals.away} ${f.away.name}`;showToast(`Full time: ${message}`);if(Notification.permission==='granted')new Notification('Full-time result',{body:message,icon:'/icon.svg',tag:`fixture-${f.id}`});}
function consume(next){const incoming=new Map(next.fixtures.map((f)=>[f.id,f]));if(state.data)for(const[id,f]of incoming){const before=state.previous.get(id);if(before&&!isFinal(before)&&isFinal(f))notifyFinal(f);}state.data=next;state.previous=incoming;renderAll();}
async function loadScores(){try{const response=await fetch(`/api/state?t=${Date.now()}`,{cache:'no-store'});if(!response.ok)throw new Error('Unable to load scores');consume(await response.json());}catch(error){el('connectionText').textContent=error.message;el('connectionDot').className='connection-dot offline';}}
function startPolling(){clearInterval(state.pollingTimer);loadScores();state.pollingTimer=setInterval(loadScores,15000);document.addEventListener('visibilitychange',()=>{if(!document.hidden)loadScores();});}
function setView(view){state.view=view;document.querySelectorAll('.tab').forEach((b)=>b.classList.toggle('active',b.dataset.view===view));document.querySelectorAll('.view').forEach((n)=>n.classList.remove('active'));el(`${view}View`).classList.add('active');}
document.addEventListener('click',async(event)=>{const tab=event.target.closest('[data-view]');if(tab)setView(tab.dataset.view);const filter=event.target.closest('[data-filter]');if(filter){state.filter=filter.dataset.filter;document.querySelectorAll('[data-filter]').forEach((b)=>b.classList.toggle('active',b===filter));renderMatches();}const star=event.target.closest('[data-favourite-match]');if(star){const f=state.data.fixtures.find((x)=>x.id===Number(star.dataset.favouriteMatch));if(f){const already=state.favourites.has(f.home.id)||state.favourites.has(f.away.id);for(const id of[f.home.id,f.away.id])already?state.favourites.delete(id):state.favourites.add(id);localStorage.setItem('wc-favourites',JSON.stringify([...state.favourites]));renderMatches();renderFavourites();showToast(already?'Teams removed from My teams':'Teams added to My teams');}}});
el('refreshButton').addEventListener('click',loadScores);
el('notificationsButton').addEventListener('click',async()=>{if(!('Notification'in window))return showToast('Notifications are not supported on this device.');const permission=await Notification.requestPermission();el('notificationsButton').classList.toggle('enabled',permission==='granted');showToast(permission==='granted'?'Full-time notifications enabled':'Notifications were not enabled');});
if('serviceWorker'in navigator)navigator.serviceWorker.register('/sw.js').catch(()=>{});
el('notificationsButton').classList.toggle('enabled','Notification'in window&&Notification.permission==='granted');
startPolling();
