// =====================================================================
//  STORY — state, items, texts, pictures, interaction definitions
// =====================================================================
const Story = { S: null, defs: {}, timers: [], snaps: [], cache: {} };
const SF = () => Story.S.flags;
const CH = () => Story.S ? Story.S.ch : 0;
const NM = () => (Story.S && Story.S.name) || 'Sam';

// ---------------- items ----------------
const ITEMS = {
  frontKey: { name: 'Spare key', desc: 'A brass door key, green with age. It was lying at the stone angel\'s feet, exactly where Grandad said it would be.' },
  diningKey: { name: 'Small brass key', desc: 'Wrapped in a handkerchief in the writing desk. The paper tag says "D." in Grandad\'s writing.' },
  photoA: { name: 'Photograph — a baby girl', desc: 'Grandma holding a newborn girl. A small boy — your father — stands beside them, scowling at the camera. On the back: "Our little bird has arrived."', img: () => Story.puzzlePhotos()[0] },
  photoB: { name: 'Photograph — a baby boy', desc: 'Grandad and Grandma, very young, with a baby boy wrapped in a blanket. On the back: "Tom, two weeks old."', img: () => Story.puzzlePhotos()[1] },
  photoC: { name: 'Photograph — the garden', desc: 'All four of them in the garden: Grandad, Grandma, Tom and a girl of eight or nine. The oak is tall behind them.', img: () => Story.puzzlePhotos()[2] },
  ironKey1: { name: 'Iron key (I)', desc: 'Heavy and cold. A paper tag tied with yellow thread: "E — I".' },
  ironKey2: { name: 'Iron key (II)', desc: 'It was at the bottom of the bath. It is still warm. A tag, soaked through: "E — II".' },
  ironKey3: { name: 'Iron key (III)', desc: 'From Grandma\'s sewing box. The tag reads "E — III" and, smaller, "forgive me".' },
  musicBox: { name: 'Elena\'s music box', desc: 'A small walnut box with three brass pegs on the lid. It is heavier than it should be, as if something inside it is full.' },
  diary: { name: 'Elena\'s diary', desc: 'A plum-coloured diary with a broken clasp. The handwriting is round and careful.', read: () => Story.readDiary(true) },
  babyPhoto: { name: 'Photograph — "first summer"', desc: 'Grandma in the garden holding a baby in a white bonnet. On the back: "Elena, her first summer, 1978."', img: () => Story.babyPhoto() },
};

