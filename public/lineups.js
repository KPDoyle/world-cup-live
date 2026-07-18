'use strict';

const MATCH_LINEUPS = {
  'England|Argentina': {
    title: 'England v Argentina',
    stage: 'Semi-final · 15 July 2026',
    homeFormation: '4-2-3-1',
    awayFormation: '4-3-3',
    home: ['Jordan Pickford','Reece James','John Stones','Marc Guéhi','Djed Spence','Declan Rice','Elliot Anderson','Jude Bellingham','Morgan Rogers','Anthony Gordon','Harry Kane'],
    away: ['Emiliano Martínez','Nahuel Molina','Cristian Romero','Lisandro Martínez','Nicolás Tagliafico','Leandro Paredes','Enzo Fernández','Alexis Mac Allister','Giuliano Simeone','Lionel Messi','Julián Álvarez']
  },
  'Argentina|England': {
    title: 'Argentina v England',
    stage: 'Semi-final · 15 July 2026',
    homeFormation: '4-3-3',
    awayFormation: '4-2-3-1',
    home: ['Emiliano Martínez','Nahuel Molina','Cristian Romero','Lisandro Martínez','Nicolás Tagliafico','Leandro Paredes','Enzo Fernández','Alexis Mac Allister','Giuliano Simeone','Lionel Messi','Julián Álvarez'],
    away: ['Jordan Pickford','Reece James','John Stones','Marc Guéhi','Djed Spence','Declan Rice','Elliot Anderson','Jude Bellingham','Morgan Rogers','Anthony Gordon','Harry Kane']
  },
  'France|Spain': {
    title: 'France v Spain',
    stage: 'Semi-final · 14 July 2026',
    homeFormation: '4-2-3-1',
    awayFormation: '4-3-3',
    home: ['Mike Maignan','Jules Koundé','Dayot Upamecano','William Saliba','Lucas Digne','Aurélien Tchouaméni','Adrien Rabiot','Ousmane Dembélé','Michael Olise','Bradley Barcola','Kylian Mbappé'],
    away: ['Unai Simón','Pedro Porro','Pau Cubarsí','Aymeric Laporte','Marc Cucurella','Rodri','Fabián Ruiz','Dani Olmo','Lamine Yamal','Álex Baena','Mikel Oyarzabal']
  },
  'Spain|France': {
    title: 'Spain v France',
    stage: 'Semi-final · 14 July 2026',
    homeFormation: '4-3-3',
    awayFormation: '4-2-3-1',
    home: ['Unai Simón','Pedro Porro','Pau Cubarsí','Aymeric Laporte','Marc Cucurella','Rodri','Fabián Ruiz','Dani Olmo','Lamine Yamal','Álex Baena','Mikel Oyarzabal'],
    away: ['Mike Maignan','Jules Koundé','Dayot Upamecano','William Saliba','Lucas Digne','Aurélien Tchouaméni','Adrien Rabiot','Ousmane Dembélé','Michael Olise','Bradley Barcola','Kylian Mbappé']
  },
  'France|England': {
    title: 'France v England',
    stage: 'Third-place play-off · 18 July 2026',
    homeFormation: '4-2-3-1',
    awayFormation: '4-1-4-1',
    home: ['Mike Maignan','Malo Gusto','Ibrahima Konaté','Maxence Lacroix','Theo Hernandez','Warren Zaïre-Emery','Adrien Rabiot','Michael Olise','Rayan Cherki','Désiré Doué','Kylian Mbappé'],
    away: ['Dean Henderson','Jarell Quansah','Ezri Konsa','Marc Guéhi','Djed Spence','Declan Rice','Bukayo Saka','Eberechi Eze','Morgan Rogers','Marcus Rashford','Ivan Toney']
  },
  'England|France': {
    title: 'England v France',
    stage: 'Third-place play-off · 18 July 2026',
    homeFormation: '4-1-4-1',
    awayFormation: '4-2-3-1',
    home: ['Dean Henderson','Jarell Quansah','Ezri Konsa','Marc Guéhi','Djed Spence','Declan Rice','Bukayo Saka','Eberechi Eze','Morgan Rogers','Marcus Rashford','Ivan Toney'],
    away: ['Mike Maignan','Malo Gusto','Ibrahima Konaté','Maxence Lacroix','Theo Hernandez','Warren Zaïre-Emery','Adrien Rabiot','Michael Olise','Rayan Cherki','Désiré Doué','Kylian Mbappé']
  }
};

function lineupList(players) {
  return players.map((player, index) => `<li><span>${index + 1}</span><strong>${escapeHtml(player)}</strong></li>`).join('');
}

function closeLineupModal() {
  const modal = document.getElementById('lineupModal');
  modal.classList.remove('open');
  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('modal-open');
}

function openLineupModal(fixture) {
  const key = `${fixture.home.name}|${fixture.away.name}`;
  const data = MATCH_LINEUPS[key];
  if (!data) {
    showToast('Starting line-ups are not yet available for this match.');
    return;
  }

  const modal = document.getElementById('lineupModal');
  const homeName = escapeHtml(fixture.home.name);
  const awayName = escapeHtml(fixture.away.name);
  document.getElementById('lineupContent').innerHTML = `
    <div class="lineup-header">
      <div>
        <div class="eyebrow">CONFIRMED STARTING XIs</div>
        <h2>${escapeHtml(data.title)}</h2>
        <p>${escapeHtml(data.stage)} · ${escapeHtml(scoreText(fixture))}</p>
      </div>
      <button class="lineup-close" type="button" aria-label="Close line-ups">×</button>
    </div>
    <div class="lineup-grid">
      <section class="lineup-team">
        <div class="lineup-team-heading">${crest(fixture.home, 'large')}<div><h3>${homeName}</h3><span>${escapeHtml(data.homeFormation)}</span></div></div>
        <ol>${lineupList(data.home)}</ol>
      </section>
      <section class="lineup-team">
        <div class="lineup-team-heading">${crest(fixture.away, 'large')}<div><h3>${awayName}</h3><span>${escapeHtml(data.awayFormation)}</span></div></div>
        <ol>${lineupList(data.away)}</ol>
      </section>
    </div>
    <p class="lineup-note">Tap outside this panel to return to the match centre.</p>`;

  modal.classList.add('open');
  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('modal-open');
}

document.addEventListener('click', (event) => {
  if (event.target.closest('.star-button')) return;
  const close = event.target.closest('.lineup-close');
  if (close) return closeLineupModal();
  if (event.target.id === 'lineupModal') return closeLineupModal();
  const card = event.target.closest('.match-card');
  if (!card || !state.data) return;
  const fixture = state.data.fixtures.find((item) => item.id === Number(card.dataset.matchId));
  if (fixture) openLineupModal(fixture);
});

document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape') closeLineupModal();
});
