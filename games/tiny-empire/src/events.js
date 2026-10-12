/* =====================================================================
   EVENTS & EMERGENCIES — occasional, fair and preventable.
   Nothing is ever destroyed: fires only pause a building's income
   for a while (and can be repaired instantly).
   Each event: when it can happen, what it changes (modifiers), and
   how the player can prepare.
   ===================================================================== */
(function (TE) {
  'use strict';
  const G = () => TE.Game;
  const P = () => TE.Progress;

  function nearPool(S, b) {
    for (let y = b.y - 3; y <= b.y + 3; y++) for (let x = b.x - 3; x <= b.x + 3; x++) { const p = G().buildingAt(S, x, y); if (p && p.type === 'pool') return true; }
    return false;
  }
  function coolShare(S) {
    const R = S.R; let cool = 0, all = 0;
    R.homes.forEach((uid) => {
      const b = S.buildings[uid]; if (!b) return;
      const nd = R.b[uid].needs, i = b.y * S.size + b.x;
      all += b.occ; if (nd.recreation >= 65 || R.f.hospital[i] > 0.3 || nearPool(S, b)) cool += b.occ;
    });
    return all ? cool / all : 1;
  }

  TE.EVENTS = {
    heatwave: {
      name: 'Heatwave', icon: '🌡️', duration: 75, minLevel: 2, weight: 3,
      desc: 'Residents without a park nearby or hospital coverage lose happiness until it cools down.',
      tip: 'Prepare: parks within 3 tiles of homes, and a hospital in range.',
      can: (S) => S.R.totals.population > 10,
      end(S) {
        const share = coolShare(S);
        if (share >= 0.7) {
          const reward = 120 * S.level * S.level;
          S.money += reward;
          return { good: true, text: `Your parks kept ${Math.round(share * 100)}% of residents cool! +${TE.fmtMoney(reward)} from grateful citizens.` };
        }
        return { good: false, text: `Only ${Math.round(share * 100)}% of residents had a cool place. More parks will help next time.` };
      },
    },
    celebration: {
      name: 'Neighborhood Celebration', icon: '🎉', duration: 60, minLevel: 1, weight: 3,
      desc: 'A street party! +10 happiness and shops earn +10% while it lasts.',
      tip: 'Happy cities (55+) celebrate more often.',
      can: (S) => S.R.totals.happiness >= 55 && S.R.totals.population >= 8,
      end() { return { good: true, text: 'What a party! Residents will remember this.' }; },
    },
    traffic: {
      name: 'Rush-hour Traffic', icon: '🚗', duration: 60, minLevel: 2, weight: 2,
      desc: 'Everyone drives at once: 60% more car trips. Narrow streets jam, homes beside them lose happiness and shops lose customers.',
      tip: 'Avenues, roundabouts, bus stops, train stations and bike lanes keep traffic moving.',
      can: (S) => G().count(S, 'road') >= 20,
      end(S) {
        const jams = S.R.trafficStats ? S.R.trafficStats.jammed : 0;
        return jams <= 1 ? { good: true, text: 'Rush hour is over — your streets kept flowing!' }
          : { good: false, text: `Rush hour is over. ${jams} streets were jammed — upgrade them to avenues or add public transport.` };
      },
    },
    pollution: {
      name: 'Pollution Warning', icon: '🏭', duration: 90, minLevel: 3, weight: 4,
      desc: 'Smog is building up! Cut factory production, or ignore it and accept unhappy residents.',
      tip: 'Keep pollution under 40: parks, trees, Clean Filters, distance from homes.',
      can: (S) => S.R.totals.pollution >= 40 && G().count(S, 'factory') > 0,
      choices: [
        { id: 'cut', label: 'Cut production', desc: 'Industry −40% income, −50% pollution for 90s' },
        { id: 'ignore', label: 'Ignore it', desc: 'Residents −10 happiness for 90s' },
      ],
      end(S, ev) {
        return ev.choice === 'cut' ? { good: true, text: 'The air is clear again. Consider Clean Filters for your factories.' }
          : { good: false, text: 'The smog lifted, but residents remember. Parks and filters prevent this.' };
      },
    },
    flood: {
      name: 'Flood Warning', icon: '🌧️', duration: 35, minLevel: 2, weight: 3,
      desc: 'Heavy rain upstream! When the timer runs out the river floods every unprotected building next to the bank (closed for 40s).',
      tip: 'Build Flood Barriers on the bank now — each one protects 3 tiles around it. Check the Flood risk overlay.',
      can: (S) => S.settings.floods !== false && TE.Water.hasRiver(S) && floodZoneBuildings(S) >= 2,
      end(S) {
        const victims = TE.Water.floodVictims(S, S.R);
        if (!victims.length) {
          const reward = 150 * S.level * S.level;
          S.money += reward;
          return { good: true, text: `The river rose, but your flood barriers held! Insurance bonus +${TE.fmtMoney(reward)}.` };
        }
        victims.forEach((b) => { b.damagedUntil = S.time + 40; b.damageKind = 'flood'; });
        S.dirty = true;
        return { good: false, text: `The river flooded ${victims.length} building${victims.length > 1 ? 's' : ''} (closed for 40s). Flood Barriers on the bank prevent this.` };
      },
    },
    community: {
      name: 'Community Project', icon: '🤝', duration: 90, minLevel: 1, weight: 3,
      desc: 'Residents ask for a new park! Build one within 90 seconds for a reward.',
      tip: 'Parks are cheap and loved.',
      can: (S) => S.R.totals.population >= 6 && S.time > 200,
      start(S, ev) { ev.data.parks0 = G().count(S, 'park'); },
      tick(S, ev) {
        if (G().count(S, 'park') > ev.data.parks0) {
          ev.data.success = true;
          return true; // end now
        }
        return false;
      },
      end(S, ev) {
        if (ev.data.success) {
          const reward = 250 * S.level;
          S.money += reward;
          P().addBuff(S, { name: 'Community Spirit', mult: 0.1, seconds: 120 });
          return { good: true, text: `The neighborhood loves the new park! +${TE.fmtMoney(reward)} and +10% income for 2 min.` };
        }
        return { good: false, text: 'No new park this time. The residents shrug and go home.' };
      },
    },
  };

  function floodZoneBuildings(S) {
    let n = 0;
    G().eachBuilding(S, (b) => { const d = TE.BUILDINGS[b.type]; if (S.R.floodZone && S.R.floodZone[b.y * S.size + b.x] && !d.road && d.cat !== 'nature') n++; });
    return n;
  }
  const Events = {
    /* Current effects of the active event (read by citizens & economy). */
    modifiers(S) {
      const ev = S.event; const m = {};
      if (!ev || ev.end <= S.time) return m;
      switch (ev.id) {
        case 'heatwave': m.heatwave = true; break;
        case 'celebration': m.happiness = 10; m.shopBonus = 0.1; break;
        case 'traffic': m.tripsMult = 1.6; break;
        case 'flood': m.rain = true; break;
        case 'pollution':
          if (ev.choice === 'cut') { m.industryPollution = 0.5; m.industryIncome = -0.4; }
          else if (ev.choice === 'ignore') m.happiness = -10;
          else m.industryPollution = 1.3;
          break;
        default: break;
      }
      return m;
    },

    choose(S, choiceId) {
      if (!S.event || S.event.choice) return;
      S.event.choice = choiceId;
      S.stats.eventsHandled++;
      P().bumpDaily(S, 'events', 1);
      S.dirty = true;
    },

    start(S, id) {
      const def = TE.EVENTS[id];
      const ev = { id, start: S.time, end: S.time + def.duration, data: {}, choice: null };
      S.event = ev;
      if (def.start) def.start(S, ev);
      S.dirty = true;
      P().notify(S, { kind: 'event', id });
    },

    finish(S) {
      const ev = S.event, def = TE.EVENTS[ev.id];
      const res = def.end ? def.end(S, ev) : { good: true, text: 'Event over.' };
      if (res.good && ev.id !== 'pollution') { S.stats.eventsHandled++; P().bumpDaily(S, 'events', 1); }
      S.eventLog.unshift({ id: ev.id, time: S.time, good: res.good, text: res.text });
      S.eventLog = S.eventLog.slice(0, 12);
      S.event = null;
      S.dirty = true;
      const [a, b] = TE.BALANCE.eventInterval;
      S.nextEventAt = S.time + a + Math.random() * (b - a);
      P().notify(S, { kind: 'eventEnd', id: ev.id, good: res.good, text: res.text });
    },

    /* Fire: covered buildings are saved, uncovered ones are damaged for a while. */
    fire(S) {
      const cands = [];
      G().eachBuilding(S, (b) => {
        const def = TE.BUILDINGS[b.type];
        if (def.service || def.fixed || def.road || def.cat === 'nature' || def.cat === 'recreation' || def.parkingSupply || def.place === 'water' || b.damagedUntil > S.time) return;
        const cover = S.R.f.fire[b.y * S.size + b.x];
        let w = 1;
        if (def.cat === 'industrial') w *= 3;
        if (def.tags && def.tags.indexOf('food') >= 0) w *= 2;
        if (cover < 0.5) w *= 2;
        cands.push({ b, w, cover });
      });
      if (!cands.length) return;
      let total = 0; cands.forEach((c) => { total += c.w; });
      let r = Math.random() * total, pick = cands[0];
      for (const c of cands) { r -= c.w; if (r <= 0) { pick = c; break; } }
      const b = pick.b, name = TE.BUILDINGS[b.type].name;
      if (pick.cover >= 0.5) {
        const reward = Math.round(TE.BUILDINGS[b.type].cost * 0.05) + 20;
        S.money += reward;
        S.stats.firesContained++; S.stats.eventsHandled++; P().bumpDaily(S, 'events', 1);
        P().notify(S, { kind: 'fire', uid: b.uid, contained: true, text: `🚒 A small fire at a ${name} was put out in seconds. Insurance pays ${TE.fmtMoney(reward)}.` });
      } else {
        const dur = pick.cover > 0 ? 25 : 60;
        b.damagedUntil = S.time + dur; b.damageKind = 'fire';
        S.dirty = true;
        P().notify(S, { kind: 'fire', uid: b.uid, contained: false,
          text: `🔥 Fire at a ${name}! ${pick.cover > 0 ? 'Firefighters arrived late' : 'No fire station in range'} — closed for ${dur}s. Repair it now or build a Fire Station nearby.` });
      }
    },

    tick(S) {
      // Fires
      const solid = Object.keys(S.buildings).length - G().count(S, 'road');
      if (S.level >= 2 && solid >= 12) {
        if (S.nextFireAt == null) S.nextFireAt = S.time + 120 + Math.random() * 120;
        if (S.time >= S.nextFireAt) { Events.fire(S); S.nextFireAt = S.time + 170 + Math.random() * 130; }
      }
      // Damaged buildings reopening
      G().eachBuilding(S, (b) => {
        if (b.damagedUntil && b.damagedUntil <= S.time) { b.damagedUntil = 0; S.dirty = true; P().notify(S, { kind: 'repaired', uid: b.uid }); }
      });
      // Active event
      if (S.event) {
        const ev = S.event, def = TE.EVENTS[ev.id];
        if (def.choices && !ev.choice && S.time - ev.start > 25) Events.choose(S, 'ignore');
        if ((def.tick && def.tick(S, ev)) || S.time >= ev.end) Events.finish(S);
        return;
      }
      if (S.time < S.nextEventAt || !S.R) return;
      const eligible = Object.keys(TE.EVENTS).filter((id) => {
        const d = TE.EVENTS[id];
        return S.level >= d.minLevel && (!d.can || d.can(S));
      });
      if (!eligible.length) { S.nextEventAt = S.time + 30; return; }
      let total = 0; eligible.forEach((id) => { total += TE.EVENTS[id].weight; });
      let r = Math.random() * total;
      for (const id of eligible) { r -= TE.EVENTS[id].weight; if (r <= 0) { Events.start(S, id); return; } }
      Events.start(S, eligible[0]);
    },
  };
  TE.Events = Events;
})(typeof window !== 'undefined' ? (window.TE = window.TE || {}) : (globalThis.TE = globalThis.TE || {}));