// ---------------- pictures ----------------
Story.puzzlePhotos = function () {
  if (this.cache.pz) return this.cache.pz;
  this.cache.pz = [
    drawPhoto({ w: 300, h: 240, bg: 'garden', tree: .42, people: [{ x: .3, kind: 'man' }, { x: .5, kind: 'woman' }, { x: .56, kind: 'baby', s: .9 }, { x: .7, kind: 'boy', s: .62 }] }),
    drawPhoto({ w: 300, h: 240, bg: 'garden', tree: .14, people: [{ x: .38, kind: 'man' }, { x: .56, kind: 'woman' }, { x: .63, kind: 'baby', s: .9 }] }),
    drawPhoto({ w: 300, h: 240, bg: 'garden', tree: .78, people: [{ x: .22, kind: 'man' }, { x: .4, kind: 'woman' }, { x: .58, kind: 'boy', s: .95 }, { x: .76, kind: 'girl', s: .9 }] }),
  ];
  return this.cache.pz;
};
Story.babyPhoto = function () {
  return this.cache.baby || (this.cache.baby = drawPhoto({ w: 280, h: 240, bg: 'garden', tree: .45, people: [{ x: .45, kind: 'woman', smile: true }, { x: .52, kind: 'baby' }], caption: 'Elena — first summer' }));
};
Story.diningPortrait = function (stage) {
  const k = 'dp' + stage; if (this.cache[k]) return this.cache[k];
  const ppl = [];
  if (stage >= 1) ppl.push({ x: .5, kind: stage >= 2 ? 'entity' : 'man', shadow: true, entity: stage >= 2, s: 1.25 });
  ppl.push({ x: .17, kind: 'man' }, { x: .37, kind: 'woman' }, { x: .63, kind: 'boy', s: .85 }, { x: .82, kind: 'girl', s: .8, smile: stage === 3 });
  return (this.cache[k] = drawPhoto({ w: 360, h: 288, bg: 'table', people: ppl, plates: [.17, .37, .63, .82], caption: stage === 3 ? 'Sunday, 1987' : '', scale: .78 }));
};
Story.hallPortrait = function (stage) {
  const k = 'hp' + stage; if (this.cache[k]) return this.cache[k];
  const ppl = [];
  if (stage === 2) ppl.push({ x: .9, kind: 'entity', entity: true, s: 1 });
  ppl.push({ x: .16, kind: 'man' }, { x: .32, kind: 'woman' }, { x: .48, kind: 'boy', s: .85 }, { x: .64, kind: 'girl', s: .8, smile: stage === 3 });
  if (stage === 1 || stage === 2) ppl.push({ x: .8, kind: 'player' });
  return (this.cache[k] = drawPhoto({ w: 300, h: 360, bg: 'garden', tree: .85, people: ppl, caption: stage === 1 || stage === 2 ? 'Home at last' : '14 Alder Lane', scale: .6 }));
};
Story.polaroid = function () {
  return this.cache.pol || (this.cache.pol = drawPhoto({
    w: 200, h: 240, bg: 'dark', caption: 'the inside hall — T & E', scale: .62, people: [{ x: .4, kind: 'boy', s: .9 }, { x: .62, kind: 'girl', s: .85, smile: true }],
    draw: (ctx, iw, ih) => { ctx.strokeStyle = 'rgba(200,170,170,.5)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(iw * .42, ih * .42); ctx.lineTo(iw * .58, ih * .42); ctx.lineTo(iw, 0); ctx.moveTo(0, ih); ctx.lineTo(iw * .42, ih * .58); ctx.lineTo(iw * .58, ih * .58); ctx.lineTo(iw, ih); ctx.stroke(); ctx.fillStyle = 'rgba(0,0,0,.9)'; ctx.fillRect(iw * .45, ih * .45, iw * .1, ih * .12); }
  }));
};
Story.endPhoto = function (which) {
  if (which === 'A') return drawPhoto({ w: 360, h: 300, bg: 'dawn', color: true, tint: [1.05, 1, .92], aged: .4, people: [{ x: .5, kind: 'girl', smile: true, s: 1.1 }], caption: 'Elena' });
  if (which === 'B') return drawPhoto({ w: 380, h: 300, bg: 'table', people: [{ x: .12, kind: 'man', shadow: true }, { x: .3, kind: 'woman', shadow: true }, { x: .5, kind: 'player' }, { x: .7, kind: 'boy', s: .85, shadow: true }, { x: .88, kind: 'girl', s: .8, shadow: true }], plates: [.12, .3, .5, .7, .88], caption: 'Together, always' });
  return drawPhoto({ w: 380, h: 300, bg: 'garden', tree: .85, people: [{ x: .2, kind: 'man', smile: true }, { x: .38, kind: 'woman', smile: true }, { x: .58, kind: 'boy', s: .9, smile: true }, { x: .76, kind: 'girl', s: .85, smile: true }], caption: '14 Alder Lane' });
};
Story.fallbackSnap = function (i) {
  const scenes = [
    { bg: 'room', people: [{ x: .55, kind: 'player' }], caption: '' },
    { bg: 'table', people: [{ x: .4, kind: 'player' }], plates: [.2, .4, .6, .8], caption: '' },
    { bg: 'dark', people: [{ x: .45, kind: 'player' }, { x: .7, kind: 'entity', entity: true }], caption: '' },
  ];
  return drawPhoto(Object.assign({ w: 320, h: 260 }, scenes[i % 3]));
};

// ---------------- texts ----------------
const TXT = {
  solicitor: () => [`PELL & HARGREAVE, SOLICITORS\n\nDear ${NM()},\n\nFurther to our telephone call: your grandfather, Mr Arthur Hale, has now been missing for eleven months. With your father's passing last spring, the property at 14 Alder Lane passes to you as his only grandchild.\n\nThe police found no sign of forced entry, and no sign that he ever left. His car, his coat and his wallet were all inside. Every door was bolted from the inside.`,
    `Mr Hale left one curious instruction regarding the keys. I quote it exactly:\n\n"The spare is with the angel, as always. Never under the mat."\n\nI am told the electricity is still connected.\n\nI am sorry for your loss.\n\nYours sincerely,\nD. Pell`],
  gfNote: () => [`If you are reading this, you have come back.\n\nWhatever you do, do not open the basement door.\n\n— A.`, `P.S. The house will be kind to you at first.\n\nDo not mistake it for kindness.`],
  margaret: () => [`2nd February 1988\n\nArthur,\n\nI am taking Tom to my sister's. Don't come after us.\n\nYou tell the police she ran away. You tell the neighbours she ran away. You know she didn't.\n\nElena went up to bed at nine o'clock and in the morning her room was empty. The window was latched. Every door in this house was bolted from the inside.`,
    `She never left this house, Arthur. And I cannot stay in it while you set her place at the table every night.\n\nLast night I heard her humming in the upstairs hall. I went to her.\n\nIt wasn't her.\n\nIt had her voice. It didn't have her.\n\n— Margaret`],
  diary: [
    `This diary is from Granny June for my 8th birthday.\n\nRULE ONE: Tom is NOT allowed to read it.\n\nTOM THIS MEANS YOU.`,
    `Mama gave me the music box when I was six. It plays Mama's song. There are three pegs on the lid and you have to turn them right or it plays wrong.\n\nThe first peg is the BIRD, because birds wake up first.`,
    `The house has more rooms at night. I counted.\n\nTom says I'm making it up. But there is a hallway in my wardrobe and it was NOT there when we moved my winter coats.`,
    `Something sat in Mama's chair at dinner. It had her cardigan and her voice but it held the fork wrong.\n\nWhen the real Mama came in from the kitchen it wasn't there any more.\n\nNobody saw but me.`,
    `I think the house remembers things. Like a photo but with everything in it. It remembers Grandad's old dog that died. I heard it bark in the cellar.\n\nI think it is learning us so it can keep us.`,
    `The middle peg is the MOON, because Mama's song is for bedtime.\n\nThe last peg is the OAK, because the oak is always there, even when people aren't.`,
    `It knows the song now. I heard it humming in the walls, only a bit wrong.\n\nIf it learns me all the way, will there be two of me?\n\nI'm going to hide the music box so it can't practise.`,
    `14th October 1987\n\nIf anybody finds this: my name is Elena Hale. I am nine.\n\nI am still me.`],
  newspaper: () => [`THE ALDER GAZETTE — 21 October 1987\n\nLANE GIRL STILL MISSING\n\nPolice have widened the search for nine-year-old Elena Hale, last seen on the evening of 14 October at her family home on Alder Lane.\n\nOfficers say there is "no evidence" the girl left the property. All doors and windows were found locked from the inside.\n\nHer father, Arthur Hale, 46, has refused to leave the house during the search. "She's in the house," he told reporters. "I can hear her."`],
  police: () => [`STATEMENT — Thomas Hale, aged 12\n\nElena said the house had a hallway in her wardrobe. She said something sat in Mum's chair. I told her she was making it up.\n\nThat night I heard her music box through the wall. It played the song wrong. Then it played it right.\n\nThen it played it right again, from downstairs, but Elena was upstairs.\n\nI didn't go and look. I'm sorry I didn't go and look.`],
  arthurNotes: () => [`Night 1. Set her place. Nothing.\n\nNight 40. The plate had been moved. Crumbs.\n\nNight 112. She came down the stairs. No face. Wearing the yellow dress Margaret never finished.\n\nNight 300. She had a face. My mother's.`,
    `Night 2,190. She knows the song. She hums it the way Margaret did, which is wrong, because Elena always rushed the third line.\n\nNight 4,000-something. She asked me why I keep her down here. I didn't know what to say. I have stopped writing the numbers.`,
    `The house is getting her right. Every time it gets her right, it gets something else wrong. The stairs. The hall. The doors.\n\nI counted the steps today. Thirty-two going up.\n\nI don't want to count them going down.`],
};
const MEMS = {
  mem1: { title: 'The swing', text: 'Grandad hung it from the oak the summer Elena turned five. She made Tom push her until her feet touched the leaves, shrieking "higher, higher".' },
  mem2: { title: 'The drawing behind the sofa', text: 'She drew the house with eyes in every window. Grandma told her to stop drawing it like that. So she hid this one where only the house could see it.' },
  mem3: { title: 'The yellow ribbon', text: 'She tied ribbons on things she didn\'t want the house to take. Her bear. Her bed. This window — "so it knows which one is mine to leave by."' },
  mem4: { title: 'The yellow dress', text: 'Grandma was sewing a yellow dress for Elena\'s ninth birthday. Elena wore it once, unfinished, pins still in the hem, and spun around until she fell over laughing.' },
  mem5: { title: 'The inside hall', text: 'Tom believed her, once. They took a photo in the hallway that couldn\'t fit, and swore each other to secrecy. He never told anyone. Not even you.' },
  mem6: { title: 'Under the house', text: 'Carved into the beam, in two different hands: "E.H. + T.H. — DOWN HERE IT CAN\'T HEAR US". The crawlspace was their hiding place. The only place the house didn\'t listen.' },
};
const TAPE = [
  ['Arthur', 'This is Arthur Hale. If you\'re hearing this, I\'m gone. And you came down here anyway. I\'m sorry.', 6],
  ['Arthur', 'Elena didn\'t run away. She never left this house. On the fourteenth of October, nineteen eighty-seven, she went up to bed at nine... and by morning the house had taken her in.', 9],
  ['Arthur', 'Margaret left. Tom left. I stayed. I thought if I kept her things — her song, her drawings, her room exactly as it was — I could keep her.', 8],
  ['Arthur', 'And the house helped. That\'s what I couldn\'t see. It listened to me remembering her... and it learned.', 7],
  ['Arthur', 'The first time she came down to dinner, she had no face. The tenth time, she had my mother\'s face. By the hundredth she was perfect. Almost.', 9],
  ['Arthur', 'It isn\'t a ghost. It\'s a place that has learned to imitate the people it remembers. Every time I let it try again, it gets better... and the house gets stranger.', 9],
  ['Arthur', 'I locked the music box in her room. I bolted the cellar. And still I came down here, every night, to watch it set the table.', 8],
  ['Arthur', 'If you go through that door it will show you the last night. It will show you me. Don\'t believe a word I say in there. Or — believe it. I don\'t know any more.', 9],
  ['Arthur', 'The song is the anchor. Whatever you decide... decide it for her. Not for me.', 6],
];

// ---------------- helpers used by definitions ----------------
function insp(title, text, canvas) { UI.inspect(title, text, canvas); }
function memDef(id, prompt) {
  return {
    prompt: () => Story.S.mem[id] ? 'Remember' : prompt,
    use: () => Story.findMemory(id),
  };
}
function readDef(id, title, pagesFn, prompt, opt = {}) {
  return { prompt: () => prompt || 'Read', use: () => { Story.addNote(id, title, pagesFn(), opt.hand); UI.read(title, pagesFn(), { hand: opt.hand, onClose: opt.onClose }); if (opt.after) opt.after(); } };
}

// ---------------- interaction definitions ----------------
Object.assign(Story.defs, {
  // ---- exterior ----
  road: { prompt: () => CH() === 1 ? 'Walk back to the car' : 'The lane', use: () => UI.say(CH() === 1 ? 'You came all this way. And it is your house now.' : 'The lane is gone. Where it should be, there is only fog, and the fence goes on.', 4) },
  mailbox: readDef('solicitor', 'A letter from the solicitor', TXT.solicitor, 'Read the solicitor\'s letter', { after: () => { if (CH() === 1 && !Story.has('frontKey')) UI.objective('Find the spare key. "With the angel."'); } }),
  doormat: { prompt: () => 'Look under the mat', use: () => UI.say('WELCOME, it used to say. Nothing underneath. "Never under the mat," he always said.', 4) },
  pot0: { prompt: () => 'Check the pot', use: () => UI.say('Dead geraniums. No key.', 3) },
  pot1: { prompt: () => 'Check the pot', use: () => UI.say('Soil and a drowned snail.', 3) },
  pot2: { prompt: () => 'Check the pot', use: () => UI.say('Empty. Grandad would never leave a key somewhere so obvious.', 3.5) },
  angel: { prompt: () => 'Examine the angel', use: () => insp('The stone angel', Story.has('frontKey') || SF().gotFrontKey ? 'Hands pressed together, eyes closed. Grandad called her the doorkeeper. Rain runs down her face like she is the one who is sorry.' : 'Hands pressed together, eyes closed. Grandad called her the doorkeeper. Something small glints on the plinth, at her feet.') },
  frontKey: { prompt: () => 'Take the key', use: () => { W.obj.frontKey.visible = false; SF().gotFrontKey = true; Story.give('frontKey'); UI.objective('Unlock the front door.'); } },
  mem1: memDef('mem1', 'Touch the swing'),
  loopPhoto: { prompt: () => 'Look at the photograph', use: () => { UI.inspect('A photograph, pinned to the door', 'The whole family, at the dinner table. Grandad. Grandma. Tom. Elena.\n\nAnd in the middle, smiling, you.', Story.endPhoto('B'), () => Story.ending('B', true)); } },
  // ---- foyer / hall ----
  gfNote: readDef('gfNote', 'A note on the hall table', TXT.gfNote, 'Read the note', { hand: true, onClose: () => Story.onNoteRead() }),
  kitchenDoor: { prompt: () => 'Try the kitchen door', use: () => UI.say('Boarded shut from this side. The nails are new.', 3.5) },
  // ---- living room ----
  clock: { prompt: () => 'Examine the clock', use: () => { SF().clockSeen = true; insp('Mantel clock', SF().clockTicking ? 'It is ticking. Steady and patient. The hands still say fourteen minutes past nine.\n\nWith every tick the minute hand jumps forward — and settles back.' : 'A walnut carriage clock. The glass is cracked and the hands have stopped at fourteen minutes past nine.\n\nDust has settled in the cracks. It has not run in years.'); } },
  mantel0: { prompt: () => 'Look at the photograph', use: () => insp('A. & M.', 'A young couple in front of this house — Grandad and Grandma, before anything. The oak in the garden is only a sapling.\n\nOn the back: "Our first summer at Alder Lane."', W.portraits.mantel0.canvas) },
  mantel1: { prompt: () => 'Look at the photograph', use: () => Story.onScratchedPhoto() },
  mantel2: { prompt: () => 'Look at the photograph', use: () => insp('Tom', 'Your father, maybe ten years old, grinning at whoever held the camera. You have the same chin.', W.portraits.mantel2.canvas) },
  armchair: { prompt: () => 'Examine the armchair', use: () => insp('Grandad\'s armchair', SF().chairMoved ? 'Red velvet, worn through at the arms. It is facing the doorway.\n\nYou are almost certain it was facing the fire.' : 'Red velvet, worn through at the arms. It faces the fireplace, the way he liked it. The cushion still holds the shape of him.') },
  tv: { prompt: () => W.tvOn ? 'Turn the television off' : 'Turn the television on', use: () => Story.toggleTV() },
  drawer0: { prompt: () => 'Open the drawer', use: () => UI.say('Bills. Final notices, all unopened, all addressed to Mr A. Hale.', 4) },
  drawer1: { prompt: () => 'Open the drawer', use: () => { Story.addNote('letters', 'Unsent letters', [`Dozens of letters, every one addressed to "Elena" in Grandad's handwriting. None were ever posted.\n\nThe top one:\n\n"Dear Elena, the oak has lost its leaves again. Your mother does not write. Tom is grown and has a little one of his own now — you would like them. I set your place tonight. I always set your place."`]); UI.read('Unsent letters', Story.S.journal.find(j => j.id === 'letters').pages, { hand: true }); } },
  drawer2: { prompt: () => 'Open the drawer', use: () => { if (!SF().gotDiningKey) { SF().gotDiningKey = true; Story.give('diningKey'); UI.say('Pencils, string, a broken watch... and wrapped in a handkerchief, a small brass key. The tag says "D."', 5); Story.livingProgress(); } else UI.say('Pencils, string, a broken watch.', 3); } },
  deskPapers: { prompt: () => 'Read the notepad', use: () => insp('A notepad', 'The same sentence, written down the page again and again in a hand that gets worse as it goes:\n\n"Do not forget her face. Do not forget her face. Do not forget her face. Do not forget her f"') },
  bookcase: { prompt: () => 'Look at the books', use: () => insp('The bookcase', 'Gardening. Bird-watching. A whole shelf of photo albums.\n\nEvery album is empty. Little paper corners still hold the shapes of pictures that are gone.') },
  mem2: memDef('mem2', 'Pick up the drawing'),
  // ---- dining room ----
  radio: { prompt: () => W.radioOn ? 'Turn the radio off' : 'Turn on the radio', use: () => Story.toggleRadio() },
  sbDrawer: { prompt: () => SF().gotPhotoB ? 'Open the drawer' : 'Open the drawer', use: () => { if (!SF().gotPhotoB) { SF().gotPhotoB = true; Story.give('photoB'); UI.say('Napkins, a silver napkin ring engraved "E"... and a photograph, face down.', 4.5); Story.photoHint(); } else UI.say('Napkins, and the napkin ring with her initial on it.', 3); } },
  photoA: { prompt: () => 'Take the photograph', use: () => { W.obj.photoA.visible = false; SF().gotPhotoA = true; Story.give('photoA'); Story.photoHint(); } },
  photoC: { prompt: () => 'Pick up the photograph', use: () => { W.obj.photoC.visible = false; SF().gotPhotoC = true; Story.give('photoC'); Story.photoHint(); } },
  cabinet: { prompt: () => SF().cabOpen ? (SF().gotLetter ? 'Look in the cabinet' : 'Take the letter') : 'Examine the cabinet', use: () => Story.cabinetUse() },
  mem3: memDef('mem3', 'Untie the ribbon'),
  diningPortrait: { prompt: () => 'Look at the portrait', use: () => { SF().dpSeen = true; const st = W.portraitStage.dining; insp('The family portrait', st === 0 ? 'Sunday dinner, painted from a photograph. Grandad at the head of the table. Grandma. Tom. Elena. Four plates.' : st === 1 ? 'Sunday dinner. Grandad, Grandma, Tom, Elena.\n\nAnd someone standing behind them, between the chairs. Tall. The painter did not give them a face.\n\nYou are sure that was not there before.' : 'Sunday dinner. The family, and the tall figure behind them.\n\nIts hand is on Elena\'s shoulder now.', W.portraits.dining.canvas); } },
  // ---- upstairs ----
  hallPortrait: { prompt: () => 'Look at the portrait', use: () => { SF().hpSeen = (SF().hpSeen || 0) + 1; const st = W.portraitStage.hall; insp('The family on the porch', st === 0 ? 'The four of them on the porch steps, squinting into the sun. Grandad has his hand on Elena\'s head.' : st === 1 ? 'The four of them on the porch steps.\n\nAnd a fifth figure at the end, holding a torch.\n\nIt is wearing your coat.' : st === 2 ? 'You, on the porch with the family. And behind you, in the doorway of the house, someone very tall, waiting for you to turn around.' : 'The four of them on the porch, squinting into the sun. Elena is laughing at something outside the frame.', W.portraits.hall.canvas); } },
  nightstand: { prompt: () => 'Open the nightstand', use: () => { if (!SF().key1) { SF().key1 = true; Story.give('ironKey1'); UI.say('Sleeping pills, a bible, his reading glasses... and under the bible, a heavy iron key.', 4.5); Story.keyFound(); } else UI.say('Sleeping pills. A bible with the pages about Lazarus folded down.', 4); } },
  gPainting: { prompt: () => SF().paintingDown ? 'Read the wall' : 'Straighten the painting', use: () => Story.paintingUse() },
  hairbrush: { prompt: () => 'Examine the hairbrush', use: () => insp('A silver hairbrush', 'Grandma\'s. Grandad kept it on the dresser for thirty years after she left.\n\nThere is hair caught in the bristles. Long and very dark.\n\nGrandma\'s hair was grey by the time she left.') },
  bathtub: { prompt: () => SF().key2 ? 'Look at the water' : 'Reach into the water', use: () => { if (!SF().key2) { SF().key2 = true; Story.give('ironKey2'); SFX.scrape(new THREE.Vector3(-9.15, 4, -12.8), .6, .2); UI.say('The water is black and perfectly still. Your hand finds something at the bottom.\n\nThe water is warm. It should not be warm.', 6); Story.keyFound(); } else UI.say('Black, still water. Your reflection does not quite keep up with you.', 4); } },
  medCabinet: { prompt: () => 'Open the cabinet', use: () => Story.medCabinetUse() },
  sewingBox: { prompt: () => 'Open the sewing box', use: () => { if (!SF().key3) { SF().key3 = true; Story.give('ironKey3'); UI.say('Thread, pins, a thimble. And an iron key, wrapped in yellow cloth.', 4.5); Story.keyFound(); } else UI.say('Grandma\'s thread. Mostly yellow.', 3); } },
  mem4: memDef('mem4', 'Touch the dress'),
  // ---- Elena's room ----
  bear: { prompt: () => 'Examine the bear', use: () => insp('Elena\'s bear', SF().bearTurned ? 'One ear has been sewn back on with yellow thread.\n\nIts head is turned towards you. It was facing the wall.' : 'One ear has been sewn back on with yellow thread. It is sitting with its face to the wall, as if it has been put in the corner.') },
  diary: { prompt: () => 'Read the diary', use: () => { Story.readDiary(false); } },
  drawing0: { prompt: () => 'Look at the drawing', use: () => Story.drawingUse(0) },
  drawing1: { prompt: () => 'Look at the drawing', use: () => Story.drawingUse(1) },
  drawing2: { prompt: () => 'Look at the drawing', use: () => Story.drawingUse(2) },
  seasonWindow: { prompt: () => 'Look out of the window', use: () => Story.seasonUse() },
  musicBox: { prompt: () => SF().boxSolved ? 'Take the music box' : 'Examine the music box', use: () => Story.musicBoxUse() },
  wardrobe: { prompt: () => SF().wardOpen ? 'Look inside' : 'Open the wardrobe', use: () => Story.wardrobeUse() },
  mem5: memDef('mem5', 'Pick up the photograph'),
  // ---- basement ----
  mem6: memDef('mem6', 'Examine the beam'),
  boxClock: { prompt: () => 'Look in the box', use: () => insp('A cardboard box', 'Inside, wrapped in newspaper: the walnut clock from the living-room mantel. The crack in the glass. The hands at 9:14.\n\nIt is ticking.\n\nYou left it upstairs. You are certain you left it upstairs.') },
  boxPlates: { prompt: () => 'Look in the box', use: () => insp('A cardboard box', 'Plates. The good china from the dining room — and on top, two place settings that are still warm, with crumbs on them.') },
  boxDiary: { prompt: () => 'Look in the box', use: () => insp('A cardboard box', 'Diaries. Dozens of them, plum-coloured, all with a broken clasp. You open one.\n\n"My name is Elena Hale. I am nine. I am still me."\n\nYou open another. The same words. The handwriting gets better in each one.') },
  boxPhotos: { prompt: () => 'Look in the box', use: () => Story.boxPhotosUse() },
  boxToys: { prompt: () => 'Look in the box', use: () => insp('A cardboard box', 'Toys. A skipping rope, a tin spinning top — and Elena\'s bear, the one with the ear sewn on in yellow thread.\n\nIt is facing you.') },
  boxFamily: { prompt: () => 'Look in the box', use: () => insp('A cardboard box', 'Framed photographs, face down. You turn one over: the porch picture from the upstairs hall.\n\nIn this one you are standing with the family, and Grandad has his hand on your head.', Story.hallPortrait(1)) },
  newspaper: readDef('newspaper', 'The Alder Gazette, 1987', TXT.newspaper, 'Read the newspaper'),
  policeReport: readDef('police', 'A police statement', TXT.police, 'Read the statement'),
  arthurNotes: readDef('arthurNotes', 'Grandad\'s notebook', TXT.arthurNotes, 'Read the notebook', { hand: true }),
  tape: { prompt: () => SF().tapePlaying ? null : SF().tapeDone ? 'Play the tape again' : 'Press play', use: () => Story.playTape() },
  plaque: { prompt: () => 'Read the plaque', use: () => insp('A brass plaque', 'LAY HER DOWN THE WAY SHE GREW\n\nBeneath it, three stone pedestals, left to right, worn smooth by somebody\'s hands.') },
  pedestal0: { prompt: () => Story.pedPrompt(0), use: () => Story.pedestalUse(0) },
  pedestal1: { prompt: () => Story.pedPrompt(1), use: () => Story.pedestalUse(1) },
  pedestal2: { prompt: () => Story.pedPrompt(2), use: () => Story.pedestalUse(2) },
  // ---- the memory ----
  arthur: { prompt: () => SF().endingChosen ? null : 'Speak to Grandad', use: () => Story.talkArthur() },
  fam_margaret: { prompt: () => 'Look at her', use: () => UI.say('Grandma, in her blue cardigan. Her face is in shadow. When you lean closer, the shadow leans with you.', 5) },
  fam_thomas: { prompt: () => 'Look at him', use: () => UI.say('A boy of twelve. Your father. He is holding his fork the wrong way, the way he did his whole life.', 5) },
  fam_elena: { prompt: () => 'Look at her', use: () => UI.say(Story.S.mem && Object.keys(Story.S.mem).length >= 6 ? 'A girl in a yellow dress with pins still in the hem. Her face is in shadow, but she is humming. She rushes the third line.' : 'A girl in a yellow dress. Her face is in shadow. She is humming the song from the music box, very quietly, almost right.', 5.5) },
  tableMusicBox: { prompt: () => SF().endingChosen ? null : 'The music box', use: () => Story.talkArthur('box') },
});

// ---------------- state ----------------
Story.newState = function (name) {
  return { ch: 1, name: name || 'Sam', inv: [], journal: [], mem: {}, flags: {}, objective: '', playTime: 0, startedAt: Date.now() };
};
Story.has = id => Story.S.inv.includes(id);
Story.give = function (id, silent) { if (!this.S.inv.includes(id)) { this.S.inv.push(id); this.S.invV = (this.S.invV || 0) + 1; } if (!silent) { SFX.pickup(); UI.notify('Taken: ' + ITEMS[id].name); } };
Story.take = function (id) { const i = this.S.inv.indexOf(id); if (i >= 0) { this.S.inv.splice(i, 1); this.S.invV = (this.S.invV || 0) + 1; } };
Story.addNote = function (id, title, pages, hand) {
  if (this.S.journal.find(j => j.id === id)) return;
  this.S.journal.push({ id, title, pages, hand: !!hand }); UI.notify('Journal updated');
};
Story.findMemory = function (id) {
  const m = MEMS[id]; const first = !this.S.mem[id];
  this.S.mem[id] = true;
  if (first) {
    const n = Object.keys(this.S.mem).length;
    SFX.musicBox(null, { notes: 6, vol: .1, tempo: .5 });
    G.memFx = 2.6;
    UI.notify(`A memory returns (${n} of 6)`);
  }
  UI.inspect('Memory — ' + m.title, m.text, id === 'mem5' ? this.polaroid() : id === 'mem2' ? drawCrayon({ kind: 'house', stage: 1 }) : null);
};
