/* =====================================================================
   v1.30 balans: alle helden van Legendary en hoger (Legendary, Mystery,
   Mythic, Exotic, Ultra, Secret, Godly, Prismatic) doen 30% minder schade
   en vallen 30% langzamer aan.
   ===================================================================== */
const NERF_FROM = 'legendary', NERF_DMG = 0.7, NERF_RATE = 0.7;
function nerfed(def) { return !!(def && def.rarity && rarOrd(def.rarity) >= rarOrd(NERF_FROM)); }
const _computeStats32 = computeStats;
computeStats = function (def) {
  const s = _computeStats32.apply(this, arguments);
  if (nerfed(def)) { s.dmg *= NERF_DMG; s.burn *= NERF_DMG; if (s.poison) s.poison *= NERF_DMG; s.rate *= NERF_RATE; }
  return s;
};
