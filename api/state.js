'use strict';

const API_KEY = process.env.API_FOOTBALL_KEY || '';
const BASE_URL = 'https://v3.football.api-sports.io';
const LEAGUE_ID = 1;
const SEASON = 2026;
let cache = null;
let cacheTime = 0;
const ratingsCache = new Map();

const demoFixtures = [
  {id:53452533,date:'2026-07-14T19:00:00Z',round:'Semi-finals',venue:'Dallas Stadium',city:'Arlington',status:{short:'FT',long:'Match Finished',elapsed:90},home:{id:2,name:'France',code:'FRA',flag:'🇫🇷',logo:'',winner:false},away:{id:4,name:'Spain',code:'ESP',flag:'🇪🇸',logo:'',winner:true},goals:{home:0,away:2},score:{halftime:{home:0,away:1},extratime:{home:null,away:null},penalty:{home:null,away:null}},events:[],teamRatings:{home:null,away:null},playerRatings:{}},
  {id:53452535,date:'2026-07-15T19:00:00Z',round:'Semi-finals',venue:'Atlanta Stadium',city:'Atlanta',status:{short:'FT',long:'Match Finished',elapsed:90},home:{id:7,name:'England',code:'ENG',flag:'🏴',logo:'',winner:false},away:{id:8,name:'Argentina',code:'ARG',flag:'🇦🇷',logo:'',winner:true},goals:{home:1,away:2},score:{halftime:{home:0,away:1},extratime:{home:null,away:null},penalty:{home:null,away:null}},events:[],teamRatings:{home:null,away:null},playerRatings:{}},
  {id:53452539,date:'2026-07-18T21:00:00Z',round:'3rd Place Final',venue:'Miami Stadium',city:'Miami Gardens',status:{short:'2H',long:'Second Half',elapsed:65},home:{id:2,name:'France',code:'FRA',flag:'🇫🇷',logo:'',winner:false},away:{id:7,name:'England',code:'ENG',flag:'🏴',logo:'',winner:true},goals:{home:0,away:4},score:{halftime:{home:0,away:4},extratime:{home:null,away:null},penalty:{home:null,away:null}},events:[],teamRatings:{home:null,away:null},playerRatings:{}},
  {id:53452537,date:'2026-07-19T19:00:00Z',round:'Final',venue:'New York New Jersey Stadium',city:'East Rutherford',status:{short:'NS',long:'Not Started',elapsed:null},home:{id:4,name:'Spain',code:'ESP',flag:'🇪🇸',logo:'',winner:null},away:{id:8,name:'Argentina',code:'ARG',flag:'🇦🇷',logo:'',winner:null},goals:{home:null,away:null},score:{halftime:{home:null,away:null},extratime:{home:null,away:null},penalty:{home:null,away:null}},events:[],teamRatings:{home:null,away:null},playerRatings:{}}
];

