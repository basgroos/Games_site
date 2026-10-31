/* Pegfall Arena rules test: the match protocol, arcade rewards, validation, battle determinism and gacha pity.
   Two bots play complete matches against each other through the real commit/reveal protocol. */
const { load, ok } = require('./helpers');
const { E, errors } = load();
let failed = 0;
async function run(label, fn) {
  try { const r = await fn(); console.log('OK  ', label, r !== undefined ? JSON.stringify(r) : ''); }
  catch (e) { failed++; console.log('FAIL', label, e.stack.split('\n').slice(0, 3).join(' | ')); }
}
(async () => {
  await run('roster has every rarity, rates add up to 100%', () => {
    const r = E('({n:CHARS.length, per:LADDER.map(x=>CHARS.filter(c=>c.rarity===x).length), sum:Object.values(RARITY).reduce((a,b)=>a+b.w,0)})');
    ok(r.per.every((n) => n >= 2), 'a rarity has fewer than 2 fighters');
    ok(Math.abs(r.sum - 100) < 1e-9, 'rates sum to ' + r.sum);
    return r;
  });
  await run('battle simulation is deterministic', () => {
    const r = E(`(()=>{const A=[[{id:'pip',count:12},{id:'gumbo',count:4},{id:'vex',count:2}],[{id:'aurelion',count:2},{id:'quill',count:9},{id:'orrin',count:3}]];
      const a=runBattleHeadless(A,'s1'),b=runBattleHeadless(clone(A),'s1'),c=runBattleHeadless(clone(A),'s2');return {a:resultHash(a),same:resultHash(a)===resultHash(b),other:resultHash(c)};})()`);
    ok(r.same, 'same seed gave different results');
    return r;
  });
  await run('arcade rewards follow the ladder exactly (6 hits = one of each rarity, Mythic last)', () => {
    const r = E(`(()=>{const pools=rewardPools(['pip','bramble','gumbo'],['pip','gumbo']);const out=rewardsFromLog('seed',0,pools,[[6],[2,1],[]]);
      const live=makePicker('seed',0,pools);const order=[1,2,3,4,5,6,1,2,1];const same=order.every((l,i)=>live.next(LADDER[l-1])===out[i].id);
      return {n:out.length,rar:out.map(o=>o.rarity),same,commonsAreArmyTypes:out.filter(o=>o.rarity==='common').every(o=>['pip'].includes(o.id)),uncommonIsGumbo:out.filter(o=>o.rarity==='uncommon').every(o=>o.id==='gumbo')};})()`);
    ok(r.n === 9, 'expected 9 fighters');
    ok(r.rar.slice(0, 6).join() === 'common,uncommon,rare,epic,legendary,mythic', 'ladder order wrong');
    ok(r.same, 'live picker and log replay disagree');
    ok(r.commonsAreArmyTypes && r.uncommonIsGumbo, 'rewards ignored army types');
    return { n: r.n, first6: r.rar.slice(0, 6) };
  });
  await run('impossible machine logs are rejected', () => {
    const bad = E(`[validateLog([[7],[],[]]),validateLog([[1],[2]]),validateLog([[6,6,6,6,6,6,6],[],[]]),validateLog([[1.5],[],[]]),validateLog([['6'],[],[]])]`);
    ok(bad.every(Boolean), 'a bad log was accepted: ' + JSON.stringify(bad));
    ok(E('validateLog([[6,6,3],[2],[]])') === null, 'a valid log was rejected');
    return bad;
  });
  await run('bot skill matters: hard reaches Mythic far more often than easy', () => {
    const r = E(`(()=>{const m={};for(const d of ['easy','hard']){let my=0;for(let i=0;i<200;i++){const p=botArcadePlan(d,makeRng(d+i));if(validateLog(p.log))throw new Error('bot made invalid log');my+=p.log.flat().filter(k=>k===6).length;}m[d]=my/200;}return m;})()`);
    ok(r.hard > r.easy * 3, 'hard not clearly better');
    return r;
  });
  await run('gacha: Epic+ within 10 pulls, Legendary+ within 50', () => {
    const r = E(`(()=>{let worst10=0,worst50=0;for(let k=0;k<40;k++){const sv={owned:{},pity10:0,pity50:0,shards:0};const rng=makeRng('g'+k);let s10=0,s50=0;
      for(let i=0;i<300;i++){const [x]=gachaPull(sv,1,rng);s10++;s50++;if(RIDX[x.rarity]>=RIDX.epic){worst10=Math.max(worst10,s10);s10=0;}if(RIDX[x.rarity]>=RIDX.legendary){worst50=Math.max(worst50,s50);s50=0;}}}return {worst10,worst50};})()`);
    ok(r.worst10 <= 10 && r.worst50 <= 50, 'pity broken');
    return r;
  });
  await run('full bot-vs-bot matches agree on every army and score', async () => {
    E(`window.__results=[];window.__play=(d1,d2,seed)=>{const [tA,tB]=makeLoopback();const r1=makeRng(seed+'a'),r2=makeRng(seed+'b');const c1=botCollection(d1,r1),c2=botCollection(d2,r2);
      const mk=(t,side,d,c,r)=>new Match({transport:t,side,me:{name:d,st:botStarters(d,r,c),coll:c},headless:true,ai:{diff:d,rng:r,fast:true}});
      const A=mk(tA,0,d1,c1,r1),B=mk(tB,1,d2,c2,r2);const chk=()=>{if(A.phase==='over'&&B.phase==='over'&&!A.__done){A.__done=1;
        __results.push({pair:d1+'-'+d2,score:A.score.join('-'),agree:A.score.join()===B.score.join()&&JSON.stringify(A.army)===JSON.stringify(B.army),desync:!!(A.desync||B.desync),forfeit:!!(A.forfeit||B.forfeit),rounds:A.history.length});}};
      A.onEvent=chk;B.onEvent=chk;A.start();B.start();};
      [['easy','hard'],['medium','medium'],['hard','easy'],['hard','hard'],['medium','easy'],['easy','easy']].forEach((p,i)=>__play(p[0],p[1],'m'+i));`);
    const t0 = Date.now();
    while (E('__results.length') < 6 && Date.now() - t0 < 120000) await new Promise((r) => setTimeout(r, 50));
    const res = E('__results');
    ok(res.length === 6, 'only ' + res.length + ' matches finished');
    ok(res.every((x) => x.agree && !x.desync && !x.forfeit), 'clients disagreed: ' + JSON.stringify(res));
    ok(res.every((x) => /3/.test(x.score)), 'a match ended without 3 points');
    return res.map((x) => x.pair + ' ' + x.score);
  });
  if (errors.length) { console.log('page errors:', errors); failed++; }
  if (failed) { console.log(failed + ' check(s) failed'); process.exit(1); }
  console.log('Pegfall Arena rules: all checks passed');
  process.exit(0);
})();
