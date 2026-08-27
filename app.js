/* Dawnielle's Day — functional core
   Designed mobile-first for iPhone 16 (393×852 CSS px).
   No scoring, diagnosis, surveillance, or punishment.
*/
(() => {
  'use strict';

  const KEY = 'dawnielleDay';
  const OLD_KEYS = ['dawnielleV5','dawnielleDayPreferencesV7','dawnielleRemindersV8','dawniellePlannerV9'];

  const defaultState = {
    mood: null,
    energy: null,
    thoughts: '',
    packages: 0,
    delivered: 0,
    optionalTasks: [false,false,false,false,false],
    dayMode: 'guided',
    sectionModes: {morning:'guided',work:'guided',evening:'guided',wind:'guided'},
    planChoices: {morning:true,work:true,food:true,pet:true,reset:true,tomorrow:true},
    reminders: [
      {id:'morning', text:'Take your morning medicine', time:'08:00', repeat:'daily', mode:'structured', enabled:true},
      {id:'night', text:'Take your night medicine', time:'21:00', repeat:'daily', mode:'structured', enabled:true},
      {id:'friday', text:'Take your Friday morning extra medicine', time:'08:30', repeat:'friday', mode:'structured', enabled:true}
    ],
    customReminders: [],
    reminderStatus: {},
    notes: [],
    reflectQuestion: 0,
    lastMoodDate: null
  };

  function clone(o){ return JSON.parse(JSON.stringify(o)); }
  function merge(a,b){ return Object.assign({},a,b); }
  function load(){
    let s = clone(defaultState);
    try {
      const saved = JSON.parse(localStorage.getItem(KEY)||'null');
      if(saved) s = merge(s,saved);
      else {
        // Gentle migration: keep useful information from earlier project versions.
        for(const k of OLD_KEYS){
          try {
            const old=JSON.parse(localStorage.getItem(k)||'null');
            if(!old) continue;
            if(old.moods?.length) s.mood=old.moods[old.moods.length-1];
            if(old.energy) s.energy=old.energy;
            if(typeof old.thoughts==='string') s.thoughts=old.thoughts;
            if(typeof old.packages==='number') s.packages=old.packages;
            if(typeof old.delivered==='number') s.delivered=old.delivered;
            if(Array.isArray(old.done)) s.optionalTasks=old.done;
            if(old.sectionModes) s.sectionModes=merge(s.sectionModes,old.sectionModes);
            if(old.planChoices) s.planChoices=merge(s.planChoices,old.planChoices);
          } catch {}
        }
      }
    } catch {}
    s.sectionModes=merge(defaultState.sectionModes,s.sectionModes||{});
    s.planChoices=merge(defaultState.planChoices,s.planChoices||{});
    s.reminders=Array.isArray(s.reminders)?s.reminders:clone(defaultState.reminders);
    s.customReminders=Array.isArray(s.customReminders)?s.customReminders:[];
    s.notes=Array.isArray(s.notes)?s.notes:[];
    s.reminderStatus=s.reminderStatus||{};
    return s;
  }
  let S=load();
  const $=id=>document.getElementById(id);
  const save=()=>localStorage.setItem(KEY,JSON.stringify(S));
  const today=()=>new Date().toISOString().slice(0,10);
  const escapeHTML=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  const moodText={good:'Good',okay:'Okay',stressed:'Stressed',tired:'Tired',low:'Low',frustrated:'Frustrated',annoyed:'Annoyed'};

  const QUESTIONS=[
    ['What do you need more of right now?','You don’t have to answer perfectly. Even “I don’t know” is an answer.'],
    ['What would make the next hour a little easier?','It can be something very small.'],
    ['What are you already carrying today?','You can name it without solving it.'],
    ['What would you like to protect today?','A quiet moment counts.'],
    ['What is one thing you could leave for later?','Not everything needs your attention at once.'],
    ['What sounds kind to yourself right now?','Kind can be practical, silly, quiet, or nothing at all.']
  ];
  const SUPPORT={
    overwhelmed:['Let’s make the space smaller.','You could choose one tiny thing, or choose nothing for a minute.'],
    hard:['You don’t have to turn a hard day into a good one.','Maybe just look for the next thing that feels possible.'],
    frustrated:['Something can be frustrating without becoming the whole day.','Pause, name what is happening, then choose what you want to do with it.'],
    tired:['Low battery days get different expectations.','You might choose the easiest useful thing, or rest.'],
    thoughts:['You don’t have to untangle every thought.','Try putting one thought into words, then leave the rest alone for now.'],
    unsure:['Not knowing is allowed.','You could start with a question instead of an answer.'],
    okay:['Glad there is some room to breathe.','You can use the space for planning, playing, or simply checking in.'],
    myself:['Absolutely.','You can use this as a blank page and decide your own next step.']
  };

  function currentPhase(){
    const h=new Date().getHours()+new Date().getMinutes()/60;
    if(h<7) return 'wind';
    if(h<9) return 'morning';
    if(h<12) return 'sorting';
    if(h<17.5) return 'delivery';
    if(h<18) return 'transition';
    if(h<20) return 'evening';
    if(h<22) return 'relax';
    return 'wind';
  }
  function sectionFor(phase){
    if(phase==='morning')return'morning';
    if(['sorting','delivery','transition'].includes(phase))return'work';
    if(['evening','relax'].includes(phase))return'evening';
    return'wind';
  }
  function modeForNow(){ return S.sectionModes[sectionFor(currentPhase())]||S.dayMode; }

  function setText(id,v){const e=$(id);if(e)e.textContent=v;}
  function setHidden(id,v){const e=$(id);if(e)e.hidden=v;}

  function renderHeader(){
    const d=new Date();
    setText('weekday',dayNames[d.getDay()]);
    setText('date',d.toLocaleDateString(undefined,{month:'long',day:'numeric',year:'numeric'}));
    setText('clock',d.toLocaleTimeString([], {hour:'numeric',minute:'2-digit'}));
  }

  function renderCheckin(){
    document.querySelectorAll('[data-mood]').forEach(b=>b.classList.toggle('selected',b.dataset.mood===S.mood));
    document.querySelectorAll('[data-energy]').forEach(b=>b.classList.toggle('selected',b.dataset.energy===S.energy));
    if($('thoughts') && $('thoughts').value!==S.thoughts) $('thoughts').value=S.thoughts||'';
    const reflectMood=$('reflectMood');
    if(reflectMood) reflectMood.textContent=S.mood?`You checked in as “${moodText[S.mood]}.”`:'Nothing has to be figured out.';
    const reflectThought=$('reflectThought');
    if(reflectThought) reflectThought.textContent=S.thoughts||'Write what you want to remember about this moment. You can come back to it later.';
  }

  function nextGuidance(){
    const h=new Date().getHours()+new Date().getMinutes()/60;
    if(h<7)return ['A quiet start','You can begin whenever you are ready.'];
    if(h<9)return ['Get yourself ready','If you want a place to start, take care of the next small morning thing.'];
    if(h<12)return ['Sort the route','Work with the route you have. It does not need to be perfect.'];
    if(h<17.5)return ['One stop at a time','The whole route does not need to happen in your head at once.'];
    if(h<18)return ['Head toward home','Work is almost behind you.'];
    if(h<20)return ['Take care of what matters','Food, pets, yourself — choose the order that works for you.'];
    if(h<22)return ['Let the evening be yours','Responsibilities can have an ending.'];
    return ['Wind down','Tomorrow can wait until tomorrow.'];
  }

  function renderGuidance(){
    const section=sectionFor(currentPhase()), mode=modeForNow(), [t,r]=nextGuidance();
    setText('phaseLabel',section==='work'?'RIGHT NOW':section.toUpperCase());
    const icons={morning:'🌅',work:'🚚',evening:'🏠',wind:'🌙'};
    setText('phaseIcon',icons[section]||'💛');
    setText('phaseText',mode==='structured'
      ? 'You chose a little more direction for this part of the day.'
      : 'This is simply one place you could begin.');
    setText('nextTask',mode==='structured'?t:t);
    setText('nextReason',mode==='structured'
      ? 'Now: '+t+'. You chose more structure here. You can still change that choice.'
      : r+' You can choose this, something else, or nothing right now.');
    setText('guidanceFooter',mode==='structured'?'A direction you chose is still yours to change.':'This is an invitation, not an instruction.');
    const pill=$('sectionModeBtn'); if(pill) pill.textContent=mode==='structured'?'Structured':'Guided';
    document.querySelectorAll('[data-daymode]').forEach(b=>b.classList.toggle('selected',b.dataset.daymode===S.dayMode));
  }

  function renderWork(){
    setText('packages',S.packages?String(S.packages):'—');
    setText('delivered',String(S.delivered));
    setText('earnings',`$${(S.delivered*1.25).toFixed(2)}`);
    const pct=S.packages?Math.min(100,Math.round(S.delivered/S.packages*100)):0;
    const bar=$('bar'); if(bar)bar.style.width=pct+'%';
    setText('workHint',S.packages
      ? `${S.delivered} of ${S.packages} deliveries tracked. Tracking is optional.`
      : 'You can track this if it helps. You don’t have to.');
  }

  function renderTasks(){
    const labels=document.querySelectorAll('#essentialTasks label');
    labels.forEach((l,i)=>{
      const input=l.querySelector('input'); if(input)input.checked=!!S.optionalTasks[i];
    });
    setText('count',`${S.optionalTasks.filter(Boolean).length}/${S.optionalTasks.length}`);
  }

  function appliesReminder(r,d=new Date()){
    if(!r.enabled)return false;
    if(r.repeat==='daily')return true;
    if(r.repeat==='friday')return d.getDay()===5;
    if(r.repeat==='once')return r.createdDate===today() || !r.createdDate;
    return false;
  }
  function reminderStatus(r,date=today()){return S.reminderStatus[date+':'+r.id]||{};}
  function allReminders(){return [...S.reminders,...S.customReminders];}
  function activeReminderNow(){
    const d=new Date(), mins=d.getHours()*60+d.getMinutes();
    return allReminders().find(r=>{
      if(!appliesReminder(r,d)||!r.time)return false;
      const [h,m]=r.time.split(':').map(Number), target=h*60+m, st=reminderStatus(r);
      return target<=mins && !st.done && !st.dismissed && !st.missed;
    });
  }
  function missedReminder(){
    const d=new Date(), mins=d.getHours()*60+d.getMinutes();
    return allReminders().find(r=>{
      if(!appliesReminder(r,d)||!r.time)return false;
      const [h,m]=r.time.split(':').map(Number), target=h*60+m, st=reminderStatus(r);
      return target<mins && !st.done && !st.acknowledged;
    });
  }
  function setReminderStatus(id,patch){
    const k=today()+':'+id;
    S.reminderStatus[k]=Object.assign({},S.reminderStatus[k]||{},patch);
    save();
  }

  function renderReminderNotice(){
    const box=$('directiveNotice'), missed=missedReminder();
    if(!box)return;
    if(!missed){box.hidden=true;return;}
    setText('directiveTitle','You chose this as a direction.');
    setText('directiveText',`“${missed.text}” was set for ${missed.time}. You did not mark it done. That is not a failure. You can keep it directional or make it optional from now on.`);
    box.hidden=false;
    box.dataset.reminderId=missed.id;
  }

  function renderReminderBanner(){
    const r=activeReminderNow();
    if(!r)return;
    setText('guidanceLabel',r.mode==='structured'?'YOUR CHOSEN DIRECTION':'A REMINDER YOU SET');
    setText('nextTask',r.text);
    setText('nextReason',r.mode==='structured'
      ? `You chose this reminder to be direct. Missing it does not change how the rest of your day is going.`
      : `You asked to be reminded. You can decide what to do when the reminder appears.`);
  }

  function renderReminderEditor(){
    const map={morning:['morningDirectiveEnabled','morningDirectiveTime','morningDirectiveText'],night:['nightDirectiveEnabled','nightDirectiveTime','nightDirectiveText'],friday:['fridayDirectiveEnabled','fridayDirectiveTime','fridayDirectiveText']};
    Object.entries(map).forEach(([id,ids])=>{
      const r=S.reminders.find(x=>x.id===id); if(!r)return;
      $(ids[0]).checked=!!r.enabled; $(ids[1]).value=r.time||''; $(ids[2]).value=r.text||'';
    });
    document.querySelectorAll('[data-section]').forEach(e=>e.value=S.sectionModes[e.dataset.section]||'guided');
    document.querySelectorAll('[data-daymode-modal]').forEach(b=>b.classList.toggle('selected',b.dataset.daymodeModal===S.dayMode));
    document.querySelectorAll('[data-plan]').forEach(e=>e.checked=S.planChoices[e.dataset.plan]!==false);
    renderCustomReminderList();
  }

  function renderCustomReminderList(){
    const el=$('customReminderList');if(!el)return;
    if(!S.customReminders.length){el.innerHTML='<small class="tiny">No extra reminders yet. Add only what you want.</small>';return;}
    el.innerHTML=S.customReminders.map(r=>`<div class="customReminderItem"><div><b>${escapeHTML(r.text)}</b><small>${escapeHTML(r.time)} · ${r.mode==='structured'?'Structured':'Guided'} · ${r.repeat==='daily'?'Every day':r.repeat==='friday'?'Fridays':'Today only'}</small></div><button type="button" data-remove-reminder="${escapeHTML(r.id)}" aria-label="Remove ${escapeHTML(r.text)}">×</button></div>`).join('');
  }

  function renderNotes(){
    const el=$('notesList');if(!el)return;
    if(!S.notes.length){
      el.innerHTML='<section class="card emptyNotes"><div class="mysteryMark">✦</div><h3>No notes yet.</h3><p>Put something here when you want to. It can be important, ordinary, funny, or unfinished.</p><button class="softButton" id="emptyNoteAdd">+ Write a note</button></section>';
      $('emptyNoteAdd')?.addEventListener('click',()=>openEditor('note'));
      return;
    }
    el.innerHTML=S.notes.slice().reverse().map(n=>`<article class="card noteItem"><div class="row"><label>${new Date(n.created).toLocaleDateString(undefined,{month:'short',day:'numeric'})}</label><button class="closeNote" data-note-delete="${escapeHTML(n.id)}" aria-label="Delete note">×</button></div><h3>${escapeHTML(n.title||'A note')}</h3><p>${escapeHTML(n.text).replace(/\n/g,'<br>')}</p></article>`).join('');
  }

  function renderReflection(){
    const q=QUESTIONS[S.reflectQuestion%QUESTIONS.length];
    setText('reflectQuestion',q[0]);setText('reflectPrompt',q[1]);
  }

  function renderAll(){
    renderHeader();renderCheckin();renderGuidance();renderWork();renderTasks();renderReminderNotice();renderNotes();renderReflection();
    renderReminderBanner();
  }

  const todayPages=['home','checkin','plan','work','pause','evening'];
  const todayPageNames=['Today','Check in','Plan my day','Work','Pause','Evening'];
  let todayPageIndex=0;
  function renderSpaceNavigator(){
    const dots=$('spaceDots');
    if(dots) dots.innerHTML=todayPages.map((_,i)=>`<i class="${i===todayPageIndex?'active':''}"></i>`).join('');
    setText('spaceName',todayPageNames[todayPageIndex]);
    setText('spacePosition',`${todayPageIndex===0?'Home · ':''}${todayPageIndex===0?1:todayPageIndex} of ${todayPages.length-1}`);
    const prev=$('spacePrev'),next=$('spaceNext');
    if(prev){prev.disabled=todayPageIndex===0;prev.style.opacity=todayPageIndex===0?.35:1;}
    if(next){next.disabled=todayPageIndex===todayPages.length-1;next.style.opacity=todayPageIndex===todayPages.length-1?.35:1;}
  }
  function switchTodayPage(page, push=true){
    if(page==='home') todayPageIndex=0; else { const i=todayPages.indexOf(page); if(i>=0) todayPageIndex=i; }
    document.querySelectorAll('#viewToday .today-page').forEach(v=>v.classList.remove('active-today-page'));
    const target=$('today'+(todayPageIndex===0?'Home':'Page'+todayPages[todayPageIndex].charAt(0).toUpperCase()+todayPages[todayPageIndex].slice(1)));
    target?.classList.add('active-today-page');
    renderSpaceNavigator();
    window.scrollTo({top:0,behavior:'smooth'});
  }
  function stepToday(delta){
    const next=Math.max(0,Math.min(todayPages.length-1,todayPageIndex+delta));
    if(next!==todayPageIndex) switchTodayPage(todayPages[next]);
  }

  function switchView(view){
    document.querySelectorAll('.view').forEach(v=>v.classList.remove('active-view'));
    const id='view'+view;
    $(id)?.classList.add('active-view');
    document.querySelectorAll('.navBtn').forEach(b=>b.classList.toggle('active',b.dataset.view===view));
    syncNavA11y(view);
    window.scrollTo({top:0,behavior:'smooth'});
    if(view==='Notes')renderNotes();
    if(view==='Reflect'){renderReflection();renderCheckin();}
  }

  function openEditor(type='note'){
    const m=$('editorModal');if(!m)return;
    m.dataset.type=type;m.dataset.editId='';
    setText('editorLabel',type==='note'?'NOTE':'REMINDER');
    setText('editorTitle',type==='note'?'A place for your words.':'Add something to your day.');
    const editorOptions=document.querySelector('.taskEditorOptions');
    if(editorOptions) editorOptions.hidden=type==='note';
    const editorSave=$('editorSave');
    if(editorSave) editorSave.textContent=type==='note'?'Save note':'Add reminder';
    $('editorInput').value='';$('editorNote').value='';$('editorTime').value='';$('editorMode').value='guided';
    m.classList.add('open');setTimeout(()=>$('editorInput')?.focus(),50);
  }

  function closeEditor(){$('editorModal')?.classList.remove('open');}

  function saveEditor(){
    const m=$('editorModal'),type=m?.dataset.type||'note';
    const title=$('editorInput').value.trim(), text=$('editorNote').value.trim();
    if(!title && !text){$('editorInput').focus();return;}
    if(type==='note'){
      S.notes.push({id:'note-'+Date.now(),title:title||'A note',text:text||title,created:Date.now()});
      save();closeEditor();switchView('Notes');renderNotes();return;
    }
    S.customReminders.push({id:'custom-'+Date.now(),text:title,time:$('editorTime').value||'10:00',mode:$('editorMode').value,repeat:'once',createdDate:today(),enabled:true,note:text});
    save();closeEditor();renderAll();
  }

  function openDaySetup(){
    $('dayModal')?.classList.add('open');renderReminderEditor();
  }

  // Check-ins
  document.querySelectorAll('[data-mood]').forEach(b=>b.addEventListener('click',()=>{
    S.mood=b.dataset.mood;S.lastMoodDate=today();save();renderCheckin();
  }));
  document.querySelectorAll('[data-energy]').forEach(b=>b.addEventListener('click',()=>{
    S.energy=b.dataset.energy;save();renderCheckin();
  }));
  $('thoughts')?.addEventListener('input',e=>{S.thoughts=e.target.value;save();});

  // Day mode
  document.querySelectorAll('[data-daymode]').forEach(b=>b.addEventListener('click',()=>{
    S.dayMode=b.dataset.daymode;
    if(S.dayMode!=='mixed') S.sectionModes={morning:S.dayMode,work:S.dayMode,evening:S.dayMode,wind:S.dayMode};
    save();renderGuidance();
  }));
  $('editDayBtn')?.addEventListener('click',openDaySetup);
  document.querySelectorAll('[data-daymode-modal]').forEach(b=>b.addEventListener('click',()=>{
    S.dayMode=b.dataset.daymodeModal;
    if(S.dayMode!=='mixed')S.sectionModes={morning:S.dayMode,work:S.dayMode,evening:S.dayMode,wind:S.dayMode};
    document.querySelectorAll('[data-section]').forEach(e=>e.value=S.sectionModes[e.dataset.section]);
  }));
  $('sectionModeBtn')?.addEventListener('click',()=>{
    const sec=sectionFor(currentPhase());
    S.sectionModes[sec]=S.sectionModes[sec]==='structured'?'guided':'structured';
    S.dayMode='mixed';save();renderGuidance();
  });
  $('saveDayBtn')?.addEventListener('click',()=>{
    document.querySelectorAll('[data-section]').forEach(e=>S.sectionModes[e.dataset.section]=e.value);
    document.querySelectorAll('[data-plan]').forEach(e=>S.planChoices[e.dataset.plan]=e.checked);
    const specs=[['morning','morningDirectiveEnabled','morningDirectiveTime','morningDirectiveText','daily'],['night','nightDirectiveEnabled','nightDirectiveTime','nightDirectiveText','daily'],['friday','fridayDirectiveEnabled','fridayDirectiveTime','fridayDirectiveText','friday']];
    specs.forEach(([id,en,ti,tx,repeat])=>{
      let r=S.reminders.find(x=>x.id===id);
      if(!r){r={id,repeat,mode:'structured',enabled:true,text:'Reminder',time:'08:00'};S.reminders.push(r);}
      r.enabled=$(en).checked;r.time=$(ti).value||r.time;r.text=$(tx).value.trim()||r.text;r.repeat=repeat;
    });
    save();$('dayModal')?.classList.remove('open');renderAll();
  });
  $('dayClose')?.addEventListener('click',()=>$('dayModal')?.classList.remove('open'));

  // Add custom reminder from day setup
  $('addCustomReminder')?.addEventListener('click',()=>{
    const text=$('customTaskText').value.trim();if(!text)return;
    S.customReminders.push({id:'custom-'+Date.now(),text,time:$('customTaskTime').value||'10:00',mode:$('customTaskMode').value,repeat:$('customTaskRepeat').value,createdDate:today(),enabled:true});
    $('customTaskText').value='';save();renderCustomReminderList();
  });
  $('customReminderList')?.addEventListener('click',e=>{
    const id=e.target.dataset.removeReminder;if(!id)return;
    S.customReminders=S.customReminders.filter(r=>r.id!==id);save();renderCustomReminderList();
  });

  // Missed chosen direction
  $('directiveKeep')?.addEventListener('click',()=>{
    const id=$('directiveNotice')?.dataset.reminderId;if(!id)return;
    setReminderStatus(id,{acknowledged:true,missed:true});renderReminderNotice();
  });
  $('directiveOptional')?.addEventListener('click',()=>{
    const id=$('directiveNotice')?.dataset.reminderId;if(!id)return;
    const r=allReminders().find(x=>x.id===id);
    if(r)r.mode='guided';
    setReminderStatus(id,{acknowledged:true,missed:true});save();renderReminderNotice();
  });
  // Add explicit action buttons once to the notice.
  const notice=$('directiveNotice');
  if(notice && !notice.querySelector('.reminderActions')){
    const actions=document.createElement('div');actions.className='directiveActions reminderActions';
    actions.innerHTML='<button class="primary" id="reminderDone">I did it</button><button class="secondary" id="reminderLater">Not right now</button>';
    notice.appendChild(actions);
    $('reminderDone').addEventListener('click',()=>{
      const id=notice.dataset.reminderId;if(!id)return;setReminderStatus(id,{done:true,acknowledged:true});notice.hidden=true;renderAll();
    });
    $('reminderLater').addEventListener('click',()=>{
      const id=notice.dataset.reminderId;if(!id)return;setReminderStatus(id,{dismissed:true,acknowledged:true});notice.hidden=true;renderAll();
    });
  }

  // Optional tasks
  $('essentialTasks')?.addEventListener('change',e=>{
    const input=e.target.closest('input[type="checkbox"]');if(!input)return;
    const labels=[...document.querySelectorAll('#essentialTasks input[type="checkbox"]')];
    S.optionalTasks=labels.map(x=>x.checked);save();renderTasks();
  });

  // Work tracker
  $('plus')?.addEventListener('click',()=>{S.delivered=Math.max(0,S.delivered+1);if(S.packages && S.delivered>S.packages)S.delivered=S.packages;save();renderWork();});
  $('minus')?.addEventListener('click',()=>{S.delivered=Math.max(0,S.delivered-1);save();renderWork();});
  $('packageWindow')?.addEventListener('click',()=>{
    const value=prompt('How many packages would you like to track today?','');
    if(value===null)return;
    const n=parseInt(value,10);
    if(Number.isFinite(n)&&n>=0){S.packages=n;S.delivered=Math.min(S.delivered,n);save();renderWork();}
  });

  // Pause choices
  const pauseCopy={
    Pause:'Take a moment before deciding what happens next.',
    Feeling:'You can name the feeling without having to obey it.',
    Need:'Ask: “What would actually help me right now?”',
    Choice:'There is more than one possible next step. You get to choose.'
  };
  document.querySelectorAll('[data-pause]').forEach(b=>b.addEventListener('click',()=>{
    setText('pauseText',pauseCopy[b.dataset.pause]||'Pause and choose what feels useful.');
  }));

  // Support
  document.querySelectorAll('[data-support]').forEach(b=>b.addEventListener('click',()=>{
    const [title,text]=SUPPORT[b.dataset.support]||SUPPORT.unsure;
    const box=$('supportResponse');
    if(box)box.innerHTML=`<b>${escapeHTML(title)}</b><p>${escapeHTML(text)}</p><button class="softButton supportReset" type="button">Leave this here</button>`;
    box?.querySelector('.supportReset')?.addEventListener('click',()=>{
      box.innerHTML='<b>You stay in charge.</b><p>I’ll offer a little space or a question to help you find your own next step.</p>';
    });
  }));

  // Reflection
  $('newQuestion')?.addEventListener('click',()=>{
    S.reflectQuestion=(S.reflectQuestion+1)%QUESTIONS.length;save();renderReflection();
  });

  // Notes/editor
  $('quickAdd')?.addEventListener('click',()=>openEditor('note'));
  $('noteAdd')?.addEventListener('click',()=>openEditor('note'));
  $('editorClose')?.addEventListener('click',closeEditor);
  $('editorCancel')?.addEventListener('click',closeEditor);
  $('editorSave')?.addEventListener('click',saveEditor);
  $('notesList')?.addEventListener('click',e=>{
    const id=e.target.dataset.noteDelete;if(!id)return;
    S.notes=S.notes.filter(n=>n.id!==id);save();renderNotes();
  });

  // Navigation
  document.querySelectorAll('[data-today-page]').forEach(b=>b.addEventListener('click',()=>{
    const page=b.dataset.todayPage;
    if(page) switchTodayPage(page);
  }));
  let swipeStartX=null;
  const todayView=$('viewToday');
  todayView?.addEventListener('touchstart',e=>{
    if(e.target.closest('button,input,textarea,select')) return;
    swipeStartX=e.changedTouches[0].clientX;
  },{passive:true});
  todayView?.addEventListener('touchend',e=>{
    if(swipeStartX===null)return;
    const dx=e.changedTouches[0].clientX-swipeStartX; swipeStartX=null;
    if(Math.abs(dx)>55) stepToday(dx<0?1:-1);
  },{passive:true});
  $('spacePrev')?.addEventListener('click',()=>stepToday(-1));
  $('spaceNext')?.addEventListener('click',()=>stepToday(1));
  todayView?.addEventListener('keydown',e=>{
    if(e.key==='ArrowLeft') stepToday(-1);
    if(e.key==='ArrowRight') stepToday(1);
  });

  document.querySelectorAll('.navBtn').forEach(b=>b.addEventListener('click',()=>switchView(b.dataset.view)));
  // Escape closes any open modal, which is especially useful during desktop testing.
  document.addEventListener('keydown',e=>{
    if(e.key!=='Escape')return;
    document.querySelectorAll('.modal.open').forEach(m=>m.classList.remove('open'));
  });
  // Make the active tab explicit for assistive technology.
  function syncNavA11y(view){
    document.querySelectorAll('.navBtn').forEach(b=>b.setAttribute('aria-current',b.dataset.view===view?'page':'false'));
  }
  syncNavA11y('Today');
  renderSpaceNavigator();

  // Settings
  $('settingsBtn')?.addEventListener('click',()=>$('settingsModal')?.classList.add('open'));
  $('settingsClose')?.addEventListener('click',()=>$('settingsModal')?.classList.remove('open'));
  $('resetToday')?.addEventListener('click',()=>{
    if(!confirm('Reset today’s check-in and optional task marks?'))return;
    S.mood=null;S.energy=null;S.thoughts='';S.packages=0;S.delivered=0;S.optionalTasks=[false,false,false,false,false];
    save();$('settingsModal')?.classList.remove('open');renderAll();
  });
  $('clearAll')?.addEventListener('click',()=>{
    if(!confirm('Clear all saved Dawnielle’s Day data from this browser?'))return;
    localStorage.removeItem(KEY);location.reload();
  });

  // Close modals by tapping backdrop.
  document.querySelectorAll('.modal').forEach(m=>m.addEventListener('click',e=>{if(e.target===m)m.classList.remove('open');}));

  // Keep the date/clock and reminder state current without being noisy.
  renderAll();
  setInterval(()=>{renderHeader();renderGuidance();renderReminderNotice();renderReminderBanner();},30000);
})();