function flag(code) {
  return ({ENG:'🏴',FRA:'🇫🇷',ESP:'🇪🇸',ARG:'🇦🇷',MAR:'🇲🇦',BEL:'🇧🇪',NOR:'🇳🇴',SUI:'🇨🇭'})[code] || '⚽';
}
function normaliseFixture(raw) {
  const team = (t) => ({id:t.id,name:t.name,code:t.code || t.name.slice(0,3).toUpperCase(),logo:t.logo || '',flag:flag(t.code),winner:t.winner});
  return {id:raw.fixture.id,date:raw.fixture.date,round:raw.league.round,venue:raw.fixture.venue?.name || 'Venue TBC',city:raw.fixture.venue?.city || '',status:{short:raw.fixture.status.short,long:raw.fixture.status.long,elapsed:raw.fixture.status.elapsed,extra:raw.fixture.status.extra ?? null},home:team(raw.teams.home),away:team(raw.teams.away),goals:raw.goals,score:raw.score,events:raw.events || [],teamRatings:{home:null,away:null},playerRatings:{}};
}
function normaliseStandings(payload) {
  return (payload?.response?.[0]?.league?.standings || []).map((rows) => ({group:rows[0]?.group || 'Group',rows:rows.map((r) => ({rank:r.rank,team:r.team,points:r.points,goalsDiff:r.goalsDiff,played:r.all?.played || 0,win:r.all?.win || 0,draw:r.all?.draw || 0,lose:r.all?.lose || 0,goalsFor:r.all?.goals?.for || 0,goalsAgainst:r.all?.goals?.against || 0,description:r.description || ''}))}));
}
async function apiGet(path, params) {
  const url = new URL(BASE_URL + path);
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,String(v)));
  const response = await fetch(url,{headers:{'x-apisports-key':API_KEY},signal:AbortSignal.timeout(12000)});
  if (!response.ok) throw new Error(`Provider returned ${response.status}`);
  const body = await response.json();
  if (body.errors && Object.keys(body.errors).length) throw new Error(JSON.stringify(body.errors));
  return body;
}
function ratingData(payload, fixture) {
  const result = {teamRatings:{home:null,away:null},playerRatings:{}};
  for (const side of payload?.response || []) {
    const ratings = [];
    for (const entry of side.players || []) {
      const stat = entry.statistics?.[0] || {};
      const rating = Number.parseFloat(stat.games?.rating);
      if (!Number.isFinite(rating)) continue;
      ratings.push(rating);
      result.playerRatings[entry.player.name] = Number(rating.toFixed(1));
    }
    const average = ratings.length ? Number((ratings.reduce((a,b)=>a+b,0) / ratings.length).toFixed(1)) : null;
    if (side.team?.id === fixture.home.id) result.teamRatings.home = average;
    if (side.team?.id === fixture.away.id) result.teamRatings.away = average;
  }
  return result;
}
async function addRatings(fixtures) {
  const candidates = [
    ...fixtures.filter((f) => ['1H','HT','2H','ET','P','BT','LIVE'].includes(f.status.short)),
    ...fixtures.filter((f) => ['FT','AET','PEN'].includes(f.status.short)).slice(-2)
  ].filter((f,index,list) => list.findIndex((x)=>x.id===f.id)===index);
  await Promise.all(candidates.map(async (fixture) => {
    const saved = ratingsCache.get(fixture.id);
    if (saved && Date.now() - saved.time < 60000) return Object.assign(fixture,saved.data);
    try {
      const payload = await apiGet('/fixtures/players',{fixture:fixture.id});
      const data = ratingData(payload,fixture);
      ratingsCache.set(fixture.id,{time:Date.now(),data});
      Object.assign(fixture,data);
    } catch (_) {
      if (saved) Object.assign(fixture,saved.data);
    }
  }));
}

module.exports = async function handler(req,res) {
  res.setHeader('Cache-Control','s-maxage=10, stale-while-revalidate=20');
  const now = new Date().toISOString();
  if (!API_KEY) return res.status(200).json({mode:'demo',connected:false,lastUpdated:now,serverTime:now,providerMessage:'Add API_FOOTBALL_KEY in Vercel to enable live ratings',justFinished:[],fixtures:demoFixtures,standings:[],config:{league:LEAGUE_ID,season:SEASON,liveRefreshSeconds:15}});
  if (cache && Date.now() - cacheTime < 10000) return res.status(200).json({...cache,serverTime:now});
  try {
    const [fixturesPayload, standingsPayload] = await Promise.all([
      apiGet('/fixtures',{league:LEAGUE_ID,season:SEASON}),
      apiGet('/standings',{league:LEAGUE_ID,season:SEASON})
    ]);
    const fixtures = fixturesPayload.response.map(normaliseFixture).sort((a,b)=>new Date(a.date)-new Date(b.date));
    await addRatings(fixtures);
    cache = {mode:'live',connected:true,lastUpdated:now,providerMessage:'Live scores and ratings connected',justFinished:[],fixtures,standings:normaliseStandings(standingsPayload),config:{league:LEAGUE_ID,season:SEASON,liveRefreshSeconds:15}};
    cacheTime = Date.now();
    return res.status(200).json({...cache,serverTime:now});
  } catch (error) {
    return res.status(200).json({mode:'error',connected:false,lastUpdated:now,serverTime:now,providerMessage:error.message,justFinished:[],fixtures:cache?.fixtures || demoFixtures,standings:cache?.standings || [],config:{league:LEAGUE_ID,season:SEASON,liveRefreshSeconds:15}});
  }
};