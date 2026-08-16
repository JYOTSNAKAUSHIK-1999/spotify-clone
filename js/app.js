const state = {
  tracks: [],
  filtered: [],
  currentIndex: -1,
  liked: JSON.parse(localStorage.getItem("soundify-liked") || "[]"),
  playlists: JSON.parse(localStorage.getItem("soundify-playlists") || '{"My Playlist":[],"Study Mix":[]}'),
  currentPlaylist: [],
  query: "",
  genre: "",
  sort: "popularity",
  repeat: false,
  shuffle: false
};

const $ = id => document.getElementById(id);
const audio = $("audio");

function clean(v){ return (v ?? "").toString().trim(); }
function num(v){ const n = Number(v); return Number.isFinite(n) ? n : 0; }
function duration(ms){ const s = Math.max(0, Math.round(num(ms)/1000)); return `${Math.floor(s/60)}:${String(s%60).padStart(2,"0")}`; }
function escapeHtml(v){ return clean(v).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
function idFor(t){ return `${clean(t.track_name)}__${clean(t.artists)}__${clean(t.album_name)}`.toLowerCase(); }

function normalize(row){
  return {
    track_id: clean(row.track_id),
    artists: clean(row.artists) || "Unknown Artist",
    album_name: clean(row.album_name) || "Unknown Album",
    track_name: clean(row.track_name) || "Untitled Track",
    popularity: num(row.popularity),
    duration_ms: num(row.duration_ms),
    explicit: clean(row.explicit).toLowerCase() === "true",
    danceability: num(row.danceability),
    energy: num(row.energy),
    key: num(row.key),
    loudness: num(row.loudness),
    mode: num(row.mode),
    speechiness: num(row.speechiness),
    acousticness: num(row.acousticness),
    instrumentalness: num(row.instrumentalness),
    liveness: num(row.liveness),
    valence: num(row.valence),
    tempo: num(row.tempo),
    time_signature: num(row.time_signature),
    track_genre: clean(row.track_genre) || "Unknown"
  };
}

const demoRows = [
 ["Blinding Lights","The Weeknd","After Hours","pop",95,.514,.730,.833,.089,.334,.708,.234,.089,.098,.093,.130,.001,.334,171],
 ["Shape of You","Ed Sheeran","÷","pop",88,.825,.652,.652,.080,.581,.418,.080,.098,.106,.093,.931,.000,.436,96],
 ["Believer","Imagine Dragons","Evolve","rock",91,.776,.780,.780,.075,.303,.675,.081,.110,.187,.229,.081,.000,.666,125],
 ["Heat Waves","Glass Animals","Dreamland","indie",90,.761,.525,.525,.094,.702,.219,.074,.092,.117,.092,.761,.000,.531,81],
 ["As It Was","Harry Styles","Harry's House","pop",94,.520,.731,.731,.050,.662,.342,.055,.049,.106,.317,.662,.001,.493,174],
 ["Perfect","Ed Sheeran","÷","acoustic",89,.599,.448,.448,.023,.580,.163,.098,.027,.106,.106,.168,.000,.438,95],
 ["Thunder","Imagine Dragons","Evolve","rock",86,.605,.820,.820,.086,.029,.680,.090,.082,.110,.137,.288,.000,.288,168],
 ["Ocean Eyes","Billie Eilish","dont smile at me","pop",84,.551,.363,.363,.092,.942,.133,.141,.111,.104,.084,.568,.002,.417,145],
 ["Dance Monkey","Tones and I","The Kids Are Coming","pop",92,.824,.588,.588,.149,.692,.218,.266,.149,.149,.170,.513,.000,.436,98],
 ["Lovely","Billie Eilish, Khalid","13 Reasons Why","pop",88,.351,.296,.296,.034,.934,.226,.095,.084,.098,.118,.087,.000,.435,115],
 ["Stressed Out","Twenty One Pilots","Blurryface","alternative",86,.734,.637,.637,.141,.046,.071,.107,.070,.165,.160,.491,.000,.593,169],
 ["Counting Stars","OneRepublic","Native","pop",87,.664,.705,.705,.039,.065,.468,.038,.119,.115,.088,.477,.000,.512,122]
].map((r,i)=>normalize({track_id:`demo-${i}`,track_name:r[0],artists:r[1],album_name:r[2],track_genre:r[3],popularity:r[4],danceability:r[5],energy:r[6],loudness:r[7],speechiness:r[8],acousticness:r[9],instrumentalness:r[10],liveness:r[11],valence:r[12],tempo:r[18],duration_ms:210000}));

function parseCSV(text){
  const rows=[]; let row=[], cell="", quoted=false;
  for(let i=0;i<text.length;i++){
    const c=text[i], n=text[i+1];
    if(c === '"' && quoted && n === '"'){cell+='"'; i++; continue;}
    if(c === '"'){quoted=!quoted; continue;}
    if(c === ',' && !quoted){row.push(cell); cell=""; continue;}
    if((c === '\n' || c === '\r') && !quoted){
      if(c === '\r' && n === '\n') i++;
      row.push(cell); cell="";
      if(row.some(x=>x.trim()!=="")) rows.push(row);
      row=[]; continue;
    }
    cell += c;
  }
  if(cell.length || row.length){row.push(cell); if(row.some(x=>x.trim()!=="")) rows.push(row);}
  if(!rows.length) return [];
  const headers=rows[0].map(h=>h.trim());
  return rows.slice(1).map(r=>Object.fromEntries(headers.map((h,i)=>[h,r[i]??""])));
}

async function loadDatasetFromPath(){
  try{
    const res = await fetch("data/spotify_tracks.csv");
    if(!res.ok) throw new Error("CSV not found");
    const text = await res.text();
    const parsed = parseCSV(text).map(normalize).filter(t=>t.track_name);
    if(parsed.length) {
      state.tracks = parsed;
      $("datasetStatus").textContent = `${parsed.length.toLocaleString()} tracks loaded`;
      refresh();
      return true;
    }
  }catch(e){}
  state.tracks = demoRows;
  $("datasetStatus").textContent = "Demo data active — add Kaggle CSV";
  refresh();
  return false;
}

function applyFilters(){
  let list=[...state.tracks];
  const q=state.query.toLowerCase();
  if(q) list=list.filter(t =>
    t.track_name.toLowerCase().includes(q) ||
    t.artists.toLowerCase().includes(q) ||
    t.album_name.toLowerCase().includes(q) ||
    t.track_genre.toLowerCase().includes(q)
  );
  if(state.genre) list=list.filter(t=>t.track_genre===state.genre);
  list.sort((a,b)=>{
    if(state.sort==="title") return a.track_name.localeCompare(b.track_name);
    if(state.sort==="artist") return a.artists.localeCompare(b.artists);
    if(state.sort==="energy") return b.energy-a.energy;
    if(state.sort==="danceability") return b.danceability-a.danceability;
    return b.popularity-a.popularity;
  });
  state.filtered=list;
  return list;
}

function card(t, index){
  const liked=state.liked.includes(idFor(t));
  return `<article class="track-card" data-index="${index}" data-id="${escapeHtml(idFor(t))}">
    <div class="cover card-cover"><span>♪</span></div>
    <button class="card-play" data-play="${index}" title="Play">▶</button>
    <div class="card-title" title="${escapeHtml(t.track_name)}">${escapeHtml(t.track_name)}</div>
    <div class="card-artist">${escapeHtml(t.artists)}</div>
    <div class="card-meta"><span>${escapeHtml(t.track_genre)}</span><span>${liked?"♥ ":""}${Math.round(t.popularity)}</span></div>
  </article>`;
}

function renderGrid(el, tracks){
  if(!tracks.length){el.innerHTML=""; return;}
  el.innerHTML=tracks.map((t,i)=>card(t,i)).join("");
  el.querySelectorAll("[data-play]").forEach(b=>b.addEventListener("click",e=>{e.stopPropagation(); playTrack(Number(b.dataset.play), tracks);}));
  el.querySelectorAll(".track-card").forEach(c=>c.addEventListener("click",()=>openTrack(tracks[Number(c.dataset.index)])));
}

function renderHome(){
  const popular=[...state.tracks].sort((a,b)=>b.popularity-a.popularity).slice(0,12);
  renderGrid($("popularGrid"),popular);
  const genres=[...new Set(state.tracks.map(t=>t.track_genre).filter(Boolean))].sort().slice(0,20);
  $("genreChips").innerHTML=genres.map(g=>`<button class="chip" data-genre="${escapeHtml(g)}">${escapeHtml(g)}</button>`).join("");
  $("genreChips").querySelectorAll(".chip").forEach(b=>b.addEventListener("click",()=>{state.genre=b.dataset.genre; showView("search"); syncSearch();}));
  renderRecommendations();
}

function renderRecommendations(){
  const base=state.currentIndex>=0 ? state.tracks[state.currentIndex] : [...state.tracks].sort((a,b)=>b.popularity-a.popularity)[0];
  if(!base){$("recommendGrid").innerHTML="";return;}
  const features=["danceability","energy","valence","acousticness","instrumentalness","speechiness"];
  const distance=t=>features.reduce((sum,f)=>sum+Math.pow(num(t[f])-num(base[f]),2),0);
  const recs=state.tracks.filter(t=>idFor(t)!==idFor(base)).sort((a,b)=>distance(a)-distance(b)).slice(0,8);
  renderGrid($("recommendGrid"),recs);
}

function populateGenres(){
  const genres=[...new Set(state.tracks.map(t=>t.track_genre).filter(Boolean))].sort();
  $("genreFilter").innerHTML='<option value="">All genres</option>'+genres.map(g=>`<option value="${escapeHtml(g)}">${escapeHtml(g)}</option>`).join("");
}

function renderSearch(){
  const list=applyFilters();
  renderGrid($("searchGrid"),list.slice(0,300));
  $("emptyState").classList.toggle("hidden",list.length>0);
  $("searchSummary").textContent=`${list.length.toLocaleString()} matching track${list.length===1?"":"s"}`;
}

function renderLibrary(){
  const ids=new Set(state.liked);
  const liked=state.tracks.filter(t=>ids.has(idFor(t)));
  renderGrid($("libraryGrid"),liked);
}

function renderLiked(){
  const liked=state.tracks.filter(t=>state.liked.includes(idFor(t)));
  $("likedCount").textContent=`${liked.length} song${liked.length===1?"":"s"}`;
  renderGrid($("likedGrid"),liked);
}

function refresh(){
  populateGenres();
  renderHome();
  renderSearch();
  renderLibrary();
  renderLiked();
}

function showView(view){
  document.querySelectorAll(".view").forEach(v=>v.classList.add("hidden"));
  $(`${view}View`).classList.remove("hidden");
  document.querySelectorAll(".nav-item").forEach(b=>b.classList.toggle("active",b.dataset.view===view));
  $("sidebar").classList.remove("open");
  if(view==="search") renderSearch();
  if(view==="library") renderLibrary();
  if(view==="liked") renderLiked();
}

function syncSearch(){
  $("searchInput").value=state.query;
  $("genreFilter").value=state.genre;
  $("sortFilter").value=state.sort;
  $("clearSearch").classList.toggle("hidden",!state.query);
  renderSearch();
}

function setCurrent(track){
  state.currentIndex=state.tracks.findIndex(t=>idFor(t)===idFor(track));
  $("playerTitle").textContent=track.track_name;
  $("playerArtist").textContent=track.artists;
  $("playerCover").innerHTML="♪";
  $("likeBtn").textContent=state.liked.includes(idFor(track))?"♥":"♡";
  $("likeBtn").classList.toggle("active",state.liked.includes(idFor(track)));
  renderRecommendations();
}

function playTrack(index, list=state.tracks){
  const track=list[index]; if(!track) return;
  setCurrent(track);
  state.currentPlaylist=list;
  const candidate=`audio/${encodeURIComponent(clean(track.track_id||track.track_name))}.mp3`;
  audio.src=candidate;
  audio.play().then(()=>updatePlayButton()).catch(()=>updatePlayButton());
}

function togglePlay(){
  if(!audio.src){ if(state.tracks[0]) playTrack(0,state.tracks); return; }
  if(audio.paused) audio.play().catch(()=>{}); else audio.pause();
  updatePlayButton();
}
function updatePlayButton(){ $("playBtn").textContent=audio.paused?"▶":"Ⅱ"; }
function nextTrack(){
  const list=state.currentPlaylist.length?state.currentPlaylist:state.tracks;
  if(!list.length)return;
  let i=state.currentIndex>=0?list.findIndex(t=>idFor(t)===idFor(state.tracks[state.currentIndex])):0;
  if(state.shuffle)i=Math.floor(Math.random()*list.length); else i=(i+1)%list.length;
  playTrack(i,list);
}
function prevTrack(){
  const list=state.currentPlaylist.length?state.currentPlaylist:state.tracks;
  if(!list.length)return;
  let i=state.currentIndex>=0?list.findIndex(t=>idFor(t)===idFor(state.tracks[state.currentIndex])):0;
  i=(i-1+list.length)%list.length; playTrack(i,list);
}

function toggleLike(){
  if(state.currentIndex<0)return;
  const id=idFor(state.tracks[state.currentIndex]);
  state.liked=state.liked.includes(id)?state.liked.filter(x=>x!==id):[...state.liked,id];
  localStorage.setItem("soundify-liked",JSON.stringify(state.liked));
  setCurrent(state.tracks[state.currentIndex]); renderLibrary(); renderLiked();
}

function openTrack(t){
  $("dialogContent").innerHTML=`
    <div class="cover" style="width:130px;height:130px;margin-bottom:18px">♪</div>
    <p class="eyebrow">${escapeHtml(t.track_genre)}</p>
    <h2>${escapeHtml(t.track_name)}</h2>
    <p class="muted">${escapeHtml(t.artists)} • ${escapeHtml(t.album_name)}</p>
    <div class="dialog-stats">
      <div class="stat"><small>Popularity</small><strong>${Math.round(t.popularity)}</strong></div>
      <div class="stat"><small>Energy</small><strong>${t.energy.toFixed(2)}</strong></div>
      <div class="stat"><small>Danceability</small><strong>${t.danceability.toFixed(2)}</strong></div>
      <div class="stat"><small>Valence</small><strong>${t.valence.toFixed(2)}</strong></div>
      <div class="stat"><small>Acousticness</small><strong>${t.acousticness.toFixed(2)}</strong></div>
      <div class="stat"><small>Tempo</small><strong>${Math.round(t.tempo)} BPM</strong></div>
    </div>
    <div class="dialog-actions"><button class="primary-btn" id="dialogPlay">▶ Play track</button></div>`;
  $("trackDialog").showModal();
  $("dialogPlay").onclick=()=>{playTrack(state.tracks.findIndex(x=>idFor(x)===idFor(t)),state.tracks);$("trackDialog").close();};
}

$("playBtn").onclick=togglePlay;
$("nextBtn").onclick=nextTrack;
$("prevBtn").onclick=prevTrack;
$("likeBtn").onclick=toggleLike;
$("shuffleBtn").onclick=()=>{state.shuffle=!state.shuffle;$("shuffleBtn").classList.toggle("active",state.shuffle)};
$("repeatBtn").onclick=()=>{state.repeat=!state.repeat;$("repeatBtn").classList.toggle("active",state.repeat)};
$("volumeBar").oninput=e=>audio.volume=Number(e.target.value);
$("progressBar").oninput=e=>{if(audio.duration)audio.currentTime=(Number(e.target.value)/100)*audio.duration};
audio.ontimeupdate=()=>{if(audio.duration){$("progressBar").value=(audio.currentTime/audio.duration)*100;$("currentTime").textContent=duration(audio.currentTime*1000);$("duration").textContent=duration(audio.duration*1000)}};
audio.onplay=updatePlayButton; audio.onpause=updatePlayButton;
audio.onended=()=>state.repeat?audio.play():nextTrack();

$("searchInput").oninput=e=>{state.query=e.target.value.trim();showView("search");syncSearch()};
$("clearSearch").onclick=()=>{state.query="";syncSearch();$("searchInput").focus()};
$("genreFilter").onchange=e=>{state.genre=e.target.value;renderSearch()};
$("sortFilter").onchange=e=>{state.sort=e.target.value;renderSearch()};
$("exploreBtn").onclick=()=>{showView("search");$("searchInput").focus()};
$("loadDatasetBtn").onclick=()=>$("hiddenCsvInput").click();
$("csvFileInput").onchange=e=>loadLocalFile(e.target.files[0]);
$("hiddenCsvInput").onchange=e=>loadLocalFile(e.target.files[0]);

async function loadLocalFile(file){
  if(!file)return;
  const text=await file.text();
  const parsed=parseCSV(text).map(normalize).filter(t=>t.track_name);
  if(!parsed.length){alert("This does not look like the Spotify Tracks CSV.");return}
  state.tracks=parsed;
  $("datasetStatus").textContent=`${parsed.length.toLocaleString()} tracks loaded`;
  refresh();
}

document.querySelectorAll(".nav-item").forEach(b=>b.onclick=()=>showView(b.dataset.view));
document.querySelectorAll("[data-view-target]").forEach(b=>b.onclick=()=>showView(b.dataset.viewTarget));
document.querySelectorAll(".playlist-link").forEach(b=>b.onclick=()=>{
  const name=b.dataset.playlist;
  const ids=state.playlists[name]||[];
  const list=state.tracks.filter(t=>ids.includes(idFor(t)));
  showView("library"); renderGrid($("libraryGrid"),list);
});
$("dialogClose").onclick=()=>$("trackDialog").close();
$("mobileMenu").onclick=()=>$("sidebar").classList.toggle("open");

audio.volume=.8;
loadDatasetFromPath();
