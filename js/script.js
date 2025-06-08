document.addEventListener('DOMContentLoaded', () => {
  const gridDiv = document.getElementById('grid');
  if (!gridDiv) return;

  const API_KEY       = 'AIzaSyAHUtkcgIQOfvgdfshmtDdwpSzadoonrvU';
  const PLAYLIST_ID   = 'PLoB1kQ3hr7_rszFBh8QBNPSOpsnXX306f';
  const PL_URL        = 'https://www.googleapis.com/youtube/v3/playlistItems';
  const VID_URL       = 'https://www.googleapis.com/youtube/v3/videos';

  async function fetchAllPlaylistItems() {
    let ids = [], token = '';
    do {
      const u = new URL(PL_URL);
      u.search = new URLSearchParams({
        part: 'snippet', playlistId: PLAYLIST_ID,
        maxResults: '50', key: API_KEY,
        pageToken: token
      }).toString();
      const resp = await fetch(u);
      const js   = await resp.json();
      if (!js.items) break;
      js.items.forEach(i => {
        const v = i.snippet.resourceId.videoId;
        if (v) ids.push(v);
      });
      token = js.nextPageToken || '';
    } while (token);
    return ids;
  }

  function chunk(arr, size) {
    const out = [];
    for (let i=0;i<arr.length;i+=size) out.push(arr.slice(i,i+size));
    return out;
  }

  function parseDuration(iso) {
    const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
    const h=+m[1]||0, min=+m[2]||0, s=+m[3]||0;
    if (h) return `${h}:${String(min).padStart(2,'0')}:${String(s).padStart(2,'0')}`;
    return `${min}:${String(s).padStart(2,'0')}`;
  }

  function formatDate(iso) {
    const d=new Date(iso);
    return d.toLocaleDateString('en-US',{year:'numeric',month:'short',day:'numeric'});
  }

  (async () => {
    gridDiv.innerHTML = '<p>Loading…</p>';
    try {
      const allIds = await fetchAllPlaylistItems();
      if (!allIds.length) {
        gridDiv.innerHTML = '<p>No videos found.</p>';
        return;
      }
      const batches = chunk(allIds,50), details=[];
      for (const batch of batches) {
        const u = new URL(VID_URL);
        u.search = new URLSearchParams({
          part:'snippet,contentDetails',
          id: batch.join(','), key:API_KEY
        }).toString();
        const r = await fetch(u), j=await r.json();
        if (j.items) {
          j.items.forEach(i => details.push({
            id: i.id,
            title: i.snippet.title,
            thumbnailUrl: (i.snippet.thumbnails.high||i.snippet.thumbnails.default).url,
            duration: i.contentDetails.duration,
            publishedAt: i.snippet.publishedAt
          }));
        }
      }

      // build grid
      gridDiv.innerHTML = '';
      details.forEach(v => {
        const card = document.createElement('div');
        card.className='video-card';
        const a = document.createElement('a');
        a.href=`https://www.youtube.com/watch?v=${v.id}&list=${PLAYLIST_ID}`;
        a.style.textDecoration='none';
        a.style.color='inherit';

        const img=document.createElement('img');
        img.src=v.thumbnailUrl; img.alt=v.title;

        const info=document.createElement('div'); info.className='video-info';
        const t=document.createElement('p'); t.className='video-title';
        t.textContent=v.title;
        const m=document.createElement('div'); m.className='video-meta';
        const spanDur=document.createElement('span');
        spanDur.textContent=parseDuration(v.duration);
        const spanDate=document.createElement('span');
        spanDate.textContent=formatDate(v.publishedAt);
        m.append(spanDur, spanDate);
        info.append(t,m);

        a.append(img,info);
        card.append(a);
        gridDiv.append(card);
      });

      // ────────────────────────────────────────
      // Modal + YouTube API + time tracker
      // ────────────────────────────────────────
      let player, tid;

      window.onYouTubeIframeAPIReady = () => {};

      const modal     = document.getElementById('video-modal');
      const container = document.getElementById('video-container');
      const closer    = document.getElementById('video-modal-close');
      const timerEl   = document.getElementById('video-timer');

      function fmt(sec){
        sec=Math.floor(sec);
        const mm=Math.floor(sec/60), ss=sec%60;
        return `${mm}:${String(ss).padStart(2,'0')}`;
      }

      function startT(){
        clearInterval(tid);
        tid = setInterval(()=>{
          if (player && player.getCurrentTime){
            timerEl.textContent = `${fmt(player.getCurrentTime())} / ${fmt(player.getDuration())}`;
          }
        },500);
      }

      function stopT(){ clearInterval(tid); }

      document.querySelectorAll('.video-card a').forEach(a=>{
        a.addEventListener('click', e=>{
          e.preventDefault();
          const id = new URL(a.href).searchParams.get('v');
          if (player){
            player.loadVideoById(id);
          } else {
            player = new YT.Player('video-container',{
              videoId:id,
              playerVars:{autoplay:1,controls:1,rel:0,modestbranding:1,enablejsapi:1},
              events:{
                onStateChange(evt){
                  if (evt.data===YT.PlayerState.PLAYING) startT();
                  if (evt.data===YT.PlayerState.PAUSED||evt.data===YT.PlayerState.ENDED) stopT();
                }
              }
            });
          }
          modal.style.display='flex';
          document.body.style.overflow='hidden';
        });
      });

      closer.addEventListener('click', ()=>{
        if(player) player.stopVideo();
        modal.style.display='none';
        document.body.style.overflow='';
        stopT();
      });

      modal.addEventListener('click', e=>{
        if(e.target===modal) closer.click();
      });

    } catch(err) {
      console.error(err);
      gridDiv.innerHTML = '<p style="color:red;">Failed to load thumbnails. Check console.</p>';
    }
  })();
});
