/**
 * WaEmojiPanel v6 — WhatsApp-style panel, crash-free
 * Fixes: no _adjustInputBar (causes crashes), proper emoji name search,
 *        GIPHY stickers, clean view-once "1" icon in send button
 */
(function(G){
'use strict';

/* ══ Tenor API (GIFs) ════════════════════════════════════════════ */
var TENOR = 'LIVDSRZULELA';
var GIPHY_KEY = 'ajrhVJK9XB45nB7sp5dwjZkVBdz94lw1';
var GIPHY = 'ajrhVJK9XB45nB7sp5dwjZkVBdz94lw1';
/* ══ Stipop API (Stickers) ═══════════════════════════════════════ */
var STIPOP_KEY = 'd01135176667e68d4978102786dcb6c1';
var STIPOP_UID = 'suai_physio';

/* ══ Emoji data with searchable names ═══════════════════════════ */
/* Each entry: [emoji, name] — name is used for search */
var EMOJI_DATA = [
  /* Smileys */
  ['😀','grinning'],['😃','smiley'],['😄','smile'],['😁','beaming'],['😆','laughing'],['😅','sweat smile'],['🤣','rofl rolling'],['😂','joy laugh cry'],['🙂','slightly smiling'],['🙃','upside down'],['😉','wink'],['😊','blush'],['😇','angel halo'],['🥰','smiling hearts love'],['😍','heart eyes love'],['🤩','star struck'],['😘','kiss blow'],['😗','kissing'],['😚','kissing closed'],['😙','kissing smiling'],['😋','yum'],['😛','tongue'],['😜','wink tongue'],['🤪','crazy zany'],['😝','stuck out tongue'],['🤑','money mouth'],['🤗','hugging'],['🤭','hand over mouth'],['🤫','shushing quiet'],['🤔','thinking'],['🤐','zipper mouth'],['🤨','raised eyebrow'],['😐','neutral'],['😑','expressionless'],['😶','no mouth'],['😏','smirk'],['😒','unamused'],['🙄','eye roll'],['😬','grimace'],['🤥','lying'],['😌','relieved'],['😔','pensive'],['😪','sleepy'],['🤤','drooling'],['😴','sleeping zzz'],['😷','mask sick'],['🤒','sick thermometer'],['🤕','hurt bandage'],['🤢','nauseated sick'],['🤮','vomit sick'],['🤧','sneezing'],['🥵','hot face'],['🥶','cold face'],['🥴','woozy'],['😵','dizzy'],['🤯','exploding head'],['🤠','cowboy hat'],['🥳','partying'],['😎','sunglasses cool'],['🤓','nerd glasses'],['🧐','monocle'],['😕','confused'],['😟','worried'],['🙁','frowning'],['☹️','frown'],['😣','persevere'],['😖','confounded'],['😫','tired'],['😩','weary'],['🥺','pleading eyes beg'],['😢','cry tear'],['😭','loudly crying sob'],['😤','steam nose angry'],['😠','angry'],['😡','rage red'],['🤬','swearing cursing'],['😈','devil smiling'],['👿','devil angry'],['💀','skull dead'],['☠️','skull crossbones'],['💩','poop pile'],['🤡','clown'],['👹','ogre monster'],['👺','goblin'],['👻','ghost'],['👽','alien'],['👾','alien monster game'],['🤖','robot'],
  /* People & hands */
  ['👋','wave hello'],['🤚','raised back hand'],['🖐️','hand five'],['✋','raised hand'],['🖖','vulcan spock'],['👌','ok hand'],['🤌','pinched fingers italian'],['✌️','peace victory'],['🤞','fingers crossed luck'],['🤟','love you gesture'],['🤘','horns rock'],['🤙','call me shaka'],['👈','point left'],['👉','point right'],['👆','point up'],['👇','point down'],['☝️','index up'],['👍','thumbs up yes like'],['👎','thumbs down no dislike'],['✊','fist raised'],['👊','fist punch'],['🤛','left fist'],['🤜','right fist'],['👏','clapping hands'],['🙌','raising hands'],['👐','open hands'],['🤲','palms up'],['🤝','handshake'],['🙏','pray folded hands'],['✍️','writing hand'],['💅','nail polish'],['💪','muscle flex strong'],['🦾','mechanical arm'],['🧠','brain mind'],['👀','eyes looking'],['👅','tongue'],['👄','mouth lips'],
  /* Nature */
  ['🐶','dog puppy'],['🐱','cat kitten'],['🐭','mouse'],['🐹','hamster'],['🐰','rabbit bunny'],['🦊','fox'],['🐻','bear'],['🐼','panda'],['🐯','tiger'],['🦁','lion'],['🐮','cow'],['🐷','pig'],['🐸','frog'],['🐵','monkey'],['🐔','chicken'],['🐧','penguin'],['🐦','bird'],['🦆','duck'],['🦅','eagle'],['🦉','owl'],['🦇','bat'],['🐺','wolf'],['🦄','unicorn'],['🐝','bee'],['🦋','butterfly'],['🐌','snail'],['🐞','ladybug'],['🐜','ant'],['🐢','turtle'],['🐍','snake'],['🦎','lizard'],['🐙','octopus'],['🦑','squid'],['🐟','fish'],['🐬','dolphin'],['🐳','whale'],['🦈','shark'],['🐊','crocodile'],['🐅','tiger big cat'],['🐆','leopard'],['🦓','zebra'],['🐘','elephant'],['🦒','giraffe'],['🐕','dog'],['🐈','cat'],['🌸','blossom flower'],['🌺','hibiscus flower'],['🌻','sunflower'],['🌹','rose'],['🌷','tulip'],['🌱','seedling plant'],['🌿','herb leaf'],['🍀','four leaf clover luck'],['🌴','palm tree'],['🌵','cactus'],['🍁','maple leaf fall'],['🍂','fallen leaf autumn'],['🍄','mushroom'],['🌍','earth globe'],['🌙','moon crescent'],['⭐','star'],['🌟','glowing star'],['💫','dizzy star'],['⚡','lightning bolt zap'],['🔥','fire hot flame'],['🌈','rainbow'],['☀️','sun sunny'],['🌊','wave ocean sea'],['💧','drop water'],
  /* Food */
  ['🍎','apple red'],['🍊','orange tangerine'],['🍋','lemon'],['🍌','banana'],['🍉','watermelon'],['🍇','grapes'],['🍓','strawberry'],['🫐','blueberry'],['🍒','cherries'],['🍑','peach'],['🥭','mango'],['🍍','pineapple'],['🥥','coconut'],['🥝','kiwi'],['🍅','tomato'],['🍆','eggplant'],['🥑','avocado'],['🥦','broccoli'],['🌽','corn'],['🥕','carrot'],['🥔','potato'],['🍞','bread'],['🥐','croissant'],['🥚','egg'],['🍳','fried egg'],['🥞','pancakes'],['🧇','waffle'],['🥓','bacon'],['🍗','chicken leg'],['🍖','meat bone'],['🌮','taco'],['🌯','burrito wrap'],['🍱','bento box'],['🍣','sushi'],['🍜','noodles ramen'],['🍝','spaghetti pasta'],['🍲','pot stew'],['🍤','fried shrimp'],['🦀','crab'],['🦞','lobster'],['🦐','shrimp'],['🍦','ice cream soft serve'],['🍧','shaved ice'],['🍩','doughnut donut'],['🍪','cookie'],['🎂','birthday cake'],['🍰','shortcake slice'],['🧁','cupcake'],['🍫','chocolate bar'],['🍬','candy'],['🍭','lollipop'],['🍼','baby bottle'],['☕','coffee hot'],['🍵','tea'],['🧋','bubble tea boba'],['🍺','beer'],['🍻','beers cheers'],['🥂','champagne'],['🍷','wine'],['🥃','whiskey glass'],['🍸','cocktail'],['🍹','tropical drink'],
  /* Activity */
  ['⚽','soccer football'],['🏀','basketball'],['🏈','american football'],['⚾','baseball'],['🎾','tennis'],['🏐','volleyball'],['🏉','rugby'],['🎱','billiards pool'],['🏓','ping pong table tennis'],['🏸','badminton'],['🥊','boxing gloves'],['🥋','martial arts karate'],['🎯','dart target'],['🎮','video game controller'],['🎲','dice game'],['♟️','chess'],['🎭','performing arts theater'],['🎨','art palette painting'],['🎼','musical score'],['🎵','music note'],['🎶','musical notes'],['🎤','microphone singing'],['🎧','headphones music'],['🎷','saxophone'],['🎸','guitar'],['🎹','piano keyboard'],['🎺','trumpet'],['🎻','violin'],['🥁','drum'],['🎪','circus'],['🤿','diving scuba'],['🏹','bow arrow'],['🎣','fishing'],['⛷️','skier ski'],['🏄','surfing'],['🚴','cycling bike'],['🏊','swimming'],['🧘','meditation yoga'],['🤸','gymnastics cartwheel'],['🏋️','weightlifting gym'],['🎉','party popper celebration'],['🎊','confetti ball party'],['🎈','balloon'],['🎁','gift present'],['🏆','trophy award'],['🥇','gold medal first'],['🥈','silver medal second'],['🥉','bronze medal third'],
  /* Travel */
  ['🌍','world earth globe africa'],['🗺️','map world'],['🧭','compass'],['🏔️','mountain snow'],['🌋','volcano'],['🏕️','camping tent'],['🏖️','beach sand'],['🏜️','desert'],['🏝️','island'],['🏟️','stadium'],['🏛️','classical building'],['🏗️','building construction'],['🏘️','houses'],['🏠','house home'],['🏡','house garden'],['🏢','office building'],['🏥','hospital'],['🏦','bank'],['🏨','hotel'],['🏪','convenience store'],['🏫','school'],['🏬','department store'],['🏭','factory'],['🏯','japanese castle'],['🏰','european castle'],['⛪','church'],['⛩️','shinto shrine'],['⛲','fountain'],['🌃','night stars city'],['🌄','sunrise mountain'],['🌅','sunrise'],['🌆','cityscape dusk'],['🌇','sunset city'],['🌉','bridge night'],['🚂','locomotive train'],['🚇','metro subway'],['🚌','bus'],['🚑','ambulance'],['🚒','fire engine truck'],['🚓','police car'],['🚕','taxi cab'],['🚗','car automobile'],['🚙','suv car'],['🚚','delivery truck'],['🚜','tractor farm'],['🏎️','racing car'],['🏍️','motorcycle'],['🛵','scooter moped'],['🚲','bicycle bike'],['✈️','airplane flight'],['🚁','helicopter'],['🚀','rocket space'],['🛸','ufo flying saucer'],['⛵','sailboat'],['🚢','ship cruise'],
  /* Objects */
  ['⌚','watch clock'],['📱','phone mobile cell'],['💻','laptop computer'],['⌨️','keyboard'],['🖥️','desktop monitor'],['📷','camera photo'],['📹','video camera'],['🎥','movie camera film'],['📞','telephone'],['☎️','phone landline'],['📺','television tv'],['📻','radio'],['💡','light bulb idea'],['🔦','flashlight torch'],['💰','money bag cash'],['💳','credit card'],['💵','dollar bill money'],['✉️','envelope letter email'],['📧','email'],['📦','package box'],['📰','newspaper news'],['📚','books'],['📖','book open'],['🔑','key'],['🔒','lock locked'],['🔓','unlock open'],['🔨','hammer tool'],['🛠️','tools wrench'],['⚔️','swords crossed'],['🔧','wrench tool'],['⚙️','gear settings'],['🔬','microscope science'],['🔭','telescope astronomy'],['💉','syringe injection'],['💊','pill medicine'],['🩹','bandage'],['🩺','stethoscope doctor'],['🛒','shopping cart'],['🧸','teddy bear toy'],
  /* Symbols */
  ['❤️','red heart love'],['🧡','orange heart'],['💛','yellow heart'],['💚','green heart'],['💙','blue heart'],['💜','purple heart'],['🖤','black heart'],['🤍','white heart'],['🤎','brown heart'],['❤️‍🔥','heart fire love'],['💔','broken heart'],['❣️','heart exclamation'],['💕','two hearts'],['💞','revolving hearts'],['💓','beating heart'],['💗','growing heart'],['💖','sparkling heart'],['💘','heart arrow cupid'],['💝','heart ribbon'],['💯','hundred percent 100'],['✅','check mark done'],['❌','cross mark no'],['⭕','circle ring'],['🛑','stop sign'],['⛔','no entry'],['❗','exclamation'],['❓','question'],['‼️','double exclamation'],['⁉️','question exclamation'],['♻️','recycle'],['⚠️','warning caution'],['🔱','trident'],['🔰','beginner'],['ℹ️','information'],['▶️','play'],['⏸️','pause'],['⏭️','next skip'],['⏩','fast forward'],['⏪','rewind'],['🔄','refresh repeat'],['🔙','back'],['🔛','on'],['🔝','top'],['➡️','right arrow'],['⬅️','left arrow'],['⬆️','up arrow'],['⬇️','down arrow'],['💤','zzz sleep'],['🔕','mute no sound'],['🔔','bell notification'],['🔊','loud speaker'],['🔈','speaker low'],['🔇','mute speaker'],
  /* Flags */
  ['🏁','chequered flag race'],['🚩','triangular flag'],['🎌','crossed flags japan'],['🏴','black flag'],['🏳️','white flag'],['🏴‍☠️','pirate flag skull'],['🇳🇬','nigeria naija ng'],['🇬🇭','ghana gh'],['🇿🇦','south africa za'],['🇰🇪','kenya ke'],['🇺🇸','united states usa america us'],['🇬🇧','united kingdom uk britain gb'],['🇨🇦','canada ca'],['🇦🇺','australia au'],['🇩🇪','germany de'],['🇫🇷','france fr'],['🇮🇳','india in'],['🇨🇳','china cn'],['🇯🇵','japan jp'],['🇧🇷','brazil br'],['🇲🇽','mexico mx'],['🇷🇺','russia ru'],['🇰🇷','south korea kr'],['🇮🇹','italy it'],['🇪🇸','spain es']
];

/* Category groupings (indices into EMOJI_DATA) */
var CAT_RANGES = {
  recent: null, // loaded from localStorage
  smileys: [0, 79],
  people: [80, 114],
  nature: [115, 174],
  food: [175, 234],
  activity: [235, 284],
  travel: [285, 344],
  objects: [345, 382],
  symbols: [383, 419],
  flags: [420, 444]
};
var CAT_ICONS = {recent:'🕐',smileys:'😊',people:'👋',nature:'🌿',food:'🍎',activity:'⚽',travel:'✈️',objects:'💡',symbols:'❤️',flags:'🏳️'};
var CAT_KEYS = Object.keys(CAT_ICONS);

/* Quick emoji — shown on hold of emoji button */
var QUICK = ['😂','🔥','💯','❤️','👍','🙏','😭','😎','💀','🤣','🥺','😤','👏','✨','🎉','🤔','😍','🫶','🎄','🎅','🐣','🌹','⚽','🏀','🤲','💔','😏','🫡','😴','🤯'];

/* ══ Built-in stickers ═══════════════════════════════════════════ */
function _mk(w,h,s){return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 '+w+' '+h+'">'+s+'</svg>');}
var STKS = [
  {src:_mk(200,220,'<rect width="200" height="220" rx="14" fill="#fff"/><rect x="62" y="10" width="76" height="72" rx="4" fill="#fff" stroke="#111" stroke-width="4.5"/><rect x="70" y="18" width="60" height="56" rx="2" fill="#111"/><circle cx="100" cy="46" r="14" fill="#333"/><circle cx="100" cy="46" r="6" fill="#777"/><line x1="100" y1="82" x2="100" y2="115" stroke="#111" stroke-width="5.5" stroke-linecap="round"/><line x1="100" y1="120" x2="100" y2="172" stroke="#111" stroke-width="5.5" stroke-linecap="round"/><line x1="100" y1="128" x2="56" y2="152" stroke="#111" stroke-width="5.5" stroke-linecap="round"/><line x1="100" y1="128" x2="148" y2="108" stroke="#111" stroke-width="5.5" stroke-linecap="round"/><rect x="118" y="62" width="36" height="14" rx="4" fill="#222"/><rect x="132" y="76" width="12" height="18" rx="3" fill="#222"/><line x1="100" y1="172" x2="76" y2="215" stroke="#111" stroke-width="5.5" stroke-linecap="round"/><line x1="100" y1="172" x2="124" y2="215" stroke="#111" stroke-width="5.5" stroke-linecap="round"/><text x="100" y="218" text-anchor="middle" font-size="10" fill="#333" font-family="Arial" font-weight="bold">Delete am fast</text>'),label:'Delete Am Fast',pack:'Naija'},
  {src:_mk(200,200,'<rect width="200" height="200" rx="14" fill="#1a1a2e"/><ellipse cx="100" cy="90" rx="70" ry="62" fill="#4caf50"/><ellipse cx="100" cy="108" rx="54" ry="46" fill="#66bb6a"/><circle cx="80" cy="76" r="14" fill="white"/><circle cx="120" cy="76" r="14" fill="white"/><circle cx="83" cy="79" r="8" fill="#111"/><circle cx="123" cy="79" r="8" fill="#111"/><circle cx="85" cy="77" r="3" fill="white"/><circle cx="125" cy="77" r="3" fill="white"/><path d="M78 108 Q100 97 122 108" stroke="#2e7d32" stroke-width="3.5" fill="none"/><ellipse cx="100" cy="124" rx="26" ry="14" fill="#a5d6a7"/><rect x="132" y="110" width="38" height="30" rx="3" fill="#1565c0"/><rect x="135" y="113" width="32" height="24" rx="2" fill="white"/><line x1="140" y1="118" x2="163" y2="118" stroke="#aaa" stroke-width="1.5"/><line x1="140" y1="123" x2="163" y2="123" stroke="#aaa" stroke-width="1.5"/><line x1="140" y1="128" x2="156" y2="128" stroke="#aaa" stroke-width="1.5"/><text x="100" y="188" text-anchor="middle" font-size="12" fill="#a5d6a7" font-family="Arial" font-weight="bold">spare the weak</text>'),label:'Spare The Weak',pack:'Naija'},
  {src:_mk(200,200,'<rect width="200" height="200" rx="14" fill="#0d0d0d"/><ellipse cx="100" cy="88" rx="62" ry="56" fill="#f5f5f5"/><ellipse cx="100" cy="44" rx="56" ry="18" fill="#1565c0"/><rect x="47" y="38" width="106" height="20" rx="6" fill="#1976d2"/><rect x="37" y="54" width="28" height="9" rx="4" fill="#1565c0"/><ellipse cx="44" cy="96" rx="20" ry="32" fill="#e0e0e0" transform="rotate(-8,44,96)"/><ellipse cx="156" cy="96" rx="20" ry="32" fill="#e0e0e0" transform="rotate(8,156,96)"/><ellipse cx="85" cy="80" rx="7" ry="8" fill="#1a1a1a"/><ellipse cx="115" cy="80" rx="7" ry="8" fill="#1a1a1a"/><circle cx="87" cy="78" r="2.5" fill="white"/><circle cx="117" cy="78" r="2.5" fill="white"/><path d="M80 95 Q88 88 96 95" stroke="#333" stroke-width="2.5" fill="none"/><path d="M104 95 Q112 88 120 95" stroke="#333" stroke-width="2.5" fill="none"/><ellipse cx="100" cy="108" rx="20" ry="13" fill="#ddd"/><circle cx="94" cy="104" r="3.5" fill="#555"/><circle cx="106" cy="104" r="3.5" fill="#555"/><path d="M86 116 Q100 108 114 116" stroke="#444" stroke-width="3" fill="none"/><ellipse cx="100" cy="168" rx="46" ry="18" fill="#e64a19"/><ellipse cx="100" cy="155" rx="46" ry="14" fill="#ff7043"/><text x="100" y="194" text-anchor="middle" font-size="11" fill="#ff8a65" font-family="Arial">fed up 😤</text>'),label:'Fed Up Dog',pack:'Naija'},
  {src:_mk(220,200,'<rect width="220" height="200" rx="14" fill="#0a1628"/><text x="110" y="32" text-anchor="middle" font-size="13" fill="#ffd54f" font-family="Arial" font-weight="bold">You\'re too young</text><text x="110" y="49" text-anchor="middle" font-size="13" fill="#ffd54f" font-family="Arial" font-weight="bold">for a sticker battle</text><circle cx="65" cy="92" r="20" fill="#c8a882"/><rect x="44" y="112" width="42" height="52" rx="5" fill="#e65100"/><ellipse cx="65" cy="108" rx="12" ry="7" fill="#ddd"/><circle cx="59" cy="88" r="3" fill="#333"/><circle cx="71" cy="88" r="3" fill="#333"/><circle cx="155" cy="92" r="20" fill="#c8a882"/><rect x="134" y="112" width="42" height="52" rx="5" fill="#e65100"/><ellipse cx="155" cy="108" rx="12" ry="7" fill="#ddd"/><circle cx="149" cy="88" r="3" fill="#333"/><circle cx="161" cy="88" r="3" fill="#333"/><rect x="80" y="146" width="60" height="9" rx="4" fill="#5d4037"/><rect x="85" y="155" width="7" height="12" rx="2" fill="#5d4037"/><rect x="128" y="155" width="7" height="12" rx="2" fill="#5d4037"/><text x="110" y="194" text-anchor="middle" font-size="10" fill="#ffb74d" font-family="Arial">certified OGs 🔒</text>'),label:'Too Young',pack:'Naija'},
  {src:_mk(200,200,'<rect width="200" height="200" rx="14" fill="#1b5e20"/><ellipse cx="100" cy="88" rx="66" ry="60" fill="#4caf50"/><ellipse cx="100" cy="104" rx="50" ry="44" fill="#66bb6a"/><path d="M70 70 Q82 61 94 70 Q82 77 70 70" fill="white" stroke="#2e7d32" stroke-width="1.5"/><path d="M106 70 Q118 61 130 70 Q118 77 106 70" fill="white" stroke="#2e7d32" stroke-width="1.5"/><circle cx="82" cy="70" r="5.5" fill="#111"/><circle cx="118" cy="70" r="5.5" fill="#111"/><circle cx="83.5" cy="69" r="2" fill="white"/><circle cx="119.5" cy="69" r="2" fill="white"/><path d="M80 104 Q90 99 100 102 Q114 99 126 106" stroke="#1b5e20" stroke-width="3" fill="none" stroke-linecap="round"/><ellipse cx="100" cy="116" rx="22" ry="12" fill="#a5d6a7"/><text x="100" y="160" text-anchor="middle" font-size="13" fill="white" font-family="Arial" font-weight="bold">well...</text><text x="100" y="178" text-anchor="middle" font-size="10" fill="#c8e6c9" font-family="Arial">kids will be kids 😂</text>'),label:'Kids Will Be Kids',pack:'Naija'},
  {src:_mk(200,200,'<rect width="200" height="200" rx="14" fill="#fff9c4"/><circle cx="100" cy="44" r="30" fill="white" stroke="#333" stroke-width="4"/><circle cx="88" cy="38" r="4" fill="#333"/><circle cx="112" cy="38" r="4" fill="#333"/><path d="M83 27 Q89 22 95 27" stroke="#333" stroke-width="2.5" fill="none"/><path d="M105 27 Q111 22 117 27" stroke="#333" stroke-width="2.5" fill="none"/><ellipse cx="100" cy="56" rx="8" ry="6.5" fill="#333"/><line x1="100" y1="74" x2="100" y2="138" stroke="#333" stroke-width="5" stroke-linecap="round"/><line x1="100" y1="98" x2="55" y2="78" stroke="#333" stroke-width="5" stroke-linecap="round"/><line x1="100" y1="98" x2="148" y2="78" stroke="#333" stroke-width="5" stroke-linecap="round"/><rect x="148" y="66" width="27" height="10" rx="3" fill="#333"/><rect x="157" y="76" width="9" height="13" rx="2" fill="#333"/><line x1="100" y1="138" x2="78" y2="188" stroke="#333" stroke-width="5" stroke-linecap="round"/><line x1="100" y1="138" x2="122" y2="188" stroke="#333" stroke-width="5" stroke-linecap="round"/><text x="100" y="198" text-anchor="middle" font-size="10" fill="#555" font-family="Arial">omo... 😬</text>'),label:'Omo...',pack:'Naija'},
  // Emoji stickers
  {emoji:'😂',label:'Dead',pack:'Vibes'},{emoji:'💀',label:'Skull',pack:'Vibes'},{emoji:'🗿',label:'Stone',pack:'Vibes'},
  {emoji:'🤡',label:'Clown',pack:'Vibes'},{emoji:'😭',label:'Cry',pack:'Vibes'},{emoji:'😤',label:'Vexed',pack:'Vibes'},
  {emoji:'🥺',label:'Beg',pack:'Vibes'},{emoji:'🤔',label:'Think',pack:'Vibes'},{emoji:'🫡',label:'Salute',pack:'Vibes'},
  {emoji:'🤌',label:'Chef kiss',pack:'Vibes'},{emoji:'💅',label:'Nail',pack:'Vibes'},{emoji:'😈',label:'Devil',pack:'Vibes'},
  {emoji:'🔥',label:'Fire',pack:'Reactions'},{emoji:'💯',label:'100',pack:'Reactions'},{emoji:'✅',label:'Done',pack:'Reactions'},
  {emoji:'👍',label:'Yes',pack:'Reactions'},{emoji:'👎',label:'Nope',pack:'Reactions'},{emoji:'🚀',label:'Rocket',pack:'Reactions'},
  {emoji:'💎',label:'Diamond',pack:'Reactions'},{emoji:'🎉',label:'Party',pack:'Reactions'},{emoji:'👑',label:'King',pack:'Reactions'},
  {emoji:'⚡',label:'Zap',pack:'Reactions'},{emoji:'🏆',label:'Trophy',pack:'Reactions'},{emoji:'🤝',label:'Deal',pack:'Reactions'}
];
var PKI = {recent:'🕐', Naija:'🇳🇬', Vibes:'😂', Reactions:'🔥'};

/* ══ State ═══════════════════════════════════════════════════════ */
var _tab='emoji', _eCat='smileys', _sPack='Naija', _open=false;
var _gifCache={}, _gt=null, _sgt=null;
var _avSkin='623d2e';
var _recentE=[], _recentS=[];
var _cbAdd=null, _cbStk=null, _cbGif=null, _cbVoice=null, _cbGetEl=null, _cbSend=null;

/* ══ CSS ═════════════════════════════════════════════════════════ */
function _css(){
  if(document.getElementById('_wep6css'))return;
  var s=document.createElement('style'); s.id='_wep6css';
  s.textContent=[
    /* panel — overlays everything, does NOT move input bar */
    '#_wep6{display:none;position:fixed;left:0;right:0;bottom:0;z-index:490;background:#111b21;border-radius:14px 14px 0 0;flex-direction:column;height:350px;max-height:50vh;box-shadow:0 -4px 24px rgba(0,0,0,.7)}',
    '#_wep6._on{display:flex}',
    '#_wep6h{width:34px;height:4px;border-radius:2px;background:#2a3942;margin:8px auto 0;flex-shrink:0}',
    /* input preview row */
    '#_wep6ip{display:flex;align-items:center;gap:6px;padding:5px 10px 5px 12px;background:#1f2c34;border-bottom:1px solid #2a3942;flex-shrink:0;min-height:48px}',
    '#_wep6kbd{width:34px;height:34px;border-radius:50%;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#8696a0;flex-shrink:0;-webkit-tap-highlight-color:transparent}',
    '#_wep6kbd:active{background:rgba(255,255,255,.08)}',
    '#_wep6pt{flex:1;min-width:0;font-size:15px;color:#5e6d7a;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;padding:0 2px}',
    '#_wep6pt._has{color:#e9edef}',
    '#_wep6sd{width:36px;height:36px;min-width:36px;border-radius:50%;background:linear-gradient(135deg,#ec4899,#8b5cf6);border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;opacity:0;pointer-events:none;transition:opacity .15s;flex-shrink:0;box-shadow:0 2px 8px rgba(236,72,153,.4)}',
    '#_wep6sd._show{opacity:1;pointer-events:auto}',
    '#_wep6sd:active{transform:scale(.9)}',
    /* tab bar */
    '#_wep6tb{display:flex;align-items:center;padding:6px 8px 3px;gap:4px;flex-shrink:0}',
    '#_wep6pill{flex:1;display:flex;background:#1f2c34;border-radius:22px;padding:3px;gap:1px}',
    '._w6t{flex:1;padding:7px 3px;border:none;background:none;border-radius:18px;cursor:pointer;font-size:11px;display:flex;align-items:center;justify-content:center;color:#8696a0;transition:background .12s,color .12s;-webkit-tap-highlight-color:transparent;font-family:inherit}',
    '._w6t.on{background:#2a3942;color:#fff}',
    '._w6t:active{background:rgba(255,255,255,.07)}',
    '._w6tGif{font-size:11px;font-weight:800;letter-spacing:-.5px}',
    '._w6ico{width:20px;height:20px;pointer-events:none}',
    '#_wep6sr,#_wep6bs{width:30px;height:30px;background:none;border:none;cursor:pointer;display:flex;align-items:center;justify-content:center;color:#8696a0;flex-shrink:0;border-radius:50%;-webkit-tap-highlight-color:transparent}',
    '#_wep6sr:active,#_wep6bs:active{background:rgba(255,255,255,.08)}',
    /* search */
    '#_wep6sb{display:none;padding:4px 10px 2px;flex-shrink:0}',
    '#_wep6sb._on{display:block}',
    '#_wep6si{width:100%;background:#1f2c34;border:1.5px solid #2a3942;border-radius:22px;color:#e9edef;font-size:14px;padding:7px 14px;outline:none;box-sizing:border-box;font-family:inherit}',
    '#_wep6si::placeholder{color:#4a5568}',
    /* content */
    '#_wep6c{flex:1;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;padding:4px 2px 4px}',
    /* emoji grid */
    '._eg6{display:grid;grid-template-columns:repeat(8,1fr);gap:1px;padding:2px}',
    '._eg6 span{font-size:26px;text-align:center;padding:5px 0;border-radius:8px;cursor:pointer;display:block;user-select:none;-webkit-user-select:none;-webkit-tap-highlight-color:transparent}',
    '._eg6 span:active{background:#1f2c34;transform:scale(1.12)}',
    '._e6cat{color:#8696a0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.7px;padding:9px 4px 2px;margin:0}',
    /* category bar */
    '#_wep6cb{display:none;flex-shrink:0;background:#111b21;border-top:1px solid #1f2c34;padding:3px 4px;overflow-x:auto;scrollbar-width:none}',
    '#_wep6cb::-webkit-scrollbar{display:none}',
    '#_wep6cb._on{display:flex}',
    '._c6btn{background:none;border:none;font-size:20px;padding:5px 6px;border-radius:8px;cursor:pointer;flex-shrink:0;border-bottom:2.5px solid transparent;-webkit-tap-highlight-color:transparent;transition:border-color .12s}',
    '._c6btn.on{border-bottom:2.5px solid #a855f7}',
    '._c6btn:active{background:rgba(255,255,255,.06)}',
    /* GIF */
    '._gg6{display:grid;grid-template-columns:repeat(3,1fr);gap:4px;padding:4px}',
    '._gc6{aspect-ratio:1;border-radius:10px;overflow:hidden;cursor:pointer;background:#1f2c34;-webkit-tap-highlight-color:transparent}',
    '._gc6 img{width:100%;height:100%;object-fit:cover;display:block}',
    '._gc6:active{opacity:.8}',
    '._glbl6{color:#8696a0;font-size:11px;font-weight:700;padding:5px 6px 2px;text-transform:uppercase;letter-spacing:.5px}',
    '._gpow6{color:#2a3942;font-size:10px;text-align:center;padding:6px 0 2px}',
    '._gno6{color:#5e6d7a;font-size:13px;text-align:center;padding:24px;grid-column:1/-1}',
    /* Sticker */
    '._sp6{display:flex;align-items:center;gap:1px;padding:3px 6px;overflow-x:auto;scrollbar-width:none;flex-shrink:0;border-bottom:1px solid #1f2c34;background:#111b21}',
    '._sp6::-webkit-scrollbar{display:none}',
    '._spk6{background:none;border:none;font-size:22px;padding:5px 7px;border-radius:8px;cursor:pointer;flex-shrink:0;border-bottom:2.5px solid transparent;-webkit-tap-highlight-color:transparent}',
    '._spk6.on{border-bottom:2.5px solid #a855f7}',
    '._spk6:active{background:#1f2c34}',
    '._sg6{display:grid;grid-template-columns:repeat(4,1fr);gap:5px;padding:8px}',
    '._sc6{background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;gap:3px;padding:6px;border-radius:12px;-webkit-tap-highlight-color:transparent;position:relative}',
    '._sc6:active{background:#1f2c34}',
    '._sc6 img{width:66px;height:66px;object-fit:contain;border-radius:8px}',
    '._sc6 .se6{font-size:48px;line-height:1;display:block}',
    '._sc6 p{color:#8696a0;font-size:9px;margin:0;max-width:66px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:center}',
    '._sc6._held{background:#2a3942;transform:scale(1.08)}',
    '._favhint{position:absolute;top:-26px;left:50%;transform:translateX(-50%);background:#111b21;color:#fbbf24;font-size:10px;padding:3px 8px;border-radius:10px;white-space:nowrap;pointer-events:none;z-index:10;border:1px solid #fbbf2455}',
    /* Avatar */
    '._av6{display:flex;flex-direction:column;align-items:center;justify-content:center;height:100%;padding:18px;gap:12px;text-align:center}',
    '._avR6{display:flex;gap:10px;justify-content:center;margin-bottom:4px}',
    '._avF6{width:72px;height:84px;border-radius:12px;background:#1f2c34;display:flex;align-items:center;justify-content:center;font-size:44px}',
    '._avT6{color:#e9edef;font-size:15px;font-weight:600}',
    '._avS6{color:#8696a0;font-size:13px;line-height:1.5;max-width:300px}',
    '._avB6{background:linear-gradient(135deg,#9333ea,#ec4899);color:#fff;font-weight:700;padding:11px 26px;border-radius:22px;border:none;cursor:pointer;font-size:14px;font-family:inherit;-webkit-tap-highlight-color:transparent}',
    /* shimmer */
    '@keyframes _sh6{0%,100%{background:#1f2c34}50%{background:#2a3942}}',
    '._sh6{animation:_sh6 1.2s ease infinite}',
    /* quick emoji */
    '#_wepQ6{position:fixed;left:0;right:0;bottom:0;z-index:600;background:#1f2c34;border-top:1px solid #2a3942;padding:8px 6px 22px;display:none;flex-wrap:wrap;gap:2px;animation:_qu6 .15s ease}',
    '@keyframes _qu6{from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}',
    '#_wepQ6._on{display:flex}',
    '._qe6{font-size:27px;background:none;border:none;cursor:pointer;padding:4px 2px;border-radius:8px;-webkit-tap-highlight-color:transparent}',
    '._qe6:active{background:#2a3942;transform:scale(1.12)}'
  ].join('');
  document.head.appendChild(s);
}

/* ══ Build ════════════════════════════════════════════════════════ */
function _build(){
  if(document.getElementById('_wep6'))return;
  _css();
  try{_recentE=JSON.parse(localStorage.getItem('_weR6')||'[]');}catch(e){}
  try{_recentS=JSON.parse(localStorage.getItem('_wsR6')||'[]');}catch(e){}

  var p=document.createElement('div'); p.id='_wep6';

  p.innerHTML='<div id="_wep6h"></div>'+
  /* input preview */
  '<div id="_wep6ip">'+
    '<button id="_wep6kbd" onclick="WaEmojiPanel.close()">'+
      '<svg class="_w6ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><rect x="2" y="4" width="20" height="16" rx="3"/><circle cx="7" cy="9" r=".7" fill="currentColor"/><circle cx="12" cy="9" r=".7" fill="currentColor"/><circle cx="17" cy="9" r=".7" fill="currentColor"/><circle cx="7" cy="13" r=".7" fill="currentColor"/><circle cx="12" cy="13" r=".7" fill="currentColor"/><circle cx="17" cy="13" r=".7" fill="currentColor"/><rect x="7" y="16" width="6" height="1" rx=".5" fill="currentColor"/></svg>'+
    '</button>'+
    '<div id="_wep6pt">Message</div>'+
    '<button id="_wep6sd" onclick="WaEmojiPanel._doSend()">'+
      '<svg viewBox="0 0 24 24" width="18" height="18" fill="white"><path d="M1.946 9.315c-.522-.174-.527-.455.01-.634l19.087-6.362c.529-.176.832.12.684.638l-5.454 19.086c-.15.529-.455.547-.679.045L12 14l6-8-8 6-8.054-2.685z"/></svg>'+
    '</button>'+
  '</div>'+
  /* tab bar */
  '<div id="_wep6tb">'+
    '<button id="_wep6sr" onclick="WaEmojiPanel._toggleSrch()">'+
      '<svg class="_w6ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>'+
    '</button>'+
    '<div id="_wep6pill">'+
      '<button class="_w6t on" id="_w6t_emoji" onclick="WaEmojiPanel._switchTab(\'emoji\')">'+
        '<svg class="_w6ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M8 14s1.5 2 4 2 4-2 4-2"/><line x1="9" y1="9" x2="9.01" y2="9" stroke-width="3"/><line x1="15" y1="9" x2="15.01" y2="9" stroke-width="3"/></svg>'+
      '</button>'+
      '<button class="_w6t" id="_w6t_gif" onclick="WaEmojiPanel._switchTab(\'gif\')"><span class="_w6tGif">GIF</span></button>'+
      '<button class="_w6t" id="_w6t_avatar" onclick="WaEmojiPanel._switchTab(\'avatar\')">'+
        '<svg class="_w6ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>'+
      '</button>'+
      '<button class="_w6t" id="_w6t_sticker" onclick="WaEmojiPanel._switchTab(\'sticker\')">'+
        '<svg class="_w6ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c1.4 0 2-.6 2-2v-.5c0-.4.1-.7.3-.9s.5-.3.9-.3H17c2.8 0 5-2.2 5-5 0-5.5-4.5-9.3-10-9.3z"/><circle cx="8.5" cy="11.5" r="1.5" fill="currentColor"/><circle cx="15.5" cy="11.5" r="1.5" fill="currentColor"/><path d="M8 15s1.5 2 4 2 4-2 4-2"/></svg>'+
      '</button>'+
    '</div>'+
    '<button id="_wep6bs" onclick="WaEmojiPanel._bs()">'+
      '<svg class="_w6ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M21 4H8l-7 8 7 8h13a2 2 0 002-2V6a2 2 0 00-2-2z"/><line x1="18" y1="9" x2="12" y2="15"/><line x1="12" y1="9" x2="18" y2="15"/></svg>'+
    '</button>'+
  '</div>'+
  '<div id="_wep6sb"><input id="_wep6si" type="text" placeholder="Search emoji, GIFs, stickers…" autocomplete="off" oninput="WaEmojiPanel._search(this.value)"></div>'+
  '<div id="_wep6c"></div>'+
  '<div id="_wep6cb">'+CAT_KEYS.map(function(k){
    return '<button class="_c6btn'+(k==='smileys'?' on':'')+'" data-cat="'+k+'" onclick="WaEmojiPanel._ecat(\''+k+'\')" title="'+k+'">'+CAT_ICONS[k]+'</button>';
  }).join('')+'</div>';

  document.body.appendChild(p);

  // Long-press on sticker buttons → save to favourites (mobile touch)
  var _stkLp=null,_stkLpBtn=null;
  p.addEventListener('touchstart',function(e){
    var btn=e.target.closest('._sc6[oncontextmenu]');
    if(!btn)return;
    _stkLpBtn=btn;
    _stkLp=setTimeout(function(){
      if(navigator.vibrate)navigator.vibrate(40);
      // Parse src/label from oncontextmenu attr
      var oc=btn.getAttribute('oncontextmenu')||'';
      var m=oc.match(/_favStk\(this,'([^']+)','([^']+)'\)/);
      if(m){
        // Show hint
        var hint=document.createElement('div');hint.className='_favhint';hint.textContent='⭐ Hold = save fav';
        btn.appendChild(hint);
        setTimeout(function(){if(hint.parentElement)hint.remove();},1200);
        WaEmojiPanel._favStk(btn,m[1].replace(/\\'/g,"'"),m[2].replace(/\\'/g,"'"));
      }
    },600);
  },{passive:true});
  p.addEventListener('touchend',function(){clearTimeout(_stkLp);_stkLp=null;},{passive:true});
  p.addEventListener('touchmove',function(){clearTimeout(_stkLp);_stkLp=null;},{passive:true});

  /* quick emoji bar */
  var qb=document.createElement('div'); qb.id='_wepQ6';
  QUICK.forEach(function(e){
    var b=document.createElement('button'); b.className='_qe6'; b.textContent=e;
    b.onclick=function(){WaEmojiPanel._addE(e);_closeQ();};
    qb.appendChild(b);
  });
  var qx=document.createElement('button'); qx.className='_qe6';
  qx.innerHTML='<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#8696a0" stroke-width="2.5"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>';
  qx.onclick=_closeQ;
  qb.appendChild(qx);
  document.body.appendChild(qb);

  /* outside click */
  document.addEventListener('click',function(e){
    if(!_open)return;
    var panel=document.getElementById('_wep6');
    if(panel&&!panel.contains(e.target)&&!e.target.closest('#emojiBtnC,#emojiBtnJ,#homeEmojiBtn,#_wepQ6,[data-wep]'))
      WaEmojiPanel.close();
  });

  _renderEmoji('');
}

/* ══ Input preview ════════════════════════════════════════════════ */
function _syncPrev(){
  try{
    var el=_cbGetEl&&_cbGetEl();
    var pt=document.getElementById('_wep6pt');
    var sd=document.getElementById('_wep6sd');
    if(!pt)return;
    var v=(el&&el.value)||'';
    if(v.trim()){pt.textContent=v;pt.classList.add('_has');if(sd)sd.classList.add('_show');}
    else{pt.textContent='Message';pt.classList.remove('_has');if(sd)sd.classList.remove('_show');}
  }catch(err){}
}

function _doSend(){
  try{
    if(_cbSend){_cbSend();}
    else if(typeof doSend==='function'){doSend();}
    else if(typeof sendChatMessage==='function'){sendChatMessage();}
  }catch(err){console.warn('WaEmojiPanel send err',err);}
  WaEmojiPanel.close();
}

/* ══ Emoji ════════════════════════════════════════════════════════ */
function _getRange(key){
  if(key==='recent') return _recentE.map(function(e){return [e,''];});
  var r=CAT_RANGES[key]; if(!r) return [];
  return EMOJI_DATA.slice(r[0],r[1]+1);
}

function _renderEmoji(q){
  var c=document.getElementById('_wep6c'); if(!c)return;
  var cb=document.getElementById('_wep6cb');
  if(q){
    if(cb)cb.classList.remove('_on');
    var ql=q.toLowerCase().trim();
    var hits=EMOJI_DATA.filter(function(d){
      return d[1].includes(ql) || d[0].includes(ql);
    }).slice(0,64);
    c.innerHTML=hits.length
      ?'<div class="_eg6">'+hits.map(function(d){return _espan(d[0]);}).join('')+'</div>'
      :'<p style="color:#5e6d7a;text-align:center;padding:24px;font-size:13px">No results for "'+_esc(q)+'"<br><span style="font-size:11px">Try: happy, fire, love, nigeria...</span></p>';
    return;
  }
  if(cb)cb.classList.add('_on');
  var key=_eCat;
  var list=_getRange(key);
  if(key==='recent'&&!list.length){
    c.innerHTML='<p style="color:#5e6d7a;text-align:center;padding:24px;font-size:13px">No recent emoji yet</p>';
    return;
  }
  c.innerHTML='<div class="_eg6">'+list.map(function(d){return _espan(d[0]||d);}).join('')+'</div>';
  c.scrollTop=0;
}

function _espan(e){
  return '<span onclick="WaEmojiPanel._addE(\''+_escQ(e)+'\')" title="'+_esc(e)+'">'+e+'</span>';
}

function _ecat(k){
  _eCat=k;
  document.querySelectorAll('._c6btn').forEach(function(b){b.classList.toggle('on',b.dataset.cat===k);});
  _renderEmoji('');
}

/* ══ GIF (Tenor) ══════════════════════════════════════════════════ */
function _renderGif(q){
  var c=document.getElementById('_wep6c'); if(!c)return;
  c.innerHTML='<p class="_glbl6">'+(q?'Results for "'+_esc(q)+'"':'🔥 Trending GIFs')+'</p>'+
    '<div class="_gg6" id="_w6gg">'+_shims(9)+'</div>';
  var url=q
    ?'https://api.giphy.com/v1/gifs/search?api_key='+GIPHY_KEY+'&q='+encodeURIComponent(q)+'&limit=18&rating=g'
    :'https://api.giphy.com/v1/gifs/trending?api_key='+GIPHY_KEY+'&limit=18&rating=g';
  if(_gifCache[url]){_showGifs(_gifCache[url]);return;}
  fetch(url)
    .then(function(r){return r.json();})
    .then(function(d){_gifCache[url]=d;_showGifs(d);})
    .catch(function(){
      var g=document.getElementById('_w6gg');
      if(g)g.innerHTML='<div class="_gno6">No internet connection — GIFs need internet</div>';
    });
}

function _showGifs(d){
  var g=document.getElementById('_w6gg'); if(!g)return;
  var res=(d&&d.data)||[];
  if(!res.length){g.innerHTML='<div class="_gno6">No GIFs found — try another search</div>';return;}
  g.innerHTML=res.map(function(r){
    var url2=(r.images&&r.images.fixed_height_small&&r.images.fixed_height_small.url)||(r.images&&r.images.fixed_height&&r.images.fixed_height.url)||'';
    var title=((r.title||'GIF')+'').substring(0,20);
    return '<div class="_gc6" onclick="WaEmojiPanel._onGif(\''+_escQ((r.images&&r.images.fixed_height&&r.images.fixed_height.url)||url2)+'\',\''+_escQ(title)+'\')" title="'+_esc(title)+'">'+
      (url2?'<img src="'+_esc(url2)+'" alt="'+_esc(title)+'" loading="lazy">':'')+
    '</div>';
  }).join('');
  g.insertAdjacentHTML('afterend','<p class="_gpow6">Powered by GIPHY · Tap to send</p>');
}

/* ══ Stickers ════════════════════════════════════════════════════ */
function _renderStickers(q,pack){
  if(pack)_sPack=pack;
  var c=document.getElementById('_wep6c'); if(!c)return;
  var packs=['recent','fav','Naija','Vibes','Reactions','Xmas','Easter','Love','Sports'];
  var _PKI2={recent:'🕐',fav:'⭐',Naija:'🇳🇬',Vibes:'😂',Reactions:'🔥',Xmas:'🎄',Easter:'🐣',Love:'❤️',Sports:'⚽'};
  // Load user packs from _stkPacks
  try{var _uPacks=JSON.parse(localStorage.getItem('_stkPacks')||'{}');Object.keys(_uPacks).forEach(function(pn){if(!packs.includes(pn)){packs.push(pn);_PKI2[pn]='📦';}});}catch(e){}
  // data-wep prevents outside-click from closing panel when switching packs
  var packBar='<div class="_sp6">'+packs.map(function(pk){
    return '<button data-wep class="_spk6'+(pk===_sPack?' on':'')+'" onclick="WaEmojiPanel._renderStickers(\'\',\''+pk+'\')" title="'+pk+'">'+(_PKI2[pk]||'📦')+'</button>';
  }).join('')+'</div>';

  if(_sPack==='recent'&&!q){
    var items=_recentS;
    if(!items.length){c.innerHTML=packBar+'<p style="color:#5e6d7a;text-align:center;padding:24px;font-size:13px">No recent stickers yet</p>';return;}
    c.innerHTML=packBar+'<p class="_glbl6">Recent</p><div class="_sg6">'+items.map(function(s){
      if(s.src)return '<button data-wep class="_sc6" onclick="WaEmojiPanel._onStk(\''+_escQ(s.src)+'\',\''+_escQ(s.label)+'\')" oncontextmenu="WaEmojiPanel._favStk(this,\''+_escQ(s.src)+'\',\''+_escQ(s.label)+'\');return false" title="'+_esc(s.label)+'"><img src="'+_esc(s.src)+'" alt="'+_esc(s.label)+'" loading="lazy" onerror="_stkImgErr(this)"><p>'+_esc(s.label)+'</p></button>';
      return '<button data-wep class="_sc6" onclick="WaEmojiPanel._onStkE(\''+_escQ(s.emoji||'')+'\',\''+_escQ(s.label)+'\')" title="'+_esc(s.label)+'"><span class="se6">'+(s.emoji||'')+'</span><p>'+_esc(s.label)+'</p></button>';
    }).join('')+'</div>';
    return;
  }

  // Favourites pack
  if(_sPack==='fav'&&!q){
    var _favs=_loadFavStickers();
    if(!_favs.length){c.innerHTML=packBar+'<p style="color:#5e6d7a;text-align:center;padding:24px;font-size:13px">No favourites yet<br><span style="font-size:11px">Long-press any sticker to save ⭐</span></p>';return;}
    c.innerHTML=packBar+'<p class="_glbl6">⭐ Favourites</p><div class="_sg6">'+_favs.map(function(s){
      if(s.src)return '<button data-wep class="_sc6" onclick="WaEmojiPanel._onStk(\''+_escQ(s.src)+'\',\''+_escQ(s.label)+'\')" oncontextmenu="WaEmojiPanel._favStk(this,\''+_escQ(s.src)+'\',\''+_escQ(s.label)+'\');return false"><img src="'+_esc(s.src)+'" loading="lazy" onerror="_stkImgErr(this)"><p>'+_esc(s.label)+'</p></button>';
      return '<button data-wep class="_sc6" onclick="WaEmojiPanel._onStkE(\''+_escQ(s.emoji)+'\',\''+_escQ(s.label)+'\')"><span class="se6">'+s.emoji+'</span><p>'+_esc(s.label)+'</p></button>';
    }).join('')+'</div>';
    return;
  }

  // User-created packs from _stkPacks storage
  try {
    var _uPacksData=JSON.parse(localStorage.getItem('_stkPacks')||'{}');
    if(_uPacksData[_sPack]&&!q){
      var _ups=_uPacksData[_sPack];
      if(!_ups.length){c.innerHTML=packBar+'<p style="color:#5e6d7a;text-align:center;padding:24px;font-size:13px">No stickers in this pack yet</p>';return;}
      c.innerHTML=packBar+'<p class="_glbl6">📦 '+_esc(_sPack)+'</p><div class="_sg6">'+_ups.map(function(item){
        var _src=(item&&item.src)?item.src:item;
        var _lbl=(item&&item.label)?item.label:'Sticker';
        return '<button data-wep class="_sc6" onclick="WaEmojiPanel._onStk(\'' +_escQ(_src)+ '\',\'' +_escQ(_lbl)+ '\')" oncontextmenu="WaEmojiPanel._favStk(this,\'' +_escQ(_src)+ '\',\'' +_escQ(_lbl)+ '\');return false"><img src="'+_esc(_src)+'" loading="lazy" onerror="_stkImgErr(this)"><p>'+_esc(_lbl)+'</p></button>';
      }).join('')+'</div>';
      return;
    }
  } catch(e){}

  // Map packs to Stipop search queries
  var _packQ={Naija:'naija nigeria',Vibes:'vibe mood funny',Reactions:'reaction wow omg',Xmas:'christmas santa snow holiday',Easter:'easter bunny egg spring',Love:'love heart romance kiss',Sports:'sports football soccer basketball'};
  var packQ=q||(_packQ[_sPack]||_sPack.toLowerCase());
  var lbl=q?('Stickers: '+_esc(q)):_esc(_sPack)+' Stickers';
  c.innerHTML=packBar+'<p class="_glbl6">'+lbl+'</p><div class="_sg6" id="_w6sg">'+_shims(8)+'</div>';
  fetch('https://messenger.stipop.io/v1/search?q='+encodeURIComponent(packQ)+'&userId='+STIPOP_UID+'&limit=24',{headers:{'apikey':STIPOP_KEY}})
    .then(function(r){return r.json();})
    .then(function(d){
      var el=document.getElementById('_w6sg'); if(!el)return;
      var res=(d&&d.body&&d.body.stickerList)||[];
      if(!res.length){
        // Fallback: built-in SVG stickers
        var _bi=STKS.slice(0,12);
        el.innerHTML=_bi.map(function(s){
          if(s.src)return '<button data-wep class="_sc6" onclick="WaEmojiPanel._onStk(\''+_escQ(s.src)+'\',\''+_escQ(s.label)+'\')" oncontextmenu="WaEmojiPanel._favStk(this,\''+_escQ(s.src)+'\',\''+_escQ(s.label)+'\');return false"><img src="'+_esc(s.src)+'" loading="lazy"><p>'+_esc(s.label)+'</p></button>';
          return '<button data-wep class="_sc6" onclick="WaEmojiPanel._onStkE(\''+_escQ(s.emoji)+'\',\''+_escQ(s.label)+'\')"><span class="se6">'+s.emoji+'</span><p>'+_esc(s.label)+'</p></button>';
        }).join('');
        return;
      }
      el.innerHTML=res.map(function(s){
        var url=s.stickerImg||'';
        var title=String(s.keyword||'Sticker').substring(0,14);
        return '<button data-wep class="_sc6" onclick="WaEmojiPanel._onStk(\''+_escQ(url)+'\',\''+_escQ(title)+'\')" oncontextmenu="WaEmojiPanel._favStk(this,\''+_escQ(url)+'\',\''+_escQ(title)+'\');return false"><img src="'+_esc(url)+'" alt="'+_esc(title)+'" loading="lazy" onerror="_stkImgErr(this)"><p>'+_esc(title)+'</p></button>';
      }).join('');
      // Pre-cache into IndexedDB so images survive navigation
      res.forEach(function(s){if(s.stickerImg)_preCacheImg(s.stickerImg);});
    })
    .catch(function(){
      var el=document.getElementById('_w6sg');if(!el)return;
      var _bi=STKS.slice(0,12);
      el.innerHTML=_bi.map(function(s){
        if(s.src)return '<button data-wep class="_sc6" onclick="WaEmojiPanel._onStk(\''+_escQ(s.src)+'\',\''+_escQ(s.label)+'\')" ><img src="'+_esc(s.src)+'" loading="lazy"><p>'+_esc(s.label)+'</p></button>';
        return '<button data-wep class="_sc6" onclick="WaEmojiPanel._onStkE(\''+_escQ(s.emoji)+'\',\''+_escQ(s.label)+'\')"><span class="se6">'+s.emoji+'</span><p>'+_esc(s.label)+'</p></button>';
      }).join('');
    });
}

/* ══ Avatar — DiceBear Personas ══════════════════════════════════ */
function _renderAvatar(){
  var c=document.getElementById('_wep6c'); if(!c)return;
  var seed=window.currentUserData&&window.currentUserData.name?window.currentUserData.name:'Student';
  var skin=_avSkin;
  var url='https://api.dicebear.com/9.x/personas/svg?seed='+encodeURIComponent(seed)+'&skinColor='+skin;
  c.innerHTML=
    '<div class="_av6">'+
      '<div style="width:110px;height:110px;margin:0 auto 12px;border-radius:50%;overflow:hidden;border:3px solid #ec4899;background:#1a1f2e">'+
        '<img id="_avImg" src="'+url+'" style="width:100%;height:100%;object-fit:cover" alt="Avatar">'+
      '</div>'+
      '<div class="_avT6">Your Avatar</div>'+
      '<div class="_avS6">Generated from your profile name. Toggle skin tone below.</div>'+
      '<div style="display:flex;gap:10px;justify-content:center;margin:10px 0">'+
        '<button onclick="WaEmojiPanel._avSkin(\'623d2e\')" style="width:30px;height:30px;border-radius:50%;background:#623d2e;border:'+(skin==='623d2e'?'3px solid #ec4899':'2px solid #444')+';cursor:pointer"></button>'+
        '<button onclick="WaEmojiPanel._avSkin(\'d2b48c\')" style="width:30px;height:30px;border-radius:50%;background:#d2b48c;border:'+(skin==='d2b48c'?'3px solid #ec4899':'2px solid #444')+';cursor:pointer"></button>'+
      '</div>'+
      '<button class="_avB6" onclick="WaEmojiPanel._avUse()">Use as Profile Photo</button>'+
    '</div>';
}

/* ══ Tab switch ══════════════════════════════════════════════════ */
function _switchTab(t){
  _tab=t;
  ['emoji','gif','avatar','sticker'].forEach(function(k){
    var el=document.getElementById('_w6t_'+k);
    if(el)el.classList.toggle('on',k===t);
  });
  var si=document.getElementById('_wep6si'); if(si)si.value='';
  var sb=document.getElementById('_wep6sb'); if(sb)sb.classList.remove('_on');
  var cb=document.getElementById('_wep6cb'); if(cb)cb.classList.toggle('_on',t==='emoji');
  if(t==='emoji')_renderEmoji('');
  else if(t==='gif')_renderGif('');
  else if(t==='avatar')_renderAvatar();
  else if(t==='sticker')_renderStickers('',_sPack);
}

/* ══ Search ══════════════════════════════════════════════════════ */
function _toggleSrch(){
  var sb=document.getElementById('_wep6sb'); if(!sb)return;
  var on=!sb.classList.contains('_on');
  sb.classList.toggle('_on',on);
  if(on)setTimeout(function(){var si=document.getElementById('_wep6si');if(si)si.focus();},80);
}
function _search(v){
  clearTimeout(_gt); clearTimeout(_sgt);
  if(_tab==='emoji')_renderEmoji(v);
  else if(_tab==='gif'){if(v){_gt=setTimeout(function(){_renderGif(v);},350);}else _renderGif('');}
  else if(_tab==='sticker'){if(v){_sgt=setTimeout(function(){_renderStickers(v,_sPack);},350);}else _renderStickers('',_sPack);}
}

/* ══ Open / Close — NO _adjustInputBar (crash source) ═══════════ */
function _openPanel(t){
  _build(); _open=true;
  var p=document.getElementById('_wep6'); if(p)p.classList.add('_on');
  _switchTab(t||_tab||'emoji');
  setTimeout(_syncPrev,50); // sync after render
}
function _close(){
  var p=document.getElementById('_wep6'); if(p)p.classList.remove('_on');
  _open=false; _closeQ();
}
function _toggle(t){if(_open&&_tab===(t||'emoji')){_close();return;}_openPanel(t);}

/* ══ Actions ═════════════════════════════════════════════════════ */
function _addE(e){
  try{
    _recentE=_recentE.filter(function(x){return x!==e;});
    _recentE.unshift(e); _recentE=_recentE.slice(0,32);
    localStorage.setItem('_weR6',JSON.stringify(_recentE));
  }catch(er){}
  if(_cbAdd)try{_cbAdd(e);}catch(er){console.warn('addEmoji err',er);}
  setTimeout(_syncPrev,10);
}

function _bs(){
  if(_cbAdd)try{_cbAdd('\b');}catch(er){}
  setTimeout(_syncPrev,10);
}

var _VS_ILLUS_SRC = 'data:image/jpeg;base64,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';
var _lastFavAt = 0; // timestamp of last _favStk call — used to block onclick send
var _lastFavSrc = ''; // source of last _favStk call — prevents contextmenu double-toggle

function _onGif(url,title){
  if(Date.now()-_lastFavAt<900)return; // hold-to-fav just fired — don't also send
  if(_cbGif)try{_cbGif(url,title);}catch(er){console.warn('sendGif err',er);}
  _close();
}

function _onStk(src,label){
  if(Date.now()-_lastFavAt<900)return; // hold-to-fav just fired — don't also send
  _saveRecStk({src:src,label:label,pack:'Naija'});
  if(_cbStk)try{_cbStk(src,label,null);}catch(er){console.warn('stk err',er);}
  _close();
}

function _onStkE(emoji,label){
  if(Date.now()-_lastFavAt<900)return; // hold-to-fav just fired — don't also send
  _saveRecStk({emoji:emoji,label:label,pack:'Vibes'});
  if(_cbStk)try{_cbStk(null,label,emoji);}catch(er){console.warn('stke err',er);}
  else _addE(emoji+' ');
  _close();
}

function _saveRecStk(s){
  try{
    var r=JSON.parse(localStorage.getItem('_wsR6')||'[]');
    r=r.filter(function(x){return x.label!==s.label;});
    r.unshift(s); r=r.slice(0,16);
    localStorage.setItem('_wsR6',JSON.stringify(r));
    _recentS=r;
  }catch(e){}
}

/* ══ Sticker Favourites ══════════════════════════════════════════ */
function _loadFavStickers(){
  try{return JSON.parse(localStorage.getItem('_wsFav6')||'[]');}catch(e){return [];}
}
function _saveFavStickers(list){
  try{localStorage.setItem('_wsFav6',JSON.stringify(list));}catch(e){}
}
function _favStk(src,label){
  if(!src)return;
  // Guard: block duplicate calls within 1.5s for the same sticker (contextmenu fires after long-press on Android)
  if(src===_lastFavSrc && Date.now()-_lastFavAt<1500)return;
  _lastFavSrc=src;
  _lastFavAt = Date.now(); // block the subsequent onclick/send
  var favs=_loadFavStickers();
  var exists=favs.some(function(f){return f.src===src;});
  if(exists){
    favs=favs.filter(function(f){return f.src!==src;});
    _saveFavStickers(favs);
    _showToast('Removed from favourites');
  } else {
    favs.unshift({src:src,label:label,pack:'fav'});
    favs=favs.slice(0,48);
    _saveFavStickers(favs);
    _showToast('⭐ Saved to favourites!');
  }
}
function _showToast(msg){
  var t=document.createElement('div');
  t.style.cssText='position:fixed;bottom:320px;left:50%;transform:translateX(-50%);background:#1f2c34;color:#e9edef;padding:8px 16px;border-radius:20px;font-size:13px;font-weight:600;z-index:9999;pointer-events:none;box-shadow:0 3px 10px rgba(0,0,0,.5);white-space:nowrap';
  t.textContent=msg; document.body.appendChild(t);
  setTimeout(function(){t.style.opacity='0';t.style.transition='opacity .3s';setTimeout(function(){t.remove();},350);},1800);
}

/* ══ IndexedDB image cache — prevents stickers/GIFs disappearing ════ */
var _idb=null;
function _openIDB(){
  if(_idb)return Promise.resolve(_idb);
  return new Promise(function(res,rej){
    var req=indexedDB.open('_wep_imgcache',1);
    req.onupgradeneeded=function(e){e.target.result.createObjectStore('imgs');};
    req.onsuccess=function(e){_idb=e.target.result;res(_idb);};
    req.onerror=function(){rej();};
  });
}
function _preCacheImg(url){
  if(!url||url.startsWith('data:'))return;
  _openIDB().then(function(db){
    var tx=db.transaction('imgs','readonly');
    var req=tx.objectStore('imgs').get(url);
    req.onsuccess=function(e){
      if(e.target.result)return;
      fetch(url,{mode:'cors'}).then(function(r){return r.blob();}).then(function(blob){
        _openIDB().then(function(db2){
          var tx2=db2.transaction('imgs','readwrite');
          tx2.objectStore('imgs').put(blob,url);
        });
      }).catch(function(){});
    };
  }).catch(function(){});
}
function _stkImgErr(img){
  var orig=img.getAttribute('data-orig')||img.src;
  if(img._retried)return;
  img._retried=true;
  img.setAttribute('data-orig',orig);
  _openIDB().then(function(db){
    var tx=db.transaction('imgs','readonly');
    var req=tx.objectStore('imgs').get(orig);
    req.onsuccess=function(e){
      if(e.target.result){img.src=URL.createObjectURL(e.target.result);}
      else{img.style.opacity='0.3';}
    };
    req.onerror=function(){img.style.opacity='0.3';};
  }).catch(function(){img.style.opacity='0.3';});
}

function _avCreate(){
  // Open WhatsApp avatar creator guide
  window.open('https://wa.me/?action=avatar','_blank');
}

/* ══ Quick emoji (800ms hold) ════════════════════════════════════ */
var _qh=null, _qf=false;
function _qStart(e){if(e&&e.preventDefault)e.preventDefault();_qf=false;_qh=setTimeout(function(){_qf=true;if(navigator.vibrate)navigator.vibrate(40);_openQ();},800);}
function _qEnd(def){clearTimeout(_qh);if(_qf){_qf=false;return;}if(def)_toggle('emoji');}
function _qCancel(){clearTimeout(_qh);_qf=false;}
function _openQ(){
  _build();
  var q=document.getElementById('_wepQ6'); if(q)q.classList.add('_on');
  _close();
}
function _closeQ(){var q=document.getElementById('_wepQ6');if(q)q.classList.remove('_on');}

/* ══ Voice sheet ═════════════════════════════════════════════════ */
var _vs=null,_vr=null,_vch=[],_vsec=0,_vint=null,_vVO=false;

function _openVoiceSheet(){
  if(document.getElementById('_wepVS'))return;
  var css=document.createElement('style'); css.id='_wepVSCSS';
  css.textContent=[
    '@keyframes _vsu6{from{transform:translateY(100%)}to{transform:translateY(0)}}',
    '#_wepVS{position:fixed;inset:0;z-index:700;background:rgba(0,0,0,.78);display:flex;flex-direction:column;justify-content:flex-end}',
    '#_wvsIn{background:#1f2c34;border-radius:20px 20px 0 0;padding:16px 14px 32px;animation:_vsu6 .28s cubic-bezier(.34,1.1,.64,1)}',
    '#_wvsIllus{height:112px;background:#111b21;border-radius:14px;display:flex;align-items:center;justify-content:center;margin-bottom:12px;overflow:hidden}',
    '#_wvsTimer{font-size:32px;font-weight:700;color:#e9edef;text-align:center;font-variant-numeric:tabular-nums;display:none;margin-bottom:3px}',
    '#_wvsWave{display:none;align-items:center;justify-content:center;gap:3px;height:28px;margin-bottom:4px}',
    '._vBar6{width:3px;border-radius:2px;background:#a855f7;animation:_vp6 1.1s ease-in-out infinite}',
    '@keyframes _vp6{0%,100%{height:4px;opacity:.3}50%{height:22px;opacity:1}}',
    '#_wvsNoise{display:none;text-align:center;font-size:12px;color:#8696a0;margin-bottom:5px}',
    '#_wvsHint{text-align:center;font-size:14px;color:#8696a0;margin-bottom:16px}',
    '#_wvsVO{display:flex;align-items:center;gap:10px;background:#111b21;border-radius:12px;padding:10px 14px;margin-bottom:12px;cursor:pointer;-webkit-tap-highlight-color:transparent}',
    '#_wvsVOSw{width:40px;height:22px;border-radius:11px;background:#2a3942;position:relative;transition:background .18s;flex-shrink:0}',
    '#_wvsVOSw.on{background:#25d366}',
    '#_wvsVOKn{position:absolute;top:3px;left:3px;width:16px;height:16px;border-radius:50%;background:white;transition:transform .18s;box-shadow:0 1px 3px rgba(0,0,0,.35)}',
    '#_wvsVOSw.on #_wvsVOKn{transform:translateX(18px)}',
    '#_wvsBtns{display:flex;gap:9px}',
    '._vBtn6{flex:1;padding:12px;border-radius:13px;border:none;cursor:pointer;font-weight:700;font-size:14px;font-family:inherit;display:flex;align-items:center;justify-content:center;gap:6px;-webkit-tap-highlight-color:transparent}',
    '#_vBCancel{background:#2a3942;color:#e9edef}',
    '#_vBRestart{background:#2a3942;color:#e9edef;display:none}',
    '#_vBRec{background:linear-gradient(135deg,#ec4899,#8b5cf6);color:white}',
    '#_vBRec.rec{background:#ef4444}',
    '#_vBAttach{background:#25d366;color:white;display:none}'
  ].join('');
  document.head.appendChild(css);

  var sh=document.createElement('div'); sh.id='_wepVS';
  sh.innerHTML='<div id="_wvsIn">'+
    '<div id="_wvsIllus">'+_vsIllus()+'</div>'+
    '<div id="_wvsTimer">0:00</div>'+
    '<div id="_wvsWave">'+Array(12).fill(0).map(function(_,i){return '<div class="_vBar6" style="animation-delay:'+(.09*i)+'s"></div>';}).join('')+'</div>'+
    '<div id="_wvsNoise">🎙️ Noise cancellation <strong style="color:#25d366">ON</strong></div>'+
    '<div id="_wvsHint">Tap to record your voice</div>'+
    '<div id="_wvsVO" onclick="WaEmojiPanel._vVOToggle()">'+
      '<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#8696a0" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4l3 3"/></svg>'+
      '<div style="flex:1"><div style="font-size:13px;color:#e9edef;font-weight:600">View once</div><div style="font-size:11px;color:#8696a0">Voice plays once then disappears</div></div>'+
      '<div id="_wvsVOSw"><div id="_wvsVOKn"></div></div>'+
    '</div>'+
    '<div id="_wvsBtns">'+
      '<button class="_vBtn6" id="_vBCancel" onclick="WaEmojiPanel._vCancel()">✕ Cancel</button>'+
      '<button class="_vBtn6" id="_vBRestart" onclick="WaEmojiPanel._vRestart()">↻ Restart</button>'+
      '<button class="_vBtn6" id="_vBRec" onclick="WaEmojiPanel._vToggle()">'+
        '<svg width="20" height="20" viewBox="0 0 24 24" fill="none"><rect x="9" y="2" width="6" height="12" rx="3" fill="white"/><path d="M5 11a7 7 0 0014 0" stroke="white" stroke-width="2.2" stroke-linecap="round" fill="none"/><line x1="12" y1="18" x2="12" y2="22" stroke="white" stroke-width="2.2" stroke-linecap="round"/><line x1="8" y1="22" x2="16" y2="22" stroke="white" stroke-width="2.2" stroke-linecap="round"/></svg>'+
      '</button>'+
      '<button class="_vBtn6" id="_vBAttach" onclick="WaEmojiPanel._vAttach()">'+
        '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round"><polyline points="20 6 9 17 4 12"/></svg> Attach'+
      '</button>'+
    '</div>'+
  '</div>';
  sh.addEventListener('click',function(e){if(e.target===sh)WaEmojiPanel._vCancel();});
  document.body.appendChild(sh);
  _vVO=false;
}

function _vsIllus(){
  return '<img src="' + _VS_ILLUS_SRC + '" alt="Voice recording" style="width:100%;height:112px;object-fit:cover;border-radius:14px;display:block">';
}

function _vVOToggle(){_vVO=!_vVO;var sw=document.getElementById('_wvsVOSw');if(sw)sw.classList.toggle('on',_vVO);}
function _vToggle(){_vr&&_vr.state==='recording'?_vStop():_vStart();}
function _vStart(){
  if(!navigator.mediaDevices){alert('Mic not available');return;}
  navigator.mediaDevices.getUserMedia({audio:true}).then(function(s){
    _vs=s;_vch=[];_vsec=0;
    var mime=['audio/webm;codecs=opus','audio/webm','audio/mp4',''].find(function(m){return!m||MediaRecorder.isTypeSupported(m);});
    _vr=mime?new MediaRecorder(s,{mimeType:mime}):new MediaRecorder(s);
    _vr.ondataavailable=function(e){if(e.data&&e.data.size>0)_vch.push(e.data);};
    _vr.start(100);
    if(navigator.vibrate)navigator.vibrate(50);
    _vint=setInterval(function(){
      _vsec++;var m=Math.floor(_vsec/60),sc=_vsec%60;
      var t=document.getElementById('_wvsTimer');if(t){t.textContent=m+':'+(sc<10?'0':'')+sc;t.style.display='block';}
      var n=document.getElementById('_wvsNoise');if(n)n.style.display='block';
      var w=document.getElementById('_wvsWave');if(w)w.style.display='flex';
      var h=document.getElementById('_wvsHint');if(h)h.style.display='none';
    },1000);
    var rb=document.getElementById('_vBRec');if(rb)rb.classList.add('rec');
    var rr=document.getElementById('_vBRestart');if(rr)rr.style.display='flex';
  }).catch(function(e){alert('Mic denied: '+e.message);});
}
function _vStop(){
  if(!_vr||_vr.state!=='recording')return;
  clearInterval(_vint);
  _vr.onstop=function(){
    var mime=_vr.mimeType||'audio/webm';
    _vr._blob=new Blob(_vch,{type:mime}); _vr._mime=mime;
    var at=document.getElementById('_vBAttach');if(at)at.style.display='flex';
    var rb=document.getElementById('_vBRec');if(rb){rb.classList.remove('rec');rb.style.display='none';}
    var h=document.getElementById('_wvsHint');if(h){h.textContent='Ready — tap Attach to send';h.style.display='block';}
  };
  _vr.stop();
}
function _vAttach(){
  if(!_vr||!_vr._blob)return;
  var blob=_vr._blob,mime=_vr._mime,vo=_vVO;
  _vClean(); _vClose();
  if(_cbVoice)try{_cbVoice(blob,mime,vo);}catch(er){console.warn('voice cb err',er);}
}
function _vCancel(){_vClean();_vClose();}
function _vRestart(){
  clearInterval(_vint);
  if(_vr&&_vr.state==='recording'){try{_vr.stop();}catch(e){}}
  if(_vs)_vs.getTracks().forEach(function(t){t.stop();});
  _vs=null;_vr=null;_vch=[];_vsec=0;
  ['_wvsNoise','_wvsWave'].forEach(function(id){var e=document.getElementById(id);if(e)e.style.display='none';});
  var t=document.getElementById('_wvsTimer');if(t){t.textContent='0:00';t.style.display='none';}
  var h=document.getElementById('_wvsHint');if(h){h.textContent='Tap to record your voice';h.style.display='block';}
  var rb=document.getElementById('_vBRec');if(rb){rb.classList.remove('rec');rb.style.display='flex';}
  var at=document.getElementById('_vBAttach');if(at)at.style.display='none';
  var rr=document.getElementById('_vBRestart');if(rr)rr.style.display='none';
}
function _vClean(){
  clearInterval(_vint);
  if(_vr&&_vr.state==='recording'){try{_vr.stop();}catch(e){}}
  if(_vs)_vs.getTracks().forEach(function(t){t.stop();});
  _vs=null;_vr=null;_vch=[];_vsec=0;
}
function _vClose(){var s=document.getElementById('_wepVS');if(s)s.remove();var c=document.getElementById('_wepVSCSS');if(c)c.remove();}

/* ══ Helpers ═════════════════════════════════════════════════════ */
function _shims(n){var h='';for(var i=0;i<n;i++)h+='<div class="_gc6 _sh6" style="animation-delay:'+(.08*i)+'s"></div>';return h;}
function _esc(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');}
function _escQ(s){return String(s||'').replace(/\\/g,'\\\\').replace(/'/g,"\\'");}

/* ══ Public API ══════════════════════════════════════════════════ */
var WaEmojiPanel={
  init:function(opts){
    _cbAdd=opts.addEmoji||null;
    _cbStk=opts.sendSticker||null;
    _cbGif=opts.sendGif||null;
    _cbVoice=opts.sendVoice||null;
    _cbGetEl=opts.getInputEl||null;
    _cbSend=opts.sendMessage||null;
    _build();
    // Wire input sync
    try{
      var el=_cbGetEl&&_cbGetEl();
      if(el){el.addEventListener('input',function(){if(_open)_syncPrev();});}
    }catch(er){}
  },
  open:function(t){_openPanel(t);},
  close:function(){_close();},
  toggle:function(t){_toggle(t);},
  openVoiceSheet:function(){_openVoiceSheet();},
  isOpen:function(){return _open;},
  touchStart:function(e){_qStart(e);},
  touchEnd:function(def){_qEnd(def);},
  touchCancel:function(){_qCancel();},
  _switchTab:function(t){_switchTab(t);},
  _ecat:function(k){_ecat(k);},
  _addE:function(e){_addE(e);},
  _bs:function(){_bs();},
  _search:function(v){_search(v);},
  _toggleSrch:function(){_toggleSrch();},
  _doSend:function(){_doSend();},
  _onGif:function(u,t){_onGif(u,t);},
  _onStk:function(s,l){_onStk(s,l);},
  _onStkE:function(e,l){_onStkE(e,l);},
  _renderStickers:function(q,p){_renderStickers(q,p);},
  _vVOToggle:function(){_vVOToggle();},
  _vToggle:function(){_vToggle();},
  _vRestart:function(){_vRestart();},
  _vAttach:function(){_vAttach();},
  _vCancel:function(){_vCancel();},
  _avSkin:function(s){
    _avSkin=s;
    _renderAvatar();
  },
  _avUse:function(){
    var seed=window.currentUserData&&window.currentUserData.name?window.currentUserData.name:'Student';
    var url='https://api.dicebear.com/9.x/personas/svg?seed='+encodeURIComponent(seed)+'&skinColor='+_avSkin;
    if(window.currentUser&&window.firebase){
      fetch(url).then(function(r){return r.blob();}).then(function(blob){
        var file=new File([blob],'avatar.svg',{type:'image/svg+xml'});
        if(typeof uploadFile==='function'){
          showLoading&&showLoading('Uploading avatar…');
          uploadFile(file,'avatars').then(function(res){
            hideLoading&&hideLoading();
            if(res.success){
              firebase.database().ref('users/'+window.currentUser.uid+'/photoURL').set(res.url);
              if(window.currentUserData) window.currentUserData.photoURL=res.url;
              showToast&&showToast('Avatar updated!');
              _close();
            } else { showToast&&showToast('Upload failed','error'); }
          });
        } else { window.open(url,'_blank'); }
      }).catch(function(){ window.open(url,'_blank'); });
    } else { window.open(url,'_blank'); }
  },
  _favStk:function(btn,src,label){ _favStk(src,label); },
  get _lastFavAt(){ return _lastFavAt; }
};
G.WaEmojiPanel=WaEmojiPanel;
// Expose image cache handlers globally AFTER WaEmojiPanel assigned
G._stkImgErr=function(img){ _stkImgErr(img); };
G._preCacheImg=function(url){ _preCacheImg(url); };
// Public favorites API (used by media-viewer.js)
G.WaEmojiPanel.addFav=function(src,label){
  if(!src)return;
  var favs=_loadFavStickers();
  if(favs.some(function(f){return f.src===src;}))return;
  favs.unshift({src:src,label:label||'My Sticker',pack:'fav'});
  _saveFavStickers(favs.slice(0,48));
};
G.WaEmojiPanel.isFav=function(src){
  return _loadFavStickers().some(function(f){return f.src===src;});
};
G.WaEmojiPanel.removeFav=function(src){
  _saveFavStickers(_loadFavStickers().filter(function(f){return f.src!==src;}));
};
})(window);
